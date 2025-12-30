import React, { useState, useEffect } from 'react';
import { Form, Select, Button, Table, Modal, Input, notification, Spin } from 'antd';
import styles from './CapabilityDevelopmentLead.module.css';
import {
  createAssignedCapabilityLead,
  getAssignedCapabilityLeads,
  updateAssignedCapabilityLead,
  deleteAssignedCapabilityLead,
  getEmployeeList,
  getCapabilityLeads,
  createCapabilityLead,
  deleteCapabilityLead,
} from '../../services/api';

const { Option } = Select;
const { Search } = Input;

const CapabilityDevelopmentLead = () => {
  const [form] = Form.useForm();
  const [leadForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleteLeadModalVisible, setIsDeleteLeadModalVisible] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState(null);
  const [deleteLeadId, setDeleteLeadId] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const employeeRes = await getEmployeeList();
        const employeesData = employeeRes.data.data || employeeRes.data || [];
        const mappedEmployees = employeesData.map(emp => ({
          id: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          department: emp.department || 'Unknown'
        }));
        setEmployees(mappedEmployees);

        const leadRes = await getCapabilityLeads();
        const leadsData = leadRes.data.data || leadRes.data || [];
        console.log('Leads Data:', leadsData); // Debug: Log raw lead data
        const mappedLeads = leadsData.map(lead => {
          console.log('Mapping Lead:', lead); // Debug: Log each lead
          return {
            ...lead,
            id: lead.CapabilityDevelopmentLeadId,
            name: mappedEmployees.find(e => e.id === lead.EmployeeId)?.name || 'Unknown'
          };
        });
        console.log('Mapped Leads:', mappedLeads); // Debug: Log mapped leads
        setLeads(mappedLeads);
        setFilteredLeads(mappedLeads);

        const assignmentRes = await getAssignedCapabilityLeads();
        const assignmentsData = assignmentRes.data.data || assignmentRes.data || [];
        console.log('Assignments Data:', assignmentsData); // Debug: Log raw assignment data
        const mappedAssignments = assignmentsData.map(assignment => {
          console.log('Mapping Assignment:', assignment); // Debug: Log each assignment
          return {
            ...assignment,
            id: assignment.CapabilityDevelopmentLeadAssignmentId,
            employeeName: mappedEmployees.find(e => e.id === assignment.AssignedEmployeeId)?.name || 'Unknown',
            leadName: mappedEmployees.find(e => e.id === (
              mappedLeads.find(l => l.id === assignment.CapabilityDevelopmentLeadId)?.EmployeeId
            ))?.name || 'Unknown'
          };
        });
        console.log('Mapped Assignments:', mappedAssignments); // Debug: Log mapped assignments
        setAssignments(mappedAssignments);
        setFilteredAssignments(mappedAssignments);
      } catch (error) {
        console.error('Fetch Error:', error);
        notification.error({
          message: 'Error',
          description: 'Failed to fetch data. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);



  // Reset leadId field when leads change
  useEffect(() => {
    form.setFieldsValue({ leadId: undefined });
  }, [leads, form]);

  // Handle adding new Capability Development Leads
  const handleCreateLead = async (values) => {
    if (!values.employeeIds || values.employeeIds.length === 0) {
      notification.error({
        message: 'Error',
        description: 'Please select at least one employee.',
      });
      return;
    }

    setSubmittingLead(true);
    try {
      const response = await createCapabilityLead({ employeeIds: values.employeeIds });
      const newLeadData = response.data.data || response.data;
      console.log('New Lead Data:', newLeadData); // Debug: Log new lead data
      const updatedLeads = [...leads, ...(Array.isArray(newLeadData) ? newLeadData : [newLeadData])].map((lead) => ({
        ...lead,
        id: lead.CapabilityDevelopmentLeadId,
        name: employees.find((e) => e.id === lead.EmployeeId)?.name || 'Unknown',
      }));
      console.log('Updated Leads:', updatedLeads); // Debug: Log updated leads
      setLeads(updatedLeads);
      setFilteredLeads(updatedLeads);
      leadForm.resetFields();
      notification.success({
        message: 'Success',
        description: 'Capability Development Leads added successfully!',
      });
    } catch (error) {
      console.error('Create Lead Error:', error); // Debug: Log error
      notification.error({
        message: 'Error',
        description: 'Failed to add Capability Development Leads. Please try again.',
      });
    } finally {
      setSubmittingLead(false);
    }
  };


  // Handle deleting a Capability Development Lead
  const handleDeleteLead = async () => {
    if (!deleteLeadId) {
      notification.error({
        message: 'Error',
        description: 'Invalid lead ID. Please try again.',
      });
      setIsDeleteLeadModalVisible(false);
      return;
    }
    try {
      console.log('Deleting Lead ID:', deleteLeadId); // Debug: Log ID
      const response = await deleteCapabilityLead(deleteLeadId);
      // Extract deleted assignment IDs from response
      const deletedAssignmentIds = response?.data?.data?.deletedAssignmentIds || [];
    // 1. Remove the deleted lead from leads list
     const updatedLeads = leads.filter((l) => l.id !== deleteLeadId);
     setLeads(updatedLeads);
     setFilteredLeads(updatedLeads);
      // 2. Remove related assignments immediately
      const updatedAssignments = assignments.filter(
        (a) => !deletedAssignmentIds.includes(a.id)
      );
      setAssignments(updatedAssignments);
      setFilteredAssignments(updatedAssignments);

    //   const updatedLeads = leads.filter((l) => l.id !== deleteLeadId);
    //   setLeads(updatedLeads);
    //   setFilteredLeads(updatedLeads);
      setIsDeleteLeadModalVisible(false);
      setDeleteLeadId(null);
      notification.success({
        message: 'Success',
        // description: 'Capability Development Lead deleted successfully!',
        description: 'Capability Development Lead and related assignments deleted successfully!',
      });
    } catch (error) {
      console.error('Delete Lead Error:', error); // Debug: Log error
      notification.error({
        message: 'Error',
        description: 'Failed to delete Capability Development Lead. Please try again.',
      });
    }
  };

  // Handle creating an assignment
  const handleCreateAssignment = async (values) => {
    console.log('Form Values:', values); // Debug: Log form values
    try {
      const existingAssignment = assignments.find(
        (a) => a.AssignedEmployeeId === values.employeeId && a.CapabilityDevelopmentLeadId === values.leadId
      );
      if (existingAssignment) {
        notification.error({
          message: 'Error',
          description: 'This employee already has an assignment with this lead.',
        });
        return;
      }

      const newAssignment = {
        employeeId: values.employeeId,
        leadId: values.leadId,
        employeeName: employees.find((e) => e.id === values.employeeId)?.name,
        leadName: leads.find((l) => l.id === values.leadId)?.name,
      };

      console.log('Sending Assignment Payload:', newAssignment); // Debug: Log payload
      const response = await createAssignedCapabilityLead(newAssignment);
      console.log('Assignment Response:', response.data); // Debug: Log response
      const newAssignmentData = response.data.data || response.data;
      const updatedAssignments = [...assignments, {
        ...newAssignmentData,
        AssignedEmployeeId: newAssignment.employeeId,
        id: newAssignmentData.CapabilityDevelopmentLeadAssignmentId,
        employeeName: newAssignment.employeeName,
        CapabilityDevelopmentLeadId: newAssignment.leadId,
        leadName: newAssignment.leadName
        // CapabilityDevelopmentLeadAssignmentId
        // CapabilityDevelopmentLeadAssignmentId:newAssignment.
      }];

      console.log('Updated Assignments-----------:', updatedAssignments); // Debug: Log updated assignments
      setAssignments(updatedAssignments);
      console.log(' Assignments-----------:', assignments); 
      console.log(' Assignments-----------:', assignments); 
      // Debug: Log updated assignments
      setFilteredAssignments(updatedAssignments);
      form.resetFields();
      notification.success({
        message: 'Success',
        description: 'Assignment created successfully!',
      });
    } catch (error) {
      console.error('Create Assignment Error:', error); // Debug: Log error
      notification.error({
        message: 'Error',
        description: 'Failed to create assignment. Please try again.',
      });
    }
  };

  // Handle updating an assignment
  const handleUpdateAssignment = async (values) => {
    try {
      const updatedAssignment = {
        id: currentEditId,
        employeeId: values.employeeId,
        leadId: values.leadId,
        employeeName: employees.find((e) => e.id === values.employeeId)?.name,
        leadName: leads.find((l) => l.id === values.leadId)?.name,
      };

      console.log('Updating Assignment ID:', currentEditId); // Debug: Log ID
      const response = await updateAssignedCapabilityLead(currentEditId, { employeeId: values.employeeId, leadId: values.leadId });
      const updatedAssignments = assignments.map((a) =>
        a.id === currentEditId ? { 
            ...response.data.data, 
            employeeName: updatedAssignment.employeeName, 
            leadName: updatedAssignment.leadName,
            AssignedEmployeeId:values.employeeId,
            CapabilityDevelopmentLeadId:values.leadId,
            id: currentEditId,
        } : a
      );
      console.log('XYZ Assignments-----------:', updatedAssignments); // Debug: Log updated assignments
      setAssignments(updatedAssignments);
      console.log('ABC Assignments-----------:', assignments); 
      console.log(' DEF Assignments-----------:', assignments); 
      // Debug: Log updated assignments
      setFilteredAssignments(updatedAssignments);
      setIsEditModalVisible(false);
      setCurrentEditId(null);
      notification.success({
        message: 'Success',
        description: 'Assignment updated successfully!',
      });
    } catch (error) {
      console.error('Update Assignment Error:', error); // Debug: Log error
      notification.error({
        message: 'Error',
        description: 'Failed to update assignment. Please try again.',
      });
    }
  };

  // Handle deleting an assignment
  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentId) {
      notification.error({
        message: 'Error',
        description: 'Invalid assignment ID. Please try again.',
      });
      setIsDeleteModalVisible(false);
      return;
    }
    try {
      console.log('Deleting Assignment ID:', deleteAssignmentId); // Debug: Log ID
      await deleteAssignedCapabilityLead(deleteAssignmentId);
      const updatedAssignments = assignments.filter((a) => a.id !== deleteAssignmentId);
      setAssignments(updatedAssignments);
      setFilteredAssignments(updatedAssignments);
      setIsDeleteModalVisible(false);
      setDeleteAssignmentId(null);
      notification.success({
        message: 'Success',
        description: 'Assignment deleted successfully!',
      });
    } catch (error) {
      console.error('Delete Assignment Error:', error); // Debug: Log error
      notification.error({
        message: 'Error',
        description: 'Failed to delete assignment. Please try again.',
      });
    }
  };

  // Handle search for leads and assignments
  const handleSearch = (value, context) => {
    const searchTerm = value.toLowerCase();
    if (context === 'leads') {
      const filtered = leads.filter(
        (lead) => lead.name?.toLowerCase().includes(searchTerm)
      );
      setFilteredLeads(filtered);
    } else if (context === 'assignments') {
      const filtered = assignments.filter(
        (assignment) =>
          assignment.employeeName?.toLowerCase().includes(searchTerm) ||
          assignment.leadName?.toLowerCase().includes(searchTerm)
      );
      setFilteredAssignments(filtered);
    }
  };

  // Open edit modal for assignments
  const showEditModal = (record) => {
    console.log('Edit Record:', record); // Debug: Log record
    if (!record.id) {
      console.error('Invalid record ID for edit:', record);
      notification.error({
        message: 'Error',
        description: 'Invalid assignment ID for editing.',
      });
      return;
    }
    setCurrentEditId(record.id);
    editForm.setFieldsValue({
      employeeId: record.AssignedEmployeeId,
      leadId: record.CapabilityDevelopmentLeadId,
    });
    setIsEditModalVisible(true);
  };

  // Open delete confirmation modal for assignments
  const showDeleteModal = (record) => {
    console.log('Delete Assignment Record:', record); // Debug: Log record
    if (!record.id) {
      console.error('Invalid record ID for delete assignment:', record);
      notification.error({
        message: 'Error',
        description: 'Invalid assignment ID for deletion.',
      });
      return;
    }
    setDeleteAssignmentId(record.id);
    setDeleteMessage(
      `Are you sure you want to delete the assignment for ${record.employeeName} with ${record.leadName}?`
    );
    setIsDeleteModalVisible(true);
  };

  // Open delete confirmation modal for leads
  const showDeleteLeadModal = (record) => {
    console.log('Delete Lead Record:', record); // Debug: Log record
    if (!record.id) {
      console.error('Invalid record ID for delete lead:', record);
      notification.error({
        message: 'Error',
        description: 'Invalid lead ID for deletion.',
      });
      return;
    }
    setDeleteLeadId(record.id);
    setDeleteMessage(
      `Are you sure you want to delete the Capability Development Lead ${record.name}?`
    );
    setIsDeleteLeadModalVisible(true);
  };

  // Table columns for Capability Development Leads
  const leadColumns = [
    {
      title: 'Lead Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className={styles.actionButtons}>
          <Button danger size="small" onClick={() => showDeleteLeadModal(record)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Table columns for Assignments
  const assignmentColumns = [
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
    },
    {
      title: 'Lead',
      dataIndex: 'leadName',
      key: 'leadName',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className={styles.actionButtons}>
          <Button type="primary" size="small" onClick={() => showEditModal(record)}>
            Edit
          </Button>
          <Button danger size="small" onClick={() => showDeleteModal(record)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Capability Development Lead Management System</h1>
        <p>Manage Capability Development Leads and their assignments to employees</p>
      </div>

      <div className={styles.mainContent}>
        {/* Add Capability Development Leads */}
        <div className={styles.section}>
          <h2>Add Capability Development Leads</h2>
          <Spin spinning={loading}>
            <Form
              form={leadForm}
              layout="vertical"
              onFinish={handleCreateLead}
              className={styles.formGrid}
            >
              <Form.Item
                label="Select Employees"
                name="employeeIds"
                rules={[{ required: true, message: 'Please select at least one employee!' }]}
                help="Select employees to assign as Capability Development Leads"
              >
                <Select
                  mode="multiple"
                  placeholder="Select Employees"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                  aria-label="Select employees to assign as Capability Development Leads"
                  allowClear
                  style={{ width: '100%' }}
                  tagRender={({ label, closable, onClose }) => (
                    <span
                      className="ant-select-selection-item"
                      style={{
                        background: '#e0e7ff',
                        color: '#1e3a8a',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        margin: '2px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      {label}
                      {closable && (
                        <span
                          onClick={onClose}
                          style={{ marginLeft: '8px', cursor: 'pointer', color: '#ef4444' }}
                          role="button"
                          aria-label="Remove"
                        >
                          ×
                        </span>
                      )}
                    </span>
                  )}
                >
                  {employees.map((employee) => (
                    <Option key={employee.id} value={employee.id}>
                      {employee.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item>
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                  <Button type="primary" htmlType="submit" loading={submittingLead}>
                    Add Leads
                  </Button>
                  <Button
                    className={styles.btnSecondary}
                    onClick={() => leadForm.resetFields()}
                    disabled={submittingLead}
                  >
                    Reset Form
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Spin>
        </div>

        {/* Create New Assignment */}
        <div className={styles.section}>
          <h2>Create New Assignment</h2>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateAssignment}
            className={styles.formGrid}
          >
            <Form.Item
              label="Employee"
              name="employeeId"
              rules={[{ required: true, message: 'Please select an employee!' }]}
            >
              <Select
                placeholder="Select Employee"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {employees.map((employee) => (
                  <Option key={employee.id} value={employee.id}>
                    {employee.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="Capability Development Lead"
              name="leadId"
              rules={[{ required: true, message: 'Please select a lead!' }]}
            >
              <Select
                placeholder="Select Lead"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {leads.map((lead) => (
                  <Option key={lead.id} value={lead.id}>
                    {lead.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item>
              <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                <Button type="primary" htmlType="submit">
                  Create Assignment
                </Button>
                <Button
                  className={styles.btnSecondary}
                  onClick={() => form.resetFields()}
                >
                  Reset Form
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>

        {/* Current Capability Development Leads */}
        <div className={styles.section}>
          <h2>Current Capability Development Leads</h2>
          <Search
            placeholder="Search leads..."
            onSearch={(value) => handleSearch(value, 'leads')}
            onChange={(e) => handleSearch(e.target.value, 'leads')}
            className={styles.searchBar}
          />
          <Table
            columns={leadColumns}
            dataSource={filteredLeads}
            rowKey="id"
            locale={{ emptyText: 'No leads found' }}
            className={styles.table}
          />
        </div>

        {/* Current Assignments */}
        <div className={styles.section}>
          <h2>Current Assignments</h2>
          <Search
            placeholder="Search assignments..."
            onSearch={(value) => handleSearch(value, 'assignments')}
            onChange={(e) => handleSearch(e.target.value, 'assignments')}
            className={styles.searchBar}
          />
          <Table
            columns={assignmentColumns}
            dataSource={filteredAssignments}
            rowKey="id"
            locale={{ emptyText: 'No assignments found' }}
            className={styles.table}
          />
        </div>
      </div>

      {/* Edit Assignment Modal */}
      <Modal
        title="Edit Assignment"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateAssignment}
        >
          <Form.Item
            label="Employee"
            name="employeeId"
            rules={[{ required: true, message: 'Please select an employee!' }]}
          >
            <Select
              placeholder="Select Employee"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {employees.map((employee) => (
                <Option key={employee.id} value={employee.id}>
                  {employee.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Capability Development Lead"
            name="leadId"
            rules={[{ required: true, message: 'Please select a lead!' }]}
          >
            <Select
              placeholder="Select Lead"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {leads.map((lead) => (
                <Option key={lead.id} value={lead.id}>
                  {lead.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div className={styles.modalActions}>
            <Button onClick={() => setIsEditModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Update Assignment
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Delete Assignment Confirmation Modal */}
      <Modal
        title="Confirm Action"
        open={isDeleteModalVisible}
        onCancel={() => setIsDeleteModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsDeleteModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" danger onClick={handleDeleteAssignment}>
            Confirm
          </Button>,
        ]}
      >
        <p>{deleteMessage}</p>
      </Modal>

      {/* Delete Lead Confirmation Modal */}
      <Modal
        title="Confirm Action"
        open={isDeleteLeadModalVisible}
        onCancel={() => setIsDeleteLeadModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsDeleteLeadModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" danger onClick={handleDeleteLead}>
            Confirm
          </Button>,
        ]}
      >
        <p>{deleteMessage}</p>
      </Modal>
    </div>
  );
};

export default CapabilityDevelopmentLead;