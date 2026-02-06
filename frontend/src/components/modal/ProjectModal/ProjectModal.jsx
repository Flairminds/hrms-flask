import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, DatePicker, Select, Tabs, Table, Popconfirm, message, Row, Col } from 'antd';
import { DeleteOutlined, EditOutlined, ProjectOutlined, CalendarOutlined, UserOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import { getEmployeeList, addProject, updateProject, getProjectAllocations, manageAllocation, deleteAllocation } from '../../../services/api'; // updated imports
import moment from 'moment';
import WidgetCard from '../../common/WidgetCard';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const ProjectModal = ({ visible, onClose, project, isEditMode, refreshProjects }) => {
    const [form] = Form.useForm();
    const [allocationForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState("1");
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [allocations, setAllocations] = useState([]);
    const [allocationLoading, setAllocationLoading] = useState(false);
    const [editingAllocation, setEditingAllocation] = useState(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await getEmployeeList();
                // Ensure unique employees by ID
                const uniqueEmployees = Array.from(new Map(res.data.map(item => [item.employeeId, item])).values());
                setEmployees(uniqueEmployees);
            } catch (error) {
                console.error("Error fetching employees:", error);
            }
        };
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (visible) {
            if (isEditMode && project) {
                form.setFieldsValue({
                    project_name: project.project_name,
                    description: project.description,
                    client: project.client,
                    project_status: project.project_status,
                    lead_by: project.lead_by,
                    start_date: project.start_date ? moment(project.start_date) : null,
                    end_date: project.end_date ? moment(project.end_date) : null,
                });
                fetchAllocations(project.project_id);
            } else {
                form.resetFields();
                setAllocations([]);
            }
            setActiveTab("1");
            setEditingAllocation(null);
            allocationForm.resetFields();
        }
    }, [visible, isEditMode, project, form]);

    const fetchAllocations = async (projectId) => {
        if (!projectId) return;
        setAllocationLoading(true);
        try {
            const res = await getProjectAllocations(projectId);
            setAllocations(res.data);
        } catch (error) {
            console.error("Error fetching allocations", error);
        } finally {
            setAllocationLoading(false);
        }
    };

    const handleProjectSubmit = async (values) => {
        setLoading(true);
        const payload = {
            ...values,
            start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
            end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        };

        try {
            if (isEditMode && project) {
                await updateProject(project.project_id, payload);
                message.success("Project updated successfully");
            } else {
                const res = await addProject(payload);
                // If new project, maybe switch to allocations tab or prompt? 
                // For now just close and refresh
                message.success("Project created successfully");
                // Optionally set active project ID if we wanted to stay open
            }
            refreshProjects();
            onClose();
        } catch (error) {
            console.error("Error saving project:", error);
            message.error("Failed to save project");
        } finally {
            setLoading(false);
        }
    };

    const handleAllocationSubmit = async (values) => {
        if (!project?.project_id) {
            message.error("Please save the project first.");
            return;
        }

        const payload = {
            ...values,
            project_id: project.project_id,
            start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
            end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        };

        try {
            await manageAllocation(payload);
            message.success(editingAllocation ? "Allocation updated" : "Allocation added");
            allocationForm.resetFields();
            setEditingAllocation(null);
            fetchAllocations(project.project_id);
        } catch (error) {
            console.error("Error saving allocation:", error);
            message.error("Failed to save allocation");
        }
    };

    const handleEditAllocation = (record) => {
        setEditingAllocation(record);
        allocationForm.setFieldsValue({
            employee_id: record.employee_id,
            employee_role: record.employee_role,
            project_allocation: record.project_allocation,
            is_billing: record.is_billing,
            is_trainee: record.is_trainee,
            comments: record.comments,
            relevant_skills: record.relevant_skills,
            start_date: record.start_date ? moment(record.start_date) : null,
            end_date: record.end_date ? moment(record.end_date) : null,
        });
    };

    const handleDeleteAllocation = async (employeeId) => {
        try {
            await deleteAllocation(project.project_id, employeeId);
            message.success("Allocation deleted");
            fetchAllocations(project.project_id);
        } catch (error) {
            console.error("Error deleting allocation:", error);
            message.error("Failed to delete allocation");
        }
    };

    const allocationColumns = [
        { title: 'Employee', dataIndex: 'emp_name', key: 'emp_name' },
        { title: 'Role', dataIndex: 'employee_role', key: 'employee_role' },
        { title: '%', dataIndex: 'project_allocation', key: 'project_allocation' },
        {
            title: 'Billing',
            dataIndex: 'is_billing',
            key: 'is_billing',
            render: (text) => text ? "Yes" : "No"
        },
        {
            title: 'Dates',
            key: 'dates',
            render: (_, record) => (
                <small>{record.start_date} to {record.end_date || 'Ongoing'}</small>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Button icon={<EditOutlined />} size="small" onClick={() => handleEditAllocation(record)} style={{ padding: '0 20px' }} />
                        <Popconfirm title="Delete this allocation?" onConfirm={() => handleDeleteAllocation(record.employee_id)}>
                            <Button icon={<DeleteOutlined />} size="small" danger style={{ padding: '0 20px' }} />
                        </Popconfirm>
                    </div>
                </>
            ),
        }
    ];

    return (
        <Modal
            title={isEditMode ? `Edit Project: ${project?.project_name}` : "Create New Project"}
            visible={visible}
            onCancel={onClose}
            footer={null}
            width={900}
            destroyOnClose
            style={{ top: 20 }}
        >
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab={<span><ProjectOutlined /> Project Details</span>} key="1">
                    <Form form={form} layout="vertical" onFinish={handleProjectSubmit}>
                        <Row gutter={[16, 16]}>
                            <Col span={24}>
                                <WidgetCard title="Basic Information" icon={<FileTextOutlined />} iconColor="#1890ff">
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="project_name" label="Project Name" rules={[{ required: true }]}>
                                                <Input prefix={<ProjectOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Enter project name" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="client" label="Client">
                                                <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Client name" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lead_by" label="Lead By">
                                                <Select
                                                    showSearch
                                                    optionFilterProp="children"
                                                    placeholder="Select Project Lead"
                                                >
                                                    {employees.map(e => <Option key={e.employeeId} value={e.employeeId}>{e.employeeName}</Option>)}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="project_status" label="Status" initialValue="Active">
                                                <Select>
                                                    <Option value="Active">Active</Option>
                                                    <Option value="Future Prospect">Future Prospect</Option>
                                                    <Option value="Closed">Closed</Option>
                                                    <Option value="On-Hold">On-Hold</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="description" label="Description">
                                                <TextArea rows={2} placeholder="Brief description" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="start_date" label="Start Date">
                                                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="end_date" label="End Date">
                                                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </WidgetCard>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 20, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Button type="primary" htmlType="submit" loading={loading} icon={<EditOutlined />}>
                                {isEditMode ? "Update Project" : "Create Project"}
                            </Button>
                        </div>
                    </Form>
                </TabPane>

                {isEditMode && (
                    <TabPane tab={<span><TeamOutlined /> Allocations</span>} key="2">
                        <Row gutter={[16, 16]}>
                            <Col span={24}>
                                <WidgetCard title={editingAllocation ? "Edit Allocation" : "Add New Allocation"} icon={<UserOutlined />} iconColor="#fa8c16">
                                    <Form form={allocationForm} layout="vertical" onFinish={handleAllocationSubmit}>
                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} md={8}>
                                                <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
                                                    <Select showSearch optionFilterProp="children" disabled={!!editingAllocation} placeholder="Select Employee">
                                                        {employees.map(e => <Option key={e.employeeId} value={e.employeeId}>{e.employeeName}</Option>)}
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Form.Item name="employee_role" label="Role">
                                                    <Input placeholder="e.g. Developer" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Form.Item name="project_allocation" label="Allocation %" rules={[{ required: true }]}>
                                                    <Input type="number" min={0} max={100} suffix="%" />
                                                </Form.Item>
                                            </Col>

                                            <Col xs={24} md={8}>
                                                <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
                                                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Form.Item name="end_date" label="End Date">
                                                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Form.Item name="relevant_skills" label="Relevant Skills">
                                                    <Input placeholder="e.g. React, Python" />
                                                </Form.Item>
                                            </Col>

                                            <Col xs={24}>
                                                <Form.Item name="comments" label="Comments">
                                                    <TextArea rows={2} />
                                                </Form.Item>
                                            </Col>

                                            <Col xs={24} md={24}>
                                                <div style={{ display: 'flex', gap: 20 }}>
                                                    <Form.Item name="is_billing" valuePropName="checked" style={{ marginBottom: 0 }}>
                                                        <input type="checkbox" style={{ marginRight: 8 }} /> Billing
                                                    </Form.Item>
                                                    <Form.Item name="is_trainee" valuePropName="checked" style={{ marginBottom: 0 }}>
                                                        <input type="checkbox" style={{ marginRight: 8 }} /> Trainee
                                                    </Form.Item>
                                                </div>
                                            </Col>
                                        </Row>
                                        <div style={{ marginTop: 20, textAlign: 'right' }}>
                                            <Button type="primary" htmlType="submit" icon={<EditOutlined />}>
                                                {editingAllocation ? "Update Allocation" : "Add Allocation"}
                                            </Button>
                                        </div>
                                    </Form>
                                </WidgetCard>
                            </Col>

                            <Col span={24}>
                                <Table
                                    dataSource={allocations}
                                    columns={allocationColumns}
                                    rowKey="employee_id"
                                    loading={allocationLoading}
                                    size="small"
                                    bordered
                                />
                            </Col>
                        </Row>
                    </TabPane>
                )}
            </Tabs>
        </Modal>
    );
};

export default ProjectModal;
