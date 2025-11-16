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

try {
    $query = "SELECT st.*, si.unique_spare_id, s.name as spare_name, s.part_number,
                     u.name as technician_name, cb.name as created_by_name
              FROM spare_transactions st
              LEFT JOIN spare_inventory si ON st.spare_inventory_id = si.id
              LEFT JOIN spares s ON si.spare_id = s.id
              LEFT JOIN users u ON st.technician_id = u.id
              LEFT JOIN users cb ON st.created_by = cb.id";
    
    $conditions = array();
    $params = array();
    
    if (isset($_GET['spare_id']) && !empty($_GET['spare_id'])) {
        $conditions[] = "si.spare_id = :spare_id";
        $params[':spare_id'] = $_GET['spare_id'];
    }
    
    if (isset($_GET['technician_id']) && !empty($_GET['technician_id'])) {
        $conditions[] = "st.technician_id = :technician_id";
        $params[':technician_id'] = $_GET['technician_id'];
    }
    
    if (isset($_GET['transaction_type']) && !empty($_GET['transaction_type'])) {
        $conditions[] = "st.transaction_type = :transaction_type";
        $params[':transaction_type'] = $_GET['transaction_type'];
    }
    
    if (!empty($conditions)) {
        $query .= " WHERE " . implode(" AND ", $conditions);
    }
    
    $query .= " ORDER BY st.transaction_date DESC LIMIT 100";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $transactions = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $transactions[] = array(
            "id" => (int)$row['id'],
            "spare_inventory_id" => (int)$row['spare_inventory_id'],
            "transaction_type" => $row['transaction_type'],
            "technician_id" => $row['technician_id'] ? (int)$row['technician_id'] : null,
            "service_report_id" => $row['service_report_id'] ? (int)$row['service_report_id'] : null,
            "quantity" => (int)$row['quantity'],
            "previous_status" => $row['previous_status'],
            "new_status" => $row['new_status'],
            "transaction_date" => $row['transaction_date'],
            "notes" => $row['notes'],
            "created_by" => (int)$row['created_by'],
            "spare_inventory" => array(
                "unique_spare_id" => $row['unique_spare_id'],
                "spare" => array(
                    "name" => $row['spare_name'],
                    "part_number" => $row['part_number']
                )
            ),
            "technician" => $row['technician_name'] ? array(
                "name" => $row['technician_name']
            ) : null,
            "created_by_user" => array(
                "name" => $row['created_by_name']
            )
        );
    }
    
    echo json_encode(array("success" => true, "data" => $transactions));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch transactions"));
}
?>