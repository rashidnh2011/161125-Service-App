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

switch ($method) {
    case 'GET':
        handleGetActivities($conn, $user_id);
        break;
    case 'POST':
        handleCreateActivity($conn, $user_id);
        break;
    case 'PUT':
        handleUpdateActivity($conn, $user_id);
        break;
    case 'DELETE':
        handleDeleteActivity($conn, $user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(array("success" => false, "error" => "Method not allowed"));
}

function handleGetActivities($conn, $user_id) {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $lead_id = isset($_GET['lead_id']) ? (int)$_GET['lead_id'] : 0;
    $contact_id = isset($_GET['contact_id']) ? (int)$_GET['contact_id'] : 0;
    $opportunity_id = isset($_GET['opportunity_id']) ? (int)$_GET['opportunity_id'] : 0;
    $activity_type = isset($_GET['activity_type']) ? $_GET['activity_type'] : '';
    $completed = isset($_GET['completed']) ? $_GET['completed'] : '';

    $where_conditions = [];
    $params = [];

    if ($lead_id > 0) {
        $where_conditions[] = "a.lead_id = ?";
        $params[] = $lead_id;
    }

    if ($contact_id > 0) {
        $where_conditions[] = "a.contact_id = ?";
        $params[] = $contact_id;
    }

    if ($opportunity_id > 0) {
        $where_conditions[] = "a.opportunity_id = ?";
        $params[] = $opportunity_id;
    }

    if (!empty($activity_type)) {
        $where_conditions[] = "a.activity_type = ?";
        $params[] = $activity_type;
    }

    if ($completed !== '') {
        $where_conditions[] = "a.completed = ?";
        $params[] = $completed === 'true' ? 1 : 0;
    }

    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

    // Get total count
    $count_sql = "SELECT COUNT(*) as total FROM activities a $where_clause";
    $count_stmt = $conn->prepare($count_sql);
    if (!empty($params)) {
        foreach ($params as $index => $param) {
            $count_stmt->bindValue($index + 1, $param);
        }
    }
    $count_stmt->execute();
    $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get activities with pagination
    $sql = "SELECT a.*,
                   l.first_name as lead_first_name,
                   l.last_name as lead_last_name,
                   l.company as lead_company,
                   c.first_name as contact_first_name,
                   c.last_name as contact_last_name,
                   o.name as opportunity_name,
                   u.name as assigned_to_name,
                   u2.name as created_by_name
            FROM activities a
            LEFT JOIN leads l ON a.lead_id = l.id
            LEFT JOIN contacts c ON a.contact_id = c.id
            LEFT JOIN opportunities o ON a.opportunity_id = o.id
            LEFT JOIN users u ON a.assigned_to = u.id
            LEFT JOIN users u2 ON a.created_by = u2.id
            $where_clause
            ORDER BY a.created_at DESC
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

    $activities = [];
    foreach ($result as $row) {
        $activities[] = $row;
    }

    echo json_encode(array(
        "success" => true,
        "data" => array(
            "activities" => $activities,
            "pagination" => array(
                "page" => $page,
                "limit" => $limit,
                "total" => $total,
                "pages" => ceil($total / $limit)
            )
        )
    ));
}

function handleCreateActivity($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    $required_fields = ['activity_type', 'subject', 'due_date'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => ucfirst(str_replace('_', ' ', $field)) . ' is required'));
            return;
        }
    }

    // Either lead_id, contact_id, or opportunity_id should be provided
    if (!isset($data['lead_id']) && !isset($data['contact_id']) && !isset($data['opportunity_id'])) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Either lead_id, contact_id, or opportunity_id is required"));
        return;
    }

    $sql = "INSERT INTO activities (
        lead_id, contact_id, opportunity_id, assigned_to, activity_type, subject,
        description, due_date, completed, priority, outcome, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        $data['lead_id'],
        $data['contact_id'],
        $data['opportunity_id'],
        $data['assigned_to'] ?: $user_id,
        $data['activity_type'],
        $data['subject'],
        $data['description'],
        $data['due_date'],
        $data['completed'] ?: 0,
        $data['priority'] ?: 'medium',
        $data['outcome'],
        $user_id
    ]);

    if ($stmt->rowCount() > 0) {
        $activity_id = $conn->lastInsertId();

        // If completed, set completed_at timestamp
        if ($data['completed']) {
            $update_sql = "UPDATE activities SET completed_at = NOW() WHERE id = ?";
            $update_stmt = $conn->prepare($update_sql);
            $update_stmt->execute([$activity_id]);
        }

        // Log activity
        logActivity($conn, $user_id, 'activity', $activity_id, 'create', null, $data);

        echo json_encode(array(
            "success" => true,
            "data" => array(
                "activity_id" => $activity_id
            )
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to create activity"));
    }
}

function handleUpdateActivity($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $activity_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$activity_id) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Activity ID is required"));
        return;
    }

    // Get existing activity data for activity logging
    $existing_sql = "SELECT * FROM activities WHERE id = ?";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->execute([$activity_id]);
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Activity not found"));
        return;
    }

    // Handle completion status change
    $completed_at_update = '';
    if (isset($data['completed']) && $data['completed'] != $existing_data['completed']) {
        if ($data['completed']) {
            $completed_at_update = ", completed_at = NOW()";
        } else {
            $completed_at_update = ", completed_at = NULL";
        }
    }

    $sql = "UPDATE activities SET
        lead_id = ?, contact_id = ?, opportunity_id = ?, assigned_to = ?, activity_type = ?, subject = ?,
        description = ?, due_date = ?, completed = ?, priority = ?, outcome = ?, updated_at = NOW()
        $completed_at_update
        WHERE id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        $data['lead_id'],
        $data['contact_id'],
        $data['opportunity_id'],
        $data['assigned_to'],
        $data['activity_type'],
        $data['subject'],
        $data['description'],
        $data['due_date'],
        $data['completed'],
        $data['priority'],
        $data['outcome'],
        $activity_id
    ]);

    if ($stmt->rowCount() > 0) {
        // Log activity
        logActivity($conn, $user_id, 'activity', $activity_id, 'update', $existing_data, $data);

        echo json_encode(array("success" => true, "data" => array()));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to update activity"));
    }
}

function handleDeleteActivity($conn, $user_id) {
    $activity_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$activity_id) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Activity ID is required"));
        return;
    }

    // Get existing activity data for activity logging
    $existing_sql = "SELECT * FROM activities WHERE id = ?";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->execute([$activity_id]);
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Activity not found"));
        return;
    }

    $sql = "DELETE FROM activities WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$activity_id]);

    if ($stmt->rowCount() > 0) {
        // Log activity
        logActivity($conn, $user_id, 'activity', $activity_id, 'delete', $existing_data, null);

        echo json_encode(array("success" => true, "data" => array()));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to delete activity"));
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
    $stmt->execute([$user_id, $action, $table_name, $record_id, json_encode($details)]);
}
?>
