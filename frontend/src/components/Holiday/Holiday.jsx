import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import styles from './Holiday.module.css';
import { holidayListData, addHolidays } from '../../services/api';
import { Button, Modal, Input, DatePicker, message } from 'antd';
import moment from 'moment';

function Holiday() {
  const [holidayData, setHolidayData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

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

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleAddHoliday = async () => {
    setIsAdding(true);
    try {
      const formattedDate = holidayDate ? holidayDate.format('YYYY-MM-DD') : null;
      await addHolidays({ holidayName, holidayDate: formattedDate });
      message.success('Holiday added successfully');
      setHolidayName('');
      setHolidayDate(null);
      closeModal();
      getHolidayList();
    } catch (error) {
      console.error('Error adding holiday:', error);
      message.error('Failed to add holiday');
    } finally {
      setIsAdding(false);
    }
  };

  const filteredHolidays = searchQuery
    ? holidayData.filter(
      (holiday) =>
        holiday.holidayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        holiday.holidayDate.includes(searchQuery)
    )
    : holidayData;

    const sortedHolidays = [...filteredHolidays].sort((a, b) => {
      const monthA = moment(a.holidayDate, 'YYYY-MM-DD').month();
      const dayA = moment(a.holidayDate, 'YYYY-MM-DD').date();
      const monthB = moment(b.holidayDate, 'YYYY-MM-DD').month();
      const dayB = moment(b.holidayDate, 'YYYY-MM-DD').date();
      if (monthA === monthB) {
        return dayA - dayB;
      }
      return monthA - monthB;
    });
    

  return (
    <div className={styles.mainContainer}>
      <h3 className={styles.heading}>Holiday List</h3>

      <div className={styles.searchContainer}>
        <div>
          <Input
            type="text"
            placeholder="Search holidays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
          <CSVLink
            data={sortedHolidays}
            headers={[
              { label: 'Holiday Date', key: 'holidayDate' },
              { label: 'Holiday Name', key: 'holidayName' },
            ]}
            filename="holiday_list.csv"
            className={styles.downloadButton}
          >
            Download
          </CSVLink>
        <div >
          <Button
            onClick={openModal}
            loading={isAdding}
            disabled={isAdding}
            className={styles.addButtonContainer}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
          <Modal
            title="Add Holiday"
            visible={modalIsOpen}
            onOk={handleAddHoliday}
            onCancel={closeModal}
            confirmLoading={isAdding}
            okText="Add Holiday"
            okButtonProps={{ className: styles.addButtonContainer }}
            cancelButtonProps={{ style: { display: 'none' } }}
          >
            <Input
              type="text"
              placeholder="Holiday Name"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              style={{ marginBottom: '10px' }}
            />
            <DatePicker
              placeholder="Select Holiday Date"
              value={holidayDate }
              onChange={(date) => setHolidayDate(date)}
              style={{ width: '100%' }}
            />
          </Modal>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <table className={styles.table}>
            <thead className={styles.stickyHeader}>
              <tr className={styles.headRow}>
                <th className={styles.th}>Holiday Date</th>
                <th className={styles.th}>Holiday Name</th>
              </tr>
            </thead>
            <tbody>
              {sortedHolidays.map((holiday) => (
                <tr key={`${holiday.holidayDate}-${holiday.holidayName}`}>
                  <td className={styles.td}>{holiday.holidayDate}</td>
                  <td className={styles.td}>{holiday.holidayName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Holiday;
