<?php

declare(strict_types=1);

final class SettingsController
{
    public static function index(): void
    {
        require_auth();
        $user = auth_user();
        $config = require CONFIG_PATH . '/app.php';

        view('settings/index', [
            'title' => 'Settings',
            'users' => in_array($user['role'], ['admin', 'manager'], true) ? User::all() : [],
            'config' => $config,
            'payment' => payment_config(),
        ]);
    }

    public static function updatePassword(): void
    {
        require_auth();
        verify_csrf();
        $user = auth_user();

        $current = $_POST['current_password'] ?? '';
        $new = $_POST['new_password'] ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        if ($new !== $confirm) {
            flash('danger', 'New passwords do not match.');
            redirect('settings');
        }

        try {
            if (!User::verifyPassword((int) $user['user_id'], $current)) {
                flash('danger', 'Current password is incorrect.');
                redirect('settings');
            }
            User::updatePassword((int) $user['user_id'], $new);
            flash('success', 'Password updated.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('settings');
    }

    public static function storeUser(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();

        try {
            User::create([
                'username' => $_POST['username'] ?? '',
                'full_name' => $_POST['full_name'] ?? '',
                'role' => $_POST['role'] ?? 'staff',
                'password' => $_POST['password'] ?? '',
            ]);
            flash('success', 'User account created.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('settings');
    }

    public static function updateUser(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();

        $id = (int) ($_POST['user_id'] ?? 0);
        $target = User::find($id);
        if (!$target) {
            flash('danger', 'User not found.');
            redirect('settings');
        }

        $newRole = $_POST['role'] ?? $target['role'];
        $newStatus = $_POST['status'] ?? $target['status'];

        if ($target['role'] === 'manager' && $newStatus === 'inactive'
            && User::countActiveManagers() <= 1) {
            flash('danger', 'Cannot deactivate the only active manager.');
            redirect('settings');
        }

        try {
            User::update($id, [
                'full_name' => $_POST['full_name'] ?? '',
                'role' => $newRole,
                'status' => $newStatus,
            ]);

            if (!empty($_POST['new_password'])) {
                User::updatePassword($id, $_POST['new_password']);
            }

            flash('success', 'User updated.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('settings');
    }

    public static function updatePayment(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        try {
            save_payment_config($_POST);
            flash('success', 'Payment details updated.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('settings');
    }
}
