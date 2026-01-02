from flask import request, jsonify
from ..services.leave_service import LeaveService
from ..utils.logger import Logger


class LeaveController:
    """Controller for handling leave-related requests."""

    @staticmethod
    def get_types_and_approver():
        """Retrieves leave types and the reporting manager for the employee."""
        Logger.info("Get leave types and approver request received")
        
        try:
            emp_id = request.args.get('employeeId')
            if not emp_id:
                Logger.warning("Missing employeeId parameter")
                return jsonify({"Message": "EmployeeId is required"}), 400
            
            result = LeaveService.get_leave_types_and_approver(emp_id)
            
            Logger.info("Leave types and approver retrieved",
                       employee_id=emp_id)
            
            return jsonify(result), 200
            
        except LookupError as le:
            Logger.warning("Employee not found for leave types",
                          employee_id=emp_id,
                          error=str(le))
            return jsonify({"Message": "Employee not found"}), 404
            
        except Exception as e:
            Logger.error("Unexpected error fetching leave types",
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while fetching leave types. Please try again."
            }), 500

    @staticmethod
    def get_leave_details(emp_id):
        """Retrieves detailed leave history for an employee."""
        Logger.info("Get leave details request received", employee_id=emp_id)
        
        try:
            details = LeaveService.get_leave_details(emp_id)
            
            Logger.info("Leave details retrieved successfully",
                       employee_id=emp_id,
                       record_count=len(details))
            
            return jsonify([dict(row) for row in details]), 200
            
        except LookupError as le:
            Logger.warning("Employee not found for leave details",
                          employee_id=emp_id,
                          error=str(le))
            return jsonify({"Message": "Employee not found"}), 404
            
        except Exception as e:
            Logger.error("Unexpected error fetching leave details",
                        employee_id=emp_id,
                        year=year,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while fetching leave details. Please try again."
            }), 500

    @staticmethod
    def insert_leave():
        """Submits a new leave application."""
        Logger.info("Insert leave request received")
        
        try:
            data = request.get_json()
            if not data:
                Logger.warning("Empty request body for leave application")
                return jsonify({"Message": "Request body must be JSON"}), 400
                
            tran_id = LeaveService.insert_leave_transaction(data)
            
            Logger.info("Leave application submitted successfully",
                       transaction_id=tran_id,
                       employee_id=data.get('employee_id'))
            
            return jsonify({
                "Message": "Leave applied successfully",
                "TransactionId": tran_id
            }), 201
            
        except ValueError as ve:
            Logger.warning("Validation error in leave application",
                          error=str(ve),
                          data_keys=list(data.keys()) if data else [])
            return jsonify({"Message": str(ve)}), 400
            
        except LookupError as le:
            Logger.warning("Resource not found for leave application",
                          error=str(le))
            return jsonify({"Message": str(le)}), 404
            
        except Exception as e:
            Logger.error("Unexpected error applying leave",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "Failed to apply leave. Please try again."
            }), 500

    @staticmethod
    def update_status():
        """Updates the approval status of a leave request."""
        Logger.info("Update leave status request received")
        
        try:
            data = request.get_json()
            if not data:
                Logger.warning("Empty request body for leave status update")
                return jsonify({"Message": "Request body must be JSON"}), 400
                
            tran_id = data.get('LeaveTranId')
            status = data.get('LeaveStatus')
            approved_by = data.get('ApprovedBy')
            
            approver_comment = data.get('ApproverComment')
            is_billable = data.get('IsBillable', False)
            is_communicated_to_team = data.get('IsCommunicatedToTeam', False)
            is_customer_approval_required = data.get('IsCustomerApprovalRequired', False)
            have_customer_approval = data.get('havecustomerApproval')
            
            if not tran_id or not status:
                Logger.warning("Missing required fields for leave status update",
                              tran_id=tran_id,
                              status=status)
                return jsonify({"Message": "LeaveTranId and LeaveStatus are required"}), 400
                
            message, send_mail_flag = LeaveService.update_leave_status(
                tran_id, 
                status, 
                approver_comment,
                is_billable,
                is_communicated_to_team,
                is_customer_approval_required,
                approved_by,
                have_customer_approval
            )
            
            Logger.info("Leave status updated",
                       transaction_id=tran_id,
                       status=status,
                       result_message=message)
            
            if message == "Status updated successfully":
                return jsonify({
                    "Message": message, 
                    "SendMailFlag": send_mail_flag
                }), 200
            elif message == "Transaction not found":
                Logger.warning("Leave transaction not found for update",
                              transaction_id=tran_id)
                return jsonify({"Message": message}), 404
            else:
                return jsonify({"Message": message}), 200  # e.g. "Leave Already Approved"
                
        except ValueError as ve:
            Logger.warning("Validation error updating leave status",
                          error=str(ve))
            return jsonify({"Message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error updating leave status",
                        transaction_id=tran_id if data else None,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while updating leave status. Please try again."
            }), 500

    @staticmethod
    def get_holidays():
        """Returns the list of upcoming holidays."""
        Logger.info("Get holidays request received")
        
        try:
            holidays = LeaveService.get_holidays()
            
            Logger.info("Holidays retrieved successfully", count=len(holidays))
            
            return jsonify([{
                "holiday_date": h.holiday_date,
                "holiday_name": h.holiday_name
            } for h in holidays]), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching holidays",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while fetching holidays. Please try again."
            }), 500

    @staticmethod
    def send_leave_email_report():
        """Trigger an immediate daily leave email report."""
        from ..services.email_service import process_leave_email
        
        Logger.info("Send leave email report request received")
        
        try:
            if process_leave_email():
                Logger.info("Leave email report sent successfully")
                return jsonify({"message": "Email sent successfully"}), 200
            
            Logger.warning("Failed to send leave email report")
            return jsonify({"message": "Failed to send email"}), 500
            
        except Exception as e:
            Logger.error("Unexpected error sending leave email report",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while sending email. Please try again."
            }), 500

    @staticmethod
    def get_leave_cards():
        """Retrieves leave balance cards for an employee."""
        Logger.info("Get leave cards request received")
        
        try:
            emp_id = request.args.get('employeeId')
            if not emp_id:
                Logger.warning("Missing employeeId parameter for leave cards")
                return jsonify({"Message": "EmployeeId is required"}), 400
            
            result = LeaveService.get_employee_leave_cards(emp_id)
            
            Logger.info("Leave cards retrieved successfully",
                       employee_id=emp_id,
                       card_count=len(result))
            
            return jsonify(result), 200
            
        except LookupError as le:
            Logger.warning("Employee not found for leave cards",
                          employee_id=emp_id,
                          error=str(le))
            return jsonify({"Message": "Employee not found"}), 404
            
        except Exception as e:
            Logger.error("Unexpected error fetching leave cards",
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while fetching leave cards. Please try again."
            }), 500
