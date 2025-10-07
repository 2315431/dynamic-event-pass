<?php

namespace App\Providers;

use App\Services\GuestTicket\ValidationService;
use App\Services\GuestTicket\UserManagementService;
use App\Services\GuestTicket\TicketManagementService;
use App\Services\GuestTicket\PaymentService;
use App\Services\GuestTicket\FacilityService;
use App\Services\GuestTicket\PdfService;
use App\Services\GuestTicket\NotificationService;
use Illuminate\Support\ServiceProvider;

class GuestTicketServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(ValidationService::class);
        $this->app->singleton(UserManagementService::class);
        $this->app->singleton(TicketManagementService::class);
        $this->app->singleton(PaymentService::class);
        $this->app->singleton(FacilityService::class);
        $this->app->singleton(PdfService::class);
        $this->app->singleton(NotificationService::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}