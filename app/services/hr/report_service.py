from typing import List, Dict, Any
from datetime import datetime, timedelta
import pytz
from calendar import monthrange
from sqlalchemy import and_, or_
from ... import db
from ...utils.logger import Logger
from ...models.hr import Employee
from ...models.leave import LeaveTransaction, MasterLeaveTypes


class ReportService:
    @staticmethod
    def get_monthly_report(month: int, year: int) -> List[Dict[str, Any]]:
        """
        Generates a monthly report for attendance/payroll.
        Converted from SQL stored procedure to Python implementation.
        
        Args:
            month: Month number (1-12)
            year: Year (e.g., 2026)
            
        Returns:
            List of dictionaries containing monthly report data for each employee
        """
        try:
            Logger.info("Fetching monthly report", month=month, year=year)
            
            # Convert month/year to dates
            start_date = datetime(year, month, 1)
            _, num_days = monthrange(year, month)
            end_date = datetime(year, month, num_days)
            
            # Get all active employees with their team leads
            employees_query = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.last_name,
                Employee.team_lead_id
            ).filter(
                Employee.employment_status.in_(['Intern', 'Probation', 'Confirmed', 'Active', 'Resigned'])
            ).all()
            
            # Build report data structure
            report_data = []
            
            for emp in employees_query:
                # Get team lead name if exists
                team_lead_name = ""
                if emp.team_lead_id:
                    team_lead = db.session.query(
                        Employee.first_name,
                        Employee.last_name
                    ).filter(Employee.employee_id == emp.team_lead_id).first()
                    
                    if team_lead:
                        team_lead_name = f"{team_lead.first_name or ''} {team_lead.last_name or ''}".strip()
                
                # Initialize employee row
                employee_row = {
                    'Employee_Id': emp.employee_id,
                    'Employee_Name': f"{emp.first_name or ''} {emp.last_name or ''}".strip(),
                    'TeamLeadCoordinator': team_lead_name,
                    'Date': '',
                    'EntryExempt': '',
                    'Typeofleaveapproved': '',
                    'DateofLeaveApplication': '',
                    'Leavestatus': '',
                    'WorkingDay': '',
                    'ApprovalDate': '',
                    'Approvedonsamedate': '',
                    'Unpaidstatus': ''
                }
                
                # Get leave transactions for this employee in this month
                leave_transactions = db.session.query(
                    LeaveTransaction.leave_type_id,
                    LeaveTransaction.application_date,
                    LeaveTransaction.leave_status,
                    LeaveTransaction.duration,
                    LeaveTransaction.approved_date,
                    LeaveTransaction.from_date,
                    LeaveTransaction.to_date,
                    MasterLeaveTypes.leave_name
                ).join(
                    MasterLeaveTypes,
                    LeaveTransaction.leave_type_id == MasterLeaveTypes.leave_type_id
                ).filter(
                    and_(
                        LeaveTransaction.employee_id == emp.employee_id,
                        LeaveTransaction.leave_status.notin_(['Cancel', 'Reject']),
                        LeaveTransaction.applied_by.isnot(None),
                        or_(
                            and_(
                                LeaveTransaction.from_date <= end_date,
                                LeaveTransaction.to_date >= start_date
                            )
                        )
                    )
                ).all()
                
                # Create a mapping of date to leave info
                leave_by_date = {}
                for leave in leave_transactions:
                    # Determine which days this leave covers
                    leave_start = max(leave.from_date.date() if isinstance(leave.from_date, datetime) else leave.from_date, start_date.date())
                    leave_end = min(leave.to_date.date() if isinstance(leave.to_date, datetime) else leave.to_date, end_date.date())
                    
                    current_date = leave_start
                    while current_date <= leave_end:
                        leave_by_date[current_date] = {
                            'leave_type': leave.leave_name,
                            'application_date': leave.application_date.strftime('%d-%m-%Y') if leave.application_date else '',
                            'leave_status': 'Approve' if leave.leave_status == 'Approved' else ('Pending' if leave.leave_status == 'Partial Approved' else leave.leave_status),
                            'duration': leave.duration,
                            'approved_date': leave.approved_date.strftime('%d-%m-%Y') if leave.approved_date else '',
                            'approved_same_date': 'Yes' if leave.approved_date and leave.application_date and leave.approved_date.date() == leave.application_date.date() else 'No',
                            'unpaid_status': 'Unpaid' if leave.leave_type_id in [12, 13] else 'Paid'
                        }
                        current_date += timedelta(days=1)
                
                    # Add rows for each day of the month
                    current_date = start_date
                    for day in range(1, num_days + 1):
                        # Create a copy of basic employee info for this daily row
                        daily_row = {
                            'Employee_Id': emp.employee_id,
                            'Employee_Name': f"{emp.first_name or ''} {emp.last_name or ''}".strip(),
                            'TeamLeadCoordinator': team_lead_name,
                        }
                        
                        day_str = str(day)
                        date_str = current_date.strftime('%d-%m-%Y')
                        weekday = current_date.strftime('%A')
                        
                        # Date columns
                        daily_row['Date'] = date_str
                        
                        # Entry exempt (weekday check)
                        daily_row['EntryExempt'] = 'entry time allowed' if weekday not in ['Saturday', 'Sunday'] else ''
                        
                        # Check if there's a leave for this date
                        leave_info = leave_by_date.get(current_date.date())
                        
                        if leave_info:
                            daily_row['Typeofleaveapproved'] = leave_info['leave_type']
                            daily_row['DateofLeaveApplication'] = leave_info['application_date']
                            daily_row['Leavestatus'] = leave_info['leave_status']
                            daily_row['WorkingDay'] = 0.5 if leave_info['duration'] == 'Half Day' else 1
                            daily_row['ApprovalDate'] = leave_info['approved_date']
                            daily_row['Approvedonsamedate'] = leave_info['approved_same_date']
                            daily_row['Unpaidstatus'] = leave_info['unpaid_status']
                        else:
                            daily_row['Typeofleaveapproved'] = ''
                            daily_row['DateofLeaveApplication'] = ''
                            daily_row['Leavestatus'] = ''
                            daily_row['WorkingDay'] = ''
                            daily_row['ApprovalDate'] = ''
                            daily_row['Approvedonsamedate'] = ''
                            daily_row['Unpaidstatus'] = ''
                        
                        # Placeholder columns for zy mmr data (to be populated from time tracking system)
                        daily_row['Dayslogs'] = ''
                        daily_row['ZymmrLoggedTime'] = ''
                        daily_row['EntryinTime'] = ''
                        daily_row['Status'] = ''
                        daily_row['Swappedholidaydate'] = ''
                        
                        current_date += timedelta(days=1)
                        
                        # Append this day's row to the report data
                        report_data.append(daily_row)
            
            # Sort by employee ID (numeric part)
            def get_emp_number(emp_row):
                emp_id = emp_row['Employee_Id']
                try:
                    return int(emp_id.replace('EMP', ''))
                except:
                    return 0
            
            report_data.sort(key=get_emp_number)
            
            Logger.info("Monthly report generated successfully", 
                       month=month, 
                       year=year,
                       employee_count=len(report_data))
            
            return report_data
            
        except Exception as e:
            Logger.error("Error fetching monthly report", error=str(e))
            raise

    @staticmethod
    def generate_monthly_leave_report(month: int, year: int, user_id: str, reference_reports: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generates monthly leave report, saves as CSV to Azure Blob, and creates DB record.
        
        Args:
            month: Month number
            year: Year
            user_id: ID of employee generating the report
            reference_reports: Optional list of reports used as reference
            
        Returns:
            Created Report object as dictionary
        """
        import csv
        import io
        import json
        from ...models.hr import Reports
        from ...services.azure_blob_service import AzureBlobService
        
        try:
            # 1. Fetch Report Data
            report_data = ReportService.get_monthly_report(month, year)
            
            # 2. Generate CSV
            output = io.StringIO()
            if report_data:
                keys = report_data[0].keys()
                dict_writer = csv.DictWriter(output, fieldnames=keys)
                dict_writer.writeheader()
                dict_writer.writerows(report_data)
            else:
                # Handle empty report case
                output.write("No data found for this month.")
                
            csv_content = output.getvalue().encode('utf-8')
            
            # 3. Upload to Azure Blob Storage
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"monthly_leave_report_{year}_{month:02d}_{timestamp}.csv"
            blob_path = f"reports/{year}/{month:02d}/{filename}"
            
            blob_url = ""
            try:
                # We interpret blob_link as the full URL or path. 
                # The user requirement says "blob url will be only in case when a file is uploaded"
                # So we try to upload if we have the service configured.
                blob_url = AzureBlobService.upload_blob(
                    blob_name=blob_path,
                    file_data=csv_content,
                    content_type='text/csv'
                )
            except Exception as e:
                Logger.error("Failed to upload report to Azure", error=str(e))
                pass

            # 4. Save to Database
            from datetime import date
            month_name = date(year, month, 1).strftime('%B')
            report_for_str = f"{month_name} {year}"
            
            ist = pytz.timezone('Asia/Kolkata')
            generated_at_ist = datetime.now(ist)

            new_report = Reports(
                report_type='Monthly Leave Report',
                report_frequency='Monthly',
                report_for=report_for_str,
                generated_by=user_id,
                data=report_data,  # storing JSON data directly as requested
                blob_link=blob_url,
                reference_reports=reference_reports,
                generated_at=generated_at_ist
            )
            
            db.session.add(new_report)
            db.session.commit()
            
            Logger.info("Report generated and saved", report_id=new_report.id)
            
            return {
                "id": new_report.id,
                "report_type": new_report.report_type,
                "report_frequency": new_report.report_frequency,
                "report_for": new_report.report_for,
                "generated_at": new_report.generated_at,
                "blob_link": new_report.blob_link
            }
            
        except Exception as e:
            raise

    @staticmethod
    def process_door_entry_report(file, month: int, year: int, user_id: str) -> Dict[str, Any]:
        """
        Process uploaded Door Entry Report Excel file.
        Extracts data from 'Exceptions' sheet (row 3 header) and saves both file and data.
        """
        import pandas as pd
        import io
        from datetime import date
        from ...models.hr import Reports
        from ...services.azure_blob_service import AzureBlobService

        try:
            # 1. Read Excel File
            # Read 'Exceptions' sheet, header starts at row 2 (0-indexed) -> row 3 in Excel
            # 1. Read Excel File
            # Read 'Exceptional' sheet, headers are on row 3 and 4 (0-indexed 2 and 3)
            # This handles the merged cells for AM/PM -> In/Out
            try:
                df = pd.read_excel(file, sheet_name='Exceptional', header=[2, 3])
            except ValueError:
                # Fallback
                df = pd.read_excel(file, header=[2, 3])

            # Flatten MultiIndex columns
            # Example: ('AM', 'In') -> 'AM In', ('No.', 'Unnamed: 0_level_1') -> 'No.'
            new_columns = []
            for col in df.columns:
                top, bottom = col
                # If top level is Unnamed (rare if checking row 2), ignore it. 
                # If bottom level is Unnamed (common for non-merged single columns), ignore it.
                part1 = str(top) if not str(top).startswith('Unnamed') else ''
                part2 = str(bottom) if not str(bottom).startswith('Unnamed') else ''
                new_col = f"{part1} {part2}".strip()
                new_columns.append(new_col)
            
            df.columns = new_columns
            
            # Robustly handle NaN/Inf
            # Using object type ensures None is accepted
            df = df.astype(object).where(pd.notnull(df), None)
            
            # Convert to list of dictionaries
            report_data = df.to_dict(orient='records')
            
            # 2. Upload Original File to Azure Blob
            # Reset file pointer to beginning before upload
            file.seek(0)
            file_content = file.read()
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            original_filename = file.filename if hasattr(file, 'filename') else 'door_entry_report.xlsx'
            blob_path = f"reports/door_entry/{year}/{month:02d}/{timestamp}_{original_filename}"
            
            blob_url = ""
            try:
                blob_url = AzureBlobService.upload_blob(
                    blob_path,
                    file_content,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
            except Exception as e:
                Logger.error("Failed to upload door entry report to Azure", error=str(e))
                # We continue even if upload fails, but maybe we should warn? 
                # For now, we proceed as the data is extracted.

            # 3. Save to Database
            month_name = date(year, month, 1).strftime('%B')
            report_for_str = f"{month_name} {year}"
            
            ist = pytz.timezone('Asia/Kolkata')
            generated_at_ist = datetime.now(ist)
            
            new_report = Reports(
                report_type='Monthly Door Entry Report',
                report_frequency='Monthly',
                report_for=report_for_str,
                generated_by=user_id,
                data=report_data,
                blob_link=blob_url,
                is_deleted=False,
                generated_at=generated_at_ist
            )
            
            db.session.add(new_report)
            db.session.commit()
            
            Logger.info("Door entry report processed and saved", report_id=new_report.id)
            
            return {
                "id": new_report.id,
                "report_type": new_report.report_type,
                "report_frequency": new_report.report_frequency,
                "report_for": new_report.report_for,
                "generated_at": new_report.generated_at,
                "blob_link": new_report.blob_link
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error processing door entry report", error=str(e))
            raise
