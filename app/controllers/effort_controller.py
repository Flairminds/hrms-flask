from flask import request, jsonify, g
from ..services.effort_service import EffortService
from ..utils.logger import Logger


class EffortController:
    """Controller for Effort Analyser persistence (save/fetch/update task reports)."""

    @staticmethod
    def save_report():
        """Saves (upserts) a batch of parsed Excel task rows, grouped per project."""
        Logger.info("Save effort report request received")

        try:
            data = request.get_json()
            if not data:
                return jsonify({"Message": "Request body must be JSON"}), 400

            tasks = data.get('tasks')
            file_name = data.get('fileName')
            if not tasks or not isinstance(tasks, list):
                return jsonify({"Message": "'tasks' must be a non-empty array"}), 400

            uploaded_by = g.get('employee_id')
            summary = EffortService.save_report(tasks, file_name, uploaded_by)

            Logger.info("Effort report saved successfully",
                        projects=len(summary), uploaded_by=uploaded_by)

            return jsonify({
                "Message": "Effort report saved successfully",
                "projects": summary,
            }), 200

        except ValueError as ve:
            Logger.warning("Validation error saving effort report", error=str(ve))
            return jsonify({"Message": str(ve)}), 400

        except Exception as e:
            Logger.error("Unexpected error saving effort report",
                         error=str(e), error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while saving the effort report. Please try again."
            }), 500

    @staticmethod
    def get_tasks():
        """Flattened task list across projects, optionally filtered."""
        Logger.info("Get effort tasks request received")

        try:
            project_name = request.args.get('project')
            from_date = request.args.get('from')
            to_date = request.args.get('to')

            rows = EffortService.get_tasks(project_name=project_name, from_date=from_date, to_date=to_date)

            return jsonify(rows), 200

        except Exception as e:
            Logger.error("Unexpected error fetching effort tasks",
                         error=str(e), error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while fetching effort tasks. Please try again."
            }), 500

    @staticmethod
    def get_reports():
        """Lightweight per-project report listing (no task payload)."""
        Logger.info("Get effort reports request received")

        try:
            reports = EffortService.get_reports_summary()
            return jsonify(reports), 200

        except Exception as e:
            Logger.error("Unexpected error fetching effort reports",
                         error=str(e), error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while fetching effort reports. Please try again."
            }), 500
