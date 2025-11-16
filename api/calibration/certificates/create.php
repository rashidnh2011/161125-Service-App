<?php
require_once '../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!$input || !isset($input['request_number']) || !isset($input['customer_name']) ||
        !isset($input['equipment_name']) || !isset($input['make']) || !isset($input['model_no']) ||
        !isset($input['capacity']) || !isset($input['serial_no']) || !isset($input['date_of_due']) ||
        !isset($input['location'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'All fields are required']);
        exit;
    }

    // Validate date
    $dueDate = date('Y-m-d', strtotime($input['date_of_due']));
    if (!$dueDate || $dueDate === '1970-01-01') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid date of due']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit;
    }

    // Generate certificate number if not provided
    $certificateNumber = $input['certificate_number'] ?? '';
    if (empty($certificateNumber)) {
        // Get the next sequence number for this request number
        $sequenceQuery = "SELECT COUNT(*) + 1 as next_sequence
                         FROM calibration_certificates
                         WHERE request_number = :request_number";
        $sequenceStmt = $db->prepare($sequenceQuery);
        $sequenceStmt->bindParam(':request_number', $input['request_number'], PDO::PARAM_STR);
        $sequenceStmt->execute();
        $sequenceResult = $sequenceStmt->fetch(PDO::FETCH_ASSOC);

        $nextSequence = str_pad($sequenceResult['next_sequence'], 2, '0', STR_PAD_LEFT);
        $certificateNumber = $input['request_number'] . '-' . $nextSequence;
    }

    // Check if certificate number already exists
    $checkQuery = "SELECT id FROM calibration_certificates WHERE certificate_number = :certificate_number";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':certificate_number', $certificateNumber, PDO::PARAM_STR);
    $checkStmt->execute();

    if ($checkStmt->rowCount() > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Certificate number already exists']);
        exit;
    }

    // Insert certificate
    $query = "INSERT INTO calibration_certificates
              (request_number, certificate_number, customer_name, equipment_name, make, model_no,
               capacity, serial_no, asset_no, date_of_due, location, previous_request_number, year)
              VALUES (:request_number, :certificate_number, :customer_name, :equipment_name, :make,
                      :model_no, :capacity, :serial_no, :asset_no, :date_of_due, :location,
                      :previous_request_number, :year)";

    $stmt = $db->prepare($query);

    // Extract year from request number (assuming format like ASC25/020501)
    $year = date('Y'); // Default current year
    if (preg_match('/^ASC(\d{2})/', $input['request_number'], $matches)) {
        $year = '20' . $matches[1];
    }

    // Assign values to variables first (bindParam requires variable references)
    $requestNumber = $input['request_number'];
    $certNumber = $certificateNumber;
    $customerName = $input['customer_name'];
    $equipmentName = $input['equipment_name'];
    $make = $input['make'];
    $modelNo = $input['model_no'];
    $capacity = $input['capacity'];
    $serialNo = $input['serial_no'];
    $assetNo = $input['asset_no'];
    $dueDate = $dueDate;
    $location = $input['location'];
    $previousRequestNumber = $input['previous_request_number'] ?? null;
    $certYear = $year;

    $stmt->bindParam(':request_number', $requestNumber, PDO::PARAM_STR);
    $stmt->bindParam(':certificate_number', $certNumber, PDO::PARAM_STR);
    $stmt->bindParam(':customer_name', $customerName, PDO::PARAM_STR);
    $stmt->bindParam(':equipment_name', $equipmentName, PDO::PARAM_STR);
    $stmt->bindParam(':make', $make, PDO::PARAM_STR);
    $stmt->bindParam(':model_no', $modelNo, PDO::PARAM_STR);
    $stmt->bindParam(':capacity', $capacity, PDO::PARAM_STR);
    $stmt->bindParam(':serial_no', $serialNo, PDO::PARAM_STR);
    $stmt->bindParam(':asset_no', $assetNo, PDO::PARAM_STR);
    $stmt->bindParam(':date_of_due', $dueDate, PDO::PARAM_STR);
    $stmt->bindParam(':location', $location, PDO::PARAM_STR);
    $stmt->bindParam(':previous_request_number', $previousRequestNumber, PDO::PARAM_STR);
    $stmt->bindParam(':year', $certYear, PDO::PARAM_STR);

    if ($stmt->execute()) {
        $certificateId = $db->lastInsertId();

        // Get the created certificate
        $getQuery = "SELECT * FROM calibration_certificates WHERE id = :id";
        $getStmt = $db->prepare($getQuery);
        $getStmt->bindParam(':id', $certificateId, PDO::PARAM_INT);
        $getStmt->execute();
        $certificate = $getStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $certificate,
            'message' => 'Calibration certificate created successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to create calibration certificate'
        ]);
    }

} catch (Exception $e) {
    error_log("Error in certificate create: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
