<?php

namespace App\Services\GuestTicket;

use App\Models\EventTicket;
use App\Models\GuestTicket;
use App\Models\EventUser;
use App\Models\Event;
use Illuminate\Support\Facades\Log;

class TicketManagementService
{
    public function createGuestTickets(
        array $selectedTickets,
        int $eventId,
        EventUser $eventUser,
        array $input,
        bool $existingUserId,
        Event $event,
        int $nextGuestNumber = 1
    ): array {
        $currentSessionTicketIds = [];
        $allCreatedSubGuests = [];
        $ticketCountForLoop = 0;

        foreach ($selectedTickets as $ticketData) {
            $ticketCountForLoop++;
            $ticketId = $ticketData['ticket_id'];
            $ticket = EventTicket::where(['event_id' => $eventId, 'id' => $ticketId])->first();
            $purchasePrice = round(floatval($ticket->purchase_price), 2);

            if ($existingUserId && $event->user_register_again) {
                $guestTicketData = $this->handleReRegistration(
                    $ticket,
                    $ticketData,
                    $eventId,
                    $eventUser,
                    $input,
                    $event,
                    $nextGuestNumber,
                    $currentSessionTicketIds,
                    $allCreatedSubGuests,
                    $ticketCountForLoop
                );
            } else {
                $guestTicketData = $this->handleFirstRegistration(
                    $ticket,
                    $ticketData,
                    $eventId,
                    $eventUser,
                    $input,
                    $currentSessionTicketIds,
                    $ticketCountForLoop
                );
            }

            $currentSessionTicketIds[] = $guestTicketData->id;
        }

        return [
            'currentSessionTicketIds' => $currentSessionTicketIds,
            'allCreatedSubGuests' => $allCreatedSubGuests
        ];
    }

    private function handleReRegistration(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        EventUser $eventUser,
        array $input,
        Event $event,
        int $nextGuestNumber,
        array &$currentSessionTicketIds,
        array &$allCreatedSubGuests,
        int $ticketCountForLoop
    ): GuestTicket {
        $guestId = $eventUser->id;

        if (!$event->is_multiple_tickets) {
            return $this->handleSingleTicketReRegistration(
                $ticket,
                $ticketData,
                $eventId,
                $guestId,
                $input,
                $currentSessionTicketIds,
                $ticketCountForLoop
            );
        } else {
            return $this->handleMultipleTicketReRegistration(
                $ticket,
                $ticketData,
                $eventId,
                $eventUser,
                $input,
                $event,
                $nextGuestNumber,
                $currentSessionTicketIds,
                $allCreatedSubGuests
            );
        }
    }

    private function handleFirstRegistration(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        EventUser $eventUser,
        array $input,
        array &$currentSessionTicketIds,
        int $ticketCountForLoop
    ): GuestTicket {
        $guestId = $eventUser->id;

        if ($ticket->is_separated) {
            return $this->handleSeparatedTicketFirstRegistration(
                $ticket,
                $ticketData,
                $eventId,
                $eventUser,
                $input,
                $currentSessionTicketIds,
                $ticketCountForLoop
            );
        } else {
            return $this->handleNonSeparatedTicketFirstRegistration(
                $ticket,
                $ticketData,
                $eventId,
                $eventUser,
                $input,
                $currentSessionTicketIds,
                $ticketCountForLoop
            );
        }
    }

    private function handleSingleTicketReRegistration(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        int $guestId,
        array $input,
        array &$currentSessionTicketIds,
        int $ticketCountForLoop
    ): GuestTicket {
        $existingGuestTicket = GuestTicket::where('guest_id', $guestId)
            ->where('ticket_id', $ticketData['ticket_id'])
            ->where('event_id', $eventId)
            ->whereNotNull('payment_id')
            ->latest('created_at')
            ->first();

        if ($existingGuestTicket) {
            $newTicketCount = $existingGuestTicket->tickets_bought + $ticketData['ticket_count'];
            $existingGuestTicket->update([
                "tickets_bought" => $newTicketCount,
                "amount_to_pay" => $ticket->purchase_price * $newTicketCount,
            ]);
            return $existingGuestTicket;
        } else {
            return $this->createNewGuestTicket(
                $ticket,
                $ticketData,
                $eventId,
                $guestId,
                $input,
                $currentSessionTicketIds,
                $ticketCountForLoop
            );
        }
    }

