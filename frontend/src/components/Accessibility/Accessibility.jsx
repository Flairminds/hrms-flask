import React, { useState, useEffect } from 'react';
import { Button, Modal, Form } from 'antd';
import { addAccessibility, getaccessbilitydetails} from '../../services/api';
import styles from './Accessibility.module.css';
import AccessibilityModal from '../modal/AccessibilityModal/AccessibilityModal';
import {AccessibilityEditModal} from "../../components/modal/accessibilityEditModal/AccessibilityEditModal"
import { toast } from 'react-toastify';

const Accessibility = () => {
  const [data, setData] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessLeaveModal, setAccessLeaveModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const[isEditModal,setIsEditModal] = useState(false)
  const [emailIds, setEmailIds] = useState([]);
  const [form] = Form.useForm();


  const dummyData = [
    {
      "EmployeeName": "Aarti Barve",
      "RoleName": "Lead",
      "Email": "aarti.barve@flairminds.com",
      "Password": "Aarti@123"
    },
    {
      "EmployeeName": "Abhinav Vaidya",
      "RoleName": "Employee",
      "Email": "abhinav.vaidya@flairminds.com",
      "Password": "Abhinav@123"
    }
  ];


  const fetchData = async () => {
    try {
      const response = await getaccessbilitydetails();
     
      const employeeData = response.data;
      const emails = employeeData.map(emp => emp.Email);
      setEmailIds(emails);
      setData(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Error fetching the data', error);
      setError('Error fetching the data');
      setData(dummyData);
      setFilteredEmployees(dummyData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setFilteredEmployees(
      data.filter(employee =>
        employee.EmployeeName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, data]);

  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsEditing(false);
    setAccessLeaveModal(true);
  };

  const handleEditClick = (e, employee) => {
    e.stopPropagation(); 
  setSelectedEmployee(employee); 
  setIsEditModal(true);
  };

  const handleModalCancel = () => {
    setAccessLeaveModal(false);
    setSelectedEmployee(null);
    form.resetFields();
  };
  const handleFormSubmit = async (values) => {
    try {
      setIsAdding(true);
      const employeeId = isEditing ? editingKey : data.length + 1;
      let formDataWithId = {
        ...values,
        EmployeeId: employeeId,
        Password: values.Password || (isEditing && selectedEmployee.Password) || "Default@123",
      };
      
      const res = await addAccessibility(formDataWithId);
      
      if (res.status === 200) {
        toast.success("Data Added");
    
        if (isEditing) {
          const updatedData = data.map(emp =>
            emp.EmployeeId === editingKey ? { ...emp, ...formDataWithId } : emp
          );
          setData(updatedData);
          setFilteredEmployees(updatedData);
        } else {
          const newEmployee = { ...formDataWithId, key: data.length + 1 };
          setData([...data, newEmployee]);
          setFilteredEmployees([...data, newEmployee]);
        }
        
        form.resetFields();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
      setAccessLeaveModal(false);
      setIsEditing(false);
      setEditingKey(null);
    }
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
          >
            Add
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
                <th className={styles.th}>Role Name</th>
                <th className={styles.th}>Email Id</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => (
                <tr
                  key={`${employee.EmployeeId}-${employee.EmployeeName}`}
                  onClick={() => setSelectedEmployee(employee)}
                  className={selectedEmployee?.EmployeeName === employee.EmployeeName ? styles.selectedRow : ''}
                >
                  <td className={styles.td}>{employee.EmployeeId}</td>
                  <td className={styles.td}>{employee.EmployeeName}</td>
                  <td className={styles.td}>{employee.RoleName}</td>
                  <td className={styles.td}>{employee.Email}</td>
                  <td className={styles.td}>
                    <button onClick={(e) => handleEditClick(e, employee)} className={styles.addButtonContainer}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal
        title={selectedEmployee ? "Edit Accessibility" : "Add Accessibility"}
        open={accessLeaveModal}
        onCancel={handleModalCancel}
        footer={null}
        centered
        width={600}
      >
        <AccessibilityModal
          selectedEmployee={selectedEmployee}
          onApply={handleFormSubmit}
          form={form}
          fetchData={fetchData}
          emailIds={emailIds}
          // modalAction={selectedEmployee ? 'edit' : 'add'} 
        />
      </Modal>

        <AccessibilityEditModal  emailIds={emailIds} fetchData={fetchData}
         filteredEmployees={filteredEmployees} isEditModal={isEditModal} setIsEditModal={setIsEditModal} selectedEmployee={selectedEmployee}
          empId={selectedEmployee?.EmployeeId}
        />
    </div>
  );
};

export default Accessibility;
