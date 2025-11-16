# 🔧 Automated Calibration Certificate Reminder System

## Overview

The Calibration Management System now includes a comprehensive **Automated Reminder Email System** that automatically sends email notifications to customers before their calibration certificates are due for renewal. This system helps ensure timely calibration renewals and improves customer satisfaction.

## ✨ Features Implemented

### 🎯 **Core Functionality**

#### 1️⃣ **Reminder Configuration (Frontend)**
- ✅ **Configurable reminder timing**: Set multiple reminder days (e.g., 30, 7, 1 days before due date)
- ✅ **Per-customer settings**: Configure reminders for specific customers or use global settings
- ✅ **Enable/disable controls**: Turn reminders on/off per customer
- ✅ **Email recipient management**: Add multiple email addresses for notifications
- ✅ **Real-time validation**: Immediate feedback on configuration changes

#### 2️⃣ **Automated Reminder Logic**
- ✅ **Daily scanning**: Automated system scans all certificates daily
- ✅ **Due date monitoring**: Checks certificates approaching due dates
- ✅ **Multi-tier reminders**: Send reminders at different intervals (30, 7, 1 days)
- ✅ **Smart filtering**: Only sends reminders for active certificates
- ✅ **Duplicate prevention**: Won't send duplicate reminders on the same day

#### 3️⃣ **Email Notifications**
- ✅ **Professional email templates**: HTML emails with company branding
- ✅ **Dynamic content**: Personalized emails with customer and equipment details
- ✅ **Multiple recipients**: Send to customers and internal staff
- ✅ **Delivery tracking**: Track sent/failed email status
- ✅ **Error handling**: Logs and handles email delivery failures

#### 4️⃣ **Reminder Logs & Tracking**
- ✅ **Comprehensive logging**: Track every reminder sent with full details
- ✅ **Searchable logs**: Filter logs by certificate, customer, date, status
- ✅ **Delivery status**: Monitor sent/failed/pending status
- ✅ **Reminder counts**: Track how many reminders sent per certificate
- ✅ **Manual controls**: Close or reopen reminders manually

#### 5️⃣ **Manual Control System**
- ✅ **Close reminders**: Manually stop reminders for completed calibrations
- ✅ **Reopen reminders**: Reactivate reminders if needed
- ✅ **Status management**: Visual indicators for reminder status
- ✅ **Audit trail**: Track who closed/reopened reminders and when

## 🗄️ **Database Schema**

### **New Tables Created**

#### **calibration_reminder_settings**
```sql
CREATE TABLE calibration_reminder_settings (
  id int(11) NOT NULL AUTO_INCREMENT,
  customer_name varchar(255) NOT NULL,
  reminder_days varchar(100) NOT NULL,
  is_enabled tinyint(1) DEFAULT 1,
  email_recipients text,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customer_name (customer_name),
  KEY idx_is_enabled (is_enabled)
);
```

#### **calibration_reminder_logs**
```sql
CREATE TABLE calibration_reminder_logs (
  id int(11) NOT NULL AUTO_INCREMENT,
  certificate_id int(11) NOT NULL,
  certificate_number varchar(100) NOT NULL,
  customer_name varchar(255) NOT NULL,
  customer_email varchar(255),
  reminder_type enum('email','sms') DEFAULT 'email',
  reminder_days int(11) NOT NULL,
  due_date date NOT NULL,
  sent_date timestamp NOT NULL,
  status enum('sent','failed','pending') DEFAULT 'pending',
  error_message text,
  email_content text,
  recipient_emails text,
  is_manual_close tinyint(1) DEFAULT 0,
  closed_date timestamp NULL,
  closed_by varchar(100),
  reminder_count int(11) DEFAULT 1,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_certificate_number (certificate_number),
  KEY idx_sent_date (sent_date),
  KEY idx_status (status)
);
```

### **Enhanced calibration_certificates Table**
```sql
ALTER TABLE calibration_certificates
ADD COLUMN reminder_status enum('active','closed','disabled') DEFAULT 'active',
ADD COLUMN reminder_closed_date timestamp NULL,
ADD COLUMN reminder_closed_by varchar(100),
ADD COLUMN last_reminder_sent timestamp NULL,
ADD COLUMN total_reminders_sent int(11) DEFAULT 0;
```

