import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Modal, Form, Input, Select, Space, Tag, Tabs,
    Popconfirm, message, Typography, Spin,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    UserSwitchOutlined, UserDeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';
import {
    getCapabilityGroups, createCapabilityGroup, updateCapabilityGroup, deleteCapabilityGroup,
    getCapabilityGroupAssignments, assignCapabilityGroup, removeCapabilityGroupAssignment,
    getCapabilityGroupHistory,
    getAllEmployees,
} from '../../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CapabilityGroupTab = () => {
    const { user } = useAuth();
    const role = user?.roleName?.toLowerCase();
    const isAdminOrHR = role === 'admin' || role === 'hr';

    // ── State ──────────────────────────────────────────────────────────
    const [groups, setGroups] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [history, setHistory] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [loadingGroups, setLoadingGroups] = useState(false);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Master group modal
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [savingGroup, setSavingGroup] = useState(false);
    const [groupForm] = Form.useForm();

    // Assignment modal
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [savingAssign, setSavingAssign] = useState(false);
    const [assignForm] = Form.useForm();

    // History filter
    const [historyEmpFilter, setHistoryEmpFilter] = useState(null);

    // ── Fetch helpers ──────────────────────────────────────────────────
    const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
            const res = await getCapabilityGroups();
            setGroups(res.data || []);
        } catch { message.error('Failed to load capability groups'); }
        finally { setLoadingGroups(false); }
    };

    const fetchAssignments = async () => {
        setLoadingAssignments(true);
        try {
            const res = await getCapabilityGroupAssignments();
            setAssignments(res.data || []);
        } catch { message.error('Failed to load assignments'); }
        finally { setLoadingAssignments(false); }
    };

    const fetchHistory = async (empId) => {
        setLoadingHistory(true);
        try {
            const res = await getCapabilityGroupHistory(empId || null);
            setHistory(res.data || []);
        } catch { message.error('Failed to load history'); }
        finally { setLoadingHistory(false); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await getAllEmployees();
            setEmployees(res.data || []);
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchGroups();
        fetchAssignments();
        fetchHistory(null);
        if (isAdminOrHR) {
            fetchEmployees();
        }
    }, [isAdminOrHR]);

    // ── Derived options ────────────────────────────────────────────────
    const activeGroupOptions = useMemo(() =>
        groups.filter(g => g.is_active).map(g => ({ label: g.group_name, value: g.group_id })),
        [groups]
    );

    const employeeOptions = useMemo(() =>
        employees.map(e => ({
            label: `${e.employeeName || e.employee_name || (`${e.first_name} ${e.last_name}`)} (${e.employeeId || e.employee_id})`,
            value: e.employeeId || e.employee_id
        })),
        [employees]
    );

    // ── Master group handlers ──────────────────────────────────────────
    const openAddGroup = () => {
        setEditingGroup(null);
        groupForm.resetFields();
        setGroupModalOpen(true);
    };

    const openEditGroup = (group) => {
        setEditingGroup(group);
        groupForm.setFieldsValue({ group_name: group.group_name, description: group.description });
        setGroupModalOpen(true);
    };

    const handleSaveGroup = async () => {
        try {
            const values = await groupForm.validateFields();
            setSavingGroup(true);
            if (editingGroup) {
                await updateCapabilityGroup(editingGroup.group_id, values);
                message.success('Group updated');
            } else {
                await createCapabilityGroup(values);
                message.success('Group created');
            }
            setGroupModalOpen(false);
            fetchGroups();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.message || 'Failed to save group');
        } finally { setSavingGroup(false); }
    };

    const handleDeleteGroup = async (groupId) => {
        try {
            await deleteCapabilityGroup(groupId);
            message.success('Group deactivated');
            fetchGroups();
        } catch { message.error('Failed to deactivate group'); }
    };

    // ── Assignment handlers ────────────────────────────────────────────
    const handleAssign = async () => {
        try {
            const values = await assignForm.validateFields();
            setSavingAssign(true);
            await assignCapabilityGroup(values);
            message.success('Capability group assigned');
            setAssignModalOpen(false);
            assignForm.resetFields();
            fetchAssignments();
            fetchHistory(historyEmpFilter);
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.message || 'Failed to assign group');
        } finally { setSavingAssign(false); }
    };

    const handleRemoveAssignment = async (employeeId) => {
        try {
            await removeCapabilityGroupAssignment(employeeId);
            message.success('Assignment removed');
            fetchAssignments();
            fetchHistory(historyEmpFilter);
        } catch { message.error('Failed to remove assignment'); }
    };

    // ── Column definitions ─────────────────────────────────────────────
    const groupColumns = [
        {
            title: 'Group Name', dataIndex: 'group_name', key: 'group_name',
            width: 200,
            sorter: (a, b) => a.group_name.localeCompare(b.group_name),
            render: name => <Text strong>{name}</Text>
        },
        {
            title: 'Description', dataIndex: 'description', key: 'description',
            render: d => d
                ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d}</span>
                : <Text type="secondary">—</Text>
        },
        {
            title: 'Status', dataIndex: 'is_active', key: 'is_active',
            render: v => v ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>,
            filters: [{ text: 'Active', value: true }, { text: 'Inactive', value: false }],
            onFilter: (val, rec) => rec.is_active === val,
        },
        // Actions column — HR/Admin only
        ...(isAdminOrHR ? [{
            title: 'Actions', key: 'actions', width: 100,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEditGroup(record)} />
                    <Popconfirm
                        title="Deactivate this group?"
                        onConfirm={() => handleDeleteGroup(record.group_id)}
                        okText="Yes" cancelText="No"
                        disabled={!record.is_active}
                    >
                        <Button size="small" icon={<DeleteOutlined />} danger disabled={!record.is_active} />
                    </Popconfirm>
                </Space>
            )
        }] : [])
    ];

    const assignmentColumns = [
        {
            title: 'Employee', dataIndex: 'employee_name', key: 'employee_name',
            sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
            render: (name, rec) => (
                <span>
                    <Text strong>{name}</Text>{' '}
                    <Text type="secondary" style={{ fontSize: 12 }}>({rec.employee_id})</Text>
                </span>
            )
        },
        {
            title: 'Capability Group', dataIndex: 'group_name', key: 'group_name',
            render: g => <Tag color="blue">{g}</Tag>
        },
        { title: 'Assigned By', dataIndex: 'assigned_by', key: 'assigned_by' },
        {
            title: 'Assigned On', dataIndex: 'assigned_on', key: 'assigned_on',
            render: d => d ? dayjs(d).format('DD MMM YYYY') : '—',
            sorter: (a, b) => dayjs(a.assigned_on).diff(dayjs(b.assigned_on)),
        },
        {
            title: 'Notes', dataIndex: 'notes', key: 'notes',
            render: n => n || <Text type="secondary">—</Text>
        },
        // Actions — HR/Admin only
        ...(isAdminOrHR ? [{
            title: 'Actions', key: 'actions', width: 160,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small" icon={<UserSwitchOutlined />}
                        onClick={() => {
                            assignForm.setFieldsValue({
                                employee_id: record.employee_id,
                                group_id: record.group_id,
                            });
                            setAssignModalOpen(true);
                        }}
                    >Change</Button>
                    <Popconfirm
                        title="Remove this assignment?"
                        onConfirm={() => handleRemoveAssignment(record.employee_id)}
                        okText="Yes" cancelText="No"
                    >
                        <Button size="small" icon={<UserDeleteOutlined />} danger>Remove</Button>
                    </Popconfirm>
                </Space>
            )
        }] : [])
    ];

    const historyColumns = [
        {
            title: 'Employee', dataIndex: 'employee_name', key: 'employee_name',
            sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
            render: (name, rec) => (
                <span>
                    <Text strong>{name}</Text>{' '}
                    <Text type="secondary" style={{ fontSize: 12 }}>({rec.employee_id})</Text>
                </span>
            )
        },
        {
            title: 'Capability Group', dataIndex: 'group_name', key: 'group_name',
            render: g => <Tag color="geekblue">{g}</Tag>
        },
        { title: 'Assigned By', dataIndex: 'assigned_by', key: 'assigned_by' },
        {
            title: 'Assigned On', dataIndex: 'assigned_on', key: 'assigned_on',
            render: d => d ? dayjs(d).format('DD MMM YYYY') : '—',
            sorter: (a, b) => dayjs(a.assigned_on).diff(dayjs(b.assigned_on)),
        },
        {
            title: 'Removed On', dataIndex: 'removed_on', key: 'removed_on',
            render: d => d ? dayjs(d).format('DD MMM YYYY') : '—',
            sorter: (a, b) => dayjs(a.removed_on).diff(dayjs(b.removed_on)),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Notes', dataIndex: 'notes', key: 'notes',
            render: n => n || <Text type="secondary">—</Text>
        },
    ];

    // ── Tab items ──────────────────────────────────────────────────────
    const tabItems = [
        {
            key: 'master',
            label: 'Capability Groups',
            children: (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        <div>
                            {/* <Title level={5} style={{ margin: 0 }}>Master List</Title> */}
                            <Text type="secondary" style={{ fontSize: 12 }}>{groups.length} groups</Text>
                        </div>
                        {isAdminOrHR && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={openAddGroup}>
                                Add Group
                            </Button>
                        )}
                    </div>
                    <Spin spinning={loadingGroups}>
                        <Table
                            dataSource={groups}
                            columns={groupColumns}
                            rowKey="group_id"
                            size="small"
                            pagination={{ pageSize: 10 }}
                            style={{ border: '1px solid #eee', borderRadius: 8 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Spin>
                </div>
            )
        },
        {
            key: 'assignments',
            label: 'Employee Assignments',
            children: (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        <div>
                            {/* <Title level={5} style={{ margin: 0 }}>Current Assignments</Title> */}
                            <Text type="secondary" style={{ fontSize: 12 }}>{assignments.length} employees assigned</Text>
                        </div>
                        {isAdminOrHR && (
                            <Button
                                type="primary" icon={<PlusOutlined />}
                                onClick={() => { assignForm.resetFields(); setAssignModalOpen(true); }}
                            >
                                Assign Group
                            </Button>
                        )}
                    </div>
                    <Spin spinning={loadingAssignments}>
                        <Table
                            dataSource={assignments}
                            columns={assignmentColumns}
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 10 }}
                            style={{ border: '1px solid #eee', borderRadius: 8 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Spin>
                </div>
            )
        },
        {
            key: 'history',
            label: 'Assignment History',
            children: (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        <div>
                            {/* <Title level={5} style={{ margin: 0 }}>History</Title> */}
                            <Text type="secondary" style={{ fontSize: 12 }}>{history.length} records</Text>
                        </div>
                        <Select
                            placeholder="Filter by Employee"
                            allowClear
                            showSearch
                            style={{ width: '100%', maxWidth: 260 }}
                            options={employeeOptions}
                            onChange={val => {
                                setHistoryEmpFilter(val || null);
                                fetchHistory(val || null);
                            }}
                            filterOption={(input, option) =>
                                option.label.toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </div>
                    <Spin spinning={loadingHistory}>
                        <Table
                            dataSource={history}
                            columns={historyColumns}
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 10 }}
                            style={{ border: '1px solid #eee', borderRadius: 8 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Spin>
                </div>
            )
        }
    ];

    return (
        <div>
            <Tabs items={tabItems} defaultActiveKey="master" />

            {/* ── Add/Edit Group Modal — HR/Admin only ─────────────── */}
            {isAdminOrHR && (
                <>
                    <Modal
                        title={editingGroup ? 'Edit Capability Group' : 'Add Capability Group'}
                        open={groupModalOpen}
                        onCancel={() => { setGroupModalOpen(false); groupForm.resetFields(); }}
                        onOk={handleSaveGroup}
                        okText={editingGroup ? 'Save Changes' : 'Add Group'}
                        confirmLoading={savingGroup}
                        destroyOnClose
                    >
                        <Form form={groupForm} layout="vertical" style={{ marginTop: 16 }}>
                            <Form.Item
                                label="Group Name"
                                name="group_name"
                                rules={[{ required: true, message: 'Group name is required' }]}
                            >
                                <Input placeholder="e.g. Frontend Engineer, AI/ML Specialist" />
                            </Form.Item>
                            <Form.Item label="Description" name="description">
                                <TextArea rows={3} placeholder="Brief description of this capability group" />
                            </Form.Item>
                        </Form>
                    </Modal>

                    <Modal
                        title="Assign Capability Group"
                        open={assignModalOpen}
                        onCancel={() => { setAssignModalOpen(false); assignForm.resetFields(); }}
                        onOk={handleAssign}
                        okText="Assign"
                        confirmLoading={savingAssign}
                        destroyOnClose
                    >
                        <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
                            <Form.Item
                                label="Employee"
                                name="employee_id"
                                rules={[{ required: true, message: 'Please select an employee' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Select employee"
                                    options={employeeOptions}
                                    filterOption={(input, option) =>
                                        option.label.toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </Form.Item>
                            <Form.Item
                                label="Capability Group"
                                name="group_id"
                                rules={[{ required: true, message: 'Please select a group' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Select group"
                                    options={activeGroupOptions}
                                    filterOption={(input, option) =>
                                        option.label.toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </Form.Item>
                            <Form.Item label="Notes" name="notes">
                                <TextArea rows={2} placeholder="Optional notes" />
                            </Form.Item>
                        </Form>
                    </Modal>
                </>
            )}
        </div>
    );
};

export default CapabilityGroupTab;
