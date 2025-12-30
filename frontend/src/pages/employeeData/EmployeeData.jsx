import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Checkbox } from 'antd';
import { FilePdfOutlined, PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import styles from './EmployeeData.module.css';
import { CSVLink } from 'react-csv';
import 'antd/dist/reset.css';
import DownloadOptionsModal from '../../components/modal/downloadOptionsModal/DownloadOptionsModal';
import EmployeeDataAccordion from '../../components/modal/employeeDataAccordian/EmployeeDataAccordion';
import { getAllEmployeeData, getEmployeeDetails } from '../../services/api';
import EditEmployeeAccordian from '../../components/modal/employeeDataAccordian/EditEmployeeAccordian';
import { EMPDetailsModal } from '../../components/modal/EMPDetailsModal/EMPDetailsModal';

const { Search } = Input;

export const EmployeeData = () => {
  const [employeeData, setEmployeeData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAccordionVisible, setIsAccordionVisible] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState({
    current: 1,
    pageSize: 5,
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50'], 
  });
  const [isEditModalOpen , setIsEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const[rowId,setRowId]=useState(null)
  const[detailsModal,setDetailsModal]=useState(false)
  const[personalEmployeeDetails,setPersonalEmployeeDetails] =useState(null)



  const handleEditClick = (record) => {
    setEditingRow(record);
    setIsEditModalOpen(true);
  };
  useEffect(() => {
    getEmployees();
  }, []);

  const getEmployees = async () => {
    const response = await getAllEmployeeData();
    const transformedData = transformEmployeeData(response.data.data);
    setEmployeeData(transformedData);
    setFilteredData(transformedData);
  };

  const transformEmployeeData = (data) => {
    const maxProjectCount = Math.max(...data.map(employee => employee.projectDetails?.length || 0));

    return data.map((employee) => {
      const projects = employee.projectDetails || [];
      const transformedProjects = {};

      for (let i = 0; i < maxProjectCount; i++) {
        transformedProjects[`projectName${i + 1}`] = projects[i]?.projectName || '-';
        transformedProjects[`allocationPerson${i + 1}`] = projects[i]?.bandwidthAllocation || '-';
        transformedProjects[`role${i + 1}`] = projects[i]?.role || '-';
      }

      return {
        ...employee,
        ...transformedProjects,
        projectCount: projects.length,
      };
    });
  };

  const columns = [
    
    {
      title: 'ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 50,
    },
    {
      title: 'First Name',
      dataIndex: 'firstName',
      key: 'firstName',
      width: 120,
    },
    {
      title: 'Last Name',
      dataIndex: 'lastName',
      key: 'lastName',
      width: 120,
    },
    {
      title: 'LOB',
      dataIndex: 'domain',
      key: 'domain',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Leave Approver',
      dataIndex: 'leaveApprover',
      key: 'leaveApprover',
      width: 120,
    },
    {
      title: 'Employment Status',
      dataIndex: 'employmentStatus',
      key: 'employmentStatus',
      width: 110,
      render: (text) => {
        let statusClass = '';
        switch (text) {
          case 'Confirmed':
            statusClass = styles.statusConfirmed;
            break;
          case 'Resigned':
            statusClass = styles.statusResigned;
            break;
          case 'Relieved':
            statusClass = styles.statusRelieved;
            break;
          case 'Absconding':
            statusClass = styles.statusAbsconding;
            break;
          case 'Active':
            statusClass = styles.statusActive;
            break;
          case 'Intern':
            statusClass = styles.statusIntern;
            break
          case 'Probation':
            statusClass = styles.statusProbation;
            break
          case 'LWP':
            statusClass = styles.statusLWP;
            break
            case 'NonFM':
            statusClass = styles.statusNonFM;
            break
          default:
            break;

          
        }
        return <span className={statusClass}>{text}</span>;
      },
    },
    {
      title: 'Primary Skill',
      dataIndex: 'primarySkill',
      key: 'primarySkill',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Secondary Skill',
      dataIndex: 'secondarySkill',
      key: 'secondarySkill',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Resume Link',
      dataIndex: 'resumeLink',
      key: 'resumeLink',
      render: (text) => (
        <a href={text} target="_blank" rel="noopener noreferrer">
          <FilePdfOutlined style={{ fontSize: '24px' }} />
        </a>
      ) || '-',
    },
    {
      title: 'Pending Leaves Count',
      dataIndex: 'pendingLeavesCount',
      key: 'pendingLeavesCount',
      width: 120,
    },
    {
      title: 'WFH Count',
      dataIndex: 'remainingWFHBalance',
      key: 'remainingWFHBalance',
      width: 120,
    },
    {
      title: 'Unpaid Leaves Count',
      dataIndex: 'unpaidLeaveCount',
      key: 'unpaidLeaveCount',
      width: 120,
    },
    {
      title: 'Billing',
      dataIndex: 'billing',
      key: 'billing',
      width: 120,
    },
    
    {
      title: 'Internship End Date',
      dataIndex: 'internshipEndDate',
      key: 'InternshipEndDate',
      width: 120,
    },
     {
      title: 'Probation End Date',
      dataIndex: 'probationEndDate',
      key: 'ProbationEndDate',
      width: 120,
    },
    {
      title: 'Date Of Resignation',
      dataIndex: 'dateOfResignation',
      key: 'DateOfResignation',
      width: 120,
    },
    {
      title: 'Last Working Day',
      dataIndex: 'lwd',
      key: 'LWD',
      width: 120,
    },
    {
      title: 'Leave Without Pay',
      dataIndex: 'lwp',
      key: 'LWP',
      width: 120,
    },
     {
      title: 'Privilege Leaves',
      dataIndex: 'privilegeLeaves',
      key: 'privilegeLeaves',
      width: 120,
    },
    {
      title: 'Sick Leaves',
      dataIndex: 'sickLeaves',
      key: 'sickLeaves',
      width: 120,
    },
    {
      title: 'Remaining Leaves',
      dataIndex: 'remainingLeaves',
      key: 'remainingLeaves',
      width: 120,
    },
    {
      title: 'Action',
      dataIndex: 'billing',
      key: 'billing',
      width: 120,
    },
    // {
    //   title: 'Action',
    //   dataIndex: 'billing',
    //   key: 'billing',
    //   width: 120,
    // },
    // Dynamic project columns
    ...Array.from({ length: Math.max(...employeeData.map(e => e.projectCount || 0)) }, (_, i) => [
      {
        title: `Project ${i + 1} Name`,
        dataIndex: `projectName${i + 1}`,
        key: `projectName${i + 1}`,
        width: 150,
        render: (text) => text || '-',
      },
      {
        title: `Project ${i + 1} Allocation`,
        dataIndex: `allocationPerson${i + 1}`,
        key: `allocationPerson${i + 1}`,
        width: 120,
        render: (text) => text || '-',
      },
      {
        title: `Role ${i + 1}`,
        dataIndex: `role${i + 1}`,
        key: `role${i + 1}`,
        width: 120,
        render: (text) => text || '-',
      },
    ]).flat(),
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => handleEditClick(record)}
          className={styles.addBtn}
        >
          Edit
        </Button>
      ),
      width: 100,
    },
  ];

  const statuses = [
    'Relieved',
    'Confirmed',
    'Absconding',
    'Resigned',
    'Active',
    'Intern',
    'Probation',
    'LWP',
    'NonFM'
  ];
  const headers = columns
  .filter(col => col.dataIndex)
  .map(col => ({
    label: col.title,
    key: col.dataIndex,
  }));
  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchText(value);
    const filtered = employeeData.filter(item =>
      Object.values(item).some(val =>
        val ? val.toString().toLowerCase().includes(value.toLowerCase()) : false
      )
    );
    setFilteredData(filtered);
  };

  const handleCheckboxChange = (e, record) => {
    const { checked } = e.target;
    if (checked) {
      setSelectedRowKeys((prev) => [...prev, record.employeeId]);
    } else {
      setSelectedRowKeys((prev) => prev.filter(id => id !== record.employeeId));
    }
  };

  const handleStatusChange = (status) => {
    setSelectedStatuses(prev => {
      const newStatuses = prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
         
      const newFilteredData = employeeData.filter(item =>
        Object.values(item).some(val =>
          val.toString().toLowerCase().includes(searchText.toLowerCase())
        ) &&
        (newStatuses.length === 0 || newStatuses.includes(item.employmentStatus))
      );      
      setFilteredData(newFilteredData);
      return newStatuses;
    });
  };

  const getStatusClassName = (status) => {
    switch (status) {
      case 'Relieved':
        return styles.statusRelieved;
      case 'Confirmed':
        return styles.statusConfirmed;
      case 'Absconding':
        return styles.statusAbsconding;
      case 'Resigned':
        return styles.statusResigned;
      case 'Active':
        return styles.statusActive;
      case 'Intern':
        return styles.statusIntern;
      case 'Probation':
        return styles.statusProbation;
      case 'LWP':
        return styles.statusLWP;
        case 'NonFM':
        return styles.statusNonFM;
      default:
        return '';
    }
  };
  const handleTableChange = (pagination, filters, sorter) => {
    setPaginationConfig({
      ...paginationConfig,
      current: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

  const selectedData = filteredData.filter(item => selectedRowKeys.includes(item.employeeId));

  const  showModal = () =>{
    setIsAccordionVisible(true);
  }

  const handleRowClick = async (record) => {
    setRowId(record.employeeId);
    setDetailsModal(true);
  
    try {
      const response = await getEmployeeDetails(record.employeeId);
      
      setPersonalEmployeeDetails(response.data);
    } catch (error) {
      console.error("Error fetching employee details:", error);
    }
  };
  

  
  return (
    <div className={styles.employeeData}>
      <div className={styles.upperArea}>
        <Input
          className={styles.searchBar}
          placeholder="Search..."
          value={searchText}
          onChange={handleSearch}
          style={{ marginBottom: '20px' }}
        />
        <div className={styles.upperArea}>
          <Button icon={<DownloadOutlined />} className={styles.addBtn} type="primary" onClick={() => setIsModalVisible(true)} />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
          className={styles.addBtn}
        >
          Add
        </Button>
      </div>
      <div style={{display: 'flex', alignItems: 'center'}}>
        The employment status is {statuses.map(status => (
          <Button
            key={status}
            type={selectedStatuses.includes(status)}
            onClick={() => handleStatusChange(status)}
            // className={`${styles.statusButton} ${getStatusClassName(status)}`}
            className={`${styles.statusButton} ${selectedStatuses.includes(status) ? styles[`active${status}`] : getStatusClassName(status)}`}
          >
            {status}
          </Button>
        ))}
      </div>
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="employeeId"
        pagination={paginationConfig} 
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
        className={styles.empTable}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
        })}
        
        
      />
      <DownloadOptionsModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onDownload={() => {
          const csvData = selectedData.map(item => {
            const { employeeId, firstName, lastName, domain, leaveApprover, employmentStatus, primarySkill, secondarySkill, resumeLink, pendingLeavesCount, remainingWFHBalance, unpaidLeaveCount, billing, internshipEndDate, probationEndDate, lwp, DateOfResignation, lwd,privilegeLeaves,sickSickLeaves,remainingLeaves, ...projects } = item;
            return {
              employeeId,
              firstName,
              lastName,
              domain,
              leaveApprover,
              employmentStatus,
              primarySkill,
              secondarySkill,
              resumeLink,
              pendingLeavesCount,
              remainingWFHBalance,
              unpaidLeaveCount,
              billing,
                internshipEndDate,
              probationEndDate,
              lwp,
              dateOfResignation,
              lwd,
              privilegeLeaves,
              sickLeaves,
              remainingLeaves,
              ...Object.values(projects),
            };
          });
          const csvHeaders = [
            { label: 'Employee ID', key: 'employeeId' },
            { label: 'First Name', key: 'firstName' },
            { label: 'Last Name', key: 'lastName' },
            { label: 'Domain', key: 'domain' },
            { label: 'Leave Approver', key: 'leaveApprover' },
            { label: 'Employment Status', key: 'employmentStatus' },
            { label: 'Primary Skill', key: 'primarySkill' },
            { label: 'Secondary Skill', key: 'secondarySkill' },
            { label: 'Resume Link', key: 'resumeLink' },
            { label: 'Pending Leaves Count', key: 'pendingLeavesCount' },
            { label: 'WFH Count', key: 'remainingWFHBalance' },
            { label: 'Unpaid Leaves Count', key: 'unpaidLeaveCount' },
            { label: 'Billing', key: 'billing' },
             { label: 'Internship End date', key: 'internshipEndDate' },
            { label: 'Probation End Date', key: 'probationEndDate' },
            { label: 'LWP', key: 'lwp' },
            { label: 'Date Of Resignation', key: 'dateOfResignation' },
            { label: 'LWD', key: 'lwd' },
            { label: 'Privilege Leaves', key: 'privilegeLeaves' },
            { label: 'Sick Leaves', key: 'sickLeaves' },
            { label: 'Remaining Leaves', key: 'remainingLeaves' },
          ];

          csvData.forEach((_, index) => {
            csvHeaders.push({ label: `Project ${index + 1} Name`, key: `projectName${index + 1}` });
            csvHeaders.push({ label: `Project ${index + 1} Allocation`, key: `allocationPerson${index + 1}` });
            csvHeaders.push({ label: `Role ${index + 1}`, key: `role${index + 1}` });
          });

          return (
            <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename={'employee_data.csv'}
            >
              <Button icon={<DownloadOutlined />} className={styles.downloadBtn}>
                Download CSV
              </Button>
            </CSVLink>
          );
        }}
      />
      {isAccordionVisible && (
        <EmployeeDataAccordion  
          isSetLeaveApplicationModal={true}
          setIsAccordionVisible={setIsAccordionVisible}
          getEmployees={getEmployees} 
          // personalEmployeeDetails={personalEmployeeDetails}
        />
      )}
      {isEditModalOpen && (<EditEmployeeAccordian editingRow = {editingRow}
      setIsEditModalOpen  = {setIsEditModalOpen} 
      isEditModalOpen = {isEditModalOpen}
      setDetailsModal={setDetailsModal}
      personalEmployeeDetails={personalEmployeeDetails}
      getEmployees={getEmployees} 
      />)}
  {detailsModal && !isEditModalOpen &&(
     <EMPDetailsModal  detailsModal ={detailsModal} setDetailsModal ={setDetailsModal}   personalEmployeeDetails ={personalEmployeeDetails}/>
    
  )}
     </div>
  );
};
