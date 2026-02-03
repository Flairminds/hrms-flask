from flask import request, jsonify, g
from ..services.leave_service import LeaveService
from ..utils.logger import Logger


class LeaveController:
    """Controller for handling leave-related requests."""

    @staticmethod
    def get_types_and_approver():
        """Retrieves leave types and the reporting manager for the employee."""
        Logger.info("Get leave types and approver request received")
        
        try:
            emp_id = g.employee_id
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
            year = request.args.get('year', type=int)
            details = LeaveService.get_leave_details(emp_id, year)
            
            Logger.info("Leave details retrieved successfully",
                       employee_id=emp_id,
                       year=year,
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
    def update_leave_status():
        """Updates the approval status of a leave request."""
        Logger.info("Update leave status request received")
        
        try:
            data = request.get_json(silent=True)
            if not data:
                Logger.warning("Invalid or empty JSON body")
                return jsonify({"Message": "Request body must be a valid JSON"}), 400
                
            Logger.info("Update leave status payload received", data=data)
            
            # Robust extraction with fallback and type safety
            raw_tran_id = data.get('leaveTranId') or data.get('LeaveTranId')
            raw_status = data.get('leaveStatus') or data.get('LeaveStatus')
            
            # Required fields validation
            if raw_tran_id is None or raw_status is None:
                Logger.warning("Missing required fields", tran_id=raw_tran_id, status=raw_status)
                return jsonify({
                    "Message": "LeaveTranId and LeaveStatus are required",
                    "Received": {"leaveTranId": raw_tran_id, "leaveStatus": raw_status}
                }), 400
                
            try:
                tran_id = int(raw_tran_id)
                status = str(raw_status)
            except (ValueError, TypeError) as e:
                Logger.warning("Type conversion failed", tran_id=raw_tran_id, error=str(e))
                return jsonify({"Message": f"Invalid data format: {str(e)}"}), 400

            approved_by = data.get('approvedById') or data.get('ApprovedBy') or data.get('approvedBy')
            approver_comment = data.get('approverComment') or data.get('ApproverComment') or ""
            
            is_billable = data.get('isBillable', False)
            is_communicated_to_team = data.get('isCommunicatedToTeam', False)
            is_customer_approval_required = data.get('isCustomerApprovalRequired', False)
            have_customer_approval = data.get('havecustomerApproval')
            
            Logger.info("Extracted parameters for update", 
                       tran_id=tran_id, 
                       status=status, 
                       approved_by=approved_by)
            
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
            
            Logger.info("Service response for status update",
                       transaction_id=tran_id,
                       status=status,
                       result_message=message)
            
            if message == "Status updated successfully":
                return jsonify({
                    "Message": message, 
                    "SendMailFlag": send_mail_flag
                }), 200
            elif message == "Transaction not found":
                return jsonify({"Message": message}), 404
            else:
                return jsonify({"Message": message}), 200  # e.g. "Leave Already Approved"
                
        except ValueError as ve:
            Logger.warning("Validation error in update_leave_status", error=str(ve))
            return jsonify({"Message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error in update_leave_status",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An internal error occurred. Please try again."
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
            emp_id = g.employee_id
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

    @staticmethod
    def get_leave_transactions_by_approver():
        """Retrieves leave transactions for a specific approver. HR/Admin can see all leaves."""
        Logger.info("Get leave transactions by approver request received")
        
        try:
            approver_id = request.args.get('approverId')
            year = request.args.get('year')
            if not year:
                from datetime import datetime
                year = datetime.now().year
            else:
                year = int(year)
            
            # Check if the current user is HR or Admin
            user_role = g.get('user_role', '')
            if user_role in ['HR', 'Admin']:
                # HR and Admin can see all leave transactions
                Logger.info("HR/Admin requesting all leave transactions", year=year)
                transactions = LeaveService.get_all_leave_transactions(year)
            else:
                # Regular approvers only see their assigned leaves
                transactions = LeaveService.get_leave_transactions_by_approver(approver_id, year)
            
            Logger.info("Leave transactions retrieved successfully",
                       approver_id=approver_id,
                       year=year,
                       count=len(transactions))
            
            return jsonify([dict(row) for row in transactions]), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching leave transactions by approver",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while fetching leave transactions. Please try again."
            }), 500

    @staticmethod
    def get_people_on_leave():
        """
        Retrieves employees on leave for the current week and next week.
        Returns a list of employee names, leave status, and dates.
        """
        Logger.info("Get people on leave request received")
        
        try:
            from datetime import datetime, timedelta
            from ..services.leave.leave_query_service import LeaveQueryService
            
            today = datetime.now().date()
            
            # Calculate start of this week (Monday)
            start_of_this_week = today - timedelta(days=today.weekday())
            
            # Calculate end of next week (Sunday of next week)
            # Days until next Sunday = (6 - weekday) + 7
            end_of_next_week = today + timedelta(days=(6 - today.weekday()) + 7)
            
            Logger.info("Fetching people on leave for range",
                       start_date=start_of_this_week,
                       end_date=end_of_next_week)
            
            people_on_leave = LeaveQueryService.get_employees_on_leave(
                start_of_this_week, 
                end_of_next_week
            )
            
            return jsonify({
                "status": "success",
                "data": people_on_leave,
                "range": {
                    "start": start_of_this_week.isoformat(),
                    "end": end_of_next_week.isoformat()
                }
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching people on leave",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching people on leave."
            }), 500
            Logger.info("Team leave transactions retrieved successfully",
                       approver_id=approver_id,
                       user_role=user_role,
                       year=year,
                       record_count=len(transactions))
            
            return jsonify(transactions), 200
            
        except ValueError as ve:
            Logger.warning("Validation error fetching team transactions",
                          approver_id=approver_id,
                          error=str(ve))
            return jsonify({"Message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error fetching team transactions",
                        approver_id=approver_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({"Message": "Failed to fetch team transactions"}), 500
            return jsonify({
                "Message": "An error occurred while fetching team transactions. Please try again."
            }), 500
