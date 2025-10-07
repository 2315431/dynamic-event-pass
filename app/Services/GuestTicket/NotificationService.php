<?php

namespace App\Services\GuestTicket;

use App\Models\Event;
use App\Models\EventUser;
use App\Models\EventFormAnswer;
use App\Models\GuestTicket;
use App\Models\User;
use App\Models\Group;
use App\Models\WhatsappTemplate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public function sendWhatsAppNotification(
        Event $event,
        EventUser $eventUser,
        array $eventFormAnswers,
        array $ticketData,
        array $eventFacility,
        array $filePaths,
        array $currentSessionTicketIds,
        bool $existingUserId,
        bool $userRegisterAgain
    ): void {
        if (!$event->send_to_whatsapp) {
            return;
        }

        $recipient = $this->getRecipientContact($eventFormAnswers);
        $attendeesCount = $this->calculateAttendeesCount(
            $currentSessionTicketIds,
            $existingUserId,
            $userRegisterAgain,
            $eventUser,
            $event->id
        );

        $dotPeBody = $this->prepareWhatsAppData($event, $eventUser, $ticketData, $eventFacility, $attendeesCount);
        
        $this->sendWhatsAppMessage($event, $eventUser, $dotPeBody, $filePaths, $recipient, $attendeesCount);
    }

    public function sendEmailNotification(
        \App\Models\EventTicket $ticket,
        Event $event,
        string $guestName,
        int $ticketCount,
        array $senderData,
        string $pdfBase64,
        string $qrCodePdfBase64,
        object $emailObj,
        array $ticketContentData,
        int $eventUserId
    ): void {
        $this->sendEventTicketEmail(
            $ticket,
            $event,
            $guestName,
            $ticketCount,
            $senderData,
            $pdfBase64,
            $qrCodePdfBase64,
            $emailObj,
            $ticketContentData,
            $eventUserId
        );
    }

    public function sendOwnerNotification(
        Event $event,
        EventUser $eventUser,
        array $selectedTickets,
        array $eventFormAnswers
    ): void {
        if (!$event->is_owner_notification_enabled || empty($event->owner_notification_email)) {
            return;
        }

        $this->sendOwnerNotificationEmail($event, $eventUser, $selectedTickets, $eventFormAnswers);
    }

    private function getRecipientContact(array $eventFormAnswers): string
    {
        $dialing_code = $eventFormAnswers[1]->answer ?? '';
        $contact_no = $eventFormAnswers[2]->answer ?? '';
        return $dialing_code . $contact_no;
    }

    private function calculateAttendeesCount(
        array $currentSessionTicketIds,
        bool $existingUserId,
        bool $userRegisterAgain,
        EventUser $eventUser,
        int $eventId
    ): int {
        $totalTicketsBought = 0;

        if ($existingUserId && $userRegisterAgain) {
            // For re-registration, only count current session tickets
            $currentSessionTickets = GuestTicket::whereIn('id', $currentSessionTicketIds)->get();

            foreach ($currentSessionTickets as $guestTicket) {
                $totalTicketsBought += $guestTicket->tickets_bought;
            }
        } else {
            // Get all guest tickets for the main guest
            $mainGuestTickets = GuestTicket::where('guest_id', $eventUser->id)
                ->where('event_id', $eventId)
                ->get();

            foreach ($mainGuestTickets as $guestTicket) {
                $totalTicketsBought += $guestTicket->tickets_bought;
            }

            // Get all sub-guests for this user and event
            $allSubguestIds = EventUser::where('user_id', $eventUser->user_id)
                ->where('event_id', $eventId)
                ->where('id', '!=', $eventUser->id)
                ->pluck('id')
                ->toArray();

            // Get all guest tickets for sub-guests
            if (count($allSubguestIds) > 0) {
                $allSubGuestTickets = GuestTicket::whereIn('guest_id', $allSubguestIds)
                    ->where('event_id', $eventId)
                    ->get();

                foreach ($allSubGuestTickets as $subGuestTicket) {
                    $totalTicketsBought += $subGuestTicket->tickets_bought;
                }
            }
        }

        return $totalTicketsBought;
    }

    private function prepareWhatsAppData(
        Event $event,
        EventUser $eventUser,
        array $ticketData,
        array $eventFacility,
        int $attendeesCount
    ): array {
        $eventData = $this->prepareEventDataForWhatsApp($event);
        
        if ($event->is_self_check_in) {
            return [
                'guestName' => $eventUser->name,
                'eventName' => $event->title,
                'date' => $eventData['event_date'],
                'time' => $eventData['event_time'],
                'venue' => $this->formatVenue($event->address),
                'attendeesCount' => $attendeesCount,
                'eventLink' => 'https://app.wowsly.com/e/' . $eventUser->guest_uuid,
                'eventRegards' => $this->getEventRegards($event)
            ];
        } else {
            $isMultiPurposeQrTicket = \App\Models\EventTicketFacility::where('ticket_id', $ticketData['ticket_id'])->exists();
            
            if ($event->id === 297) {
                return ['guestName' => $eventUser->name];
            } else if ($isMultiPurposeQrTicket) {
                return $this->prepareMultiPurposeQrTicketData($event, $eventUser, $ticketData, $eventFacility, $eventData, $attendeesCount);
            } else {
                return $this->prepareStandardTicketData($event, $eventUser, $eventData, $attendeesCount);
            }
        }
    }

    private function prepareEventDataForWhatsApp(Event $event): array
    {
        $eventData = [];
        
        if (!is_null($event->start_date)) {
            $date1 = \Carbon\Carbon::createFromFormat('Y-m-d', $event->start_date);
            if (is_null($event->end_date) || ($event->start_date === $event->end_date)) {
                $eventData['event_date'] = "{$date1->format('d M Y')}";
            } else {
                $date2 = \Carbon\Carbon::createFromFormat('Y-m-d', $event->end_date);
                $eventData['event_date'] = "{$date1->format('dS M Y')} - {$date2->format('dS M Y')}";
            }
            
            $start_time = date("g:i A", strtotime($event->start_time));
            if (!is_null($event->end_time)) {
                $end_time = date("g:i A", strtotime($event->end_time));
                $eventData['event_time'] = "{$start_time} to {$end_time}";
            } else {
                $eventData['event_time'] = $start_time;
            }
        } else {
            $eventData['event_date'] = $event->schedule_announcement_description ?? null;
            $eventData['event_time'] = 'N/A';
        }

        return $eventData;
    }

    private function formatVenue(?string $address): string
    {
        return isset($address) ? str_replace(["\r", "\n"], ' ', $address) : 'N/A';
    }

    private function getEventRegards(Event $event): string
    {
        if ($event->group_id) {
            $eventRegards = Group::where(['id' => $event->group_id])->first();
            return $eventRegards->title ?? $event->title;
        }
        return $event->title;
    }

    private function prepareMultiPurposeQrTicketData(
        Event $event,
        EventUser $eventUser,
        array $ticketData,
        array $eventFacility,
        array $eventData,
        int $attendeesCount
    ): array {
        $facilityDetails = '';
        if (!empty($eventFacility) && is_array($eventFacility) && $eventFacility !== 'N/A') {
            $facilityDetails = implode(', ', $eventFacility);
        }

        return [
            'guestName' => $eventUser->name,
            'eventName' => $event->title,
            'date' => $eventData['event_date'],
            'time' => $eventData['event_time'],
            'venue' => $this->formatVenue($event->address),
            'ticketName' => $ticketData['ticket_name'],
            'attendeesCount' => $attendeesCount,
            'facilities' => $facilityDetails === '' ? 'N/A' : $facilityDetails,
            'eventRegards' => $this->getEventRegards($event),
        ];
    }

    private function prepareStandardTicketData(
        Event $event,
        EventUser $eventUser,
        array $eventData,
        int $attendeesCount
    ): array {
        return [
            'guestName' => $eventUser->name,
            'eventName' => $event->title,
            'event' => $event->title,
            'date' => $eventData['event_date'],
            'time' => $eventData['event_time'],
            'venue' => $this->formatVenue($event->address),
            'attendeesCount' => $attendeesCount,
            'eventRegards' => $this->getEventRegards($event)
        ];
    }

    private function sendWhatsAppMessage(
        Event $event,
        EventUser $eventUser,
        array $dotPeBody,
        array $filePaths,
        string $recipient,
        int $attendeesCount
    ): void {
        $eventTemplate = WhatsappTemplate::where('event_id', $event->id)
            ->where('template_name', 'for_registration')
            ->first();

        Log::info('WhatsApp template check', [
            'event_id' => $event->id,
            'template_found' => $eventTemplate ? true : false,
            'template_id' => $eventTemplate ? $eventTemplate->template_id : null
        ]);

        if ($eventTemplate) {
            $this->sendEventSpecificTemplate($event, $eventUser, $dotPeBody, $filePaths, $recipient, $eventTemplate);
        } else {
            $this->sendDefaultTemplate($event, $eventUser, $dotPeBody, $filePaths, $recipient, $attendeesCount);
        }
    }

    private function sendEventSpecificTemplate(
        Event $event,
        EventUser $eventUser,
        array $dotPeBody,
        array $filePaths,
        string $recipient,
        WhatsappTemplate $eventTemplate
    ): void {
        Log::info('Using event-specific WhatsApp template via DotPe');

        $templateName = $this->getTemplateName($event);
        $filePath = $filePaths['qrCodePath'] ?? $filePaths['ticketPath'];

        $whatsappResponse = send_dotpe_guest_registration_ticket_via_whatsapp(
            $recipient,
            $templateName,
            $dotPeBody,
            $filePath,
            $event->id,
            $eventUser->id
        );

        Log::info('Event-specific template WhatsApp response', [
            'response' => $whatsappResponse,
            'event_id' => $event->id,
            'template_id' => $eventTemplate->template_id
        ]);
    }

    private function sendDefaultTemplate(
        Event $event,
        EventUser $eventUser,
        array $dotPeBody,
        array $filePaths,
        string $recipient,
        int $attendeesCount
    ): void {
        $wowStatus = checkWowWStatus();
        Log::info('No event template found, checking wowStatus', ['wowStatus' => $wowStatus]);

        if ($wowStatus == 1) {
            $this->sendWOWWTemplate($event, $eventUser, $dotPeBody, $filePaths, $recipient, $attendeesCount);
        } else {
            $this->sendDotPeTemplate($event, $eventUser, $dotPeBody, $filePaths, $recipient);
        }
    }

    private function getTemplateName(Event $event): string
    {
        if ($event->id === 297) {
            return config("app.dotpe_anant_garba_3rd_sept_template_name");
        }

        if ($event->is_self_check_in) {
            return config("app.dotpe_free_self_checkin_event_guest_registration_ticket");
        }

        $isMultiPurposeQrTicket = \App\Models\EventTicketFacility::where('ticket_id', $event->id)->exists();
        
        return $isMultiPurposeQrTicket ?
            config("app.dotpe_free_ticket_purchase_multipurpose_qrcode") :
            config("app.dotpe_free_event_guest_registration_ticket");
    }

    private function sendWOWWTemplate(
        Event $event,
        EventUser $eventUser,
        array $dotPeBody,
        array $filePaths,
        string $recipient,
        int $attendeesCount
    ): void {
        Log::info('Using WOW_W WhatsApp API for free event registration');
        
        $attendeesCount = $attendeesCount * $event->valid_for ?? 1;
        $pdfDocumentLink = config('app.api_base_url') . '/' . ($filePaths['qrCodePath'] ?? $filePaths['ticketPath']);
        $fileName = basename($filePaths['qrCodePath'] ?? $filePaths['ticketPath']);

        $whatsappResponse = send_guest_registration_new_template_via_whatsapp_WOW_W(
            $recipient,
            $dotPeBody['guestName'],
            $dotPeBody['eventName'] ?? $event->title,
            $dotPeBody['date'] ?? $event->start_date,
            $dotPeBody['time'] ?? $event->start_time,
            $dotPeBody['venue'] ?? $event->address,
            $attendeesCount,
            $dotPeBody['eventRegards'] ?? $event->title,
            $pdfDocumentLink,
            $fileName
        );

        Log::info('WOW_W Registration Template response for free event', [
            'response' => $whatsappResponse,
            'attendeesCount' => $attendeesCount,
            'event_id' => $event->id,
            'guest_id' => $eventUser->id
        ]);
    }

    private function sendDotPeTemplate(
        Event $event,
        EventUser $eventUser,
        array $dotPeBody,
        array $filePaths,
        string $recipient
    ): void {
        Log::info('Using DotPe WhatsApp API for free event registration (default)');

        $templateName = $this->getTemplateName($event);
        $filePath = $filePaths['qrCodePath'] ?? $filePaths['ticketPath'];

        $whatsappResponse = send_dotpe_guest_registration_ticket_via_whatsapp(
            $recipient,
            $templateName,
            $dotPeBody,
            $filePath,
            $event->id,
            $eventUser->id
        );

        Log::info('Default DotPe WhatsApp response for free event', [
            'response' => $whatsappResponse
        ]);
    }

    // Placeholder methods for email functionality
    private function sendEventTicketEmail(
        \App\Models\EventTicket $ticket,
        Event $event,
        string $guestName,
        int $ticketCount,
        array $senderData,
        string $pdfBase64,
        string $qrCodePdfBase64,
        object $emailObj,
        array $ticketContentData,
        int $eventUserId
    ): void {
        // Implementation for sending event ticket email
        // This would contain the email sending logic from the original method
    }

    private function sendOwnerNotificationEmail(
        Event $event,
        EventUser $eventUser,
        array $selectedTickets,
        array $eventFormAnswers
    ): void {
        // Implementation for sending owner notification email
        // This would contain the owner notification logic from the original method
    }
}