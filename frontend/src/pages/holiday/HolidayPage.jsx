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
      setHolidayData(res.data);
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
        holiday.holiday_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        holiday.holiday_date.includes(searchQuery)
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
                { label: 'Holiday Date', key: 'holiday_date' },
                { label: 'Holiday Name', key: 'holiday_name' },
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
                  <tr key={`${holiday.holiday_date}-${holiday.holiday_name}`}>
                    <td className={styles.td}>{convertDate(holiday.holiday_date)} ({getWeekDay(holiday.holiday_date)})</td>
                    <td className={styles.td}>{holiday.holiday_name}</td>
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
