import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { Switch } from 'antd';
import styles from './LatencyLeave.module.css';
import { getLatencyData, updateLateralStatus } from '../../services/api';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function LatencyLeave() {
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getLatencyData();
        setData(response.data);
      } catch (error) {
        console.error('Error fetching the data', error);
        setError('Error fetching the data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSwitchChange = async (employeeId, checked) => {
    try {
      const response = await updateLateralStatus(employeeId, checked);
      toast.success("Lateral Hire Status Updated")
    

      setData(prevData =>
        prevData.map(employee =>
          employee.employeeId === employeeId
            ? { ...employee, lateralHire: checked ? true : false }
            : employee
        )
      );
    } catch (error) {
      console.error('Error updating the lateral hire status', error);
      setError('Error updating the lateral hire status');
    }
  };

  const filteredEmployees = searchQuery
    ? data.filter(employee =>
      employee.empName?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
      employee.empName?.includes(searchQuery)
    )
    : data;

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
        <button className={styles.csvBtn}>
          <CSVLink
            data={filteredEmployees}
            headers={[
              { label: 'Employee ID', key: 'employeeId' },
              { label: 'Employee Name', key: 'empName' },
              { label: 'Lateral Hire', key: 'lateralHire' },
            ]}
            filename="lateral_hire_list.csv"
            className={styles.downloadButton}
          >
            Download
          </CSVLink>
        </button>
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
                <th className={styles.th}>Lateral Hire</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => (
                <tr key={`${employee.employeeId}-${employee.employeeName}`}>
                  <td className={styles.td}>{employee.employeeId}</td>
                  <td className={styles.td}>{employee.empName}</td>
                  <td className={styles.td}>
                    <Switch
                      checked={employee.lateralHire === true}
                      onChange={(checked) => handleSwitchChange(employee.employeeId, checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ToastContainer/>
    </div>
  );
}

export default LatencyLeave;
