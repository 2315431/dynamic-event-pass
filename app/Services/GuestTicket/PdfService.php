<?php

namespace App\Services\GuestTicket;

use App\Models\Event;
use App\Models\EventUser;
use App\Models\EventFormAnswer;
use App\Models\EventTicketFacility;
use App\Models\User;
use App\Models\Group;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\File;
use Barryvdh\DomPDF\Facade\Pdf;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Endroid\QrCode\QrCode as EndroidQrCode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\ErrorCorrectionLevel;
use Carbon\Carbon;

class PdfService
{
    public function generateTicketPdf(
        Event $event,
        EventUser $eventUser,
        array $selectedTickets,
        array $eventFormAnswers,
        array $eventFacility,
        bool $existingUserId,
        bool $userRegisterAgain,
        array $currentSessionTicketIds
    ): array {
        $ticketLabel = $event->id == 589 ? 'Pass' : 'Ticket';
        $allPagesHtml = '';
        $qrCodePdfBase64 = null;

        // Prepare event data
        $eventData = $this->prepareEventData($event);
        $recipient = $this->getRecipientContact($eventFormAnswers);

        foreach ($selectedTickets as $ticketData) {
            $ticket = \App\Models\EventTicket::where(['event_id' => $event->id, 'id' => $ticketData['ticket_id']])->first();
            
            if ($ticket->ticket_type === "QR CODE") {
                $qrCodePdfBase64 = $this->generateQrCodePdf($ticket, $eventUser, $eventData, $ticketData);
            } else {
                $allPagesHtml .= $this->generateStandardTicketHtml(
                    $event,
                    $eventUser,
                    $ticket,
                    $ticketData,
                    $eventData,
                    $eventFacility,
                    $recipient,
                    $ticketLabel,
                    $existingUserId,
                    $userRegisterAgain,
                    $currentSessionTicketIds
                );
            }
        }

        $pdfBase64 = null;
        if (!empty($allPagesHtml)) {
            $pdf = Pdf::loadHTML($allPagesHtml);
            $pdfContent = $pdf->output();
            $pdfBase64 = base64_encode($pdfContent);
        }

        return [
            'pdfBase64' => $pdfBase64,
            'qrCodePdfBase64' => $qrCodePdfBase64,
            'pdfContent' => $pdfContent ?? null,
            'qrCodePdfContent' => $qrCodePdfContent ?? null
        ];
    }

    private function prepareEventData(Event $event): array
    {
        $eventData = [
            'title' => $event->title,
            'address' => $event->address,
            'start_date' => $event->start_date,
            'end_date' => $event->end_date,
            'start_time' => $event->start_time,
            'end_time' => $event->end_time,
            'schedule_announcement_description' => $event->schedule_announcement_description,
            'is_self_check_in' => $event->is_self_check_in,
            'is_multiple_tickets' => $event->is_multiple_tickets,
            'mainImage' => $event->mainImage()
        ];

        // Format dates and times
        if (!is_null($event->start_date)) {
            $date1 = Carbon::createFromFormat('Y-m-d', $event->start_date);
            if (is_null($event->end_date) || ($event->start_date === $event->end_date)) {
                $eventData['event_date'] = "{$date1->format('d M Y')}";
            } else {
                $date2 = Carbon::createFromFormat('Y-m-d', $event->end_date);
                $eventData['event_date'] = "{$date1->format('dS M Y')} - {$date2->format('dS M Y')}";
            }
            
            $start_time = date("g:i A", strtotime($event->start_time));
            if (!is_null($event->end_time)) {
                $end_time = date("g:i A", strtotime($event->end_time));
                $eventData['event_time'] = "{$start_time} to {$end_time}";
            } else {
                $eventData['event_time'] = $start_time;
            }
        }

        return $eventData;
    }

    private function getRecipientContact(array $eventFormAnswers): string
    {
        $dialing_code = $eventFormAnswers[1]->answer ?? '';
        $contact_no = $eventFormAnswers[2]->answer ?? '';
        return $dialing_code . $contact_no;
    }

