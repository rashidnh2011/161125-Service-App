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
    $user_id = $_GET['user_id'] ?? null;
    $report_type = $_GET['report_type'] ?? null;
    
    $where_conditions = array("sr.visit_date BETWEEN :start_date AND :end_date");
    $params = array(
        ':start_date' => $start_date,
        ':end_date' => $end_date
    );
    
    if ($user_id) {
        $where_conditions[] = "sr.technician_id = :user_id";
        $params[':user_id'] = $user_id;
    }
    
    if ($report_type) {
        $where_conditions[] = "sr.type = :report_type";
        $params[':report_type'] = $report_type;
    }
    
    $where_clause = "WHERE " . implode(" AND ", $where_conditions);
    
    // Service Volume Over Time
    $volume_query = "SELECT DATE(sr.visit_date) as date, COUNT(*) as count 
                     FROM service_reports sr 
                     $where_clause 
                     GROUP BY DATE(sr.visit_date) 
                     ORDER BY date";
    $volume_stmt = $db->prepare($volume_query);
    foreach ($params as $key => $value) {
        $volume_stmt->bindValue($key, $value);
    }
    $volume_stmt->execute();
    $serviceVolumeOverTime = $volume_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Payment Status Breakdown
    $payment_query = "SELECT 
                        COALESCE(pi.payment_status, 'no_payment') as status,
                        COUNT(*) as count,
                        COALESCE(SUM(pi.amount), 0) as amount
                      FROM service_reports sr 
                      LEFT JOIN payment_info pi ON sr.id = pi.service_report_id
                      $where_clause 
                      GROUP BY COALESCE(pi.payment_status, 'no_payment')";
    $payment_stmt = $db->prepare($payment_query);
    foreach ($params as $key => $value) {
        $payment_stmt->bindValue($key, $value);
    }
    $payment_stmt->execute();
    $paymentStatusBreakdown = $payment_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // User Activity Trends
    $activity_query = "SELECT u.name as user_name, COUNT(sr.id) as report_count 
                       FROM users u 
                       LEFT JOIN service_reports sr ON u.id = sr.technician_id AND sr.visit_date BETWEEN :start_date AND :end_date
                       WHERE u.role = 'technician' AND u.active = 1
                       GROUP BY u.id, u.name 
                       ORDER BY report_count DESC";
    $activity_stmt = $db->prepare($activity_query);
    $activity_stmt->bindParam(':start_date', $start_date);
    $activity_stmt->bindParam(':end_date', $end_date);
    $activity_stmt->execute();
    $userActivityTrends = $activity_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Report Type Distribution
    $type_query = "SELECT sr.type, COUNT(*) as count 
                   FROM service_reports sr 
                   $where_clause 
                   GROUP BY sr.type";
    $type_stmt = $db->prepare($type_query);
    foreach ($params as $key => $value) {
        $type_stmt->bindValue($key, $value);
    }
    $type_stmt->execute();
    $reportTypeDistribution = $type_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Monthly Revenue
    $revenue_query = "SELECT 
                        DATE_FORMAT(sr.visit_date, '%Y-%m') as month,
                        COALESCE(SUM(pi.amount), 0) as revenue
                      FROM service_reports sr 
                      LEFT JOIN payment_info pi ON sr.id = pi.service_report_id
                      $where_clause 
                      GROUP BY DATE_FORMAT(sr.visit_date, '%Y-%m') 
                      ORDER BY month";
    $revenue_stmt = $db->prepare($revenue_query);
    foreach ($params as $key => $value) {
        $revenue_stmt->bindValue($key, $value);
    }
    $revenue_stmt->execute();
    $monthlyRevenue = $revenue_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $analytics = array(
        "serviceVolumeOverTime" => $serviceVolumeOverTime,
        "paymentStatusBreakdown" => array_map(function($item) {
            return array(
                "status" => $item['status'],
                "count" => (int)$item['count'],
                "amount" => (float)$item['amount']
            );
        }, $paymentStatusBreakdown),
        "userActivityTrends" => array_map(function($item) {
            return array(
                "user_name" => $item['user_name'],
                "report_count" => (int)$item['report_count']
            );
        }, $userActivityTrends),
        "reportTypeDistribution" => array_map(function($item) {
            return array(
                "type" => $item['type'],
                "count" => (int)$item['count']
            );
        }, $reportTypeDistribution),
        "monthlyRevenue" => array_map(function($item) {
            return array(
                "month" => $item['month'],
                "revenue" => (float)$item['revenue']
            );
        }, $monthlyRevenue)
    );
    
    echo json_encode(array("success" => true, "data" => $analytics));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch analytics data"));
}
?>