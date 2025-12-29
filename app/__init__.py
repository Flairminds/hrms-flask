from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from .config import config_by_name

db = SQLAlchemy()

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    CORS(app)
    
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
    from .routes.allocation import allocation_bp

    app.register_blueprint(account_bp, url_prefix='/api/account')
    app.register_blueprint(leave_bp, url_prefix='/api/leave')
    app.register_blueprint(hr_bp, url_prefix='/api/hr-functionality')
    app.register_blueprint(assets_bp, url_prefix='/api')
    app.register_blueprint(profile_bp, url_prefix='/api/employees-details')
    app.register_blueprint(feedback_bp, url_prefix='/api/lead-functionality')
    app.register_blueprint(skills_bp, url_prefix='/api')
    app.register_blueprint(goals_bp, url_prefix='/api')
    app.register_blueprint(review_bp, url_prefix='/api')
    app.register_blueprint(capability_bp, url_prefix='/api')
    app.register_blueprint(documents_bp, url_prefix='/api')
    app.register_blueprint(evaluators_bp, url_prefix='/api')
    app.register_blueprint(policy_bp, url_prefix='/api')
    app.register_blueprint(project_bp, url_prefix='/api')
    app.register_blueprint(allocation_bp, url_prefix='/api')


    return app
