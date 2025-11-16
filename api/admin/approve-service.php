<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
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

if (!$user_data || $user_data['role'] !== 'admin') {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    http_response_code(405);
    echo json_encode(array("success" => false, "error" => "Method not allowed"));
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->approval_id)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Approval ID is required"));
    exit();
}

try {
    $db->beginTransaction();
    
    // Update approval status
    $approval_query = "UPDATE service_approvals 
                       SET status = 'approved', approved_by = :approved_by, approved_at = NOW(), approval_notes = :notes
                       WHERE id = :approval_id AND status = 'pending'";
    
    $approval_stmt = $db->prepare($approval_query);
    $approval_stmt->bindParam(":approval_id", $data->approval_id);
    $approval_stmt->bindParam(":approved_by", $user_data['id']);
    $approval_stmt->bindParam(":notes", $data->notes);
    $approval_stmt->execute();
    
    if ($approval_stmt->rowCount() == 0) {
        throw new Exception("Approval not found or already processed");
    }
    
    // Get approval details
    $get_approval_query = "SELECT service_report_id, approval_type FROM service_approvals WHERE id = :approval_id";
    $get_approval_stmt = $db->prepare($get_approval_query);
    $get_approval_stmt->bindParam(":approval_id", $data->approval_id);
    $get_approval_stmt->execute();
    $approval_info = $get_approval_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Update payment info approval status if it's a payment approval
    if ($approval_info['approval_type'] === 'payment') {
        $payment_query = "UPDATE payment_info 
                          SET approval_status = 'approved', approved_by = :approved_by, approved_at = NOW()
                          WHERE service_report_id = :service_report_id";
        
        $payment_stmt = $db->prepare($payment_query);
        $payment_stmt->bindParam(":approved_by", $user_data['id']);
        $payment_stmt->bindParam(":service_report_id", $approval_info['service_report_id']);
        $payment_stmt->execute();
    }
    
    // Log the approval
    $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                    VALUES (:user_id, 'approve_service', 'service_approvals', :approval_id, :details)";
    $audit_stmt = $db->prepare($audit_query);
    $audit_stmt->bindParam(":user_id", $user_data['id']);
    $audit_stmt->bindParam(":approval_id", $data->approval_id);
    $details = json_encode(array("notes" => $data->notes, "approval_type" => $approval_info['approval_type']));
    $audit_stmt->bindParam(":details", $details);
    $audit_stmt->execute();
    
    $db->commit();
    
    echo json_encode(array("success" => true, "message" => "Service approved successfully"));
    
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to approve service: " . $e->getMessage()));
}
?>