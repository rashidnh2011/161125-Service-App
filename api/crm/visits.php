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
$database = new Database();
$conn = $database->getConnection();

switch ($method) {
    case 'GET':
        handleGetVisits($conn, $user_id);
        break;
    case 'POST':
        handleCreateVisit($conn, $user_id);
        break;
    case 'PUT':
        handleUpdateVisit($conn, $user_id);
        break;
    case 'DELETE':
        handleDeleteVisit($conn, $user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function handleGetVisits($conn, $user_id) {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $assigned_to = isset($_GET['assigned_to']) ? (int)$_GET['assigned_to'] : 0;
    $lead_id = isset($_GET['lead_id']) ? (int)$_GET['lead_id'] : 0;
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    $visit_type = isset($_GET['visit_type']) ? $_GET['visit_type'] : '';
    $start_date = isset($_GET['start_date']) ? $_GET['start_date'] : '';
    $end_date = isset($_GET['end_date']) ? $_GET['end_date'] : '';

    $where_conditions = [];
    $params = [];
    $types = '';

    if ($assigned_to > 0) {
        $where_conditions[] = "v.assigned_to = :assigned_to";
        $params[':assigned_to'] = $assigned_to;
    }

    if ($lead_id > 0) {
        $where_conditions[] = "v.lead_id = :lead_id";
        $params[':lead_id'] = $lead_id;
    }

    if (!empty($status)) {
        $where_conditions[] = "v.status = :status";
        $params[':status'] = $status;
    }

    if (!empty($visit_type)) {
        $where_conditions[] = "v.visit_type = :visit_type";
        $params[':visit_type'] = $visit_type;
    }

    if (!empty($start_date)) {
        $where_conditions[] = "DATE(v.start_time) >= :start_date";
        $params[':start_date'] = $start_date;
    }

    if (!empty($end_date)) {
        $where_conditions[] = "DATE(v.end_time) <= :end_date";
        $params[':end_date'] = $end_date;
    }

    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

    // Get total count
    $count_sql = "SELECT COUNT(*) as total FROM visits v $where_clause";
    $count_stmt = $conn->prepare($count_sql);
    foreach ($params as $key => $value) {
        $count_stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $count_stmt->execute();
    $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get visits with pagination
    $sql = "SELECT v.*,
                   l.first_name as lead_first_name,
                   l.last_name as lead_last_name,
                   l.company as lead_company,
                   c.first_name as contact_first_name,
                   c.last_name as contact_last_name,
                   u.name as assigned_to_name,
                   u2.name as created_by_name
            FROM visits v
            LEFT JOIN leads l ON v.lead_id = l.id
            LEFT JOIN contacts c ON v.contact_id = c.id
            LEFT JOIN users u ON v.assigned_to = u.id
            LEFT JOIN users u2 ON v.created_by = u2.id
            $where_clause
            ORDER BY v.created_at DESC
            LIMIT :limit OFFSET :offset";

    $stmt = $conn->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $visits = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $visits[] = $row;
    }

    echo json_encode([
        'visits' => $visits,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ]
    ]);
}

function handleCreateVisit($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    $required_fields = ['visit_type', 'assigned_to'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => ucfirst(str_replace('_', ' ', $field)) . ' is required']);
            return;
        }
    }

    // For non-lead visits, prospect_name is required
    if ($data['visit_type'] === 'non_lead' && (!isset($data['prospect_name']) || empty($data['prospect_name']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Prospect name is required for non-lead visits']);
        return;
    }

    $sql = "INSERT INTO visits (
        lead_id, contact_id, assigned_to, visit_type, status,
        start_latitude, start_longitude, end_latitude, end_longitude,
        start_address, end_address, start_time, end_time, duration_minutes,
        purpose, notes, outcome, follow_up_required, follow_up_date,
        prospect_name, prospect_phone, prospect_email, prospect_company,
        converted_to_lead, converted_lead_id, created_by
    ) VALUES (
        :lead_id, :contact_id, :assigned_to, :visit_type, :status,
        :start_latitude, :start_longitude, :end_latitude, :end_longitude,
        :start_address, :end_address, :start_time, :end_time, :duration_minutes,
        :purpose, :notes, :outcome, :follow_up_required, :follow_up_date,
        :prospect_name, :prospect_phone, :prospect_email, :prospect_company,
        :converted_to_lead, :converted_lead_id, :created_by
    )";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':lead_id', isset($data['lead_id']) ? $data['lead_id'] : null, PDO::PARAM_INT);
    $stmt->bindValue(':contact_id', isset($data['contact_id']) ? $data['contact_id'] : null, PDO::PARAM_INT);
    $stmt->bindValue(':assigned_to', $data['assigned_to'], PDO::PARAM_INT);
    $stmt->bindValue(':visit_type', $data['visit_type'], PDO::PARAM_STR);
    $stmt->bindValue(':status', $data['status'] ?: 'planned', PDO::PARAM_STR);
    $stmt->bindValue(':start_latitude', $data['start_latitude'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':start_longitude', $data['start_longitude'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':end_latitude', $data['end_latitude'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':end_longitude', $data['end_longitude'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':start_address', $data['start_address'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':end_address', $data['end_address'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':start_time', $data['start_time'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':end_time', $data['end_time'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':duration_minutes', $data['duration_minutes'] ?: 0, PDO::PARAM_INT);
    $stmt->bindValue(':purpose', $data['purpose'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':notes', $data['notes'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':outcome', isset($data['outcome']) ? $data['outcome'] : '', PDO::PARAM_STR);
    $stmt->bindValue(':follow_up_required', isset($data['follow_up_required']) ? $data['follow_up_required'] : false, PDO::PARAM_BOOL);
    $stmt->bindValue(':follow_up_date', isset($data['follow_up_date']) ? $data['follow_up_date'] : null, PDO::PARAM_STR);
    $stmt->bindValue(':prospect_name', $data['prospect_name'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_phone', $data['prospect_phone'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_email', $data['prospect_email'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_company', $data['prospect_company'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':converted_to_lead', $data['converted_to_lead'] ?: false, PDO::PARAM_BOOL);
    $stmt->bindValue(':converted_lead_id', $data['converted_lead_id'] ?: null, PDO::PARAM_INT);
    $stmt->bindValue(':created_by', $user_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        $visit_id = $conn->lastInsertId();

        // Log activity
        logActivity($conn, $user_id, 'visit', $visit_id, 'create', null, $data);

        echo json_encode([
            'message' => 'Visit created successfully',
            'visit_id' => $visit_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create visit']);
    }
}

function handleUpdateVisit($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $visit_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$visit_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Visit ID is required']);
        return;
    }

    // Get existing visit data for activity logging
    $existing_sql = "SELECT * FROM visits WHERE id = :visit_id";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->bindValue(':visit_id', $visit_id, PDO::PARAM_INT);
    $existing_stmt->execute();
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(['error' => 'Visit not found']);
        return;
    }

    // Handle visit completion and duration calculation
    if (isset($data['end_time']) && $data['end_time'] !== $existing_data['end_time']) {
        $start_time = new DateTime($existing_data['start_time']);
        $end_time = new DateTime($data['end_time']);
        $interval = $start_time->diff($end_time);
        $duration_minutes = ($interval->h * 60) + $interval->i;

        $data['duration_minutes'] = $duration_minutes;
    }

    // Handle lead conversion for non-lead visits
    if ($data['visit_type'] === 'non_lead' && isset($data['converted_to_lead']) && $data['converted_to_lead']) {
        if (!isset($data['converted_lead_id']) || $data['converted_lead_id'] <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Converted lead ID is required when marking as converted']);
            return;
        }
    }

    $sql = "UPDATE visits SET
        lead_id = :lead_id, contact_id = :contact_id, assigned_to = :assigned_to, visit_type = :visit_type, status = :status,
        start_latitude = :start_latitude, start_longitude = :start_longitude, end_latitude = :end_latitude, end_longitude = :end_longitude,
        start_address = :start_address, end_address = :end_address, start_time = :start_time, end_time = :end_time, duration_minutes = :duration_minutes,
        purpose = :purpose, notes = :notes, outcome = :outcome, follow_up_required = :follow_up_required, follow_up_date = :follow_up_date,
        prospect_name = :prospect_name, prospect_phone = :prospect_phone, prospect_email = :prospect_email, prospect_company = :prospect_company,
        converted_to_lead = :converted_to_lead, converted_lead_id = :converted_lead_id, updated_at = NOW()
        WHERE id = :visit_id";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':lead_id', isset($data['lead_id']) ? $data['lead_id'] : null, PDO::PARAM_INT);
    $stmt->bindValue(':contact_id', isset($data['contact_id']) ? $data['contact_id'] : null, PDO::PARAM_INT);
    $stmt->bindValue(':assigned_to', $data['assigned_to'], PDO::PARAM_INT);
    $stmt->bindValue(':visit_type', $data['visit_type'], PDO::PARAM_STR);
    $stmt->bindValue(':status', $data['status'], PDO::PARAM_STR);
    $stmt->bindValue(':start_latitude', $data['start_latitude'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':start_longitude', $data['start_longitude'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':end_latitude', $data['end_latitude'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':end_longitude', $data['end_longitude'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':start_address', $data['start_address'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':end_address', $data['end_address'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':start_time', $data['start_time'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':end_time', $data['end_time'] ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':duration_minutes', $data['duration_minutes'] ?: 0, PDO::PARAM_INT);
    $stmt->bindValue(':purpose', $data['purpose'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':notes', $data['notes'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':outcome', isset($data['outcome']) ? $data['outcome'] : '', PDO::PARAM_STR);
    $stmt->bindValue(':follow_up_required', isset($data['follow_up_required']) ? $data['follow_up_required'] : false, PDO::PARAM_BOOL);
    $stmt->bindValue(':follow_up_date', isset($data['follow_up_date']) ? $data['follow_up_date'] : null, PDO::PARAM_STR);
    $stmt->bindValue(':prospect_name', $data['prospect_name'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_phone', $data['prospect_phone'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_email', $data['prospect_email'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_company', $data['prospect_company'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':converted_to_lead', $data['converted_to_lead'] ?: false, PDO::PARAM_BOOL);
    $stmt->bindValue(':converted_lead_id', $data['converted_lead_id'] ?: null, PDO::PARAM_INT);
    $stmt->bindValue(':visit_id', $visit_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        // Log activity
        logActivity($conn, $user_id, 'visit', $visit_id, 'update', $existing_data, $data);

        echo json_encode(['message' => 'Visit updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update visit']);
    }
}

function handleDeleteVisit($conn, $user_id) {
    $visit_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$visit_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Visit ID is required']);
        return;
    }

    // Get existing visit data for activity logging
    $existing_sql = "SELECT * FROM visits WHERE id = :visit_id";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->bindValue(':visit_id', $visit_id, PDO::PARAM_INT);
    $existing_stmt->execute();
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(['error' => 'Visit not found']);
        return;
    }

    $sql = "DELETE FROM visits WHERE id = :visit_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':visit_id', $visit_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        // Log activity
        logActivity($conn, $user_id, 'visit', $visit_id, 'delete', $existing_data, null);

        echo json_encode(['message' => 'Visit deleted successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete visit']);
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
