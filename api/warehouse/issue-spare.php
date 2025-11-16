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

if (!$user_data || !in_array($user_data['role'], ['admin', 'storekeeper'])) {
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

if (!isset($data->spare_inventory_ids) || !isset($data->technician_id)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Spare inventory IDs and technician ID required"));
    exit();
}

try {
    $db->beginTransaction();
    
    $issued_spares = array();
    
    foreach ($data->spare_inventory_ids as $spare_inventory_id) {
        // Check if spare is available
        $check_query = "SELECT si.*, s.name, s.part_number 
                        FROM spare_inventory si
                        LEFT JOIN spares s ON si.spare_id = s.id
                        WHERE si.id = :spare_inventory_id AND si.status = 'available'";
        
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":spare_inventory_id", $spare_inventory_id);
        $check_stmt->execute();
        
        if ($check_stmt->rowCount() == 0) {
            throw new Exception("Spare inventory ID {$spare_inventory_id} not available");
        }
        
        $spare_info = $check_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Update spare inventory status
        $update_query = "UPDATE spare_inventory 
                         SET status = 'issued', technician_id = :technician_id, updated_at = NOW()
                         WHERE id = :spare_inventory_id";
        
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(":technician_id", $data->technician_id);
        $update_stmt->bindParam(":spare_inventory_id", $spare_inventory_id);
        $update_stmt->execute();
        
        // Create technician assignment
        $assignment_query = "INSERT INTO technician_spare_assignments 
                             (technician_id, spare_inventory_id, purpose, assigned_by)
                             VALUES (:technician_id, :spare_inventory_id, :purpose, :assigned_by)";
        
        $assignment_stmt = $db->prepare($assignment_query);
        $assignment_stmt->bindParam(":technician_id", $data->technician_id);
        $assignment_stmt->bindParam(":spare_inventory_id", $spare_inventory_id);
        $purpose = $data->purpose ?? null;
        $assignment_stmt->bindParam(":purpose", $purpose);
        $assignment_stmt->bindParam(":assigned_by", $user_data['id']);
        $assignment_stmt->execute();
        
        // Log transaction
        $transaction_query = "INSERT INTO spare_transactions 
                              (spare_inventory_id, transaction_type, technician_id, previous_status, new_status, notes, created_by)
                              VALUES (:spare_inventory_id, 'issued', :technician_id, 'available', 'issued', :notes, :created_by)";
        
        $transaction_stmt = $db->prepare($transaction_query);
        $transaction_stmt->bindParam(":spare_inventory_id", $spare_inventory_id);
        $transaction_stmt->bindParam(":technician_id", $data->technician_id);
        $notes = $data->purpose ?? null;
        $transaction_stmt->bindParam(":notes", $notes);
        $transaction_stmt->bindParam(":created_by", $user_data['id']);
        $transaction_stmt->execute();
        
        // Update warehouse stock
        $stock_query = "UPDATE warehouse_stock 
                        SET available_quantity = available_quantity - 1, 
                            issued_quantity = issued_quantity + 1
                        WHERE spare_id = :spare_id";
        
        $stock_stmt = $db->prepare($stock_query);
        $stock_stmt->bindParam(":spare_id", $spare_info['spare_id']);
        $stock_stmt->execute();
        
        $issued_spares[] = array(
            "unique_spare_id" => $spare_info['unique_spare_id'],
            "name" => $spare_info['name'],
            "part_number" => $spare_info['part_number']
        );
    }
    
    // Log audit trail
    $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                    VALUES (:user_id, 'issue_spares', 'spare_inventory', :technician_id, :details)";
    $audit_stmt = $db->prepare($audit_query);
    $audit_stmt->bindParam(":user_id", $user_data['id']);
    $audit_stmt->bindParam(":technician_id", $data->technician_id);
    $audit_details = json_encode(array(
        "issued_spares" => $issued_spares,
        "purpose" => $purpose ?? null
    ));
    $audit_stmt->bindParam(":details", $audit_details);
    $audit_stmt->execute();
    
    $db->commit();
    
    echo json_encode(array(
        "success" => true, 
        "message" => count($issued_spares) . " spare(s) issued successfully",
        "data" => $issued_spares
    ));
    
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to issue spares: " . $e->getMessage()));
}
?>