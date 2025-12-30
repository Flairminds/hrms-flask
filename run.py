import os
from app import create_app

# Create app instance with default config for Flask CLI
app = create_app(os.getenv('FLASK_ENV', 'dev'))

if __name__ == '__main__':
    app.run()
