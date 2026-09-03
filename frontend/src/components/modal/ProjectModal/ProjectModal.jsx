import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, DatePicker, Select, Tabs, Table, Row, Col, Popconfirm, message, Tooltip, Checkbox } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ProjectOutlined, CalendarOutlined, UserOutlined, FileTextOutlined, TeamOutlined, TagsOutlined } from '@ant-design/icons';
import { getEmployeeList, addProject, updateProject, getProjectAllocations, manageAllocation, deleteAllocation } from '../../../services/api'; // updated imports
import dayjs from 'dayjs';
import WidgetCard from '../../common/WidgetCard';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

export const PROJECT_CATEGORY_OPTIONS = ['Client Project', 'Internal'];
export const INTERNAL_SUB_CATEGORIES = [
    'Management',
    'Marketing',
    'HR Operations',
    'Training & Development',
    'Infrastructure',
    'Leaves',
    'Productivity Loss due to infra',
    'Other Internal Work'
];
export const TAG_KEY_OPTIONS = ['Zymmr Project Name'];

const ProjectModal = ({ visible, onClose, project, isEditMode, readOnly = false, refreshProjects }) => {
    const [form] = Form.useForm();
    const [allocationForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState("1");
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [allocations, setAllocations] = useState([]);
    const [allocationLoading, setAllocationLoading] = useState(false);
    const [editingAllocation, setEditingAllocation] = useState(null);
    const categoryValue = Form.useWatch('category', form);
    const subCategoryValue = Form.useWatch('sub_category', form);

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
                    contractual_allocation: project.contractual_allocation || 0,
                    start_date: project.start_date ? dayjs(project.start_date) : null,
                    end_date: project.end_date ? dayjs(project.end_date) : null,
                    category: project.category,
                    sub_category: project.sub_category,
                    task_category_overrides: project.task_category_overrides || [],
                    tags: project.tags || [],
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
        if (readOnly) return; // Prevent submission in read-only mode

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
            start_date: record.start_date ? dayjs(record.start_date) : null,
            end_date: record.end_date ? dayjs(record.end_date) : null,
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
            title={readOnly ? `View Project: ${project?.project_name}` : (isEditMode ? `Edit Project: ${project?.project_name} ` : "Create New Project")}
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
                                            <Form.Item name="project_name" label="Project Name" rules={[{ required: !readOnly }]}>
                                                <Input disabled={readOnly} prefix={<ProjectOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Enter project name" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="client" label="Client" rules={[{ required: !readOnly, message: 'Client name is required' }]}>
                                                <Input disabled={readOnly} prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Client name" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="lead_by" label="Lead By">
                                                <Select
                                                    disabled={readOnly}
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
                                                <Select disabled={readOnly}>
                                                    <Option value="Active">Active</Option>
                                                    <Option value="Future Prospect">Future Prospect</Option>
                                                    <Option value="Closed">Closed</Option>
                                                    <Option value="On-Hold">On-Hold</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="start_date" label="Start Date">
                                                <DatePicker disabled={readOnly} format="YYYY-MM-DD" style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="end_date" label="End Date">
                                                <DatePicker disabled={readOnly} format="YYYY-MM-DD" style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="description" label="Description">
                                                <TextArea disabled={readOnly} rows={2} placeholder="Brief description" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="contractual_allocation" label="Contractual Allocation">
                                                <Input type="number" min={0} step={0.1} disabled={readOnly} placeholder="Enter contractual allocation" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item name="category" label="Category">
                                                <Select
                                                    disabled={readOnly}
                                                    placeholder="Select category"
                                                    allowClear
                                                    onChange={(val) => {
                                                        if (val !== 'Internal') {
                                                            form.setFieldsValue({ sub_category: undefined, task_category_overrides: [] });
                                                        }
                                                    }}
                                                >
                                                    {PROJECT_CATEGORY_OPTIONS.map(c => <Option key={c} value={c}>{c}</Option>)}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        {categoryValue === 'Internal' && (
                                            <Col xs={24} md={8}>
                                                <Form.Item name="sub_category" label="Internal Sub-category">
                                                    <Select disabled={readOnly} placeholder="Select sub-category" allowClear>
                                                        {INTERNAL_SUB_CATEGORIES.map(s => <Option key={s} value={s}>{s}</Option>)}
                                                    </Select>
                                                </Form.Item>
                                            </Col>
                                        )}
                                    </Row>
                                </WidgetCard>
                            </Col>

                            {categoryValue === 'Internal' && (
                                <Col span={24}>
                                    <WidgetCard title="Task Sub-category Exceptions" icon={<TagsOutlined />} iconColor="#722ed1">
                                        <div style={{ marginBottom: 12, color: 'rgba(0,0,0,.45)' }}>
                                            By default, all tasks under this project are classified as <b>{subCategoryValue || 'the selected sub-category'}</b>.
                                            Add an exception below to map a specific task name to a different sub-category
                                            (e.g. task "Leave" should count under "Leaves").
                                        </div>
                                        <Form.List name="task_category_overrides">
                                            {(fields, { add, remove }) => (
                                                <>
                                                    {fields.map((field) => (
                                                        <Row key={field.key} gutter={8} align="middle">
                                                            <Col xs={24} md={10}>
                                                                <Form.Item
                                                                    {...field}
                                                                    name={[field.name, 'task_name']}
                                                                    rules={[{ required: true, message: 'Task name required' }]}
                                                                >
                                                                    <Input disabled={readOnly} placeholder="Task name (e.g. Leave)" />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col xs={24} md={10}>
                                                                <Form.Item
                                                                    {...field}
                                                                    name={[field.name, 'sub_category']}
                                                                    rules={[{ required: true, message: 'Sub-category required' }]}
                                                                >
                                                                    <Select disabled={readOnly} placeholder="Sub-category">
                                                                        {INTERNAL_SUB_CATEGORIES.map(s => <Option key={s} value={s}>{s}</Option>)}
                                                                    </Select>
                                                                </Form.Item>
                                                            </Col>
                                                            {!readOnly && (
                                                                <Col xs={24} md={4}>
                                                                    <Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                                                                </Col>
                                                            )}
                                                        </Row>
                                                    ))}
                                                    {!readOnly && (
                                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                            Add Task Exception
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </Form.List>
                                    </WidgetCard>
                                </Col>
                            )}

                            <Col span={24}>
                                <WidgetCard title="Project Tags" icon={<TagsOutlined />} iconColor="#13c2c2">
                                    <div style={{ marginBottom: 14, color: 'rgba(0,0,0,.45)' }}>
                                        Map this project to its name in external systems (e.g. Zymmr) so timesheet/effort report imports can match it automatically.
                                    </div>
                                    <Form.List name="tags">
                                        {(fields, { add, remove }) => (
                                            <>
                                                {fields.length > 0 && (
                                                    <Row gutter={12} style={{ marginBottom: 6 }}>
                                                        <Col xs={24} md={8}>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,.65)' }}>Tag Key</span>
                                                        </Col>
                                                        <Col xs={24} md={13}>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,.65)' }}>Tag Value</span>
                                                        </Col>
                                                    </Row>
                                                )}
                                                {fields.map((field) => (
                                                    <Row
                                                        key={field.key}
                                                        gutter={12}
                                                        align="middle"
                                                        style={{
                                                            background: '#fafafa',
                                                            border: '1px solid #f0f0f0',
                                                            borderRadius: 8,
                                                            margin: '0 0 10px',
                                                            padding: '10px 10px 0',
                                                        }}
                                                    >
                                                        <Col xs={24} md={8}>
                                                            <Form.Item
                                                                {...field}
                                                                name={[field.name, 'key']}
                                                                rules={[{ required: true, message: 'Tag key required' }]}
                                                            >
                                                                <Select disabled={readOnly} placeholder="Select tag key">
                                                                    {TAG_KEY_OPTIONS.map(k => <Option key={k} value={k}>{k}</Option>)}
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col xs={24} md={13}>
                                                            <Form.Item
                                                                {...field}
                                                                name={[field.name, 'value']}
                                                                rules={[{ required: true, message: 'Tag value required' }]}
                                                            >
                                                                <Input disabled={readOnly} placeholder="e.g. the project's name in Zymmr" />
                                                            </Form.Item>
                                                        </Col>
                                                        {!readOnly && (
                                                            <Col xs={24} md={3} style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                                                                <Tooltip title="Remove tag">
                                                                    <Button
                                                                        danger
                                                                        type="text"
                                                                        shape="circle"
                                                                        icon={<DeleteOutlined />}
                                                                        onClick={() => remove(field.name)}
                                                                    />
                                                                </Tooltip>
                                                            </Col>
                                                        )}
                                                    </Row>
                                                ))}
                                                {!readOnly && (
                                                    <Button
                                                        type="dashed"
                                                        onClick={() => add(TAG_KEY_OPTIONS.length === 1 ? { key: TAG_KEY_OPTIONS[0] } : {})}
                                                        block
                                                        icon={<PlusOutlined />}
                                                    >
                                                        Add Tag
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </Form.List>
                                </WidgetCard>
                            </Col>
                        </Row>

                        {!readOnly && (
                            <div style={{ marginTop: 20, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Button type="primary" htmlType="submit" loading={loading} icon={<EditOutlined />}>
                                    {isEditMode ? "Update Project" : "Create Project"}
                                </Button>
                            </div>
                        )}
                    </Form>
                </TabPane>

                {isEditMode && (
                    <TabPane tab={<span><TeamOutlined /> Allocations</span>} key="2">
                        <Row gutter={[16, 16]}>
                            {!readOnly && (
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
                                                            <Checkbox>Billing</Checkbox>
                                                        </Form.Item>
                                                        <Form.Item name="is_trainee" valuePropName="checked" style={{ marginBottom: 0 }}>
                                                            <Checkbox>Trainee</Checkbox>
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
                            )}

                            <Col span={24}>
                                <Table
                                    dataSource={allocations}
                                    columns={readOnly ? allocationColumns.filter(col => col.key !== 'actions') : allocationColumns}
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
        </Modal >
    );
};

export default ProjectModal;