    private function handleMultipleTicketReRegistration(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        EventUser $eventUser,
        array $input,
        Event $event,
        int $nextGuestNumber,
        array &$currentSessionTicketIds,
        array &$allCreatedSubGuests
    ): GuestTicket {
        if ($ticket->is_separated && $ticketData['ticket_count'] > 1) {
            return $this->createSeparatedTicketsForReRegistration(
                $ticket,
                $ticketData,
                $eventId,
                $eventUser,
                $input,
                $nextGuestNumber,
                $currentSessionTicketIds,
                $allCreatedSubGuests
            );
        } else {
            return $this->createSingleTicketForReRegistration(
                $ticket,
                $ticketData,
                $eventId,
                $eventUser,
                $input,
                $nextGuestNumber,
                $currentSessionTicketIds,
                $allCreatedSubGuests
            );
        }
    }

    private function createNewGuestTicket(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        int $guestId,
        array $input,
        array &$currentSessionTicketIds,
        int $ticketCountForLoop
    ): GuestTicket {
        if ($ticket->is_separated) {
            return $this->createSeparatedTickets(
                $ticket,
                $ticketData,
                $eventId,
                $guestId,
                $input,
                $currentSessionTicketIds,
                $ticketCountForLoop
            );
        } else {
            $guestTicketData = GuestTicket::create([
                "event_id" => $eventId,
                "guest_id" => $guestId,
                "ticket_id" => $ticketData['ticket_id'],
                "tickets_bought" => $ticketData['ticket_count'],
                "amount_to_pay" => $ticket->purchase_price * $ticketData['ticket_count'],
                "currency" => $input["amount_currency"],
                "is_separated" => 0,
                "payment_id" => null
            ]);
            return $guestTicketData;
        }
    }

    private function createSeparatedTickets(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        int $guestId,
        array $input,
        array &$currentSessionTicketIds,
        int $ticketCountForLoop
    ): GuestTicket {
        $ticketCountFromInput = $ticketData['ticket_count'];
        $currentGuestId = $guestId;

        for ($i = 1; $i <= $ticketCountFromInput; $i++) {
            if ($ticketCountForLoop > 1 || $i > 1) {
                $subGuestName = 'Guest ' . (count($currentSessionTicketIds) + 1);
                $subGuestUser = $this->createSubGuestData($eventId, $subGuestName, $guestId);
                $eventUserModel = EventUser::create($subGuestUser);
                $alphanumericString = generateRandomString('event', $eventUserModel->id);
                $eventUserModel->guest_uuid = $alphanumericString;
                $eventUserModel->save();
                $currentGuestId = $eventUserModel->id;
            }

            $guestTicketData = GuestTicket::updateOrCreate([
                "event_id" => $eventId,
                "guest_id" => $currentGuestId,
                "payment_id" => null,
            ], [
                "ticket_id" => $ticketData['ticket_id'],
                "tickets_bought" => 1,
                "amount_to_pay" => $ticket->purchase_price,
                "currency" => $input["amount_currency"],
                "is_separated" => ($ticketCountForLoop == 1 && $i == 1) ? 0 : 1
            ]);
            $currentSessionTicketIds[] = $guestTicketData->id;
        }

        return $guestTicketData;
    }

    private function createSubGuestData(int $eventId, string $name, int $originalGuestId): array
    {
        $originalGuest = EventUser::find($originalGuestId);
        
        $subGuestUser = [
            'event_id' => $eventId,
            'name' => $name,
            'user_id' => $originalGuest->user_id,
            'email' => $originalGuest->email,
            'created_by' => $originalGuest->created_by,
            'role' => $originalGuest->role,
            'generated_by_owner' => $originalGuest->generated_by_owner,
            'is_separated' => 1,
        ];

        if ($originalGuest->registered_by) {
            $subGuestUser['registered_by'] = $originalGuest->registered_by;
        }

        return $subGuestUser;
    }

    // Additional helper methods for other ticket creation scenarios...
    private function handleSeparatedTicketFirstRegistration(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        EventUser $eventUser,
        array $input,
        array &$currentSessionTicketIds,
        int $ticketCountForLoop
    ): GuestTicket {
        // Implementation for separated ticket first registration
        return $this->createSeparatedTickets($ticket, $ticketData, $eventId, $eventUser->id, $input, $currentSessionTicketIds, $ticketCountForLoop);
    }

