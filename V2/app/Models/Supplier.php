<?php

declare(strict_types=1);

final class Supplier
{
    public static function all(): array
    {
        return Database::connection()->query(
            'SELECT * FROM suppliers WHERE status = \'active\' ORDER BY name'
        )->fetchAll();
    }

    public static function create(array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO suppliers (name, contact_info, email) VALUES (?, ?, ?)'
        );
        $stmt->execute([$data['name'], $data['contact_info'], $data['email']]);
    }
}
