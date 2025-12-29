# Migration Plan: Merge Root Repo with `hrms-backendPhase2-main 1`

## 1. Goal

- Combine the existing root repo (`hrms-flask`) and the code from `hrms-backendPhase2-main 1` into a **single repo**.
- **Do not preserve Git history** from `hrms-backendPhase2-main 1`.
- Integrate Phase 2 code into the **same branch** and align it with the existing folder structure of the root repo.

---

## 2. Preparation & Safety

1. **Backup both codebases**

   - Create safe copies of both directories:
     - `hrms-flask` → `hrms-flask-backup`
     - `hrms-backendPhase2-main 1` → `hrms-backendPhase2-main-1-backup`

2. **Ensure clean working tree in root repo**

   - In `hrms-flask`, commit or stash all changes so that:
     - `git status` shows no uncommitted changes.

3. **Decide high-level mapping of folders**

   - Compare folder structures of:
     - `hrms-flask`
     - `hrms-backendPhase2-main 1`
   - Decide how directories from Phase 2 map into the existing structure. Typical mappings (example):
     - `hrms-backendPhase2-main 1/app` → `hrms-flask/app`
     - `hrms-backendPhase2-main 1/templates` → `hrms-flask/templates`
     - `hrms-backendPhase2-main 1/static` → `hrms-flask/static`
     - `hrms-backendPhase2-main 1/migrations` → `hrms-flask/migrations`
   - Any top-level directories that **do not exist** in `hrms-flask` can be copied as new top-level directories.

---

## 3. Copy Non-Conflicting Content

1. **New, unique directories**

   - Identify directories in `hrms-backendPhase2-main 1` that are not present in `hrms-flask`.
   - Copy these directly into `hrms-flask` (e.g. `scripts/`, `docs/`, `tools/`, or any other unique directories).

2. **New files in existing directories**

   - For directories that exist in both repos (e.g. `app/`, `templates/`, `static/`, `tests/`):
     - Only copy files from Phase 2 that **do not already exist** in the corresponding root repo directory.
     - This minimizes conflicts and avoids overwriting existing functionality.

---

## 4. Handle Overlaps and Conflicts

When a file or directory exists in both repos, manual integration is required.

1. **Python packages / modules (e.g. Flask `app/` folder)**

   - For each overlapping Python file (e.g. `app/models.py`, `app/views.py`, blueprints, etc.):
     - Open the file from `hrms-flask` and the corresponding file from `hrms-backendPhase2-main 1` side by side.
     - Manually merge content:
       - Integrate new models, routes, services, and business logic from Phase 2 into the existing root file.
       - Do **not** blindly overwrite entire files from Phase 2 onto the root repo.
   - If Phase 2 introduces new blueprints or submodules:
     - Copy those Python packages into appropriate locations within `app/` (e.g. `app/phase2/` or a more specific feature-based module).

2. **Templates and static assets**

   - **Templates (`templates/`)**:
     - Copy any new templates that do not have a name clash.
     - If a template name exists in both repos:
       - Compare and decide whether to:
         - Merge template logic into a single file, or
         - Rename Phase 2 templates (e.g. `*_v2.html`) and update references accordingly.

   - **Static files (`static/`)**:
     - Copy new CSS/JS/images that dont already exist in `hrms-flask`.
     - If a static file name conflicts:
       - Compare contents.
       - Choose which version to keep, or rename one of them and update references.

3. **Configs and environment**

   - Merge configuration files such as:
     - `config.py`, `.env.example`, `.flaskenv`, or other environment/config files.
   - Add any new configuration values, environment variables, or feature flags required by Phase 2.
   - Ensure defaults are safe and backward compatible.

4. **Dependencies / requirements**

   - Merge `requirements.txt` (or equivalent):
     - Take the **union** of dependencies from both repos.
     - Avoid downgrading dependency versions from the root repo unless strictly necessary.
     - If version conflicts exist, resolve them consciously and test.

5. **Database and migrations**

   - If using Flask-Migrate/Alembic or similar:
     - Copy Phase 2 migration files (e.g. `migrations/versions/*`) into the root repos `migrations/versions/` directory.
     - Ensure migration revision IDs do not conflict.
     - Check migration dependencies (`down_revision`, etc.) and adjust if needed to create a valid chain.

---

## 5. Commit on the Same Branch

1. **Review changes**

   - In the `hrms-flask` root repo, verify changes using:
     - `git status`
     - `git diff`
   - Confirm that all added/modified files correspond to the intended Phase 2 integration.

2. **Create logical commits**

   - Commit changes on the existing branch (no new branch required unless desired):
     - Example commit messages:
       - `Integrate Phase 2 backend modules`
       - `Merge Phase 2 templates and static assets`
       - `Update configs and dependencies for Phase 2`

---

## 6. Validation & Cleanup

