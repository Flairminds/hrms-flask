import React, { useEffect, useState } from "react";
import { Table, Select, Space, Button, Tabs, Modal, Upload, message, Card, Tag } from "antd";
import { getReports, getReportDetails, generateReport, deleteReport, uploadDoorEntryReport, getDoorEntryMappingStats, saveDoorEntryMapping, deleteDoorEntryMapping, generateAttendanceReport } from "../../services/api";
import { ReloadOutlined, EyeOutlined, DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons';
import styles from "./MonthlyReport.module.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { convertDate } from "../../util/helperFunctions";

const { confirm } = Modal;

const years = [2023, 2024, 2025, 2026];
const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const handleDelete = (id, refreshCallbacks) => {
    confirm({
        title: 'Are you sure you want to delete this report?',
        icon: <ExclamationCircleOutlined />,
        content: 'This will remove the report from the list.',
        onOk() {
            return deleteReport(id)
                .then(res => {
                    if (res.success) {
                        toast.success("Report deleted successfully");
                        refreshCallbacks.forEach(cb => cb());
                    } else {
                        toast.error(res.message);
                    }
                })
                .catch(() => {
                    toast.error("Failed to delete report");
                });
        },
        onCancel() { },
    });
};

// Leave Report Tab Content
const LeaveReportTab = () => {
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [reports, setReports] = useState([]);
    const [detailData, setDetailData] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [leaveReportTableColumns, setLeaveReportTableColumns] = useState([]);

    // Month/Year for Generation
    const [genInMonth, setGenInMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [genInYear, setGenInYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (viewMode === 'list') {
            fetchReportList();
        }
    }, [viewMode]);

    const fetchReportList = async () => {
        setListLoading(true);
        try {
            const response = await getReports('Monthly Leave Report');
            if (response.success) {
                setReports(response.data);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Failed to fetch reports list");
        } finally {
            setListLoading(false);
        }
    };

    const handleGenerateNew = async () => {
        // Convert month name to number (1-12)
        const monthNumber = months.indexOf(genInMonth) + 1;
        setListLoading(true);
        try {
            const response = await generateReport(monthNumber, genInYear, 'Monthly Leave Report');
            if (response.success) {
                toast.success("Report Generated Successfully");
                fetchReportList();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Failed to generate report");
        } finally {
            setListLoading(false);
        }
    };

    const handleViewReport = async (reportId) => {
        setDetailLoading(true);
        setViewMode('detail');
        setDetailData([]); // Clear previous

        try {
            const response = await getReportDetails(reportId);
            if (response.success) {
                // response.data.data is the actual JSON list of rows
                const data = Array.isArray(response.data.data) ? response.data.data : [];
                setDetailData(data);

                // Re-calculate columns based on data keys if needed, or use static definition
                updateColumns(data);
            } else {
                toast.error("Failed to load report details");
                setViewMode('list');
            }
        } catch (error) {
            toast.error("Error fetching report details");
            setViewMode('list');
        } finally {
            setDetailLoading(false);
        }
    };

    const updateColumns = (data) => {
        const cols = [
            {
                title: 'Employee_Id', dataIndex: 'Employee_Id', key: 'Employee_Id',
                filters: [...new Set(data.map(a => a.Employee_Id))].filter(Boolean).map(name => ({ text: name, value: name })),
                onFilter: (value, record) => record.Employee_Id === value,
            },
            { title: 'Employee_Name', dataIndex: 'Employee_Name', key: 'Employee_Name', filters: [...new Set(data.map(a => a.Employee_Name))].filter(Boolean).map(name => ({ text: name, value: name })), onFilter: (value, record) => record.Employee_Name === value, },
            { title: 'TeamLeadCoordinator', dataIndex: 'TeamLeadCoordinator', key: 'TeamLeadCoordinator' },
            {
                title: 'Date', dataIndex: 'Date', key: 'Date',
                filters: [...new Set(data.map(a => a.Date))].filter(Boolean).map(name => ({ text: name, value: name })),
                onFilter: (value, record) => record.Date === value,
            },
            { title: 'EntryExempt', dataIndex: 'EntryExempt', key: 'EntryExempt' },
            { title: 'Dayslogs', dataIndex: 'Dayslogs', key: 'Dayslogs' },
            { title: 'ZymmrLoggedTime', dataIndex: 'ZymmrLoggedTime', key: 'ZymmrLoggedTime' },
            { title: 'Typeofleaveapproved', dataIndex: 'Typeofleaveapproved', key: 'Typeofleaveapproved' },
            { title: 'EntryinTime', dataIndex: 'EntryinTime', key: 'EntryinTime' },
            { title: 'DateofLeaveApplication', dataIndex: 'DateofLeaveApplication', key: 'DateofLeaveApplication' },
            { title: 'Leavestatus', dataIndex: 'Leavestatus', key: 'Leavestatus' },
            { title: 'WorkingDay', dataIndex: 'WorkingDay', key: 'WorkingDay' },
            { title: 'ApprovalDate', dataIndex: 'ApprovalDate', key: 'ApprovalDate' },
            { title: 'Approvedonsamedate', dataIndex: 'Approvedonsamedate', key: 'Approvedonsamedate' },
            { title: 'Status', dataIndex: 'Status', key: 'Status' },
            { title: 'Swappedholidaydate', dataIndex: 'Swappedholidaydate', key: 'Swappedholidaydate' },
            { title: 'Unpaidstatus', dataIndex: 'Unpaidstatus', key: 'Unpaidstatus', filters: [...new Set(data.map(a => a.Unpaidstatus))].filter(Boolean).map(name => ({ text: name, value: name })), onFilter: (value, record) => record.Unpaidstatus === value, }
        ];
        setLeaveReportTableColumns(cols);
    };

    const listColumns = [
        {
            title: 'Report Type',
            dataIndex: 'report_type',
            key: 'report_type',
        },
        {
            title: 'Report For',
            dataIndex: 'report_for',
            key: 'report_for',
        },
        {
            title: 'Report Frequency',
            dataIndex: 'report_frequency',
            key: 'report_frequency',
        },
        {
            title: 'Generated At',
            dataIndex: 'generated_at',
            key: 'generated_at',
            render: (text) => convertDate(text)
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EyeOutlined />} onClick={() => handleViewReport(record.id)}>View</Button>
                    {record.has_file && (
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={async () => {
                                try {
                                    const response = await getReportDetails(record.id);
                                    if (response.success && response.data.download_url) {
                                        window.open(response.data.download_url, '_blank');
                                    } else {
                                        toast.error("Download link not available");
                                    }
                                } catch (e) {
                                    toast.error("Error downloading file");
                                }
                            }}
                        >
                            Download
                        </Button>
                    )}
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id, [fetchReportList])}
                    >
                        Delete
                    </Button>
                </Space>
            ),
        },
    ];

    if (viewMode === 'list') {
        return (
            <div style={{ marginTop: '20px' }}>
                <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '20px' }}>
                    {/* <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>Generate New Report:</span>
                    </div> */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Select value={genInMonth} onChange={setGenInMonth} style={{ width: 120 }}>
                            {months.map((m, index) => (
                                <Select.Option key={index} value={m}>{m}</Select.Option>
                            ))}
                        </Select>
                        <Select value={genInYear} onChange={setGenInYear} style={{ width: 100 }}>
                            {years.map((y, index) => (
                                <Select.Option key={index} value={y}>{y}</Select.Option>
                            ))}
                        </Select>
                        <Button
                            type="primary"
                            onClick={handleGenerateNew}
                            loading={listLoading}
                        >
                            Generate & Save
                        </Button>
                        <Button onClick={fetchReportList} icon={<ReloadOutlined />}>Refresh List</Button>
                    </div>
                </div>

                {/* <h3>Monthly Leave Reports History</h3> */}
                <Table
                    columns={listColumns}
                    dataSource={reports}
                    rowKey="id"
                    loading={listLoading}
                    pagination={{ pageSize: 10 }}
                />
            </div>
        );
    }

    // Detail View
    return (
        <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setViewMode('list')}>← Back to List</Button>
            </div>
            <Table
                dataSource={detailData}
                columns={leaveReportTableColumns}
                rowKey={(record, index) => `${record.Employee_Id}-${index}`}
                scroll={{ x: 'max-content' }}
                className={styles.empTable}
                loading={detailLoading}
            />
        </div>
    );
};

