from flask import request, jsonify
from ..services.allocation_service import AllocationService

class AllocationController:
    @staticmethod
    def assign_employee():
        try:
            data = request.json
            eid = data.get("employee_id")
            pid = data.get("project_id")
            cid = data.get("work_category_id")
            if not all([eid, pid, cid]):
                return jsonify({"error": "Employee ID, Project ID, and Work Category ID are required"}), 400
            AllocationService.assign_employee(eid, pid, cid, data.get("allocation", 1.0))
            return jsonify({"message": f"Employee {eid} assigned successfully"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
