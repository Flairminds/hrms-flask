import json
from unittest.mock import MagicMock

def test_get_pcs_success(client, auth_header, mocker):
    mocker.patch("app.controllers.assets_controller.AssetService.get_all_pcs", return_value=[])
    response = client.get("/api/pcs", headers=auth_header(role="Admin"))
    assert response.status_code == 200

def test_assign_pc_missing_data(client, auth_header):
    response = client.post("/api/assignments", 
                           data=json.dumps({"EmployeeID": "E123"}), # Missing PCID
                           headers=auth_header(role="Admin"),
                           content_type="application/json")
    assert response.status_code == 400
    assert b"EmployeeID and PCID are required" in response.data
