"""
Scorecard Controller for Capability Development
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date

from ..services.scorecard_service import ScorecardService
from ..utils.logger import Logger


class ScorecardController:
    """Controller for scorecard/metrics endpoints."""

    @staticmethod
    @jwt_required()
    def get_my_metrics():
        """Get current period metrics for logged-in user."""
        try:
            employee_id = get_jwt_identity()
            period_type = request.args.get("periodType", "monthly")
            
            result = ScorecardService.get_my_metrics(employee_id, period_type)
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in get_my_metrics", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_metrics_history():
        """Get historical metrics."""
        try:
            employee_id = get_jwt_identity()
            period_type = request.args.get("periodType", "monthly")
            limit = int(request.args.get("limit", 12))
            
            result = ScorecardService.get_metrics_history(employee_id, period_type, limit)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_metrics_history", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_employee_metrics(employee_id):
        """Get metrics for specific employee (manager/HR access)."""
        try:
            period_type = request.args.get("periodType", "monthly")
            result = ScorecardService.get_my_metrics(employee_id, period_type)
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in get_employee_metrics", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def calculate_metrics():
        """Manually recalculate metrics for a period (admin only)."""
        try:
            payload = request.get_json()
            employee_id = payload.get("employeeId")
            period_type = payload.get("periodType", "monthly")
            period_start_str = payload.get("periodStart")
            period_end_str = payload.get("periodEnd")
            
            if not all([employee_id, period_start_str, period_end_str]):
                return jsonify({"error": "Missing required fields"}), 400
            
            period_start = datetime.strptime(period_start_str, "%Y-%m-%d").date()
            period_end = datetime.strptime(period_end_str, "%Y-%m-%d").date()
            
            result = ScorecardService.calculate_period_metrics(
                employee_id, period_type, period_start, period_end
            )
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in calculate_metrics", error=str(e))
            return jsonify({"error": str(e)}), 500
