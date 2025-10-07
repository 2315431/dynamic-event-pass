<?php

namespace App\Services\GuestTicket;

use App\Models\EventTicketFacility;
use App\Models\GuestTicketFacility;
use App\Models\EventUser;
use App\Models\GuestTicket;
use Illuminate\Support\Facades\Log;

class FacilityService
{
    public function processFacilities(
        array $facilityDetails,
        int $eventId,
        array $currentSessionTicketIds,
        bool $existingUserId,
        bool $userRegisterAgain,
        EventUser $eventUser
    ): array {
        if (empty($facilityDetails)) {
            return [];
        }

        $allTickets = $this->getAllTicketsForFacilityProcessing(
            $currentSessionTicketIds,
            $eventId,
            $existingUserId,
            $userRegisterAgain,
            $eventUser
        );

        $eventFacility = [];
        $facilityAmount = 0;

        foreach ($facilityDetails as $facilityId) {
            if (!is_numeric($facilityId)) {
                Log::warning("Invalid facility ID: " . print_r($facilityId, true));
                continue;
            }

            $facilityData = $this->processFacilityForTickets($facilityId, $allTickets, $eventFacility);
            $facilityAmount += $facilityData['amount'];
        }

        $totalFacilityAmount = $this->calculateTotalFacilityAmount(
            $allTickets,
            $facilityAmount,
            $currentSessionTicketIds,
            $existingUserId,
            $userRegisterAgain,
            $eventUser
        );

        $this->updateTicketAmounts($allTickets, $facilityAmount);

        return [
            'eventFacility' => $eventFacility,
            'totalFacilityAmount' => $totalFacilityAmount
        ];
    }

    private function getAllTicketsForFacilityProcessing(
        array $currentSessionTicketIds,
        int $eventId,
        bool $existingUserId,
        bool $userRegisterAgain,
        EventUser $eventUser
    ): \Illuminate\Database\Eloquent\Collection {
        if ($existingUserId && $userRegisterAgain) {
            // For re-registration, only get tickets from current session
            $currentSessionGuestIds = [];
            $currentSessionTickets = GuestTicket::whereIn('id', $currentSessionTicketIds)->get();

            foreach ($currentSessionTickets as $ticket) {
                $currentSessionGuestIds[] = $ticket->guest_id;
            }

            return GuestTicket::whereIn('guest_id', $currentSessionGuestIds)
                ->where('event_id', $eventId)
                ->get();
        } else {
            // Original logic for first-time registration
            $allGuestTickets = GuestTicket::where('guest_id', $eventUser->id)
                ->where('event_id', $eventId)
                ->get();

            // Get all sub-guests for this user and event
            $allSubguestIds = EventUser::where('user_id', $eventUser->user_id)
                ->where('event_id', $eventId)
                ->where('id', '!=', $eventUser->id)
                ->pluck('id')
                ->toArray();

            // Get all guest tickets for sub-guests
            $allSubGuestTickets = GuestTicket::whereIn('guest_id', $allSubguestIds)
                ->where('event_id', $eventId)
                ->get();

            return $allGuestTickets->concat($allSubGuestTickets);
        }
    }

    private function processFacilityForTickets(
        int $facilityId,
        \Illuminate\Database\Eloquent\Collection $allTickets,
        array &$eventFacility
    ): array {
        $facilityAmount = 0;

        foreach ($allTickets as $guestTicket) {
            $eventTicketFacility = EventTicketFacility::where([
                'ticket_id' => $guestTicket->ticket_id,
                'id' => $facilityId
            ])->first();

            if (!$eventTicketFacility) {
                Log::warning("No facility found for ticket {$guestTicket->ticket_id} and facility ID {$facilityId}");
                continue;
            }

            $guestFacility = [
                'facility_id' => $eventTicketFacility->id,
                'guest_id' => $guestTicket->guest_id,
                'ticket_id' => $guestTicket->ticket_id,
                'scan_quantity' => $eventTicketFacility->scan_quantity
            ];
            GuestTicketFacility::create($guestFacility);

            // Store facility details for email
            $eventFacility[$eventTicketFacility->name] = $eventTicketFacility->price ? 
                number_format($eventTicketFacility->price, 2) : null;

            if ($eventTicketFacility->price) {
                $facilityAmount += (float) $eventTicketFacility->price;
            }
        }

        return ['amount' => $facilityAmount];
    }

    private function calculateTotalFacilityAmount(
        \Illuminate\Database\Eloquent\Collection $allTickets,
        float $facilityAmount,
        array $currentSessionTicketIds,
        bool $existingUserId,
        bool $userRegisterAgain,
        EventUser $eventUser
    ): float {
        if ($existingUserId && $userRegisterAgain) {
            $currentSessionGuestIds = [];
            $currentSessionTickets = GuestTicket::whereIn('id', $currentSessionTicketIds)->get();

            foreach ($currentSessionTickets as $ticket) {
                $currentSessionGuestIds[] = $ticket->guest_id;
            }

            return count($currentSessionGuestIds) * $facilityAmount;
        } else {
            $allSubguestIds = EventUser::where('user_id', $eventUser->user_id)
                ->where('event_id', $eventUser->event_id)
                ->where('id', '!=', $eventUser->id)
                ->pluck('id')
                ->toArray();

            return (count($allSubguestIds) + 1) * $facilityAmount;
        }
    }

    private function updateTicketAmounts(\Illuminate\Database\Eloquent\Collection $allTickets, float $facilityAmount): void
    {
        foreach ($allTickets as $guestTicket) {
            $guestTicket->update(['amount_to_pay' => $guestTicket->amount_to_pay + $facilityAmount]);
        }
    }
}