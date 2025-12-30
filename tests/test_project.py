"""
Unit tests for project service.

Tests project retrieval and creation functionality.
"""
import pytest
from unittest.mock import MagicMock


def test_get_projects_success(app, mocker):
    """Test successful retrieval of all projects"""
    from app.services.project_service import ProjectService
    
    # Mock the database query result
    mock_result = [
        (1, "Project Alpha", "Client A", "E123"),
        (2, "Project Beta", "Client B", "E456")
    ]
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_execute.return_value.fetchall.return_value = mock_result
    
    result = ProjectService.get_projects()
    
    assert len(result) == 2
    assert result[0]['project_id'] == 1
    assert result[0]['project_name'] == "Project Alpha"
    assert result[0]['client'] == "Client A"
    assert result[0]['lead_by'] == "E123"


def test_get_projects_empty_list(app, mocker):
    """Test retrieval when no projects exist"""
    from app.services.project_service import ProjectService
    
    # Mock empty result
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_execute.return_value.fetchall.return_value = []
    
    result = ProjectService.get_projects()
    
    assert result == []


def test_get_projects_database_error(app, mocker):
    """Test error handling for database errors"""
    from app.services.project_service import ProjectService
    
    # Mock database error
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_execute.side_effect = Exception("Database connection failed")
    
    result = ProjectService.get_projects()
    
    # Should return empty list on error
    assert result == []


def test_get_all_projects_with_leads(app, mocker):
    """Test retrieval of projects with lead information"""
    from app.services.project_service import ProjectService
    
    # Mock the database query result with lead names
    mock_result = [
        (1, "Project Alpha", "John Doe", "E123"),
        (2, "Project Beta", "Jane Smith", "E456")
    ]
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_execute.return_value.fetchall.return_value = mock_result
    
    result = ProjectService.get_all_projects()
    
    assert len(result) == 2
    assert result[0]['project_id'] == 1
    assert result[0]['project_name'] == "Project Alpha"
    assert result[0]['lead_name'] == "John Doe"


def test_get_project_names_success(app, mocker):
    """Test successful retrieval of project names"""
    from app.services.project_service import ProjectService
    
    # Mock the database query result
    mock_result = [
        (1, "Project Alpha"),
        (2, "Project Beta"),
        (3, "Project Gamma")
    ]
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_execute.return_value.fetchall.return_value = mock_result
    
    result = ProjectService.get_project_names()
    
    assert len(result) == 3
    assert result[0]['project_id'] == 1
    assert result[0]['project_name'] == "Project Alpha"
    assert result[2]['project_id'] == 3
    assert result[2]['project_name'] == "Project Gamma"


def test_get_project_names_error(app, mocker):
    """Test error handling when fetching project names"""
    from app.services.project_service import ProjectService
    
    # Mock database error
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_execute.side_effect = Exception("Query failed")
    
    result = ProjectService.get_project_names()
    
    # Should return empty list on error
    assert result == []


def test_insert_project_success(app, mocker):
    """Test successful project insertion"""
    from app.services.project_service import ProjectService
    
    # Mock the database execute and result
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_result = MagicMock()
    mock_result.scalar.return_value = 123  # New project ID
    mock_execute.return_value = mock_result
    
    mock_session = mocker.patch('app.services.project_service.db.session')
    
    result = ProjectService.insert_project("New Project", "Client X", "E789")
    
    assert result == 123
    assert mock_session.commit.called


def test_insert_project_database_error(app, mocker):
    """Test error handling during project insertion"""
    from app.services.project_service import ProjectService
    
    # Mock database error
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_execute.side_effect = Exception("Insert failed")
    
    mock_session = mocker.patch('app.services.project_service.db.session')
    
    result = ProjectService.insert_project("New Project", "Client X", "E789")
    
    assert result is None
    assert mock_session.rollback.called


def test_insert_project_with_none_values(app, mocker):
    """Test project insertion with None values"""
    from app.services.project_service import ProjectService
    
    # Mock the database execute
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_result = MagicMock()
    mock_result.scalar.return_value = 124
    mock_execute.return_value = mock_result
    
    mock_session = mocker.patch('app.services.project_service.db.session')
    
    # Insert with None client and lead_by
    result = ProjectService.insert_project("Project Without Client", None, None)
    
    assert result == 124
    assert mock_session.commit.called


def test_insert_project_commit_failure(app, mocker):
    """Test handling of commit failures"""
    from app.services.project_service import ProjectService
    
    # Mock execute to succeed but commit to fail
    mock_execute = mocker.patch('app.services.project_service.db.session.execute')
    mock_result = MagicMock()
    mock_result.scalar.return_value = 125
    mock_execute.return_value = mock_result
    
    mock_session = mocker.patch('app.services.project_service.db.session')
    mock_session.commit.side_effect = Exception("Commit failed")
    
    result = ProjectService.insert_project("Test Project", "Client", "E123")
    
    assert result is None
    assert mock_session.rollback.called
