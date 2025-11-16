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
if (!$token || !$jwt_handler->validateToken($token)) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

try {
    $query = "SELECT * FROM email_recipients WHERE active = 1 ORDER BY name ASC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $recipients = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $recipients[] = array(
            "id" => $row['id'],
            "name" => $row['name'],
            "email" => $row['email'],
            "role" => $row['role'],
            "active" => (bool)$row['active']
        );
    }
    
    echo json_encode(array("success" => true, "data" => $recipients));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch email recipients"));
}
?>