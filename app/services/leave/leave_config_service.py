from typing import List, Dict, Any, Optional
from datetime import datetime
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
            holidays = Holiday.query.filter_by(is_active=True).all()
            return [
                {
                    "HolidayDate": h.holiday_date.strftime('%Y-%m-%d') if h.holiday_date else '',
                    "HolidayName": h.holiday_name
                }
                for h in holidays
            ]
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
                holiday_name=holiday_name,
                is_active=True
            )
            db.session.add(new_holiday)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting holiday", holiday_name=holiday_name, error=str(e))
            return False
