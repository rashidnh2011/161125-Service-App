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

if (!$user_data || !in_array($user_data['role'], ['admin', 'technician'])) {
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

if (!isset($data->customer_id) || !isset($data->items) || empty($data->items)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Customer ID and items required"));
    exit();
}

try {
    $db->beginTransaction();
    
    // Generate report number
    $report_number = 'SR' . date('Y') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    
    // If this is a completion report, update the parent inspection report status
    if (isset($data->parent_report_id) && $data->parent_report_id && $data->type === 'completion') {
        $update_parent_query = "UPDATE service_reports SET status = 'completed', updated_at = NOW() WHERE id = :parent_id AND type = 'inspection'";
        $update_parent_stmt = $db->prepare($update_parent_query);
        $update_parent_stmt->bindParam(":parent_id", $data->parent_report_id);
        $update_parent_stmt->execute();
    }
    
    // Create service report
    $query = "INSERT INTO service_reports (report_number, customer_id, technician_id, type, parent_report_id, visit_date, status, locked, engineer_signature, customer_signature, signature_person_name, signature_person_contact, notes) 
              VALUES (:report_number, :customer_id, :technician_id, :type, :parent_report_id, :visit_date, :status, :locked, :engineer_signature, :customer_signature, :signature_person_name, :signature_person_contact, :notes)";
    
    $stmt = $db->prepare($query);

    // Use temporary variables for optional parameters to ensure they can be passed by reference
    $type = $data->type ?? 'one_time';
    $visit_date = $data->visit_date ?? date('Y-m-d');
    $status = $data->status ?? 'draft';
    $locked = 0;

    $stmt->bindParam(":report_number", $report_number);
    $stmt->bindParam(":customer_id", $data->customer_id);
    $stmt->bindParam(":technician_id", $user_data['id']);
    $stmt->bindParam(":type", $type);
    $stmt->bindParam(":parent_report_id", $data->parent_report_id);
    $stmt->bindParam(":visit_date", $visit_date);
    $stmt->bindParam(":status", $status);
    $stmt->bindParam(":locked", $locked);
    $stmt->bindParam(":engineer_signature", $data->engineer_signature);
    $stmt->bindParam(":customer_signature", $data->customer_signature);
    $stmt->bindParam(":signature_person_name", $data->signature_person_name);
    $stmt->bindParam(":signature_person_contact", $data->signature_person_contact);
    $stmt->bindParam(":notes", $data->notes);
    
    $stmt->execute();
    $report_id = $db->lastInsertId();
    
    // Log service time if provided
    if (isset($data->service_start_time) && isset($data->service_end_time) && isset($data->service_duration)) {
        $time_log_query = "INSERT INTO service_time_logs (service_report_id, start_time, end_time, duration_seconds, technician_id) 
                           VALUES (:report_id, :start_time, :end_time, :duration, :technician_id)";
        
        $time_log_stmt = $db->prepare($time_log_query);
        $time_log_stmt->bindParam(":report_id", $report_id);
        $time_log_stmt->bindParam(":start_time", $data->service_start_time);
        $time_log_stmt->bindParam(":end_time", $data->service_end_time);
        $time_log_stmt->bindParam(":duration", $data->service_duration);
        $time_log_stmt->bindParam(":technician_id", $user_data['id']);
        $time_log_stmt->execute();
        
        $time_log_id = $db->lastInsertId();
        
        // Log location data if provided
        if (isset($data->location_data) && $data->gps_enabled) {
            $location_query = "INSERT INTO service_locations 
                               (service_report_id, technician_id, start_latitude, start_longitude, 
                                end_latitude, end_longitude, start_address, end_address, gps_accuracy, location_verified) 
                               VALUES (:report_id, :technician_id, :start_lat, :start_lng, 
                                       :end_lat, :end_lng, :start_addr, :end_addr, :accuracy, :verified)";
            
            $location_stmt = $db->prepare($location_query);
            $location_stmt->bindParam(":report_id", $report_id);
            $location_stmt->bindParam(":technician_id", $user_data['id']);

            // Use temporary variables for optional location parameters
            $start_lat = $data->location_data->start->lat ?? null;
            $start_lng = $data->location_data->start->lng ?? null;
            $end_lat = $data->location_data->end->lat ?? null;
            $end_lng = $data->location_data->end->lng ?? null;
            $start_addr = $data->location_data->start->address ?? null;
            $end_addr = $data->location_data->end->address ?? null;
            $accuracy = $data->location_data->start->accuracy ?? null;
            $verified = $data->gps_enabled ? 1 : 0;

            $location_stmt->bindParam(":start_lat", $start_lat);
            $location_stmt->bindParam(":start_lng", $start_lng);
            $location_stmt->bindParam(":end_lat", $end_lat);
            $location_stmt->bindParam(":end_lng", $end_lng);
            $location_stmt->bindParam(":start_addr", $start_addr);
            $location_stmt->bindParam(":end_addr", $end_addr);
            $location_stmt->bindParam(":accuracy", $accuracy);
            $location_stmt->bindParam(":verified", $verified);
            $location_stmt->execute();
            
            // Update time log with location reference and validation flags
            $update_time_query = "UPDATE service_time_logs SET 
                                  browser_timezone = :timezone,
                                  system_time_check = NOW(),
                                  time_validated = :validated,
                                  manipulation_flags = :flags
                                  WHERE id = :time_log_id";
            
            $manipulation_flags = array(
                'gps_enabled' => $data->gps_enabled,
                'timezone' => $data->browser_timezone ?? null,
                'location_accuracy' => $data->location_data->start->accuracy ?? null,
                'suspicious_duration' => $data->service_duration < 300 || $data->service_duration > 28800 // Less than 5 min or more than 8 hours
            );
            
            $update_time_stmt = $db->prepare($update_time_query);

            // Use temporary variables for optional time log parameters
            $timezone = $data->browser_timezone;
            $validated = $data->gps_enabled ? 1 : 0;
            $flags_json = json_encode($manipulation_flags);

            $update_time_stmt->bindParam(":timezone", $timezone);
            $update_time_stmt->bindParam(":validated", $validated);
            $update_time_stmt->bindParam(":flags", $flags_json);
            $update_time_stmt->bindParam(":time_log_id", $time_log_id);
            $update_time_stmt->execute();
        }
    }
    
    // Handle invoice data for one_time and completion reports
    if (isset($data->invoice_data) && ($data->type === 'one_time' || $data->type === 'completion')) {
        $invoice = $data->invoice_data;
        
        // Create approval request if required
        if ($invoice->required_approval) {
            $approval_query = "INSERT INTO service_approvals (service_report_id, approval_type, requested_by, reason) 
                               VALUES (:report_id, 'payment', :requested_by, :reason)";
            $approval_stmt = $db->prepare($approval_query);
            $approval_stmt->bindParam(":report_id", $report_id);
            $approval_stmt->bindParam(":requested_by", $user_data['id']);
            $reason = "Payment approval required for service report";
            $approval_stmt->bindParam(":reason", $reason);
            $approval_stmt->execute();
        }
        
        // Save payment info
        $payment_query = "INSERT INTO payment_info (service_report_id, invoice_number, receipt_number, amount, payment_status, unbilled, required_approval) 
                          VALUES (:report_id, :invoice_number, :receipt_number, :amount, :payment_status, :unbilled, :required_approval)";
        
        $payment_stmt = $db->prepare($payment_query);
        $payment_stmt->bindParam(":report_id", $report_id);
        $payment_stmt->bindParam(":invoice_number", $invoice->invoice_number);
        $payment_stmt->bindParam(":receipt_number", $invoice->receipt_number);

        // Use temporary variable for amount to fix PDO binding issue
        $amount = $invoice->amount ? floatval($invoice->amount) : null;
        $payment_stmt->bindParam(":amount", $amount);

        $payment_stmt->bindParam(":payment_status", $invoice->payment_status);

        // Use temporary variables for boolean values to fix PDO binding issue
        $unbilled = $invoice->unbilled ? 1 : 0;
        $required_approval = $invoice->required_approval ? 1 : 0;
        $payment_stmt->bindParam(":unbilled", $unbilled);
        $payment_stmt->bindParam(":required_approval", $required_approval);
        $payment_stmt->execute();
    }
    
    // Create service items
    foreach ($data->items as $item) {
        // Handle manual item creation if needed
        $item_id = null;
        if (isset($item->manual_item_data) && $item->manual_item_data) {
            $manual_item = $item->manual_item_data;
            $create_item_query = "INSERT INTO items (customer_id, item_type, brand, model, serial_number, department, purchase_type) 
                                  VALUES (:customer_id, :item_type, :brand, :model, :serial_number, :department, :purchase_type)";
            $create_item_stmt = $db->prepare($create_item_query);
            $create_item_stmt->bindParam(":customer_id", $data->customer_id);
            $create_item_stmt->bindParam(":item_type", $manual_item->item_type);
            $create_item_stmt->bindParam(":brand", $manual_item->brand);
            $create_item_stmt->bindParam(":model", $manual_item->model);
            $create_item_stmt->bindParam(":serial_number", $manual_item->serial_number);

            // Use temporary variable for optional department parameter
            $department = $manual_item->department ?? '';
            $create_item_stmt->bindParam(":department", $department);

            $create_item_stmt->bindParam(":purchase_type", $manual_item->purchase_type);
            $create_item_stmt->execute();
            $item_id = $db->lastInsertId();
        } else {
            $item_id = $item->item_id;
        }
        
        $item_query = "INSERT INTO service_items (service_report_id, item_id, complaint, diagnostics, action_taken, warranty_flag, notes, before_images, after_images) 
                       VALUES (:service_report_id, :item_id, :complaint, :diagnostics, :action_taken, :warranty_flag, :notes, :before_images, :after_images)";
        
        $item_stmt = $db->prepare($item_query);

        // Use temporary variables for optional service item parameters
        $diagnostics = $item->diagnostics ?? '';
        $warranty_flag = $item->warranty_flag ?? 0;
        $notes = $item->notes ?? '';
        $before_images_json = json_encode($item->before_images ?? []);
        $after_images_json = json_encode($item->after_images ?? []);

        $item_stmt->bindParam(":service_report_id", $report_id);
        $item_stmt->bindParam(":item_id", $item_id);
        $item_stmt->bindParam(":complaint", $item->complaint);
        $item_stmt->bindParam(":diagnostics", $diagnostics);
        $item_stmt->bindParam(":action_taken", $item->action_taken);
        $item_stmt->bindParam(":warranty_flag", $warranty_flag);
        $item_stmt->bindParam(":notes", $notes);
        $item_stmt->bindParam(":before_images", $before_images_json);
        $item_stmt->bindParam(":after_images", $after_images_json);
        
        $item_stmt->execute();
        $service_item_id = $db->lastInsertId();
        
        // Create spares if any
        if (isset($item->spares) && !empty($item->spares)) {
            foreach ($item->spares as $spare) {
                if ($spare->spare_id && $spare->quantity) {
                    // Handle unique spare IDs if provided
                    if (isset($spare->unique_spare_ids) && !empty($spare->unique_spare_ids)) {
                        foreach ($spare->unique_spare_ids as $unique_spare_id) {
                            // Find the spare inventory record
                            $inventory_query = "SELECT id FROM spare_inventory WHERE unique_spare_id = :unique_spare_id";
                            $inventory_stmt = $db->prepare($inventory_query);
                            $inventory_stmt->bindParam(":unique_spare_id", $unique_spare_id);
                            $inventory_stmt->execute();
                            $inventory_result = $inventory_stmt->fetch(PDO::FETCH_ASSOC);

                            if ($inventory_result) {
                                $spare_query = "INSERT INTO service_spares (service_item_id, spare_id, spare_inventory_id, unique_spare_id, quantity, price, spare_image, status, invoice_number, invoice_date, customer_id)
                                                VALUES (:service_item_id, :spare_id, :spare_inventory_id, :unique_spare_id, 1, :price, :spare_image, :status, :invoice_number, :invoice_date, :customer_id)";

                                $spare_stmt = $db->prepare($spare_query);
                                $spare_stmt->bindParam(":service_item_id", $service_item_id);
                                $spare_stmt->bindParam(":spare_id", $spare->spare_id);
                                $spare_stmt->bindParam(":spare_inventory_id", $inventory_result['id']);
                                $spare_stmt->bindParam(":unique_spare_id", $unique_spare_id);
                                $spare_stmt->bindParam(":price", $spare->price);

                                // Use temporary variable for optional spare image parameter
                                $spare_image = $spare->spare_image ?? null;
                                $spare_stmt->bindParam(":spare_image", $spare_image);

                                $status = $spare->status ?? 'consumed';
                                $spare_stmt->bindParam(":status", $status);

                                // Link to invoice if available
                                $invoice_number = isset($data->invoice_data) && $data->invoice_data ? $data->invoice_data->invoice_number : null;
                                $invoice_date = isset($data->invoice_data) && $data->invoice_data ? $data->invoice_data->invoice_date : null;
                                $spare_stmt->bindParam(":invoice_number", $invoice_number);
                                $spare_stmt->bindParam(":invoice_date", $invoice_date);
                                $spare_stmt->bindParam(":customer_id", $data->customer_id);

                                $spare_stmt->execute();

                                // Update spare inventory status
                                $update_inventory_query = "UPDATE spare_inventory SET status = :status, service_report_id = :service_report_id WHERE id = :inventory_id";
                                $update_inventory_stmt = $db->prepare($update_inventory_query);
                                $update_inventory_stmt->bindParam(":status", $status);
                                $update_inventory_stmt->bindParam(":service_report_id", $report_id);
                                $update_inventory_stmt->bindParam(":inventory_id", $inventory_result['id']);
                                $update_inventory_stmt->execute();

                                // Create transaction record
                                $transaction_query = "INSERT INTO spare_transactions (spare_inventory_id, transaction_type, technician_id, service_report_id, quantity, previous_status, new_status, created_by)
                                                      VALUES (:inventory_id, 'consumed', :technician_id, :service_report_id, 1, 'issued', :status, :created_by)";
                                $transaction_stmt = $db->prepare($transaction_query);
                                $transaction_stmt->bindParam(":inventory_id", $inventory_result['id']);
                                $transaction_stmt->bindParam(":technician_id", $user_data['id']);
                                $transaction_stmt->bindParam(":service_report_id", $report_id);
                                $transaction_stmt->bindParam(":status", $status);
                                $transaction_stmt->bindParam(":created_by", $user_data['id']);
                                $transaction_stmt->execute();
                            }
                        }
                    } else {
                        // Fallback to old system for backward compatibility
                        $spare_query = "INSERT INTO service_spares (service_item_id, spare_id, quantity, price, spare_image)
                                        VALUES (:service_item_id, :spare_id, :quantity, :price, :spare_image)";

                        $spare_stmt = $db->prepare($spare_query);
                        $spare_stmt->bindParam(":service_item_id", $service_item_id);
                        $spare_stmt->bindParam(":spare_id", $spare->spare_id);
                        $spare_stmt->bindParam(":quantity", $spare->quantity);
                        $spare_stmt->bindParam(":price", $spare->price);

                        // Use temporary variable for optional spare image parameter
                        $spare_image = $spare->spare_image ?? null;
                        $spare_stmt->bindParam(":spare_image", $spare_image);

                        $spare_stmt->execute();
                    }
                }
            }
        }
    }
    
    // Log the creation
    $audit_query = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) 
                    VALUES (:user_id, 'create', 'service_reports', :report_id, :details)";
    $audit_stmt = $db->prepare($audit_query);
    $audit_stmt->bindParam(":user_id", $user_data['id']);
    $audit_stmt->bindParam(":report_id", $report_id);

    // Use temporary variable for audit details
    $details = json_encode(array("report_number" => $report_number, "customer_id" => $data->customer_id));
    $audit_stmt->bindParam(":details", $details);
    $audit_stmt->execute();
    
    $db->commit();
    
    echo json_encode(array(
        "success" => true, 
        "data" => array(
            "id" => $report_id,
            "report_number" => $report_number
        )
    ));
    
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to create service report: " . $e->getMessage()));
}
?>