<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT");
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

// POST - Add quotation
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->service_report_id) || !isset($data->quotation_number) || !isset($data->amount)) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Service report ID, quotation number, and amount are required"));
        exit();
    }

    try {
        // Check if quotation already exists for this report
        $check_query = "SELECT id FROM quotations WHERE service_report_id = :service_report_id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":service_report_id", $data->service_report_id);
        $check_stmt->execute();

        if ($check_stmt->rowCount() > 0) {
            // Update existing quotation
            $query = "UPDATE quotations SET quotation_number = :quotation_number, amount = :amount, notes = :notes, updated_at = NOW() WHERE service_report_id = :service_report_id";
        } else {
            // Insert new quotation
            $query = "INSERT INTO quotations (service_report_id, quotation_number, amount, notes, status) VALUES (:service_report_id, :quotation_number, :amount, :notes, 'sent')";
        }

        $stmt = $db->prepare($query);
        $stmt->bindParam(":service_report_id", $data->service_report_id);
        $stmt->bindParam(":quotation_number", $data->quotation_number);
        $stmt->bindParam(":amount", $data->amount);
        $stmt->bindParam(":notes", $data->notes ?? '');

        if ($stmt->execute()) {
            $quotation_id = $check_stmt->rowCount() > 0 ? null : $db->lastInsertId();

            // Update service report status to quotation_sent
            $update_report_query = "UPDATE service_reports SET status = 'quotation_sent', updated_at = NOW() WHERE id = :report_id";
            $update_stmt = $db->prepare($update_report_query);
            $update_stmt->bindParam(":report_id", $data->service_report_id);
            $update_stmt->execute();

            // Log the action
            $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
                            VALUES (:user_id, 'quotation_added', 'quotations', :report_id, :details)";
            $audit_stmt = $db->prepare($audit_query);
            $audit_stmt->bindParam(":user_id", $user_data['id']);
            $audit_stmt->bindParam(":report_id", $data->service_report_id);
            $details = json_encode(array(
                "quotation_number" => $data->quotation_number,
                "amount" => $data->amount,
                "notes" => $data->notes ?? ''
            ));
            $audit_stmt->bindParam(":details", $details);
            $audit_stmt->execute();

            echo json_encode(array(
                "success" => true,
                "message" => "Quotation saved successfully",
                "quotation_id" => $quotation_id
            ));
        } else {
            throw new Exception("Failed to save quotation");
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to save quotation: " . $e->getMessage()));
    }
}

// GET - Get quotation for a service report
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if (!isset($_GET['service_report_id'])) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Service report ID is required"));
        exit();
    }

    try {
        $query = "SELECT * FROM quotations WHERE service_report_id = :service_report_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":service_report_id", $_GET['service_report_id']);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $quotation = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(array(
                "success" => true,
                "data" => array(
                    "id" => $quotation['id'],
                    "service_report_id" => $quotation['service_report_id'],
                    "quotation_number" => $quotation['quotation_number'],
                    "amount" => (float)$quotation['amount'],
                    "status" => $quotation['status'],
                    "sent_at" => $quotation['sent_at'],
                    "approved_at" => $quotation['approved_at'],
                    "approved_by" => $quotation['approved_by'],
                    "notes" => $quotation['notes'],
                    "created_at" => $quotation['created_at'],
                    "updated_at" => $quotation['updated_at']
                )
            ));
        } else {
            echo json_encode(array("success" => true, "data" => null));
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to fetch quotation"));
    }
}

// PUT - Update quotation status (approve/reject)
if ($_SERVER['REQUEST_METHOD'] == 'PUT') {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->quotation_id) || !isset($data->status)) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Quotation ID and status are required"));
        exit();
    }

    try {
        $valid_statuses = ['sent', 'approved', 'rejected'];
        if (!in_array($data->status, $valid_statuses)) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Invalid status"));
            exit();
        }

        $query = "UPDATE quotations SET status = :status, updated_at = NOW()";
        $params = [":status" => $data->status];

        if ($data->status === 'approved') {
            $query .= ", approved_at = NOW(), approved_by = :approved_by";
            $params[":approved_by"] = $user_data['id'];
        }

        $query .= " WHERE id = :quotation_id";
        $params[":quotation_id"] = $data->quotation_id;

        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindParam($key, $params[$key]);
        }

        if ($stmt->execute()) {
            // Log the action
            $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
                            VALUES (:user_id, 'quotation_updated', 'quotations', :quotation_id, :details)";
            $audit_stmt = $db->prepare($audit_query);
            $audit_stmt->bindParam(":user_id", $user_data['id']);
            $audit_stmt->bindParam(":quotation_id", $data->quotation_id);
            $details = json_encode(array("status" => $data->status));
            $audit_stmt->bindParam(":details", $details);
            $audit_stmt->execute();

            echo json_encode(array("success" => true, "message" => "Quotation status updated successfully"));
        } else {
            throw new Exception("Failed to update quotation status");
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to update quotation status: " . $e->getMessage()));
    }
}
?>
