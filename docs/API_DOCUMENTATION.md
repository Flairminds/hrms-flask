# HRMS Flask API Documentation

**Last Updated**: 2025-12-30 16:49:00  
**Base URL**: `/api`

---

## Table of Contents

1. [Account & Authentication](#account--authentication)
2. [HR Management](#hr-management)
3. [Leave Management](#leave-management)
4. [Document Management](#document-management)
5. [Asset Management](#asset-management)
6. [Feedback & Reviews](#feedback--reviews)
7. [Skills & Capability](#skills--capability)
8. [Projects & Allocation](#projects--allocation)
9. [Policy Management](#policy-management)
10. [Profile Management](#profile-management)

---

## Account & Authentication

### Login
- **Method**: `POST`
- **Path**: `/api/account/login`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "access_token": "string",
    "employee_id": "string",
    "role": "string"
  }
  ```
- **Status Codes**:
  - `200`: Login successful
  - `401`: Invalid credentials
  - `500`: Server error

### Send OTP
- **Method**: `POST`
- **Path**: `/api/account/send-otp`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "OTP sent successfully"
  }
  ```

### Verify OTP
- **Method**: `POST`
- **Path**: `/api/account/verify-otp`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "string",
    "otp": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "OTP verified successfully",
    "token": "string"
  }
  ```

### Reset Password
- **Method**: `POST`
- **Path**: `/api/account/reset-password`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "string",
    "new_password": "string",
    "token": "string"
  }
  ```

---

## HR Management

### Get All Employees
- **Method**: `GET`
- **Path**: `/api/hr-functionality/get-all-employees`
- **Authentication**: Admin, HR
- **Query Parameters**: None
- **Response** (200):
  ```json
  [
    {
      "EmployeeId": "string",
      "EmployeeName": "string",
      "RoleName": "string"
    }
  ]
  ```

### Upsert Employee
- **Method**: `POST`
- **Path**: `/api/hr-functionality/upsert-employee`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "EmployeeId": "string",
    "FirstName": "string",
    "LastName": "string",
    "Email": "string",
    "DateOfJoining": "YYYY-MM-DD",
    "SubRole": "string",
    "Band": "string"
  }
  ```

### Get Monthly Report
- **Method**: `GET`
- **Path**: `/api/hr-functionality/monthly-report`
- **Authentication**: Admin, HR
- **Query Parameters**:
  - `month` (required): Integer (1-12)
  - `year` (required): Integer (e.g., 2025)
- **Response** (200): Array of employee attendance/payroll data

### Get Employee Details for Relieving Letter
- **Method**: `GET`
- **Path**: `/api/hr-functionality/employeeDetailsForRelievingLetter`
- **Authentication**: Admin, HR
- **Response** (200): Array of employee details

### Add Project
- **Method**: `POST`
- **Path**: `/api/hr-functionality/add-project`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "ProjectName": "string",
    "Description": "string"
  }
  ```

---

## Leave Management

### Get Leave Types and Approver
- **Method**: `GET`
- **Path**: `/api/leave-functionality/leave-types-and-approver`
- **Authentication**: All authenticated users
- **Response** (200):
  ```json
  {
    "leave_types": [
      {
        "leave_type_id": "integer",
        "leave_type_name": "string"
      }
    ],
    "approver": {
      "employee_id": "string",
      "approver_name": "string"
    }
  }
  ```

### Get Leave Details
- **Method**: `GET`
- **Path**: `/api/leave-functionality/get-leave-details/{emp_id}`
- **Authentication**: Employee (self), Admin, HR
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Response** (200):
  ```json
  {
    "leave_balances": {
      "sick": "integer",
      "privilege": "integer",
      "wfh": "integer",
      "comp_off": "integer"
    },
    "leave_history": []
  }
  ```

### Insert Leave Transaction
- **Method**: `POST`
- **Path**: `/api/leave-functionality/insert-leave-transaction`
- **Authentication**: All authenticated users
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "leave_type": "integer",
    "from_date": "YYYY-MM-DD",
    "to_date": "YYYY-MM-DD",
    "reason": "string",
    "applied_leave_count": "number"
  }
  ```

### Update Leave Status
- **Method**: `PUT`
- **Path**: `/api/leave-functionality/update-status`
- **Authentication**: Admin, HR, Lead
- **Request Body**:
  ```json
  {
    "leave_tran_id": "integer",
    "leave_status": "string",
    "remarks": "string"
  }
  ```

### Get Holidays
- **Method**: `GET`
- **Path**: `/api/leave-functionality/get-holidays`
- **Authentication**: All authenticated users
- **Response** (200):
  ```json
  [
    {
      "HolidayDate": "YYYY-MM-DD",
      "HolidayName": "string"
    }
  ]
  ```

### Send Leave Email Report
- **Method**: `GET`
- **Path**: `/api/leave-functionality/leave-records-mail`
- **Authentication**: Admin, HR
- **Response** (200):
  ```json
  {
    "message": "Email sent successfully"
  }
  ```

---

## Document Management

### Get Employee Details for Relieving Letter
- **Method**: `GET`
- **Path**: `/api/documents/employeeDetailsForRelievingLetter`
- **Authentication**: Admin, HR

### Get HR Relieving Letters
- **Method**: `GET`
- **Path**: `/api/documents/hrRelievingLetters`
- **Authentication**: Admin, HR

### Get Relieving Letters
- **Method**: `GET`
- **Path**: `/api/documents/relieving-letters`
- **Authentication**: Admin, HR

### Create Relieving Letter
- **Method**: `POST`
- **Path**: `/api/documents/create-relieving-letter`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employeeId": "string",
    "employeeName": "string",
    "designation": "string",
    "lastWorkingDate": "YYYY-MM-DD",
    "relievingDate": "YYYY-MM-DD",
    "resignationDate": "YYYY-MM-DD",
    "ctcSalary": "number",
    "bonus": "number"
  }
  ```

### Send Relieving Letter Email
- **Method**: `POST`
- **Path**: `/api/documents/sendRelievingLetterEmail/{letter_id}`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `letter_id`: Integer

### Update Relieving Letter
- **Method**: `PUT`
- **Path**: `/api/documents/relievingLetter/{letter_id}`
- **Authentication**: Admin, HR

### Download Relieving Letter
- **Method**: `GET`
- **Path**: `/api/documents/download-relieving-letter/{letter_id}`
- **Authentication**: Admin, HR

### Upload Document
- **Method**: `POST`
- **Path**: `/api/documents/upload-document`
- **Authentication**: Admin, HR
- **Request**: Multipart form data with file

### Get Document
- **Method**: `GET`
- **Path**: `/api/documents/get-document/{emp_id}/{doc_type}`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `emp_id`: Employee ID
  - `doc_type`: Document type (e.g., "pan", "aadhar", "resume")

### Delete Document
- **Method**: `DELETE`
- **Path**: `/api/documents/delete-document`
- **Authentication**: Admin, HR

### Get Document Status
- **Method**: `GET`
- **Path**: `/api/documents/document-status/{emp_id}`
- **Authentication**: Admin, HR

### Verify Document
- **Method**: `POST`
- **Path**: `/api/documents/verify-document`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "document_type": "string",
    "status": "string"
  }
  ```

### Get Document Verification Status
- **Method**: `GET`
- **Path**: `/api/documents/document-verification-status/{emp_id}`
- **Authentication**: Admin, HR

### Get Document Status Details
- **Method**: `GET`
- **Path**: `/api/documents/document-status-details/{emp_id}`
- **Authentication**: Admin, HR

### Get Incomplete Employees
- **Method**: `GET`
- **Path**: `/api/documents/incomplete-employees`
- **Authentication**: Admin, HR

### Get All Employees Document Status
- **Method**: `GET`
- **Path**: `/api/documents/all-employees-docs`
- **Authentication**: Admin, HR

---

## Asset Management

### Get PCs
- **Method**: `GET`
- **Path**: `/api/assets/pcs`
- **Authentication**: Admin, HR

### Upsert PC
- **Method**: `POST`, `PUT`
- **Path**: `/api/assets/pcs`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "pc_id": "string",
    "pc_name": "string",
    "specifications": "string"
  }
  ```

### Assign PC
- **Method**: `POST`
- **Path**: `/api/assets/assignments`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "pc_id": "string",
    "assignment_date": "YYYY-MM-DD"
  }
  ```

### Get Maintenance
- **Method**: `GET`
- **Path**: `/api/assets/maintenance`
- **Authentication**: Admin, HR

---

## Feedback & Reviews

### Get Employee Report
- **Method**: `GET`
- **Path**: `/api/feedback/get-emp-report`
- **Authentication**: Admin, HR, Lead

### Add Employee Report
- **Method**: `POST`
- **Path**: `/api/feedback/add-emp-report`
- **Authentication**: Admin, HR, Lead
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "feedback": "string",
    "rating": "integer",
    "period": "string"
  }
  ```

---

## Skills & Capability

### Get Capability Leads
- **Method**: `GET`
- **Path**: `/api/capability/capability-leads`
- **Authentication**: Admin, HR

### Create Capability Lead
- **Method**: `POST`
- **Path**: `/api/capability/capability-leads`
- **Authentication**: Admin, HR

### Delete Capability Lead
- **Method**: `DELETE`
- **Path**: `/api/capability/capability-leads/{lead_id}`
- **Authentication**: Admin, HR

### Get Assigned Capability Leads
- **Method**: `GET`
- **Path**: `/api/capability/assigned-capability-leads`
- **Authentication**: Admin, HR

### Create Capability Assignment
- **Method**: `POST`
- **Path**: `/api/capability/assigned-capability-leads`
- **Authentication**: Admin, HR

### Update Capability Assignment
- **Method**: `PUT`
- **Path**: `/api/capability/assigned-capability-leads/{assignment_id}`
- **Authentication**: Admin, HR

### Delete Capability Assignment
- **Method**: `DELETE`
- **Path**: `/api/capability/assigned-capability-leads/{assignment_id}`
- **Authentication**: Admin, HR

---

## Projects & Allocation

*Documentation to be added*

---

## Policy Management

*Documentation to be added*

---

## Profile Management

*Documentation to be added*

---

## Common Response Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request - Invalid input |
| 401  | Unauthorized - Authentication required |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource does not exist |
| 500  | Internal Server Error |

---

## Authentication

All endpoints (except login, OTP operations) require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Token is obtained from the `/api/account/login` endpoint.

---

## Role-Based Access Control

| Role | Permissions |
|------|-------------|
| Admin | Full access to all endpoints |
| HR | Access to HR, Leave, Document, Asset management |
| Lead | Access to Leave approvals, Team management, Feedback |
| Employee | Access to own profile, leave application, document view |

---

## Notes

- All dates should be in `YYYY-MM-DD` format
- All timestamps are in IST (UTC+5:30)
- File uploads use multipart/form-data
- Maximum file upload size: 10MB
- Supported document formats: PDF, PNG, JPG, JPEG

---

*This documentation is auto-generated. To update, run `/api-documentation` workflow.*
