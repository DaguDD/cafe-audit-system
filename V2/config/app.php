<?php

return [
    'name' => 'Cafe Audit System',
    'url' => getenv('APP_URL') ?: 'http://restaurant-v2.local',
    'timezone' => 'Africa/Addis_Ababa',
    'session_timeout' => 1800,
    'variance_threshold_pct' => 10,
    'cafe_name' => 'Unity Cafe',
    'payment' => [
        'telebirr_number' => '0912345678',
        'telebirr_name' => 'Unity Cafe',
        'bank_name' => 'Commercial Bank of Ethiopia (CBE)',
        'bank_account' => '1000123456789',
        'bank_account_name' => 'Unity Cafe PLC',
        'instructions' => 'Pay the exact total shown on your receipt (including VAT and service). Upload your Telebirr or bank screenshot with the reference number.',
    ],
    'billing' => [
        'vat_rate' => 15,
        'service_charge_rate' => 10,
    ],
    'cafe_hours' => [
        'open' => '08:00',
        'close' => '22:00',
    ],
];
