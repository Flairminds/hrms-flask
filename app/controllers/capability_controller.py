from flask import jsonify, request

from ..services.capability_service import CapabilityService


class CapabilityController:
    """Controller for capability development lead and assignment APIs."""

    # Leads
    @staticmethod
    def get_leads():
        try:
            leads = CapabilityService.get_leads()
            return (
                jsonify(
                    {
                        "status": "success",
                        "data": leads,
                        "message": "Capability Development Leads retrieved successfully",
                    }
                ),
                200,
            )
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def create_leads():
        try:
            data = request.get_json() or {}
            employee_ids = data.get("employeeIds")
            new_leads = CapabilityService.create_leads(employee_ids)
            return (
                jsonify(
                    {
                        "status": "success",
                        "data": new_leads,
                        "message": "Capability Development Leads added successfully",
                    }
                ),
                201,
            )
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def delete_lead(lead_id: int):
        try:
            payload = CapabilityService.delete_lead(lead_id)
            return (
                jsonify(
                    {
                        "status": "success",
                        "data": payload,
                        "message": "Capability Development Lead and related assignments deleted successfully",
                    }
                ),
                200,
            )
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    # Assignments
    @staticmethod
    def get_assignments():
        try:
            assignments = CapabilityService.get_assignments()
            return (
                jsonify(
                    {
                        "status": "success",
                        "data": assignments,
                        "message": "Assigned Capability Leads retrieved successfully",
                    }
                ),
                200,
            )
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def create_assignment():
        try:
            data = request.get_json() or {}
            emp_id = data.get("employeeId")
            lead_id = data.get("leadId")
            assignment_id = CapabilityService.create_assignment(emp_id, lead_id)
            return (
                jsonify(
                    {
                        "status": "success",
                        "data": {"CapabilityDevelopmentLeadAssignmentId": assignment_id},
                        "message": "Assignment created successfully",
                    }
                ),
                201,
            )
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def update_assignment(assignment_id: int):
        try:
            data = request.get_json() or {}
            emp_id = data.get("employeeId")
            lead_id = data.get("leadId")
            CapabilityService.update_assignment(assignment_id, emp_id, lead_id)
            return (
                jsonify(
                    {
                        "status": "success",
                        "data": {"CapabilityDevelopmentLeadAssignmentId": assignment_id},
                        "message": "Assignment updated successfully",
                    }
                ),
                200,
            )
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except LookupError as le:
            return jsonify({"status": "error", "message": str(le)}), 404
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def delete_assignment(assignment_id: int):
        try:
            CapabilityService.delete_assignment(assignment_id)
            return (
                jsonify(
                    {
                        "status": "success",
                        "data": {},
                        "message": "Assignment deleted successfully",
                    }
                ),
                200,
            )
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
