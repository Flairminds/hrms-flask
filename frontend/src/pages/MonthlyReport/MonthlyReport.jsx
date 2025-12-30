import React, { useEffect, useState } from "react";
import { Table, Select, Input, Space, Button } from "antd";
import { getMonthlyReport } from "../../services/api";
import styles from "./MonthlyReport.module.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CSVLink } from "react-csv";  // Import CSVLink

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
        pageSize: 5,
        total: 0,
        showSizeChanger: true,
        pageSizeOptions: ['5', '10', '20', '50'],
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [loader, setLoader] = useState(false);

    const years = [2023, 2024, 2025];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const columns = generateColumns(31);

    

    const fetchMonthlyReport = async (page = 1, pageSize = 5) => {
        setLoader(true);
        try {
            const response = await getMonthlyReport(month, year, page, pageSize);
            toast.success("Report Generated");
    
            setReportData(response.data);
            setPaginationConfig((prevConfig) => ({
                ...prevConfig,
                current: page,
                pageSize,
                total: response.totalCount,
            }));
        } catch (error) {
            console.error("Error fetching the monthly report:", error);
            toast.error("Failed to generate report");
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

    return (
        <div className={styles.main}>
            <h3 className={styles.heading}>Monthly Report</h3>
            <div className={styles.selectDiv}>
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
                        <Button className={styles.loadBtn} onClick={() => fetchMonthlyReport(paginationConfig.current, paginationConfig.pageSize)} loading={loader}>
                            Generate
                        </Button>
                    </Space>
                </div>
                <div className={styles.searchDiv}>
                    <Input.Search
                        placeholder="Search by employee name"
                        onSearch={(value) => setSearchTerm(value)}
                        style={{ width: 1000 }}
                    />
                    <Button  className={styles.loadBtn}>
                        <CSVLink
                            data={filteredData} 
                            headers={columns.map(col => ({ label: col.title, key: col.dataIndex }))} 
                            filename={`monthly_report_${month}_${year}.csv`} 
                            className={styles.downloadButton}
                        >
                            Download
                        </CSVLink>
                    </Button> 
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
                <p>Loading...</p>
            )}
            <ToastContainer />
        </div>
    );
};

export default MonthlyReport;
