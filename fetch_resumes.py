import os
from sqlalchemy import text
from app import create_app, db
from app.models.hr import Employee
from app.models.documents import EmployeeDocument
from app.services.document.blob_document_service import BlobDocumentService

def fetch_resumes():
    app = create_app(os.getenv('FLASK_CONFIG', 'dev'))
    with app.app_context():
        # define output dir
        output_dir = os.path.join(os.getcwd(), 'employee_resumes')
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        print(f"Directory ready at: {output_dir}")

        # Get all resumes
        documents = db.session.query(
            EmployeeDocument, Employee
        ).join(
            Employee, EmployeeDocument.emp_id == Employee.employee_id
        ).filter(
            EmployeeDocument.doc_type == 'resume'
        ).all()

        print(f"Found {len(documents)} resumes. Starting download...")

        success_count = 0
        for doc, emp in documents:
            try:
                # Format uploaded_at (DD.MM.YYYY)
                date_str = doc.uploaded_at.strftime("%d.%m.%Y") if doc.uploaded_at else "UnknownDate"
                
                # Fetch first name and last name
                first_name = emp.first_name.strip() if emp.first_name else ""
                last_name = emp.last_name.strip() if emp.last_name else ""
                
                # Extract original extension from file_name if possible to append to new file
                ext = ""
                if doc.file_name and '.' in doc.file_name:
                    ext = "." + doc.file_name.rsplit('.', 1)[-1]
                
                # Construct filename
                new_filename = f"{first_name}{last_name}_resume_{date_str}{ext}"
                new_filename = new_filename.replace(" ", "")  # Removing any spaces just in case
                
                # Fetch data and blob_url to display
                blob_url = doc.blob_url
                print(f"\nProcessing employee: {emp.employee_id} ({first_name} {last_name})")
                print(f"  URL: {blob_url}")
                
                file_data, _ = BlobDocumentService.get_document_from_blob(emp.employee_id, 'resume')
                
                file_path = os.path.join(output_dir, new_filename)
                with open(file_path, "wb") as f:
                    f.write(file_data)
                
                print(f"  Downloaded: {new_filename}")
                success_count += 1
                
            except Exception as e:
                print(f"  Failed to download resume for Employee {emp.employee_id} ({first_name} {last_name}): {str(e)}")
        
        print(f"\nCompleted! Successfully downloaded {success_count} out of {len(documents)} resumes.")

if __name__ == "__main__":
    fetch_resumes()
