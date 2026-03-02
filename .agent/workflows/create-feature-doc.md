---
description: Generate detailed feature documentation for a given HRMS module under docs/features/
---

# Create Feature Documentation for a Module

Given a module name (e.g., "Leave Management", "Personal Info", "Capability Development"), produce a comprehensive feature doc and save it to `docs/features/<module-slug>.md`.

## Steps

1. **Identify source files** for the module:
   - Find the main frontend page component in `frontend/src/pages/` (look for a folder or file matching the module name).
   - Find all modal components imported or used by that page (usually in `frontend/src/components/modal/`).
   - Find the relevant backend controller(s) in `app/controllers/`.
   - Find relevant API function exports in `frontend/src/services/api.jsx` for this module.

2. **Read and understand** the following from the source files:
   - All UI sections rendered on the page (cards, tables, tabs, etc.).
   - All modals, their tabs/steps, and the fields within them (editable vs. read-only).
   - All frontend functions: what they do, which API they call.
   - All backend controller methods: endpoint path, HTTP method, request/response shape.
   - Role-based access: check for role guards (`user?.roleName`, `user?.roleId`, HR/Admin checks) to determine who can see or use each feature.

3. **Ensure the `docs/features/` folder exists** (create it if not).

4. **Write the documentation** to `docs/features/<module-slug>.md` using the following structure:

```
# <Module Name> Module

Brief description of the module's purpose.

---

## Table of Contents
(link to each section)

---

## Access & Roles
Markdown table: Feature | Employee | Team Lead | HR/Admin  (use ✅ / ❌)

---

## Page Overview
Route/component path. Brief description of what loads on mount.

---

## Features

### 1. <Feature Name>
- **What it does:** …
- **What users can do:** bullet list of user actions
- **Who has access:** which roles
- **API called:** code block with method + endpoint + key request/response fields

(repeat for each distinct feature / section / modal tab)

---

## Backend API Reference
Markdown table: Method | Endpoint | Controller Method | Description
```

5. **Output:** Confirm the file path created and give the user a brief summary of what was documented.

## Notes
- The output file must be named using kebab-case of the module name, e.g., `leave-management.md`.
- Read-only fields (set by HR, not editable by the employee) must be clearly marked in the docs.
- If a feature is commented out or hidden in the UI, note it as **Hidden/Legacy**.
- Skills/Capability data that was moved from one module to another should be noted.
- Always include a "Last updated" line at the bottom with the current date.
