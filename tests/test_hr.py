import json
from unittest.mock import MagicMock

def test_get_all_employees_admin(client, auth_header, mocker):
    mocker.patch("app.controllers.hr_controller.HRService.get_all_employees", return_value=[])
    response = client.get("/api/hr-functionality/get-all-employees", headers=auth_header(role="Admin"))
    assert response.status_code == 200

def test_get_all_employees_forbidden(client, auth_header):
    # Employee role should not access HR functionality
    response = client.get("/api/hr-functionality/get-all-employees", headers=auth_header(role="Employee"))
    assert response.status_code == 403

def test_upsert_employee_success(client, auth_header, mocker):
    mocker.patch("app.controllers.hr_controller.HRService.upsert_employee", return_value="E456")
    response = client.post("/api/hr-functionality/upsert-employee", 
                           data=json.dumps({"EmployeeId": "E456", "FirstName": "John"}),
                           headers=auth_header(role="HR"),
                           content_type="application/json")
    assert response.status_code == 200
    assert b"Employee updated successfully" in response.data
