<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../config/jwt.php';

$database = new Database();
$db = $database->getConnection();
$jwt_handler = new JWTHandler();

$token = $jwt_handler->getTokenFromHeader();
$user_data = $jwt_handler->validateToken($token);

if (!$user_data || !in_array($user_data['role'], ['admin', 'storekeeper'])) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

try {
    // For storekeepers, only show technicians
    if ($user_data['role'] === 'storekeeper') {
        $query = "SELECT id, username, email, name, role, active, last_login, created_at FROM users WHERE role = 'technician' AND active = 1 ORDER BY name ASC";
    } else {
        $query = "SELECT id, username, email, name, role, active, last_login, created_at FROM users ORDER BY created_at DESC";
    }
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $users = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $users[] = array(
            "id" => (int)$row['id'],
            "username" => $row['username'],
            "email" => $row['email'],
            "name" => $row['name'],
            "role" => $row['role'],
            "active" => (bool)$row['active'],
            "last_login" => $row['last_login'],
            "created_at" => $row['created_at']
        );
    }
    
    echo json_encode(array("success" => true, "data" => $users));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch users"));
}
?>