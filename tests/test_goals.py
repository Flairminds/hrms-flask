"""
Unit tests for goals service.

Tests goal assignment and employee list retrieval functionality.
"""
import pytest
from unittest.mock import MagicMock


def test_check_lead_and_emp_id_both_exist(app, mocker):
    """Test validation when both employee and lead exist"""
    from app.services.goals_service import GoalsService
    
    # Mock Employee.query to return valid employees
    mock_query = mocker.patch('app.services.goals_service.Employee.query')
    mock_query.filter_by.return_value.first.return_value = MagicMock()
    
    result = GoalsService._check_lead_and_emp_id("E123", "E456")
    
    assert result is True
    assert mock_query.filter_by.call_count == 2


def test_check_lead_and_emp_id_employee_not_found(app, mocker):
    """Test validation when employee does not exist"""
    from app.services.goals_service import GoalsService
    
    # Mock Employee.query to return None for employee
    mock_query = mocker.patch('app.services.goals_service.Employee.query')
    mock_query.filter_by.return_value.first.side_effect = [None, MagicMock()]
    
    result = GoalsService._check_lead_and_emp_id("E999", "E456")
    
    assert result is False


def test_assign_lead_to_emp_success_new_assignment(app, mocker):
    """Test successful lead assignment for new employee"""
    from app.services.goals_service import GoalsService
    from app.models.goals import LeadAssignedByHR
    
    # Mock the validation
    mocker.patch.object(GoalsService, '_check_lead_and_emp_id', return_value=True)
    
    # Mock the query to return None (no existing assignment)
    mock_query = mocker.patch('app.services.goals_service.LeadAssignedByHR.query')
    mock_query.filter_by.return_value.first.return_value = None
    
    # Mock db.session
    mock_session = mocker.patch('app.services.goals_service.db.session')
    
    result = GoalsService.assign_lead_to_emp("E123", "E456")
    
    assert result is True
    assert mock_session.add.called
    assert mock_session.commit.called


def test_assign_lead_to_emp_success_update_existing(app, mocker):
    """Test successful lead assignment update for existing employee"""
    from app.services.goals_service import GoalsService
    
    # Mock the validation
    mocker.patch.object(GoalsService, '_check_lead_and_emp_id', return_value=True)
    
    # Mock the query to return existing assignment
    existing_assignment = MagicMock()
    mock_query = mocker.patch('app.services.goals_service.LeadAssignedByHR.query')
    mock_query.filter_by.return_value.first.return_value = existing_assignment
    
    # Mock db.session
    mock_session = mocker.patch('app.services.goals_service.db.session')
    
    result = GoalsService.assign_lead_to_emp("E123", "E789")
    
    assert result is True
    assert existing_assignment.lead_id == "E789"
    assert mock_session.commit.called


def test_assign_lead_to_emp_invalid_ids(app, mocker):
    """Test lead assignment with invalid employee or lead IDs"""
    from app.services.goals_service import GoalsService
    
    # Mock the validation to return False
    mocker.patch.object(GoalsService, '_check_lead_and_emp_id', return_value=False)
    
    result = GoalsService.assign_lead_to_emp("E999", "E456")
    
    assert result is False


def test_assign_lead_to_emp_database_error(app, mocker):
    """Test error handling for database errors"""
    from app.services.goals_service import GoalsService
    
    # Mock the validation
    mocker.patch.object(GoalsService, '_check_lead_and_emp_id', return_value=True)
    
    # Mock the query to raise an exception
    mock_query = mocker.patch('app.services.goals_service.LeadAssignedByHR.query')
    mock_query.filter_by.side_effect = Exception("Database connection failed")
    
    # Mock db.session
    mock_session = mocker.patch('app.services.goals_service.db.session')
    
    with pytest.raises(Exception) as exc_info:
        GoalsService.assign_lead_to_emp("E123", "E456")
    
    assert "database error occurred" in str(exc_info.value).lower()
    assert mock_session.rollback.called


def test_get_all_employee_list_success(app, mocker):
    """Test successful retrieval of employee list"""
    from app.services.goals_service import GoalsService
    
    # Mock the query result
    mock_result = [
        ("E123", "John", "Doe"),
        ("E456", "Jane", "Smith")
    ]
    mock_execute = mocker.patch('app.services.goals_service.db.session.execute')
    mock_execute.return_value.fetchall.return_value = mock_result
    
    result = GoalsService.get_all_employee_list()
    
    assert len(result) == 2
    assert result[0]['EmployeeId'] == "E123"
    assert result[0]['FullName'] == "John Doe"
    assert result[1]['EmployeeId'] == "E456"


def test_get_all_employee_list_error(app, mocker):
    """Test error handling when fetching employee list"""
    from app.services.goals_service import GoalsService
    
    # Mock the query to raise an exception
    mock_execute = mocker.patch('app.services.goals_service.db.session.execute')
    mock_execute.side_effect = Exception("Query failed")
    
    with pytest.raises(Exception) as exc_info:
        GoalsService.get_all_employee_list()
    
    assert "database error occurred" in str(exc_info.value).lower()
