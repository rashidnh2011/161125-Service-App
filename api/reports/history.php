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

if (!isset($_GET['serial_number']) || empty($_GET['serial_number'])) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Serial number required"));
    exit();
}

try {
    $query = "SELECT sr.*, c.name as customer_name, c.city as customer_city, u.name as technician_name
              FROM service_reports sr
              LEFT JOIN customers c ON sr.customer_id = c.id
              LEFT JOIN users u ON sr.technician_id = u.id
              WHERE sr.id IN (
                  SELECT DISTINCT si.service_report_id 
                  FROM service_items si
                  LEFT JOIN items i ON si.item_id = i.id
                  WHERE i.serial_number = :serial_number
              )";
    
    $query .= " ORDER BY sr.visit_date DESC";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":serial_number", $_GET['serial_number']);
    
    $stmt->execute();
    
    $reports = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $reports[] = array(
            "id" => $row['id'],
            "report_number" => $row['report_number'],
            "customer_id" => $row['customer_id'],
            "technician_id" => $row['technician_id'],
            "type" => $row['type'],
            "visit_date" => $row['visit_date'],
            "status" => $row['status'],
            "created_at" => $row['created_at'],
            "customer" => array(
                "name" => $row['customer_name'],
                "city" => $row['customer_city']
            ),
            "technician" => array(
                "name" => $row['technician_name']
            )
        );
    }
    
    echo json_encode(array("success" => true, "data" => $reports));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch scale history"));
}
?>