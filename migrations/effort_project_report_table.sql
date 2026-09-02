-- Effort Analyser Report Migration
-- Run this script manually to create the effort project report table.
--
-- Persists task/timesheet data imported from the "Effort Analyser" Excel upload
-- (frontend/src/pages/Projects/EffortsAnalyser.jsx) so reports can be built from
-- the database instead of re-uploading the sheet every time.
--
-- Design: one row PER PROJECT, holding all of that project's tasks as a JSON
-- array (rather than one row per task). This keeps the shape flexible as the
-- source Excel's columns evolve, and makes "did anything change on re-upload"
-- a single-row read + JSON diff instead of a table scan.
--
-- Each element of the `tasks` JSON array is expected to look like:
--   {
--     "task_key": "TPAA-267",           -- unique within the array; diff key on re-import
--     "title": "...",
--     "workflow_state": "Done",
--     "assignee_name": "Lalit Jadhav",
--     "employee_id": "EMP0123" | null,  -- resolved HRMS employee_id, if matched
--     "start_date": "2026-08-18",
--     "end_date": "2026-08-18",
--     "estimate_hours": 2.0,
--     "logged_hours": 2.0,
--     "remaining_hours": 0.0,
--     "first_seen_at": "2026-08-27T10:00:00",
--     "updated_at": "2026-08-27T10:00:00"   -- bumped only when a field actually changes
--   }

CREATE TABLE IF NOT EXISTS effort_project_report (
    id                  SERIAL PRIMARY KEY,

    -- Resolved HRMS reference (nullable — a project name with no HRMS match is
    -- still stored under project_name, just unresolved)
    project_id          INTEGER       REFERENCES projects(project_id),
    project_name        VARCHAR(255)  NOT NULL UNIQUE,   -- one row per project; natural key

    tasks               JSON          NOT NULL DEFAULT '[]',
    task_count          INTEGER       NOT NULL DEFAULT 0,   -- denormalized len(tasks), for quick listing

    start_date          DATE,   -- MIN(start_date) across tasks
    end_date            DATE,   -- MAX(end_date) across tasks

    last_uploaded_at    TIMESTAMP,
    last_uploaded_by    VARCHAR(20)   REFERENCES employee(employee_id),
    source_file         VARCHAR(255),

    -- Standard audit / soft-delete columns (BaseModel / AuditMixin convention)
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(20),
    modified_at         TIMESTAMP,
    modified_by         VARCHAR(20),
    is_deleted          BOOLEAN       NOT NULL DEFAULT false,
    deleted_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_effort_project_report_project_id ON effort_project_report(project_id);
CREATE INDEX IF NOT EXISTS ix_effort_project_report_end_date    ON effort_project_report(end_date);
