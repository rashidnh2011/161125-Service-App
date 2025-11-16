<?php
require_once '../config/database.php';
require_once '../config/jwt.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Get JWT token from header
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';

if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Verify and decode JWT token using JWTHandler class
$jwt_handler = new JWTHandler();
$user = $jwt_handler->validateToken($token);
if (!$user) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $user['id'];

// Create database connection
try {
    $database = new Database();
    $conn = $database->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Database connection failed"));
    exit;
}

switch ($method) {
    case 'GET':
        handleGetQuotations($conn, $user_id);
        break;
    case 'POST':
        handleCreateQuotation($conn, $user_id);
        break;
    case 'PUT':
        handleUpdateQuotation($conn, $user_id);
        break;
    case 'DELETE':
        handleDeleteQuotation($conn, $user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(array("success" => false, "error" => "Method not allowed"));
}

function handleGetQuotations($conn, $user_id) {
    global $jwt_handler;
    
    // Get user role from the token
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';
    $user_role = '';
    
    if ($token) {
        $user = $jwt_handler->validateToken($token);
        $user_role = $user['role'] ?? '';
    }
    
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $lead_id = isset($_GET['lead_id']) ? (int)$_GET['lead_id'] : 0;
    $opportunity_id = isset($_GET['opportunity_id']) ? (int)$_GET['opportunity_id'] : 0;
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $assigned_to = isset($_GET['assigned_to']) ? (int)$_GET['assigned_to'] : 0;

    $where_conditions = [];
    $params = [];
    $types = '';
    
    // Apply role-based filtering
    if ($user_role !== 'admin') {
        // For non-admin users, only show their own quotations or quotations assigned to them
        $where_conditions[] = "(q.created_by = ? OR q.assigned_to = ?)";
        $params[] = $user_id;
        $params[] = $user_id;
        $types .= 'ii';
    }

    // Add lead_id filter
    if ($lead_id > 0) {
        $where_conditions[] = "q.lead_id = ?";
        $params[] = $lead_id;
        $types .= 'i';
    }

    // Add opportunity_id filter
    if ($opportunity_id > 0) {
        $where_conditions[] = "q.opportunity_id = ?";
        $params[] = $opportunity_id;
        $types .= 'i';
    }

    // Add status filter
    if (!empty($status)) {
        $where_conditions[] = "q.status = ?";
        $params[] = $status;
        $types .= 's';
    }
    
    // Add search filter
    if (!empty($search)) {
        $where_conditions[] = "(q.quotation_number LIKE ? OR q.notes LIKE ? OR l.first_name LIKE ? OR l.last_name LIKE ? OR l.company LIKE ?)";
        $search_param = "%$search%";
        $params = array_merge($params, array_fill(0, 5, $search_param));
        $types .= str_repeat('s', 5); // 5 string parameters
    }
    
    // Add assigned_to filter (only for admin or if user is viewing their own)
    if ($assigned_to > 0) {
        if ($user_role === 'admin' || $assigned_to == $user_id) {
            $where_conditions[] = "q.assigned_to = ?";
            $params[] = $assigned_to;
            $types .= 'i';
        }
    }

    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

    // Get total count
    $count_sql = "SELECT COUNT(*) as total FROM quotations q $where_clause";
    $count_stmt = $conn->prepare($count_sql);
    
    // Bind parameters for count query
    if (!empty($params)) {
        foreach ($params as $key => $value) {
            $count_stmt->bindValue($key + 1, $value);
        }
    }
    
    $count_stmt->execute();
    $count_result = $count_stmt->fetch(PDO::FETCH_ASSOC);
    $total = $count_result ? (int)$count_result['total'] : 0;

    // Get quotations with pagination
    $sql = "SELECT q.*,
                   l.first_name as lead_first_name,
                   l.last_name as lead_last_name,
                   l.company as lead_company,
                   o.name as opportunity_name,
                   u.name as created_by_name
            FROM quotations q
            LEFT JOIN leads l ON q.lead_id = l.id
            LEFT JOIN opportunities o ON q.opportunity_id = o.id
            LEFT JOIN users u ON q.created_by = u.id
            $where_clause
            ORDER BY q.created_at DESC
            LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql);
    
    // Bind parameters for main query
    $paramIndex = 1;
    foreach ($params as $param) {
        $stmt->bindValue($paramIndex++, $param);
    }
    
    // Bind limit and offset as integers
    $stmt->bindValue($paramIndex++, (int)$limit, PDO::PARAM_INT);
    $stmt->bindValue($paramIndex, (int)$offset, PDO::PARAM_INT);
    
    $stmt->execute();
    
    // Fetch all results
    $quotations = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    echo json_encode(array(
        "success" => true,
        "data" => array(
            "quotations" => $quotations,
            "pagination" => array(
                "page" => $page,
                "limit" => $limit,
                "total" => $total,
                "pages" => ceil($total / $limit)
            )
        )
    ));
}