    private function handleNonSeparatedTicketFirstRegistration(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        EventUser $eventUser,
        array $input,
        array &$currentSessionTicketIds,
        int $ticketCountForLoop
    ): GuestTicket {
        $guest_id = $eventUser->id;
        
        if ($ticketCountForLoop > 1) {
            $subGuestName = 'Guest ' . (count($currentSessionTicketIds) + 1);
            $subGuestUser = $this->createSubGuestData($eventId, $subGuestName, $eventUser->id);
            $eventUserModel = EventUser::create($subGuestUser);
            $alphanumericString = generateRandomString('event', $eventUserModel->id);
            $eventUserModel->guest_uuid = $alphanumericString;
            $eventUserModel->save();
            $guest_id = $eventUserModel->id;
        }

        $guestTicketData = GuestTicket::updateOrCreate([
            "event_id" => $eventId,
            "guest_id" => $guest_id,
            "payment_id" => null,
        ], [
            "ticket_id" => $ticketData['ticket_id'],
            "tickets_bought" => $ticketData['ticket_count'],
            "amount_to_pay" => $ticket->purchase_price * $ticketData['ticket_count'],
            "currency" => $input["amount_currency"],
            "is_separated" => 0
        ]);
        $currentSessionTicketIds[] = $guestTicketData->id;

        return $guestTicketData;
    }

    private function createSeparatedTicketsForReRegistration(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        EventUser $eventUser,
        array $input,
        int $nextGuestNumber,
        array &$currentSessionTicketIds,
        array &$allCreatedSubGuests
    ): GuestTicket {
        $guestTicketData = null;
        
        for ($i = 1; $i <= $ticketData['ticket_count']; $i++) {
            $subGuestName = 'Guest ' . $nextGuestNumber;
            $nextGuestNumber++;

            $subGuestUser = $this->createSubGuestData($eventId, $subGuestName, $eventUser->id);
            $newSubGuestUser = EventUser::create($subGuestUser);
            $alphanumericString = generateRandomString('event', $newSubGuestUser->id);
            $newSubGuestUser->guest_uuid = $alphanumericString;
            $newSubGuestUser->save();

            $guestTicketData = GuestTicket::create([
                "event_id" => $eventId,
                "guest_id" => $newSubGuestUser->id,
                "ticket_id" => $ticketData['ticket_id'],
                "tickets_bought" => 1,
                "amount_to_pay" => $ticket->purchase_price,
                "currency" => $input["amount_currency"],
                "is_separated" => 1,
                "payment_id" => null
            ]);
            $currentSessionTicketIds[] = $guestTicketData->id;
            $allCreatedSubGuests[] = $newSubGuestUser->id;
        }

        return $guestTicketData;
    }

    private function createSingleTicketForReRegistration(
        EventTicket $ticket,
        array $ticketData,
        int $eventId,
        EventUser $eventUser,
        array $input,
        int $nextGuestNumber,
        array &$currentSessionTicketIds,
        array &$allCreatedSubGuests
    ): GuestTicket {
        $subGuestName = 'Guest ' . $nextGuestNumber;
        $subGuestUser = $this->createSubGuestData($eventId, $subGuestName, $eventUser->id);
        $newSubGuestUser = EventUser::create($subGuestUser);
        $alphanumericString = generateRandomString('event', $newSubGuestUser->id);
        $newSubGuestUser->guest_uuid = $alphanumericString;
        $newSubGuestUser->save();

        $guestTicketData = GuestTicket::create([
            "event_id" => $eventId,
            "guest_id" => $newSubGuestUser->id,
            "ticket_id" => $ticketData['ticket_id'],
            "tickets_bought" => $ticketData['ticket_count'],
            "amount_to_pay" => $ticket->purchase_price * $ticketData['ticket_count'],
            "currency" => $input["amount_currency"],
            "is_separated" => 0,
            "payment_id" => null
        ]);
        $currentSessionTicketIds[] = $guestTicketData->id;
        $allCreatedSubGuests[] = $newSubGuestUser->id;

        return $guestTicketData;
    }
}