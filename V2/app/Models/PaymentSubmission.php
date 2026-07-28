<?php

declare(strict_types=1);

final class PaymentSubmission
{
    private const MAX_FILE_BYTES = 5_242_880; // 5 MB
    private const MAX_ATTEMPTS_PER_HOUR = 3;

    public static function createFromUpload(
        int $tableId,
        string $tableToken,
        string $method,
        string $reference,
        ?string $senderPhone,
        float $amountClaimed,
        float $tipAmount,
        array $file
    ): int {
        $tipAmount = max(0, round($tipAmount, 2));
        $receipt = BillReceipt::forTable($tableId, $tipAmount);
        $expected = round((float) $receipt['grand_total'], 2);
        if (!$receipt['has_orders'] || $expected <= 0) {
            throw new RuntimeException('Nothing to pay for this table.');
        }
        if (abs($amountClaimed - $expected) > 0.009) {
            throw new RuntimeException(
                'Amount must match your receipt total exactly: ' . number_format($expected, 2) . ' ETB (incl. VAT, service' . ($tipAmount > 0 ? ', tip' : '') . ').'
            );
        }

        $reference = trim($reference);
        $reference = preg_replace('/[^A-Za-z0-9\-]/', '', $reference);
        if ($reference === '' || strlen($reference) < 4) {
            throw new RuntimeException('Enter a valid transaction reference number from your receipt.');
        }

        if (!in_array($method, ['telebirr', 'bank'], true)) {
            throw new RuntimeException('Invalid payment method.');
        }

        $pdo = Database::connection();

        $pending = $pdo->prepare(
            'SELECT COUNT(*) FROM payment_submissions
             WHERE table_id = ? AND status = \'pending\''
        );
        $pending->execute([$tableId]);
        if ((int) $pending->fetchColumn() > 0) {
            throw new RuntimeException('A payment is already awaiting review for this table. Please wait for staff confirmation.');
        }

        $recent = $pdo->prepare(
            'SELECT COUNT(*) FROM payment_submissions
             WHERE table_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)'
        );
        $recent->execute([$tableId]);
        if ((int) $recent->fetchColumn() >= self::MAX_ATTEMPTS_PER_HOUR) {
            throw new RuntimeException('Too many payment attempts. Please ask staff for help.');
        }

        $dupRef = $pdo->prepare('SELECT submission_id FROM payment_submissions WHERE reference_number = ?');
        $dupRef->execute([$reference]);
        if ($dupRef->fetch()) {
            throw new RuntimeException('This transaction reference was already used. Each payment must be unique.');
        }

        [$relativePath, $hash] = self::storeScreenshot($file, $tableId);

        $dupHash = $pdo->prepare(
            'SELECT submission_id FROM payment_submissions WHERE screenshot_hash = ? AND status != \'rejected\''
        );
        $dupHash->execute([$hash]);
        if ($dupHash->fetch()) {
            @unlink(BASE_PATH . '/' . $relativePath);
            throw new RuntimeException('This receipt image was already submitted. Upload your actual payment screenshot.');
        }

        $stmt = $pdo->prepare(
            'INSERT INTO payment_submissions
             (table_id, amount_expected, amount_claimed, tip_amount, payment_method, reference_number,
              sender_phone, screenshot_path, screenshot_hash, table_token, ip_address, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\')'
        );
        $stmt->execute([
            $tableId,
            $expected,
            $amountClaimed,
            $tipAmount,
            $method,
            $reference,
            $senderPhone ?: null,
            $relativePath,
            $hash,
            $tableToken,
            client_ip(),
        ]);

        RestaurantTable::setStatus($tableId, 'bill_requested');

        return (int) $pdo->lastInsertId();
    }

