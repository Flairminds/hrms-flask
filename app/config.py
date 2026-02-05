import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

class Config:
    """Base configuration with database pooling and proper environment setup."""
    
    # Secret Keys
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key')
    
    # Database Configuration with Connection Pooling
    DATABASE_USERNAME = os.environ.get('DATABASE_USERNAME', 'postgres')
    DATABASE_PASSWORD = quote_plus(os.environ.get('DATABASE_PASSWORD', ''))
    DATABASE_NAME = os.environ.get('DATABASE_NAME', 'hrms_db')
    DATABASE_HOST_NAME = os.environ.get('DATABASE_HOST_NAME', 'localhost')
    DATABASE_PORT = os.environ.get('DATABASE_PORT', '5432')
    
    # Construct Database URI
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DATABASE_USERNAME}:{DATABASE_PASSWORD}@"
        f"{DATABASE_HOST_NAME}:{DATABASE_PORT}/{DATABASE_NAME}"
    )
    
    # If in testing mode, override with in-memory SQLite
    if os.environ.get('TESTING') == 'True':
        SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # SQLAlchemy Configuration
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Connection Pool Settings for Production-Grade Performance
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.environ.get('DB_POOL_SIZE', 10)),           # Number of connections to maintain
        'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', 20)),     # Max connections beyond pool_size
        'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', 30)),     # Timeout for getting connection (seconds)
        'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', 1800)),  # Recycle connections after 30 min
        'pool_pre_ping': True,                                           # Verify connections before using
    }
    
    # Scheduler
    SCHEDULER_API_ENABLED = True

    
    # Mail settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', MAIL_USERNAME)

    # JWT settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600)) # 1 hour

    # File upload / document generation
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')

    # Azure Blob Storage Configuration
    AZURE_STORAGE_CONNECTION_STRING = os.environ.get('AZURE_STORAGE_CONNECTION_STRING', '').strip().strip("'").strip('"') or None
    AZURE_STORAGE_ACCOUNT_NAME = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME', '').strip().strip("'").strip('"') or None
    AZURE_STORAGE_ACCOUNT_KEY = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY', '').strip().strip("'").strip('"') or None
    AZURE_STORAGE_CONTAINER_NAME = os.environ.get('AZURE_STORAGE_CONTAINER_NAME', 'employee-documents').strip().strip("'").strip('"')
    

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config_by_name = {
    'dev': DevelopmentConfig,
    'prod': ProductionConfig
}
