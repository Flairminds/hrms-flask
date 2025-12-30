"""
Tests for health check endpoints
"""

import json
import pytest
from unittest.mock import patch
from sqlalchemy.exc import SQLAlchemyError


def test_health_check_success(client):
    """Test that health check endpoint returns 200."""
    response = client.get('/health')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert data['message'] == 'Server is running'
    assert 'service' in data


def test_database_health_check_success(client, mocker):
    """Test that database health check returns 200 when DB is connected."""
    # Mock successful database query
    mock_result = mocker.Mock()
    mock_result.scalar.return_value = 1
    mocker.patch('app.routes.health.db.session.execute', return_value=mock_result)
    
    response = client.get('/health/db')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert data['database'] == 'connected'
    assert 'message' in data


def test_database_health_check_connection_failure(client, mocker):
    """Test that database health check returns 503 when DB connection fails."""
    # Mock database connection failure
    mocker.patch(
        'app.routes.health.db.session.execute',
        side_effect=SQLAlchemyError("Connection refused")
    )
    
    response = client.get('/health/db')
    
    assert response.status_code == 503
    data = json.loads(response.data)
    assert data['status'] == 'unhealthy'
    assert data['database'] == 'disconnected'
    assert 'error' in data


def test_database_health_check_unexpected_result(client, mocker):
    """Test that database health check returns 503 for unexpected query result."""
    # Mock unexpected query result
    mock_result = mocker.Mock()
    mock_result.scalar.return_value = None  # Unexpected result
    mocker.patch('app.routes.health.db.session.execute', return_value=mock_result)
    
    response = client.get('/health/db')
    
    assert response.status_code == 503
    data = json.loads(response.data)
    assert data['status'] == 'unhealthy'
    assert data['database'] == 'error'


def test_health_endpoints_no_authentication_required(client):
    """Test that health check endpoints don't require authentication."""
    # No auth headers provided
    response_health = client.get('/health')
    response_db = client.get('/health/db')
    
    # Should not return 401 Unauthorized
    assert response_health.status_code != 401
    assert response_db.status_code in [200, 503]  # Either success or DB error, not auth error
