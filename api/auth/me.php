<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../config/jwt.php';

$database = new Database();
$db = $database->getConnection();
$jwt_handler = new JWTHandler();

$token = $jwt_handler->getTokenFromHeader();

if (!$token) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Access token required"));
    exit();
}

$user_data = $jwt_handler->validateToken($token);

if (!$user_data) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Invalid token"));
    exit();
}

try {
    $query = "SELECT id, username, email, role, name, created_at FROM users WHERE id = :id AND active = 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":id", $user_data['id']);
    $stmt->execute();

    if ($stmt->rowCount() == 1) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(array("success" => true, "data" => $user));
    } else {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "User not found"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to get user data"));
}
?>