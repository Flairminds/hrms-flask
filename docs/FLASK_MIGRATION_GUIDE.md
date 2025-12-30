# Flask Migration Setup Guide

## Issue Fixed

**Problem:** `flask db migrate` was failing with:
- "Could not call 'create_app' without arguments"
- "No such command 'db'"

**Solution Applied:**
1. Created `.flaskenv` file to set FLASK_APP
2. Updated `run.py` to expose app instance at module level
3. Ensured flask-migrate is installed

---

## Setup Steps

### 1. Install Required Packages

```bash
pip install python-dotenv flask-migrate
```

### 2. Verify Flask Can Find App

```bash
# Should show the app routes
flask routes
```

### 3. Initialize Migrations (First Time Only)

```bash
# Creates migrations/ directory
flask db init
```

### 4. Create Initial Migration

```bash
# Generates migration script based on models
flask db migrate -m "Initial migration"
```

### 5. Apply Migration to Database

```bash
# Runs the migration
flask db upgrade
```

---

## Common Flask-Migrate Commands

```bash
# Create new migration after model changes
flask db migrate -m "Description of changes"

# Apply pending migrations
flask db upgrade

# Rollback one migration
flask db downgrade

# Show current migration version
flask db current

# Show migration history
flask db history

# Show SQL without executing
flask db upgrade --sql

# Rollback to specific version
flask db downgrade <revision_id>
```

---

## Files Created/Modified

### `.flaskenv` (NEW)
```
FLASK_APP=run.py
FLASK_ENV=dev
```

### `run.py` (UPDATED)
```python
import os
from app import create_app

# Create app instance with default config for Flask CLI
app = create_app(os.getenv('FLASK_ENV', 'dev'))

if __name__ == '__main__':
    app.run()
```

### `app/__init__.py` (ALREADY UPDATED)
- Added `from flask_migrate import Migrate`
- Added `migrate = Migrate()`
- Added `migrate.init_app(app, db)`

---

## Environment Variables

### `.env` (Database Config)
```env
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=hrms_db
DATABASE_HOST_NAME=localhost
DATABASE_PORT=5432
```

### `.flaskenv` (Flask Config)
```env
FLASK_APP=run.py
FLASK_ENV=dev  # or 'prod' for production
```

---

## Troubleshooting

### "No such command 'db'"
**Solution:** Install flask-migrate
```bash
pip install flask-migrate
```

### "Could not call create_app without arguments"
**Solution:** Use `.flaskenv` file with `FLASK_APP=run.py`

### "Table already exists"
**Solution:** Use `flask db stamp head` to mark current DB state
```bash
flask db stamp head
```

### "Can't locate revision"
**Solution:** Check that migrations/versions/ has migration files
```bash
ls migrations/versions/
```

### ImportError or ModuleNotFoundError
**Solution:** Ensure all dependencies installed
```bash
pip install -r requirements.txt
```

---

## Best Practices

1. **Always review migrations** before applying:
   ```bash
   # Check generated migration file in migrations/versions/
   ```

2. **Test migrations** on development first:
   ```bash
   flask db upgrade  # dev environment
   # Verify everything works
   flask db upgrade  # production
   ```

3. **Backup production** before migrations:
   ```bash
   pg_dump hrms_db > backup_$(date +%Y%m%d).sql
   ```

4. **Version control** migrations:
   ```bash
   git add migrations/versions/*.py
   git commit -m "Add migration: description"
   ```

5. **Never delete** migration files - use downgrade instead

---

## Workflow Example

```bash
# 1. Make changes to models
# Edit app/models/hr.py

# 2. Generate migration
flask db migrate -m "Add new_field to Employee"

# 3. Review migration file
# Check migrations/versions/<hash>_add_new_field.py

# 4. Apply migration
flask db upgrade

# 5. Verify in database
# Check that new_field exists
```

---

## Quick Reference

| Task | Command |
|------|---------|
| First time setup | `flask db init` |
| Create migration | `flask db migrate -m "message"` |
| Apply migration | `flask db upgrade` |
| Undo last migration | `flask db downgrade` |
| Current version | `flask db current` |
| Migration history | `flask db history` |
| View SQL | `flask db upgrade --sql` |

---

**Last Updated:** 2025-12-30  
**Flask:** 3.x  
**Flask-Migrate:** 4.x  
**SQLAlchemy:** 2.x
