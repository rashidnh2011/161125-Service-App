<?php

// Set error handling to return JSON instead of HTML
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");

// Custom error handler to return JSON
function handleError($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "PHP Error: $errstr in $errfile:$errline",
        "error_code" => $errno
    ]);
    exit();
}

function handleFatalError() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "PHP Fatal Error: " . $error['message'] . " in " . $error['file'] . ":" . $error['line']
        ]);
        exit();
    }
}

// Register error handlers
set_error_handler('handleError');
register_shutdown_function('handleFatalError');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../config/database.php';
include_once '../config/jwt.php';

// Include PhpSpreadsheet autoloader if not already included
try {
    // Try multiple possible vendor paths
    $vendorPaths = [
        __DIR__ . '/../vendor/autoload.php',           // Standard location: api/vendor/autoload.php
        __DIR__ . '/../../vendor/autoload.php',        // Alternative location: public_html/api/vendor/autoload.php
        __DIR__ . '/vendor/autoload.php',              // Local vendor
        dirname(__DIR__, 2) . '/vendor/autoload.php'   // From api/spares/ up to public_html/api/
    ];

    $autoloadLoaded = false;
    foreach ($vendorPaths as $vendorPath) {
        if (file_exists($vendorPath)) {
            require_once $vendorPath;
            $autoloadLoaded = true;
            error_log("Loaded autoloader from: " . $vendorPath); // Debug log
            break;
        }
    }

    if (!$autoloadLoaded) {
        // Try manual include of PhpSpreadsheet - check if files exist first
        $manualPaths = [
            __DIR__ . '/../vendor/phpoffice/phpspreadsheet/src/PhpSpreadsheet/IOFactory.php',
            __DIR__ . '/../../vendor/phpoffice/phpspreadsheet/src/PhpSpreadsheet/IOFactory.php',
            __DIR__ . '/vendor/phpoffice/phpspreadsheet/src/PhpSpreadsheet/IOFactory.php'
        ];

        foreach ($manualPaths as $manualPath) {
            if (file_exists($manualPath)) {
                require_once $manualPath;
                error_log("Manually loaded PhpSpreadsheet from: " . $manualPath); // Debug log
                $autoloadLoaded = true;
                break;
            }
        }
    }

    if (!$autoloadLoaded) {
        // Last resort: Try to find and manually include PhpSpreadsheet
        $possibleLocations = [
            __DIR__ . '/../vendor/phpoffice/phpspreadsheet/src/PhpSpreadsheet/IOFactory.php',
            __DIR__ . '/../../vendor/phpoffice/phpspreadsheet/src/PhpSpreadsheet/IOFactory.php',
            __DIR__ . '/vendor/phpoffice/phpspreadsheet/src/PhpSpreadsheet/IOFactory.php',
            '/home/u673588969/domains/arabscalecalibration.com/public_html/api/vendor/phpoffice/phpspreadsheet/src/PhpSpreadsheet/IOFactory.php'
        ];

        foreach ($possibleLocations as $location) {
            if (file_exists($location)) {
                require_once $location;
                error_log("Found and loaded PhpSpreadsheet from: " . $location);
                $autoloadLoaded = true;
                break;
            }
        }
    }

    if (!$autoloadLoaded) {
        // Provide detailed debugging info
        $debugInfo = [];
        $debugPaths = [
            __DIR__ . '/../vendor/autoload.php',
            __DIR__ . '/../vendor/phpoffice/phpspreadsheet/',
            __DIR__ . '/../../vendor/autoload.php',
            __DIR__ . '/../../vendor/phpoffice/phpspreadsheet/',
        ];

        foreach ($debugPaths as $path) {
            $debugInfo[$path] = [
                'exists' => file_exists($path),
                'is_file' => is_file($path),
                'is_dir' => is_dir($path),
                'readable' => is_readable($path)
            ];
        }

        throw new Exception("PhpSpreadsheet not found. Debug info: " . json_encode($debugInfo, JSON_PRETTY_PRINT));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to load PhpSpreadsheet: " . $e->getMessage()));
    exit();
}

// Import PhpSpreadsheet classes after autoloader is loaded
// FIX: The 'use' statement must be in the global scope (outside of any function or block).
use PhpOffice\PhpSpreadsheet\IOFactory;

// Only allow POST and OPTIONS for this endpoint
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("success" => false, "error" => "Method not allowed"));
    exit();
} // Added missing brace here to close the 'if' block. The rest of the code was unintentionally inside the previous 'if' block.

$database = new Database();
try {
    $db = $database->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Database connection failed: " . $e->getMessage()));
    exit();
}

$jwt_handler = new JWTHandler();

// Check if JWT handler was created successfully
if (!$jwt_handler) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to initialize JWT handler"));
    exit();
}

$token = $jwt_handler->getTokenFromHeader();
if (!$token) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "No token provided in Authorization header"));
    exit();
}

