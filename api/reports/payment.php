<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../config/database.php';
include_once '../config/jwt.php';

$database = new Database();
$db = $database->getConnection();
$jwt_handler = new JWTHandler();

$token = $jwt_handler->getTokenFromHeader();
$user_data = $jwt_handler->validateToken($token);

if (!$user_data) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    // Get payment information
    if (!isset($_GET['report_id'])) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Report ID is required"));
        exit();
    }
    
    try {
        $query = "SELECT * FROM payment_info WHERE service_report_id = :report_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":report_id", $_GET['report_id']);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            $payment = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(array(
                "success" => true,
                "data" => array(
                    "id" => $payment['id'],
                    "service_report_id" => $payment['service_report_id'],
                    "invoice_number" => $payment['invoice_number'],
                    "receipt_number" => $payment['receipt_number'],
                    "amount" => (float)$payment['amount'],
                    "payment_status" => $payment['payment_status'],
                    "unbilled" => (bool)$payment['unbilled'],
                    "required_approval" => (bool)$payment['required_approval'],
                    "approval_status" => $payment['approval_status'],
                    "approved_by" => $payment['approved_by'],
                    "approved_at" => $payment['approved_at'],
                    "approval_notes" => $payment['approval_notes'],
                    "payment_date" => $payment['payment_date'],
                    "is_quotation" => (bool)$payment['is_quotation'],
                    "quotation_status" => $payment['quotation_status'],
                    "quotation_notes" => $payment['quotation_notes'],
                    "quotation_sent_at" => $payment['quotation_sent_at'],
                    "quotation_approved_at" => $payment['quotation_approved_at'],
                    "quotation_approved_by" => $payment['quotation_approved_by'],
                    "created_at" => $payment['created_at'],
                    "updated_at" => $payment['updated_at']
                )
            ));
        } else {
            echo json_encode(array("success" => true, "data" => null));
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to fetch payment information"));
    }
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Save payment information or quotation
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->report_id)) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Report ID is required"));
        exit();
    }

    try {
        // Check if record already exists
        $check_query = "SELECT id, is_quotation FROM payment_info WHERE service_report_id = :report_id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":report_id", $data->report_id);
        $check_stmt->execute();

        $existing_record = $check_stmt->fetch(PDO::FETCH_ASSOC);
        $is_quotation = isset($data->is_quotation) ? (int)$data->is_quotation : 0;

        if ($existing_record) {
            $existing_is_quotation = (int)$existing_record['is_quotation'];

            // If trying to save a different type, return error
            if ($existing_is_quotation !== $is_quotation) {
                http_response_code(400);
                echo json_encode(array("success" => false, "error" => "Cannot mix payment and quotation records for the same report"));
                exit();
            }

            // Update existing record
            if ($is_quotation) {
                // Update quotation
                $query = "UPDATE payment_info SET
                    invoice_number = :invoice_number,
                    amount = :amount,
                    quotation_status = :quotation_status,
                    quotation_notes = :quotation_notes,
                    quotation_sent_at = CASE WHEN :quotation_status = 'sent' AND quotation_sent_at IS NULL THEN NOW() ELSE quotation_sent_at END,
                    quotation_approved_at = CASE WHEN :quotation_status IN ('approved', 'rejected') THEN NOW() ELSE quotation_approved_at END,
                    quotation_approved_by = CASE WHEN :quotation_status IN ('approved', 'rejected') THEN :approved_by ELSE quotation_approved_by END,
                    updated_at = NOW()
                    WHERE service_report_id = :report_id";
            } else {
                // Update payment
                $query = "UPDATE payment_info SET
                    invoice_number = :invoice_number,
                    receipt_number = :receipt_number,
                    amount = :amount,
                    payment_status = :payment_status,
                    payment_date = CASE WHEN :payment_status = 'paid' AND payment_date IS NULL THEN NOW() ELSE payment_date END,
                    updated_at = NOW()
                    WHERE service_report_id = :report_id";
            }
        } else {
            // Insert new record
            if ($is_quotation) {
                // Insert quotation
                $query = "INSERT INTO payment_info (
                    service_report_id, invoice_number, amount, is_quotation, quotation_status, quotation_notes, quotation_sent_at, payment_status
                ) VALUES (
                    :report_id, :invoice_number, :amount, 1, :quotation_status, :quotation_notes, NOW(), 'unpaid'
                )";
            } else {
                // Insert payment
                $query = "INSERT INTO payment_info (
                    service_report_id, invoice_number, receipt_number, amount, payment_status
                ) VALUES (
                    :report_id, :invoice_number, :receipt_number, :amount, :payment_status
                )";
            }
        }

        $stmt = $db->prepare($query);
        $stmt->bindParam(":report_id", $data->report_id);
        $stmt->bindParam(":invoice_number", $data->invoice_number);
        $stmt->bindParam(":amount", $data->amount);

        if ($is_quotation) {
            $quotation_status = $data->quotation_status ?? 'sent';
            $quotation_notes = $data->quotation_notes ?? '';
            $stmt->bindParam(":quotation_status", $quotation_status);
            $stmt->bindParam(":quotation_notes", $quotation_notes);
            // Only bind :approved_by for UPDATE operations (existing records)
            if ($existing_record) {
                $approved_by = $user_data['id'];
                $stmt->bindParam(":approved_by", $approved_by);
            }
        } else {
            $receipt_number = $data->receipt_number ?? '';
            $payment_status = $data->payment_status ?? 'unpaid';
            $stmt->bindParam(":receipt_number", $receipt_number);
            $stmt->bindParam(":payment_status", $payment_status);
        }

        if ($stmt->execute()) {
            // Verify the payment_info record was created/updated successfully
            $verify_query = "SELECT id FROM payment_info WHERE service_report_id = :report_id LIMIT 1";
            $verify_stmt = $db->prepare($verify_query);
            $verify_stmt->bindParam(":report_id", $data->report_id);
            $verify_stmt->execute();

            if ($verify_stmt->rowCount() > 0) {
                // Update service report status based on type
                if ($is_quotation) {
                    $status_query = "UPDATE service_reports SET status = 'quotation_sent', updated_at = NOW() WHERE id = :report_id";
                    $status_stmt = $db->prepare($status_query);
                    $status_stmt->bindParam(":report_id", $data->report_id);
                    if ($status_stmt->execute()) {
                        error_log("Status updated successfully for report {$data->report_id} to quotation_sent");
                    } else {
                        error_log("Failed to update status for report {$data->report_id}: " . implode(", ", $status_stmt->errorInfo()));
                    }
                } else {
                    $status_query = "UPDATE service_reports SET status = 'completed', updated_at = NOW() WHERE id = :report_id";
                    $status_stmt = $db->prepare($status_query);
                    $status_stmt->bindParam(":report_id", $data->report_id);
                    if ($status_stmt->execute()) {
                        error_log("Status updated successfully for report {$data->report_id} to completed");
                    } else {
                        error_log("Failed to update status for report {$data->report_id}: " . implode(", ", $status_stmt->errorInfo()));
                    }
                }
            } else {
                error_log("No payment_info record found for report {$data->report_id} after insert/update");
            }

            // Log the action
            $action_type = $is_quotation ? 'quotation_added' : 'payment_update';
            $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
                            VALUES (:user_id, :action_type, 'payment_info', :report_id, :details)";
            $audit_stmt = $db->prepare($audit_query);
            $audit_stmt->bindParam(":user_id", $user_data['id']);
            $audit_stmt->bindParam(":report_id", $data->report_id);
            $audit_stmt->bindParam(":action_type", $action_type);

            $details = json_encode(array(
                "is_quotation" => $is_quotation,
                "invoice_number" => $data->invoice_number,
                "amount" => $data->amount,
                "quotation_status" => $is_quotation ? ($data->quotation_status ?? null) : null,
                "payment_status" => !$is_quotation ? ($data->payment_status ?? null) : null,
                "receipt_number" => !$is_quotation ? ($data->receipt_number ?? null) : null
            ));
            $audit_stmt->bindParam(":details", $details);
            $audit_stmt->execute();

            $message = $is_quotation ? "Quotation saved successfully" : "Payment information saved successfully";
            echo json_encode(array("success" => true, "message" => $message));
        } else {
            throw new Exception("Failed to save record");
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to save record: " . $e->getMessage()));
    }
}
?>