## 🚀 **API Endpoints**

### **Reminder Settings Management**
- ✅ `GET /api/calibration/reminders/settings.php` - List reminder settings
- ✅ `POST /api/calibration/reminders/settings.php` - Create new settings
- ✅ `PUT /api/calibration/reminders/settings.php` - Update settings
- ✅ `DELETE /api/calibration/reminders/settings.php` - Delete settings

### **Reminder Logs & Control**
- ✅ `GET /api/calibration/reminders/logs.php` - View reminder logs with filtering
- ✅ `POST /api/calibration/reminders/logs.php` - Close reminders manually
- ✅ `PUT /api/calibration/reminders/logs.php` - Reopen reminders

### **Automated Processing**
- ✅ `POST /api/calibration/reminders/process.php` - Process reminders (for cron jobs)
- ✅ `GET /api/calibration/reminders/process.php` - Get dashboard statistics

## 🎨 **Frontend Components**

### **New React Components**
- ✅ **ReminderSettings.tsx** - Configure reminder timing and recipients
- ✅ **ReminderLogs.tsx** - View and manage reminder logs
- ✅ **ReminderDashboard.tsx** - Dashboard with statistics and quick actions

### **Enhanced Navigation**
- ✅ **Reminder System** tab in main dashboard
- ✅ **Reminder Settings** tab for configuration
- ✅ **Reminder Logs** tab for viewing history
- ✅ **Quick action buttons** for common tasks

## ⚙️ **Setup Instructions**

### **1️⃣ Database Setup**
```bash
# Run the reminder schema
mysql -u username -p database_name < database/schema/calibration_reminders.sql
```

### **2️⃣ Email Configuration**
Update the email settings in `api/calibration/reminders/process.php`:
```php
// Configure your email settings
$email_config = [
    'smtp_host' => 'your-smtp-server.com',
    'smtp_port' => 587,
    'smtp_username' => 'your-email@domain.com',
    'smtp_password' => 'your-password',
    'from_email' => 'calibration@yourcompany.com',
    'from_name' => 'Calibration System'
];
```

### **3️⃣ Cron Job Setup**
Set up a daily cron job to process reminders:
```bash
# Add to crontab (runs daily at 9 AM)
0 9 * * * curl -X POST https://yourdomain.com/api/calibration/reminders/process.php
```

### **4️⃣ Email Template Customization**
Modify the email template in `process.php`:
```php
private function generateEmailTemplate($data) {
    // Customize HTML email template
    // Include your company logo, branding, etc.
}
```

## 📊 **Dashboard Features**

### **Statistics Displayed**
- 📈 **Total Active Certificates** - Certificates with active reminders
- ⏰ **Upcoming Reminders (7/30 days)** - Due dates approaching
- 📧 **Reminders Sent Today** - Daily activity tracking
- ❌ **Failed Today** - Delivery issues monitoring
- ✅ **Closed This Week** - Manual closure tracking
- 🎯 **Success Rate** - Email delivery performance

### **Quick Actions**
- ⚙️ **Configure Reminders** - Access settings
- 📋 **View Logs** - Check reminder history
- 🔄 **Process Now** - Manual reminder scan

## 🔧 **Usage Workflow**

### **Setting Up Reminders**
1. **Navigate to Reminder Settings**
   ```
   Calibration Dashboard → Reminder Settings
   ```

2. **Create Customer Settings**
   - Enter customer name (or "ALL" for global)
   - Set reminder days (e.g., "30,7,1")
   - Add email recipients
   - Enable/disable as needed

3. **Configure Global Settings**
   - Create settings for "ALL" customers
   - Set default reminder intervals
   - Configure company-wide recipients

### **Monitoring Reminders**
1. **Check Dashboard**
   - View statistics and upcoming reminders
   - Monitor daily activity
   - Track success rates

2. **Review Logs**
   - Filter logs by certificate, customer, date
   - Check delivery status
   - View email content sent

3. **Manual Controls**
   - Close reminders for completed calibrations
   - Reopen reminders if needed
   - Track manual actions