function handleCreateQuotation($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['quotation_number']) || !isset($data['quotation_date']) || !isset($data['amount'])) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Missing required fields"));
        return;
    }

    // Validate opportunity_id if provided
    if (!empty($data['opportunity_id'])) {
        $stmt = $conn->prepare("SELECT id FROM opportunities WHERE id = ? LIMIT 1");
        $stmt->execute([$data['opportunity_id']]);
        if ($stmt->rowCount() === 0) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Invalid opportunity ID provided"));
            return;
        }
    }

    // Set default values
    $opportunity_id = !empty($data['opportunity_id']) ? $data['opportunity_id'] : null;
    $lead_id = !empty($data['lead_id']) ? $data['lead_id'] : null;
    $items = isset($data['items']) ? json_encode($data['items']) : json_encode([]);

    $sql = "INSERT INTO quotations (
        opportunity_id, lead_id, quotation_number, quotation_date, amount, status,
        valid_until, notes, items, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $success = $stmt->execute([
        $opportunity_id,
        $lead_id,
        $data['quotation_number'],
        $data['quotation_date'],
        $data['amount'],
        $data['status'] ?? 'draft',
        $data['valid_until'] ?? null,
        $data['notes'] ?? null,
        $items,
        $user_id
    ]);

    if ($stmt->rowCount() > 0) {
        $quotation_id = $conn->lastInsertId();
        // Log activity
        logActivity($conn, $user_id, 'quotation', $quotation_id, 'create', null, $data);

        echo json_encode(array(
            "success" => true,
            "data" => array(
                "quotation_id" => $quotation_id
            )
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to create quotation"));
    }
}

function handleUpdateQuotation($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $quotation_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$quotation_id) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Quotation ID is required"));
        return;
    }

    // Get existing quotation data for activity logging
    $existing_sql = "SELECT * FROM quotations WHERE id = ?";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->execute([$quotation_id]);
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Quotation not found"));
        return;
    }

    // Get the new status or use existing one if not provided
    $new_status = $data['status'] ?? $existing_data['status'];
    
    // Calculate valid_until if not provided or if status is being updated to approved
    $valid_until = $data['valid_until'] ?? $existing_data['valid_until'] ?? null;
    
    if (($new_status === 'approved' && $existing_data['status'] !== 'approved') || !$valid_until) {
        $quotation_date = new DateTime($data['quotation_date'] ?? $existing_data['quotation_date']);
        // Default to 30 days validity if not specified
        $validity_days = 30;
        $valid_until = $quotation_date->modify("+{$validity_days} days")->format('Y-m-d');
    }

    // Build the update query dynamically based on provided fields
    $updates = [];
    $params = [];
    $types = '';

    // Define the fields that can be updated
    $updatableFields = [
        'opportunity_id' => ['type' => 'i', 'value' => $data['opportunity_id'] ?? $existing_data['opportunity_id']],
        'lead_id' => ['type' => 'i', 'value' => $data['lead_id'] ?? $existing_data['lead_id']],
        'quotation_number' => ['type' => 's', 'value' => $data['quotation_number'] ?? $existing_data['quotation_number']],
        'quotation_date' => ['type' => 's', 'value' => $data['quotation_date'] ?? $existing_data['quotation_date']],
        'amount' => ['type' => 'd', 'value' => $data['amount'] ?? $existing_data['amount']],
        'status' => ['type' => 's', 'value' => $new_status],
        'valid_until' => ['type' => 's', 'value' => $valid_until],
        'notes' => ['type' => 's', 'value' => $data['notes'] ?? $existing_data['notes']],
        'items' => ['type' => 's', 'value' => isset($data['items']) ? json_encode($data['items']) : $existing_data['items']]
    ];

    // Build the SET clause and parameters
    foreach ($updatableFields as $field => $fieldData) {
        $updates[] = "$field = ?";
        $params[] = $fieldData['value'];
        $types .= $fieldData['type'];
    }

    // Add updated_at and WHERE clause
    $updates[] = 'updated_at = NOW()';
    $params[] = $quotation_id;
    $types .= 'i'; // For the WHERE id = ?

    // Build the final query
    $sql = "UPDATE quotations SET " . implode(', ', $updates) . " WHERE id = ?";
    
    // Prepare and execute the statement
    $stmt = $conn->prepare($sql);
    $success = $stmt->execute($params);

    if ($stmt->rowCount() > 0) {
        // Log activity
        logActivity($conn, $user_id, 'quotation', $quotation_id, 'update', $existing_data, $data);

        echo json_encode(array("success" => true, "data" => array()));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to update quotation"));
    }
}

function handleDeleteQuotation($conn, $user_id) {
    $quotation_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$quotation_id) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Quotation ID is required"));
        return;
    }

    // Get existing quotation data for activity logging
    $existing_sql = "SELECT * FROM quotations WHERE id = ?";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->execute([$quotation_id]);
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Quotation not found"));
        return;
    }

    $sql = "DELETE FROM quotations WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$quotation_id]);

    if ($stmt->rowCount() > 0) {
        // Log activity
        logActivity($conn, $user_id, 'quotation', $quotation_id, 'delete', $existing_data, null);

        echo json_encode(array("success" => true, "data" => array()));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to delete quotation"));
    }
}

function logActivity($conn, $user_id, $table_name, $record_id, $action, $old_values, $new_values) {
    // Prepare details JSON for the existing audit_logs table structure
    $details = array(
        'old_values' => $old_values,
        'new_values' => $new_values,
        'additional_info' => array(
            'table_name' => $table_name,
            'record_id' => $record_id,
            'action' => $action
        )
    );

    $sql = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(1, $user_id, PDO::PARAM_INT);
    $stmt->bindValue(2, $action, PDO::PARAM_STR);
    $stmt->bindValue(3, $table_name, PDO::PARAM_STR);
    $stmt->bindValue(4, $record_id, PDO::PARAM_INT);
    $stmt->bindValue(5, json_encode($details), PDO::PARAM_STR);

    $stmt->execute();
}
?>
