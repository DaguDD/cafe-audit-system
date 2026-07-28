<?php

declare(strict_types=1);

final class ProductController
{
    public static function index(): void
    {
        require_role(['admin', 'manager', 'kitchen']);
        $products = Product::all();
        $recipesByProduct = [];
        foreach ($products as $p) {
            $recipesByProduct[(int) $p['product_id']] = Product::recipes((int) $p['product_id']);
        }

        view('products/index', [
            'title' => 'Products',
            'products' => $products,
            'categories' => Product::categories(),
            'inventory' => Inventory::all(),
            'recipesByProduct' => $recipesByProduct,
        ]);
    }

    public static function store(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        try {
            Product::create([
                'name' => $_POST['name'] ?? '',
                'price' => $_POST['price'] ?? 0,
                'cat_id' => $_POST['cat_id'] ?? 0,
            ]);
            flash('success', 'Product added.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('products');
    }

    public static function update(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        $id = (int) ($_POST['product_id'] ?? 0);
        try {
            Product::update($id, [
                'name' => $_POST['name'] ?? '',
                'price' => $_POST['price'] ?? 0,
                'cat_id' => $_POST['cat_id'] ?? 0,
                'status' => $_POST['status'] ?? 'active',
            ]);
            flash('success', 'Product updated.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('products');
    }

    public static function storeRecipe(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        try {
            Product::addRecipe(
                (int) ($_POST['product_id'] ?? 0),
                (int) ($_POST['item_id'] ?? 0),
                (float) ($_POST['qty_needed'] ?? 0)
            );
            flash('success', 'Recipe ingredient added.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('products');
    }

    public static function removeRecipe(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        try {
            Product::removeRecipe((int) ($_POST['recipe_id'] ?? 0));
            flash('success', 'Recipe line removed.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('products');
    }
}
