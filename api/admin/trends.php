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

if (!$user_data || !in_array($user_data['role'], ['admin', 'sales'])) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

try {
    $period = $_GET['period'] ?? 'month';

    // Calculate date range based on period
    $end_date = date('Y-m-d');
    switch ($period) {
        case 'month':
            $start_date = date('Y-m-d', strtotime('-30 days'));
            $group_format = '%Y-%m-%d'; // Daily for month view
            break;
        case 'quarter':
            $start_date = date('Y-m-d', strtotime('-90 days'));
            $group_format = '%Y-%m-%d'; // Daily for quarter view
            break;
        case 'year':
            $start_date = date('Y-m-d', strtotime('-365 days'));
            $group_format = '%Y-%m'; // Monthly for year view
            break;
        default:
            $start_date = date('Y-m-d', strtotime('-30 days'));
            $group_format = '%Y-%m-%d';
    }

    // Sales Trends Query
    $trends_query = "SELECT
        DATE_FORMAT(o.created_date, :group_format) as period,
        COALESCE(SUM(q.total_amount), 0) as revenue,
        COUNT(DISTINCT l.id) as leads,
        COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as conversions,
        COUNT(DISTINCT o.id) as opportunities
    FROM opportunities o
    LEFT JOIN quotations q ON o.id = q.opportunity_id
    LEFT JOIN leads l ON o.lead_id = l.id
    WHERE o.created_date BETWEEN :start_date AND :end_date
    GROUP BY DATE_FORMAT(o.created_date, :group_format)
    ORDER BY period";

    $stmt = $db->prepare($trends_query);
    $stmt->bindParam(':group_format', $group_format);
    $stmt->bindParam(':start_date', $start_date);
    $stmt->bindParam(':end_date', $end_date);
    $stmt->execute();
    $trends = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the response
    $response = array_map(function($trend) {
        return array(
            "period" => $trend['period'],
            "revenue" => (float)$trend['revenue'],
            "leads" => (int)$trend['leads'],
            "conversions" => (int)$trend['conversions'],
            "opportunities" => (int)$trend['opportunities']
        );
    }, $trends);

    echo json_encode(array("success" => true, "data" => $response));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch sales trends: " . $e->getMessage()));
}
?>
