import React, { useEffect, useState } from "react";
import { Table, Select, Space, Button, Tabs } from "antd";
import { getReports, getReportDetails, generateReport } from "../../services/api";
import { ReloadOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import styles from "./MonthlyReport.module.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { convertDate } from "../../util/helperFunctions";

const years = [2023, 2024, 2025, 2026];
const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

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
            title: 'Generated By',
            dataIndex: 'generated_by_name',
            key: 'generated_by_name',
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

// Placeholder for Door Entry Report
const DoorEntryReportTab = () => (
    <div style={{ padding: '20px' }}>
        <p>This feature is coming soon...</p>
    </div>
);

// Placeholder for Zymmr Report
const ZymmrReportTab = () => (
    <div style={{ padding: '20px' }}>
        <p>Not supported yet.</p>
    </div>
);

// Placeholder for Attendance Report
const AttendanceReportTab = () => (
    <div style={{ padding: '20px' }}>
        <a href="https://hrms-monthly-report.streamlit.app/" target="_blank" rel="noopener noreferrer">Click here to go the Attendance Report application</a>
    </div>
);

// Report History Tab
const ReportHistoryTab = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState('All');

    const reportTypes = [
        'All',
        'Monthly Leave Report',
        'Monthly Door Entry Report',
        'Monthly Timesheet Report',
        'Monthly Attendance Report'
    ];

    useEffect(() => {
        fetchReports();
    }, [selectedType]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const type = selectedType === 'All' ? undefined : selectedType;
            const response = await getReports(type);
            if (response.success) {
                setReports(response.data);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch reports");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id) => {
        try {
            const response = await getReportDetails(id);
            if (response.success && response.data.download_url) {
                window.open(response.data.download_url, '_blank');
            } else {
                toast.error("Download link not available");
            }
        } catch (e) {
            toast.error("Error downloading file");
        }
    };

    const columns = [
        {
            title: 'Report Type',
            dataIndex: 'report_type',
            key: 'report_type',
        },
        {
            title: 'Generated By',
            dataIndex: 'generated_by_name',
            key: 'generated_by_name',
        },
        {
            title: 'Generated At',
            dataIndex: 'generated_at',
            key: 'generated_at',
            render: (text) => new Date(text).toLocaleString()
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    {record.has_file && (
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => handleDownload(record.id)}
                        >
                            Download
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 500 }}>Filter by Type:</span>
                    <Select
                        value={selectedType}
                        onChange={setSelectedType}
                        style={{ width: 250 }}
                    >
                        {reportTypes.map(type => (
                            <Select.Option key={type} value={type}>{type}</Select.Option>
                        ))}
                    </Select>
                </div>
                <Button onClick={fetchReports} icon={<ReloadOutlined />}>Refresh</Button>
            </div>
            <Table
                columns={columns}
                dataSource={reports}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
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
        {
            key: '5',
            label: 'Generated Reports History',
            children: <ReportHistoryTab />,
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
