<?php

declare(strict_types=1);

final class Shift
{
    private const CLOCK_ROLES = ['server', 'staff', 'kitchen'];

    public static function openShift(int $staffUserId, int $openedBy, bool $auto = false): int
    {
        $existing = self::activeForUser($staffUserId);
        if ($existing) {
            throw new RuntimeException('This staff member already has an open shift.');
        }
        $stmt = Database::connection()->prepare(
            'INSERT INTO shifts (user_id, opened_by, status, auto_managed) VALUES (?, ?, \'open\', ?)'
        );
        $stmt->execute([$staffUserId, $openedBy, $auto ? 1 : 0]);
        return (int) Database::connection()->lastInsertId();
    }

    public static function closeShift(int $shiftId): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE shifts SET status = \'closed\', closed_at = NOW() WHERE shift_id = ? AND status = \'open\''
        );
        $stmt->execute([$shiftId]);
    }

    /** Auto clock-in when operational staff logs in. */
    public static function autoClockIn(int $userId, string $role): ?int
    {
        if (!in_array($role, self::CLOCK_ROLES, true)) {
            return null;
        }
        if (self::activeForUser($userId)) {
            return null;
        }
        return self::openShift($userId, $userId, true);
    }

    /** Auto clock-out on logout. */
    public static function autoClockOut(int $userId, string $role): void
    {
        if (!in_array($role, self::CLOCK_ROLES, true)) {
            return;
        }
        $shift = self::activeForUser($userId);
        if ($shift) {
            self::closeShift((int) $shift['shift_id']);
        }
    }

    public static function hoursWorked(array $shift): float
    {
        $start = strtotime($shift['opened_at'] ?? '');
        $end = !empty($shift['closed_at']) ? strtotime($shift['closed_at']) : time();
        if (!$start || !$end || $end < $start) {
            return 0.0;
        }
        return round(($end - $start) / 3600, 2);
    }

    public static function formatDuration(array $shift): string
    {
        $start = strtotime($shift['opened_at'] ?? '');
        $end = !empty($shift['closed_at']) ? strtotime($shift['closed_at']) : time();
        if (!$start) {
            return '—';
        }
        $mins = max(0, (int) floor(($end - $start) / 60));
        $h = intdiv($mins, 60);
        $m = $mins % 60;
        return $h . 'h ' . $m . 'm';
    }

    public static function activeForUser(int $userId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM shifts WHERE user_id = ? AND status = \'open\' ORDER BY opened_at DESC LIMIT 1'
        );
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    }

    public static function currentForUser(int $userId): ?array
    {
        return self::activeForUser($userId);
    }

    public static function anyOpenForUser(int $userId): ?array
    {
        return self::activeForUser($userId);
    }

    public static function resolveForTransaction(int $userId, string $role): ?array
    {
        $own = self::activeForUser($userId);
        if ($own) {
            return $own;
        }
        if (in_array($role, ['admin', 'manager'], true)) {
            return self::anyOpen();
        }
        return null;
    }

    public static function anyOpen(): ?array
    {
        $stmt = Database::connection()->query(
            'SELECT * FROM shifts WHERE status = \'open\' ORDER BY opened_at DESC LIMIT 1'
        );
        return $stmt->fetch() ?: null;
    }

    public static function openShifts(): array
    {
        $rows = Database::connection()->query(
            'SELECT sh.*, u.full_name AS staff_name, u.role AS staff_role, opener.full_name AS opened_by_name
             FROM shifts sh
             JOIN users u ON u.user_id = sh.user_id
             JOIN users opener ON opener.user_id = sh.opened_by
             WHERE sh.status = \'open\'
             ORDER BY sh.opened_at DESC'
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['hours'] = self::hoursWorked($row);
            $row['duration_label'] = self::formatDuration($row);
        }
        unset($row);
        return $rows;
    }

    /** Shifts closed today for manager review. */
    public static function todayClosed(): array
    {
        $rows = Database::connection()->query(
            'SELECT sh.*, u.full_name AS staff_name, u.role AS staff_role
             FROM shifts sh
             JOIN users u ON u.user_id = sh.user_id
             WHERE sh.status = \'closed\' AND DATE(sh.closed_at) = CURDATE()
             ORDER BY sh.closed_at DESC'
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['hours'] = self::hoursWorked($row);
            $row['duration_label'] = self::formatDuration($row);
        }
        unset($row);
        return $rows;
    }
}