    private function generateQrCodePdf(
        \App\Models\EventTicket $ticket,
        EventUser $eventUser,
        array $eventData,
        array $ticketData
    ): string {
        [$paperWidth, $paperHeight] = getimagesize(generatePresignedUrl($ticket->s3_link_for_ticket_photo));
        $cropDimensionCustom = json_decode($ticket->crop_dimensions_custom, true);

        // Generate QR code
        $qrCodeContent = $eventUser->guest_uuid;
        $renderer = new \Endroid\QrCode\Renderer\ImageRenderer(
            new \Endroid\QrCode\Renderer\RendererStyle(400),
            new \Endroid\QrCode\Renderer\SvgImageBackEnd()
        );
        $writer = new \Endroid\QrCode\Writer\Writer($renderer);
        $svgImageString = $writer->writeString($qrCodeContent);

        // Base QR code data
        $qrTicketData = [
            'paperWidth' => $paperWidth,
            'paperHeight' => $paperHeight,
            'ticket_photo' => generatePresignedUrl($ticket->s3_link_for_ticket_photo),
            'qrcode_string' => $svgImageString
        ];

        // Handle QR code positioning
        $cropDimension = $cropDimensionCustom['qrcode'] ?? null;
        if (!is_null($cropDimension)) {
            $qrTicketData = array_merge($qrTicketData, [
                'width' => $cropDimension['width'],
                'height' => $cropDimension['height'],
                'top' => $cropDimension['y'],
                'left' => $cropDimension['x']
            ]);
        }

        // Dynamic form answer handling
        $this->processDynamicFormAnswers($qrTicketData, $cropDimensionCustom, $ticket, $eventUser, $ticketData);

        $template = 'qr_pass';
        $htmlStringForQrCode = View::make($template)->with($qrTicketData)->render();
        [$ticketWidth, $ticketHeight] = getimagesize($qrTicketData['ticket_photo']);
        $qrCodePdf = PDF::loadHTML($htmlStringForQrCode);
        $qrCodePdf->setPaper([0, 0, $ticketHeight, $ticketWidth], 'landscape');
        $qrCodePdfContent = $qrCodePdf->output();
        
        return base64_encode($qrCodePdfContent);
    }

    private function processDynamicFormAnswers(
        array &$qrTicketData,
        array $cropDimensionCustom,
        \App\Models\EventTicket $ticket,
        EventUser $eventUser,
        array $ticketData
    ): void {
        foreach ($cropDimensionCustom as $key => $dimensions) {
            if ($key === 'qrcode') continue;

            if (is_numeric($key)) {
                // Handle form question IDs
                $formQuestionId = $key;
                $formAnswer = \App\Models\EventFormAnswer::where('event_id', $ticket->event_id)
                    ->where('user_id', $eventUser->user_id)
                    ->where('form_question_id', $formQuestionId)
                    ->first();

                if ($formAnswer && !empty($formAnswer->answer)) {
                    $qrTicketData["cropDimension{$formQuestionId}"] = $this->prepareCropDimension($dimensions);
                    $qrTicketData["form_answer_{$formQuestionId}"] = $formAnswer->answer;
                }
            } else {
                // Handle predefined fields
                $this->handlePredefinedFields($qrTicketData, $key, $dimensions, $eventUser, $ticketData, $ticket);
            }
        }
    }

    private function handlePredefinedFields(
        array &$qrTicketData,
        string $key,
        array $dimensions,
        EventUser $eventUser,
        array $ticketData,
        \App\Models\EventTicket $ticket
    ): void {
        switch ($key) {
            case 'guest_id':
                if (!is_null($dimensions)) {
                    $qrTicketData['cropDimensionId'] = $this->prepareCropDimension($dimensions);
                    $qrTicketData['id'] = $eventUser->guest_uuid;
                }
                break;

            case 'guest_count':
                if (!is_null($dimensions)) {
                    $qrTicketData['cropDimensionGuestCount'] = $this->prepareCropDimension($dimensions);
                    $qrTicketData['guest_count'] = $ticketData['ticket_count'] . ' Guest(s)';
                }
                break;

            case 'ticket_name':
                if (!is_null($dimensions)) {
                    $qrTicketData['cropDimensionTicketName'] = $this->prepareCropDimension($dimensions);
                    $qrTicketData['ticket_name'] = $ticket->title;
                }
                break;
        }
    }

