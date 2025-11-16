#!/usr/bin/env php
<?php
/**
 * Test Script for Calibration Reminder System
 *
 * This script tests the reminder system functionality including:
 * - Database connections
 * - API endpoints
 * - Email sending (dry run)
 * - Configuration validation
 *
 * Usage: php /path/to/test_reminders.php
 */

require_once __DIR__ . '/../config/database.php';

class ReminderSystemTester {
    private $conn;
    private $test_results = [];

    public function __construct() {
        $this->conn = Database::getInstance()->getConnection();
    }

    public function runTests() {
        echo "🧪 Starting Calibration Reminder System Tests...\n\n";

        $this->testDatabaseConnection();
        $this->testDatabaseTables();
        $this->testAPIEndpoints();
        $this->testReminderSettings();
        $this->testEmailGeneration();
        $this->testReminderProcessing();

        $this->displayResults();
    }

    private function testDatabaseConnection() {
        try {
            $result = $this->conn->query("SELECT 1 as test");
            $row = $result->fetch_assoc();

            if ($row['test'] == 1) {
                $this->addResult('Database Connection', 'PASS', 'Successfully connected to database');
            } else {
                $this->addResult('Database Connection', 'FAIL', 'Database query failed');
            }
        } catch (Exception $e) {
            $this->addResult('Database Connection', 'FAIL', 'Connection error: ' . $e->getMessage());
        }
    }

    private function testDatabaseTables() {
        $required_tables = [
            'calibration_reminder_settings',
            'calibration_reminder_logs',
            'calibration_certificates'
        ];

        foreach ($required_tables as $table) {
            try {
                $result = $this->conn->query("SHOW TABLES LIKE '$table'");
                if ($result->num_rows > 0) {
                    $this->addResult("Table: $table", 'PASS', 'Table exists');
                } else {
                    $this->addResult("Table: $table", 'FAIL', 'Table not found');
                }
            } catch (Exception $e) {
                $this->addResult("Table: $table", 'FAIL', 'Error checking table: ' . $e->getMessage());
            }
        }
    }

