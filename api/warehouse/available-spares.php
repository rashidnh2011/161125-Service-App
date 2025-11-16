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

if (!isset($_GET['spare_id'])) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Spare ID required"));
    exit();
}

try {
    // Get available spare units for the current technician
    $query = "SELECT si.*, s.name, s.part_number
              FROM spare_inventory si
              LEFT JOIN spares s ON si.spare_id = s.id
              WHERE si.spare_id = :spare_id 
              AND si.status = 'issued' 
              AND si.technician_id = :technician_id
              ORDER BY si.unique_spare_id ASC";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":spare_id", $_GET['spare_id']);
    $stmt->bindParam(":technician_id", $user_data['id']);
    $stmt->execute();
    
    $available_spares = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $available_spares[] = array(
            "id" => (int)$row['id'],
            "unique_spare_id" => $row['unique_spare_id'],
            "selling_price" => (float)$row['selling_price'],
            "spare" => array(
                "name" => $row['name'],
                "part_number" => $row['part_number']
            )
        );
    }
    
    echo json_encode(array("success" => true, "data" => $available_spares));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch available spares"));
}
?>