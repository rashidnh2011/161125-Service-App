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

require_once '../config/database.php';

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

    error_log("DEBUG: Raw input received: " . file_get_contents('php://input'));
    error_log("DEBUG: Decoded input: " . json_encode($input));

    // Validate required fields
    if (!$input || !isset($input['job_type']) || !isset($input['request_date'])) {
        error_log("DEBUG: Validation failed - missing required fields");
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Job type and request date are required']);
        exit;
    }

    error_log("DEBUG: Job type: " . $input['job_type'] . ", Request date: " . $input['request_date']);

    // Validate job type
    if (!in_array($input['job_type'], ['ACCREDITED', 'NON_ACCREDITED'])) {
        error_log("DEBUG: Invalid job type: " . $input['job_type']);
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid job type']);
        exit;
    }

    // Validate and format date
    $requestDate = date('Y-m-d', strtotime($input['request_date']));
    if (!$requestDate || $requestDate === '1970-01-01') {
        error_log("DEBUG: Invalid date format. Input: " . $input['request_date'] . ", Formatted: " . $requestDate);
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid request date']);
        exit;
    }

    error_log("DEBUG: Formatted request date: " . $requestDate);

    $database = new Database();
    $db = $database->getConnection();

    // Debug: Check database connection
    if (!$db) {
        error_log("Database connection failed in generate-request-number.php");
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit;
    }

    error_log("DEBUG: Database connection established successfully");

    // Start transaction
    $db->beginTransaction();

    error_log("DEBUG: Transaction started");

    try {
        // Get or create sequence record for the date
        // Use proper PDO parameter binding instead of variable interpolation
        if ($input['job_type'] === 'ACCREDITED') {
            $sequenceQuery = "SELECT id, accredited_sequence as current_sequence
                              FROM calibration_job_sequences WHERE sequence_date = :request_date";
        } else {
            $sequenceQuery = "SELECT id, non_accredited_sequence as current_sequence
                              FROM calibration_job_sequences WHERE sequence_date = :request_date";
        }

        error_log("DEBUG: Executing query: " . $sequenceQuery . " with date: " . $requestDate);

        $stmt = $db->prepare($sequenceQuery);
        $stmt->bindParam(':request_date', $requestDate, PDO::PARAM_STR);
        $stmt->execute();

        error_log("DEBUG: Query executed successfully, checking results");

        $sequenceResult = $stmt->fetch(PDO::FETCH_ASSOC);

        error_log("DEBUG: Sequence result: " . json_encode($sequenceResult));

        $nextSequence = 1;

        if ($sequenceResult) {
            // Update existing sequence
            $nextSequence = $sequenceResult['current_sequence'] + 1;

            error_log("DEBUG: Updating existing sequence. Current: " . $sequenceResult['current_sequence'] . ", Next: " . $nextSequence);

            if ($input['job_type'] === 'ACCREDITED') {
                $updateQuery = "UPDATE calibration_job_sequences
                               SET accredited_sequence = :next_sequence
                               WHERE id = :id";
            } else {
                $updateQuery = "UPDATE calibration_job_sequences
                               SET non_accredited_sequence = :next_sequence
                               WHERE id = :id";
            }

            error_log("DEBUG: Update query: " . $updateQuery);

            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->bindParam(':next_sequence', $nextSequence, PDO::PARAM_INT);
            $updateStmt->bindParam(':id', $sequenceResult['id'], PDO::PARAM_INT);
            $updateStmt->execute();

            error_log("DEBUG: Update executed successfully");
        } else {
            // Create new sequence record
            error_log("DEBUG: Creating new sequence record");

            $insertQuery = "INSERT INTO calibration_job_sequences (sequence_date, accredited_sequence, non_accredited_sequence)
                           VALUES (:request_date, :accredited_seq, :non_accredited_seq)";

            error_log("DEBUG: Insert query: " . $insertQuery);

            $insertStmt = $db->prepare($insertQuery);

            // Assign values to variables first (bindParam requires variable references)
            $accreditedSeq = $input['job_type'] === 'ACCREDITED' ? 1 : 0;
            $nonAccreditedSeq = $input['job_type'] === 'NON_ACCREDITED' ? 1 : 0;

            error_log("DEBUG: Binding parameters - Date: " . $requestDate . ", Accredited: " . $accreditedSeq . ", Non-accredited: " . $nonAccreditedSeq);

            $insertStmt->bindParam(':request_date', $requestDate, PDO::PARAM_STR);
            $insertStmt->bindParam(':accredited_seq', $accreditedSeq, PDO::PARAM_INT);
            $insertStmt->bindParam(':non_accredited_seq', $nonAccreditedSeq, PDO::PARAM_INT);
            $insertStmt->execute();

            error_log("DEBUG: Insert executed successfully");
            $nextSequence = 1;
        }

        // Generate request number
        $yearSuffix = date('y', strtotime($requestDate)); // Last two digits of year
        $month = date('m', strtotime($requestDate));
        $day = date('d', strtotime($requestDate));
        $sequenceStr = str_pad($nextSequence, 2, '0', STR_PAD_LEFT);

        error_log("DEBUG: Date parts - Year: " . $yearSuffix . ", Month: " . $month . ", Day: " . $day . ", Sequence: " . $sequenceStr);

        if ($input['job_type'] === 'ACCREDITED') {
            $requestNumber = "ASC{$yearSuffix}/{$month}{$day}{$sequenceStr}";
        } else {
            $requestNumber = "ASC{$yearSuffix}/A{$month}{$day}{$sequenceStr}";
        }

        error_log("DEBUG: Generated request number: " . $requestNumber);

        // Check if request number already exists (shouldn't happen, but safety check)
        $checkQuery = "SELECT id FROM calibration_jobs WHERE request_number = :request_number";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':request_number', $requestNumber, PDO::PARAM_STR);
        $checkStmt->execute();

        error_log("DEBUG: Check query executed, row count: " . $checkStmt->rowCount());

        if ($checkStmt->rowCount() > 0) {
            // Rollback and try again (extremely rare case)
            $db->rollback();
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Request number already exists']);
            exit;
        }

        // Commit transaction
        error_log("DEBUG: Committing transaction");
        $db->commit();

        error_log("DEBUG: Transaction committed successfully");

        echo json_encode([
            'success' => true,
            'data' => [
                'request_number' => $requestNumber,
                'sequence' => $nextSequence,
                'request_date' => $requestDate,
                'job_type' => $input['job_type']
            ]
        ]);

        error_log("DEBUG: Response sent successfully");

    } catch (Exception $e) {
        error_log("DEBUG: Exception caught in try block: " . $e->getMessage());
        error_log("DEBUG: Exception trace: " . $e->getTraceAsString());
        $db->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("DEBUG: Final exception caught: " . $e->getMessage());
    error_log("DEBUG: Input data: " . json_encode($input));
    error_log("DEBUG: Request date: " . $requestDate);
    error_log("Error in request number generation: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'debug' => $e->getMessage() // Remove in production
    ]);
}
?>
