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
    // Lead Source Analysis Query
    $query = "SELECT
        COALESCE(l.source, 'Unknown') as source,
        COUNT(DISTINCT l.id) as leads,
        COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) as conversions,
        CASE WHEN COUNT(DISTINCT l.id) > 0 THEN
            COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' THEN o.id END) / COUNT(DISTINCT l.id)
        ELSE 0 END as conversion_rate,
        COALESCE(SUM(q.total_amount), 0) as revenue
    FROM leads l
    LEFT JOIN opportunities o ON l.id = o.lead_id
    LEFT JOIN quotations q ON o.id = q.opportunity_id AND o.stage = 'closed_won'
    WHERE l.created_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
    GROUP BY COALESCE(l.source, 'Unknown')
    ORDER BY leads DESC";

    $stmt = $db->prepare($query);
    $stmt->execute();
    $lead_sources = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the response
    $response = array_map(function($source) {
        return array(
            "source" => $source['source'],
            "leads" => (int)$source['leads'],
            "conversions" => (int)$source['conversions'],
            "conversion_rate" => (float)$source['conversion_rate'],
            "revenue" => (float)$source['revenue']
        );
    }, $lead_sources);

    echo json_encode(array("success" => true, "data" => $response));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch lead source analytics: " . $e->getMessage()));
}
?>
