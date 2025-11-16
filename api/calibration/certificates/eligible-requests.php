<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../config/database.php';

class EligibleRequestsAPI {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];

        switch ($method) {
            case 'GET':
                $this->getEligibleRequests();
                break;
            default:
                $this->returnError('Method not allowed', 405);
        }
    }

    private function getEligibleRequests() {
        try {
            $customer_name = isset($_GET['customer_name']) ? $_GET['customer_name'] : '';

            // Get all job requests
            $jobs_query = "
                SELECT DISTINCT jr.request_number, jr.job_type, jr.request_date, jr.customer_id,
                       cc.customer_name, cc.email as customer_email
                FROM calibration_jobs jr
                LEFT JOIN calibration_customers cc ON jr.customer_id = cc.id
                WHERE 1=1
            ";

            $params = [];
            if (!empty($customer_name)) {
                $jobs_query .= " AND cc.customer_name = ?";
                $params[] = $customer_name;
            }

            $jobs_query .= " ORDER BY jr.request_date DESC";

            $jobs_stmt = $this->conn->prepare($jobs_query);
            if (!empty($params)) {
                $jobs_stmt->execute($params);
            } else {
                $jobs_stmt->execute();
            }
            $job_requests = $jobs_stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get all request numbers that already have certificates
            $certificates_query = "
                SELECT DISTINCT request_number
                FROM calibration_certificates
                WHERE request_number IS NOT NULL AND request_number != ''
            ";

            $cert_stmt = $this->conn->query($certificates_query);
            $certificates = $cert_stmt->fetchAll(PDO::FETCH_ASSOC);

            // Create a set of request numbers that already have certificates
            $used_request_numbers = [];
            foreach ($certificates as $cert) {
                $used_request_numbers[] = $cert['request_number'];
            }

            // Filter out request numbers that already have certificates
            $eligible_requests = [];
            foreach ($job_requests as $job) {
                if (!in_array($job['request_number'], $used_request_numbers)) {
                    $eligible_requests[] = [
                        'request_number' => $job['request_number'],
                        'job_type' => $job['job_type'],
                        'request_date' => $job['request_date'],
                        'customer_name' => $job['customer_name'],
                        'customer_email' => $job['customer_email']
                    ];
                }
            }

            $this->returnSuccess(['eligible_requests' => $eligible_requests]);

        } catch (Exception $e) {
            $this->returnError('Failed to fetch eligible requests: ' . $e->getMessage());
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

$api = new EligibleRequestsAPI();
$api->handleRequest();
?>
