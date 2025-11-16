<?php
// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/error.log');

// Ensure logs directory exists
if (!is_dir(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0777, true);
}

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

    error_log("DEBUG: Jobs Create - Raw input: " . file_get_contents('php://input'));
    error_log("DEBUG: Jobs Create - Decoded input: " . json_encode($input));

    // Validate required fields
    if (!$input || !isset($input['request_number']) || !isset($input['job_type']) ||
        !isset($input['request_date']) || !isset($input['customer_id'])) {
        error_log("DEBUG: Jobs Create - Validation failed - missing required fields");
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'All fields are required']);
        exit;
    }

    error_log("DEBUG: Jobs Create - Request number: " . $input['request_number'] . ", Job type: " . $input['job_type'] . ", Date: " . $input['request_date'] . ", Customer ID: " . $input['customer_id']);

    // Validate job type
    if (!in_array($input['job_type'], ['ACCREDITED', 'NON_ACCREDITED'])) {
        error_log("DEBUG: Jobs Create - Invalid job type: " . $input['job_type']);
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid job type']);
        exit;
    }

    // Validate and format date
    $requestDate = date('Y-m-d', strtotime($input['request_date']));
    if (!$requestDate || $requestDate === '1970-01-01') {
        error_log("DEBUG: Jobs Create - Invalid date format. Input: " . $input['request_date'] . ", Formatted: " . $requestDate);
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid request date']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Debug: Check database connection
    if (!$db) {
        error_log("ERROR: Jobs Create - Database connection failed");
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit;
    }

    error_log("DEBUG: Jobs Create - Database connection established");

    // Check if customer exists
    $customerCheckQuery = "SELECT id FROM calibration_customers WHERE id = :customer_id";
    $customerCheckStmt = $db->prepare($customerCheckQuery);
    $customerCheckStmt->bindParam(':customer_id', $input['customer_id'], PDO::PARAM_INT);
    $customerCheckStmt->execute();

    error_log("DEBUG: Jobs Create - Customer check executed, row count: " . $customerCheckStmt->rowCount());

    if ($customerCheckStmt->rowCount() === 0) {
        error_log("ERROR: Jobs Create - Invalid customer ID: " . $input['customer_id']);
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid customer']);
        exit;
    }

    // Check if request number already exists
    $checkQuery = "SELECT id FROM calibration_jobs WHERE request_number = :request_number";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':request_number', $input['request_number'], PDO::PARAM_STR);
    $checkStmt->execute();

    error_log("DEBUG: Jobs Create - Request number check executed, row count: " . $checkStmt->rowCount());

    if ($checkStmt->rowCount() > 0) {
        error_log("ERROR: Jobs Create - Request number already exists: " . $input['request_number']);
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Request number already exists']);
        exit;
    }

    // Get current user from session
    session_start();
    $createdBy = $_SESSION['user_name'] ?? 'System';
    error_log("DEBUG: Jobs Create - Created by: " . $createdBy . ", Session user_name: " . ($_SESSION['user_name'] ?? 'NOT_SET'));

    // Insert new job
    $query = "INSERT INTO calibration_jobs (request_number, job_type, request_date, customer_id, remarks, created_by)
              VALUES (:request_number, :job_type, :request_date, :customer_id, :remarks, :created_by)";

    error_log("DEBUG: Jobs Create - Insert query: " . $query);

    $stmt = $db->prepare($query);

    // Assign values to variables first (bindParam requires variable references)
    $requestNumber = $input['request_number'];
    $jobType = $input['job_type'];
    $requestDate = $input['request_date'];
    $customerId = $input['customer_id'];
    $remarks = $input['remarks'] ?? '';

    error_log("DEBUG: Jobs Create - Binding parameters - Number: " . $requestNumber . ", Type: " . $jobType . ", Date: " . $requestDate . ", Customer: " . $customerId . ", Remarks: " . $remarks . ", Created by: " . $createdBy);

    $stmt->bindParam(':request_number', $requestNumber, PDO::PARAM_STR);
    $stmt->bindParam(':job_type', $jobType, PDO::PARAM_STR);
    $stmt->bindParam(':request_date', $requestDate, PDO::PARAM_STR);
    $stmt->bindParam(':customer_id', $customerId, PDO::PARAM_INT);
    $stmt->bindParam(':remarks', $remarks, PDO::PARAM_STR);
    $stmt->bindParam(':created_by', $createdBy, PDO::PARAM_STR);

    error_log("DEBUG: Jobs Create - Executing insert statement");

    if ($stmt->execute()) {
        $jobId = $db->lastInsertId();
        error_log("DEBUG: Jobs Create - Insert successful, Job ID: " . $jobId);

        // Get the created job with customer details
        $getQuery = "SELECT cj.id, cj.request_number, cj.job_type, cj.request_date, cj.remarks,
                            cj.created_by, cj.created_at,
                            cc.id as customer_id, cc.customer_name, cc.address, cc.state, cc.email, cc.phone
                     FROM calibration_jobs cj
                     LEFT JOIN calibration_customers cc ON cj.customer_id = cc.id
                     WHERE cj.id = :job_id";

        error_log("DEBUG: Jobs Create - Get query: " . $getQuery . " with job_id: " . $jobId);

        $getStmt = $db->prepare($getQuery);
        $getStmt->bindParam(':job_id', $jobId, PDO::PARAM_INT);
        $getStmt->execute();

        error_log("DEBUG: Jobs Create - Get query executed, row count: " . $getStmt->rowCount());

        $job = $getStmt->fetch(PDO::FETCH_ASSOC);

        error_log("DEBUG: Jobs Create - Retrieved job: " . json_encode($job));

        echo json_encode([
            'success' => true,
            'data' => $job,
            'message' => 'Calibration job created successfully'
        ]);

        error_log("DEBUG: Jobs Create - Response sent successfully");
    } else {
        error_log("ERROR: Jobs Create - Insert failed");
        error_log("ERROR: Jobs Create - PDO Error: " . implode(", ", $stmt->errorInfo()));
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to create calibration job'
        ]);
    }

} catch (Exception $e) {
    error_log("ERROR: Jobs Create - Exception caught: " . $e->getMessage());
    error_log("ERROR: Jobs Create - Exception trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'debug' => $e->getMessage()
    ]);
}
?>