## 🔐 **Security & Permissions**

### **Role-Based Access**
- **Admin**: Full reminder system access
- **Calibration**: Configure settings and view logs
- **Technician**: View logs and close reminders
- **Storekeeper**: View-only access

### **Email Security**
- Email content sanitization
- Rate limiting to prevent spam
- Audit logging for compliance
- Secure credential storage

## 📱 **Email Templates**

### **Professional HTML Emails**
```html
<!-- Email includes: -->
- Company branding and logo
- Certificate details (number, equipment, due date)
- Customer information
- Reminder timing (X days before due)
- Contact information
- Professional styling
```

### **Dynamic Placeholders**
- `{CustomerName}` - Customer name
- `{EquipmentName}` - Equipment description
- `{CertificateNumber}` - Certificate ID
- `{DueDate}` - Due date (formatted)
- `{Location}` - Equipment location
- `{ReminderDays}` - Days before due date

## ⚡ **Performance Optimization**

### **Database Optimizations**
- ✅ **Indexed queries** for fast lookups
- ✅ **Pagination** for large log datasets
- ✅ **Efficient filtering** with proper indexes
- ✅ **Batch processing** for multiple reminders

### **Email Delivery**
- ✅ **Queue system** for reliable delivery
- ✅ **Retry logic** for failed emails
- ✅ **Rate limiting** to prevent spam flags
- ✅ **Delivery confirmation** tracking

## 🧪 **Testing & Validation**

### **Test Scenarios**
1. **Create reminder settings** for test customer
2. **Add sample certificates** with upcoming due dates
3. **Run manual reminder process** via API
4. **Check email delivery** and logs
5. **Test manual close/reopen** functionality

### **Sample Test Data**
```sql
-- Test reminder settings
INSERT INTO calibration_reminder_settings (customer_name, reminder_days, is_enabled) VALUES
('Test Customer', '30,7,1', 1),
('ALL', '30,7,1', 1);

-- Test certificates
INSERT INTO calibration_certificates (request_number, certificate_number, customer_name, equipment_name, make, model_no, serial_no, date_of_due, location, year) VALUES
('TEST/001', 'TEST/001-01', 'Test Customer', 'Digital Scale', 'Mettler Toledo', 'XS6002S', '123456789', DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'Lab 1', '2025');
```

## 🚨 **Monitoring & Alerts**

### **System Monitoring**
- 📊 **Daily statistics** tracking
- 📧 **Email delivery** monitoring
- ❌ **Failure alerts** for admin
- 📈 **Performance metrics** dashboard

### **Error Handling**
- Email delivery failure logging
- Retry mechanism for failed sends
- Admin notifications for issues
- Detailed error reporting

## 🔄 **Automation Features**

### **Scheduled Processing**
```bash
# Daily cron job example
0 9 * * * /usr/bin/curl -X POST https://yourdomain.com/api/calibration/reminders/process.php
```

### **Smart Filtering**
- Only processes active certificates
- Prevents duplicate reminders
- Respects manual close status
- Filters by customer settings

## 💡 **Advanced Features**

### **Multi-Tier Reminders**
- **30 days before**: Initial notification
- **7 days before**: Follow-up reminder
- **1 day before**: Final urgent reminder

### **Customer-Specific Settings**
- Different reminder schedules per customer
- Custom email recipients per customer
- Individual enable/disable controls

### **Comprehensive Logging**
- Every email sent is logged
- Delivery status tracking
- Manual action audit trail
- Searchable history

## 🎯 **Integration Points**

### **With Certificate Management**
- ✅ Seamless integration with existing certificate workflow
- ✅ Automatic reminder status updates
- ✅ Visual indicators in certificate lists
- ✅ Unified dashboard experience

### **With Customer Management**
- ✅ Customer email auto-loading
- ✅ Per-customer reminder settings
- ✅ Customer-specific filtering in logs

## 📋 **Complete Implementation Checklist**

- ✅ **Database schema** created and tested
- ✅ **API endpoints** implemented and working
- ✅ **Frontend components** integrated
- ✅ **Email system** configured and tested
- ✅ **Cron job** scheduled for automation
- ✅ **Testing** completed with sample data
- ✅ **Documentation** provided for setup

