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
    $start_date = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
    $end_date = $_GET['end_date'] ?? date('Y-m-d');
    $technician_id = $_GET['technician_id'] ?? null;
    $verified_only = isset($_GET['verified_only']) && $_GET['verified_only'] == '1';
    $suspicious_only = isset($_GET['suspicious_only']) && $_GET['suspicious_only'] == '1';
    
    $where_conditions = array("DATE(sr.visit_date) BETWEEN :start_date AND :end_date");
    $params = array(
        ':start_date' => $start_date,
        ':end_date' => $end_date
    );
    
    if ($technician_id) {
        $where_conditions[] = "sl.technician_id = :technician_id";
        $params[':technician_id'] = $technician_id;
    }
    
    if ($verified_only) {
        $where_conditions[] = "sl.admin_verified = 1";
    }
    
    if ($suspicious_only) {
        $where_conditions[] = "(stl.manipulation_flags->>'$.suspicious_duration' = 'true' OR sl.location_verified = 0)";
    }
    
    $where_clause = "WHERE " . implode(" AND ", $where_conditions);
    
    $query = "SELECT sl.*, stl.duration_seconds, stl.time_validated, stl.admin_verified, stl.manipulation_flags,
                     sr.report_number, sr.visit_date, sr.status,
                     u.name as technician_name,
                     c.name as customer_name
              FROM service_locations sl
              LEFT JOIN service_time_logs stl ON sl.service_report_id = stl.service_report_id
              LEFT JOIN service_reports sr ON sl.service_report_id = sr.id
              LEFT JOIN users u ON sl.technician_id = u.id
              LEFT JOIN customers c ON sr.customer_id = c.id
              $where_clause
              ORDER BY sr.visit_date DESC, sl.created_at DESC";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $locations = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $locations[] = array(
            "id" => (int)$row['id'],
            "service_report_id" => (int)$row['service_report_id'],
            "technician_id" => (int)$row['technician_id'],
            "technician_name" => $row['technician_name'],
            "report_number" => $row['report_number'],
            "customer_name" => $row['customer_name'],
            "start_latitude" => (float)$row['start_latitude'],
            "start_longitude" => (float)$row['start_longitude'],
            "end_latitude" => (float)$row['end_latitude'],
            "end_longitude" => (float)$row['end_longitude'],
            "start_address" => $row['start_address'],
            "end_address" => $row['end_address'],
            "distance_from_customer" => (float)$row['distance_from_customer'],
            "location_verified" => (bool)$row['location_verified'],
            "gps_accuracy" => (float)$row['gps_accuracy'],
            "service_duration" => (int)$row['duration_seconds'],
            "visit_date" => $row['visit_date'],
            "time_validated" => (bool)$row['time_validated'],
            "admin_verified" => (bool)$row['admin_verified'],
            "manipulation_flags" => json_decode($row['manipulation_flags'] ?? '{}', true)
        );
    }
    
    echo json_encode(array("success" => true, "data" => $locations));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch location tracking data: " . $e->getMessage()));
}
?>