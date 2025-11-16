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
        echo json_encode(['success' => false, 'error' => 'Job ID is required']);
        exit;
    }

    // Validate job type if provided
    if (isset($input['job_type']) && !in_array($input['job_type'], ['ACCREDITED', 'NON_ACCREDITED'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid job type']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Check if job exists
    $checkQuery = "SELECT id FROM calibration_jobs WHERE id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Calibration job not found']);
        exit;
    }

    // If updating customer, validate it exists
    if (isset($input['customer_id'])) {
        $customerCheck = $db->prepare("SELECT id FROM calibration_customers WHERE id = :customer_id");
        $customerCheck->bindParam(':customer_id', $input['customer_id'], PDO::PARAM_INT);
        $customerCheck->execute();
        if ($customerCheck->rowCount() === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid customer']);
            exit;
        }
    }

    // If updating request number, check it doesn't already exist
    if (isset($input['request_number'])) {
        $checkRequestQuery = "SELECT id FROM calibration_jobs WHERE request_number = :request_number AND id != :id";
        $checkRequestStmt = $db->prepare($checkRequestQuery);
        $checkRequestStmt->bindParam(':request_number', $input['request_number'], PDO::PARAM_STR);
        $checkRequestStmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $checkRequestStmt->execute();
        if ($checkRequestStmt->rowCount() > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Request number already exists']);
            exit;
        }
    }

    // Build update query dynamically
    $updateFields = [];
    $params = [];

    if (isset($input['request_number'])) {
        $updateFields[] = 'request_number = :request_number';
        $params[':request_number'] = $input['request_number'];
    }

    if (isset($input['job_type'])) {
        $updateFields[] = 'job_type = :job_type';
        $params[':job_type'] = $input['job_type'];
    }

    if (isset($input['request_date'])) {
        $updateFields[] = 'request_date = :request_date';
        $params[':request_date'] = $input['request_date'];
    }

    if (isset($input['customer_id'])) {
        $updateFields[] = 'customer_id = :customer_id';
        $params[':customer_id'] = $input['customer_id'];
    }

    if (isset($input['remarks'])) {
        $updateFields[] = 'remarks = :remarks';
        $params[':remarks'] = $input['remarks'];
    }

    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        exit;
    }

    // Add updated_at field
    $updateFields[] = 'updated_at = CURRENT_TIMESTAMP';
    $params[':id'] = $input['id'];

    $query = "UPDATE calibration_jobs SET " . implode(', ', $updateFields) . " WHERE id = :id";
    $stmt = $db->prepare($query);

    // Bind parameters using variables
    foreach ($params as $key => $value) {
        if ($key === ':request_number' || $key === ':job_type' || $key === ':request_date' || $key === ':remarks') {
            $stmt->bindParam($key, $params[$key], PDO::PARAM_STR);
        } elseif ($key === ':customer_id' || $key === ':id') {
            $stmt->bindParam($key, $params[$key], PDO::PARAM_INT);
        }
    }

    if ($stmt->execute()) {
        // Get the updated job with customer details
        $getQuery = "SELECT cj.id, cj.request_number, cj.job_type, cj.request_date, cj.remarks,
                            cj.created_by, cj.created_at, cj.updated_at,
                            cc.id as customer_id, cc.customer_name, cc.address, cc.state, cc.email, cc.phone
                     FROM calibration_jobs cj
                     LEFT JOIN calibration_customers cc ON cj.customer_id = cc.id
                     WHERE cj.id = :id";

        $getStmt = $db->prepare($getQuery);

        // Assign to variable first
        $jobId = $input['id'];
        $getStmt->bindParam(':id', $jobId, PDO::PARAM_INT);
        $getStmt->execute();
        $job = $getStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $job,
            'message' => 'Calibration job updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to update calibration job'
        ]);
    }

} catch (Exception $e) {
    error_log("Error in calibration job update: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
