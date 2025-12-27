# HRMS-LMS Flask Backend

A comprehensive Human Resource Management and Leave Management System ported from .NET Core to Python Flask. The application follows an MVC architecture and implements robust security and role-based access control.

## 🚀 Technology Stack
- **Framework**: Flask (Python)
- **Database**: SQL Server (via SQLAlchemy & pyodbc)
- **Authentication**: JWT (Flask-JWT-Extended)
- **Architecture**: MVC (Routes -> Controllers -> Services -> Models)
- **Deployment**: Docker, Docker Compose, Azure Pipelines

---

## 🏗 Project Structure
```
hrms-flask/
├── app/
│   ├── controllers/    # Request handling & response formatting
│   ├── models/         # SQLAlchemy database models
│   ├── routes/         # API endpoint definitions (Blueprints)
│   ├── services/       # Core business logic & DB operations
│   ├── utils/          # Helpers (Auth, Mail, OTP)
│   ├── config.py       # App configuration
│   └── auth_config.py  # RBAC permission mapping
├── requirements.txt    # Dependencies
├── Dockerfile          # Multi-stage production build
└── run.py              # Application entry point
```

---

## 📦 Modules & Logic

### 1. Account Module
Handles user identity and access management.
- **Login**: Validates credentials against the `Employees` table.
- **JWT Issuance**: Generates secure tokens with role claims upon successful login.
- **OTP Subsystem**: Generates and sends 6-digit numeric OTPs via email for password resets (10-minute expiry).
- **Password Reset**: Securely updates passwords after OTP verification.
- **Employment Status Gatekeeping**: Prevents login for employees marked as "Relieved" or "Absconding".

### 2. Leave Module
Manages the end-to-end leave lifecycle.
- **Leave Application**: Supports multiple leave types and captures handover instructions.
- **Complex Entitlements**: Logic for specialized categories like Comp-Off and Customer Holidays.
- **Approval Workflow**: Routes requests to the assigned `LeaveApprover`.
- **Leave Balance Engine**: Consumes stored procedures to calculate real-time balances and history.
- **Holiday Management**: Centralized repository for active organizational holidays.

### 3. HR Functionality Module
Administrative tools for employee management.
- **Employee Directory**: Listing and advanced search of organizational personnel.
- **Profile Upsertion**: Unified logic for creating and updating comprehensive employee records.
- **Reporting**: Generates administrative monthly reports via SQL stored procedures.
- **Project Tracking**: Management of internal and client projects.

### 4. Asset & Inventory Module
Tracks company-owned hardware and peripherals.
- **Hardware Registry**: CRUD operations for PCs and systems.
- **Asset Assignment**: Maps physical hardware to specific employees.
- **Maintenance Logging**: Tracks service history, costs, and service centers for every asset.

### 5. Employee Self-Service (Profile) Module
Allows employees to manage their own data.
- **Profile View**: Aggregates personal details, skills, and addresses.
- **Self-Update**: Enables employees to keep their contact and emergency information current.
- **Leave Cancellation**: Allows users to retract pending or approved leave requests.

### 6. Performance & Feedback Module
Facilitates employee growth and performance tracking.
- **JSON Data Storage**: Goals, measures, and comments are stored as complex JSON blobs for flexibility.
- **Performance Reporting**: Retrieves historical feedback and progress reports for individuals.
- **Feedback Management**: Allows Leads and Admins to record performance reviews.

---

## ⚙️ Detailed Configuration Spec

The application uses a multi-layered configuration strategy involving environment variables, Python classes, and a central RBAC config.

### 1. Environment Variables (`.env`)
Required for connectivity and security:
| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection string (pyodbc) | `mssql+pyodbc://user:pass@host/DB?driver=...` |
| `SECRET_KEY` | Flask session & general encryption key | `a-very-long-random-string` |
| `JWT_SECRET_KEY`| Key used for signing JWT tokens | `another-secure-random-string` |
| `MAIL_SERVER` | SMTP server for notifications | `smtp.gmail.com` |
| `MAIL_USERNAME` | Email account for sending OTPs | `hr@company.com` |
| `MAIL_PASSWORD` | App-specific password for the email account | `xxxx xxxx xxxx xxxx` |

### 2. Role-Based Access Control (`app/auth_config.py`)
Permissions are defined in a central dictionary `ROLE_PERMISSIONS`. 
- **Granular Control**: Can define permissions at the Blueprint level (e.g., `"hr": ["Admin", "HR"]`) or the Endpoint level (e.g., `"leave": {"update_status": ["Admin", "HR"]}`).
- **Middleware**: The `@roles_required` decorator extracts the `role` claim from the JWT and validates it against this map before executing any controller logic.

---

## 🏢 Business Logic Overview

### User Access & Security Rules
- **Access Control**: The system automatically restricts access based on an employee's status. If an employee is marked as "Relieved" or "Absconding", they are immediately barred from logging into the portal, ensuring only active staff can access internal data.
- **Secure Password Recovery**: When a user forgets their password, the system generates a temporary security code (OTP) and sends it to their registered corporate email. This code has a strict 10-minute validity window to ensure the recovery process remains secure.

### Leave & Time-Off Management
- **Accurate Balance Tracking**: The system calculates leave balances by considering historical records, approved requests, and employee seniority. This ensures that the balance shown to the employee is always their current, real-time entitlement.
- **Complex Leave Rules**: The portal handles special leave scenarios, such as "Comp-Off" (compensatory time off for extra work) and "Customer Holidays" (aligning with client calendars). These requests follow specific validation rules before they can be submitted for approval.
- **Unified Transactions**: When applying for leave, the system ensures that the main request and any associated details (like specific holiday alignments) are processed together as a single, consistent action.

### Performance & Goal Tracking
- **Flexible Goal Setting**: The performance module allows managers to set varying numbers of goals and success measures for each employee. Instead of a rigid form, the system adapts to the specific needs of the department or role, allowing for personalized performance evaluation.
- **Historical Feedback**: The system maintains a permanent record of all performance discussions and comments, allowing for longitudinal progress tracking over multiple review cycles.

### HR Management & Data Integrity
- **Centralized Profile Management**: HR can create or update employee records from a single interface. The system intelligently detects if an employee already exists and updates their existing record instead of creating duplicates, maintaining a "single source of truth" for all staff data.
- **Integrated Reporting**: Monthly administrative reports are generated by aggregating attendance, employee status, and role information, providing HR with a ready-to-use summary of the corporate workforce.

---

## 🛠 Setup & Execution
1. **Environment**: Configure `.env` based on the template.
2. **Local Run**: 
   ```bash
   pip install -r requirements.txt
   python run.py
   ```
3. **Docker**:
   ```bash
   docker-compose up --build
   ```

---

## 🧪 Testing
The project includes a comprehensive test suite using `pytest`.
- **Run Tests**:
  ```bash
  cd hrms-flask
  pytest
  ```
- **Coverage**: Includes Account authentication, Leave management, HR admin tools, and RBAC middleware validation.
