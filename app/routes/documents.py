from flask import Blueprint

from ..auth_config import ROLE_PERMISSIONS
from ..controllers.document_controller import DocumentController
from ..utils.auth import roles_required


documents_bp = Blueprint("documents", __name__)


@documents_bp.route("/employeeDetailsForRelievingLetter", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def employee_details_for_relieving_letter():
    return DocumentController.get_employee_details_for_relieving_letter()


@documents_bp.route("/hrRelievingLetters", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def hr_relieving_letters():
    return DocumentController.get_hr_relieving_letters()


@documents_bp.route("/relieving-letters", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def relieving_letters():
    return DocumentController.get_relieving_letters()


@documents_bp.route("/create-relieving-letter", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def create_relieving_letter():
    return DocumentController.create_relieving_letter()


@documents_bp.route("/sendRelievingLetterEmail/<int:letter_id>", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def send_relieving_letter_email(letter_id):
    return DocumentController.send_relieving_letter_email(letter_id)


@documents_bp.route("/relievingLetter/<int:letter_id>", methods=["PUT"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def update_relieving_letter(letter_id):
    return DocumentController.update_relieving_letter(letter_id)


@documents_bp.route("/download-relieving-letter/<int:letter_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def download_relieving_letter(letter_id):
    return DocumentController.download_relieving_letter(letter_id)


@documents_bp.route("/upload-document", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def upload_document():
    return DocumentController.upload_document()


@documents_bp.route("/get-document/<emp_id>/<doc_type>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_document(emp_id, doc_type):
    return DocumentController.get_document(emp_id, doc_type)


@documents_bp.route("/delete-document", methods=["DELETE"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def delete_document():
    return DocumentController.delete_document()


@documents_bp.route("/document-status/<emp_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def document_status(emp_id):
    return DocumentController.document_status(emp_id)


@documents_bp.route("/verify-document", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def verify_document():
    return DocumentController.verify_document()


@documents_bp.route("/document-verification-status/<emp_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def document_verification_status(emp_id):
    return DocumentController.get_document_verification_status(emp_id)


@documents_bp.route("/document-status-details/<emp_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def document_status_details(emp_id):
    return DocumentController.get_document_status_details(emp_id)


@documents_bp.route("/incomplete-employees", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def incomplete_employees():
    return DocumentController.incomplete_employees()

@documents_bp.route("/all-employees-docs", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def all_employees_docs_status():
    return DocumentController.all_employees_docs_status()

