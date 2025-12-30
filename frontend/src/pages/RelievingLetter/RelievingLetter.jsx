// import React, { useState, useEffect } from 'react';
// import { Table, Button, Modal, Form, Select, Input, DatePicker, Spin, InputNumber } from 'antd';
// import { FileTextOutlined, SearchOutlined, UserOutlined, CalendarOutlined, IdcardOutlined, TeamOutlined, DollarOutlined, TrophyOutlined, LineChartOutlined, MailOutlined } from '@ant-design/icons';
// import Cookies from 'js-cookie';
// import styles from './RelievingLetter.module.css';
// import moment from 'moment';
// import { useNavigate } from 'react-router-dom';
// import { getEmployeeDetailsForRelievingLetter, getHrRelievingLetters, createRelievingLetter, updateRelievingLetter, sendRelievingLetterEmail } from '../../services/api';

// const { Option } = Select;

// export const RelievingLetter = () => {
//   const currentUserId = Cookies.get('employeeId');
//   const [form] = Form.useForm();
//   const [isModalVisible, setIsModalVisible] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [currentEditId, setCurrentEditId] = useState(null);
//   const [tableData, setTableData] = useState([]);
//   const [filteredData, setFilteredData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [employees, setEmployees] = useState([]);
//   const [notification, setNotification] = useState({ message: '', type: '', visible: false });
//   const [employeeSearchValue, setEmployeeSearchValue] = useState('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (!currentUserId) {
//       setNotification({
//         message: 'No user session found. Please log in.',
//         type: 'warning',
//         visible: true,
//       });
//       navigate('/login');
//       return;
//     }

//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         await Promise.all([fetchEmployeeDetails(), fetchHrRelievingLetters()]);
//       } catch (error) {
//         setNotification({
//           message: error.response?.data?.message || 'Failed to load data. Please try again.',
//           type: 'error',
//           visible: true,
//         });
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [currentUserId, navigate]);

//   useEffect(() => {
//     if (notification.visible) {
//       const timer = setTimeout(() => {
//         setNotification({ ...notification, visible: false });
//       }, 4000);
//       return () => clearTimeout(timer);
//     }
//   }, [notification]);

//   const fetchEmployeeDetails = async () => {
//     try {
//       const response = await getEmployeeDetailsForRelievingLetter();
//       if (response.data.status === 'success') {
//         setEmployees(response.data.data);
//       } else {
//         throw new Error(response.data.message || 'Failed to fetch employee details');
//       }
//     } catch (error) {
//       throw new Error(error.response?.data?.message || 'Failed to fetch employee details');
//     }
//   };

//   const fetchHrRelievingLetters = async () => {
//     try {
//       const response = await getHrRelievingLetters();
//       if (response.data.status === 'success') {
//         const letters = response.data.data.map((letter) => ({
//           key: letter.id,
//           employeeName: letter.employeeName,
//           empId: letter.empId,
//           designation: letter.designation,
//           letterType: letter.letterType,
//           creationDate: letter.creationDate,
//           lastWorkingDate: letter.lastWorkingDate,
//           relievingDate: letter.relievingDate,
//           resignationDate: letter.resignationDate,
//           ctcSalary: letter.ctcSalary,
//           bonus: letter.bonus,
//           variables: letter.variables,
//           employeeEmail: letter.employeeEmail,
//         }));
//         setTableData(letters);
//         setFilteredData(letters);
//       } else {
//         throw new Error(response.data.message || 'Failed to fetch relieving letters');
//       }
//     } catch (error) {
//       throw new Error(error.response?.data?.message || 'Failed to fetch relieving letters');
//     }
//   };

