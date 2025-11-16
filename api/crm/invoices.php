<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../config/jwt.php';

$database = new Database();
$conn = $database->getConnection();
$jwt_handler = new JWTHandler();

$token = $jwt_handler->getTokenFromHeader();
$user = $jwt_handler->validateToken($token);

if (!$user) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $user['id'];

// Check for create-from-quotation endpoint
$isCreateFromQuotation = isset($_GET['from_quotation']) && $_GET['from_quotation'] == 'true';

// Check for get-lead-or-opportunity endpoint
$isGetLeadOrOpportunity = isset($_GET['get_lead_or_opportunity']) && $_GET['get_lead_or_opportunity'] === 'true';

if ($isGetLeadOrOpportunity) {
    handleGetLeadOrOpportunity($conn, $user_id);
    exit;
}

switch ($method) {
    case 'GET':
        handleGetInvoices($conn, $user_id);
        break;
    case 'POST':
        if ($isCreateFromQuotation) {
            handleCreateInvoiceFromQuotation($conn, $user_id);
        } else {
            handleCreateInvoice($conn, $user_id);
        }
        break;
    case 'PUT':
        handleUpdateInvoice($conn, $user_id);
        break;
    case 'DELETE':
        handleDeleteInvoice($conn, $user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(array("success" => false, "error" => "Method not allowed"));
}

function handleGetInvoices($conn, $user_id) {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $lead_id = isset($_GET['lead_id']) ? (int)$_GET['lead_id'] : 0;
    $opportunity_id = isset($_GET['opportunity_id']) ? (int)$_GET['opportunity_id'] : 0;
    $status = isset($_GET['status']) ? $_GET['status'] : '';

    $where_conditions = [];
    $params = [];

    if ($lead_id > 0) {
        $where_conditions[] = "i.lead_id = ?";
        $params[] = $lead_id;
    }

    if ($opportunity_id > 0) {
        $where_conditions[] = "i.opportunity_id = ?";
        $params[] = $opportunity_id;
    }

    if (!empty($status)) {
        $where_conditions[] = "i.status = ?";
        $params[] = $status;
    }

    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

    // Get total count
    $count_sql = "SELECT COUNT(*) as total FROM invoices i $where_clause";
    $count_stmt = $conn->prepare($count_sql);
    if (!empty($params)) {
        foreach ($params as $index => $param) {
            $count_stmt->bindValue($index + 1, $param);
        }
    }
    $count_stmt->execute();
    $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get invoices with pagination
    $sql = "SELECT i.*,
                   l.first_name as lead_first_name,
                   l.last_name as lead_last_name,
                   l.company as lead_company,
                   o.name as opportunity_name,
                   u.name as created_by_name
            FROM invoices i
            LEFT JOIN leads l ON i.lead_id = l.id
            LEFT JOIN opportunities o ON i.opportunity_id = o.id
            LEFT JOIN users u ON i.created_by = u.id
            $where_clause
            ORDER BY i.created_at DESC
            LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql);
    // Bind parameters for WHERE clause
    if (!empty($params)) {
        foreach ($params as $index => $param) {
            $stmt->bindValue($index + 1, $param);
        }
    }
    // Bind LIMIT and OFFSET parameters
    $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
    $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $invoices = [];
    foreach ($result as $row) {
        $invoices[] = $row;
    }

    echo json_encode(array(
        "success" => true,
        "data" => array(
            "invoices" => $invoices,
            "pagination" => array(
                "page" => $page,
                "limit" => $limit,
                "total" => $total,
                "pages" => ceil($total / $limit)
            )
        )
    ));
}

function handleCreateInvoice($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    $required_fields = ['invoice_number', 'invoice_date', 'amount'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => ucfirst(str_replace('_', ' ', $field)) . ' is required'));
            return;
        }
    }

    // Either lead_id or opportunity_id should be provided
    if (!isset($data['lead_id']) && !isset($data['opportunity_id'])) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Either lead_id or opportunity_id is required"));
        return;
    }

    $sql = "INSERT INTO invoices (
        opportunity_id, lead_id, invoice_number, invoice_date, amount, status,
        due_date, paid_date, notes, items, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        $data['opportunity_id'],
        $data['lead_id'],
        $data['invoice_number'],
        $data['invoice_date'],
        $data['amount'],
        $data['status'] ?: 'draft',
        $data['due_date'],
        $data['paid_date'],
        $data['notes'],
        $data['items'] ? json_encode($data['items']) : null,
        $user_id
    ]);

    if ($stmt->rowCount() > 0) {
        $invoice_id = $conn->lastInsertId();

        // Log activity
        logActivity($conn, $user_id, 'invoice', $invoice_id, 'create', null, $data);

        echo json_encode(array(
            "success" => true,
            "data" => array(
                "invoice_id" => $invoice_id
            )
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to create invoice"));
    }
}

function handleUpdateInvoice($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $invoice_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$invoice_id) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Invoice ID is required"));
        return;
    }

    // Get existing invoice data for activity logging
    $existing_sql = "SELECT * FROM invoices WHERE id = ?";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->execute([$invoice_id]);
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Invoice not found"));
        return;
    }

    $sql = "UPDATE invoices SET
        opportunity_id = ?, lead_id = ?, invoice_number = ?, invoice_date = ?, amount = ?, status = ?,
        due_date = ?, paid_date = ?, notes = ?, items = ?, updated_at = NOW()
        WHERE id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        $data['opportunity_id'],
        $data['lead_id'],
        $data['invoice_number'],
        $data['invoice_date'],
        $data['amount'],
        $data['status'],
        $data['due_date'],
        $data['paid_date'],
        $data['notes'],
        $data['items'] ? json_encode($data['items']) : null,
        $invoice_id
    ]);

    if ($stmt->rowCount() > 0) {
        // Log activity
        logActivity($conn, $user_id, 'invoice', $invoice_id, 'update', $existing_data, $data);

        echo json_encode(array("success" => true, "data" => array()));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to update invoice"));
    }
}

