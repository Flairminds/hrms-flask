import pytest
from unittest.mock import patch, MagicMock
from io import BytesIO
from datetime import datetime
from werkzeug.datastructures import FileStorage

from app import db
from app.models.hr import Employee, EmployeeSubRole, EmployeeRelievingLetters
from app.models.documents import EmployeeDocumentsBinary
from app.services.document import RelievingLetterService, EmployeeDocumentService

@pytest.fixture
def setup_data(app):
    with app.app_context():
        # Setup sub-role
        role = EmployeeSubRole(sub_role_id=1, sub_role_name="Software Engineer")
        db.session.add(role)
        
        # Setup employee
        emp = Employee(
            employee_id="EMP001",
            first_name="John",
            last_name="Doe",
            personal_email="john@example.com",
            date_of_joining=datetime(2020, 1, 1),
            sub_role=1
        )
        db.session.add(emp)
        
        # Setup doc record
        doc = EmployeeDocumentsBinary(emp_id="EMP001")
        db.session.add(doc)
        
        db.session.commit()
        yield

def test_get_employee_details_for_relieving_letter(app, setup_data):
    with app.app_context():
        details = RelievingLetterService.get_employee_details_for_relieving_letter()
        assert len(details) >= 1
        assert details[0]["EmployeeId"] == "EMP001"
        assert details[0]["EmployeeName"] == "John Doe"
        assert details[0]["SubRoleName"] == "Software Engineer"

@patch("app.services.document.relieving_letter_service.pisa.CreatePDF")
@patch("app.services.document.relieving_letter_service.RelievingLetterService._send_relieving_letter_email")
def test_create_relieving_letter(mock_send_email, mock_create_pdf, app, setup_data):
    mock_create_pdf.return_value.err = 0
    data = {
        "employeeId": "EMP001",
        "employeeName": "John Doe",
        "designation": "Software Engineer",
        "joiningDate": "2020-01-01",
        "lastWorkingDate": "2024-12-31",
        "relievingDate": "2025-01-01",
        "resignationDate": "2024-12-01",
        "ctcSalary": 1200000,
        "bonus": 50000,
        "variables": 100000,
        "employeeEmail": "john@example.com"
    }
    with app.app_context():
        letter_id = RelievingLetterService.create_relieving_letter(data)
        assert letter_id is not None
        
        letter = EmployeeRelievingLetters.query.get(letter_id)
        assert letter.emp_id == "EMP001"
        assert letter.ctc_salary == 1200000

def test_upload_document(app, setup_data):
    file_content = b"%PDF-1.4 test content"
    file_storage = FileStorage(
        stream=BytesIO(file_content),
        filename="test.pdf",
        content_type="application/pdf"
    )
    
    with app.app_context():
        success = EmployeeDocumentService.upload_document("EMP001", "pan", file_storage)
        assert success is True
        
        doc = EmployeeDocumentsBinary.query.filter_by(emp_id="EMP001").first()
        assert doc.pan == file_content
        assert doc.pan_verified is None

def test_get_document(app, setup_data):
    file_content = b"%PDF-1.4 test content"
    with app.app_context():
        doc = EmployeeDocumentsBinary.query.filter_by(emp_id="EMP001").first()
        doc.pan = file_content
        db.session.commit()
        
        blob, filename = EmployeeDocumentService.get_document("EMP001", "pan")
        assert blob == file_content
        assert filename == "EMP001_pan.pdf"

def test_verify_document_approve(app, setup_data):
    file_content = b"%PDF-1.4 test content"
    with app.app_context():
        doc = EmployeeDocumentsBinary.query.filter_by(emp_id="EMP001").first()
        doc.pan = file_content
        db.session.commit()
        
        success = EmployeeDocumentService.verify_document("EMP001", "pan", True)
        assert success is True
        
        doc = EmployeeDocumentsBinary.query.filter_by(emp_id="EMP001").first()
        assert doc.pan_verified == 1
        assert doc.pan == file_content

def test_verify_document_reject(app, setup_data):
    file_content = b"%PDF-1.4 test content"
    with app.app_context():
        doc = EmployeeDocumentsBinary.query.filter_by(emp_id="EMP001").first()
        doc.pan = file_content
        db.session.commit()
        
        success = EmployeeDocumentService.verify_document("EMP001", "pan", False)
        assert success is True
        
        doc = EmployeeDocumentsBinary.query.filter_by(emp_id="EMP001").first()
        assert doc.pan_verified == 0
        assert doc.pan is None

def test_get_incomplete_employees(app, setup_data):
    with app.app_context():
        incomplete = EmployeeDocumentService.get_incomplete_employees()
        assert len(incomplete) >= 1
        assert incomplete[0]["EmployeeId"] == "EMP001"
        assert "Contact Number" in incomplete[0]["MissingFields"]