//   const handleEmployeeSelection = (value) => {
//     const employee = employees.find(emp => emp.EmployeeId === value);
//     if (employee) {
//       form.setFieldsValue({
//         employeeName: employee.EmployeeName,
//         empId: employee.EmployeeId,
//         designation: employee.SubRoleName,
//         joiningDate: employee.DateOfJoining ? moment(employee.DateOfJoining).format('YYYY-MM-DD') : '',
//         todaysDate: moment().format('YYYY-MM-DD'), // Auto-fill today's date
//         employeeEmail: employee.PersonalEmail || employee.EmailAddress || '',
//       });
//       console.log("employeeEmail----", employeeEmail)
//       setEmployeeSearchValue(`${employee.EmployeeName} (${employee.EmployeeId})`);
//     } else {
//       form.setFieldsValue({
//         employeeName: '',
//         empId: '',
//         designation: '',
//         joiningDate: '',
//         todaysDate: moment().format('YYYY-MM-DD'), // Always set today's date
//         employeeEmail: '',
//       });
//       console.log("employeeEmail++++++", employeeEmail)
//       setEmployeeSearchValue('');
//     }
//   };

//   const handleSearch = (e) => {
//     const searchTerm = e.target.value.toLowerCase();
//     const filtered = tableData.filter(
//       (item) =>
//         item.employeeName.toLowerCase().includes(searchTerm) ||
//         item.empId.toLowerCase().includes(searchTerm)
//     );
//     setFilteredData(filtered);
//   };

//   const handleFormSubmit = async (values) => {
//     try {
//       setLoading(true);
//       const payload = {
//         employeeId: values.employeeSelect,
//         lastWorkingDate: values.lastWorkingDate ? values.lastWorkingDate.format('YYYY-MM-DD') : null,
//         relievingDate: values.relievingDate ? values.relievingDate.format('YYYY-MM-DD') : null,
//         resignationDate: values.resignationDate ? values.resignationDate.format('YYYY-MM-DD') : null,
//         ctcSalary: values.ctcSalary || null,
//         bonus: values.bonus || null,
//         variables: values.variables || null,
//         employeeEmail: values.employeeEmail || null,
//       };

//       const response = isEditMode
//         ? await updateRelievingLetter(currentEditId, payload)
//         : await createRelievingLetter(payload);

