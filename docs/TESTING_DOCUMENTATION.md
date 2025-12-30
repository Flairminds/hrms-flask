# HRMS-LMS Testing Documentation

This document outlines the comprehensive test suite for the HRMS-LMS Flask application. It defines the positive and negative scenarios, business logic validations, and security checks that form the basis of the implementation.

---

## 🧪 Testing Strategy
- **Framework**: `pytest`
- **Isolation**: All tests use **Mocking** for the database (`SQLAlchemy`) and utility layers (`MailUtil`) to ensure they are hermetic and don't require external dependencies.
- **Coverage**: Every endpoint is tested for response codes, data integrity, and role-based permissions.

---

## 🔑 Account Module Tests

### 1. User Login (`/api/account/login`)
| Type | Scenario | Expected Result |
| :--- | :--- | :--- |
| **Positive** | Valid Username & Password for Active employee | `200 OK`, Return JWT & user details |
| **Negative** | Invalid Username or Password | `401 Unauthorized`, Error message |
| **Negative** | Empty request body | `400 Bad Request` |
| **Gatekeep** | Login for employee with status "Relieved" | `401 Unauthorized`, "Employee is Relieved" |
| **Gatekeep** | Login for employee with status "Absconding" | `401 Unauthorized`, "Employee is Absconding" |

### 2. OTP Subsystem (`/api/account/send-otp`, `verify-otp`)
| Type | Scenario | Expected Result |
| :--- | :--- | :--- |
| **Positive** | Request OTP for existing username | `200 OK`, Mail sent, OTP saved |
| **Negative** | Request OTP for non-existent username | `404 Not Found` |
| **Positive** | Verify correct & non-expired OTP | `200 OK`, "Verified successfully" |
| **Negative** | Verify incorrect OTP | `400 Bad Request`, "Invalid or expired" |
| **Negative** | Verify expired OTP (Internal logic test) | `400 Bad Request` |

---

## 📅 Leave Module Tests

### 1. Endpoint: `/leave-types-and-approver`
| Type | Scenario | Expected Result |
| :--- | :--- | :--- |
| **Positive** | Valid EmployeeId with Auth token | `200 OK`, List types & approver |
| **Negative** | Missing Auth token | `401 Unauthorized` |
| **Negative** | Missing EmployeeId param | `400 Bad Request` |

### 2. Endpoint: `/insert-leave-transaction`
| Type | Scenario | Expected Result |
| :--- | :--- | :--- |
| **Positive** | Valid leave data from Employee | `201 Created`, Success message |
| **Negative** | Invalid date range (In logic / Mocked result) | `500 Internal Error` |
| **Validation**| Missing required fields (In logic / service) | `400/500 depending on DB constraint` |

---

## 👥 HR & Admin Functionality Tests

### 1. Role-Based Access Control (RBAC)
| Endpoint | Role | Expected Result |
| :--- | :--- | :--- |
| `/api/hr-functionality/get-all-employees` | Admin / HR | `200 OK` |
| `/api/hr-functionality/get-all-employees` | Employee | `403 Forbidden` |
| `/api/hr-functionality/upsert-employee` | HR | `200 OK` |
| `/api/hr-functionality/upsert-employee` | Lead | `403 Forbidden` |

### 2. Data Integrity
| Scenario | Logic | Expected Result |
| :--- | :--- | :--- |
| **Upsert (New)** | EmployeeId doesn't exist | Create new record, return ID |
| **Upsert (Update)**| EmployeeId exists | Update existing record, return ID |

---

## 💻 Asset & Inventory Tests

### 1. Assignments (`/api/assignments`)
| Type | Scenario | Expected Result |
| :--- | :--- | :--- |
| **Positive** | Assign valid PCID to valid EmployeeID | `201 Created` |
| **Negative** | Missing PCID or EmployeeID in request | `400 Bad Request` |
| **Negative** | Employee role attempting assignment | `403 Forbidden` |

---

## 📈 Performance & Feedback Tests

### 1. FeedBack Loop (`/api/lead-functionality/add-emp-report`)
| Type | Scenario | Expected Result |
| :--- | :--- | :--- |
| **Positive** | Lead submitting valid feedback (JSON blobs) | `201 Created` |
| **Negative** | Employee attempting to submit feedback | `403 Forbidden` |
| **Negative** | Missing mandatory `EmployeeId` | `400 Bad Request` |

---

## 👤 Profile (Self-Service) Tests

### 1. My Profile (`/api/employees-details/<emp_id>`)
| Type | Scenario | Expected Result |
| :--- | :--- | :--- |
| **Positive** | Employee viewing their own ID | `200 OK` |
| **Negative** | Accessing non-existent ID | `404 Not Found` |

---

## 🔄 CI/CD Testing Pipeline
1. **GitHub Actions**:
   - Job `test`: Runs `pytest`.
   - Job `deploy`: `needs: test`. Only runs if all tests pass.
2. **Azure DevOps**:
   - Stage `Test`: Runs `pytest`.
   - Stage `Build`: `dependsOn: Test`. Only builds image if successful.
