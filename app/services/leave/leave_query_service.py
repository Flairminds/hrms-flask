from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from sqlalchemy import text, func, case, and_, or_, Integer
from sqlalchemy.exc import SQLAlchemyError

from ... import db
from ...models.leave import (LeaveTransaction, CompOffTransaction, Holiday, MasterLeaveTypes, 
                           LeaveOpeningTransaction, LeaveAudit, CompensatoryOff, WorkingLate,
                           CustomerHoliday)
from ...models.hr import Employee, LateralAndExempt, EmployeeRole, MasterRole
from ...utils.logger import Logger
from ...utils.constants import LeaveStatus, LeaveTypeID, EmployeeStatus, EmailConfig
from .leave_utils import LeaveUtils

class LeaveQueryService:
    @staticmethod
    def get_leave_types_and_approver(employee_id: str) -> Dict[str, Any]:
        """
        Retrieves the list of available leave types and the assigned approver for an employee using ORM.
        """
        try:
            from sqlalchemy.orm import aliased
            
            # Alias for the team lead employee
            TeamLead = aliased(Employee)
            
            # Left join with employee table to get team lead name
            employee_query = db.session.query(
                Employee,
                (TeamLead.first_name + ' ' + TeamLead.last_name).label('approver_name')
            ).outerjoin(
                TeamLead,
                Employee.team_lead_id == TeamLead.employee_id
            ).filter(
                Employee.employee_id == employee_id
            ).first()
            
            if not employee_query:
                Logger.warning("Employee not found for leave types", employee_id=employee_id)
                return {"leave_types": [], "approver": None, "approver_name": None}
            
            employee = employee_query[0]
            approver_name = employee_query[1] if len(employee_query) > 1 else None
            
            leave_types = db.session.query(
                MasterLeaveTypes.leave_type_id.label('id'),
                MasterLeaveTypes.leave_name.label('name')
            ).filter(MasterLeaveTypes.is_deleted == False).all()

            # Convert to list of dicts
            types_list = [dict(row._mapping) for row in leave_types]
            
            Logger.info("Retrieved leave types and approver", 
                       employee_id=employee_id, 
                       approver=employee.team_lead_id,
                       approver_name=approver_name)
            
            return {
                "leave_types": types_list,
                "approver": employee.team_lead_id,
                "approver_name": approver_name
            }
        except SQLAlchemyError as e:
            Logger.error("Database error getting leave types", employee_id=employee_id, error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error in get_leave_types_and_approver", 
                           employee_id=employee_id, error=str(e))
            raise

    @staticmethod
    def get_employee_leave_cards(employee_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves leave balance cards/summary for an employee.
        """
        if not employee_id or not employee_id.strip():
            raise ValueError("Employee ID is required")
        
        Logger.info("Getting employee leave cards", employee_id=employee_id)
        
        try:
            # Get employee to verify exists and get date_of_joining
            employee = Employee.query.filter_by(employee_id=employee_id).first()
            if not employee:
                Logger.warning("Employee not found", employee_id=employee_id)
                raise LookupError(f"Employee {employee_id} not found")
            
            # Subquery for LeaveOpeningTransaction aggregation with date logic
            # Groups by LeaveTypeID and filters by TransactionDate based on leave type
            # Using specific dates from constants or logic
            opening_subq = db.session.query(
                    func.sum(LeaveOpeningTransaction.no_of_days).label('no_of_days'),
                    LeaveOpeningTransaction.leave_type_id,
                    LeaveOpeningTransaction.employee_id
                ).filter(
                    LeaveOpeningTransaction.employee_id == employee_id,
                    # Date logic: types 1,3 use '2025-03-31', others use '2024-03-31'
                    case(
                        (LeaveOpeningTransaction.leave_type_id.in_([LeaveTypeID.SICK, LeaveTypeID.WFH]), 
                         LeaveOpeningTransaction.transaction_date > datetime(2025, 3, 31)),
                        else_=LeaveOpeningTransaction.transaction_date > datetime(2024, 3, 31)
                    )
                ).group_by(
                    LeaveOpeningTransaction.leave_type_id,
                    LeaveOpeningTransaction.employee_id
                ).subquery()
            
            # Subquery for LeaveAudit aggregation (used leaves)
            used_subq = db.session.query(
                func.sum(LeaveTransaction.no_of_days).label('number_of_days'),
                LeaveTransaction.leave_type_id,
                LeaveTransaction.employee_id
            ).filter(
                LeaveTransaction.employee_id == employee_id,
                # Date logic based on leave type
                case(
                    (LeaveTransaction.leave_type_id.in_([LeaveTypeID.SICK, LeaveTypeID.WFH]),
                     and_(
                         LeaveTransaction.from_date >= datetime(2025, 4, 1),
                         LeaveTransaction.to_date <= datetime(2026, 3, 31)
                     )),
                    else_=and_(
                        LeaveTransaction.from_date >= datetime(2024, 4, 1),
                        LeaveTransaction.to_date <= datetime(2026, 3, 31)
                    )
                ),
                ~LeaveTransaction.leave_status.in_([LeaveStatus.REJECTED, LeaveStatus.CANCELLED, "Rejected", "Cancelled"]),
                ~LeaveTransaction.leave_tran_id.in_([10598, 10599, 10601, 10618, 10634])
            ).group_by(
                LeaveTransaction.leave_type_id,
                LeaveTransaction.employee_id
            ).subquery()
            
            # Main query joining all tables
            query = db.session.query(
                Employee.employee_id.label('employee'),
                func.coalesce(func.abs(used_subq.c.number_of_days), 0).label('total_used_leaves'),
                opening_subq.c.no_of_days.label('total_alloted_leaves'),
                MasterLeaveTypes.leave_name.label('leave_name'),
                MasterLeaveTypes.leave_type_id.label('leave_type_id'),
                MasterLeaveTypes.leave_cards_flag.label('leave_cards_flag'),
                Employee.date_of_joining
            ).join(
                opening_subq,
                opening_subq.c.employee_id == Employee.employee_id
            ).outerjoin(
                used_subq,
                and_(
                    used_subq.c.employee_id == Employee.employee_id,
                    opening_subq.c.leave_type_id == used_subq.c.leave_type_id
                )
            ).join(
                MasterLeaveTypes,
                MasterLeaveTypes.leave_type_id == opening_subq.c.leave_type_id
            ).filter(
                Employee.employee_id == employee_id,
                MasterLeaveTypes.leave_cards_flag == True
            ).all()
            
            result = []
            for row in query:
                result.append({
                    'employee': row.employee,
                    'leave_type_id': str(row.leave_type_id),
                    'leave_name': row.leave_name,
                    'total_alloted_leaves': float(row.total_alloted_leaves) if row.total_alloted_leaves else 0.0,
                    'total_used_leaves': abs(float(row.total_used_leaves)),  # ABS for safety
                    'leave_cards_flag': row.leave_cards_flag,
                    'date_of_joining': row.date_of_joining.strftime('%d %b %Y') if row.date_of_joining else ''
                })
            
            Logger.info("Employee leave cards retrieved",
                       employee_id=employee_id,
                       cards_count=len(result))
            
            return result
            
        except LookupError:
            raise
        except SQLAlchemyError as e:
            Logger.error("Database error getting leave cards",
                        employee_id=employee_id, error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error getting leave cards",
                           employee_id=employee_id, error=str(e))
            raise

    @staticmethod
    def get_leave_details(employee_id: str, year: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieves leave transaction history for a specific employee and financial year.
        """
        if not employee_id or not employee_id.strip():
            raise ValueError("Employee ID is required")
        
        month = None
        
        if not year:
            year = datetime.now().year
            month = datetime.now().month
        
        Logger.info("Getting leave details", employee_id=employee_id, year=year)
        
        try:
            # Calculate financial year dates using LeaveUtils
            start_date, end_date = LeaveUtils.get_financial_year_dates(year, month)
            
            # Helper for date formatting
            def format_date(date_obj):
                if date_obj:
                    return date_obj.strftime('%d %b %Y')
                return ''
            
            from sqlalchemy.orm import aliased
            Approver = aliased(Employee)
            
            # Main query with JOINs
            query = db.session.query(
                LeaveTransaction.leave_tran_id,
                (Employee.first_name + ' ' + 
                 func.coalesce(Employee.middle_name, '') + ' ' + 
                 Employee.last_name).label('emp_name'),
                LeaveTransaction.comments.label('comments'),
                MasterLeaveTypes.leave_name,
                LeaveTransaction.from_date,
                LeaveTransaction.to_date,
                LeaveTransaction.no_of_days,
                LeaveTransaction.application_date,
                LeaveTransaction.leave_status,
                case(
                    (and_(
                        LeaveTransaction.is_for_second_approval == True,
                        LeaveTransaction.second_approval_date.isnot(None)
                    ), LeaveTransaction.second_approval_by),
                    else_=LeaveTransaction.approved_by
                ).label('approved_by'),
                case(
                    (and_(
                        LeaveTransaction.is_for_second_approval == True,
                        LeaveTransaction.second_approval_date.isnot(None)
                    ), LeaveTransaction.second_approval_comment),
                    else_=LeaveTransaction.approval_comment
                ).label('approval_comment'),
                LeaveTransaction.is_communicated_to_team,
                LeaveTransaction.is_custom_approval_required if hasattr(LeaveTransaction, 'is_custom_approval_required') else LeaveTransaction.is_customer_approval_required,
                LeaveTransaction.duration,
                (Approver.first_name + ' ' + Approver.last_name).label('approver_name')
            ).join(
                Employee,
                LeaveTransaction.employee_id == Employee.employee_id
            ).join(
                MasterLeaveTypes,
                LeaveTransaction.leave_type_id == MasterLeaveTypes.leave_type_id
            ).outerjoin(
                Approver,
                LeaveTransaction.approver_id == Approver.employee_id
            ).filter(
                Employee.employee_id == employee_id,
                LeaveTransaction.from_date >= start_date,
                LeaveTransaction.to_date <= end_date,
                LeaveTransaction.applied_by.isnot(None)
            ).order_by(
                LeaveTransaction.leave_tran_id.desc()
            ).all()
            
            result = []
            for row in query:
                emp_name = ' '.join(row.emp_name.split())
                
                result.append({
                    'leave_tran_id': row.leave_tran_id,
                    'emp_name': emp_name,
                    'comments': row.comments or '',
                    'leave_name': row.leave_name or '',
                    'from_date': format_date(row.from_date),
                    'to_date': format_date(row.to_date),
                    'no_of_days': float(row.no_of_days) if row.no_of_days else 0.0,
                    'application_date': format_date(row.application_date),
                    'leave_status': row.leave_status or '',
                    'approved_by': row.approved_by or '',
                    'approval_comment': row.approval_comment or '',
                    'is_communicated_to_team': row.is_communicated_to_team or 0,
                    'is_customer_approval_required': row.is_customer_approval_required or 0,
                    'duration': row.duration or '',
                    'approver_name': row.approver_name or 'N/A'
                })
            
            return result
            
        except SQLAlchemyError as e:
            Logger.error("Database error getting leave details", employee_id=employee_id, error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error getting leave details", employee_id=employee_id, error=str(e))
            raise

    @staticmethod
    def get_all_employee_leave_records(year: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieves comprehensive leave records for all employees with balances.
        """
        Logger.info("Fetching all employee leave records", year=year)
        
        try:
            # Determine financial year if not provided
            if year is None:
                current_date = datetime.now()
                if current_date.month >= 4:
                    year = current_date.year
                else:
                    year = current_date.year - 1
            
            # Validate year
            if year < 2000 or year > 2100:
                raise ValueError(f"Invalid year: {year}. Must be between 2000 and 2100")
            
            # Get financial year dates
            start_date, end_date = LeaveUtils.get_financial_year_dates(year)
            
            # Calculate current financial year bounds for carry forward
            current_date = datetime.now()
            if current_date.month >= 4:
                fy_start_for_cf = datetime(current_date.year, 4, 1)
                fy_end_for_cf = datetime(current_date.year + 1, 4, 1)
            else:
                fy_start_for_cf = datetime(current_date.year - 1, 4, 1)
                fy_end_for_cf = datetime(current_date.year, 4, 1)
            
            carry_forward_subq = db.session.query(
                LeaveOpeningTransaction.employee_id,
                func.sum(LeaveOpeningTransaction.no_of_days).label('carry_forward_balance')
            ).filter(
                LeaveOpeningTransaction.transaction_date >= fy_start_for_cf,
                LeaveOpeningTransaction.transaction_date < fy_end_for_cf,
                LeaveOpeningTransaction.is_carry_forworded == True
            ).group_by(
                LeaveOpeningTransaction.employee_id
            ).subquery()
            
            current_year_march_31 = datetime(current_date.year, 3, 31)
            
            opening_balance_subq = db.session.query(
                LeaveOpeningTransaction.employee_id,
                LeaveOpeningTransaction.leave_type_id,
                func.sum(LeaveOpeningTransaction.no_of_days).label('opening_days')
            ).filter(
                LeaveOpeningTransaction.transaction_date > current_year_march_31
            ).group_by(
                LeaveOpeningTransaction.employee_id,
                LeaveOpeningTransaction.leave_type_id
            ).subquery()
            
            audit_start_date = datetime(year, 4, 1)
            
            leave_audit_subq = db.session.query(
                LeaveAudit.employee_id,
                LeaveAudit.leave_type_id,
                func.sum(LeaveAudit.number_of_days).label('audit_days')
            ).filter(
                LeaveAudit.application_date > audit_start_date
            ).group_by(
                LeaveAudit.employee_id,
                LeaveAudit.leave_type_id
            ).subquery()
            
            balance_subq = db.session.query(
                Employee.employee_id,
                func.sum(
                    case(
                        (MasterLeaveTypes.leave_type_id == LeaveTypeID.SICK,
                         func.coalesce(opening_balance_subq.c.opening_days, 0) + 
                         func.coalesce(leave_audit_subq.c.audit_days, 0)),
                        else_=0
                    )
                ).label('sick_leave_balance'),
                func.sum(
                    case(
                        (MasterLeaveTypes.leave_type_id == LeaveTypeID.PRIVILEGE,
                         func.coalesce(opening_balance_subq.c.opening_days, 0) + 
                         func.coalesce(leave_audit_subq.c.audit_days, 0)),
                        else_=0
                    )
                ).label('privilege_leave_balance'),
                func.sum(
                    case(
                        (MasterLeaveTypes.leave_type_id == LeaveTypeID.WFH,
                         func.coalesce(opening_balance_subq.c.opening_days, 0) + 
                         func.coalesce(leave_audit_subq.c.audit_days, 0)),
                        else_=0
                    )
                ).label('wfh_balance')
            ).select_from(Employee).join(
                opening_balance_subq,
                opening_balance_subq.c.employee_id == Employee.employee_id
            ).outerjoin(
                leave_audit_subq,
                and_(
                    leave_audit_subq.c.employee_id == Employee.employee_id,
                    leave_audit_subq.c.leave_type_id == opening_balance_subq.c.leave_type_id
                )
            ).join(
                MasterLeaveTypes,
                MasterLeaveTypes.leave_type_id == opening_balance_subq.c.leave_type_id
            ).filter(
                MasterLeaveTypes.leave_cards_flag == True
            ).group_by(
                Employee.employee_id
            ).subquery()
            
            query = db.session.query(
                Employee.employee_id,
                (Employee.first_name + ' ' + 
                 func.coalesce(Employee.middle_name + ' ', '') + 
                 Employee.last_name).label('employee_name'),
                MasterLeaveTypes.leave_name.label('leave_type'),
                LeaveTransaction.from_date,
                LeaveTransaction.to_date,
                LeaveTransaction.approved_by,
                LeaveTransaction.leave_status,
                LeaveTransaction.applied_leave_count.label('working_day_leave_count'),
                func.coalesce(carry_forward_subq.c.carry_forward_balance, 0).label('carry_forward_balance'),
                func.coalesce(balance_subq.c.privilege_leave_balance, 0).label('privilege_leave_balance'),
                func.coalesce(balance_subq.c.sick_leave_balance, 0).label('sick_leave_balance'),
                func.coalesce(balance_subq.c.wfh_balance, 0).label('wfh_balance'),
                LeaveTransaction.leave_tran_id
            ).select_from(Employee).join(
                LeaveTransaction,
                LeaveTransaction.employee_id == Employee.employee_id
            ).join(
                MasterLeaveTypes,
                LeaveTransaction.leave_type == MasterLeaveTypes.leave_type_id
            ).outerjoin(
                carry_forward_subq,
                carry_forward_subq.c.employee_id == Employee.employee_id
            ).outerjoin(
                balance_subq,
                balance_subq.c.employee_id == Employee.employee_id
            ).filter(
                LeaveTransaction.from_date >= start_date,
                LeaveTransaction.to_date <= end_date,
                LeaveTransaction.applied_by.isnot(None)
            ).order_by(
                func.cast(func.replace(Employee.employee_id, 'EMP', ''), Integer).asc(),
                LeaveTransaction.leave_tran_id.desc()
            )
            
            results = query.all()
            
            records = []
            for row in results:
                records.append({
                    'employee_id': row.employee_id,
                    'employee_name': row.employee_name,
                    'leave_type': row.leave_type,
                    'from_date': row.from_date.strftime('%d %b %Y') if row.from_date else '',
                    'to_date': row.to_date.strftime('%d %b %Y') if row.to_date else '',
                    'approved_by': row.approved_by or '',
                    'leave_status': row.leave_status or '',
                    'working_day_leave_count': float(row.working_day_leave_count) if row.working_day_leave_count else 0.0,
                    'carry_forward_balance': float(row.carry_forward_balance) if row.carry_forward_balance else 0.0,
                    'privilege_leave_balance': float(row.privilege_leave_balance) if row.privilege_leave_balance else 0.0,
                    'sick_leave_balance': float(row.sick_leave_balance) if row.sick_leave_balance else 0.0,
                    'wfh_balance': float(row.wfh_balance) if row.wfh_balance else 0.0
                })
            
            return records
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching leave records", error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error fetching leave records", error=str(e))
            raise

    @staticmethod
    def get_leave_transaction_details(leave_tran_id: int, approved_by: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves detailed leave transaction information for email notifications.
        """
        if not leave_tran_id or leave_tran_id <= 0:
            raise ValueError("Invalid leave_tran_id")
        
        if not approved_by or not approved_by.strip():
            raise ValueError("approved_by is required")
        
        Logger.info("Getting leave transaction details for email", 
                   leave_tran_id=leave_tran_id, approved_by=approved_by)
        
        try:
            leave_tx = LeaveTransaction.query.filter_by(leave_tran_id=leave_tran_id).first()
            if not leave_tx:
                Logger.warning("Leave transaction not found", leave_tran_id=leave_tran_id)
                return None
            
            # Create aliases for employee lookups
            ApprovedByEmployee = db.aliased(Employee)
            TeamLeadEmployee = db.aliased(Employee)
            
            # Main query with all complex CASE logic
            result = db.session.query(
                LeaveTransaction.leave_tran_id,
                (Employee.first_name + ' ' + 
                 func.coalesce(Employee.middle_name, '') + ' ' + 
                 Employee.last_name).label('employee_name'),
                Employee.email,
                func.cast(MasterLeaveTypes.leave_type_id, db.String).label('leave_type'),
                MasterLeaveTypes.leave_name.label('leave_type_name'),
                LeaveTransaction.leave_status,
                LeaveTransaction.from_date.label('start_date'),
                LeaveTransaction.to_date.label('end_date'),
                case(
                    (LeaveTransaction.is_for_second_approval == True,
                     TeamLeadEmployee.email),
                    else_=ApprovedByEmployee.email
                ).label('approver_mail_id'),
                db.literal('shishir.nigam@flairminds.com').label('second_approver_mail_id'),
                case(
                    (and_(
                        LeaveTransaction.is_for_second_approval == True,
                        LeaveTransaction.second_approver_date.isnot(None)
                    ), LeaveTransaction.second_approval_comment),
                    else_=LeaveTransaction.approval_comment
                ).label('description'),
                LeaveTransaction.comments.label('leave_description'),
                case(
                    (and_(
                        LeaveTransaction.is_for_second_approval == True,
                        LeaveTransaction.second_approver_date.isnot(None)
                    ), 'Shishir Nigam'),
                    else_=LeaveTransaction.approved_by
                ).label('approved_by'),
                case(
                    (LeaveTransaction.leave_type.in_([LeaveTypeID.COMP_OFF, LeaveTypeID.WFH]), 'Not Required'),
                    else_='Yes'
                ).label('is_cust_informed'),
                case(
                    (LeaveTransaction.leave_type.in_([LeaveTypeID.COMP_OFF, LeaveTypeID.WFH]), 'Not Required'),
                    else_='Yes'
                ).label('is_communicated_with_team'),
                case(
                    (LeaveTransaction.leave_type.in_([LeaveTypeID.COMP_OFF, LeaveTypeID.WFH]), 'Not Required'),
                    else_='Yes'
                ).label('is_handover_responsibilities'),
                case(
                    (MasterLeaveTypes.leave_type_id == LeaveTypeID.COMP_OFF, 'Yes'),
                    else_='Not Required'
                ).label('is_com_off_approved'),
                case(
                    (MasterLeaveTypes.leave_type_id == LeaveTypeID.WFH, 'Yes'),
                    else_='Not Required'
                ).label('is_work_from_approved')
            ).join(
                Employee,
                LeaveTransaction.employee_id == Employee.employee_id
            ).join(
                MasterLeaveTypes,
                LeaveTransaction.leave_type == MasterLeaveTypes.leave_type_id
            ).outerjoin(
                ApprovedByEmployee,
                ApprovedByEmployee.employee_id == approved_by
            ).outerjoin(
                TeamLeadEmployee,
                TeamLeadEmployee.employee_id == Employee.team_lead_id
            ).filter(
                LeaveTransaction.leave_tran_id == leave_tran_id
            ).first()
            
            if not result:
                return None
            
            employee_name = ' '.join(result.employee_name.split())
            
            return {
                'leave_tran_id': result.leave_tran_id,
                'employee_name': employee_name,
                'email': result.email or '',
                'leave_type': result.leave_type,
                'leave_type_name': result.leave_type_name or '',
                'leave_status': result.leave_status or '',
                'start_date': result.start_date,
                'end_date': result.end_date,
                'approver_mail_id': result.approver_mail_id or '',
                'second_approver_mail_id': result.second_approver_mail_id,
                'description': result.description or '',
                'leave_description': result.leave_description or '',
                'approved_by': result.approved_by or '',
                'is_cust_informed': result.is_cust_informed,
                'is_communicated_with_team': result.is_communicated_with_team,
                'is_handover_responsibilities': result.is_handover_responsibilities,
                'is_com_off_approved': result.is_com_off_approved,
                'is_work_from_approved': result.is_work_from_approved
            }
            
        except SQLAlchemyError as e:
            Logger.error("Database error getting leave transaction details",
                        leave_tran_id=leave_tran_id, error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error getting leave transaction details",
                           leave_tran_id=leave_tran_id, error=str(e))
            raise

    @staticmethod
    def get_employee_roles(employee_id: str) -> List[Dict[str, str]]:
        """
        Retrieves all roles assigned to an employee.
        """
        if not employee_id or not employee_id.strip():
            raise ValueError("Employee ID is required")
        
        Logger.info("Getting employee roles", employee_id=employee_id)
        
        try:
            roles = db.session.query(
                EmployeeRole.employee_id,
                MasterRole.role_name
            ).join(
                MasterRole,
                EmployeeRole.role_id == MasterRole.role_id
            ).filter(
                EmployeeRole.employee_id == employee_id
            ).order_by(
                func.cast(func.replace(EmployeeRole.employee_id, 'EMP', ''), Integer).asc()
            ).all()
            
            result = [
                {
                    'employee_id': r.employee_id,
                    'role_name': r.role_name
                }
                for r in roles
            ]
            
            return result
            
        except SQLAlchemyError as e:
            Logger.error("Database error getting employee roles",
                        employee_id=employee_id, error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error getting employee roles",
                           employee_id=employee_id, error=str(e))
            raise

    @staticmethod
    def get_all_leave_transactions(year: int) -> List[Dict[str, Any]]:
        """
        Retrieves ALL leave transactions for a given year (for HR/Admin).
        """
        month = None
        
        if not year:
            year = datetime.now().year
            month = datetime.now().month
        
        Logger.info("Getting all leave transactions (HR/Admin)", year=year)
        
        try:
            # Get financial year dates
            start_date, end_date = LeaveUtils.get_financial_year_dates(year, month)

            # Helper for date formatting
            def format_date(date_obj):
                if date_obj:
                    return date_obj.strftime('%d-%m-%Y')
                return ''
            
            AppliedByEmployee = db.aliased(Employee)
            Approver = db.aliased(Employee)
            
            # Main query with all JOINs - NO APPROVER FILTER
            query = db.session.query(
                LeaveTransaction.leave_tran_id,
                LeaveTransaction.employee_id,
                (Employee.first_name + ' ' + 
                 func.coalesce(Employee.middle_name, '') + ' ' + 
                 Employee.last_name).label('emp_name'),
                LeaveTransaction.comments,
                LeaveTransaction.leave_type_id,
                LeaveTransaction.from_date,
                LeaveTransaction.to_date,
                LeaveTransaction.duration,
                LeaveTransaction.hand_over_comments,
                (AppliedByEmployee.first_name + ' ' + 
                 func.coalesce(AppliedByEmployee.middle_name, '') + ' ' + 
                 AppliedByEmployee.last_name).label('applied_by_name'),
                LeaveTransaction.application_date,
                LeaveTransaction.approved_by,
                LeaveTransaction.approved_date,
                LeaveTransaction.approval_comment,
                LeaveTransaction.leave_status,
                LeaveTransaction.attachments,
                LeaveTransaction.is_billable,
                LeaveTransaction.is_communicated_to_team,
                LeaveTransaction.is_customer_approval_required,
                LeaveTransaction.no_of_days,
                WorkingLate.from_time,
                WorkingLate.to_time,
                WorkingLate.reason_for_working_late,
                CompensatoryOff.comp_off_date,
                CompensatoryOff.comp_off_time,
                CustomerHoliday.worked_date,
                MasterLeaveTypes.leave_name,
                (Approver.first_name + ' ' + Approver.last_name).label('approver_name')
            ).join(
                Employee,
                LeaveTransaction.employee_id == Employee.employee_id
            ).join(
                MasterLeaveTypes,
                LeaveTransaction.leave_type_id == MasterLeaveTypes.leave_type_id
            ).outerjoin(
                AppliedByEmployee,
                LeaveTransaction.applied_by == AppliedByEmployee.employee_id
            ).outerjoin(
                Approver,
                LeaveTransaction.approver_id == Approver.employee_id
            ).outerjoin(
                WorkingLate,
                LeaveTransaction.leave_tran_id == WorkingLate.leave_tran_id
            ).outerjoin(
                CompensatoryOff,
                LeaveTransaction.leave_tran_id == CompensatoryOff.leave_tran_id
            ).outerjoin(
                CustomerHoliday,
                LeaveTransaction.leave_tran_id == CustomerHoliday.leave_tran_id
            )
            
            # Only filter by date range - no approver filter
            query = query.filter(
                LeaveTransaction.from_date.between(start_date, end_date)
            ).order_by(
                LeaveTransaction.from_date.desc()
            )

            results = query.all()
            Logger.info(f"Retrieved {len(results)} leave transactions")

            # Format results
            formatted_results = []
            for row in results:
                formatted_results.append({
                    'leaveTranId': row.leave_tran_id,
                    'employeeId': row.employee_id,
                    'empName': row.emp_name,
                    'comments': row.comments or '',
                    'leaveTypeId': row.leave_type_id,
                    'leaveName': row.leave_name,
                    'fromDate': format_date(row.from_date),
                    'toDate': format_date(row.to_date),
                    'duration': row.duration or '',
                    'handOverComments': row.hand_over_comments or '',
                    'appliedByName': row.applied_by_name or '',
                    'applicationDate': format_date(row.application_date),
                    'approvedBy': row.approved_by or '',
                    'approvedDate': format_date(row.approved_date),
                    'approvalComment': row.approval_comment or '',
                    'leaveStatus': row.leave_status,
                    'attachments': row.attachments or '',
                    'isBillable': row.is_billable or False,
                    'isCommunicatedToTeam': row.is_communicated_to_team or False,
                    'isCustomerApprovalRequired': row.is_customer_approval_required or False,
                    'noOfDays': float(row.no_of_days) if row.no_of_days else 0.0,
                    'fromTime': str(row.from_time) if row.from_time else '',
                    'toTime': str(row.to_time) if row.to_time else '',
                    'reasonForWorkingLate': row.reason_for_working_late or '',
                    'compOffDate': format_date(row.comp_off_date),
                    'compOffTime': str(row.comp_off_time) if row.comp_off_time else '',
                    'workedDate': format_date(row.worked_date),
                    'approverName': row.approver_name or 'N/A'
                })

            return formatted_results
            
        except Exception as e:
            Logger.critical("Error fetching all leave transactions", error=str(e))
            raise e

    @staticmethod
    def get_leave_transactions_by_approver(approver_id: str, year: int) -> List[Dict[str, Any]]:
        """
        Retrieves all leave transactions approved by or requiring approval from a team lead.
        """
        if not approver_id or not approver_id.strip():
            raise ValueError("approver_id is required")
        
        month = None
        
        if not year:
            year = datetime.now().year
            month = datetime.now().month
        
        Logger.info("Getting leave transactions by approver",
                   approver_id=approver_id, year=year)
        
        try:
            # Get financial year dates
            start_date, end_date = LeaveUtils.get_financial_year_dates(year, month)

            # Get team lead full name for filter
            approver = db.session.query(
                (Employee.first_name + ' ' + Employee.last_name).label('name'),
                Employee.email
            ).filter(
                Employee.employee_id == approver_id
            ).first()
            
            approver_name = approver.name if approver else ''
            
            # Helper for date formatting
            def format_date(date_obj):
                if date_obj:
                    return date_obj.strftime('%d-%m-%Y') # Standardized format
                return ''
            
            AppliedByEmployee = db.aliased(Employee)
            Approver = db.aliased(Employee)
            
            # Main query with all JOINs
            query = db.session.query(
                LeaveTransaction.leave_tran_id,
                LeaveTransaction.employee_id,
                (Employee.first_name + ' ' + 
                 func.coalesce(Employee.middle_name, '') + ' ' + 
                 Employee.last_name).label('emp_name'),
                LeaveTransaction.comments,
                LeaveTransaction.leave_type_id,
                LeaveTransaction.from_date,
                LeaveTransaction.to_date,
                LeaveTransaction.duration,
                LeaveTransaction.hand_over_comments,
                (AppliedByEmployee.first_name + ' ' + 
                 func.coalesce(AppliedByEmployee.middle_name, '') + ' ' + 
                 AppliedByEmployee.last_name).label('applied_by_name'),
                LeaveTransaction.application_date,
                case(
                    (and_(
                        LeaveTransaction.is_for_second_approval == True,
                        LeaveTransaction.leave_status == LeaveStatus.PARTIAL_APPROVED
                    ), approver_name),
                    else_=LeaveTransaction.approved_by
                ).label('approved_by'),
                LeaveTransaction.approved_date,
                case(
                    (and_(
                        LeaveTransaction.is_for_second_approval == True,
                        LeaveTransaction.leave_status == LeaveStatus.PARTIAL_APPROVED
                    ), LeaveTransaction.second_approval_comment),
                    else_=LeaveTransaction.approval_comment
                ).label('approval_comment'),
                LeaveTransaction.leave_status,
                LeaveTransaction.attachments,
                LeaveTransaction.is_billable,
                LeaveTransaction.is_communicated_to_team,
                LeaveTransaction.is_customer_approval_required,
                LeaveTransaction.no_of_days,
                WorkingLate.from_time,
                WorkingLate.to_time,
                WorkingLate.reason_for_working_late,
                CompensatoryOff.comp_off_date,
                CompensatoryOff.comp_off_time,
                CustomerHoliday.worked_date,
                MasterLeaveTypes.leave_name.label('leave_name'), # Join to get name
                (Approver.first_name + ' ' + Approver.last_name).label('approver_name')
            ).join(
                Employee,
                LeaveTransaction.employee_id == Employee.employee_id
            ).join(
                MasterLeaveTypes,
                LeaveTransaction.leave_type_id == MasterLeaveTypes.leave_type_id
            ).outerjoin(
                AppliedByEmployee,
                LeaveTransaction.applied_by == AppliedByEmployee.employee_id
            ).outerjoin(
                Approver,
                LeaveTransaction.approver_id == Approver.employee_id
            ).outerjoin(
                WorkingLate,
                LeaveTransaction.leave_tran_id == WorkingLate.leave_tran_id
            ).outerjoin(
                CompensatoryOff,
                LeaveTransaction.leave_tran_id == CompensatoryOff.leave_tran_id
            ).outerjoin(
                CustomerHoliday,
                LeaveTransaction.leave_tran_id == CustomerHoliday.leave_tran_id
            )
            
            # Filter logic
            approver_email = approver.email if approver else None
            
            if approver_email == EmailConfig.SECONDARY_LEAVE_APPROVER_EMAIL:
                query = query.filter(or_(
                    Employee.team_lead_id == approver_id,
                    and_(
                        LeaveTransaction.is_for_second_approval == True,
                        LeaveTransaction.leave_status == LeaveStatus.PARTIAL_APPROVED
                    )
                ))
            else:
                # Standard team lead filter - only see own team's leaves
                # (Unless existing code relied on implicit filtering? But explicit is safer)
                query = query.filter(Employee.team_lead_id == approver_id)

            query = query.order_by(
                LeaveTransaction.from_date.desc(),
                LeaveTransaction.leave_tran_id.desc()
            )
            
            results = query.all()

            # Separate fetch for CompOffTransaction to handle 1-to-many relationship
            # Extract leave_tran_ids for Customer Approved Comp-off
            # We filter by name or just fetch for all found IDs to be safe
            leave_tran_ids = [row.leave_tran_id for row in results]
            
            comp_off_map = {}
            if leave_tran_ids:
                co_details = db.session.query(CompOffTransaction).filter(
                    CompOffTransaction.leave_tran_id.in_(leave_tran_ids)
                ).all()
                
                for co in co_details:
                    if co.leave_tran_id not in comp_off_map:
                        comp_off_map[co.leave_tran_id] = []
                    
                    comp_off_map[co.leave_tran_id].append({
                        'compOffDate': co.comp_off_date.strftime('%Y-%m-%d') if co.comp_off_date else '',
                        'numberOfHours': co.duration or ''
                    })

            transactions = []
            for row in results:
                emp_name = ' '.join(row.emp_name.split())
                applied_by_name = ' '.join(row.applied_by_name.split()) if row.applied_by_name else ''
                
                transactions.append({
                    'leaveTranId': row.leave_tran_id,
                    'employeeId': row.employee_id or '',
                    'empName': emp_name,
                    'comments': row.comments or '',
                    'leaveType': row.leave_type_id,
                    'leaveTypeName': row.leave_name,
                    'fromDate': row.from_date,
                    'toDate': row.to_date,
                    'duration': row.duration or '',
                    'handOverComments': row.hand_over_comments or '',
                    'appliedBy': applied_by_name,
                    'applicationDate': row.application_date,
                    'approvedBy': row.approved_by or '',
                    'approvedDate': row.approved_date,
                    'approvalComment': row.approval_comment or '',
                    'leaveStatus': row.leave_status or '',
                    'appliedLeaveCount': float(row.no_of_days) if row.no_of_days else 0.0,
                    'fromTime': str(row.from_time) if row.from_time else '',
                    'toTime': str(row.to_time) if row.to_time else '',
                    'reasonForWorkingLate': row.reason_for_working_late or '',
                    'compOffDate': row.comp_off_date,
                    'workedDate': row.worked_date,
                    'compOffTransactions': comp_off_map.get(row.leave_tran_id, []),
                    'approverName': row.approver_name or 'N/A'
                })
            
            return transactions
            
        except Exception as e:
            Logger.error("Error getting leave transactions by approver",
                        approver_id=approver_id, error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error getting team lead leave transactions",
                           approver_id=approver_id, error=str(e))
            raise

    @staticmethod
    def get_employees_on_leave(start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """
        Retrieves a list of employees who are on leave between the start and end date (inclusive).
        includes Name, Leave Status, and Date Range.
        """
        try:
            # Join LeaveTransaction with Employee to get names
            # Filter for leaves that overlap with the requested range
            
            # Overlap logic: (StartA <= EndB) and (EndA >= StartB)
            # Transaction Range: [from_date, to_date]
            # Requested Range: [start_date, end_date]
            
            query = db.session.query(
                LeaveTransaction,
                Employee.first_name,
                Employee.last_name
            ).join(
                Employee,
                LeaveTransaction.employee_id == Employee.employee_id
            ).filter(
                LeaveTransaction.leave_status == LeaveStatus.APPROVED,
                func.date(LeaveTransaction.from_date) <= end_date,
                func.date(LeaveTransaction.to_date) >= start_date
            ).order_by(LeaveTransaction.from_date)
            
            results = query.all()
            
            leave_list = []
            for txn, first_name, last_name in results:
                leave_list.append({
                    "employee_name": f"{first_name} {last_name}",
                    "leave_status": txn.leave_status,
                    "from_date": txn.from_date.isoformat(),
                    "to_date": txn.to_date.isoformat(),
                    "leave_type_id": txn.leave_type_id
                })
                
            Logger.info("Retrieved employees on leave", 
                       start_date=start_date, 
                       end_date=end_date, 
                       count=len(leave_list))
            
            return leave_list
            
        except SQLAlchemyError as e:
            Logger.error("Database error getting employees on leave", error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error in get_employees_on_leave", error=str(e))
            raise
