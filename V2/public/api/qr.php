<?php

declare(strict_types=1);

while (ob_get_level()) {
    ob_end_clean();
}

require dirname(__DIR__, 2) . '/app/bootstrap_api.php';

$data = (string) ($_GET['data'] ?? '');
$size = max(100, min(600, (int) ($_GET['size'] ?? 300)));

if ($data === '') {
    http_response_code(400);
    header('Content-Type: text/plain');
    exit('Missing data parameter.');
}

try {
    QrGenerator::outputPng($data, $size);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/plain');
    exit('QR generation failed.');
}
