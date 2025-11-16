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

if (!isset($_GET['q']) || empty($_GET['q'])) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Search query required"));
    exit();
}

$search_term = '%' . $_GET['q'] . '%';

try {
    $query = "SELECT i.*, c.name as customer_name, c.city as customer_city
              FROM items i 
              LEFT JOIN customers c ON i.customer_id = c.id
              WHERE (i.model LIKE :search OR i.serial_number LIKE :search OR i.brand LIKE :search)
              AND i.purchase_type = 'purchased_us'
              ORDER BY i.model ASC";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":search", $search_term);
    $stmt->execute();
    
    $items = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $items[] = array(
            "id" => $row['id'],
            "customer_id" => $row['customer_id'],
            "item_type" => $row['item_type'],
            "brand" => $row['brand'],
            "model" => $row['model'],
            "serial_number" => $row['serial_number'],
            "department" => $row['department'],
            "purchase_type" => $row['purchase_type'],
            "purchase_date" => $row['purchase_date'],
            "description" => $row['description'],
            "created_at" => $row['created_at'],
            "customer" => $row['customer_name'] ? array(
                "name" => $row['customer_name'],
                "city" => $row['customer_city']
            ) : null
        );
    }
    
    echo json_encode(array("success" => true, "data" => $items));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to search items"));
}
?>