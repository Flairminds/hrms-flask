"""
Blob-based Document Service for Employee Documents.

This service handles employee document operations using Azure Blob Storage
instead of database binary storage. It manages:
- Document uploads to Azure Blob Storage
- Document downloads with blob URLs or binary data
- Document deletion from blob storage and database
- Document verification status
- SAS URL generation for secure viewing
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from flask import current_app
from werkzeug.datastructures import FileStorage
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from ... import db
from ...models.documents import EmployeeDocument
from ...services.azure_blob_service import AzureBlobService
from ...utils.blob_utils import BlobUtils
from ...utils.logger import Logger


class BlobDocumentService:
    """Service for blob-based employee document operations."""

    VALID_DOC_TYPES = ["tenth", "twelve", "pan", "adhar", "grad", "resume"]

    @staticmethod
    def upload_document_to_blob(
        emp_id: str,
        doc_type: str,
        file_storage: FileStorage,
        container_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload employee document to Azure Blob Storage and save metadata to database.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type (tenth, twelve, pan, etc.)
            file_storage: Uploaded file from Flask request
            container_name: Optional container name override
            
        Returns:
            Dictionary with document metadata
            
        Raises:
            ValueError: If validation fails
            SQLAlchemyError: If database operation fails
        """
        # Validation
        if not emp_id or not emp_id.strip():
            raise ValueError("Employee ID is required")
        
        if doc_type not in BlobDocumentService.VALID_DOC_TYPES:
            raise ValueError(
                f"Invalid document type. Must be one of: {', '.join(BlobDocumentService.VALID_DOC_TYPES)}"
            )
        
        if not file_storage or file_storage.filename == "":
            raise ValueError("No file uploaded")
        
        if not BlobUtils.validate_file_type(file_storage.filename):
            raise ValueError(
                f"Invalid file type. Allowed: {', '.join(BlobUtils.ALLOWED_EXTENSIONS)}"
            )
        
        emp_id = emp_id.strip() if emp_id else ""
        doc_type = doc_type.strip() if doc_type else ""
        filename = file_storage.filename
        
        Logger.info(
            "Uploading document to blob storage",
            employee_id=emp_id,
            doc_type=doc_type,
            filename=filename
        )
        
        try:
            # Read file data
            file_data = file_storage.read()
            file_size = len(file_data)
            
            # Generate blob name
            blob_name = BlobUtils.generate_blob_name(emp_id, doc_type, filename)
            content_type = BlobUtils.get_content_type(filename)
            
            # Prepare metadata
            metadata = {
                'emp_id': emp_id,
                'doc_type': doc_type,
                'original_filename': filename,
                'uploaded_at': datetime.utcnow().isoformat()
            }
            
            # Upload to Azure Blob Storage
            blob_url = AzureBlobService.upload_blob(
                blob_name=blob_name,
                file_data=file_data,
                content_type=content_type,
                container_name=container_name,
                metadata=metadata
            )
            
            # Check if document record exists
            existing_doc = EmployeeDocument.query.filter_by(
                emp_id=emp_id,
                doc_type=doc_type
            ).first()
            
            Logger.debug("Calculated blob names", new_blob_name=f"[{blob_name}]", existing=f"[{existing_doc.blob_name if existing_doc else 'None'}]")
            
            if existing_doc:
                # Delete old blob if it exists
                if existing_doc.blob_name != blob_name:
                    try:
                        AzureBlobService.delete_blob(
                            existing_doc.blob_name,
                            existing_doc.container_name
                        )
                    except Exception as e:
                        Logger.warning(
                            "Failed to delete old blob",
                            blob_name=existing_doc.blob_name,
                            error=str(e)
                        )
                
                # Update existing record
                existing_doc.blob_name = blob_name
                existing_doc.container_name = container_name or current_app.config.get('AZURE_STORAGE_CONTAINER_NAME', 'employee-documents')
                existing_doc.blob_url = blob_url
                existing_doc.file_name = filename
                existing_doc.file_size = file_size
                existing_doc.content_type = content_type
                existing_doc.is_verified = None  # Reset verification
                existing_doc.verified_at = None
                existing_doc.verified_by = None
                existing_doc.uploaded_at = datetime.utcnow()
                
                Logger.info("Updated existing document record", employee_id=emp_id, doc_type=doc_type)
            else:
                # Create new record
                new_doc = EmployeeDocument(
                    emp_id=emp_id,
                    doc_type=doc_type,
                    blob_name=blob_name,
                    container_name=container_name or current_app.config.get('AZURE_STORAGE_CONTAINER_NAME', 'employee-documents'),
                    blob_url=blob_url,
                    file_name=filename,
                    file_size=file_size,
                    content_type=content_type,
                    uploaded_at=datetime.utcnow()
                )
                db.session.add(new_doc)
                Logger.info("Created new document record", employee_id=emp_id, doc_type=doc_type)
            
            db.session.commit()
            
            result = EmployeeDocument.query.filter_by(emp_id=emp_id, doc_type=doc_type).first()
            
            Logger.info(
                "Document uploaded successfully",
                employee_id=emp_id,
                doc_type=doc_type,
                blob_name=blob_name,
                size=file_size
            )
            
            return result.to_dict()
            
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Database integrity error uploading document", error=str(e))
            raise ValueError("Document upload failed due to database constraint")
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error uploading document", error=str(e))
            raise
        except Exception as e:
            db.session.rollback()
            # Try to clean up blob if database operation failed
            try:
                if 'blob_name' in locals():
                    AzureBlobService.delete_blob(blob_name, container_name)
            except:
                pass
            Logger.error("Error uploading document to blob", error=str(e))
            raise

    @staticmethod
    def get_document_from_blob(emp_id: str, doc_type: str) -> Tuple[bytes, str]:
        """
        Retrieve document from Azure Blob Storage.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type
            
        Returns:
            Tuple of (file_data, filename)
            
        Raises:
            ValueError: If document type is invalid
            FileNotFoundError: If document not found
        """
        emp_id = emp_id.strip() if emp_id else ""
        doc_type = doc_type.strip() if doc_type else ""
        
        if doc_type not in BlobDocumentService.VALID_DOC_TYPES:
            raise ValueError(
                f"Invalid document type. Must be one of: {', '.join(BlobDocumentService.VALID_DOC_TYPES)}"
            )
        
        Logger.debug("Retrieving document from blob", employee_id=emp_id, doc_type=doc_type)
        
        try:
            # Get document metadata from database
            doc = EmployeeDocument.query.filter_by(emp_id=emp_id, doc_type=doc_type).first()
            
            if not doc:
                raise FileNotFoundError(f"Document {doc_type} not found for employee {emp_id}")
            
            # Download from blob storage
            file_data = AzureBlobService.download_blob(doc.blob_name, doc.container_name)
            
            Logger.info(
                "Document retrieved successfully",
                employee_id=emp_id,
                doc_type=doc_type,
                size=len(file_data)
            )
            
            return file_data, doc.file_name
            
        except FileNotFoundError:
            raise
        except Exception as e:
            Logger.error("Error retrieving document from blob", error=str(e))
            raise

    @staticmethod
    def delete_document_from_blob(emp_id: str, doc_type: str) -> bool:
        """
        Delete document from Azure Blob Storage and database.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type
            
        Returns:
            True if deleted successfully
            
        Raises:
            ValueError: If parameters invalid
        """
        emp_id = emp_id.strip() if emp_id else ""
        doc_type = doc_type.strip() if doc_type else ""
        
        if not emp_id or doc_type not in BlobDocumentService.VALID_DOC_TYPES:
            raise ValueError("Invalid parameters for document deletion")
        
        Logger.info("Deleting document from blob", employee_id=emp_id, doc_type=doc_type)
        
        try:
            # Get document metadata
            doc = EmployeeDocument.query.filter_by(emp_id=emp_id, doc_type=doc_type).first()
            
            if not doc:
                Logger.warning("Document not found for deletion", employee_id=emp_id, doc_type=doc_type)
                return False
            
            # Delete from blob storage
            blob_deleted = AzureBlobService.delete_blob(doc.blob_name, doc.container_name)
            
            # Delete from database
            db.session.delete(doc)
            db.session.commit()
            
            Logger.info("Document deleted successfully", employee_id=emp_id, doc_type=doc_type)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting document", error=str(e))
            raise
        except Exception as e:
            Logger.error("Error deleting document", error=str(e))
            raise

    @staticmethod
    def generate_document_view_url(
        emp_id: str,
        doc_type: str,
        expiry_hours: int = 1
    ) -> str:
        """
        Generate temporary SAS URL for viewing document.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type
            expiry_hours: Hours until URL expires
            
        Returns:
            SAS URL for temporary access
            
        Raises:
            FileNotFoundError: If document not found
        """
        Logger.debug("Generating view URL", employee_id=emp_id, doc_type=doc_type)
        
        try:
            # Get document metadata
            doc = EmployeeDocument.query.filter_by(emp_id=emp_id, doc_type=doc_type).first()
            
            if not doc:
                raise FileNotFoundError(f"Document {doc_type} not found for employee {emp_id}")
            
            # Generate SAS URL
            sas_url = AzureBlobService.generate_sas_url(
                blob_name=doc.blob_name,
                expiry_hours=expiry_hours,
                container_name=doc.container_name
            )
            
            Logger.info("View URL generated", employee_id=emp_id, doc_type=doc_type)
            return sas_url
            
        except FileNotFoundError:
            raise
        except Exception as e:
            Logger.error("Error generating view URL", error=str(e))
            raise

    @staticmethod
    def verify_document_blob(
        emp_id: str,
        doc_type: str,
        is_verified: bool,
        verified_by: Optional[str] = None
    ) -> bool:
        """
        Update document verification status.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type
            is_verified: Verification status
            verified_by: Employee ID of verifier
            
        Returns:
            True if updated successfully
        """
        if not emp_id or doc_type not in BlobDocumentService.VALID_DOC_TYPES:
            raise ValueError("Invalid parameters")
        
        Logger.info("Updating verification status", employee_id=emp_id, doc_type=doc_type, is_verified=is_verified)
        
        try:
            doc = EmployeeDocument.query.filter_by(emp_id=emp_id, doc_type=doc_type).first()
            
            if not doc:
                raise ValueError("Document not found")
            
            doc.is_verified = is_verified
            doc.verified_at = datetime.utcnow() if is_verified is not None else None
            doc.verified_by = verified_by
            
            db.session.commit()
            
            Logger.info("Verification status updated", employee_id=emp_id, doc_type=doc_type)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error updating verification", error=str(e))
            raise

    @staticmethod
    def get_document_metadata(emp_id: str, doc_type: str) -> Dict[str, Any]:
        """
        Get document metadata without downloading file.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type
            
        Returns:
            Document metadata dictionary
        """
        doc = EmployeeDocument.query.filter_by(emp_id=emp_id, doc_type=doc_type).first()
        
        if not doc:
            raise FileNotFoundError(f"Document {doc_type} not found for employee {emp_id}")
        
        return doc.to_dict()

    @staticmethod
    def list_employee_documents(emp_id: str) -> List[Dict[str, Any]]:
        """
        List all documents for an employee.
        
        Args:
            emp_id: Employee ID
            
        Returns:
            List of document metadata dictionaries
        """
        docs = EmployeeDocument.query.filter_by(emp_id=emp_id).all()
        return [doc.to_dict() for doc in docs]

    @staticmethod
    def get_all_employees_docs_status() -> List[Dict[str, Any]]:
        """
        Get document status for all employees.
        
        Returns:
            List of employee document status summaries
        """
        from ...models.hr import Employee
        
        try:
            # Get all employees with their documents
            employees = Employee.query.all()
            result = []
            
            for emp in employees:
                docs = EmployeeDocument.query.filter_by(emp_id=emp.employee_id).all()
                
                # Create status map
                doc_status = {doc_type: False for doc_type in BlobDocumentService.VALID_DOC_TYPES}
                for doc in docs:
                    doc_status[doc.doc_type] = True
                
                name = f"{emp.first_name or ''} {emp.middle_name or ''} {emp.last_name or ''}".replace("  ", " ").strip()
                
                result.append({
                    'emp_id': emp.employee_id,
                    'name': name,
                    **doc_status
                })
            
            return result
            
        except Exception as e:
            Logger.error("Error getting all employees docs status", error=str(e))
            raise
