import React, { useEffect, useState } from 'react';
import { Button, Select, Input, message } from 'antd';
import stylesAccessibility from './AccessibilityModal.module.css';
import { addAccessibility, getEmployeeList } from '../../../services/api';

const { Option } = Select;

const AccessibilityModal = ({ selectedEmployee, onApply, fetchData, emailIds }) => {
  const [employeeList, setEmployeeList] = useState([]);
  const [employeeId, setEmployeeId] = useState(selectedEmployee?.employeeId || '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [email, setEmail] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // New state for form and email validation
  const [isFormValid, setIsFormValid] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const roleOptions = [
    { value: 1, label: 'Lead' },
    { value: 2, label: 'Employee' },
    { value: 3, label: 'HR' },
  ];

  useEffect(() => {
    handleEmployeeList();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      setEmployeeId(selectedEmployee.employeeId);
    }
  }, [selectedEmployee]);

  useEffect(() => {
    validateForm(); // Validate form when any input changes
  }, [employeeId, password, roleId, email, isEmailValid]);

  const handleEmployeeList = async () => {
    try {
      const response = await getEmployeeList();
      setEmployeeList(response.data);
    } catch (error) {
      console.error(error);
      message.error('Failed to fetch employee list');
    }
  };

  const employeeOptions = employeeList.map(employee => ({
    value: employee.employeeId,
    label: `${employee.firstName} ${employee.lastName}`,
  }));

  // Function to check if the email already exists
  const checkEmail = (email) => {
    if (emailIds.includes(email)) {
      setIsEmailValid(false);
      message.error('This email is already taken');
    } else {
      setIsEmailValid(true);
    }
  };

  // Validate the form
  const validateForm = () => {
    if (employeeId && password && roleId && email && isEmailValid) {
      setIsFormValid(true);
    } else {
      setIsFormValid(false);
    }
  };

  const handleApply = async () => {
    if (!isFormValid) {
      message.error('Please fill in all required fields and correct errors before applying.');
      return;
    }

    setIsApplying(true);
    const payload = {
      employeeId,
      password,
      roleId,
      email,
    };

    try {
      const response = await addAccessibility(payload);
      if (response.status === 200) {
        fetchData();
        message.success('Accessibility data added successfully');
        resetForm();
        onApply();
      }
    } catch (error) {
      console.error('Error applying accessibility:', error);
      message.error('Failed to apply accessibility');
    } finally {
      setIsApplying(false);
    }
  };

  // Reset form fields
  const resetForm = () => {
    setEmployeeId('');
    setPassword('');
    setRoleId('');
    setEmail('');
    setIsEmailValid(true);
    setIsFormValid(false);
  };

  const renderAccessibilityForm = () => (
    <div className={stylesAccessibility.main}>
      <div className={stylesAccessibility.fieldContainer}>
        <span className={stylesAccessibility.heading}>Employee Name*</span>
        <Select
          className={stylesAccessibility.employeeName}
          showSearch
          placeholder="Search employee to select"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
          }
          options={employeeOptions}
          onChange={(value) => setEmployeeId(value)}
          value={employeeId}
        />
      </div>
      <div className={stylesAccessibility.fieldContainer}>
        <span className={stylesAccessibility.heading}>Password*</span>
        <Input
          className={stylesAccessibility.input}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
        />
      </div>
      <div className={stylesAccessibility.fieldContainer}>
        <span className={stylesAccessibility.heading}>Role*</span>
        <Select
          className={stylesAccessibility.employeeName}
          placeholder="Select Role"
          onChange={(value) => setRoleId(value)}
          value={roleId}
        >
          {roleOptions.map(role => (
            <Option key={role.value} value={role.value}>
              {role.label}
            </Option>
          ))}
        </Select>
      </div>
      <div className={stylesAccessibility.fieldContainer}>
        <span className={stylesAccessibility.heading}>Email*</span>
        <Input
          className={stylesAccessibility.input}
          placeholder="Email"
          onChange={(e) => {
            setEmail(e.target.value);
            checkEmail(e.target.value); // Validate email as it is entered
          }}
          value={email}
          status={!isEmailValid ? 'error' : ''} // Show error status if email is invalid
        />
        {!isEmailValid && (
          <span className={stylesAccessibility.errorMessage}>This email is already taken</span>
        )}
      </div>
      <div className={stylesAccessibility.footerButtons}>
        <Button
          className={stylesAccessibility.approveButton}
          onClick={handleApply}
          disabled={isApplying || !isFormValid}
          loading={isApplying}
        >
          {isApplying ? 'Applying...' : 'Apply'}
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {renderAccessibilityForm()}
    </div>
  );
};

export default AccessibilityModal;
