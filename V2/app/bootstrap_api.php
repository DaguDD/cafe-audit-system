<?php

declare(strict_types=1);

/** Minimal bootstrap for image/API endpoints — no session flash output. */
define('BASE_PATH', dirname(__DIR__));
define('CONFIG_PATH', BASE_PATH . '/config');
define('APP_PATH', BASE_PATH . '/app');

$config = require CONFIG_PATH . '/app.php';
date_default_timezone_set($config['timezone']);

require APP_PATH . '/helpers.php';
require APP_PATH . '/Database.php';

spl_autoload_register(function (string $class): void {
    foreach ([
        APP_PATH . '/Controllers/' . $class . '.php',
        APP_PATH . '/Models/' . $class . '.php',
        APP_PATH . '/BillReceipt.php',
    ] as $path) {
        if (is_file($path)) {
            require $path;
            return;
        }
    }
});

require BASE_PATH . '/lib/QrGenerator.php';
