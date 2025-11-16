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

if (!$user_data || !in_array($user_data['role'], ['admin', 'storekeeper', 'technician'])) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

try {
    $query = "SELECT si.*, s.name, s.part_number, s.description, u.name as technician_name
              FROM spare_inventory si
              LEFT JOIN spares s ON si.spare_id = s.id
              LEFT JOIN users u ON si.technician_id = u.id";
    
    $conditions = array();
    $params = array();
    
    if (isset($_GET['status']) && !empty($_GET['status'])) {
        $conditions[] = "si.status = :status";
        $params[':status'] = $_GET['status'];
    }
    
    if (isset($_GET['technician_id']) && !empty($_GET['technician_id'])) {
        $conditions[] = "si.technician_id = :technician_id";
        $params[':technician_id'] = $_GET['technician_id'];
    }
    
    if (isset($_GET['spare_id']) && !empty($_GET['spare_id'])) {
        $conditions[] = "si.spare_id = :spare_id";
        $params[':spare_id'] = $_GET['spare_id'];
    }
    
    if (!empty($conditions)) {
        $query .= " WHERE " . implode(" AND ", $conditions);
    }
    
    $query .= " ORDER BY si.created_at DESC";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $inventory = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $inventory[] = array(
            "id" => (int)$row['id'],
            "spare_id" => (int)$row['spare_id'],
            "unique_spare_id" => $row['unique_spare_id'],
            "status" => $row['status'],
            "technician_id" => $row['technician_id'] ? (int)$row['technician_id'] : null,
            "service_report_id" => $row['service_report_id'] ? (int)$row['service_report_id'] : null,
            "batch_number" => $row['batch_number'],
            "cost_price" => (float)$row['cost_price'],
            "selling_price" => (float)$row['selling_price'],
            "location_in_warehouse" => $row['location_in_warehouse'],
            "notes" => $row['notes'],
            "created_at" => $row['created_at'],
            "updated_at" => $row['updated_at'],
            "spare" => array(
                "name" => $row['name'],
                "part_number" => $row['part_number'],
                "description" => $row['description']
            ),
            "technician" => $row['technician_name'] ? array(
                "name" => $row['technician_name']
            ) : null
        );
    }
    
    echo json_encode(array("success" => true, "data" => $inventory));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch spare inventory"));
}
?>