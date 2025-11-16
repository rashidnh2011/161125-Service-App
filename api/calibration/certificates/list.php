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
    // Get query parameters
    $certificateNumber = $_GET['certificate_number'] ?? '';
    $requestNumber = $_GET['request_number'] ?? '';
    $serialNo = $_GET['serial_no'] ?? '';
    $customerName = $_GET['customer_name'] ?? '';
    $page = (int)($_GET['page'] ?? 1);
    $limit = (int)($_GET['limit'] ?? 10);

    // Validate pagination
    $page = max(1, $page);
    $limit = max(1, min(100, $limit)); // Max 100 per page
    $offset = ($page - 1) * $limit;

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit;
    }

    // Build WHERE clause
    $whereConditions = [];
    $params = [];

    if (!empty($certificateNumber)) {
        $whereConditions[] = 'certificate_number LIKE :certificate_number';
        $params[':certificate_number'] = '%' . $certificateNumber . '%';
    }

    if (!empty($requestNumber)) {
        $whereConditions[] = 'request_number LIKE :request_number';
        $params[':request_number'] = '%' . $requestNumber . '%';
    }

    if (!empty($serialNo)) {
        $whereConditions[] = 'serial_no LIKE :serial_no';
        $params[':serial_no'] = '%' . $serialNo . '%';
    }

    if (!empty($customerName)) {
        $whereConditions[] = 'customer_name LIKE :customer_name';
        $params[':customer_name'] = '%' . $customerName . '%';
    }

    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM calibration_certificates $whereClause";
    $countStmt = $db->prepare($countQuery);

    if (!empty($params)) {
        foreach ($params as $key => $value) {
            $countStmt->bindParam($key, $params[$key], is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
    }

    $countStmt->execute();
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $totalRecords = $countResult['total'];

    // Calculate pagination
    $totalPages = ceil($totalRecords / $limit);

    // Get certificates with pagination
    $query = "SELECT * FROM calibration_certificates $whereClause
              ORDER BY created_at DESC
              LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($query);

    // Bind pagination parameters
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

    // Bind search parameters
    if (!empty($params)) {
        foreach ($params as $key => $value) {
            $stmt->bindParam($key, $params[$key], is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
    }

    $stmt->execute();
    $certificates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'certificates' => $certificates,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_records' => $totalRecords,
                'per_page' => $limit
            ]
        ]
    ]);

} catch (Exception $e) {
    error_log("Error in certificates list: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
