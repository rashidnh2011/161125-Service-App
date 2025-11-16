<?php
require_once '../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Get filters and pagination parameters
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $job_type = isset($_GET['job_type']) ? $_GET['job_type'] : '';
    $customer_id = isset($_GET['customer_id']) ? (int)$_GET['customer_id'] : null;
    $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : '';
    $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : '';
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    // Build query
    $whereClause = '';
    $params = [];

    // Add filters
    if (!empty($search)) {
        if (!empty($whereClause)) $whereClause .= ' AND ';
        $whereClause .= "(cj.request_number LIKE :search OR cc.customer_name LIKE :search OR cj.remarks LIKE :search)";
        $params[':search'] = "%$search%";
    }

    if (!empty($job_type)) {
        if (!empty($whereClause)) $whereClause .= ' AND ';
        $whereClause .= "cj.job_type = :job_type";
        $params[':job_type'] = $job_type;
    }

    if ($customer_id) {
        if (!empty($whereClause)) $whereClause .= ' AND ';
        $whereClause .= "cj.customer_id = :customer_id";
        $params[':customer_id'] = $customer_id;
    }

    if (!empty($date_from)) {
        if (!empty($whereClause)) $whereClause .= ' AND ';
        $whereClause .= "cj.request_date >= :date_from";
        $params[':date_from'] = $date_from;
    }

    if (!empty($date_to)) {
        if (!empty($whereClause)) $whereClause .= ' AND ';
        $whereClause .= "cj.request_date <= :date_to";
        $params[':date_to'] = $date_to;
    }

    if (!empty($whereClause)) {
        $whereClause = 'WHERE ' . $whereClause;
    }

    // Get total count
    $countQuery = "SELECT COUNT(*) as total
                   FROM calibration_jobs cj
                   LEFT JOIN calibration_customers cc ON cj.customer_id = cc.id
                   $whereClause";

    $countStmt = $db->prepare($countQuery);
    foreach ($params as $key => $value) {
        $countStmt->bindParam($key, $value);
    }
    $countStmt->execute();
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $totalRecords = $countResult['total'];

    // Get jobs with pagination
    $query = "SELECT cj.id, cj.request_number, cj.job_type, cj.request_date, cj.remarks,
                     cj.created_by, cj.created_at,
                     cc.id as customer_id, cc.customer_name, cc.address, cc.state, cc.email, cc.phone
              FROM calibration_jobs cj
              LEFT JOIN calibration_customers cc ON cj.customer_id = cc.id
              $whereClause
              ORDER BY cj.created_at DESC
              LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

    foreach ($params as $key => $value) {
        if ($key === ':search') {
            $stmt->bindParam($key, $value, PDO::PARAM_STR);
        } elseif ($key === ':job_type') {
            $stmt->bindParam($key, $value, PDO::PARAM_STR);
        } elseif ($key === ':customer_id') {
            $stmt->bindParam($key, $value, PDO::PARAM_INT);
        } elseif ($key === ':date_from') {
            $stmt->bindParam($key, $value, PDO::PARAM_STR);
        } elseif ($key === ':date_to') {
            $stmt->bindParam($key, $value, PDO::PARAM_STR);
        }
    }

    $stmt->execute();
    $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format jobs with customer data
    $formattedJobs = [];
    foreach ($jobs as $job) {
        $formattedJobs[] = [
            'id' => $job['id'],
            'request_number' => $job['request_number'],
            'job_type' => $job['job_type'],
            'request_date' => $job['request_date'],
            'remarks' => $job['remarks'],
            'created_by' => $job['created_by'],
            'created_at' => $job['created_at'],
            'customer' => [
                'id' => $job['customer_id'],
                'customer_name' => $job['customer_name'],
                'address' => $job['address'],
                'state' => $job['state'],
                'email' => $job['email'],
                'phone' => $job['phone']
            ]
        ];
    }

    // Calculate pagination info
    $totalPages = ceil($totalRecords / $limit);

    echo json_encode([
        'success' => true,
        'data' => [
            'jobs' => $formattedJobs,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_records' => $totalRecords,
                'per_page' => $limit
            ]
        ]
    ]);

} catch (Exception $e) {
    error_log("Error in calibration jobs list: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
