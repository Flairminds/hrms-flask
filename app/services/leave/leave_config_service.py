from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import extract, or_
from sqlalchemy.exc import SQLAlchemyError

from ... import db
from ...models.leave import Holiday
from ...utils.logger import Logger

class LeaveConfigService:
    @staticmethod
    def get_holidays() -> List[Dict[str, Any]]:
        """
        Retrieves the list of active holidays using ORM.
        """
        try:
            now = datetime.now()
            current_year = now.year
            three_months_later = now + timedelta(days=92)  # Approximately 3 months
            
            holidays = Holiday.query.filter(
                Holiday.is_deleted == False,
                or_(
                    extract('year', Holiday.holiday_date) == current_year,
                    Holiday.holiday_date <= three_months_later
                )
            ).filter(
                # Ensure we don't fetch extremely old holidays unless they are in the current year
                # Actually, the requirement "this year only" was just updated to "this year + 3 months"
                # so we should probably keep holidays from the start of the current year.
                Holiday.holiday_date >= datetime(current_year, 1, 1)
            ).order_by(Holiday.holiday_date.asc()).all()
            return holidays
        except Exception as e:
            Logger.error("Error retrieving holidays", error=str(e))
            raise e

    @staticmethod
    def insert_holiday(holiday_date: datetime, holiday_name: str) -> bool:
        """
        Inserts a new holiday into the holiday table using ORM.
        """
        try:
            new_holiday = Holiday(
                holiday_date=holiday_date,
                holiday_name=holiday_name
            )
            db.session.add(new_holiday)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting holiday", holiday_name=holiday_name, error=str(e))
            return False
