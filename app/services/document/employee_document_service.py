import os
from typing import List, Dict, Any, Tuple, Optional
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func

from ... import db
from ...models.hr import Employee, EmployeeAddress, EmployeeSkill
from ...models.documents import EmployeeDocumentsBinary
from ...utils.logger import Logger
from .document_utils import DocumentUtils

class EmployeeDocumentService:
    """Service for handling employee document operations."""

    VALID_DOC_TYPES = ["tenth", "twelve", "pan", "adhar", "grad", "resume"]

    @staticmethod
    def upload_document(emp_id: str, doc_type: str, file_storage: FileStorage) -> bool:
        """Uploads employee document (PDF) to database safely using ORM."""
        if not emp_id or not emp_id.strip():
            raise ValueError("Employee ID is required")
        if doc_type not in EmployeeDocumentService.VALID_DOC_TYPES:
            raise ValueError(f"Invalid document type. Must be one of: {', '.join(EmployeeDocumentService.VALID_DOC_TYPES)}")
        if file_storage is None or file_storage.filename == "":
            raise ValueError("No file uploaded")
        if not DocumentUtils.allowed_file(file_storage.filename):
            raise ValueError("Only PDF files are allowed")

        emp_id = emp_id.strip()
        Logger.info("Uploading document", employee_id=emp_id, doc_type=doc_type, filename=file_storage.filename)

        filename = secure_filename(file_storage.filename)
        upload_folder = DocumentUtils.ensure_upload_folder()
        filepath = os.path.join(upload_folder, filename)

        try:
            file_storage.save(filepath)
            with open(filepath, "rb") as f:
                file_blob = f.read()

            doc = EmployeeDocumentsBinary.query.filter_by(emp_id=emp_id).first()
            if not doc:
                Logger.warning("Document record not found for employee", employee_id=emp_id)
                # Should we create one? The original implementation just updated existing.
                # Assuming one exists. If not, we might need to create it.
                # Let's create it if missing to be robust
                doc = EmployeeDocumentsBinary(emp_id=emp_id)
                db.session.add(doc)

            # Security: Using setattr instead of f-string SQL
            setattr(doc, doc_type, file_blob)
            setattr(doc, f"{doc_type}_verified", None)  # Reset verification status
            
            db.session.commit()
            Logger.info("Document uploaded successfully", employee_id=emp_id, doc_type=doc_type, file_size=len(file_blob))
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error uploading document", employee_id=emp_id, doc_type=doc_type, error=str(e))
            raise
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)
        return False

    @staticmethod
    def get_document(emp_id: str, doc_type: str) -> Tuple[bytes, str]:
        """Retrieves document binary safely using ORM."""
        if doc_type not in EmployeeDocumentService.VALID_DOC_TYPES:
            raise ValueError(f"Invalid document type. Must be one of: {', '.join(EmployeeDocumentService.VALID_DOC_TYPES)}")
        
        Logger.debug("Retrieving document", employee_id=emp_id, doc_type=doc_type)
        try:
            doc = EmployeeDocumentsBinary.query.filter_by(emp_id=emp_id).first()
            if not doc:
                raise FileNotFoundError(f"Document record not found for employee {emp_id}")
            
            # Security: Using getattr instead of f-string SQL
            file_blob = getattr(doc, doc_type)
            if not file_blob:
                Logger.warning("Document not found", employee_id=emp_id, doc_type=doc_type)
                raise FileNotFoundError(f"Document {doc_type} not found for employee {emp_id}")

            download_name = f"{emp_id}_{doc_type}.pdf"
            Logger.debug("Document retrieved", employee_id=emp_id, doc_type=doc_type, file_size=len(file_blob))
            return file_blob, download_name
        except FileNotFoundError:
            raise
        except Exception as e:
            Logger.error("Error retrieving document", employee_id=emp_id, doc_type=doc_type, error=str(e))
            raise

    @staticmethod
    def delete_document(emp_id: str, doc_type: str) -> bool:
        """Deletes employee document from database safely using ORM."""
        if not emp_id or doc_type not in EmployeeDocumentService.VALID_DOC_TYPES:
            raise ValueError("Invalid parameters for document deletion")

        Logger.info("Deleting document", employee_id=emp_id, doc_type=doc_type)
        try:
            doc = EmployeeDocumentsBinary.query.filter_by(emp_id=emp_id).first()
            if not doc:
                Logger.warning("Document record not found", employee_id=emp_id)
                return False

            setattr(doc, doc_type, None)
            db.session.commit()
            Logger.info("Document deleted", employee_id=emp_id, doc_type=doc_type)
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting document", employee_id=emp_id, doc_type=doc_type, error=str(e))
            raise

    @staticmethod
    def verify_document(emp_id: str, doc_type: str, is_verified: bool) -> bool:
        """Sets document verification status safely using ORM."""
        if not emp_id or doc_type not in EmployeeDocumentService.VALID_DOC_TYPES or is_verified is None:
            raise ValueError("All parameters are required")

        Logger.info("Verifying document", employee_id=emp_id, doc_type=doc_type, is_verified=is_verified)
        try:
            doc = EmployeeDocumentsBinary.query.filter_by(emp_id=emp_id).first()
            if not doc:
                Logger.warning("Document record not found", employee_id=emp_id)
                raise ValueError("Employee documents not found")

            verified_column = f"{doc_type}_verified"
            if is_verified:
                setattr(doc, verified_column, 1)
            else:
                setattr(doc, doc_type, None) # Reject: delete document
                setattr(doc, verified_column, 0)
            
            db.session.commit()
            Logger.info("Document verification updated", employee_id=emp_id, doc_type=doc_type, 
                        status="verified" if is_verified else "rejected")
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error verifying document", employee_id=emp_id, doc_type=doc_type, error=str(e))
            raise

    @staticmethod
    def get_document_status(emp_id: str) -> Dict[str, Any]:
        """Gets upload status for all document types."""
        if not emp_id:
            raise ValueError("Employee ID is required")
        
        Logger.debug("Getting document status", employee_id=emp_id)
        try:
            doc = EmployeeDocumentsBinary.query.filter_by(emp_id=emp_id).first()
            if not doc:
                raise ValueError("Employee not found")
            
            return {
                "documents": [
                    {"doc_type": "tenth", "uploaded": bool(doc.tenth)},
                    {"doc_type": "twelve", "uploaded": bool(doc.twelve)},
                    {"doc_type": "adhar", "uploaded": bool(doc.adhar)},
                    {"doc_type": "pan", "uploaded": bool(doc.pan)},
                    {"doc_type": "grad", "uploaded": bool(doc.grad)},
                    {"doc_type": "resume", "uploaded": bool(doc.resume)},
                ]
            }
        except Exception as e:
            Logger.error("Error getting document status", employee_id=emp_id, error=str(e))
            raise

    @staticmethod
    def get_document_verification_status(emp_id: str) -> Dict[str, Any]:
        """Gets verification status for all documents."""
        if not emp_id:
            raise ValueError("Employee ID is required")
        
        Logger.debug("Getting document verification status", employee_id=emp_id)
        try:
            doc = EmployeeDocumentsBinary.query.filter_by(emp_id=emp_id).first()
            if not doc:
                raise ValueError("Employee documents not found")
            
            return {
                "doc_id": doc.doc_id,
                "emp_id": doc.emp_id,
                "documents": {
                    "tenth": doc.tenth_verified,
                    "twelve": doc.twelve_verified,
                    "pan": doc.pan_verified,
                    "adhar": doc.adhar_verified,
                    "grad": doc.grad_verified,
                    "resume": doc.resume_verified,
                },
            }
        except Exception as e:
            Logger.error("Error getting verification status", employee_id=emp_id, error=str(e))
            raise

    @staticmethod
    def get_document_status_details(emp_id: str) -> Dict[str, Any]:
        """Gets detailed document status with human-readable labels."""
        if not emp_id:
            raise ValueError("Employee ID is required")
        
        Logger.debug("Getting detailed document status", employee_id=emp_id)
        try:
            doc = EmployeeDocumentsBinary.query.filter_by(emp_id=emp_id).first()
            if not doc:
                raise ValueError("No documents found for this employee")
            
            def get_status_label(doc_field, verified):
                if not doc_field and verified is None: return "Not Uploaded"
                if verified == 1 and doc_field is not None: return "Accepted"
                if verified == 0 and doc_field is not None: return "Rejected"
                if verified is None: return "Pending"
                return "Rejected"
            
            return {
                "doc_id": doc.doc_id,
                "emp_id": doc.emp_id,
                "documents": {
                    "tenth": {"uploaded": bool(doc.tenth), "status": get_status_label(doc.tenth, doc.tenth_verified)},
                    "twelve": {"uploaded": bool(doc.twelve), "status": get_status_label(doc.twelve, doc.twelve_verified)},
                    "pan": {"uploaded": bool(doc.pan), "status": get_status_label(doc.pan, doc.pan_verified)},
                    "adhar": {"uploaded": bool(doc.adhar), "status": get_status_label(doc.adhar, doc.adhar_verified)},
                    "grad": {"uploaded": bool(doc.grad), "status": get_status_label(doc.grad, doc.grad_verified)},
                    "resume": {"uploaded": bool(doc.resume), "status": get_status_label(doc.resume, doc.resume_verified)},
                },
            }
        except Exception as e:
            Logger.error("Error getting detailed document status", employee_id=emp_id, error=str(e))
            raise

    @staticmethod
    def get_incomplete_employees() -> List[Dict[str, Any]]:
        """Finds employees with incomplete profile information using ORM."""
        Logger.info("Finding employees with incomplete profiles")
        try:
            # Query first 1000 employees
            employees = Employee.query.limit(1000).all()
            incomplete_employees: List[Dict[str, Any]] = []
            
            for emp in employees:
                missing_fields: List[str] = []
                
                # Check employee fields
                if not emp.contact_number: missing_fields.append("Contact Number")
                if not emp.emergency_contact_person: missing_fields.append("Emergency Contact Person")
                if not emp.emergency_contact_relation: missing_fields.append("Emergency Contact Relation")
                if not emp.emergency_contact_number: missing_fields.append("Emergency Contact Number")
                if not emp.qualification_year_month: missing_fields.append("Qualification Year Month")
                if emp.full_stack_ready is None: missing_fields.append("Full Stack Ready Status")
                
                # Check address via relationship or simple query if lazy
                address_count = EmployeeAddress.query.filter_by(employee_id=emp.employee_id).count()
                if address_count == 0: missing_fields.append("Address Information")
                
                # Check skills
                skills_count = EmployeeSkill.query.filter_by(employee_id=emp.employee_id).count()
                if skills_count == 0: missing_fields.append("Skills Information")
                
                # Check documents
                doc = EmployeeDocumentsBinary.query.filter_by(emp_id=emp.employee_id).first()
                if not doc or not any([doc.tenth, doc.twelve, doc.pan, doc.adhar, doc.grad, doc.resume]):
                    missing_fields.append("Documents")
                
                if missing_fields:
                    incomplete_employees.append({
                        "EmployeeId": emp.employee_id,
                        "Name": f"{emp.first_name or ''} {emp.middle_name or ''} {emp.last_name or ''}".replace("  ", " ").strip(),
                        "MissingFields": missing_fields,
                    })
            
            Logger.info("Incomplete employees found", count=len(incomplete_employees))
            return incomplete_employees
        except SQLAlchemyError as e:
            Logger.error("Database error finding incomplete employees", error=str(e))
            return []

    @staticmethod
    def get_all_employees_docs_status() -> List[Dict[str, Any]]:
        """Returns document upload summary for all employees using ORM."""
        Logger.info("Fetching all employees document status")
        try:
            results = db.session.query(
                EmployeeDocumentsBinary.emp_id,
                Employee.first_name,
                Employee.middle_name,
                Employee.last_name,
                EmployeeDocumentsBinary.tenth,
                EmployeeDocumentsBinary.twelve,
                EmployeeDocumentsBinary.pan,
                EmployeeDocumentsBinary.adhar,
                EmployeeDocumentsBinary.grad,
                EmployeeDocumentsBinary.resume
            ).join(Employee, EmployeeDocumentsBinary.emp_id == Employee.employee_id).all()
            
            employees = []
            for row in results:
                name = f"{row.first_name or ''} {row.middle_name or ''} {row.last_name or ''}".replace("  ", " ").strip()
                employees.append({
                    "emp_id": row.emp_id,
                    "name": name,
                    "tenth": bool(row.tenth),
                    "twelve": bool(row.twelve),
                    "pan": bool(row.pan),
                    "adhar": bool(row.adhar),
                    "grad": bool(row.grad),
                    "resume": bool(row.resume)
                })
            Logger.info("All employees document status fetched", count=len(employees))
            return employees
        except SQLAlchemyError as e:
            Logger.error("Database error fetching all employees docs status", error=str(e))
            raise
