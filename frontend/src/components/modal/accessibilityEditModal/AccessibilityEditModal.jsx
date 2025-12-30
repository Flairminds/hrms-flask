import { Button, Input, message, Modal, Select } from 'antd';
import React, { useState, useEffect } from 'react';
import styles from "./AccessibilityEditModal.module.css";
import { addAccessibility } from '../../../services/api';

export const AccessibilityEditModal = ({ emailIds, isEditModal, setIsEditModal, empId, selectedEmployee ,fetchData}) => {
  const [formValues, setFormValues] = useState({
    EmployeeName: '',
    RoleId: null,
    Password: '',
    Email: '',
  });

  // New state for email validation
  const [isFormValid, setIsFormValid] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true); 

  const roleOptions = [
    { value: 1, label: 'Lead' },
    { value: 2, label: 'Employee' },
    { value: 3, label: 'HR' },
  ];

  useEffect(() => {
    if (selectedEmployee) {
      const selectedRole = roleOptions.find(role => role.label === selectedEmployee.RoleName);
      setFormValues({
        EmployeeName: selectedEmployee.EmployeeName || '',
        RoleId: selectedRole ? selectedRole.value : null,
        Password: '',
        Email: selectedEmployee.Email || '',
      });
    }
  }, [selectedEmployee]);

  useEffect(() => {
    validateForm();
  }, [formValues, isEmailValid]); 

  const [loader, setLoader] = useState(false);

  const handleCancel = () => {
    setIsEditModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));

    if (name === 'Email') {
      
      checkEmail(value); 

    }
  };

  const handleRoleChange = (value) => {
    setFormValues((prevValues) => ({
      ...prevValues,
      RoleId: value,
    }));
  };

  const validateForm = () => {
    const { EmployeeName, RoleId, Email } = formValues;
    // Include isEmailValid in the form validation
    if (EmployeeName && RoleId  && Email && isEmailValid) { // <-- Updated this line
      setIsFormValid(true);
    } else {
      setIsFormValid(false);
    }
  };

  // New function to check if the email exists
  const checkEmail = (email) => { 
    
    if (emailIds.includes(email)) {
      setIsEmailValid(false);
      message.error('This email is already taken');
    } else {
      setIsEmailValid(true);
    }
  };

  const handleApply = async () => {
    setLoader(true);

    const payload = {
      employeeId: empId,
      password: formValues.Password,
      roleId: formValues.RoleId,
      email: formValues.Email,
    };

    try {
      const response = await addAccessibility(payload);
      fetchData()
      message.success('Accessibility data added successfully');
    } catch {
      message.error('Failed to apply accessibility');
    }
    setLoader(false);
    setIsEditModal(false);
  };

  return (
    <div>
      <Modal
        open={isEditModal}
        footer={[
          <div key="footer-buttons" className={styles.btnDiv}>
            <Button key="cancel-button" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              key="apply-button" 
              className={styles.filledINbtn} 
              onClick={handleApply} 
              loading={loader} 
              disabled={!isFormValid || !isEmailValid} // <-- Updated this line
            >
              Apply
            </Button>
          </div>
        ]}
        width={700}
        onCancel={handleCancel}
        centered
      >
        <div className={styles.formContainer}>
          <div className={styles.inputGroup}>
            <label>Employee Name*</label>
            <Input
              name='EmployeeName'
              value={formValues.EmployeeName}
              onChange={handleInputChange}
              placeholder="Enter Employee Name"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Role Name*</label>
            <Select
              value={formValues.RoleId}
              onChange={handleRoleChange}
              options={roleOptions}
              placeholder="Select Role"
              optionLabelProp="label"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>New Password*</label>
            <Input.Password
              name='Password'
              value={formValues.Password}
              onChange={handleInputChange}
              placeholder="Enter Password"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Email*</label>
            <Input
              name='Email'
              value={formValues.Email}
              onChange={handleInputChange}
              placeholder="Enter Email"
              status={!isEmailValid ? 'error' : ''} // <-- Updated this line to change input box color to red if email is invalid
            />
            {!isEmailValid && ( // <-- Added this block to show an error message if the email is taken
              <span className={styles.errorMessage}>This email is already taken</span> // <-- Added this line
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
