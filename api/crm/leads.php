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
    echo json_encode(['error' => 'Invalid token']);
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
    echo json_encode(['error' => 'Database connection failed', 'debug' => $e->getMessage()]);
    exit;
}

switch ($method) {
    case 'GET':
        handleGetLeads($conn, $user_id);
        break;
    case 'POST':
        handleCreateLead($conn, $user_id);
        break;
    case 'PUT':
        handleUpdateLead($conn, $user_id);
        break;
    case 'DELETE':
        handleDeleteLead($conn, $user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function handleGetLeads($conn, $user_id) {
    // Get user role from the token
    $user_role = '';
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';
    
    if ($token) {
        $jwt_handler = new JWTHandler();
        $user = $jwt_handler->validateToken($token);
        $user_role = $user['role'] ?? '';
    }
    
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';
    $assigned_to = isset($_GET['assigned_to']) ? (int)$_GET['assigned_to'] : 0;
    $source = isset($_GET['source']) ? trim($_GET['source']) : '';

    $where_conditions = [];
    $params = [];

    // Apply role-based filtering
    if ($user_role !== 'admin') {
        // For non-admin users, only show their own leads or leads assigned to them
        $where_conditions[] = "(created_by = :user_id OR assigned_to = :user_id)";
        $params[':user_id'] = $user_id;
    }

    // Add search conditions
    if (!empty($search)) {
        $where_conditions[] = "(first_name LIKE :search OR last_name LIKE :search OR company LIKE :search OR email LIKE :search OR phone LIKE :search)";
        $params[':search'] = "%$search%";
    }

    // Add status filter
    if (!empty($status)) {
        $where_conditions[] = "status = :status";
        $params[':status'] = $status;
    }

    // Add assigned_to filter (only for admin or if user is viewing their own)
    if ($assigned_to > 0) {
        if ($user_role === 'admin' || $assigned_to == $user_id) {
            $where_conditions[] = "assigned_to = :assigned_to";
            $params[':assigned_to'] = $assigned_to;
        }
    }

    // Add source filter
    if (!empty($source)) {
        $where_conditions[] = "source = :source";
        $params[':source'] = $source;
    }

    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

    // Get total count
    $count_sql = "SELECT COUNT(*) as total FROM leads $where_clause";
    $count_stmt = $conn->prepare($count_sql);
    foreach ($params as $key => $value) {
        $count_stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    $count_stmt->execute();
    $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get leads with pagination
    $sql = "SELECT l.*,
                   u.name as assigned_to_name,
                   u2.name as created_by_name
            FROM leads l
            LEFT JOIN users u ON l.assigned_to = u.id
            LEFT JOIN users u2 ON l.created_by = u2.id
            $where_clause
            ORDER BY l.created_at DESC
            LIMIT :limit OFFSET :offset";

    $stmt = $conn->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $leads = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $leads[] = $row;
    }

    echo json_encode([
        'data' => [
            'leads' => $leads,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]
    ]);
}

function handleCreateLead($conn, $user_id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            return;
        }

        $required_fields = ['first_name', 'last_name'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                http_response_code(400);
                echo json_encode(['error' => ucfirst(str_replace('_', ' ', $field)) . ' is required']);
                return;
            }
        }

        $sql = "INSERT INTO leads (
            first_name, last_name, company, email, phone, mobile, source, status,
            assigned_to, priority, estimated_value, expected_close_date, industry,
            address, city, state, pincode, notes, created_by
        ) VALUES (
            :first_name, :last_name, :company, :email, :phone, :mobile, :source, :status,
            :assigned_to, :priority, :estimated_value, :expected_close_date, :industry,
            :address, :city, :state, :pincode, :notes, :created_by
        )";

        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':first_name', $data['first_name'], PDO::PARAM_STR);
        $stmt->bindValue(':last_name', $data['last_name'], PDO::PARAM_STR);
        $stmt->bindValue(':company', $data['company'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':email', $data['email'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':phone', $data['phone'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':mobile', $data['mobile'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':source', $data['source'] ?: 'other', PDO::PARAM_STR);
        $stmt->bindValue(':status', $data['status'] ?: 'new', PDO::PARAM_STR);
        $stmt->bindValue(':assigned_to', $data['assigned_to'] ?: null, PDO::PARAM_INT);
        $stmt->bindValue(':priority', $data['priority'] ?: 'medium', PDO::PARAM_STR);
        $stmt->bindValue(':estimated_value', $data['estimated_value'] ?: 0.00, PDO::PARAM_STR);
        $stmt->bindValue(':expected_close_date', $data['expected_close_date'] ?: null, PDO::PARAM_STR);
        $stmt->bindValue(':industry', $data['industry'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':address', $data['address'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':city', $data['city'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':state', $data['state'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':pincode', $data['pincode'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':notes', $data['notes'] ?: '', PDO::PARAM_STR);
        $stmt->bindValue(':created_by', $user_id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            $lead_id = $conn->lastInsertId();

            // Log activity
            logActivity($conn, $user_id, 'lead', $lead_id, 'create', null, $data);

            echo json_encode([
                'message' => 'Lead created successfully',
                'lead_id' => $lead_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create lead', 'debug' => 'Database insert failed']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error', 'debug' => $e->getMessage()]);
    }
}

function handleUpdateLead($conn, $user_id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            return;
        }

        $lead_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if (!$lead_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Lead ID is required']);
            return;
        }

        // Get existing lead data for activity logging
        $existing_sql = "SELECT * FROM leads WHERE id = :lead_id";
        $existing_stmt = $conn->prepare($existing_sql);
        $existing_stmt->bindValue(':lead_id', $lead_id, PDO::PARAM_INT);
        $existing_stmt->execute();
        $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing_data) {
            http_response_code(404);
            echo json_encode(['error' => 'Lead not found']);
            return;
        }

        $sql = "UPDATE leads SET
            first_name = :first_name, last_name = :last_name, company = :company, email = :email, phone = :phone, mobile = :mobile,
            source = :source, status = :status, assigned_to = :assigned_to, priority = :priority, estimated_value = :estimated_value,
            expected_close_date = :expected_close_date, industry = :industry, address = :address, city = :city, state = :state,
            pincode = :pincode, notes = :notes, updated_at = NOW()
            WHERE id = :lead_id";

        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':first_name', $data['first_name'], PDO::PARAM_STR);
        $stmt->bindValue(':last_name', $data['last_name'], PDO::PARAM_STR);
        $stmt->bindValue(':company', $data['company'], PDO::PARAM_STR);
        $stmt->bindValue(':email', $data['email'], PDO::PARAM_STR);
        $stmt->bindValue(':phone', $data['phone'], PDO::PARAM_STR);
        $stmt->bindValue(':mobile', $data['mobile'], PDO::PARAM_STR);
        $stmt->bindValue(':source', $data['source'], PDO::PARAM_STR);
        $stmt->bindValue(':status', $data['status'], PDO::PARAM_STR);
        $stmt->bindValue(':assigned_to', $data['assigned_to'], PDO::PARAM_INT);
        $stmt->bindValue(':priority', $data['priority'], PDO::PARAM_STR);
        $stmt->bindValue(':estimated_value', $data['estimated_value'], PDO::PARAM_STR);
        $stmt->bindValue(':expected_close_date', $data['expected_close_date'], PDO::PARAM_STR);
        $stmt->bindValue(':industry', $data['industry'], PDO::PARAM_STR);
        $stmt->bindValue(':address', $data['address'], PDO::PARAM_STR);
        $stmt->bindValue(':city', $data['city'], PDO::PARAM_STR);
        $stmt->bindValue(':state', $data['state'], PDO::PARAM_STR);
        $stmt->bindValue(':pincode', $data['pincode'], PDO::PARAM_STR);
        $stmt->bindValue(':notes', $data['notes'], PDO::PARAM_STR);
        $stmt->bindValue(':lead_id', $lead_id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            // Log activity
            logActivity($conn, $user_id, 'lead', $lead_id, 'update', $existing_data, $data);

            echo json_encode(['message' => 'Lead updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update lead', 'debug' => 'Database update failed']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error', 'debug' => $e->getMessage()]);
    }
}

function handleDeleteLead($conn, $user_id) {
    $lead_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$lead_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Lead ID is required']);
        return;
    }

    // Get existing lead data for activity logging
    $existing_sql = "SELECT * FROM leads WHERE id = :lead_id";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->bindValue(':lead_id', $lead_id, PDO::PARAM_INT);
    $existing_stmt->execute();
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(['error' => 'Lead not found']);
        return;
    }

    $sql = "DELETE FROM leads WHERE id = :lead_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':lead_id', $lead_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        // Log activity
        logActivity($conn, $user_id, 'lead', $lead_id, 'delete', $existing_data, null);

        echo json_encode(['message' => 'Lead deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete lead']);
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

    $sql = "INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
            VALUES (:user_id, :action, :target_table, :target_id, :details)";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindValue(':action', $action, PDO::PARAM_STR);
    $stmt->bindValue(':target_table', $table_name, PDO::PARAM_STR);
    $stmt->bindValue(':target_id', $record_id, PDO::PARAM_INT);
    $stmt->bindValue(':details', json_encode($details), PDO::PARAM_STR);

    $stmt->execute();
}
?>
