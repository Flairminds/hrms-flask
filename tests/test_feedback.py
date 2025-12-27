import json
from unittest.mock import MagicMock

def test_add_feedback_success(client, auth_header, mocker):
    mocker.patch("app.controllers.feedback_controller.FeedbackService.add_feedback", return_value=501)
    
    feedback_data = {
        "EmployeeId": "E123",
        "Category": "Quarterly",
        "Goal": ["Learn Flask"],
        "Measure": ["Finish migration"],
        "Comments": ["Good job"],
        "TargetDate": "2024-12-31"
    }
    
    response = client.post("/api/lead-functionality/add-emp-report", 
                           data=json.dumps(feedback_data),
                           headers=auth_header(role="Lead"),
                           content_type="application/json")
    
    assert response.status_code == 201
    assert b"Feedback added successfully" in response.data

def test_add_feedback_missing_emp_id(client, auth_header):
    response = client.post("/api/lead-functionality/add-emp-report", 
                           data=json.dumps({"Category": "Test"}),
                           headers=auth_header(role="Lead"),
                           content_type="application/json")
    assert response.status_code == 400
    assert b"EmployeeId is required" in response.data
