import React, { useEffect, useState } from "react";
import { Table, Select, Input, Space, Button, Tabs } from "antd";
import { getMonthlyReport } from "../../services/api";
import styles from "./MonthlyReport.module.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CSVLink } from "react-csv";

const generateColumns = (days) => {
    const baseColumns = [
        { title: 'Employee_Id', dataIndex: 'Employee_Id', key: 'Employee_Id' },
        { title: 'Employee_Name', dataIndex: 'Employee_Name', key: 'Employee_Name' },
        { title: 'TeamLeadCoordinator', dataIndex: 'TeamLeadCoordinator', key: 'TeamLeadCoordinator' },
    ];

    const dayColumns = [
        'Date', 'EntryExempt', 'Dayslogs', 'ZymmrLoggedTime',
        'Typeofleaveapproved', 'EntryinTime', 'DateofLeaveApplication',
        'Leavestatus', 'WorkingDay', 'ApprovalDate', 'Approvedonsamedate',
        'Status', 'Swappedholidaydate', 'Unpaidstatus'
    ];

    const allColumns = [...baseColumns];

    for (let i = 1; i <= days; i++) {
        dayColumns.forEach(column => {
            allColumns.push({
                title: `${column}${i}`,
                dataIndex: `${column.replace(/ /g, '')}${i}`,
                key: `${column.replace(/ /g, '')}${i}`
            });
        });
    }

    return allColumns;
};

const MonthlyReport = () => {
    const [reportData, setReportData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [paginationConfig, setPaginationConfig] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [loader, setLoader] = useState(false);

    const years = [2023, 2024, 2025, 2026];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const columns = generateColumns(31);

    const fetchMonthlyReport = async (page = 1, pageSize = 5) => {
        setLoader(true);
        try {
            // Convert month name to number (1-12)
            const monthNumber = months.indexOf(month) + 1;

            const response = await getMonthlyReport(monthNumber, year);
            toast.success("Report Generated");

            // Ensure response.data is always an array
            const data = Array.isArray(response.data) ? response.data : [];
            setReportData(data);

            setPaginationConfig((prevConfig) => ({
                ...prevConfig,
                current: page,
                pageSize,
                total: data.length,
            }));
        } catch (error) {
            console.error("Error fetching the monthly report:", error);
            toast.error("Failed to generate report");
            setReportData([]);
            setFilteredData([]);
        } finally {
            setLoader(false);
        }
    };

    useEffect(() => {
        fetchMonthlyReport(paginationConfig.current, paginationConfig.pageSize);
    }, []);

    useEffect(() => {
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            const filtered = reportData.filter((item) =>
                item.Employee_Name.toLowerCase().includes(lowercasedTerm)
            );
            setFilteredData(filtered);
        } else {
            setFilteredData(reportData);
        }
    }, [searchTerm, reportData]);

    const handleTableChange = (pagination) => {
        setPaginationConfig({
            ...paginationConfig,
            current: pagination.current,
            pageSize: pagination.pageSize,
        });
    };

    // Leave Report Tab Content
    const LeaveReportTab = () => (
        <>
            <div className={styles.selectDiv}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div>
                        <Space>
                            <Select
                                value={month}
                                onChange={(value) => setMonth(value)}
                                style={{ width: 120 }}
                            >
                                {months.map((m, index) => (
                                    <Select.Option key={index} value={m}>{m}</Select.Option>
                                ))}
                            </Select>
                            <Select
                                value={year}
                                onChange={(value) => setYear(value)}
                                style={{ width: 120 }}
                            >
                                {years.map((y, index) => (
                                    <Select.Option key={index} value={y}>{y}</Select.Option>
                                ))}
                            </Select>
                            <Button
                                className={styles.loadBtn}
                                onClick={() => fetchMonthlyReport(paginationConfig.current, paginationConfig.pageSize)}
                                loading={loader}
                            >
                                Generate
                            </Button>
                            <Button className={styles.loadBtn}>
                                <CSVLink
                                    data={filteredData}
                                    headers={columns.map(col => ({ label: col.title, key: col.dataIndex }))}
                                    filename={`leave_report_${month}_${year}.csv`}
                                    className={styles.downloadButton}
                                >
                                    Download
                                </CSVLink>
                            </Button>
                        </Space>
                    </div>
                    <div className={styles.searchDiv}>
                        <Input.Search
                            placeholder="Search by employee name"
                            onSearch={(value) => setSearchTerm(value)}
                            style={{ width: 300 }}
                        />
                    </div>
                </div>
            </div>
            {filteredData.length > 0 ? (
                <Table
                    dataSource={filteredData}
                    columns={columns}
                    pagination={paginationConfig}
                    onChange={handleTableChange}
                    rowKey="Employee_Id"
                    scroll={{ x: 'max-content' }}
                    className={styles.empTable}
                />
            ) : (
                <p>No data available. Click "Generate" to fetch the report.</p>
            )}
        </>
    );

    // Placeholder for Door Entry Report
    const DoorEntryReportTab = () => (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            {/* <h3>Door Entry Report</h3> */}
            <p>This feature is coming soon...</p>
        </div>
    );

    // Placeholder for Zymmr Report
    const ZymmrReportTab = () => (
        <div style={{ padding: '20px' }}>
            {/* <h3>Zymmr Report</h3> */}
            <p>Not supported yet.</p>
        </div>
    );

    // Placeholder for Attendance Report
    const AttendanceReportTab = () => (
        <div style={{ padding: '20px' }}>
            <a href="https://hrms-monthly-report.streamlit.app/">Click here to go the Attendance Report application</a>
        </div>
    );

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
