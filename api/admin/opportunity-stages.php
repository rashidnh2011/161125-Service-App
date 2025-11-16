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
    // Opportunity Stage Analysis Query
    $query = "SELECT
        o.stage,
        COUNT(DISTINCT o.id) as count,
        COALESCE(SUM(q.total_amount), 0) as value,
        COALESCE(AVG(DATEDIFF(COALESCE(o.closed_date, NOW()), o.created_date)), 0) as avg_time_in_stage
    FROM opportunities o
    LEFT JOIN quotations q ON o.id = q.opportunity_id
    WHERE o.created_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY o.stage
    ORDER BY
        CASE o.stage
            WHEN 'prospecting' THEN 1
            WHEN 'qualification' THEN 2
            WHEN 'proposal' THEN 3
            WHEN 'negotiation' THEN 4
            WHEN 'closed_won' THEN 5
            WHEN 'closed_lost' THEN 6
            ELSE 7
        END";

    $stmt = $db->prepare($query);
    $stmt->execute();
    $stages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the response
    $response = array_map(function($stage) {
        return array(
            "stage" => $stage['stage'],
            "count" => (int)$stage['count'],
            "value" => (float)$stage['value'],
            "avg_time_in_stage" => (int)$stage['avg_time_in_stage']
        );
    }, $stages);

    echo json_encode(array("success" => true, "data" => $response));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch opportunity stage analytics: " . $e->getMessage()));
}
?>
