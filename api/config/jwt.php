<?php
require_once __DIR__ . '/../../vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHandler {
    private $secret_key = "your-secret-key-change-this-in-production";
    private $issuer = "service-reports-app";
    private $audience = "service-reports-users";
    private $issued_at;
    private $expiration_time;

    public function __construct() {
        $this->issued_at = time();
        $this->expiration_time = $this->issued_at + (24 * 60 * 60); // 24 hours
    }

    public function generateToken($user_data) {
        $payload = array(
            "iss" => $this->issuer,
            "aud" => $this->audience,
            "iat" => $this->issued_at,
            "exp" => $this->expiration_time,
            "data" => $user_data
        );

        return JWT::encode($payload, $this->secret_key, 'HS256');
    }

    public function validateToken($token) {
        try {
            // Check if token is null or empty
            if (!$token || empty(trim($token))) {
                return false;
            }

            $decoded = JWT::decode($token, new Key($this->secret_key, 'HS256'));
            $userData = (array) $decoded->data;
            
            // Ensure required fields exist
            if (!isset($userData['id']) || !isset($userData['role'])) {
                return false;
            }
            
            return $userData;
        } catch (Exception $e) {
            return false;
        }
    }

    public function getTokenFromHeader() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            return null;
        }

        $auth_header = $headers['Authorization'];
        if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
?>