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

if (!$user_data || !in_array($user_data['role'], ['admin', 'technician'])) {
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

if (!isset($data->name) || !isset($data->contact_person)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Name and contact person required"));
    exit();
}

try {
    $query = "INSERT INTO customers (name, contact_person, phone, email, address, city, state, pincode) 
              VALUES (:name, :contact_person, :phone, :email, :address, :city, :state, :pincode)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":name", $data->name);
    $stmt->bindParam(":contact_person", $data->contact_person);
    $stmt->bindParam(":phone", $data->phone ?? '');
    $stmt->bindParam(":email", $data->email ?? '');
    $stmt->bindParam(":address", $data->address ?? '');
    $stmt->bindParam(":city", $data->city ?? '');
    $stmt->bindParam(":state", $data->state ?? '');
    $stmt->bindParam(":pincode", $data->pincode ?? '');
    
    if ($stmt->execute()) {
        $customer_id = $db->lastInsertId();
        echo json_encode(array("success" => true, "data" => array("id" => $customer_id)));
    } else {
        throw new Exception("Failed to create customer");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to create customer"));
}
?>