<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../config/jwt.php';

$jwt_handler = new JWTHandler();
$token = $jwt_handler->getTokenFromHeader();

if (!$token || !$jwt_handler->validateToken($token)) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    http_response_code(405);
    echo json_encode(array("success" => false, "error" => "Method not allowed"));
    exit();
}

if (!isset($_FILES['image'])) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "No image uploaded"));
    exit();
}

$upload_dir = '../uploads/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$file = $_FILES['image'];
$allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
$max_size = 5 * 1024 * 1024; // 5MB

// Validate file type
if (!in_array($file['type'], $allowed_types)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Invalid file type"));
    exit();
}

// Validate file size
if ($file['size'] > $max_size) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "File too large"));
    exit();
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = uniqid() . '_' . time() . '.' . $extension;
$filepath = $upload_dir . $filename;

try {
    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        echo json_encode(array("success" => true, "filename" => $filename));
    } else {
        throw new Exception("Failed to move uploaded file");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to upload image"));
}
?>