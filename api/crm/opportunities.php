<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../config/jwt.php';

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

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $user_data['id'];

switch ($method) {
    case 'GET':
        handleGetOpportunities($db, $user_id);
        break;
    case 'POST':
        handleCreateOpportunity($db, $user_id);
        break;
    case 'PUT':
        handleUpdateOpportunity($db, $user_id);
        break;
    case 'DELETE':
        handleDeleteOpportunity($db, $user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(array("success" => false, "error" => "Method not allowed"));
        break;
}

function handleGetOpportunities($db, $user_id) {
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
    $stage = isset($_GET['stage']) ? trim($_GET['stage']) : '';
    $assigned_to = isset($_GET['assigned_to']) ? (int)$_GET['assigned_to'] : 0;
    $lead_id = isset($_GET['lead_id']) ? (int)$_GET['lead_id'] : 0;

    $where_conditions = [];
    $params = [];

    // Apply role-based filtering
    if ($user_role !== 'admin') {
        // For non-admin users, only show their own opportunities or opportunities assigned to them
        $where_conditions[] = "(o.created_by = :user_id OR o.assigned_to = :user_id)";
        $params[':user_id'] = $user_id;
    }

    // Add search conditions
    if (!empty($search)) {
        $where_conditions[] = "(o.name LIKE :search OR l.first_name LIKE :search OR l.last_name LIKE :search OR l.company LIKE :search OR o.description LIKE :search)";
        $params[':search'] = "%$search%";
    }

    // Add stage filter
    if (!empty($stage)) {
        $where_conditions[] = "o.stage = :stage";
        $params[':stage'] = $stage;
    }

    // Add assigned_to filter (only for admin or if user is viewing their own)
    if ($assigned_to > 0) {
        if ($user_role === 'admin' || $assigned_to == $user_id) {
            $where_conditions[] = "o.assigned_to = :assigned_to";
            $params[':assigned_to'] = $assigned_to;
        }
    }

    // Add lead_id filter
    if ($lead_id > 0) {
        $where_conditions[] = "o.lead_id = :lead_id";
        $params[':lead_id'] = $lead_id;
    }

    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

    try {
        // Get total count
        $count_sql = "SELECT COUNT(*) as total FROM opportunities o $where_clause";
        $count_stmt = $db->prepare($count_sql);
        foreach ($params as $key => $value) {
            $count_stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $count_stmt->execute();
        $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get opportunities with pagination
        $sql = "SELECT o.*,
                       l.first_name as lead_first_name,
                       l.last_name as lead_last_name,
                       l.company as lead_company,
                       c.first_name as contact_first_name,
                       c.last_name as contact_last_name,
                       u.name as assigned_to_name,
                       u2.name as created_by_name
                FROM opportunities o
                LEFT JOIN leads l ON o.lead_id = l.id
                LEFT JOIN contacts c ON o.contact_id = c.id
                LEFT JOIN users u ON o.assigned_to = u.id
                LEFT JOIN users u2 ON o.created_by = u2.id
                $where_clause
                ORDER BY o.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(array(
            "success" => true,
            "data" => array(
                "opportunities" => $result,
                "pagination" => array(
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $total,
                    "pages" => ceil($total / $limit)
                )
            )
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to fetch opportunities: " . $e->getMessage()));
    }
}

function handleCreateOpportunity($db, $user_id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Invalid JSON data"));
            return;
        }

        if (!isset($data['name']) || empty($data['name'])) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Opportunity name is required"));
            return;
        }

        // Validate that either lead_id or contact_id is provided
        if (!isset($data['lead_id']) && !isset($data['contact_id'])) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Either lead_id or contact_id is required"));
            return;
        }

        $sql = "INSERT INTO opportunities (
            name, lead_id, contact_id, assigned_to, stage, value, probability,
            expected_close_date, source, description, next_step, competition, created_by
        ) VALUES (
            :name, :lead_id, :contact_id, :assigned_to, :stage, :value, :probability,
            :expected_close_date, :source, :description, :next_step, :competition, :created_by
        )";

        $stmt = $db->prepare($sql);
        $stmt->bindValue(':name', $data['name'], PDO::PARAM_STR);
        $stmt->bindValue(':lead_id', $data['lead_id'] ?? null, PDO::PARAM_INT);
        $stmt->bindValue(':contact_id', $data['contact_id'] ?? null, PDO::PARAM_INT);
        $stmt->bindValue(':assigned_to', $data['assigned_to'] ?? null, PDO::PARAM_INT);
        $stmt->bindValue(':stage', $data['stage'] ?? 'prospecting', PDO::PARAM_STR);
        $stmt->bindValue(':value', $data['value'] ?? 0.00, PDO::PARAM_STR);
        $stmt->bindValue(':probability', $data['probability'] ?? 10, PDO::PARAM_INT);
        $stmt->bindValue(':expected_close_date', $data['expected_close_date'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':source', $data['source'] ?? '', PDO::PARAM_STR);
        $stmt->bindValue(':description', $data['description'] ?? '', PDO::PARAM_STR);
        $stmt->bindValue(':next_step', $data['next_step'] ?? '', PDO::PARAM_STR);
        $stmt->bindValue(':competition', $data['competition'] ?? '', PDO::PARAM_STR);
        $stmt->bindValue(':created_by', $user_id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            $opportunity_id = $db->lastInsertId();

            // Log activity
            logActivity($db, $user_id, 'opportunity', $opportunity_id, 'create', null, $data);

            echo json_encode(array(
                "success" => true,
                "data" => array(
                    "opportunity_id" => $opportunity_id
                )
            ));
        } else {
            http_response_code(500);
            echo json_encode(array("success" => false, "error" => "Failed to create opportunity"));
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Database error: " . $e->getMessage()));
    }
}

function handleUpdateOpportunity($db, $user_id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $opportunity_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if (!$opportunity_id) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Opportunity ID is required"));
            return;
        }

        if (!$data) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Invalid JSON data"));
            return;
        }

        // Get existing opportunity data for activity logging
        $existing_sql = "SELECT * FROM opportunities WHERE id = :opportunity_id";
        $existing_stmt = $db->prepare($existing_sql);
        $existing_stmt->bindValue(':opportunity_id', $opportunity_id, PDO::PARAM_INT);
        $existing_stmt->execute();
        $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing_data) {
            http_response_code(404);
            echo json_encode(array("success" => false, "error" => "Opportunity not found"));
            return;
        }

        $sql = "UPDATE opportunities SET
            name = :name, lead_id = :lead_id, contact_id = :contact_id, assigned_to = :assigned_to,
            stage = :stage, value = :value, probability = :probability,
            expected_close_date = :expected_close_date, source = :source,
            description = :description, next_step = :next_step, competition = :competition,
            updated_at = NOW()
            WHERE id = :opportunity_id";

        $stmt = $db->prepare($sql);
        $stmt->bindValue(':name', $data['name'], PDO::PARAM_STR);
        $stmt->bindValue(':lead_id', $data['lead_id'], PDO::PARAM_INT);
        $stmt->bindValue(':contact_id', $data['contact_id'], PDO::PARAM_INT);
        $stmt->bindValue(':assigned_to', $data['assigned_to'], PDO::PARAM_INT);
        $stmt->bindValue(':stage', $data['stage'], PDO::PARAM_STR);
        $stmt->bindValue(':value', $data['value'], PDO::PARAM_STR);
        $stmt->bindValue(':probability', $data['probability'], PDO::PARAM_INT);
        $stmt->bindValue(':expected_close_date', $data['expected_close_date'], PDO::PARAM_STR);
        $stmt->bindValue(':source', $data['source'], PDO::PARAM_STR);
        $stmt->bindValue(':description', $data['description'], PDO::PARAM_STR);
        $stmt->bindValue(':next_step', $data['next_step'], PDO::PARAM_STR);
        $stmt->bindValue(':competition', $data['competition'], PDO::PARAM_STR);
        $stmt->bindValue(':opportunity_id', $opportunity_id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            // Log activity
            logActivity($db, $user_id, 'opportunity', $opportunity_id, 'update', $existing_data, $data);

            echo json_encode(array("success" => true, "data" => array()));
        } else {
            http_response_code(500);
            echo json_encode(array("success" => false, "error" => "Failed to update opportunity"));
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Database error: " . $e->getMessage()));
    }
}