try {
    $token_valid = $jwt_handler->validateToken($token);
    if ($token_valid === false) {
        http_response_code(401);
        echo json_encode(array("success" => false, "error" => "Invalid or expired token"));
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Token validation error: " . $e->getMessage()));
    exit();
}

try {
    // Get user info from token (reuse the already validated token data)
    $user_data = $token_valid; // Use the already validated token data
    if (!$user_data || !isset($user_data['id'])) {
        http_response_code(401);
        echo json_encode(array("success" => false, "error" => "Invalid token data"));
        exit();
    }

    // Check if file was uploaded
    if (!isset($_FILES['excelFile']) || $_FILES['excelFile']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        // Safely check for error code if $_FILES['excelFile'] is not set
        $errorCode = isset($_FILES['excelFile']['error']) ? $_FILES['excelFile']['error'] : 'unknown';
        echo json_encode(array("success" => false, "error" => "No file uploaded or upload error. Error code: " . $errorCode));
        exit();
    }

    $file = $_FILES['excelFile'];
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    // Validate file type
    if (!in_array($fileExtension, ['xlsx', 'xls', 'csv'])) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Invalid file type '{$fileExtension}'. Only .xlsx, .xls, and .csv files are allowed"));
        exit();
    }

    // Check file size (max 10MB)
    if ($file['size'] > 10 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "File too large ({$file['size']} bytes). Maximum size is 10MB"));
        exit();
    }

    // NOTE: Autoloader has been moved to the top. The check for it is still valid.

    $importResults = array(
        'success' => true,
        'total' => 0,
        'imported' => 0,
        'failed' => 0,
        'errors' => array()
    );

    try {
        // Load the Excel file - let it fail naturally if PhpSpreadsheet isn't available
        $spreadsheet = IOFactory::load($file['tmp_name']);
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();

        if (empty($rows)) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Excel file is empty or contains no readable data"));
            exit();
        }
        if (count($rows) === 1 && empty(array_filter($rows[0]))) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Excel file appears to be empty"));
            exit();
        }

        // Skip header row and process data
        $headerSkipped = false;
        $rowNumber = 0;

        foreach ($rows as $row) {
            $rowNumber++;

            // Skip empty rows
            if (empty(array_filter($row))) {
                continue;
            }

            // Skip header row (first row with data)
            if (!$headerSkipped && (
                stripos($row[0], 'name') !== false ||
                stripos($row[0], 'part') !== false ||
                stripos($row[0], 'brand') !== false ||
                stripos($row[0], 'price') !== false ||
                stripos($row[0], 'description') !== false
            )) {
                $headerSkipped = true;
                continue;
            }

            $importResults['total']++;

            // Map columns (assuming order: name, part_number, brand, price, description)
            $spareData = array(
                'name' => trim($row[0] ?? ''),
                'part_number' => trim($row[1] ?? ''),
                'brand' => trim($row[2] ?? ''),
                'price' => floatval($row[3] ?? 0),
                'description' => trim($row[4] ?? '')
            );

            // Validate required fields
            if (empty($spareData['name'])) {
                $importResults['failed']++;
                $importResults['errors'][] = "Row {$rowNumber}: Spare name is required";
                continue;
            }

            if (empty($spareData['part_number'])) {
                $importResults['failed']++;
                $importResults['errors'][] = "Row {$rowNumber}: Part number is required";
                continue;
            }

            if ($spareData['price'] < 0) {
                $importResults['failed']++;
                $importResults['errors'][] = "Row {$rowNumber}: Price cannot be negative";
                continue;
            }

            // Check if spare already exists
            $checkQuery = "SELECT id FROM spares WHERE part_number = ? LIMIT 1";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->execute([$spareData['part_number']]);
            $existingSpare = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existingSpare) {
                $importResults['failed']++;
                $importResults['errors'][] = "Row {$rowNumber}: Spare with part number '{$spareData['part_number']}' already exists";
                continue;
            }

            try {
                $db->beginTransaction();

                // Insert spare
                $query = "INSERT INTO spares (name, part_number, brand, price, description, stock_qty) VALUES (?, ?, ?, ?, ?, 0)";
                $stmt = $db->prepare($query);
                $result = $stmt->execute([
                    $spareData['name'],
                    $spareData['part_number'],
                    $spareData['brand'] ?: null,
                    $spareData['price'],
                    $spareData['description']
                ]);

                if ($result) {
                    $spare_id = $db->lastInsertId();

                    // Initialize warehouse stock record for this spare
                    $warehouse_query = "INSERT INTO warehouse_stock (spare_id, total_quantity, available_quantity, issued_quantity, consumed_quantity, returned_quantity, minimum_stock_level)
                                        VALUES (?, 0, 0, 0, 0, 0, 10)";
                    $warehouse_stmt = $db->prepare($warehouse_query);
                    $warehouse_stmt->execute([$spare_id]);

                    $db->commit();
                    $importResults['imported']++;
                } else {
                    $db->rollBack();
                    $importResults['failed']++;
                    $importResults['errors'][] = "Row {$rowNumber}: Failed to create spare record";
                }

            } catch (Exception $e) {
                $db->rollBack();
                $importResults['failed']++;
                $importResults['errors'][] = "Row {$rowNumber}: Database error - " . $e->getMessage();
            }
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Error reading Excel file: " . $e->getMessage()));
        exit();
    }

    // Clean up uploaded file
    if (file_exists($file['tmp_name'])) {
        unlink($file['tmp_name']);
    }

    echo json_encode($importResults);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Server error: " . $e->getMessage()));
}
?>