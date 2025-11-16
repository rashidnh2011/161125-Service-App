<?php
header('Content-Type: text/plain');

echo "=== PHP Spreadsheet Installation Check ===\n\n";

// Check if autoload.php exists
$autoloadPath = __DIR__ . '/../../vendor/autoload.php';
echo "Autoloader path: $autoloadPath\n";
echo "Autoloader exists: " . (file_exists($autoloadPath) ? '✅' : '❌') . "\n\n";

// Check if PhpSpreadsheet directory exists
$phpspreadsheetPath = __DIR__ . '/../../vendor/phpoffice/phpspreadsheet';
echo "PhpSpreadsheet path: $phpspreadsheetPath\n";
echo "PhpSpreadsheet exists: " . (is_dir($phpspreadsheetPath) ? '✅' : '❌') . "\n\n";

// Check PhpSpreadsheet version and contents
if (is_dir($phpspreadsheetPath)) {
    echo "PhpSpreadsheet directory contents:\n";
    $files = scandir($phpspreadsheetPath);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $filePath = $phpspreadsheetPath . '/' . $file;
            echo "  $file: " . (is_file($filePath) ? '📄' : '📁') . "\n";
        }
    }

    // Check if src directory exists
    $srcPath = $phpspreadsheetPath . '/src';
    echo "\nSrc directory exists: " . (is_dir($srcPath) ? '✅' : '❌') . "\n";

    if (is_dir($srcPath)) {
        $srcFiles = scandir($srcPath);
        echo "Src directory contents:\n";
        foreach ($srcFiles as $file) {
            if ($file !== '.' && $file !== '..') {
                echo "  $file: " . (is_file($srcPath . '/' . $file) ? '📄' : '📁') . "\n";
            }
        }
    }
} else {
    echo "PhpSpreadsheet directory not found\n";
}

// Try to load PhpSpreadsheet manually
echo "\n=== Attempting to load PhpSpreadsheet ===\n";
$ioFactoryPath = __DIR__ . '/../../vendor/phpoffice/phpspreadsheet/src/PhpSpreadsheet/IOFactory.php';
echo "IOFactory path: $ioFactoryPath\n";

if (file_exists($ioFactoryPath)) {
    require_once $ioFactoryPath;
    echo "IOFactory loaded successfully!\n";
    echo "IOFactory class exists: " . (class_exists('PhpOffice\\PhpSpreadsheet\\IOFactory') ? '✅' : '❌') . "\n";
} else {
    echo "IOFactory.php not found!\n";
}

// Try autoloader loading
echo "\n=== Testing Autoloader ===\n";
try {
    require_once $autoloadPath;
    echo "Autoloader loaded successfully!\n";
    echo "IOFactory class exists after autoloader: " . (class_exists('PhpOffice\\PhpSpreadsheet\\IOFactory') ? '✅' : '❌') . "\n";
} catch (Exception $e) {
    echo "Autoloader error: " . $e->getMessage() . "\n";
}

// Show PHP info
echo "\n=== PHP Configuration ===\n";
echo "include_path: " . get_include_path() . "\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Current working directory: " . getcwd() . "\n";
?>
