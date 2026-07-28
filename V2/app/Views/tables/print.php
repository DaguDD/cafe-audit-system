<?php require BASE_PATH . '/lib/QrGenerator.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Print QR Codes · <?= e($config['name']) ?></title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .card { border: 2px dashed #ccc; border-radius: 12px; padding: 20px; text-align: center; page-break-inside: avoid; }
        .card img { width: 180px; height: 180px; }
        .table-num { font-size: 2rem; font-weight: 700; margin: 12px 0 4px; }
        .hint { color: #666; font-size: .85rem; }
        @media print { .no-print { display: none; } body { padding: 0; } }
    </style>
</head>
<body>
    <p class="no-print"><button onclick="window.print()">Print</button></p>
    <h1 class="no-print"><?= e($config['name']) ?> — <?= e($config['cafe_name']) ?> Table QR Codes</h1>
    <div class="grid">
        <?php foreach ($tables as $t): ?>
        <?php $menuUrl = RestaurantTable::customerMenuUrl($t); ?>
        <div class="card">
            <img src="<?= e(QrGenerator::dataUri($menuUrl, 300)) ?>" alt="QR Table <?= e($t['table_number']) ?>">
            <div class="table-num">Table <?= e($t['table_number']) ?></div>
            <div class="hint">Scan to order · Seats <?= (int) $t['capacity'] ?></div>
        </div>
        <?php endforeach; ?>
    </div>
</body>
</html>
