# HRMS Flask API Documentation

**Last Updated**: 2025-12-30 19:51:00  
**Base URL**: `/api`

---

## Table of Contents

1. [Account & Authentication](#account--authentication)
2. [HR Management](#hr-management)
3. [Leave Management](#leave-management)
4. [Document Management](#document-management)
5. [Asset Management](#asset-management)
6. [Feedback & Reviews](#feedback--reviews)
7. [Skills Management](#skills-management)
8. [Skill Reviews](#skill-reviews)
9. [Capability Management](#capability-management)
10. [Profile Management](#profile-management)
11. [Policy Management](#policy-management)
12. [Project Management](#project-management)
13. [Employee Allocation](#employee-allocation)
14. [Goals Management](#goals-management)
15. [Evaluators Management](#evaluators-management)
16. [Health Check](#health-check)

---

## Account & Authentication

### Login
- **Method**: `POST`
- **Path**: `/api/account/login`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "Username": "string (Employee ID or Email)",
    "Password": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "accessToken": "string (JWT token)",
    "employeeId": "string",
    "roleName": "string",
    "email": "string",
    "fullName": "string"
  }
  ```
- **Status Codes**:
  - `200`: Login successful
  - `400`: Missing username or password
  - `401`: Invalid credentials or employee status is Relieved/Absconding
  - `500`: Server error

### Send OTP
- **Method**: `POST`
- **Path**: `/api/account/send-otp`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "Username": "string (Employee ID or Email)"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "OTP sent successfully to your registered email"
  }
  ```
- **Status Codes**:
  - `200`: OTP sent successfully
  - `400`: Missing username
  - `404`: User not found
  - `500`: Failed to save OTP or send email
- **Notes**: OTP is valid for 10 minutes

### Verify OTP
- **Method**: `POST`
- **Path**: `/api/account/verify-otp`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "Username": "string (Employee ID or Email)",
    "OTP": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "OTP verified successfully"
  }
  ```
- **Status Codes**:
  - `200`: OTP verified successfully
  - `400`: Missing fields or invalid/expired OTP
  - `500`: Server error

### Reset Password
- **Method**: `POST`
- **Path**: `/api/account/reset-password`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "Username": "string (Employee ID or Email)",
    "NewPassword": "string (minimum 8 characters)"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Password reset successfully"
  }
  ```
- **Status Codes**:
  - `200`: Password reset successful
  - `400`: Missing fields or password too weak
  - `500`: Failed to reset password

---

## HR Management

### Get All Employees
- **Method**: `GET`
- **Path**: `/api/hr-functionality/get-all-employees`
- **Authentication**: Admin, HR
- **Query Parameters**: None
- **Response** (200): Array of employee objects
  ```json
  [
    {
      "EmployeeId": "string",
      "EmployeeName": "string",
      "RoleName": "string",
      "Email": "string",
      "..."
    }
  ]
  ```
- **Status Codes**:
  - `200`: Success
  - `403`: Insufficient permissions
  - `500`: Server error

### Upsert Employee
- **Method**: `POST`
- **Path**: `/api/hr-functionality/upsert-employee`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "EmployeeId": "string (required)",
    "FirstName": "string",
    "LastName": "string",
    "Email": "string",
    "DateOfJoining": "YYYY-MM-DD",
    "SubRole": "string",
    "Band": "string",
    "ContactNumber": "string",
    "..."
  }
  ```
- **Response** (200):
  ```json
  {
    "Message": "Employee updated successfully",
    "EmployeeId": "string"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing EmployeeId or validation error
  - `404`: Employee not found (update only)
  - `500`: Server error

### Get Monthly Report
- **Method**: `GET`
- **Path**: `/api/hr-functionality/monthly-report`
- **Authentication**: Admin, HR
- **Query Parameters**:
  - `month` (required): Integer (1-12)
  - `year` (required): Integer (e.g., 2025)
- **Response** (200): Array of attendance/payroll records
- **Status Codes**:
  - `200`: Success
  - `400`: Missing or invalid month/year parameters
  - `500`: Server error

### Add Project
- **Method**: `POST`
- **Path**: `/api/hr-functionality/add-project`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "ProjectName": "string (required)",
    "Description": "string"
  }
  ```
- **Response** (201):
  ```json
  {
    "Message": "Project added successfully",
    "ProjectId": "integer"
  }
  ```
- **Status Codes**:
  - `201`: Project created successfully
  - `400`: Missing ProjectName
  - `500`: Server error

### Get Employee Details for Relieving Letter
- **Method**: `GET`
- **Path**: `/api/hr-functionality/employeeDetailsForRelievingLetter`
- **Authentication**: Admin, HR
- **Response** (200):
  ```json
  {
    "status": "success",
    "data": [...]
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

---

## Leave Management

### Get Leave Types and Approver
- **Method**: `GET`
- **Path**: `/api/leave-functionality/leave-types-and-approver`
- **Authentication**: Admin, HR, Lead, Employee
- **Query Parameters**:
  - `employeeId` (required): Employee ID
- **Response** (200):
  ```json
  {
    "leave_types": [...],
    "approver": {...}
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing employeeId parameter
  - `404`: Employee not found
  - `500`: Server error

### Get Leave Details
- **Method**: `GET`
- **Path**: `/api/leave-functionality/get-leave-details/<emp_id>`
- **Authentication**: Admin, HR, Lead, Employee
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Query Parameters**:
  - `year` (optional): Year filter
- **Response** (200): Array of leave records
- **Status Codes**:
  - `200`: Success
  - `404`: Employee not found
  - `500`: Server error

### Insert Leave Transaction
- **Method**: `POST`
- **Path**: `/api/leave-functionality/insert-leave-transaction`
- **Authentication**: Admin, HR, Lead, Employee
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
- **Response** (201):
  ```json
  {
    "Message": "Leave applied successfully",
    "TransactionId": "integer"
  }
  ```
- **Status Codes**:
  - `201`: Leave created successfully
  - `400`: Validation error
  - `404`: Resource not found
  - `500`: Server error

### Update Leave Status
- **Method**: `PUT`
- **Path**: `/api/leave-functionality/update-status`
- **Authentication**: Admin, HR, Lead
- **Request Body**:
  ```json
  {
    "LeaveTranId": "integer (required)",
    "LeaveStatus": "string (required)",
    "ApprovedBy": "string",
    "ApproverComment": "string",
    "IsBillable": "boolean",
    "IsCommunicatedToTeam": "boolean",
    "IsCustomerApprovalRequired": "boolean",
    "havecustomerApproval": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "Message": "Status updated successfully",
    "SendMailFlag": "boolean"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing required fields
  - `404`: Transaction not found
  - `500`: Server error

### Get Holidays
- **Method**: `GET`
- **Path**: `/api/leave-functionality/get-holidays`
- **Authentication**: Admin, HR, Lead, Employee
- **Response** (200):
  ```json
  [
    {
      "HolidayDate": "YYYY-MM-DD",
      "HolidayName": "string"
    }
  ]
  ```
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Send Leave Email Report
- **Method**: `GET`
- **Path**: `/api/leave-functionality/leave-records-mail`
- **Authentication**: Admin, HR, Lead
- **Response** (200):
  ```json
  {
    "message": "Email sent successfully"
  }
  ```
- **Status Codes**:
  - `200`: Email sent successfully
  - `500`: Failed to send email

---

## Document Management

### Get Employee Details for Relieving Letter
- **Method**: `GET`
- **Path**: `/api/documents/employeeDetailsForRelievingLetter`
- **Authentication**: Admin, HR
- **Response** (200): Employee list for relieving letter generation
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Get HR Relieving Letters
- **Method**: `GET`
- **Path**: `/api/documents/hrRelievingLetters`
- **Authentication**: Admin, HR
- **Response** (200): Complete list of relieving letters
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Get Relieving Letters
- **Method**: `GET`
- **Path**: `/api/documents/relieving-letters`
- **Authentication**: Admin, HR
- **Response** (200): Simplified list of relieving letters
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

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
- **Response** (200):
  ```json
  {
    "message": "Relieving letter created and emailed successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing/invalid fields
  - `500`: Server error

### Send Relieving Letter Email
- **Method**: `POST`
- **Path**: `/api/documents/sendRelievingLetterEmail/<letter_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `letter_id`: Integer
- **Response** (200):
  ```json
  {
    "message": "Email sent successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `404`: Letter or PDF not found
  - `500`: Server error

### Update Relieving Letter
- **Method**: `PUT`
- **Path**: `/api/documents/relievingLetter/<letter_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `letter_id`: Integer
- **Request Body**:
  ```json
  {
    "lastWorkingDate": "YYYY-MM-DD",
    "relievingDate": "YYYY-MM-DD",
    "resignationDate": "YYYY-MM-DD",
    "ctcSalary": "number",
    "bonus": "number"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Relieving letter updated successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing/invalid fields
  - `404`: Letter not found
  - `500`: Server error

### Download Relieving Letter
- **Method**: `GET`
- **Path**: `/api/documents/download-relieving-letter/<letter_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `letter_id`: Integer
- **Response** (200): PDF file download
- **Status Codes**:
  - `200`: Success
  - `404`: Letter or PDF not found
  - `500`: Server error

### Upload Document
- **Method**: `POST`
- **Path**: `/api/documents/upload-document`
- **Authentication**: Admin, HR
- **Request**: Multipart form data
  - `emp_id`: Employee ID
  - `doc_type`: tenth, twelve, pan, adhar, grad, resume
  - `file`: PDF file
- **Response** (200):
  ```json
  {
    "message": "Document uploaded successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing fields or invalid file type
  - `500`: Server error

### Get Document
- **Method**: `GET`
- **Path**: `/api/documents/get-document/<emp_id>/<doc_type>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `emp_id`: Employee ID
  - `doc_type`: Document type
- **Response** (200): PDF file download
- **Status Codes**:
  - `200`: Success
  - `400`: Invalid document type
  - `404`: Document not found
  - `500`: Server error

### Delete Document
- **Method**: `DELETE`
- **Path**: `/api/documents/delete-document`
- **Authentication**: Admin, HR
- **Query Parameters**:
  - `employeeId`: Employee ID
  - `docType`: Document type
- **Response** (200):
  ```json
  {
    "message": "Document deleted successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing/invalid parameters
  - `500`: Server error

### Get Document Status
- **Method**: `GET`
- **Path**: `/api/documents/document-status/<emp_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Response** (200): Document upload status
- **Status Codes**:
  - `200`: Success
  - `404`: Employee not found
  - `500`: Server error

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
- **Response** (200):
  ```json
  {
    "message": "Document verified successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing fields
  - `500`: Server error

### Get Document Verification Status
- **Method**: `GET`
- **Path**: `/api/documents/document-verification-status/<emp_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Response** (200): Verification status for documents
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Get Document Status Details
- **Method**: `GET`
- **Path**: `/api/documents/document-status-details/<emp_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Response** (200): Detailed document status
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Get Incomplete Employees
- **Method**: `GET`
- **Path**: `/api/documents/incomplete-employees`
- **Authentication**: Admin, HR
- **Response** (200): List of employees with incomplete documents
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Get All Employees Document Status
- **Method**: `GET`
- **Path**: `/api/documents/all-employees-docs`
- **Authentication**: Admin, HR
- **Response** (200): Document status for all employees
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

---

## Asset Management

### Get PCs
- **Method**: `GET`
- **Path**: `/api/assets/pcs`
- **Authentication**: Admin, HR
- **Response** (200): List of all PCs
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

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
- **Response** (200):
  ```json
  {
    "message": "PC upserted successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

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
- **Response** (200):
  ```json
  {
    "message": "PC assigned successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Get Maintenance
- **Method**: `GET`
- **Path**: `/api/assets/maintenance`
- **Authentication**: Admin, HR
- **Response** (200): Maintenance records
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

---

## Feedback & Reviews

### Get Employee Report
- **Method**: `GET`
- **Path**: `/api/feedback/get-emp-report`
- **Authentication**: Admin, HR, Lead, Employee
- **Response** (200): Employee feedback reports
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

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
- **Response** (200):
  ```json
  {
    "message": "Report added successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

---

## Skills Management

### Get Employee Skills Overview
- **Method**: `GET`
- **Path**: `/api/skills/employee-skills`
- **Authentication**: Admin, HR
- **Response** (200): Overview of all employee skills
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Add or Update Skills
- **Method**: `POST`
- **Path**: `/api/skills/add-update-skills`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "skills": [
      {
        "skill_name": "string",
        "skill_level": "string"
      }
    ]
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Skills updated successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Get Employee Skills
- **Method**: `GET`
- **Path**: `/api/skills/employee-skills/<employee_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `employee_id`: Employee ID
- **Response** (200): Skills for specific employee
- **Status Codes**:
  - `200`: Success
  - `404`: Employee not found
  - `500`: Server error

### Get Employees with Skills
- **Method**: `GET`
- **Path**: `/api/skills/employees`
- **Authentication**: Admin, HR
- **Response** (200): List of employees with their skills
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

---

## Skill Reviews

### Get Assigned Employees Skills
- **Method**: `GET`
- **Path**: `/api/review/employees/skills`
- **Authentication**: Admin, HR
- **Response** (200): Skills of assigned employees for review
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Get Skill Statuses
- **Method**: `GET`
- **Path**: `/api/review/skill-statuses/<employee_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `employee_id`: Employee ID
- **Response** (200): Skill review statuses for employee
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Save Review
- **Method**: `POST`
- **Path**: `/api/review/save-review`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "skill_id": "string",
    "review_score": "number",
    "comments": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Review saved successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Add Employee Skill
- **Method**: `POST`
- **Path**: `/api/review/add-employee-skill`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "skill_id": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Skill added successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Update Skill Score
- **Method**: `PUT`
- **Path**: `/api/review/update-skill-score`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "skill_id": "string",
    "new_score": "number"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Skill score updated successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Get Master Skills
- **Method**: `GET`
- **Path**: `/api/review/skills/employee`
- **Authentication**: Admin, HR
- **Response** (200): List of all master skills
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

---

## Capability Management

### Get Capability Leads
- **Method**: `GET`
- **Path**: `/api/capability/capability-leads`
- **Authentication**: Admin, HR
- **Response** (200): List of capability leads
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Create Capability Lead
- **Method**: `POST`
- **Path**: `/api/capability/capability-leads`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "capability_name": "string",
    "lead_employee_id": "string"
  }
  ```
- **Response** (201):
  ```json
  {
    "message": "Capability lead created successfully"
  }
  ```
- **Status Codes**:
  - `201`: Created successfully
  - `400`: Validation error
  - `500`: Server error

### Delete Capability Lead
- **Method**: `DELETE`
- **Path**: `/api/capability/capability-leads/<lead_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `lead_id`: Integer
- **Response** (200):
  ```json
  {
    "message": "Capability lead deleted successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `404`: Lead not found
  - `500`: Server error

### Get Assigned Capability Leads
- **Method**: `GET`
- **Path**: `/api/capability/assigned-capability-leads`
- **Authentication**: Admin, HR
- **Response** (200): List of capability lead assignments
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Create Capability Assignment
- **Method**: `POST`
- **Path**: `/api/capability/assigned-capability-leads`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "capability_id": "string"
  }
  ```
- **Response** (201):
  ```json
  {
    "message": "Assignment created successfully"
  }
  ```
- **Status Codes**:
  - `201`: Created successfully
  - `400`: Validation error
  - `500`: Server error

### Update Capability Assignment
- **Method**: `PUT`
- **Path**: `/api/capability/assigned-capability-leads/<assignment_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `assignment_id`: Integer
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "capability_id": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Assignment updated successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `404`: Assignment not found
  - `500`: Server error

### Delete Capability Assignment
- **Method**: `DELETE`
- **Path**: `/api/capability/assigned-capability-leads/<assignment_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `assignment_id`: Integer
- **Response** (200):
  ```json
  {
    "message": "Assignment deleted successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `404`: Assignment not found
  - `500`: Server error

---

## Profile Management

### Get Profile
- **Method**: `GET`
- **Path**: `/api/profile/<emp_id>`
- **Authentication**: Admin, HR, Lead, Employee
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Response** (200):
  ```json
  {
    "EmployeeId": "string",
    "FirstName": "string",
    "LastName": "string",
    "Email": "string",
    "ContactNumber": "string",
    "Skills": [...],
    "Addresses": [...]
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `404`: Employee not found
  - `500`: Server error

### Update Profile (Self)
- **Method**: `PUT`
- **Path**: `/api/profile/update-employee-details-by-self/<emp_id>`
- **Authentication**: Admin, HR, Lead, Employee
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Request Body**:
  ```json
  {
    "ContactNumber": "string",
    "Email": "string",
    "Address": "string",
    "..."
  }
  ```
- **Response** (200):
  ```json
  {
    "Message": "Profile updated successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing request body
  - `500`: Server error or employee not found

### Cancel Leave
- **Method**: `PATCH`
- **Path**: `/api/profile/cancel-leave`
- **Authentication**: Admin, HR, Lead, Employee
- **Request Body**:
  ```json
  {
    "LeaveTranId": "integer"
  }
  ```
- **Response** (200):
  ```json
  {
    "Message": "Leave cancelled successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing LeaveTranId
  - `404`: Leave transaction not found or cannot be cancelled
  - `500`: Server error

### Get Complete Details
- **Method**: `GET`
- **Path**: `/api/profile/complete-details/<emp_id>`
- **Authentication**: Admin, HR, Lead, Employee
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Response** (200): Complete employee details
- **Status Codes**:
  - `200`: Success
  - `404`: Employee not found
  - `500`: Server error

### Increment Address Counter
- **Method**: `POST`
- **Path**: `/api/profile/increment-address-counter/<emp_id>`
- **Authentication**: Admin, HR, Lead, Employee
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Response** (200):
  ```json
  {
    "message": "Counter incremented successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `500`: Failed to increment counter

### Get Address Counter
- **Method**: `GET`
- **Path**: `/api/profile/get-address-counter/<emp_id>`
- **Authentication**: Admin, HR, Lead, Employee
- **Path Parameters**:
  - `emp_id`: Employee ID
- **Response** (200):
  ```json
  {
    "counter": "integer"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

---

## Policy Management

### Get Policy Acknowledgment
- **Method**: `GET`
- **Path**: `/api/policy/policy-acknowledgment/<employee_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `employee_id`: Employee ID
- **Response** (200): Policy acknowledgment status
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Update Policy Acknowledgment
- **Method**: `POST`
- **Path**: `/api/policy/policy-acknowledgment`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "policy_id": "string",
    "acknowledged": "boolean"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Acknowledgment updated successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Send Policy Email
- **Method**: `POST`
- **Path**: `/api/policy/send-policy-email`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "policy_id": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Policy email sent successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Update Warning Count
- **Method**: `POST`
- **Path**: `/api/policy/update-warning-count`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "warning_count": "integer"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Warning count updated successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Get Warning Count
- **Method**: `GET`
- **Path**: `/api/policy/warning-count/<employee_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `employee_id`: Employee ID
- **Response** (200):
  ```json
  {
    "warning_count": "integer"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

---

## Project Management

### Get Projects
- **Method**: `GET`
- **Path**: `/api/project/projects`
- **Authentication**: None (Public)
- **Response** (200):
  ```json
  {
    "projects": [...]
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Add Project
- **Method**: `POST`
- **Path**: `/api/project/add-project`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "project_name": "string (required)",
    "end_date": "YYYY-MM-DD",
    "required": "integer"
  }
  ```
- **Response** (201):
  ```json
  {
    "message": "Project added successfully"
  }
  ```
- **Status Codes**:
  - `201`: Created successfully
  - `400`: Project name is required
  - `500`: Server error

### Delete Project
- **Method**: `DELETE`
- **Path**: `/api/project/delete-project/<project_id>`
- **Authentication**: None (Public)
- **Path Parameters**:
  - `project_id`: Integer
- **Response** (200):
  ```json
  {
    "message": "Project deleted successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

---

## Employee Allocation

### Assign Employee
- **Method**: `POST`
- **Path**: `/api/allocation/assign-employee`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "employee_id": "string (required)",
    "project_id": "integer (required)",
    "work_category": "string",
    "allocation": "float (default: 1.0)"
  }
  ```
- **Response** (201):
  ```json
  {
    "message": "Employee assigned successfully",
    "allocation_id": "integer"
  }
  ```
- **Status Codes**:
  - `201`: Created successfully
  - `400`: Validation error or missing fields
  - `409`: Duplicate assignment
  - `500`: Server error

---

## Goals Management

### Create Goal
- **Method**: `POST`
- **Path**: `/api/goals/goals`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "goal_title": "string",
    "goal_description": "string",
    "target_date": "YYYY-MM-DD"
  }
  ```
- **Response** (201):
  ```json
  {
    "message": "Goal created successfully",
    "goal_id": "integer"
  }
  ```
- **Status Codes**:
  - `201`: Created successfully
  - `400`: Validation error
  - `500`: Server error

### Get Employee Goals
- **Method**: `GET`
- **Path**: `/api/goals/goals/employee/<employee_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `employee_id`: Employee ID
- **Response** (200): List of goals for employee
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Update Goal
- **Method**: `PUT`
- **Path**: `/api/goals/goals/<goal_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `goal_id`: Integer
- **Request Body**:
  ```json
  {
    "goal_title": "string",
    "goal_description": "string",
    "target_date": "YYYY-MM-DD",
    "status": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Goal updated successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `404`: Goal not found
  - `500`: Server error

### Delete Goal
- **Method**: `DELETE`
- **Path**: `/api/goals/goals/<goal_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `goal_id`: Integer
- **Response** (200):
  ```json
  {
    "message": "Goal deleted successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `404`: Goal not found
  - `500`: Server error

---

## Evaluators Management

### Assign Evaluators to Employee
- **Method**: `POST`
- **Path**: `/api/evaluators/HRFunctionality/AssignEvaluatorsToEmp`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "evaluators": ["string"]
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Evaluators assigned successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Send Evaluator Reminder
- **Method**: `POST`
- **Path**: `/api/evaluators/HRFunctionality/SendEvaluatorReminder`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "evaluator_id": "string",
    "employee_id": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Reminder sent successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

### Get All Employee Evaluators
- **Method**: `GET`
- **Path**: `/api/evaluators/HRFunctionality/GetAllEmployeeEvaluators`
- **Authentication**: Admin, HR
- **Response** (200): List of all employee-evaluator mappings
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Get All Employees for Evaluators
- **Method**: `GET`
- **Path**: `/api/evaluators/HRFunctionality/GetAllEmployeesForEvaluators/<evaluator_id>`
- **Authentication**: Admin, HR
- **Path Parameters**:
  - `evaluator_id`: Evaluator employee ID
- **Response** (200): List of employees assigned to the evaluator
- **Status Codes**:
  - `200`: Success
  - `500`: Server error

### Delete Evaluators
- **Method**: `DELETE`
- **Path**: `/api/evaluators/HRFunctionality/DeleteEvaluators`
- **Authentication**: Admin, HR
- **Request Body**:
  ```json
  {
    "employee_id": "string",
    "evaluator_id": "string"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Evaluator assignment deleted successfully"
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Validation error
  - `500`: Server error

---

## Health Check

### Health Check
- **Method**: `GET`
- **Path**: `/api/health/health`
- **Authentication**: None (Public)
- **Response** (200):
  ```json
  {
    "status": "healthy",
    "message": "Server is running",
    "service": "HRMS-Flask Backend"
  }
  ```
- **Status Codes**:
  - `200`: Server is running

### Database Health Check
- **Method**: `GET`
- **Path**: `/api/health/health/db`
- **Authentication**: None (Public)
- **Response** (200):
  ```json
  {
    "status": "healthy",
    "message": "Database connection is working",
    "database": "connected"
  }
  ```
- **Status Codes**:
  - `200`: Database connection is healthy
  - `503`: Database connection failed
    ```json
    {
      "status": "unhealthy",
      "message": "Database connection failed",
      "database": "disconnected",
      "error": "string"
    }
    ```

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
| 409  | Conflict - Duplicate resource |
| 500  | Internal Server Error |
| 503  | Service Unavailable |

---

## Authentication

All endpoints (except login, OTP operations, health checks, project endpoints, and allocation endpoints) require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Token is obtained from the `/api/account/login` endpoint and includes:
- Employee ID (identity claim)
- Role name (role claim)

---

## Role-Based Access Control

| Role | Permissions |
|------|-------------|
| Admin | Full access to all endpoints |
| HR | Access to HR, Leave, Document, Asset, Feedback, Skills, Capability, Profile, Policy, Goals, Evaluators management |
| Lead | Access to Leave approvals, Team management, Feedback, Profile |
| Employee | Access to own profile, leave application, document view, profile management |

### Role Permissions by Module

- **Account**: Public (no authentication required)
- **HR Management**: Admin, HR
- **Leave Management**: 
  - View/Apply: Admin, HR, Lead, Employee
 - Approve: Admin, HR, Lead
- **Documents**: Admin, HR
- **Assets**: Admin, HR
- **Feedback**: 
  - View: Admin, HR, Lead, Employee
  - Add: Admin, HR, Lead
- **Skills, Review, Capability**: Admin, HR
- **Profile**: Admin, HR, Lead, Employee (self-service)
- **Policy**: Admin, HR
- **Project**: Public (no authentication required)
- **Allocation**: Public (no authentication required)
- **Goals, Evaluators**: Admin, HR
- **Health Check**: Public (no authentication required)

---

## Notes

- All dates should be in `YYYY-MM-DD` format
- All timestamps are in IST (UTC+5:30)
- File uploads use multipart/form-data
- Maximum file upload size: 10MB
- Supported document formats: PDF, PNG, JPG, JPEG
- Document types supported: tenth, twelve, pan, adhar, grad, resume
- OTPs are valid for 10 minutes
- Password minimum length: 8 characters
- Leave status values: Pending, Approved, Rejected, Cancelled

---

**Generated**: 2025-12-30 19:51:00  
**Total Endpoints Documented**: 100+  
**Modules Covered**: 16

*This documentation is auto-generated by analyzing route and controller files. To update, run `/update-api-documentation` workflow.*
