<?php

declare(strict_types=1);

final class Router
{
    /** @var array<string, array<string, callable>> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    private function add(string $method, string $path, callable $handler): void
    {
        $this->routes[$method][$this->normalize($path)] = $handler;
    }

    public function dispatch(string $uri, string $method): void
    {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';
        $path = $this->stripBase($path);
        $path = $this->normalize($path === '' ? '/' : $path);
        $method = strtoupper($method);

        $handler = $this->routes[$method][$path] ?? null;
        if ($handler === null) {
            http_response_code(404);
            view('errors/404', ['title' => 'Not Found']);
            return;
        }
        if (is_array($handler) && isset($handler[0], $handler[1])) {
            $handler[0]::{$handler[1]}();
            return;
        }
        $handler();
    }

    private function normalize(string $path): string
    {
        $path = '/' . trim($path, '/');
        return $path === '/' ? '/' : rtrim($path, '/');
    }

    private function stripBase(string $path): string
    {
        $config = require CONFIG_PATH . '/app.php';
        $basePath = parse_url($config['url'], PHP_URL_PATH) ?: '';
        $basePath = rtrim($basePath, '/');
        if ($basePath !== '' && str_starts_with($path, $basePath)) {
            $path = substr($path, strlen($basePath)) ?: '/';
        }
        return $path;
    }
}
