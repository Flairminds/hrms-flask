from datetime import date
from flask import request, jsonify, g, current_app
from ..services.effort_service import EffortService
from ..utils.dates import months_ago, months_from_now
from ..utils.logger import Logger

# Default sync window: End Date between (today - 2 months) and (today + 2 months).
ZYMMR_DEFAULT_MONTHS_BACK = 2
ZYMMR_DEFAULT_MONTHS_AHEAD = 2
# A user-supplied custom range (unlike the default, which spans 4 months
# total) cannot exceed this many months.
ZYMMR_CUSTOM_MAX_RANGE_MONTHS = 2


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
    def sync_from_zymmr():
        """Pulls Work Items from Zymmr with an End Date in [from, to] (default: the last
        2 months through the next 2 months) and upserts them."""
        Logger.info("Zymmr effort sync request received")
        try:
            usr = current_app.config.get('ZYMMR_SYNC_USERNAME')
            pwd = current_app.config.get('ZYMMR_SYNC_PASSWORD')
            if not usr or not pwd:
                Logger.warning("Zymmr effort sync requested but service-account credentials are not configured")
                return jsonify({
                    "Message": "Zymmr sync is not configured. Set ZYMMR_SYNC_USERNAME and ZYMMR_SYNC_PASSWORD."
                }), 503

            data = request.get_json(silent=True) or {}
            from_date = data.get('from')
            to_date = data.get('to')
            if from_date and to_date:
                # Custom range — capped tighter than the default's 4-month span.
                parsed_from = date.fromisoformat(str(from_date)[:10])
                parsed_to = date.fromisoformat(str(to_date)[:10])
                if parsed_to < parsed_from:
                    raise ValueError("'from' date must be on or before 'to' date")
                if parsed_from < months_ago(parsed_to, ZYMMR_CUSTOM_MAX_RANGE_MONTHS):
                    raise ValueError(f'Date range cannot exceed {ZYMMR_CUSTOM_MAX_RANGE_MONTHS} months per sync.')
            else:
                today = date.today()
                from_date = months_ago(today, ZYMMR_DEFAULT_MONTHS_BACK).isoformat()
                to_date = months_from_now(today, ZYMMR_DEFAULT_MONTHS_AHEAD).isoformat()

            uploaded_by = g.get('employee_id')
            result = EffortService.sync_from_zymmr(usr, pwd, from_date, to_date, uploaded_by)
            Logger.info(
                "Zymmr effort sync finished",
                fetched=result.get('fetchedCount'),
                saved=result.get('savedCount'),
                truncated=result.get('truncated'),
            )
            return jsonify({
                "Message": "Zymmr effort sync completed",
                **result,
            }), 200
        except PermissionError as pe:
            Logger.warning("Zymmr auth failed during effort sync")
            return jsonify({"Message": str(pe)}), 401
        except ValueError as ve:
            Logger.warning("Validation error syncing effort from Zymmr", error=str(ve))
            return jsonify({"Message": str(ve)}), 400
        except RuntimeError as re:
            Logger.warning("Zymmr request failed during effort sync", error=str(re))
            return jsonify({"Message": str(re)}), 502
        except Exception as e:
            Logger.error("Unexpected error syncing effort from Zymmr", error=str(e), error_type=type(e).__name__)
            return jsonify({"Message": "An error occurred while syncing from Zymmr. Please try again."}), 500

    @staticmethod
    def get_zymmr_last_sync():
        try:
            info = EffortService.get_last_zymmr_sync()
            return jsonify(info), 200
        except Exception as e:
            Logger.error("Unexpected error fetching last Zymmr effort sync", error=str(e), error_type=type(e).__name__)
            return jsonify({"Message": "An error occurred while fetching the last Zymmr sync time."}), 500

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
