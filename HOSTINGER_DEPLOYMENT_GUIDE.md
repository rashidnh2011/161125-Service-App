# 🚀 BizOps360 CRM Production Deployment Guide

## 📋 Prerequisites

- **Hostinger Account** with hosting plan
- **Domain** (optional, can use subdomain)
- **File Manager** or **FTP/SFTP** access
- **Database** access (MySQL/MariaDB)

## 🛠️ Deployment Steps

### 1. **Upload Files to Hostinger**

#### Option A: File Manager (Recommended)
1. Go to **hPanel** → **Hosting** → **File Manager**
2. Navigate to `public_html` or your subdomain folder
3. **Upload** all files from your project:
   ```
   /api/           → Upload entire api/ folder
   /dist/          → Upload dist/ folder contents to root
   /uploads/       → Create and upload to uploads/
   ```

#### Option B: FTP/SFTP
```bash
# Upload files using FTP client (FileZilla, etc.)
Host: [your-hostinger-server]
Username: [your-ftp-username]
Password: [your-ftp-password]
Port: 21

# /api/* → /public_html/api/
# /dist/* → /public_html/
# /uploads/* → /public_html/uploads/

### **Database Setup**

#### **Create Database**
1. **hPanel** → **Databases** → **MySQL Databases**
2. Create new database: `bizops360_crm`
3. Create database user with strong password
4. Assign user to database with **ALL PRIVILEGES**

#### **Existing Audit Logs Table**
**Note**: The system uses your existing `audit_logs` table with the following structure:
```sql
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id INT NOT NULL,
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
**✅ Recommendation**: Keep your existing `audit_logs` table structure as it's more efficient and compatible across all modules.

