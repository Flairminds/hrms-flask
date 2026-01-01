import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { Input, Button, Table, Typography, Space } from 'antd';
import { PushpinOutlined, DownloadOutlined } from '@ant-design/icons';
import styles from './HolidayPage.module.css';
import { holidayListData } from '../../services/api';
import { convertDate, getWeekDay } from '../../util/helperFunctions';
import WidgetCard from '../../components/common/WidgetCard';

const { Text } = Typography;

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
        <WidgetCard
          title="Company Holiday List"
          icon={<PushpinOutlined />}
          iconColor="#1890ff"
        >
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary" italic>
              *The following holiday list is applicable only for associates who are not allocated to any particular project.
              Those who are allocated to projects need to follow customer holidays. Please refer to leave policy.*
            </Text>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Input
              placeholder="Search holidays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '300px' }}
              allowClear
            />
            <Button type="primary" icon={<DownloadOutlined />} style={{ borderRadius: '4px' }}>
              <CSVLink
                data={filteredHolidays}
                headers={[
                  { label: 'Holiday Date', key: 'holiday_date' },
                  { label: 'Holiday Name', key: 'holiday_name' },
                ]}
                filename="holiday_list.csv"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                Download CSV
              </CSVLink>
            </Button>
          </div>

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
            {filteredHolidays.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#8c8c8c' }}>
                No holidays found matching your search.
              </div>
            )}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

export default HolidayPage;
