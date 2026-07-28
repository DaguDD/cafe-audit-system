<?php

declare(strict_types=1);

final class PaymentController
{
    public static function index(): void
    {
        require_role(['admin', 'manager', 'server', 'staff']);

        $filter = trim($_GET['status'] ?? 'all');
        if (!in_array($filter, ['all', 'pending', 'approved', 'rejected'], true)) {
            $filter = 'all';
        }

        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = 24;
        $offset = ($page - 1) * $perPage;
        $total = PaymentSubmission::historyCount($filter === 'all' ? null : $filter);
        $pages = max(1, (int) ceil($total / $perPage));

        view('payments/index', [
            'title' => 'Payment Verification',
            'pending' => PaymentSubmission::pendingQueue(),
            'pendingCount' => PaymentSubmission::pendingCount(),
            'history' => PaymentSubmission::history($filter === 'all' ? null : $filter, $perPage, $offset),
            'statusCounts' => PaymentSubmission::statusCounts(),
            'filter' => $filter,
            'page' => $page,
            'pages' => $pages,
            'total' => $total,
            'canEditStatus' => can_manage(),
        ]);
    }

    public static function approve(): void
    {
        require_role(['admin', 'manager', 'server', 'staff']);
        verify_csrf();
        $id = (int) ($_POST['submission_id'] ?? 0);
        $user = auth_user();
        try {
            PaymentSubmission::approve($id, (int) $user['user_id'], trim($_POST['notes'] ?? '') ?: null);
            flash('success', 'Payment approved. Table closed and sales recorded.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        self::redirectBack();
    }

    public static function reject(): void
    {
        require_role(['admin', 'manager', 'server', 'staff']);
        verify_csrf();
        $id = (int) ($_POST['submission_id'] ?? 0);
        $user = auth_user();
        try {
            PaymentSubmission::reject($id, (int) $user['user_id'], trim($_POST['notes'] ?? ''));
            flash('warning', 'Payment rejected. Customer can submit again with correct proof.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        self::redirectBack();
    }

    /** Admin / Manager only — re-open an approved or rejected payment for re-review. */
    public static function reopen(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        $id = (int) ($_POST['submission_id'] ?? 0);
        $user = auth_user();
        try {
            PaymentSubmission::revertToPending($id, (int) $user['user_id'], trim($_POST['notes'] ?? ''));
            flash('success', 'Payment set back to pending for re-review.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('payments?status=pending');
    }

    private static function redirectBack(): void
    {
        $redirect = $_POST['redirect'] ?? 'payments';
        if ($redirect === 'orders') {
            redirect('orders/detail?id=' . (int) ($_POST['table_id'] ?? 0));
        }
        $status = $_POST['status_filter'] ?? 'all';
        redirect('payments?status=' . urlencode((string) $status));
    }
}
