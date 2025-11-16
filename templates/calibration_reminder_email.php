/**
 * Professional Email Template for Calibration Reminders
 *
 * This template can be customized with your company branding.
 * Placeholders: {CustomerName}, {EquipmentName}, {CertificateNumber}, {DueDate}, {Location}, {ReminderDays}
 */

function generateCalibrationReminderEmail($data) {
    $company_logo = 'https://yourcompany.com/logo.png'; // Replace with your logo URL
    $company_name = 'Your Calibration Company'; // Replace with your company name
    $company_website = 'https://yourcompany.com'; // Replace with your website
    $contact_email = 'calibration@yourcompany.com'; // Replace with your contact email
    $contact_phone = '+1-234-567-8900'; // Replace with your phone number

    $template = '
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Calibration Certificate Renewal Reminder</title>
        <style>
            body {
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333333;
                max-width: 600px;
                margin: 0 auto;
                background-color: #f8f9fa;
            }
            .email-container {
                background-color: #ffffff;
                margin: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
            }
            .content {
                padding: 30px;
            }
            .certificate-info {
                background-color: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 15px 0;
            }
            .info-item {
                display: flex;
                flex-direction: column;
            }
            .info-label {
                font-weight: 600;
                color: #495057;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .info-value {
                color: #212529;
                font-size: 14px;
            }
            .reminder-badge {
                display: inline-block;
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 15px 0;
            }
            .cta-section {
                text-align: center;
                margin: 30px 0;
                padding: 20px;
                background-color: #e3f2fd;
                border-radius: 8px;
                border-left: 4px solid #2196f3;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: 600;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-top: 1px solid #e9ecef;
                font-size: 12px;
                color: #6c757d;
            }
            .footer-logo {
                margin-bottom: 10px;
            }
            .footer-logo img {
                height: 30px;
                opacity: 0.7;
            }
            .equipment-highlight {
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-weight: 600;
            }
            @media (max-width: 600px) {
                .info-grid {
                    grid-template-columns: 1fr;
                }
                .content {
                    padding: 20px;
                }
                .header {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🔧 Calibration Certificate Renewal</h1>
                <p>Important reminder for equipment calibration</p>
            </div>

            <div class="content">
                <div class="reminder-badge">
                    Due in {ReminderDays} Days
                </div>

                <p>Dear {CustomerName},</p>

                <p>This is a friendly reminder that the calibration certificate for your equipment is approaching its renewal date. To ensure continued accuracy and compliance with industry standards, please schedule your calibration renewal.</p>

                <div class="certificate-info">
                    <h3 style="margin-top: 0; color: #495057;">📋 Certificate Details</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Certificate Number</span>
                            <span class="info-value">{CertificateNumber}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Due Date</span>
                            <span class="info-value">' . date('M d, Y', strtotime($data['DueDate'])) . '</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Equipment</span>
                            <span class="info-value equipment-highlight">{EquipmentName}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Make & Model</span>
                            <span class="info-value">{Make} - {ModelNo}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Location</span>
                            <span class="info-value">{Location}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Reminder Type</span>
                            <span class="info-value">{ReminderDays} days before due</span>
                        </div>
                    </div>
                </div>

                <div class="cta-section">
                    <h3 style="margin: 0 0 15px 0; color: #1976d2;">Ready to Schedule Your Calibration?</h3>
                    <p style="margin: 0 0 20px 0;">Contact us today to book your calibration appointment and maintain your equipment accuracy.</p>
                    <a href="mailto:' . $contact_email . '?subject=Calibration Renewal - {CertificateNumber}" class="cta-button">
                        📞 Schedule Calibration
                    </a>
                </div>

                <p><strong>Why Regular Calibration Matters:</strong></p>
                <ul>
                    <li>Ensures measurement accuracy and reliability</li>
                    <li>Maintains compliance with industry standards</li>
                    <li>Prevents costly errors and rework</li>
                    <li>Extends equipment lifespan</li>
                    <li>Provides peace of mind for quality assurance</li>
                </ul>

                <p>If you have any questions or need assistance scheduling your calibration, please don\'t hesitate to contact our team.</p>
            </div>

            <div class="footer">
                <div class="footer-logo">
                    <img src="' . $company_logo . '" alt="' . $company_name . ' Logo">
                </div>
                <p><strong>' . $company_name . '</strong></p>
                <p>
                    Website: <a href="' . $company_website . '" style="color: #667eea;">' . $company_website . '</a> |
                    Email: <a href="mailto:' . $contact_email . '" style="color: #667eea;">' . $contact_email . '</a> |
                    Phone: ' . $contact_phone . '
                </p>
                <p style="margin-top: 15px; font-size: 11px; opacity: 0.8;">
                    This is an automated reminder from our Calibration Management System.<br>
                    Please add ' . $contact_email . ' to your safe senders list to ensure you receive future notifications.
                </p>
            </div>
        </div>
    </body>
    </html>';

    // Replace placeholders with actual data
    foreach ($data as $key => $value) {
        $placeholder = '{' . $key . '}';
        $template = str_replace($placeholder, htmlspecialchars($value), $template);
    }

    return $template;
}

/**
 * Plain text version for email clients that don't support HTML
 */
function generateCalibrationReminderEmailText($data) {
    $text = "
CALIBRATION CERTIFICATE RENEWAL REMINDER

Dear {$data['CustomerName']},

This is a reminder that your calibration certificate is due for renewal.

CERTIFICATE DETAILS:
Certificate Number: {$data['CertificateNumber']}
Equipment: {$data['EquipmentName']} ({$data['Make']} - {$data['ModelNo']})
Due Date: " . date('M d, Y', strtotime($data['DueDate'])) . "
Location: {$data['Location']}
Reminder: Due in {$data['ReminderDays']} days

WHY CALIBRATION MATTERS:
- Ensures measurement accuracy and reliability
- Maintains compliance with industry standards
- Prevents costly errors and rework
- Extends equipment lifespan

CONTACT INFORMATION:
Company: " . $company_name . "
Email: " . $contact_email . "
Phone: " . $contact_phone . "
Website: " . $company_website . "

Please contact us to schedule your calibration renewal.

This is an automated reminder from our Calibration Management System.
    ";

    return $text;
}
