# Service Reports Management Application

A comprehensive, production-ready web application for managing service reports for weighing scales and POS systems with advanced features and role-based access control.

## Features

### Core Functionality
- **Advanced Role-based Authentication**: Admin, Technician, and Sales roles with granular permissions
- **Multi-stage Service Workflow**: Support for Inspection → Completion workflow and One-time service visits
- **Intelligent Item Management**: Three-way item selection (customer items, global search & assign, manual creation)
- **Service Report Management**: Create, edit, and manage service reports with automatic 24-hour edit window lock
- **Digital Signatures**: Capture engineer and customer signatures using touch-friendly signature pads
- **PDF Generation**: Professional PDF reports with company branding and signatures
- **Email Integration**: Professional email service using noreply@arabscaleme.com with Gmail SMTP
- **Comprehensive Scale History**: Search complete service history by serial number with filtering
- **Advanced Image Management**: Capture before/after photos and spare part images
- **Mobile Responsive**: Optimized for desktop, tablet, and mobile devices
- **Complete Audit Trail**: Track all user actions and system changes
- **Email Logging**: Complete history of all sent reports
- **Customer Management**: Create and manage customers with complete contact information
- **Payment Tracking**: Track invoice numbers, amounts, and payment status for all reports

### Technical Features
- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: PHP with MySQL database
- **Authentication**: JWT-based secure authentication
- **File Upload**: Secure image upload with validation
- **PDF Generation**: TCPDF integration for professional reports
- **Email System**: PHPMailer integration with Gmail SMTP (noreply@arabscaleme.com)
- **Audit Logging**: Comprehensive audit trail for all actions
- **Database Security**: Prepared statements and input validation
- **Automatic Locking**: 24-hour edit window with automatic report locking
- **Signature Requirements**: All report types require both engineer and customer signatures

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PHP (v7.4 or higher)
- MySQL (v5.7 or higher)
- Composer

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
```bash
cd api
composer install
```

**Important for Hostinger Deployment:**
```bash
# Run this in the root directory to install dependencies in the correct location
composer install
```

### Database Setup
1. Create a MySQL database named `service_reports`
2. Import the schema from `database/schema.sql`
3. Update database credentials in `api/config/database.php`

### Configuration
1. Update API base URL in `src/utils/api.ts` for production
2. Configure Gmail SMTP settings in `api/config/email.php`:
   - Update the app password for noreply@arabscaleme.com
   - Ensure 2-factor authentication is enabled on the Gmail account
   - Generate an app-specific password for SMTP access
3. Set up JWT secret key in `api/config/jwt.php`

### Email Configuration
1. **Gmail Account Setup**:
   - Enable 2-Factor Authentication on noreply@arabscaleme.com
   - Go to Google Account Settings > Security > 2-Step Verification > App passwords
   - Generate a new app password for "Mail"
   - Update the password in `api/config/email.php`

2. **Email Features**:
   - Professional HTML email templates with Arab Scale branding
   - Automatic PDF attachment of service reports
   - BCC to backoffice@arabscaleme.com for all sent reports
   - Custom message support for personalized communications

## Demo Credentials

### Admin
- Username: `admin`
- Password: `admin123`

### Technician
- Username: `tech`
- Password: `tech123`

### Sales
- Username: `sales`
- Password: `sales123`

### Storekeeper
- Username: `storekeeper`
- Password: `storekeeper123`

## Key Features Implemented

### User Interface
- **Technician Dashboard**: Large, touch-friendly buttons optimized for 11-inch tablets
- **Admin Sidebar**: Professional sidebar navigation for administrators
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Customer Management
- **Create New Customers**: Complete customer creation with contact information
- **Customer Search**: Quick search and selection during service report creation
- **Customer Database**: Comprehensive customer information storage

### Item Selection System
1. **Customer Items**: Select from items already assigned to the customer
2. **Global Search**: Search across all items purchased from your company and assign to customer
3. **Manual Creation**: Add new items with full details including purchase type flags

### Multi-stage Workflow
- **Inspection Reports**: Initial assessment and issue identification
- **Completion Reports**: Final repair work linked to inspection reports
- **One-time Service**: Complete service in single visit

### Service Report Management
- **Edit Reports**: Complete editing interface for service reports within 24-hour window
- **Signature Requirements**: All report types require both engineer and customer signatures
- **Payment Tracking**: Track invoice numbers, amounts, and payment status
- **Image Management**: Before/after photos with full-screen preview and download

### Advanced User Management
- **Admin**: Full system access, can edit locked reports, manage users and system settings
- **Technician**: Create/edit own reports (24-hour window), capture signatures, send emails
- **Sales**: Receive reports via email, view-only access

