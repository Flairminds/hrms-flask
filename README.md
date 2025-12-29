# HRMS-LMS Flask Backend

A comprehensive Human Resource Management (HRM) and Leave Management System (LMS) with full resource allocation, performance tracking, and document lifecycle management.

## 🚀 Technology Stack
- **Framework**: Flask 3.0 (Python)
- **Database**: PostgreSQL (via SQLAlchemy 2.0 & psycopg2)
- **Authentication**: JWT (Claims-based roles)
- **Background Tasks**: APScheduler (Distributed cron for automated reports)
- **Document Generation**: xhtml2pdf (Dynamic PDF rendering with Jinja2)
- **Architecture**: MVC (Routes -> Controllers -> Services -> Models)
- **Logic Mapping**: Centralized RBAC in `app/auth_config.py`

---

## 🏗 Project Architecture & Structure
```
hrms-flask/
├── app/
│   ├── routes/         # API Blueprints (Grouped by functional component)
│   ├── controllers/    # Request orchestration & JSON response formatting
│   ├── services/       # Core Business Logic Layer (Separated from DB/Transports)
│   ├── models/         # SQLAlchemy ORM and direct SQL execution wrappers
│   ├── templates/      # Branded HTML templates for Relieving Letters & Email
│   ├── static/         # Brand assets (Signatures, Corporate Logos)
│   ├── utils/          # Middleware (RBAC decorators, Mail utilities, JWT helpers)
│   ├── config.py       # Global settings, Feature flags, & Scheduler hooks
│   └── auth_config.py  # Critical Role-to-Route permission matrix
├── tests/              # Full test coverage suite
└── run.py              # Central entry point
```

---

## 📦 Module-wise Business Logic & Technical Specs

### 1. Account & Identity Management Module
Handles the core security backbone, role-based identity, and credential recovery.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/account.py` under the prefix `/account`.
- **Controllers**: Logic orchestrated by `AccountController` in `app/controllers/account_controller.py`.
- **Services**: Data-heavy operations isolated in `AccountService`.
- **Models**: 
    - `Employee`: Tracks `EmploymentStatus`, `Password`, and `EmployeeRole`.
    - `OTPRequest`: Tracks recovery state including `ExpiryTime` and `IsVerified`.

#### **Business Logic & Rules**
- **Multi-Identifier Login**: Authenticate using **Employee ID** or **Corporate Email Address**.
- **Security Guardrails**: Logins for employees marked as **"Relieved"** or **"Absconding"** are blocked at the service level.
- **OTP Lifecycle**:
    - **Atomicity**: One active OTP per user.
    - **Volatility**: 10-minute TTL.
    - **Verification State**: Sequential flow (Verify -> Reset). Successful resets purge the OTP record.

---

### 2. Organizational Management (HR) Module
Administrative module for employee lifecycle and organizational data directory.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/hr.py`.
- **Legacy Logic**: Executes complex stored procedures for payroll and monthly reporting.

#### **Business Logic & Rules**
- **Master Employee Registry**: Joins `Employees` and `EmployeeRole` for hierarchical lookup.
- **Payroll Sync**: Executes `EXEC GetMonthlyReport @Month, @Year` for monthly billing cycles.
- **Administrative Quality Gates**: HR holds exclusive rights to `upsert-employee` for sensitive PII changes.

---

### 3. Project Management & Staffing
The central directory for organizational initiatives and staffing requirements.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/project.py`.
- **Registry**: Managed via the `ProjectList` table.

#### **Business Logic & Rules**
- **Staffing Intent**: Uses a `Required` flag to signal active resource demand.
- **Temporal Lifecycle**: `EndDate` tracking prevents allocation to completed projects.

---

### 4. Resource Allocation & Project Mapping
Optimizes workforce loading and utilization tracking.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/allocation.py`.
- **Services**: Uses raw SQL for atomic performance in the `EmployeeAllocations` junction table.

#### **Business Logic & Rules**
- **Categorical Assignment**: Mapping via `WorkCategoryID` (Dev, QA, Management).
- **Capacity Loading**: Supports **Decimal Allocation** (e.g., 0.4 Load), allowing resource sharing across multiple projects.
- **Data Integrity**: Forced whitespace-sanitization for IDs to ensure referential integrity.

---

### 5. Leave & Attendance Management Module
Governs time-off, automated daily pulses, and entitlement tracking.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/leave.py`.
- **Scheduler**: `APScheduler` triggers daily automated HTML email reports.

#### **Business Logic & Rules**
- **Entitlement Parity**: Fetches CL/SL/PL balances via legacy `.NET` stored procedures (`GetLeaveDetailsByEmployeeIdv2`).
- **Comp-Off Atomic Bundling**: Child `CompOffTransactions` are flushed concurrently with the parent `LeaveTransaction`.
- **Daily Automated Pulse**: Broadcasts approved leaves to management distribution lists at 8 AM and 9 AM.

---

### 6. Asset & Inventory Control Module
Hardware lifecycle management and TCO (Total Cost of Ownership) tracking.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/assets.py`.
- **Models**: `PC`, `Peripheral`, `AssetAssignment`, and `MaintenanceLog`.