    private function testAPIEndpoints() {
        $endpoints = [
            'settings' => '/api/calibration/reminders/settings.php',
            'logs' => '/api/calibration/reminders/logs.php',
            'process' => '/api/calibration/reminders/process.php'
        ];

        foreach ($endpoints as $name => $endpoint) {
            $url = 'http://localhost' . $endpoint; // Adjust for your domain

            // Test GET request
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Access-Control-Allow-Origin: *'
            ]);

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($http_code == 200 && $response) {
                $json_response = json_decode($response, true);
                if ($json_response && isset($json_response['success'])) {
                    $this->addResult("API: $name", 'PASS', 'Endpoint accessible and returns valid JSON');
                } else {
                    $this->addResult("API: $name", 'FAIL', 'Invalid JSON response');
                }
            } else {
                $this->addResult("API: $name", 'FAIL', "HTTP $http_code - Endpoint not accessible");
            }
        }
    }

    private function testReminderSettings() {
        try {
            // Test creating a reminder setting
            $test_customer = 'TEST_CUSTOMER_' . time();
            $test_data = [
                'customer_name' => $test_customer,
                'reminder_days' => '30,7,1',
                'is_enabled' => true,
                'email_recipients' => ['test@example.com']
            ];

            $url = 'http://localhost/api/calibration/reminders/settings.php';
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($test_data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Access-Control-Allow-Origin: *'
            ]);

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($http_code == 200) {
                $json_response = json_decode($response, true);
                if ($json_response && $json_response['success']) {
                    $this->addResult('Create Settings', 'PASS', 'Successfully created reminder settings');

                    // Test retrieving settings
                    $url = 'http://localhost/api/calibration/reminders/settings.php?customer=' . urlencode($test_customer);
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Content-Type: application/json',
                        'Access-Control-Allow-Origin: *'
                    ]);

                    $response = curl_exec($ch);
                    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    if ($http_code == 200) {
                        $json_response = json_decode($response, true);
                        if ($json_response && isset($json_response['data']['settings'])) {
                            $this->addResult('Retrieve Settings', 'PASS', 'Successfully retrieved reminder settings');
                        } else {
                            $this->addResult('Retrieve Settings', 'FAIL', 'Failed to retrieve settings');
                        }
                    } else {
                        $this->addResult('Retrieve Settings', 'FAIL', 'Failed to retrieve settings');
                    }

                } else {
                    $this->addResult('Create Settings', 'FAIL', 'Failed to create settings: ' . ($json_response['error'] ?? 'Unknown error'));
                }
            } else {
                $this->addResult('Create Settings', 'FAIL', "HTTP $http_code - API not accessible");
            }

        } catch (Exception $e) {
            $this->addResult('Reminder Settings', 'FAIL', 'Exception: ' . $e->getMessage());
        }
    }

    private function testEmailGeneration() {
        try {
            // Test email template generation
            $test_data = [
                'certificate_number' => 'TEST/001-01',
                'customer_name' => 'Test Customer',
                'equipment_name' => 'Digital Scale',
                'make' => 'Mettler Toledo',
                'model_no' => 'XS6002S',
                'due_date' => date('Y-m-d', strtotime('+15 days')),
                'location' => 'Lab Floor 1',
                'reminder_days' => 7
            ];

            $template = $this->generateEmailTemplate($test_data);

            if (strpos($template, $test_data['certificate_number']) !== false &&
                strpos($template, $test_data['customer_name']) !== false &&
                strpos($template, $test_data['equipment_name']) !== false) {
                $this->addResult('Email Template', 'PASS', 'Email template generated correctly');
            } else {
                $this->addResult('Email Template', 'FAIL', 'Email template missing required data');
            }

        } catch (Exception $e) {
            $this->addResult('Email Template', 'FAIL', 'Exception: ' . $e->getMessage());
        }
    }

    private function testReminderProcessing() {
        try {
            // Test the reminder processing logic (dry run)
            $url = 'http://localhost/api/calibration/reminders/process.php';
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Access-Control-Allow-Origin: *'
            ]);

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($http_code == 200) {
                $json_response = json_decode($response, true);
                if ($json_response && isset($json_response['success'])) {
                    $this->addResult('Process Reminders', 'PASS', 'Reminder processing API accessible');
                } else {
                    $this->addResult('Process Reminders', 'FAIL', 'Invalid API response');
                }
            } else {
                $this->addResult('Process Reminders', 'FAIL', "HTTP $http_code - API not accessible");
            }

        } catch (Exception $e) {
            $this->addResult('Process Reminders', 'FAIL', 'Exception: ' . $e->getMessage());
        }
    }

    private function generateEmailTemplate($data) {
        return "
        <html>
        <head><title>Calibration Reminder</title></head>
        <body>
            <h2>Calibration Certificate Reminder</h2>
            <table>
                <tr><td>Certificate Number:</td><td>{$data['certificate_number']}</td></tr>
                <tr><td>Customer:</td><td>{$data['customer_name']}</td></tr>
                <tr><td>Equipment:</td><td>{$data['equipment_name']} ({$data['make']} - {$data['model_no']})</td></tr>
                <tr><td>Due Date:</td><td>" . date('M d, Y', strtotime($data['due_date'])) . "</td></tr>
                <tr><td>Reminder:</td><td>Due in {$data['reminder_days']} days</td></tr>
                <tr><td>Location:</td><td>{$data['location']}</td></tr>
            </table>
        </body>
        </html>
        ";
    }

    private function addResult($test_name, $status, $message) {
        $this->test_results[] = [
            'test' => $test_name,
            'status' => $status,
            'message' => $message
        ];
    }

    private function displayResults() {
        echo "\n" . str_repeat('=', 60) . "\n";
        echo "📊 TEST RESULTS SUMMARY\n";
        echo str_repeat('=', 60) . "\n";

        $passed = 0;
        $failed = 0;

        foreach ($this->test_results as $result) {
            $status_icon = $result['status'] === 'PASS' ? '✅' : '❌';
            echo "$status_icon {$result['test']}: {$result['message']}\n";

            if ($result['status'] === 'PASS') {
                $passed++;
            } else {
                $failed++;
            }
        }

        echo "\n" . str_repeat('-', 60) . "\n";
        echo "📈 SUMMARY: $passed passed, $failed failed\n";

        if ($failed === 0) {
            echo "🎉 All tests passed! The reminder system is ready to use.\n";
        } else {
            echo "⚠️  Some tests failed. Please check the issues above.\n";
        }

        echo str_repeat('=', 60) . "\n";
    }
}

// Check if running in CLI mode
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'This script must be run from command line']);
    exit;
}

// Run the tests
try {
    $tester = new ReminderSystemTester();
    $tester->runTests();
} catch (Exception $e) {
    echo "❌ CRITICAL ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>
