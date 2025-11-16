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

if (!isset($_GET['report_number'])) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Report number required"));
    exit();
}

$report_number = $_GET['report_number'];

try {
    // Get inspection report by report number
    $query = "SELECT sr.*, c.name as customer_name, c.city as customer_city, u.name as technician_name
              FROM service_reports sr
              LEFT JOIN customers c ON sr.customer_id = c.id
              LEFT JOIN users u ON sr.technician_id = u.id
              WHERE sr.report_number = :report_number AND sr.type = 'inspection'";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":report_number", $report_number);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Inspection report not found"));
        exit();
    }
    
    $report = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get service items for this inspection
    $items_query = "SELECT si.*, i.item_type, i.brand, i.model, i.serial_number, i.department, i.purchase_type
                    FROM service_items si
                    LEFT JOIN items i ON si.item_id = i.id
                    WHERE si.service_report_id = :report_id";
    
    $items_stmt = $db->prepare($items_query);
    $items_stmt->bindParam(":report_id", $report['id']);
    $items_stmt->execute();
    
    $items = array();
    while ($item_row = $items_stmt->fetch(PDO::FETCH_ASSOC)) {
        // Get spares for this item (if any)
        $spares_query = "SELECT ss.*, s.name, s.part_number
                         FROM service_spares ss
                         LEFT JOIN spares s ON ss.spare_id = s.id
                         WHERE ss.service_item_id = :service_item_id";
        
        $spares_stmt = $db->prepare($spares_query);
        $spares_stmt->bindParam(":service_item_id", $item_row['id']);
        $spares_stmt->execute();
        
        $spares = array();
        while ($spare_row = $spares_stmt->fetch(PDO::FETCH_ASSOC)) {
            $spares[] = array(
                "id" => $spare_row['id'],
                "spare_id" => $spare_row['spare_id'],
                "quantity" => $spare_row['quantity'],
                "price" => (float)$spare_row['price'],
                "spare_image" => $spare_row['spare_image'],
                "spare" => array(
                    "name" => $spare_row['name'],
                    "part_number" => $spare_row['part_number']
                )
            );
        }
        
        $items[] = array(
            "id" => $item_row['id'],
            "item_id" => $item_row['item_id'],
            "complaint" => $item_row['complaint'],
            "diagnostics" => $item_row['diagnostics'],
            "action_taken" => $item_row['action_taken'],
            "warranty_flag" => (bool)$item_row['warranty_flag'],
            "notes" => $item_row['notes'],
            "before_images" => json_decode($item_row['before_images'] ?? '[]'),
            "after_images" => json_decode($item_row['after_images'] ?? '[]'),
            "item" => $item_row['item_id'] ? array(
                "item_type" => $item_row['item_type'],
                "brand" => $item_row['brand'],
                "model" => $item_row['model'],
                "serial_number" => $item_row['serial_number'],
                "department" => $item_row['department'],
                "purchase_type" => $item_row['purchase_type']
            ) : null,
            "spares" => $spares,
            "needs_completion" => true // Flag to indicate this item can be selected for completion
        );
    }
    
    $result = array(
        "id" => $report['id'],
        "report_number" => $report['report_number'],
        "customer_id" => $report['customer_id'],
        "technician_id" => $report['technician_id'],
        "type" => $report['type'],
        "visit_date" => $report['visit_date'],
        "status" => $report['status'],
        "notes" => $report['notes'],
        "created_at" => $report['created_at'],
        "customer" => array(
            "name" => $report['customer_name'],
            "city" => $report['customer_city']
        ),
        "technician" => array(
            "name" => $report['technician_name']
        ),
        "items" => $items
    );
    
    echo json_encode(array("success" => true, "data" => $result));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to fetch inspection report"));
}
?>