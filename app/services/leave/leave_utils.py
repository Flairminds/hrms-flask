from datetime import date
from typing import Tuple

class LeaveUtils:
    @staticmethod
    def get_financial_year_dates(year: int, month: int = None) -> Tuple[date, date]:
        """
        Calculates financial year start and end dates for given year.
        
        Financial year runs from March 31 of given year to March 31 of next year.
        Replicates the GetFinancialYearDates function from SQL Server.
        
        Args:
            year: The starting year of the financial year.
            
        Returns:
            Tuple containing start_date and end_date.
        """
        # Matches SQL: DATEFROMPARTS(@Year, 3, 31) and DATEFROMPARTS(@Year + 1, 3, 31)
        if year is None:
            year = datetime.now().year
        if month is None:
            start_date = date(year, 3, 31)
            end_date = date(year + 1, 3, 31)
        elif month > 3:
            start_date = date(year, 3, 31)
            end_date = date(year + 1, 3, 31)
        else:
            start_date = date(year - 1, 3, 31)
            end_date = date(year, 3, 31)
        return start_date, end_date
