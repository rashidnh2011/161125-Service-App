<?php
require_once '../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Customer ID is required']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Check if customer exists
    $checkQuery = "SELECT id FROM calibration_customers WHERE id = :id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
    $checkStmt->execute();
    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Customer not found']);
        exit;
    }

    // Check if customer name is being updated and already exists
    if (isset($input['customer_name'])) {
        $nameCheckQuery = "SELECT id FROM calibration_customers WHERE customer_name = :customer_name AND id != :id";
        $nameCheckStmt = $db->prepare($nameCheckQuery);
        $nameCheckStmt->bindParam(':customer_name', $input['customer_name'], PDO::PARAM_STR);
        $nameCheckStmt->bindParam(':id', $input['id'], PDO::PARAM_INT);
        $nameCheckStmt->execute();
        if ($nameCheckStmt->rowCount() > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Customer with this name already exists']);
            exit;
        }
    }

    // Build update query dynamically
    $updateFields = [];
    $params = [];

    if (isset($input['customer_name'])) {
        $updateFields[] = 'customer_name = :customer_name';
        $params[':customer_name'] = $input['customer_name'];
    }

    if (isset($input['address'])) {
        $updateFields[] = 'address = :address';
        $params[':address'] = $input['address'];
    }

    if (isset($input['state'])) {
        $updateFields[] = 'state = :state';
        $params[':state'] = $input['state'];
    }

    if (isset($input['email'])) {
        $updateFields[] = 'email = :email';
        $params[':email'] = $input['email'];
    }

    if (isset($input['phone'])) {
        $updateFields[] = 'phone = :phone';
        $params[':phone'] = $input['phone'];
    }

    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        exit;
    }

    // Add ID parameter
    $params[':id'] = $input['id'];

    $query = "UPDATE calibration_customers SET " . implode(', ', $updateFields) . " WHERE id = :id";
    $stmt = $db->prepare($query);

    // Bind parameters using variables
    foreach ($params as $key => $value) {
        if ($key === ':customer_name' || $key === ':address' || $key === ':state' || $key === ':email' || $key === ':phone') {
            $stmt->bindParam($key, $params[$key], PDO::PARAM_STR);
        } elseif ($key === ':id') {
            $stmt->bindParam($key, $params[$key], PDO::PARAM_INT);
        }
    }

    if ($stmt->execute()) {
        // Get the updated customer
        $getQuery = "SELECT id, customer_name, address, state, email, phone, created_at
                     FROM calibration_customers WHERE id = :id";
        $getStmt = $db->prepare($getQuery);

        // Assign to variable first
        $customerId = $input['id'];
        $getStmt->bindParam(':id', $customerId, PDO::PARAM_INT);
        $getStmt->execute();
        $customer = $getStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $customer,
            'message' => 'Customer updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to update customer'
        ]);
    }

} catch (Exception $e) {
    error_log("Error in calibration customer update: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error'
    ]);
}
?>
