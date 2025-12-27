# HRMS-LMS API Documentation

This document provides a comprehensive list of API endpoints available in the HRMS-LMS Flask application, organized by module.

## 🔐 Authentication & Headers
All endpoints except login and OTP-related ones require a valid JWT token.
- **Header**: `Authorization: Bearer <JWT_TOKEN>`

---

## 🔑 Account Module
Base Path: `/api/account`

### 1. Login
- **Endpoint**: `/login`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "Username": "E123",
    "Password": "password123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "AccessToken": "jwt_token_here",
    "EmployeeId": "E123",
    "RoleName": "Admin",
    "Email": "admin@example.com",
    "FullName": "John Doe"
  }
  ```

### 2. Send OTP
- **Endpoint**: `/send-otp`
- **Method**: `POST`
- **Access**: Public
- **Request Body**: `{"Username": "E123"}`

### 3. Verify OTP
- **Endpoint**: `/verify-otp`
- **Method**: `POST`
- **Access**: Public
- **Request Body**: `{"Username": "E123", "OTP": "123456"}`

### 4. Reset Password
- **Endpoint**: `/reset-password`
- **Method**: `POST`
- **Access**: Public (After OTP verification)
- **Request Body**: `{"Username": "E123", "NewPassword": "new_password"}`

---

## 📅 Leave Module
Base Path: `/api/leave`

### 1. Get Leave Types & Approvers
- **Endpoint**: `/leave-types-and-approver`
- **Method**: `GET`
- **Access**: All Roles
- **Query Params**: `employeeId=E123`

### 2. Get Leave History
- **Endpoint**: `/get-leave-details/<emp_id>`
- **Method**: `GET`
- **Access**: All Roles
- **Query Params**: `year=2024` (Optional)

### 3. Apply for Leave
- **Endpoint**: `/insert-leave-transaction`
- **Method**: `POST`
- **Access**: All Roles
- **Request Body**: Complex JSON containing Leave details (FromDate, ToDate, NoOfDays, etc.)

### 4. Update Leave Status
- **Endpoint**: `/update-status`
- **Method**: `PUT`
- **Access**: Admin, HR, Lead
- **Request Body**: `{"LeaveTranId": 1, "LeaveStatus": "Approved", "ApprovedBy": "LeadName"}`

### 5. Get Holidays
- **Endpoint**: `/get-holidays`
- **Method**: `GET`
- **Access**: All Roles

---

## 👥 HR Functionality Module
Base Path: `/api/hr-functionality`

### 1. Get All Employees
- **Endpoint**: `/get-all-employees`
- **Method**: `GET`
- **Access**: Admin, HR

### 2. Create/Update Employee
- **Endpoint**: `/upsert-employee`
- **Method**: `POST`
- **Access**: Admin, HR
- **Request Body**: Full employee profile object.

### 3. Monthly Report
- **Endpoint**: `/monthly-report`
- **Method**: `GET`
- **Access**: Admin, HR
- **Query Params**: `month=12&year=2024`

### 4. Add Project
- **Endpoint**: `/add-project`
- **Method**: `POST`
- **Access**: Admin, HR
- **Request Body**: `{"ProjectName": "Project X", "Description": "..."}`

---

## 💻 Asset & Inventory Module
Base Path: `/api`

### 1. List PCs
- **Endpoint**: `/pcs`
- **Method**: `GET`
- **Access**: Admin, HR

### 2. Add/Update PC
- **Endpoint**: `/pcs`
- **Method**: `POST/PUT`
- **Access**: Admin, HR
- **Request Body**: PC record object (PCName, Type, etc.)

### 3. Assign Asset
- **Endpoint**: `/assignments`
- **Method**: `POST`
- **Access**: Admin, HR
- **Request Body**: `{"EmployeeID": "E123", "PCID": 10}`

### 4. Maintenance Records
- **Endpoint**: `/maintenance`
- **Method**: `GET`
- **Access**: Admin, HR

---

## 👤 Profile (Self-Service)
Base Path: `/api/employees-details`

### 1. View My Profile
- **Endpoint**: `/<emp_id>`
- **Method**: `GET`
- **Access**: All Roles

### 2. Update My Contact Details
- **Endpoint**: `/update-employee-details-by-self/<emp_id>`
- **Method**: `PUT`
- **Access**: All Roles
- **Request Body**: Updated contact info object.

### 3. Cancel My Leave
- **Endpoint**: `/cancel-leave`
- **Method**: `PATCH`
- **Access**: All Roles
- **Request Body**: `{"LeaveTranId": 1}`

---

## 📈 Lead & Feedback
Base Path: `/api/lead-functionality`

### 1. Get Employee Feedback Report
- **Endpoint**: `/get-emp-report`
- **Method**: `GET`
- **Access**: All Roles
- **Query Params**: `empId=E123`

### 2. Add Performance Feedback
- **Endpoint**: `/add-emp-report`
- **Method**: `POST`
- **Access**: Admin, HR, Lead
- **Request Body**: Feedback object including `Goals` and `Measures` arrays.
