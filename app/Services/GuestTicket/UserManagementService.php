<?php

namespace App\Services\GuestTicket;

use App\Models\EventUser;
use App\Models\Event;
use App\Models\GuestTicket;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserManagementService
{
    public function getEventUser(string $guestUuid): \Illuminate\Database\Eloquent\Collection
    {
        return EventUser::where(['guest_uuid' => $guestUuid])->get();
    }

    public function checkExistingUser(int $eventId, int $userId, string $guestUuid, bool $isMultipleTickets): bool
    {
        if (!$isMultipleTickets) {
            // For single ticket events, check if same guest_uuid already has tickets
            return GuestTicket::join('event_users', 'guest_tickets.guest_id', '=', 'event_users.id')
                ->where('event_users.event_id', $eventId)
                ->where('event_users.user_id', $userId)
                ->whereNotNull('guest_tickets.payment_id')
                ->exists();
        } else {
            // For multiple ticket events, check if current guest has tickets
            $currentEventUser = EventUser::where(['guest_uuid' => $guestUuid])->first();
            
            if (!$currentEventUser) {
                return false;
            }

            return GuestTicket::where('guest_id', $currentEventUser->id)
                ->where('event_id', $eventId)
                ->whereNotNull('payment_id')
                ->exists();
        }
    }

    public function handleExistingUserDeletion(Event $event, int $eventId, int $userId, string $guestUuid): void
    {
        if (!$event->user_register_again) {
            $eventUsersToDelete = EventUser::where(['event_id' => $eventId, 'user_id' => $userId])
                ->where('guest_uuid', '!=', $guestUuid)
                ->get();

            foreach ($eventUsersToDelete as $eventuser) {
                // Delete related guest_ticket records
                $guestTickets = GuestTicket::where('guest_id', $eventuser['id'])
                    ->where('event_id', $eventId)
                    ->get();

                foreach ($guestTickets as $guestTicket) {
                    $guestTicket->delete();
                }

                // Delete guest ticket facility records
                DB::delete('DELETE FROM guest_ticket_facilities WHERE guest_id = ?', [$eventuser['id']]);

                // Delete the event user
                DB::delete('DELETE FROM event_users WHERE id = ?', [$eventuser['id']]);
            }
        }
    }

    public function getNextGuestNumber(int $eventId, int $userId): int
    {
        $existingGuests = EventUser::where(['event_id' => $eventId, 'user_id' => $userId])
            ->where('name', 'like', 'Guest %')
            ->get();

        $maxGuestNumber = 0;
        foreach ($existingGuests as $guest) {
            if (preg_match('/Guest (\d+)/', $guest->name, $matches)) {
                $guestNumber = intval($matches[1]);
                if ($guestNumber > $maxGuestNumber) {
                    $maxGuestNumber = $guestNumber;
                }
            }
        }
        
        return $maxGuestNumber + 1;
    }

    public function createSubGuest(array $eventUserData, int $eventId, string $guestName, bool $isSeparated = false): EventUser
    {
        $subGuestUser = [
            'event_id' => $eventId,
            'name' => $guestName,
            'user_id' => $eventUserData['user_id'],
            'email' => $eventUserData['email'],
            'created_by' => $eventUserData['created_by'],
            'role' => $eventUserData['role'],
            'generated_by_owner' => $eventUserData['generated_by_owner'],
            'is_separated' => $isSeparated ? 1 : 0,
        ];

        if (isset($eventUserData['registered_by'])) {
            $subGuestUser['registered_by'] = $eventUserData['registered_by'];
        }

        $eventUserModel = EventUser::create($subGuestUser);
        $alphanumericString = generateRandomString('event', $eventUserModel->id);
        $eventUserModel->guest_uuid = $alphanumericString;
        $eventUserModel->save();

        return $eventUserModel;
    }
}