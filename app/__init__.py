import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from .config import config_by_name

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_name):
    # Determine frontend build folder path
    frontend_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')
    
    # Check if production build exists
    has_build = os.path.exists(frontend_folder) and os.path.exists(os.path.join(frontend_folder, 'index.html'))
    
    # Configure Flask to serve React build if it exists
    if has_build:
        app = Flask(
            __name__,
            static_folder=frontend_folder,
            template_folder=frontend_folder
        )
        print(f"[FOUND] Frontend build found at: {frontend_folder}")
    else:
        app = Flask(__name__)
        print(f"[WARN] No frontend build found at: {frontend_folder}")
        print("  Run 'cd frontend && npm run build' to create production build")
    
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    migrate.init_app(app, db)
    
    # Enable CORS for development (when React runs on different port)
    # In production with same origin, CORS is not needed
    if not has_build or config_name == 'dev':
        CORS(app)
        print("[ENABLED] CORS enabled for development")
    
    # Initialize Scheduler
    from .services.scheduler_service import scheduler, register_jobs
    scheduler.init_app(app)
    register_jobs(app)
    # scheduler.start() # Starting it depends on whether it's already started... but usually done once.
    
    from flask_jwt_extended import JWTManager

    jwt = JWTManager(app)

    # Register blueprints
    from .routes.account import account_bp
    from .routes.leave import leave_bp
    from .routes.hr import hr_bp
    from .routes.assets import assets_bp
    from .routes.profile import profile_bp
    from .routes.feedback import feedback_bp
    from .routes.skills import skills_bp
    from .routes.goals import goals_bp
    from .routes.review import review_bp
    from .routes.documents import documents_bp
    from .routes.capability import capability_bp
    from .routes.evaluators import evaluators_bp
    from .routes.policy import policy_bp
    from .routes.project import project_bp
    # from .routes.allocation import allocation_bp
    from .routes.health import health_bp
    from .routes.auth_routes import bp as auth_bp
    from .routes.hardware import hardware_bp
    from .routes.reports import reports_bp

    # Register health check blueprint at root level (no prefix)
    app.register_blueprint(health_bp)
    
    # Register API blueprints
    app.register_blueprint(account_bp, url_prefix='/api/account')
    app.register_blueprint(leave_bp, url_prefix='/api/leave')
    app.register_blueprint(hr_bp, url_prefix='/api/hr')
    app.register_blueprint(assets_bp, url_prefix='/api/assets')
    app.register_blueprint(profile_bp, url_prefix='/api/employees-details')
    app.register_blueprint(feedback_bp, url_prefix='/api/lead-functionality')
    app.register_blueprint(skills_bp, url_prefix='/api/skills')
    app.register_blueprint(goals_bp, url_prefix='/api/goals')
    app.register_blueprint(review_bp, url_prefix='/api/review')
    app.register_blueprint(capability_bp, url_prefix='/api/capability')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(evaluators_bp, url_prefix='/api/evaluators')
    app.register_blueprint(policy_bp, url_prefix='/api/policy')
    app.register_blueprint(project_bp, url_prefix='/api/project')
    # app.register_blueprint(allocation_bp, url_prefix='/api/allocation')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(hardware_bp, url_prefix='/api/hardware')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    # Serve React App (if production build exists)
    if has_build:
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_react_app(path):
            # If path is for API, it's already handled by blueprints
            # This catch-all route handles:
            # 1. Static assets (JS, CSS, images)
            # 2. React Router routes (serve index.html)
            
            # If file exists in build folder, serve it (static assets)
            if path and os.path.exists(os.path.join(app.static_folder, path)):
                return send_from_directory(app.static_folder, path)
            
            # Otherwise serve index.html for React Router to handle
            return send_from_directory(app.static_folder, 'index.html')

    return app

