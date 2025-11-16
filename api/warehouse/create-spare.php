<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../config/jwt.php';

$database = new Database();
$db = $database->getConnection();
$jwt_handler = new JWTHandler();

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Get JWT token from header
$token = $jwt_handler->getTokenFromHeader();
$user_data = $jwt_handler->validateToken($token);

// Check if user is authorized (only admin and storekeeper can create spares)
if (!$user_data || !in_array($user_data['role'], ['admin', 'storekeeper'])) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

// Handle POST request to create a new spare
if ($method === 'POST') {
    try {
        // Get JSON input
        $data = json_decode(file_get_contents("php://input"));
        
        // Validate required fields
        $required_fields = ['name', 'part_number', 'price', 'description', 'minimum_stock_level'];
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (empty($data->$field) && $data->$field !== '0' && $data->$field !== 0) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false, 
                "error" => "Missing required fields: " . implode(', ', $missing_fields)
            ));
            exit();
        }
        
        // Sanitize input
        $name = htmlspecialchars(strip_tags($data->name));
        $part_number = htmlspecialchars(strip_tags($data->part_number));
        $description = !empty($data->description) ? htmlspecialchars(strip_tags($data->description)) : null;
        $price = floatval($data->price);
        $minimum_stock_level = intval($data->minimum_stock_level);
        
        // Validate price and minimum stock level
        if ($price < 0) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Price cannot be negative"));
            exit();
        }
        
        if ($minimum_stock_level < 0) {
            http_response_code(400);
            echo json_encode(array("success" => false, "error" => "Minimum stock level cannot be negative"));
            exit();
        }
        
        // Start transaction
        $db->beginTransaction();
        
        try {
            // Insert into spares table
            $query = "INSERT INTO spares 
                     (name, part_number, description, price, minimum_stock_level, created_by, updated_by) 
                     VALUES 
                     (:name, :part_number, :description, :price, :minimum_stock_level, :user_id, :user_id)";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(":name", $name);
            $stmt->bindParam(":part_number", $part_number);
            $stmt->bindParam(":description", $description);
            $stmt->bindParam(":price", $price);
            $stmt->bindParam(":minimum_stock_level", $minimum_stock_level, PDO::PARAM_INT);
            $stmt->bindParam(":user_id", $user_data['id'], PDO::PARAM_INT);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to create spare");
            }
            
            $spare_id = $db->lastInsertId();
            
            // Create initial stock entry with zero quantities
            $stock_query = "INSERT INTO warehouse_stock 
                           (spare_id, total_quantity, available_quantity, issued_quantity, 
                            consumed_quantity, returned_quantity, minimum_stock_level)
                           VALUES 
                           (:spare_id, 0, 0, 0, 0, 0, :minimum_stock_level)";
            
            $stmt = $db->prepare($stock_query);
            $stmt->bindParam(":spare_id", $spare_id, PDO::PARAM_INT);
            $stmt->bindParam(":minimum_stock_level", $minimum_stock_level, PDO::PARAM_INT);
            
            if (!$stmt->execute()) {
                throw new Exception("Failed to initialize stock for the new spare");
            }
            
            // Commit transaction
            $db->commit();
            
            // Get the created spare with its stock information
            $query = "SELECT s.*, 
                     COALESCE(ws.total_quantity, 0) as total_quantity,
                     COALESCE(ws.available_quantity, 0) as available_quantity,
                     COALESCE(ws.issued_quantity, 0) as issued_quantity,
                     COALESCE(ws.consumed_quantity, 0) as consumed_quantity,
                     COALESCE(ws.returned_quantity, 0) as returned_quantity,
                     COALESCE(ws.minimum_stock_level, s.minimum_stock_level) as minimum_stock_level
                     FROM spares s
                     LEFT JOIN warehouse_stock ws ON s.id = ws.spare_id
                     WHERE s.id = :spare_id";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(":spare_id", $spare_id, PDO::PARAM_INT);
            $stmt->execute();
            
            $created_spare = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Format the response
            $response = array(
                "success" => true,
                "message" => "Spare created successfully",
                "data" => array(
                    "id" => (int)$created_spare['id'],
                    "name" => $created_spare['name'],
                    "part_number" => $created_spare['part_number'],
                    "description" => $created_spare['description'],
                    "price" => (float)$created_spare['price'],
                    "stock_qty" => (int)$created_spare['total_quantity'],
                    "minimum_stock_level" => (int)$created_spare['minimum_stock_level'],
                    "warehouse_stock" => array(
                        "id" => (int)$created_spare['id'],
                        "spare_id" => (int)$created_spare['id'],
                        "total_quantity" => (int)$created_spare['total_quantity'],
                        "available_quantity" => (int)$created_spare['available_quantity'],
                        "issued_quantity" => (int)$created_spare['issued_quantity'],
                        "consumed_quantity" => (int)$created_spare['consumed_quantity'],
                        "returned_quantity" => (int)$created_spare['returned_quantity'],
                        "minimum_stock_level" => (int)$created_spare['minimum_stock_level']
                    )
                )
            );
            
            http_response_code(201);
            echo json_encode($response);
            
        } catch (Exception $e) {
            // Rollback transaction on error
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            "success" => false, 
            "error" => "Failed to create spare: " . $e->getMessage()
        ));
    }
} else {
    // Method not allowed
    http_response_code(405);
    echo json_encode(array("success" => false, "error" => "Method not allowed"));
}
?>
