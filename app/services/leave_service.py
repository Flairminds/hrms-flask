from ..models.leave import db, LeaveTransaction, CompOffTransaction, Holiday, LeaveType
from sqlalchemy import text
from datetime import datetime

class LeaveService:
    """Service class for handling leave-related operations like fetching types, details, and inserting transactions."""

    @staticmethod
    def get_leave_types_and_approver(employee_id):
        """
        Retrieves the list of available leave types and the assigned approver for an employee.
        """
        try:
            # Fetch all leave types
            types = db.session.execute(text("SELECT LeaveTypeId, LeaveTypeName FROM LeaveType")).fetchall()
            
            # Fetch the reporting lead (approver) for the given employee
            approver_query = text("""
                SELECT e.FirstName + ' ' + e.LastName AS ApproverName
                FROM Employees e
                JOIN Employees emp ON emp.LeaveApprover = e.EmployeeId
                WHERE emp.EmployeeId = :emp_id
            """)
            approver = db.session.execute(approver_query, {"emp_id": employee_id}).fetchone()
            
            return {
                "leaveTypes": [{"id": t.LeaveTypeId, "name": t.LeaveTypeName} for t in types],
                "approver": approver.ApproverName if approver else "Not Assigned"
            }
        except Exception as e:
            print(f"Error fetching leave types/approver: {e}")
            return {"leaveTypes": [], "approver": "Error"}

    @staticmethod
    def get_leave_details(employee_id, year=None):
        """
        Retrieves leave history and balances for a specific employee and year.
        Uses the 'GetLeaveDetailsByEmployeeIdv2' stored procedure.
        """
        try:
            if not year:
                year = datetime.now().year
                
            query = text("EXEC GetLeaveDetailsByEmployeeIdv2 @EmployeeId=:emp_id, @Year=:year")
            result = db.session.execute(query, {"emp_id": employee_id, "year": year}).fetchall()
            return result
        except Exception as e:
            print(f"Error fetching leave details: {e}")
            return []

    @staticmethod
    def insert_leave_transaction(data):
        """
        Inserts a new leave transaction and handles related sub-transactions (CompOff, etc.).
        """
        try:
            # Create the main leave transaction record
            new_leave = LeaveTransaction(
                EmployeeId=data.get('EmployeeId'),
                LeaveType=data.get('LeaveType'),
                FromDate=data.get('FromDate'),
                ToDate=data.get('ToDate'),
                Duration=data.get('Duration'),
                NoOfDays=data.get('NoOfDays'),
                Comments=data.get('Comments'),
                AppliedBy=data.get('AppliedBy'),
                HandOverComments=data.get('HandOverComments'),
                LeaveStatus='Pending'
            )
            db.session.add(new_leave)
            db.session.flush() # Flush to populate the LeaveTranId for sub-transactions
            
            # Handle CompOff transactions if provided in the request
            comp_offs = data.get('CompOffTransactions', [])
            for co in comp_offs:
                new_co = CompOffTransaction(
                    LeaveTranId=new_leave.LeaveTranId,
                    CompOffDate=co.get('CompOffDate'),
                    Duration=co.get('Duration')
                )
                db.session.add(new_co)
                
            db.session.commit()
            return new_leave.LeaveTranId
        except Exception as e:
            db.session.rollback()
            print(f"Error inserting leave transaction: {e}")
            raise e

    @staticmethod
    def update_leave_status(leave_tran_id, status, approved_by):
        """Updates the status (Approved/Rejected) of a leave transaction."""
        try:
            leave = LeaveTransaction.query.get(leave_tran_id)
            if leave:
                leave.LeaveStatus = status
                leave.ApprovedBy = approved_by
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            print(f"Error updating leave status: {e}")
            return False
        
    @staticmethod
    def get_holidays():
        """Retrieves the list of active holidays."""
        try:
            return Holiday.query.filter_by(IsActive=True).all()
        except Exception as e:
            print(f"Error fetching holidays: {e}")
            return []
