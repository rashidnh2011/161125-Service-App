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

if (!$user_data) {
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

if (!isset($data->customer_id) || !isset($data->seal_image)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Customer ID and seal image required"));
    exit();
}

$customer_id = $data->customer_id;
$seal_image = $data->seal_image;

// Remove data:image/png;base64, prefix if present
$seal_image = str_replace('data:image/png;base64,', '', $seal_image);
$seal_image = str_replace(' ', '+', $seal_image);

// Decode base64 to binary
$seal_binary = base64_decode($seal_image);

if ($seal_binary === false) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Invalid seal image data"));
    exit();
}

try {
    // Check if seal already exists for this customer
    $check_query = "SELECT id FROM customer_seals WHERE customer_id = :customer_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":customer_id", $customer_id);
    $check_stmt->execute();

    if ($check_stmt->rowCount() > 0) {
        // Update existing seal
        $query = "UPDATE customer_seals
                  SET seal_image = :seal_image, updated_at = CURRENT_TIMESTAMP, created_by = :created_by
                  WHERE customer_id = :customer_id";
    } else {
        // Insert new seal
        $query = "INSERT INTO customer_seals (customer_id, seal_image, seal_filename, mime_type, created_by)
                  VALUES (:customer_id, :seal_image, 'customer_seal.png', 'image/png', :created_by)";
    }

    $stmt = $db->prepare($query);
    $stmt->bindParam(":customer_id", $customer_id);
    $stmt->bindParam(":seal_image", $seal_binary, PDO::PARAM_LOB);
    $stmt->bindParam(":created_by", $user_data['id']);

    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        // Get the correct seal ID
        if ($check_stmt->rowCount() > 0) {
            // Update existing seal - get the existing ID
            $existing_seal = $check_stmt->fetch(PDO::FETCH_ASSOC);
            $seal_id = $existing_seal['id'];
        } else {
            // Insert new seal - get the new ID
            $seal_id = $db->lastInsertId();
        }
        echo json_encode(array("success" => true, "message" => "Customer seal saved successfully", "seal_id" => $seal_id));
    } else {
        echo json_encode(array("success" => false, "error" => "Failed to save customer seal"));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to save customer seal: " . $e->getMessage()));
}
?>
