"""
Azure Blob Storage utility functions for document management.

This module provides helper functions for:
- Generating unique blob names
- Content type detection
- File validation
- Filename sanitization
"""

import os
import re
from typing import Optional
from werkzeug.utils import secure_filename


class BlobUtils:
    """Utility functions for Azure Blob Storage operations."""

    # Allowed file extensions for employee documents
    ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'}
    
    # MIME type mappings
    CONTENT_TYPE_MAP = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }

    @staticmethod
    def generate_blob_name(emp_id: str, doc_type: str, filename: str) -> str:
        """
        Generate a unique blob name for document storage.
        
        Format: {emp_id}/{doc_type}/{sanitized_filename}
        Example: EMP001/pan/pan_card.pdf
        
        Args:
            emp_id: Employee ID
            doc_type: Document type (tenth, twelve, pan, etc.)
            filename: Original filename
            
        Returns:
            Unique blob name with path structure
        """
        sanitized = BlobUtils.sanitize_filename(filename)
        extension = BlobUtils._get_file_extension(filename)
        
        # Create structured blob name: emp_id/doc_type/filename
        blob_name = f"{emp_id}/{doc_type}/{doc_type}_{sanitized}"
        
        return blob_name

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename for safe blob storage.
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename safe for blob storage
        """
        # Use werkzeug's secure_filename for basic sanitization
        safe_name = secure_filename(filename)
        
        # Additional sanitization: remove special characters
        safe_name = re.sub(r'[^\w\s.-]', '', safe_name)
        
        # Replace spaces with underscores
        safe_name = safe_name.replace(' ', '_')
        
        # Limit length to 100 characters
        name_part, ext = os.path.splitext(safe_name)
        if len(name_part) > 100:
            name_part = name_part[:100]
        
        return f"{name_part}{ext}".lower()

    @staticmethod
    def get_content_type(filename: str) -> str:
        """
        Determine MIME type from filename extension.
        
        Args:
            filename: Filename with extension
            
        Returns:
            MIME type string (defaults to application/octet-stream)
        """
        extension = BlobUtils._get_file_extension(filename)
        return BlobUtils.CONTENT_TYPE_MAP.get(extension, 'application/octet-stream')

    @staticmethod
    def validate_file_type(filename: str, allowed_extensions: Optional[set] = None) -> bool:
        """
        Validate if file extension is allowed.
        
        Args:
            filename: Filename to validate
            allowed_extensions: Set of allowed extensions (defaults to ALLOWED_EXTENSIONS)
            
        Returns:
            True if file type is allowed, False otherwise
        """
        if allowed_extensions is None:
            allowed_extensions = BlobUtils.ALLOWED_EXTENSIONS
            
        extension = BlobUtils._get_file_extension(filename)
        return extension in allowed_extensions

    @staticmethod
    def _get_file_extension(filename: str) -> str:
        """
        Extract file extension from filename.
        
        Args:
            filename: Filename with extension
            
        Returns:
            Lowercase file extension without dot
        """
        if '.' not in filename:
            return ''
        return filename.rsplit('.', 1)[1].lower()

    @staticmethod
    def parse_blob_name(blob_name: str) -> dict:
        """
        Parse blob name to extract components.
        
        Args:
            blob_name: Blob name in format emp_id/doc_type/filename
            
        Returns:
            Dict with emp_id, doc_type, filename keys
        """
        parts = blob_name.split('/')
        if len(parts) == 3:
            return {
                'emp_id': parts[0],
                'doc_type': parts[1],
                'filename': parts[2]
            }
        return {
            'emp_id': None,
            'doc_type': None,
            'filename': blob_name
        }

    @staticmethod
    def get_employee_blob_prefix(emp_id: str) -> str:
        """
        Get blob prefix for all employee documents.
        
        Args:
            emp_id: Employee ID
            
        Returns:
            Blob prefix for listing employee documents
        """
        return f"{emp_id}/"

    @staticmethod
    def get_document_blob_prefix(emp_id: str, doc_type: str) -> str:
        """
        Get blob prefix for specific document type.
        
        Args:
            emp_id: Employee ID
            doc_type: Document type
            
        Returns:
            Blob prefix for specific document type
        """
        return f"{emp_id}/{doc_type}/"
