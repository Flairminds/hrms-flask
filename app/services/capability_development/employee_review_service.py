import calendar

from app.utils.constants import ActiveEmployees, IgnoreEmployees
from ...models.capability_development import EmployeeReview, db
from ...models.hr import Employee, Project, ProjectAllocation, ProjectAllocationHistory, EmployeeHistory
from sqlalchemy.exc import SQLAlchemyError
from ...utils.logger import Logger
from datetime import datetime, date, timedelta
from sqlalchemy import and_, or_, case, func, distinct
from sqlalchemy.orm import aliased
from sqlalchemy.dialects.postgresql import array

# Employment statuses reviewed monthly rather than quarterly.
MONTHLY_REVIEW_STATUSES = ('Intern', 'Probation')

class EmployeeReviewService:
    @staticmethod
    def get_reviews(employee_id=None):
        """
        Retrieves reviews.
        If employee_id is provided, returns reviews for that employee.
        Otherwise, returns all reviews.
        """
        try:
            from sqlalchemy.orm import aliased
            from ...models.hr import Employee
            from ...models.performance_review import PerfReviewCycle

            query = db.session.query(
                EmployeeReview,
                (Employee.first_name + ' ' +
                 Employee.last_name).label('emp_name'),
                Employee.employment_status,
                PerfReviewCycle.name.label('cycle_name'),
                PerfReviewCycle.start_date.label('cycle_start'),
                PerfReviewCycle.end_date.label('cycle_end'),
            ).join(
                Employee, EmployeeReview.employee_id == Employee.employee_id
            ).outerjoin(
                PerfReviewCycle, EmployeeReview.perf_cycle_id == PerfReviewCycle.cycle_id
            )

            if employee_id:
                query = query.filter(EmployeeReview.employee_id == employee_id)

            # Sort by review_date descending
            results = query.order_by(EmployeeReview.review_date.desc()).all()

            reviews_list = []
            for r, emp_name, employment_status, cycle_name, cycle_start, cycle_end in results:
                # The review period this was scheduled for: the linked
                # cycle's name (e.g. "Q4 2026") when initiated via the
                # wizard, else the scheduled date's month as a fallback for
                # older rows that predate that link.
                period = cycle_name or (r.review_date.strftime('%b %Y') if r.review_date else None)
                period_range = None
                if cycle_start and cycle_end:
                    a, b = cycle_start.strftime('%b %Y'), cycle_end.strftime('%b %Y')
                    period_range = a if a == b else f'{a} - {b}'
                reviews_list.append({
                    'review_id': r.review_id,
                    'employee_id': r.employee_id,
                    'employee_name': emp_name,
                    'employment_status': employment_status,
                    'review_date': r.review_date.strftime('%Y-%m-%d') if r.review_date else None,
                    'reviewed_date': r.reviewed_date.strftime('%Y-%m-%d') if r.reviewed_date else None,
                    'review_comment': r.review_comment,
                    'other_comments': r.other_comments,
                    'file_link': r.file_link,
                    'status': r.status,
                    'created_by': r.created_by,
                    'perf_cycle_id': r.perf_cycle_id,
                    'period': period,
                    'period_range': period_range,
                })

            return reviews_list
        except Exception as e:
            Logger.error("Error fetching reviews", error=str(e))
            return []

    @staticmethod
    def create_review(data, created_by_id):
        """
        Creates a new employee review.
        """
        try:
            # Parse dates if they are strings
            review_date = data.get('review_date')
            reviewed_date = data.get('reviewed_date')

            if isinstance(review_date, str):
                review_date = datetime.strptime(review_date, '%Y-%m-%d').date()
            if isinstance(reviewed_date, str) and reviewed_date:
                reviewed_date = datetime.strptime(reviewed_date, '%Y-%m-%d').date()
            else:
                reviewed_date = None

            review = EmployeeReview(
                employee_id=data['employee_id'],
                review_date=review_date,
                reviewed_date=reviewed_date,
                review_comment=data.get('review_comment'),
                other_comments=data.get('other_comments'),
                file_link=data.get('file_link'),
                status=data.get('status', 'Pending'),
                created_by=created_by_id,
                perf_cycle_id=data.get('perf_cycle_id'),
            )
            db.session.add(review)
            db.session.commit()
            return review
        except Exception as e:
            db.session.rollback()
            Logger.error("Error creating review", error=str(e))
            raise e

    @staticmethod
    def update_review(review_id, data):
        """
        Updates an existing review.
        """
        try:
            review = EmployeeReview.query.get(review_id)
            if not review:
                return None
            
            if 'review_date' in data: 
                r_date = data['review_date']
                if isinstance(r_date, str):
                    r_date = datetime.strptime(r_date, '%Y-%m-%d').date()
                review.review_date = r_date
                
            if 'reviewed_date' in data:
                r_date = data['reviewed_date']
                if isinstance(r_date, str) and r_date:
                    r_date = datetime.strptime(r_date, '%Y-%m-%d').date()
                elif r_date is None or r_date == '':
                    r_date = None
                review.reviewed_date = r_date
                
            if 'review_comment' in data: review.review_comment = data['review_comment']
            if 'other_comments' in data: review.other_comments = data['other_comments']
            if 'file_link' in data: review.file_link = data['file_link']
            if 'status' in data: review.status = data['status']
            
            db.session.commit()
            return review
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating review", error=str(e))
            raise e
            
    @staticmethod
    def delete_review(review_id):
        """
        Deletes a review.
        """
        try:
            review = EmployeeReview.query.get(review_id)
            if not review:
                return False
            db.session.delete(review)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error deleting review", error=str(e))
            raise e

    @staticmethod
    def get_review_summaries():
        """
        Returns review summary data for all employees.
        Includes last review date, time since, next schedule, pending scheduled reviews,
        and team lead/project lead names for past 3 months.
        """
        try:
            from datetime import date, timedelta
            from sqlalchemy import literal, text

            # Date range for past 3 months
            three_months_ago = date.today() - timedelta(days=90)

            # Subquery: last completed review per employee
            last_completed = db.session.query(
                EmployeeReview.employee_id,
                func.max(EmployeeReview.reviewed_date).label('last_reviewed_date')
            ).filter(
                EmployeeReview.status == 'Reviewed',
                EmployeeReview.reviewed_date.isnot(None)
            ).group_by(EmployeeReview.employee_id).subquery()

            # Subquery: next pending review per employee
            next_pending = db.session.query(
                EmployeeReview.employee_id,
                func.min(EmployeeReview.review_date).label('next_pending_date')
            ).filter(
                EmployeeReview.status.in_(['Pending', 'Scheduled']),
                EmployeeReview.review_date >= date.today()
            ).group_by(EmployeeReview.employee_id).subquery()

            # Subquery: team leads for past 3 months
            Lead = aliased(Employee)

            past_team_leads = (
                db.session.query(
                    EmployeeHistory.employee_id,
                    func.array_agg(
                        distinct(EmployeeHistory.team_lead_id)
                    ).label("past_team_lead_ids")
                )
                .filter(
                    EmployeeHistory.operation_timestamp >= three_months_ago,
                    EmployeeHistory.team_lead_id.isnot(None)
                )
                .group_by(EmployeeHistory.employee_id)
            ).subquery()

            team_leads = (
                db.session.query(
                    Employee.employee_id,
                    func.array_agg(
                        distinct(Lead.first_name + ' ' + Lead.last_name)
                    ).label("team_lead_names")
                )
                .select_from(Employee)
                .outerjoin(
                    past_team_leads,
                    past_team_leads.c.employee_id == Employee.employee_id
                )
                .outerjoin(
                    Lead,
                    Lead.employee_id == func.any(
                        func.array_remove(
                            func.array_cat(
                                array([Employee.team_lead_id]),
                                past_team_leads.c.past_team_lead_ids
                            ),
                            None
                        )
                    )
                )
                .group_by(Employee.employee_id)
            ).subquery()

            # Subquery: project leads for past 3 months
            project_leads = (
                db.session.query(
                    ProjectAllocationHistory.employee_id,
                    func.array_agg(
                        distinct(
                            case(
                                (
                                    func.concat(Lead.first_name, ' ', Lead.last_name) != func.concat(Employee.first_name, ' ', Employee.last_name),
                                    func.concat(Lead.first_name, ' ', Lead.last_name)
                                ),
                                else_=None
                            )
                        )
                    ).label("project_lead_names")
                )
                .join(
                    Project,
                    ProjectAllocationHistory.project_id == Project.project_id
                )
                .join(
                    Lead,
                    Project.lead_by == Lead.employee_id
                )
                .join(
                    Employee,
                    ProjectAllocationHistory.employee_id == Employee.employee_id
                )
                .filter(
                    ProjectAllocationHistory.modified_on >= three_months_ago,
                    Project.lead_by.isnot(None)
                )
                .group_by(ProjectAllocationHistory.employee_id)
            ).subquery()

            # Main query
            results = db.session.query(
                Employee.employee_id,
                (Employee.first_name + ' ' + Employee.last_name).label('employeeName'),
                Employee.employment_status,
                Employee.date_of_joining,
                last_completed.c.last_reviewed_date,
                next_pending.c.next_pending_date,
                team_leads.c.team_lead_names,
                project_leads.c.project_lead_names
            ).outerjoin(
                last_completed,
                Employee.employee_id == last_completed.c.employee_id
            ).outerjoin(
                next_pending,
                Employee.employee_id == next_pending.c.employee_id
            ).outerjoin(
                team_leads,
                Employee.employee_id == team_leads.c.employee_id
            ).outerjoin(
                project_leads,
                Employee.employee_id == project_leads.c.employee_id
            ).filter(
                Employee.employment_status.notin_(ActiveEmployees.STATUS_NOT_IN_FOR_REVIEW),
                Employee.email.notin_(IgnoreEmployees.IGNORE_FOR_REVIEWS)
            ).order_by(Employee.first_name).all()

            summaries = []
            today = date.today()

            for r in results:
                # Time since last review
                time_since = '-'
                if r.last_reviewed_date:
                    months = (today.year - r.last_reviewed_date.year) * 12 + (today.month - r.last_reviewed_date.month)
                    if today.day < r.last_reviewed_date.day:
                        months -= 1
                    days = (today - r.last_reviewed_date).days % 30
                    if months > 0:
                        time_since = f"{months}m {days}d"
                    else:
                        time_since = f"{days}d"

                # Next schedule logic
                next_schedule = '-'
                joining_date = r.date_of_joining

                if not r.last_reviewed_date:
                    if joining_date:
                        one_month_mark = joining_date + timedelta(days=30)
                        if today > one_month_mark:
                            next_schedule = (today + timedelta(days=5)).isoformat()
                        else:
                            next_schedule = one_month_mark.isoformat()
                else:
                    status = r.employment_status
                    if status in ('Intern', 'Probation'):
                        if joining_date:
                            months_diff = (today.year - joining_date.year) * 12 + (today.month - joining_date.month)
                            target = joining_date + timedelta(days=30 * months_diff)
                            if target <= today:
                                target += timedelta(days=30)
                            next_schedule = target.isoformat()
                    elif status == 'Confirmed':
                        quarters = [
                            date(today.year, 4, 25),
                            date(today.year, 7, 25),
                            date(today.year, 10, 25),
                            date(today.year, 1, 25)
                        ]
                        target = next((q for q in quarters if q > today), None)
                        if not target:
                            target = date(today.year + 1, 4, 25)
                        next_schedule = target.isoformat()
                    else:
                        next_schedule = 'N/A'

                # Process project leads array
                project_lead_names = []
                if r.project_lead_names:
                    # Filter out None values and deduplicate
                    project_lead_names = list(set([name for name in r.project_lead_names if name]))

                summaries.append({
                    'employeeId': r.employee_id,
                    'employeeName': r.employeeName,
                    'status': r.employment_status,
                    'joiningDate': r.date_of_joining.isoformat() if r.date_of_joining else None,
                    'lastReviewDate': r.last_reviewed_date.isoformat() if r.last_reviewed_date else None,
                    'timeSince': time_since,
                    'nextSchedule': next_schedule,
                    'scheduledPending': r.next_pending_date.isoformat() if r.next_pending_date else None,
                    'teamLeadName': ', '.join(r.team_lead_names) if r.team_lead_names else '-',
                    'projectLeadNames': ', '.join(project_lead_names) if project_lead_names else '-'
                })

            return summaries

        except Exception as e:
            Logger.error("Error fetching review summaries", error=str(e))
            raise e

    @staticmethod
    def get_review_matrix(year):
        """Per-employee grid of review status across every period of `year`:
        quarterly (fiscal Q1=Nov(year-1)-Jan(year), Q2=Feb-Apr, Q3=May-Jul,
        Q4=Aug-Oct(year) — the same convention PerformanceReviewService uses
        for cycle names) for everyone except Interns/Probationers, who are
        reviewed monthly instead (calendar Jan-Dec of `year`)."""
        from ..performance_review_service import PerformanceReviewService

        employees = (
            Employee.query
            .filter(
                Employee.employment_status.notin_(ActiveEmployees.STATUS_NOT_IN_FOR_REVIEW),
                Employee.email.notin_(IgnoreEmployees.IGNORE_FOR_REVIEWS),
            )
            .order_by(Employee.first_name)
            .all()
        )
        if not employees:
            return []

        employee_ids = [e.employee_id for e in employees]
        reviews = (
            EmployeeReview.query
            .filter(
                EmployeeReview.employee_id.in_(employee_ids),
                EmployeeReview.review_date.isnot(None),
            )
            .order_by(EmployeeReview.review_id.asc())
            .all()
        )
        reviews_by_employee = {}
        for r in reviews:
            reviews_by_employee.setdefault(r.employee_id, []).append(r)

        today = date.today()

        def pick_review(rows, start, end):
            # Rows are ascending by review_id, so the last match is the most
            # recently created review covering this period.
            matches = [r for r in rows if start <= r.review_date <= end]
            return matches[-1] if matches else None

        def period_status(row, start, end):
            if row is None:
                if end < today:
                    return 'missed'
                # The period containing today but with no review yet is
                # "due" rather than just "not scheduled" — distinct so HR
                # can initiate it directly from the grid the same as a
                # missed one, without waiting for the period to end first.
                if start <= today <= end:
                    return 'due'
                return 'not_scheduled'
            if row.status == 'Reviewed':
                return 'reviewed'
            if row.status == 'Cancelled':
                return 'cancelled' if end >= today else 'missed'
            return 'pending'

        def build_cell(key, label, start, end, row, period_spec):
            return {
                'key': key,
                'label': label,
                'range': f"{start.strftime('%d %b %Y')} – {end.strftime('%d %b %Y')}",
                'startDate': start.isoformat(),
                'endDate': end.isoformat(),
                'status': period_status(row, start, end),
                'reviewId': row.review_id if row else None,
                'reviewDate': row.review_date.isoformat() if row and row.review_date else None,
                'reviewedDate': row.reviewed_date.isoformat() if row and row.reviewed_date else None,
                'perfCycleId': row.perf_cycle_id if row else None,
                # Enough for the frontend to call initiate_review directly
                # (e.g. the "Initiate" action on a Missed cell) without
                # re-deriving the period from the label.
                'period': period_spec,
            }

        matrix = []
        for emp in employees:
            rows = reviews_by_employee.get(emp.employee_id, [])
            is_monthly = emp.employment_status in MONTHLY_REVIEW_STATUSES
            periods = []
            if is_monthly:
                for m in range(1, 13):
                    start = date(year, m, 1)
                    end = date(year, m, calendar.monthrange(year, m)[1])
                    row = pick_review(rows, start, end)
                    period_spec = {'periodType': 'monthly', 'month': f'{year}-{m:02d}'}
                    periods.append(build_cell(f'm{m}', start.strftime('%b'), start, end, row, period_spec))
            else:
                for q in (1, 2, 3, 4):
                    _, start, end = PerformanceReviewService._period_to_cycle_spec(
                        'quarterly', quarter=q, year=year,
                    )
                    row = pick_review(rows, start, end)
                    period_spec = {'periodType': 'quarterly', 'quarter': q, 'year': year}
                    periods.append(build_cell(f'q{q}', f'Q{q}', start, end, row, period_spec))

            matrix.append({
                'employeeId': emp.employee_id,
                'employeeName': ' '.join(filter(None, [emp.first_name, emp.last_name])).strip(),
                'status': emp.employment_status,
                'reviewType': 'monthly' if is_monthly else 'quarterly',
                'periods': periods,
            })

        return matrix
