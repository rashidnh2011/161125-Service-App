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

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    http_response_code(405);
    echo json_encode(array("success" => false, "error" => "Method not allowed"));
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->username) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Username and password required"));
    exit();
}

try {
    $query = "SELECT id, username, email, role, name, password FROM users WHERE username = :username AND active = 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->execute();

    if ($stmt->rowCount() == 1) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (password_verify($data->password, $user['password'])) {
            unset($user['password']);
            
            $token = $jwt_handler->generateToken($user);
            
            // Update last login
            $update_query = "UPDATE users SET last_login = NOW() WHERE id = :id";
            $update_stmt = $db->prepare($update_query);
            $update_stmt->bindParam(":id", $user['id']);
            $update_stmt->execute();
            
            echo json_encode(array(
                "success" => true,
                "data" => array(
                    "user" => $user,
                    "token" => $token
                )
            ));
        } else {
            http_response_code(401);
            echo json_encode(array("success" => false, "error" => "Invalid credentials"));
        }
    } else {
        http_response_code(401);
        echo json_encode(array("success" => false, "error" => "Invalid credentials"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Login failed: " . $e->getMessage()));
}
?>