// Door Entry Stats Component
const DoorEntryStats = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await getDoorEntryMappingStats();
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Door Name', dataIndex: 'door_system_name', key: 'door_system_name' },
        { title: 'Door ID', dataIndex: 'door_system_id', key: 'door_system_id' },
    ];

    if (loading) return <div>Loading Stats...</div>;
    if (!stats) return null;

    return (
        <Card title="Door Entry Name Mappings" style={{ margin: '2rem 0' }} extra={<Button onClick={fetchStats} icon={<ReloadOutlined />}>Refresh</Button>}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <Card.Grid style={{ width: '33%', textAlign: 'center' }}>
                    <h3>{stats.total_active}</h3>
                    <div>Total Active Employees</div>
                </Card.Grid>
                <Card.Grid style={{ width: '33%', textAlign: 'center' }}>
                    <h3>{stats.mapped_count}</h3>
                    <div>Mapped Employees</div>
                </Card.Grid>
                <Card.Grid style={{ width: '33%', textAlign: 'center', backgroundColor: stats.unmapped_count > 0 ? '#fff1f0' : '#f6ffed' }}>
                    <h3 style={{ color: stats.unmapped_count > 0 ? '#f5222d' : '#52c41a' }}>{stats.unmapped_count}</h3>
                    <div>Unmapped Employees</div>
                </Card.Grid>
            </div>

            <MappingList
                mappedEmployees={stats.mapped_employees}
                unmappedEmployees={stats.unmapped_employees}
                onRefresh={fetchStats}
            />
        </Card >
    );
};

