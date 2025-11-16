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

if (!isset($data->spare_id) || !isset($data->quantity) || $data->quantity <= 0) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Valid spare ID and quantity required"));
    exit();
}

try {
    $db->beginTransaction();
    
    // Get spare details for unique ID generation
    $spare_query = "SELECT name, part_number, price FROM spares WHERE id = :spare_id";
    $spare_stmt = $db->prepare($spare_query);
    $spare_stmt->bindParam(":spare_id", $data->spare_id);
    $spare_stmt->execute();
    
    if ($spare_stmt->rowCount() == 0) {
        throw new Exception("Spare not found");
    }
    
    $spare = $spare_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Generate unique spare IDs and create inventory entries
    $created_spares = array();
    $base_sequence = 0;

    // Get current count for this spare_id in this year to start sequence from
    $seq_query = "SELECT COUNT(*) as current_count FROM spare_inventory
                  WHERE spare_id = :spare_id AND YEAR(created_at) = YEAR(NOW())
                  FOR UPDATE"; // Lock the rows to prevent race conditions
    $seq_stmt = $db->prepare($seq_query);
    $seq_stmt->bindParam(":spare_id", $data->spare_id);
    $seq_stmt->execute();
    $seq_result = $seq_stmt->fetch(PDO::FETCH_ASSOC);
    $base_sequence = $seq_result['current_count'];

    for ($i = 0; $i < $data->quantity; $i++) {
        $max_retries = 5; // Reduced retries since we have better logic now
        $retry_count = 0;
        $unique_spare_id = null;

        do {
            $current_sequence = $base_sequence + $i + $retry_count + 1;

            // Generate unique spare ID with better format
            $clean_name = preg_replace('/[^A-Za-z0-9]/', '', $spare['name']);
            $prefix = strtoupper(substr($clean_name, 0, 3));

            // Fallback to part number if name doesn't have enough characters
            if (strlen($prefix) < 3) {
                $clean_part = preg_replace('/[^A-Za-z0-9]/', '', $spare['part_number']);
                $prefix = strtoupper(substr($clean_part, 0, 3));
            }

            // Final fallback to 'SPARE' if no valid characters found
            if (strlen($prefix) < 3) {
                $prefix = 'SPR';
            }

            // Pad prefix to 3 characters if needed
            $prefix = str_pad($prefix, 3, 'X');

            // Create unique ID with timestamp for additional uniqueness
            $timestamp = time();
            $unique_spare_id = $prefix . '-' . date('Y') . '-' . str_pad($current_sequence, 4, '0', STR_PAD_LEFT);

            // Check if this unique_spare_id already exists
            $check_query = "SELECT COUNT(*) as count FROM spare_inventory WHERE unique_spare_id = :unique_spare_id";
            $check_stmt = $db->prepare($check_query);
            $check_stmt->bindParam(":unique_spare_id", $unique_spare_id);
            $check_stmt->execute();
            $check_result = $check_stmt->fetch(PDO::FETCH_ASSOC);

            $retry_count++;
        } while ($check_result['count'] > 0 && $retry_count < $max_retries);

        // If we still have a collision after retries, use a more unique approach
        if ($check_result['count'] > 0) {
            // Use microtime for additional uniqueness
            $unique_spare_id = $prefix . '-' . date('Y') . '-' . str_pad(($current_sequence + rand(1, 999)), 4, '0', STR_PAD_LEFT) . substr(md5(microtime()), 0, 2);

            // Final check with the ultra-unique ID
            $final_check_query = "SELECT COUNT(*) as count FROM spare_inventory WHERE unique_spare_id = :unique_spare_id";
            $final_check_stmt = $db->prepare($final_check_query);
            $final_check_stmt->bindParam(":unique_spare_id", $unique_spare_id);
            $final_check_stmt->execute();
            $final_check_result = $final_check_stmt->fetch(PDO::FETCH_ASSOC);

            if ($final_check_result['count'] > 0) {
                throw new Exception("Unable to generate unique spare ID after multiple attempts. Please try again.");
            }
        }

        // Create spare inventory entry
        $inventory_query = "INSERT INTO spare_inventory
                            (spare_id, unique_spare_id, status, batch_number, cost_price, selling_price, location_in_warehouse)
                            VALUES (:spare_id, :unique_spare_id, 'available', :batch_number, :cost_price, :selling_price, :location)";

        $inventory_stmt = $db->prepare($inventory_query);
        $inventory_stmt->bindParam(":spare_id", $data->spare_id);
        $inventory_stmt->bindParam(":unique_spare_id", $unique_spare_id);
        $batch_number = $data->batch_number ?? null;
        $inventory_stmt->bindParam(":batch_number", $batch_number);
        $cost_price = $spare['price'] * 0.7; // 70% of selling price as cost
        $inventory_stmt->bindParam(":cost_price", $cost_price);
        $inventory_stmt->bindParam(":selling_price", $spare['price']);
        $location = 'A-' . str_pad($data->spare_id, 2, '0', STR_PAD_LEFT) . '-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT);
        $inventory_stmt->bindParam(":location", $location);
        $inventory_stmt->execute();

        $inventory_id = $db->lastInsertId();
        
        // Log transaction
        $transaction_query = "INSERT INTO spare_transactions 
                              (spare_inventory_id, transaction_type, new_status, notes, created_by)
                              VALUES (:inventory_id, 'stock_in', 'available', :notes, :created_by)";
        
        $transaction_stmt = $db->prepare($transaction_query);
        $transaction_stmt->bindParam(":inventory_id", $inventory_id);
        $notes = "Stock added" . ($data->batch_number ? " - Batch: " . $data->batch_number : "");
        $transaction_stmt->bindParam(":notes", $notes);
        $transaction_stmt->bindParam(":created_by", $user_data['id']);
        $transaction_stmt->execute();
        
        $created_spares[] = $unique_spare_id;
    }
    
    // Update or create warehouse stock
    $stock_check_query = "SELECT id FROM warehouse_stock WHERE spare_id = :spare_id";
    $stock_check_stmt = $db->prepare($stock_check_query);
    $stock_check_stmt->bindParam(":spare_id", $data->spare_id);
    $stock_check_stmt->execute();
    
    if ($stock_check_stmt->rowCount() > 0) {
        // Update existing stock
        $stock_update_query = "UPDATE warehouse_stock 
                               SET total_quantity = total_quantity + :quantity,
                                   available_quantity = available_quantity + :quantity,
                                   last_updated = NOW()
                               WHERE spare_id = :spare_id";
        
        $stock_update_stmt = $db->prepare($stock_update_query);
        $stock_update_stmt->bindParam(":quantity", $data->quantity);
        $stock_update_stmt->bindParam(":spare_id", $data->spare_id);
        $stock_update_stmt->execute();
    } else {
        // Create new stock entry
        $stock_create_query = "INSERT INTO warehouse_stock 
                               (spare_id, total_quantity, available_quantity)
                               VALUES (:spare_id, :quantity, :quantity)";
        
        $stock_create_stmt = $db->prepare($stock_create_query);
        $stock_create_stmt->bindParam(":spare_id", $data->spare_id);
        $stock_create_stmt->bindParam(":quantity", $data->quantity);
        $stock_create_stmt->execute();
    }
    
    // Log audit trail
    $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                    VALUES (:user_id, 'add_stock', 'warehouse_stock', :spare_id, :details)";
    $audit_stmt = $db->prepare($audit_query);
    $audit_stmt->bindParam(":user_id", $user_data['id']);
    $audit_stmt->bindParam(":spare_id", $data->spare_id);
    $details = json_encode(array(
        "quantity_added" => $data->quantity,
        "batch_number" => $data->batch_number ?? null,
        "unique_spare_ids" => $created_spares
    ));
    $audit_stmt->bindParam(":details", $details);
    $audit_stmt->execute();
    
    $db->commit();
    
    echo json_encode(array(
        "success" => true, 
        "message" => "Stock added successfully",
        "data" => array(
            "quantity_added" => $data->quantity,
            "unique_spare_ids" => $created_spares
        )
    ));
    
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to add stock: " . $e->getMessage()));
}
?>