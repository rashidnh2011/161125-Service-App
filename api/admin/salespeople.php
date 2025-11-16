<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../config/jwt.php';

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
    // Salesperson Performance Analytics
    $query = "SELECT
        u.id,
        u.name,
        COALESCE(SUM(q.total_amount), 0) as total_revenue,
        COUNT(DISTINCT o.id) as total_deals,
        CASE WHEN COUNT(DISTINCT o.id) > 0 THEN
            COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) / COUNT(DISTINCT o.id)
        ELSE 0 END as conversion_rate,
        COALESCE(AVG(q.total_amount), 0) as avg_deal_size,
        COUNT(DISTINCT l.id) as leads_generated,
        COUNT(DISTINCT o.id) as opportunities_created,
        COUNT(DISTINCT a.id) as activities_logged,
        0 as monthly_growth, -- Placeholder for now
        0 as quarterly_growth, -- Placeholder for now
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(q.total_amount), 0) DESC) as rank
    FROM users u
    LEFT JOIN opportunities o ON u.id = o.salesperson_id
    LEFT JOIN quotations q ON o.id = q.opportunity_id AND o.stage = 'closed_won'
    LEFT JOIN leads l ON o.lead_id = l.id
    LEFT JOIN activities a ON u.id = a.salesperson_id
    WHERE u.role = 'sales' AND u.active = 1
    GROUP BY u.id, u.name
    ORDER BY total_revenue DESC";

    $stmt = $db->prepare($query);
    $stmt->execute();
    $salespeople = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the response
    $response = array_map(function($person) {
        return array(
            "id" => (int)$person['id'],
            "name" => $person['name'],
            "total_revenue" => (float)$person['total_revenue'],
            "total_deals" => (int)$person['total_deals'],
            "conversion_rate" => (float)$person['conversion_rate'],
            "avg_deal_size" => (float)$person['avg_deal_size'],
            "leads_generated" => (int)$person['leads_generated'],
            "opportunities_created" => (int)$person['opportunities_created'],
            "activities_logged" => (int)$person['activities_logged'],
            "monthly_growth" => (float)$person['monthly_growth'],
            "quarterly_growth" => (float)$person['quarterly_growth'],
            "rank" => (int)$person['rank']
        );
    }, $salespeople);

    echo json_encode(array("success" => true, "data" => $response));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch salesperson analytics: " . $e->getMessage()));
}
?>
