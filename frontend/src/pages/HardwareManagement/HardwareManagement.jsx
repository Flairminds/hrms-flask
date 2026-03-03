import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Space, Descriptions, Tag, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BarChartOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
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
import { convertDate } from '../../util/helperFunctions';

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
    const [assetSearch, setAssetSearch] = useState('');

    // State for assignments
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);
    const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
    const [assignmentForm] = Form.useForm();
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [assignmentSearch, setAssignmentSearch] = useState('');
    const [assignmentEmployee, setAssignmentEmployee] = useState(null);

    // State for maintenance
    const [maintenance, setMaintenance] = useState([]);
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);
    const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
    const [maintenanceForm] = Form.useForm();
    const [editingMaintenance, setEditingMaintenance] = useState(null);

    // State for stats summary modal
    const [statsSummaryVisible, setStatsSummaryVisible] = useState(false);

    // State for asset detail drawer
    const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [lockedAssetId, setLockedAssetId] = useState(null); // pre-fills asset in modals

    // All known asset statuses (fixed order)
    const ALL_STATUSES = ['Available', 'Assigned', 'Need Repair', 'Under Maintenance', 'Retired'];

    // Build a Type × Status matrix from the assets list
    const buildAssetMatrix = () => {
        const types = [...new Set(assets.map(a => a.type))].sort();
        const statuses = ALL_STATUSES;

        const rows = types.map(type => {
            const row = { key: type, type };
            let rowTotal = 0;
            statuses.forEach(status => {
                const count = assets.filter(a => a.type === type && a.status === status).length;
                row[status] = count;
                rowTotal += count;
            });
            row['__total'] = rowTotal;
            return row;
        });

        // Add totals row
        const totalsRow = { key: '__totals', type: 'Total' };
        let grandTotal = 0;
        statuses.forEach(status => {
            const count = assets.filter(a => a.status === status).length;
            totalsRow[status] = count;
            grandTotal += count;
        });
        totalsRow['__total'] = grandTotal;
        rows.push(totalsRow);

        const STATUS_COLORS = {
            'Available': '#52c41a',
            'Assigned': '#1890ff',
            'Need Repair': '#fa8c16',
            'Under Maintenance': '#faad14',
            // 'Retired': '#ff4d4f',
        };

        const columns = [
            {
                title: 'Type',
                dataIndex: 'type',
                key: 'type',
                fixed: 'left',
                width: 140,
                render: (val) => <strong>{val}</strong>,
            },
            ...statuses.map(status => ({
                title: (
                    <span style={{ color: STATUS_COLORS[status] || '#333', fontWeight: 600 }}>
                        {status}
                    </span>
                ),
                dataIndex: status,
                key: status,
                align: 'center',
                render: (val, record) => (
                    <span style={{
                        fontWeight: record.type === 'Total' ? 700 : (val > 0 ? 600 : 400),
                        color: val > 0 ? (STATUS_COLORS[status] || '#333') : '#bbb',
                    }}>
                        {val ?? 0}
                    </span>
                ),
            })),
            {
                title: <strong>Total</strong>,
                dataIndex: '__total',
                key: '__total',
                align: 'center',
                render: (val, record) => (
                    <strong style={{ color: record.type === 'Total' ? '#1890ff' : '#333' }}>
                        {val ?? 0}
                    </strong>
                ),
            },
        ];

        return { rows, columns, statuses };
    };

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
        // Now handled via the detail modal - kept for compat
        openAssetDetail(record);
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
                // Keep modal open, refresh selectedAsset with updated data
                const updated = { ...editingAsset, ...data };
                setSelectedAsset(updated);
                setEditingAsset(updated);
            } else {
                await createHardwareAsset(data);
                message.success('Asset created successfully');
                setAssetModalVisible(false);
                assetForm.resetFields();
            }
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

    const openAssetDetail = (asset) => {
        setSelectedAsset(asset);
        setEditingAsset(asset);
        assetForm.setFieldsValue({
            ...asset,
            purchase_date: asset.purchase_date ? dayjs(asset.purchase_date) : null,
            warranty_till: asset.warranty_till ? dayjs(asset.warranty_till) : null,
        });
        setDetailDrawerVisible(true);
    };

    const handleAddAssignment = () => {
        setLockedAssetId(null);
        setEditingAssignment(null);
        assignmentForm.resetFields();
        setAssignmentModalVisible(true);
    };

    const handleAddAssignmentForAsset = (asset) => {
        setLockedAssetId(asset.asset_id);
        setEditingAssignment(null);
        assignmentForm.resetFields();
        assignmentForm.setFieldsValue({ asset_id: asset.asset_id });
        setAssignmentModalVisible(true);
    };

    const handleAddMaintenanceForAsset = (asset) => {
        setLockedAssetId(asset.asset_id);
        setEditingMaintenance(null);
        maintenanceForm.resetFields();
        maintenanceForm.setFieldsValue({ asset_id: asset.asset_id });
        setMaintenanceModalVisible(true);
    };

    const handleEditAssignment = (record) => {
        setEditingAssignment(record);
        assignmentForm.setFieldsValue({
            ...record,
            assignment_date: record.assignment_date ? dayjs(record.assignment_date) : null,
            return_date: record.return_date ? dayjs(record.return_date) : null,
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
            message.error(error.response.data.message ? error.response.data.message : editingAssignment ? 'Failed to update assignment' : 'Failed to create assignment');
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
        setLockedAssetId(null);
        setEditingMaintenance(null);
        maintenanceForm.resetFields();
        setMaintenanceModalVisible(true);
    };

    const handleEditMaintenance = (record) => {
        setEditingMaintenance(record);
        maintenanceForm.setFieldsValue({
            ...record,
            maintenance_date: record.maintenance_date ? dayjs(record.maintenance_date) : null,
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
        { title: 'Status', dataIndex: 'status', key: 'status', filters: [...new Set(assets.map(a => a.status))].filter(Boolean).map(status => ({ text: status, value: status })), onFilter: (value, record) => record.status === value, defaultFilteredValue: ['Available'] },
        { title: 'Purchase Date', dataIndex: 'purchase_date', key: 'purchase_date', render: (date, record) => date == null ? '-' : convertDate(date) },
        { title: 'Warranty Till', dataIndex: 'warranty_till', key: 'warranty_till', render: (date, record) => date == null ? '-' : convertDate(date) },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => openAssetDetail(record)}
                        size="small"
                    >More Details</Button>
                    {/* <Popconfirm
                        title="Are you sure to delete this asset?"
                        onConfirm={() => handleDeleteAsset(record.asset_id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button icon={<DeleteOutlined />} danger size="small">
                            Delete
                        </Button>
                    </Popconfirm> */}
                </Space>
            ),
        },
    ];

    const assignmentColumns = [
        {
            title: 'Asset',
            dataIndex: 'asset_name',
            key: 'asset_name',
            width: 250,
        },
        {
            title: 'Employee',
            dataIndex: 'employee_name',
            key: 'employee_name',
            filters: [...new Set(assignments.map(a => a.employee_name))].filter(Boolean).sort().map(name => ({ text: name, value: name })),
            onFilter: (value, record) => record.employee_name === value,
        },
        { title: 'Assigned Date', dataIndex: 'assignment_date', key: 'assignment_date', render: (date, record) => date == null ? '-' : convertDate(date) },
        { title: 'Assigned By', dataIndex: 'assigned_by_name', key: 'assigned_by_name' },
        { title: 'Return Date', dataIndex: 'return_date', key: 'return_date', render: (date, record) => date == null ? '-' : convertDate(date) },
        { title: 'Status', dataIndex: 'status', key: 'status' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEditAssignment(record)} size="small">
                        Edit
                    </Button>
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
        <>
            <div className="hardware-management">
                {/* <h1>Hardware Management</h1> */}

                <Tabs defaultActiveKey="1">
                    <TabPane tab="Assets" key="1">
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleAddAsset}
                            >
                                Add Asset
                            </Button>
                            <Button
                                icon={<BarChartOutlined />}
                                onClick={() => setStatsSummaryVisible(true)}
                            >
                                Summary
                            </Button>
                            <Input
                                placeholder="Search by serial number or model..."
                                prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                                allowClear
                                value={assetSearch}
                                onChange={e => setAssetSearch(e.target.value)}
                                style={{ width: 260 }}
                            />
                        </div>
                        <Table
                            columns={assetColumns}
                            dataSource={assets.filter(a => {
                                const q = assetSearch.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                    (a.serial_number || '').toLowerCase().includes(q) ||
                                    (a.model || '').toLowerCase().includes(q)
                                );
                            })}
                            loading={assetsLoading}
                            rowKey="asset_id"
                        />
                    </TabPane>

                    <TabPane tab="Assignments" key="2">
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                            {/* <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleAddAssignment}
                            >
                                Assign Asset
                            </Button> */}
                            <Input
                                placeholder="Search by brand, model, serial no..."
                                prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                                allowClear
                                value={assignmentSearch}
                                onChange={e => setAssignmentSearch(e.target.value)}
                                style={{ width: 260 }}
                            />
                        </div>
                        <Table
                            columns={assignmentColumns}
                            dataSource={assignments.filter(a => {
                                const q = assignmentSearch.trim().toLowerCase();
                                return !q || (a.asset_name || '').toLowerCase().includes(q);
                            })}
                            loading={assignmentsLoading}
                            rowKey="assignment_id"
                        />
                    </TabPane>

                    {/* <TabPane tab="Maintenance" key="3">
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
                    </TabPane> */}
                </Tabs>

                {/* Asset Stats Summary Modal */}
                <Modal
                    title={
                        <span style={{ fontWeight: 600, color: 'black' }}>
                            Asset Summary
                        </span>
                    }
                    open={statsSummaryVisible}
                    onCancel={() => setStatsSummaryVisible(false)}
                    footer={null}
                    width={820}
                    style={{ top: 40 }}
                >
                    {(() => {
                        const { rows, columns } = buildAssetMatrix();
                        return (
                            <>
                                <Table
                                    columns={columns}
                                    dataSource={rows}
                                    pagination={false}
                                    size="middle"
                                    bordered
                                    rowClassName={(record) =>
                                        record.type === 'Total'
                                            ? 'ant-table-row-selected'
                                            : ''
                                    }
                                    style={{ borderRadius: 8 }}
                                />
                            </>
                        );
                    })()}
                </Modal>

                {/* Add Asset Modal */}
                <Modal
                    title="Add Asset"
                    open={assetModalVisible}
                    onCancel={() => { setAssetModalVisible(false); assetForm.resetFields(); }}
                    onOk={() => assetForm.submit()}
                    width={700}
                    style={{ top: 20 }}
                >
                    <Form form={assetForm} layout="vertical" onFinish={handleAssetSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="Laptop">Laptop</Option>
                                    <Option value="CPU">CPU</Option>
                                    <Option value="GPU">GPU</Option>
                                    <Option value="ROM">ROM</Option>
                                    <Option value="Monitor">Monitor</Option>
                                    <Option value="Keyboard">Keyboard</Option>
                                    <Option value="Mouse">Mouse</Option>
                                    <Option value="Headset">Headset</Option>
                                    <Option value="Other">Other</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="brand" label="Brand">
                                <Input placeholder="e.g. Dell, Apple" />
                            </Form.Item>
                            <Form.Item name="model" label="Model">
                                <Input placeholder="e.g. XPS 15" />
                            </Form.Item>
                            <Form.Item name="serial_number" label="Serial Number">
                                <Input placeholder="S/N" />
                            </Form.Item>
                            <Form.Item name="status" label="Status" initialValue={"Available"} rules={[{ required: true }]}>
                                <Select>
                                    <Option value="Available">Available</Option>
                                    <Option value="Assigned">Assigned</Option>
                                    <Option value="Need Repair">Need Repair</Option>
                                    <Option value="Under Maintenance">Under Maintenance</Option>
                                    <Option value="Retired">Retired</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="purchase_date" label="Purchase Date">
                                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="warranty_till" label="Warranty Till">
                                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="notes" label="Notes" style={{ gridColumn: 'span 2' }}>
                                <TextArea rows={2} placeholder="Any notes about the asset..." />
                            </Form.Item>
                        </div>
                    </Form>
                </Modal>

                {/* Assignment Modal */}
                <Modal
                    title={editingAssignment ? 'Edit Assignment' : 'Assign Hardware'}
                    open={assignmentModalVisible}
                    onCancel={() => { setAssignmentModalVisible(false); setLockedAssetId(null); }}
                    onOk={() => assignmentForm.submit()}
                    width={700}
                    style={{ top: 20 }}
                    zIndex={1100}
                >
                    <Form form={assignmentForm} layout="vertical" onFinish={handleAssignmentSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <Form.Item name="asset_id" label="Asset" rules={[{ required: true }]}>
                                <Select showSearch optionFilterProp="children" disabled={!!lockedAssetId}>
                                    {assets.map(asset => (
                                        <Option key={asset.asset_id} value={asset.asset_id}>
                                            {`${asset.type}${asset.brand ? ` - ${asset.brand}` : ''}${asset.model ? ` - ${asset.model}` : ''} (${asset.serial_number})`}
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
                            <Form.Item name="assignment_date" label="Assignment Date">
                                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
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
                            <Form.Item name="assigned_by" label="Assigned By" rules={[{ required: true }]}>
                                <Select showSearch optionFilterProp="children">
                                    {employees.map(emp => (
                                        <Option key={`assigned-${emp.employeeId}`} value={emp.employeeId}>
                                            {emp.employeeId} - {emp.employeeName}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            {editingAssignment && (
                                <>
                                    <Form.Item name="return_date" label="Return Date">
                                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item name="condition_at_return" label="Condition at Return">
                                        <TextArea rows={2} />
                                    </Form.Item>
                                    <Form.Item name="return_notes" label="Return Notes">
                                        <TextArea rows={2} />
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
                                </>
                            )}
                        </div>
                    </Form>
                </Modal>

                {/* Maintenance Modal */}
                <Modal
                    title={editingMaintenance ? 'Edit Maintenance' : 'Add Maintenance'}
                    open={maintenanceModalVisible}
                    onCancel={() => { setMaintenanceModalVisible(false); setLockedAssetId(null); }}
                    onOk={() => maintenanceForm.submit()}
                    width={700}
                    style={{ top: 20 }}
                    zIndex={1100}
                >
                    <Form form={maintenanceForm} layout="vertical" onFinish={handleMaintenanceSubmit}>
                        <Form.Item name="asset_id" label="Asset" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="children" disabled={!!lockedAssetId}>
                                {assets.map(asset => (
                                    <Option key={asset.asset_id} value={asset.asset_id}>
                                        {`${asset.type}${asset.brand ? ` - ${asset.brand}` : ''}${asset.model ? ` - ${asset.model}` : ''} (${asset.serial_number})`}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <Form.Item name="maintenance_date" label="Maintenance Date">
                                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="Pending">Pending</Option>
                                    <Option value="In Progress">In Progress</Option>
                                    <Option value="Completed">Completed</Option>
                                    <Option value="Cancelled">Cancelled</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="issue_description" label="Issue Description" rules={[{ required: true }]}>
                                <TextArea rows={3} />
                            </Form.Item>
                            <Form.Item name="notes" label="Notes">
                                <TextArea rows={3} />
                            </Form.Item>
                        </div>
                    </Form>
                </Modal>
            </div>

            {/* Unified Asset Detail Modal (Details + Assignment + Maintenance) */}
            {selectedAsset && (
                <Modal
                    title={null}
                    open={detailDrawerVisible}
                    onCancel={() => {
                        setDetailDrawerVisible(false);
                        setSelectedAsset(null);
                        setEditingAsset(null);
                        assetForm.resetFields();
                    }}
                    footer={null}
                    width={900}
                    style={{ top: 20 }}
                    destroyOnClose
                >
                    <Tabs
                        defaultActiveKey="details"
                        items={[
                            {
                                key: 'details',
                                label: 'Details',
                                children: (
                                    <div style={{ padding: '8px 0' }}>
                                        <Form form={assetForm} layout="vertical" onFinish={handleAssetSubmit}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
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
                                                    <Input placeholder="e.g. Dell, Apple" />
                                                </Form.Item>
                                                <Form.Item name="model" label="Model">
                                                    <Input placeholder="e.g. XPS 15" />
                                                </Form.Item>
                                                <Form.Item name="serial_number" label="Serial Number">
                                                    <Input placeholder="S/N" />
                                                </Form.Item>
                                                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                                    <Select>
                                                        <Option value="Available">Available</Option>
                                                        <Option value="Assigned">Assigned</Option>
                                                        <Option value="Need Repair">Need Repair</Option>
                                                        <Option value="Under Maintenance">Under Maintenance</Option>
                                                        <Option value="Retired">Retired</Option>
                                                    </Select>
                                                </Form.Item>
                                                <Form.Item name="purchase_date" label="Purchase Date">
                                                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                                                </Form.Item>
                                                <Form.Item name="warranty_till" label="Warranty Till">
                                                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                                                </Form.Item>
                                                <Form.Item name="notes" label="Notes" style={{ gridColumn: 'span 2' }}>
                                                    <TextArea rows={2} placeholder="Any notes about the asset..." />
                                                </Form.Item>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                                                <Button type="primary" htmlType="submit">
                                                    Save Changes
                                                </Button>
                                            </div>
                                        </Form>
                                    </div>
                                ),
                            },
                            {
                                key: 'assignment',
                                label: 'Assignment',
                                children: (() => {
                                    const activeAssignment = assignments.find(
                                        a => a.asset_id === selectedAsset.asset_id && a.status === 'Active'
                                    );
                                    const pastAssignments = assignments.filter(
                                        a => a.asset_id === selectedAsset.asset_id && a.status !== 'Active'
                                    );
                                    return (
                                        <div style={{ padding: '8px 0' }}>
                                            {activeAssignment ? (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                        <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>Currently Assigned</Tag>
                                                        <Button
                                                            icon={<EditOutlined />}
                                                            size="small"
                                                            onClick={() => handleEditAssignment(activeAssignment)}
                                                        >
                                                            Edit Assignment
                                                        </Button>
                                                    </div>
                                                    <Descriptions bordered size="small" column={2}>
                                                        <Descriptions.Item label="Employee">{activeAssignment.employee_name}</Descriptions.Item>
                                                        <Descriptions.Item label="Assigned By">{activeAssignment.assigned_by_name}</Descriptions.Item>
                                                        <Descriptions.Item label="Assigned Date">{activeAssignment.assignment_date || '—'}</Descriptions.Item>
                                                        <Descriptions.Item label="Return Date">{activeAssignment.return_date || '—'}</Descriptions.Item>
                                                        <Descriptions.Item label="Condition">{activeAssignment.condition_at_assignment || '—'}</Descriptions.Item>
                                                        <Descriptions.Item label="Status">
                                                            <Tag color="blue">{activeAssignment.status}</Tag>
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Notes" span={2}>{activeAssignment.assignment_notes || '—'}</Descriptions.Item>
                                                    </Descriptions>
                                                </>
                                            ) : (
                                                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <span style={{ color: '#888', fontSize: 13 }}>No active assignment for this asset.</span>
                                                    <Button
                                                        type="primary"
                                                        icon={<PlusOutlined />}
                                                        size="small"
                                                        onClick={() => handleAddAssignmentForAsset(selectedAsset)}
                                                    >
                                                        Assign
                                                    </Button>
                                                </div>
                                            )}

                                            {pastAssignments.length > 0 && (
                                                <>
                                                    <Divider orientation="left" style={{ fontSize: 12, marginTop: 20 }}>Past Assignments</Divider>
                                                    <Table
                                                        size="small"
                                                        pagination={false}
                                                        rowKey="assignment_id"
                                                        dataSource={pastAssignments}
                                                        columns={[
                                                            { title: 'Employee', dataIndex: 'employee_name', key: 'employee_name' },
                                                            { title: 'Assigned', dataIndex: 'assignment_date', key: 'assignment_date', render: (date, record) => date == null ? '-' : convertDate(date) },
                                                            { title: 'Returned', dataIndex: 'return_date', key: 'return_date', render: (date, record) => date == null ? '-' : convertDate(date) },
                                                            {
                                                                title: 'Status', dataIndex: 'status', key: 'status',
                                                                render: v => <Tag color={v === 'Returned' ? 'green' : 'red'}>{v}</Tag>
                                                            },
                                                        ]}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    );
                                })(),
                            },
                            {
                                key: 'maintenance',
                                label: 'Maintenance',
                                children: (
                                    <div style={{ padding: '8px 0' }}>
                                        <div style={{ marginBottom: 12 }}>
                                            <Button
                                                type="primary"
                                                icon={<PlusOutlined />}
                                                size="small"
                                                onClick={() => handleAddMaintenanceForAsset(selectedAsset)}
                                            >
                                                Add Maintenance Record
                                            </Button>
                                        </div>
                                        <Table
                                            size="small"
                                            pagination={false}
                                            rowKey="maintenance_id"
                                            dataSource={maintenance.filter(m => m.asset_id === selectedAsset.asset_id)}
                                            locale={{ emptyText: 'No maintenance records for this asset.' }}
                                            columns={[
                                                { title: 'Date', dataIndex: 'maintenance_date', key: 'maintenance_date', width: 110 },
                                                { title: 'Issue', dataIndex: 'issue_description', key: 'issue_description', ellipsis: true },
                                                {
                                                    title: 'Status', dataIndex: 'status', key: 'status', width: 130,
                                                    render: v => <Tag color={v === 'Completed' ? 'green' : v === 'In Progress' ? 'blue' : v === 'Pending' ? 'orange' : 'red'}>{v}</Tag>
                                                },
                                                { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true },
                                                {
                                                    title: '', key: 'actions', width: 60,
                                                    render: (_, rec) => (
                                                        <Button
                                                            icon={<EditOutlined />}
                                                            size="small"
                                                            onClick={() => handleEditMaintenance(rec)}
                                                        />
                                                    ),
                                                },
                                            ]}
                                        />
                                    </div>
                                ),
                            },
                        ]}
                    />
                </Modal>
            )}
        </>
    );
};

export default HardwareManagement;
