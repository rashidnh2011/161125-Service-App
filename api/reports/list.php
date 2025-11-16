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
    // Base query
    $query = "SELECT sr.*, c.name as customer_name, c.city as customer_city, u.name as technician_name,
              pi.invoice_number, pi.receipt_number, pi.amount, pi.payment_status, pi.payment_date,
              CASE WHEN TIMESTAMPDIFF(HOUR, sr.created_at, NOW()) <= 24 AND sr.locked = 0 THEN 1 ELSE 0 END as can_edit
              FROM service_reports sr
              LEFT JOIN customers c ON sr.customer_id = c.id
              LEFT JOIN users u ON sr.technician_id = u.id
              LEFT JOIN payment_info pi ON sr.id = pi.service_report_id";

    $params = array();

    // Add WHERE clause if we have any conditions
    $whereAdded = false;
    
    // Non-admin users can only see their own reports
    if ($user_data['role'] !== 'admin') {
        $query .= " WHERE sr.technician_id = :technician_id";
        $params[':technician_id'] = $user_data['id'];
        $whereAdded = true;
    }
    
    // Filter by customer_id if provided
    if (isset($_GET['customer_id']) && is_numeric($_GET['customer_id'])) {
        $query .= $whereAdded ? " AND" : " WHERE";
        $query .= " sr.customer_id = :customer_id";
        $params[':customer_id'] = (int)$_GET['customer_id'];
        $whereAdded = true;
    }
    
    // Filter by type if provided
    if (isset($_GET['type']) && in_array($_GET['type'], ['inspection', 'completion', 'one_time'])) {
        $query .= $whereAdded ? " AND" : " WHERE";
        $query .= " sr.type = :type";
        $params[':type'] = $_GET['type'];
        $whereAdded = true;
    }
    
    // Filter by status if provided (can be single value or array)
    if (isset($_GET['status'])) {
        $statuses = is_array($_GET['status']) ? $_GET['status'] : [$_GET['status']];
        $validStatuses = ['draft', 'inspection', 'completed', 'sent'];
        $filteredStatuses = array_intersect($statuses, $validStatuses);
        
        if (!empty($filteredStatuses)) {
            $query .= $whereAdded ? " AND" : " WHERE";
            $query .= " sr.status IN(" . implode(',', array_fill(0, count($filteredStatuses), '?')) . ")";
            foreach ($filteredStatuses as $i => $status) {
                $params["status_$i"] = $status;
            }
            $whereAdded = true;
        }
    }

    $query .= " ORDER BY sr.created_at DESC LIMIT 100";

    $stmt = $db->prepare($query);

    // Bind parameters
    foreach ($params as $param => $value) {
        $stmt->bindValue($param, $value);
    }

    $stmt->execute();
    
    $reports = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Admin can always edit, others only within 24 hours
        $can_edit = ($user_data['role'] === 'admin') ? true : (bool)$row['can_edit'];
        
        $reports[] = array(
            "id" => $row['id'],
            "report_number" => $row['report_number'],
            "customer_id" => $row['customer_id'],
            "technician_id" => $row['technician_id'],
            "type" => $row['type'],
            "parent_report_id" => $row['parent_report_id'],
            "visit_date" => $row['visit_date'],
            "status" => $row['status'],
            "locked" => (bool)$row['locked'],
            "notes" => $row['notes'],
            "created_at" => $row['created_at'],
            "updated_at" => $row['updated_at'],
            "can_edit" => $can_edit,
            "customer" => array(
                "name" => $row['customer_name'],
                "city" => $row['customer_city']
            ),
            "technician" => array(
                "name" => $row['technician_name']
            ),
            "payment_info" => array(
                "invoice_number" => $row['invoice_number'],
                "receipt_number" => $row['receipt_number'],
                "amount" => (float)$row['amount'],
                "payment_status" => $row['payment_status'],
                "payment_date" => $row['payment_date']
            )
        );
    }
    
    echo json_encode(array("success" => true, "data" => $reports));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "error" => "Failed to fetch reports",
        "debug" => $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ));
}
?>