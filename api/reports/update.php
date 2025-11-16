<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT");
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

if (!$user_data || !in_array($user_data['role'], ['admin', 'technician'])) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] != 'PUT') {
    http_response_code(405);
    echo json_encode(array("success" => false, "error" => "Method not allowed"));
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Report ID required"));
    exit();
}

try {
    $db->beginTransaction();
    
    // Check if user can edit this report
    $check_query = "SELECT id, technician_id, locked, 
                    CASE WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) <= 24 AND locked = 0 THEN 1 ELSE 0 END as can_edit
                    FROM service_reports WHERE id = :id";
    
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":id", $data->id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Report not found"));
        exit();
    }
    
    $report = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Check permissions
    $can_edit = false;
    if ($user_data['role'] === 'admin') {
        $can_edit = true;
    } elseif ($user_data['role'] === 'technician' && $report['technician_id'] == $user_data['id'] && $report['can_edit']) {
        $can_edit = true;
    }
    
    if (!$can_edit) {
        http_response_code(403);
        echo json_encode(array("success" => false, "error" => "Cannot edit this report"));
        exit();
    }
    
    // Update service report
    $update_query = "UPDATE service_reports SET 
                     visit_date = :visit_date,
                     status = :status,
                     engineer_signature = :engineer_signature,
                     customer_signature = :customer_signature,
                     notes = :notes,
                     updated_at = NOW()
                     WHERE id = :id";
    
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(":visit_date", $data->visit_date);
    $update_stmt->bindParam(":status", $data->status);
    $update_stmt->bindParam(":engineer_signature", $data->engineer_signature);
    $update_stmt->bindParam(":customer_signature", $data->customer_signature);
    $update_stmt->bindParam(":notes", $data->notes);
    $update_stmt->bindParam(":id", $data->id);
    $update_stmt->execute();
    
    // Update service items if provided
    if (isset($data->items) && is_array($data->items)) {
        foreach ($data->items as $item) {
            if (isset($item->id)) {
                // Update existing item
                $item_query = "UPDATE service_items SET 
                               complaint = :complaint,
                               diagnostics = :diagnostics,
                               action_taken = :action_taken,
                               warranty_flag = :warranty_flag,
                               notes = :notes,
                               before_images = :before_images,
                               after_images = :after_images
                               WHERE id = :id AND service_report_id = :report_id";
                
                $item_stmt = $db->prepare($item_query);
                $item_stmt->bindParam(":complaint", $item->complaint);
                $item_stmt->bindParam(":diagnostics", $item->diagnostics);
                $item_stmt->bindParam(":action_taken", $item->action_taken);
                $item_stmt->bindParam(":warranty_flag", $item->warranty_flag ? 1 : 0);
                $item_stmt->bindParam(":notes", $item->notes);
                $item_stmt->bindParam(":before_images", json_encode($item->before_images ?? []));
                $item_stmt->bindParam(":after_images", json_encode($item->after_images ?? []));
                $item_stmt->bindParam(":id", $item->id);
                $item_stmt->bindParam(":report_id", $data->id);
                $item_stmt->execute();
                
                // Update spares for this item
                if (isset($item->spares) && is_array($item->spares)) {
                    // Delete existing spares for this item
                    $delete_spares_query = "DELETE FROM service_spares WHERE service_item_id = :service_item_id";
                    $delete_spares_stmt = $db->prepare($delete_spares_query);
                    $delete_spares_stmt->bindParam(":service_item_id", $item->id);
                    $delete_spares_stmt->execute();
                    
                    // Insert updated spares
                    foreach ($item->spares as $spare) {
                        if ($spare->spare_id && $spare->quantity) {
                            $spare_query = "INSERT INTO service_spares (service_item_id, spare_id, quantity, price, spare_image) 
                                            VALUES (:service_item_id, :spare_id, :quantity, :price, :spare_image)";
                            
                            $spare_stmt = $db->prepare($spare_query);
                            $spare_stmt->bindParam(":service_item_id", $item->id);
                            $spare_stmt->bindParam(":spare_id", $spare->spare_id);
                            $spare_stmt->bindParam(":quantity", $spare->quantity);
                            $spare_stmt->bindParam(":price", $spare->price);
                            $spare_stmt->bindParam(":spare_image", $spare->spare_image ?? null);
                            $spare_stmt->execute();
                        }
                    }
                }
            }
        }
    }
    
    // Log the update
    $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                    VALUES (:user_id, 'update', 'service_reports', :report_id, :details)";
    $audit_stmt = $db->prepare($audit_query);
    $audit_stmt->bindParam(":user_id", $user_data['id']);
    $audit_stmt->bindParam(":report_id", $data->id);
    $details = json_encode(array("updated_fields" => array_keys((array)$data)));
    $audit_stmt->bindParam(":details", $details);
    $audit_stmt->execute();
    
    $db->commit();
    
    echo json_encode(array("success" => true, "message" => "Service report updated successfully"));
    
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to update service report: " . $e->getMessage()));
}
?>