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
    // Get technician_id from query parameter if provided
    $technician_id = isset($_GET['technician_id']) ? (int)$_GET['technician_id'] : null;

    // Build query based on user role and technician filter
    if ($user_data['role'] === 'technician') {
        // Technicians can only see their own assignments
        $technician_id = $user_data['id'];
    } elseif ($user_data['role'] === 'storekeeper') {
        // Storekeepers can see all assignments (they need to manage them)
        // No additional filtering needed for storekeepers
    }
    // Admins can see all assignments

    $query = "SELECT tsa.*, si.unique_spare_id, si.status as spare_status, si.cost_price, si.selling_price,
                     s.name as spare_name, s.part_number,
                     tech.name as technician_name, tech.username as technician_username,
                     assigned_by_user.name as assigned_by_name
              FROM technician_spare_assignments tsa
              LEFT JOIN spare_inventory si ON tsa.spare_inventory_id = si.id
              LEFT JOIN spares s ON si.spare_id = s.id
              LEFT JOIN users tech ON tsa.technician_id = tech.id
              LEFT JOIN users assigned_by_user ON tsa.assigned_by = assigned_by_user.id";

    $conditions = array();
    $params = array();

    if ($technician_id) {
        $conditions[] = "tsa.technician_id = :technician_id";
        $params[':technician_id'] = $technician_id;
    }

    if (!empty($conditions)) {
        $query .= " WHERE " . implode(" AND ", $conditions);
    }

    $query .= " ORDER BY tsa.assigned_date DESC";

    $stmt = $db->prepare($query);

    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }

    $stmt->execute();

    $assignments = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $assignments[] = array(
            "id" => (int)$row['id'],
            "technician_id" => (int)$row['technician_id'],
            "spare_inventory_id" => (int)$row['spare_inventory_id'],
            "assigned_date" => $row['assigned_date'],
            "expected_return_date" => $row['expected_return_date'],
            "purpose" => $row['purpose'],
            "status" => $row['status'],
            "assigned_by" => (int)$row['assigned_by'],
            "created_at" => $row['created_at'],
            "spare_inventory" => array(
                "id" => (int)$row['spare_inventory_id'],
                "unique_spare_id" => $row['unique_spare_id'],
                "status" => $row['spare_status'],
                "cost_price" => (float)$row['cost_price'],
                "selling_price" => (float)$row['selling_price']
            ),
            "spare" => array(
                "name" => $row['spare_name'],
                "part_number" => $row['part_number']
            ),
            "technician" => array(
                "id" => (int)$row['technician_id'],
                "name" => $row['technician_name'],
                "username" => $row['technician_username']
            ),
            "assigned_by_user" => array(
                "id" => (int)$row['assigned_by'],
                "name" => $row['assigned_by_name']
            ),
            "is_overdue" => $row['expected_return_date'] && strtotime($row['expected_return_date']) < time() && $row['status'] === 'active'
        );
    }

    echo json_encode(array("success" => true, "data" => $assignments));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch technician assignments: " . $e->getMessage()));
}
?>