//       if (response.data.status === 'success') {
//         setNotification({
//           message: isEditMode ? 'Relieving letter updated successfully!' : 'Relieving letter created successfully!',
//           type: 'success',
//           visible: true,
//         });
//         setIsModalVisible(false);
//         form.resetFields();
//         setEmployeeSearchValue('');
//         await fetchHrRelievingLetters();
//       } else {
//         throw new Error(response.data.message || 'Operation failed');
//       }
//     } catch (error) {
//       setNotification({
//         message: error.response?.data?.message || 'An error occurred. Please try again.',
//         type: 'error',
//         visible: true,
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleEdit = (record) => {
//     setIsEditMode(true);
//     setCurrentEditId(record.key);
//     setIsModalVisible(true);
//     form.setFieldsValue({
//       employeeSelect: record.empId,
//       lastWorkingDate: record.lastWorkingDate ? moment(record.lastWorkingDate) : null,
//       relievingDate: record.relievingDate ? moment(record.relievingDate) : null,
//       resignationDate: record.resignationDate ? moment(record.resignationDate) : null,
//       ctcSalary: record.ctcSalary,
//       bonus: record.bonus,
//       variables: record.variables,
//       employeeEmail: record.employeeEmail,
//       todaysDate: moment().format('YYYY-MM-DD'), // Always set today's date
//     });
//     setEmployeeSearchValue(`${record.employeeName} (${record.empId})`);
//     handleEmployeeSelection(record.empId);
//   };

//   const handleSendEmail = async (record) => {
//     try {
//       setLoading(true);
//       const response = await sendRelievingLetterEmail(record.key);
//       if (response.data.status === 'success') {
//         setNotification({
//           message: 'Email sent successfully!',
//           type: 'success',
//           visible: true,
//         });
//       } else {
//         throw new Error(response.data.message || 'Failed to send email');
//       }
//     } catch (error) {
//       setNotification({
//         message: error.response?.data?.message || 'Failed to send email. Please try again.',
//         type: 'error',
//         visible: true,
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleEmployeeSearch = (value) => {
//     setEmployeeSearchValue(value);
//   };

//   const columns = [
//     { 
//       title: 'Employee Name', 
//       dataIndex: 'employeeName', 
//       key: 'employeeName',
//       render: (text) => (
//         <div className={styles.employeeCell}>
//           <UserOutlined className={styles.cellIcon} />
//           <span>{text}</span>
//         </div>
//       )
//     },
//     { 
//       title: 'EMP ID', 
//       dataIndex: 'empId', 
//       key: 'empId',
//       render: (text) => (
//         <div className={styles.empIdCell}>
//           <IdcardOutlined className={styles.cellIcon} />
//           <span className={styles.empIdBadge}>{text}</span>
//         </div>
//       )
//     },
//     { 
//       title: 'Designation', 
//       dataIndex: 'designation', 
//       key: 'designation',
//       render: (text) => (
//         <div className={styles.designationCell}>
//           <TeamOutlined className={styles.cellIcon} />
//           <span>{text}</span>
//         </div>
//       )
//     },
//     {
//       title: 'Letter Type',
//       dataIndex: 'letterType',
//       key: 'letterType',
//       render: (text) => <span className={`${styles.letterTypeTag} ${styles[`${text.toLowerCase()}Tag`]}`}>{text}</span>,
//     },
//     { 
//       title: 'Creation Date', 
//       dataIndex: 'creationDate', 
//       key: 'creationDate',
//       render: (text) => (
//         <div className={styles.dateCell}>
//           <CalendarOutlined className={styles.cellIcon} />
//           <span>{text}</span>
//         </div>
//       )
//     },
//     { 
//       title: 'LWD', 
//       dataIndex: 'lastWorkingDate', 
//       key: 'lastWorkingDate',
//       render: (text) => (
//         <div className={styles.dateCell}>
//           <CalendarOutlined className={styles.cellIcon} />
//           <span>{text}</span>
//         </div>
//       )
//     },
//     { 
//       title: 'Relieving Date', 
//       dataIndex: 'relievingDate', 
//       key: 'relievingDate',
//       render: (text) => (
//         <div className={styles.dateCell}>
//           <CalendarOutlined className={styles.cellIcon} />
//           <span>{text || 'N/A'}</span>
//         </div>
//       )
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <div className={styles.actionButtons}>
//           <Button
//             className={styles.editBtn}
//             onClick={() => handleEdit(record)}
//             disabled={loading}
//             loading={loading && currentEditId === record.key}
//             size="small"
//           >
//             Edit
//           </Button>
//           <Button
//             className={styles.emailBtn}
//             onClick={() => handleSendEmail(record)}
//             disabled={loading}
//             loading={loading && currentEditId === record.key}
//             size="small"
//           >
//             Send Email
//           </Button>
//         </div>
//       ),
//     },
//   ];

//   if (!currentUserId) {
//     return (
//       <div className={styles.exitLetterContainer}>
//         <div className={styles.loadingContainer}>
//           <Spin size="large" tip="Loading..." />
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.exitLetterContainer}>
//       <div className={styles.pageHeader}>
//         <div className={styles.headerContent}>
//           <div className={styles.titleSection}>
//             <FileTextOutlined className={styles.headerIcon} />
//             <div>
//               <h1 className={styles.pageTitle}>Relieving Letter Management</h1>
//               <p className={styles.pageSubtitle}>Create and manage employee relieving letters</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className={styles.actionBar}>
//         <Button
//           className={styles.createButton}
//           onClick={() => {
//             setIsEditMode(false);
//             setCurrentEditId(null);
//             setIsModalVisible(true);
//             form.resetFields();
//             setEmployeeSearchValue('');
//             // Set today's date automatically when opening the form
//             form.setFieldsValue({
//               todaysDate: moment().format('YYYY-MM-DD')
//             });
//             const currentEmployee = employees.find(emp => emp.EmployeeId === currentUserId);
//             if (currentEmployee) {
//               form.setFieldsValue({ employeeSelect: currentEmployee.EmployeeId });
//               setEmployeeSearchValue(`${currentEmployee.EmployeeName} (${currentEmployee.EmployeeId})`);
//               handleEmployeeSelection(currentEmployee.EmployeeId);
//             }
//           }}
//           disabled={loading}
//           size="large"
//         >
//           + Create Relieving Letter
//         </Button>
//         <div className={styles.searchContainer}>
//           <Input
//             className={styles.searchInput}
//             placeholder="Search by employee name or ID..."
//             onChange={handleSearch}
//             disabled={loading}
//             prefix={<SearchOutlined className={styles.searchIcon} />}
//             size="large"
//           />
//         </div>
//       </div>

//       <div className={styles.tableContainer}>
//         {filteredData.length === 0 ? (
//           <div className={styles.emptyState}>
//             <div className={styles.emptyStateContent}>
//               <FileTextOutlined className={styles.emptyIcon} />
//               <h3>No Relieving Letters Found</h3>
//               <p>Create your first relieving letter to get started</p>
//             </div>
//           </div>
//         ) : (
//           <Table
//             columns={columns}
//             dataSource={filteredData}
//             pagination={{
//               pageSize: 10,
//               showSizeChanger: true,
//               showQuickJumper: true,
//               showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
//             }}
//             className={styles.customTable}
//             loading={loading}
//             scroll={{ x: 1200 }}
//           />
//         )}
//       </div>

//       <Modal
//         title={
//           <div className={styles.modalTitle}>
//             <FileTextOutlined className={styles.modalTitleIcon} />
//             {isEditMode ? 'Edit Relieving Letter' : 'Create Relieving Letter'}
//           </div>
//         }
//         open={isModalVisible}
//         onCancel={() => {
//           setIsModalVisible(false);
//           setEmployeeSearchValue('');
//         }}
//         footer={null}
//         className={styles.modalContent}
//         wrapClassName={styles.modalOverlay}
//         closable
//         closeIcon={<span className={styles.closeBtn}>&times;</span>}
//         width={900}
//       >
//         <Form form={form} onFinish={handleFormSubmit} layout="vertical" className={styles.formGrid}>
//           {/* Employee Selection */}
//           <Form.Item
//             name="employeeSelect"
//             label={<span className={`${styles.formLabel} ${styles.required}`}>Select Employee</span>}
//             rules={[{ required: true, message: 'Please select an employee' }]}
//             className={`${styles.formGroup} ${styles.fullWidth}`}
//             initialValue={employeeSearchValue}
//           >
//             <Select
//               value={employeeSearchValue}
//               placeholder="Search and select an employee..."
//               onChange={handleEmployeeSelection}
//               onSearch={handleEmployeeSearch}
//               className={styles.formSelect}
//               disabled={isEditMode || loading}
//               showSearch
//               filterOption={false}
//               size="large"
//               suffixIcon={<UserOutlined />}
//               onBlur={() => setEmployeeSearchValue('')}
//             >
//               {employees.map(employee => (
//                 <Option key={employee.EmployeeId} value={employee.EmployeeId}>
//                   <div className={styles.employeeOption}>
//                     <div className={styles.employeeOptionMain}>
//                       <UserOutlined className={styles.employeeOptionIcon} />
//                       <span className={styles.employeeOptionName}>{employee.EmployeeName}</span>
//                     </div>
//                     <span className={styles.employeeOptionId}>({employee.EmployeeId})</span>
//                   </div>
//                 </Option>
//               ))}
//             </Select>
//           </Form.Item>

//           {/* Today's Date - Auto-filled */}
//           <Form.Item
//             name="todaysDate"
//             label={<span className={styles.formLabel}>Today's Date</span>}
//             className={styles.formGroup}
//           >
//             <Input 
//               disabled 
//               className={styles.formInput} 
//               size="large"
//               prefix={<CalendarOutlined className={styles.inputIcon} />}
//             />
//           </Form.Item>

//           {/* Employee Details - Read Only */}
//           <Form.Item
//             name="employeeName"
//             label={<span className={styles.formLabel}>Employee Name</span>}
//             className={styles.formGroup}
//           >
//             <Input 
//               disabled 
//               className={styles.formInput} 
//               size="large"
//               prefix={<UserOutlined className={styles.inputIcon} />}
//             />
//           </Form.Item>

//           <Form.Item
//             name="empId"
//             label={<span className={styles.formLabel}>EMP ID</span>}
//             className={styles.formGroup}
//           >
//             <Input 
//               disabled 
//               className={styles.formInput} 
//               size="large"
//               prefix={<IdcardOutlined className={styles.inputIcon} />}
//             />
//           </Form.Item>

//           <Form.Item
//             name="designation"
//             label={<span className={styles.formLabel}>Designation</span>}
//             className={styles.formGroup}
//           >
//             <Input 
//               disabled 
//               className={styles.formInput} 
//               size="large"
//               prefix={<TeamOutlined className={styles.inputIcon} />}
//             />
//           </Form.Item>

//           <Form.Item
//             name="joiningDate"
//             label={<span className={styles.formLabel}>Joining Date</span>}
//             className={styles.formGroup}
//           >
//             <Input 
//               disabled 
//               className={styles.formInput} 
//               size="large"
//               prefix={<CalendarOutlined className={styles.inputIcon} />}
//             />
//           </Form.Item>

//           <Form.Item
//             name="employeeEmail"
//             label={<span className={styles.formLabel}>Employee Email</span>}
//             className={styles.formGroup}
//           >
//             <Input 
//               disabled 
//               className={styles.formInput} 
//               size="large"
//               prefix={<MailOutlined className={styles.inputIcon} />}
//             />
//           </Form.Item>

//           {/* Date Fields */}
//           <Form.Item
//             name="resignationDate"
//             label={<span className={`${styles.formLabel} ${styles.required}`}>Resignation Date</span>}
//             rules={[{ required: true, message: 'Please select resignation date' }]}
//             className={styles.formGroup}
//           >
//             <DatePicker 
//               className={styles.formInput} 
//               format="YYYY-MM-DD" 
//               disabled={loading} 
//               size="large"
//               style={{ width: '100%' }}
//               suffixIcon={<CalendarOutlined />}
//               placeholder="Select resignation date"
//             />
//           </Form.Item>

//           <Form.Item
//             name="lastWorkingDate"
//             label={<span className={`${styles.formLabel} ${styles.required}`}>Last Working Date (LWD)</span>}
//             rules={[{ required: true, message: 'Please select last working date' }]}
//             className={styles.formGroup}
//           >
//             <DatePicker 
//               className={styles.formInput} 
//               format="YYYY-MM-DD" 
//               disabled={loading} 
//               size="large"
//               style={{ width: '100%' }}
//               suffixIcon={<CalendarOutlined />}
//               placeholder="Select last working date"
//             />
//           </Form.Item>

//           <Form.Item
//             name="relievingDate"
//             label={<span className={`${styles.formLabel} ${styles.required}`}>Relieving Date</span>}
//             rules={[{ required: true, message: 'Please select relieving date' }]}
//             className={styles.formGroup}
//           >
//             <DatePicker 
//               className={styles.formInput} 
//               format="YYYY-MM-DD" 
//               disabled={loading} 
//               size="large"
//               style={{ width: '100%' }}
//               suffixIcon={<CalendarOutlined />}
//               placeholder="Select relieving date"
//             />
//           </Form.Item>

//           {/* Financial Information */}
//           <Form.Item
//             name="ctcSalary"
//             label={<span className={styles.formLabel}>CTC/Salary (Annual)</span>}
//             className={styles.formGroup}
//           >
//             <InputNumber
//               className={styles.formInput}
//               size="large"
//               style={{ width: '100%' }}
//               prefix={<DollarOutlined />}
//               formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
//               parser={value => value.replace(/₹\s?|(,*)/g, '')}
//               placeholder="Enter annual CTC/Salary"
//               min={0}
//               precision={2}
//             />
//           </Form.Item>

//           <Form.Item
//             name="bonus"
//             label={<span className={styles.formLabel}>Bonus Amount</span>}
//             className={styles.formGroup}
//           >
//             <InputNumber
//               className={styles.formInput}
//               size="large"
//               style={{ width: '100%' }}
//               prefix={<TrophyOutlined />}
//               formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
//               parser={value => value.replace(/₹\s?|(,*)/g, '')}
//               placeholder="Enter bonus amount"
//               min={0}
//               precision={2}
//             />
//           </Form.Item>

//           <Form.Item
//             name="variables"
//             label={<span className={styles.formLabel}>Variable Pay</span>}
//             className={styles.formGroup}
//           >
//             <InputNumber
//               className={styles.formInput}
//               size="large"
//               style={{ width: '100%' }}
//               prefix={<LineChartOutlined />}
//               formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
//               parser={value => value.replace(/₹\s?|(,*)/g, '')}
//               placeholder="Enter variable pay amount"
//               min={0}
//               precision={2}
//             />
//           </Form.Item>

//           <div className={styles.modalFooter}>
//             <Button
//               className={styles.btnCancel}
//               onClick={() => {
//                 setIsModalVisible(false);
//                 setEmployeeSearchValue('');
//               }}
//               disabled={loading}
//               size="large"
//             >
//               Cancel
//             </Button>
//             <Button
//               type="primary"
//               htmlType="submit"
//               className={styles.btnSubmit}
//               loading={loading}
//               size="large"
//             >
//               {isEditMode ? 'Update Letter' : 'Create Letter'}
//             </Button>
//           </div>
//         </Form>
//       </Modal>

//       <div
//         className={`${styles.notification} ${styles[notification.type]} ${notification.visible ? styles.show : ''}`}
//       >
//         <div className={styles.notificationContent}>
//           <div className={styles.notificationMessage}>{notification.message}</div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RelievingLetter;






import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, Spin, message, InputNumber } from 'antd';
import { FileTextOutlined, UserOutlined, CalendarOutlined, TeamOutlined, MailOutlined, DownloadOutlined } from '@ant-design/icons';
import Cookies from 'js-cookie';
import styles from './RelievingLetter.module.css';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { getEmployeeDetailsForRelievingLetter, createRelievingLetter, getRelievingLetters, downloadRelievingLetter } from '../../services/api';

