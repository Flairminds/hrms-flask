import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import styles from './HolidayPage.module.css';
import { holidayListData } from '../../services/api';
import { convertDate, getWeekDay } from '../../util/helperFunctions';

function HolidayPage() {
  const [holidayData, setHolidayData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getHolidayList = async () => {
    try {
      const res = await holidayListData();

      // Define the date range
      const startDate = new Date("2025-05-01");
      const endDate = new Date("2026-03-04");

      // Convert date strings to Date objects and filter
      const filteredData = res.data.filter((holiday) => {
        const holidayDateParts = holiday.holidayDate.split('-'); // ["01", "05", "2025"]
        const formattedDate = new Date(`${holidayDateParts[2]}-${holidayDateParts[1]}-${holidayDateParts[0]}`);

        return formattedDate >= startDate && formattedDate <= endDate;
      });

      setHolidayData(filteredData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching holiday data:', err);
      setError('Failed to fetch holiday data');
      setLoading(false);
    }
  };


  useEffect(() => {
    getHolidayList();
  }, []);

  const filteredHolidays = searchQuery
    ? holidayData.filter(
      (holiday) =>
        holiday.holidayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        holiday.holidayDate.includes(searchQuery)
    )
    : holidayData;


  const columns = [
    { key: 'Holiday Date', title: 'Holiday Date' },
    { key: 'Holiday Name', title: 'Holiday Name' },
  ];
  return (
    <div className={styles.mainContainer}>
      <div className={styles.mainBlock}>
        <div className={styles.message}>
          <span className={styles.headingText}>
            *The following holiday list is applicable only for associates who are not allocated to any particular project.
            Those who are allocated to projects need to follow customer holidays. Please refer to leave policy.*
          </span>
        </div>

        <div className={styles.searchContainer}>
          <div>
            <input
              type="text"
              placeholder="Search holidays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <button className={styles.csvBtn}>
            <CSVLink
              data={filteredHolidays}
              headers={[
                { label: 'Holiday Date', key: 'holidayDate' },
                { label: 'Holiday Name', key: 'holidayName' },
              ]}
              filename="holiday_list.csv"
              className={styles.downloadButton}
            >
              Download
            </CSVLink>
          </button>
        </div>


        <div className={styles.tableDiv}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.stickyHeader}>
                <tr className={styles.headRow}>
                  {columns.map((column, index) => (
                    <th className={styles.th} key={index}>{column.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.map((holiday) => (
                  <tr key={`${holiday.holidayDate}-${holiday.holidayName}`}>
                    <td className={styles.td}>{convertDate(holiday.holidayDate)} ({getWeekDay(holiday.holidayDate)})</td>
                    <td className={styles.td}>{holiday.holidayName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HolidayPage;
