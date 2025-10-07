<?php

namespace App\DTOs;

class GuestTicketData
{
    public function __construct(
        public int $eventId,
        public string $guestUuid,
        public array $selectedTickets,
        public ?array $facilityDetails,
        public string $amountCurrency,
        public ?int $registeredBy,
        public bool $sendToWhatsapp,
        public float $totalAmount
    ) {}

    public static function fromRequest(\Illuminate\Http\Request $request): self
    {
        return new self(
            eventId: $request->route('event_id'),
            guestUuid: $request->input('guest_uuid'),
            selectedTickets: $request->input('selected_tickets', []),
            facilityDetails: $request->input('facility_details'),
            amountCurrency: $request->input('amount_currency'),
            registeredBy: $request->input('registered_by'),
            sendToWhatsapp: (bool) $request->input('send_to_whatsapp'),
            totalAmount: (float) $request->input('total_amount')
        );
    }
}

class TicketProcessingResult
{
    public function __construct(
        public array $currentSessionTicketIds,
        public array $allCreatedSubGuests,
        public ?string $paymentId,
        public array $eventFacility,
        public string $pdfBase64,
        public ?string $qrCodePdfBase64,
        public array $filePaths
    ) {}
}

class EventData
{
    public function __construct(
        public string $title,
        public ?string $address,
        public ?string $startDate,
        public ?string $endDate,
        public ?string $startTime,
        public ?string $endTime,
        public ?string $scheduleAnnouncement,
        public bool $isSelfCheckIn,
        public bool $isMultipleTickets,
        public bool $userRegisterAgain,
        public ?string $eventDate,
        public ?string $eventTime,
        public array $mainImage
    ) {}

    public static function fromEvent(\App\Models\Event $event): self
    {
        return new self(
            title: $event->title,
            address: $event->address,
            startDate: $event->start_date,
            endDate: $event->end_date,
            startTime: $event->start_time,
            endTime: $event->end_time,
            scheduleAnnouncement: $event->schedule_announcement_description,
            isSelfCheckIn: $event->is_self_check_in,
            isMultipleTickets: $event->is_multiple_tickets,
            userRegisterAgain: $event->user_register_again,
            eventDate: null, // Will be calculated
            eventTime: null, // Will be calculated
            mainImage: $event->mainImage()
        );
    }
}