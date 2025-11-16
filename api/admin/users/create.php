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

if (!isset($data->username) || !isset($data->email) || !isset($data->name) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Username, email, name, and password are required"));
    exit();
}

try {
    // Check if username or email already exists
    $check_query = "SELECT id FROM users WHERE username = :username OR email = :email";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":username", $data->username);
    $check_stmt->bindParam(":email", $data->email);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Username or email already exists"));
        exit();
    }
    
    $query = "INSERT INTO users (username, email, name, password, role, active) 
              VALUES (:username, :email, :name, :password, :role, :active)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->bindParam(":email", $data->email);
    $stmt->bindParam(":name", $data->name);
    $stmt->bindParam(":password", password_hash($data->password, PASSWORD_DEFAULT));
    $stmt->bindParam(":role", $data->role);
    $stmt->bindParam(":active", $data->active ?? true);
    
    if ($stmt->execute()) {
        $user_id = $db->lastInsertId();
        
        // Log the creation
        $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                        VALUES (:user_id, 'create', 'users', :target_id, :details)";
        $audit_stmt = $db->prepare($audit_query);
        $audit_stmt->bindParam(":user_id", $user_data['id']);
        $audit_stmt->bindParam(":target_id", $user_id);
        $details = json_encode(array("username" => $data->username, "email" => $data->email, "role" => $data->role));
        $audit_stmt->bindParam(":details", $details);
        $audit_stmt->execute();
        
        echo json_encode(array("success" => true, "data" => array("id" => $user_id)));
    } else {
        throw new Exception("Failed to create user");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to create user"));
}
?>