from flask import request, jsonify, g

from ..models.performance_review import PerfReview
from ..services.performance_review_service import PerformanceReviewService
from ..utils.logger import Logger


class PerformanceReviewController:
    """Controller for the multi-role weighted Performance Review feature."""

    # ---------------- Config ----------------

    @staticmethod
    def get_config():
        as_of = request.args.get('asOf')
        try:
            return jsonify({'sections': PerformanceReviewService.get_config(as_of)}), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error fetching performance review config: {e}')
            return jsonify({'Message': 'Error fetching config'}), 500

    @staticmethod
    def get_config_versions():
        try:
            return jsonify({'versions': PerformanceReviewService.get_config_versions()}), 200
        except Exception as e:
            Logger.error(f'Error fetching config versions: {e}')
            return jsonify({'Message': 'Error fetching config versions'}), 500

    @staticmethod
    def create_section():
        data = request.get_json() or {}
        try:
            section = PerformanceReviewService.create_section(data, g.get('employee_id'))
            return jsonify(section), 201
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error creating section: {e}')
            return jsonify({'Message': 'Error creating section'}), 500

    @staticmethod
    def add_questions(section_id):
        data = request.get_json() or {}
        try:
            section = PerformanceReviewService.add_questions_to_section(section_id, data, g.get('employee_id'))
            return jsonify(section), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error adding questions: {e}')
            return jsonify({'Message': 'Error adding questions'}), 500

    @staticmethod
    def update_section(section_id):
        data = request.get_json() or {}
        try:
            section = PerformanceReviewService.update_section(section_id, data, g.get('employee_id'))
            return jsonify(section), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error updating section: {e}')
            return jsonify({'Message': 'Error updating section'}), 500

    @staticmethod
    def delete_section(section_id):
        data = request.get_json(silent=True) or {}
        try:
            PerformanceReviewService.delete_section(section_id, data, g.get('employee_id'))
            return jsonify({'Message': 'Section removed'}), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error deleting section: {e}')
            return jsonify({'Message': 'Error deleting section'}), 500

    @staticmethod
    def distribute_weightage():
        data = request.get_json() or {}
        try:
            sections = PerformanceReviewService.distribute_equal_weightage(data, g.get('employee_id'))
            return jsonify({'sections': sections}), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error distributing weightage: {e}')
            return jsonify({'Message': 'Error distributing weightage'}), 500

    @staticmethod
    def save_written_question():
        data = request.get_json() or {}
        try:
            section = PerformanceReviewService.save_written_question(data, g.get('employee_id'))
            return jsonify(section), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error saving written question: {e}')
            return jsonify({'Message': 'Error saving written question'}), 500

    @staticmethod
    def delete_written_question(question_id):
        data = request.get_json(silent=True) or {}
        try:
            PerformanceReviewService.delete_written_question(question_id, data, g.get('employee_id'))
            return jsonify({'Message': 'Question removed'}), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error deleting written question: {e}')
            return jsonify({'Message': 'Error deleting written question'}), 500

    @staticmethod
    def get_activity_log():
        try:
            return jsonify({'activity': PerformanceReviewService.get_activity_log()}), 200
        except Exception as e:
            Logger.error(f'Error fetching activity log: {e}')
            return jsonify({'Message': 'Error fetching activity log'}), 500

    # ---------------- Cycles ----------------

    @staticmethod
    def get_cycles():
        employee_id = request.args.get('employeeId')
        actor_id = g.get('employee_id')
        actor_role = (g.get('user_role') or '').lower()
        # Non-HR users can only ask about people whose review they can open.
        if actor_role not in ('admin', 'hr') and not employee_id:
            employee_id = actor_id
        try:
            return jsonify({'cycles': PerformanceReviewService.get_cycles(employee_id, actor_id, actor_role)}), 200
        except Exception as e:
            Logger.error(f'Error fetching cycles: {e}')
            return jsonify({'Message': 'Error fetching cycles'}), 500

    @staticmethod
    def get_my_reviewees():
        try:
            return jsonify(PerformanceReviewService.get_my_reviewees(g.get('employee_id'))), 200
        except Exception as e:
            Logger.error(f'Error fetching my reviewees: {e}')
            return jsonify({'Message': 'Error fetching reviews'}), 500

    @staticmethod
    def get_review_list():
        try:
            return jsonify(PerformanceReviewService.get_review_list(
                g.get('employee_id'), (g.get('user_role') or '').lower())), 200
        except Exception as e:
            Logger.error(f'Error fetching review list: {e}')
            return jsonify({'Message': 'Error fetching reviews'}), 500

    @staticmethod
    def create_cycle():
        data = request.get_json() or {}
        try:
            cycle = PerformanceReviewService.create_cycle(data, g.get('employee_id'))
            return jsonify(cycle), 201
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error creating cycle: {e}')
            return jsonify({'Message': 'Error creating cycle'}), 500

    # ---------------- Reviews ----------------

    @staticmethod
    def preview_reviewers():
        employee_id = request.args.get('employeeId')
        if not employee_id:
            return jsonify({'Message': "'employeeId' is required"}), 400
        start = end = None
        period_type = request.args.get('periodType')
        if period_type:
            try:
                _, start, end = PerformanceReviewService._period_to_cycle_spec(
                    period_type,
                    month=request.args.get('month'),
                    quarter=request.args.get('quarter'),
                    year=request.args.get('year'),
                )
            except ValueError as e:
                return jsonify({'Message': str(e)}), 400
        try:
            return jsonify(PerformanceReviewService.preview_reviewers(employee_id, start, end)), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 404
        except Exception as e:
            Logger.error(f'Error previewing reviewers: {e}')
            return jsonify({'Message': 'Error previewing reviewers'}), 500

    @staticmethod
    def initiate_review():
        data = request.get_json() or {}
        try:
            result = PerformanceReviewService.initiate_review(data, g.get('employee_id'))
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error initiating review: {e}')
            return jsonify({'Message': 'Error initiating review'}), 500

        # Also create the legacy simple-scheduling row so the existing
        # Employee Review table/status/monthly-stats keep reflecting reviews
        # started from this new wizard, same as they always have — linked to
        # the cycle just created so HR/leads/self can jump straight from that
        # row to actually scoring the review.
        try:
            from ..services.capability_development.employee_review_service import EmployeeReviewService
            EmployeeReviewService.create_review({
                'employee_id': data.get('employeeId'),
                'review_date': data.get('reviewDate'),
                'status': 'Pending',
                'perf_cycle_id': result.get('cycle', {}).get('id'),
            }, g.get('employee_id'))
        except Exception as e:
            Logger.error(f'Error creating legacy employee_review row during initiate: {e}')

        # Tell self / reviewers / HR the review has started and when the
        # meeting is. A mail failure must never fail the initiate itself.
        try:
            from ..services.email_service import EmailService
            EmailService.send_review_initiated_notification(
                result.get('cycle', {}).get('id'), data.get('employeeId'), data.get('reviewDate'),
            )
        except Exception as e:
            Logger.error(f'Error sending review initiated notification: {e}')

        return jsonify(result), 201

    @staticmethod
    def get_review():
        cycle_id = request.args.get('cycleId', type=int)
        employee_id = request.args.get('employeeId')
        if not cycle_id or not employee_id:
            return jsonify({'Message': "'cycleId' and 'employeeId' are required"}), 400

        actor_role = (g.get('user_role') or '').lower()
        actor_id = g.get('employee_id')
        is_hr = actor_role in ('admin', 'hr')

        try:
            if is_hr:
                review = PerformanceReviewService.get_or_create_review(cycle_id, employee_id)
            else:
                # Everyone else only opens a review that already exists and
                # that they're part of — never creates one, never sees others'.
                existing = PerfReview.query.filter_by(cycle_id=cycle_id, employee_id=employee_id).first()
                if not PerformanceReviewService.can_view_review(existing, actor_id, actor_role):
                    return jsonify({'Message': 'You can only view your own review or your team\'s reviews'}), 403
                review = PerformanceReviewService._serialize_review(existing)
            review = PerformanceReviewService.mask_review_for_viewer(review, actor_id, actor_role)
            return jsonify(review), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 404
        except Exception as e:
            Logger.error(f'Error fetching review: {e}')
            return jsonify({'Message': 'Error fetching review'}), 500

    @staticmethod
    def get_summary():
        cycle_id = request.args.get('cycleId', type=int)
        employee_id = request.args.get('employeeId')
        if not cycle_id or not employee_id:
            return jsonify({'Message': "'cycleId' and 'employeeId' are required"}), 400
        actor_role = (g.get('user_role') or '').lower()
        actor_id = g.get('employee_id')
        existing = PerfReview.query.filter_by(cycle_id=cycle_id, employee_id=employee_id).first()
        if actor_role not in ('admin', 'hr') and not PerformanceReviewService.can_view_review(existing, actor_id, actor_role):
            return jsonify({'Message': 'You can only view your own review or your team\'s reviews'}), 403
        try:
            return jsonify(PerformanceReviewService.get_summary(cycle_id, employee_id)), 200
        except Exception as e:
            Logger.error(f'Error fetching summary: {e}')
            return jsonify({'Message': 'Error fetching summary'}), 500

    @staticmethod
    def save_score(reviewer_id):
        data = request.get_json() or {}
        try:
            PerformanceReviewService.upsert_score(
                reviewer_id, data.get('questionId'), data.get('score'),
                g.get('employee_id'), (g.get('user_role') or '').lower(),
            )
            return jsonify({'Message': 'Score saved'}), 200
        except PermissionError as e:
            return jsonify({'Message': str(e)}), 403
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error saving score: {e}')
            return jsonify({'Message': 'Error saving score'}), 500

    @staticmethod
    def save_answer(reviewer_id):
        data = request.get_json() or {}
        try:
            PerformanceReviewService.upsert_answer(
                reviewer_id, data.get('questionId'), data.get('text', ''),
                g.get('employee_id'), (g.get('user_role') or '').lower(),
            )
            return jsonify({'Message': 'Answer saved'}), 200
        except PermissionError as e:
            return jsonify({'Message': str(e)}), 403
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error saving answer: {e}')
            return jsonify({'Message': 'Error saving answer'}), 500

    @staticmethod
    def save_comment(reviewer_id):
        data = request.get_json() or {}
        try:
            PerformanceReviewService.upsert_comment(
                reviewer_id, data.get('sectionId'), data.get('text', ''),
                g.get('employee_id'), (g.get('user_role') or '').lower(),
            )
            return jsonify({'Message': 'Comment saved'}), 200
        except PermissionError as e:
            return jsonify({'Message': str(e)}), 403
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error saving comment: {e}')
            return jsonify({'Message': 'Error saving comment'}), 500

    @staticmethod
    def complete_review():
        data = request.get_json() or {}
        try:
            result = PerformanceReviewService.complete_review(
                data.get('cycleId'), data.get('employeeId'), data, g.get('employee_id'),
            )
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error completing review: {e}')
            return jsonify({'Message': 'Error completing review'}), 500

    @staticmethod
    def reset_reviewer(reviewer_id):
        try:
            PerformanceReviewService.reset_reviewer(
                reviewer_id, g.get('employee_id'), (g.get('user_role') or '').lower(),
            )
            return jsonify({'Message': 'Review reset'}), 200
        except PermissionError as e:
            return jsonify({'Message': str(e)}), 403
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error resetting review: {e}')
            return jsonify({'Message': 'Error resetting review'}), 500

    @staticmethod
    def submit_reviewer(reviewer_id):
        try:
            PerformanceReviewService.submit_reviewer(
                reviewer_id, g.get('employee_id'), (g.get('user_role') or '').lower(),
            )
            return jsonify({'Message': 'Review submitted'}), 200
        except PermissionError as e:
            return jsonify({'Message': str(e)}), 403
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error submitting review: {e}')
            return jsonify({'Message': 'Error submitting review'}), 500

    @staticmethod
    def unlock_reviewer(reviewer_id):
        try:
            PerformanceReviewService.unlock_reviewer(
                reviewer_id, g.get('employee_id'), (g.get('user_role') or '').lower(),
            )
            return jsonify({'Message': 'Review unlocked'}), 200
        except PermissionError as e:
            return jsonify({'Message': str(e)}), 403
        except ValueError as e:
            return jsonify({'Message': str(e)}), 400
        except Exception as e:
            Logger.error(f'Error unlocking review: {e}')
            return jsonify({'Message': 'Error unlocking review'}), 500
