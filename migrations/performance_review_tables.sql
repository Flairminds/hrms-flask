-- Performance Review (Employee Review v2) Tables Migration
-- Run this script manually to create the multi-role weighted performance
-- review tables: cycles, a versioned JSON sections/questions config, and
-- one JSON-blob review per employee per cycle holding a frozen questions
-- snapshot plus every reviewer's (Self/Project Lead/HR) scores, written
-- answers and comments — and a config activity trail.
--
-- Design notes (v2):
--  * The sections/questions config is stored WHOLE, as JSON, in
--    perf_review_config. Every edit inserts a NEW row rather than updating
--    one in place, so the full edit history is kept. Each row's
--    applicable_date says from which date it takes effect; "the config in
--    effect for date D" is the row with the latest applicable_date <= D.
--    applicable_date cannot be in the past — enforced in
--    PerformanceReviewService, not here, since the initial seed row below
--    intentionally uses a historical date to be "always in effect" until
--    someone changes it.
--  * Each perf_review row is ALSO stored WHOLE, as JSON — deliberately kept
--    simple as a single record per employee per cycle, not versioned or
--    normalized into per-reviewer/per-score tables. It freezes a copy of the
--    sections/questions in effect when the review was created, since the
--    live config (questions, weightage) can keep changing afterwards and a
--    review must keep scoring against what it was actually created with.
--  * "Lead" reviewers are one entry per project lead on the employee's
--    current allocations, resolved at the time the review is created (see
--    perf_review_service.get_or_create_review).

-- 1. Review cycles (e.g. "Q3 2026")
CREATE TABLE IF NOT EXISTS perf_review_cycle (
    cycle_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
    created_by VARCHAR(20) REFERENCES employee(employee_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP
);

-- 2. Versioned sections/questions config — one full snapshot per row.
CREATE TABLE IF NOT EXISTS perf_review_config (
    config_id SERIAL PRIMARY KEY,
    config JSONB NOT NULL,
    applicable_date DATE NOT NULL,
    comments TEXT,
    created_by VARCHAR(20) REFERENCES employee(employee_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_perf_review_config_applicable_date ON perf_review_config(applicable_date DESC, config_id DESC);

-- Seed an initial version (backdated so it's always in effect until HR
-- schedules a change) so the app has a config to serve out of the box.
INSERT INTO perf_review_config (config, applicable_date, comments, created_by)
SELECT
    '[
        {"id": "p-others", "title": "Others", "description": "Questions that do not belong to a specific competency.",
         "isOthers": true, "questions": [], "writtenQuestions": []}
    ]'::jsonb,
    DATE '2020-01-01',
    'Initial configuration',
    NULL
WHERE NOT EXISTS (SELECT 1 FROM perf_review_config);

-- 3. One review per employee per cycle, stored as a single JSON blob: the
--    sections/questions snapshot frozen at creation time (so a later edit to
--    perf_review_config doesn't retroactively change what this review was
--    scored against, since weightage/questions can change) plus every
--    reviewer's (self/lead(s)/HR) scores, written answers and section
--    comments. Updated in place as reviewers work — a single current record
--    per review, not a versioned history like perf_review_config.
DROP TABLE IF EXISTS perf_review_comment;
DROP TABLE IF EXISTS perf_review_answer;
DROP TABLE IF EXISTS perf_review_score;
DROP TABLE IF EXISTS perf_reviewer;
DROP TABLE IF EXISTS perf_review;

CREATE TABLE perf_review (
    review_id SERIAL PRIMARY KEY,
    cycle_id INTEGER NOT NULL REFERENCES perf_review_cycle(cycle_id),
    employee_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    review JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP,
    CONSTRAINT uq_perf_review_cycle_employee UNIQUE (cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS ix_perf_review_employee ON perf_review(employee_id);

-- 4. Activity trail for the "Configure Parameters & Questions" screen
CREATE TABLE IF NOT EXISTS perf_review_config_activity (
    activity_id SERIAL PRIMARY KEY,
    actor_employee_id VARCHAR(20) REFERENCES employee(employee_id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('added', 'updated', 'removed')),
    ref VARCHAR(50),
    summary TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_perf_review_config_activity_date ON perf_review_config_activity(created_at);

-- 5. Link the legacy employee_review scheduling row (Employee Review tab) to
--    the multi-role scored review (self/lead/HR) created alongside it via the
--    "Initiate Review" wizard, so HR/leads/self can jump straight from a
--    scheduled review to actually scoring it.
ALTER TABLE employee_review ADD COLUMN IF NOT EXISTS perf_cycle_id INTEGER REFERENCES perf_review_cycle(cycle_id);
