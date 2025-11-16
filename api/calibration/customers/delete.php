<?php
require_once '../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Get customer ID from URL parameter
    if (!isset($_GET['id']) || empty($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Customer ID is required']);
        exit;
    }

    $customerId = (int)$_GET['id'];

    if ($customerId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid customer ID']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Check if customer exists
    $checkQuery = "SELECT id, customer_name FROM calibration_customers WHERE id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $customerId, PDO::PARAM_INT);
    $checkStmt->execute();
    $customerResult = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$customerResult) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Customer not found']);
        exit;
    }

    // Check if customer has any jobs
    $jobsCheckQuery = "SELECT COUNT(*) as job_count FROM calibration_jobs WHERE customer_id = :customer_id";
    $jobsCheckStmt = $db->prepare($jobsCheckQuery);
    $jobsCheckStmt->bindParam(':customer_id', $customerId, PDO::PARAM_INT);
    $jobsCheckStmt->execute();
    $jobsResult = $jobsCheckStmt->fetch(PDO::FETCH_ASSOC);

    if ($jobsResult['job_count'] > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'Cannot delete customer with existing calibration jobs. Please delete or reassign jobs first.'
        ]);
        exit;
    }

    // Delete the customer
    $deleteQuery = "DELETE FROM calibration_customers WHERE id = :id";
    $deleteStmt = $db->prepare($deleteQuery);
    $deleteStmt->bindParam(':id', $customerId, PDO::PARAM_INT);

    if ($deleteStmt->execute()) {
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $customerId,
                'customer_name' => $customerResult['customer_name']
            ],
            'message' => 'Customer deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to delete customer'
        ]);
    }

} catch (Exception $e) {
    error_log("Error in calibration customer delete: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
