<?php

declare(strict_types=1);

session_start();

define('BASE_PATH', dirname(__DIR__));
define('APP_PATH', BASE_PATH . '/app');
define('CONFIG_PATH', BASE_PATH . '/config');

$config = require CONFIG_PATH . '/app.php';
date_default_timezone_set($config['timezone']);

require APP_PATH . '/helpers.php';
require APP_PATH . '/Database.php';
require APP_PATH . '/Router.php';

require APP_PATH . '/BillReceipt.php';

spl_autoload_register(function (string $class): void {
    $paths = [
        APP_PATH . '/Controllers/' . $class . '.php',
        APP_PATH . '/Models/' . $class . '.php',
        APP_PATH . '/Middleware/' . $class . '.php',
    ];
    foreach ($paths as $path) {
        if (is_file($path)) {
            require $path;
            return;
        }
    }
});

// Session timeout
if (isset($_SESSION['last_activity'])) {
    $timeout = (int) $config['session_timeout'];
    if (time() - $_SESSION['last_activity'] > $timeout) {
        session_unset();
        session_destroy();
        session_start();
        flash('warning', 'Session expired. Please log in again.');
    }
}
$_SESSION['last_activity'] = time();
