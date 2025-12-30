from typing import List, Dict, Any, Tuple
from werkzeug.datastructures import FileStorage
from .document import RelievingLetterService, EmployeeDocumentService

class DocumentService:
    """
    Facade service for document management and relieving letter operations.
    Delegates all calls to specialized sub-services for better modularity.
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

    # ============= EMPLOYEE DOCUMENT MANAGEMENT =============

    @staticmethod
    def upload_document(emp_id: str, doc_type: str, file_storage: FileStorage) -> bool:
        return EmployeeDocumentService.upload_document(emp_id, doc_type, file_storage)

    @staticmethod
    def get_document(emp_id: str, doc_type: str) -> Tuple[bytes, str]:
        return EmployeeDocumentService.get_document(emp_id, doc_type)

    @staticmethod
    def delete_document(emp_id: str, doc_type: str) -> bool:
        return EmployeeDocumentService.delete_document(emp_id, doc_type)

    @staticmethod
    def verify_document(emp_id: str, doc_type: str, is_verified: bool) -> bool:
        return EmployeeDocumentService.verify_document(emp_id, doc_type, is_verified)

    @staticmethod
    def get_document_status(emp_id: str) -> Dict[str, Any]:
        return EmployeeDocumentService.get_document_status(emp_id)

    @staticmethod
    def get_document_verification_status(emp_id: str) -> Dict[str, Any]:
        return EmployeeDocumentService.get_document_verification_status(emp_id)

    @staticmethod
    def get_document_status_details(emp_id: str) -> Dict[str, Any]:
        return EmployeeDocumentService.get_document_status_details(emp_id)

    @staticmethod
    def get_incomplete_employees() -> List[Dict[str, Any]]:
        return EmployeeDocumentService.get_incomplete_employees()

    @staticmethod
    def get_all_employees_docs_status() -> List[Dict[str, Any]]:
        return EmployeeDocumentService.get_all_employees_docs_status()
