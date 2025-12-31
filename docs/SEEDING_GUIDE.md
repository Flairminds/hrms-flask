# Master Data Seeding

Simple standalone script to seed master/reference data into the database.

## Usage

```bash
# Seed all master data
python seed_data.py seed

# Clear all master data (with confirmation)
python seed_data.py clear

# Clear and re-seed
python seed_data.py reseed
```

## What Gets Seeded

| Table | Count | Description |
|-------|-------|-------------|
| `master_role` | 10 | Admin, Manager, HR, Developer, etc. |
| `master_sub_role` | 18 | Full Stack, Frontend, Backend, etc. |
| `designation` | 12 | Intern to CTO levels |
| `skill` | 45+ | Technical & soft skills |
| `leave_type` | 10 | Privilege, Sick, WFH, etc. |
| `lob` | 5 | Lines of business |
| `work_categories` | 8 | Project categories |

## Features

- ✅ **Idempotent** - Safe to run multiple times (uses `ON CONFLICT DO NOTHING`)
- ✅ **Transactional** - All-or-nothing commits
- ✅ **Simple** - No Flask routes or blueprints needed
- ✅ **Standalone** - Run directly from CLI

## Requirements

- Ensure database migrations are applied first:
  ```bash
  flask db upgrade
  ```

- Ensure `.env` file is configured with database connection

## Example Output

```
==================================================
Starting Master Data Seeding
==================================================

Seeding master roles...
✓ Master roles seeded
Seeding master sub-roles...
✓ Master sub-roles seeded
Seeding designations...
✓ Designations seeded
Seeding skills...
✓ Skills seeded
Seeding leave types...
✓ Leave types seeded
Seeding LOBs...
✓ LOBs seeded
Seeding work categories...
✓ Work categories seeded

==================================================
✓ All master data seeded successfully!
==================================================
```
