<?php

declare(strict_types=1);

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function redirect(string $path): never
{
    header('Location: ' . url($path));
    exit;
}

function url(string $path = ''): string
{
    $config = require CONFIG_PATH . '/app.php';
    $base = rtrim($config['url'], '/');
    $path = ltrim($path, '/');
    return $path === '' ? $base . '/' : $base . '/' . $path;
}

function asset(string $path): string
{
    return url('assets/' . ltrim($path, '/'));
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function get_flash(): ?array
{
    if (!isset($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

function auth_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function require_auth(): void
{
    if (!auth_user()) {
        redirect('login');
    }
}

function require_role(array $roles): void
{
    require_auth();
    $user = auth_user();
    if (!in_array($user['role'], $roles, true)) {
        http_response_code(403);
        view('errors/403', ['title' => 'Access Denied']);
        exit;
    }
}

function view(string $template, array $data = []): void
{
    extract($data);
    $flash = get_flash();
    $user = auth_user();
    $config = require CONFIG_PATH . '/app.php';
    require APP_PATH . '/Views/layouts/main.php';
}

function old(string $key, string $default = ''): string
{
    return e($_SESSION['old'][$key] ?? $default);
}

function store_old(array $input): void
{
    $_SESSION['old'] = $input;
}

function clear_old(): void
{
    unset($_SESSION['old']);
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(): void
{
    $token = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(419);
        exit('Invalid CSRF token.');
    }
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function money(float $amount): string
{
    return number_format($amount, 2) . ' ETB';
}

function nav_active(string $path): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $config = require CONFIG_PATH . '/app.php';
    $base = parse_url($config['url'], PHP_URL_PATH) ?: '';
    $base = rtrim($base, '/');
    if ($base !== '' && str_starts_with($uri, $base)) {
        $uri = substr($uri, strlen($base)) ?: '/';
    }
    $uri = '/' . trim($uri, '/');
    $path = '/' . trim($path, '/');
    return $uri === $path || str_starts_with($uri, $path . '/') ? ' active' : '';
}

function can_manage(): bool
{
    $user = auth_user();
    return $user && in_array($user['role'], ['admin', 'manager'], true);
}

function role_badge_class(string $role): string
{
    return match ($role) {
        'admin' => 'role-admin',
        'manager' => 'role-manager',
        'auditor' => 'role-auditor',
        'server' => 'role-server',
        'kitchen' => 'role-kitchen',
        default => 'role-staff',
    };
}

/** Human-readable role name for UI (internal DB value unchanged). */
function role_label(string $role): string
{
    return match ($role) {
        'admin' => 'Admin',
        'manager' => 'Manager',
        'auditor' => 'Auditor',
        'server' => 'Waiter',
        'kitchen' => 'Kitchen',
        'staff' => 'Cashier',
        default => ucfirst($role),
    };
}

function table_status_badge(string $status): string
{
    return match ($status) {
        'available' => 'success',
        'occupied' => 'secondary',
        'ordering' => 'warning',
        'bill_requested' => 'danger',
        'waiter_requested' => 'info',
        default => 'light',
    };
}

function order_status_badge(string $status): string
{
    return match ($status) {
        'pending' => 'secondary',
        'committed' => 'primary',
        'preparing' => 'warning',
        'served' => 'info',
        'paid' => 'success',
        'cancelled' => 'danger',
        default => 'light',
    };
}

/** Customer-friendly order status label (hides internal names like "committed"). */
function order_status_label(string $status): string
{
    return match ($status) {
        'pending' => 'Order received',
        'committed' => 'With the kitchen',
        'preparing' => 'Being prepared',
        'served' => 'Served to your table',
        'paid' => 'Paid',
        'cancelled' => 'Cancelled',
        default => ucfirst(str_replace('_', ' ', $status)),
    };
}

/** Category emoji for customer menu display. */
function category_icon(string $name): string
{
    $key = strtolower($name);
    return match (true) {
        str_contains($key, 'hot') => '☕',
        str_contains($key, 'cold') => '🧊',
        str_contains($key, 'food') => '🥐',
        str_contains($key, 'dessert') => '🍰',
        str_contains($key, 'drink') => '🥤',
        default => '✦',
    };
}

function payment_config(): array
{
    $config = require CONFIG_PATH . '/app.php';
    $defaults = $config['payment'] ?? [];
    $file = BASE_PATH . '/storage/payment.json';
    if (is_file($file)) {
        $saved = json_decode((string) file_get_contents($file), true);
        if (is_array($saved)) {
            return array_merge($defaults, $saved);
        }
    }
    return $defaults;
}

function save_payment_config(array $data): void
{
    $dir = BASE_PATH . '/storage';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Cannot write payment settings.');
    }
    $allowed = ['telebirr_number', 'telebirr_name', 'bank_name', 'bank_account', 'bank_account_name', 'instructions'];
    $out = [];
    foreach ($allowed as $key) {
        if (isset($data[$key])) {
            $out[$key] = trim((string) $data[$key]);
        }
    }
    file_put_contents($dir . '/payment.json', json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function discrepancy_label(float $discrepancy, float $expected): string
{
    if (abs($discrepancy) < 0.0001) {
        return 'balanced';
    }
    $pct = $expected != 0.0 ? abs($discrepancy / $expected) * 100 : 100;
    $config = require CONFIG_PATH . '/app.php';
    $high = $pct > (float) $config['variance_threshold_pct'];
    if ($discrepancy < 0) {
        return $high ? 'shortage-high' : 'shortage';
    }
    return $high ? 'surplus-high' : 'surplus';
}

/** @param list<string> $headers @param list<list<string|int|float|null>> $rows */
function csv_download(string $filename, array $headers, array $rows): never
{
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    $out = fopen('php://output', 'w');
    if ($out === false) {
        exit('Export failed.');
    }
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
    fputcsv($out, $headers);
    foreach ($rows as $row) {
        fputcsv($out, $row);
    }
    fclose($out);
    exit;
}