// Sub-component for Mapping List and CRUD
const MappingList = ({ mappedEmployees, unmappedEmployees, onRefresh }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formValues, setFormValues] = useState({ employee_id: '', door_system_name: '', door_system_id: '' });
    const [loading, setLoading] = useState(false);

    const handleEdit = (record) => {
        setEditingRecord(record);
        setFormValues({
            employee_id: record.employee_id,
            door_system_name: record.door_system_name || '',
            door_system_id: record.door_system_id || ''
        });
        setIsModalVisible(true);
    };

    const handleAdd = (record) => { // Adding from unmapped list
        setEditingRecord(null); // specific mode for adding from list? or just use edit mode with pre-filled ID
        setFormValues({
            employee_id: record.employee_id,
            door_system_name: '',
            door_system_id: ''
        });
        setIsModalVisible(true);
    };

    // Manual add button (not from list)
    const handleManualAdd = () => {
        setEditingRecord(null);
        setFormValues({ employee_id: '', door_system_name: '', door_system_id: '' });
        setIsModalVisible(true);
    }

    const handleDeleteMapping = (employeeId) => {
        confirm({
            title: 'Delete Mapping?',
            content: `Are you sure you want to delete the mapping for ${employeeId}?`,
            onOk: async () => {
                try {
                    const res = await deleteDoorEntryMapping(employeeId);
                    if (res.data.success) {
                        message.success("Mapping deleted");
                        onRefresh();
                    } else {
                        message.error(res.data.message);
                    }
                } catch (e) {
                    message.error("Failed to delete mapping");
                }
            }
        });
    };

    const handleSave = async () => {
        if (!formValues.employee_id || !formValues.door_system_name) {
            message.error("Employee ID and Door System Name are required");
            return;
        }

        setLoading(true);
        try {
            const res = await saveDoorEntryMapping(formValues);
            if (res.data.success) {
                message.success("Mapping saved successfully");
                setIsModalVisible(false);
                onRefresh();
            } else {
                message.error(res.data.message);
            }
        } catch (error) {
            message.error("Failed to save mapping");
        } finally {
            setLoading(false);
        }
    };

    const mappedColumns = [
        { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Door Name', dataIndex: 'door_system_name', key: 'door_system_name' },
        { title: 'Door ID', dataIndex: 'door_system_id', key: 'door_system_id' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
                    <Button type="link" danger onClick={() => handleDeleteMapping(record.employee_id)}>Delete</Button>
                </Space>
            )
        }
    ];

    const unmappedColumns = [
        { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button type="link" onClick={() => handleAdd(record)}>Add Mapping</Button>
            )
        }
    ];

    return (
        <>
            <Tabs defaultActiveKey="1" items={[
                {
                    key: '1',
                    label: `Unmapped Employees (${unmappedEmployees.length})`,
                    children: <Table dataSource={unmappedEmployees} columns={unmappedColumns} rowKey="employee_id" pagination={{ pageSize: 5 }} size="small" />
                },
                {
                    key: '2',
                    label: `Mapped Employees (${mappedEmployees.length})`,
                    children: (
                        <div>
                            {/* <Button type="primary" onClick={handleManualAdd} style={{marginBottom: 10}}>Add New Mapping</Button> */}
                            <Table dataSource={mappedEmployees} columns={mappedColumns} rowKey="employee_id" pagination={{ pageSize: 5 }} size="small" />
                        </div>
                    )
                }
            ]} />

            <Modal
                title={editingRecord ? "Edit Mapping" : "Add Mapping"}
                open={isModalVisible}
                onOk={handleSave}
                onCancel={() => setIsModalVisible(false)}
                confirmLoading={loading}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label>Employee ID:
                        <input
                            type="text"
                            value={formValues.employee_id}
                            onChange={(e) => setFormValues({ ...formValues, employee_id: e.target.value })}
                            disabled={!!formValues.employee_id && (editingRecord !== null || formValues.employee_id !== '')} // Disable if editing or if added from unmapped list (where we pre-fill). Actually, if we pre-fill, we might want to allow change? But usually mapping is for that specific person. Let's assume ID is fixed when clicking "Add Mapping" for a person.
                            style={{ width: '100%', padding: '5px' }}
                        />
                    </label>
                    <label>Door System Name:
                        <input
                            type="text"
                            value={formValues.door_system_name}
                            onChange={(e) => setFormValues({ ...formValues, door_system_name: e.target.value })}
                            style={{ width: '100%', padding: '5px' }}
                        />
                    </label>
                    <label>Door System ID:
                        <input
                            type="text"
                            value={formValues.door_system_id}
                            onChange={(e) => setFormValues({ ...formValues, door_system_id: e.target.value })}
                            style={{ width: '100%', padding: '5px' }}
                        />
                    </label>
                </div>
            </Modal>
        </>
    );
};

