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
    // Get job ID from URL parameter
    if (!isset($_GET['id']) || empty($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Job ID is required']);
        exit;
    }

    $jobId = (int)$_GET['id'];

    if ($jobId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid job ID']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Check if job exists
    $checkQuery = "SELECT id, request_number FROM calibration_jobs WHERE id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $jobId, PDO::PARAM_INT);
    $checkStmt->execute();
    $jobResult = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$jobResult) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Calibration job not found']);
        exit;
    }

    // Delete the job
    $deleteQuery = "DELETE FROM calibration_jobs WHERE id = :id";
    $deleteStmt = $db->prepare($deleteQuery);
    $deleteStmt->bindParam(':id', $jobId, PDO::PARAM_INT);

    if ($deleteStmt->execute()) {
        // Also clean up the sequence record if it becomes empty (optional)
        // This could be useful to reset sequences if all jobs for a date are deleted

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $jobId,
                'request_number' => $jobResult['request_number']
            ],
            'message' => 'Calibration job deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to delete calibration job'
        ]);
    }

} catch (Exception $e) {
    error_log("Error in calibration job delete: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
