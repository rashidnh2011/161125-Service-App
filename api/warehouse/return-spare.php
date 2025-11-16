<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../config/database.php';
include_once '../config/jwt.php';

$database = new Database();
$db = $database->getConnection();
$jwt_handler = new JWTHandler();

$token = $jwt_handler->getTokenFromHeader();
$user_data = $jwt_handler->validateToken($token);

if (!$user_data || !in_array($user_data['role'], ['admin', 'storekeeper', 'technician'])) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    http_response_code(405);
    echo json_encode(array("success" => false, "error" => "Method not allowed"));
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->spare_inventory_ids) || empty($data->spare_inventory_ids)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Spare inventory IDs required"));
    exit();
}

try {
    $db->beginTransaction();
    
    $returned_spares = array();
    
    foreach ($data->spare_inventory_ids as $spare_inventory_id) {
        // Check if spare is issued to current technician (if technician role)
        $check_query = "SELECT si.*, s.name, s.part_number 
                        FROM spare_inventory si
                        LEFT JOIN spares s ON si.spare_id = s.id
                        WHERE si.id = :spare_inventory_id AND si.status = 'issued'";
        
        if ($user_data['role'] === 'technician') {
            $check_query .= " AND si.technician_id = :technician_id";
        }
        
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":spare_inventory_id", $spare_inventory_id);
        if ($user_data['role'] === 'technician') {
            $check_stmt->bindParam(":technician_id", $user_data['id']);
        }
        $check_stmt->execute();
        
        if ($check_stmt->rowCount() == 0) {
            throw new Exception("Spare inventory ID {$spare_inventory_id} not available for return");
        }
        
        $spare_info = $check_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Update spare inventory status
        $update_query = "UPDATE spare_inventory 
                         SET status = 'returned', technician_id = NULL, service_report_id = NULL, updated_at = NOW()
                         WHERE id = :spare_inventory_id";
        
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(":spare_inventory_id", $spare_inventory_id);
        $update_stmt->execute();
        
        // Update technician assignment status
        $assignment_query = "UPDATE technician_spare_assignments 
                             SET status = 'completed'
                             WHERE spare_inventory_id = :spare_inventory_id AND status = 'active'";
        
        $assignment_stmt = $db->prepare($assignment_query);
        $assignment_stmt->bindParam(":spare_inventory_id", $spare_inventory_id);
        $assignment_stmt->execute();
        
        // Log transaction
        $transaction_query = "INSERT INTO spare_transactions 
                              (spare_inventory_id, transaction_type, technician_id, previous_status, new_status, notes, created_by)
                              VALUES (:spare_inventory_id, 'returned', :technician_id, 'issued', 'returned', :notes, :created_by)";
        
        $transaction_stmt = $db->prepare($transaction_query);
        $transaction_stmt->bindParam(":spare_inventory_id", $spare_inventory_id);
        $transaction_stmt->bindParam(":technician_id", $spare_info['technician_id']);
        $notes_value = $data->notes ?? 'Returned to warehouse';
        $transaction_stmt->bindParam(":notes", $notes_value);
        $transaction_stmt->bindParam(":created_by", $user_data['id']);
        $transaction_stmt->execute();
        
        // Update warehouse stock
        $stock_query = "UPDATE warehouse_stock 
                        SET available_quantity = available_quantity + 1, 
                            issued_quantity = issued_quantity - 1,
                            returned_quantity = returned_quantity + 1
                        WHERE spare_id = :spare_id";
        
        $stock_stmt = $db->prepare($stock_query);
        $stock_stmt->bindParam(":spare_id", $spare_info['spare_id']);
        $stock_stmt->execute();
        
        $returned_spares[] = array(
            "unique_spare_id" => $spare_info['unique_spare_id'],
            "name" => $spare_info['name'],
            "part_number" => $spare_info['part_number']
        );
    }
    
    // Log audit trail
    $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                    VALUES (:user_id, 'return_spares', 'spare_inventory', 0, :details)";
    $audit_stmt = $db->prepare($audit_query);
    $audit_stmt->bindParam(":user_id", $user_data['id']);
    $details = json_encode(array(
        "returned_spares" => $returned_spares,
        "notes" => $data->notes ?? null
    ));
    $audit_stmt->bindParam(":details", $details);
    $audit_stmt->execute();
    
    $db->commit();
    
    echo json_encode(array(
        "success" => true, 
        "message" => count($returned_spares) . " spare(s) returned successfully",
        "data" => $returned_spares
    ));
    
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to return spares: " . $e->getMessage()));
}
?>