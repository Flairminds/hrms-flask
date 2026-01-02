from typing import List, Dict, Any, Optional
from datetime import date

from .leave import (LeaveUtils, LeaveTransactionService, LeaveQueryService, LeaveConfigService)

class LeaveService:
    """
    Facade service for leave-related operations.
    Delegates all calls to specialized sub-services for better modularity.
    """
    
    @staticmethod
    def get_leave_types_and_approver(employee_id: str):
        return LeaveQueryService.get_leave_types_and_approver(employee_id)

    @staticmethod
    def get_leave_details(employee_id: str, year: Optional[int] = None):
        return LeaveQueryService.get_leave_details(employee_id, year)

    @staticmethod
    def insert_leave_transaction(data: Dict[str, Any]) -> int:
        return LeaveTransactionService.insert_leave_transaction(data)

    @staticmethod
    def insert_comp_off_transaction(employee_id: str, comments: str, leave_type: int, from_date: date, 
                                 to_date: date, duration: str, hand_over_comments: str, no_of_days: float, 
                                 approved_by: str, applied_by: str, 
                                 comp_off_transactions: List[Dict[str, Any]]) -> int:
        return LeaveTransactionService.insert_comp_off_transaction(
            employee_id, comments, leave_type, from_date, to_date, duration, 
            hand_over_comments, no_of_days, approved_by, applied_by, comp_off_transactions
        )

    @staticmethod
    def insert_customer_holiday(employee_id: str, comments: str, leave_type: int, from_date: date, 
                             to_date: date, duration: str, hand_over_comments: str, no_of_days: float, 
                             approved_by: str, applied_by: str, worked_date: str) -> int:
        return LeaveTransactionService.insert_customer_holiday(
            employee_id, comments, leave_type, from_date, to_date, duration, 
            hand_over_comments, no_of_days, approved_by, applied_by, worked_date
        )

    @staticmethod
    def insert_working_late(employee_id: str, comments: str, leave_type: int, from_date: date, 
                         to_date: date, duration: str, hand_over_comments: str, no_of_days: float, 
                         approved_by: str, applied_by: str, from_time: str, to_time: str, 
                         reason_for_working_late: str) -> int:
        return LeaveTransactionService.insert_working_late(
            employee_id, comments, leave_type, from_date, to_date, duration, 
            hand_over_comments, no_of_days, approved_by, applied_by, from_time, 
            to_time, reason_for_working_late
        )

    @staticmethod
    def update_leave_status(leave_tran_id: int, status: str, approver_comment: str, 
                          is_billable: bool, is_communicated_to_team: bool, 
                          is_customer_approval_required: bool, approved_by_id: str, 
                          have_customer_approval: str) -> tuple:
        return LeaveTransactionService.update_leave_status(
            leave_tran_id, status, approver_comment, is_billable, 
            is_communicated_to_team, is_customer_approval_required, 
            approved_by_id, have_customer_approval
        )

    @staticmethod
    def get_holidays() -> List[Dict[str, Any]]:
        return LeaveConfigService.get_holidays()

    @staticmethod
    def get_financial_year_dates(year: int):
        return LeaveUtils.get_financial_year_dates(year)

    @staticmethod
    def get_all_employee_leave_records(year: Optional[int] = None):
        return LeaveQueryService.get_all_employee_leave_records(year)

    @staticmethod
    def insert_holiday(holiday_date: date, holiday_name: str) -> bool:
        return LeaveConfigService.insert_holiday(holiday_date, holiday_name)

    @staticmethod
    def get_employee_roles(employee_id: str) -> List[Dict[str, str]]:
        return LeaveQueryService.get_employee_roles(employee_id)

    @staticmethod
    def get_employee_leave_cards(employee_id: str):
        return LeaveQueryService.get_employee_leave_cards(employee_id)

    @staticmethod
    def get_leave_transaction_details(leave_tran_id: int, approved_by: str):
        return LeaveQueryService.get_leave_transaction_details(leave_tran_id, approved_by)

    @staticmethod
    def get_leave_transactions_by_approver(approver_id: str, year: int):
        return LeaveQueryService.get_leave_transactions_by_approver(approver_id, year)
