<?php

return [
    'host' => getenv('V2_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('V2_DB_PORT') ?: '3306',
    'name' => getenv('V2_DB_NAME') ?: 'restaurant_v2',
    'user' => getenv('V2_DB_USER') ?: 'restaurant_user',
    'pass' => getenv('V2_DB_PASS') ?: 'restaurant_v2_pass',
    'charset' => 'utf8mb4',
];
