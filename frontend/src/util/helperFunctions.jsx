// function to convert date to DD-Mmm-YYYY format in Indian Standard Time
export const convertDate = (date) => {
    // date format from api is dd-mm-yyyy
    let d = new Date(date);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
}

export const getWeekDay = (date) => {
    // date format from api is dd-mm-yyyy
    let d = new Date(date);
    const options = { weekday: 'long' };
    return d.toLocaleDateString('en-IN', options);
}

/**
 * Filters holidays to only show upcoming holidays within the next 3 months.
 * @param {Array} holidays - Array of holiday objects with holiday_date in DD-MM-YYYY format
 * @returns {Array} - Filtered array of upcoming holidays
 */
export const filterUpcomingHolidays = (holidays) => {
    if (!holidays || !Array.isArray(holidays)) {
        return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate date 3 months from today
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    return holidays.filter(holiday => {
        const [day, month, year] = holiday.holiday_date.split('-');
        const holidayDate = new Date(`${year}-${month}-${day}`);
        holidayDate.setHours(0, 0, 0, 0);

        // Check if holiday is today or in the future AND within next 3 months
        return holidayDate >= today && holidayDate <= threeMonthsLater;
    });
}