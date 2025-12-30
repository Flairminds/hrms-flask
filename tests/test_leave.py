import json
from unittest.mock import MagicMock

def test_get_leave_types_success(client, auth_header, mocker):
    mocker.patch("app.controllers.leave_controller.LeaveService.get_leave_types_and_approver", 
                 return_value={"leaveTypes": [{"id": 1, "name": "Sick"}], "approver": "Manager"})
    
    response = client.get("/api/leave-functionality/leave-types-and-approver?employeeId=E123", headers=auth_header())
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data["leaveTypes"]) > 0

def test_get_leave_types_missing_employee_id(client, auth_header):
    """Test validation for missing employeeId parameter"""
    response = client.get("/api/leave-functionality/leave-types-and-approver", headers=auth_header())
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "EmployeeId is required" in data["Message"]

def test_get_leave_types_employee_not_found(client, auth_header, mocker):
    """Test LookupError handling for employee not found"""
    mocker.patch("app.controllers.leave_controller.LeaveService.get_leave_types_and_approver", 
                 side_effect=LookupError("Employee not found"))
    response = client.get("/api/leave-functionality/leave-types-and-approver?employeeId=E999", headers=auth_header())
    assert response.status_code == 404
    data = json.loads(response.data)
    assert "Employee not found" in data["Message"]

def test_get_leave_types_unauthorized(client):
    response = client.get("/api/leave-functionality/leave-types-and-approver?employeeId=E123")
    assert response.status_code == 401 # Missing JWT

def test_get_leave_types_error_handling(client, auth_header, mocker):
    """Test that service errors return secure error messages"""
    mocker.patch("app.controllers.leave_controller.LeaveService.get_leave_types_and_approver", 
                 side_effect=Exception("Database error"))
    response = client.get("/api/leave-functionality/leave-types-and-approver?employeeId=E123", headers=auth_header())
    assert response.status_code == 500
    data = json.loads(response.data)
    assert "An error occurred" in data["Message"]
    assert "Database error" not in data["Message"]

def test_insert_leave_success(client, auth_header, mocker):
    mocker.patch("app.controllers.leave_controller.LeaveService.insert_leave_transaction", return_value=101)
    
    leave_data = {
        "EmployeeId": "E123",
        "LeaveType": 1,
        "FromDate": "2024-01-01",
        "ToDate": "2024-01-02",
        "NoOfDays": 2
    }
    
    response = client.post("/api/leave-functionality/insert-leave-transaction", 
                           data=json.dumps(leave_data),
                           headers=auth_header(role="Employee"),
                           content_type="application/json")
    
    assert response.status_code == 201
    assert b"Leave applied successfully" in response.data

def test_insert_leave_missing_body(client, auth_header):
    """Test validation for missing request body"""
    response = client.post("/api/leave-functionality/insert-leave-transaction", 
                           headers=auth_header(role="Employee"),
                           content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "Request body must be JSON" in data["Message"]

def test_insert_leave_validation_error(client, auth_header, mocker):
    """Test ValueError handling for invalid leave data"""
    mocker.patch("app.controllers.leave_controller.LeaveService.insert_leave_transaction", 
                 side_effect=ValueError("Invalid leave dates"))
    leave_data = {"EmployeeId": "E123", "LeaveType": 1}
    response = client.post("/api/leave-functionality/insert-leave-transaction", 
                           data=json.dumps(leave_data),
                           headers=auth_header(role="Employee"),
                           content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "Invalid leave dates" in data["Message"]

def test_update_status_success(client, auth_header, mocker):
    """Test successful leave status update"""
    mocker.patch("app.controllers.leave_controller.LeaveService.update_leave_status", 
                 return_value=("Status updated successfully", True))
    response = client.put("/api/leave-functionality/update-status", 
                          data=json.dumps({"LeaveTranId": 1, "LeaveStatus": "Approved"}),
                          headers=auth_header(role="Admin"),
                          content_type="application/json")
    assert response.status_code == 200

def test_update_status_forbidden_for_employee(client, auth_header):
    # Only Admin/HR/Lead can update status as per auth_config
    response = client.put("/api/leave-functionality/update-status", 
                          data=json.dumps({"LeaveTranId": 1, "LeaveStatus": "Approved"}),
                          headers=auth_header(role="Employee"),
                          content_type="application/json")
    
    assert response.status_code == 403 # RBAC blocking

def test_update_status_missing_params(client, auth_header):
    """Test validation for missing required parameters"""
    response = client.put("/api/leave-functionality/update-status", 
                          data=json.dumps({"LeaveTranId": 1}),
                          headers=auth_header(role="Admin"),
                          content_type="application/json")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "LeaveTranId and LeaveStatus are required" in data["Message"]

def test_update_status_transaction_not_found(client, auth_header, mocker):
    """Test handling of non-existent transaction"""
    mocker.patch("app.controllers.leave_controller.LeaveService.update_leave_status", 
                 return_value=("Transaction not found", False))
    response = client.put("/api/leave-functionality/update-status", 
                          data=json.dumps({"LeaveTranId": 999, "LeaveStatus": "Approved"}),
                          headers=auth_header(role="Admin"),
                          content_type="application/json")
    assert response.status_code == 404

def test_get_holidays_success(client, auth_header, mocker):
    """Test fetching holidays list"""
    from datetime import date
    mock_holiday = MagicMock()
    mock_holiday.HolidayDate = date(2025, 1, 1)
    mock_holiday.HolidayName = "New Year"
    
    mocker.patch("app.controllers.leave_controller.LeaveService.get_holidays", 
                 return_value=[mock_holiday])
    response = client.get("/api/leave-functionality/get-holidays", headers=auth_header())
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data) > 0

def test_get_leave_details_success(client, auth_header, mocker):
    """Test fetching leave details for an employee"""
    mocker.patch("app.controllers.leave_controller.LeaveService.get_leave_details", return_value=[])
    response = client.get("/api/leave-functionality/get-leave-details/E123?year=2025", 
                          headers=auth_header())
    assert response.status_code == 200

def test_get_leave_details_employee_not_found(client, auth_header, mocker):
    """Test LookupError handling for employee not found"""
    mocker.patch("app.controllers.leave_controller.LeaveService.get_leave_details", 
                 side_effect=LookupError("Employee not found"))
    response = client.get("/api/leave-functionality/get-leave-details/E999", 
                          headers=auth_header())
    assert response.status_code == 404
