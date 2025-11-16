<?php
require_once '../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Certificate ID is required']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit;
    }

    // Check if certificate exists
    $checkQuery = "SELECT id FROM calibration_certificates WHERE id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
    $checkStmt->execute();

    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Certificate not found']);
        exit;
    }

    // Validate date if provided
    $dueDate = $input['date_of_due'] ?? '';
    if (!empty($dueDate)) {
        $dueDate = date('Y-m-d', strtotime($dueDate));
        if (!$dueDate || $dueDate === '1970-01-01') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid date of due']);
            exit;
        }
    }

    // Build update fields
    $updateFields = [];
    $params = [':id' => $input['id']];

    $allowedFields = [
        'equipment_name', 'make', 'model_no', 'capacity', 'serial_no',
        'asset_no', 'date_of_due', 'location', 'customer_name'
    ];

    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateFields[] = "$field = :$field";
            $params[":$field"] = $input[$field];
        }
    }

    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        exit;
    }

    // Update certificate
    $query = "UPDATE calibration_certificates SET " . implode(', ', $updateFields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = :id";
    $stmt = $db->prepare($query);

    foreach ($params as $key => $value) {
        $stmt->bindParam($key, $params[$key], is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }

    if ($stmt->execute()) {
        // Get the updated certificate
        $getQuery = "SELECT * FROM calibration_certificates WHERE id = :id";
        $getStmt = $db->prepare($getQuery);
        $getStmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $getStmt->execute();
        $certificate = $getStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $certificate,
            'message' => 'Calibration certificate updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to update calibration certificate'
        ]);
    }

} catch (Exception $e) {
    error_log("Error in certificate update: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
