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
    
    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)

    # Register blueprints
    from .routes.account import account_bp
    from .routes.leave import leave_bp
    from .routes.hr import hr_bp
    from .routes.assets import assets_bp
    from .routes.profile import profile_bp
    from .routes.feedback import feedback_bp

    app.register_blueprint(account_bp, url_prefix='/api/account')
    app.register_blueprint(leave_bp, url_prefix='/api/leave')
    app.register_blueprint(hr_bp, url_prefix='/api/hr-functionality')
    app.register_blueprint(assets_bp, url_prefix='/api')
    app.register_blueprint(profile_bp, url_prefix='/api/employees-details')
    app.register_blueprint(feedback_bp, url_prefix='/api/lead-functionality')

    return app
