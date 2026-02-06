import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';
import {
    getAllHardwareAssets,
    createHardwareAsset,
    updateHardwareAsset,
    deleteHardwareAsset,
    getAllHardwareAssignments,
    createHardwareAssignment,
    updateHardwareAssignment,
    deleteHardwareAssignment,
    getAllHardwareMaintenance,
    createHardwareMaintenance,
    updateHardwareMaintenance,
    deleteHardwareMaintenance,
    getAllEmployeesList
} from '../../services/api';
import './HardwareManagement.css';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const HardwareManagement = () => {
    // State for assets
    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [assetModalVisible, setAssetModalVisible] = useState(false);
    const [assetForm] = Form.useForm();
    const [editingAsset, setEditingAsset] = useState(null);

    // State for assignments
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
    const [assignmentForm] = Form.useForm();
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [employees, setEmployees] = useState([]);

    // State for maintenance
    const [maintenance, setMaintenance] = useState([]);
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);
    const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
    const [maintenanceForm] = Form.useForm();
    const [editingMaintenance, setEditingMaintenance] = useState(null);

    useEffect(() => {
        fetchAssets();
        fetchAssignments();
        fetchMaintenance();
        fetchEmployees();
    }, []);

    // ============= ASSETS FUNCTIONS =============
    const fetchAssets = async () => {
        setAssetsLoading(true);
        try {
            const response = await getAllHardwareAssets();
            setAssets(response.data);
        } catch (error) {
            message.error('Failed to fetch hardware assets');
        } finally {
            setAssetsLoading(false);
        }
    };

    const handleAddAsset = () => {
        setEditingAsset(null);
        assetForm.resetFields();
        setAssetModalVisible(true);
    };

    const handleEditAsset = (record) => {
        setEditingAsset(record);
        assetForm.setFieldsValue({
            ...record,
            purchase_date: record.purchase_date ? moment(record.purchase_date) : null,
            warranty_till: record.warranty_till ? moment(record.warranty_till) : null,
        });
        setAssetModalVisible(true);
    };

    const handleDeleteAsset = async (assetId) => {
        try {
            await deleteHardwareAsset(assetId);
            message.success('Asset deleted successfully');
            fetchAssets();
        } catch (error) {
            message.error('Failed to delete asset');
        }
    };

    const handleAssetSubmit = async (values) => {
        try {
            const data = {
                ...values,
                purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : null,
                warranty_till: values.warranty_till ? values.warranty_till.format('YYYY-MM-DD') : null,
            };

            if (editingAsset) {
                await updateHardwareAsset(editingAsset.asset_id, data);
                message.success('Asset updated successfully');
            } else {
                await createHardwareAsset(data);
                message.success('Asset created successfully');
            }

            setAssetModalVisible(false);
            assetForm.resetFields();
            fetchAssets();
        } catch (error) {
            message.error(editingAsset ? 'Failed to update asset' : 'Failed to create asset');
        }
    };

    // ============= ASSIGNMENTS FUNCTIONS =============
    const fetchAssignments = async () => {
        setAssignmentsLoading(true);
        try {
            const response = await getAllHardwareAssignments();
            setAssignments(response.data);
        } catch (error) {
            message.error('Failed to fetch assignments');
        } finally {
            setAssignmentsLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await getAllEmployeesList();
            setEmployees(response.data);
        } catch (error) {
            console.error('Failed to fetch employees');
        }
    };

    const handleAddAssignment = () => {
        setEditingAssignment(null);
        assignmentForm.resetFields();
        setAssignmentModalVisible(true);
    };

    const handleEditAssignment = (record) => {
        setEditingAssignment(record);
        assignmentForm.setFieldsValue({
            ...record,
            assignment_date: record.assignment_date ? moment(record.assignment_date) : null,
            return_date: record.return_date ? moment(record.return_date) : null,
        });
        setAssignmentModalVisible(true);
    };

    const handleDeleteAssignment = async (assignmentId) => {
        try {
            await deleteHardwareAssignment(assignmentId);
            message.success('Assignment deleted successfully');
            fetchAssignments();
        } catch (error) {
            message.error('Failed to delete assignment');
        }
    };

    const handleAssignmentSubmit = async (values) => {
        try {
            const data = {
                ...values,
                assignment_date: values.assignment_date ? values.assignment_date.format('YYYY-MM-DD') : null,
                return_date: values.return_date ? values.return_date.format('YYYY-MM-DD') : null,
            };

            if (editingAssignment) {
                await updateHardwareAssignment(editingAssignment.assignment_id, data);
                message.success('Assignment updated successfully');
            } else {
                await createHardwareAssignment(data);
                message.success('Assignment created successfully');
            }

            setAssignmentModalVisible(false);
            assignmentForm.resetFields();
            fetchAssignments();
            fetchAssets(); // Refresh assets to update status
        } catch (error) {
            message.error(editingAssignment ? 'Failed to update assignment' : 'Failed to create assignment');
        }
    };

    // ============= MAINTENANCE FUNCTIONS =============
    const fetchMaintenance = async () => {
        setMaintenanceLoading(true);
        try {
            const response = await getAllHardwareMaintenance();
            setMaintenance(response.data);
        } catch (error) {
            message.error('Failed to fetch maintenance records');
        } finally {
            setMaintenanceLoading(false);
        }
    };

    const handleAddMaintenance = () => {
        setEditingMaintenance(null);
        maintenanceForm.resetFields();
        setMaintenanceModalVisible(true);
    };

    const handleEditMaintenance = (record) => {
        setEditingMaintenance(record);
        maintenanceForm.setFieldsValue({
            ...record,
            maintenance_date: record.maintenance_date ? moment(record.maintenance_date) : null,
        });
        setMaintenanceModalVisible(true);
    };

    const handleDeleteMaintenance = async (maintenanceId) => {
        try {
            await deleteHardwareMaintenance(maintenanceId);
            message.success('Maintenance record deleted successfully');
            fetchMaintenance();
        } catch (error) {
            message.error('Failed to delete maintenance record');
        }
    };

    const handleMaintenanceSubmit = async (values) => {
        try {
            const data = {
                ...values,
                maintenance_date: values.maintenance_date ? values.maintenance_date.format('YYYY-MM-DD') : null,
            };

            if (editingMaintenance) {
                await updateHardwareMaintenance(editingMaintenance.maintenance_id, data);
                message.success('Maintenance record updated successfully');
            } else {
                await createHardwareMaintenance(data);
                message.success('Maintenance record created successfully');
            }

            setMaintenanceModalVisible(false);
            maintenanceForm.resetFields();
            fetchMaintenance();
        } catch (error) {
            message.error(editingMaintenance ? 'Failed to update maintenance record' : 'Failed to create maintenance record');
        }
    };

    // ============= TABLE COLUMNS =============
    const assetColumns = [
        { title: 'ID', dataIndex: 'asset_id', key: 'asset_id' },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            filters: [...new Set(assets.map(a => a.type))].map(type => ({ text: type, value: type })),
            onFilter: (value, record) => record.type === value,
        },
        {
            title: 'Brand',
            dataIndex: 'brand',
            key: 'brand',
            filters: [...new Set(assets.map(a => a.brand))].filter(Boolean).map(brand => ({ text: brand, value: brand })),
            onFilter: (value, record) => record.brand === value,
        },
        {
            title: 'Model',
            dataIndex: 'model',
            key: 'model',
            filters: [...new Set(assets.map(a => a.model))].filter(Boolean).map(model => ({ text: model, value: model })),
            onFilter: (value, record) => record.model === value,
        },
        { title: 'Serial Number', dataIndex: 'serial_number', key: 'serial_number' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
        { title: 'Purchase Date', dataIndex: 'purchase_date', key: 'purchase_date' },
        { title: 'Warranty Till', dataIndex: 'warranty_till', key: 'warranty_till' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEditAsset(record)} size="small" />
                    <Popconfirm
                        title="Are you sure to delete this asset?"
                        onConfirm={() => handleDeleteAsset(record.asset_id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button icon={<DeleteOutlined />} danger size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const assignmentColumns = [
        { title: 'ID', dataIndex: 'assignment_id', key: 'assignment_id' },
        {
            title: 'Asset',
            dataIndex: 'asset_name',
            key: 'asset_name',
            width: 250,
            filters: [...new Set(assignments.map(a => a.asset_name))].filter(Boolean).map(name => ({ text: name, value: name })),
            onFilter: (value, record) => record.asset_name === value,
        },
        { title: 'Employee', dataIndex: 'employee_name', key: 'employee_name' },
        { title: 'Assigned Date', dataIndex: 'assignment_date', key: 'assignment_date' },
        { title: 'Assigned By', dataIndex: 'assigned_by_name', key: 'assigned_by_name' },
        { title: 'Return Date', dataIndex: 'return_date', key: 'return_date' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEditAssignment(record)} size="small" />
                    <Popconfirm
                        title="Are you sure to delete this assignment?"
                        onConfirm={() => handleDeleteAssignment(record.assignment_id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button icon={<DeleteOutlined />} danger size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const maintenanceColumns = [
        { title: 'ID', dataIndex: 'maintenance_id', key: 'maintenance_id' },
        { title: 'Asset', dataIndex: 'asset_name', key: 'asset_name', width: 250 },
        { title: 'Issue', dataIndex: 'issue_description', key: 'issue_description' },
        { title: 'Date', dataIndex: 'maintenance_date', key: 'maintenance_date' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEditMaintenance(record)} size="small" />
                    <Popconfirm
                        title="Are you sure to delete this maintenance record?"
                        onConfirm={() => handleDeleteMaintenance(record.maintenance_id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button icon={<DeleteOutlined />} danger size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="hardware-management">
            <h1>Hardware Management</h1>

            <Tabs defaultActiveKey="1">
                <TabPane tab="Assets" key="1">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddAsset}
                        style={{ marginBottom: 16 }}
                    >
                        Add Asset
                    </Button>
                    <Table
                        columns={assetColumns}
                        dataSource={assets}
                        loading={assetsLoading}
                        rowKey="asset_id"
                    />
                </TabPane>

                <TabPane tab="Assignments" key="2">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddAssignment}
                        style={{ marginBottom: 16 }}
                    >
                        Assign Asset
                    </Button>
                    <Table
                        columns={assignmentColumns}
                        dataSource={assignments}
                        loading={assignmentsLoading}
                        rowKey="assignment_id"
                    />
                </TabPane>

                <TabPane tab="Maintenance" key="3">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddMaintenance}
                        style={{ marginBottom: 16 }}
                    >
                        Add Maintenance
                    </Button>
                    <Table
                        columns={maintenanceColumns}
                        dataSource={maintenance}
                        loading={maintenanceLoading}
                        rowKey="maintenance_id"
                    />
                </TabPane>
            </Tabs>

            {/* Asset Modal */}
            <Modal
                title={editingAsset ? 'Edit Asset' : 'Add Asset'}
                open={assetModalVisible}
                onCancel={() => setAssetModalVisible(false)}
                onOk={() => assetForm.submit()}
                width={700}
                style={{ top: 20 }}
            >
                <Form form={assetForm} layout="vertical" onFinish={handleAssetSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                            <Select>
                                <Option value="Laptop">Laptop</Option>
                                <Option value="Desktop">Desktop</Option>
                                <Option value="Monitor">Monitor</Option>
                                <Option value="Keyboard">Keyboard</Option>
                                <Option value="Mouse">Mouse</Option>
                                <Option value="Headset">Headset</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="brand" label="Brand">
                            <Input />
                        </Form.Item>
                        <Form.Item name="model" label="Model">
                            <Input />
                        </Form.Item>
                        <Form.Item name="serial_number" label="Serial Number">
                            <Input />
                        </Form.Item>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select>
                                <Option value="Available">Available</Option>
                                <Option value="Assigned">Assigned</Option>
                                <Option value="Under Maintenance">Under Maintenance</Option>
                                <Option value="Retired">Retired</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="purchase_date" label="Purchase Date">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="warranty_till" label="Warranty Till">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={3} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* Assignment Modal */}
            <Modal
                title={editingAssignment ? 'Edit Assignment' : 'Assign Hardware'}
                open={assignmentModalVisible}
                onCancel={() => setAssignmentModalVisible(false)}
                onOk={() => assignmentForm.submit()}
                width={700}
                style={{ top: 20 }}
            >
                <Form form={assignmentForm} layout="vertical" onFinish={handleAssignmentSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Form.Item name="asset_id" label="Asset" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="children">
                                {assets.map(asset => (
                                    <Option key={asset.asset_id} value={asset.asset_id}>
                                        {`${asset.type} - ${asset.brand} ${asset.model} (${asset.serial_number})`}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="children">
                                {employees.map(emp => (
                                    <Option key={emp.employeeId} value={emp.employeeId}>
                                        {emp.employeeId} - {emp.employeeName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="assigned_by" label="Assigned By" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="children">
                                {employees.map(emp => (
                                    <Option key={`assigned-${emp.employeeId}`} value={emp.employeeId}>
                                        {emp.employeeId} - {emp.employeeName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="assignment_date" label="Assignment Date">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="status" label="Status" initialValue="Active">
                            <Select>
                                <Option value="Active">Active</Option>
                                <Option value="Returned">Returned</Option>
                                <Option value="Lost">Lost</Option>
                                <Option value="Damaged">Damaged</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="condition_at_assignment" label="Condition at Assignment">
                            <TextArea rows={2} />
                        </Form.Item>
                        <Form.Item name="assignment_notes" label="Assignment Notes">
                            <TextArea rows={2} />
                        </Form.Item>
                        {editingAssignment && (
                            <>
                                <Form.Item name="return_date" label="Return Date">
                                    <DatePicker style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="returned_by" label="Returned By">
                                    <Select showSearch optionFilterProp="children">
                                        {employees.map(emp => (
                                            <Option key={`returned-${emp.employeeId}`} value={emp.employeeId}>
                                                {emp.employeeId} - {emp.employeeName}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                                <Form.Item name="condition_at_return" label="Condition at Return">
                                    <TextArea rows={2} />
                                </Form.Item>
                                <Form.Item name="return_notes" label="Return Notes">
                                    <TextArea rows={2} />
                                </Form.Item>
                            </>
                        )}
                    </div>
                </Form>
            </Modal>

            {/* Maintenance Modal */}
            <Modal
                title={editingMaintenance ? 'Edit Maintenance' : 'Add Maintenance'}
                open={maintenanceModalVisible}
                onCancel={() => setMaintenanceModalVisible(false)}
                onOk={() => maintenanceForm.submit()}
                width={700}
                style={{ top: 20 }}
            >
                <Form form={maintenanceForm} layout="vertical" onFinish={handleMaintenanceSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Form.Item name="asset_id" label="Asset" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="children">
                                {assets.map(asset => (
                                    <Option key={asset.asset_id} value={asset.asset_id}>
                                        {`${asset.type} - ${asset.brand} ${asset.model} (${asset.serial_number})`}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="issue_description" label="Issue Description" rules={[{ required: true }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item name="maintenance_date" label="Maintenance Date">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select>
                                <Option value="Pending">Pending</Option>
                                <Option value="In Progress">In Progress</Option>
                                <Option value="Completed">Completed</Option>
                                <Option value="Cancelled">Cancelled</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={3} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default HardwareManagement;
