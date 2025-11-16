<?php
require_once '../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!$input || !isset($input['customer_name']) || empty(trim($input['customer_name']))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Customer name is required']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Check if customer with same name already exists
    $checkQuery = "SELECT id FROM calibration_customers WHERE customer_name = :customer_name";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':customer_name', $input['customer_name'], PDO::PARAM_STR);
    $checkStmt->execute();

    if ($checkStmt->rowCount() > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Customer with this name already exists']);
        exit;
    }

    // Insert new customer
    $query = "INSERT INTO calibration_customers (customer_name, address, state, email, phone)
              VALUES (:customer_name, :address, :state, :email, :phone)";

    $stmt = $db->prepare($query);

    // Assign values to variables first (bindParam requires variable references)
    $customerName = $input['customer_name'];
    $address = $input['address'] ?? '';
    $state = $input['state'] ?? '';
    $email = $input['email'] ?? '';
    $phone = $input['phone'] ?? '';

    $stmt->bindParam(':customer_name', $customerName, PDO::PARAM_STR);
    $stmt->bindParam(':address', $address, PDO::PARAM_STR);
    $stmt->bindParam(':state', $state, PDO::PARAM_STR);
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->bindParam(':phone', $phone, PDO::PARAM_STR);

    if ($stmt->execute()) {
        $customerId = $db->lastInsertId();

        // Get the created customer
        $getQuery = "SELECT id, customer_name, address, state, email, phone, created_at
                     FROM calibration_customers WHERE id = :id";
        $getStmt = $db->prepare($getQuery);
        $getStmt->bindParam(':id', $customerId, PDO::PARAM_INT);
        $getStmt->execute();
        $customer = $getStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $customer,
            'message' => 'Customer created successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to create customer'
        ]);
    }

} catch (Exception $e) {
    error_log("Error in calibration customer create: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