// Door Entry Report Tab Content
const DoorEntryReportTab = () => {
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [reports, setReports] = useState([]);
    const [detailData, setDetailData] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [detailColumns, setDetailColumns] = useState([]);
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Month/Year for Upload
    const [genInMonth, setGenInMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [genInYear, setGenInYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (viewMode === 'list') {
            fetchReportList();
        }
    }, [viewMode]);

    const fetchReportList = async () => {
        setListLoading(true);
        try {
            const response = await getReports('Monthly Door Entry Report');
            if (response.success) {
                setReports(response.data);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Failed to fetch reports list");
        } finally {
            setListLoading(false);
        }
    };

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.error('Please select a file first');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileList[0]);
        formData.append('month', months.indexOf(genInMonth) + 1);
        formData.append('year', genInYear);
        formData.append('report_type', 'Monthly Door Entry Report');

        setUploading(true);
        try {
            const response = await uploadDoorEntryReport(formData);
            if (response.success) {
                toast.success("Report Uploaded & Saved Successfully");
                setFileList([]);
                fetchReportList();
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Failed to upload report");
        } finally {
            setUploading(false);
        }
    };

    const handleViewReport = async (reportId) => {
        setDetailLoading(true);
        setViewMode('detail');
        setDetailData([]);

        try {
            const response = await getReportDetails(reportId);
            if (response.success) {
                const data = Array.isArray(response.data.data) ? response.data.data : [];
                setDetailData(data);

                // Dynamic columns based on first row keys
                if (data.length > 0) {
                    const keys = Object.keys(data[0]);
                    const cols = keys.map(key => ({
                        title: key,
                        dataIndex: key,
                        key: key,
                        filters: [...new Set(data.map(a => a[key]))].filter(Boolean).map(name => ({ text: name, value: name })),
                        onFilter: (value, record) => record[key] === value,
                    }));
                    setDetailColumns(cols);
                }
            } else {
                toast.error("Failed to load report details");
                setViewMode('list');
            }
        } catch (error) {
            toast.error("Error fetching report details");
            setViewMode('list');
        } finally {
            setDetailLoading(false);
        }
    };

    const listColumns = [
        {
            title: 'Report Type',
            dataIndex: 'report_type',
            key: 'report_type',
        },
        {
            title: 'Report For',
            dataIndex: 'report_for',
            key: 'report_for',
        },
        {
            title: 'Report Frequency',
            dataIndex: 'report_frequency',
            key: 'report_frequency',
        },
        {
            title: 'Generated At',
            dataIndex: 'generated_at',
            key: 'generated_at',
            render: (text) => convertDate(text)
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EyeOutlined />} onClick={() => handleViewReport(record.id)}>View</Button>
                    {record.has_file && (
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={async () => {
                                try {
                                    const response = await getReportDetails(record.id);
                                    if (response.success && response.data.download_url) {
                                        window.open(response.data.download_url, '_blank');
                                    } else {
                                        toast.error("Download link not available");
                                    }
                                } catch (e) {
                                    toast.error("Error downloading file");
                                }
                            }}
                        >
                            Download
                        </Button>
                    )}
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id, [fetchReportList])}
                    >
                        Delete
                    </Button>
                </Space>
            ),
        },
    ];

    const uploadProps = {
        onRemove: (file) => {
            setFileList([]);
        },
        beforeUpload: (file) => {
            setFileList([file]);
            return false;
        },
        fileList,
    };

    if (viewMode === 'list') {
        return (
            <div style={{ marginTop: '20px' }}>
                <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Select value={genInMonth} onChange={setGenInMonth} style={{ width: 120 }}>
                            {months.map((m, index) => (
                                <Select.Option key={index} value={m}>{m}</Select.Option>
                            ))}
                        </Select>
                        <Select value={genInYear} onChange={setGenInYear} style={{ width: 100 }}>
                            {years.map((y, index) => (
                                <Select.Option key={index} value={y}>{y}</Select.Option>
                            ))}
                        </Select>

                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />}>Select File</Button>
                        </Upload>

                        <Button
                            type="primary"
                            onClick={handleUpload}
                            loading={uploading}
                            disabled={fileList.length === 0}
                        >
                            Upload & Save
                        </Button>

                        <Button onClick={fetchReportList} icon={<ReloadOutlined />}>Refresh List</Button>
                    </div>
                </div>
                <p style={{ color: 'lightblue' }}>Data extracted from the Exceptional Sheet from the monthly door entry excel file</p>

                <Table
                    columns={listColumns}
                    dataSource={reports}
                    rowKey="id"
                    loading={listLoading}
                    pagination={{ pageSize: 10 }}
                />

                <div style={{ marginBottom: '20px' }}>
                    <DoorEntryStats />
                </div>
            </div>
        );
    }

    // Detail View
    return (
        <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setViewMode('list')}>← Back to List</Button>
            </div>
            <Table
                dataSource={detailData}
                columns={detailColumns}
                rowKey={(record, index) => index}
                scroll={{ x: 'max-content' }}
                className={styles.empTable}
                loading={detailLoading}
            />
        </div>
    );
};

