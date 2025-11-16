#!/usr/bin/env php
<?php
/**
 * Quick Test Script for Reminder System Database Connection
 *
 * This script tests if the database connection works correctly
 * and if the reminder tables exist.
 *
 * Usage: php /path/to/test_db_connection.php
 */

require_once __DIR__ . '/../api/config/database.php';

echo "🧪 Testing Database Connection for Reminder System...\n\n";

try {
    // Test database connection
    $database = new Database();
    $conn = $database->getConnection();

    if ($conn) {
        echo "✅ Database connection successful!\n";

        // Test if reminder tables exist
        $tables = ['calibration_reminder_settings', 'calibration_reminder_logs'];

        foreach ($tables as $table) {
            $result = $conn->query("SHOW TABLES LIKE '$table'");
            if ($result->rowCount() > 0) {
                echo "✅ Table '$table' exists\n";
            } else {
                echo "❌ Table '$table' does not exist\n";
                echo "   Please run the reminder schema: database/schema/calibration_reminders.sql\n";
            }
        }

        // Test calibration_certificates table has reminder columns
        $columns_result = $conn->query("SHOW COLUMNS FROM calibration_certificates LIKE 'reminder_%'");
        if ($columns_result->rowCount() > 0) {
            echo "✅ Reminder columns added to calibration_certificates table\n";
        } else {
            echo "❌ Reminder columns not found in calibration_certificates table\n";
            echo "   Please run the reminder schema: database/schema/calibration_reminders.sql\n";
        }

        // Test API endpoints (basic connectivity test)
        echo "\n🌐 Testing API Endpoints:\n";

        $endpoints = [
            'settings' => 'http://localhost/api/calibration/reminders/settings.php',
            'logs' => 'http://localhost/api/calibration/reminders/logs.php',
            'process' => 'http://localhost/api/calibration/reminders/process.php'
        ];

        foreach ($endpoints as $name => $url) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
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
                    echo "✅ API '$name' endpoint accessible and returns valid JSON\n";
                } else {
                    echo "❌ API '$name' endpoint returns invalid JSON\n";
                }
            } else {
                echo "❌ API '$name' endpoint not accessible (HTTP $http_code)\n";
                echo "   Check if the API files exist and are in the correct location\n";
            }
        }

        echo "\n🎉 Database connection test completed!\n";
        echo "\n📋 Next Steps:\n";
        echo "1. If any tables are missing, run: database/schema/calibration_reminders.sql\n";
        echo "2. Configure email settings in the API files\n";
        echo "3. Set up cron job for daily processing\n";
        echo "4. Test the reminder system through the frontend\n";

    } else {
        echo "❌ Database connection failed!\n";
        echo "   Check your database credentials in api/config/database.php\n";
    }

} catch (Exception $e) {
    echo "❌ CRITICAL ERROR: " . $e->getMessage() . "\n";
    echo "   Check your database configuration and connection details\n";
}

echo "\n" . str_repeat('=', 60) . "\n";
?>