### Professional PDF Reports
- Company branding and professional layout
- Complete service details with before/after images
- Digital signatures embedded in PDF
- Spare parts usage with pricing
- Warranty status and technician notes

### Email System
- **Professional Templates**: HTML and plain text email formats
- **Automatic Attachments**: PDF reports attached to all emails
- **Back Office Copy**: All emails BCC'd to backoffice@arabscaleme.com
- **Delivery Tracking**: Complete email sending history and status

## Deployment on Hostinger

### Database Configuration
1. Create MySQL database in Hostinger control panel
2. Update `api/config/database.php` with Hostinger database credentials
3. Import `database/schema.sql` via phpMyAdmin

### File Upload
1. Ensure `api/uploads/` directory exists and is writable
2. Configure proper permissions for file uploads

### Email Configuration
1. Update Gmail app password in `api/config/email.php`
2. Ensure PHP has the required extensions for PHPMailer
3. Test email functionality after deployment

## API Endpoints

### Authentication
- `POST /api/auth/login.php` - User login
- `GET /api/auth/me.php` - Get current user

### Customers
- `GET /api/customers/list.php` - List customers
- `POST /api/customers/create.php` - Create customer

### Items
- `GET /api/items/list.php` - List items
- `GET /api/items/search.php` - Search items globally
- `POST /api/items/create.php` - Create item
- `POST /api/items/assign.php` - Assign item to customer

### Service Reports
- `GET /api/reports/list.php` - List reports
- `POST /api/reports/create.php` - Create report
- `GET /api/reports/get.php` - Get single report
- `PUT /api/reports/update.php` - Update report
- `POST /api/reports/send.php` - Send report via email
- `GET /api/reports/pdf.php` - Generate PDF
- `GET /api/reports/history.php` - Scale history
- `GET/POST /api/reports/payment.php` - Payment information management

### Utilities
- `POST /api/upload/image.php` - Upload image
- `GET /api/spares/list.php` - List spares
- `GET /api/email/recipients.php` - Email recipients
- `GET /api/email/logs.php` - Email sending history
- `GET /api/audit/logs.php` - Audit trail (Admin only)

## Security Features

- JWT-based authentication
- Role-based access control
- SQL injection prevention
- File upload validation
- Input sanitization
- CORS configuration
- 24-hour edit window enforcement
- Automatic report locking
- Complete audit logging
- Secure file handling
- Email security with app-specific passwords

## Mobile Optimization

- Touch-friendly signature capture
- Camera integration for photos
- Responsive grid layouts
- Touch-optimized form controls
- Mobile-first design approach
- Optimized for tablet use in field
- Offline-capable image capture
- Large buttons for 11-inch tablet interface

## PWA Features

- **Progressive Web App** - Install on any device like a native app
- **Offline Capability** - Works without internet connection
- **GPS Location Tracking** - Automatic location capture for service validation
- **Background Sync** - Syncs data when connection is restored
- **Push Notifications** - Real-time updates and alerts
- **App-like Experience** - Full screen, native-like interface
- **Auto-updates** - Always latest version without app store
- **Cross-platform** - Works on Android, iOS, Windows, Mac

### PWA Installation
1. Open the website in Chrome/Edge on Android tablet
2. Tap the "Add to Home Screen" prompt
3. The app will install like a native app
4. Launch from home screen for full-screen experience

### GPS & Location Features
- **Automatic location capture** when starting service
- **Address resolution** from GPS coordinates
- **Distance validation** from customer location
- **Admin location monitoring** - View all technician locations
- **Anti-manipulation** - Prevents time/location fraud

## Production Considerations

- Update JWT secret key
- Configure Gmail SMTP with app password
- Set up SSL certificates
- Configure proper file permissions
- Set up database backups
- Monitor system logs
- Configure error reporting
- Set up automated report locking
- Configure email delivery monitoring
- Test email functionality thoroughly

## Database Schema Highlights

### Enhanced Tables
- **items**: Support for item types, brands, purchase types, and flexible customer assignment
- **service_reports**: Multi-stage workflow with parent-child relationships and automatic locking
- **service_items**: Before/after images, diagnostics, warranty flags
- **audit_logs**: Complete system activity tracking
- **email_logs**: Email delivery tracking and history
- **payment_info**: Invoice numbers, amounts, and payment status tracking

### Automatic Features
- 24-hour report locking via MySQL events
- Comprehensive indexing for performance
- Foreign key constraints for data integrity
- JSON fields for flexible data storage

## Support

For technical support or feature requests, contact the development team.

## License

Proprietary software - All rights reserved.# 161125-Service-App
# 161125-Service-App
