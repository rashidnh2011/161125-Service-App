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
        handleGetContacts($conn, $user_id);
        break;
    case 'POST':
        handleCreateContact($conn, $user_id);
        break;
    case 'PUT':
        handleUpdateContact($conn, $user_id);
        break;
    case 'DELETE':
        handleDeleteContact($conn, $user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(array("success" => false, "error" => "Method not allowed"));
}

function handleGetContacts($conn, $user_id) {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $company = isset($_GET['company']) ? $_GET['company'] : '';
    $lead_id = isset($_GET['lead_id']) ? (int)$_GET['lead_id'] : 0;

    $where_conditions = [];
    $params = [];
    $types = '';

    if (!empty($search)) {
        $where_conditions[] = "(first_name LIKE ? OR last_name LIKE ? OR company LIKE ? OR email LIKE ?)";
        $search_param = "%$search%";
        $params[] = $search_param;
        $params[] = $search_param;
        $params[] = $search_param;
        $params[] = $search_param;
        $types .= 'ssss';
    }

    if (!empty($company)) {
        $where_conditions[] = "company LIKE ?";
        $params[] = "%$company%";
        $types .= 's';
    }

    if ($lead_id > 0) {
        $where_conditions[] = "lead_id = ?";
        $params[] = $lead_id;
        $types .= 'i';
    }

    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

    // Get total count
    $count_sql = "SELECT COUNT(*) as total FROM contacts $where_clause";
    $count_stmt = $conn->prepare($count_sql);
    if (!empty($params)) {
        foreach ($params as $index => $param) {
            $count_stmt->bindValue($index + 1, $param);
        }
    }
    $count_stmt->execute();
    $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get contacts with pagination
    $sql = "SELECT c.*,
                   l.first_name as lead_first_name,
                   l.last_name as lead_last_name,
                   l.company as lead_company,
                   u.name as created_by_name
            FROM contacts c
            LEFT JOIN leads l ON c.lead_id = l.id
            LEFT JOIN users u ON c.created_by = u.id
            $where_clause
            ORDER BY c.created_at DESC
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

    $contacts = [];
    foreach ($result as $row) {
        $contacts[] = $row;
    }

        echo json_encode(array(
            "success" => true,
            "data" => array(
                "contacts" => $contacts,
                "pagination" => array(
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $total,
                    "pages" => ceil($total / $limit)
                )
            )
        ));
}

function handleCreateContact($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    $required_fields = ['first_name', 'last_name'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => ucfirst(str_replace('_', ' ', $field)) . ' is required'));
            return;
        }
    }

    $sql = "INSERT INTO contacts (
        first_name, last_name, title, company, email, phone, mobile, department,
        address, city, state, pincode, website, linkedin, twitter, notes, lead_id, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        $data['first_name'],
        $data['last_name'],
        $data['title'],
        $data['company'],
        $data['email'],
        $data['phone'],
        $data['mobile'],
        $data['department'],
        $data['address'],
        $data['city'],
        $data['state'],
        $data['pincode'],
        $data['website'],
        $data['linkedin'],
        $data['twitter'],
        $data['notes'],
        $data['lead_id'],
        $user_id
    ]);

    if ($stmt->rowCount() > 0) {
        $contact_id = $conn->lastInsertId();

        // Log activity
        logActivity($conn, $user_id, 'contact', $contact_id, 'create', null, $data);

        echo json_encode(array(
            "success" => true,
            "data" => array(
                "contact_id" => $contact_id
            )
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to create contact"));
    }
}

function handleUpdateContact($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);
    $contact_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$contact_id) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Contact ID is required"));
        return;
    }

    // Get existing contact data for activity logging
    $existing_sql = "SELECT * FROM contacts WHERE id = ?";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->execute([$contact_id]);
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Contact not found"));
        return;
    }

    $sql = "UPDATE contacts SET
        first_name = ?, last_name = ?, title = ?, company = ?, email = ?, phone = ?, mobile = ?,
        department = ?, address = ?, city = ?, state = ?, pincode = ?, website = ?,
        linkedin = ?, twitter = ?, notes = ?, lead_id = ?, updated_at = NOW()
        WHERE id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        $data['first_name'],
        $data['last_name'],
        $data['title'],
        $data['company'],
        $data['email'],
        $data['phone'],
        $data['mobile'],
        $data['department'],
        $data['address'],
        $data['city'],
        $data['state'],
        $data['pincode'],
        $data['website'],
        $data['linkedin'],
        $data['twitter'],
        $data['notes'],
        $data['lead_id'],
        $contact_id
    ]);

    if ($stmt->rowCount() > 0) {
        // Log activity
        logActivity($conn, $user_id, 'contact', $contact_id, 'update', $existing_data, $data);

        echo json_encode(array("success" => true, "data" => array()));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to update contact"));
    }
}

function handleDeleteContact($conn, $user_id) {
    $contact_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$contact_id) {
        http_response_code(400);
        echo json_encode(array("success" => false, "error" => "Contact ID is required"));
        return;
    }

    // Get existing contact data for activity logging
    $existing_sql = "SELECT * FROM contacts WHERE id = ?";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->execute([$contact_id]);
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_data) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Contact not found"));
        return;
    }

    $sql = "DELETE FROM contacts WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$contact_id]);

    if ($stmt->rowCount() > 0) {
        // Log activity
        logActivity($conn, $user_id, 'contact', $contact_id, 'delete', $existing_data, null);

        echo json_encode(array("success" => true, "data" => array()));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "error" => "Failed to delete contact"));
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
