-- Run this script manually to add arbitrary key/value tags to projects.
--
-- tags: JSON array of {"key": "...", "value": "..."} objects, e.g.
--   [{"key": "Zymmr Project Name", "value": "Onpepper Leverage Modelling"}]
--   Used to map an HRMS project to its name(s) in external systems (e.g. Zymmr)
--   for timesheet/effort report imports. One HRMS project can have multiple
--   tags (e.g. multiple Zymmr project names mapping to the same HRMS project).

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS tags JSON;

ALTER TABLE project_history
    ADD COLUMN IF NOT EXISTS tags JSON;

-- Backfill: preserve the excel/Zymmr-name -> HRMS-project-name mappings that
-- used to be hardcoded in the frontend PROJECT_NAME_MAP constant (previously
-- found in frontend/src/pages/Projects/EffortsAnalyser.jsx and
-- TimesheetAnalyser.jsx) as "Zymmr Project Name" tags on the matching project.
-- Only applied when a project with that exact project_name already exists,
-- and appends to (rather than overwrites) any tags already present on it.

UPDATE projects
SET tags = (COALESCE(tags, '[]'::json)::jsonb || jsonb_build_array(
    jsonb_build_object('key', 'Zymmr Project Name', 'value', '2 OnPepper Leverage Modelling & Hummingbird')
))::json
WHERE project_name = 'Onpepper';

UPDATE projects
SET tags = (COALESCE(tags, '[]'::json)::jsonb || jsonb_build_array(
    jsonb_build_object('key', 'Zymmr Project Name', 'value', '2 BNYM')
))::json
WHERE project_name = 'BNY-M';

UPDATE projects
SET tags = (COALESCE(tags, '[]'::json)::jsonb || jsonb_build_array(
    jsonb_build_object('key', 'Zymmr Project Name', 'value', '2 XMPro 10')
))::json
WHERE project_name = 'XMPS-2000';

UPDATE projects
SET tags = (COALESCE(tags, '[]'::json)::jsonb || jsonb_build_array(
    jsonb_build_object('key', 'Zymmr Project Name', 'value', 'Bridge Platform')
))::json
WHERE project_name = 'Bridge Connect';
