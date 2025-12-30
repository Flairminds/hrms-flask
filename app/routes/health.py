"""
Health Check Routes

Provides health check endpoints to verify server and database status.
"""

from flask import Blueprint, jsonify
from sqlalchemy import text
from .. import db
from ..utils.logger import Logger

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint to verify server is running.
    
    Returns:
        200: Server is running
    """
    Logger.debug("Health check endpoint accessed")
    return jsonify({
        "status": "healthy",
        "message": "Server is running",
        "service": "HRMS-Flask Backend"
    }), 200


@health_bp.route('/health/db', methods=['GET'])
def database_health_check():
    """
    Database health check endpoint to verify database connectivity.
    
    Returns:
        200: Database connection is healthy
        503: Database connection failed
    """
    Logger.debug("Database health check endpoint accessed")
    
    try:
        # Execute simple query to test database connection
        result = db.session.execute(text("SELECT 1")).scalar()
        
        if result == 1:
            Logger.info("Database health check passed")
            return jsonify({
                "status": "healthy",
                "message": "Database connection is working",
                "database": "connected"
            }), 200
        else:
            Logger.error("Database health check failed - unexpected result")
            return jsonify({
                "status": "unhealthy",
                "message": "Database connection test failed",
                "database": "error"
            }), 503
            
    except Exception as e:
        Logger.error("Database health check failed", error=str(e))
        return jsonify({
            "status": "unhealthy",
            "message": "Database connection failed",
            "database": "disconnected",
            "error": str(e)
        }), 503
