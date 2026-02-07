from datetime import datetime
import pandas as pd

def normalize_date_str(date_obj) -> str:
    """
    Normalizes a date object (string, datetime, Timestamp) to 'DD-MM-YYYY' string format.
    Returns None if parsing fails.
    """
    if date_obj is None or str(date_obj).strip() == '' or str(date_obj).lower() == 'nan':
        return None
        
    try:
        # If it's already a datetime or Timestamp
        if isinstance(date_obj, (datetime, pd.Timestamp)):
            return date_obj.strftime('%d-%m-%Y')
            
        # If string, try to parse
        date_str = str(date_obj).strip()
        
        # Try common formats
        formats = [
            '%Y-%m-%d %H:%M:%S', # Default SQL/Pandas string
            '%Y-%m-%d',
            '%d-%m-%Y',
            '%d/%m/%Y',
            '%m/%d/%Y',
            '%d-%b-%Y', # 01-Jan-2024
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%d-%m-%Y')
            except ValueError:
                continue
                
        # If all else fails, try pandas to_datetime which is robust
        try:
            dt = pd.to_datetime(date_str)
            return dt.strftime('%d-%m-%Y')
        except:
            pass
            
        return None
        
    except Exception:
        return None
