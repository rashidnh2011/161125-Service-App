<?php
require_once '../config/database.php';
require_once '../config/jwt.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
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

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

handleGetDashboardData($conn, $user_id);

function handleGetDashboardData($conn, $user_id) {
    $dashboard_data = [];

    // Get user's role to determine what data to show
    $user_sql = "SELECT role FROM users WHERE id = ?";
    $user_stmt = $conn->prepare($user_sql);
    $user_stmt->bind_param('i', $user_id);
    $user_stmt->execute();
    $user_role = $user_stmt->get_result()->fetch_assoc()['role'];

    // Basic metrics for all users
    $dashboard_data['metrics'] = getBasicMetrics($conn, $user_id, $user_role);

    // Visit data for map and analytics
    $dashboard_data['visits'] = getVisitData($conn, $user_id, $user_role);

    // Performance data for assigned users
    $dashboard_data['performance'] = getPerformanceData($conn, $user_id, $user_role);

    // Recent activities
    $dashboard_data['recent_activities'] = getRecentActivities($conn, $user_id, $user_role);

    // Charts data
    $dashboard_data['charts'] = getChartsData($conn, $user_id, $user_role);

    echo json_encode($dashboard_data);
}

function getBasicMetrics($conn, $user_id, $user_role) {
    $metrics = [];

    if ($user_role === 'admin') {
        // Admin sees all data
        $sql = "SELECT
            (SELECT COUNT(*) FROM leads) as total_leads,
            (SELECT COUNT(*) FROM leads WHERE status IN ('qualified', 'proposal', 'negotiation')) as active_leads,
            (SELECT COUNT(*) FROM opportunities) as total_opportunities,
            (SELECT COUNT(*) FROM opportunities WHERE stage IN ('prospecting', 'qualification', 'proposal', 'negotiation')) as active_opportunities,
            (SELECT COUNT(*) FROM visits WHERE DATE(created_at) = CURDATE()) as today_visits,
            (SELECT COUNT(*) FROM visits WHERE status = 'in_progress') as active_visits,
            (SELECT SUM(value) FROM opportunities WHERE stage = 'closed_won' AND MONTH(created_at) = MONTH(CURDATE())) as monthly_revenue";
    } else {
        // Sales users see their own data
        $sql = "SELECT
            (SELECT COUNT(*) FROM leads WHERE assigned_to = ?) as total_leads,
            (SELECT COUNT(*) FROM leads WHERE assigned_to = ? AND status IN ('qualified', 'proposal', 'negotiation')) as active_leads,
            (SELECT COUNT(*) FROM opportunities WHERE assigned_to = ?) as total_opportunities,
            (SELECT COUNT(*) FROM opportunities WHERE assigned_to = ? AND stage IN ('prospecting', 'qualification', 'proposal', 'negotiation')) as active_opportunities,
            (SELECT COUNT(*) FROM visits WHERE assigned_to = ? AND DATE(created_at) = CURDATE()) as today_visits,
            (SELECT COUNT(*) FROM visits WHERE assigned_to = ? AND status = 'in_progress') as active_visits,
            (SELECT SUM(o.value) FROM opportunities o WHERE o.assigned_to = ? AND o.stage = 'closed_won' AND MONTH(o.created_at) = MONTH(CURDATE())) as monthly_revenue";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param('iiiiiii', $user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $metrics = $result->fetch_assoc();
        $stmt->close();
        return $metrics;
    }

    $result = $conn->query($sql);
    return $result->fetch_assoc();
}

