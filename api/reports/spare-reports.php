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
    $reportType = isset($_GET['type']) ? $_GET['type'] : 'summary';

    switch ($reportType) {
        case 'technician_usage':
            // Technician-wise spare usage
            $query = "SELECT
                        u.id as technician_id,
                        u.name as technician_name,
                        COUNT(st.id) as total_transactions,
                        COUNT(DISTINCT si.id) as unique_spares_used,
                        SUM(CASE WHEN st.transaction_type = 'consumed' THEN 1 ELSE 0 END) as spares_consumed,
                        SUM(CASE WHEN st.transaction_type = 'returned' THEN 1 ELSE 0 END) as spares_returned
                      FROM users u
                      LEFT JOIN spare_transactions st ON u.id = st.technician_id
                      LEFT JOIN spare_inventory si ON st.spare_inventory_id = si.id
                      WHERE u.role = 'technician'
                      GROUP BY u.id, u.name
                      ORDER BY total_transactions DESC";

            $stmt = $db->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'service_report_consumption':
            // Service report-wise spare consumption
            $query = "SELECT
                        sr.id as service_report_id,
                        sr.report_number,
                        c.name as customer_name,
                        COUNT(ss.id) as spares_used,
                        SUM(ss.price * ss.quantity) as total_spare_cost,
                        GROUP_CONCAT(DISTINCT ss.unique_spare_id) as spare_ids_used
                      FROM service_reports sr
                      LEFT JOIN customers c ON sr.customer_id = c.id
                      LEFT JOIN service_items si ON sr.id = si.service_report_id
                      LEFT JOIN service_spares ss ON si.id = ss.service_item_id
                      WHERE ss.id IS NOT NULL
                      GROUP BY sr.id, sr.report_number, c.name
                      ORDER BY sr.created_at DESC";

            $stmt = $db->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'invoice_linking':
            // Spare usage linked with invoice numbers
            $query = "SELECT
                        ss.invoice_number,
                        c.name as customer_name,
                        COUNT(ss.id) as spares_invoiced,
                        SUM(ss.price * ss.quantity) as total_cost,
                        GROUP_CONCAT(DISTINCT ss.unique_spare_id) as spare_ids,
                        MIN(ss.created_at) as first_usage,
                        MAX(ss.created_at) as last_usage
                      FROM service_spares ss
                      LEFT JOIN service_items si ON ss.service_item_id = si.id
                      LEFT JOIN service_reports sr ON si.service_report_id = sr.id
                      LEFT JOIN customers c ON sr.customer_id = c.id
                      WHERE ss.invoice_number IS NOT NULL
                      GROUP BY ss.invoice_number, c.name
                      ORDER BY ss.invoice_number";

            $stmt = $db->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'pending_returns':
            // Pending returns and reconciliation
            $query = "SELECT
                        si.unique_spare_id,
                        s.name as spare_name,
                        s.part_number,
                        u.name as technician_name,
                        si.status,
                        tsa.expected_return_date,
                        DATEDIFF(CURDATE(), tsa.expected_return_date) as days_overdue,
                        si.created_at as issued_date
                      FROM spare_inventory si
                      LEFT JOIN spares s ON si.spare_id = s.id
                      LEFT JOIN users u ON si.technician_id = u.id
                      LEFT JOIN technician_spare_assignments tsa ON si.id = tsa.spare_inventory_id
                      WHERE si.status = 'issued'
                      AND (tsa.expected_return_date IS NULL OR tsa.expected_return_date < CURDATE())
                      ORDER BY tsa.expected_return_date ASC, si.created_at ASC";

            $stmt = $db->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'customer_usage':
            // Spare usage per customer
            $query = "SELECT
                        c.id as customer_id,
                        c.name as customer_name,
                        COUNT(DISTINCT ss.id) as total_spares_used,
                        COUNT(DISTINCT sr.id) as service_reports_with_spares,
                        SUM(ss.price * ss.quantity) as total_spare_cost,
                        GROUP_CONCAT(DISTINCT s.name) as spare_types_used
                      FROM customers c
                      LEFT JOIN service_reports sr ON c.id = sr.customer_id
                      LEFT JOIN service_items si ON sr.id = si.service_report_id
                      LEFT JOIN service_spares ss ON si.id = ss.service_item_id
                      LEFT JOIN spares s ON ss.spare_id = s.id
                      WHERE ss.id IS NOT NULL
                      GROUP BY c.id, c.name
                      ORDER BY total_spares_used DESC";

            $stmt = $db->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'product_usage':
            // Spare usage per product/service type
            $query = "SELECT
                        s.id as spare_id,
                        s.name as spare_name,
                        s.part_number,
                        COUNT(ss.id) as times_used,
                        SUM(ss.quantity) as total_quantity_used,
                        SUM(ss.price * ss.quantity) as total_cost,
                        COUNT(DISTINCT sr.customer_id) as customers_served,
                        AVG(ss.price) as average_price
                      FROM spares s
                      LEFT JOIN service_spares ss ON s.id = ss.spare_id
                      LEFT JOIN service_items si ON ss.service_item_id = si.id
                      LEFT JOIN service_reports sr ON si.service_report_id = sr.id
                      WHERE ss.id IS NOT NULL
                      GROUP BY s.id, s.name, s.part_number
                      ORDER BY times_used DESC";

            $stmt = $db->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'warehouse_reconciliation':
            // Warehouse reconciliation report
            $query = "SELECT
                        s.id as spare_id,
                        s.name as spare_name,
                        s.part_number,
                        ws.total_quantity,
                        ws.available_quantity,
                        ws.issued_quantity,
                        ws.consumed_quantity,
                        ws.returned_quantity,
                        (SELECT COUNT(*) FROM spare_inventory si WHERE si.spare_id = s.id AND si.status = 'available') as actual_available,
                        (SELECT COUNT(*) FROM spare_inventory si WHERE si.spare_id = s.id AND si.status = 'issued') as actual_issued,
                        (SELECT COUNT(*) FROM spare_inventory si WHERE si.spare_id = s.id AND si.status = 'consumed') as actual_consumed,
                        (SELECT COUNT(*) FROM spare_inventory si WHERE si.spare_id = s.id AND si.status = 'returned') as actual_returned
                      FROM spares s
                      LEFT JOIN warehouse_stock ws ON s.id = ws.spare_id
                      ORDER BY s.name";

            $stmt = $db->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        default:
            // Summary report
            $query = "SELECT
                        'Total Spares' as metric,
                        COUNT(*) as value,
                        'Count' as unit
                      FROM spares
                      UNION ALL
                      SELECT
                        'Available Units' as metric,
                        SUM(available_quantity) as value,
                        'Units' as unit
                      FROM warehouse_stock
                      UNION ALL
                      SELECT
                        'Issued Units' as metric,
                        SUM(issued_quantity) as value,
                        'Units' as unit
                      FROM warehouse_stock
                      UNION ALL
                      SELECT
                        'Consumed Units' as metric,
                        SUM(consumed_quantity) as value,
                        'Units' as unit
                      FROM warehouse_stock
                      UNION ALL
                      SELECT
                        'Pending Returns' as metric,
                        COUNT(*) as value,
                        'Units' as unit
                      FROM spare_inventory si
                      LEFT JOIN technician_spare_assignments tsa ON si.id = tsa.spare_inventory_id
                      WHERE si.status = 'issued'
                      AND (tsa.expected_return_date IS NULL OR tsa.expected_return_date < CURDATE())";

            $stmt = $db->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode(array("success" => true, "data" => $data));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to generate spare report: " . $e->getMessage()));
}
?>
