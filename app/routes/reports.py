from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.hr import Reports, Employee, DoorEntryNamesMapping
from ..services.hr.report_service import ReportService
from ..services.azure_blob_service import AzureBlobService
from .. import db
from ..utils.logger import Logger
from datetime import datetime


reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/', methods=['GET'])
@jwt_required()
def get_reports():
    """
    Get list of all reports, optionally filtered by report_type.
    """
    try:
        report_type = request.args.get('report_type')
        query = Reports.query
        
        if report_type:
            query = query.filter_by(report_type=report_type)
            
        # Filter out deleted reports
        query = query.filter((Reports.is_deleted == False) | (Reports.is_deleted == None))
            
        reports = query.order_by(Reports.generated_at.desc()).all()
        
        result = []
        for report in reports:
            # Fetch generated_by name
            employee = Employee.query.filter_by(employee_id=report.generated_by).first()
            generated_by_name = f"{employee.first_name} {employee.last_name}" if employee else report.generated_by
            
            result.append({
                'id': report.id,
                'report_type': report.report_type,
                'report_frequency': report.report_frequency,
                'report_for': report.report_for,
                'generated_by': report.generated_by,
                'generated_by_name': generated_by_name,
                'generated_at': report.generated_at,
                'has_file': bool(report.blob_link)
            })
            
        return jsonify({'success': True, 'data': result, 'message': 'Reports fetched successfully'}), 200
    except Exception as e:
        Logger.error("Error fetching reports list", error=str(e))
        return jsonify({'success': False, 'message': "Failed to fetch reports", 'error': str(e)}), 500

@reports_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_report():
    """
    Generate a new report.
    Body: { "month": MM, "year": YYYY, "report_type": "Monthly Leave Report" }
    """
    try:
        data = request.get_json()
        month = data.get('month')
        year = data.get('year')
        report_type = data.get('report_type', 'Monthly Leave Report') # Default for backward compatibility
        
        if not month or not year:
            return jsonify({'success': False, 'message': "Month and Year are required"}), 400
            
        current_user_id = get_jwt_identity()
        
        report = None
        if report_type == 'Monthly Leave Report':
            report = ReportService.generate_monthly_leave_report(
                month=int(month), 
                year=int(year), 
                user_id=current_user_id
            )
        else:
            # Placeholder for other report types
             return jsonify({'success': False, 'message': f"Report type '{report_type}' is not yet supported"}), 400
        
        return jsonify({'success': True, 'data': report, 'message': 'Report generated successfully'}), 200
    except Exception as e:
        Logger.error("Error generating report", error=str(e))
        return jsonify({'success': False, 'message': "Failed to generate report", 'error': str(e)}), 500

