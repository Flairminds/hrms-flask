from pdf2docx import Converter
import sys
import os

def convert_pdf_to_docx(pdf_file, docx_file):
    print(f"Converting {pdf_file} to {docx_file}...")
    try:
        cv = Converter(pdf_file)
        cv.convert(docx_file)
        cv.close()
        print("Conversion successful.")
    except Exception as e:
        print(f"Error during conversion: {e}")
        sys.exit(1)

if __name__ == "__main__":
    pdf_path = '/Users/punit/Desktop/development/hrms-flask/employee_resumes/AbhinavVaidya_resume_02.03.2026.pdf'
    docx_path = '/Users/punit/Desktop/development/hrms-flask/employee_resumes/AbhinavVaidya_resume_02.03.2026.docx'
    
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        sys.exit(1)
        
    convert_pdf_to_docx(pdf_path, docx_path)
