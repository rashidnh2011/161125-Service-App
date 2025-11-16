<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../config/database.php';

class ReminderLogsAPI {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];

        switch ($method) {
            case 'GET':
                $this->getReminderLogs();
                break;
            case 'POST':
                $this->closeReminder();
                break;
            case 'PUT':
                $this->reopenReminder();
                break;
            default:
                $this->returnError('Method not allowed', 405);
        }
    }

    private function getReminderLogs() {
        try {
            // Filter parameters
            $certificate_number = isset($_GET['certificate_number']) ? $_GET['certificate_number'] : '';
            $customer_name = isset($_GET['customer_name']) ? $_GET['customer_name'] : '';
            $status = isset($_GET['status']) ? $_GET['status'] : '';
            $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : '';
            $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : '';
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

            $offset = ($page - 1) * $limit;

            // Build query
            $query = "
                SELECT
                    r.*,
                    c.equipment_name,
                    c.make,
                    c.model_no,
                    c.location
                FROM calibration_reminder_logs r
                LEFT JOIN calibration_certificates c ON r.certificate_number = c.certificate_number
                WHERE 1=1
            ";
            $count_query = "SELECT COUNT(*) as total FROM calibration_reminder_logs WHERE 1=1";
            $params = [];

            // Apply filters
            if (!empty($certificate_number)) {
                $query .= " AND r.certificate_number LIKE ?";
                $count_query .= " AND certificate_number LIKE ?";
                $params[] = "%$certificate_number%";
            }

            if (!empty($customer_name)) {
                $query .= " AND r.customer_name LIKE ?";
                $count_query .= " AND customer_name LIKE ?";
                $params[] = "%$customer_name%";
            }

            if (!empty($status)) {
                $query .= " AND r.status = ?";
                $count_query .= " AND status = ?";
                $params[] = $status;
            }

            if (!empty($date_from)) {
                $query .= " AND DATE(r.sent_date) >= ?";
                $count_query .= " AND DATE(sent_date) >= ?";
                $params[] = $date_from;
            }

            if (!empty($date_to)) {
                $query .= " AND DATE(r.sent_date) <= ?";
                $count_query .= " AND DATE(sent_date) <= ?";
                $params[] = $date_to;
            }

            $query .= " ORDER BY r.sent_date DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            // Get total count
            $count_stmt = $this->conn->prepare($count_query);
            $count_params = array_slice($params, 0, -2); // Remove limit and offset
            if (!empty($count_params)) {
                $count_stmt->execute($count_params);
                $total_result = $count_stmt->fetch(PDO::FETCH_ASSOC);
                $total_records = $total_result['total'];
            } else {
                $count_stmt->execute();
                $total_result = $count_stmt->fetch(PDO::FETCH_ASSOC);
                $total_records = $total_result['total'];
            }

            // Get paginated results
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $logs = [];
            foreach ($result as $row) {
                // Parse JSON fields
                $row['recipient_emails'] = json_decode($row['recipient_emails'], true) ?? [];
                $logs[] = $row;
            }

            $this->returnSuccess([
                'logs' => $logs,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total_records' => $total_records,
                    'total_pages' => ceil($total_records / $limit)
                ]
            ]);

        } catch (Exception $e) {
            $this->returnError('Failed to fetch reminder logs: ' . $e->getMessage());
        }
    }

    private function closeReminder() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data || !isset($data['certificate_number'])) {
                $this->returnError('Missing required field: certificate_number');
            }

            $certificate_number = trim($data['certificate_number']);
            $closed_by = isset($data['closed_by']) ? $data['closed_by'] : 'system';

            // Update certificate status
            $update_stmt = $this->conn->prepare("
                UPDATE calibration_certificates
                SET reminder_status = 'closed',
                    reminder_closed_date = NOW(),
                    reminder_closed_by = ?
                WHERE certificate_number = ?
            ");
            $update_stmt->execute([$closed_by, $certificate_number]);

            // Log the manual close action
            $log_stmt = $this->conn->prepare("
                INSERT INTO calibration_reminder_logs
                (certificate_number, customer_name, reminder_type, status, is_manual_close, closed_date, closed_by, created_at)
                SELECT
                    certificate_number,
                    customer_name,
                    'email',
                    'closed',
                    1,
                    NOW(),
                    ?,
                    NOW()
                FROM calibration_certificates
                WHERE certificate_number = ?
            ");
            $log_stmt->execute([$closed_by, $certificate_number]);

            $this->returnSuccess(['message' => 'Reminder closed successfully']);

        } catch (Exception $e) {
            $this->returnError('Failed to close reminder: ' . $e->getMessage());
        }
    }

    private function reopenReminder() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data || !isset($data['certificate_number'])) {
                $this->returnError('Missing required field: certificate_number');
            }

            $certificate_number = trim($data['certificate_number']);
            $reopened_by = isset($data['reopened_by']) ? $data['reopened_by'] : 'system';

            // Update certificate status
            $stmt = $this->conn->prepare("
                UPDATE calibration_certificates
                SET reminder_status = 'active',
                    reminder_closed_date = NULL,
                    reminder_closed_by = NULL
                WHERE certificate_number = ?
            ");
            $stmt->execute([$certificate_number]);

            $this->returnSuccess(['message' => 'Reminder reopened successfully']);

        } catch (Exception $e) {
            $this->returnError('Failed to reopen reminder: ' . $e->getMessage());
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

$api = new ReminderLogsAPI();
$api->handleRequest();
?>