@reports_bp.route('/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report_detail(report_id):
    """
    Get detailed report data and download link.
    """
    try:
        report = Reports.query.get(report_id)
        if not report:
            return jsonify({'success': False, 'message': "Report not found"}), 404
            
        # Generate SAS URL if blob_link exists
        download_url = None
        if report.blob_link:
            try:
                # Extract blob name from URL or store blob name instead of URL?
                # The service stores the full URL. We need to extract the blob path relative to container.
                # URL format: https://<account>.blob.core.windows.net/<container>/<path>
                
                from urllib.parse import urlparse
                parsed_url = urlparse(report.blob_link)
                path_parts = parsed_url.path.lstrip('/').split('/', 1)
                # path_parts[0] is container, path_parts[1] is blob_name
                if len(path_parts) > 1:
                    blob_name = path_parts[1]
                    download_url = AzureBlobService.generate_sas_url(blob_name=blob_name)
                else:
                    download_url = report.blob_link # Fallback
            except Exception as e:
                Logger.error("Error generating SAS url", error=str(e))
                download_url = report.blob_link
            
        # Ensure download_url is valid string
        if not download_url:
            download_url = ""
        else:
            download_url = str(download_url)
        
        data = {
            'id': report.id,
            'report_type': report.report_type,
            'generated_by': report.generated_by,
            'generated_at': report.generated_at.isoformat(),
            'data': report.data,
            'blob_link': report.blob_link,
            'download_url': download_url,
            'reference_reports': report.reference_reports
        }
        
        return jsonify({'success': True, 'data': data, 'message': 'Report details fetched successfully'}), 200
    except Exception as e:
        Logger.error("Error fetching report details", error=str(e))
        return jsonify({'success': False, 'message': "Failed to fetch report details", 'error': str(e)}), 500

@reports_bp.route('/<int:report_id>/archive', methods=['PATCH'])
@jwt_required()
def archive_report(report_id):
    """
    Soft delete a report by setting is_deleted=True.
    """
    try:
        report = Reports.query.get(report_id)
        if not report:
            return jsonify({'success': False, 'message': "Report not found"}), 404
            
        report.is_deleted = True
        db.session.commit()
        
        return jsonify({'success': True, 'message': "Report archived successfully"}), 200
    except Exception as e:
        Logger.error("Error archiving report", error=str(e))
        return jsonify({'success': False, 'message': "Failed to archive report", 'error': str(e)}), 500

@reports_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_report():
    """
    Upload and process a report file (e.g., Door Entry Report).
    Form Data: file, month, year, report_type
    """
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': "No file part"}), 400
            
        file = request.files['file']
        month = request.form.get('month')
        year = request.form.get('year')
        report_type = request.form.get('report_type', 'Monthly Door Entry Report')
        
        if file.filename == '':
            return jsonify({'success': False, 'message': "No selected file"}), 400
            
        if not month or not year:
            return jsonify({'success': False, 'message': "Month and Year are required"}), 400

        current_user_id = get_jwt_identity()

        if report_type == 'Monthly Door Entry Report':
            result = ReportService.process_door_entry_report(
                file=file,
                month=int(month),
                year=int(year),
                user_id=current_user_id
            )
            return jsonify({'success': True, 'data': result, 'message': 'Report uploaded and processed successfully'}), 200
        else:
             return jsonify({'success': False, 'message': f"Upload not supported for report type '{report_type}'"}), 400
             
    except Exception as e:
        Logger.error("Error uploading report", error=str(e))
        return jsonify({'success': False, 'message': "Failed to upload report", 'error': str(e)}), 500

@reports_bp.route('/door-entry-stats', methods=['GET'])
@jwt_required()
def get_door_entry_stats():
    """
    Get statistics for door entry mapping vs active employees.
    """
    try:
        # Get all active employees (LWD is None or >= Today) joined with mappings
        # Left Outer Join to get even unmapped employees, but we can filter later or use Python logic if easier
        # Given we want stats, let's query all active employees and join
        
        results = db.session.query(Employee, DoorEntryNamesMapping)\
            .outerjoin(DoorEntryNamesMapping, Employee.employee_id == DoorEntryNamesMapping.employee_id)\
            .filter(Employee.employment_status.notin_(['Relieved', 'Absconding']))\
            .all()
        
        mapped_employees = []
        unmapped_employees = []
        
        for emp, mapping in results:
            emp_data = {
                'employee_id': emp.employee_id,
                'name': f"{emp.first_name} {emp.last_name}",
                'email': emp.email,
            }
            
            if mapping:
                emp_data['door_system_name'] = mapping.door_system_name
                emp_data['door_system_id'] = mapping.door_system_id
                mapped_employees.append(emp_data)
            else:
                unmapped_employees.append(emp_data)
                
        stats = {
            'total_active': len(results),
            'mapped_count': len(mapped_employees),
            'unmapped_count': len(unmapped_employees),
            'mapped_employees': mapped_employees,
            'unmapped_employees': unmapped_employees
        }

        return jsonify({'success': True, 'data': stats, 'message': 'Stats fetched successfully'}), 200
    except Exception as e:
        Logger.error("Error fetching door entry stats", error=str(e))
        return jsonify({'success': False, 'message': "Failed to fetch stats", 'error': str(e)}), 500

@reports_bp.route('/door-entry-mapping', methods=['POST'])
@jwt_required()
def save_door_entry_mapping():
    """
    Create or update a door entry mapping for an employee.
    Body: { "employee_id": "...", "door_system_name": "...", "door_system_id": "..." }
    """
    try:
        data = request.get_json()
        employee_id = data.get('employee_id')
        door_system_name = data.get('door_system_name')
        door_system_id = data.get('door_system_id')
        
        if not employee_id:
            return jsonify({'success': False, 'message': "Employee ID is required"}), 400
            
        mapping = DoorEntryNamesMapping.query.filter_by(employee_id=employee_id).first()
        
        if mapping:
            # Update existing
            mapping.door_system_name = door_system_name
            mapping.door_system_id = door_system_id
            message = "Mapping updated successfully"
        else:
            # Create new
            mapping = DoorEntryNamesMapping(
                employee_id=employee_id,
                door_system_name=door_system_name,
                door_system_id=door_system_id
            )
            db.session.add(mapping)
            message = "Mapping created successfully"
            
        db.session.commit()
        return jsonify({'success': True, 'message': message}), 200
        
    except Exception as e:
        Logger.error("Error saving door entry mapping", error=str(e))
        db.session.rollback()
        return jsonify({'success': False, 'message': "Failed to save mapping", 'error': str(e)}), 500

@reports_bp.route('/door-entry-mapping/<employee_id>', methods=['DELETE'])
@jwt_required()
def delete_door_entry_mapping(employee_id):
    """
    Delete a door entry mapping for an employee.
    """
    try:
        mapping = DoorEntryNamesMapping.query.filter_by(employee_id=employee_id).first()
        
        if not mapping:
            return jsonify({'success': False, 'message': "Mapping not found"}), 404
            
        db.session.delete(mapping)
        db.session.commit()
        
        return jsonify({'success': True, 'message': "Mapping deleted successfully"}), 200
        
    except Exception as e:
        Logger.error("Error deleting door entry mapping", error=str(e))
        db.session.rollback()
        return jsonify({'success': False, 'message': "Failed to delete mapping", 'error': str(e)}), 500
