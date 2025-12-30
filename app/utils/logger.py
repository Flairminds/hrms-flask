"""
Centralized logging service for HRMS application.

Currently uses print statements but designed to be easily extended
to use Python's logging module or external logging services.

Usage:
    from app.utils.logger import Logger
    
    Logger.info("User logged in", user_id="EMP001")
    Logger.error("Database error occurred", error=str(e))
    Logger.debug("Processing request", data=payload)
"""

import json
from datetime import datetime
from typing import Any, Optional


class Logger:
    """
    Centralized logging service.
    
    All logging in the application should go through this service
    to maintain consistency and enable easy migration to advanced
    logging frameworks in the future.
    """
    
    # Log levels
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    
    # Enable/disable debug logging (can be controlled via config)
    _debug_enabled = True
    
    @staticmethod
    def _format_message(level: str, message: str, **kwargs) -> str:
        """
        Format log message with timestamp and metadata.
        
        Args:
            level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            message: Main log message
            **kwargs: Additional metadata to include in log
            
        Returns:
            Formatted log string
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Build the log message
        log_parts = [f"[{timestamp}]", f"[{level}]", message]
        
        # Add metadata if provided
        if kwargs:
            metadata = []
            for key, value in kwargs.items():
                # Handle different types of values
                if isinstance(value, (dict, list)):
                    value_str = json.dumps(value)
                else:
                    value_str = str(value)
                metadata.append(f"{key}={value_str}")
            
            if metadata:
                log_parts.append(f"| {', '.join(metadata)}")
        
        return " ".join(log_parts)
    
    @staticmethod
    def _log(level: str, message: str, **kwargs):
        """
        Internal logging method.
        
        This is where you can add integration with Python's logging module,
        file handlers, external logging services (e.g., CloudWatch, Sentry), etc.
        """
        formatted_message = Logger._format_message(level, message, **kwargs)
        
        # TODO: Future enhancement - Add Python logging integration here
        # import logging
        # logger = logging.getLogger(__name__)
        # logger.log(level, formatted_message)
        
        # For now, just print to console
        print(formatted_message)
    
    @staticmethod
    def debug(message: str, **kwargs):
        """
        Log debug-level message.
        
        Use for detailed diagnostic information, typically only
        enabled during development or troubleshooting.
        
        Args:
            message: Debug message
            **kwargs: Additional context/metadata
            
        Example:
            Logger.debug("Processing employee data", employee_id="EMP001", step="validation")
        """
        if Logger._debug_enabled:
            Logger._log(Logger.DEBUG, message, **kwargs)
    
    @staticmethod
    def info(message: str, **kwargs):
        """
        Log informational message.
        
        Use for general informational messages about application flow.
        
        Args:
            message: Info message
            **kwargs: Additional context/metadata
            
        Example:
            Logger.info("Employee created successfully", employee_id="EMP001")
        """
        Logger._log(Logger.INFO, message, **kwargs)
    
    @staticmethod
    def warning(message: str, **kwargs):
        """
        Log warning message.
        
        Use for potentially harmful situations that don't prevent
        the application from working.
        
        Args:
            message: Warning message
            **kwargs: Additional context/metadata
            
        Example:
            Logger.warning("Employee not found, using default", employee_id="EMP001")
        """
        Logger._log(Logger.WARNING, message, **kwargs)
    
    @staticmethod
    def error(message: str, **kwargs):
        """
        Log error message.
        
        Use for error conditions that don't crash the application
        but indicate a problem.
        
        Args:
            message: Error message
            **kwargs: Additional context/metadata
            
        Example:
            Logger.error("Database query failed", query="get_employee", error=str(e))
        """
        Logger._log(Logger.ERROR, message, **kwargs)
    
    @staticmethod
    def critical(message: str, **kwargs):
        """
        Log critical message.
        
        Use for very serious errors that may prevent the
        application from continuing.
        
        Args:
            message: Critical error message
            **kwargs: Additional context/metadata
            
        Example:
            Logger.critical("Database connection lost", error=str(e))
        """
        Logger._log(Logger.CRITICAL, message, **kwargs)
    
    @staticmethod
    def set_debug_enabled(enabled: bool):
        """
        Enable or disable debug logging.
        
        Args:
            enabled: True to enable debug logs, False to disable
        """
        Logger._debug_enabled = enabled


# Convenience function for backward compatibility
def log_error(message: str, **kwargs):
    """
    Convenience function for error logging.
    
    Args:
        message: Error message
        **kwargs: Additional metadata
    """
    Logger.error(message, **kwargs)


def log_info(message: str, **kwargs):
    """
    Convenience function for info logging.
    
    Args:
        message: Info message
        **kwargs: Additional metadata
    """
    Logger.info(message, **kwargs)
