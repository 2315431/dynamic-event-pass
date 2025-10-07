<?php

namespace App\Http\Controllers;

use App\Services\GuestTicket\ValidationService;
use App\Services\GuestTicket\UserManagementService;
use App\Services\GuestTicket\TicketManagementService;
use App\Services\GuestTicket\PaymentService;
use App\Services\GuestTicket\FacilityService;
use App\Services\GuestTicket\PdfService;
use App\Services\GuestTicket\NotificationService;
use App\DTOs\GuestTicketData;
use App\Models\Event;
use App\Models\EventUser;
use App\Models\EventFormAnswer;
use App\Models\EventTicket;
use App\Http\Resources\GuestTicketResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class RefactoredGuestTicketController extends Controller
{
    public function __construct(
        private ValidationService $validationService,
        private UserManagementService $userManagementService,
        private TicketManagementService $ticketManagementService,
        private PaymentService $paymentService,
        private FacilityService $facilityService,
        private PdfService $pdfService,
        private NotificationService $notificationService
    ) {}

    public function storeGuestTicket(int $event_id, Request $request): JsonResponse
    {
        try {
            set_time_limit(120);
            ini_set('max_execution_time', 120);

            // 1. Validate input
            $input = $this->validationService->validateGuestTicketRequest($request);
            $guestTicketData = GuestTicketData::fromRequest($request);
            $guestTicketData->eventId = $event_id;

            // 2. Validate event user exists
            $this->validationService->validateEventUserExists($guestTicketData->guestUuid);
            $eventUser = $this->userManagementService->getEventUser($guestTicketData->guestUuid);
            $event = Event::find($event_id);

            // 3. Validate ticket availability
            foreach ($guestTicketData->selectedTickets as $ticketData) {
                $this->validationService->validateTicketAvailability(
                    $ticketData['ticket_id'],
                    $event_id,
                    $ticketData['ticket_count']
                );
            }

            // 4. Handle existing user logic
            $existingUserId = $this->userManagementService->checkExistingUser(
                $event_id,
                $eventUser[0]->user_id,
                $guestTicketData->guestUuid,
                $event->is_multiple_tickets
            );

            $this->userManagementService->handleExistingUserDeletion(
                $event,
                $event_id,
                $eventUser[0]->user_id,
                $guestTicketData->guestUuid
            );

            $nextGuestNumber = 1;
            if ($existingUserId && $event->user_register_again && $event->is_multiple_tickets) {
                $nextGuestNumber = $this->userManagementService->getNextGuestNumber(
                    $event_id,
                    $eventUser[0]->user_id
                );
            }

            // 5. Create guest tickets
            $ticketResult = $this->ticketManagementService->createGuestTickets(
                $guestTicketData->selectedTickets,
                $event_id,
                $eventUser[0],
                $input,
                $existingUserId,
                $event,
                $nextGuestNumber
            );

            // 6. Handle payment for free tickets
            $paymentId = null;
            $totalAmountToPay = $this->paymentService->calculateTotalAmountToPay(
                $event_id,
                $guestTicketData->selectedTickets,
                $guestTicketData->facilityDetails
            );

            if ($totalAmountToPay == 0) {
                $firstTicket = EventTicket::where(['event_id' => $event_id, 'id' => $guestTicketData->selectedTickets[0]['ticket_id']])->first();
                $eventFormAnswers = EventFormAnswer::where(['event_id' => $event_id, 'user_id' => $eventUser[0]->user_id])->get();
                
                $paymentId = $this->paymentService->createDummyPaymentForFreeTicket(
                    $firstTicket,
                    $event_id,
                    $eventUser[0]->id,
                    $input,
                    $eventFormAnswers,
                    $totalAmountToPay
                );

                $this->paymentService->assignPaymentToTickets($ticketResult['currentSessionTicketIds'], $paymentId);
            }

            // 7. Process facilities
            $facilityResult = $this->facilityService->processFacilities(
                $guestTicketData->facilityDetails ?? [],
                $event_id,
                $ticketResult['currentSessionTicketIds'],
                $existingUserId,
                $event->user_register_again,
                $eventUser[0]
            );

            // 8. Generate PDFs
            $eventFormAnswers = EventFormAnswer::where(['event_id' => $event_id, 'user_id' => $eventUser[0]->user_id])->get();
            $pdfResult = $this->pdfService->generateTicketPdf(
                $event,
                $eventUser[0],
                $guestTicketData->selectedTickets,
                $eventFormAnswers,
                $facilityResult['eventFacility'] ?? [],
                $existingUserId,
                $event->user_register_again,
                $ticketResult['currentSessionTicketIds']
            );

            // 9. Save PDF files
            $ticketLabel = $event->id == 589 ? 'Pass' : 'Ticket';
            $filePaths = $this->pdfService->savePdfFiles(
                $pdfResult['pdfContent'],
                $pdfResult['qrCodePdfContent'],
                $eventUser[0],
                $event,
                $ticketLabel
            );

            // 10. Send notifications
            if ($totalAmountToPay == 0) {
                $this->notificationService->sendWhatsAppNotification(
                    $event,
                    $eventUser[0],
                    $eventFormAnswers,
                    $guestTicketData->selectedTickets[0],
                    $facilityResult['eventFacility'] ?? [],
                    $filePaths,
                    $ticketResult['currentSessionTicketIds'],
                    $existingUserId,
                    $event->user_register_again
                );

                $this->notificationService->sendEmailNotification(
                    $firstTicket,
                    $event,
                    $eventFormAnswers[0]->answer,
                    $guestTicketData->selectedTickets[0]['ticket_count'],
                    [
                        'event_mail_id' => $event->event_mail_id,
                        'sender_name' => $event->sender_name
                    ],
                    $pdfResult['pdfBase64'],
                    $pdfResult['qrCodePdfBase64'],
                    (object) ['user_email' => $eventFormAnswers[3]->answer],
                    $this->prepareTicketContentData($event, $eventUser[0], $firstTicket, $guestTicketData->selectedTickets[0], $facilityResult['eventFacility'] ?? []),
                    $eventUser[0]->id
                );

                $this->notificationService->sendOwnerNotification(
                    $event,
                    $eventUser[0],
                    $guestTicketData->selectedTickets,
                    $eventFormAnswers
                );

                // Update registration status
                $this->updateRegistrationStatus($eventUser[0], $event_id);
            }

            // 11. Update sold out tickets
            $this->updateSoldOutTickets($guestTicketData->selectedTickets, $event_id);

            return response()->json(new GuestTicketResource($this->getLastCreatedTicket($ticketResult['currentSessionTicketIds'])));

        } catch (\Exception $e) {
            Log::error('Guest ticket creation failed', [
                'error' => $e->getMessage(),
                'event_id' => $event_id,
                'guest_uuid' => $request->input('guest_uuid')
            ]);

            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    private function prepareTicketContentData(
        Event $event,
        EventUser $eventUser,
        EventTicket $ticket,
        array $ticketData,
        array $eventFacility
    ): array {
        $eventOwner = \App\Models\User::find($event->created_by);
        $eventRegards = null;
        
        if ($event->group_id) {
            $eventRegards = \App\Models\Group::where(['id' => $event->group_id])->first();
        }

        return [
            'event_name' => $event->title,
            'event_date' => $this->formatEventDate($event),
            'event_time' => $this->formatEventTime($event),
            'schedule_announcement' => $event->schedule_announcement_description ?? null,
            'event_venue' => $event->address,
            'ticket_buyer' => $eventUser->name,
            'ticket_name' => $ticket->title,
            'num_of_tickets' => $ticketData['ticket_count'],
            'facilities' => !empty($eventFacility) ? $eventFacility : 'N/A',
            'event_regards' => $eventRegards->title ?? $event->title,
            'event_owner_contact' => "+{$eventOwner->dialing_code} {$eventOwner->mobile}",
            'is_self_check_in' => $event->is_self_check_in,
            'is_multiple_tickets' => $event->is_multiple_tickets,
            'event_weblink' => $event->is_self_check_in ? 'https://app.wowsly.com/e/' . $eventUser->guest_uuid : null
        ];
    }

    private function formatEventDate(Event $event): ?string
    {
        if (is_null($event->start_date)) {
            return null;
        }

        $date1 = \Carbon\Carbon::createFromFormat('Y-m-d', $event->start_date);
        
        if (is_null($event->end_date) || ($event->start_date === $event->end_date)) {
            return "{$date1->format('d M Y')}";
        } else {
            $date2 = \Carbon\Carbon::createFromFormat('Y-m-d', $event->end_date);
            return "{$date1->format('dS M Y')} - {$date2->format('dS M Y')}";
        }
    }

    private function formatEventTime(Event $event): ?string
    {
        if (is_null($event->start_date)) {
            return null;
        }

        $start_time = date("g:i A", strtotime($event->start_time));
        
        if (!is_null($event->end_time)) {
            $end_time = date("g:i A", strtotime($event->end_time));
            return "{$start_time} to {$end_time}";
        } else {
            return $start_time;
        }
    }

    private function updateRegistrationStatus(EventUser $eventUser, int $eventId): void
    {
        if ($eventUSerUpdatedDetail = EventUser::where('id', $eventUser->id)->where('event_id', $eventId)->first()) {
            $eventUSerUpdatedDetail->update(['has_completed_registration_process' => 1]);

            EventUser::where('user_id', $eventUSerUpdatedDetail->created_by)
                ->where('event_id', $eventId)
                ->update(['register_another_user' => null]);
        }
    }

    private function updateSoldOutTickets(array $selectedTickets, int $eventId): void
    {
        foreach ($selectedTickets as $ticketData) {
            $ticket = EventTicket::where(['event_id' => $eventId, 'id' => $ticketData['ticket_id']])->first();
            if ($ticket) {
                $ticket->sold_out = $ticket->sold_out + $ticketData['ticket_count'];
                $ticket->save();
            }
        }
    }

    private function getLastCreatedTicket(array $currentSessionTicketIds): \App\Models\GuestTicket
    {
        return \App\Models\GuestTicket::whereIn('id', $currentSessionTicketIds)->latest()->first();
    }
}