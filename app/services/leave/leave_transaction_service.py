from typing import Dict, List, Any, Optional
from datetime import datetime, date, timedelta
from sqlalchemy import text, func, case, and_
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from ... import db
from ...models.leave import (LeaveTransaction, CompOffTransaction, Holiday, MasterLeaveTypes, 
                           LeaveOpeningTransaction, LeaveAudit, CompensatoryOff, WorkingLate,
                           CustomerHoliday)
from ...models.hr import Employee, LateralAndExempt
from ...utils.logger import Logger
from ...utils.constants import LeaveStatus, LeaveTypeID, EmployeeStatus, LeaveTypeName

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
        
        emp_id = data.get('employeeId')
        leave_type_name = data.get('leaveType')
        from_date = data.get('fromDate')
        to_date = data.get('toDate')
        no_of_days = data.get('noOfDays')
        applied_by = data.get('appliedBy')
        duration = data.get('duration')
        comments = data.get('comments', '')
        
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

        # Fetch leave balances and resolve leave type
        balance_leaves = LeaveQueryService.get_employee_leave_cards(emp_id)
        target_card = next((c for c in balance_leaves if c['leave_name'] == leave_type_name), None)
        
        # If leave type not found in balance cards, check if it exists in master_leave_types
        # (for leave types that don't require balance tracking like "Visiting Client Location")
        if not target_card:
            from ...models.leave import MasterLeaveTypes
            master_leave_type = MasterLeaveTypes.query.filter_by(
                leave_name=leave_type_name,
                is_deleted=False
            ).first()
            
            if not master_leave_type:
                raise ValueError(f"Invalid or unauthorized leave type: {leave_type_name}")
            
            # Create a card-like structure for consistency
            target_card = {
                'leave_type_id': master_leave_type.leave_type_id,
                'leave_name': master_leave_type.leave_name,
                'leave_cards_flag': master_leave_type.leave_cards_flag or False,
                'total_alloted_leaves': 0,
                'total_used_leaves': 0
            }
            
        leave_type_id = int(target_card['leave_type_id'])
        remaining = target_card.get('total_alloted_leaves', 0) - target_card.get('total_used_leaves', 0)

        # validation - any leave should not overlap with existing leave
        existing_leaves = LeaveQueryService.get_leave_details(emp_id)
        existing_leaves = [c for c in existing_leaves if c['leave_status'] != LeaveStatus.REJECTED and c['leave_status'] != LeaveStatus.CANCELLED]
        
        # Helper to ensure we are comparing date objects
        def to_date_obj(d):
            if isinstance(d, str):
                # Try common formats if needed, but get_leave_details uses '%d %b %Y'
                try:
                    return datetime.strptime(d, '%d %b %Y').date()
                except ValueError:
                    return datetime.strptime(d, '%Y-%m-%d').date()
            if isinstance(d, datetime):
                return d.date()
            return d

        new_from = to_date_obj(from_date)
        new_to = to_date_obj(to_date)

        for leave in existing_leaves:
            exist_from = to_date_obj(leave['from_date'])
            exist_to = to_date_obj(leave['to_date'])
            if exist_from <= new_to and exist_to >= new_from:
                raise ValueError("Leaves already applied for some of the selected dates.")

        try:
            # 1. Privilege Leave Validation
            # at least 7 days in advance, cannot exceed balance
            if leave_type_name == LeaveTypeName.PRIVILEGE_LEAVE:
                if (from_date_only - app_date_only).days < 7:
                    raise ValueError("You must apply for Privilege Leave at least 7 days in advance.")

                if remaining < no_of_days:
                    raise ValueError(f"Insufficient Privilege Leave balance. Available: {remaining}")

            # 2. Sick/Emergency Leave Validation
            if leave_type_name == LeaveTypeName.SICK_LEAVE:
                if remaining < no_of_days:
                    raise ValueError(f"Insufficient {LeaveTypeName.SICK_LEAVE} balance. Available: {remaining}")

            # 3. Missed Door Entry Validation
            if leave_type_name == "Missed Door Entry":
                # Only full day allowed
                if duration != "Full Day":
                    raise ValueError("Missed Door Entry leave must be Full Day only.")
                
                # Only past or current date allowed (not future)
                if from_date_only > app_date_only:
                    raise ValueError("Missed Door Entry leave can only be applied for past or current dates, not future dates.")

            # 4. WFH Validations
            if leave_type_id == LeaveTypeID.WFH:
                if no_of_days >= 5:
                    six_months_ago = from_date - timedelta(days=180)
                    last_wfh = db.session.query(func.max(LeaveTransaction.to_date)).filter(
                        LeaveTransaction.employee_id == emp_id,
                        LeaveTransaction.leave_type_id == LeaveTypeID.WFH,
                        LeaveTransaction.no_of_days >= 5,
                        LeaveTransaction.from_date >= six_months_ago,
                        LeaveTransaction.leave_status.in_([LeaveStatus.APPROVED, LeaveStatus.PARTIAL_APPROVED, LeaveStatus.PENDING])
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
                # In production, use a more compatible approach if WEEK part is not supported directly in all dialects
                # Assuming SQL Server style based on previous context or just using SQLAlchemy native functions
                conflicting_wfh = db.session.query(LeaveTransaction.to_date).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_type_id == LeaveTypeID.WFH,
                    LeaveTransaction.no_of_days == 5,
                    func.datepart(text('WEEK'), LeaveTransaction.to_date) == from_week,
                    LeaveTransaction.leave_status.in_([LeaveStatus.APPROVED, LeaveStatus.PARTIAL_APPROVED, LeaveStatus.PENDING])
                ).first()
                
                if conflicting_wfh:
                    raise ValueError("You cannot take any WFH leave this week as you have already taken a 5-day WFH leave.")

                fy_year = application_date.year if application_date.month >= 4 else application_date.year - 1
                fy_start, fy_end = LeaveUtils.get_financial_year_dates(fy_year)
                
                wfh_in_week = db.session.query(func.sum(LeaveTransaction.no_of_days)).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_type_id == LeaveTypeID.WFH,
                    func.datepart(text('WEEK'), LeaveTransaction.from_date) == from_week,
                    LeaveTransaction.leave_status.in_([LeaveStatus.APPROVED, LeaveStatus.PARTIAL_APPROVED, LeaveStatus.PENDING]),
                    LeaveTransaction.from_date >= fy_start,
                    LeaveTransaction.to_date <= fy_end
                ).scalar() or 0
                
                if wfh_in_week >= 1 or no_of_days > 1:
                    if (from_date_only - app_date_only).days < 7:
                        raise ValueError("More than 1 WFH in a week requires 1 week advance approval and 2nd level approval.")
                    else:
                        flag_for_second_approval = 1

            # 4. General Balance Check (for any leave cards flagged types)
            # Exclude "Missed Door Entry" from balance checks as it's for attendance correction
            if target_card and target_card['leave_cards_flag'] and leave_type_name != "Missed Door Entry":
                remaining = target_card['total_alloted_leaves'] - target_card['total_used_leaves']
                if (remaining - no_of_days) < 0:
                    raise ValueError(f"Insufficient {leave_type_name} balance. Available: {remaining}")

            # Generate sequence if needed or use autoincrement
            # For now, following leave_tran_id = autoincrement in model definition
            is_second_approval = True if (flag_for_second_approval == 1 or leave_type_id == LeaveTypeID.CASUAL) else False
            
            new_leave = LeaveTransaction(
                employee_id=emp_id.upper(),
                comments=comments,
                leave_type_id=leave_type_id,
                from_date=from_date,
                to_date=to_date,
                no_of_days=no_of_days,
                hand_over_comments=data.get('handOverComments'),
                applied_by=applied_by.upper(),
                application_date=application_date,
                approved_by=data.get('approvedBy'),
                is_for_second_approval=is_second_approval,
                leave_status=LeaveStatus.PENDING,
                duration=duration
            )
            db.session.add(new_leave)
            db.session.flush() # To get the leave_tran_id
            
            leave_tran_id = new_leave.leave_tran_id

            comp_offs = data.get('compOffTransactions', [])
            for co in comp_offs:
                new_co = CompOffTransaction(
                    leave_tran_id=leave_tran_id,
                    comp_off_date=co.get('compOffDate'),
                    duration=co.get('duration')
                )
                db.session.add(new_co)
                
            db.session.commit()
            return leave_tran_id
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
                
            leave_type_id = leave.leave_type_id
            is_for_second_approval = leave.is_for_second_approval
            current_status = leave.leave_status
            
            if leave_type_id in (LeaveTypeID.COMP_OFF, LeaveTypeID.WORKING_LATE) or is_for_second_approval:
                if current_status == LeaveStatus.PENDING:
                    leave.leave_status = LeaveStatus.PARTIAL_APPROVED if status == LeaveStatus.APPROVED else status
                    leave.approval_comment = approver_comment
                    leave.approved_date = datetime.now()
                    leave.is_billable = is_billable
                    leave.is_communicated_to_team = is_communicated_to_team
                    leave.is_customer_approval_required = is_customer_approval_required
                    # leave.have_customer_approval = have_customer_approval
                    leave.approved_by = approved_by_id
                    send_mail_flag = 2
                elif current_status == LeaveStatus.PARTIAL_APPROVED:
                    leave.leave_status = status
                    leave.second_approval_comment = approver_comment
                    leave.second_approval_date = datetime.now()
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
                employee_id=employee_id.upper(),
                comments=comments,
                leave_type_id=leave_type,
                from_date=from_date,
                to_date=to_date,
                no_of_days=no_of_days,
                duration=duration,
                hand_over_comments=hand_over_comments,
                applied_by=applied_by.upper(),
                approved_by=approved_by,
                application_date=ist_application_date,
                is_for_second_approval=True,
                leave_status=LeaveStatus.PENDING
            )
            db.session.add(new_leave)
            db.session.flush()
            
            for comp_off_data in comp_off_transactions:
                comp_off = CompensatoryOff(
                    leave_tran_id=new_leave.leave_tran_id,
                    employee_id=employee_id.upper(),
                    comp_off_date=comp_off_data.get('CompOffDate'),
                    comp_off_time=comp_off_data.get('CompOffTime'),
                    is_used=1
                )
                db.session.add(comp_off)
            
            db.session.commit()
            return new_leave.leave_tran_id
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
                employee_id=employee_id.upper(),
                comments=comments,
                leave_type_id=leave_type,
                from_date=from_date,
                to_date=to_date,
                no_of_days=no_of_days,
                duration=duration,
                hand_over_comments=hand_over_comments,
                applied_by=applied_by.upper(),
                approved_by=approved_by,
                application_date=application_date,
                leave_status=LeaveStatus.PENDING
            )
            db.session.add(new_leave)
            db.session.flush()
            
            customer_holiday = CustomerHoliday(
                leave_tran_id=new_leave.leave_tran_id,
                worked_date=worked_date
            )
            db.session.add(customer_holiday)
            db.session.commit()
            return new_leave.leave_tran_id
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
                employee_id=employee_id.upper() if employee_id else None,
                comments=comments,
                leave_type_id=leave_type,
                from_date=from_date,
                to_date=to_date,
                no_of_days=no_of_days,
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
