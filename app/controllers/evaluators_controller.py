from flask import jsonify, request

from ..services.evaluators_service import EvaluatorsService


class EvaluatorsController:
    """Controller for HR evaluator assignment and queries."""

    @staticmethod
    def assign_evaluators_to_emp():
        try:
            data = request.get_json() or {}
            emp_id = data.get("empId")
            evaluator_ids = data.get("evaluatorIds", [])
            result = EvaluatorsService.assign_evaluators(emp_id, evaluator_ids)
            return (
                jsonify(
                    {
                        "message": "Evaluators assigned successfully",
                        "emailFailures": result.get("emailFailures", []),
                    }
                ),
                200,
            )
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def send_evaluator_reminder():
        try:
            data = request.get_json() or {}
            emp_id = data.get("empId")
            evaluator_ids = data.get("evaluatorIds", [])
            result = EvaluatorsService.send_evaluator_reminder(emp_id, evaluator_ids)
            return (
                jsonify(
                    {
                        "message": "Reminder emails sent successfully",
                        "emailFailures": result.get("emailFailures", []),
                    }
                ),
                200,
            )
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_all_employee_evaluators():
        try:
            rows = EvaluatorsService.get_all_employee_evaluators()
            return jsonify(rows), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_all_employees_for_evaluators(evaluator_id: str):
        try:
            rows = EvaluatorsService.get_all_employees_for_evaluator(evaluator_id)
            return jsonify(rows), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def delete_evaluators():
        try:
            data = request.get_json(force=True) or {}
            emp_id = data.get("empId")
            evaluator_ids = data.get("evaluatorIds", [])
            EvaluatorsService.delete_evaluators(emp_id, evaluator_ids)
            return jsonify({"message": "Evaluator(s) deleted successfully"}), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500
