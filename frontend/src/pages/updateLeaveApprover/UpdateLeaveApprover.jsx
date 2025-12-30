import React, { useEffect, useState } from 'react';
import { Form, Select, Input, Button, message } from 'antd';
import styles from './UpdateLeaveApprover.module.css';
import { getEmployeeList as fetchEmployeeListFromAPI, getTypeApprover, updateApprover } from '../../services/api'; 
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const { Option } = Select;

const UpdateLeaveApprover = () => {
  const [employees, setEmployees] = useState([]);
  const [currentApprover, setCurrentApprover] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newApprover, setNewApprover] = useState('');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchEmployeeList = async () => {
    try {
      const response = await fetchEmployeeListFromAPI(); 
      if (Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        console.error("Failed to fetch employee list: Response is not an array");
      }
    } catch (error) {
      console.error("Failed to fetch employee list:", error);
    }
  };

  const getCurrentApprover = async () => {
    if (selectedEmployee) {
      try {
        const response = await getTypeApprover(selectedEmployee.employeeId);
        setCurrentApprover(response.data.approver);
      } catch (error) {
        console.error("Failed to fetch current approver:", error);
      }
    }
  };

  const updateEmployeeApprover = async () => {
    setLoading(true);
    try {
      if (selectedEmployee && newApprover) {
        const res = await updateApprover(selectedEmployee.employeeId, newApprover);
        // 👇 Add this line to fetch the updated current approver
        await getCurrentApprover();
        form.resetFields();
        // setCurrentApprover('');
        message.success("Approver updated Successfully");
      } else {
        message.error("Please select an employee and a new approver.");
      }
    } catch (error) {
      console.error("Error updating approver:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeList();
  }, []);

  useEffect(() => {
    getCurrentApprover();
  }, [selectedEmployee]);

  const handleEmployeeChange = (value) => {
    const selectedEmployee = employees.find((employee) => employee.employeeId === value);
    setSelectedEmployee(selectedEmployee);
    setCurrentApprover('');
    setNewApprover('');
  };

  const handleNewSelectedApprover = (value) => {
    setNewApprover(value);
  };

  const handleSubmit = () => {
    updateEmployeeApprover();
  };

  return (
    <div className={styles.main}>
      <div className={styles.leaveApproverPage}>
        <div className={styles.pageHeadingDiv}>    
          <h2 className={styles.pageHeading}>Update Leave Approver</h2>
        </div>
        <Form className={styles.formDiv} form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item label="Employee Name" name="employeeName" rules={[{ required: true, message: 'Please select an employee' }]}>
            <Select
              placeholder="Select an employee"
              onChange={handleEmployeeChange}
              className={styles.selectDropdown}
              showSearch
              optionFilterProp="children"
              style={{ height: '42px', fontSize: '16px', padding: '0 0px' }} 
            >
              {employees.map((employee) => (
                <Option key={employee.employeeId} value={employee.employeeId}>
                  {`${employee.firstName} ${employee.lastName}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Current Approver">
            <Input
              value={currentApprover}
              disabled
              className={styles.inputSelect}
              style={{ height: '42px', fontSize: '14px', padding: '0 10px' }}
            />
          </Form.Item>

          <Form.Item label="New Approver" name="newApprover" rules={[{ required: true, message: 'Please select a new approver' }]}>
            <Select
              placeholder="Select a new approver"
              className={styles.selectDropdown}
              onChange={handleNewSelectedApprover}
              showSearch
              optionFilterProp="children"
              style={{ height: '42px', fontSize: '16px', padding: '0 0px' }} 
            >
              {employees.map((employee) => (
                <Option key={employee.employeeId} value={employee.employeeId}>
                  {`${employee.firstName} ${employee.lastName}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <div className={styles.button}>
              <Button 
                htmlType="submit" 
                className={styles.btnStyle} 
                loading={loading}
              >
                Update Leave Approver
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default UpdateLeaveApprover;