1. **Install / update dependencies**

   - Use the merged `requirements.txt` (or equivalent) to reinstall dependencies.
   - Ensure the environment is up to date with any new libraries needed by Phase 2.

2. **Run and test the application**

   - Start the Flask app from the merged root repo.
   - Verify:
     - Existing (pre-Phase 2) functionality still behaves correctly.
     - New Phase 2 features, endpoints, and flows work as expected.
   - Run any automated tests from both projects (now combined):
     - Unit tests
     - Integration tests
     - API tests, if present

3. **Remove redundant or obsolete files**

   - Clean up any leftover files that are now unused or duplicated:
     - Old or temporary config files.
     - Duplicated scripts superseded by unified versions.
   - Optionally remove or archive the standalone `hrms-backendPhase2-main 1` folder once confident in the merged setup.

---

## 7. Rollback Strategy

- If issues arise during or after the merge:
  - Restore from the directory backups:
    - `hrms-flask-backup/`
    - `hrms-backendPhase2-main-1-backup/`
  - Or, if commits were already made in the root repo and pushed:
    - Use `git revert` to undo specific commits.
  - If changes were only local:
    - Use `git reset --hard <last-good-commit>` to return to a known-good state.

This document describes the agreed migration approach: **no Git history preservation for `hrms-backendPhase2-main 1`**, integrate into the **same branch**, and align all Phase 2 code with the existing folder structure of the root `hrms-flask` repo.

---

## 8. Module-wise Migration from `hrms-backendPhase2-main`

This section breaks the migration down module by module based on the Phase 2 repo structure:

- `hrms-backendPhase2-main/app.py`
- `hrms-backendPhase2-main/extensions.py`
- `hrms-backendPhase2-main/email_service.py`
- `hrms-backendPhase2-main/scheduler_job.py`
- `hrms-backendPhase2-main/templates/`

Always migrate **one module at a time** and run tests / smoke tests after each module where possible.

### 8.1 Core app & initialization (`extensions.py`, `app.py`, `run.py`)

**Goal:** Move Phase 2 environment, DB, email, and scheduler setup into the existing `hrms-flask` app factory structure.

1. **Environment and DB configuration**
   - Compare Phase 2 `.env` and `extensions.py` with the root repo `.env` and `app/config.py`.
   - Add any **missing environment variables** from Phase 2 into the root `.env` (with appropriate values):
     - `PASSWORD`, `SERVER`, `USER_NAME`
     - `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_PASSWORD`, `TO_ADDRESSES`
   - Move the Phase 2 DB URI construction from `extensions.py` into `app/config.py` as a proper config option, reusing the existing configuration pattern (`config_by_name`).
   - Ensure `SQLALCHEMY_DATABASE_URI` in the root app points to the correct HRMS database with the same driver (e.g. `postgresql+psycopg2`).

2. **Email configuration**
   - Instead of reading `FROM_ADDRESS`, `FROM_PASSWORD`, `TO_ADDRESSES` directly in `extensions.py`, define these as config keys in `app/config.py`, e.g.:
     - `MAIL_DEFAULT_SENDER`
     - `MAIL_USERNAME`, `MAIL_PASSWORD`
     - `MAIL_RECIPIENTS_LEAVE_REPORT` (list or comma-separated string)
   - Update Phase 2 email-related logic to use `current_app.config[...]` via the existing `MailUtil` helper in `app/utils/mail_util.py` where possible.

3. **Scheduler integration (APScheduler)**
   - In Phase 2, the scheduler is initialized globally in `extensions.py` and used via `scheduler_job.py`.
   - In the merged app:
     - Create a dedicated module for scheduler setup, e.g. `app/extensions/scheduler.py` or `app/scheduler.py`.
     - Move the `APScheduler` initialization logic from `extensions.py` into that module as an `init_scheduler(app)` function.
     - Call `init_scheduler(app)` inside `create_app` in `app/__init__.py` so the scheduler is attached to the same Flask app instance used everywhere.

4. **Remove duplicate Flask app creation**
   - Phase 2 `extensions.py` creates its own `Flask(__name__)` instance.
   - In the merged code, **do not create a second Flask app**. Use the app returned from `create_app` in `app/__init__.py`.
   - Any Phase 2 code importing `from extensions import app, db, scheduler` should be refactored to use:
     - `from app import db` (or models/services that use `db`)
     - Scheduler via the new scheduler module hooked into `create_app`.

---

### 8.2 Scheduled leave email module (`email_service.py`, `scheduler_job.py`, related routes)

**Goal:** Integrate the leave-report email feature and its scheduled job into the root app using its existing utilities & config.

1. **Service layer for leave emails**
   - Create a new service module in the root repo, e.g. `app/services/leave_email_service.py`.
   - Move the `process_leave_email()` logic from Phase 2 `email_service.py` into this new service.
   - Replace the direct `smtplib` usage with calls to `MailUtil.send_email(...)` where practical, or at least centralize SMTP usage.
   - Ensure DB access uses the root repo’s `db` object (from `app/__init__.py`) and the same connection settings as other services.

