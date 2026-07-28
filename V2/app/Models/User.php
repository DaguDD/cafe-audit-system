<?php

declare(strict_types=1);

final class User
{
    public static function findByUsername(string $username): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM users WHERE username = ? AND status = \'active\' LIMIT 1'
        );
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function logAuth(int $userId, string $action): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO login_logs (user_id, action, ip_address) VALUES (?, ?, ?)'
        );
        $stmt->execute([$userId, $action, client_ip()]);
    }

    public static function all(): array
    {
        return Database::connection()->query(
            'SELECT user_id, username, full_name, role, status, created_at FROM users ORDER BY full_name'
        )->fetchAll();
    }

    public static function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT user_id, username, full_name, role, status, created_at FROM users WHERE user_id = ?'
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data): int
    {
        $username = trim($data['username'] ?? '');
        $fullName = trim($data['full_name'] ?? '');
        $role = $data['role'] ?? 'staff';
        $password = $data['password'] ?? '';

        if ($username === '' || $fullName === '' || $password === '') {
            throw new InvalidArgumentException('Username, full name, and password are required.');
        }
        if (!in_array($role, ['admin', 'manager', 'auditor', 'server', 'kitchen', 'staff'], true)) {
            throw new InvalidArgumentException('Invalid role.');
        }

        $stmt = Database::connection()->prepare(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$username, password_hash($password, PASSWORD_BCRYPT), $fullName, $role]);
        return (int) Database::connection()->lastInsertId();
    }

    public static function update(int $id, array $data): void
    {
        $fullName = trim($data['full_name'] ?? '');
        $role = $data['role'] ?? 'staff';
        $status = $data['status'] ?? 'active';

        if ($fullName === '') {
            throw new InvalidArgumentException('Full name is required.');
        }
        if (!in_array($role, ['admin', 'manager', 'auditor', 'server', 'kitchen', 'staff'], true)) {
            throw new InvalidArgumentException('Invalid role.');
        }
        if (!in_array($status, ['active', 'inactive'], true)) {
            throw new InvalidArgumentException('Invalid status.');
        }

        $stmt = Database::connection()->prepare(
            'UPDATE users SET full_name = ?, role = ?, status = ? WHERE user_id = ?'
        );
        $stmt->execute([$fullName, $role, $status, $id]);
    }

    public static function updatePassword(int $id, string $password): void
    {
        if (strlen($password) < 6) {
            throw new InvalidArgumentException('Password must be at least 6 characters.');
        }
        $stmt = Database::connection()->prepare(
            'UPDATE users SET password_hash = ? WHERE user_id = ?'
        );
        $stmt->execute([password_hash($password, PASSWORD_BCRYPT), $id]);
    }

    public static function verifyPassword(int $id, string $password): bool
    {
        $stmt = Database::connection()->prepare('SELECT password_hash FROM users WHERE user_id = ?');
        $stmt->execute([$id]);
        $hash = $stmt->fetchColumn();
        return $hash && password_verify($password, $hash);
    }

    public static function countActiveManagers(): int
    {
        return (int) Database::connection()->query(
            "SELECT COUNT(*) FROM users WHERE role = 'manager' AND status = 'active'"
        )->fetchColumn();
    }
}
