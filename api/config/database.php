<?php
// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/error.log');

// Ensure logs directory exists
if (!is_dir(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0777, true);
}

class Database {
    private $host = 'localhost';
    private $db_name = 'u673588969_ast';
    private $username = 'u673588969_ast';
    private $password = 'Arabscale@1';
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password,
                array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
            );
            // Set charset for proper UTF-8 support
            $this->conn->exec("SET NAMES utf8");
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            error_log("Connection details - Host: {$this->host}, DB: {$this->db_name}, User: {$this->username}");
            echo "Connection error: " . $exception->getMessage();
        }

        return $this->conn;
    }
}

// For Hostinger deployment, update the above credentials:
// private $host = 'localhost';
// private $db_name = 'your_database_name';
// private $username = 'your_database_username';
// private $password = 'your_database_password';
?>