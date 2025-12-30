import os
import pytest

# SET TESTING MODE BEFORE ANY OTHER IMPORTS
os.environ["TESTING"] = "True"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import create_app, db
from flask_jwt_extended import create_access_token

@pytest.fixture
def app(monkeypatch):
    # Force sqlite for testing to avoid pyodbc issues in CI/Test envs
    monkeypatch.setenv("TESTING", "True")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    
    app = create_app('dev')
    app.config.update({
        "TESTING": True,
        "JWT_SECRET_KEY": "test-secret"
    })

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_header():
    def _auth_header(employee_id="test_user", role="Admin"):
        token = create_access_token(identity=employee_id, additional_claims={"role": role})
        return {"Authorization": f"Bearer {token}"}
    return _auth_header
