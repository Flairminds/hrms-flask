-- Run this script manually to add project category/sub-category classification.
--
-- category: 'Client Project' or 'Internal'
-- sub_category: only set when category = 'Internal'. One of:
--   Management, Marketing, HR Operations, Training & Development, Infrastructure,
--   Leaves, Productivity Loss due to infra, Other Internal Work
-- task_category_overrides: JSON array of {"task_name": "...", "sub_category": "..."}
--   letting specific tasks within a project be re-classified into a different
--   sub-category (e.g. the 'Leave' task inside the "FM Internal Project" project
--   should count under 'Leaves' even though the project's default sub-category
--   is 'Other Internal Work').

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS category VARCHAR(30),
    ADD COLUMN IF NOT EXISTS sub_category VARCHAR(50),
    ADD COLUMN IF NOT EXISTS task_category_overrides JSON;

ALTER TABLE project_history
    ADD COLUMN IF NOT EXISTS category VARCHAR(30),
    ADD COLUMN IF NOT EXISTS sub_category VARCHAR(50),
    ADD COLUMN IF NOT EXISTS task_category_overrides JSON;
