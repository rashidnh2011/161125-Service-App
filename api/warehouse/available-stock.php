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
$user_data = $jwt_handler->validateToken($token);

if (!$user_data || !in_array($user_data['role'], ['admin', 'storekeeper'])) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

try {
    // Get all available stock (items in warehouse that are available, not issued)
    $query = "SELECT s.id as spare_id, s.name, s.part_number, s.brand, s.description, s.price, s.active,
                     ws.id as warehouse_stock_id, ws.total_quantity, ws.available_quantity, ws.issued_quantity,
                     ws.consumed_quantity, ws.returned_quantity, ws.minimum_stock_level, ws.last_updated,
                     COUNT(si.id) as available_items_count
              FROM spares s
              LEFT JOIN warehouse_stock ws ON s.id = ws.spare_id
              LEFT JOIN spare_inventory si ON s.id = si.spare_id AND si.status = 'available'
              WHERE s.active = 1
              GROUP BY s.id, ws.id
              ORDER BY s.name ASC";

    $stmt = $db->prepare($query);
    $stmt->execute();

    $available_stock = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Handle cases where there's no warehouse stock record
        if ($row['warehouse_stock_id'] === null) {
            $available_stock[] = array(
                "spare_id" => (int)$row['spare_id'],
                "name" => $row['name'],
                "part_number" => $row['part_number'],
                "brand" => $row['brand'],
                "description" => $row['description'],
                "price" => (float)$row['price'],
                "total_quantity" => 0,
                "available_quantity" => 0,
                "issued_quantity" => 0,
                "consumed_quantity" => 0,
                "returned_quantity" => 0,
                "minimum_stock_level" => 5,
                "available_items_count" => (int)$row['available_items_count'],
                "stock_status" => 'none',
                "last_updated" => null
            );
        } else {
            $available_stock[] = array(
                "spare_id" => (int)$row['spare_id'],
                "name" => $row['name'],
                "part_number" => $row['part_number'],
                "brand" => $row['brand'],
                "description" => $row['description'],
                "price" => (float)$row['price'],
                "total_quantity" => (int)($row['total_quantity'] ?? 0),
                "available_quantity" => (int)($row['available_quantity'] ?? 0),
                "issued_quantity" => (int)($row['issued_quantity'] ?? 0),
                "consumed_quantity" => (int)($row['consumed_quantity'] ?? 0),
                "returned_quantity" => (int)($row['returned_quantity'] ?? 0),
                "minimum_stock_level" => (int)($row['minimum_stock_level'] ?? 5),
                "available_items_count" => (int)$row['available_items_count'],
                "stock_status" => ($row['available_quantity'] ?? 0) <= ($row['minimum_stock_level'] ?? 5) ? 'low' : 'normal',
                "last_updated" => $row['last_updated'] ?? null
            );
        }
    }

    echo json_encode(array("success" => true, "data" => $available_stock));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch available stock: " . $e->getMessage()));
}
?>
