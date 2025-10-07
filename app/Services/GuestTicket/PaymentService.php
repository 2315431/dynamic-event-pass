<?php

namespace App\Services\GuestTicket;

use App\Models\PaymentDetails;
use App\Models\EventFormAnswer;
use App\Models\GuestTicket;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public function createDummyPaymentForFreeTicket(
        EventTicket $ticket,
        int $eventId,
        int $guestId,
        array $input,
        array $eventFormAnswers,
        int $totalAmountToPay
    ): ?string {
        if ($ticket->type !== "PAID" || $totalAmountToPay != 0) {
            return null;
        }

        $alphanumeric_string = generateRandomString('manual_payment', $guestId);
        $payment_id = "cash_" . $alphanumeric_string;
        
        $notes = [
            "task" => "zero_rupee_payment",
            "event_id" => $eventId,
            "guest_ticket_name" => $eventFormAnswers[0]->answer,
            "guest_ticket_email" => $eventFormAnswers[3]->answer,
            "user_id" => $eventFormAnswers[0]->user_id ?? null,
            "invited_guest_uuid" => $input['guest_uuid'],
            "guest_ticket_id" => $guestId,
            "send_to_whatsapp" => $input['send_to_whatsapp']
        ];

        $dummy_payment_details = [
            "id" => $payment_id,
            "amount" => 0,
            "currency" => getCurrency($input["amount_currency"]),
            "status" => 3,
            "order_id" => null,
            "invoice_id" => null,
            "international" => 0,
            "method" => "cash",
            "amount_refunded" => 0,
            "amount_transferred" => null,
            "refund_status" => null,
            "captured" => 1,
            "description" => "Zero INR Ticket",
            "card_id" => null,
            "bank" => null,
            "wallet" => null,
            "vpa" => null,
            "email" => $eventFormAnswers[3]->answer,
            "contact" => "+" . $this->getRecipientContact($eventFormAnswers),
            "notes" => json_encode($notes),
            "fee" => null,
            "tax" => null,
            "error_code" => null,
            "error_description" => null,
            "error_source" => null,
            "error_step" => null,
            "error_reason" => null,
            "acquirer_data" => null,
            "created_at" => time(),
            "provider" => null
        ];

        PaymentDetails::create($dummy_payment_details);
        
        return $payment_id;
    }

    public function assignPaymentToTickets(array $currentSessionTicketIds, ?string $paymentId): void
    {
        if (isset($paymentId) && !empty($currentSessionTicketIds)) {
            GuestTicket::whereIn('id', $currentSessionTicketIds)
                ->update(['payment_id' => $paymentId]);
        }
    }

    private function getRecipientContact(array $eventFormAnswers): string
    {
        $dialing_code = $eventFormAnswers[1]->answer ?? '';
        $contact_no = $eventFormAnswers[2]->answer ?? '';
        return $dialing_code . $contact_no;
    }

    public function calculateTotalAmountToPay(int $eventId, array $selectedTickets, ?array $facilityDetails = null): float
    {
        $totalAmount = 0;
        
        foreach ($selectedTickets as $ticketData) {
            $ticket = EventTicket::where(['event_id' => $eventId, 'id' => $ticketData['ticket_id']])->first();
            if ($ticket) {
                $totalAmount += $ticket->purchase_price * $ticketData['ticket_count'];
            }
        }

        // Add facility costs if provided
        if ($facilityDetails) {
            $facilityAmount = $this->calculateFacilityAmount($facilityDetails, $eventId);
            $totalAmount += $facilityAmount;
        }

        return $totalAmount;
    }

    private function calculateFacilityAmount(array $facilityDetails, int $eventId): float
    {
        $facilityAmount = 0;
        
        foreach ($facilityDetails as $facilityId) {
            if (!is_numeric($facilityId)) {
                continue;
            }

            $eventTicketFacility = EventTicketFacility::where(['id' => $facilityId])
                ->whereHas('ticket', function($query) use ($eventId) {
                    $query->where('event_id', $eventId);
                })
                ->first();

            if ($eventTicketFacility && $eventTicketFacility->price) {
                $facilityAmount += (float) $eventTicketFacility->price;
            }
        }

        return $facilityAmount;
    }
}