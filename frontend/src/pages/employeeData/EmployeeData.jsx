import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Select } from 'antd';
import { FilePdfOutlined, PlusOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import styles from './EmployeeData.module.css';
import { CSVLink } from 'react-csv';
import 'antd/dist/reset.css';
import DownloadOptionsModal from '../../components/modal/downloadOptionsModal/DownloadOptionsModal';
import EmployeeDataAccordion from '../../components/modal/employeeDataAccordian/EmployeeDataAccordion';
import { getAllEmployeesList, getEmployeeDetails } from '../../services/api';
import EditEmployeeAccordian from '../../components/modal/employeeDataAccordian/EditEmployeeAccordian';
import { EMPDetailsModal } from '../../components/modal/EMPDetailsModal/EMPDetailsModal';
import { convertDate } from '../../util/helperFunctions';

const { Search } = Input;

export const EmployeeData = () => {
  const [employeeData, setEmployeeData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAccordionVisible, setIsAccordionVisible] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50'],
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [personalEmployeeDetails, setPersonalEmployeeDetails] = useState(null);

  useEffect(() => {
    getEmployees();
  }, []);

  const getEmployees = async () => {
    try {
      const response = await getAllEmployeesList();
      console.log("getAllEmployeesList Response:", response.data);
      // Backend returns: employeeId, employeeName, roleName, employmentStatus, joiningDate, leaveApprover
      setEmployeeData(response.data);
      setFilteredData(response.data);

      // Extract unique statuses from data
      const uniqueStatuses = [...new Set(response.data.map(item => item.employmentStatus))].filter(Boolean);
      setStatusOptions(uniqueStatuses);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleSearch = (event) => {
    const value = event.target.value.toLowerCase();
    setSearchText(value);

    // Filter logic combining search text and status filters
    const filtered = employeeData.filter(item => {
      const nameMatch = item.employeeName?.toLowerCase().includes(value);
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(item.employmentStatus);
      return nameMatch && statusMatch;
    });
    setFilteredData(filtered);
  };

  const handleStatusChange = (newStatuses) => {
    setSelectedStatuses(newStatuses);

    // Re-apply filters
    const filtered = employeeData.filter(item => {
      const nameMatch = item.employeeName?.toLowerCase().includes(searchText.toLowerCase());
      const statusMatch = newStatuses.length === 0 || newStatuses.includes(item.employmentStatus);
      return nameMatch && statusMatch;
    });
    setFilteredData(filtered);
  };

  const handleRowClick = async (record) => {
    setDetailsModal(true);
    try {
      // Fetch full details using existing API
      const response = await getEmployeeDetails(record.employeeId);
      setPersonalEmployeeDetails(response.data);
    } catch (error) {
      console.error("Error fetching employee details:", error);
    }
  };

  const getStatusClassName = (status) => {
    switch (status) {
      case 'Relieved': return styles.statusRelieved;
      case 'Confirmed': return styles.statusConfirmed;
      case 'Absconding': return styles.statusAbsconding;
      case 'Resigned': return styles.statusResigned;
      case 'Active': return styles.statusActive;
      case 'Intern': return styles.statusIntern;
      case 'Probation': return styles.statusProbation;
      case 'LWP': return styles.statusLWP;
      case 'NonFM': return styles.statusNonFM;
      default: return '';
    }
  };

  const columns = [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      sorter: (a, b) => a.employeeName.localeCompare(b.employeeName),
      render: (text) => <b>{text}</b>,
    },
    {
      title: 'Employment Status',
      dataIndex: 'employmentStatus',
      key: 'employmentStatus',
      filters: statusOptions.map(status => ({ text: status, value: status })),
      onFilter: (value, record) => record.employmentStatus === value,
      render: (text) => <span className={getStatusClassName(text)}>{text}</span>,
    },
    {
      title: 'Leave Approver',
      dataIndex: 'leaveApprover',
      key: 'leaveApprover',
      sorter: (a, b) => a.leaveApprover.localeCompare(b.leaveApprover),
    },
    {
      title: 'Joining Date',
      dataIndex: 'joiningDate',
      key: 'joiningDate',
      defaultSortOrder: 'descend',
      sorter: (a, b) => {
        if (!a.joiningDate) return -1;
        if (!b.joiningDate) return 1;
        return new Date(a.joiningDate) - new Date(b.joiningDate);
      },
      render: (text) => text ? convertDate(text) : '-',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={(e) => { e.stopPropagation(); setDetailsModal(true); handleRowClick(record); }}>
          View Details
        </Button>
      ),
    },
  ];


  return (
    <div className={styles.employeeData}>
      <div className={styles.upperArea}>
        <Input
          className={styles.searchBar}
          placeholder="Search by Name..."
          value={searchText}
          onChange={handleSearch}
          prefix={<SearchOutlined />}
          style={{ width: '300px' }}
        />
        {/* Status Filter Buttons (Optional - Table also has filters) */}
        <Select
          mode="multiple"
          style={{ width: '300px' }}
          placeholder="Filter by Status"
          value={selectedStatuses}
          onChange={handleStatusChange}
          allowClear
        >
          {statusOptions.map(status => (
            <Select.Option key={status} value={status}>{status}</Select.Option>
          ))}
        </Select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <Button
            icon={<DownloadOutlined />}
            className={styles.addBtn}
            onClick={() => setIsModalVisible(true)}
          >
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAccordionVisible(true)}
            className={styles.addBtn}
          >
            Add
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="employeeId"
        pagination={paginationConfig}
        onChange={(pagination, filters, sorter) => setPaginationConfig(pagination)}
        className={styles.empTable}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' }
        })}
      />

      <DownloadOptionsModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onDownload={() => {
          // CSV Download Logic - simplified
          return (
            <CSVLink
              data={filteredData}
              filename={'employee_data.csv'}
            >
              <Button>Download CSV</Button>
            </CSVLink>
          )
        }}
      />

      {isAccordionVisible && (
        <EmployeeDataAccordion
          isSetLeaveApplicationModal={true}
          setIsAccordionVisible={setIsAccordionVisible}
          getEmployees={getEmployees}
        />
      )}

      {detailsModal && (
        <EMPDetailsModal
          detailsModal={detailsModal}
          setDetailsModal={setDetailsModal}
          personalEmployeeDetails={personalEmployeeDetails}
        // Note: If you need to edit, you might need to implement editing logic inside the modal or pass a handler
        />
      )}
    </div>
  );
};