// Placeholder for Zymmr Report
const ZymmrReportTab = () => (
    <div style={{ padding: '20px' }}>
        <p>Not supported yet.</p>
    </div>
);

const AttendanceReportTab = () => {
    const [viewMode, setViewMode] = useState('list');
    const [attendanceReports, setAttendanceReports] = useState([]);
    const [leaveReports, setLeaveReports] = useState([]);
    const [doorReports, setDoorReports] = useState([]);

    const [selectedLeaveReport, setSelectedLeaveReport] = useState(null);
    const [selectedDoorReport, setSelectedDoorReport] = useState(null);

    const [loading, setLoading] = useState(false);
    const [detailData, setDetailData] = useState([]);
    const [detailColumns, setDetailColumns] = useState([]);

    useEffect(() => {
        if (viewMode === 'list') {
            fetchLists();
        }
    }, [viewMode]);

    const fetchLists = async () => {
        setLoading(true);
        try {
            const [attRes, leaveRes, doorRes] = await Promise.all([
                getReports('Monthly Attendance Report'),
                getReports('Monthly Leave Report'),
                getReports('Monthly Door Entry Report')
            ]);

            if (attRes.success) setAttendanceReports(attRes.data);
            if (leaveRes.success) setLeaveReports(leaveRes.data);
            if (doorRes.success) setDoorReports(doorRes.data);

        } catch (error) {
            toast.error("Failed to fetch reports");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedLeaveReport || !selectedDoorReport) {
            message.error("Please select both a Leave Report and a Door Entry Report");
            return;
        }

        setLoading(true);
        try {
            const res = await generateAttendanceReport(selectedLeaveReport, selectedDoorReport);
            if (res.data.success) {
                toast.success("Attendance Report Generated Successfully");
                fetchLists();
                setSelectedLeaveReport(null);
                setSelectedDoorReport(null);
            } else {
                toast.error(res.data.message);
            }
        } catch (error) {
            toast.error("Failed to generate report");
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = async (reportId) => {
        setLoading(true);
        setViewMode('detail');
        setDetailData([]);

        try {
            const response = await getReportDetails(reportId);
            if (response.success) {
                const data = Array.isArray(response.data.data) ? response.data.data : [];
                setDetailData(data);

                // Dynamic columns
                if (data.length > 0) {
                    const keys = Object.keys(data[0]);
                    const cols = keys.map(key => ({
                        title: key,
                        dataIndex: key,
                        key: key,
                        render: (text) => {
                            if (typeof text === 'object' && text !== null) return JSON.stringify(text);
                            return text;
                        }
                    }));
                    setDetailColumns(cols);
                }
            } else {
                toast.error("Failed to load report details");
                setViewMode('list');
            }
        } catch (error) {
            toast.error("Error fetching report details");
            setViewMode('list');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Report For', dataIndex: 'report_for', key: 'report_for' },
        { title: 'Generated At', dataIndex: 'generated_at', key: 'generated_at', render: (text) => convertDate(text) },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => handleViewReport(record.id)}>View</Button>
                    {record.has_file && (
                        <Button icon={<DownloadOutlined />} onClick={() => {/* Download logic if needed */ }}>Download</Button>
                    )}
                    <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, [fetchLists])}>Delete</Button>
                </Space>
            )
        }
    ];

    if (viewMode === 'list') {
        return (
            <div style={{ marginTop: '20px' }}>
                <Card title="Generate Attendance Report" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label>Select Monthly Leave Report:</label>
                            <Select
                                style={{ width: 300 }}
                                placeholder="Select Leave Report"
                                value={selectedLeaveReport}
                                onChange={setSelectedLeaveReport}
                            >
                                {leaveReports.map(r => (
                                    <Select.Option key={r.id} value={r.id}>
                                        {r.report_for} (Gen: {convertDate(r.generated_at)})
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label>Select Door Entry Report:</label>
                            <Select
                                style={{ width: 300 }}
                                placeholder="Select Door Entry Report"
                                value={selectedDoorReport}
                                onChange={setSelectedDoorReport}
                            >
                                {doorReports.map(r => (
                                    <Select.Option key={r.id} value={r.id}>
                                        {r.report_for} (Gen: {convertDate(r.generated_at)})
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>
                        <Button type="primary" onClick={handleGenerate} loading={loading} disabled={!selectedLeaveReport || !selectedDoorReport}>
                            Generate & Save
                        </Button>
                        <Button onClick={fetchLists} icon={<ReloadOutlined />}>Refresh</Button>
                    </div>
                </Card>

                <Table
                    columns={columns}
                    dataSource={attendanceReports}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </div>
        );
    }

    return (
        <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
                <Button onClick={() => setViewMode('list')}>← Back to List</Button>
            </div>
            <Table
                dataSource={detailData}
                columns={detailColumns}
                rowKey={(record, index) => index}
                scroll={{ x: 'max-content' }}
                loading={loading}
                pagination={{ pageSize: 20 }}
            />
        </div>
    );
};

const MonthlyReport = () => {
    const tabItems = [
        {
            key: '1',
            label: 'Leave Report',
            children: <LeaveReportTab />,
        },
        {
            key: '2',
            label: 'Door Entry Report',
            children: <DoorEntryReportTab />,
        },
        {
            key: '3',
            label: 'Zymmr Report',
            children: <ZymmrReportTab />,
        },
        {
            key: '4',
            label: 'Attendance Report',
            children: <AttendanceReportTab />,
        },
    ];

    return (
        <div className={styles.main}>
            <Tabs defaultActiveKey="1" items={tabItems} />
            <ToastContainer />
        </div>
    );
};

export default MonthlyReport;
