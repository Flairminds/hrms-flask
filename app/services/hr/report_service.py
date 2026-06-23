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
        Process uploaded Monthly Basic Attendance Report Excel file.

        New format (as of Jun-2026):
          - Rows 1-11: Title, date range, department info (skipped)
          - Row 12 (0-indexed 11): Top-level headers — 'No', 'Employee Code', 'Employee Name',
            date labels like '01-Jun', '02-Jun', ..., summary cols 'P', 'A', 'L', 'H', 'HP', 'WO', 'OP', 'WP'
          - Row 13 (0-indexed 12): Sub-headers — day-of-week labels ('Mon', 'Tue', ...) for date cols;
            blank/Unnamed for non-date cols
          - Row 14+: One row per employee

        Employee Code in the file matches the system employee_id directly (e.g. EMP3).
        No name mapping is required.

        Output stored (normalized, one dict per employee per date):
          { employee_id, employee_name, date (DD-MM-YYYY), status (P/A/L/WO/H/...),
            summary_P, summary_A, summary_L, summary_H, summary_HP, summary_WO, summary_OP, summary_WP }
        """
        import pandas as pd
        import re
        import io
        from datetime import date as date_cls
        from ...models.hr import Reports
        from ...services.azure_blob_service import AzureBlobService

        # Status codes present as summary column names in the file
        SUMMARY_COLS = {'P', 'A', 'L', 'H', 'HP', 'WO', 'OP', 'WP'}
        # Regex: date column header starts with 1-2 digits followed by optional separator + letters
        # e.g.  '01-Jun', '01-J', '1-J', '02-Jun'
        DATE_COL_RE = re.compile(r'^(\d{1,2})[-\s]?[A-Za-z]*$')

        try:
            # ---------------------------------------------------------------
            # 1. Read Excel — rows 12 & 13 are the two-level header
            # ---------------------------------------------------------------
            # Determine engine from file extension (.xls → xlrd, .xlsx → openpyxl)
            filename = getattr(file, 'filename', '') or ''
            engine = 'xlrd' if filename.lower().endswith('.xls') else 'openpyxl'

            try:
                df_raw = pd.read_excel(file, header=[11, 12], engine=engine)
            except Exception:
                # Fallback: try one row earlier in case the file has fewer title rows
                file.seek(0)
                df_raw = pd.read_excel(file, header=[10, 11], engine=engine)

            # ---------------------------------------------------------------
            # 2. Flatten MultiIndex columns AND track date column positions
            # ---------------------------------------------------------------
            # Problem: some date cells in row 12 are MERGED across the adjacent blank separator,
            # so two DataFrame columns get the same flattened name (e.g. two cols both '03-Jun').
            # Accessing by name then returns a Series, not a scalar.
            # Fix: track the ORIGINAL POSITION of each date column so we can use iloc later.
            #
            # Summary cols (P, A, L, H, HP, WO, WOP) are intentionally excluded from output.
            emp_code_col = 'Employee Code'
            emp_name_col = 'Employee Name'
            SKIP_COLS = {emp_code_col, emp_name_col, 'No', 'No.'}

            flat_cols = []
            date_col_info = []   # (original_position, day_number)
            seen_day_nums = set()

            for i, (top, bottom) in enumerate(df_raw.columns):
                top_s = str(top).strip()
                bottom_s = str(bottom).strip()
                top_unnamed = top_s.startswith('Unnamed') or top_s == ''
                bot_unnamed = bottom_s.startswith('Unnamed') or bottom_s == ''

                if not top_unnamed:
                    flat_name = top_s   # date cols and summary cols
                elif not bot_unnamed:
                    flat_name = bottom_s  # identity cols (Employee Code, Employee Name, No)
                else:
                    flat_name = '__drop__'

                flat_cols.append(flat_name)

                # Capture date column position (first occurrence only, ignore merged duplicates)
                if flat_name != '__drop__' and flat_name not in SUMMARY_COLS and flat_name not in SKIP_COLS:
                    m = DATE_COL_RE.match(flat_name)
                    if m:
                        try:
                            day_num = int(m.group(1))
                            if day_num not in seen_day_nums:
                                seen_day_nums.add(day_num)
                                date_col_info.append((i, day_num))
                        except ValueError:
                            pass

            df_raw.columns = flat_cols

            # ---------------------------------------------------------------
            # 3. Drop unnamed/filler columns using positional selection
            # ---------------------------------------------------------------
            keep_positions = [i for i, c in enumerate(flat_cols) if c != '__drop__']
            df_raw = df_raw.iloc[:, keep_positions]

            # Remap date column original positions → new post-drop positions
            orig_to_new = {orig: new for new, orig in enumerate(keep_positions)}
            date_cols = [
                (orig_to_new[orig_pos], day_num)
                for orig_pos, day_num in date_col_info
                if orig_pos in orig_to_new
            ]   # list of (new_iloc_position, day_number)

            # ---------------------------------------------------------------
            # 4. Keep only valid employee rows
            # ---------------------------------------------------------------
            if emp_code_col not in df_raw.columns:
                raise ValueError(
                    f"Could not find '{emp_code_col}' column. "
                    "Check that the Excel file matches the expected Monthly Basic Attendance Report format."
                )

            df_raw[emp_code_col] = df_raw[emp_code_col].astype(str).str.strip()
            df_emp = df_raw[
                df_raw[emp_code_col].notna() &
                (df_raw[emp_code_col] != '') &
                (df_raw[emp_code_col].str.lower() != 'nan') &
                (~df_raw[emp_code_col].str.match(r'^\d+$'))   # skip pure-number rows (totals etc.)
            ].copy()

            # ---------------------------------------------------------------
            # 5. Normalize: one dict per employee per date (no summary columns)
            # ---------------------------------------------------------------
            report_data = []
            for _, row in df_emp.iterrows():
                # Use .get() for identity cols — these are unique so no Series risk
                emp_id   = str(row.get(emp_code_col, '')).strip()
                emp_name = str(row.get(emp_name_col, '')).strip()
                if not emp_id or emp_id.lower() == 'nan':
                    continue

                # Use iloc for date cols to avoid duplicate-name Series issue
                for col_pos, day_num in date_cols:
                    try:
                        date_obj = datetime(year, month, day_num)
                    except ValueError:
                        continue   # day_num out of range for this month

                    raw_status = row.iloc[col_pos]
                    # Scalar check: if somehow still a Series, take first value
                    if hasattr(raw_status, 'iloc'):
                        raw_status = raw_status.iloc[0]

                    status_s = str(raw_status).strip()
                    status = '' if status_s.lower() in ('nan', 'none', '') else status_s

                    entry = {
                        'employee_id'  : emp_id,
                        'employee_name': emp_name,
                        'date'         : date_obj.strftime('%d-%m-%Y'),
                        'status'       : status,
                    }
                    report_data.append(entry)

            Logger.info(
                "Door entry report parsed",
                employee_count=df_emp.shape[0],
                total_rows=len(report_data),
                date_columns=len(date_cols)
            )

            # ---------------------------------------------------------------
            # 6. Upload original file to Azure Blob
            # ---------------------------------------------------------------
            file.seek(0)
            file_content = file.read()

            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            original_filename = getattr(file, 'filename', 'door_entry_report.xlsx')
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

            # ---------------------------------------------------------------
            # 7. Save to Database
            # ---------------------------------------------------------------
            month_name = date_cls(year, month, 1).strftime('%B')
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
                "id"              : new_report.id,
                "report_type"     : new_report.report_type,
                "report_frequency": new_report.report_frequency,
                "report_for"      : new_report.report_for,
                "generated_at"    : new_report.generated_at,
                "blob_link"       : new_report.blob_link
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error processing door entry report", error=str(e))
            raise
    @staticmethod
    def generate_attendance_report(leave_report_id: int, door_report_id: int, user_id: str, month: int = None, year: int = None) -> Dict[str, Any]:
        """
        Merges a Monthly Leave Report and a Monthly Door Entry Report to create a Monthly Attendance Report.

        New door entry format (Jun-2026+):
          Door report data rows: { employee_id, employee_name, date (DD-MM-YYYY), status (P/A/L/WO/H/…), summary_* }
          Lookup key: (employee_id, date_str)  — no name mapping required.

        Status mapping from door entry:
          P   → Present / worked (Remark: Door Entry, Unpaid Status: Paid)
          A   → Absent (Remark: No entry for this working day, Unpaid Status: Unpaid)
          WO  → Week Off (skip — already handled by weekend check)
          H   → Holiday (skip — already handled by holiday check)
          L   → Leave (defer to leave report data)
          HP  → Half-day Present (treated as present)
          OP  → Optional/Off Present (treated as present)
          WP  → Week Off Present (treated as present)
        """
        from ...models.hr import Reports
        from ...utils.helper_functions import normalize_date_str
        import pandas as pd
        import io
        from ...services.azure_blob_service import AzureBlobService

        # Statuses that count as "present / worked"
        PRESENT_STATUSES = {'P', 'HP', 'OP', 'WP'}

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

            # 2. Build door data map keyed by (employee_id, date)
            #    New format: each door_row already has employee_id and date fields
            door_data_map = {}
            for door_row in door_report.data:
                emp_id   = door_row.get('employee_id') or door_row.get('Employee Code')
                raw_date = door_row.get('date') or door_row.get('Date')
                if emp_id and raw_date:
                    norm_date = normalize_date_str(raw_date)
                    if norm_date:
                        door_data_map[(str(emp_id).strip(), norm_date)] = door_row

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
            # If report is for the current month, cap at today (IST) to avoid marking
            # future days as Unpaid.
            ist = pytz.timezone('Asia/Kolkata')
            today_ist = datetime.now(ist).date()
            report_is_current_month = (
                report_month == today_ist.month and report_year == today_ist.year
            )
            cutoff_date = today_ist if report_is_current_month else None

            attendance_data = []
            for row in leave_report.data:
                emp_id = row.get('Employee ID') or row.get('Employee_Id')
                date_str = row.get('Date')  # DD-MM-YYYY
                leave_status = row.get('Leave Status', '')

                # Skip future dates when generating a partial-month report
                if cutoff_date and date_str:
                    try:
                        row_date_check = datetime.strptime(date_str, '%d-%m-%Y').date()
                        if row_date_check > cutoff_date:
                            continue
                    except ValueError:
                        pass

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

                # --- Priority 2: Weekend or Holiday — not a working day ---
                if is_weekend or is_holiday:
                    new_row['Door Entry'] = ''
                    new_row['Remark'] = 'Holiday' if is_holiday else 'Weekend'
                    new_row['Unpaid Status'] = ''
                    attendance_data.append(new_row)
                    continue
                
                # --- Priority 1: Leave is approved ---
                approved_statuses = [LeaveStatus.APPROVED]
                if leave_status in approved_statuses:
                    new_row['Door Entry'] = ''
                    new_row['Remark'] = 'Approved Leave'
                    attendance_data.append(new_row)
                    continue

                # --- Priority 3: Check door entry record (keyed by employee_id + date) ---
                door_entry = None
                if emp_id and date_str:
                    norm_date = normalize_date_str(date_str)
                    if norm_date:
                        door_entry = door_data_map.get((str(emp_id).strip(), norm_date))

                if door_entry:
                    door_status = str(door_entry.get('status', '')).strip().upper()
                    if door_status in PRESENT_STATUSES:
                        # Employee was present — mark as worked
                        new_row['Door Entry']    = 'Yes'
                        new_row['Remark']        = 'Door Entry'
                        new_row['Unpaid Status'] = 'Paid'
                        attendance_data.append(new_row)
                        continue
                    # else: status A/L/H/WO or unknown — fall through to Priority 4

                # --- Priority 4: No leave, not weekend/holiday, no door entry → Unpaid ---
                new_row['Door Entry']    = 'No'
                new_row['Unpaid Status'] = 'Unpaid'
                new_row['Remark']        = 'No entry for this working day'
                attendance_data.append(new_row)

            # 5. Generate Excel File & Upload
            blob_url = ""
            try:
                # Convert to DataFrame
                df = pd.DataFrame(attendance_data)
                
                # Compute per-employee summary
                emp_map = {}
                for r in attendance_data:
                    emp_name = r.get('Employee Name') or 'Unknown'
                    emp_id = r.get('Employee ID') or 'Unknown'
                    if emp_id not in emp_map:
                        emp_map[emp_id] = {
                            'Employee ID': emp_id,
                            'Employee Name': emp_name,
                            'Total Days': 0,
                            'Working Days': 0,
                            'Weekends': 0,
                            'Holidays': 0,
                            'Worked Days': 0,
                            'Paid Leaves': 0,
                            'Unapproved Leaves': 0,
                            'Unpaid Leaves': 0
                        }
                    
                    s = emp_map[emp_id]
                    remark = str(r.get('Remark') or '').strip()
                    unpaid = str(r.get('Unpaid Status') or '').strip()
                    leave_status = str(r.get('Leave Status') or '').strip()
                    
                    s['Total Days'] += 1
                    if remark == 'Weekend':
                        s['Weekends'] += 1
                    elif remark == 'Holiday':
                        s['Holidays'] += 1
                    else:
                        s['Working Days'] += 1
                        if remark == 'Door Entry':
                            s['Worked Days'] += 1
                        elif remark == 'Approved Leave':
                            s['Paid Leaves'] += 1
                        elif unpaid == 'Unpaid':
                            s['Unpaid Leaves'] += 1
                            if leave_status in (LeaveStatus.PENDING, LeaveStatus.PARTIAL_APPROVED):
                                s['Unapproved Leaves'] += 1
                                
                summary_list = list(emp_map.values())
                summary_list.sort(key=lambda x: str(x['Employee Name']).lower())
                df_summary = pd.DataFrame(summary_list)

                # Create Excel in memory
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df_summary.to_excel(writer, index=False, sheet_name='Summary')
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
