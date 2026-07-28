<?php

declare(strict_types=1);

/**
 * Builds itemized customer receipt with VAT, service charge, server transparency, and tip.
 */
final class BillReceipt
{
    /** @return array<string, mixed> */
    public static function forTable(int $tableId, float $tipAmount = 0.0): array
    {
        $config = require CONFIG_PATH . '/app.php';
        $billing = $config['billing'] ?? [];
        $vatRate = (float) ($billing['vat_rate'] ?? 15);
        $serviceRate = (float) ($billing['service_charge_rate'] ?? 10);

        $session = RestaurantTable::activeSession($tableId);
        $lines = [];
        $subtotal = 0.0;
        $servers = [];

        foreach ($session as $order) {
            if (!empty($order['server_name'])) {
                $servers[$order['server_name']] = true;
            } elseif ($order['order_source'] === 'server' && !empty($order['server_user_id'])) {
                $u = User::find((int) $order['server_user_id']);
                if ($u) {
                    $servers[$u['full_name']] = true;
                }
            }
            foreach ($order['items'] as $item) {
                $lines[] = [
                    'qty' => (int) $item['qty'],
                    'name' => $item['product_name'],
                    'unit_price' => (float) $item['unit_price'],
                    'line_total' => (float) $item['line_total'],
                    'order_id' => (int) $order['order_id'],
                ];
                $subtotal += (float) $item['line_total'];
            }
        }

        $subtotal = round($subtotal, 2);
        $vat = round($subtotal * ($vatRate / 100), 2);
        $service = round($subtotal * ($serviceRate / 100), 2);
        $tipAmount = max(0, round($tipAmount, 2));
        $grandTotal = round($subtotal + $vat + $service + $tipAmount, 2);

        $serverLabel = 'Self-service (QR menu)';
        if (count($servers) === 1) {
            $serverLabel = array_key_first($servers);
        } elseif (count($servers) > 1) {
            $serverLabel = implode(', ', array_keys($servers));
        }

        return [
            'lines' => $lines,
            'subtotal' => $subtotal,
            'vat_rate' => $vatRate,
            'vat_amount' => $vat,
            'service_rate' => $serviceRate,
            'service_amount' => $service,
            'tip_amount' => $tipAmount,
            'grand_total' => $grandTotal,
            'server_label' => $serverLabel,
            'order_count' => count($session),
            'has_orders' => $subtotal > 0,
        ];
    }
}
