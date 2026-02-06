from typing import List, Dict, Any, Tuple
from werkzeug.datastructures import FileStorage

from .document import RelievingLetterService
from .document.blob_document_service import BlobDocumentService

class DocumentService:
    """
    Facade service for document management and relieving letter operations.
    All employee document operations now use Azure Blob Storage exclusively.
    """

    # ============= RELIEVING LETTER MANAGEMENT =============

    @staticmethod
    def get_employee_details_for_relieving_letter() -> List[Dict[str, Any]]:
        return RelievingLetterService.get_employee_details_for_relieving_letter()

    @staticmethod
    def get_hr_relieving_letters() -> List[Dict[str, Any]]:
        return RelievingLetterService.get_hr_relieving_letters()

    @staticmethod
    def get_relieving_letters() -> List[Dict[str, Any]]:
        return RelievingLetterService.get_relieving_letters()

    @staticmethod
    def create_relieving_letter(data: Dict[str, Any]) -> int:
        return RelievingLetterService.create_relieving_letter(data)

    @staticmethod
    def send_relieving_letter_email(letter_id: int) -> bool:
        return RelievingLetterService.send_relieving_letter_email(letter_id)

    @staticmethod
    def update_relieving_letter(letter_id: int, data: Dict[str, Any]) -> bool:
        return RelievingLetterService.update_relieving_letter(letter_id, data)

    @staticmethod
    def get_relieving_letter_pdf_path(letter_id: int) -> str:
        return RelievingLetterService.get_relieving_letter_pdf_path(letter_id)

    # ============= EMPLOYEE DOCUMENT MANAGEMENT (BLOB STORAGE) =============

    @staticmethod
    def upload_document(emp_id: str, doc_type: str, file_storage: FileStorage) -> bool:
        """Upload document to Azure Blob Storage."""
        BlobDocumentService.upload_document_to_blob(emp_id, doc_type, file_storage)
        return True

    @staticmethod
    def get_document(emp_id: str, doc_type: str) -> Tuple[bytes, str]:
        """Get document from Azure Blob Storage."""
        return BlobDocumentService.get_document_from_blob(emp_id, doc_type)

    @staticmethod
    def delete_document(emp_id: str, doc_type: str) -> bool:
        """Delete document from Azure Blob Storage."""
        return BlobDocumentService.delete_document_from_blob(emp_id, doc_type)

    @staticmethod
    def verify_document(emp_id: str, doc_type: str, is_verified: bool) -> bool:
        """Verify document in Azure Blob Storage."""
        return BlobDocumentService.verify_document_blob(emp_id, doc_type, is_verified)

    @staticmethod
    def get_document_status(emp_id: str) -> Dict[str, Any]:
        """Get document upload status from Azure Blob Storage."""
        docs = BlobDocumentService.list_employee_documents(emp_id)
        doc_types = ['tenth', 'twelve', 'adhar', 'pan', 'grad', 'resume', 'medical_certificate']
        uploaded_types = {doc['doc_type'] for doc in docs}
        
        return {
            "documents": [
                {"doc_type": dt, "uploaded": dt in uploaded_types}
                for dt in doc_types
            ]
        }

    @staticmethod
    def get_document_verification_status(emp_id: str) -> Dict[str, Any]:
        """Get verification status from Azure Blob Storage."""
        docs = BlobDocumentService.list_employee_documents(emp_id)
        verification_status = {doc['doc_type']: doc['is_verified'] for doc in docs}
        
        return {
            "emp_id": emp_id,
            "documents": {
                "tenth": verification_status.get('tenth'),
                "twelve": verification_status.get('twelve'),
                "pan": verification_status.get('pan'),
                "adhar": verification_status.get('adhar'),
                "grad": verification_status.get('grad'),
                "resume": verification_status.get('resume'),
                "medical_certificate": verification_status.get('medical_certificate')
            }
        }

    @staticmethod
    def get_document_status_details(emp_id: str) -> Dict[str, Any]:
        """Get detailed document status from Azure Blob Storage."""
        docs = BlobDocumentService.list_employee_documents(emp_id)
        doc_map = {doc['doc_type']: doc for doc in docs}
        
        def get_status_label(doc_type):
            if doc_type not in doc_map:
                return "Not Uploaded"
            doc = doc_map[doc_type]
            if doc['is_verified'] is True:
                return "Accepted"
            elif doc['is_verified'] is False:
                return "Rejected"
            else:
                return "Pending"
        
        doc_types = ['tenth', 'twelve', 'pan', 'adhar', 'grad', 'resume']
        return {
            "emp_id": emp_id,
            "documents": {
                dt: {
                    "uploaded": dt in doc_map,
                    "status": get_status_label(dt)
                }
                for dt in doc_types
            }
        }

    @staticmethod
    def get_incomplete_employees() -> List[Dict[str, Any]]:
        """Get incomplete employees - checks profile completeness."""
        # This method is complex and checks multiple employee attributes
        # For now, we'll return empty list - this should be reimplemented
        # to check against the new blob storage model
        from ...models.hr import Employee, EmployeeAddress, EmployeeSkill
        from ...models.documents import EmployeeDocument
        from ... import db
        
        employees = Employee.query.limit(1000).all()
        incomplete_employees = []
        
        for emp in employees:
            missing_fields = []
            
            # Check employee fields
            if not emp.contact_number: missing_fields.append("Contact Number")
            if not emp.emergency_contact_person: missing_fields.append("Emergency Contact Person")
            if not emp.emergency_contact_relation: missing_fields.append("Emergency Contact Relation")
            if not emp.emergency_contact_number: missing_fields.append("Emergency Contact Number")
            if not emp.qualification_year_month: missing_fields.append("Qualification Year Month")
            if emp.full_stack_ready is None: missing_fields.append("Full Stack Ready Status")
            
            # Check address
            address_count = EmployeeAddress.query.filter_by(employee_id=emp.employee_id).count()
            if address_count == 0: missing_fields.append("Address Information")
            
            # Check skills
            skills_count = EmployeeSkill.query.filter_by(employee_id=emp.employee_id).count()
            if skills_count == 0: missing_fields.append("Skills Information")
            
            # Check documents using new model
            doc_count = EmployeeDocument.query.filter_by(emp_id=emp.employee_id).count()
            if doc_count < 6: missing_fields.append("Documents")
            
            if missing_fields:
                incomplete_employees.append({
                    "EmployeeId": emp.employee_id,
                    "Name": f"{emp.first_name or ''} {emp.middle_name or ''} {emp.last_name or ''}".replace("  ", " ").strip(),
                    "MissingFields": missing_fields,
                })
        
        return incomplete_employees

    @staticmethod
    def get_all_employees_docs_status() -> List[Dict[str, Any]]:
        """Get all employees document status from Azure Blob Storage."""
        return BlobDocumentService.get_all_employees_docs_status()

    # ============= BLOB-SPECIFIC METHODS =============

    @staticmethod
    def generate_document_view_url(emp_id: str, doc_type: str, expiry_hours: int = 1) -> str:
        """
        Generate temporary SAS URL for viewing document.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type
            expiry_hours: Hours until URL expires
            
        Returns:
            SAS URL for temporary access
        """
        return BlobDocumentService.generate_document_view_url(emp_id, doc_type, expiry_hours)

    @staticmethod
    def get_document_metadata(emp_id: str, doc_type: str) -> Dict[str, Any]:
        """
        Get document metadata without downloading.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type
            
        Returns:
            Document metadata dictionary
        """
        return BlobDocumentService.get_document_metadata(emp_id, doc_type)

    @staticmethod
    def list_employee_documents(emp_id: str) -> List[Dict[str, Any]]:
        """
        List all documents for an employee.
        
        Args:
            emp_id: Employee ID
            
        Returns:
            List of document metadata dictionaries
        """
        return BlobDocumentService.list_employee_documents(emp_id)


