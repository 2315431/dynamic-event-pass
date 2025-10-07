<?php

namespace App\Services\GuestTicket;

use Illuminate\Support\Facades\Validator;
use Illuminate\Http\Request;

class ValidationService
{
    public function validateGuestTicketRequest(Request $request): array
    {
        $input = $request->all();
        $availableCurrencies = getCurrencyValues();

        $validator = Validator::make($input, [
            'selected_tickets' => 'required|array|min:1',
            'selected_tickets.*.ticket_id' => 'required|numeric|min:1',
            'selected_tickets.*.ticket_name' => 'required|string',
            'selected_tickets.*.ticket_count' => 'required|numeric|min:1',
            'facility_details' => 'nullable',
            'amount_currency' => ['required', 'in:' . implode(',', $availableCurrencies)],
            'guest_uuid' => 'required|string',
            'registered_by' => ['nullable', 'integer', 'gte:1'],
            'send_to_whatsapp' => 'required|in:0,1',
            'total_amount' => 'required|numeric|min:0'
        ], [
            'selected_tickets.*.ticket_count.min' => 'Ticket count for each selected ticket must be at least 1'
        ]);

        if ($validator->fails()) {
            throw new \Exception(json_encode($validator->errors()), 400);
        }

        return $input;
    }

    public function validateEventUserExists(string $guestUuid): void
    {
        $eventUser = \App\Models\EventUser::where(['guest_uuid' => $guestUuid])->get();
        
        if (count($eventUser) === 0) {
            throw new \Exception("You are not invited for this event", 400);
        }
    }

    public function validateTicketAvailability(int $ticketId, int $eventId, int $requestedCount): void
    {
        $ticket = \App\Models\EventTicket::where(['event_id' => $eventId, 'id' => $ticketId])->first();

        if (!isset($ticket)) {
            throw new \Exception("Selected ticket(s) do not exist.", 400);
        }

        $available_tickets = $ticket->quantity - $ticket->sold_out;
        
        if ($requestedCount > $available_tickets) {
            throw new \Exception("Unable to buy tickets, Tickets unavailable!!", 400);
        }

        if (isset($ticket->max_ticket_limit) && $requestedCount > $ticket->max_ticket_limit) {
            throw new \Exception("Unable to buy tickets, You've reached maximum ticket limit set by owner!!", 400);
        }
    }
}