function handleDeleteOpportunity($db, $user_id) {
    try {
        $opportunity_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if (!$opportunity_id) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Opportunity ID is required"));
            return;
        }

        // Get existing opportunity data for activity logging
        $existing_sql = "SELECT * FROM opportunities WHERE id = :opportunity_id";
        $existing_stmt = $db->prepare($existing_sql);
        $existing_stmt->bindValue(':opportunity_id', $opportunity_id, PDO::PARAM_INT);
        $existing_stmt->execute();
        $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing_data) {
            http_response_code(404);
            echo json_encode(array("success" => false, "error" => "Opportunity not found"));
            return;
        }

        $sql = "DELETE FROM opportunities WHERE id = :opportunity_id";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':opportunity_id', $opportunity_id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            // Log activity
            logActivity($db, $user_id, 'opportunity', $opportunity_id, 'delete', $existing_data, null);

            echo json_encode(array("success" => true, "data" => array()));
        } else {
            http_response_code(500);
            echo json_encode(array("success" => false, "error" => "Failed to delete opportunity"));
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Database error: " . $e->getMessage()));
    }
}

function logActivity($db, $user_id, $table_name, $record_id, $action, $old_values, $new_values) {
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

    $stmt = $db->prepare($sql);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindValue(':action', $action, PDO::PARAM_STR);
    $stmt->bindValue(':target_table', $table_name, PDO::PARAM_STR);
    $stmt->bindValue(':target_id', $record_id, PDO::PARAM_INT);
    $stmt->bindValue(':details', json_encode($details), PDO::PARAM_STR);

    $stmt->execute();
}
?>
