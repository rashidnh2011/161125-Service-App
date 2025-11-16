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
    $user_id = $_GET['user_id'] ?? null;

    // Calculate date range based on period
    $end_date = date('Y-m-d');
    switch ($period) {
        case 'month':
            $start_date = date('Y-m-d', strtotime('-30 days'));
            break;
        case 'quarter':
            $start_date = date('Y-m-d', strtotime('-90 days'));
            break;
        case 'year':
            $start_date = date('Y-m-d', strtotime('-365 days'));
            break;
        default:
            $start_date = date('Y-m-d', strtotime('-30 days'));
    }

    // Build WHERE clause for user filter
    $user_filter = "";
    $user_params = array();
    if ($user_id) {
        $user_filter = " AND sr.salesperson_id = :user_id";
        $user_params[':user_id'] = $user_id;
    }

    // Main Sales Metrics
    $metrics_query = "SELECT
        COALESCE(SUM(q.total_amount), 0) as total_revenue,
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT o.id) as total_opportunities,
        COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as total_conversions,
        COALESCE(AVG(q.total_amount), 0) as avg_deal_size,
        CASE WHEN COUNT(DISTINCT o.id) > 0 THEN
            COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) / COUNT(DISTINCT o.id)
        ELSE 0 END as conversion_rate,
        COALESCE(AVG(DATEDIFF(o.closed_date, o.created_date)), 0) as avg_sales_cycle
    FROM opportunities o
    LEFT JOIN quotations q ON o.id = q.opportunity_id
    LEFT JOIN leads l ON o.lead_id = l.id
    WHERE o.created_date BETWEEN :start_date AND :end_date
    $user_filter";

    $metrics_stmt = $db->prepare($metrics_query);
    $metrics_stmt->bindParam(':start_date', $start_date);
    $metrics_stmt->bindParam(':end_date', $end_date);
    foreach ($user_params as $key => $value) {
        $metrics_stmt->bindValue($key, $value);
    }
    $metrics_stmt->execute();
    $metrics = $metrics_stmt->fetch(PDO::FETCH_ASSOC);

    // Monthly growth calculation
    $prev_period_start = date('Y-m-d', strtotime($start_date . ' -' . (strtotime($end_date) - strtotime($start_date)) . ' days'));

    $prev_revenue_query = "SELECT COALESCE(SUM(q.total_amount), 0) as prev_revenue
                          FROM opportunities o
                          LEFT JOIN quotations q ON o.id = q.opportunity_id
                          WHERE o.created_date BETWEEN :prev_start AND :prev_end
                          $user_filter";

    $prev_stmt = $db->prepare($prev_revenue_query);
    $prev_stmt->bindParam(':prev_start', $prev_period_start);
    $prev_stmt->bindParam(':prev_end', $start_date);
    foreach ($user_params as $key => $value) {
        $prev_stmt->bindValue($key, $value);
    }
    $prev_stmt->execute();
    $prev_revenue = $prev_stmt->fetch(PDO::FETCH_ASSOC);

    $current_revenue = $metrics['total_revenue'] ?? 0;
    $previous_revenue = $prev_revenue['prev_revenue'] ?? 0;
    $monthly_growth = $previous_revenue > 0 ? (($current_revenue - $previous_revenue) / $previous_revenue) : 0;

    // Top performing salesperson
    $top_performer_query = "SELECT
        u.name,
        COALESCE(SUM(q.total_amount), 0) as revenue,
        COUNT(DISTINCT o.id) as deals
    FROM users u
    LEFT JOIN opportunities o ON u.id = o.salesperson_id
    LEFT JOIN quotations q ON o.id = q.opportunity_id AND o.stage = 'closed_won'
    WHERE o.created_date BETWEEN :start_date AND :end_date
    AND u.role = 'sales'
    GROUP BY u.id, u.name
    ORDER BY revenue DESC
    LIMIT 1";

    $top_stmt = $db->prepare($top_performer_query);
    $top_stmt->bindParam(':start_date', $start_date);
    $top_stmt->bindParam(':end_date', $end_date);
    $top_stmt->execute();
    $top_performer = $top_stmt->fetch(PDO::FETCH_ASSOC);

    // Format the response
    $response = array(
        "total_revenue" => (float)($metrics['total_revenue'] ?? 0),
        "total_leads" => (int)($metrics['total_leads'] ?? 0),
        "total_opportunities" => (int)($metrics['total_opportunities'] ?? 0),
        "total_conversions" => (int)($metrics['total_conversions'] ?? 0),
        "avg_deal_size" => (float)($metrics['avg_deal_size'] ?? 0),
        "conversion_rate" => (float)($metrics['conversion_rate'] ?? 0),
        "avg_sales_cycle" => (int)($metrics['avg_sales_cycle'] ?? 0),
        "monthly_growth" => (float)$monthly_growth,
        "quarterly_growth" => (float)$monthly_growth, // Using same calculation for quarterly
        "top_performing_salesperson" => $top_performer ? array(
            "name" => $top_performer['name'],
            "revenue" => (float)$top_performer['revenue'],
            "deals" => (int)$top_performer['deals']
        ) : null
    );

    echo json_encode(array("success" => true, "data" => $response));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch sales analytics: " . $e->getMessage()));
}
?>
