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

    // Get search and pagination parameters
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    // Build query
    $whereClause = '';
    $params = [];

    if (!empty($search)) {
        $whereClause = "WHERE customer_name LIKE :search OR email LIKE :search OR phone LIKE :search";
        $params[':search'] = "%$search%";
    }

    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM calibration_customers $whereClause";
    $countStmt = $db->prepare($countQuery);
    $countStmt->execute($params);
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $totalRecords = $countResult['total'];

    // Get customers with pagination
    $query = "SELECT id, customer_name, address, state, email, phone, created_at
              FROM calibration_customers
              $whereClause
              ORDER BY created_at DESC
              LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

    if (!empty($params)) {
        $stmt->bindParam(':search', $params[':search'], PDO::PARAM_STR);
    }

    $stmt->execute();
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate pagination info
    $totalPages = ceil($totalRecords / $limit);

    echo json_encode([
        'success' => true,
        'data' => [
            'customers' => $customers,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_records' => $totalRecords,
                'per_page' => $limit
            ]
        ]
    ]);

} catch (Exception $e) {
    error_log("Error in calibration customers list: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
