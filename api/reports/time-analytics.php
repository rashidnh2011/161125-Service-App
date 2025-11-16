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
    $start_date = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $end_date = $_GET['end_date'] ?? date('Y-m-d');
    $technician_id = $_GET['technician_id'] ?? null;
    
    $where_conditions = array("DATE(stl.start_time) BETWEEN :start_date AND :end_date");
    $params = array(
        ':start_date' => $start_date,
        ':end_date' => $end_date
    );
    
    if ($technician_id) {
        $where_conditions[] = "stl.technician_id = :technician_id";
        $params[':technician_id'] = $technician_id;
    }
    
    $where_clause = "WHERE " . implode(" AND ", $where_conditions);
    
    // Average service time by technician
    $avg_time_query = "SELECT u.name as technician_name, 
                              COUNT(stl.id) as total_services,
                              AVG(stl.duration_seconds) as avg_duration,
                              MIN(stl.duration_seconds) as min_duration,
                              MAX(stl.duration_seconds) as max_duration,
                              SUM(stl.duration_seconds) as total_duration
                       FROM service_time_logs stl
                       LEFT JOIN users u ON stl.technician_id = u.id
                       $where_clause
                       GROUP BY stl.technician_id, u.name
                       ORDER BY avg_duration ASC";
    
    $avg_time_stmt = $db->prepare($avg_time_query);
    foreach ($params as $key => $value) {
        $avg_time_stmt->bindValue($key, $value);
    }
    $avg_time_stmt->execute();
    $technicianPerformance = $avg_time_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Daily service time trends
    $daily_trends_query = "SELECT DATE(stl.start_time) as service_date,
                                  COUNT(stl.id) as services_count,
                                  AVG(stl.duration_seconds) as avg_duration,
                                  SUM(stl.duration_seconds) as total_duration
                           FROM service_time_logs stl
                           $where_clause
                           GROUP BY DATE(stl.start_time)
                           ORDER BY service_date ASC";
    
    $daily_trends_stmt = $db->prepare($daily_trends_query);
    foreach ($params as $key => $value) {
        $daily_trends_stmt->bindValue($key, $value);
    }
    $daily_trends_stmt->execute();
    $dailyTrends = $daily_trends_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Service type efficiency
    $type_efficiency_query = "SELECT sr.type,
                                     COUNT(stl.id) as services_count,
                                     AVG(stl.duration_seconds) as avg_duration
                              FROM service_time_logs stl
                              LEFT JOIN service_reports sr ON stl.service_report_id = sr.id
                              $where_clause
                              GROUP BY sr.type
                              ORDER BY avg_duration ASC";
    
    $type_efficiency_stmt = $db->prepare($type_efficiency_query);
    foreach ($params as $key => $value) {
        $type_efficiency_stmt->bindValue($key, $value);
    }
    $type_efficiency_stmt->execute();
    $serviceTypeEfficiency = $type_efficiency_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $analytics = array(
        "technicianPerformance" => array_map(function($item) {
            return array(
                "technician_name" => $item['technician_name'],
                "total_services" => (int)$item['total_services'],
                "avg_duration" => (int)$item['avg_duration'],
                "min_duration" => (int)$item['min_duration'],
                "max_duration" => (int)$item['max_duration'],
                "total_duration" => (int)$item['total_duration'],
                "avg_duration_formatted" => gmdate("H:i:s", $item['avg_duration'])
            );
        }, $technicianPerformance),
        "dailyTrends" => array_map(function($item) {
            return array(
                "service_date" => $item['service_date'],
                "services_count" => (int)$item['services_count'],
                "avg_duration" => (int)$item['avg_duration'],
                "total_duration" => (int)$item['total_duration']
            );
        }, $dailyTrends),
        "serviceTypeEfficiency" => array_map(function($item) {
            return array(
                "type" => $item['type'],
                "services_count" => (int)$item['services_count'],
                "avg_duration" => (int)$item['avg_duration'],
                "avg_duration_formatted" => gmdate("H:i:s", $item['avg_duration'])
            );
        }, $serviceTypeEfficiency)
    );
    
    echo json_encode(array("success" => true, "data" => $analytics));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch time analytics"));
}
?>