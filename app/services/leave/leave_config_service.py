from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import extract, and_, or_
from sqlalchemy.exc import SQLAlchemyError

from ... import db
from ...models.leave import Holiday
from ...utils.logger import Logger
from .leave_utils import LeaveUtils

class LeaveConfigService:
    @staticmethod
    def get_holidays() -> List[Dict[str, Any]]:
        """
        Retrieves the list of active holidays using ORM.
        """
        try:
            now = datetime.now()
            current_year = now.year
            current_month = now.month
            two_months_later = now + timedelta(days=60)  # Approximately 2 months
            start_date, end_date = LeaveUtils.get_financial_year_dates(current_year, current_month)
            holidays = Holiday.query.filter(
                Holiday.is_deleted == False,
                and_(
                    Holiday.holiday_date >= start_date,
                    or_(
                        Holiday.holiday_date <= end_date,
                        # Holiday.holiday_date <= two_months_later
                    )
                )
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

    @staticmethod
    def get_all_holidays() -> List[Dict[str, Any]]:
        """
        Retrieves all non-deleted holidays (for HR management view).
        """
        try:
            holidays = Holiday.query.filter(
                Holiday.is_deleted == False
            ).order_by(Holiday.holiday_date.desc()).all()
            return holidays
        except Exception as e:
            Logger.error("Error retrieving all holidays", error=str(e))
            raise e

    @staticmethod
    def update_holiday(holiday_id: int, holiday_date: datetime, holiday_name: str) -> bool:
        """
        Updates an existing holiday's date and name.
        """
        try:
            holiday = Holiday.query.filter_by(holiday_id=holiday_id, is_deleted=False).first()
            if not holiday:
                return False
            holiday.holiday_date = holiday_date
            holiday.holiday_name = holiday_name
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating holiday", holiday_id=holiday_id, error=str(e))
            return False

    @staticmethod
    def delete_holiday(holiday_id: int) -> bool:
        """
        Soft-deletes a holiday by setting is_deleted = True.
        """
        try:
            holiday = Holiday.query.filter_by(holiday_id=holiday_id, is_deleted=False).first()
            if not holiday:
                return False
            holiday.is_deleted = True
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error deleting holiday", holiday_id=holiday_id, error=str(e))
            return False
