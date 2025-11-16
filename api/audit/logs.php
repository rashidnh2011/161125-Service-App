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
    $query = "SELECT al.*, u.name as user_name 
              FROM audit_logs al
              LEFT JOIN users u ON al.user_id = u.id";
    
    $conditions = array();
    $params = array();
    
    if (isset($_GET['target_table']) && !empty($_GET['target_table'])) {
        $conditions[] = "al.target_table = :target_table";
        $params[':target_table'] = $_GET['target_table'];
    }
    
    if (isset($_GET['target_id']) && !empty($_GET['target_id'])) {
        $conditions[] = "al.target_id = :target_id";
        $params[':target_id'] = $_GET['target_id'];
    }
    
    if (!empty($conditions)) {
        $query .= " WHERE " . implode(" AND ", $conditions);
    }
    
    $query .= " ORDER BY al.timestamp DESC LIMIT 100";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $logs = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $logs[] = array(
            "id" => $row['id'],
            "user_id" => $row['user_id'],
            "user_name" => $row['user_name'],
            "action" => $row['action'],
            "target_table" => $row['target_table'],
            "target_id" => $row['target_id'],
            "details" => $row['details'],
            "timestamp" => $row['timestamp']
        );
    }
    
    echo json_encode(array("success" => true, "data" => $logs));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch audit logs"));
}
?>