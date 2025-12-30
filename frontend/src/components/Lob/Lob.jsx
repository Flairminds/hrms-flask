import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { getLobLead, addLobLead, getEmployeeList } from '../../services/api';
import { Button, Modal, Input, Select, message } from 'antd';
import styles from './Lob.module.css';

const { Option } = Select;

function Lob() {
  const [lobData, setLobData] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lobName, setLobName] = useState('');
  const [lobLead, setLobLead] = useState(''); // Will store employee ID
  const [lobLeadName, setLobLeadName] = useState(''); // Will store employee name for display
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const getLobList = async () => {
    try {
      const res = await getLobLead();
      setLobData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching Lob Lead data:', err);
      setError('Failed to fetch Lob Lead data');
      setLoading(false);
    }
  };

  const fetchEmployeeList = async () => {
    try {
      const res = await getEmployeeList();
      setEmployeeList(res.data);
    } catch (err) {
      console.error('Error fetching employee list:', err);
      setError('Failed to fetch employee list');
    }
  };

  useEffect(() => {
    getLobList();
    fetchEmployeeList();
  }, []);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setLobName('');
    setLobLead('');
    setLobLeadName('');
  };

  const handleEmployeeChange = (value, option) => {
    setLobLead(value); // Employee ID
    setLobLeadName(option.children); // Employee Name
  };

  const handleAddLobLead = async () => {
    setIsAdding(true);
    const payload = { lobLead: lobLead, lob: lobName };
    try {
      await addLobLead(payload);
      message.success('Lob Lead added successfully');
      closeModal();
      await getLobList();
    } catch (error) {
      console.error('Error adding Lob Lead:', error);
      message.error('Failed to add Lob Lead');
    } finally {
      setIsAdding(false);
    }
  };


  const filteredLobs = searchQuery
    ? lobData.filter(
      (lob) =>
        lob.Lob.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lob.LobLead.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : lobData;

  return (
    <div className={styles.mainContainer}>
      <h3 className={styles.heading}>Lob Lead List</h3>

      <div className={styles.searchContainer}>
        <div>
          <Input
            type="text"
            placeholder="Search lob leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div>
          <CSVLink
            data={filteredLobs}
            headers={[
              { label: 'Lob Name', key: 'Lob' },
              { label: 'Lob Lead', key: 'LobLead' }
            ]}
            filename="lob_lead_list.csv"
            className={styles.downloadButton}
          >
            Download
          </CSVLink>
        </div>
        <div>
          <button
            className={styles.addButtonContainer}
            onClick={openModal}
            loading={isAdding}
            disabled={isAdding}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
          <Modal
            title="Add Lob Lead"
            visible={modalIsOpen}
            onOk={handleAddLobLead}
            onCancel={closeModal}
            confirmLoading={isAdding}
            okText="Add Lob Lead"
            okButtonProps={{ className: styles.addButtonContainer }}
            cancelButtonProps={{ style: { display: 'none' } }}
          >
            <Input
              type="text"
              placeholder="Lob Department"
              value={lobName}
              onChange={(e) => setLobName(e.target.value)}
              style={{ marginBottom: '10px' }}
            />
            <Select
              placeholder="Select Lob Lead"
              style={{ width: '100%', marginBottom: '10px' }}
              onChange={handleEmployeeChange}
              value={lobLead || undefined}
            >
              {employeeList.map(employee => (
                <Option key={employee.employeeId} value={employee.employeeId}>
                  {`${employee.firstName} ${employee.lastName}`}
                </Option>
              ))}
            </Select>
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
                <th className={styles.th}>Lob </th>
                <th className={styles.th}>Lob Lead</th>
              </tr>
            </thead>
            <tbody>
              {filteredLobs.map((lob) => (
                <tr key={lob.Lob}>
                  <td className={styles.td}>{lob.Lob}</td>
                  <td className={styles.td}>{lob.LobLead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Lob;