#### **Business Logic & Rules**
- **Active Lifecycle**: Logical deletion via `IsActive` preserves historical assignment audits.
- **Maintenance Auditing**: Polymorphic logging captures service costs for both laptops and auxiliary hardware.
- **Assignment Lifecycle**: Tracks physical possession from `AssignmentDate` to `ReturnDate`.

---

### 7. Policy & Compliance Module
Mandatory acknowledgement flows and disciplinary tracking.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/policy.py`.
- **Audit Table**: `EmployeePolicyAcknowledgementStatus`.

#### **Business Logic & Rules**
- **6-Point Policy Matrix Matrix**: Tracks Leave, WFH, Exit, Salary, Probation, and Appraisal acknowledgements.
- **Compliance Triggers**: Completion of the full suite triggers a formal email to HR.
- **Warning Engine**: Tracks a quantitative `WarningCount` per employee.

---

### 8. Profile "Quality Gate" Module
Employee self-service and data completeness enforcement.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/profile.py`.
- **Audit Logic**: `ProfileService.get_complete_employee_details`.

#### **Business Logic & Rules**
- **10-Point Health Check**: Profiles remain "Incomplete" until Identity, Emergency, Competency, Residency, and Documents (6/6) are verified.
- **Address Versioning**: Uses a `counter` field in `EmployeeAddress` to track PII volatility.

---

### 9. Capability & Lead Management Module
Technical supervision and professional growth hierarchy.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/capability.py`.

#### **Business Logic & Rules**
- **CDL Status**: Unique mapping; prevents an employee from being promoted to a Lead multiple times.
- **Cascaded Cleanup**: Revoking a Lead role automatically purges dependent employee assignments.

---

### 10. Skills Management & Taxonomy Module
Competency dictionary and individual proficiency mapping.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/skills.py`.

#### **Business Logic & Rules**
- **3-Tier Taxonomy**: Segregates skills into **Primary**, **Secondary**, and **Cross-Tech**.
- **The "Billing Ready" Pulse**: Toggles `isReady` flags to signal project preparedness.
- **Full-Stack Preparedness**: Dedicated metric for end-to-end delivery capability.

---

### 11. Evaluators & Skill Performance
The objective evaluation system for technical skills.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/evaluators.py`.

#### **Business Logic & Rules**
- **Evidential Scoring**: Explicit policy that scores lacking interview/test evidence are subject to dismissal.
- **Reminder Engine**: Asynchronous HTML email reminders for pending assessments.

---

### 12. Review & Multi-Source Feedback
Certification of technical competency by organizational leaders.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/review.py`.

#### **Business Logic & Rules**
- **Assigned Evaluator Security**: Reviews are blocked unless a formal Lead-Employee bond exists in the registry.
- **Atomic Skill Injection**: Evaluators can add missing skills to profiles during active reviews.
- **Consensus Storage**: Stores Evaluator scores independently of employee self-evaluations.

---

### 13. Performance Goals & Feedback
Forward-looking growth tracking with data flexibility.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/goals.py` & `app/routes/feedback.py`.

#### **Business Logic & Rules**
- **JSON-Blob Architecture**: `Goals` and `Measures` are stored as JSON strings to avoid rigid schema constraints.
- **Temporal Enforcement**: Target dates must be in the future; deduplication rules prevent duplicate active goals.

---

### 14. HR, Relieving & Document Lifecycle (Exit Process)
Formal offboarding and sensitive document management.

#### **Technical Implementation**
- **Blueprints**: Defined in `app/routes/documents.py`.
- **Engines**: `xhtml2pdf` (PDF) and `num2words` (Finance).

#### **Business Logic & Rules**
- **Relieving Engine**: Converts numeric salaries to words and dispatches TLS-secured PDFs to personal emails.
- **3-Tier Document State Machine**:
    - **Pending**: Uploaded, unverified.
    - **Accepted**: Verified.
    - **Rejected**: **Critical Purge Logic** follows; the binary blob is immediately deleted from the DB to ensure PII safety.

---

## ⚙️ Configuration Matrix (`.env`)
| Variable | Logic Purpose |
| :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connector for PostgreSQL |
| `JWT_SECRET_KEY` | Token signing secret |
| `MAIL_SERVER` / `PORT` | SMTP connectivity for OTPs and Reports |
| `REPORT_TO_ADDRESSES`| Target recipients for automated daily summaries |
| `UPLOAD_FOLDER` | Root for PDF generation and document uploads |
| `SECRET_KEY` | Flask session and secure cookie signing |
