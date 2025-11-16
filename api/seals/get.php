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

if (!$user_data) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] != 'GET') {
    http_response_code(405);
    echo json_encode(array("success" => false, "error" => "Method not allowed"));
    exit();
}

if (!isset($_GET['customer_id'])) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Customer ID required"));
    exit();
}

$customer_id = $_GET['customer_id'];

try {
    $query = "SELECT cs.*, u.name as created_by_name
              FROM customer_seals cs
              LEFT JOIN users u ON cs.created_by = u.id
              WHERE cs.customer_id = :customer_id";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":customer_id", $customer_id);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $seal = $stmt->fetch(PDO::FETCH_ASSOC);

        // Convert BLOB to base64 for JSON response
        $seal['seal_image'] = base64_encode($seal['seal_image']);

        echo json_encode(array("success" => true, "data" => $seal));
    } else {
        echo json_encode(array("success" => true, "data" => null));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch customer seal: " . $e->getMessage()));
}
?>
