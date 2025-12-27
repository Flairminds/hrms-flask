import json
from unittest.mock import MagicMock

def test_get_leave_types_success(client, auth_header, mocker):
    mocker.patch("app.controllers.leave_controller.LeaveService.get_leave_types_and_approver", 
                 return_value={"leaveTypes": [{"id": 1, "name": "Sick"}], "approver": "Manager"})
    
    response = client.get("/api/leave/leave-types-and-approver?employeeId=E123", headers=auth_header())
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data["leaveTypes"]) > 0

def test_get_leave_types_unauthorized(client):
    response = client.get("/api/leave/leave-types-and-approver?employeeId=E123")
    assert response.status_code == 401 # Missing JWT

def test_insert_leave_success(client, auth_header, mocker):
    mocker.patch("app.controllers.leave_controller.LeaveService.insert_leave_transaction", return_value=101)
    
    leave_data = {
        "EmployeeId": "E123",
        "LeaveType": 1,
        "FromDate": "2024-01-01",
        "ToDate": "2024-01-02",
        "NoOfDays": 2
    }
    
    response = client.post("/api/leave/insert-leave-transaction", 
                           data=json.dumps(leave_data),
                           headers=auth_header(role="Employee"),
                           content_type="application/json")
    
    assert response.status_code == 201
    assert b"Leave applied successfully" in response.data

def test_update_status_forbidden_for_employee(client, auth_header):
    # Only Admin/HR/Lead can update status as per auth_config
    response = client.put("/api/leave/update-status", 
                          data=json.dumps({"LeaveTranId": 1, "LeaveStatus": "Approved"}),
                          headers=auth_header(role="Employee"),
                          content_type="application/json")
    
    assert response.status_code == 403 # RBAC blocking
