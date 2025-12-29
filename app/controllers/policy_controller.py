from flask import jsonify, request

from ..services.policy_service import PolicyService


class PolicyController:
    """Controller for policy acknowledgement, email, and warnings."""

    @staticmethod
    def get_policy_acknowledgment(employee_id: str):
        try:
            data = PolicyService.get_policy_acknowledgment(employee_id)
            return jsonify(data), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def update_policy_acknowledgment():
        try:
            if not request.is_json:
                return jsonify({"error": "Content-Type must be application/json"}), 415

            data = request.get_json() or {}
            employee_id = data.get("employeeId")
            policy_name = data.get("policyName")
            acknowledged = data.get("acknowledged", True)

            PolicyService.update_policy_acknowledgment(
                employee_id, policy_name, acknowledged
            )
            return (
                jsonify(
                    {
                        "message": "Policy acknowledgment updated successfully",
                        "employeeId": employee_id,
                        "policyName": policy_name,
                        "acknowledged": acknowledged,
                    }
                ),
                200,
            )
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def send_policy_email():
        try:
            data = request.get_json() or {}
            employee_id = data.get("employeeId")
            result = PolicyService.send_policy_email(employee_id)
            return (
                jsonify(
                    {
                        "message": "Email sent successfully",
                        "employeeId": result["employeeId"],
                        "employeeName": result["employeeName"],
                    }
                ),
                200,
            )
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except RuntimeError as re:
            return jsonify({"error": str(re)}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def update_warning_count():
        try:
            data = request.get_json() or {}
            employee_id = data.get("employeeId")
            new_count = PolicyService.update_warning_count(employee_id)
            return (
                jsonify(
                    {
                        "message": "Warning count updated successfully",
                        "employeeId": employee_id,
                        "warningCount": new_count,
                    }
                ),
                200,
            )
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_warning_count(employee_id: str):
        try:
            count = PolicyService.get_warning_count(employee_id)
            return jsonify({"warningCount": count}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
