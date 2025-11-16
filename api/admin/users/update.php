<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT");
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

if ($_SERVER['REQUEST_METHOD'] != 'PUT') {
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
    // Check if username or email already exists for other users
    $check_query = "SELECT id FROM users WHERE (username = :username OR email = :email) AND id != :id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":username", $data->username);
    $check_stmt->bindParam(":email", $data->email);
    $check_stmt->bindParam(":id", $data->id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Username or email already exists"));
        exit();
    }
    
    $query = "UPDATE users SET username = :username, email = :email, name = :name, role = :role, active = :active";
    $params = array(
        ":username" => $data->username,
        ":email" => $data->email,
        ":name" => $data->name,
        ":role" => $data->role,
        ":active" => $data->active ?? true,
        ":id" => $data->id
    );
    
    if (isset($data->password) && !empty($data->password)) {
        $query .= ", password = :password";
        $params[":password"] = password_hash($data->password, PASSWORD_DEFAULT);
    }
    
    $query .= " WHERE id = :id";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    
    if ($stmt->execute()) {
        // Log the update
        $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                        VALUES (:user_id, 'update', 'users', :target_id, :details)";
        $audit_stmt = $db->prepare($audit_query);
        $audit_stmt->bindParam(":user_id", $user_data['id']);
        $audit_stmt->bindParam(":target_id", $data->id);
        $details = json_encode(array("username" => $data->username, "email" => $data->email, "role" => $data->role));
        $audit_stmt->bindParam(":details", $details);
        $audit_stmt->execute();
        
        echo json_encode(array("success" => true, "message" => "User updated successfully"));
    } else {
        throw new Exception("Failed to update user");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to update user"));
}
?>