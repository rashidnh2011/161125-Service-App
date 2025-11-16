<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../config/database.php';

class ReminderSettingsAPI {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];

        switch ($method) {
            case 'GET':
                $this->getReminderSettings();
                break;
            case 'POST':
                $this->createReminderSettings();
                break;
            case 'PUT':
                $this->updateReminderSettings();
                break;
            case 'DELETE':
                $this->deleteReminderSettings();
                break;
            default:
                $this->returnError('Method not allowed', 405);
        }
    }

    private function getReminderSettings() {
        try {
            $customer = isset($_GET['customer']) ? $_GET['customer'] : '';

            $query = "SELECT * FROM calibration_reminder_settings WHERE 1=1";
            $params = [];

            if (!empty($customer)) {
                $query .= " AND customer_name = ?";
                $params[] = $customer;
            }

            $query .= " ORDER BY customer_name";

            $stmt = $this->conn->prepare($query);
            if (!empty($params)) {
                $stmt->execute($params);
            } else {
                $stmt->execute();
            }

            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields for frontend
            foreach ($settings as &$setting) {
                $setting['email_recipients'] = json_decode($setting['email_recipients'], true) ?? [];
            }

            $this->returnSuccess(['settings' => $settings]);
        } catch (Exception $e) {
            $this->returnError('Failed to fetch reminder settings: ' . $e->getMessage());
        }
    }

    private function createReminderSettings() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data || !isset($data['customer_name']) || !isset($data['reminder_days'])) {
                $this->returnError('Missing required fields: customer_name, reminder_days');
            }

            $customer_name = trim($data['customer_name']);
            $reminder_days = trim($data['reminder_days']);
            $is_enabled = isset($data['is_enabled']) ? (int)$data['is_enabled'] : 1;
            $email_recipients = isset($data['email_recipients']) ? json_encode($data['email_recipients']) : '[]';

            // Check if settings already exist for this customer
            $check_stmt = $this->conn->prepare("SELECT id FROM calibration_reminder_settings WHERE customer_name = ?");
            $check_stmt->execute([$customer_name]);
            $check_result = $check_stmt->fetch(PDO::FETCH_ASSOC);

            if ($check_result) {
                $this->returnError('Settings already exist for this customer. Use PUT to update.');
            }

            $stmt = $this->conn->prepare("
                INSERT INTO calibration_reminder_settings
                (customer_name, reminder_days, is_enabled, email_recipients)
                VALUES (?, ?, ?, ?)
            ");

            $stmt->execute([$customer_name, $reminder_days, $is_enabled, $email_recipients]);

            $this->returnSuccess([
                'message' => 'Reminder settings created successfully',
                'id' => $this->conn->lastInsertId()
            ]);

        } catch (Exception $e) {
            $this->returnError('Failed to create reminder settings: ' . $e->getMessage());
        }
    }

    private function updateReminderSettings() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data || !isset($data['customer_name'])) {
                $this->returnError('Missing required field: customer_name');
            }

            $customer_name = trim($data['customer_name']);
            $reminder_days = isset($data['reminder_days']) ? trim($data['reminder_days']) : '';
            $is_enabled = isset($data['is_enabled']) ? (int)$data['is_enabled'] : 1;
            $email_recipients = isset($data['email_recipients']) ? json_encode($data['email_recipients']) : '[]';

            $stmt = $this->conn->prepare("
                UPDATE calibration_reminder_settings
                SET reminder_days = ?, is_enabled = ?, email_recipients = ?, updated_at = NOW()
                WHERE customer_name = ?
            ");

            $stmt->execute([$reminder_days, $is_enabled, $email_recipients, $customer_name]);

            if ($stmt->rowCount() > 0) {
                $this->returnSuccess(['message' => 'Reminder settings updated successfully']);
            } else {
                $this->returnError('No settings found for this customer');
            }

        } catch (Exception $e) {
            $this->returnError('Failed to update reminder settings: ' . $e->getMessage());
        }
    }

    private function deleteReminderSettings() {
        try {
            $customer = isset($_GET['customer']) ? $_GET['customer'] : '';

            if (empty($customer)) {
                $this->returnError('Customer name is required');
            }

            $stmt = $this->conn->prepare("DELETE FROM calibration_reminder_settings WHERE customer_name = ?");
            $stmt->execute([$customer]);

            if ($stmt->rowCount() > 0) {
                $this->returnSuccess(['message' => 'Reminder settings deleted successfully']);
            } else {
                $this->returnError('No settings found for this customer');
            }

        } catch (Exception $e) {
            $this->returnError('Failed to delete reminder settings: ' . $e->getMessage());
        }
    }

    private function returnSuccess($data) {
        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function returnError($message, $code = 400) {
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => $message]);
    }
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$api = new ReminderSettingsAPI();
$api->handleRequest();
?>
