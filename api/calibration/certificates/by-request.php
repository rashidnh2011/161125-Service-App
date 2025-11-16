<?php
require_once '../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Get request number from query parameter
    $requestNumber = $_GET['request_number'] ?? '';

    if (empty($requestNumber)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Request number is required']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit;
    }

    // Get all certificates for this request number
    $query = "SELECT * FROM calibration_certificates
              WHERE request_number = :request_number
              ORDER BY certificate_number";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':request_number', $requestNumber, PDO::PARAM_STR);
    $stmt->execute();

    $certificates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'certificates' => $certificates,
            'count' => count($certificates)
        ]
    ]);

} catch (Exception $e) {
    error_log("Error in certificates by request number: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
