# Calibration Certificate Management System

## Overview

The enhanced Calibration Management System now includes comprehensive certificate management capabilities that integrate seamlessly with the existing job request workflow. This feature allows users to create, manage, and track calibration certificates with full historical traceability.

## Features

### 🔧 Core Functionality

1. **Request Number Selection & Auto-loading**
   - Enter or select from existing request numbers
   - Automatically loads customer details from the job request
   - Validates request number format and existence

2. **Historical Data Management**
   - Loads previous certificates when a request number is selected
   - Regenerates certificate numbers with new request number
   - Maintains reference to previous request numbers for traceability
   - Preserves all old records in the database

3. **Certificate Number Generation**
   - Automatic sequential numbering: `[RequestNumber]-[SequentialIndex]`
   - Format examples: `ASC25/020501-01`, `ASC25/020501-02`
   - Prevents duplicate certificate numbers

4. **Mixed Data Support**
   - Handle both old loaded data and new manual entries
   - Edit existing certificate details (equipment, make, model, etc.)
   - Add new certificates alongside loaded historical data

5. **Advanced Search & Management**
   - Search by certificate number, request number, serial number, or customer name
   - Filter and pagination support
   - Edit existing certificates
   - Role-based access control

## Database Schema

### calibration_certificates Table

```sql
CREATE TABLE calibration_certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_number VARCHAR(50) NOT NULL,
  certificate_number VARCHAR(100) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  equipment_name VARCHAR(255) NOT NULL,
  make VARCHAR(100) NOT NULL,
  model_no VARCHAR(100) NOT NULL,
  capacity VARCHAR(100),
  serial_no VARCHAR(100) NOT NULL,
  asset_no VARCHAR(100),
  date_of_due DATE NOT NULL,
  location VARCHAR(255),
  previous_request_number VARCHAR(50),
  year VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### Certificate Management APIs

1. **GET /api/calibration/certificates/list.php**
   - List certificates with search and pagination
   - Query parameters: certificate_number, request_number, serial_no, customer_name, page, limit

2. **POST /api/calibration/certificates/create.php**
   - Create new certificates
   - Supports single or multiple certificate creation

3. **PUT /api/calibration/certificates/update.php**
   - Update existing certificates
   - ID required in request body

4. **GET /api/calibration/certificates/by-request.php**
   - Get all certificates for a specific request number
   - Used for loading historical data

5. **GET /api/calibration/certificates/customer-by-request.php**
   - Get customer details for a request number
   - Auto-loads customer information

## Usage Workflow

### Creating Certificates

1. **Navigate to Certificate Management**
   - Go to Calibration Dashboard → Certificate Management

2. **Select Request Number**
   - Enter or search for an existing request number
   - System auto-loads customer details
   - Previous certificates are loaded if they exist

3. **Review/Edit Historical Data**
   - Modify equipment details as needed
   - Certificate numbers are regenerated with new request number
   - Previous request number is preserved for traceability

4. **Add New Certificates**
   - Click "Add Certificate" for new entries
   - Fill in equipment details
   - Certificate numbers are auto-generated

5. **Save All Data**
   - All certificates (old + new) are saved in one operation
   - Maintains data integrity and relationships

### Searching and Editing

1. **Access Search Interface**
   - Go to Calibration Dashboard → Search Certificates

2. **Apply Filters**
   - Search by certificate number, request number, serial number, or customer name
   - Use advanced filters for precise results

3. **Edit Certificates**
   - Click edit icon on any certificate
   - Modify editable fields (equipment details, dates, etc.)
   - Save changes with full audit trail

## Role-Based Access Control

The system supports different permission levels:

- **Admin**: Full access (create, edit, delete, search, manage all users)
- **Calibration**: Create & edit certificates, manage job requests
- **Technician**: View certificates, update specific fields
- **Storekeeper**: View-only access to certificate data
- **Sales**: View summary information and reports

## Integration Points

### With Existing Job Requests
- Certificate management is accessible from the main calibration dashboard
- Request numbers link between job requests and certificates
- Customer data is shared between systems

### With Customer Management
- Customer details auto-load from job requests
- Certificate history is maintained per customer
- Search functionality across all customer-related data

## Technical Implementation

### Frontend Components

1. **CertificateForm.tsx**
   - Main certificate creation and editing interface
   - Request number selection with auto-complete
   - Dynamic certificate list management

2. **CertificateList.tsx**
   - Search and filter interface
   - Results table with edit functionality
   - Modal-based editing

3. **CalibrationDashboard.tsx**
   - Main dashboard with tabbed interface
   - Navigation between different certificate functions

### Backend APIs

All APIs follow consistent patterns:
- JSON request/response format
- Proper error handling and validation
- Comprehensive logging for debugging
- Role-based access control integration

### Data Flow

1. **Request Number Entry** → Auto-load customer details
2. **Historical Data Loading** → Load previous certificates
3. **Certificate Management** → Edit existing or add new
4. **Number Generation** → Auto-generate sequential certificate numbers
5. **Data Persistence** → Save all changes to database
6. **Search & Edit** → Full CRUD operations with filters

## Installation & Setup

### Database Setup

1. Run the schema file: `database/schema/calibration_certificates.sql`
2. Ensure proper permissions on the calibration_certificates table
3. Verify foreign key relationships if linking to existing tables

### Frontend Setup

1. Components are already integrated into the calibration layout
2. API endpoints are registered in the API client
3. Navigation is updated in the dashboard

### Testing

1. Create a job request first
2. Navigate to Certificate Management
3. Select the request number
4. Test certificate creation and editing
5. Verify search functionality

## Security Considerations

- All certificate operations are logged for audit purposes
- Role-based access control prevents unauthorized modifications
- Input validation prevents SQL injection and data corruption
- Certificate numbers are unique and cannot be duplicated
- Historical data integrity is maintained

## Performance Optimization

- Database indexes on frequently searched fields
- Pagination for large result sets
- Efficient queries with proper joins
- Caching for frequently accessed data

## Future Enhancements

- PDF certificate generation
- Email notifications for due dates
- Integration with external calibration software
- Advanced reporting and analytics
- Bulk certificate operations
- Mobile-responsive interface improvements

---

**Note**: This certificate management system is fully integrated with the existing calibration workflow and maintains data consistency across all related modules.