function getVisitData($conn, $user_id, $user_role) {
    $visits_data = [];

    if ($user_role === 'admin') {
        // Admin sees all visits for map display
        $sql = "SELECT v.*,
                       l.first_name as lead_first_name,
                       l.last_name as lead_last_name,
                       l.company as lead_company,
                       u.name as assigned_to_name,
                       CASE
                           WHEN v.visit_type = 'lead' THEN '#10B981' -- Green for lead visits
                           ELSE '#F59E0B' -- Yellow for non-lead visits
                       END as color
                FROM visits v
                LEFT JOIN leads l ON v.lead_id = l.id
                LEFT JOIN users u ON v.assigned_to = u.id
                WHERE v.start_latitude IS NOT NULL AND v.start_longitude IS NOT NULL
                ORDER BY v.created_at DESC
                LIMIT 100";
    } else {
        // Sales users see their own visits
        $sql = "SELECT v.*,
                       l.first_name as lead_first_name,
                       l.last_name as lead_last_name,
                       l.company as lead_company,
                       CASE
                           WHEN v.visit_type = 'lead' THEN '#10B981' -- Green for lead visits
                           ELSE '#F59E0B' -- Yellow for non-lead visits
                       END as color
                FROM visits v
                LEFT JOIN leads l ON v.lead_id = l.id
                WHERE v.assigned_to = ? AND v.start_latitude IS NOT NULL AND v.start_longitude IS NOT NULL
                ORDER BY v.created_at DESC
                LIMIT 50";
    }

    $stmt = $conn->prepare($sql);
    if ($user_role !== 'admin') {
        $stmt->bind_param('i', $user_id);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $visits = [];
    while ($row = $result->fetch_assoc()) {
        $visits[] = $row;
    }

    $visits_data['map_data'] = $visits;

    // Get visit statistics
    if ($user_role === 'admin') {
        $stats_sql = "SELECT
            COUNT(*) as total_visits,
            COUNT(CASE WHEN visit_type = 'lead' THEN 1 END) as lead_visits,
            COUNT(CASE WHEN visit_type = 'non_lead' THEN 1 END) as non_lead_visits,
            AVG(duration_minutes) as avg_duration,
            COUNT(CASE WHEN converted_to_lead = TRUE THEN 1 END) as conversions
            FROM visits";
    } else {
        $stats_sql = "SELECT
            COUNT(*) as total_visits,
            COUNT(CASE WHEN visit_type = 'lead' THEN 1 END) as lead_visits,
            COUNT(CASE WHEN visit_type = 'non_lead' THEN 1 END) as non_lead_visits,
            AVG(duration_minutes) as avg_duration,
            COUNT(CASE WHEN converted_to_lead = TRUE THEN 1 END) as conversions
            FROM visits WHERE assigned_to = ?";
    }

    $stats_stmt = $conn->prepare($stats_sql);
    if ($user_role !== 'admin') {
        $stats_stmt->bind_param('i', $user_id);
    }
    $stats_stmt->execute();
    $visits_data['statistics'] = $stats_stmt->get_result()->fetch_assoc();

    return $visits_data;
}

function getPerformanceData($conn, $user_id, $user_role) {
    if ($user_role === 'admin') {
        // Admin sees performance data for all sales users
        $sql = "SELECT
            u.id,
            u.name,
            u.role,
            COUNT(DISTINCT l.id) as total_leads,
            COUNT(DISTINCT o.id) as total_opportunities,
            COUNT(DISTINCT v.id) as total_visits,
            AVG(v.duration_minutes) as avg_visit_duration,
            COUNT(CASE WHEN v.visit_type = 'non_lead' AND v.converted_to_lead = TRUE THEN 1 END) as conversions,
            SUM(o.value) as total_opportunity_value,
            COUNT(CASE WHEN o.stage = 'closed_won' THEN 1 END) as closed_won
        FROM users u
        LEFT JOIN leads l ON u.id = l.assigned_to
        LEFT JOIN opportunities o ON u.id = o.assigned_to
        LEFT JOIN visits v ON u.id = v.assigned_to
        WHERE u.role = 'sales'
        GROUP BY u.id, u.name, u.role
        ORDER BY total_visits DESC";
    } else {
        // Sales users see their own performance data
        $sql = "SELECT
            COUNT(DISTINCT l.id) as total_leads,
            COUNT(DISTINCT o.id) as total_opportunities,
            COUNT(DISTINCT v.id) as total_visits,
            AVG(v.duration_minutes) as avg_visit_duration,
            COUNT(CASE WHEN v.visit_type = 'non_lead' AND v.converted_to_lead = TRUE THEN 1 END) as conversions,
            SUM(o.value) as total_opportunity_value,
            COUNT(CASE WHEN o.stage = 'closed_won' THEN 1 END) as closed_won
        FROM leads l
        LEFT JOIN opportunities o ON l.id = o.lead_id OR l.assigned_to = o.assigned_to
        LEFT JOIN visits v ON l.assigned_to = v.assigned_to
        WHERE l.assigned_to = ?";
    }

    $stmt = $conn->prepare($sql);
    if ($user_role !== 'admin') {
        $stmt->bind_param('i', $user_id);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $performance = [];
    while ($row = $result->fetch_assoc()) {
        $performance[] = $row;
    }

    return $performance;
}

function getRecentActivities($conn, $user_id, $user_role) {
    if ($user_role === 'admin') {
        // Admin sees all recent activities
        $sql = "SELECT a.*,
                       l.first_name as lead_first_name,
                       l.last_name as lead_last_name,
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
                ORDER BY a.created_at DESC
                LIMIT 20";
    } else {
        // Sales users see their own activities
        $sql = "SELECT a.*,
                       l.first_name as lead_first_name,
                       l.last_name as lead_last_name,
                       c.first_name as contact_first_name,
                       c.last_name as contact_last_name,
                       o.name as opportunity_name,
                       u2.name as created_by_name
                FROM activities a
                LEFT JOIN leads l ON a.lead_id = l.id
                LEFT JOIN contacts c ON a.contact_id = c.id
                LEFT JOIN opportunities o ON a.opportunity_id = o.id
                LEFT JOIN users u2 ON a.created_by = u2.id
                WHERE a.assigned_to = ? OR a.created_by = ?
                ORDER BY a.created_at DESC
                LIMIT 15";
    }

    $stmt = $conn->prepare($sql);
    if ($user_role !== 'admin') {
        $stmt->bind_param('ii', $user_id, $user_id);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $activities = [];
    while ($row = $result->fetch_assoc()) {
        $activities[] = $row;
    }

    return $activities;
}

function getChartsData($conn, $user_id, $user_role) {
    $charts = [];

    // Leads by status
    if ($user_role === 'admin') {
        $status_sql = "SELECT status, COUNT(*) as count FROM leads GROUP BY status";
    } else {
        $status_sql = "SELECT status, COUNT(*) as count FROM leads WHERE assigned_to = ? GROUP BY status";
    }

    $status_stmt = $conn->prepare($status_sql);
    if ($user_role !== 'admin') {
        $status_stmt->bind_param('i', $user_id);
    }
    $status_stmt->execute();
    $status_result = $status_stmt->get_result();

    $leads_by_status = [];
    while ($row = $status_result->fetch_assoc()) {
        $leads_by_status[] = $row;
    }
    $charts['leads_by_status'] = $leads_by_status;

    // Opportunities by stage
    if ($user_role === 'admin') {
        $stage_sql = "SELECT stage, COUNT(*) as count FROM opportunities GROUP BY stage";
    } else {
        $stage_sql = "SELECT stage, COUNT(*) as count FROM opportunities WHERE assigned_to = ? GROUP BY stage";
    }

    $stage_stmt = $conn->prepare($stage_sql);
    if ($user_role !== 'admin') {
        $stage_stmt->bind_param('i', $user_id);
    }
    $stage_stmt->execute();
    $stage_result = $stage_stmt->get_result();

    $opportunities_by_stage = [];
    while ($row = $stage_result->fetch_assoc()) {
        $opportunities_by_stage[] = $row;
    }
    $charts['opportunities_by_stage'] = $opportunities_by_stage;

    // Visits over time (last 30 days)
    if ($user_role === 'admin') {
        $visits_sql = "SELECT DATE(created_at) as date, COUNT(*) as count
                      FROM visits
                      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                      GROUP BY DATE(created_at)
                      ORDER BY date";
    } else {
        $visits_sql = "SELECT DATE(created_at) as date, COUNT(*) as count
                      FROM visits
                      WHERE assigned_to = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                      GROUP BY DATE(created_at)
                      ORDER BY date";
    }

    $visits_stmt = $conn->prepare($visits_sql);
    if ($user_role !== 'admin') {
        $visits_stmt->bind_param('i', $user_id);
    }
    $visits_stmt->execute();
    $visits_result = $visits_stmt->get_result();

    $visits_over_time = [];
    while ($row = $visits_result->fetch_assoc()) {
        $visits_over_time[] = $row;
    }
    $charts['visits_over_time'] = $visits_over_time;

    return $charts;
}
?>