const { Option } = Select;

export const RelievingLetter = () => {
  const currentUserId = Cookies.get('employeeId');
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUserId) {
      message.warning('No user session found. Please log in.');
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchEmployeeDetails(), fetchRelievingLetters()]);
      } catch (error) {
        message.error(error.response?.data?.message || 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId, navigate]);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await getEmployeeDetailsForRelievingLetter();
      if (response.data.status === 'success') {
        setEmployees(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch employee details');
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch employee details');
    }
  };

  const fetchRelievingLetters = async () => {
    try {
      const response = await getRelievingLetters();
      if (response.data.status === 'success') {
        const letters = response.data.data.map((letter) => ({
          key: letter.id,
          employeeName: letter.employeeName,
          pdfPath: letter.pdfPath,
          generationDate: letter.generationDate,
          employeeEmail: letter.employeeEmail,
        }));
        setTableData(letters);
      } else {
        throw new Error(response.data.message || 'Failed to fetch relieving letters');
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch relieving letters');
    }
  };

  const handleEmployeeSelection = (value) => {
    const employee = employees.find(emp => emp.EmployeeId === value);
    if (employee) {
      form.setFieldsValue({
        employeeName: employee.EmployeeName,
        empId: employee.EmployeeId,
        designation: employee.SubRoleName,
        joiningDate: employee.DateOfJoining ? moment(employee.DateOfJoining) : null,
        employeeEmail: employee.PersonalEmail || '',
      });
    } else {
      form.resetFields(['employeeName', 'empId', 'designation', 'joiningDate', 'employeeEmail']);
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      setLoading(true);
      const payload = {
        employeeId: values.empId,
        employeeName: values.employeeName,
        designation: values.designation,
        joiningDate: values.joiningDate ? values.joiningDate.format('YYYY-MM-DD') : null,
        lastWorkingDate: values.lastWorkingDate ? values.lastWorkingDate.format('YYYY-MM-DD') : null,
        relievingDate: values.relievingDate ? values.relievingDate.format('YYYY-MM-DD') : null,
        resignationDate: values.resignationDate ? values.resignationDate.format('YYYY-MM-DD') : null,
        ctcSalary: values.ctcSalary,
        bonus: values.bonus,
        variables: values.variables,
        employeeEmail: values.employeeEmail,
      };

      const response = await createRelievingLetter(payload);
      if (response.data.status === 'success') {
        message.success('Relieving letter generated and emailed successfully!');
        setIsModalVisible(false);
        form.resetFields();
        await fetchRelievingLetters();
      } else {
        throw new Error(response.data.message || 'Failed to create relieving letter');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (record) => {
    try {
      setLoading(true);
      const response = await downloadRelievingLetter(record.key);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', record.pdfPath.split('/').pop());
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Failed to download PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Employee Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text) => (
        <div className={styles.employeeCell}>
          <UserOutlined className={styles.cellIcon} />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: 'Document',
      dataIndex: 'pdfPath',
      key: 'pdfPath',
      render: (text) => text.split('/').pop(),
    },
    {
      title: 'Generation Date',
      dataIndex: 'generationDate',
      key: 'generationDate',
      render: (text) => (
        <div className={styles.dateCell}>
          <CalendarOutlined className={styles.cellIcon} />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          className={styles.downloadBtn}
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(record)}
          disabled={loading}
          size="small"
        >
          Download
        </Button>
      ),
    },
  ];

  if (!currentUserId) {
    return (
      <div className={styles.exitLetterContainer}>
        <div className={styles.loadingContainer}>
          <Spin size="large" tip="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.exitLetterContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <FileTextOutlined className={styles.headerIcon} />
            <div>
              <h1 className={styles.pageTitle}>Relieving Letter Management</h1>
              <p className={styles.pageSubtitle}>Create and manage employee relieving letters</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actionBar}>
        <Button
          className={styles.createButton}
          onClick={() => {
            setIsModalVisible(true);
            form.resetFields();
          }}
          disabled={loading}
          size="large"
        >
          + Create Relieving Letter
        </Button>
      </div>

      <div className={styles.tableContainer}>
        {tableData.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <FileTextOutlined className={styles.emptyIcon} />
              <h3>No Relieving Letters Found</h3>
              <p>Create your first relieving letter to get started</p>
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            }}
            className={styles.customTable}
            loading={loading}
            scroll={{ x: 800 }}
          />
        )}
      </div>

      <Modal
        title={
          <div className={styles.modalTitle}>
            <FileTextOutlined className={styles.modalTitleIcon} />
            Create Relieving Letter
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        className={styles.modalContent}
        wrapClassName={styles.modalOverlay}
        closable
        closeIcon={<span className={styles.closeBtn}>&times;</span>}
        width={900}
      >
        <Form form={form} onFinish={handleFormSubmit} layout="vertical" className={styles.formGrid}>
          <Form.Item
            name="empId"
            label={<span className={`${styles.formLabel} ${styles.required}`}>Select Employee</span>}
            rules={[{ required: true, message: 'Please select an employee' }]}
            className={`${styles.formGroup} ${styles.fullWidth}`}
          >
            <Select
              placeholder="Search and select an employee..."
              onChange={handleEmployeeSelection}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              size="large"
              suffixIcon={<UserOutlined />}
            >
              {employees.map(employee => (
                <Option key={employee.EmployeeId} value={employee.EmployeeId}>
                  <div className={styles.employeeOption}>
                    <div className={styles.employeeOptionMain}>
                      <UserOutlined className={styles.employeeOptionIcon} />
                      <span className={styles.employeeOptionName}>{employee.EmployeeName}</span>
                    </div>
                    <span className={styles.employeeOptionId}>({employee.EmployeeId})</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="employeeName"
            label={<span className={styles.formLabel}>Employee Name</span>}
            className={styles.formGroup}
          >
            <Input disabled className={styles.formInput} size="large" prefix={<UserOutlined className={styles.inputIcon} />} />
          </Form.Item>

          <Form.Item
            name="designation"
            label={<span className={styles.formLabel}>Designation</span>}
            className={styles.formGroup}
          >
            <Input disabled className={styles.formInput} size="large" prefix={<TeamOutlined className={styles.inputIcon} />} />
          </Form.Item>

          <Form.Item
            name="joiningDate"
            label={<span className={styles.formLabel}>Joining Date</span>}
            className={styles.formGroup}
          >
            <DatePicker disabled format="YYYY-MM-DD" style={{ width: '100%' }} size="large" suffixIcon={<CalendarOutlined />} />
          </Form.Item>

          <Form.Item
            name="employeeEmail"
            label={<span className={styles.formLabel}>Employee Email</span>}
            className={styles.formGroup}
          >
            <Input disabled className={styles.formInput} size="large" prefix={<MailOutlined className={styles.inputIcon} />} />
          </Form.Item>

          <Form.Item
            name="resignationDate"
            label={<span className={`${styles.formLabel} ${styles.required}`}>Resignation Date</span>}
            rules={[{ required: true, message: 'Please select resignation date' }]}
            className={styles.formGroup}
          >
            <DatePicker
              className={styles.formInput}
              format="YYYY-MM-DD"
              disabled={loading}
              size="large"
              style={{ width: '100%' }}
              suffixIcon={<CalendarOutlined />}
              placeholder="Select resignation date"
            />
          </Form.Item>

          <Form.Item
            name="lastWorkingDate"
            label={<span className={`${styles.formLabel} ${styles.required}`}>Last Working Date</span>}
            rules={[{ required: true, message: 'Please select last working date' }]}
            className={styles.formGroup}
          >
            <DatePicker
              className={styles.formInput}
              format="YYYY-MM-DD"
              disabled={loading}
              size="large"
              style={{ width: '100%' }}
              suffixIcon={<CalendarOutlined />}
              placeholder="Select last working date"
            />
          </Form.Item>

          <Form.Item
            name="relievingDate"
            label={<span className={`${styles.formLabel} ${styles.required}`}>Relieving Date</span>}
            rules={[{ required: true, message: 'Please select relieving date' }]}
            className={styles.formGroup}
          >
            <DatePicker
              className={styles.formInput}
              format="YYYY-MM-DD"
              disabled={loading}
              size="large"
              style={{ width: '100%' }}
              suffixIcon={<CalendarOutlined />}
              placeholder="Select relieving date"
            />
          </Form.Item>

          <Form.Item
            name="ctcSalary"
            label={<span className={`${styles.formLabel} ${styles.required}`}>CTC/Salary (₹)</span>}
            rules={[{ required: true, message: 'Please enter CTC/Salary' }]}
            className={styles.formGroup}
          >
            <InputNumber
              className={styles.formInput}
              min={0}
              step={1000}
              size="large"
              style={{ width: '100%' }}
              placeholder="Enter CTC/Salary in ₹"
              formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="bonus"
            label={<span className={`${styles.formLabel} ${styles.required}`}>Bonus (₹)</span>}
            rules={[{ required: true, message: 'Please enter bonus' }]}
            className={styles.formGroup}
          >
            <InputNumber
              className={styles.formInput}
              min={0}
              step={1000}
              size="large"
              style={{ width: '100%' }}
              placeholder="Enter bonus in ₹"
              formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="variables"
            label={<span className={`${styles.formLabel} ${styles.required}`}>Variables (₹)</span>}
            rules={[{ required: true, message: 'Please enter variables' }]}
            className={styles.formGroup}
          >
            <InputNumber
              className={styles.formInput}
              min={0}
              step={1000}
              size="large"
              style={{ width: '100%' }}
              placeholder="Enter variables in ₹"
              formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <div className={styles.modalFooter}>
            <Button
              className={styles.btnCancel}
              onClick={() => setIsModalVisible(false)}
              disabled={loading}
              size="large"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              className={styles.btnSubmit}
              loading={loading}
              size="large"
            >
              Create Letter
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default RelievingLetter;