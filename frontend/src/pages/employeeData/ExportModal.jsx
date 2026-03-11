import React, { useState, useEffect } from 'react';
import { Modal, Checkbox, Button, message, Space, Divider, Spin } from 'antd';
import { CSVLink } from 'react-csv';
import { getEmployeeDetails } from '../../services/api';

const ExportModal = ({ visible, onCancel, data }) => {
  const [selectedColumns, setSelectedColumns] = useState(['employeeId', 'employeeName']);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [exportData, setExportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllDetails = async () => {
      if (visible && data && data.length > 0) {
        setLoading(true);
        try {
          // Fetch details for all employees in parallel
          const detailedDataPromises = data.map(async (row) => {
            if (!row || !row.employeeId) return row;
            try {
               const res = await getEmployeeDetails(row.employeeId);
               // Combine the table row data with the fetched details
               return { ...row, ...res.data };
            } catch (err) {
               console.error(`Failed to fetch details for ${row.employeeId}`, err);
               return row; // fallback to original row if fetch fails
            }
          });
          
          const fullData = await Promise.all(detailedDataPromises);
          
          setExportData(fullData);
          
          // Now extract columns from fullData
          const keySet = new Set();
          fullData.forEach(item => {
            if (!item) return;
            Object.keys(item).forEach(k => {
              // Check if primitive
              if (item[k] === null || typeof item[k] !== 'object') {
                // Ignore some internal keys
                if (k !== '_id' && k !== '__v') {
                  keySet.add(k);
                }
              }
            });
          });
          
          const columnsArray = Array.from(keySet);
          // Sort available columns alphabetically for easier finding
          columnsArray.sort();
          setAvailableColumns(columnsArray);
          
          const defaultSelected = [];
          if (columnsArray.includes('employeeId')) defaultSelected.push('employeeId');
          if (columnsArray.includes('employeeName')) defaultSelected.push('employeeName');
          
          // If none of the default keys exist in data, don't preselect
          setSelectedColumns(defaultSelected.length > 0 ? defaultSelected : (columnsArray.length > 0 ? [columnsArray[0]] : []));
          
        } catch (error) {
           console.error("Error fetching detailed export data", error);
        } finally {
          setLoading(false);
        }
      } else {
        setExportData([]);
        setAvailableColumns([]);
        setSelectedColumns([]);
      }
    };
    
    fetchAllDetails();
  }, [data, visible]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedColumns(availableColumns);
    } else {
      setSelectedColumns([]);
    }
  };

  const onChange = (checkedValues) => {
    setSelectedColumns(checkedValues);
  };

  const formatHeader = (key) => {
    // Add space before capital letters and capitalize first letter
    const result = key.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const isAllSelected = availableColumns.length > 0 && selectedColumns.length === availableColumns.length;
  const isIndeterminate = selectedColumns.length > 0 && selectedColumns.length < availableColumns.length;

  const getFilteredExportData = () => {
    return exportData ? exportData.map(row => {
      const newRow = {};
      selectedColumns.forEach(col => {
        newRow[col] = row[col] !== undefined && row[col] !== null ? row[col] : '';
      });
      return newRow;
    }) : [];
  };

  const headers = selectedColumns.map(col => ({
    label: formatHeader(col),
    key: col
  }));

  return (
    <Modal
      title="Export Employee Data"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="Fetching detailed employee data..." />
        </div>
      ) : exportData && exportData.length > 0 ? (
        <>
          <div style={{ marginBottom: '16px', fontWeight: 600 }}>
            Select columns to export:
          </div>
          <Checkbox 
            indeterminate={isIndeterminate} 
            onChange={handleSelectAll} 
            checked={isAllSelected}
            style={{ marginBottom: '16px' }}
          >
            Select All
          </Checkbox>
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0 10px' }}>
            <Checkbox.Group 
              value={selectedColumns} 
              onChange={onChange}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '100%' }}
            >
              {availableColumns.map(col => (
                <Checkbox key={col} value={col}>
                  <div style={{ wordBreak: 'break-word' }}>{formatHeader(col)}</div>
                </Checkbox>
              ))}
            </Checkbox.Group>
          </div>
          <Divider />
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={onCancel}>Cancel</Button>
              {selectedColumns.length > 0 ? (
                <CSVLink
                  data={getFilteredExportData()}
                  headers={headers}
                  filename="employee_data.csv"
                  onClick={() => {
                    onCancel(); 
                    message.success('Data exported successfully');
                  }}
                  style={{ textDecoration: 'none' }}
                >
                  <Button type="primary">
                    Export
                  </Button>
                </CSVLink>
              ) : (
                <Button type="primary" disabled onClick={() => message.warning('Please select at least one column')}>
                  Export
                </Button>
              )}
            </Space>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          No data available to export
        </div>
      )}
    </Modal>
  );
};

export default ExportModal;
