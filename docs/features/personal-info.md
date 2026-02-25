# Personal Info Module

The **Personal Info** module is the employee's self-service profile page within the HRMS. It gives every employee a comprehensive view of their own data — including personal details, addresses, uploaded HR documents, and account security settings — and allows them to keep that data up to date without HR intervention.

---

## Table of Contents

1. [Access & Roles](#access--roles)
2. [Page Overview](#page-overview)
3. [Features](#features)
   - [Profile Header & Photo Upload](#1-profile-header--photo-upload)
   - [Profile Completion Tracker](#2-profile-completion-tracker)
   - [Personal Details Card](#3-personal-details-card)
   - [Documents Card](#4-documents-card)
   - [Address Cards](#5-address-cards)
   - [Emergency Contact Card](#6-emergency-contact-card)
   - [Edit Profile Modal](#7-edit-profile-modal)
   - [Missing Information Alerts](#8-missing-information-alerts)
   - [Salary Slip Download (Hidden/Legacy)](#9-salary-slip-download-hiddenlegacy)
4. [Backend API Reference](#backend-api-reference)

---

## Access & Roles

| Feature | Employee (Self) | Team Lead | HR / Admin |
|---------|:--------------:|:---------:|:----------:|
| View own profile | ✅ | ✅ | ✅ |
| Upload / change profile photo | ✅ | ✅ | ✅ |
| View personal details (read-only fields) | ✅ | ✅ | ✅ |
| Edit contact info, emergency contact, qualification | ✅ | ✅ | ✅ |
| Edit residential & permanent address | ✅ | ✅ | ✅ |
| Upload HR documents | ✅ | ✅ | ✅ |
| Download / preview own documents | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ |
| View profile completion % | ✅ | ✅ | ✅ |
| View missing-info warning banner | ✅ | ✅ | ✅ |

> **Note:** All features on this page are scoped to the currently logged-in employee. HR/Admin can manage other employees' details via the HR module, not this page.

---

## Page Overview

**Route / Component:** `frontend/src/pages/PersonalInfoPage/PersonalInfoPage.jsx`

The page loads automatically with data from the logged-in user's session (`AuthContext`). On mount it calls four APIs in parallel:

- Employee profile details
- Profile completion percentage
- Document upload status (summary)
- Document upload status (detailed)

---

## Features

### 1. Profile Header & Photo Upload

**What it does:** Displays the employee's avatar, full name, employment status tag, role tag, sub-role/designation tags, company email, and phone number.

**What users can do:**
- Click the avatar to open a file picker and upload a new profile photo.
- Valid formats: **JPG, PNG, WEBP** — max size **300 KB**.
- After a successful upload, the avatar updates immediately (page data is refreshed).

**Who has access:** Every logged-in user for their own profile.

**API called:**
```
POST /api/employees-details/upload-profile-image/{employeeId}
Content-Type: multipart/form-data
```

---

### 2. Profile Completion Tracker

**What it does:** Shows a horizontal progress bar with a percentage score indicating how complete the employee's profile is. The bar colour changes based on progress:

| Range | Colour |
|-------|--------|
| 0–49% | Red |
| 50–79% | Amber/Yellow |
| 80–100% | Green |

**What users can do:**
- Hover over the progress bar to see a tooltip listing the missing fields (e.g., `"Missing: contact_number, personal_email"`).
- Click **Edit Profile** to open the edit modal and fill in the missing information.

**Who has access:** Every logged-in user.

**API called:**
```
GET /api/employees-details/profile-completion/{employeeId}
```
Response: `{ completion_percentage: number, missing_fields: string[] }`

---

### 3. Personal Details Card

**What it does:** Displays a read-only summary of the employee's core personal information.

| Field | Notes |
|-------|-------|
| Employee ID | System-generated, read-only |
| First / Middle / Last Name | Set by HR, read-only |
| Date of Birth | Set by HR, read-only |
| Gender | Set by HR, read-only |
| Blood Group | Set by HR, read-only |
| Personal Email | Editable via Edit Profile |
| Date of Joining | Set by HR, read-only |
| Band (Designation) | Set by HR, read-only |
| Highest Qualification | Editable via Edit Profile |
| Qualification Date (Year-Month) | Editable via Edit Profile |
| Full Stack Ready | Fetched from Skills service, indicates Level 1+ readiness |

**Who has access:** Every logged-in user (view only on this card).

**API called:**
```
GET /api/hr/employee-details/{employeeId}
GET /api/skills/employee-skills/{employeeId}   (for Full Stack Ready & Qualification Date)
```

---

### 4. Documents Card

**What it does:** Lists the seven required HR documents with upload/download/preview actions for each.

**Supported document types:**

| Key | Label |
|-----|-------|
| `tenth` | 10th Marksheet |
| `twelve` | 12th Marksheet |
| `adhar` | Aadhar Card |
| `pan` | Pan Card |
| `grad` | Graduation Degree |
| `resume` | FM Resume |
| `medical_certificate` | Medical Certificate |

**What users can do:**
- See the upload status of each document: **Uploaded** (green) or **Pending** (red).
- **Download** a document — saves as `FirstName_LastName_<docType>.pdf/docx`.
- **Preview** a document — opens in a new browser tab.
- Download/Preview buttons are disabled if the document has not been uploaded yet.

> Documents can also be uploaded from within the **Edit Profile** modal (Documents tab).

**Who has access:** Every logged-in user for their own documents.

**APIs called:**
```
GET /api/documents/document-status/{employeeId}         (summary status)
GET /api/documents/document-status-details/{employeeId} (detailed per-document status)
GET /api/documents/get-document/{employeeId}/{docType}  (download/preview, responseType: blob)
```

---

### 5. Address Cards

**What it does:** Shows two separate address cards side-by-side:

- **Residential Address** — current place of residence (Address Line 1 & 2, City, State, Zipcode)
- **Permanent Address** — permanent / home address (same fields)

**What users can do:** View their addresses. Edit them via the **Edit Profile** modal > **Addresses** tab.

**Who has access:** Every logged-in user.

---

### 6. Emergency Contact Card

**What it does:** Shows the emergency contact details: contact person name, relationship, and phone number.

**What users can do:** View the data. Edit it via the **Edit Profile** modal > **Personal Info** tab.

**Who has access:** Every logged-in user.

---

### 7. Edit Profile Modal

Opened by clicking the **Edit Profile** button on the profile header card.  
**Component:** `frontend/src/components/modal/editPersonalDetails/EditPersonalDetails.jsx`

The modal contains **four tabs**:

---

#### Tab 1 — Personal Info

**Read-Only Section (cannot be changed here):**
- Employee ID, Company Email, First / Middle / Last Name, Date of Birth, Gender

**Editable Fields:**
| Field | Validation |
|-------|-----------|
| Contact Number | Required |
| Personal Email | Must be a valid email format |
| Emergency Contact Person | — |
| Emergency Contact Relation | — |
| Emergency Contact Number | Must differ from Contact Number |
| Highest Qualification | — |
| Qualification Year–Month | Date picker (month-year) |
| Full Stack Ready? | Checkbox — indicates Level 1+ readiness |

**Save:** Click **Update All**. Calls:
```
PUT /api/employees-details/update-employee-details-by-self/{employeeId}
Body: { contact_number, emergency_contact_person, emergency_contact_relation,
        emergency_contact_number, personal_email, highest_qualification,
        qualification_year_month, addresses: [...] }
```

---

#### Tab 2 — Addresses

**Residential Address fields:** Address Line 1, Line 2, City, State, Zipcode

**Permanent Address fields:** Address Line 1, Line 2, City, State, Zipcode
- **"Same as Residential" checkbox** — when checked, permanently auto-fills all permanent address fields with the residential values and disables those inputs.

**Save:** Click **Update All** (saves together with personal info in a single API call).

---

#### Tab 3 — Documents

Mirrors the Documents card on the main page, but **also allows uploading or replacing documents**.

**What users can do:**
- See the current status (Uploaded / Pending) for each document.
- **Upload** a new document (if not yet uploaded).
- **Update** an existing document (replace current file).
- **Download** or **Preview** uploaded documents.

**Allowed file types for upload:** PDF, DOCX, DOC  
**Max size:** Enforced by the backend.

**API called for upload:**
```
POST /api/documents/upload-document
Content-Type: multipart/form-data
Fields: emp_id, doc_type, file
```

---

#### Tab 4 — Security (Change Password)

**What users can do:** Change their HRMS account password.

**Fields:**
| Field | Rule |
|-------|------|
| Current Password | Required |
| New Password | Required, minimum 8 characters |
| Confirm New Password | Must match New Password |

**Save:** Click **Update Password** (footer button changes when this tab is active). Calls:
```
POST /api/account/change-password
Body: { currentPassword, newPassword }
```

---

### 8. Missing Information Alerts

If an employee has not completed all required profile fields, a warning banner appears at the top of the page.

| State | Banner Colour | Message |
|-------|:-------------:|---------|
| `countPersonalInfo` ≤ 3 (attempts remaining) | Yellow | Shows number of attempts left; warns that features will be restricted after limit. |
| `countPersonalInfo` > 3 (attempts exhausted) | Red | Access to certain HRMS features is blocked; employee must fill in missing info. |

The same information is also shown in a **Missing Information Modal** (non-dismissible) that can appear on load to ensure employees see the warning prominently.

> Account blocking deadline (as coded): **19 June 2025**

---

### 9. Salary Slip Download (Hidden/Legacy)

A salary slip download flow exists in the codebase but is **currently commented out / hidden** from the UI (the button is commented out).  

When active, it would have shown a 3-step modal:
1. **Login** — re-authenticate with username/password.
2. **Verification** — confirms credential match with the session employee ID.
3. **Download** — select month/year; salary slip is sent via **email** (not direct download).

**API called (when active):**
```
POST https://salary-slip-backend.azurewebsites.net/api/download_employee_details_email
Body: { employee_id, month, year }
```

---

## Backend API Reference

| Method | Endpoint | Controller | Description |
|--------|----------|-----------|-------------|
| `GET` | `/api/hr/employee-details/{empId}` | `HRController` | Fetch full employee profile data |
| `GET` | `/api/employees-details/profile-completion/{empId}` | `ProfileController.get_profile_completion` | Get profile completion % and missing fields |
| `POST` | `/api/employees-details/upload-profile-image/{empId}` | `ProfileController.upload_profile_image` | Upload/replace profile photo |
| `PUT` | `/api/employees-details/update-employee-details-by-self/{empId}` | `ProfileController.update_profile_self` | Employee self-updates contact, address, qualification |
| `GET` | `/api/documents/document-status/{empId}` | `DocumentController.document_status` | Summary upload status for all 7 docs |
| `GET` | `/api/documents/document-status-details/{empId}` | `DocumentController` | Detailed per-document status (uploaded + verified flags) |
| `GET` | `/api/documents/get-document/{empId}/{docType}` | `DocumentController.get_document` | Download/preview a document (returns blob) |
| `POST` | `/api/documents/upload-document` | `DocumentController.upload_document` | Upload or replace an HR document |
| `POST` | `/api/account/change-password` | `AccountController` | Change logged-in user's password |
| `GET` | `/api/skills/employee-skills/{empId}` | `SkillsController` | Fetch Full Stack Ready flag & qualification date |

---

*Last updated: February 2026*
