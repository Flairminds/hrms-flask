import React, { useState, useEffect } from 'react';
import { Button, message, Modal } from 'antd';
import { getExemptData } from '../../services/api';
import ExemptLeave from '../modal/exemptModal/ExemptLeave';
import styles from './ExemptComp.module.css';

const ExemptComp = () => {
  const [data, setData] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exemptLeaveModal, setExemptLeaveModal] = useState(false);

  const fetchData = async () => {
    try {
      const response = await getExemptData();
      setData(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Error fetching the data', error);
      setError('Error fetching the data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const search = searchQuery.toLowerCase().trim();
   
    if (!search) {
      setFilteredEmployees(data);
      return;
    }
    const searchParts = search.split(' ').filter(Boolean);
    const filtered = data.filter(employee => {
      const employeeName = employee.empName?.toLowerCase() || '';
      // Check if all search parts match some part of the employee name
      const isMatch = searchParts.every(searchPart =>
        employeeName.includes(searchPart)
      );
   
      return isMatch;
    });
    setFilteredEmployees(filtered);
  }, [searchQuery, data]);

  const handleAdd = () => {
    setExemptLeaveModal(true);
  };

  const handleRowClick = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleModalCancel = () => {
    setExemptLeaveModal(false);
    setSelectedEmployee(null);
  };
 
  return (
    <div className={styles.mainContainer}>
      <div className={styles.searchContainer}>
        <div>
          <input
            type="text"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div>
          <Button
            className={styles.addButtonContainer}
            onClick={handleAdd}
            loading={isAdding}
            disabled={isAdding}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
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
                <th className={styles.th}>Employee Id</th>
                <th className={styles.th}>Employee Name</th>
                <th className={styles.th}>From Date</th>
                <th className={styles.th}>To Date</th>
                <th className={styles.th}>Shift Start Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee,i) => (
                <tr
                  key={`${employee.employeeId}-${employee.empName}-${i}`}
                  onClick={() => handleRowClick(employee)}
                  className={selectedEmployee?.empName === employee.empName ? styles.selectedRow : ''}
                >
                  <td className={styles.td}>{employee.employeeId}</td>
                  <td className={styles.td}>{employee.empName}</td>
                  <td className={styles.td}>{employee.fromDate ? employee.fromDate : '-'}</td>
                  <td className={styles.td}>{employee.toDate ? employee.toDate : '-'}</td>
                  <td className={styles.td}>{employee.shiftStartFromTime ? employee.shiftStartFromTime : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal
        open={exemptLeaveModal}
        onCancel={handleModalCancel}
        footer={null}
        centered
      >
        <ExemptLeave selectedEmployee={selectedEmployee} onApply={handleModalCancel} fetchData={fetchData} />
      </Modal>
    </div>
  );
};

export default ExemptComp;
