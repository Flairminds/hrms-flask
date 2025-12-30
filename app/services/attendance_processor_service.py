"""
Attendance processor service for monthly attendance report generation.

This module provides business logic for:
- Processing monthly attendance files
- Calculating attendance status (paid, unpaid, half-day)
- Merging door attendance data with monthly records
- Integrating Zymmer activity logs
- Generating comprehensive attendance reports
"""

import base64
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from io import BytesIO

from ..utils.logger import Logger


class AttendanceProcessorService:
    """
    Service for processing monthly attendance reports.
    
    Handles complex attendance calculations including:
    - Login/logout time processing from door attendance
    - Work hour calculations from activity logs
    - Status determination (Present, Unpaid, Half Day, Weekend, Holiday)
    - Leave approval validation
    - Late entry and early leave tracking
    
    All methods use centralized logging and proper error handling.
    
    Example Usage:
        >>> # Process attendance files
        >>> result = AttendanceProcessorService.process_attendance_files(
        ...     monthly_file=monthly_df,
        ...     door_attendance_file=door_df,
        ...     names_mapping_file=names_df,
        ...     zymmer_log_file=zymmer_df,
        ...     report_date=datetime(2024, 1, 31),
        ...     holidays=['01-01-2024', '26-01-2024']
        ... )
        >>>
        >>> # Get employee details
        >>> details = AttendanceProcessorService.get_employee_details(
        ...     processed_data=result,
        ...     employee_id='EMP001',
        ...     selected_date=datetime(2024, 1, 15)
        ... )
    
    Note:
        All date comparisons assume times in format HH:MM or HH:MM:SS.
        Holidays should be provided in DD-MM-YYYY format.
    """

    COMPARISON_TIME = pd.Timestamp('9:30:00')
    ZERO_TIME = pd.Timestamp('00:00:00')
    MINIMUM_WORK_HOURS = 8.0

    @staticmethod
    def process_attendance_files(
        monthly_file: pd.DataFrame,
        door_attendance_file: pd.DataFrame,
        names_mapping_file: pd.DataFrame,
        zymmer_log_file: Optional[pd.DataFrame],
        report_date: datetime,
        holidays: List[str]
    ) -> pd.DataFrame:
        """
        Processes attendance files and generates comprehensive report.
        
        Merges door attendance data with monthly records, calculates work hours
        from activity logs, determines attendance status, and computes metrics.
        
        Args:
            monthly_file: Monthly attendance base DataFrame
            door_attendance_file: Door entry/exit logs DataFrame
            names_mapping_file: Employee name mapping (Zymmer to Attendance system)
            zymmer_log_file: Activity time logs (optional)
            report_date: Report end date (determines which days to process)
            holidays: List of holiday dates in DD-MM-YYYY format
        
        Returns:
            Processed attendance DataFrame with calculated metrics
        
        Raises:
            ValueError: If required columns missing or data validation fails
            KeyError: If expected columns not found in input files
        
        Example:
            >>> processed = AttendanceProcessorService.process_attendance_files(
            ...     monthly_file=monthly_df,
            ...     door_attendance_file=door_df,
            ...     names_mapping_file=names_df,
            ...     zymmer_log_file=None,
            ...     report_date=datetime(2024, 1, 31),
            ...     holidays=['01-01-2024', '26-01-2024']
            ... )
        
        Note:
            - Processes up to report_date.day days
            - Automatically detects weekends (Saturday/Sunday)
            - Validates leave approvals against application dates
            - Calculates average employee presence
        """
        Logger.info("Starting attendance file processing", report_date=report_date.strftime('%Y-%m-%d'))
        
        try:
            days_to_process = report_date.day
            monthly_in = monthly_file.copy()
            
            # Process door attendance data
            Logger.debug("Processing door attendance data")
            login_time = AttendanceProcessorService._process_door_attendance(
                door_attendance_file,
                names_mapping_file
            )
            
            # Add output time columns
            Logger.debug("Adding output time columns", days=days_to_process)
            for day in range(1, days_to_process + 1):
                if f'Dayslogs{day}' in monthly_in.columns:
                    column_index = monthly_in.columns.get_loc(f'Dayslogs{day}') + 1
                    monthly_in.insert(column_index, f'Dayslogs_OutTime{day}', "")
                    column_index2 = monthly_in.columns.get_loc(f'Dayslogs{day}') + 2
                    monthly_in.insert(column_index2, f'In_Out_Difference{day}', "")
                    column_index3 = monthly_in.columns.get_loc(f'Dayslogs{day}') + 3
                    monthly_in.insert(column_index3, f'Approve_Date_Diff{day}', "")
            
            # Merge door attendance times
            Logger.debug("Merging door attendance times")
            monthly_in = AttendanceProcessorService._merge_door_times(
                monthly_in,
                login_time,
                days_to_process
            )
            
            # Calculate time differences
            Logger.debug("Calculating in-out time differences")
            monthly_in = AttendanceProcessorService._calculate_time_differences(
                monthly_in,
                days_to_process
            )
            
            # Process Zymmer activity logs if provided
            if zymmer_log_file is not None:
                Logger.debug("Processing Zymmer activity logs")
                monthly_in = AttendanceProcessorService._process_zymmer_logs(
                    monthly_in,
                    zymmer_log_file,
                    days_to_process
                )
            
            # Calculate attendance statuses
            Logger.debug("Calculating attendance statuses", holidays_count=len(holidays))
            monthly_in = AttendanceProcessorService._calculate_statuses(
                monthly_in,
                days_to_process,
                holidays
            )
            
            # Calculate summary metrics
            Logger.debug("Calculating summary metrics")
            monthly_in = AttendanceProcessorService._calculate_summary_metrics(
                monthly_in,
                days_to_process
            )
            
            # Add average presence row
            monthly_in = AttendanceProcessorService._add_summary_row(
                monthly_in,
                days_to_process
            )
            
            Logger.info("Attendance processing completed successfully", 
                       total_employees=len(monthly_in) - 1,  # Exclude summary row
                       days_processed=days_to_process)
            
            return monthly_in
            
        except KeyError as e:
            Logger.error("Missing required column in input data", error=str(e))
            raise ValueError(f"Missing required column: {str(e)}")
        except Exception as e:
            Logger.critical("Unexpected error processing attendance files", 
                           error=str(e),
                           error_type=type(e).__name__)
            raise

    @staticmethod
    def _process_door_attendance(
        door_file: pd.DataFrame,
        names_mapping: pd.DataFrame
    ) -> pd.DataFrame:
        """Processes door attendance file and merges with name mapping."""
        login_time = door_file.copy()
        login_time.columns = login_time.iloc[1]
        login_time = login_time[3:]
        login_time.reset_index(drop=True, inplace=True)
        
        # Merge with name mapping
        login_time = pd.merge(
            login_time,
            names_mapping[['Zymmer_name', 'Attendances_name']],
            left_on='Name',
            right_on='Zymmer_name',
            how='left'
        )
        login_time.drop('Zymmer_name', axis=1, inplace=True)
        
        # Rename columns
        login_time.columns = [
            'No.', 'Name', 'Department', 'Date', 'AM', 'CM', 'PM',
            'Out_Time', 'Late in (mm)', 'Early Leave (mm)', 'Total (mm)',
            'Remark', 'Attendances_name'
        ]
        
        Logger.debug("Door attendance processed", records=len(login_time))
        return login_time

    @staticmethod
    def _merge_door_times(
        monthly_in: pd.DataFrame,
        login_time: pd.DataFrame,
        days: int
    ) -> pd.DataFrame:
        """Merges door entry/exit times into monthly attendance."""
        for index, row in login_time.iterrows():
            emp_name = row['Attendances_name']
            date = row['Date']
            in_time = row['AM']
            out_time2 = row['CM']
            out_time3 = row['PM']
            out_time4 = row['Out_Time']
            
            if not pd.isnull(date):
                date_obj = datetime.strptime(date, "%Y/%m/%d")
                day = date_obj.day
                
                if day <= days:
                    monthly_in.loc[
                        (monthly_in['Employee_Name'] == emp_name),
                        f'Dayslogs{day}'
                    ] = in_time
                    
                    # Set out time (priority: Out_Time > PM > CM)
                    if not pd.isnull(out_time4):
                        out_value = out_time4
                    elif not pd.isnull(out_time3):
                        out_value = out_time3
                    elif not pd.isnull(out_time2):
                        out_value = out_time2
                    else:
                        out_value = None
                    
                    if out_value is not None:
                        monthly_in.loc[
                            (monthly_in['Employee_Name'] == emp_name),
                            f'Dayslogs_OutTime{day}'
                        ] = out_value
        
        return monthly_in

    @staticmethod
    def _calculate_time_differences(
        monthly_in: pd.DataFrame,
        days: int
    ) -> pd.DataFrame:
        """Calculates time differences between in and out times."""
        for day in range(1, days + 1):
            monthly_in[f'Dayslogs{day}'] = pd.to_datetime(
                monthly_in[f'Dayslogs{day}'],
                format="%H:%M",
                errors='coerce'
            )
            monthly_in[f'Dayslogs_OutTime{day}'] = pd.to_datetime(
                monthly_in[f'Dayslogs_OutTime{day}'],
                format="%H:%M",
                errors='coerce'
            )
            
            monthly_in[f"In_Out_Difference{day}"] = (
                monthly_in[f'Dayslogs_OutTime{day}'] - monthly_in[f'Dayslogs{day}']
            )
            
            monthly_in[f'Dayslogs{day}'] = monthly_in[f'Dayslogs{day}'].dt.time
            monthly_in[f'Dayslogs_OutTime{day}'] = monthly_in[f'Dayslogs_OutTime{day}'].dt.time
            monthly_in[f"In_Out_Difference{day}"] = (
                monthly_in[f"In_Out_Difference{day}"]
                .astype(str)
                .str.replace('0 days ', '')
            )
            monthly_in[f'In_Out_Difference{day}'] = (
                monthly_in[f'In_Out_Difference{day}'].replace('NaT', '')
            )
        
        return monthly_in

    @staticmethod
    def _process_zymmer_logs(
        monthly_in: pd.DataFrame,
        zymmer_file: pd.DataFrame,
        days: int
    ) -> pd.DataFrame:
        """Processes Zymmer activity time logs."""
        df = zymmer_file.copy()
        selected_columns = ['Primary Assignee', 'Created On', 'Time']
        new_df = df[selected_columns]
        new_df['Created On'] = pd.to_datetime(new_df['Created On']).dt.date
        new_df2 = new_df.groupby(['Primary Assignee', 'Created On'], as_index=False).sum()
        df = new_df2.reset_index()
        
        for index, row in df.iterrows():
            emp_name = row['Primary Assignee']
            date = row['Created On']
            value = row['Time']
            day = date.day
            
            if day <= days:
                monthly_in.loc[
                    (monthly_in['Employee_Name'] == emp_name),
                    f'ZymmrLoggedTime{day}'
                ] = round((float(value) / 3600), 1)
        
        Logger.debug("Zymmer logs processed", records=len(df))
        return monthly_in

    @staticmethod
    def _calculate_statuses(
        monthly_in: pd.DataFrame,
        days: int,
        holidays: List[str]
    ) -> pd.DataFrame:
        """Calculates attendance status for each day."""
        for day in range(1, days + 1):
            if f'Status{day}' in monthly_in.columns:
                monthly_in[f'Dayslogs{day}'].fillna("00:00:00", inplace=True)
                monthly_in[f'ZymmrLoggedTime{day}'].fillna(0, inplace=True)
                
                monthly_in[f'Dayslogs{day}'] = pd.to_datetime(
                    monthly_in[f'Dayslogs{day}'],
                    format="%H:%M:%S",
                    errors='coerce'
                )
                monthly_in[f'Dayslogs{day}'] = monthly_in[f'Dayslogs{day}'].dt.time
                
                dte = pd.to_datetime(monthly_in[f'Date{day}'], format="%d-%m-%Y")
                date_string = monthly_in[f"Date{day}"].iloc[0]
                
                # Check if company holiday
                if date_string in holidays:
                    monthly_in.loc[
                        ((monthly_in[f'Dayslogs{day}'] == AttendanceProcessorService.ZERO_TIME.time()) &
                         (monthly_in[f'ZymmrLoggedTime{day}'] == 0)),
                        f'Status{day}'
                    ] = "Company Holiday"
                
                # Check if weekend
                elif dte.dt.day_name().iloc[0] in ["Sunday", "Saturday"]:
                    monthly_in.loc[
                        ((monthly_in[f'Dayslogs{day}'] == AttendanceProcessorService.ZERO_TIME.time()) &
                         (monthly_in[f'ZymmrLoggedTime{day}'] == 0)),
                        f'Status{day}'
                    ] = "Weekend"
                
                # Regular workday
                else:
                    if f'ZymmrLoggedTime{day-1}' != "ZymmrLoggedTime0":
                        dte2 = pd.to_datetime(monthly_in[f'Date{day-1}'], format="%d-%m-%Y")
                        date_string2 = monthly_in[f"Date{day-1}"].iloc[0]
                        
                        if (dte2.dt.day_name().iloc[0] == "Sunday") or (date_string2 in holidays):
                            monthly_in.loc[
                                (pd.isnull(monthly_in[f'EntryExempt{day}'])) &
                                (monthly_in[f'Leavestatus{day}'] != "Approve") &
                                (monthly_in[f'Dayslogs{day}'] > AttendanceProcessorService.COMPARISON_TIME.time()),
                                f'Status{day}'
                            ] = "Half Day"
                        else:
                            monthly_in.loc[
                                (pd.isnull(monthly_in[f'EntryExempt{day}'])) &
                                (monthly_in[f'Dayslogs{day}'] > AttendanceProcessorService.COMPARISON_TIME.time()) &
                                ((monthly_in[f'Typeofleaveapproved{day-1}'] != "Working Late Today") &
                                 (monthly_in[f'ZymmrLoggedTime{day-1}'] < AttendanceProcessorService.MINIMUM_WORK_HOURS)),
                                f'Status{day}'
                            ] = "Half Day"
                        
                        monthly_in.loc[
                            (monthly_in[f'Leavestatus{day}'] != "Approve") &
                            (monthly_in[f'Dayslogs{day}'] == AttendanceProcessorService.ZERO_TIME.time()),
                            f'Status{day}'
                        ] = "Unpaid"
                    else:
                        monthly_in.loc[
                            (monthly_in[f'Dayslogs{day}'] > AttendanceProcessorService.COMPARISON_TIME.time()) &
                            (monthly_in[f'ZymmrLoggedTime{day}'] < AttendanceProcessorService.MINIMUM_WORK_HOURS) &
                            (pd.isnull(monthly_in[f'EntryExempt{day}'])),
                            f'Status{day}'
                        ] = "Half Day"
                        
                        monthly_in.loc[
                            (monthly_in[f'Leavestatus{day}'] != "Approve") &
                            (monthly_in[f'Dayslogs{day}'] == AttendanceProcessorService.ZERO_TIME.time()),
                            f'Status{day}'
                        ] = "Unpaid"
                
                # Calculate approval date difference
                monthly_in[f'Date{day}'] = pd.to_datetime(
                    monthly_in[f'Date{day}'],
                    format="%d-%m-%Y",
                    errors='coerce'
                )
                monthly_in[f'ApprovalDate{day}'] = pd.to_datetime(
                    monthly_in[f'ApprovalDate{day}'],
                    format="%d-%m-%Y",
                    errors='coerce'
                )
                monthly_in[f'Approve_Date_Diff{day}'] = (
                    (monthly_in[f'ApprovalDate{day}'] > monthly_in[f'Date{day}']) &
                    (monthly_in[f'Typeofleaveapproved{day}'] != "Sick/Emergency Leave")
                ).astype(int)
        
        return monthly_in

    @staticmethod
    def _calculate_summary_metrics(
        monthly_in: pd.DataFrame,
        days: int
    ) -> pd.DataFrame:
        """Calculates summary metrics for each employee."""
        for index, row in monthly_in.iterrows():
            paid_cnt = 0
            unpaid_cnt = 0
            half_day_cnt = 0
            approve_date_diff_cnt = 0
            
            for day in range(1, days + 1):
                if f"Status{day}" in monthly_in.columns:
                    value = row[f"Unpaidstatus{day}"]
                    value2 = row[f'Status{day}']
                    approve_value = row.get(f'Approve_Date_Diff{day}', 0)
                    
                    if pd.isnull(value2):
                        if value == "Paid":
                            paid_cnt += 1
                    else:
                        if value2 == "Half Day":
                            half_day_cnt += 1
                        if value == "Unpaid" or value2 == "Unpaid":
                            unpaid_cnt += 1
                    
                    if approve_value == 1:
                        approve_date_diff_cnt += 1
            
            monthly_in.loc[index, 'Absence without approved leave(Full day unpaid)'] = unpaid_cnt
            monthly_in.loc[index, 'Paid_count'] = paid_cnt
            monthly_in.loc[index, 'Late entry without exemptions(Half day unpaid)'] = half_day_cnt / 2
            monthly_in.loc[index, "Approve_Date_Diff_Count"] = approve_date_diff_cnt
        
        return monthly_in

    @staticmethod
    def _add_summary_row(
        monthly_in: pd.DataFrame,
        days: int
    ) -> pd.DataFrame:
        """Adds summary row with average employee presence."""
        daylogs_cols_list = [f"Dayslogs{day}" for day in range(1, days + 1)]
        final_row = {}
        
        for column in monthly_in.columns:
            if column in daylogs_cols_list:
                final_row[column] = len(
                    monthly_in[monthly_in[column] > AttendanceProcessorService.ZERO_TIME.time()]
                )
            elif column == "Employee_Id":
                final_row[column] = "Count of Emp Present"
            else:
                final_row[column] = ''
        
        final_row_df = pd.DataFrame.from_dict([final_row])
        average_value = round(final_row_df[daylogs_cols_list].iloc[0].mean())
        final_row_df['Average Emp present in Month'] = average_value
        monthly_in['Average Emp present in Month'] = ''
        monthly_in = pd.concat([monthly_in, final_row_df])
        monthly_in.fillna("", inplace=True)
        
        Logger.debug("Summary row added", average_presence=average_value)
        return monthly_in

    @staticmethod
    def get_employee_details(
        processed_data: pd.DataFrame,
        employee_id: str,
        selected_date: datetime
    ) -> Dict[str, Any]:
        """
        Retrieves detailed attendance information for specific employee.
        
        Args:
            processed_data: Processed attendance DataFrame
            employee_id: Employee ID to query
            selected_date: Date to get details for
        
        Returns:
            Dictionary containing employee details and attendance status
        
        Raises:
            ValueError: If employee not found or invalid date
        """
        if not employee_id or not employee_id.strip():
            raise ValueError("Employee ID is required")
        
        Logger.info("Getting employee details", employee_id=employee_id, date=selected_date.strftime('%Y-%m-%d'))
        
        try:
            filtered_data = processed_data[processed_data['Employee_Id'] == employee_id]
            
            if filtered_data.empty:
                Logger.warning("Employee not found", employee_id=employee_id)
                raise ValueError(f"Employee {employee_id} not found")
            
            day = selected_date.day
            
            # Collect status dates
            dates_unpaid = []
            dates_paid = []
            dates_half = []
            
            for index, row in filtered_data.iterrows():
                for day_value in range(1, 32):
                    if f"Status{day_value}" in processed_data.columns:
                        value = row[f"Unpaidstatus{day_value}"]
                        value2 = row[f'Status{day_value}']
                        
                        if value2 == "Half Day":
                            dates_half.append(row[f'Date{day_value}'])
                        if value == "Paid":
                            dates_paid.append(row[f'Date{day_value}'])
                        if value == "Unpaid" or value2 == "Unpaid":
                            dates_unpaid.append(row[f'Date{day_value}'])
            
            # Build result
            result = {
                "employee_id": filtered_data['Employee_Id'].iloc[0],
                "employee_name": filtered_data['Employee_Name'].iloc[0],
                "team_lead": filtered_data['TeamLeadCoordinator'].iloc[0],
                "paid_count": int(filtered_data['Paid_count'].iloc[0]),
                "unpaid_count": int(filtered_data['Absence without approved leave(Full day unpaid)'].iloc[0]),
                "half_day_count": float(filtered_data['Late entry without exemptions(Half day unpaid)'].iloc[0]),
                "status_dates": {
                    "paid": [str(d) for d in dates_paid if not pd.isnull(d)],
                    "unpaid": [str(d) for d in dates_unpaid if not pd.isnull(d)],
                    "half_day": [str(d) for d in dates_half if not pd.isnull(d)]
                },
                "day_details": {}
            }
            
            # Add day-specific details
            list_of_columns = [
                'Date', 'EntryExempt', 'Dayslogs', 'Dayslogs_OutTime', 
                'In_Out_Difference', 'ZymmrLoggedTime', 'Typeofleaveapproved',
                'EntryinTime', 'DateofLeaveApplication', 'Leavestatus',
                'WorkingDay', 'ApprovalDate', 'Approvedonsamedate', 
                'Status', 'Unpaidstatus', 'Swappedholidaydate'
            ]
            
            for column in list_of_columns:
                col_name = f'{column}{day}'
                if col_name in filtered_data.columns:
                    value = filtered_data[col_name].iloc[0]
                    result["day_details"][column] = str(value) if not pd.isnull(value) else ""
            
            Logger.info("Employee details retrieved successfully", employee_id=employee_id)
            return result
            
        except Exception as e:
            Logger.error("Error retrieving employee details", 
                        employee_id=employee_id,
                        error=str(e))
            raise

    @staticmethod
    def export_to_excel(processed_data: pd.DataFrame) -> bytes:
        """
        Exports processed attendance data to Excel bytes.
        
        Args:
            processed_data: Processed attendance DataFrame
        
        Returns:
            Excel file as bytes
        """
        Logger.info("Exporting to Excel", rows=len(processed_data))
        
        try:
            towrite = BytesIO()
            processed_data.to_excel(towrite, index=False, sheet_name='Processed_Report')
            towrite.seek(0)
            excel_bytes = towrite.getvalue()
            
            Logger.info("Excel export completed successfully", size_bytes=len(excel_bytes))
            return excel_bytes
            
        except Exception as e:
            Logger.error("Error exporting to Excel", error=str(e))
            raise
