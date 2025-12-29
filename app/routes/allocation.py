from flask import Blueprint
from ..controllers.allocation_controller import AllocationController

allocation_bp = Blueprint('allocation', __name__)

@allocation_bp.route('/assign-employee', methods=['POST'])
def assign_employee():
    return AllocationController.assign_employee()
