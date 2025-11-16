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

if (!$user_data || $user_data['role'] !== 'admin') {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

try {
    $query = "SELECT sa.*, sr.report_number, sr.visit_date, sr.type as report_type,
                     c.name as customer_name, u.name as requested_by_name,
                     pi.invoice_number, pi.amount, pi.payment_status
              FROM service_approvals sa
              LEFT JOIN service_reports sr ON sa.service_report_id = sr.id
              LEFT JOIN customers c ON sr.customer_id = c.id
              LEFT JOIN users u ON sa.requested_by = u.id
              LEFT JOIN payment_info pi ON sr.id = pi.service_report_id";
    
    $conditions = array();
    $params = array();
    
    if (isset($_GET['status']) && !empty($_GET['status'])) {
        $conditions[] = "sa.status = :status";
        $params[':status'] = $_GET['status'];
    }
    
    if (!empty($conditions)) {
        $query .= " WHERE " . implode(" AND ", $conditions);
    }
    
    $query .= " ORDER BY sa.created_at DESC";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $approvals = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $approvals[] = array(
            "id" => (int)$row['id'],
            "service_report_id" => (int)$row['service_report_id'],
            "approval_type" => $row['approval_type'],
            "status" => $row['status'],
            "priority" => $row['priority'],
            "reason" => $row['reason'],
            "approved_by" => $row['approved_by'] ? (int)$row['approved_by'] : null,
            "approved_at" => $row['approved_at'],
            "approval_notes" => $row['approval_notes'],
            "created_at" => $row['created_at'],
            "service_report" => array(
                "report_number" => $row['report_number'],
                "visit_date" => $row['visit_date'],
                "type" => $row['report_type'],
                "customer_name" => $row['customer_name']
            ),
            "requested_by_user" => array(
                "name" => $row['requested_by_name']
            ),
            "payment_info" => $row['invoice_number'] ? array(
                "invoice_number" => $row['invoice_number'],
                "amount" => (float)$row['amount'],
                "payment_status" => $row['payment_status']
            ) : null
        );
    }
    
    echo json_encode(array("success" => true, "data" => $approvals));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch approvals"));
}
?>