2. **HTTP endpoints (if needed)**
   - In Phase 2, `app.py` exposes routes like `/api/leave-records-mail`.
   - In the root repo, decide which blueprint should own these endpoints (probably the existing `leave_bp` or a new specific blueprint, e.g. `leave_email_bp`).
   - Create a new route module such as `app/routes/leave_email.py` (or extend existing `leave.py`) and:
     - Import the new `leave_email_service`.
     - Expose endpoints that call into `process_leave_email()` or related helper functions.

3. **Scheduler job wiring**
   - Move Phase 2 job registration code from `scheduler_job.py` into the new scheduler module created in **8.1** or into the new `leave_email_service`:
     - Define a `register_jobs(scheduler, app)` function that:
       - Registers a daily cron job (e.g. `leave_email_daily` at 9:00)
       - Uses `with app.app_context(): process_leave_email()`
   - Call `register_jobs` during app initialization after the scheduler has been initialized.

---

### 8.3 Employee skills and related APIs (from `app.py`)

**Goal:** Extract Phase 2 skill-related endpoints and logic from the monolithic `app.py` into the root repo’s structured layers (routes, services, models).

1. **Identify skill-related functionality**
   - In Phase 2 `app.py`, locate:
     - Helper functions like `get_employee_skills()`.
     - Routes like `/api/employee-skills` and `/api/add-update-skills`.

2. **Create service module**
   - In the root repo, create a new service module, e.g. `app/services/skills_service.py`.
   - Move the DB queries and business logic that fetch/update skills into service functions here.
   - Prefer using SQLAlchemy models if available; otherwise, encapsulate raw SQL in this service.

3. **Create routes**
   - Add a new route module, e.g. `app/routes/skills.py`, or integrate into an existing related blueprint if appropriate.
   - Expose endpoints mirroring Phase 2 APIs:
     - `GET /api/employee-skills`
     - `POST /api/add-update-skills`
   - Wire these into a blueprint and register the blueprint in `create_app` (similar to how `account_bp`, `leave_bp`, etc. are registered).

4. **Validation and error handling**
   - Ensure request validation, error handling, and response formats match the patterns used in the root repo’s existing routes.
   - Reuse any shared schemas, DTOs, or helper functions if present.

---

### 8.4 Templates and assets (`templates/`)

**Goal:** Integrate Phase 2 templates and assets (e.g. relieving letter template and logo) into the root app’s template and static structure.

1. **Copy templates**
   - From Phase 2:
     - `templates/relieving_letter_template.html`
   - Copy into the root repo’s templates folder with a clear path, for example:
     - `app/templates/hr/relieving_letter_template.html` or `app/templates/letters/relieving_letter_template.html`
   - Update any code that renders this template (in the new services/routes) to use the correct path.

2. **Copy assets**
   - From Phase 2:
     - `templates/flairminds-logo.jpg` (currently in the templates folder)
   - Move this file into an appropriate static location in the root repo, e.g.:
     - `app/static/img/flairminds-logo.jpg`
   - Update the template(s) to reference the logo via `url_for('static', filename='img/flairminds-logo.jpg')` or the root repo’s existing static conventions.

3. **HTML/PDF generation flows**
   - Phase 2 imports libraries like `xhtml2pdf`, `num2words`, and uses Jinja2 templates for generating letters/documents.
   - In the root repo:
     - Create a new service module, e.g. `app/services/document_service.py`, to host the PDF and document generation logic.
     - Create corresponding routes in a new or existing blueprint (HR or documents-related) that call this service and return files/responses as needed.
   - Ensure any temporary file handling and cleanup follow the root repo’s patterns and security constraints.

---

### 8.5 Shared utilities and clean-up

**Goal:** Avoid duplication by consolidating shared utilities and removing now-redundant Phase 2 scaffolding.

1. **Mail utilities**
   - Where Phase 2 directly uses `smtplib` and raw MIME construction (e.g. in `app.py`, `email_service.py`):
     - Gradually refactor to use `MailUtil` and the root repo’s centralized mail configuration.

2. **Database access**
   - Ensure all Phase 2 logic uses the root `db` instance and connection settings, not a separate SQLAlchemy app.
   - If direct `db.engine.connect()` usage remains, encapsulate this in services and keep transactions well-defined.

3. **Remove obsolete Phase 2 scaffolding**
   - Once modules have been migrated into the root structure and verified:
     - Delete or archive the original Phase 2 files (`extensions.py`, `scheduler_job.py`, `email_service.py`, monolithic `app.py`).
     - Confirm that no code in the root repo imports from `hrms-backendPhase2-main` or its submodules anymore.
