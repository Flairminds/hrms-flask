from datetime import date, timedelta
from flask import request, jsonify, g, current_app
from ..services.timelog_service import TimelogService
from ..utils.logger import Logger

ZYMMR_DEFAULT_SYNC_DAYS = 7  # default window when no range is given: last 7 days including today


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

    @staticmethod
    def get_zymmr_last_sync():
        try:
            info = TimelogService.get_last_zymmr_sync()
            return jsonify(info), 200
        except Exception as e:
            Logger.error("Unexpected error fetching last Zymmr sync", error=str(e), error_type=type(e).__name__)
            return jsonify({"Message": "An error occurred while fetching the last Zymmr sync time."}), 500

    @staticmethod
    def sync_from_zymmr():
        Logger.info("Zymmr timelog sync request received")
        try:
            usr = current_app.config.get('ZYMMR_SYNC_USERNAME')
            pwd = current_app.config.get('ZYMMR_SYNC_PASSWORD')
            if not usr or not pwd:
                Logger.warning("Zymmr sync requested but service-account credentials are not configured")
                return jsonify({
                    "Message": "Zymmr sync is not configured. Set ZYMMR_SYNC_USERNAME and ZYMMR_SYNC_PASSWORD."
                }), 503

            data = request.get_json(silent=True) or {}
            from_date = data.get('from')
            to_date = data.get('to')
            if not from_date or not to_date:
                # Default: last 7 days including today.
                today = date.today()
                from_date = (today - timedelta(days=ZYMMR_DEFAULT_SYNC_DAYS - 1)).isoformat()
                to_date = today.isoformat()

            uploaded_by = g.get('employee_id')
            result = TimelogService.sync_from_zymmr(usr, pwd, from_date, to_date, uploaded_by)
            Logger.info(
                "Zymmr timelog sync finished",
                fetched=result.get('fetchedCount'),
                saved=result.get('savedCount'),
                truncated=result.get('truncated'),
            )
            return jsonify({
                "Message": "Zymmr timelog sync completed",
                **result,
            }), 200
        except PermissionError as pe:
            Logger.warning("Zymmr auth failed during timelog sync")
            return jsonify({"Message": str(pe)}), 401
        except ValueError as ve:
            Logger.warning("Validation error syncing timelog from Zymmr", error=str(ve))
            return jsonify({"Message": str(ve)}), 400
        except RuntimeError as re:
            Logger.warning("Zymmr request failed during timelog sync", error=str(re))
            return jsonify({"Message": str(re)}), 502
        except Exception as e:
            Logger.error("Unexpected error syncing timelog from Zymmr", error=str(e), error_type=type(e).__name__)
            return jsonify({"Message": "An error occurred while syncing from Zymmr. Please try again."}), 500
