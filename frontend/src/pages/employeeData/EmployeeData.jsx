import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Select, Card, Statistic, Row, Col, Space, Tooltip, message } from 'antd';
import { FilePdfOutlined, PlusOutlined, DownloadOutlined, SearchOutlined, UserOutlined, TeamOutlined, CopyOutlined } from '@ant-design/icons';
import styles from './EmployeeData.module.css';
import { CSVLink } from 'react-csv';
import 'antd/dist/reset.css';
import DownloadOptionsModal from '../../components/modal/downloadOptionsModal/DownloadOptionsModal';
import EmployeeDataAccordion from '../../components/modal/employeeDataAccordian/EmployeeDataAccordion';
import { getAllEmployeesList, getEmployeeDetails, getEmployeeStats } from '../../services/api';
import EditEmployeeAccordian from '../../components/modal/employeeDataAccordian/EditEmployeeAccordian';
import { EMPDetailsModal } from '../../components/modal/EMPDetailsModal/EMPDetailsModal';
import { convertDate } from '../../util/helperFunctions';
import { employmentStatusOptions, LEAVE_STATUS } from '../../util/helper';

const { Search } = Input;

export const EmployeeData = () => {
  const [employeeData, setEmployeeData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({
    total_active: 0,
    total_interns: 0,
    total_probation: 0
  });
  const [searchText, setSearchText] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAccordionVisible, setIsAccordionVisible] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState({
    current: 1,
    pageSize: 10,
    showSizeChanger: false,
    pageSizeOptions: ['10', '20', '50'],
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [personalEmployeeDetails, setPersonalEmployeeDetails] = useState(null);

  useEffect(() => {
    getEmployees();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await getEmployeeStats();
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch employee stats", err);
    }
  };

  const getEmployees = async () => {
    try {
      const response = await getAllEmployeesList();
      console.log("getAllEmployeesList Response:", response.data);
      // Backend returns: employeeId, employeeName, roleName, employmentStatus, joiningDate, leaveApprover
      setEmployeeData(response.data);
      setFilteredData(response.data);

      // Extract unique statuses from data
      const uniqueStatuses = [...new Set(response.data.map(item => item.employmentStatus))].filter(Boolean);
      const uniqueRoles = [...new Set(response.data.map(item => item.roleName))].filter(Boolean);
      setStatusOptions(uniqueStatuses);
      setRoleOptions(uniqueRoles);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleSearch = (event) => {
    const value = event.target.value.toLowerCase();
    setSearchText(value);

    // Filter logic combining search text and status filters
    const filtered = employeeData.filter(item => {
      const nameMatch = item.employeeName?.toLowerCase().includes(value) || item.employeeId?.toLowerCase().includes(value);
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
      case 'Intern': return styles.statusIntern;
      case 'Probation': return styles.statusProbation;
      case 'Leave Without Pay': return styles.statusLWP;
      default: return '';
    }
  };

  const StatCard = ({ label, count, color }) => (
    <div style={{
      background: '#fff', border: `1px solid ${color}22`, borderRadius: 8,
      padding: '12px 20px', minWidth: 120, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 16, fontWeight: 400, color }}>{count}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );

  const columns = [
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      sorter: (a, b) => a.employeeId.localeCompare(b.employeeId),
      render: (text) => <b>{text}</b>,
    },
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      sorter: (a, b) => a.employeeName.localeCompare(b.employeeName),
    },
    {
      title: 'Employment Status',
      dataIndex: 'employmentStatus',
      key: 'employmentStatus',
      filters: statusOptions.map(status => ({ text: status, value: status })),
      onFilter: (value, record) => record.employmentStatus === value,
      defaultFilteredValue: employmentStatusOptions.filter(status => status !== 'Relieved' && status !== 'Absconding'),
      render: (text) => <span className={getStatusClassName(text)}>{text}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'roleName',
      key: 'roleName',
      filters: roleOptions.map(role => ({ text: role, value: role })),
      onFilter: (value, record) => record.roleName === value,
      render: (text) => <span>{text}</span>,
    },
    {
      title: 'Leave Approver',
      dataIndex: 'leaveApprover',
      key: 'leaveApprover',
      filters: employeeData.map(item => item.leaveApprover).filter((value, index, self) => self.indexOf(value) === index).map(approver => ({ text: approver, value: approver })),
      // sorter: (a, b) => (a.leaveApprover || "").localeCompare(b.leaveApprover || ""),
      onFilter: (value, record) => record.leaveApprover === value,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{email}</span>
          {email && (
            <Tooltip title="Copy email">
              <CopyOutlined
                style={{ color: '#1890ff', cursor: 'pointer', fontSize: 13 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(email).then(() => {
                    message.success('Email copied!');
                  });
                }}
              />
            </Tooltip>
          )}
        </span>
      ),
    },
    // {
    //   title: 'Joining Date',
    //   dataIndex: 'joiningDate',
    //   key: 'joiningDate',
    //   defaultSortOrder: 'descend',
    //   sorter: (a, b) => {
    //     if (!a.joiningDate) return -1;
    //     if (!b.joiningDate) return 1;
    //     return new Date(a.joiningDate) - new Date(b.joiningDate);
    //   },
    //   render: (text) => text ? convertDate(text) : '-',
    // },
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
      <Space wrap style={{ marginBottom: 20 }}>
        <StatCard label="Active Employees" count={stats.total_active} color="#3f8600" />
        <StatCard label="Interns" count={stats.total_interns} color="orange" />
        <StatCard label="In Probation" count={stats.total_probation} color="violet" />
        <StatCard label="Resigned" count={stats.total_resigned} color="orange" />
        <StatCard label="Leave Without Pay" count={stats.total_lwp} color="orange" />
      </Space>
      <div className={styles.upperArea}>
        <Input
          className={styles.searchBar}
          placeholder="Search by Name..."
          value={searchText}
          onChange={handleSearch}
          prefix={<SearchOutlined />}
          style={{ width: '300px' }}
        />

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
          refreshEmployeeData={getEmployees}
        />
      )}
    </div>
  );
};