    /** @param array{tmp_name?: string, error?: int, size?: int, name?: string} $file */
    private static function storeScreenshot(array $file, int $tableId): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Please upload a screenshot of your payment receipt.');
        }
        if (($file['size'] ?? 0) > self::MAX_FILE_BYTES) {
            throw new RuntimeException('Screenshot must be under 5 MB.');
        }

        $info = @getimagesize($file['tmp_name'] ?? '');
        if ($info === false) {
            throw new RuntimeException('Upload a valid image (JPG, PNG, or WebP).');
        }

        $mime = $info['mime'] ?? '';
        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => throw new RuntimeException('Only JPG, PNG, or WebP screenshots are accepted.'),
        };

        $hash = hash_file('sha256', $file['tmp_name']);
        $dir = BASE_PATH . '/storage/uploads/payments';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Upload folder not writable. Contact staff.');
        }

        $filename = sprintf('t%d_%s.%s', $tableId, bin2hex(random_bytes(12)), $ext);
        $fullPath = $dir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
            throw new RuntimeException('Could not save screenshot. Try again.');
        }

        return ['storage/uploads/payments/' . $filename, $hash];
    }

    public static function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT ps.*, t.table_number, u.full_name AS reviewer_name
             FROM payment_submissions ps
             JOIN restaurant_tables t ON t.table_id = ps.table_id
             LEFT JOIN users u ON u.user_id = ps.reviewed_by
             WHERE ps.submission_id = ?'
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function pendingForTable(int $tableId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM payment_submissions
             WHERE table_id = ? AND status = \'pending\'
             ORDER BY created_at DESC LIMIT 1'
        );
        $stmt->execute([$tableId]);
        return $stmt->fetch() ?: null;
    }

    public static function latestForTable(int $tableId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM payment_submissions
             WHERE table_id = ?
             ORDER BY created_at DESC LIMIT 1'
        );
        $stmt->execute([$tableId]);
        return $stmt->fetch() ?: null;
    }

    public static function pendingQueue(): array
    {
        return Database::connection()->query(
            'SELECT ps.*, t.table_number
             FROM payment_submissions ps
             JOIN restaurant_tables t ON t.table_id = ps.table_id
             WHERE ps.status = \'pending\'
             ORDER BY ps.created_at ASC'
        )->fetchAll();
    }

    public static function pendingCount(): int
    {
        return (int) Database::connection()->query(
            'SELECT COUNT(*) FROM payment_submissions WHERE status = \'pending\''
        )->fetchColumn();
    }

    /** Full payment history with optional status filter and pagination. */
    public static function history(?string $status = null, int $limit = 50, int $offset = 0): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);
        $sql = 'SELECT ps.*, t.table_number, u.full_name AS reviewer_name
                FROM payment_submissions ps
                JOIN restaurant_tables t ON t.table_id = ps.table_id
                LEFT JOIN users u ON u.user_id = ps.reviewed_by';
        $params = [];
        if ($status !== null && $status !== '' && $status !== 'all') {
            $sql .= ' WHERE ps.status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY ps.created_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset;
        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function historyCount(?string $status = null): int
    {
        $sql = 'SELECT COUNT(*) FROM payment_submissions';
        $params = [];
        if ($status !== null && $status !== '' && $status !== 'all') {
            $sql .= ' WHERE status = ?';
            $params[] = $status;
        }
        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    public static function statusCounts(): array
    {
        $rows = Database::connection()->query(
            'SELECT status, COUNT(*) AS c FROM payment_submissions GROUP BY status'
        )->fetchAll();
        $out = ['pending' => 0, 'approved' => 0, 'rejected' => 0];
        foreach ($rows as $r) {
            $out[$r['status']] = (int) $r['c'];
        }
        return $out;
    }

    /**
     * Re-open a previously decided payment (admin/manager only).
     * Does NOT reverse sales already recorded — those stay unless separately handled.
     */
    public static function revertToPending(int $submissionId, int $reviewerId, string $notes): void
    {
        $sub = self::find($submissionId);
        if (!$sub || $sub['status'] === 'pending') {
            throw new RuntimeException('Payment is already pending or not found.');
        }
        if (trim($notes) === '') {
            throw new RuntimeException('Provide a note when changing payment status.');
        }

        Database::connection()->prepare(
            'UPDATE payment_submissions
             SET status = \'pending\', reviewed_by = ?, review_notes = ?, reviewed_at = NOW()
             WHERE submission_id = ?'
        )->execute([$reviewerId, trim($notes), $submissionId]);
    }

    public static function approve(int $submissionId, int $reviewerId, ?string $notes = null): void
    {
        $sub = self::find($submissionId);
        if (!$sub || $sub['status'] !== 'pending') {
            throw new RuntimeException('Payment submission not found or already reviewed.');
        }

        $user = User::find($reviewerId);
        if (!$user) {
            throw new RuntimeException('Reviewer not found.');
        }

        $shift = Shift::resolveForTransaction($reviewerId, $user['role']);
        if (!$shift) {
            throw new RuntimeException('No open shift. Open a shift before approving payments.');
        }

        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $bill = Order::tableBill((int) $sub['table_id']);
            foreach ($bill['orders'] as $order) {
                Order::pay((int) $order['order_id'], $reviewerId, (int) $shift['shift_id']);
            }
            RestaurantTable::setStatus((int) $sub['table_id'], 'available');

            $pdo->prepare(
                'UPDATE payment_submissions
                 SET status = \'approved\', reviewed_by = ?, review_notes = ?, reviewed_at = NOW()
                 WHERE submission_id = ?'
            )->execute([$reviewerId, $notes, $submissionId]);

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function reject(int $submissionId, int $reviewerId, string $notes): void
    {
        $sub = self::find($submissionId);
        if (!$sub || $sub['status'] !== 'pending') {
            throw new RuntimeException('Payment submission not found or already reviewed.');
        }
        if (trim($notes) === '') {
            throw new RuntimeException('Provide a reason when rejecting a payment.');
        }

        Database::connection()->prepare(
            'UPDATE payment_submissions
             SET status = \'rejected\', reviewed_by = ?, review_notes = ?, reviewed_at = NOW()
             WHERE submission_id = ?'
        )->execute([$reviewerId, trim($notes), $submissionId]);
    }
}