## ✅ **PDO Method Fix Applied**

**Issue**: Fatal error `Call to undefined method PDOStatement::get_result()`

**Root Cause**: The reminder system API files were initially created using mysqli-style methods, but the existing system uses PDO.

**Solution Applied**:
- ✅ Updated all reminder API files to use correct PDO methods:
  - `fetchAll(PDO::FETCH_ASSOC)` instead of `get_result()->fetch_assoc()`
  - `fetch(PDO::FETCH_ASSOC)` instead of `fetch_assoc()`
  - `execute([parameters])` instead of `bind_param()->execute()`
  - `rowCount()` instead of `affected_rows`
- ✅ Fixed database connection method in previous update
- ✅ Updated cron job script with correct PDO methods
- ✅ Created comprehensive test script to verify functionality

**Files Updated**:
- `api/calibration/reminders/settings.php`
- `api/calibration/reminders/logs.php`
- `api/calibration/reminders/process.php`
- `scripts/process_reminders.php`
- `scripts/test_db_connection.php`

**Solution Applied**:
- ✅ Backend: Parse JSON fields before sending to frontend
- ✅ Frontend: Added comprehensive safety checks with `Array.isArray()` validation
- ✅ Type Safety: Ensured `email_recipients` is always treated as an array in TypeScript types
- ✅ Error Prevention: All components now handle null/undefined email_recipients gracefully

**Files Updated**:
- `api/calibration/reminders/settings.php` - Added JSON parsing
- `src/components/calibration/ReminderSettings.tsx` - Added safety checks
- `src/types/index.ts` - Updated type definitions

## 📧 **Email Configuration**

The reminder system uses a dedicated email service for sending calibration reminders.

### **Configuration Files**

#### **1️⃣ Reminder Email Service**
**File**: `api/config/reminder_email.php`

**Key Settings**:
```php
// SMTP Configuration
$this->mailer->Host       = 'smtp.gmail.com';        // SMTP server
$this->mailer->Username   = 'reception@arabscaleme.com';  // Your email
$this->mailer->Password   = 'ftotcoqabmlzvoje';       // App password
$this->mailer->Port       = 587;                     // SMTP port

// Sender Information
$this->mailer->setFrom('calibration@arabscaleme.com', 'Arab Scale Calibration');

// BCC Recipients (always included)
$this->mailer->addBCC('calibration@arabscaleme.com', 'Calibration Department');
$this->mailer->addBCC('backoffice@arabscaleme.com', 'Arab Scale Back Office');
```

#### **2️⃣ Where to Update Settings**

**📍 Update these in `api/config/reminder_email.php`:**

1. **SMTP Settings** (lines 18-24):
   ```php
   $this->mailer->Host       = 'smtp.gmail.com';
   $this->mailer->Username   = 'your-email@yourcompany.com';
   $this->mailer->Password   = 'your-app-password';
   $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
   $this->mailer->Port       = 587;
   ```

2. **Sender Address** (line 27):
   ```php
   $this->mailer->setFrom('calibration@yourcompany.com', 'Your Company Name');
   ```

3. **BCC Recipients** (lines 119-120):
   ```php
   $this->mailer->addBCC('calibration@yourcompany.com', 'Calibration Department');
   $this->mailer->addBCC('backoffice@yourcompany.com', 'Your Back Office');
   ```

#### **3️⃣ Gmail Setup Instructions**

If using Gmail, you need to:

1. **Enable 2-Factor Authentication**
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use the app password** (not your regular password)

#### **4️⃣ Alternative SMTP Providers**

**For other email providers, update these settings**:

```php
// Example for Outlook/Hotmail
$this->mailer->Host       = 'smtp-mail.outlook.com';
$this->mailer->Username   = 'your-email@outlook.com';
$this->mailer->Password   = 'your-password';
$this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
$this->mailer->Port       = 587;

// Example for Yahoo
$this->mailer->Host       = 'smtp.mail.yahoo.com';
$this->mailer->Username   = 'your-email@yahoo.com';
$this->mailer->Password   = 'your-app-password';
$this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
$this->mailer->Port       = 587;
```

