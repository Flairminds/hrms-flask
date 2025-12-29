from flask import jsonify, request, send_file

from ..services.document_service import DocumentService


class DocumentController:
    """Controller for relieving letter and employee document endpoints."""

    @staticmethod
    def get_employee_details_for_relieving_letter():
        try:
            data = DocumentService.get_employee_details_for_relieving_letter()
            return jsonify({"status": "success", "data": data, "message": "Employee details fetched successfully"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def get_hr_relieving_letters():
        try:
            data = DocumentService.get_hr_relieving_letters()
            return jsonify({"status": "success", "data": data, "message": "Relieving letters fetched successfully"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def get_relieving_letters():
        try:
            data = DocumentService.get_relieving_letters()
            return jsonify({"status": "success", "data": data, "message": "Relieving letters fetched successfully"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def create_relieving_letter():
        try:
            payload = request.get_json()
            DocumentService.create_relieving_letter(payload)
            return jsonify({"status": "success", "message": "Relieving letter generated and emailed successfully"}), 200
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def send_relieving_letter_email(letter_id: int):
        try:
            DocumentService.send_relieving_letter_email(letter_id)
            return jsonify({"status": "success", "data": {}, "message": "Email sent successfully"}), 200
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 404
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def update_relieving_letter(letter_id: int):
        try:
            payload = request.get_json()
            DocumentService.update_relieving_letter(letter_id, payload)
            return jsonify({"status": "success", "data": {}, "message": "Relieving letter updated successfully"}), 200
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def download_relieving_letter(letter_id: int):
        try:
            pdf_path = DocumentService.get_relieving_letter_pdf_path(letter_id)
            return send_file(pdf_path, as_attachment=True)
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 404
        except FileNotFoundError as fnf:
            return jsonify({"status": "error", "message": str(fnf)}), 404
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    # ------------------------------------------------------------------
    # Employee document uploads & verification
    # ------------------------------------------------------------------

    @staticmethod
    def upload_document():
        try:
            emp_id = request.form.get("emp_id")
            doc_type = request.form.get("doc_type")
            file = request.files.get("file")

            DocumentService.upload_document(emp_id, doc_type, file)
            return jsonify({"message": f"{doc_type} document uploaded successfully"}), 201
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_document(emp_id: str, doc_type: str):
        try:
            file_blob, download_name = DocumentService.get_document(emp_id, doc_type)
            return send_file(
                BytesIO(file_blob),
                mimetype="application/pdf",
                as_attachment=True,
                download_name=download_name,
            )
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except FileNotFoundError as fnf:
            return jsonify({"error": str(fnf)}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def delete_document():
        try:
            emp_id = request.args.get("employeeId")
            doc_type = request.args.get("docType")
            DocumentService.delete_document(emp_id, doc_type)
            return jsonify({"message": f"{doc_type} document deleted successfully"}), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def document_status(emp_id: str):
        try:
            status = DocumentService.get_document_status(emp_id)
            return jsonify(status), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def verify_document():
        try:
            data = request.get_json() or {}
            emp_id = data.get("emp_id")
            doc_type = data.get("doc_type")
            is_verified = data.get("is_verified")
            DocumentService.verify_document(emp_id, doc_type, is_verified)
            return jsonify({"message": "Document verification status updated successfully"}), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_document_verification_status(emp_id: str):
        try:
            status = DocumentService.get_document_verification_status(emp_id)
            return jsonify(status), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_document_status_details(emp_id: str):
        try:
            status = DocumentService.get_document_status_details(emp_id)
            return jsonify(status), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_incomplete_employees():
        try:
            data = DocumentService.get_incomplete_employees()
            return jsonify({"status": "success", "data": data}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def all_employees_docs_status():
        try:
            data = DocumentService.get_all_employees_docs_status()
            return jsonify({"status": "success", "data": data}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

