<?php

declare(strict_types=1);

final class Report
{
    public static function salesSummary30Days(): array
    {
        return Database::connection()->query(
            'SELECT DATE(sold_at) AS day, SUM(total) AS revenue, SUM(qty_sold) AS units
             FROM sales WHERE sold_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             GROUP BY DATE(sold_at) ORDER BY day DESC'
        )->fetchAll();
    }

    public static function auditHistory(int $limit = 50): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT a.*, i.name AS item_name, u.full_name AS auditor_name
             FROM audit_logs a
             JOIN inventory i ON i.item_id = a.item_id
             JOIN users u ON u.user_id = a.user_id
             ORDER BY a.audited_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function wasteByReason(): array
    {
        return Database::connection()->query(
            'SELECT w.reason, SUM(w.waste_qty) AS total_qty, COUNT(*) AS events
             FROM waste_logs w GROUP BY w.reason ORDER BY total_qty DESC'
        )->fetchAll();
    }

    public static function staffPerformance(int $days = 30): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT u.user_id, u.full_name, u.username, u.status,
                    COUNT(s.sale_id) AS transactions,
                    COALESCE(SUM(s.total), 0) AS revenue,
                    COALESCE(SUM(s.qty_sold), 0) AS units_sold
             FROM users u
             LEFT JOIN sales s ON s.user_id = u.user_id
               AND s.sold_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             WHERE u.role = \'staff\'
             GROUP BY u.user_id, u.full_name, u.username, u.status
             ORDER BY revenue DESC, u.full_name ASC'
        );
        $stmt->execute([$days]);
        return $stmt->fetchAll();
    }

    public static function staffDetail(int $userId, int $days = 30): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT u.user_id, u.full_name, u.username,
                    COUNT(s.sale_id) AS transactions,
                    COALESCE(SUM(s.total), 0) AS revenue,
                    COALESCE(SUM(s.qty_sold), 0) AS units_sold
             FROM users u
             LEFT JOIN sales s ON s.user_id = u.user_id
               AND s.sold_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             WHERE u.user_id = ? AND u.role = \'staff\'
             GROUP BY u.user_id, u.full_name, u.username'
        );
        $stmt->execute([$days, $userId]);
        $summary = $stmt->fetch();
        if (!$summary) {
            return null;
        }

        $stmt = Database::connection()->prepare(
            'SELECT s.sold_at, p.name AS product_name, s.qty_sold, s.total
             FROM sales s
             JOIN products p ON p.product_id = s.product_id
             WHERE s.user_id = ? AND s.sold_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             ORDER BY s.sold_at DESC LIMIT 100'
        );
        $stmt->execute([$userId, $days]);
        $summary['recent_sales'] = $stmt->fetchAll();

        $stmt = Database::connection()->prepare(
            'SELECT p.name AS product_name, SUM(s.qty_sold) AS qty, SUM(s.total) AS revenue
             FROM sales s
             JOIN products p ON p.product_id = s.product_id
             WHERE s.user_id = ? AND s.sold_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY p.product_id, p.name
             ORDER BY revenue DESC'
        );
        $stmt->execute([$userId, $days]);
        $summary['by_product'] = $stmt->fetchAll();

        return $summary;
    }

    public static function loginLogs(int $limit = 100): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT l.log_id, l.action, l.ip_address, l.created_at,
                    u.username, u.full_name, u.role
             FROM login_logs l
             JOIN users u ON u.user_id = l.user_id
             ORDER BY l.created_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
