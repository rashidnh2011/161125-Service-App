<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");

include_once '../config/database.php';
include_once '../config/jwt.php';

$database = new Database();
$db = $database->getConnection();
$jwt_handler = new JWTHandler();

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$token = $jwt_handler->getTokenFromHeader();
if (!$token || !$jwt_handler->validateToken($token)) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

try {
    // Get user info from token
    $user_data = $jwt_handler->validateToken($token);
    if (!$user_data) {
        http_response_code(401);
        echo json_encode(array("success" => false, "error" => "Invalid token"));
        exit();
    }
    $user_id = $user_data['id'];

    // Get posted data
    $data = json_decode(file_get_contents("php://input"));

    // Validate required fields
    if (!isset($data->name) || empty(trim($data->name))) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Spare name is required"));
        exit();
    }

    if (!isset($data->part_number) || empty(trim($data->part_number))) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Part number is required"));
        exit();
    }

    if (!isset($data->price) || $data->price < 0) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Valid price is required"));
        exit();
    }

    // Prepare the insert query
    $query = "INSERT INTO spares (name, part_number, brand, price, description, stock_qty) VALUES (?, ?, ?, ?, ?, 0)";
    $stmt = $db->prepare($query);

    // Execute with data
    $result = $stmt->execute([
        trim($data->name),
        trim($data->part_number),
        isset($data->brand) ? trim($data->brand) : null,
        $data->price,
        isset($data->description) ? trim($data->description) : ''
    ]);

    if ($result) {
        $spare_id = $db->lastInsertId();

        // Initialize warehouse stock record for this spare
        $warehouse_query = "INSERT INTO warehouse_stock (spare_id, total_quantity, available_quantity, issued_quantity, consumed_quantity, returned_quantity, minimum_stock_level)
                           VALUES (?, 0, 0, 0, 0, 0, 10)";
        $warehouse_stmt = $db->prepare($warehouse_query);
        $warehouse_stmt->execute([$spare_id]);

        // Return the created spare data
        $spare_query = "SELECT * FROM spares WHERE id = ?";
        $spare_stmt = $db->prepare($spare_query);
        $spare_stmt->execute([$spare_id]);
        $spare = $spare_stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(array(
            "success" => true,
            "data" => array(
                "id" => (int)$spare['id'],
                "name" => $spare['name'],
                "part_number" => $spare['part_number'],
                "brand" => $spare['brand'],
                "price" => (float)$spare['price'],
                "stock_qty" => (int)$spare['stock_qty'],
                "description" => $spare['description']
            ),
            "message" => "Spare created successfully"
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to create spare"));
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Database error: " . $e->getMessage()));
}
?>