function handleDeleteInvoice($conn, $user_id) {
    $invoice_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$invoice_id) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Invoice ID is required"));
        return;
    }

    // Get existing invoice data for activity logging
    $existing_sql = "SELECT * FROM invoices WHERE id = ?";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->execute([$invoice_id]);
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Invoice not found"));
        return;
    }

    $sql = "DELETE FROM invoices WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$invoice_id]);

    if ($stmt->rowCount() > 0) {
        // Log activity
        logActivity($conn, $user_id, 'invoice', $invoice_id, 'delete', $existing_data, null);

        echo json_encode(array("success" => true, "data" => array()));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to delete invoice"));
    }
}

function handleCreateInvoiceFromQuotation($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['quotation_id'])) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Quotation ID is required"));
        return;
    }

    // Start transaction
    $conn->beginTransaction();

    try {
        // Get the quotation
        $quotation_sql = "SELECT q.*, l.company, l.first_name, l.last_name, l.email, l.phone 
                         FROM quotations q
                         LEFT JOIN leads l ON q.lead_id = l.id
                         WHERE q.id = ? AND q.status = 'approved' AND q.lead_id IS NOT NULL";
        $quotation_stmt = $conn->prepare($quotation_sql);
        $quotation_stmt->execute([$data['quotation_id']]);
        $quotation = $quotation_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$quotation) {
            throw new Exception("Approved quotation not found or missing lead information");
        }

        // Require manual invoice number
        if (empty($data['invoice_number'])) {
            throw new Exception("Invoice number is required");
        }
        $invoice_number = $data['invoice_number'];
        
        // Calculate due date (30 days from now by default)
        $due_date = !empty($data['due_date']) ? $data['due_date'] : date('Y-m-d', strtotime('+30 days'));

        // Create invoice
        $invoice_sql = "INSERT INTO invoices (
            invoice_number, invoice_date, due_date, quotation_id, lead_id, 
            subtotal, tax_amount, total_amount, status, notes, 
            items, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?)";

        $invoice_stmt = $conn->prepare($invoice_sql);
        $invoice_stmt->execute([
            $invoice_number,
            date('Y-m-d'),
            $due_date,
            $quotation['id'],
            $quotation['lead_id'],
            $quotation['amount'],
            0, // tax_amount - you can calculate this based on your requirements
            $quotation['amount'], // total_amount (subtotal + tax)
            $data['notes'] ?? null,
            $quotation['items'],
            $user_id
        ]);

        $invoice_id = $conn->lastInsertId();

        // Update quotation status to 'invoiced'
        $update_quotation_sql = "UPDATE quotations SET status = 'invoiced' WHERE id = ?";
        $update_quotation_stmt = $conn->prepare($update_quotation_sql);
        $update_quotation_stmt->execute([$quotation['id']]);

        // Log activity
        logActivity($conn, $user_id, 'invoice', $invoice_id, 'create', null, [
            'invoice_number' => $invoice_number,
            'quotation_id' => $quotation['id'],
            'amount' => $quotation['amount']
        ]);

        // Commit transaction
        $conn->commit();

        echo json_encode([
            "success" => true,
            "data" => [
                "invoice_id" => $invoice_id,
                "invoice_number" => $invoice_number
            ]
        ]);

    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollBack();
        http_response_code(400);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function handleGetLeadOrOpportunity($conn, $user_id) {
    $type = $_GET['type'] ?? '';
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (empty($type) || $id <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid request parameters"]);
        return;
    }

    try {
        if ($type === 'lead') {
            $stmt = $conn->prepare("SELECT id, CONCAT(first_name, ' ', last_name) as name, company FROM leads WHERE id = ?");
        } elseif ($type === 'opportunity') {
            $stmt = $conn->prepare("SELECT o.id, o.name, CONCAT(l.first_name, ' ', l.last_name) as lead_name, l.company 
                                  FROM opportunities o 
                                  LEFT JOIN leads l ON o.lead_id = l.id 
                                  WHERE o.id = ?");
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid type"]);
            return;
        }

        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "$type not found"]);
            return;
        }

        echo json_encode(["success" => true, "data" => $result]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
    }
}

function logActivity($conn, $user_id, $table_name, $record_id, $action, $old_values, $new_values) {
    $details = json_encode([
        'old_values' => $old_values,
        'new_values' => $new_values,
        'additional_info' => [
            'table_name' => $table_name,
            'record_id' => $record_id,
            'action' => $action
        ]
    ]);

    $sql = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $stmt->execute([$user_id, $action, $table_name, $record_id, $details]);
}
?>
