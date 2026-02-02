# HRMS-LMS Developer Setup Guide

This guide provides step-by-step instructions for developers to set up the HRMS-LMS (Human Resource Management System - Leave Management System) project on their local machine.

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Project Overview](#-project-overview)
3. [Setup Without Docker](#-setup-without-docker)
   - [Database Setup](#1-database-setup-postgresql)
   - [Backend Setup](#2-backend-setup-flask)
   - [Frontend Setup](#3-frontend-setup-react--vite)
4. [Setup With Docker](#-setup-with-docker)
5. [Verification Steps](#-verification-steps)
6. [Troubleshooting](#-troubleshooting)
7. [Additional Resources](#-additional-resources)

---

## 🔧 Prerequisites

Before starting, ensure you have the following installed on your system:

### Required Software

| Software | Version | Purpose | Download Link |
|----------|---------|---------|---------------|
| **Python** | 3.10+ | Backend runtime | [python.org](https://www.python.org/downloads/) |
| **PostgreSQL** | 12+ | Database | [postgresql.org](https://www.postgresql.org/download/) |
| **Node.js** | 18+ | Frontend runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Frontend package manager | Included with Node.js |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/) |

### Optional (For Docker Setup)

| Software | Version | Purpose | Download Link |
|----------|---------|---------|---------------|
| **Docker Desktop** | Latest | Containerization | [docker.com](https://www.docker.com/products/docker-desktop) |
| **Docker Compose** | Latest | Multi-container orchestration | Included with Docker Desktop |

### Recommended Tools

- **PostgreSQL GUI**: pgAdmin 4, DBeaver, or TablePlus
- **Code Editor**: VS Code with Python and JavaScript extensions
- **API Testing**: Postman or Thunder Client (VS Code extension)

---

## 📦 Project Overview

The HRMS-LMS project consists of three main components:

```
hrms-flask/
├── backend (Flask API)
│   ├── app/              # Application modules
│   ├── requirements.txt  # Python dependencies
│   ├── run.py           # Application entry point
│   └── .env             # Environment configuration
├── frontend (React + Vite)
│   ├── src/             # React components
│   ├── package.json     # Node dependencies
│   └── vite.config.js   # Vite configuration
└── database (PostgreSQL)
    └── seed_data.py     # Master data seeding script
```

**Technology Stack:**
- **Backend**: Flask 3.0, SQLAlchemy 2.0, Flask-JWT-Extended, APScheduler
- **Frontend**: React 18, Vite 5, Ant Design, Axios, React Router
- **Database**: PostgreSQL (with stored procedures from legacy .NET system)
- **Email**: SMTP integration for OTP and automated reports
- **PDF Generation**: xhtml2pdf for relieving letters

---

## 🚀 Setup Without Docker

### 1. Database Setup (PostgreSQL)

#### Step 1.1: Install PostgreSQL

**Windows:**
```powershell
# Download and install from https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

**macOS:**
```bash
# Using Homebrew:
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Step 1.2: Create Database and User

Open PostgreSQL command line or pgAdmin and execute:

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE hrms_dev;

-- Create user (optional, or use existing postgres user)
CREATE USER hrms_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO hrms_user;

-- Connect to the new database
\c hrms_dev

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO hrms_user;
```

#### Step 1.3: Verify Database Connection

```bash
# Test connection
psql -U postgres -d hrms_dev -c "SELECT version();"
```

> **Note**: The application uses SQLAlchemy migrations. Database schema will be created automatically when you run migrations.

---

### 2. Backend Setup (Flask)

#### Step 2.1: Clone Repository

```powershell
# Navigate to your development folder
cd C:\Users\YourName\Projects

# Clone the repository (if not already cloned)
git clone <repository-url>
cd hrms-flask
```

#### Step 2.2: Create Python Virtual Environment

**Windows (PowerShell):**
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# If you get execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**macOS/Linux:**
```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate
```

#### Step 2.3: Install Python Dependencies

```powershell
# Ensure you're in the virtual environment (you should see (.venv) in your prompt)
pip install --upgrade pip

# Install all dependencies
pip install -r requirements.txt
```

**Key Dependencies Installed:**
- Flask 3.0.0 - Web framework
- Flask-SQLAlchemy 3.1.1 - ORM
- Flask-CORS 4.0.0 - Cross-origin resource sharing
- psycopg2-binary 2.9.9 - PostgreSQL adapter
- Flask-JWT-Extended 4.5.3 - JWT authentication
- Flask-APScheduler 1.13.1 - Background task scheduling
- xhtml2pdf - PDF generation
- pytest 7.4.3 - Testing framework

#### Step 2.4: Configure Environment Variables

Create or update the `.env` file in the project root:

```bash
# Development Environment
FLASK_ENV=dev

# Security
SECRET_KEY=your_super_secret_key_change_this_in_production

# Email Configuration (Gmail SMTP)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your_app_specific_password

# Database Configuration
DATABASE_USERNAME=postgres
DATABASE_NAME=hrms_dev
DATABASE_PASSWORD=your_database_password
DATABASE_HOST_NAME=localhost
DATABASE_PORT=5432

# Email Recipients for Automated Reports
TO_ADDRESSES=hr@company.com,manager@company.com
```

> **Important**: 
> - For Gmail, use [App Passwords](https://support.google.com/accounts/answer/185833) instead of your regular password
> - Never commit `.env` file to version control
> - Update `SECRET_KEY` with a strong random string

#### Step 2.5: Configure Flask Environment

The `.flaskenv` file should already exist with:

```bash
FLASK_APP=run.py
FLASK_ENV=dev
```

#### Step 2.6: Initialize Database Schema

```powershell
# Run database migrations
flask db upgrade

# If migrations folder doesn't exist, initialize it:
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

#### Step 2.7: Seed Master Data

```powershell
# Seed initial data (roles, skills, designations, holidays, HR user)
python seed_data.py seed
```

**Default HR User Created:**
- **Email**: hr@flairminds.com
- **Password**: pass@123
- **Employee ID**: Auto-generated

#### Step 2.8: Run Backend Server

```powershell
# Start Flask development server
flask run

# Or use Python directly:
python run.py
```

The backend API will be available at: **http://localhost:5000**

**Verify Backend:**
```powershell
# Test API health (if health endpoint exists)
curl http://localhost:5000/api/health

# Or open in browser
# http://localhost:5000
```

---

### 3. Frontend Setup (React + Vite)

#### Step 3.1: Navigate to Frontend Directory

```powershell
cd frontend
```

#### Step 3.2: Install Node Dependencies

```powershell
# Install all npm packages
npm install
```

**Key Dependencies Installed:**
- react 18.2.0 - UI library
- react-router-dom 6.23.1 - Routing
- antd 5.18.3 - UI component library
- axios 1.7.2 - HTTP client
- vite 5.2.0 - Build tool and dev server
- moment 2.30.1 - Date manipulation
- react-toastify 10.0.5 - Notifications

#### Step 3.3: Configure Frontend Environment (Optional)

The default Vite configuration proxies API requests to `http://localhost:5000`.

If your backend runs on a different port, update `frontend/vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // Update this if needed
        changeOrigin: true,
      }
    }
  }
})
```

#### Step 3.4: Run Frontend Development Server

```powershell
# Start Vite dev server
npm run dev
```

The frontend will be available at: **http://localhost:5173**

**Available Scripts:**
- `npm run dev` - Start development server with HMR
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

---

## 🐳 Setup With Docker

Docker setup allows you to run the entire application stack with minimal configuration.

### Prerequisites

- Docker Desktop installed and running
- At least 4GB RAM allocated to Docker

### Step 1: Build and Run with Docker Compose

```powershell
# Navigate to project root
cd hrms-flask

# Build and start all services
docker-compose up --build

# Or run in detached mode (background):
docker-compose up -d --build
```

### Step 2: Access Services

- **Backend API**: http://localhost:5000
- **Frontend**: Build frontend Docker service separately (see below)

### Current Docker Configuration

The current `docker-compose.yaml` only includes the backend API service. To add frontend and database:

#### Option A: Add PostgreSQL to Docker Compose

Create an updated `docker-compose.yaml`:

```yaml
version: '3.8'

services:
  database:
    image: postgres:14
    container_name: hrms_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: hrms_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hrms_backend
    ports:
      - "5000:5000"
    env_file:
      - .env
    environment:
      DATABASE_HOST_NAME: database
      DATABASE_PORT: 5432
    depends_on:
      database:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: hrms_frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./frontend/src:/usr/local/app/src

volumes:
  postgres_data:
```

#### Option B: Use Existing Backend Dockerfile Only

```powershell
# Build backend image
docker build -t hrms-flask:latest .

# Run backend container (assuming PostgreSQL is running locally)
docker run -d \
  -p 5000:5000 \
  --env-file .env \
  --name hrms_backend \
  hrms-flask:latest
```

### Docker Commands Reference

```powershell
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild specific service
docker-compose up -d --build backend

# Execute commands in container
docker-compose exec backend flask db upgrade
docker-compose exec backend python seed_data.py seed
```

---

## ✅ Verification Steps

### 1. Verify Database

```sql
-- Connect to database
psql -U postgres -d hrms_dev

-- Check if tables exist
\dt

-- Verify master data
SELECT * FROM master_role;
SELECT * FROM master_leave_types;
SELECT COUNT(*) FROM master_skills;
```

### 2. Verify Backend

```powershell
# Check if Flask server is running
curl http://localhost:5000/api/account/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"identifier":"hr@flairminds.com","password":"pass@123"}'

# Should return JWT token
```

### 3. Verify Frontend

1. Open browser: http://localhost:5173
2. You should see the login page
3. Try logging in with:
   - **Email**: hr@flairminds.com
   - **Password**: pass@123

### 4. Run Tests

```powershell
# Run backend tests (from project root)
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_account.py

# Run frontend tests (from frontend directory)
cd frontend
npm run test
```

---

## 🔧 Troubleshooting

### Database Issues

#### Connection Refused
```
Error: could not connect to server: Connection refused
```

**Solution:**
```powershell
# Check if PostgreSQL is running
# Windows:
Get-Service -Name postgresql*

# Start service if not running
Start-Service postgresql-x64-14

# macOS:
brew services list
brew services start postgresql@14

# Linux:
sudo systemctl status postgresql
sudo systemctl start postgresql
```

#### Authentication Failed
```
Error: FATAL: password authentication failed for user "postgres"
```

**Solution:**
- Verify credentials in `.env` file
- Reset PostgreSQL password if needed
- Check `pg_hba.conf` authentication settings

#### Database Does Not Exist
```
Error: FATAL: database "hrms_dev" does not exist
```

**Solution:**
```sql
psql -U postgres
CREATE DATABASE hrms_dev;
```

### Backend Issues

#### Module Not Found
```
ModuleNotFoundError: No module named 'flask'
```

**Solution:**
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate      # macOS/Linux

# Reinstall dependencies
pip install -r requirements.txt
```

#### Port Already in Use
```
Error: Address already in use
```

**Solution:**
```powershell
# Windows - Find process using port 5000
netstat -ano | findstr :5000
# Kill process
taskkill /PID <process_id> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Or run Flask on different port
flask run --port 5001
```

#### Migration Errors
```
Error: Can't locate revision identified by 'xxxxx'
```

**Solution:**
```powershell
# Remove migrations and recreate
# WARNING: This will reset your database schema
flask db downgrade base
flask db upgrade
```

### Frontend Issues

#### Dependencies Installation Fails
```
Error: npm ERR! code ERESOLVE
```

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps
```

#### API Calls Failing (CORS)
```
Error: Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:**
- Check `Flask-CORS` is installed in backend
- Verify backend `.env` has correct configuration
- Check `vite.config.js` proxy settings

#### Build Fails
```
Error: [vite]: Rollup failed to resolve import
```

**Solution:**
```powershell
# Check if dependency is installed
npm list <package-name>

# Install missing dependency
npm install <package-name>
```

### Email Issues

#### SMTP Authentication Failed
```
Error: SMTPAuthenticationError: (535, 'Incorrect authentication data')
```

**Solution:**
- Use Gmail App Password instead of regular password
- Enable "Less secure app access" (not recommended)
- Check `MAIL_USERNAME` and `MAIL_PASSWORD` in `.env`

### Docker Issues

#### Container Won't Start
```
Error: Container exited with code 1
```

**Solution:**
```powershell
# Check logs
docker-compose logs backend

# Check environment variables
docker-compose config
```

#### Database Connection in Docker
```
Error: could not translate host name "localhost" to address
```

**Solution:**
- Use service name instead of `localhost` in `.env`
- Example: `DATABASE_HOST_NAME=database` (not `localhost`)

---

## 📚 Additional Resources

### Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Coding Guidelines](./CODING_GUIDELINES.md) - Code standards and best practices
- [Database Configuration](./DATABASE_CONFIGURATION.md) - Database schema details
- [Testing Documentation](./TESTING_DOCUMENTATION.md) - Testing guidelines
- [Developer Quick Reference](./DEVELOPER_QUICK_REFERENCE.md) - Common commands

### Project Architecture

```
app/
├── routes/         # API Blueprints (URL routing)
├── controllers/    # Request orchestration
├── services/       # Business logic layer
├── models/         # SQLAlchemy ORM models
├── utils/          # Helper functions (auth, mail, etc.)
├── templates/      # HTML templates for emails/PDFs
├── static/         # Static assets
├── config.py       # Application configuration
└── auth_config.py  # RBAC permission matrix
```

### Key Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (database, email, secrets) |
| `.flaskenv` | Flask-specific environment variables |
| `requirements.txt` | Python dependencies |
| `package.json` | Node.js dependencies |
| `vite.config.js` | Vite bundler configuration |
| `docker-compose.yaml` | Docker services orchestration |
| `pytest.ini` | Test configuration |

### Useful Commands

```powershell
# Backend Development
flask routes                    # List all API routes
flask shell                     # Interactive Python shell
flask db current               # Show current migration
flask db history               # Show migration history

# Database Management
python seed_data.py seed       # Seed master data
psql -U postgres -d hrms_dev   # Connect to database

# Frontend Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run preview                # Preview build
npm run lint                   # Lint code

# Testing
pytest -v                      # Verbose test output
pytest --cov                   # With coverage report
pytest -k "test_name"         # Run specific test

# Docker
docker-compose up -d           # Start in background
docker-compose logs -f backend # Follow backend logs
docker-compose exec backend sh # Shell into backend
```

### Default Credentials

**HR Admin:**
- Email: `hr@flairminds.com`
- Password: `pass@123`
- Role: HR Manager

> **Security Note**: Change default passwords immediately after first login in production environments.

### Getting Help

- Check existing documentation in the `docs/` folder
- Review [README.md](../README.md) for project overview
- Run automated workflows: `/code-review`, `/run-tests`
- Contact the development team

---

## 🎯 Quick Start Summary

### Without Docker (Recommended for Development)

```powershell
# 1. Setup Database
psql -U postgres -c "CREATE DATABASE hrms_dev;"

# 2. Setup Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env  # Update with your credentials
flask db upgrade
python seed_data.py seed
flask run

# 3. Setup Frontend (new terminal)
cd frontend
npm install
npm run dev

# 4. Access Application
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

### With Docker

```powershell
# 1. Start all services
docker-compose up -d --build

# 2. Run migrations and seed data
docker-compose exec backend flask db upgrade
docker-compose exec backend python seed_data.py seed

# 3. Access Application
# Backend: http://localhost:5000
```

---

## 📝 Next Steps After Setup

1. ✅ Verify all services are running
2. ✅ Login with default HR credentials
3. ✅ Run test suite to ensure everything works
4. 📖 Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) to understand endpoints
5. 📖 Review [CODING_GUIDELINES.md](./CODING_GUIDELINES.md) before writing code
6. 🔨 Start development!

---

**Happy Coding! 🚀**

For questions or issues, please refer to the troubleshooting section or contact the development team.
