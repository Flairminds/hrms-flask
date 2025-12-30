from typing import List, Dict, Any
from sqlalchemy import text
from ... import db
from ...utils.logger import Logger

class ReportService:
    @staticmethod
    def get_monthly_report(month: int, year: int) -> List[Dict[str, Any]]:
        """
        Generates a monthly report for attendance/payroll.
        Executes the 'GetMonthlyReport' stored procedure.
        """
        try:
            Logger.info("Fetching monthly report", month=month, year=year)
            query = text("EXEC GetMonthlyReport @Month = :month, @Year = :year")
            result = db.session.execute(query, {'month': month, 'year': year})
            # Stored procedure results are often complex - mapping to dict
            return [dict(row._mapping) for row in result]
        except Exception as e:
            Logger.error("Error fetching monthly report", error=str(e))
            return []
