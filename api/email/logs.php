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
    $query = "SELECT el.*, u.name as sender_name, sr.report_number
              FROM email_logs el
              LEFT JOIN users u ON el.sender_id = u.id
              LEFT JOIN service_reports sr ON el.report_id = sr.id";
    
    if (isset($_GET['report_id']) && !empty($_GET['report_id'])) {
        $query .= " WHERE el.report_id = :report_id";
    }
    
    // Non-admin users can only see their own email logs
    if ($user_data['role'] !== 'admin') {
        $condition = isset($_GET['report_id']) ? " AND" : " WHERE";
        $query .= $condition . " el.sender_id = :sender_id";
    }
    
    $query .= " ORDER BY el.sent_at DESC";
    
    $stmt = $db->prepare($query);
    
    if (isset($_GET['report_id']) && !empty($_GET['report_id'])) {
        $stmt->bindParam(":report_id", $_GET['report_id']);
    }
    
    if ($user_data['role'] !== 'admin') {
        $stmt->bindParam(":sender_id", $user_data['id']);
    }
    
    $stmt->execute();
    
    $logs = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $logs[] = array(
            "id" => $row['id'],
            "report_id" => $row['report_id'],
            "report_number" => $row['report_number'],
            "sender_id" => $row['sender_id'],
            "sender_name" => $row['sender_name'],
            "recipients" => json_decode($row['recipients']),
            "sent_at" => $row['sent_at'],
            "status" => $row['status']
        );
    }
    
    echo json_encode(array("success" => true, "data" => $logs));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch email logs"));
}
?>