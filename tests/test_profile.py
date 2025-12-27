import json
from unittest.mock import MagicMock

def test_get_profile_success(client, auth_header, mocker):
    # Mocking complex return dict
    mock_emp = MagicMock()
    mock_emp.EmployeeId = "E123"
    mock_emp.FirstName = "John"
    mock_emp.LastName = "Doe"
    mock_emp.Email = "john@example.com"
    mock_emp.ContactNumber = "123"
    
    mocker.patch("app.controllers.profile_controller.ProfileService.get_employee_profile", 
                 return_value={"employee": mock_emp, "addresses": [], "skills": []})
    
    response = client.get("/api/employees-details/E123", headers=auth_header(role="Employee"))
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["FirstName"] == "John"

def test_cancel_leave_success(client, auth_header, mocker):
    mocker.patch("app.controllers.profile_controller.ProfileService.cancel_leave", return_value=True)
    response = client.patch("/api/employees-details/cancel-leave", 
                             data=json.dumps({"LeaveTranId": 1}),
                             headers=auth_header(role="Employee"),
                             content_type="application/json")
    assert response.status_code == 200
    assert b"Leave cancelled successfully" in response.data
