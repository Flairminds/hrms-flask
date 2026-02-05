"""
Document controller module for relieving letters and employee document API endpoints.

This module provides HTTP request handlers for:
- Relieving letter generation, update, and email distribution
- Employee document upload, download, and verification
- Document status tracking and reporting
"""

from typing import Tuple
from io import BytesIO
from flask import jsonify, request, send_file, Response

from ..services.document_service import DocumentService
from ..utils.logger import Logger


class DocumentController:
    """
    Controller for relieving letter and employee document endpoints.
    
    Provides REST API endpoints for:
    - Relieving letter management (create, update, email, download)
    - Employee document upload and verification
    - Document status queries
    
    All endpoints return JSON responses with appropriate HTTP status codes.
    All operations are logged using centralized Logger.
    
    Example Routes:
        GET /api/documents/employees/relieving - List employees
        POST /api/documents/relieving - Create letter
        GET /api/documents/relieving/<id>/download - Download PDF
        POST /api/documents/upload - Upload document
        GET /api/documents/status/<emp_id> - Get status
    
    Note:
        All methods are static and designed to be registered as Flask route handlers.
        Error responses hide internal details from users for security.
    """

    # ============= RELIEVING LETTER ENDPOINTS =============

    @staticmethod
    def get_employee_details_for_relieving_letter() -> Tuple[Response, int]:
        """
        Lists employees for relieving letter generation.
        
        Returns:
            Success (200): Employee list with details
            Error (500): Server error
        
        Example:
            >>> # GET /api/documents/employees/relieving
        """
        Logger.info("Get employee details for relieving letters request received")
        
        try:
            data = DocumentService.get_employee_details_for_relieving_letter()
            
            Logger.info("Employee details fetched successfully", count=len(data))
            
            return jsonify({
                "status": "success",
                "data": data,
                "message": "Employee details fetched successfully"
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching employee details", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching employee details. Please try again."
            }), 500

    @staticmethod
    def get_hr_relieving_letters() -> Tuple[Response, int]:
        """
        Retrieves all HR relieving letters.
        
        Returns:
            Success (200): Complete letter list
            Error (500): Server error
        """
        Logger.info("Get HR relieving letters request received")
        
        try:
            data = DocumentService.get_hr_relieving_letters()
            
            Logger.info("HR relieving letters fetched", count=len(data))
            
            return jsonify({
                "status": "success",
                "data": data,
                "message": "Relieving letters fetched successfully"
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching HR relieving letters", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching relieving letters. Please try again."
            }), 500

    @staticmethod
    def get_relieving_letters() -> Tuple[Response, int]:
        """
        Retrieves simplified relieving letter list.
        
        Returns:
            Success (200): Letter summary list
            Error (500): Server error
        """
        Logger.info("Get relieving letters summary request received")
        
        try:
            data = DocumentService.get_relieving_letters()
            
            Logger.info("Relieving letters summary fetched", count=len(data))
            
            return jsonify({
                "status": "success",
                "data": data,
                "message": "Relieving letters fetched successfully"
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching relieving letters", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching relieving letters. Please try again."
            }), 500

    @staticmethod
    def create_relieving_letter() -> Tuple[Response, int]:
        """
        Creates and emails new relieving letter.
        
        Request Body (JSON):
            {
                "employeeId": "EMP001",
                "employeeName": "John Doe",
                "designation": "Software Engineer",
                "joiningDate": "2020-01-01",
                "lastWorkingDate": "2024-12-31",
                "relievingDate": "2025-01-01",
                "resignationDate": "2024-12-01",
                "ctcSalary": 1200000,
                "bonus": 50000,
                "variables": 100000,
                "employeeEmail": "john@example.com"
            }
        
        Returns:
            Success (200): Letter created and emailed
            Error (400): Missing/invalid fields
            Error (500): Server error
        
        Example:
            >>> # POST /api/documents/relieving
        """
        Logger.info("Create relieving letter request received")
        
        try:
            payload = request.get_json()
            
            if not payload:
                Logger.warning("Create relieving letter request missing JSON body")
                return jsonify({
                    "status": "error",
                    "message": "Request body must be JSON"
                }), 400
            
            Logger.debug("Creating relieving letter", 
                        employee_id=payload.get('employeeId'),
                        employee_name=payload.get('employeeName'))
            
            DocumentService.create_relieving_letter(payload)
            
            Logger.info("Relieving letter created successfully", 
                       employee_id=payload.get('employeeId'))
            
            return jsonify({
                "status": "success",
                "message": "Relieving letter generated and emailed successfully"
            }), 200
            
        except ValueError as ve:
            Logger.warning("Relieving letter creation validation error", error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 400
            
        except Exception as e:
            Logger.error("Unexpected error creating relieving letter", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while creating relieving letter. Please try again."
            }), 500

    @staticmethod
    def send_relieving_letter_email(letter_id: int) -> Tuple[Response, int]:
        """
        Sends email for existing relieving letter.
        
        Args:
            letter_id: Letter ID from URL parameter
        
        Returns:
            Success (200): Email sent
            Error (404): Letter or PDF not found
            Error (500): Server error
        
        Example:
            >>> # POST /api/documents/relieving/<id>/email
        """
        Logger.info("Send relieving letter email request received", letter_id=letter_id)
        
        try:
            DocumentService.send_relieving_letter_email(letter_id)
            
            Logger.info("Relieving letter email sent successfully", letter_id=letter_id)
            
            return jsonify({
                "status": "success",
                "data": {},
                "message": "Email sent successfully"
            }), 200
            
        except ValueError as ve:
            Logger.warning("Letter not found for email", letter_id=letter_id, error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 404
            
        except FileNotFoundError as fnf:
            Logger.error("PDF file not found for email", letter_id=letter_id, error=str(fnf))
            return jsonify({
                "status": "error",
                "message": str(fnf)
            }), 404
            
        except Exception as e:
            Logger.error("Unexpected error sending relieving letter email", 
                        letter_id=letter_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while sending email. Please try again."
            }), 500

    @staticmethod
    def update_relieving_letter(letter_id: int) -> Tuple[Response, int]:
        """
        Updates existing relieving letter.
        
        Args:
            letter_id: Letter ID from URL parameter
        
        Request Body (JSON):
            {
                "lastWorkingDate": "2024-12-31",
                "relievingDate": "2025-01-01",
                "resignationDate": "2024-12-01",
                "ctcSalary": 1200000,
                "bonus": 50000,
                "variables": 100000
            }
        
        Returns:
            Success (200): Letter updated
            Error (400): Missing/invalid fields
            Error (404): Letter not found (from ValueError)
            Error (500): Server error
        """
        Logger.info("Update relieving letter request received", letter_id=letter_id)
        
        try:
            payload = request.get_json()
            
            if not payload:
                Logger.warning("Update relieving letter request missing JSON body", letter_id=letter_id)
                return jsonify({
                    "status": "error",
                    "message": "Request body must be JSON"
                }), 400
            
            Logger.debug("Updating relieving letter", letter_id=letter_id)
            
            DocumentService.update_relieving_letter(letter_id, payload)
            
            Logger.info("Relieving letter updated successfully", letter_id=letter_id)
            
            return jsonify({
                "status": "success",
                "data": {},
                "message": "Relieving letter updated successfully"
            }), 200
            
        except ValueError as ve:
            Logger.warning("Relieving letter update validation error", 
                          letter_id=letter_id,
                          error=str(ve))
            # Could be missing fields (400) or letter not found (404)
            # Check error message to determine
            if "not found" in str(ve).lower():
                return jsonify({
                    "status": "error",
                    "message": str(ve)
                }), 404
            else:
                return jsonify({
                    "status": "error",
                    "message": str(ve)
                }), 400
            
        except Exception as e:
            Logger.error("Unexpected error updating relieving letter", 
                        letter_id=letter_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while updating relieving letter. Please try again."
            }), 500

    @staticmethod
    def download_relieving_letter(letter_id: int) -> Tuple[Response, int]:
        """
        Downloads relieving letter PDF.
        
        Args:
            letter_id: Letter ID from URL parameter
        
        Returns:
            Success (200): PDF file download
            Error (404): Letter or PDF not found
            Error (500): Server error
        
        Example:
            >>> # GET /api/documents/relieving/<id>/download
        """
        Logger.info("Download relieving letter request received", letter_id=letter_id)
        
        try:
            pdf_path = DocumentService.get_relieving_letter_pdf_path(letter_id)
            
            Logger.info("Relieving letter download initiated", 
                       letter_id=letter_id,
                       pdf_path=pdf_path)
            
            return send_file(pdf_path, as_attachment=True)
            
        except ValueError as ve:
            Logger.warning("Letter not found for download", letter_id=letter_id, error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 404
            
        except FileNotFoundError as fnf:
            Logger.error("PDF file not found for download", letter_id=letter_id, error=str(fnf))
            return jsonify({
                "status": "error",
                "message": str(fnf)
            }), 404
            
        except Exception as e:
            Logger.error("Unexpected error downloading relieving letter", 
                        letter_id=letter_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while downloading PDF. Please try again."
            }), 500

    # ============= EMPLOYEE DOCUMENT ENDPOINTS =============

    @staticmethod
    def upload_document() -> Tuple[Response, int]:
        """
        Uploads employee document (PDF).
        
        Request (multipart/form-data):
            - emp_id: Employee ID
            - doc_type: tenth, twelve, pan, adhar, grad, resume
            - file: PDF file
        
        Returns:
            Success (201): Document uploaded
            Error (400): Missing fields, invalid type, or non-PDF
            Error (500): Server error
        
        Example:
            >>> # POST /api/documents/upload
            >>> # Form data: emp_id=EMP001, doc_type=pan, file=<pdf>
        """
        Logger.info("Upload document request received")
        
        try:
            emp_id = request.form.get("emp_id")
            doc_type = request.form.get("doc_type")
            file = request.files.get("file")
            
            # Validate request
            missing = []
            if not emp_id:
                missing.append("emp_id")
            if not doc_type:
                missing.append("doc_type")
            if not file:
                missing.append("file")
            
            if missing:
                Logger.warning("Upload document missing required fields", missing_fields=missing)
                return jsonify({
                    "error": f"Missing required fields: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Uploading document", 
                        employee_id=emp_id,
                        doc_type=doc_type,
                        filename=file.filename if file else None)
            
            DocumentService.upload_document(emp_id, doc_type, file)
            
            Logger.info("Document uploaded successfully", 
                       employee_id=emp_id,
                       doc_type=doc_type)
            
            return jsonify({
                "message": f"{doc_type} document uploaded successfully"
            }), 201
            
        except ValueError as ve:
            Logger.warning("Document upload validation error", error=str(ve))
            return jsonify({"error": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error uploading document", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while uploading document. Please try again."
            }), 500

    @staticmethod
    def get_document(emp_id: str, doc_type: str) -> Tuple[Response, int]:
        """
        Downloads employee document.
        
        Args:
            emp_id: Employee ID from URL
            doc_type: Document type from URL
        
        Returns:
            Success (200): PDF file download
            Error (400): Invalid document type
            Error (404): Document not found
            Error (500): Server error
        
        Example:
            >>> # GET /api/documents/<emp_id>/<doc_type>
        """
        Logger.info("Get document request received", 
                   employee_id=emp_id,
                   doc_type=doc_type)
        
        try:
            file_blob, download_name = DocumentService.get_document(emp_id, doc_type)
            
            Logger.info("Document download initiated", 
                       employee_id=emp_id,
                       doc_type=doc_type,
                       file_size=len(file_blob))
            
            return send_file(
                BytesIO(file_blob),
                mimetype="application/pdf",
                as_attachment=True,
                download_name=download_name,
            )
            
        except ValueError as ve:
            Logger.warning("Invalid document type", 
                          employee_id=emp_id,
                          doc_type=doc_type,
                          error=str(ve))
            return jsonify({"error": str(ve)}), 400
            
        except FileNotFoundError as fnf:
            Logger.warning("Document not found", 
                          employee_id=emp_id,
                          doc_type=doc_type,
                          error=str(fnf))
            return jsonify({"error": str(fnf)}), 404
            
        except Exception as e:
            Logger.error("Unexpected error retrieving document", 
                        employee_id=emp_id,
                        doc_type=doc_type,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while retrieving document. Please try again."
            }), 500

    @staticmethod
    def delete_document() -> Tuple[Response, int]:
        """
        Deletes employee document.
        
        Query Parameters:
            - employeeId: Employee ID
            - docType: Document type
        
        Returns:
            Success (200): Document deleted
            Error (400): Missing/invalid parameters
            Error (500): Server error
        """
        Logger.info("Delete document request received")
        
        try:
            emp_id = request.args.get("employeeId")
            doc_type = request.args.get("docType")
            
            # Validate request
            if not emp_id or not doc_type:
                missing = []
                if not emp_id:
                    missing.append("employeeId")
                if not doc_type:
                    missing.append("docType")
                
                Logger.warning("Delete document missing parameters", missing_params=missing)
                return jsonify({
                    "error": f"Missing required parameters: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Deleting document", employee_id=emp_id, doc_type=doc_type)
            
            DocumentService.delete_document(emp_id, doc_type)
            
            Logger.info("Document deleted successfully", 
                       employee_id=emp_id,
                       doc_type=doc_type)
            
            return jsonify({
                "message": f"{doc_type} document deleted successfully"
            }), 200
            
        except ValueError as ve:
            Logger.warning("Document deletion validation error", error=str(ve))
            return jsonify({"error": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error deleting document", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while deleting document. Please try again."
            }), 500

    @staticmethod
    def document_status(emp_id: str) -> Tuple[Response, int]:
        """
        Gets document upload status for employee.
        
        Args:
            emp_id: Employee ID from URL
        
        Returns:
            Success (200): Document status
            Error (404): Employee not found
            Error (500): Server error
        """
        Logger.info("Document status request received", employee_id=emp_id)
        
        try:
            status = DocumentService.get_document_status(emp_id)
            
            Logger.info("Document status retrieved", employee_id=emp_id)
            
            return jsonify(status), 200
            
        except ValueError as ve:
            Logger.warning("Employee not found for document status", 
                          employee_id=emp_id,
                          error=str(ve))
            return jsonify({"error": str(ve)}), 404
            
        except Exception as e:
            Logger.error("Unexpected error getting document status", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while fetching document status. Please try again."
            }), 500

    @staticmethod
    def verify_document() -> Tuple[Response, int]:
        """
        Sets document verification status.
        
        Request Body (JSON):
            {
                "emp_id": "EMP001",
                "doc_type": "pan",
                "is_verified": true
            }
        
        Returns:
            Success (200): Verification updated
            Error (400): Missing/invalid parameters
            Error (500): Server error
        """
        Logger.info("Verify document request received")
        
        try:
            data = request.get_json() or {}
            emp_id = data.get("emp_id")
            doc_type = data.get("doc_type")
            is_verified = data.get("is_verified")
            
            # Validate request
            if emp_id is None or doc_type is None or is_verified is None:
                missing = []
                if emp_id is None:
                    missing.append("emp_id")
                if doc_type is None:
                    missing.append("doc_type")
                if is_verified is None:
                    missing.append("is_verified")
                
                Logger.warning("Verify document missing parameters", missing_params=missing)
                return jsonify({
                    "error": f"Missing required parameters: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Verifying document", 
                        employee_id=emp_id,
                        doc_type=doc_type,
                        is_verified=is_verified)
            
            DocumentService.verify_document(emp_id, doc_type, is_verified)
            
            Logger.info("Document verification updated", 
                       employee_id=emp_id,
                       doc_type=doc_type,
                       status="verified" if is_verified else "rejected")
            
            return jsonify({
                "message": "Document verification status updated successfully"
            }), 200
            
        except ValueError as ve:
            Logger.warning("Document verification validation error", error=str(ve))
            return jsonify({"error": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error verifying document", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while updating verification status. Please try again."
            }), 500

    @staticmethod
    def get_document_verification_status(emp_id: str) -> Tuple[Response, int]:
        """
        Gets document verification status for employee.
        
        Args:
            emp_id: Employee ID from URL
        
        Returns:
            Success (200): Verification status
            Error (404): Employee not found
            Error (500): Server error
        """
        Logger.info("Document verification status request received", employee_id=emp_id)
        
        try:
            status = DocumentService.get_document_verification_status(emp_id)
            
            Logger.info("Document verification status retrieved", employee_id=emp_id)
            
            return jsonify(status), 200
            
        except ValueError as ve:
            Logger.warning("Employee not found for verification status", 
                          employee_id=emp_id,
                          error=str(ve))
            return jsonify({"error": str(ve)}), 404
            
        except Exception as e:
            Logger.error("Unexpected error getting verification status", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while fetching verification status. Please try again."
            }), 500

    @staticmethod
    def get_document_status_details(emp_id: str) -> Tuple[Response, int]:
        """
        Gets detailed document status with labels.
        
        Args:
            emp_id: Employee ID from URL
        
        Returns:
            Success (200): Detailed status
            Error (404): Employee not found
            Error (500): Server error
        """
        Logger.info("Document status details request received", employee_id=emp_id)
        
        try:
            status = DocumentService.get_document_status_details(emp_id)
            
            Logger.info("Document status details retrieved", employee_id=emp_id)
            
            return jsonify(status), 200
            
        except ValueError as ve:
            Logger.warning("Employee not found for status details", 
                          employee_id=emp_id,
                          error=str(ve))
            return jsonify({"error": str(ve)}), 404
            
        except Exception as e:
            Logger.error("Unexpected error getting status details", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "error": "An error occurred while fetching status details. Please try again."
            }), 500

    @staticmethod
    def get_incomplete_employees() -> Tuple[Response, int]:
        """
        Lists employees with incomplete profiles.
        
        Returns:
            Success (200): List of incomplete employees
            Error (500): Server error
        """
        Logger.info("Get incomplete employees request received")
        
        try:
            data = DocumentService.get_incomplete_employees()
            
            Logger.info("Incomplete employees fetched", count=len(data))
            
            return jsonify({
                "status": "success",
                "data": data
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching incomplete employees", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching incomplete employees. Please try again."
            }), 500

    @staticmethod
    def all_employees_docs_status() -> Tuple[Response, int]:
        """
        Gets document upload status for all employees.
        
        Returns:
            Success (200): All employees document status
            Error (500): Server error
        """
        Logger.info("Get all employees document status request received")
        
        try:
            data = DocumentService.get_all_employees_docs_status()
            
            Logger.info("All employees document status fetched", count=len(data))
            
            return jsonify({
                "status": "success",
                "data": data
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching all employees docs status", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching document status. Please try again."
            }), 500

    # ============= BLOB STORAGE SPECIFIC ENDPOINTS =============

    @staticmethod
    def get_document_view_url(emp_id: str, doc_type: str) -> Tuple[Response, int]:
        """
        Generate temporary SAS URL for viewing document (blob storage only).
        
        Args:
            emp_id: Employee ID from URL
            doc_type: Document type from URL
            
        Query Parameters:
            expiry_hours: Optional, hours until URL expires (default: 1)
        
        Returns:
            Success (200): JSON with view_url
            Error (400): Invalid parameters
            Error (404): Document not found
            Error (501): Not available in binary storage mode
            Error (500): Server error
        """
        Logger.info("Get document view URL request received", 
                   employee_id=emp_id, 
                   doc_type=doc_type)
        
        try:
            expiry_hours = request.args.get('expiry_hours', 1, type=int)
            
            view_url = DocumentService.generate_document_view_url(
                emp_id, 
                doc_type, 
                expiry_hours
            )
            
            Logger.info("Document view URL generated", 
                       employee_id=emp_id, 
                       doc_type=doc_type)
            
            return jsonify({
                "status": "success",
                "data": {
                    "view_url": view_url,
                    "expires_in_hours": expiry_hours
                },
                "message": "View URL generated successfully"
            }), 200
            
        except NotImplementedError as nie:
            Logger.warning("View URL not available", error=str(nie))
            return jsonify({
                "status": "error",
                "message": str(nie)
            }), 501
            
        except FileNotFoundError as fnf:
            Logger.warning("Document not found for view URL", 
                          employee_id=emp_id,
                          doc_type=doc_type,
                          error=str(fnf))
            return jsonify({
                "status": "error",
                "message": str(fnf)
            }), 404
            
        except ValueError as ve:
            Logger.warning("Invalid parameters for view URL", error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 400
            
        except Exception as e:
            Logger.error("Unexpected error generating view URL", 
                        employee_id=emp_id,
                        doc_type=doc_type,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while generating view URL. Please try again."
            }), 500

    @staticmethod
    def get_document_metadata_endpoint(emp_id: str, doc_type: str) -> Tuple[Response, int]:
        """
        Get document metadata without downloading (blob storage only).
        
        Args:
            emp_id: Employee ID from URL
            doc_type: Document type from URL
        
        Returns:
            Success (200): JSON with metadata
            Error (404): Document not found
            Error (501): Not available in binary storage mode
            Error (500): Server error
        """
        Logger.info("Get document metadata request received", 
                   employee_id=emp_id, 
                   doc_type=doc_type)
        
        try:
            metadata = DocumentService.get_document_metadata(emp_id, doc_type)
            
            Logger.info("Document metadata retrieved", 
                       employee_id=emp_id, 
                       doc_type=doc_type)
            
            return jsonify({
                "status": "success",
                "data": metadata,
                "message": "Metadata retrieved successfully"
            }), 200
            
        except NotImplementedError as nie:
            Logger.warning("Metadata not available", error=str(nie))
            return jsonify({
                "status": "error",
                "message": str(nie)
            }), 501
            
        except FileNotFoundError as fnf:
            Logger.warning("Document not found for metadata", 
                          employee_id=emp_id,
                          doc_type=doc_type,
                          error=str(fnf))
            return jsonify({
                "status": "error",
                "message": str(fnf)
            }), 404
            
        except Exception as e:
            Logger.error("Unexpected error getting metadata", 
                        employee_id=emp_id,
                        doc_type=doc_type,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while retrieving metadata. Please try again."
            }), 500

    @staticmethod
    def list_employee_documents_endpoint(emp_id: str) -> Tuple[Response, int]:
        """
        List all documents for an employee (blob storage only).
        
        Args:
            emp_id: Employee ID from URL
        
        Returns:
            Success (200): JSON with list of documents
            Error (501): Not available in binary storage mode
            Error (500): Server error
        """
        Logger.info("List employee documents request received", employee_id=emp_id)
        
        try:
            documents = DocumentService.list_employee_documents(emp_id)
            
            Logger.info("Employee documents listed", 
                       employee_id=emp_id, 
                       count=len(documents))
            
            return jsonify({
                "status": "success",
                "data": documents,
                "message": "Documents listed successfully"
            }), 200
            
        except NotImplementedError as nie:
            Logger.warning("Document listing not available", error=str(nie))
            return jsonify({
                "status": "error",
                "message": str(nie)
            }), 501
            
        except Exception as e:
            Logger.error("Unexpected error listing documents", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while listing documents. Please try again."
            }), 500
