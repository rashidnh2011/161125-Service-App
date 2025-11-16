<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../../config/database.php';
include_once '../../config/jwt.php';

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

if (!isset($data->id)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "User ID is required"));
    exit();
}

try {
    // Prevent deactivating the current admin user
    if ($data->id == $user_data['id']) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Cannot deactivate your own account"));
        exit();
    }
    
    $query = "UPDATE users SET active = NOT active WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":id", $data->id);
    
    if ($stmt->execute()) {
        // Get new status for audit log
        $status_query = "SELECT active, username FROM users WHERE id = :id";
        $status_stmt = $db->prepare($status_query);
        $status_stmt->bindParam(":id", $data->id);
        $status_stmt->execute();
        $status_info = $status_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Log the status change
        $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                        VALUES (:user_id, 'toggle_status', 'users', :target_id, :details)";
        $audit_stmt = $db->prepare($audit_query);
        $audit_stmt->bindParam(":user_id", $user_data['id']);
        $audit_stmt->bindParam(":target_id", $data->id);
        $details = json_encode(array(
            "username" => $status_info['username'],
            "new_status" => $status_info['active'] ? 'active' : 'inactive'
        ));
        $audit_stmt->bindParam(":details", $details);
        $audit_stmt->execute();
        
        echo json_encode(array("success" => true, "message" => "User status updated successfully"));
    } else {
        throw new Exception("Failed to update user status");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to update user status"));
}
?>