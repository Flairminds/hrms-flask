import os
import smtplib
from datetime import datetime
from io import BytesIO
from typing import List, Dict, Any, Optional
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import current_app, render_template
from sqlalchemy.exc import SQLAlchemyError
from xhtml2pdf import pisa
from num2words import num2words

from ... import db
from ...models.hr import Employee, EmployeeSubRole, EmployeeRelievingLetters
from ...utils.logger import Logger
from .document_utils import DocumentUtils

class RelievingLetterService:
    """Service for handling relieving letter operations."""

    @staticmethod
    def get_employee_details_for_relieving_letter() -> List[Dict[str, Any]]:
        """Retrieves employee details for relieving letter generation."""
        Logger.info("Fetching employee details for relieving letters")
        try:
            employees_query = db.session.query(
                Employee.employee_id,
                (Employee.first_name + ' ' + Employee.last_name).label('employee_name'),
                Employee.date_of_joining,
                EmployeeSubRole.sub_role_name,
                Employee.personal_email
            ).outerjoin(
                EmployeeSubRole,
                Employee.sub_role == EmployeeSubRole.sub_role_id
            ).all()
            
            employees = [
                {
                    "EmployeeId": emp.employee_id,
                    "EmployeeName": emp.employee_name,
                    "DateOfJoining": emp.date_of_joining.isoformat() if emp.date_of_joining else None,
                    "SubRoleName": emp.sub_role_name,
                    "PersonalEmail": emp.personal_email,
                }
                for emp in employees_query
            ]
            Logger.info("Employee details fetched successfully", count=len(employees))
            return employees
        except SQLAlchemyError as e:
            Logger.error("Database error fetching employee details", error=str(e))
            return []

    @staticmethod
    def get_hr_relieving_letters() -> List[Dict[str, Any]]:
        """Retrieves all HR relieving letters with complete details."""
        Logger.info("Fetching all HR relieving letters")
        try:
            letters_query = EmployeeRelievingLetters.query.all()
            letters = [
                {
                    "id": letter.id,
                    "employeeName": letter.employee_name,
                    "empId": letter.emp_id,
                    "designation": letter.designation,
                    "letterType": letter.letter_type,
                    "creationDate": letter.creation_date.isoformat() if letter.creation_date else None,
                    "lastWorkingDate": letter.last_working_date.isoformat() if letter.last_working_date else None,
                    "relievingDate": letter.relieving_date.isoformat() if letter.relieving_date else None,
                    "resignationDate": letter.resignation_date.isoformat() if letter.resignation_date else None,
                    "ctcSalary": float(letter.ctc_salary) if letter.ctc_salary else None,
                    "bonus": float(letter.bonus) if letter.bonus else None,
                    "variables": float(letter.variables) if letter.variables else None,
                    "employeeEmail": letter.employee_email,
                }
                for letter in letters_query
            ]
            Logger.info("HR relieving letters fetched", count=len(letters))
            return letters
        except SQLAlchemyError as e:
            Logger.error("Database error fetching HR relieving letters", error=str(e))
            return []

    @staticmethod
    def get_relieving_letters() -> List[Dict[str, Any]]:
        """Retrieves simplified relieving letter list."""
        Logger.info("Fetching relieving letters summary")
        try:
            letters_query = EmployeeRelievingLetters.query.with_entities(
                EmployeeRelievingLetters.id,
                EmployeeRelievingLetters.employee_name,
                EmployeeRelievingLetters.pdf_path,
                EmployeeRelievingLetters.creation_date,
                EmployeeRelievingLetters.employee_email
            ).all()
            letters = [
                {
                    "id": row.id,
                    "employeeName": row.employee_name,
                    "pdfPath": row.pdf_path,
                    "generationDate": row.creation_date.isoformat() if row.creation_date else None,
                    "employeeEmail": row.employee_email,
                }
                for row in letters_query
            ]
            Logger.info("Relieving letters summary fetched", count=len(letters))
            return letters
        except SQLAlchemyError as e:
            Logger.error("Database error fetching relieving letters", error=str(e))
            return []

    @staticmethod
    def create_relieving_letter(data: Dict[str, Any]) -> int:
        """Creates relieving letter PDF and emails it to employee."""
        required_fields = [
            "employeeId", "employeeName", "designation", "joiningDate",
            "lastWorkingDate", "relievingDate", "resignationDate",
            "ctcSalary", "bonus", "variables", "employeeEmail"
        ]
        
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            Logger.error("Missing required fields for relieving letter", missing_fields=missing)
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        employee_id = data["employeeId"]
        employee_name = data["employeeName"]
        employee_email = data["employeeEmail"]
        
        Logger.info("Creating relieving letter", employee_id=employee_id, employee_name=employee_name)
        
        try:
            ctc_salary = float(data["ctcSalary"])
            bonus = float(data["bonus"])
            variables = float(data["variables"])
            
            upload_folder = DocumentUtils.ensure_upload_folder()
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            pdf_filename = f"Relieving_Letter_{employee_id}_{timestamp}.pdf"
            pdf_path = os.path.join(upload_folder, pdf_filename)
            logo_path = os.path.join(current_app.root_path, "static", "img", "flairminds-logo.jpg")
            
            html = render_template(
                "relieving_letters/relieving_letter_template.html",
                employee_id=employee_id,
                employee_name=employee_name,
                designation=data["designation"],
                joining_date=data["joiningDate"],
                last_working_date=data["lastWorkingDate"],
                relieving_date=data["relievingDate"],
                resignation_date=data["resignationDate"],
                ctc=f"{ctc_salary:,.2f}",
                ctc_words=RelievingLetterService._number_to_words(ctc_salary),
                bonus=f"{bonus:,.2f}",
                variables=f"{variables:,.2f}",
                todays_date=datetime.now().strftime("%d %B %Y"),
                logo_path=logo_path,
            )
            
            with open(pdf_path, "wb") as f:
                result = pisa.CreatePDF(BytesIO(html.encode("utf-8")), dest=f)
            
            if result.err:
                Logger.error("PDF generation failed", employee_id=employee_id)
                raise RuntimeError("PDF generation failed")
            
            RelievingLetterService._send_relieving_letter_email(
                employee_name, employee_email, pdf_path, pdf_filename
            )
            
            # Parse date strings to date objects for DB compatibility
            def parse_date(d):
                if isinstance(d, str):
                    try:
                        return datetime.fromisoformat(d.split('T')[0]).date()
                    except ValueError:
                        return None
                return d

            new_letter = EmployeeRelievingLetters(
                emp_id=employee_id,
                employee_name=employee_name,
                designation=data["designation"],
                letter_type="Relieving",
                creation_date=datetime.now().date(),
                last_working_date=parse_date(data["lastWorkingDate"]),
                relieving_date=parse_date(data["relievingDate"]),
                resignation_date=parse_date(data["resignationDate"]),
                ctc_salary=ctc_salary,
                bonus=bonus,
                variables=variables,
                pdf_path=pdf_path,
                employee_email=employee_email
            )
            db.session.add(new_letter)
            db.session.commit()
            
            Logger.info("Relieving letter created and emailed successfully", 
                       employee_id=employee_id, letter_id=new_letter.id)
            return new_letter.id
            
        except smtplib.SMTPException as e:
            Logger.error("Email sending failed", employee_id=employee_id, error=str(e))
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error creating relieving letter", employee_id=employee_id, error=str(e))
            raise
        except Exception as e:
            Logger.critical("Unexpected error creating relieving letter", employee_id=employee_id, error=str(e))
            raise

    @staticmethod
    def send_relieving_letter_email(letter_id: int) -> bool:
        """Sends relieving letter email for existing letter."""
        if not letter_id:
            raise ValueError("Letter ID is required")
        
        Logger.info("Sending relieving letter email", letter_id=letter_id)
        try:
            letter = EmployeeRelievingLetters.query.get(letter_id)
            if not letter:
                Logger.warning("Letter not found", letter_id=letter_id)
                raise ValueError("Letter not found")
            
            if not os.path.exists(letter.pdf_path):
                Logger.error("PDF file not found", letter_id=letter_id, pdf_path=letter.pdf_path)
                raise FileNotFoundError("PDF file not found")
            
            RelievingLetterService._send_relieving_letter_email(
                letter.employee_name,
                letter.employee_email,
                letter.pdf_path,
                os.path.basename(letter.pdf_path)
            )
            Logger.info("Relieving letter emailed successfully", letter_id=letter_id)
            return True
        except Exception as e:
            Logger.error("Error sending relieving letter email", letter_id=letter_id, error=str(e))
            raise

    @staticmethod
    def update_relieving_letter(letter_id: int, data: Dict[str, Any]) -> bool:
        """Updates existing relieving letter."""
        if not letter_id:
            raise ValueError("Letter ID is required")
        
        required_fields = ["lastWorkingDate", "relievingDate", "resignationDate", "ctcSalary", "bonus", "variables"]
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            Logger.error("Missing required fields for letter update", letter_id=letter_id, missing_fields=missing)
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        Logger.info("Updating relieving letter", letter_id=letter_id)
        try:
            ctc_salary = float(data["ctcSalary"])
            bonus = float(data["bonus"])
            variables = float(data["variables"])
            
            letter = EmployeeRelievingLetters.query.get(letter_id)
            if not letter:
                Logger.warning("Letter not found for update", letter_id=letter_id)
                raise ValueError("Letter not found")
            
            # Parse date strings to date objects for DB compatibility
            def parse_date(d):
                if isinstance(d, str):
                    try:
                        return datetime.fromisoformat(d.split('T')[0]).date()
                    except ValueError:
                        return None
                return d

            letter.last_working_date = parse_date(data["lastWorkingDate"])
            letter.relieving_date = parse_date(data["relievingDate"])
            letter.resignation_date = parse_date(data["resignationDate"])
            letter.ctc_salary = ctc_salary
            letter.bonus = bonus
            letter.variables = variables
            
            db.session.commit()
            Logger.info("Relieving letter updated successfully", letter_id=letter_id)
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error updating letter", letter_id=letter_id, error=str(e))
            raise

    @staticmethod
    def get_relieving_letter_pdf_path(letter_id: int) -> str:
        """Gets PDF file path for relieving letter."""
        if not letter_id:
            raise ValueError("Letter ID is required")
        
        Logger.debug("Getting PDF path for letter", letter_id=letter_id)
        try:
            letter = EmployeeRelievingLetters.query.get(letter_id)
            if not letter:
                Logger.warning("Letter not found", letter_id=letter_id)
                raise ValueError("Letter not found")
            
            if not os.path.exists(letter.pdf_path):
                Logger.error("PDF file not found", letter_id=letter_id, pdf_path=letter.pdf_path)
                raise FileNotFoundError("PDF file not found")
            
            return letter.pdf_path
        except Exception as e:
            Logger.error("Error getting PDF path", letter_id=letter_id, error=str(e))
            raise

    @staticmethod
    def _number_to_words(amount: float) -> str:
        """Converts number to Indian English words."""
        try:
            return num2words(amount, to="cardinal", lang="en_IN").title() + " Rupees"
        except Exception as e:
            Logger.warning("Error converting number to words", amount=amount, error=str(e))
            return ""

    @staticmethod
    def _send_relieving_letter_email(employee_name: str, employee_email: str, pdf_path: str, pdf_filename: str) -> None:
        """Sends relieving letter email with PDF attachment."""
        Logger.info("Sending relieving letter email", employee_name=employee_name, employee_email=employee_email)
        
        subject = "Your Relieving Letter – FlairMinds"
        body = f"<html><body><p>Dear {employee_name},</p><p>Please find your relieving letter attached.</p><p>Best regards,<br>FlairMinds Team</p></body></html>"
        
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
            Logger.info("Relieving letter email sent successfully", employee_email=employee_email)
        except Exception as e:
            Logger.error("SMTP error sending relieving letter email", employee_email=employee_email, error=str(e))
            raise
