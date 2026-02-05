"""
Azure Blob Storage Service for employee document management.

This service handles all Azure Blob Storage operations including:
- Uploading files to blob storage
- Downloading files from blob storage
- Deleting blobs
- Generating SAS (Shared Access Signature) tokens for secure access
- Listing and managing blobs
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, BinaryIO
from io import BytesIO

from azure.storage.blob import (
    BlobServiceClient,
    BlobClient,
    ContainerClient,
    ContentSettings,
    generate_blob_sas,
    BlobSasPermissions
)
from azure.core.exceptions import (
    ResourceNotFoundError,
    ResourceExistsError,
    AzureError
)

from flask import current_app
from ..utils.logger import Logger


class AzureBlobService:
    """Service for Azure Blob Storage operations."""

    @staticmethod
    def _get_blob_service_client() -> BlobServiceClient:
        """
        Get authenticated BlobServiceClient instance.
        
        Uses connection string if available, otherwise falls back to account name + key.
        
        Returns:
            BlobServiceClient instance
            
        Raises:
            ValueError: If Azure credentials are not configured
        """
        connection_string = current_app.config.get('AZURE_STORAGE_CONNECTION_STRING')
        
        if connection_string:
            Logger.debug("Initializing BlobServiceClient with connection string")
            return BlobServiceClient.from_connection_string(connection_string)
        
        # Fallback to account name + key
        account_name = current_app.config.get('AZURE_STORAGE_ACCOUNT_NAME')
        account_key = current_app.config.get('AZURE_STORAGE_ACCOUNT_KEY')
        
        if not account_name or not account_key:
            error_msg = "Azure Storage credentials not configured. Set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY"
            Logger.error(error_msg)
            raise ValueError(error_msg)
        
        account_url = f"https://{account_name}.blob.core.windows.net"
        Logger.debug("Initializing BlobServiceClient with account URL", account_url=account_url)
        
        return BlobServiceClient(account_url=account_url, credential=account_key)


    @staticmethod
    def _get_container_client(container_name: Optional[str] = None) -> ContainerClient:
        """
        Get ContainerClient for specified container.
        
        Args:
            container_name: Container name (defaults to configured container)
            
        Returns:
            ContainerClient instance
        """
        if not container_name:
            container_name = current_app.config.get('AZURE_STORAGE_CONTAINER_NAME', 'employee-documents')
        
        Logger.debug("Getting container client", container_name=f"[{container_name}]")
        blob_service_client = AzureBlobService._get_blob_service_client()
        return blob_service_client.get_container_client(container_name)

    @staticmethod
    def _ensure_container_exists(container_name: Optional[str] = None) -> bool:
        """
        Ensure container exists, create if it doesn't.
        
        Args:
            container_name: Container name
            
        Returns:
            True if container exists or was created
        """
        try:
            container_client = AzureBlobService._get_container_client(container_name)
            
            if not container_client.exists():
                Logger.info("Creating container", container_name=container_name or 'default')
                container_client.create_container()
                Logger.info("Container created successfully", container_name=container_name or 'default')
            
            return True
            
        except ResourceExistsError:
            # Container already exists, this is fine
            return True
        except AzureError as e:
            Logger.error("Error ensuring container exists", error=str(e), container_name=container_name)
            raise

    @staticmethod
    def upload_blob(
        blob_name: str,
        file_data: bytes,
        content_type: str = 'application/octet-stream',
        container_name: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Upload file to Azure Blob Storage.
        
        Args:
            blob_name: Unique blob identifier (path)
            file_data: Binary file data
            content_type: MIME type of file
            container_name: Container name (optional)
            metadata: Additional metadata to store with blob
            
        Returns:
            Blob URL
            
        Raises:
            AzureError: If upload fails
        """
        try:
            Logger.debug("Uploading blob to container", blob_name=f"[{blob_name}]", container_name=f"[{container_name}]")
            AzureBlobService._ensure_container_exists(container_name)
            container_client = AzureBlobService._get_container_client(container_name)
            
            blob_client = container_client.get_blob_client(blob_name)
            
            Logger.info("Uploading blob", blob_name=blob_name, size=len(file_data))
            
            # Upload with overwrite=True to replace existing blob
            blob_client.upload_blob(
                file_data,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type),
                metadata=metadata
            )

            
            Logger.info("Blob uploaded successfully", blob_name=blob_name, url=blob_client.url)
            return blob_client.url
            
        except AzureError as e:
            Logger.error("Error uploading blob", blob_name=blob_name, error=str(e))
            raise

    @staticmethod
    def download_blob(blob_name: str, container_name: Optional[str] = None) -> bytes:
        """
        Download file from Azure Blob Storage.
        
        Args:
            blob_name: Blob identifier
            container_name: Container name (optional)
            
        Returns:
            Binary file data
            
        Raises:
            FileNotFoundError: If blob doesn't exist
            AzureError: If download fails
        """
        try:
            Logger.debug("Downloading blob from container", blob_name=f"[{blob_name}]", container_name=f"[{container_name}]")
            container_client = AzureBlobService._get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_name)
            
            Logger.debug("Downloading blob", blob_name=blob_name)
            
            download_stream = blob_client.download_blob()
            file_data = download_stream.readall()
            
            Logger.info("Blob downloaded successfully", blob_name=blob_name, size=len(file_data))
            return file_data
            
        except ResourceNotFoundError:
            Logger.warning("Blob not found", blob_name=blob_name)
            raise FileNotFoundError(f"Blob '{blob_name}' not found in container")
        except AzureError as e:
            Logger.error("Error downloading blob", blob_name=blob_name, error=str(e))
            raise

    @staticmethod
    def delete_blob(blob_name: str, container_name: Optional[str] = None) -> bool:
        """
        Delete blob from Azure Blob Storage.
        
        Args:
            blob_name: Blob identifier
            container_name: Container name (optional)
            
        Returns:
            True if deleted successfully
            
        Raises:
            AzureError: If deletion fails
        """
        try:
            container_client = AzureBlobService._get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_name)
            
            Logger.info("Deleting blob", blob_name=blob_name)
            blob_client.delete_blob()
            
            Logger.info("Blob deleted successfully", blob_name=blob_name)
            return True
            
        except ResourceNotFoundError:
            Logger.warning("Blob not found for deletion", blob_name=blob_name)
            return False
        except AzureError as e:
            Logger.error("Error deleting blob", blob_name=blob_name, error=str(e))
            raise

    @staticmethod
    def blob_exists(blob_name: str, container_name: Optional[str] = None) -> bool:
        """
        Check if blob exists.
        
        Args:
            blob_name: Blob identifier
            container_name: Container name (optional)
            
        Returns:
            True if blob exists, False otherwise
        """
        try:
            container_client = AzureBlobService._get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_name)
            
            return blob_client.exists()
            
        except AzureError as e:
            Logger.error("Error checking blob existence", blob_name=blob_name, error=str(e))
            return False

    @staticmethod
    def generate_sas_url(
        blob_name: str,
        expiry_hours: int = 1,
        container_name: Optional[str] = None,
        permissions: str = 'r'
    ) -> str:
        """
        Generate SAS (Shared Access Signature) URL for temporary blob access.
        
        Args:
            blob_name: Blob identifier
            expiry_hours: Hours until URL expires (default: 1 hour)
            container_name: Container name (optional)
            permissions: Permissions string ('r' for read, 'rw' for read+write)
            
        Returns:
            SAS URL with temporary access token
            
        Raises:
            ValueError: If account key is not available
        """
        try:
            if not container_name:
                container_name = current_app.config.get('AZURE_STORAGE_CONTAINER_NAME', 'employee-documents')
            
            account_name = current_app.config.get('AZURE_STORAGE_ACCOUNT_NAME')
            account_key = current_app.config.get('AZURE_STORAGE_ACCOUNT_KEY')
            
            if not account_name or not account_key:
                raise ValueError("Account name and key required for SAS URL generation")
            
            # Set permissions
            permission = BlobSasPermissions(read=True)
            if 'w' in permissions:
                permission.write = True
            
            # Calculate expiry time
            expiry_time = datetime.utcnow() + timedelta(hours=expiry_hours)
            
            Logger.debug("Generating SAS token", blob_name=blob_name, expiry_hours=expiry_hours)
            
            # Generate SAS token
            sas_token = generate_blob_sas(
                account_name=account_name,
                container_name=container_name,
                blob_name=blob_name,
                account_key=account_key,
                permission=permission,
                expiry=expiry_time
            )
            
            # Construct full URL
            blob_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"
            
            Logger.info("SAS URL generated", blob_name=blob_name, expires_in_hours=expiry_hours)
            return blob_url
            
        except Exception as e:
            Logger.error("Error generating SAS URL", blob_name=blob_name, error=str(e))
            raise

    @staticmethod
    def list_blobs(prefix: str = '', container_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List blobs in container with optional prefix filter.
        
        Args:
            prefix: Blob name prefix to filter (e.g., 'EMP001/')
            container_name: Container name (optional)
            
        Returns:
            List of blob metadata dictionaries
        """
        try:
            container_client = AzureBlobService._get_container_client(container_name)
            
            Logger.debug("Listing blobs", prefix=prefix or 'all')
            
            blob_list = []
            for blob in container_client.list_blobs(name_starts_with=prefix):
                blob_list.append({
                    'name': blob.name,
                    'size': blob.size,
                    'created': blob.creation_time,
                    'modified': blob.last_modified,
                    'content_type': blob.content_settings.content_type if blob.content_settings else None,
                    'metadata': blob.metadata
                })
            
            Logger.info("Blobs listed", count=len(blob_list), prefix=prefix or 'all')
            return blob_list
            
        except AzureError as e:
            Logger.error("Error listing blobs", prefix=prefix, error=str(e))
            raise

    @staticmethod
    def get_blob_metadata(blob_name: str, container_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get blob properties and metadata without downloading.
        
        Args:
            blob_name: Blob identifier
            container_name: Container name (optional)
            
        Returns:
            Dictionary with blob properties
            
        Raises:
            FileNotFoundError: If blob doesn't exist
        """
        try:
            container_client = AzureBlobService._get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_name)
            
            properties = blob_client.get_blob_properties()
            
            return {
                'name': blob_name,
                'size': properties.size,
                'created': properties.creation_time,
                'modified': properties.last_modified,
                'content_type': properties.content_settings.content_type if properties.content_settings else None,
                'metadata': properties.metadata,
                'etag': properties.etag
            }
            
        except ResourceNotFoundError:
            Logger.warning("Blob not found", blob_name=blob_name)
            raise FileNotFoundError(f"Blob '{blob_name}' not found")
        except AzureError as e:
            Logger.error("Error getting blob metadata", blob_name=blob_name, error=str(e))
            raise
