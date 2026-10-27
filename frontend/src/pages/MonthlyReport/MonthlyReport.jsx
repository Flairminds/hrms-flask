import React, { useEffect, useMemo, useState } from "react";
import { Table, Select, Space, Button, Tabs, Modal, Upload, message, Card, Tag, DatePicker, Spin, Empty } from "antd";
import moment from "moment";
import dayjs from "dayjs";
import { getReports, getReportDetails, generateReport, deleteReport, uploadDoorEntryReport, getDoorEntryMappingStats, saveDoorEntryMapping, deleteDoorEntryMapping, generateAttendanceReport } from "../../services/api";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList, Legend, Cell } from "recharts";
import { ReloadOutlined, BarChartOutlined, EyeOutlined, DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons';
import styles from "./MonthlyReport.module.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { convertDate, getWeekDay } from "../../util/helperFunctions";
import { LEAVE_STATUS } from "../../util/helper";

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

// Statuses that mean the employee is actually away
const ON_LEAVE_STATUSES = [LEAVE_STATUS.APPROVED, LEAVE_STATUS.PARTIAL_APPROVED];

// Chart categories, in stack order (bottom to top)
const LEAVE_CATEGORIES = [
    { key: 'wfh', label: 'WFH', color: '#1677ff' },
    { key: 'privilege', label: 'Privilege Leave', color: '#52c41a' },
    { key: 'sick', label: 'Sick/Emergency Leave', color: '#f5222d' },
    { key: 'others', label: 'Others', color: '#faad14' },
];

const getLeaveCategory = (leaveType) => {
    switch (leaveType) {
        case 'Work From Home':
        case 'Customer Approved Work From Home':
            return 'wfh';
        case 'Privilege Leave':
            return 'privilege';
        case 'Sick/Emergency Leave':
            return 'sick';
        default:
            return 'others';
    }
};

// Builds [{ week, wfh, privilege, sick, others, total, names: { category: [names] } }] (weeks run
// Monday-Sunday, clipped to the selected range) from the rows of one or more monthly leave reports.
// Each category counts leave days (half day = 0.5); names maps to "Name (days)".
const buildWeeklyLeaveData = (rows, start, end) => {
    const seen = new Set();
    const weeks = new Map();
    rows.forEach((r) => {
        if (!ON_LEAVE_STATUSES.includes(r['Leave Status'])) return;
        const day = moment(r.Date, 'DD-MM-YYYY');
        if (!day.isValid() || day.isBefore(start, 'day') || day.isAfter(end, 'day')) return;
        const key = `${r['Employee ID']}|${r.Date}`;
        if (seen.has(key)) return;
        seen.add(key);
        const wk = day.clone().startOf('isoWeek').format('YYYY-MM-DD');
        if (!weeks.has(wk)) weeks.set(wk, {});
        const cat = getLeaveCategory(r['Type of Leave Approved']);
        const w = weeks.get(wk);
        if (!w[cat]) w[cat] = new Map();
        const name = r['Employee Name'];
        w[cat].set(name, (w[cat].get(name) || 0) + (r['Working Day'] === 0.5 ? 0.5 : 1));
    });

    // Include weeks with no leave so the x-axis is continuous
    const result = [];
    for (let w = start.clone().startOf('isoWeek'); !w.isAfter(end, 'day'); w.add(1, 'week')) {
        const entry = weeks.get(w.format('YYYY-MM-DD')) || {};
        const from = moment.max(w, start);
        const to = moment.min(w.clone().endOf('isoWeek'), end);
        const row = { week: `${from.format('DD MMM')} - ${to.format('DD MMM')}`, weekStart: from.format('YYYY-MM-DD'), weekEnd: to.format('YYYY-MM-DD'), total: 0, names: {} };
        LEAVE_CATEGORIES.forEach(({ key }) => {
            row[key] = entry[key] ? [...entry[key].values()].reduce((a, b) => a + b, 0) : 0;
            row.names[key] = entry[key] ? [...entry[key]].sort((a, b) => a[0].localeCompare(b[0])).map(([n, d]) => `${n} (${d})`) : [];
            row.total += row[key];
        });
        result.push(row);
    }
    return result;
};

// Builds the per-employee leave list for the side panel: one entry per employee and leave type,
// with consecutive days merged into a date range. Sorted by first leave date, then name.
const buildLeaveEntries = (rows, start, end) => {
    const seen = new Set();
    const groups = new Map();
    rows.forEach((r) => {
        if (!ON_LEAVE_STATUSES.includes(r['Leave Status'])) return;
        const day = moment(r.Date, 'DD-MM-YYYY');
        if (!day.isValid() || day.isBefore(start, 'day') || day.isAfter(end, 'day')) return;
        const key = `${r['Employee ID']}|${r.Date}`;
        if (seen.has(key)) return;
        seen.add(key);
        const type = r['Type of Leave Approved'];
        const gk = `${r['Employee ID']}|${type}`;
        if (!groups.has(gk)) groups.set(gk, { id: r['Employee ID'], name: r['Employee Name'], type, category: getLeaveCategory(type), days: [] });
        groups.get(gk).days.push({ day, value: r['Working Day'] === 0.5 ? 0.5 : 1 });
    });

    const entries = [];
    groups.forEach((g) => {
        g.days.sort((a, b) => a.day.valueOf() - b.day.valueOf());
        let run = null;
        g.days.forEach(({ day, value }) => {
            if (run && day.diff(run.to, 'days') === 1) {
                run.to = day;
                run.total += value;
            } else {
                run = { id: g.id, name: g.name, type: g.type, category: g.category, from: day, to: day, total: value };
                entries.push(run);
            }
        });
    });
    return entries.sort((a, b) => a.from.valueOf() - b.from.valueOf() || a.name.localeCompare(b.name));
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

    // Weekly chart modal
    const [chartOpen, setChartOpen] = useState(false);
    const [chartRange, setChartRange] = useState(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartRows, setChartRows] = useState([]);
    const [chartEmployees, setChartEmployees] = useState([]); // selected Employee IDs; empty = everyone
    const [chartReports, setChartReports] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState(null); // { start, end } as YYYY-MM-DD; null = whole range

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

    const chartEmployeeOptions = useMemo(() => {
        const names = new Map();
        chartRows.forEach((r) => names.set(r['Employee ID'], r['Employee Name']));
        return [...names].map(([id, name]) => ({ value: id, label: `${name} (${id})` }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [chartRows]);

    const filteredChartRows = useMemo(
        () => (chartEmployees.length ? chartRows.filter((r) => chartEmployees.includes(r['Employee ID'])) : chartRows),
        [chartRows, chartEmployees]
    );

    const chartData = useMemo(() => {
        if (!chartReports.length || !chartRange || !chartRange[0] || !chartRange[1]) return [];
        return buildWeeklyLeaveData(filteredChartRows, moment(chartRange[0].toDate()).startOf('day'), moment(chartRange[1].toDate()).startOf('day'));
    }, [filteredChartRows, chartRange, chartReports]);

    // Leave list for the side panel: the clicked week, or the whole selected range
    const leaveEntries = useMemo(() => {
        if (!chartReports.length || !chartRange || !chartRange[0] || !chartRange[1]) return [];
        const start = selectedWeek ? moment(selectedWeek.start) : moment(chartRange[0].toDate()).startOf('day');
        const end = selectedWeek ? moment(selectedWeek.end) : moment(chartRange[1].toDate()).startOf('day');
        return buildLeaveEntries(filteredChartRows, start, end);
    }, [filteredChartRows, chartRange, chartReports, selectedWeek]);

    // Opens the modal defaulting to the current month
    const openChart = () => {
        setChartOpen(true);
        handleChartRangeChange([dayjs().startOf('month'), dayjs().endOf('month')]);
    };

    // For each month in the range, use the most recently generated monthly report, then chart by week
    const handleChartRangeChange = async (dates) => {
        setChartRange(dates);
        setChartRows([]);
        setChartReports([]);
        setSelectedWeek(null);
        if (!dates || !dates[0] || !dates[1]) return;

        const start = moment(dates[0].toDate()).startOf('day');
        const end = moment(dates[1].toDate()).startOf('day');

        // reports are already sorted newest first by the API
        const latestByMonth = new Map();
        reports.forEach((r) => {
            if (r.report_frequency !== 'Monthly') return;
            const m = moment(r.report_for, 'MMMM YYYY');
            if (m.isValid() && !latestByMonth.has(m.format('YYYY-MM'))) latestByMonth.set(m.format('YYYY-MM'), r);
        });

        const needed = [];
        const missing = [];
        for (let m = start.clone().startOf('month'); !m.isAfter(end, 'day'); m.add(1, 'month')) {
            const rep = latestByMonth.get(m.format('YYYY-MM'));
            if (rep) needed.push(rep);
            else missing.push(m.format('MMMM YYYY'));
        }
        if (missing.length) toast.warn(`No monthly report generated for: ${missing.join(', ')}`);
        if (!needed.length) return;

        setChartLoading(true);
        try {
            const responses = await Promise.all(needed.map((r) => getReportDetails(r.id)));
            const rows = responses.flatMap((res) => (res.success && Array.isArray(res.data.data) ? res.data.data : []));
            setChartReports(needed);
            setChartRows(rows);
            setChartEmployees((prev) => prev.filter((id) => rows.some((r) => r['Employee ID'] === id)));
        } catch (error) {
            toast.error("Failed to load report data for chart");
        } finally {
            setChartLoading(false);
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
                title: 'Employee ID', dataIndex: 'Employee ID', key: 'Employee ID',
                filters: [...new Set(data.map(a => a['Employee ID']))].filter(Boolean).map(name => ({ text: name, value: name })),
                onFilter: (value, record) => record['Employee ID'] === value,
            },
            { title: 'Employee Name', dataIndex: 'Employee Name', key: 'Employee Name', filters: [...new Set(data.map(a => a['Employee Name']))].filter(Boolean).map(name => ({ text: name, value: name })), onFilter: (value, record) => record['Employee Name'] === value, },
            { title: 'Leave Approver', dataIndex: 'Leave Approver', key: 'Leave Approver' },
            {
                title: 'Date', dataIndex: 'Date', key: 'Date',
                filters: [...new Set(data.map(a => a.Date))].filter(Boolean).map(name => ({ text: name, value: name })),
                onFilter: (value, record) => record.Date === value,
            },
            // { title: 'Entry Exempt', dataIndex: 'Entry Exempt', key: 'Entry Exempt' },
            // { title: 'Days Logs', dataIndex: 'Days Logs', key: 'Days Logs' },
            // { title: 'Zymmr Logged Time', dataIndex: 'Zymmr Logged Time', key: 'Zymmr Logged Time' },
            { title: 'Type of Leave', dataIndex: 'Type of Leave Approved', key: 'Type of Leave Approved' },
            // { title: 'Entry in Time', dataIndex: 'Entry in Time', key: 'Entry in Time' },
            { title: 'Date of Application', dataIndex: 'Date of Leave Application', key: 'Date of Leave Application' },
            { title: 'Leave Status', dataIndex: 'Leave Status', key: 'Leave Status' },
            // { title: 'Working Day', dataIndex: 'Working Day', key: 'Working Day' },
            { title: 'Approval Date', dataIndex: 'Approval Date', key: 'Approval Date' },
            // { title: 'Approved on same date', dataIndex: 'Approved on same date', key: 'Approved on same date' },
            // { title: 'Status', dataIndex: 'Status', key: 'Status' },
            // { title: 'Swapped holiday date', dataIndex: 'Swapped holiday date', key: 'Swapped holiday date' },
            { title: 'Unpaid Status', dataIndex: 'Unpaid Status', key: 'Unpaid Status', filters: [...new Set(data.map(a => a['Unpaid Status']))].filter(Boolean).map(name => ({ text: name, value: name })), onFilter: (value, record) => record['Unpaid Status'] === value, defaultFilteredValue: ['Paid'], render: (text) => <span>{text}</span> }
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
            render: (text) => convertDate(text, true)
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
            <div style={{ marginTop: '10px', background: 'white', padding: '15px', borderRadius: '8px' }}>
                <div style={{ marginBottom: '20px' }}>
                    {/* <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>Generate New Report:</span>
                    </div> */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                        <Button icon={<BarChartOutlined />} onClick={openChart}>Weekly Leave Chart</Button>
                    </div>
                </div>

                {/* <h3>Monthly Leave Reports History</h3> */}
                <div style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', border: '1px solid #e8e8e8', borderRadius: '8px' }}>
                    <Table
                        columns={listColumns}
                        dataSource={reports}
                        rowKey="id"
                        loading={listLoading}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 'max-content' }}
                    />
                </div>

                <Modal
                    title="Leave Days - Weekly"
                    open={chartOpen}
                    onCancel={() => setChartOpen(false)}
                    footer={null}
                    width={1250}
                    style={{top: '10px'}}
                >
                    <DatePicker.RangePicker
                        format="DD MMM YYYY"
                        value={chartRange}
                        onChange={handleChartRangeChange}
                        style={{ marginBottom: 16, marginRight: 12 }}
                    />
                    <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="All employees"
                        value={chartEmployees}
                        onChange={setChartEmployees}
                        options={chartEmployeeOptions}
                        maxTagCount="responsive"
                        style={{ minWidth: 280, marginBottom: 16 }}
                    />
                    {chartReports.length > 0 && (
                        <div style={{ color: '#555', marginBottom: 12 }}>
                            Based on: {chartReports.map((r) => `${r.report_for} (generated ${convertDate(r.generated_at, true)})`).join('; ')}
                        </div>
                    )}
                    <Spin spinning={chartLoading}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ flex: '3 1 560px', minWidth: 0 }}>
                        {chartData.length === 0 ? (
                            <Empty description={chartRange ? "No data for the selected range" : "Select a date range"} />
                        ) : (
                            <ResponsiveContainer width="100%" height={400}>
                                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="week" />
                                    <YAxis allowDecimals label={{ value: 'Leave days', angle: -90, position: 'insideLeft' }} />
                                    <RechartsTooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload || !payload.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div style={{ background: '#fff', border: '1px solid #ddd', padding: 10, maxWidth: 300 }}>
                                                    <strong>{d.week}</strong>
                                                    {LEAVE_CATEGORIES.filter((c) => d[c.key] > 0).map((c) => (
                                                        <div key={c.key} style={{ marginTop: 4, fontSize: 12 }}>
                                                            <span style={{ color: c.color, fontWeight: 600 }}>{c.label} ({d[c.key]}):</span> {d.names[c.key].join(', ')}
                                                        </div>
                                                    ))}
                                                    {d.total === 0 && <div style={{ fontSize: 12 }}>No one on leave</div>}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Legend />
                                    {LEAVE_CATEGORIES.map((c) => (
                                        <Bar
                                            key={c.key}
                                            dataKey={c.key}
                                            stackId="leave"
                                            fill={c.color}
                                            name={c.label}
                                            cursor="pointer"
                                            onClick={(bar) => {
                                                const d = bar.payload || bar;
                                                setSelectedWeek((prev) => (prev && prev.start === d.weekStart ? null : { start: d.weekStart, end: d.weekEnd, label: d.week }));
                                            }}
                                        >
                                            {chartData.map((d) => (
                                                <Cell key={d.weekStart} fillOpacity={!selectedWeek || selectedWeek.start === d.weekStart ? 1 : 0.35} />
                                            ))}
                                            <LabelList dataKey={c.key} position="center" fill="#fff" formatter={(v) => (v > 0 ? v : '')} />
                                        </Bar>
                                    ))}
                                    {/* Invisible series sitting at each stack's top, only used to carry the total label */}
                                    <Line dataKey="total" stroke="none" dot={false} activeDot={false} legendType="none" isAnimationActive={false}>
                                        <LabelList dataKey="total" position="top" style={{ fontWeight: 700 }} />
                                    </Line>
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div style={{ flex: '2 1 340px', minWidth: 0, border: '1px solid #e8e8e8', borderRadius: 8, padding: 12 }}>
                        {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <strong>
                                {selectedWeek
                                    ? `Leaves: ${selectedWeek.label}`
                                    : chartRange && chartRange[0] && chartRange[1]
                                        ? `Leaves: ${chartRange[0].format('DD MMM')} - ${chartRange[1].format('DD MMM YYYY')}`
                                        : 'Leaves'}
                            </strong>
                            {selectedWeek && <Button size="small" onClick={() => setSelectedWeek(null)}>Show full range</Button>}
                        </div> */}
                        {/* {!selectedWeek && chartData.length > 0 && (
                            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Click a bar to see only that week</div>
                        )} */}
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            {leaveEntries.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No leaves" />
                            ) : leaveEntries.map((e) => {
                                const cat = LEAVE_CATEGORIES.find((c) => c.key === e.category);
                                const sameDay = e.from.isSame(e.to, 'day');
                                return (
                                    <div key={`${e.id}-${e.type}-${e.from.valueOf()}`} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', borderLeft: `3px solid ${cat.color}`, paddingLeft: 8 }}>
                                        <div style={{ fontWeight: 600 }}>{e.name}</div>
                                        <div style={{ fontSize: 12, color: '#555' }}>
                                            {sameDay ? e.from.format('ddd, DD MMM YYYY') : `${e.from.format('ddd, DD MMM')} - ${e.to.format('ddd, DD MMM YYYY')}`}
                                            {` (${e.total} ${e.total === 1 ? 'day' : 'days'})`}
                                            <span style={{ fontSize: 12, color: cat.color }}> | {e.type}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    </div>
                    </Spin>
                </Modal>
            </div>
        );
    }

    // Detail View
    return (
        <div>
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setViewMode('list')}>← Back to List</Button>
            </div>
            <Table
                dataSource={detailData}
                columns={leaveReportTableColumns}
                rowKey={(record, index) => `${record.Employee_Id}-${index}`}
                scroll={{ x: 'max-content' }}
                className={styles.empTable}
                pagination={{ pageSize: 10, showSizeChanger: false }}
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
        <Card title="Door Entry Name Mappings" style={{ margin: '2rem 0', borderRadius: '8px' }} extra={<Button onClick={fetchStats} icon={<ReloadOutlined />}>Refresh</Button>}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <Card.Grid style={{ width: '33%', textAlign: 'center' }}>
                    <h3>{stats.total_active}</h3>
                    <div>Total Active Employees</div>
                </Card.Grid>
                <Card.Grid style={{ width: '33%', textAlign: 'center' }}>
                    <h3>{stats.mapped_count}</h3>
                    <div>Mapped Employees</div>
                </Card.Grid>
                <Card.Grid style={{ width: '33%', textAlign: 'center' }}>
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
                    children: <Table dataSource={unmappedEmployees} columns={unmappedColumns} rowKey="employee_id" pagination={{ pageSize: 5 }} size="small" scroll={{ x: 'max-content' }} />
                },
                {
                    key: '2',
                    label: `Mapped Employees (${mappedEmployees.length})`,
                    children: (
                        <div>
                            {/* <Button type="primary" onClick={handleManualAdd} style={{marginBottom: 10}}>Add New Mapping</Button> */}
                            <Table dataSource={mappedEmployees} columns={mappedColumns} rowKey="employee_id" pagination={{ pageSize: 5 }} size="small" scroll={{ x: 'max-content' }} />
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
    const [summaryVisible, setSummaryVisible] = useState(false);

    // Month/Year for Upload
    const [genInMonth, setGenInMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [genInYear, setGenInYear] = useState(new Date().getFullYear());

    // Present statuses matching backend logic
    const PRESENT_STATUSES = new Set(['P', 'HP', 'OP', 'WP']);

    const getDoorEntrySummary = () => {
        const empMap = {};
        detailData.forEach(row => {
            const id = row.employee_id || '';
            if (!id) return;
            if (!empMap[id]) {
                empMap[id] = { employee_id: id, employee_name: row.employee_name || '', total: 0, present: 0, absent: 0, other: 0 };
            }
            const s = empMap[id];
            const status = String(row.status || '').trim().toUpperCase();
            s.total++;
            if (PRESENT_STATUSES.has(status))  s.present++;
            else if (status === 'A')            s.absent++;
            else if (status !== '')             s.other++;
        });
        return Object.values(empMap).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
    };

    const summaryColumns = [
        { title: 'Employee Code', dataIndex: 'employee_id',   key: 'employee_id',   width: 130, fixed: 'left' },
        { title: 'Employee Name', dataIndex: 'employee_name', key: 'employee_name', width: 160 },
        { title: 'Total Days',    dataIndex: 'total',         key: 'total',         width: 100, align: 'center' },
        {
            title: 'Present', dataIndex: 'present', key: 'present', width: 90, align: 'center',
            // render: v => <Tag color="green">{v}</Tag>
        },
        {
            title: 'Absent', dataIndex: 'absent', key: 'absent', width: 90, align: 'center',
            render: v => <Tag color={v > 0 ? 'red' : 'default'}>{v}</Tag>
        },
        {
            title: 'Other', dataIndex: 'other', key: 'other', width: 130, align: 'center',
            render: v => <Tag color="orange">{v}</Tag>
        },
    ];

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

                // Status badge renderer
                const statusColors = {
                    P: 'green', A: 'red', L: 'blue', H: 'purple',
                    HP: 'cyan', WO: 'orange', OP: 'geekblue', WP: 'gold', '': 'default'
                };
                const renderStatus = (val) => {
                    const s = String(val ?? '').trim().toUpperCase();
                    return <Tag color={statusColors[s] || 'default'}>{s || '-'}</Tag>;
                };

                const cols = [
                    {
                        title: 'Employee Code', dataIndex: 'employee_id', key: 'employee_id',
                        fixed: 'left', width: 130,
                        filters: [...new Set(data.map(r => r.employee_id))].filter(Boolean).map(v => ({ text: v, value: v })),
                        onFilter: (value, record) => record.employee_id === value,
                        filterSearch: true,
                    },
                    {
                        title: 'Employee Name', dataIndex: 'employee_name', key: 'employee_name',
                        width: 160,
                        filters: [...new Set(data.map(r => r.employee_name))].filter(Boolean).map(v => ({ text: v, value: v })),
                        onFilter: (value, record) => record.employee_name === value,
                        filterSearch: true,
                    },
                    {
                        title: 'Date', dataIndex: 'date', key: 'date', width: 110,
                        filters: [...new Set(data.map(r => r.date))].filter(Boolean).map(v => ({ text: v, value: v })),
                        onFilter: (value, record) => record.date === value,
                        filterSearch: true
                    },
                    {
                        title: 'Status', dataIndex: 'status', key: 'status', width: 90, align: 'center',
                        filters: [...new Set(data.map(r => r.status))].filter(v => v !== '' && v !== null && v !== undefined).map(v => ({ text: v, value: v })),
                        onFilter: (value, record) => record.status === value,
                        render: renderStatus,
                    },
                ];

                setDetailColumns(cols);
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
            render: (text) => convertDate(text, true)
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
            <div style={{ marginTop: '10px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                    <p style={{ color: '#7c3aed', marginTop: 8 }}
                    >Format: <strong>Monthly Basic Attendance Report</strong> — Employee Code must match the system ID (e.g. EMP3). Status codes: P = Present, A = Absent, L = Leave, WO = Week Off, H = Holiday.</p>
                    <div style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', border: '1px solid #e8e8e8', borderRadius: '8px' }}>
                        <Table
                            columns={listColumns}
                            dataSource={reports}
                            rowKey="id"
                            loading={listLoading}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Detail View
    return (
        <div>
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button onClick={() => setViewMode('list')}>← Back to List</Button>
                <Button
                    type="default"
                    onClick={() => setSummaryVisible(true)}
                    disabled={detailData.length === 0}
                >
                    View Summary
                </Button>
            </div>

            {/* Day-by-day detail */}
            <Table
                dataSource={detailData}
                columns={detailColumns}
                rowKey={(record, index) => index}
                scroll={{ x: 'max-content' }}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                className={styles.empTable}
                loading={detailLoading}
            />

            {/* Summary Modal */}
            <Modal
                title="Attendance Summary"
                open={summaryVisible}
                onCancel={() => setSummaryVisible(false)}
                footer={<></>}
                width={1000}
                style={{ top: 10 }}
            >
                <p>Total Employees: {getDoorEntrySummary().length}</p>
                <Table
                    dataSource={getDoorEntrySummary()}
                    columns={summaryColumns}
                    rowKey="employee_id"
                    size="small"
                    pagination={{ pageSize: 15, showSizeChanger: false }}
                    scroll={{ x: 'max-content' }}
                />
            </Modal>
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

    // Month/Year for report generation
    const [genInMonth, setGenInMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [genInYear, setGenInYear] = useState(new Date().getFullYear());

    const [loading, setLoading] = useState(false);
    const [detailData, setDetailData] = useState([]);
    const [detailColumns, setDetailColumns] = useState([]);
    const [summaryVisible, setSummaryVisible] = useState(false);

    // Compute per-employee summary from detailData
    const getSummaryData = () => {
        const empMap = {};
        detailData.forEach(row => {
            const name = row['Employee Name'] || 'Unknown';
            const empId = row['Employee ID'] || 'Unknown';
            if (!empMap[empId]) {
                empMap[empId] = {
                    key: name,
                    employeeId: empId,
                    employeeName: name,
                    totalDays: 0,
                    workingDays: 0,
                    weekends: 0,
                    holidays: 0,
                    workedDays: 0,
                    paidLeaves: 0,
                    unapprovedLeaves: 0,
                    unpaidLeaves: 0,
                };
            }
            const s = empMap[empId];
            const remark = (row['Remark'] || '').trim();
            const unpaid = (row['Unpaid Status'] || '').trim();
            s.totalDays++;
            if (remark === 'Weekend') {
                s.weekends++;
            } else if (remark === 'Holiday') {
                s.holidays++;
            } else {
                // It's a working day
                s.workingDays++;
                if (remark === 'Door Entry') {
                    s.workedDays++;
                } else if (remark === 'Approved Leave') {
                    s.paidLeaves++;
                } else if (unpaid === 'Unpaid') {
                    s.unpaidLeaves++;
                    if ([LEAVE_STATUS.PENDING, LEAVE_STATUS.PARTIAL_APPROVED].includes(row['Leave Status'])) {
                        s.unapprovedLeaves++;
                    }
                }
            }
        });
        return Object.values(empMap).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    };

    const summaryColumns = [
        { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId', fixed: 'left', width: 100 },
        { title: 'Employee Name', dataIndex: 'employeeName', key: 'employeeName', fixed: 'left', width: 160 },
        { title: 'Total Days', dataIndex: 'totalDays', key: 'totalDays', align: 'center' },
        { title: 'Working Days', dataIndex: 'workingDays', key: 'workingDays', align: 'center' },
        { title: 'Weekends', dataIndex: 'weekends', key: 'weekends', align: 'center' },
        { title: 'Holidays', dataIndex: 'holidays', key: 'holidays', align: 'center' },
        {
            title: 'Worked Days', dataIndex: 'workedDays', key: 'workedDays', align: 'center',
            render: v => <Tag color="green">{v}</Tag>
        },
        {
            title: 'Paid Leaves', dataIndex: 'paidLeaves', key: 'paidLeaves', align: 'center',
            render: v => <Tag color="blue">{v}</Tag>
        },
        {
            title: 'Unapproved Leaves', dataIndex: 'unapprovedLeaves', key: 'unapprovedLeaves', align: 'center',
            render: v => v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="default">{v}</Tag>
        },
        {
            title: 'Unpaid Leaves', dataIndex: 'unpaidLeaves', key: 'unpaidLeaves', align: 'center',
            render: v => v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="default">{v}</Tag>
        },
    ];


    // Ordered exactly as they should appear in the table (keys must match raw data field names)
    const columnOrder = [
        'Employee ID',
        'Employee Name',
        'Leave Approver',
        'Date',
        // 'Working Day',
        // 'Status',
        // 'Entry Exempt',
        'Unpaid Status',
        'Remark',
        'Door Entry',
        // 'AM In',
        // 'AM Out',
        // 'PM In',
        // 'PM Out',
        'Type of Leave Approved',
        'Leave Status',
        'Date of Leave Application',
        'Approval Date',
        // 'Approved on same date',
        // 'Swapped holiday date',
        // 'Days Logs',
        // 'Zymmr Logged Time',
    ];

    // Display names map — keys are the raw data field names
    const columnDisplayNames = {
        'Employee ID': 'Employee ID',
        'Employee Name': 'Employee Name',
        'Leave Approver': 'Leave Approver',
        'Date': 'Date',
        'Working Day': 'Working Day',
        'Status': 'Status',
        'Entry Exempt': 'Entry Exempt',
        'Door Entry': 'Door Entry',
        'AM In': 'AM In',
        'AM Out': 'AM Out',
        'PM In': 'PM In',
        'PM Out': 'PM Out',
        'Type of Leave Approved': 'Type of Leave',
        'Leave Status': 'Leave Status',
        'Date of Leave Application': 'Date of Leave Application',
        'Approval Date': 'Approval Date',
        'Approved on same date': 'Approved on Same Date',
        'Swapped holiday date': 'Swapped Holiday Date',
        'Unpaid Status': 'Unpaid Status',
        'Remark': 'Remark',
        'Days Logs': 'Days Logs',
        'Zymmr Logged Time': 'Zymmr Logged Time',
    };

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

        const monthIndex = months.indexOf(genInMonth) + 1;
        setLoading(true);
        try {
            const res = await generateAttendanceReport(selectedLeaveReport, selectedDoorReport, monthIndex, genInYear);
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

                // Dynamic columns with proper order and display names
                if (data.length > 0) {
                    const keys = Object.keys(data[0]);

                    // Sort keys based on columnOrder
                    const sortedKeys = [...keys].sort((a, b) => {
                        const indexA = columnOrder.indexOf(a);
                        const indexB = columnOrder.indexOf(b);

                        // If both are in columnOrder, sort by their position
                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        // If only a is in columnOrder, it comes first
                        if (indexA !== -1) return -1;
                        // If only b is in columnOrder, it comes first
                        if (indexB !== -1) return 1;
                        // If neither is in columnOrder, maintain original order
                        return 0;
                    });

                    const toDisplayKeys = sortedKeys.filter(key => columnOrder.includes(key));

                    // Keys that should have dropdown filters
                    const filterableKeys = new Set(['Employee ID', 'Employee Name', 'Date', 'Unpaid Status', 'Remark', 'Door Entry']);

                    const cols = toDisplayKeys.map(key => {
                        const col = {
                            title: columnDisplayNames[key] || key,
                            dataIndex: key,
                            key: key,
                            render: (text) => {
                                if (key === 'Door Entry') {
                                    if (text === 'Yes') return <Tag color="green">Yes</Tag>;
                                    if (text === 'No')  return <Tag color="red">No</Tag>;
                                    return <span style={{ color: '#bbb' }}>—</span>;
                                }
                                // if (key === 'Date') return convertDate(text);
                                if (typeof text === 'object' && text !== null) return JSON.stringify(text);
                                return text ?? '';
                            }
                        };

                        if (filterableKeys.has(key)) {
                            const uniqueVals = [...new Set(data.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== ''))];
                            col.filters = uniqueVals.map(v => ({ text: String(v), value: String(v) }));
                            col.onFilter = (value, record) => String(record[key] ?? '') === value;
                            col.filterSearch = uniqueVals.length > 8;  // show search box if many options
                        }

                        return col;
                    });
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


    const downloadAttendanceReport = async (record) => {
        setLoading(true);
        try {
            const response = await getReportDetails(record.id);
            if (response.success) {
                if (response.data.download_url) {
                    window.open(response.data.download_url, '_blank');
                } else if (Array.isArray(response.data.data) && response.data.data.length > 0) {
                    // Generate CSV client-side
                    const data = response.data.data;
                    const keys = Object.keys(data[0]);

                    // Sort keys based on columnOrder for CSV
                    const sortedKeys = [...keys].sort((a, b) => {
                        const indexA = columnOrder.indexOf(a);
                        const indexB = columnOrder.indexOf(b);
                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        if (indexA !== -1) return -1;
                        if (indexB !== -1) return 1;
                        return 0;
                    });

                    // Use display names for CSV headers
                    const csvHeaders = sortedKeys.map(key => columnDisplayNames[key] || key);

                    const csvContent = [
                        csvHeaders.join(','), // Header row with display names
                        ...data.map(row => sortedKeys.map(key => {
                            const val = row[key] !== null && row[key] !== undefined ? row[key] : '';
                            return `"${String(val).replace(/"/g, '""')}"`; // Escape quotes
                        }).join(','))
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `attendance_report_${record.report_for.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    toast.success("Report downloaded successfully");
                } else {
                    toast.error("No data available to download");
                }
            } else {
                toast.error("Failed to fetch report details for download");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error downloading report");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Report Type', dataIndex: 'report_type', key: 'report_type' },
        { title: 'Report For', dataIndex: 'report_for', key: 'report_for' },
        { title: 'Generated At', dataIndex: 'generated_at', key: 'generated_at', render: (text) => convertDate(text, true) },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => handleViewReport(record.id)}>View</Button>
                    <Button icon={<DownloadOutlined />} onClick={() => downloadAttendanceReport(record)}>Download</Button>
                    <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, [fetchLists])}>Delete</Button>
                </Space>
            )
        }
    ];

    if (viewMode === 'list') {
        return (
            <div style={{ marginTop: '10px' }}>
                <Card title="Generate Attendance Report" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'end', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label>Report Month:</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Select value={genInMonth} onChange={setGenInMonth} style={{ width: 130 }}>
                                    {months.map((m, index) => (
                                        <Select.Option key={index} value={m}>{m}</Select.Option>
                                    ))}
                                </Select>
                                <Select value={genInYear} onChange={setGenInYear} style={{ width: 90 }}>
                                    {years.map((y, index) => (
                                        <Select.Option key={index} value={y}>{y}</Select.Option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label>Select Monthly Leave Report:</label>
                            <Select
                                style={{ width: 300 }}
                                placeholder="Select Leave Report"
                                value={selectedLeaveReport}
                                onChange={setSelectedLeaveReport}
                            >
                                {leaveReports.filter(r => r.report_frequency === 'Monthly').map(r => (
                                    <Select.Option key={r.id} value={r.id}>
                                        {r.report_for} ({convertDate(r.generated_at, true)})
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
                                        {r.report_for} ({convertDate(r.generated_at, true)})
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

                <div style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', border: '1px solid #e8e8e8', borderRadius: '8px' }}>
                    <Table
                        columns={columns}
                        dataSource={attendanceReports}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button onClick={() => setViewMode('list')}>← Back to List</Button>
                <Button
                    type="default"
                    onClick={() => setSummaryVisible(true)}
                    disabled={detailData.length === 0}
                >
                    View Summary
                </Button>
            </div>
            <Table
                dataSource={detailData}
                columns={detailColumns}
                rowKey={(record, index) => index}
                scroll={{ x: 'max-content' }}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: false }}
            />

            {/* Per-employee Summary Modal */}
            <Modal
                title="Attendance Summary"
                open={summaryVisible}
                onCancel={() => setSummaryVisible(false)}
                footer={<></>}
                width={1000}
                style={{ top: 10 }}
            >
                <p>Total Employees: {getSummaryData().length}</p>
                <Table
                    dataSource={getSummaryData()}
                    columns={summaryColumns}
                    rowKey="employeeName"
                    pagination={{ pageSize: 15 }}
                    scroll={{ x: 'max-content' }}
                    size="small"
                // summary={(data) => {
                //     const totals = data.reduce((acc, row) => ({
                //         totalDays: acc.totalDays + row.totalDays,
                //         workingDays: acc.workingDays + row.workingDays,
                //         weekends: acc.weekends + row.weekends,
                //         holidays: acc.holidays + row.holidays,
                //         workedDays: acc.workedDays + row.workedDays,
                //         paidLeaves: acc.paidLeaves + row.paidLeaves,
                //         unpaidLeaves: acc.unpaidLeaves + row.unpaidLeaves,
                //     }), { totalDays: 0, workingDays: 0, weekends: 0, holidays: 0, workedDays: 0, paidLeaves: 0, unpaidLeaves: 0 });
                //     return (
                //         <Table.Summary.Row style={{ fontWeight: 700, background: '#fafafa' }}>
                //             <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                //             <Table.Summary.Cell index={1} align="center">{totals.totalDays}</Table.Summary.Cell>
                //             <Table.Summary.Cell index={2} align="center">{totals.workingDays}</Table.Summary.Cell>
                //             <Table.Summary.Cell index={3} align="center">{totals.weekends}</Table.Summary.Cell>
                //             <Table.Summary.Cell index={4} align="center">{totals.holidays}</Table.Summary.Cell>
                //             <Table.Summary.Cell index={5} align="center">{totals.workedDays}</Table.Summary.Cell>
                //             <Table.Summary.Cell index={6} align="center">{totals.paidLeaves}</Table.Summary.Cell>
                //             <Table.Summary.Cell index={7} align="center">{totals.unpaidLeaves}</Table.Summary.Cell>
                //         </Table.Summary.Row>
                //     );
                // }}
                />
            </Modal>
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
