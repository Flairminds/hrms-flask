"""
Attendance processor controller for monthly attendance report API endpoints.

This module provides HTTP request handlers for:
- Uploading and processing attendance files
- Downloading processed Excel reports
- Querying employee attendance details
"""

import pandas as pd
from datetime import datetime
from typing import Tuple
from io import BytesIO
from flask import jsonify, request, send_file, Response

from ..services.attendance_processor_service import AttendanceProcessorService
from ..utils.logger import Logger


class AttendanceProcessorController:
    """
    Controller for attendance processing API endpoints.
    
    Provides REST API endpoints for:
    - Processing monthly attendance with multiple file uploads
    - Downloading processed Excel reports
    - Retrieving employee-specific attendance details
    
    All endpoints return JSON responses with appropriate HTTP status codes.
    All operations are logged using centralized Logger.
    
    Example Routes:
        POST /api/attendance/process - Process attendance files
        GET /api/attendance/employee/<emp_id> - Get employee details
    
    Note:
        All methods are static and designed to be registered as Flask route handlers.
        File uploads use multipart/form-data encoding.
        Error responses hide internal details from users for security.
    """

    @staticmethod
    def process_attendance() -> Tuple[Response, int]:
        """
        Processes attendance files and generates Excel report.
        
        Request (multipart/form-data):
            - monthly_file: Monthly attendance base file (CSV/Excel) (required)
            - door_attendance_file: Door entry/exit logs (Excel) (required)
            - names_mapping_file: Name mapping file (Excel) (required)
            - zymmer_log_file: Activity logs (CSV/Excel) (optional)
            - report_date: Report end date (YYYY-MM-DD format) (required)
            - holidays: Comma-separated holiday dates (DD-MM-YYYY) (optional)
        
        Returns:
            Success (200): Returns downloadable Excel file
            Error (400): Missing/invalid files or parameters
            Error (500): Server error
       
        Example:
            >>> # POST /api/attendance/process
            >>> # Form data:
            >>> #   monthly_file: <file>
            >>> #   door_attendance_file: <file>
            >>> #   names_mapping_file: <file>
            >>> #   report_date: 2024-01-31
            >>> #   holidays: 01-01-2024,26-01-2024
        """
        Logger.info("Process attendance request received")
        
        try:
            # Validate and extract files
            monthly_file = request.files.get('monthly_file')
            door_attendance_file = request.files.get('door_attendance_file')
            names_mapping_file = request.files.get('names_mapping_file')
            zymmer_log_file = request.files.get('zymmer_log_file')  # Optional
            
            # Validate required files
            missing_files = []
            if not monthly_file:
                missing_files.append('monthly_file')
            if not door_attendance_file:
                missing_files.append('door_attendance_file')
            if not names_mapping_file:
                missing_files.append('names_mapping_file')
            
            if missing_files:
                Logger.warning("Process attendance missing required files", missing_files=missing_files)
                return jsonify({
                    "error": f"Missing required files: {', '.join(missing_files)}"
                }), 400
            
            # Get form parameters
            report_date_str = request.form.get('report_date')
            holidays_str = request.form.get('holidays', '')
            
            if not report_date_str:
                Logger.warning("Process attendance missing report_date parameter")
                return jsonify({"error": "report_date is required (format: YYYY-MM-DD)"}), 400
            
            # Parse date
            try:
                report_date = datetime.strptime(report_date_str, '%Y-%m-%d')
            except ValueError:
                Logger.warning("Invalid report_date format", report_date=report_date_str)
                return jsonify({"error": "Invalid report_date format. Use YYYY-MM-DD"}), 400
            
            # Parse holidays
            holidays = [h.strip() for h in holidays_str.split(',') if h.strip()]
            
            Logger.debug("Processing attendance files", 
                        report_date=report_date_str,
                        holidays_count=len(holidays))
            
            # Load files into DataFrames
            monthly_df = AttendanceProcessorController._load_file(monthly_file, 'monthly_file')
            door_df = AttendanceProcessorController._load_excel_with_sheet(
                door_attendance_file, 
                'Exceptional', 
                'door_attendance_file'
            )
            names_df = AttendanceProcessorController._load_excel_with_sheet(
                names_mapping_file, 
                'Sheet1', 
                'names_mapping_file'
            )
            
            zymmer_df = None
            if zymmer_log_file:
                zymmer_df = AttendanceProcessorController._load_file(zymmer_log_file, 'zymmer_log_file')
            
            # Process attendance
            Logger.info("Starting attendance processing")
            processed_data = AttendanceProcessorService.process_attendance_files(
                monthly_file=monthly_df,
                door_attendance_file=door_df,
                names_mapping_file=names_df,
                zymmer_log_file=zymmer_df,
                report_date=report_date,
                holidays=holidays
            )
            
            # Export to Excel
            excel_bytes = AttendanceProcessorService.export_to_excel(processed_data)
            
            Logger.info("Attendance processing completed successfully", 
                       total_employees=len(processed_data) - 1)
            
            # Return as downloadable file
            return send_file(
                BytesIO(excel_bytes),
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f'processed_attendance_{report_date_str}.xlsx'
            )
            
        except ValueError as ve:
            Logger.warning("Validation error processing attendance", error=str(ve))
            return jsonify({"error": str(ve)}), 400
            
        except KeyError as ke:
            Logger.warning("Missing required column in file", error=str(ke))
            return jsonify({
                "error": f"Missing required column in uploaded file: {str(ke)}"
            }), 400
            
        except Exception as e:
            Logger.error("Unexpected error processing attendance", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while processing attendance files. Please try again."
            }), 500

    @staticmethod
    def get_employee_details(emp_id: str) -> Tuple[Response, int]:
        """
        Gets detailed attendance information for specific employee.
       
        Query Parameters:
            - selected_date: Date to query (YYYY-MM-DD format) (required)
            - processed_data_id: Session ID for processed data (required)
        
        Args:
            emp_id: Employee ID from URL
        
        Returns:
            Success (200): Employee attendance details
            Error (400): Missing/invalid parameters
            Error (404): Employee not found
            Error (500): Server error
        
        Example:
            >>> # GET /api/attendance/employee/EMP001?selected_date=2024-01-15&processed_data_id=xyz
        
        Note:
            Requires processed data to be stored (session/cache/database).
            This implementation assumes data is passed or stored separately.
        """
        Logger.info("Get employee details request received", employee_id=emp_id)
        
        try:
            # Get query parameters
            selected_date_str = request.args.get('selected_date')
            
            if not selected_date_str:
                Logger.warning("Get employee details missing selected_date", employee_id=emp_id)
                return jsonify({"error": "selected_date is required (format: YYYY-MM-DD)"}), 400
            
            # Parse date
            try:
                selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d')
            except ValueError:
                Logger.warning("Invalid selected_date format", 
                              employee_id=emp_id,
                              selected_date=selected_date_str)
                return jsonify({"error": "Invalid selected_date format. Use YYYY-MM-DD"}), 400
            
            # TODO: Retrieve processed_data from session/cache/database
            # For now, return error indicating data needs to be stored
            Logger.warning("Processed data retrieval not yet implemented")
            return jsonify({
                "error": "This endpoint requires processed data storage implementation. " +
                         "Please use the process endpoint first and implement data persistence."
            }), 501  # Not Implemented
            
            # When implemented, use:
            # processed_data = get_processed_data_from_storage(processed_data_id)
            # details = AttendanceProcessorService.get_employee_details(
            #     processed_data, emp_id, selected_date
            # )
            # return jsonify(details), 200
            
        except ValueError as ve:
            Logger.warning("Employee details validation error", 
                          employee_id=emp_id,
                          error=str(ve))
            if "not found" in str(ve).lower():
                return jsonify({"error": str(ve)}), 404
            else:
                return jsonify({"error": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error getting employee details", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while retrieving employee details. Please try again."
            }), 500

    @staticmethod
    def _load_file(file_storage, file_name: str) -> pd.DataFrame:
        """
        Loads CSV or Excel file into DataFrame.
        
        Args:
            file_storage: Flask FileStorage object
            file_name: File identifier for logging
        
        Returns:
            Loaded DataFrame
        
        Raises:
            ValueError: If unsupported file format
        """
        Logger.debug(f"Loading file: {file_name}", filename=file_storage.filename)
        
        file_extension = file_storage.filename.rsplit('.', 1)[1].lower()
        
        if file_extension == 'csv':
            df = pd.read_csv(file_storage)
        elif file_extension in ['xls', 'xlsx']:
            df = pd.read_excel(file_storage)
        else:
            Logger.error(f"Unsupported file format for {file_name}", extension=file_extension)
            raise ValueError(f"Unsupported file format for {file_name}. Use CSV or Excel.")
        
        Logger.debug(f"File loaded successfully: {file_name}", 
                    rows=len(df),
                    columns=len(df.columns))
        return df

    @staticmethod
    def _load_excel_with_sheet(file_storage, sheet_name: str, file_name: str) -> pd.DataFrame:
        """
        Loads specific sheet from Excel file.
        
        Args:
            file_storage: Flask FileStorage object
            sheet_name: Sheet name to load
            file_name: File identifier for logging
        
        Returns:
            Loaded DataFrame
        
        Raises:
            ValueError: If sheet not found or file not Excel
        """
        Logger.debug(f"Loading Excel sheet from {file_name}", 
                    filename=file_storage.filename,
                    sheet=sheet_name)
        
        file_extension = file_storage.filename.rsplit('.', 1)[1].lower()
        
        if file_extension not in ['xls', 'xlsx']:
            Logger.error(f"File must be Excel format for {file_name}", extension=file_extension)
            raise ValueError(f"{file_name} must be an Excel file")
        
        try:
            df = pd.read_excel(file_storage, sheet_name=sheet_name)
            Logger.debug(f"Excel sheet loaded successfully: {file_name}", 
                        sheet=sheet_name,
                        rows=len(df),
                        columns=len(df.columns))
            return df
        except ValueError as e:
            Logger.error(f"Sheet not found in {file_name}", 
                        sheet=sheet_name,
                        error=str(e))
            raise ValueError(f"Sheet '{sheet_name}' not found in {file_name}")
