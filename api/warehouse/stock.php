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

// Check if specific stock ID is requested
$stock_id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    if ($stock_id) {
        // Get specific warehouse stock record
        $query = "SELECT ws.*, s.name, s.part_number, s.brand, s.description, s.price, s.active
                  FROM spares s
                  LEFT JOIN warehouse_stock ws ON s.id = ws.spare_id
                  WHERE ws.id = :stock_id";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':stock_id', $stock_id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            http_response_code(404);
            echo json_encode(array("success" => false, "error" => "Stock record not found"));
            exit();
        }

        // Only include active spares
        if ((int)$row['active'] !== 1) {
            http_response_code(404);
            echo json_encode(array("success" => false, "error" => "Spare part not found or inactive"));
            exit();
        }

        $stock = array(
            "id" => (int)$row['id'],
            "spare_id" => (int)$row['spare_id'],
            "total_quantity" => (int)($row['total_quantity'] ?? 0),
            "available_quantity" => (int)($row['available_quantity'] ?? 0),
            "issued_quantity" => (int)($row['issued_quantity'] ?? 0),
            "consumed_quantity" => (int)($row['consumed_quantity'] ?? 0),
            "returned_quantity" => (int)($row['returned_quantity'] ?? 0),
            "minimum_stock_level" => (int)($row['minimum_stock_level'] ?? 5),
            "last_updated" => $row['last_updated'] ?? null,
            "spare" => array(
                "id" => (int)$row['spare_id'],
                "name" => $row['name'],
                "part_number" => $row['part_number'],
                "brand" => $row['brand'],
                "description" => $row['description'],
                "price" => (float)$row['price']
            ),
            "stock_status" => ($row['available_quantity'] ?? 0) <= ($row['minimum_stock_level'] ?? 5) ? 'low' : 'normal'
        );

        echo json_encode(array("success" => true, "data" => $stock));
    } else {
        // Get all warehouse stock records (existing logic)
        $query = "SELECT ws.*, s.name, s.part_number, s.brand, s.description, s.price, s.active
                  FROM spares s
                  LEFT JOIN warehouse_stock ws ON s.id = ws.spare_id
                  ORDER BY s.name ASC";

        $stmt = $db->prepare($query);
        $stmt->execute();

        $stock = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Only include active spares
            if ((int)$row['active'] !== 1) {
                continue;
            }

            // For items without warehouse stock records, create a minimal stock entry
            if ($row['spare_id'] === null) {
                $stock[] = array(
                    "id" => 0, // No warehouse stock record
                    "spare_id" => (int)$row['id'], // Use the spares.id as spare_id
                    "total_quantity" => 0,
                    "available_quantity" => 0,
                    "issued_quantity" => 0,
                    "consumed_quantity" => 0,
                    "returned_quantity" => 0,
                    "minimum_stock_level" => 5,
                    "last_updated" => null,
                    "spare" => array(
                        "id" => (int)$row['id'],
                        "name" => $row['name'],
                        "part_number" => $row['part_number'],
                        "brand" => $row['brand'],
                        "description" => $row['description'],
                        "price" => (float)$row['price']
                    ),
                    "stock_status" => 'none'
                );
            } else {
                $stock[] = array(
                    "id" => (int)($row['id'] ?? 0),
                    "spare_id" => (int)$row['spare_id'],
                    "total_quantity" => (int)($row['total_quantity'] ?? 0),
                    "available_quantity" => (int)($row['available_quantity'] ?? 0),
                    "issued_quantity" => (int)($row['issued_quantity'] ?? 0),
                    "consumed_quantity" => (int)($row['consumed_quantity'] ?? 0),
                    "returned_quantity" => (int)($row['returned_quantity'] ?? 0),
                    "minimum_stock_level" => (int)($row['minimum_stock_level'] ?? 5),
                    "last_updated" => $row['last_updated'] ?? null,
                    "spare" => array(
                        "id" => (int)$row['spare_id'], // Use ws.spare_id for existing stock records
                        "name" => $row['name'],
                        "part_number" => $row['part_number'],
                        "brand" => $row['brand'],
                        "description" => $row['description'],
                        "price" => (float)$row['price']
                    ),
                    "stock_status" => ($row['available_quantity'] ?? 0) <= ($row['minimum_stock_level'] ?? 5) ? 'low' : 'normal'
                );
            }
        }

        echo json_encode(array("success" => true, "data" => $stock));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch warehouse stock"));
}
?>