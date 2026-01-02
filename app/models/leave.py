from .. import db
from datetime import datetime
from .base import BaseModel
from sqlalchemy import text

class MasterLeaveTypes(BaseModel):
    __tablename__ = 'master_leave_types'
    leave_type_id = db.Column(db.Integer, primary_key=True)
    leave_name = db.Column(db.String(100))
    yearly_allocation = db.Column(db.Integer)
    monthly_allocation = db.Column(db.Integer)
    requires_customer_approval = db.Column(db.Boolean)
    leave_cards_flag = db.Column(db.Boolean)
    quarterly_allocation = db.Column(db.Numeric(18, 0))

class LeaveTransaction(BaseModel):
    __tablename__ = 'leave_transaction'
    leave_tran_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    comments = db.Column(db.Text)
    leave_type_id = db.Column(db.Integer, db.ForeignKey('master_leave_types.leave_type_id'))
    from_date = db.Column(db.DateTime)
    to_date = db.Column(db.DateTime)
    duration = db.Column(db.String(20))
    no_of_days = db.Column(db.Integer)
    hand_over_comments = db.Column(db.Text)
    applied_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    application_date = db.Column(db.DateTime)
    approver_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    approved_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    approved_date = db.Column(db.DateTime)
    approval_comment = db.Column(db.String(255))
    leave_status = db.Column(db.String(50), default='Pending')
    attachments = db.Column(db.LargeBinary)
    is_billable = db.Column(db.Boolean)
    is_customer_approved = db.Column(db.Boolean, server_default=text('false'))
    is_customer_approval_required = db.Column(db.Boolean, server_default=text('false'))
    is_communicated_to_team = db.Column(db.Boolean, server_default=text('false'))
    second_approval_comment = db.Column(db.String(255))
    second_approval_date = db.Column(db.DateTime)
    second_approval_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    is_for_second_approval = db.Column(db.Boolean, server_default=text('false'))
    exempt_from_count = db.Column(db.Boolean, server_default=text('false'))
    exempt_from_count_comments = db.Column(db.String(255))
    exempted_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    exempted_date = db.Column(db.DateTime)

class CompOffTransaction(BaseModel):
    __tablename__ = 'comp_off_transaction'
    comp_off_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    leave_tran_id = db.Column(db.Integer, db.ForeignKey('leave_transaction.leave_tran_id'))
    comp_off_date = db.Column(db.DateTime)
    duration = db.Column(db.String(20))


class Holiday(BaseModel):
    __tablename__ = 'holiday'
    holiday_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    holiday_date = db.Column(db.Date, nullable=False)
    holiday_name = db.Column(db.String(255), nullable=False)
    added_by = db.Column(db.String(255), nullable=False, default='manager')
    added_on = db.Column(db.DateTime, nullable=False, server_default=db.func.now())


class LeaveManagement(BaseModel):
    __tablename__ = 'leave_management'
    employee_id = db.Column(db.String(20), primary_key=True)
    unpaid_leaves = db.Column(db.Numeric(4, 2))
    count = db.Column(db.Numeric(4, 2))
    privilege_leave_count = db.Column(db.Numeric(4, 2))
    lateral_hire = db.Column(db.Numeric(4, 2))
    entry_exempt = db.Column(db.Numeric(4, 2))
    wfh_count = db.Column(db.Numeric(4, 2))
    sick_leave_count = db.Column(db.Numeric(4, 2))
    carry_forward_balance = db.Column(db.Numeric(4, 2))


class LeaveAudit(BaseModel):
    __tablename__ = 'leave_audit'
    leave_transaction_id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    leave_type_id = db.Column(db.Integer)
    number_of_days = db.Column(db.Numeric(5, 2))
    application_date = db.Column(db.Date)
    is_carry_forword = db.Column(db.Boolean, default=False)
    insert_date = db.Column(db.Date, server_default=db.func.now())


class LeaveOpeningTransaction(BaseModel):
    __tablename__ = 'leave_opening_transaction'
    leave_type_id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), primary_key=True)
    no_of_days = db.Column(db.Numeric(5, 2))
    added_by = db.Column(db.String(100))
    transaction_date = db.Column(db.Date)
    approved_by = db.Column(db.String(100))
    approved_date = db.Column(db.Date)
    is_carry_forwarded = db.Column(db.Boolean)


class CompensatoryOff(BaseModel):
    __tablename__ = 'compensatory_off'
    comp_off_id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    comp_off_date = db.Column(db.Date)
    is_used = db.Column(db.Boolean)
    leave_tran_id = db.Column(db.Integer, db.ForeignKey('leave_transaction.leave_tran_id'))
    comp_off_time = db.Column(db.Numeric(5, 2))


class WorkingLate(BaseModel):
    __tablename__ = 'working_late'
    leave_tran_id = db.Column(db.Integer, db.ForeignKey('leave_transaction.leave_tran_id'), primary_key=True)
    from_time = db.Column(db.String(5))
    to_time = db.Column(db.String(5))
    reason_for_working_late = db.Column(db.String(255))


class CustomerHoliday(BaseModel):
    __tablename__ = 'customer_holiday'
    leave_tran_id = db.Column(db.Integer, db.ForeignKey('leave_transaction.leave_tran_id'), primary_key=True)
    worked_date = db.Column(db.String(200))
