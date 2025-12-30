import json
from unittest.mock import MagicMock

def test_get_all_employees_admin(client, auth_header, mocker):
    mocker.patch("app.controllers.hr_controller.EmployeeService.get_all_employees", return_value=[])
    response = client.get("/api/hr-functionality/get-all-employees", headers=auth_header(role="Admin"))
    assert response.status_code == 200

def test_get_all_employees_forbidden(client, auth_header):
    # Employee role should not access HR functionality
    response = client.get("/api/hr-functionality/get-all-employees", headers=auth_header(role="Employee"))
    assert response.status_code == 403

def test_get_all_employees_error_handling(client, auth_header, mocker):
    """Test that service errors return secure error messages"""
    mocker.patch("app.controllers.hr_controller.EmployeeService.get_all_employees", 
                 side_effect=Exception("Database connection failed"))
    response = client.get("/api/hr-functionality/get-all-employees", headers=auth_header(role="Admin"))
    assert response.status_code == 500
    data = json.loads(response.data)
    # Should return generic message, not expose internal error
    assert "An error occurred" in data["Message"]
    assert "Database connection failed" not in data["Message"]

def test_upsert_employee_success(client, auth_header, mocker):
    mocker.patch("app.controllers.hr_controller.EmployeeService.upsert_employee", return_value="E456")
    response = client.post("/api/hr-functionality/upsert-employee", 
                           data=json.dumps({"EmployeeId": "E456", "FirstName": "John"}),
                           headers=auth_header(role="HR"),
                           content_type="application/json")
    assert response.status_code == 200
    assert b"Employee updated successfully" in response.data

def test_upsert_employee_missing_body(client, auth_header):
    """Test validation for missing request body"""
    response = client.post("/api/hr-functionality/upsert-employee", 
                           headers=auth_header(role="HR"),
                           content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "Request body is required" in data["Message"]

def test_upsert_employee_missing_id(client, auth_header):
    """Test validation for missing EmployeeId"""
    response = client.post("/api/hr-functionality/upsert-employee", 
                           data=json.dumps({"FirstName": "John"}),
                           headers=auth_header(role="HR"),
                           content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "EmployeeId is required" in data["Message"]

def test_upsert_employee_validation_error(client, auth_header, mocker):
    """Test ValueError handling"""
    mocker.patch("app.controllers.hr_controller.EmployeeService.upsert_employee", 
                 side_effect=ValueError("Invalid email format"))
    response = client.post("/api/hr-functionality/upsert-employee", 
                           data=json.dumps({"EmployeeId": "E456", "Email": "invalid"}),
                           headers=auth_header(role="HR"),
                           content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "Invalid email format" in data["Message"]

def test_upsert_employee_not_found(client, auth_header, mocker):
    """Test LookupError handling for employee not found"""
    mocker.patch("app.controllers.hr_controller.EmployeeService.upsert_employee", 
                 side_effect=LookupError("Employee not found"))
    response = client.post("/api/hr-functionality/upsert-employee", 
                           data=json.dumps({"EmployeeId": "E999"}),
                           headers=auth_header(role="HR"),
                           content_type="application/json")
    assert response.status_code == 404
    data = json.loads(response.data)
    assert "Employee not found" in data["Message"]

def test_get_monthly_report_success(client, auth_header, mocker):
    """Test monthly report generation"""
    mocker.patch("app.controllers.hr_controller.ReportService.get_monthly_report", return_value=[])
    response = client.get("/api/hr-functionality/monthly-report?month=1&year=2025", 
                          headers=auth_header(role="Admin"))
    assert response.status_code == 200

def test_get_monthly_report_missing_params(client, auth_header):
    """Test validation for missing month/year parameters"""
    response = client.get("/api/hr-functionality/monthly-report?month=1", 
                          headers=auth_header(role="Admin"))
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "Month and Year are required" in data["Message"]

def test_add_project_success(client, auth_header, mocker):
    """Test successful project creation"""
    mocker.patch("app.controllers.hr_controller.HRService.add_project", return_value=123)
    response = client.post("/api/hr-functionality/add-project", 
                           data=json.dumps({"ProjectName": "New Project", "Description": "Test"}),
                           headers=auth_header(role="Admin"),
                           content_type="application/json")
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data["ProjectId"] == 123

def test_add_project_missing_name(client, auth_header):
    """Test validation for missing project name"""
    response = client.post("/api/hr-functionality/add-project", 
                           data=json.dumps({"Description": "Test"}),
                           headers=auth_header(role="Admin"),
                           content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "ProjectName is required" in data["Message"]
