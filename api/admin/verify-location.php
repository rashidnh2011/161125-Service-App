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

if (!isset($data->location_id)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Location ID is required"));
    exit();
}

try {
    // Update location as admin verified
    $query = "UPDATE service_locations SET location_verified = 1 WHERE id = :location_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":location_id", $data->location_id);
    $stmt->execute();
    
    // Also update the corresponding time log
    $time_query = "UPDATE service_time_logs stl
                   JOIN service_locations sl ON stl.service_report_id = sl.service_report_id
                   SET stl.admin_verified = 1, stl.time_validated = 1
                   WHERE sl.id = :location_id";
    $time_stmt = $db->prepare($time_query);
    $time_stmt->bindParam(":location_id", $data->location_id);
    $time_stmt->execute();
    
    // Log the verification
    $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                    VALUES (:user_id, 'verify_location', 'service_locations', :location_id, :details)";
    $audit_stmt = $db->prepare($audit_query);
    $audit_stmt->bindParam(":user_id", $user_data['id']);
    $audit_stmt->bindParam(":location_id", $data->location_id);
    $details = json_encode(array("verified_by" => $user_data['name'], "verified_at" => date('Y-m-d H:i:s')));
    $audit_stmt->bindParam(":details", $details);
    $audit_stmt->execute();
    
    echo json_encode(array("success" => true, "message" => "Location verified successfully"));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to verify location: " . $e->getMessage()));
}
?>