#### **5️⃣ Email Template Customization**

**File**: `api/config/reminder_email.php` (lines 165-225)

**Update contact information**:
```php
<div style='text-align: center; margin: 30px 0; padding: 25px; background: #f8f9fa; border-radius: 8px;'>
    <h4 style='margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;'>Contact Calibration Department</h4>
    <p style='margin: 5px 0; color: #6c757d;'><strong>Phone:</strong> +971 XX XXX XXXX</p>
    <p style='margin: 5px 0; color: #6c757d;'><strong>Email:</strong> calibration@yourcompany.com</p>
    <p style='margin: 5px 0; color: #6c757d;'><strong>Website:</strong> www.yourcompany.com</p>
</div>
```

### **🚨 Important Notes**

1. **Never commit email passwords** to version control
2. **Use environment variables** for sensitive data in production
3. **Test email sending** before going live
4. **Monitor email logs** for delivery issues
5. **Set up SPF/DKIM/DMARC** records for better deliverability

### **🧪 Testing Email Configuration**

```bash
# Test reminder email (replace with actual certificate number)
php -r "
require_once 'api/config/reminder_email.php';
\$emailService = new ReminderEmailService();
\$result = \$emailService->sendReminderEmail(
    ['test@yourcompany.com'],
    'Test Reminder: CERT-001 - Due in 30 days',
    'Test message body'
);
echo 'Email test result: ' . (\$result['success'] ? 'SUCCESS' : 'FAILED') . PHP_EOL;
"
```

**✅ Configuration Complete**: Your reminder system will now send professional emails using the configured SMTP settings!

## 🔄 **Enhanced Certificate Creation Workflow**

The calibration certificate system now includes an advanced workflow for reusing data from previous requests:

### **📋 New Workflow Features**

#### **1️⃣ Load Previous Data**
- Enter any request number to auto-load customer details and previous certificates
- System automatically loads customer information and certificate history
- Previous certificates are displayed with "Previous Data" badges

#### **2️⃣ Smart Request Number Selection**
- **Automatic Detection**: System identifies eligible request numbers from job requests
- **Exclusion Logic**: Only shows request numbers that don't yet have certificates generated
- **Customer Filtering**: Filters request numbers by the same customer for consistency
- **Real-time Loading**: Dropdown populates automatically when customer data is loaded

#### **3️⃣ Flexible Certificate Management**
- **Edit Existing**: Modify loaded certificate data as needed
- **Add New**: Create additional certificates for the selected request number
- **Remove**: Delete certificates that are no longer needed
- **Auto-generation**: Certificate numbers are generated based on the target request number

#### **4️⃣ Intelligent Saving**
- **Target Selection**: Use the dropdown to choose which request number to save certificates under
- **Number Generation**: Certificate numbers are generated as `{selected_request}-{01,02,03...}`
- **Data Preservation**: All certificate details are saved under the chosen request number
- **Validation**: Ensures required request number is selected before saving

### **🎯 Workflow Best Practices**

```
1. Enter Request Number → Auto-load customer & previous certificates
2. Review/Edit Data → Modify certificates as needed
3. Select Target Request → Choose from dropdown of eligible request numbers
4. Save → Generate certificate numbers under selected request number
```

### **✅ Benefits**

- **📊 Data Reuse**: Avoid re-entering the same information multiple times
- **🔄 Consistency**: Maintain consistent customer and equipment data
- **⚡ Efficiency**: Faster certificate creation from existing templates
- **🎯 Accuracy**: Reduce data entry errors through auto-loading
- **📈 Productivity**: Streamlined workflow for calibration teams

**This system will automatically ensure your customers never miss calibration renewals!** 🚀

The **Automated Reminder Email System** is now fully integrated and ready for production use:

1. **Configure reminder settings** for your customers
2. **Set up daily automation** via cron job
3. **Monitor performance** through the dashboard
4. **Manage exceptions** through the logs interface

---

**Note**: The reminder system is designed to be non-intrusive and professional, enhancing customer relationships while ensuring compliance with calibration schedules.
