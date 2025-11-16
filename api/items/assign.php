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

if (!isset($data->item_id) || !isset($data->customer_id)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Item ID and Customer ID required"));
    exit();
}

try {
    // Check if item exists and is purchased from us
    $check_query = "SELECT id, purchase_type FROM items WHERE id = :item_id AND purchase_type = 'purchased_us'";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":item_id", $data->item_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Item not found or not eligible for assignment"));
        exit();
    }
    
    // Update item to assign to customer
    $query = "UPDATE items SET customer_id = :customer_id WHERE id = :item_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":customer_id", $data->customer_id);
    $stmt->bindParam(":item_id", $data->item_id);
    
    if ($stmt->execute()) {
        // Log the assignment
        $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                        VALUES (:user_id, 'assign_item', 'items', :item_id, :details)";
        $audit_stmt = $db->prepare($audit_query);
        $audit_stmt->bindParam(":user_id", $user_data['id']);
        $audit_stmt->bindParam(":item_id", $data->item_id);
        $details = json_encode(array("customer_id" => $data->customer_id));
        $audit_stmt->bindParam(":details", $details);
        $audit_stmt->execute();
        
        echo json_encode(array("success" => true, "message" => "Item assigned successfully"));
    } else {
        throw new Exception("Failed to assign item");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to assign item"));
}
?>