#### **Run Database Migration**
```bash
# Via SSH (if available) or File Manager
cd /public_html/api
php crm-migration.php

**Manual Table Creation** (if PHP CLI unavailable):
```sql
-- Run this in phpMyAdmin or MySQL console
-- Copy contents from: /api/crm-migration.php
-- Execute the CREATE TABLE statements
```

### 3. **Configure Database Connection**

**File:** `api/config/database.php`
```php
<?php
class Database {
    private $host = 'localhost';        // Hostinger: 'localhost'
    private $db_name = 'bizops360_crm'; // Your database name
    private $username = 'your_db_user'; // Database username
    private $password = 'your_db_pass'; // Database password
    private $port = 3306;
    public $conn;
    // ... rest of file unchanged
}
?>
```

### 4. **Environment Configuration**

#### JWT Configuration
**File:** `api/config/jwt.php`
```php
<?php
define('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-this-in-production');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRY', 86400); // 24 hours
?>
```

#### Email Configuration (Optional)
**File:** `api/config/email.php`
```php
<?php
// Configure for your email provider
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'your-email@gmail.com');
define('SMTP_PASSWORD', 'your-app-password');
?>
```

### 5. **File Permissions**

```bash
# Set proper permissions (SSH required)
chmod 755 /public_html/api/
chmod 755 /public_html/uploads/
chmod 644 /public_html/api/config/*.php
chmod 600 /public_html/api/config/jwt.php
```

### 6. **Domain Configuration**

#### Subdomain Setup (Optional)
1. **hPanel** → **Domains** → **Subdomains**
2. Create subdomain (e.g., `crm.yourdomain.com`)
3. Point to `public_html` folder

#### SSL Certificate (Recommended)
1. **hPanel** → **SSL** → **Manage SSL**
2. Enable **Auto SSL** for your domain

## 🔒 Security Checklist

### ✅ **Required Security Measures**

1. **Strong Passwords**
   - Database user password: 16+ characters
   - JWT secret: 32+ random characters
   - File Manager/FTP passwords

2. **File Permissions**
   ```bash
   chmod 600 api/config/jwt.php
   chmod 644 api/config/database.php
   chmod 755 api/ crm-migration.php
   ```

3. **HTTPS Only**
   - Enable SSL certificate
   - Force HTTPS in application

4. **Database Security**
   - Use strong database passwords
   - Limit database user privileges
   - Regular backup schedule

5. **API Security**
   - JWT token validation
   - Input sanitization
   - Rate limiting (recommended)

## 🚀 **Post-Deployment Verification**

### Test Endpoints
```bash
# Test basic connectivity
curl https://yourdomain.com/api/auth/login.php

# Test CRM functionality
curl -X POST https://yourdomain.com/api/crm/leads.php \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User"}'
```

### Frontend Testing
1. Open `https://yourdomain.com` in browser
2. Test all user roles (admin, technician, sales)
3. Verify CRM features work correctly
4. Check mobile responsiveness

## 📊 **CRM Features Available**

### ✅ **Fully Implemented Features**

#### **For Sales Team:**
- **Lead Management**: Create, edit, delete, assign leads
- **Contact Management**: Add multiple contacts per lead
- **Opportunity Tracking**: Manage sales pipeline stages
- **Activity Logging**: Track all customer interactions
- **Visit Tracking**: Schedule and track customer visits
- **Sales Analytics**: Comprehensive performance metrics
- **Quotation Management**: Create and send quotations

#### **For Administrators:**
- **User Management**: Manage all user accounts
- **Analytics Dashboard**: System-wide performance metrics
- **Audit Logs**: Track all system activities
- **Location Tracking**: Monitor field staff locations
- **Approval Workflows**: Service and payment approvals

- **Service Reports**: Create inspection and completion reports
- **Spare Parts Management**: View assigned spare parts
- **Customer Management**: Access customer information
- **Mobile Responsive**: Works on all devices

### **Common Deployment Issues & Solutions**

#### **🗄️ Database Connection Issues**
**Problem**: `Call to a member function prepare() on null` error

**Root Cause**: CRM files are not properly establishing database connections before using `$conn`.

**Solution**:
1. **Update all CRM API files** to create database connection:
   ```php
   // ❌ Missing database connection
   switch ($method) {
       case 'GET':
           handleGetVisits($conn, $user_id); // $conn is null!

   // ✅ Correct (fixed)
   // Create database connection
   $database = new Database();
   $conn = $database->getConnection();

   switch ($method) {
       case 'GET':
           handleGetVisits($conn, $user_id);
   ```

2. **Files to fix on server**:
   - `/api/crm/leads.php`
   - `/api/crm/contacts.php`
   - `/api/crm/opportunities.php`
   - `/api/crm/activities.php`
   - `/api/crm/dashboard.php`
   - `/api/crm/invoices.php`
   - `/api/crm/quotations.php`
   - `/api/crm/visit_tracking.php`
   - `/api/crm/visits.php`

#### **🔐 JWT Authentication Issues**
**Problem**: `Call to undefined function verifyJWT()` error

**Root Cause**: CRM files are calling a non-existent global `verifyJWT()` function instead of using the JWTHandler class.

**Solution**:
1. **Update all CRM API files** to use JWTHandler class:
   ```php
   // ❌ Wrong (causes error)
   $user = verifyJWT($token);

   // ✅ Correct (fixed)
   $jwt_handler = new JWTHandler();
   $user = $jwt_handler->validateToken($token);
   ```

2. **Files to fix on server**:
   - `/api/crm/leads.php`
   - `/api/crm/contacts.php`
   - `/api/crm/opportunities.php`
   - `/api/crm/activities.php`
   - `/api/crm/dashboard.php`
   - `/api/crm/invoices.php`
   - `/api/crm/quotations.php`
   - `/api/crm/visit_tracking.php`
   - `/api/crm/visits.php`

#### **🛠️ Quick Fix Script**
Create a PHP script to fix all JWT calls automatically:
```php
<?php
// fix_jwt_calls.php - Run this once after deployment
$files = [
    'leads.php', 'contacts.php', 'opportunities.php',
    'activities.php', 'dashboard.php', 'invoices.php',
    'quotations.php', 'visit_tracking.php', 'visits.php'
];

foreach ($files as $file) {
    $path = "/home/u673588969/domains/arabscalecalibration.com/public_html/api/crm/$file";
    if (file_exists($path)) {
        $content = file_get_contents($path);
        $content = str_replace(
            '$user = verifyJWT($token);',
            '$jwt_handler = new JWTHandler();' . PHP_EOL . '    $user = $jwt_handler->validateToken($token);',
            $content
        );
        file_put_contents($path, $content);
        echo "Fixed: $file" . PHP_EOL;
    }
}
?>

### **Support Resources**
- **Hostinger Documentation**: https://www.hostinger.com/tutorials
- **PHP Documentation**: https://php.net/docs
- **React Documentation**: https://react.dev

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Database Connection Errors**
   - **Error**: `Call to a member function prepare() on null`
   - **Fix**: CRM files need proper database connection initialization
   - **Solution**: Add database connection before switch statements:
     ```php
     // Create database connection
     $database = new Database();
     $conn = $database->getConnection();
     ```

2. **JWT Authentication Errors**
   - **Error**: `Call to undefined function verifyJWT()`
   - **Fix**: All CRM files need to use JWTHandler class instead of global function
   - **Solution**: Update all `/api/crm/*.php` files to use:
     ```php
     $jwt_handler = new JWTHandler();
     $user = $jwt_handler->validateToken($token);
     ```

3. **Database Connection Errors**
   - Check database credentials in `api/config/database.php`
   - Verify database exists and user has permissions

4. **File Upload Issues**
   - Check `uploads/` folder exists and is writable
   - Verify file size limits in PHP configuration

5. **CORS Errors**
   - Ensure proper headers in API files
   - Check SSL certificate is properly configured

6. **Build Errors**
   - Run `npm install` before `npm run build`
   - Check Node.js version compatibility

## 📝 **Maintenance**

### **Regular Tasks**
1. **Database Backups**: Weekly automated backups
2. **Security Updates**: Monitor for vulnerabilities
3. **Performance Monitoring**: Check server resources
4. **Log Monitoring**: Review error logs regularly

### **Update Process**
1. Backup database and files
2. Upload updated files
3. Test functionality
4. Monitor for issues

## 🎯 **Production URLs**

After deployment, your application will be available at:
- **Main App**: `https://yourdomain.com`
- **API Endpoints**: `https://yourdomain.com/api/`
- **File Uploads**: `https://yourdomain.com/uploads/`

---

**🎉 Congratulations! Your BizOps360 CRM is now production-ready on Hostinger!**

For support or questions, refer to the troubleshooting section or contact your development team.
