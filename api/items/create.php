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

if (!isset($data->model) || !isset($data->serial_number) || !isset($data->item_type) || !isset($data->brand)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Item type, brand, model, and serial number required"));
    exit();
}

try {
    $query = "INSERT INTO items (customer_id, item_type, brand, model, serial_number, department, purchase_type, purchase_date, description) 
              VALUES (:customer_id, :item_type, :brand, :model, :serial_number, :department, :purchase_type, :purchase_date, :description)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":customer_id", $data->customer_id ?? null);
    $stmt->bindParam(":item_type", $data->item_type);
    $stmt->bindParam(":brand", $data->brand);
    $stmt->bindParam(":model", $data->model);
    $stmt->bindParam(":serial_number", $data->serial_number);
    $stmt->bindParam(":department", $data->department ?? '');
    $stmt->bindParam(":purchase_type", $data->purchase_type ?? 'purchased_us');
    $stmt->bindParam(":purchase_date", $data->purchase_date ?? null);
    $stmt->bindParam(":description", $data->description ?? '');
    
    if ($stmt->execute()) {
        $item_id = $db->lastInsertId();
        echo json_encode(array("success" => true, "data" => array("id" => $item_id)));
    } else {
        throw new Exception("Failed to create item");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to create item"));
}
?>