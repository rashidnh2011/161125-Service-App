<?php
header('Content-Type: text/plain');

echo "=== PHP Spreadsheet Installation Check ===\n\n";

// Check multiple possible paths
$possiblePaths = [
    __DIR__ . '/../../vendor/phpoffice/phpspreadsheet',  // Current path
    __DIR__ . '/../../../vendor/phpoffice/phpspreadsheet', // Up one more level
    __DIR__ . '/../../../../vendor/phpoffice/phpspreadsheet', // Root level
    '/home/u673588969/domains/arabscalecalibration.com/public_html/vendor/phpoffice/phpspreadsheet' // Absolute path
];

echo "Checking multiple possible PhpSpreadsheet locations:\n\n";

foreach ($possiblePaths as $i => $path) {
    echo "Path " . ($i + 1) . ": $path\n";
    echo "Exists: " . (is_dir($path) ? '✅' : '❌') . "\n";

    if (is_dir($path)) {
        echo "Contents:\n";
        $files = scandir($path);
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..') {
                $filePath = $path . '/' . $file;
                echo "  $file: " . (is_file($filePath) ? '📄' : '📁') . "\n";
            }
        }
    }
    echo "\n";
}

// Check current directory structure
echo "=== Current Directory Structure ===\n";
echo "Current dir: " . __DIR__ . "\n";
echo "Parent dir: " . dirname(__DIR__) . "\n";
echo "Grandparent dir: " . dirname(dirname(__DIR__)) . "\n";
echo "Great grandparent dir: " . dirname(dirname(dirname(__DIR__))) . "\n";

// Try to find vendor directory
echo "\n=== Finding Vendor Directory ===\n";
$dir = __DIR__;
for ($i = 0; $i < 5; $i++) {
    $vendorPath = $dir . '/vendor';
    echo "Level " . ($i + 1) . " vendor: $vendorPath - " . (is_dir($vendorPath) ? '✅' : '❌') . "\n";
    if (is_dir($vendorPath)) {
        $phpofficePath = $vendorPath . '/phpoffice/phpspreadsheet';
        echo "  PhpSpreadsheet: " . (is_dir($phpofficePath) ? '✅' : '❌') . "\n";
    }
    $dir = dirname($dir);
}
?>
