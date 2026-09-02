from flask import request, jsonify, g
from ..services.timelog_service import TimelogService
from ..utils.logger import Logger


class TimelogController:
    @staticmethod
    def save_report():
        Logger.info("Save timelog report request received")
        try:
            data = request.get_json()
            if not data:
                return jsonify({"Message": "Request body must be JSON"}), 400
            entries = data.get('entries')
            file_name = data.get('fileName')
            if not entries or not isinstance(entries, list):
                return jsonify({"Message": "'entries' must be a non-empty array"}), 400
            uploaded_by = g.get('employee_id')
            summary = TimelogService.save_report(entries, file_name, uploaded_by)
            Logger.info("Timelog report saved successfully", groups=len(summary), uploaded_by=uploaded_by)
            return jsonify({"Message": "Timelog report saved successfully", "groups": summary}), 200
        except ValueError as ve:
            Logger.warning("Validation error saving timelog report", error=str(ve))
            return jsonify({"Message": str(ve)}), 400
        except Exception as e:
            Logger.error("Unexpected error saving timelog report", error=str(e), error_type=type(e).__name__)
            return jsonify({"Message": "An error occurred while saving the timelog report. Please try again."}), 500

    @staticmethod
    def get_entries():
        try:
            employee_name = request.args.get('employeeName')
            employee_id = request.args.get('employeeId')
            from_date = request.args.get('from')
            to_date = request.args.get('to')
            rows = TimelogService.get_entries(
                employee_name=employee_name, employee_id=employee_id,
                from_date=from_date, to_date=to_date,
            )
            return jsonify(rows), 200
        except Exception as e:
            Logger.error("Unexpected error fetching timelog entries", error=str(e), error_type=type(e).__name__)
            return jsonify({"Message": "An error occurred while fetching timelog entries."}), 500

    @staticmethod
    def get_reports():
        try:
            reports = TimelogService.get_reports_summary()
            return jsonify(reports), 200
        except Exception as e:
            Logger.error("Unexpected error fetching timelog reports", error=str(e), error_type=type(e).__name__)
            return jsonify({"Message": "An error occurred while fetching timelog reports."}), 500
