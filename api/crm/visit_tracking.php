<?php
require_once '../config/database.php';
require_once '../config/jwt.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
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
        if (isset($_GET['action'])) {
            $action = $_GET['action'];
            if ($action === 'current_visit') {
                handleGetCurrentVisit($conn, $user_id);
            } elseif ($action === 'convert_to_lead') {
                handleConvertToLead($conn, $user_id);
            }
        } else {
            handleGetCurrentVisit($conn, $user_id);
        }
        break;
    case 'POST':
        if (isset($_GET['action'])) {
            $action = $_GET['action'];
            if ($action === 'start_visit') {
                handleStartVisit($conn, $user_id);
            } elseif ($action === 'end_visit') {
                handleEndVisit($conn, $user_id);
            } elseif ($action === 'convert_non_lead') {
                handleConvertNonLeadToLead($conn, $user_id);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Action parameter required']);
        }
        break;
    case 'PUT':
        handleUpdateVisitLocation($conn, $user_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function handleGetCurrentVisit($conn, $user_id) {
    // Get the current in-progress visit for the user
    $sql = "SELECT v.*,
                   l.first_name as lead_first_name,
                   l.last_name as lead_last_name,
                   l.company as lead_company,
                   c.first_name as contact_first_name,
                   c.last_name as contact_last_name
            FROM visits v
            LEFT JOIN leads l ON v.lead_id = l.id
            LEFT JOIN contacts c ON v.contact_id = c.id
            WHERE v.assigned_to = :user_id AND v.status = 'in_progress'
            ORDER BY v.start_time DESC
            LIMIT 1";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $visit = $stmt->fetch(PDO::FETCH_ASSOC);

        // Calculate current duration if visit is in progress
        if ($visit['start_time'] && !$visit['end_time']) {
            $start_time = new DateTime($visit['start_time']);
            $now = new DateTime();
            $interval = $start_time->diff($now);
            $current_duration = ($interval->h * 60) + $interval->i;
            $visit['current_duration_minutes'] = $current_duration;
        }

        echo json_encode([
            'current_visit' => $visit,
            'in_progress' => true
        ]);
    } else {
        echo json_encode([
            'current_visit' => null,
            'in_progress' => false
        ]);
    }
}

function handleStartVisit($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    // Check if user already has an in-progress visit
    $check_sql = "SELECT id FROM visits WHERE assigned_to = :user_id AND status = 'in_progress'";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $check_stmt->execute();

    if ($check_stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'User already has an in-progress visit']);
        return;
    }

    $required_fields = ['visit_type', 'latitude', 'longitude'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
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

    // Get address from coordinates (you might want to use a geocoding service here)
    $address = isset($data['address']) ? $data['address'] : 'Location coordinates: ' . $data['latitude'] . ', ' . $data['longitude'];

    $sql = "INSERT INTO visits (
        lead_id, contact_id, assigned_to, visit_type, status,
        start_latitude, start_longitude, start_address, start_time,
        purpose, prospect_name, prospect_phone, prospect_email, prospect_company,
        created_by
    ) VALUES (
        :lead_id, :contact_id, :assigned_to, :visit_type, 'in_progress',
        :latitude, :longitude, :address, NOW(),
        :purpose, :prospect_name, :prospect_phone, :prospect_email, :prospect_company,
        :created_by
    )";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':lead_id', isset($data['lead_id']) ? $data['lead_id'] : null, PDO::PARAM_INT);
    $stmt->bindValue(':contact_id', isset($data['contact_id']) ? $data['contact_id'] : null, PDO::PARAM_INT);
    $stmt->bindValue(':assigned_to', $user_id, PDO::PARAM_INT);
    $stmt->bindValue(':visit_type', $data['visit_type'], PDO::PARAM_STR);
    $stmt->bindValue(':latitude', $data['latitude'], PDO::PARAM_STR);
    $stmt->bindValue(':longitude', $data['longitude'], PDO::PARAM_STR);
    $stmt->bindValue(':address', $address, PDO::PARAM_STR);
    $stmt->bindValue(':purpose', $data['purpose'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_name', isset($data['prospect_name']) ? $data['prospect_name'] : '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_phone', isset($data['prospect_phone']) ? $data['prospect_phone'] : '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_email', isset($data['prospect_email']) ? $data['prospect_email'] : '', PDO::PARAM_STR);
    $stmt->bindValue(':prospect_company', isset($data['prospect_company']) ? $data['prospect_company'] : '', PDO::PARAM_STR);
    $stmt->bindValue(':created_by', $user_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        $visit_id = $conn->lastInsertId();

        // Log activity
        logActivity($conn, $user_id, 'visit', $visit_id, 'start', null, $data);

        echo json_encode([
            'message' => 'Visit started successfully',
            'visit_id' => $visit_id,
            'start_time' => date('Y-m-d H:i:s')
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to start visit']);
    }
}

function handleEndVisit($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    // Get the current in-progress visit for the user
    $current_visit_sql = "SELECT id FROM visits WHERE assigned_to = :user_id AND status = 'in_progress' ORDER BY start_time DESC LIMIT 1";
    $current_visit_stmt = $conn->prepare($current_visit_sql);
    $current_visit_stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $current_visit_stmt->execute();

    if ($current_visit_stmt->rowCount() === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'No in-progress visit found']);
        return;
    }

    $visit_id = $current_visit_stmt->fetch(PDO::FETCH_ASSOC)['id'];

    // Get existing visit data for activity logging
    $existing_sql = "SELECT * FROM visits WHERE id = :visit_id";
    $existing_stmt = $conn->prepare($existing_sql);
    $existing_stmt->bindValue(':visit_id', $visit_id, PDO::PARAM_INT);
    $existing_stmt->execute();
    $existing_data = $existing_stmt->fetch(PDO::FETCH_ASSOC);

    // Calculate duration
    $start_time = new DateTime($existing_data['start_time']);
    $end_time = new DateTime();
    $interval = $start_time->diff($end_time);
    $duration_minutes = ($interval->h * 60) + $interval->i;

    // Get end location and address
    $end_latitude = isset($data['end_latitude']) ? $data['end_latitude'] : $existing_data['start_latitude'];
    $end_longitude = isset($data['end_longitude']) ? $data['end_longitude'] : $existing_data['start_longitude'];
    $end_address = isset($data['end_address']) ? $data['end_address'] : $existing_data['start_address'];

    $sql = "UPDATE visits SET
        status = 'completed',
        end_latitude = :end_latitude,
        end_longitude = :end_longitude,
        end_address = :end_address,
        end_time = NOW(),
        duration_minutes = :duration_minutes,
        notes = :notes,
        outcome = :outcome,
        follow_up_required = :follow_up_required,
        follow_up_date = :follow_up_date,
        updated_at = NOW()
        WHERE id = :visit_id";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':end_latitude', $end_latitude, PDO::PARAM_STR);
    $stmt->bindValue(':end_longitude', $end_longitude, PDO::PARAM_STR);
    $stmt->bindValue(':end_address', $end_address, PDO::PARAM_STR);
    $stmt->bindValue(':duration_minutes', $duration_minutes, PDO::PARAM_INT);
    $stmt->bindValue(':notes', $data['notes'] ?: '', PDO::PARAM_STR);
    $stmt->bindValue(':outcome', isset($data['outcome']) ? $data['outcome'] : '', PDO::PARAM_STR);
    $stmt->bindValue(':follow_up_required', isset($data['follow_up_required']) ? $data['follow_up_required'] : false, PDO::PARAM_BOOL);
    $stmt->bindValue(':follow_up_date', isset($data['follow_up_date']) ? $data['follow_up_date'] : null, PDO::PARAM_STR);
    $stmt->bindValue(':visit_id', $visit_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        // Log activity
        logActivity($conn, $user_id, 'visit', $visit_id, 'end', $existing_data, $data);

        echo json_encode([
            'message' => 'Visit ended successfully',
            'visit_id' => $visit_id,
            'duration_minutes' => $duration_minutes,
            'end_time' => $end_time->format('Y-m-d H:i:s')
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to end visit']);
    }
}

function handleUpdateVisitLocation($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    // Get the current in-progress visit for the user
    $current_visit_sql = "SELECT id FROM visits WHERE assigned_to = :user_id AND status = 'in_progress' ORDER BY start_time DESC LIMIT 1";
    $current_visit_stmt = $conn->prepare($current_visit_sql);
    $current_visit_stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $current_visit_stmt->execute();

    if ($current_visit_stmt->rowCount() === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'No in-progress visit found']);
        return;
    }

    $visit_id = $current_visit_stmt->fetch(PDO::FETCH_ASSOC)['id'];

    if (!isset($data['latitude']) || !isset($data['longitude'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Latitude and longitude are required']);
        return;
    }

    // Get address from coordinates (you might want to use a geocoding service here)
    $address = isset($data['address']) ? $data['address'] : 'Location coordinates: ' . $data['latitude'] . ', ' . $data['longitude'];

    $sql = "UPDATE visits SET
        end_latitude = :latitude,
        end_longitude = :longitude,
        end_address = :address,
        updated_at = NOW()
        WHERE id = :visit_id";

    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':latitude', $data['latitude'], PDO::PARAM_STR);
    $stmt->bindValue(':longitude', $data['longitude'], PDO::PARAM_STR);
    $stmt->bindValue(':address', $address, PDO::PARAM_STR);
    $stmt->bindValue(':visit_id', $visit_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        echo json_encode([
            'message' => 'Visit location updated successfully',
            'visit_id' => $visit_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update visit location']);
    }
}

function handleConvertNonLeadToLead($conn, $user_id) {
    $data = json_decode(file_get_contents('php://input'), true);

    $required_fields = ['visit_id', 'first_name', 'last_name'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => ucfirst(str_replace('_', ' ', $field)) . ' is required']);
            return;
        }
    }

    // Get the visit details
    $visit_sql = "SELECT * FROM visits WHERE id = :visit_id AND visit_type = 'non_lead'";
    $visit_stmt = $conn->prepare($visit_sql);
    $visit_stmt->bindValue(':visit_id', $data['visit_id'], PDO::PARAM_INT);
    $visit_stmt->execute();
    $visit_data = $visit_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$visit_data) {
        http_response_code(404);
        echo json_encode(['error' => 'Non-lead visit not found']);
        return;
    }

    // Create new lead from the visit prospect data
    $lead_sql = "INSERT INTO leads (
        first_name, last_name, company, email, phone, mobile,
        source, status, assigned_to, notes, created_by
    ) VALUES (
        :first_name, :last_name, :company, :email, :phone, :mobile,
        'visit', 'new', :assigned_to, :notes, :created_by
    )";

    $lead_stmt = $conn->prepare($lead_sql);
    $lead_stmt->bindValue(':first_name', $data['first_name'], PDO::PARAM_STR);
    $lead_stmt->bindValue(':last_name', $data['last_name'], PDO::PARAM_STR);
    $lead_stmt->bindValue(':company', isset($data['company']) ? $data['company'] : (isset($visit_data['prospect_company']) ? $visit_data['prospect_company'] : ''), PDO::PARAM_STR);
    $lead_stmt->bindValue(':email', isset($data['email']) ? $data['email'] : (isset($visit_data['prospect_email']) ? $visit_data['prospect_email'] : ''), PDO::PARAM_STR);
    $lead_stmt->bindValue(':phone', isset($data['phone']) ? $data['phone'] : (isset($visit_data['prospect_phone']) ? $visit_data['prospect_phone'] : ''), PDO::PARAM_STR);
    $lead_stmt->bindValue(':mobile', isset($data['mobile']) ? $data['mobile'] : (isset($visit_data['prospect_phone']) ? $visit_data['prospect_phone'] : ''), PDO::PARAM_STR);
    $lead_stmt->bindValue(':assigned_to', $visit_data['assigned_to'], PDO::PARAM_INT);
    $lead_stmt->bindValue(':notes', $data['notes'] ?: 'Converted from non-lead visit', PDO::PARAM_STR);
    $lead_stmt->bindValue(':created_by', $user_id, PDO::PARAM_INT);

    if ($lead_stmt->execute()) {
        $lead_id = $conn->lastInsertId();

        // Update the visit to link it to the new lead
        $update_visit_sql = "UPDATE visits SET
            lead_id = :lead_id,
            converted_to_lead = TRUE,
            converted_lead_id = :converted_lead_id,
            visit_type = 'lead',
            updated_at = NOW()
            WHERE id = :visit_id";

        $update_visit_stmt = $conn->prepare($update_visit_sql);
        $update_visit_stmt->bindValue(':lead_id', $lead_id, PDO::PARAM_INT);
        $update_visit_stmt->bindValue(':converted_lead_id', $lead_id, PDO::PARAM_INT);
        $update_visit_stmt->bindValue(':visit_id', $data['visit_id'], PDO::PARAM_INT);

        if ($update_visit_stmt->execute()) {
            // Log activities
            logActivity($conn, $user_id, 'lead', $lead_id, 'create', null, $data);
            logActivity($conn, $user_id, 'visit', $data['visit_id'], 'convert', $visit_data, ['converted_to_lead_id' => $lead_id]);

            echo json_encode([
                'message' => 'Non-lead visit converted to lead successfully',
                'lead_id' => $lead_id,
                'visit_id' => $data['visit_id']
            ]);
        } else {
            // Rollback lead creation if visit update fails
            $delete_lead_sql = "DELETE FROM leads WHERE id = :lead_id";
            $delete_lead_stmt = $conn->prepare($delete_lead_sql);
            $delete_lead_stmt->bindValue(':lead_id', $lead_id, PDO::PARAM_INT);
            $delete_lead_stmt->execute();

            http_response_code(500);
            echo json_encode(['error' => 'Failed to update visit after lead creation']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create lead from visit']);
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
