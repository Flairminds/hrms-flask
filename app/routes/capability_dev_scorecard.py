"""
Capability Development Routes - Scorecard
"""

from flask import Blueprint
from ..controllers.scorecard_controller import ScorecardController

# Create blueprint
capability_dev_scorecard_bp = Blueprint('capability_dev_scorecard', __name__)

# My metrics
@capability_dev_scorecard_bp.route("/scorecard/my-metrics", methods=["GET"])
def get_my_metrics():
    """Get my current period metrics"""
    return ScorecardController.get_my_metrics()

@capability_dev_scorecard_bp.route("/scorecard/history", methods=["GET"])
def get_metrics_history():
    """Get my metrics history"""
    return ScorecardController.get_metrics_history()

# Employee metrics (for managers/HR)
@capability_dev_scorecard_bp.route("/scorecard/employee/<employee_id>", methods=["GET"])
def get_employee_metrics(employee_id):
    """Get metrics for specific employee"""
    return ScorecardController.get_employee_metrics(employee_id)

# Admin functions
@capability_dev_scorecard_bp.route("/scorecard/calculate", methods=["POST"])
def calculate_metrics():
    """Manually recalculate metrics"""
    return ScorecardController.calculate_metrics()
