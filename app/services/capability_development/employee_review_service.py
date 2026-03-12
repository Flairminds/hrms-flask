from app.utils.constants import ActiveEmployees, IgnoreEmployees
from ...models.capability_development import EmployeeReview, db
from ...models.hr import Employee, Project, ProjectAllocation, ProjectAllocationHistory, EmployeeHistory
from sqlalchemy.exc import SQLAlchemyError
from ...utils.logger import Logger
from datetime import datetime, date, timedelta
from sqlalchemy import and_, or_, case, func, distinct
from sqlalchemy.orm import aliased
from sqlalchemy.dialects.postgresql import array

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
            
            query = db.session.query(
                EmployeeReview,
                (Employee.first_name + ' ' + 
                 Employee.last_name).label('emp_name'),
                Employee.employment_status
            ).join(
                Employee, EmployeeReview.employee_id == Employee.employee_id
            )
            
            if employee_id:
                query = query.filter(EmployeeReview.employee_id == employee_id)
            
            # Sort by review_date descending
            results = query.order_by(EmployeeReview.review_date.desc()).all()
            
            reviews_list = []
            for r, emp_name, employment_status in results:
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
                    'created_by': r.created_by
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
                created_by=created_by_id
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