    private function prepareCropDimension(array $dimensions): array
    {
        return [
            'x' => $dimensions['x'],
            'y' => $dimensions['y'],
            'width' => $dimensions['width'],
            'height' => $dimensions['height'],
            'fontSize' => $dimensions['fontSize'] ?? 14,
            'fontFamily' => $dimensions['fontFamily'] ?? 'Arial',
            'fontColor' => $dimensions['fontColor'] ?? '#000000',
            'fontWeight' => $dimensions['fontWeight'] ?? 'normal',
            'fontStyle' => $dimensions['fontStyle'] ?? 'normal',
            'textDecoration' => $dimensions['textDecoration'] ?? 'none',
        ];
    }

    private function generateStandardTicketHtml(
        Event $event,
        EventUser $eventUser,
        \App\Models\EventTicket $ticket,
        array $ticketData,
        array $eventData,
        array $eventFacility,
        string $recipient,
        string $ticketLabel,
        bool $existingUserId,
        bool $userRegisterAgain,
        array $currentSessionTicketIds
    ): string {
        // This method would contain the complex HTML generation logic
        // from the original method, broken down into manageable pieces
        
        $data = [
            'event_name' => $event->title,
            'event_venue' => $event->address,
            'event_date' => $eventData['event_date'] ?? null,
            'event_time' => $eventData['event_time'] ?? null,
            'schedule_announcement' => $eventData['schedule_announcement_description'] ?? null,
            'event_image' => count($eventData['mainImage']) > 0 ? 
                (generatePresignedUrl($eventData['mainImage'][0]['s3_link_for_path']) ?: null) : null,
            'guest_ticket_name' => $eventUser->name,
            'guest_ticket_email' => $eventUser->email,
            'guest_ticket_contact' => $recipient,
            'num_of_tickets' => $ticketData['ticket_count'],
            'name_of_ticket' => $ticket->title,
            'facilities' => !empty($eventFacility) ? $eventFacility : 'N/A',
            'event_ticket_label' => $ticketLabel,
        ];

        if (!$event->is_self_check_in) {
            $qrCodeContent = $eventUser->guest_uuid;
            $renderer = new \Endroid\QrCode\Renderer\ImageRenderer(
                new \Endroid\QrCode\Renderer\RendererStyle(400),
                new \Endroid\QrCode\Renderer\SvgImageBackEnd()
            );
            $writer = new \Endroid\QrCode\Writer\Writer($renderer);
            $svgImageString = $writer->writeString($qrCodeContent);
            $data['qrcode_string'] = $svgImageString;
        } else {
            $data['event_weblink'] = 'https://app.wowsly.com/e/' . $eventUser->guest_uuid;
        }

        return View::make('guest_free_event_ticket')->with($data)->render();
    }

    public function savePdfFiles(
        string $pdfContent,
        string $qrCodePdfContent,
        EventUser $eventUser,
        Event $event,
        string $ticketLabel
    ): array {
        $filePaths = [];

        if ($qrCodePdfContent) {
            $guestQRCodeFolder = 'storage/guestRegistrationQRCodes';
            if (!File::isDirectory($guestQRCodeFolder)) {
                File::makeDirectory($guestQRCodeFolder);
            }
            $fileName = 'QRCode-' . $ticketLabel . '-' . str_replace(' ', '-', $eventUser->name) . '-' . $eventUser->id . '.pdf';
            $qrCodeTicketPath = $guestQRCodeFolder . '/' . $fileName;
            file_put_contents($qrCodeTicketPath, $qrCodePdfContent);
            $filePaths['qrCodePath'] = $qrCodeTicketPath;
        } else {
            $guestTicketFolder = 'storage/guestRegistrationTickets';
            if (!File::isDirectory($guestTicketFolder)) {
                File::makeDirectory($guestTicketFolder);
            }
            $fileName = $ticketLabel . '-' . str_replace(' ', '-', $eventUser->name) . '-' . str_replace(' ', '-', $event->title) . '-' . $eventUser->id . '.pdf';
            $ticketPath = $guestTicketFolder . '/' . $fileName;
            file_put_contents($ticketPath, $pdfContent);
            $filePaths['ticketPath'] = $ticketPath;
        }

        return $filePaths;
    }
}