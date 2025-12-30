# Database Configuration Guide

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Flask Application
SECRET_KEY=your-secret-key-change-in-production

# Database Configuration
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-db-password
DATABASE_NAME=hrms_db
DATABASE_HOST_NAME=localhost
DATABASE_PORT=5432

# Database Connection Pool Settings (Optional - defaults provided)
DB_POOL_SIZE=10              # Number of persistent connections
DB_MAX_OVERFLOW=20           # Additional connections allowed beyond pool_size  
DB_POOL_TIMEOUT=30          # Seconds to wait for available connection
DB_POOL_RECYCLE=1800        # Seconds before recycling connection (30 min)

# Mail Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-email-password

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_EXPIRES=3600

# Testing
TESTING=False
```

## Database Connection Pooling

The application uses SQLAlchemy connection pooling for optimal performance:

- **pool_size (10)**: Maintains 10 persistent database connections
- **max_overflow (20)**: Allows up to 20 additional connections during peak load
- **pool_timeout (30)**: Waits 30 seconds for an available connection before raising error
- **pool_recycle (1800)**: Recycles connections after 30 minutes to prevent stale connections
- **pool_pre_ping (True)**: Tests connection health before using it

### Total Capacity
- **Normal**: 10 connections
- **Peak**: Up to 30 connections (10 + 20 overflow)

## Database Migrations with Flask-Migrate

### Initial Setup

```bash
# Initialize migrations (first time only)
flask db init

# Create initial migration
flask db migrate -m "Initial migration"

# Apply migration to database
flask db upgrade
```

### Making Changes

After modifying models:

```bash
# Generate migration script
flask db migrate -m "Description of changes"

# Review the generated migration in migrations/versions/

# Apply migration
flask db upgrade
```

### Common Commands

```bash
# Show current migration version
flask db current

# Show migration history
flask db history

# Rollback one migration
flask db downgrade

# Rollback to specific version
flask db downgrade <revision>

# Show SQL that would be executed
flask db upgrade --sql
```

## Password URL Encoding

Database passwords containing special characters are automatically URL-encoded using `urllib.parse.quote_plus()` to prevent connection issues.

**Special characters handled:** `@`, `#`, `$`, `%`, `&`, `/`, etc.

## Troubleshooting

### Connection Pool Exhausted

If you see "QueuePool limit exceeded":
1. Increase `DB_POOL_SIZE` and `DB_MAX_OVERFLOW`
2. Check for connection leaks (ensure sessions are closed)
3. Reduce `DB_POOL_TIMEOUT` to fail faster

### Stale Connections

If you see "server closed the connection unexpectedly":
1. `pool_pre_ping=True` should prevent this
2. Reduce `DB_POOL_RECYCLE` time
3. Check database server timeout settings

### Password Issues

If authentication fails with special characters:
- Verify password is correct in `.env`
- URL encoding handles special characters automatically
- Test connection string manually

## Production Recommendations

```env
# Recommended production settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
```

## Testing Configuration

When `TESTING=True` in environment:
- Database switches to in-memory SQLite
- No connection pooling needed
- Migrations not required
