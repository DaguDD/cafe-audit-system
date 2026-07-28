<?php

declare(strict_types=1);

final class Product
{
    public static function allActive(): array
    {
        return self::menuItems();
    }

    public static function menuItems(): array
    {
        return Database::connection()->query(
            'SELECT p.*, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.cat_id = p.cat_id
             WHERE p.status = \'active\'
             ORDER BY c.name, p.name'
        )->fetchAll();
    }

    /** @return array<int, array{name: string, products: array}> */
    public static function categoriesWithProducts(): array
    {
        $products = self::menuItems();
        $grouped = [];
        foreach ($products as $product) {
            $cat = $product['category_name'] ?: 'Other';
            if (!isset($grouped[$cat])) {
                $grouped[$cat] = ['name' => $cat, 'products' => []];
            }
            $grouped[$cat]['products'][] = $product;
        }
        return array_values($grouped);
    }

    public static function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM products WHERE product_id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function recipes(int $productId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT r.*, i.name AS item_name, i.unit, i.current_qty
             FROM recipes r
             JOIN inventory i ON i.item_id = r.item_id
             WHERE r.product_id = ?'
        );
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public static function all(): array
    {
        return Database::connection()->query(
            'SELECT p.*, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.cat_id = p.cat_id
             ORDER BY p.name'
        )->fetchAll();
    }

    public static function categories(): array
    {
        return Database::connection()->query('SELECT * FROM categories ORDER BY name')->fetchAll();
    }

    public static function create(array $data): int
    {
        $name = trim($data['name'] ?? '');
        $price = (float) ($data['price'] ?? 0);
        $catId = (int) ($data['cat_id'] ?? 0) ?: null;

        if ($name === '' || $price < 0) {
            throw new InvalidArgumentException('Product name and valid price are required.');
        }

        $stmt = Database::connection()->prepare(
            'INSERT INTO products (name, price, cat_id) VALUES (?, ?, ?)'
        );
        $stmt->execute([$name, $price, $catId]);
        return (int) Database::connection()->lastInsertId();
    }

    public static function update(int $id, array $data): void
    {
        $name = trim($data['name'] ?? '');
        $price = (float) ($data['price'] ?? 0);
        $catId = (int) ($data['cat_id'] ?? 0) ?: null;
        $status = $data['status'] ?? 'active';

        if ($name === '' || $price < 0) {
            throw new InvalidArgumentException('Product name and valid price are required.');
        }

        $stmt = Database::connection()->prepare(
            'UPDATE products SET name = ?, price = ?, cat_id = ?, status = ? WHERE product_id = ?'
        );
        $stmt->execute([$name, $price, $catId, $status, $id]);
    }

    public static function addRecipe(int $productId, int $itemId, float $qty): void
    {
        if ($qty <= 0) {
            throw new InvalidArgumentException('Recipe quantity must be greater than zero.');
        }
        $stmt = Database::connection()->prepare(
            'INSERT INTO recipes (product_id, item_id, qty_needed) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE qty_needed = VALUES(qty_needed)'
        );
        $stmt->execute([$productId, $itemId, $qty]);
    }

    public static function removeRecipe(int $recipeId): void
    {
        $stmt = Database::connection()->prepare('DELETE FROM recipes WHERE recipe_id = ?');
        $stmt->execute([$recipeId]);
    }
}
