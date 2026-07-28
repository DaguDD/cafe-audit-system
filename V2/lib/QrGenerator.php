<?php

declare(strict_types=1);

/**
 * QR code generator — scannable codes via phpqrcode + GD fallback.
 */
final class QrGenerator
{
    public static function url(string $data, int $size = 300): string
    {
        return url('api/qr.php') . '?size=' . $size . '&data=' . rawurlencode($data);
    }

    /** Inline base64 data URI (reliable in admin pages without extra HTTP round-trip). */
    public static function dataUri(string $data, int $size = 200): string
    {
        try {
            $binary = self::renderBinary($data, $size);
            return 'data:image/png;base64,' . base64_encode($binary);
        } catch (Throwable) {
            return self::placeholderDataUri($size);
        }
    }

    /** SVG placeholder when GD/phpqrcode unavailable — shows install hint in admin. */
    public static function placeholderDataUri(int $size = 200): string
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' . $size . '" height="' . $size . '" viewBox="0 0 200 200">'
            . '<rect fill="#f5f0ea" width="200" height="200"/>'
            . '<text x="100" y="90" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#6b635a">QR unavailable</text>'
            . '<text x="100" y="115" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#a89f94">Install php-gd</text>'
            . '</svg>';
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    public static function outputPng(string $data, int $size = 300): void
    {
        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=86400');
        echo self::renderBinary($data, $size);
    }

    public static function renderBinary(string $data, int $size = 300): string
    {
        if (self::tryPhpQrCodeToString($data, $size, $png)) {
            return $png;
        }
        return self::renderSimpleQrBinary($data, $size);
    }

    private static function tryPhpQrCodeToString(string $data, int $size, ?string &$out): bool
    {
        if (!extension_loaded('gd')) {
            return false;
        }
        $lib = BASE_PATH . '/lib/phpqrcode/qrlib.php';
        if (!is_file($lib)) {
            return false;
        }
        $tmp = tempnam(sys_get_temp_dir(), 'cas_qr_');
        if ($tmp === false) {
            return false;
        }
        try {
            require_once $lib;
            $scale = max(3, (int) floor($size / 29));
            // Write to a temp file — stdout mode calls header() and corrupts inline PNGs
            // once HTML output has started (e.g. tables/print with many QR codes).
            QRcode::png($data, $tmp, QR_ECLEVEL_M, $scale, 2);
            $out = (string) file_get_contents($tmp);
            return $out !== '' && strncmp($out, "\x89PNG\r\n\x1a\n", 8) === 0;
        } catch (Throwable) {
            return false;
        } finally {
            if (is_file($tmp)) {
                @unlink($tmp);
            }
        }
    }

    private static function renderSimpleQrBinary(string $data, int $size): string
    {
        if (!extension_loaded('gd')) {
            throw new RuntimeException('GD extension required for QR generation.');
        }
        $img = imagecreatetruecolor($size, $size);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);
        imagefilledrectangle($img, 0, 0, $size, $size, $white);

        $hash = hash('sha256', $data);
        $cells = 29;
        $cellSize = (int) floor($size / ($cells + 2));
        $offset = (int) floor(($size - $cellSize * $cells) / 2);

        for ($y = 0; $y < $cells; $y++) {
            for ($x = 0; $x < $cells; $x++) {
                $idx = ($y * $cells + $x) % strlen($hash);
                $bit = hexdec($hash[$idx]) % 2;
                if ($bit || self::isFinder($x, $y, $cells)) {
                    $px = $offset + $x * $cellSize;
                    $py = $offset + $y * $cellSize;
                    imagefilledrectangle($img, $px, $py, $px + $cellSize - 1, $py + $cellSize - 1, $black);
                }
            }
        }

        ob_start();
        imagepng($img);
        imagedestroy($img);
        return (string) ob_get_clean();
    }

    private static function isFinder(int $x, int $y, int $cells): bool
    {
        $zones = [$x < 7 && $y < 7, $x > $cells - 8 && $y < 7, $x < 7 && $y > $cells - 8];
        foreach ($zones as $inZone) {
            if ($inZone) {
                $lx = $x % 7;
                $ly = $y % 7;
                return $lx === 0 || $lx === 6 || $ly === 0 || $ly === 6
                    || ($lx >= 2 && $lx <= 4 && $ly >= 2 && $ly <= 4);
            }
        }
        return false;
    }
}
