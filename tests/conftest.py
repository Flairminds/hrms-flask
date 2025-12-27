import pytest
from app import create_app, db
from flask_jwt_extended import create_access_token

@pytest.fixture
def app():
    app = create_app('dev') # Use dev config, but we will mock DB anyway
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", # Use in-memory for some logic, but usually we mock session.execute
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
