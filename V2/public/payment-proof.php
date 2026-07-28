<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

while (ob_get_level()) {
    ob_end_clean();
}

$user = auth_user();
if (!$user) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=UTF-8');
    exit('Unauthorized.');
}

$allowed = ['admin', 'manager', 'server', 'staff'];
if (!in_array($user['role'], $allowed, true)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    exit('Forbidden.');
}

$id = (int) ($_GET['id'] ?? 0);
$sub = PaymentSubmission::find($id);
if (!$sub) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    exit('Not found.');
}

$path = BASE_PATH . '/' . ltrim($sub['screenshot_path'], '/');
if (!is_file($path)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    exit('File missing.');
}

$mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
    'jpg', 'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    default => null,
};

if ($mime === null && class_exists('finfo', false)) {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $detected = $finfo->file($path);
    if (is_string($detected) && str_starts_with($detected, 'image/')) {
        $mime = $detected;
    }
}

$mime ??= 'application/octet-stream';

header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($path));
header('Cache-Control: private, max-age=3600');
header('X-Content-Type-Options: nosniff');
readfile($path);
exit;
