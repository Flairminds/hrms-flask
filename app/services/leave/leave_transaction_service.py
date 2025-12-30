from typing import Dict, List, Any, Optional
from datetime import datetime, date, timedelta
from sqlalchemy import text, func, case, and_
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from ... import db
from ...models.leave import (LeaveTransaction, CompOffTransaction, Holiday, LeaveType, 
                           LeaveOpeningTransaction, LeaveAudit, CompensatoryOff, WorkingLate,
                           CustomerHoliday)
from ...models.hr import Employee, LateralAndExempt
from ...utils.logger import Logger
from ...utils.constants import LeaveStatus, LeaveTypeID, EmployeeStatus

class LeaveTransactionService:
    @staticmethod
    def insert_leave_transaction(data: Dict[str, Any]) -> int:
        """
        Inserts a new leave transaction with comprehensive validations using ORM.
        Migrated from C# using stored procedure '[dbo].[InsertLeaveTransaction]'.
        """
        from .leave_query_service import LeaveQueryService
        from .leave_utils import LeaveUtils
        
        Logger.info("Executing InsertLeaveTransaction logic")
        
        emp_id = data.get('EmployeeId')
        leave_type = int(data.get('LeaveType'))
        from_date = data.get('FromDate')
        to_date = data.get('ToDate')
        no_of_days = float(data.get('NoOfDays'))
        applied_by = data.get('AppliedBy')
        
        if not emp_id or not from_date or not to_date or not applied_by:
            raise ValueError("Missing required fields for leave transaction")

        if isinstance(from_date, str):
            from_date = datetime.strptime(from_date, '%Y-%m-%d')
        if isinstance(to_date, str):
            to_date = datetime.strptime(to_date, '%Y-%m-%d')

        application_date = datetime.utcnow() + timedelta(minutes=330)
        app_date_only = application_date.date()
        from_date_only = from_date.date()
        
        flag_for_second_approval = 0

        try:
            # 2. WFH Validations
            if leave_type == LeaveTypeID.WFH:
                if no_of_days >= 5:
                    six_months_ago = from_date - timedelta(days=180)
                    last_wfh = db.session.query(func.max(LeaveTransaction.to_date)).filter(
                        LeaveTransaction.employee_id == emp_id,
                        LeaveTransaction.leave_type == LeaveTypeID.WFH,
                        LeaveTransaction.applied_leave_count >= 5,
                        LeaveTransaction.from_date >= six_months_ago,
                        LeaveTransaction.leave_status.in_([LeaveStatus.APPROVED, LeaveStatus.PARTIAL_APPROVED, LeaveStatus.PENDING]),
                        LeaveTransaction.applied_by.isnot(None)
                    ).scalar()
                    
                    if last_wfh and (from_date - last_wfh).days < 180:
                        raise ValueError("You have already taken a continuous 5-day WFH leave within the last 6 months.")

                employee = Employee.query.filter_by(employee_id=emp_id).first()
                lateral_info = LateralAndExempt.query.filter_by(employee_id=emp_id).first()
                is_lateral = lateral_info.lateral_hire if lateral_info else False
                
                if not is_lateral and employee and employee.date_of_joining:
                    if employee.date_of_joining >= date(2024, 8, 30):
                        if (datetime.now().date() - employee.date_of_joining).days < 360:
                            raise ValueError("Before Twelve Months of Joining, you cannot apply for Work From Home.")

                if app_date_only > from_date_only:
                    raise ValueError("You cannot apply for Work From Home as the application date is after the from date.")

                from_week = from_date.isocalendar()[1]
                conflicting_wfh = db.session.query(LeaveTransaction.to_date).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_type == LeaveTypeID.WFH,
                    LeaveTransaction.applied_leave_count == 5,
                    func.datepart(text('WEEK'), LeaveTransaction.to_date) == from_week,
                    LeaveTransaction.leave_status.in_([LeaveStatus.APPROVED, LeaveStatus.PARTIAL_APPROVED, LeaveStatus.PENDING]),
                    LeaveTransaction.applied_by.isnot(None)
                ).first()
                
                if conflicting_wfh:
                    raise ValueError("You cannot take any WFH leave this week as you have already taken a 5-day WFH leave.")

                current_gy = datetime.now()
                fy_year = current_gy.year if current_gy.month >= 4 else current_gy.year - 1
                fy_start, fy_end = LeaveUtils.get_financial_year_dates(fy_year)
                
                wfh_in_week = db.session.query(func.sum(LeaveTransaction.applied_leave_count)).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_type == LeaveTypeID.WFH,
                    func.datepart(text('WEEK'), LeaveTransaction.from_date) == from_week,
                    LeaveTransaction.leave_status.in_([LeaveStatus.APPROVED, LeaveStatus.PARTIAL_APPROVED, LeaveStatus.PENDING]),
                    LeaveTransaction.from_date >= fy_start,
                    LeaveTransaction.to_date <= fy_end,
                    LeaveTransaction.applied_by.isnot(None)
                ).scalar() or 0
                
                if wfh_in_week >= 1 or no_of_days > 1:
                    if (from_date_only - app_date_only).days < 7:
                        raise ValueError("More than 1 WFH in a week requires 1 week advance approval and 2nd level approval.")
                    else:
                        flag_for_second_approval = 1

            # 3. Privilege Leave Validation
            if leave_type == LeaveTypeID.PRIVILEGE:
                if (from_date_only - app_date_only).days < 6:
                    raise ValueError("You must apply for this leave at least 7 days in advance.")

            # 4. Balance Check
            cards = LeaveQueryService.get_employee_leave_cards(emp_id)
            target_card = next((c for c in cards if int(c['leave_type_id']) == leave_type), None)
            
            if target_card:
                remaining = target_card['total_alloted_leaves'] - target_card['total_used_leaves']
                if (remaining - no_of_days) < 0:
                    raise ValueError("Insufficient leave balance. Cannot Apply.")

            leave_tran_seq = db.session.execute(text("SELECT NEXT VALUE FOR [dbo].[leave_transaction_seq]")).scalar()
            is_second_approval = 1 if (flag_for_second_approval == 1 or leave_type == LeaveTypeID.CASUAL) else 0
            
            new_leave = LeaveTransaction(
                leave_tran_id=leave_tran_seq,
                employee_id=emp_id.upper(),
                comments=data.get('Comments'),
                leave_type=leave_type,
                from_date=from_date,
                to_date=to_date,
                duration=data.get('Duration'),
                applied_leave_count=no_of_days,
                hand_over_comments=data.get('HandOverComments'),
                applied_by=applied_by.upper(),
                application_date=application_date,
                approved_by=data.get('ApprovedBy'),
                is_for_second_approval=is_second_approval,
                leave_status=LeaveStatus.PENDING
            )
            db.session.add(new_leave)
            
            comp_offs = data.get('CompOffTransactions', [])
            for co in comp_offs:
                new_co = CompOffTransaction(
                    leave_tran_id=leave_tran_seq,
                    comp_off_date=co.get('CompOffDate'),
                    duration=co.get('Duration')
                )
                db.session.add(new_co)
                
            db.session.commit()
            return leave_tran_seq
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting leave transaction", error=str(e))
            raise e

    @staticmethod
    def update_leave_status(leave_tran_id: int, status: str, approver_comment: str, 
                          is_billable: bool, is_communicated_to_team: bool, 
                          is_customer_approval_required: bool, approved_by_id: str, 
                          have_customer_approval: str) -> tuple:
        """
        Updates the status of a leave transaction with multi-level approval logic.
        """
        Logger.info("Executing UpdateLeaveStatus logic", leave_tran_id=leave_tran_id)
        send_mail_flag = 0
        
        try:
            leave = LeaveTransaction.query.filter_by(leave_tran_id=leave_tran_id).first()
            if not leave:
                return "Transaction not found", 0
                
            leave_type = leave.leave_type
            is_for_second_approval = leave.is_for_second_approval
            current_status = leave.leave_status
            
            if leave_type in (LeaveTypeID.COMP_OFF, LeaveTypeID.WORKING_LATE) or is_for_second_approval:
                if current_status == LeaveStatus.PENDING:
                    leave.leave_status = LeaveStatus.PARTIAL_APPROVED if status == LeaveStatus.APPROVED else status
                    leave.approval_comment = approver_comment
                    leave.approved_date = datetime.now()
                    leave.is_billable = is_billable
                    leave.is_communicated_to_team = is_communicated_to_team
                    leave.is_customer_approval_required = is_customer_approval_required
                    leave.have_customer_approval = have_customer_approval
                    leave.approved_by = approved_by_id
                    send_mail_flag = 2
                elif current_status == LeaveStatus.PARTIAL_APPROVED:
                    leave.leave_status = status
                    leave.second_approval_comment = approver_comment
                    leave.second_approver_date = datetime.now()
                    send_mail_flag = 1
                else:
                    return "Leave Already Approved", 0
            else:
                leave.leave_status = status
                leave.approval_comment = approver_comment
                leave.approved_date = datetime.now()
                leave.is_billable = is_billable
                leave.is_communicated_to_team = is_communicated_to_team
                leave.is_customer_approval_required = is_customer_approval_required
                leave.approved_by = approved_by_id
                send_mail_flag = 1
                
            db.session.commit()
            return "Status updated successfully", send_mail_flag
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating leave status", leave_tran_id=leave_tran_id, error=str(e))
            raise e

    @staticmethod
    def insert_comp_off_transaction(employee_id: str, comments: str, leave_type: int, from_date: date, 
                                 to_date: date, duration: str, hand_over_comments: str, no_of_days: float, 
                                 approved_by: str, applied_by: str, 
                                 comp_off_transactions: List[Dict[str, Any]]) -> int:
        """
        Inserts a CompOff leave transaction with multiple compensatory off records.
        """
        if not employee_id or not employee_id.strip():
            raise ValueError("employee_id is required")
        if not applied_by or not applied_by.strip():
            raise ValueError("applied_by is required")
        if not comp_off_transactions:
            raise ValueError("comp_off_transactions list cannot be empty")
        
        Logger.info("Inserting CompOff transaction", employee_id=employee_id, leave_type=leave_type)
        
        try:
            ist_application_date = datetime.utcnow() + timedelta(minutes=330)
            leave_tran_seq = db.session.execute(text("SELECT NEXT VALUE FOR [dbo].[leave_transaction_seq]")).scalar()
            
            new_leave = LeaveTransaction(
                leave_tran_id=leave_tran_seq,
                employee_id=employee_id.upper(),
                comments=comments,
                leave_type=leave_type,
                from_date=from_date,
                to_date=to_date,
                applied_leave_count=no_of_days,
                duration=duration,
                hand_over_comments=hand_over_comments,
                applied_by=applied_by.upper(),
                approved_by=approved_by,
                application_date=ist_application_date,
                is_for_second_approval=1,
                leave_status=LeaveStatus.PENDING
            )
            db.session.add(new_leave)
            
            for comp_off_data in comp_off_transactions:
                comp_off = CompensatoryOff(
                    leave_tran_id=leave_tran_seq,
                    employee_id=employee_id.upper(),
                    comp_off_date=comp_off_data.get('CompOffDate'),
                    comp_off_time=comp_off_data.get('CompOffTime'),
                    is_used=1
                )
                db.session.add(comp_off)
            
            db.session.commit()
            return leave_tran_seq
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting CompOff transaction", employee_id=employee_id, error=str(e))
            raise e

    @staticmethod
    def insert_customer_holiday(employee_id: str, comments: str, leave_type: int, from_date: date, 
                             to_date: date, duration: str, hand_over_comments: str, no_of_days: float, 
                             approved_by: str, applied_by: str, worked_date: str) -> int:
        """
        Inserts a customer holiday leave transaction and related worked date records.
        """
        if not employee_id or not employee_id.strip():
            raise ValueError("employee_id is required")
        if not applied_by or not applied_by.strip():
            raise ValueError("applied_by is required")
            
        Logger.info("Inserting customer holiday transaction", employee_id=employee_id)
                   
        try:
            application_date = datetime.utcnow() + timedelta(minutes=330)
            leave_tran_seq = db.session.execute(text("SELECT NEXT VALUE FOR [dbo].[leave_transaction_seq]")).scalar()
            
            new_leave = LeaveTransaction(
                leave_tran_id=leave_tran_seq,
                employee_id=employee_id.upper(),
                comments=comments,
                leave_type=leave_type,
                from_date=from_date,
                to_date=to_date,
                applied_leave_count=no_of_days,
                duration=duration,
                hand_over_comments=hand_over_comments,
                applied_by=applied_by.upper(),
                approved_by=approved_by,
                application_date=application_date,
                leave_status=LeaveStatus.PENDING
            )
            db.session.add(new_leave)
            
            customer_holiday = CustomerHoliday(
                leave_tran_id=leave_tran_seq,
                worked_date=worked_date
            )
            db.session.add(customer_holiday)
            db.session.commit()
            return leave_tran_seq
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting customer holiday", employee_id=employee_id, error=str(e))
            raise e

    @staticmethod
    def insert_working_late(employee_id: str, comments: str, leave_type: int, from_date: date, 
                         to_date: date, duration: str, hand_over_comments: str, no_of_days: float, 
                         approved_by: str, applied_by: str, from_time: str, to_time: str, 
                         reason_for_working_late: str) -> int:
        """
        Inserts a working late transaction with related time details.
        """
        Logger.info("Executing InsertWorkingLate logic", employee_id=employee_id)
        
        try:
            leave_tran_id = db.session.execute(text("SELECT NEXT VALUE FOR [dbo].[leave_transaction_seq]")).scalar()
            application_date = datetime.utcnow() + timedelta(minutes=330)
            
            new_leave = LeaveTransaction(
                leave_tran_id=leave_tran_id,
                employee_id=employee_id.upper() if employee_id else None,
                comments=comments,
                leave_type=leave_type,
                from_date=from_date,
                to_date=to_date,
                applied_leave_count=no_of_days,
                duration=duration,
                hand_over_comments=hand_over_comments,
                applied_by=applied_by.upper() if applied_by else None,
                approved_by=approved_by,
                application_date=application_date,
                leave_status=LeaveStatus.PENDING
            )
            db.session.add(new_leave)
            
            working_late_details = WorkingLate(
                leave_tran_id=leave_tran_id,
                from_time=from_time,
                to_time=to_time,
                reason_for_working_late=reason_for_working_late
            )
            db.session.add(working_late_details)
            
            db.session.commit()
            return leave_tran_id
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting working late transaction", employee_id=employee_id, error=str(e))
            raise e
