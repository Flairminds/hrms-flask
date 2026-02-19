from typing import List, Dict, Any
from datetime import datetime, timedelta
import pytz
from calendar import monthrange
from sqlalchemy import and_, or_
from ... import db
from ...utils.logger import Logger
from ...utils.constants import LeaveTypeName, LeaveStatus
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
            
            # --- DB CALL 1: Get all active employees ---
            employees_query = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.last_name,
                Employee.team_lead_id
            ).filter(
                Employee.employment_status.in_(['Intern', 'Probation', 'Confirmed', 'Active', 'Resigned'])
            ).all()

            # Collect all unique team_lead_ids to fetch in one shot
            team_lead_ids = {emp.team_lead_id for emp in employees_query if emp.team_lead_id}
            employee_ids = [emp.employee_id for emp in employees_query]

            # --- DB CALL 2: Fetch all team leads in one query ---
            team_leads_map = {}  # { employee_id -> "First Last" }
            if team_lead_ids:
                team_leads = db.session.query(
                    Employee.employee_id,
                    Employee.first_name,
                    Employee.last_name
                ).filter(Employee.employee_id.in_(team_lead_ids)).all()
                team_leads_map = {
                    tl.employee_id: f"{tl.first_name or ''} {tl.last_name or ''}".strip()
                    for tl in team_leads
                }

            # --- DB CALL 3: Fetch all leave transactions for all employees in one query ---
            all_leave_transactions = db.session.query(
                LeaveTransaction.employee_id,
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
                    LeaveTransaction.employee_id.in_(employee_ids),
                    LeaveTransaction.applied_by.isnot(None),
                    LeaveTransaction.from_date <= end_date,
                    LeaveTransaction.to_date >= start_date
                )
            ).all()

            # Group leave transactions by employee_id for O(1) lookup
            leaves_by_employee = {}
            for leave in all_leave_transactions:
                leaves_by_employee.setdefault(leave.employee_id, []).append(leave)

            # Build report data structure (no more DB calls inside the loop)
            report_data = []
            
            for emp in employees_query:
                team_lead_name = team_leads_map.get(emp.team_lead_id, "")
                
                # Get pre-fetched leave transactions for this employee
                leave_transactions = leaves_by_employee.get(emp.employee_id, [])
                
                # Create a mapping of date to leave info
                leave_by_date = {}
                for leave in leave_transactions:
                    leave_start = max(leave.from_date.date() if isinstance(leave.from_date, datetime) else leave.from_date, start_date.date())
                    leave_end = min(leave.to_date.date() if isinstance(leave.to_date, datetime) else leave.to_date, end_date.date())
                    
                    current_date = leave_start
                    while current_date <= leave_end:
                        leave_by_date[current_date] = {
                            'leave_type': leave.leave_name,
                            'application_date': leave.application_date.strftime('%d-%m-%Y') if leave.application_date else '',
                            'leave_status': leave.leave_status,
                            'duration': leave.duration,
                            'approved_date': leave.approved_date.strftime('%d-%m-%Y') if leave.approved_date else '',
                            'approved_same_date': 'Yes' if leave.approved_date and leave.application_date and leave.approved_date.date() == leave.application_date.date() else 'No',
                            'unpaid_status': 'Unpaid' if leave.leave_name == LeaveTypeName.UNPAID_LEAVE else 'Paid'
                        }
                        current_date += timedelta(days=1)
                
                # Add rows for each day of the month
                current_date = start_date
                for day in range(1, num_days + 1):
                    daily_row = {
                        'Employee ID': emp.employee_id,
                        'Employee Name': f"{emp.first_name or ''} {emp.last_name or ''}".strip(),
                        'Leave Approver': team_lead_name,
                    }
                    
                    date_str = current_date.strftime('%d-%m-%Y')
                    weekday = current_date.strftime('%A')
                    
                    daily_row['Date'] = date_str
                    daily_row['Entry Exempt'] = 'entry time allowed' if weekday not in ['Saturday', 'Sunday'] else ''
                    
                    leave_info = leave_by_date.get(current_date.date())
                    
                    if leave_info:
                        daily_row['Type of Leave Approved'] = leave_info['leave_type']
                        daily_row['Date of Leave Application'] = leave_info['application_date']
                        daily_row['Leave Status'] = leave_info['leave_status']
                        daily_row['Working Day'] = 0.5 if leave_info['duration'] == 'Half Day' else 1
                        daily_row['Approval Date'] = leave_info['approved_date']
                        daily_row['Approved on same date'] = leave_info['approved_same_date']
                        daily_row['Unpaid Status'] = leave_info['unpaid_status']
                    else:
                        daily_row['Type of Leave Approved'] = ''
                        daily_row['Date of Leave Application'] = ''
                        daily_row['Leave Status'] = ''
                        daily_row['Working Day'] = ''
                        daily_row['Approval Date'] = ''
                        daily_row['Approved on same date'] = ''
                        daily_row['Unpaid Status'] = ''
                    
                    daily_row['Days Logs'] = ''
                    daily_row['Zymmr Logged Time'] = ''
                    daily_row['Entry in Time'] = ''
                    daily_row['Status'] = ''
                    daily_row['Swapped holiday date'] = ''
                    
                    current_date += timedelta(days=1)
                    report_data.append(daily_row)
            
            # Sort by Employee Name (case-insensitive)
            def get_emp_name(emp_row):
                return emp_row['Employee Name'].lower()

            report_data.sort(key=get_emp_name)
            
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
            blob_path = f"reports/monthly_reports/{filename}"
            
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
            blob_path = f"reports/door_entry_reports/{original_filename}_{timestamp}"
            
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
    @staticmethod
    def generate_attendance_report(leave_report_id: int, door_report_id: int, user_id: str, month: int = None, year: int = None) -> Dict[str, Any]:
        """
        Merges a Monthly Leave Report and a Monthly Door Entry Report to create a Monthly Attendance Report.
        Uses DoorEntryNamesMapping to link Employee IDs to Door System Names.
        """
        from ...models.hr import Reports, DoorEntryNamesMapping
        from ...utils.helper_functions import normalize_date_str
        import pandas as pd
        import io
        from ...services.azure_blob_service import AzureBlobService

        try:
            # 1. Fetch Source Reports
            leave_report = Reports.query.get(leave_report_id)
            door_report = Reports.query.get(door_report_id)

            if not leave_report or not door_report:
                raise ValueError("One or more source reports not found")
            
            if leave_report.report_type != 'Monthly Leave Report':
                raise ValueError(f"Invalid Leave Report Type: {leave_report.report_type}")
            
            if door_report.report_type != 'Monthly Door Entry Report':
                raise ValueError(f"Invalid Door Entry Report Type: {door_report.report_type}")

            # 2. Fetch employee → door name mappings
            mappings = DoorEntryNamesMapping.query.all()
            emp_to_door_map = {m.employee_id: m.door_system_name for m in mappings}

            # Index door report data by (door_system_name, normalized_date)
            door_data_map = {}
            for door_row in door_report.data:
                door_name = door_row.get('Name') or door_row.get('Person Name')
                raw_date = door_row.get('Date')
                if door_name and raw_date:
                    norm_date = normalize_date_str(raw_date)
                    if norm_date:
                        door_data_map[(str(door_name).strip(), norm_date)] = door_row

            # 3. Fetch holidays for the report month to exclude them from unpaid check

            # leave_report.report_for is like "January 2025"
            holiday_dates = set()
            try:
                from ...models.leave import Holiday
                # Parse month/year from report_for string e.g. "January 2025"
                report_month_dt = datetime.strptime(leave_report.report_for, '%B %Y')
                report_month = report_month_dt.month
                report_year = report_month_dt.year
                holidays = Holiday.query.filter(
                    db.extract('month', Holiday.holiday_date) == report_month,
                    db.extract('year', Holiday.holiday_date) == report_year
                ).all()
                for h in holidays:
                    hd = h.holiday_date
                    if isinstance(hd, datetime):
                        hd = hd.date()
                    holiday_dates.add(hd)
            except Exception as e:
                Logger.warning("Could not fetch holidays for attendance report", error=str(e))

            # 4. Process Leave Report Data row by row
            attendance_data = []
            for row in leave_report.data:
                emp_id = row.get('Employee ID') or row.get('Employee_Id')
                date_str = row.get('Date')  # DD-MM-YYYY
                leave_status = row.get('Leave Status', '')

                new_row = row.copy()

                # Determine if this date is a weekend
                is_weekend = False
                row_date = None
                if date_str:
                    try:
                        row_date = datetime.strptime(date_str, '%d-%m-%Y').date()
                        is_weekend = row_date.weekday() >= 5  # 5=Saturday, 6=Sunday
                    except ValueError:
                        pass

                is_holiday = row_date in holiday_dates if row_date else False

                # --- Priority 1: Leave is approved (Approved / Partial Approved) ---
                approved_statuses = [LeaveStatus.APPROVED]
                if leave_status in approved_statuses:
                    # Leave is covered — clear door entry fields, keep leave info
                    new_row['Entry in Time'] = ''
                    new_row['AM In'] = ''
                    new_row['AM Out'] = ''
                    new_row['PM In'] = ''
                    new_row['PM Out'] = ''
                    new_row['Remark'] = 'Approved Leave'
                    attendance_data.append(new_row)
                    continue

                # --- Priority 2: Weekend or Holiday — not a working day ---
                if is_weekend or is_holiday:
                    new_row['Entry in Time'] = ''
                    new_row['AM In'] = ''
                    new_row['AM Out'] = ''
                    new_row['PM In'] = ''
                    new_row['PM Out'] = ''
                    new_row['Remark'] = 'Holiday' if is_holiday else 'Weekend'
                    new_row['Unpaid Status'] = ''
                    attendance_data.append(new_row)
                    continue

                # --- Priority 3: Check door entry record ---
                mapped_name = emp_to_door_map.get(emp_id)
                door_entry = None
                if mapped_name and date_str:
                    norm_date = normalize_date_str(date_str)
                    if norm_date:
                        door_entry = door_data_map.get((mapped_name.strip(), norm_date))

                if door_entry:
                    # Employee has a door entry — populate time fields
                    new_row['AM In']        = door_entry.get('AM In', '')
                    new_row['AM Out']       = door_entry.get('AM Out', '')
                    new_row['PM In']        = door_entry.get('PM In', '')
                    new_row['PM Out']       = door_entry.get('PM Out', '')
                    entry_time = None
                    if door_entry.get('AM In', ''):
                        entry_time = door_entry.get('AM In', '')
                    elif door_entry.get('AM Out', ''):
                        entry_time = door_entry.get('AM Out', '')
                    elif door_entry.get('PM In', ''):
                        entry_time = door_entry.get('PM In', '')
                    elif door_entry.get('PM Out', ''):
                        entry_time = door_entry.get('Pm Out', '')
                    new_row['Entry in Time'] = entry_time
                    new_row['Remark']       = 'Door Entry'
                    new_row['Unpaid Status'] = 'Paid'  # keep existing (e.g. Unpaid Leave type)
                    attendance_data.append(new_row)
                    continue

                # --- Priority 4: No leave, not weekend/holiday, no door entry → Unpaid ---
                new_row['AM In']        = ''
                new_row['AM Out']       = ''
                new_row['PM In']        = ''
                new_row['PM Out']       = ''
                new_row['Entry in Time'] = ''
                new_row['Unpaid Status'] = 'Unpaid'
                new_row['Remark']       = 'No entry for this working day'
                attendance_data.append(new_row)

            # 5. Generate Excel File & Upload
            blob_url = ""
            try:
                # Convert to DataFrame
                df = pd.DataFrame(attendance_data)
                
                # Create Excel in memory
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df.to_excel(writer, index=False, sheet_name='Attendance Report')
                
                excel_content = output.getvalue()
                
                # Upload to Azure Blob Storage
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                # Use year/month from report_for if possible, or current
                # leave_report.report_for is "Month Year". 
                # Let's use current year/month for folder structure or extract from report_for
                
                filename = f"attendance_report_{timestamp}.xlsx"
                blob_path = f"reports/attendance_reports/{filename}"
                
                blob_url = AzureBlobService.upload_blob(
                    blob_name=blob_path,
                    file_data=excel_content,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
            except Exception as e:
                Logger.error("Failed to generate/upload attendance excel", error=str(e))
                # Proceed without blob_link


            # 5. Save New Report
            ist = pytz.timezone('Asia/Kolkata')
            generated_at_ist = datetime.now(ist)
            
            # Construct Report For string — use user-selected month/year if provided
            if month and year:
                from calendar import month_name
                report_for_str = f"{month_name[month]} {year}"
            else:
                report_for_str = leave_report.report_for

            new_report = Reports(
                report_type='Monthly Attendance Report',
                report_frequency='Monthly',
                report_for=report_for_str,
                generated_by=user_id,
                data=attendance_data,
                generated_at=generated_at_ist,
                blob_link=blob_url,
                reference_reports=[
                    {'id': leave_report.id, 'type': leave_report.report_type},
                    {'id': door_report.id, 'type': door_report.report_type}
                ]
            )
            
            db.session.add(new_report)
            db.session.commit()
            
            Logger.info("Attendance report generated", report_id=new_report.id)
            
            return {
                "id": new_report.id,
                "report_type": new_report.report_type,
                "report_for": new_report.report_for,
                "generated_at": new_report.generated_at,
                "blob_link": new_report.blob_link,
                "download_url": blob_url
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error generating attendance report", error=str(e))
            raise
