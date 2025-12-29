import logging
import os
from datetime import datetime
from io import BytesIO

import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import current_app, render_template
from sqlalchemy import text
from werkzeug.utils import secure_filename
from xhtml2pdf import pisa
from num2words import num2words

from .. import db


class DocumentService:
    """Service layer for relieving letter generation, metadata, and email sending."""

    @staticmethod
    def get_employee_details_for_relieving_letter():
        query = text(
            """
            SELECT 
                e.EmployeeId,
                CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
                e.DateOfJoining,
                es.SubRoleName,
                e.PersonalEmail
            FROM Employee e
            LEFT JOIN EmployeeSubRole es ON e.SubRole = es.SubRoleId
            """
        )
        result = db.session.execute(query)
        employees = [
            {
                "EmployeeId": row[0],
                "EmployeeName": row[1],
                "DateOfJoining": row[2].isoformat() if row[2] else None,
                "SubRoleName": row[3],
                "PersonalEmail": row[4],
            }
            for row in result
        ]
        return employees

    @staticmethod
    def get_hr_relieving_letters():
        query = text(
            """
            SELECT id, employeeName, empId, designation, letterType, creationDate, lastWorkingDate,
                   relievingDate, resignationDate, ctcSalary, bonus, variables, employeeEmail
            FROM EmployeeRelievingLetters
            """
        )
        result = db.session.execute(query)
        letters = [
            {
                "id": row[0],
                "employeeName": row[1],
                "empId": row[2],
                "designation": row[3],
                "letterType": row[4],
                "creationDate": row[5].isoformat() if row[5] else None,
                "lastWorkingDate": row[6].isoformat() if row[6] else None,
                "relievingDate": row[7].isoformat() if row[7] else None,
                "resignationDate": row[8].isoformat() if row[8] else None,
                "ctcSalary": float(row[9]) if row[9] else None,
                "bonus": float(row[10]) if row[10] else None,
                "variables": float(row[11]) if row[11] else None,
                "employeeEmail": row[12],
            }
            for row in result
        ]
        return letters

    @staticmethod
    def get_relieving_letters():
        query = text(
            """
            SELECT id, employeeName, pdfPath, creationDate, employeeEmail
            FROM EmployeeRelievingLetters
            """
        )
        result = db.session.execute(query)
        letters = [
            {
                "id": row[0],
                "employeeName": row[1],
                "pdfPath": row[2],
                "generationDate": row[3].isoformat() if row[3] else None,
                "employeeEmail": row[4],
            }
            for row in result
        ]
        return letters

    @staticmethod
    def _number_to_words(amount: float) -> str:
        try:
            return num2words(amount, to="cardinal", lang="en_IN").title() + " Rupees"
        except Exception:
            return ""

    @staticmethod
    def _ensure_upload_folder() -> str:
        upload_folder = current_app.config.get("UPLOAD_FOLDER")
        if not upload_folder:
            upload_folder = os.path.join(current_app.root_path, "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        return upload_folder

    @staticmethod
    def create_relieving_letter(data: dict):
        required_fields = [
            "employeeId",
            "employeeName",
            "designation",
            "joiningDate",
            "lastWorkingDate",
            "relievingDate",
            "resignationDate",
            "ctcSalary",
            "bonus",
            "variables",
            "employeeEmail",
        ]
        if not all(data.get(f) for f in required_fields):
            raise ValueError("Missing required fields")

        employee_id = data.get("employeeId")
        employee_name = data.get("employeeName")
        designation = data.get("designation")
        joining_date = data.get("joiningDate")
        last_working_date = data.get("lastWorkingDate")
        relieving_date = data.get("relievingDate")
        resignation_date = data.get("resignationDate")
        ctc_salary = data.get("ctcSalary")
        bonus = data.get("bonus")
        variables = data.get("variables")
        employee_email = data.get("employeeEmail")

        try:
            ctc_salary = float(ctc_salary)
            bonus = float(bonus)
            variables = float(variables)
        except ValueError:
            raise ValueError("CTC, Bonus, and Variables must be numbers")

        upload_folder = DocumentService._ensure_upload_folder()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        pdf_filename = f"Relieving_Letter_{employee_id}_{timestamp}.pdf"
        pdf_path = os.path.join(upload_folder, pdf_filename)

        logo_path = os.path.join(current_app.root_path, "static", "img", "flairminds-logo.jpg")

        html = render_template(
            "relieving_letters/relieving_letter_template.html",
            employee_id=employee_id,
            employee_name=employee_name,
            designation=designation,
            joining_date=joining_date,
            last_working_date=last_working_date,
            relieving_date=relieving_date,
            resignation_date=resignation_date,
            ctc=f"{ctc_salary:,.2f}",
            ctc_words=DocumentService._number_to_words(ctc_salary),
            bonus=f"{bonus:,.2f}",
            variables=f"{variables:,.2f}",
            todays_date=datetime.now().strftime("%d %B %Y"),
            logo_path=logo_path,
        )

        with open(pdf_path, "wb") as f:
            result = pisa.CreatePDF(BytesIO(html.encode("utf-8")), dest=f)
        if result.err:
            raise RuntimeError("PDF generation failed")

        DocumentService._send_relieving_letter_email(employee_name, employee_email, pdf_path, pdf_filename)

        db.session.execute(
            text(
                """
                INSERT INTO EmployeeRelievingLetters (
                    empId, employeeName, designation, letterType, creationDate,
                    lastWorkingDate, relievingDate, resignationDate, ctcSalary, bonus,
                    variables, pdfPath, employeeEmail
                ) VALUES (
                    :empId, :employeeName, :designation, :letterType, :creationDate,
                    :lastWorkingDate, :relievingDate, :resignationDate, :ctcSalary, :bonus,
                    :variables, :pdfPath, :employeeEmail
                )
                """
            ),
            {
                "empId": employee_id,
                "employeeName": employee_name,
                "designation": designation,
                "letterType": "Relieving",
                "creationDate": datetime.now().strftime("%Y-%m-%d"),
                "lastWorkingDate": last_working_date,
                "relievingDate": relieving_date,
                "resignationDate": resignation_date,
                "ctcSalary": ctc_salary,
                "bonus": bonus,
                "variables": variables,
                "pdfPath": pdf_path,
                "employeeEmail": employee_email,
            },
        )
        db.session.commit()

    @staticmethod
    def _send_relieving_letter_email(employee_name: str, employee_email: str, pdf_path: str, pdf_filename: str):
        subject = "Your Relieving Letter – FlairMinds"
        body = f"""
        <html>
          <body>
            <p>Dear {employee_name},</p>
            <p>Please find your relieving letter attached.</p>
            <p>Best regards,<br>FlairMinds Team</p>
          </body>
        </html>
        """

        msg = MIMEMultipart()
        from_address = current_app.config.get("MAIL_DEFAULT_SENDER")
        password = current_app.config.get("MAIL_PASSWORD")
        msg["From"] = from_address
        msg["To"] = employee_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

        with open(pdf_path, "rb") as f:
            attachment = MIMEApplication(f.read(), _subtype="pdf")
        attachment.add_header("Content-Disposition", "attachment", filename=pdf_filename)
        msg.attach(attachment)

        try:
            server = smtplib.SMTP(current_app.config.get("MAIL_SERVER", "smtp.gmail.com"), current_app.config.get("MAIL_PORT", 587))
            if current_app.config.get("MAIL_USE_TLS", True):
                server.starttls()
            if from_address and password:
                server.login(from_address, password)
            server.sendmail(from_address, [employee_email], msg.as_string())
            server.quit()
        except Exception as e:
            logging.error(f"Failed to send relieving letter email: {e}")
            raise

    @staticmethod
    def send_relieving_letter_email(letter_id: int):
        query = text(
            """
            SELECT employeeName, employeeEmail, pdfPath
            FROM EmployeeRelievingLetters
            WHERE id = :id
            """
        )
        result = db.session.execute(query, {"id": letter_id})
        row = result.fetchone()
        if not row:
            raise ValueError("Letter not found")

        employee_name, employee_email, pdf_path = row
        if not os.path.exists(pdf_path):
            raise FileNotFoundError("PDF file not found")

        DocumentService._send_relieving_letter_email(
            employee_name, employee_email, pdf_path, os.path.basename(pdf_path)
        )

    @staticmethod
    def update_relieving_letter(letter_id: int, data: dict):
        required_fields = [
            "lastWorkingDate",
            "relievingDate",
            "resignationDate",
            "ctcSalary",
            "bonus",
            "variables",
        ]
        if not all(data.get(f) for f in required_fields):
            raise ValueError("Missing required fields")

        try:
            ctc_salary = float(data.get("ctcSalary"))
            bonus = float(data.get("bonus"))
            variables = float(data.get("variables"))
        except ValueError:
            raise ValueError("CTC, Bonus, and Variables must be valid numbers")

        db.session.execute(
            text(
                """
                UPDATE EmployeeRelievingLetters
                SET lastWorkingDate = :lastWorkingDate,
                    relievingDate = :relievingDate,
                    resignationDate = :resignationDate,
                    ctcSalary = :ctcSalary,
                    bonus = :bonus,
                    variables = :variables
                WHERE id = :id
                """
            ),
            {
                "lastWorkingDate": data.get("lastWorkingDate"),
                "relievingDate": data.get("relievingDate"),
                "resignationDate": data.get("resignationDate"),
                "ctcSalary": ctc_salary,
                "bonus": bonus,
                "variables": variables,
                "id": letter_id,
            },
        )
        db.session.commit()

    @staticmethod
    def get_relieving_letter_pdf_path(letter_id: int) -> str:
        result = db.session.execute(
            text("SELECT pdfPath FROM EmployeeRelievingLetters WHERE id = :id"),
            {"id": letter_id},
        )
        row = result.fetchone()
        if not row:
            raise ValueError("Letter not found")
        pdf_path = row[0]
        if not os.path.exists(pdf_path):
            raise FileNotFoundError("PDF file not found")
        return pdf_path

    # ------------------------------------------------------------------
    # Employee document uploads & verification (emp_documents table)
    # ------------------------------------------------------------------

    @staticmethod
    def _allowed_file(filename: str) -> bool:
        """Check if the file has a valid PDF extension."""
        return "." in filename and filename.rsplit(".", 1)[1].lower() == "pdf"

    @staticmethod
    def upload_document(emp_id: str, doc_type: str, file_storage) -> None:
        """Upload a document for an employee and store it in emp_documents.

        Mirrors Phase2 /api/upload-document behaviour.
        """
        if not emp_id or not doc_type:
            raise ValueError("Employee ID and document type are required")

        valid_types = ["tenth", "twelve", "pan", "adhar", "grad", "resume"]
        if doc_type not in valid_types:
            raise ValueError("Invalid document type")

        if file_storage is None or file_storage.filename == "":
            raise ValueError("No file uploaded")

        if not DocumentService._allowed_file(file_storage.filename):
            raise ValueError("Only PDF files are allowed")

        filename = secure_filename(file_storage.filename)
        upload_folder = DocumentService._ensure_upload_folder()
        filepath = os.path.join(upload_folder, filename)
        file_storage.save(filepath)

        try:
            with open(filepath, "rb") as f:
                file_blob = f.read()

            with db.session.begin():
                db.session.execute(
                    text(
                        f"""
                        UPDATE emp_documents
                        SET {doc_type} = :file_blob,
                            {doc_type}_verified = NULL
                        WHERE emp_id = :emp_id
                        """
                    ),
                    {"file_blob": file_blob, "emp_id": emp_id},
                )
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)

    @staticmethod
    def get_document(emp_id: str, doc_type: str) -> tuple[bytes, str]:
        """Return the raw PDF bytes and download filename for a document."""
        valid_types = {"tenth", "twelve", "pan", "adhar", "grad", "resume"}
        if doc_type not in valid_types:
            raise ValueError("Invalid document type")

        query = text(f"SELECT {doc_type} FROM emp_documents WHERE emp_id = :emp_id")
        result = db.session.execute(query, {"emp_id": emp_id}).fetchone()
        if not result or not result[0]:
            raise FileNotFoundError("Document not found")

        file_blob: bytes = result[0]
        download_name = f"{emp_id}_{doc_type}.pdf"
        return file_blob, download_name

    @staticmethod
    def delete_document(emp_id: str, doc_type: str) -> None:
        if not emp_id or not doc_type:
            raise ValueError("Employee ID and document type are required")

        valid_types = ["tenth", "twelve", "pan", "adhar", "grad", "resume"]
        if doc_type not in valid_types:
            raise ValueError("Invalid document type")

        with db.session.begin():
            db.session.execute(
                text(
                    f"""
                    UPDATE emp_documents
                    SET {doc_type} = NULL
                    WHERE emp_id = :emp_id
                    """
                ),
                {"emp_id": emp_id},
            )

    @staticmethod
    def get_document_status(emp_id: str) -> dict:
        result = db.session.execute(
            text(
                """
                SELECT tenth, twelve, pan, adhar, grad, resume
                FROM emp_documents
                WHERE emp_id = :emp_id
                """
            ),
            {"emp_id": emp_id},
        ).fetchone()

        if not result:
            raise ValueError("Employee not found")

        return {
            "documents": [
                {"doc_type": "tenth", "uploaded": bool(result.tenth)},
                {"doc_type": "twelve", "uploaded": bool(result.twelve)},
                {"doc_type": "adhar", "uploaded": bool(result.adhar)},
                {"doc_type": "pan", "uploaded": bool(result.pan)},
                {"doc_type": "grad", "uploaded": bool(result.grad)},
                {"doc_type": "resume", "uploaded": bool(result.resume)},
            ]
        }

    @staticmethod
    def verify_document(emp_id: str, doc_type: str, is_verified: bool) -> None:
        if not emp_id or doc_type is None or is_verified is None:
            raise ValueError("Missing required parameters")

        doc_type_map = {
            "tenth": "tenth",
            "twelve": "twelve",
            "pan": "pan",
            "adhar": "adhar",
            "grad": "grad",
            "resume": "resume",
        }

        if doc_type not in doc_type_map:
            raise ValueError("Invalid document type")

        db_column = doc_type_map[doc_type]
        verified_column = f"{db_column}_verified"

        with db.engine.begin() as conn:
            if is_verified:
                query = f"""
                    UPDATE emp_documents
                    SET {verified_column} = 1
                    WHERE emp_id = :emp_id
                """
                conn.execute(text(query), {"emp_id": emp_id})
            else:
                query = f"""
                    UPDATE emp_documents
                    SET {db_column} = NULL,
                        {verified_column} = 0
                    WHERE emp_id = :emp_id
                """
                conn.execute(text(query), {"emp_id": emp_id})

    @staticmethod
    def get_document_verification_status(emp_id: str) -> dict:
        result = db.session.execute(
            text(
                """
                SELECT
                    doc_id,
                    emp_id,
                    tenth_verified,
                    twelve_verified,
                    pan_verified,
                    adhar_verified,
                    grad_verified,
                    resume_verified
                FROM emp_documents
                WHERE emp_id = :emp_id
                """
            ),
            {"emp_id": emp_id},
        ).fetchone()

        if not result:
            raise ValueError("Employee documents not found")

        return {
            "doc_id": result.doc_id,
            "emp_id": result.emp_id,
            "documents": {
                "tenth": result.tenth_verified,
                "twelve": result.twelve_verified,
                "pan": result.pan_verified,
                "adhar": result.adhar_verified,
                "grad": result.grad_verified,
                "resume": result.resume_verified,
            },
        }

    @staticmethod
    def get_document_status_details(emp_id: str) -> dict:
        result = db.session.execute(
            text(
                """
                SELECT
                    doc_id,
                    emp_id,
                    tenth,
                    twelve,
                    pan,
                    adhar,
                    grad,
                    resume,
                    tenth_verified,
                    twelve_verified,
                    pan_verified,
                    adhar_verified,
                    grad_verified,
                    resume_verified
                FROM emp_documents
                WHERE emp_id = :emp_id
                LIMIT 1000
                """
            ),
            {"emp_id": emp_id},
        )

        row = result.fetchone()
        if not row:
            raise ValueError("No documents found for this employee")

        def get_status(doc, verified):
            if not doc and verified is None:
                return "Not Uploaded"
            if verified == 1 and doc is not None:
                return "Accepted"
            if verified == 0 and doc is not None:
                return "Rejected"
            if verified is None:
                return "Pending"
            return "Rejected"

        return {
            "doc_id": row.doc_id,
            "emp_id": row.emp_id,
            "documents": {
                "tenth": {
                    "uploaded": bool(row.tenth),
                    "status": get_status(row.tenth, row.tenth_verified),
                },
                "twelve": {
                    "uploaded": bool(row.twelve),
                    "status": get_status(row.twelve, row.twelve_verified),
                },
                "pan": {
                    "uploaded": bool(row.pan),
                    "status": get_status(row.pan, row.pan_verified),
                },
                "adhar": {
                    "uploaded": bool(row.adhar),
                    "status": get_status(row.adhar, row.adhar_verified),
                },
                "grad": {
                    "uploaded": bool(row.grad),
                    "status": get_status(row.grad, row.grad_verified),
                },
                "resume": {
                    "uploaded": bool(row.resume),
                    "status": get_status(row.resume, row.resume_verified),
                },
            },
        }

    @staticmethod
    def get_incomplete_employees() -> list[dict]:
        employees_result = db.session.execute(
            text(
                """
                SELECT
                    e.EmployeeId,
                    e.FirstName,
                    e.MiddleName,
                    e.LastName,
                    e.DateOfBirth,
                    e.ContactNumber,
                    e.EmergencyContactNumber,
                    e.EmergencyContactPerson,
                    e.EmergencyContactRelation,
                    e.Email,
                    e.Gender,
                    e.BloodGroup,
                    e.DateOfJoining,
                    e.CTC,
                    e.TeamLeadId,
                    e.HighestQualification,
                    e.EmploymentStatus,
                    e.PersonalEmail,
                    e.SubRole,
                    e.LobLead,
                    e.IsLead,
                    e.QualificationYearMonth,
                    e.FullStackReady
                FROM Employee e
                LIMIT 1000
                """
            )
        ).fetchall()

        incomplete_employees: list[dict] = []

        for employee in employees_result:
            employee_id = employee.EmployeeId

            address_count = db.session.execute(
                text("SELECT COUNT(*) FROM EmployeeAddress WHERE EmployeeId = :employee_id"),
                {"employee_id": employee_id},
            ).scalar()

            skills_count = db.session.execute(
                text("SELECT COUNT(*) FROM EmployeeSkill WHERE EmployeeId = :employee_id"),
                {"employee_id": employee_id},
            ).scalar()

            document_row = db.session.execute(
                text(
                    """
                    SELECT tenth, twelve, pan, adhar, grad, resume
                    FROM emp_documents
                    WHERE emp_id = :employee_id
                    """
                ),
                {"employee_id": employee_id},
            ).fetchone()

            missing_fields: list[str] = []

            if not employee.ContactNumber:
                missing_fields.append("Contact Number")
            if not employee.EmergencyContactPerson:
                missing_fields.append("Emergency Contact Person")
            if not employee.EmergencyContactRelation:
                missing_fields.append("Emergency Contact Relation")
            if not employee.EmergencyContactNumber:
                missing_fields.append("Emergency Contact Number")
            if not employee.QualificationYearMonth:
                missing_fields.append("Qualification Year Month")
            if employee.FullStackReady is None:
                missing_fields.append("Full Stack Ready Status")
            if address_count == 0:
                missing_fields.append("Address Information")
            if skills_count == 0:
                missing_fields.append("Skills Information")
            if not document_row or not any(
                [
                    document_row.tenth,
                    document_row.twelve,
                    document_row.pan,
                    document_row.adhar,
                    document_row.grad,
                    document_row.resume,
                ]
            ):
                missing_fields.append("Documents")

            if missing_fields:
                full_name = " ".join(
                    filter(None, [employee.FirstName, employee.MiddleName, employee.LastName])
                )
                incomplete_employees.append(
                    {
                        "EmployeeId": employee_id,
                        "Name": full_name,
                        "MissingFields": missing_fields,
                    }
                )
        return incomplete_employees


    @staticmethod
    def get_all_employees_docs_status():
        """Returns a summary of document upload status for all employees."""
        try:
            query = text("""
                SELECT ed.emp_id, e.FirstName, e.MiddleName, e.LastName, 
                       ed.tenth, ed.twelve, ed.pan, ed.adhar, ed.grad, ed.resume
                FROM emp_documents ed
                JOIN Employee e ON ed.emp_id = e.EmployeeId
            """)
            result = db.session.execute(query)
            employees = []
            for row in result:
                fn = " ".join(filter(None, [row.FirstName, row.MiddleName, row.LastName]))
                employees.append({
                    "emp_id": row.emp_id,
                    "name": fn,
                    "tenth": bool(row.tenth), "twelve": bool(row.twelve),
                    "pan": bool(row.pan), "adhar": bool(row.adhar),
                    "grad": bool(row.grad), "resume": bool(row.resume)
                })
            return employees
        except Exception as e:
            print(f"Error fetching all employees docs status: {e}")
            raise e

