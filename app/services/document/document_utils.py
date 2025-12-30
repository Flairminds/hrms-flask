import os
from datetime import datetime
from flask import current_app
from ...utils.logger import Logger

class DocumentUtils:
    """Utility class for document-related operations."""

    @staticmethod
    def ensure_upload_folder() -> str:
        """
        Ensures upload folder exists.
        
        Creates folder if it doesn't exist.
        
        Returns:
            Absolute path to upload folder
        """
        upload_folder = current_app.config.get("UPLOAD_FOLDER")
        if not upload_folder:
            upload_folder = os.path.join(current_app.root_path, "uploads")
        
        os.makedirs(upload_folder, exist_ok=True)
        Logger.debug("Upload folder ensured", path=upload_folder)
        return upload_folder

    @staticmethod
    def allowed_file(filename: str) -> bool:
        """
        Checks if file has valid PDF extension.
        
        Args:
            filename: Filename to check
        
        Returns:
            True if has .pdf extension
        """
        return "." in filename and filename.rsplit(".", 1)[1].lower() == "pdf"
