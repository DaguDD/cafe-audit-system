<?php

declare(strict_types=1);

final class AuthController
{
    public static function showLogin(): void
    {
        if (auth_user()) {
            redirect('dashboard');
        }
        view('auth/login', ['title' => 'Login']);
    }

    public static function login(): void
    {
        verify_csrf();
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        store_old(['username' => $username]);

        if ($username === '' || $password === '') {
            flash('danger', 'Username and password are required.');
            redirect('login');
        }

        $user = User::findByUsername($username);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            flash('danger', 'Invalid credentials.');
            redirect('login');
        }

        clear_old();
        unset($user['password_hash']);
        $_SESSION['user'] = $user;
        User::logAuth((int) $user['user_id'], 'login');
        Shift::autoClockIn((int) $user['user_id'], $user['role']);
        flash('success', 'Welcome back, ' . $user['full_name'] . '!');
        redirect('dashboard');
    }

    public static function logout(): void
    {
        if ($user = auth_user()) {
            Shift::autoClockOut((int) $user['user_id'], $user['role']);
            User::logAuth((int) $user['user_id'], 'logout');
        }
        session_unset();
        session_destroy();
        session_start();
        flash('success', 'You have been logged out.');
        redirect('login');
    }
}
