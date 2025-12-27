import json
from unittest.mock import MagicMock

def test_login_success(client, mocker):
    # Mocking AccountService.validate_user
    mock_user = MagicMock()
    mock_user.EmployeeId = "E123"
    mock_user.RoleName = "Admin"
    mock_user.Email = "admin@example.com"
    mock_user.FullName = "Admin User"
    mock_user.EmploymentStatus = "Active"
    
    mocker.patch("app.controllers.account_controller.AccountService.validate_user", return_value=mock_user)
    
    response = client.post("/api/account/login", 
                           data=json.dumps({"Username": "E123", "Password": "password"}),
                           content_type="application/json")
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "AccessToken" in data
    assert data["RoleName"] == "Admin"

def test_login_invalid_credentials(client, mocker):
    mocker.patch("app.controllers.account_controller.AccountService.validate_user", return_value=None)
    
    response = client.post("/api/account/login", 
                           data=json.dumps({"Username": "wrong", "Password": "wrong"}),
                           content_type="application/json")
    
    assert response.status_code == 401
    assert b"Invalid Username or Password" in response.data

def test_login_gatekeeping_relieved(client, mocker):
    mock_user = MagicMock()
    mock_user.EmploymentStatus = "Relieved"
    mocker.patch("app.controllers.account_controller.AccountService.validate_user", return_value=mock_user)
    
    response = client.post("/api/account/login", 
                           data=json.dumps({"Username": "E123", "Password": "password"}),
                           content_type="application/json")
    
    assert response.status_code == 401
    assert b"Employee is Relieved" in response.data

def test_send_otp_success(client, mocker):
    mocker.patch("app.controllers.account_controller.AccountService.get_employee_email", return_value="user@example.com")
    mocker.patch("app.controllers.account_controller.AccountService.generate_otp", return_value="123456")
    mocker.patch("app.controllers.account_controller.AccountService.save_otp", return_value=True)
    mocker.patch("app.controllers.account_controller.MailUtil.send_email", return_value=True)
    
    response = client.post("/api/account/send-otp", 
                           data=json.dumps({"Username": "E123"}),
                           content_type="application/json")
    
    assert response.status_code == 200
    assert b"OTP sent successfully" in response.data

def test_verify_otp_success(client, mocker):
    mocker.patch("app.controllers.account_controller.AccountService.verify_otp", return_value=True)
    
    response = client.post("/api/account/verify-otp", 
                           data=json.dumps({"Username": "E123", "OTP": "123456"}),
                           content_type="application/json")
    
    assert response.status_code == 200
    assert b"OTP verified successfully" in response.data

def test_verify_otp_invalid(client, mocker):
    mocker.patch("app.controllers.account_controller.AccountService.verify_otp", return_value=False)
    
    response = client.post("/api/Account/VerifyOtp", 
                           data=json.dumps({"Username": "E123", "OTP": "000000"}),
                           content_type="application/json")
    
    assert response.status_code == 400
    assert b"Invalid or expired OTP" in response.data
