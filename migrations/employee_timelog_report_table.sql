-- Timesheet Analyser Report Migration
-- Run this script manually to create the employee timelog report table.
--
-- Persists individual log entries imported from the "Timesheet Analyser" Excel
-- upload (frontend/src/pages/Projects/TimesheetAnalyser.jsx) so reports can be
-- built from the database instead of re-uploading the sheet every time.
--
-- Design: one row PER EMPLOYEE PER CALENDAR MONTH, holding all of that
-- employee's log entries for the month as a JSON array (rather than one row
-- per entry). Employee identity is the Excel's "Author" column (who logged
-- the time), NOT "Primary Assignee" (who the task is assigned to). The month
-- is derived from each entry's own "Date" column (the day the time was
-- logged), not the task's Start/End Date. This keeps the shape flexible as
-- the source Excel's columns evolve, and makes "did anything change on
-- re-upload" a single-row read + JSON diff instead of a table scan.
-- Re-uploading a past sheet is expected: entries are deduplicated within the
-- month by the Excel's own "Id" column, so re-importing the same rows
-- updates them in place instead of duplicating them.
--
-- Each element of the `timelog` JSON array is expected to look like:
--   {
--     "id": "005a780168",             -- Excel "Id" column; unique key within the array
--     "author": "Ahiresh Gaik",
--     "primaryAssignee": "Ahiresh Gaik",
--     "workflowState": "Done",
--     "title": "Internal meeting",
--     "project": "FM Internal",
--     "key": "FM-Project-6",          -- task ticket key
--     "description": "Bi-weekly leadership sync",
--     "startDate": "2026-08-03",      -- task start date
--     "endDate": "2026-08-31",        -- task end date
--     "date": "2026-08-17",           -- the day this time was actually logged
--     "timeSeconds": 2400,
--     "timeHours": 0.6667,
--     "first_seen_at": "2026-08-27T10:00:00",
--     "updated_at": "2026-08-27T10:00:00"   -- bumped only when a field actually changes
--   }

CREATE TABLE IF NOT EXISTS employee_timelog_report (
    id                  SERIAL PRIMARY KEY,

    -- Resolved HRMS reference (nullable — an Author name with no HRMS match is
    -- still stored under employee_name, just unresolved)
    employee_id         VARCHAR(20)   REFERENCES employee(employee_id),
    employee_name       VARCHAR(255)  NOT NULL,   -- from the Excel "Author" column

    timelog             JSON          NOT NULL DEFAULT '[]',
    entry_count         INTEGER       NOT NULL DEFAULT 0,   -- denormalized len(timelog), for quick listing

    start_date          DATE          NOT NULL,   -- first day of the month this row covers
    end_date            DATE          NOT NULL,   -- last day of the month this row covers

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

-- One row per employee per month — natural key is (employee_name, start_date),
-- matched case-/whitespace-insensitively by the service layer.
CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_timelog_report_name_month
    ON employee_timelog_report (LOWER(TRIM(employee_name)), start_date);

CREATE INDEX IF NOT EXISTS ix_employee_timelog_report_employee_id ON employee_timelog_report(employee_id);
CREATE INDEX IF NOT EXISTS ix_employee_timelog_report_end_date    ON employee_timelog_report(end_date);
