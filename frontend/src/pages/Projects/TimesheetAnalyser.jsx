import React, { useState, useCallback, useMemo } from 'react';
import { Button, Upload, message, Table, Space, Row, Col, Card, Alert, Badge, Tag, Segmented, Divider, Select, DatePicker, Spin, Modal, Popover, Switch, Empty } from 'antd';
import { UploadOutlined, BarChartOutlined, TableOutlined, DownloadOutlined, WarningOutlined, LineChartOutlined, PieChartOutlined, CheckCircleOutlined, ClockCircleOutlined, ArrowLeftOutlined, InfoCircleOutlined, UserOutlined, ProjectOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import * as XLSXStyle from 'xlsx-js-style';
import dayjs from 'dayjs';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import Cookies from 'js-cookie';
import { useAuth } from '../../context/AuthContext.jsx';
import {
    getProjects, getLeaveTransactionsByApprover, holidayListData, getEmployeeAllocations, getEffortTasks,
    saveTimelogReport, getTimelogEntries, getTimelogReports,
} from '../../services/api';

const { RangePicker } = DatePicker;

// Quick-jump presets for the date-range picker (filters by each entry's own
// log Date, server-side). Computed relative to "today" so they work
// regardless of how much history has been uploaded.
const getDateRangePresets = () => {
    const today = dayjs();
    return [
        { label: 'This Month', value: [today.startOf('month'), today.endOf('month')] },
        { label: 'Last Month', value: [today.subtract(1, 'month').startOf('month'), today.subtract(1, 'month').endOf('month')] },
        { label: 'Last 3 Months', value: [today.subtract(2, 'month').startOf('month'), today.endOf('month')] },
        { label: 'This Year', value: [today.startOf('year'), today.endOf('year')] },
        { label: 'All Time', value: [dayjs('2000-01-01'), today.endOf('month')] },
    ];
};

// Task states counted as "done" in the persisted Effort Analyser backlog — a
// task in any other state is still "planned" and feeds the projection below.
const DONE_STATES = ['done', 'completed', 'complete', 'closed', 'resolved', 'canceled'];
const isTaskDone = (state) => DONE_STATES.includes(String(state || '').toLowerCase().trim());

// Matches an employee name across the two features' differing conventions —
// exact (case-insensitive) or "Last, First" reordering, either direction.
const employeeNamesMatch = (a, b) => {
    if (!a || !b) return false;
    const x = String(a).toLowerCase().trim();
    const y = String(b).toLowerCase().trim();
    if (x === y) return true;
    const reorder = (s) => {
        if (!s.includes(',')) return null;
        const parts = s.split(',').map(p => p.trim());
        return parts.length === 2 ? `${parts[1]} ${parts[0]}` : null;
    };
    return reorder(x) === y || reorder(y) === x;
};

// Builds an excel/external-name -> HRMS-project-name lookup from each project's
// "Zymmr Project Name" tags (configured by HR/Admin on the project's Edit form).
// Multiple tags can point the same external name variant to one HRMS project.
const buildProjectNameMap = (hrmsProjects) => {
    const map = {};
    (hrmsProjects || []).forEach(p => {
        (p.tags || []).forEach(tag => {
            if (tag?.key === 'Zymmr Project Name' && tag.value && p.project_name) {
                map[String(tag.value).toLowerCase().trim()] = p.project_name;
            }
        });
    });
    return map;
};

const resolveProjectName = (excelName, nameMap) => {
    if (!excelName) return excelName;
    const key = String(excelName).toLowerCase().trim();
    const hrmsName = nameMap ? nameMap[key] : undefined;
    return hrmsName ? `${hrmsName} (${excelName})` : excelName;
};

const resolveEmployeeName = (excelName) => excelName;

// Helper to reliably match HRMS names against Excel names
const nameMatch = (hrmsName, excelName) => {
    if (!hrmsName || !excelName) return false;
    const h1 = String(hrmsName).toLowerCase().trim();
    const e1 = String(excelName).toLowerCase().trim();
    if (h1 === e1) return true;
    
    // Check for "Last, First" in Excel
    if (e1.includes(',')) {
        const parts = e1.split(',').map(s => s.trim());
        if (parts.length === 2 && `${parts[1]} ${parts[0]}` === h1) {
            return true;
        }
    }
    return false;
};

// Helper to format Date into "MMM DD - MMM DD" (Mon-Sun week)
const getWeekRangeString = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return 'Invalid Date';
    const day = dateObj.getDay() || 7; 
    const start = new Date(dateObj);
    start.setDate(dateObj.getDate() - (day - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const fmt = d => `${d.toLocaleString('default', { month: 'short' })} ${String(d.getDate()).padStart(2, '0')}`;
    return `${fmt(start)} \u2013 ${fmt(end)}`;
};

const getMonthString = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return 'Invalid Date';
    return dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
};

// Colors for the Category Breakdown pie/table — cycled by index over however
// many distinct "Category — Sub-category" labels are present.
const CATEGORY_COLORS = ['#4f8ef7', '#5ad8a6', '#fa8c16', '#722ed1', '#f5222d', '#13c2c2', '#eb2f96', '#a0d911', '#faad14', '#2f54eb'];

// Every column present in the timelog export is required — 'Id' (unique per
// log row) and 'Author' (who actually logged the time — used as employee
// identity, NOT 'Primary Assignee') are what the database persists and
// dedupes entries by, but the rest are stored too, so a row missing any of
// them is rejected rather than silently saved with gaps.
const REQUIRED_COLS = [
    'Primary Assignee', 'Workflow State', 'Title', 'Project', 'Start Date',
    'End Date', 'Key', 'Description', 'Time', 'Date', 'Id', 'Author',
];

// 'Description' is allowed to be blank on a row — every other required
// column (notably Title, Author, Id and Date) must still be non-empty.
const REQUIRED_NON_EMPTY_COLS = REQUIRED_COLS.filter(c => c !== 'Description');

const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];

// One example row, matching a real timelog export, shown in the format-info
// popover so the expected shape is unambiguous before anyone uploads.
const SAMPLE_ROW = {
    'Primary Assignee': 'Ahiresh Gaik',
    'Workflow State': 'Done',
    'Title': 'Internal meeting',
    'Project': 'FM Internal',
    'Start Date': '2026-08-03',
    'End Date': '2026-08-31',
    'Key': 'FM-Project-6',
    'Description': 'Bi-weekly leadership sync',
    'Time': 2400,
    'Date': '2026-08-17',
    'Id': '005a780168',
    'Author': 'Ahiresh Gaik',
};

const FormatInfoContent = () => (
    <div style={{ maxWidth: 480 }}>
        <ul style={{ fontSize: 12, color: '#555', paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
            <li><b>Author</b> is who actually logged the time — this drives employee identity, <b>not</b> Primary Assignee (they can differ).</li>
            <li><b>Date</b> is the day the time was logged. Every chart/table here groups and filters by this date — not by Start Date or End Date, which just describe the underlying task.</li>
            <li><b>Time</b> is the logged duration in <b>seconds</b> (e.g. <code>3600</code> = 1 hour).</li>
            <li><b>Id</b> must be unique per row. Re-uploading a sheet updates a previously-seen Id in place instead of duplicating it.</li>
        </ul>
        <div style={{ marginTop: 12, fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Example row
        </div>
        <div style={{ overflowX: 'auto', marginTop: 6 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                    <tr>
                        {REQUIRED_COLS.map(c => (
                            <th key={c} style={{ border: '1px solid #eee', padding: '4px 7px', background: '#fafafa', whiteSpace: 'nowrap', textAlign: 'left' }}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {REQUIRED_COLS.map(c => (
                            <td key={c} style={{ border: '1px solid #eee', padding: '4px 7px', whiteSpace: 'nowrap', color: '#333' }}>{SAMPLE_ROW[c]}</td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
);

const validateTimelogRows = (rawJson) => {
    const errors = [];

    // 1. Missing column check (once, on first row)
    if (rawJson.length > 0) {
        const firstKeys = Object.keys(rawJson[0]).map(k => k.trim());
        const missingCols = REQUIRED_COLS.filter(c => !firstKeys.includes(c));
        if (missingCols.length > 0) {
            errors.push({
                type: 'missing_columns',
                message: `Missing required columns: ${missingCols.join(', ')}`,
            });
            return errors; // No point continuing without the columns
        }
    }

    // 2. Empty cell check (per row)
    rawJson.forEach((rawRow, i) => {
        const emptyCols = REQUIRED_NON_EMPTY_COLS.filter(col => {
            const v = rawRow[col];
            return v === '' || v === null || v === undefined;
        });
        if (emptyCols.length > 0) {
            errors.push({
                type: 'empty_cell',
                row: i + 2, // Excel row number (1-indexed header + 1)
                message: `Row ${i + 2}: Empty value in column(s): ${emptyCols.join(', ')}`,
            });
        }
    });

    return errors;
};

const pad2 = n => String(n).padStart(2, '0');
const toISODate = (d) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// ── Weekly analytics panel: collapsible flag list (mirrors EffortsAnalyser's
// LowPlannedEffortPanel), reused for the three weekly checks below ─────────
// Column dataIndexes that get a quick filter (checklist + search box in the
// header funnel) auto-attached, so every WeeklyFlagPanel table is filterable
// by employee and/or week without repeating this at each call site.
const FILTERABLE_KEYS = ['employee', 'week'];

const WeeklyFlagPanel = ({ title, emptyText, color, bgColor, borderColor, rows, columns }) => {
    const [expanded, setExpanded] = useState(false);

    const filterableColumns = useMemo(() => columns.map(col => {
        if (!FILTERABLE_KEYS.includes(col.dataIndex)) return col;
        const values = [...new Set(rows.map(r => r[col.dataIndex]))].filter(Boolean).sort();
        return {
            ...col,
            filters: values.map(v => ({ text: v, value: v })),
            filterSearch: true,
            onFilter: (value, record) => record[col.dataIndex] === value,
        };
    }), [columns, rows]);

    if (!rows.length) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#52c41a',
                padding: '8px 2px', marginBottom: 8,
            }}>
                <CheckCircleOutlined />
                {emptyText}
            </div>
        );
    }

    return (
        <Card size="small" bordered
            style={{ borderRadius: 10, marginBottom: 12, background: bgColor, borderColor }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setExpanded(v => !v)}>
                <WarningOutlined style={{ color, fontSize: 15 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#7c4a00' }}>
                    {title} <Tag color={color === '#cf1322' ? 'error' : 'warning'} style={{ fontSize: 11, marginLeft: 4 }}>{rows.length}</Tag>
                </span>
                <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>
                    {expanded ? '▲ Hide' : '▼ Show'} list
                </span>
            </div>
            {expanded && (
                <Table
                    size="small"
                    dataSource={rows}
                    rowKey="key"
                    pagination={{ pageSize: 10, size: 'small', showSizeChanger: false }}
                    style={{ marginTop: 10 }}
                    columns={filterableColumns}
                    scroll={{ x: 'max-content' }}
                />
            )}
        </Card>
    );
};

const TimesheetAnalyser = ({ effortsExportRef, hasEffortsData }) => {
    const { user } = useAuth();
    const isHRorAdmin = user?.roleName === 'HR' || user?.roleName === 'Admin';
    const [rawRows, setRawRows] = useState([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [viewMode, setViewMode] = useState('category'); // 'employee', 'project', or 'category'
    const [periodType, setPeriodType] = useState('week'); // 'week' or 'month'
    const [displayType, setDisplayType] = useState('table'); // 'table', 'chart', 'gaps', or 'trend'
    const [hrmsProjects, setHrmsProjects] = useState([]);
    const projectNameMap = useMemo(() => buildProjectNameMap(hrmsProjects), [hrmsProjects]);
    const [holidays, setHolidays] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [backlogTasks, setBacklogTasks] = useState([]); // persisted, not-done Effort Analyser tasks
    const [trendEntity, setTrendEntity] = useState('ALL'); // 'ALL' or a specific employee/project name
    const [hideCurrentWeek, setHideCurrentWeek] = useState(true); // weekly analytics: skip the still-in-progress week
    const [categoryEmpFilter, setCategoryEmpFilter] = useState(null); // Category Breakdown: optional employee filter
    const [categoryProjFilter, setCategoryProjFilter] = useState(null); // Category Breakdown: optional project filter
    const [drillDown, setDrillDown] = useState(null); // { employee: name } — opens the per-employee detail modal

    // ── Database persistence (employee-wise, monthly) ───────────────────────
    const [dateRange, setDateRange] = useState(() => [dayjs().startOf('month'), dayjs().endOf('month')]);
    const [initializing, setInitializing] = useState(true);    // true only until the very first DB fetch resolves
    const [refreshing, setRefreshing] = useState(false);       // a subsequent fetch (date range change / Refresh)
    const [hasSavedData, setHasSavedData] = useState(null);    // null = unknown yet; does ANY report exist at all
    const [showUploadPanel, setShowUploadPanel] = useState(false); // "Upload New File" was clicked
    const [saving, setSaving] = useState(false);                // POSTing a new upload to the database
    const [importSummary, setImportSummary] = useState(null);   // diff summary shown after a successful save
    const [validationErrors, setValidationErrors] = useState(null); // { fileName, errors: [...] }

    React.useEffect(() => { setTrendEntity('ALL'); }, [viewMode]);

    // Maps DB-persisted log entries (services/api getTimelogEntries shape)
    // back into the same row shape the Excel parser produces, so every
    // chart/table below is agnostic to where the data came from.
    const mapDbRowsToRawRows = (dbRows) => (dbRows || []).map(t => ({
        'Id': t.id,
        'Author': t.author,
        'Primary Assignee': t.primaryAssignee,
        'Workflow State': t.workflowState,
        'Title': t.title,
        'Project': t.project,
        'Key': t.key,
        'Description': t.description,
        'Start Date': t.startDate,
        'End Date': t.endDate,
        'Date': t.date,
        'Time': (t.timeSeconds != null ? t.timeSeconds : Math.round((t.timeHours || 0) * 3600)),
    }));

    // The database is the source of truth for viewing. Fetches only the
    // currently-selected date range (filtered server-side by each entry's log
    // Date) — not the full historical dataset. Re-runs whenever `dateRange`
    // changes.
    const syncFromDatabase = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setRefreshing(true);
        try {
            const params = {};
            if (dateRange?.[0]) params.from = dateRange[0].format('YYYY-MM-DD');
            if (dateRange?.[1]) params.to = dateRange[1].format('YYYY-MM-DD');
            const res = await getTimelogEntries(params);
            setRawRows(mapDbRowsToRawRows(res.data));
            setFileName('');
        } catch (err) {
            console.error('Failed to load saved timelog data from the database', err);
            if (!silent) message.error('Failed to load saved timelog data from the database.');
        } finally {
            if (!silent) setRefreshing(false);
            setInitializing(false);
        }
    }, [dateRange]);

    // Runs once on mount: is there ANY saved report at all? Independent of
    // the selected date range, so the Upload screen only shows for a truly
    // empty database — not just an empty result for the current month.
    React.useEffect(() => {
        let cancelled = false;
        getTimelogReports()
            .then(res => { if (!cancelled) setHasSavedData((res.data || []).length > 0); })
            .catch(err => console.error('Failed to check for saved timelog reports', err));
        return () => { cancelled = true; };
    }, []);

    // Loads the selected date range on mount, and again whenever it changes.
    React.useEffect(() => {
        syncFromDatabase();
    }, [syncFromDatabase]);

    const handleDateRangeChange = (range) => {
        setDateRange(range && range[0] && range[1] ? range : [dayjs().startOf('month'), dayjs().endOf('month')]);
    };

    React.useEffect(() => {
        getProjects()
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data?.projects || []);
                setHrmsProjects(data);
            })
            .catch(e => console.error('Failed to load projects for timesheet analyzer', e));

        getEmployeeAllocations()
            .then(res => setAllocations(res.data || []))
            .catch(e => console.error('Failed to load employee allocations', e));

        // The saved Effort Analyser backlog — used only by the Trend view to
        // project future weeks. Fetched once, unfiltered by date (a backlog
        // task can be due whenever; only its state matters here).
        getEffortTasks()
            .then(res => setBacklogTasks((res.data || []).filter(t => !isTaskDone(t.state))))
            .catch(e => console.error('Failed to load planned backlog for trend chart', e));

        holidayListData()
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                const parsed = data.map(h => {
                    const d = new Date(h.holiday_date);
                    return {
                        dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                        name: h.holiday_name
                    };
                });
                setHolidays(parsed);
            })
            .catch(e => console.error('Failed to load holidays', e));
    }, []);

    React.useEffect(() => {
        if (!rawRows || rawRows.length === 0) return;
        
        // Extract unique years from the rawRows
        const years = new Set();
        rawRows.forEach(r => {
            if (r['Date']) {
                const y = new Date(r['Date']).getFullYear();
                if (!isNaN(y)) years.add(y);
            }
        });

        const currentEmployeeId = Cookies.get('employeeId');

        // Fetch leave records for all detected years, catching individual errors
        Promise.all(Array.from(years).map(y => 
            getLeaveTransactionsByApprover(currentEmployeeId, y).catch(e => {
                console.warn(`Failed to load leaves for year ${y}:`, e.message);
                return { data: [] }; // Return empty data so Promise.all doesn't fail
            })
        ))
            .then(responses => {
                const allData = [];
                responses.forEach(res => {
                    if (Array.isArray(res.data)) {
                        allData.push(...res.data);
                    }
                });
                // Filter only Approved leaves
                const approvedLeaves = allData.filter(l => {
                    const status = l.LeaveStatus || l.leaveStatus || '';
                    return status.toLowerCase().includes('approved');
                });
                setLeaves(approvedLeaves);
            })
            .catch(e => console.error('Failed to load leaves for timesheet years', e));
    }, [rawRows]);

    const handleFile = useCallback((file) => {
        const ext = `.${(file.name.split('.').pop() || '').toLowerCase()}`;
        if (!EXCEL_EXTENSIONS.includes(ext)) {
            message.error('Only Excel files (.xlsx or .xls) are supported.');
            return false;
        }

        setUploading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (json.length === 0) {
                    message.error('File is empty.');
                    return;
                }

                const errors = validateTimelogRows(json);
                if (errors.length > 0) {
                    setValidationErrors({ fileName: file.name, errors });
                    return; // Do not save until the file is fixed
                }

                // Build the DB payload — one entry per row. Author (who logged
                // the time) drives employee identity, not Primary Assignee.
                const entries = json
                    .map(row => {
                        const author = String(row['Author'] || '').trim();
                        const id = String(row['Id'] || '').trim();
                        const dateVal = row['Date'] instanceof Date ? row['Date'] : new Date(row['Date']);
                        const startVal = row['Start Date'] instanceof Date ? row['Start Date'] : (row['Start Date'] ? new Date(row['Start Date']) : null);
                        const endVal = row['End Date'] instanceof Date ? row['End Date'] : (row['End Date'] ? new Date(row['End Date']) : null);
                        const timeSeconds = typeof row['Time'] === 'number' ? row['Time'] : parseFloat(row['Time'] || 0);
                        if (!author || !id || isNaN(dateVal.getTime())) return null;
                        return {
                            id,
                            author,
                            primaryAssignee: String(row['Primary Assignee'] || '').trim() || null,
                            workflowState: String(row['Workflow State'] || '').trim() || null,
                            title: String(row['Title'] || '').trim() || null,
                            project: String(row['Project'] || '').trim(),
                            key: String(row['Key'] || '').trim() || null,
                            description: String(row['Description'] || '').trim() || null,
                            startDate: toISODate(startVal),
                            endDate: toISODate(endVal),
                            date: toISODate(dateVal),
                            timeSeconds: isNaN(timeSeconds) ? 0 : timeSeconds,
                            timeHours: isNaN(timeSeconds) ? 0 : Number((timeSeconds / 3600).toFixed(4)),
                        };
                    })
                    .filter(Boolean);

                if (!entries.length) {
                    message.error('No valid rows found (each row needs an Id, Author, and a valid Date).');
                    return;
                }

                message.success(`Parsed ${entries.length} rows — saving to the database…`);

                // ── Save to the database, then re-sync so the view reflects the
                // full accumulated dataset for the selected range (this upload
                // merged with everything saved previously), not just this file.
                setSaving(true);
                saveTimelogReport({ fileName: file.name, entries })
                    .then(res => {
                        setImportSummary(res.data?.groups || []);
                        setHasSavedData(true);
                        setShowUploadPanel(false);
                        return syncFromDatabase({ silent: true });
                    })
                    .catch(err => {
                        console.error('Failed to save timelog report to database', err);
                        message.error('Failed to save the timelog data to the database.');
                    })
                    .finally(() => setSaving(false));
            } catch (err) {
                console.error(err);
                message.error('Failed to parse file.');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    }, [syncFromDatabase]);

    const { employeeData, projectData, allPeriods, timesheetRange } = useMemo(() => {
        if (!rawRows.length && !allocations.length) {
            return { employeeData: [], projectData: [], allPeriods: [], timesheetRange: null };
        }

        const empMap = {};
        const projMap = {};
        const periodSet = new Set();
        const periodStartDates = {};
        let actualMinTime = Infinity;
        let actualMaxTime = -Infinity;

        const loggedDatesPerEmployee = {}; // { empName: Set(dateStrings) }
        const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        rawRows.forEach(row => {
            const rawEmp = row['Author'];
            const rawProj = row['Project'];
            const rawTime = row['Time'];
            const rawDate = row['Date'];

            if (!rawEmp || !rawDate) return;

            const empName = resolveEmployeeName(String(rawEmp).trim());
            const projName = resolveProjectName(rawProj ? String(rawProj).trim() : 'Unknown Project', projectNameMap);
            
            // Time is in seconds => hours
            const timeHrs = typeof rawTime === 'number' ? rawTime / 3600 : parseFloat(rawTime || 0) / 3600;
            if (isNaN(timeHrs)) return;
            
            let d;
            if (rawDate instanceof Date) d = rawDate;
            else d = new Date(rawDate);
            
            if (isNaN(d.getTime())) return;
            
            const t = d.getTime();
            if (t < actualMinTime) actualMinTime = t;
            if (t > actualMaxTime) actualMaxTime = t;
            
            const periodStr = periodType === 'week' ? getWeekRangeString(d) : getMonthString(d);
            periodSet.add(periodStr);

            const dStr = fmt(d);
            if (!loggedDatesPerEmployee[empName]) loggedDatesPerEmployee[empName] = new Set();
            loggedDatesPerEmployee[empName].add(dStr);
            
            if (!periodStartDates[periodStr]) {
                if (periodType === 'week') {
                    const day = d.getDay() || 7;
                    const start = new Date(d);
                    start.setDate(d.getDate() - (day - 1));
                    periodStartDates[periodStr] = start.getTime();
                } else {
                    const start = new Date(d.getFullYear(), d.getMonth(), 1);
                    periodStartDates[periodStr] = start.getTime();
                }
            }

            if (!empMap[empName]) empMap[empName] = { name: empName, targetHours: {}, missingLogs: [] };
            empMap[empName][periodStr] = (empMap[empName][periodStr] || 0) + timeHrs;

            if (!projMap[projName]) projMap[projName] = { name: projName, rawName: projName };
            projMap[projName][periodStr] = (projMap[projName][periodStr] || 0) + timeHrs;
        });

        // Ensure every period covering the SELECTED date range gets a bucket,
        // even one with zero logged rows in it — otherwise "Missing Logs"
        // would silently skip a week/month nobody logged anything in. Capped
        // at today — no timelog can exist for a future date, so there's
        // nothing to flag as "missing" beyond it.
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (dateRange?.[0] && dateRange?.[1]) {
            const rangeStart = dateRange[0].startOf('day').toDate();
            const rangeEndSelected = dateRange[1].endOf('day').toDate();
            const rangeEnd = rangeEndSelected > today ? today : rangeEndSelected;
            for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
                const periodStr = periodType === 'week' ? getWeekRangeString(cursor) : getMonthString(cursor);
                periodSet.add(periodStr);
                if (!periodStartDates[periodStr]) {
                    if (periodType === 'week') {
                        const day = cursor.getDay() || 7;
                        const start = new Date(cursor);
                        start.setDate(cursor.getDate() - (day - 1));
                        periodStartDates[periodStr] = start.getTime();
                    } else {
                        const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
                        periodStartDates[periodStr] = start.getTime();
                    }
                }
            }
        }

        // Add all employees from HRMS who have active project allocations
        allocations.forEach(alloc => {
            if (alloc.projects && alloc.projects.length > 0) {
                const empName = resolveEmployeeName(alloc.employee_name);
                if (!empMap[empName]) empMap[empName] = { name: empName, targetHours: {}, missingLogs: [] };
            }
        });

        // Calculate dynamic weekly targets for each employee
        const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // "In bounds" means within the SELECTED date range (not just where
        // logged data happens to exist) — so a day nobody logged anything on,
        // anywhere in the viewed range, is correctly flagged as missing
        // instead of being silently excluded as "outside the dataset". Capped
        // at today: a future day can't have a missing timelog yet, so it's
        // treated as out-of-bounds (excluded from both the target hours and
        // the missing-logs list) rather than flagged.
        const minDatasetT = dateRange?.[0]
            ? dateRange[0].startOf('day').valueOf()
            : (actualMinTime !== Infinity ? actualMinTime : -Infinity);
        const maxDatasetT = dateRange?.[1]
            ? Math.min(dateRange[1].endOf('day').valueOf(), today.getTime())
            : (actualMaxTime !== -Infinity ? actualMaxTime : Infinity);

        Object.values(empMap).forEach(emp => {
            // Find all approved leaves for this employee
            const empLeaves = leaves.filter(l => {
                const name = l.EmployeeName || l.employeeName || l.empName || l.appliedByName || '';
                const type = l.LeaveType || l.leaveType || '';
                const status = l.LeaveStatus || l.leaveStatus || l.leave_status || '';
                
                const isPrivilegeOrSick = type.toLowerCase().includes('sick') || type.toLowerCase().includes('privilege') || String(l.leaveTypeId) === "1" || String(l.leaveTypeId) === "2" || String(l.leave_type_id) === "1" || String(l.leave_type_id) === "2";
                const isApproved = status.toLowerCase() === 'approved';
                
                return nameMatch(name, emp.name) && isPrivilegeOrSick && isApproved;
            });
            
            Object.keys(periodStartDates).forEach(p => {
                const pStart = new Date(periodStartDates[p]);
                let holidaysCount = 0;
                let leavesCount = 0;
                let outOfBoundsCount = 0;
                let targetBase = 0;
                
                let daysInPeriod = 7;
                if (periodType === 'month') {
                    const endOfMonth = new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0);
                    daysInPeriod = endOfMonth.getDate();
                }

                for (let i = 0; i < daysInPeriod; i++) {
                    const currentDay = new Date(pStart);
                    currentDay.setDate(pStart.getDate() + i);
                    
                    // Skip weekends
                    const dayOfWeek = currentDay.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

                    targetBase += 8;

                    const currentDayStr = fmtDate(currentDay);
                    const currentDayTime = currentDay.getTime();

                    // Check if it's a holiday FIRST
                    if (holidays.some(h => h.dateStr === currentDayStr)) {
                        holidaysCount++;
                        continue;
                    }
                    
                    // Check if employee is on leave SECOND
                    const isOnLeave = empLeaves.some(l => {
                        const sVal = l.fromDate || l.from_date;
                        const eVal = l.toDate || l.to_date;
                        if (!sVal || !eVal) return false;
                        const lStart = new Date(sVal).getTime();
                        const lEnd = new Date(eVal).getTime();
                        return currentDayTime >= lStart && currentDayTime <= lEnd;
                    });
                    
                    if (isOnLeave) {
                        if (!emp.leaveDates) emp.leaveDates = [];
                        if (!emp.leaveDates.includes(currentDayStr)) {
                            emp.leaveDates.push(currentDayStr);
                        }
                        leavesCount++;
                        continue;
                    }

                    // Check if the day is outside the bounds of the dataset LAST
                    if (currentDayTime < minDatasetT || currentDayTime > maxDatasetT) {
                        outOfBoundsCount++;
                        continue;
                    }

                    // If we are here, it's a working day within bounds, not holiday, not on leave.
                    // Check if they logged time.
                    const hasLog = loggedDatesPerEmployee[emp.name]?.has(currentDayStr);
                    if (!hasLog) {
                        if (!emp.missingLogs.includes(currentDayStr)) {
                            emp.missingLogs.push(currentDayStr);
                        }
                    }
                }
                
                const deduction = (holidaysCount + leavesCount + outOfBoundsCount) * 8;
                emp.targetHours[p] = Math.max(0, targetBase - deduction);
                emp.totalHolidays = (emp.totalHolidays || 0) + holidaysCount;
                emp.totalLeaves = (emp.totalLeaves || 0) + leavesCount;
            });
        });

        // Add allocation to project data
        Object.values(projMap).forEach(p => {
            // Determine HRMS name to match
            let hrmsName = p.name;
            if (p.name.includes(' (')) {
                hrmsName = p.name.split(' (')[0].trim();
            }
            const match = hrmsProjects.find(hp => String(hp.project_name).trim().toLowerCase() === hrmsName.toLowerCase());
            p.allocation = match && match.total_allocation != null ? Number(match.total_allocation) / 100 : 0;
            p.category = match?.category || null;
            p.subCategory = match?.sub_category || null;
        });

        // Sort periods chronologically
        const sortedPeriods = Array.from(periodSet).sort((a, b) => periodStartDates[a] - periodStartDates[b]);

        const formatData = (map) => {
            return Object.values(map).map(item => {
                let total = 0;
                sortedPeriods.forEach(p => {
                    if (item[p]) item[p] = Number(item[p].toFixed(2));
                    total += (item[p] || 0);
                });
                item.Total = Number(total.toFixed(2));
                return item;
            }).sort((a, b) => b.Total - a.Total);
        };

        // The viewed range is always the selected date range now — it drives
        // the "Holidays/Leaves in Period" notes below the same way it drives
        // the missing-log bounds above.
        const allStarts = Object.values(periodStartDates);
        const minTime = minDatasetT !== -Infinity ? minDatasetT : (actualMinTime !== Infinity ? actualMinTime : Math.min(...allStarts));
        const maxTime = maxDatasetT !== Infinity ? maxDatasetT : (actualMaxTime !== -Infinity ? actualMaxTime : Math.max(...allStarts) + 6 * 24 * 60 * 60 * 1000);

        return {
            employeeData: formatData(empMap),
            projectData: formatData(projMap),
            allPeriods: sortedPeriods,
            timesheetRange: { min: minTime, max: maxTime }
        };
    }, [rawRows, hrmsProjects, leaves, holidays, allocations, periodType, dateRange, projectNameMap]);

    // ── Trend view: past logged hours (always week-wise) + a capacity-based
    // projection of the remaining planned backlog into future weeks ─────────
    const trendEntityOptions = useMemo(() => {
        const source = viewMode === 'employee' ? employeeData : projectData;
        const label = viewMode === 'employee' ? 'All Employees' : 'All Projects';
        return [{ value: 'ALL', label }, ...source.map(e => ({ value: e.name, label: e.name }))];
    }, [viewMode, employeeData, projectData]);

    // Project names in this component are rendered as "HRMS Name (Excel Name)"
    // when remapped (see resolveProjectName) — strip that back to the HRMS
    // name to match against the Effort Analyser's persisted `project` field.
    const getHrmsProjectName = (name) => (name.includes(' (') ? name.split(' (')[0].trim() : name);

    const trendData = useMemo(() => {
        const empty = { series: [], weeklyRate: 0, totalBacklogHours: 0, weeksToClear: 0, lastLoggedWeek: null };
        if (!rawRows.length || !timesheetRange) return empty;

        // Past: actual logged hours, always bucketed weekly regardless of the
        // page's Group By setting — a trend needs a consistent granularity.
        const weekMap = {};
        rawRows.forEach(row => {
            const rawEmp = row['Author'];
            const rawProj = row['Project'];
            const rawTime = row['Time'];
            const rawDate = row['Date'];
            if (!rawEmp || !rawDate) return;

            const empName = resolveEmployeeName(String(rawEmp).trim());
            const projName = resolveProjectName(rawProj ? String(rawProj).trim() : 'Unknown Project', projectNameMap);

            if (viewMode === 'employee' && trendEntity !== 'ALL' && !employeeNamesMatch(empName, trendEntity)) return;
            if (viewMode === 'project' && trendEntity !== 'ALL' && projName !== trendEntity) return;

            const timeHrs = typeof rawTime === 'number' ? rawTime / 3600 : parseFloat(rawTime || 0) / 3600;
            if (isNaN(timeHrs)) return;

            const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
            if (isNaN(d.getTime())) return;

            const label = getWeekRangeString(d);
            const day = d.getDay() || 7;
            const start = new Date(d);
            start.setDate(d.getDate() - (day - 1));
            start.setHours(0, 0, 0, 0);

            if (!weekMap[label]) weekMap[label] = { hours: 0, startTime: start.getTime() };
            weekMap[label].hours += timeHrs;
        });

        const pastWeeks = Object.entries(weekMap)
            .map(([week, v]) => ({ week, actual: Number(v.hours.toFixed(1)), startTime: v.startTime }))
            .sort((a, b) => a.startTime - b.startTime);

        if (!pastWeeks.length) return empty;

        // Backlog hours for the selected entity
        let matchedBacklog = backlogTasks;
        if (trendEntity !== 'ALL') {
            if (viewMode === 'employee') {
                matchedBacklog = backlogTasks.filter(t => employeeNamesMatch(t.assignee, trendEntity));
            } else {
                const hrmsName = getHrmsProjectName(trendEntity).toLowerCase().trim();
                matchedBacklog = backlogTasks.filter(t => (t.project || '').toLowerCase().trim() === hrmsName);
            }
        }
        const totalBacklogHours = matchedBacklog.reduce((s, t) => s + (Number(t.estimateHours) || 0), 0);

        // Weekly capacity rate — the entity's own allocation, converted to a
        // 40 hrs/week full-time-equivalent; falls back to a flat 40 for the
        // aggregate "All" view (or if no HRMS allocation match is found).
        let weeklyRate = 40;
        if (trendEntity !== 'ALL') {
            if (viewMode === 'employee') {
                const emp = allocations.find(e => employeeNamesMatch(e.employee_name, trendEntity));
                weeklyRate = emp ? (emp.total_allocation || 0) * 40 : 40;
            } else {
                const hrmsName = getHrmsProjectName(trendEntity).toLowerCase().trim();
                const proj = hrmsProjects.find(p => (p.project_name || '').trim().toLowerCase() === hrmsName);
                weeklyRate = (proj && proj.total_allocation != null) ? (Number(proj.total_allocation) / 100) * 40 : 40;
            }
        }

        // Future: spread the backlog forward at `weeklyRate` per week,
        // starting the week after the last logged week, until exhausted.
        // Deliberately ignores each task's own due date (capacity-based, not
        // due-date-based) — capped at 104 weeks (2 years) as a runaway guard.
        const futureWeeks = [];
        if (weeklyRate > 0 && totalBacklogHours > 0) {
            let remaining = totalBacklogHours;
            const cursor = new Date(pastWeeks[pastWeeks.length - 1].startTime);
            cursor.setDate(cursor.getDate() + 7);
            let guard = 0;
            while (remaining > 0.05 && guard < 104) {
                const hoursThisWeek = Math.min(weeklyRate, remaining);
                futureWeeks.push({ week: getWeekRangeString(cursor), projected: Number(hoursThisWeek.toFixed(1)) });
                remaining -= hoursThisWeek;
                cursor.setDate(cursor.getDate() + 7);
                guard++;
            }
        }

        const lastLoggedWeek = pastWeeks[pastWeeks.length - 1].week;
        const series = [
            ...pastWeeks.map((p, i) => ({
                week: p.week,
                actual: p.actual,
                // Bridge point: the last logged week also carries the
                // projected value, so the dashed line starts exactly where
                // the solid line ends instead of leaving a visual gap.
                projected: i === pastWeeks.length - 1 ? p.actual : null,
            })),
            ...futureWeeks.map(f => ({ week: f.week, actual: null, projected: f.projected })),
        ];

        const weeksToClear = weeklyRate > 0 ? Math.ceil(totalBacklogHours / weeklyRate) : 0;

        return { series, weeklyRate, totalBacklogHours, weeksToClear, lastLoggedWeek };
    }, [rawRows, timesheetRange, viewMode, trendEntity, backlogTasks, allocations, hrmsProjects, projectNameMap]);

    // ── Weekly analytics: three quick-info checks, always bucketed weekly
    // (independent of the page's Group By setting) ──────────────────────────
    const currentWeekLabel = useMemo(() => getWeekRangeString(new Date()), []);

    // Case-insensitive index of HRMS employee names, so a row's Author (which
    // may differ slightly in casing/spacing from HRMS) still matches its
    // allocation record — same "Last, First" reorder fallback as nameMatch().
    const hrmsEmpIndex = useMemo(() => {
        const idx = {};
        allocations.forEach(a => {
            const key = (a.employee_name || '').toLowerCase().trim();
            if (key) idx[key] = a.employee_name;
        });
        return idx;
    }, [allocations]);

    const canonicalEmpName = useCallback((rawName) => {
        const key = (rawName || '').toLowerCase().trim();
        if (hrmsEmpIndex[key]) return hrmsEmpIndex[key];
        if (key.includes(',')) {
            const parts = key.split(',').map(s => s.trim());
            if (parts.length === 2 && hrmsEmpIndex[`${parts[1]} ${parts[0]}`]) {
                return hrmsEmpIndex[`${parts[1]} ${parts[0]}`];
            }
        }
        return rawName;
    }, [hrmsEmpIndex]);

    // empWeekHours: { empName: { week: hours } } — total across all projects
    // empProjWeekHours: { empName: { hrmsProjectName: { week: hours } } }
    // weekMeta: { week: { startTime } } — every week touching the selected
    // date range (capped at today), even one with zero logged rows in it.
    const weeklyGrid = useMemo(() => {
        const empWeekHours = {};
        const empProjWeekHours = {};
        const weekMeta = {};

        const addWeek = (week, cursor) => {
            if (weekMeta[week]) return;
            const day = cursor.getDay() || 7;
            const start = new Date(cursor);
            start.setDate(cursor.getDate() - (day - 1));
            start.setHours(0, 0, 0, 0);
            weekMeta[week] = { startTime: start.getTime() };
        };

        rawRows.forEach(row => {
            const rawEmp = row['Author'];
            const rawProj = row['Project'];
            const rawTime = row['Time'];
            const rawDate = row['Date'];
            if (!rawEmp || !rawDate) return;

            const empName = canonicalEmpName(String(rawEmp).trim());
            const projName = resolveProjectName(rawProj ? String(rawProj).trim() : 'Unknown Project', projectNameMap);
            const hrmsProjName = projName.includes(' (') ? projName.split(' (')[0].trim() : projName;

            const timeHrs = typeof rawTime === 'number' ? rawTime / 3600 : parseFloat(rawTime || 0) / 3600;
            if (isNaN(timeHrs)) return;

            const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
            if (isNaN(d.getTime())) return;

            const week = getWeekRangeString(d);
            addWeek(week, d);

            empWeekHours[empName] = empWeekHours[empName] || {};
            empWeekHours[empName][week] = (empWeekHours[empName][week] || 0) + timeHrs;

            empProjWeekHours[empName] = empProjWeekHours[empName] || {};
            empProjWeekHours[empName][hrmsProjName] = empProjWeekHours[empName][hrmsProjName] || {};
            empProjWeekHours[empName][hrmsProjName][week] = (empProjWeekHours[empName][hrmsProjName][week] || 0) + timeHrs;
        });

        // Fill in every week of the selected range (capped at today) so a
        // week nobody logged anything in still gets checked, not skipped.
        if (dateRange?.[0] && dateRange?.[1]) {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            const rangeStart = dateRange[0].startOf('day').toDate();
            const rangeEndSelected = dateRange[1].endOf('day').toDate();
            const rangeEnd = rangeEndSelected > today ? today : rangeEndSelected;
            for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
                addWeek(getWeekRangeString(cursor), cursor);
            }
        }

        const weekList = Object.keys(weekMeta).sort((a, b) => weekMeta[a].startTime - weekMeta[b].startTime);
        return { empWeekHours, empProjWeekHours, weekMeta, weekList };
    }, [rawRows, dateRange, canonicalEmpName, projectNameMap]);

    // ── Category Breakdown: Client Project (Billable/Non-billable, from the
    // employee's own allocation on that project) vs Internal (project's
    // configured sub-category, with per-task overrides) — week/month-wise,
    // plus a whole-range total for the pie chart. Independent employee/project
    // filters, in addition to the page's date range + Group By period. ───────
    const projectCategoryIndex = useMemo(() => {
        const idx = {};
        hrmsProjects.forEach(p => {
            const key = String(p.project_name || '').trim().toLowerCase();
            if (key) idx[key] = p;
        });
        return idx;
    }, [hrmsProjects]);

    // { empName -> { hrmsProjectName(lower) -> is_billing } }
    const empProjectBillingIndex = useMemo(() => {
        const idx = {};
        allocations.forEach(a => {
            const map = {};
            (a.projects || []).forEach(p => {
                map[String(p.project_name || '').trim().toLowerCase()] = !!p.is_billing;
            });
            idx[(a.employee_name || '').trim()] = map;
        });
        return idx;
    }, [allocations]);

    // A project's default sub_category, unless one of its task_category_overrides
    // matches this row's task Title or Key (case-insensitive).
    const resolveTaskSubCategory = (proj, row) => {
        const overrides = proj.task_category_overrides || [];
        const fallback = proj.sub_category || 'Other Internal Work';
        if (!overrides.length) return fallback;
        const title = String(row['Title'] || '').trim().toLowerCase();
        const key = String(row['Key'] || '').trim().toLowerCase();
        const hit = overrides.find(o => {
            const t = String(o.task_name || '').trim().toLowerCase();
            return t && (t === title || t === key);
        });
        return hit ? hit.sub_category : fallback;
    };

    const employeeFilterOptions = useMemo(() =>
        [...new Set(rawRows.map(r => canonicalEmpName(String(r['Author'] || '').trim())))].filter(Boolean).sort(),
        [rawRows, canonicalEmpName]);

    const projectFilterOptions = useMemo(() => {
        const names = new Set();
        rawRows.forEach(r => {
            const resolved = resolveProjectName(r['Project'] ? String(r['Project']).trim() : 'Unknown Project', projectNameMap);
            names.add(resolved.includes(' (') ? resolved.split(' (')[0].trim() : resolved);
        });
        return [...names].filter(Boolean).sort();
    }, [rawRows, projectNameMap]);

    const categoryBreakdown = useMemo(() => {
        const rowMap = {};        // label -> { key, category, subCategory, total }
        const entriesByLabel = {}; // label -> [{ empName, projName, hours, date, title, key, state, description }]

        rawRows.forEach(row => {
            const rawEmp = row['Author'];
            const rawDate = row['Date'];
            const rawTime = row['Time'];
            if (!rawEmp || !rawDate) return;

            const empName = canonicalEmpName(String(rawEmp).trim());
            if (categoryEmpFilter && empName !== categoryEmpFilter) return;

            const resolvedProj = resolveProjectName(row['Project'] ? String(row['Project']).trim() : 'Unknown Project', projectNameMap);
            const hrmsProjName = resolvedProj.includes(' (') ? resolvedProj.split(' (')[0].trim() : resolvedProj;
            if (categoryProjFilter && hrmsProjName !== categoryProjFilter) return;

            const timeHrs = typeof rawTime === 'number' ? rawTime / 3600 : parseFloat(rawTime || 0) / 3600;
            if (isNaN(timeHrs)) return;

            const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
            if (isNaN(d.getTime())) return;

            const proj = projectCategoryIndex[hrmsProjName.toLowerCase()];
            let category = 'Uncategorized';
            let subCategory = 'Uncategorized';

            if (proj?.category === 'Internal') {
                category = 'Internal';
                subCategory = resolveTaskSubCategory(proj, row);
            } else if (proj?.category === 'Client Project') {
                category = 'Client Project';
                const billingMap = empProjectBillingIndex[empName];
                const isBilling = billingMap ? billingMap[hrmsProjName.toLowerCase()] : undefined;
                subCategory = isBilling === undefined ? 'Unallocated' : (isBilling ? 'Billable' : 'Non-billable');
            }

            const label = `${category} — ${subCategory}`;

            if (!rowMap[label]) rowMap[label] = { key: label, category, subCategory, total: 0 };
            rowMap[label].total += timeHrs;

            if (!entriesByLabel[label]) entriesByLabel[label] = [];
            entriesByLabel[label].push({
                empName, projName: hrmsProjName, hours: timeHrs, date: d,
                title: row['Title'] || '', key: row['Key'] || '',
                state: row['Workflow State'] || '', description: row['Description'] || '',
            });
        });

        const rows = Object.values(rowMap)
            .map(r => ({ ...r, total: Number(r.total.toFixed(2)) }))
            .sort((a, b) => b.total - a.total);

        const grandTotal = rows.reduce((s, r) => s + r.total, 0);
        const pieData = rows.map(r => ({ name: r.key, value: r.total }));

        return { rows, entriesByLabel, pieData, grandTotal };
    }, [rawRows, categoryEmpFilter, categoryProjFilter, projectCategoryIndex, empProjectBillingIndex, canonicalEmpName, projectNameMap]);

    // Drill-down for a clicked category/sub-category row: which employee
    // logged how many hours on which project (matrix), plus the individual
    // task entries behind it — both scoped to whatever the top-level
    // Employee/Project filters currently select.
    const [categoryDrillDown, setCategoryDrillDown] = useState(null); // the clicked row's `label` (key), or null

    const categoryDrillDownData = useMemo(() => {
        if (!categoryDrillDown) return null;
        const entries = categoryBreakdown.entriesByLabel[categoryDrillDown] || [];

        const empProjMap = {}; // empName -> projName -> hours
        const projSet = new Set();
        entries.forEach(e => {
            projSet.add(e.projName);
            empProjMap[e.empName] = empProjMap[e.empName] || {};
            empProjMap[e.empName][e.projName] = (empProjMap[e.empName][e.projName] || 0) + e.hours;
        });

        const projects = [...projSet].sort();
        const matrixRows = Object.keys(empProjMap).sort().map(emp => {
            const row = { key: emp, employee: emp, total: 0 };
            projects.forEach(p => {
                const v = empProjMap[emp][p] || 0;
                row[p] = Number(v.toFixed(2));
                row.total += v;
            });
            row.total = Number(row.total.toFixed(2));
            return row;
        }).sort((a, b) => b.total - a.total);

        const tasks = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
        const totalHours = Number(entries.reduce((s, e) => s + e.hours, 0).toFixed(2));

        return { projects, matrixRows, tasks, totalHours, entryCount: entries.length };
    }, [categoryDrillDown, categoryBreakdown]);

    // Full employee universe for the weekly checks — same union used to build
    // employeeData above: anyone with logged rows, plus every HRMS employee
    // with an active project allocation (so a zero-hour week isn't missed
    // just because they never appear in rawRows at all).
    const weeklyCheckEmployees = useMemo(() => {
        const names = new Set(Object.keys(weeklyGrid.empWeekHours));
        allocations.forEach(a => {
            if (a.projects && a.projects.length > 0) names.add(a.employee_name);
        });
        return [...names];
    }, [weeklyGrid, allocations]);

    // 1. Employees logging less than 40 hours in any (checked) week.
    const under40HourWeeks = useMemo(() => {
        const { empWeekHours, weekList, weekMeta } = weeklyGrid;
        const rows = [];
        weeklyCheckEmployees.forEach(name => {
            weekList.forEach(week => {
                if (hideCurrentWeek && week === currentWeekLabel) return;
                const hours = empWeekHours[name]?.[week] || 0;
                if (hours < 40) {
                    rows.push({
                        key: `${name}__${week}`, employee: name, week,
                        weekStart: weekMeta[week].startTime, hours, deficit: Number((40 - hours).toFixed(1)),
                    });
                }
            });
        });
        return rows.sort((a, b) => b.deficit - a.deficit || a.weekStart - b.weekStart);
    }, [weeklyGrid, weeklyCheckEmployees, hideCurrentWeek, currentWeekLabel]);

    // Per-employee-project weekly allocation target, in hours (allocation is
    // stored as a whole-number percentage, e.g. 50 = 50%).
    const allocPctByKey = useMemo(() => {
        const map = {};
        allocations.forEach(emp => {
            (emp.projects || []).forEach(p => {
                const key = `${(emp.employee_name || '').trim()}\x00${(p.project_name || '').trim()}`;
                map[key] = p.allocation || 0;
            });
        });
        return map;
    }, [allocations]);

    // 2 & 3. Employees logging under/over their weekly project allocation —
    // kept as ONE combined list (rather than two separate under/over lists)
    // so an employee who is over-allocated on one project and under on
    // another, in the same week, shows up together and the trade-off is
    // obvious. Grouped/sorted by employee then week then project.
    const allocationWeeks = useMemo(() => {
        const { empProjWeekHours, weekList, weekMeta } = weeklyGrid;
        const rows = [];

        Object.entries(allocPctByKey).forEach(([key, pct]) => {
            if (!pct || pct <= 0) return;
            const [empName, projName] = key.split('\x00');
            const targetHrs = Number(((pct / 100) * 40).toFixed(1));
            const projHours = empProjWeekHours[empName]?.[projName];

            weekList.forEach(week => {
                if (hideCurrentWeek && week === currentWeekLabel) return;
                const hours = projHours?.[week] || 0;
                const weekStart = weekMeta[week].startTime;
                if (hours === targetHrs) return;
                const status = hours < targetHrs ? 'under' : 'over';
                rows.push({
                    key: `${empName}__${projName}__${week}`, employee: empName, project: projName, week,
                    weekStart, hours, targetHrs, status,
                    delta: Number((hours - targetHrs).toFixed(1)), // negative = under, positive = over
                });
            });
        });

        return rows.sort((a, b) =>
            a.employee.localeCompare(b.employee) || a.weekStart - b.weekStart || a.project.localeCompare(b.project));
    }, [weeklyGrid, allocPctByKey, hideCurrentWeek, currentWeekLabel]);

    // ── Drill-down: the OTHER dimension's effort (same period granularity as
    // the page) + individual log entries grouped by it, for the currently
    // selected date range — clicking an employee row groups by project, and
    // clicking a project row groups by employee. ────────────────────────────
    const drillDownData = useMemo(() => {
        if (!drillDown) return null;
        const { type, name } = drillDown;
        const groupLabel = type === 'employee' ? 'Project' : 'Employee';

        const rowProjectName = (row) => resolveProjectName(row['Project'] ? String(row['Project']).trim() : 'Unknown Project', projectNameMap);
        const rowAuthorName = (row) => String(row['Author'] || '').trim();

        const targetRows = rawRows.filter(row =>
            type === 'employee' ? rowAuthorName(row) === name : rowProjectName(row) === name
        );
        const getGroupName = type === 'employee' ? rowProjectName : rowAuthorName;

        const groupPeriodMap = {};   // groupName -> period -> hours
        const periodStartDates = {}; // period -> startTime, for chronological sorting
        const logsByGroup = {};      // groupName -> [{ date, title, description, key, state, hours }]
        const groupCategoryMap = {}; // groupName (project) -> { category, subCategory } — 'employee' drill-downs only
        const categoryTotals = {};   // "Category — Sub-category" -> hours — 'employee' drill-downs only, for the pie chart
        const groupTotals = {};      // groupName -> hours — 'project' drill-downs only, for the employee-wise pie chart
        let totalHours = 0;

        targetRows.forEach(row => {
            const rawTime = row['Time'];
            const rawDate = row['Date'];
            if (!rawDate) return;

            const groupName = getGroupName(row);
            if (!groupName) return;

            const timeHrs = typeof rawTime === 'number' ? rawTime / 3600 : parseFloat(rawTime || 0) / 3600;
            const hours = isNaN(timeHrs) ? 0 : timeHrs;

            const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
            if (isNaN(d.getTime())) return;

            totalHours += hours;

            const periodStr = periodType === 'week' ? getWeekRangeString(d) : getMonthString(d);
            if (!periodStartDates[periodStr]) {
                if (periodType === 'week') {
                    const day = d.getDay() || 7;
                    const start = new Date(d);
                    start.setDate(d.getDate() - (day - 1));
                    periodStartDates[periodStr] = start.getTime();
                } else {
                    periodStartDates[periodStr] = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
                }
            }

            groupPeriodMap[groupName] = groupPeriodMap[groupName] || {};
            groupPeriodMap[groupName][periodStr] = (groupPeriodMap[groupName][periodStr] || 0) + hours;
            groupTotals[groupName] = (groupTotals[groupName] || 0) + hours;

            logsByGroup[groupName] = logsByGroup[groupName] || [];
            logsByGroup[groupName].push({
                date: d,
                title: row['Title'] || '',
                description: row['Description'] || '',
                key: row['Key'] || '',
                state: row['Workflow State'] || '',
                hours,
            });

            // Category/sub-category classification — same logic as the
            // Category view, only computed when drilling into an employee
            // (groupName is a project there; classifying a project drill-down's
            // groups, which are employees, wouldn't make sense).
            if (type === 'employee' && !groupCategoryMap[groupName]) {
                const hrmsProjName = groupName.includes(' (') ? groupName.split(' (')[0].trim() : groupName;
                const proj = projectCategoryIndex[hrmsProjName.toLowerCase()];
                let category = 'Uncategorized';
                let subCategory = 'Uncategorized';
                if (proj?.category === 'Internal') {
                    category = 'Internal';
                    subCategory = resolveTaskSubCategory(proj, row);
                } else if (proj?.category === 'Client Project') {
                    category = 'Client Project';
                    const billingMap = empProjectBillingIndex[canonicalEmpName(name)];
                    const isBilling = billingMap ? billingMap[hrmsProjName.toLowerCase()] : undefined;
                    subCategory = isBilling === undefined ? 'Unallocated' : (isBilling ? 'Billable' : 'Non-billable');
                }
                groupCategoryMap[groupName] = { category, subCategory };
            }
            if (type === 'employee') {
                const { category, subCategory } = groupCategoryMap[groupName];
                const label = `${category} — ${subCategory}`;
                categoryTotals[label] = (categoryTotals[label] || 0) + hours;
            }
        });

        Object.values(logsByGroup).forEach(list => list.sort((a, b) => a.date.getTime() - b.date.getTime()));

        const periods = Object.keys(periodStartDates).sort((a, b) => periodStartDates[a] - periodStartDates[b]);
        const groupNames = Object.keys(groupPeriodMap).sort();
        const categoryPieData = Object.entries(categoryTotals)
            .map(([label, hours]) => ({ name: label, value: Number(hours.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
        const employeePieData = type === 'project'
            ? Object.entries(groupTotals)
                .map(([label, hours]) => ({ name: label, value: Number(hours.toFixed(2)) }))
                .sort((a, b) => b.value - a.value)
            : [];

        return {
            type, name, groupLabel, groupNames, groupPeriodMap, periods, logsByGroup,
            groupCategoryMap, categoryPieData, employeePieData,
            totalHours, entryCount: targetRows.length,
        };
    }, [drillDown, rawRows, periodType, projectCategoryIndex, empProjectBillingIndex, canonicalEmpName, projectNameMap]);

    const tableColumns = useMemo(() => {
        if (!allPeriods.length) return [];
        const source = viewMode === 'employee' ? employeeData : projectData;
        const nameFilters = [...new Set(source.map(r => r.name))].filter(Boolean).sort()
            .map(name => ({ text: name, value: name }));

        const base = [{
            title: viewMode === 'employee' ? 'Employee' : 'Project',
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 200,
            filters: nameFilters,
            filterSearch: true,
            onFilter: (value, record) => record.name === value,
            render: (text) => <b>{text}</b>
        }];

        if (viewMode === 'project') {
            const categoryFilters = [...new Set(source.map(r => r.category).filter(Boolean))].sort()
                .map(c => ({ text: c, value: c }));
            base.push({
                title: 'Category',
                dataIndex: 'category',
                key: 'category',
                width: 190,
                filters: categoryFilters,
                onFilter: (value, record) => record.category === value,
                render: (category, record) => category ? (
                    <>
                        <Tag color={category === 'Internal' ? 'purple' : 'blue'}>{category}</Tag>
                        {category === 'Internal' && record.subCategory && (
                            <div><small style={{ color: '#888' }}>{record.subCategory}</small></div>
                        )}
                    </>
                ) : <span style={{ color: '#ccc' }}>Uncategorized</span>
            });
        }

        allPeriods.forEach(p => {
            base.push({
                title: p,
                dataIndex: p,
                key: p,
                width: 140,
                align: 'right',
                render: (val, record) => {
                    const num = val || 0;
                    const content = val ? val.toFixed(2) : '-';
                    
                    let isLow = false;
                    let target = 40;
                    if (viewMode === 'employee') {
                        target = record.targetHours?.[p] ?? 40;
                        isLow = num < target;
                    } else if (viewMode === 'project' && record.allocation > 0) {
                        target = 40 * record.allocation;
                        isLow = num < target;
                    }

                    if (isLow) {
                        return (
                            <div title={`Expected: ${target.toFixed(2)} hrs`} style={{ background: '#ffe5e5', color: '#cf1322', padding: '2px 8px', borderRadius: 4, display: 'inline-block', minWidth: '50px', textAlign: 'center' }}>
                                {content}
                            </div>
                        );
                    }
                    return content;
                }
            });
        });

        if (viewMode === 'employee') {
            base.push({
                title: 'Holidays (days)',
                dataIndex: 'totalHolidays',
                key: 'totalHolidays',
                width: 100,
                align: 'right',
                render: val => val ? val : '-'
            });
            base.push({
                title: 'Leaves (days)',
                dataIndex: 'totalLeaves',
                key: 'totalLeaves',
                width: 100,
                align: 'right',
                render: val => val ? val : '-'
            });
        }

        base.push({
            title: 'Total (hrs)',
            dataIndex: 'Total',
            key: 'Total',
            fixed: 'right',
            width: 120,
            align: 'right',
            render: val => <b>{val.toFixed(2)}</b>,
            sorter: (a, b) => a.Total - b.Total
        });

        return base;
    }, [allPeriods, viewMode, employeeData, projectData]);

    // Build Chart Data for Recharts
    const chartData = useMemo(() => {
        const source = viewMode === 'employee' ? employeeData : projectData;
        const res = [];
        allPeriods.forEach(w => {
            const point = { name: w };
            source.forEach(entry => {
                if (entry[w]) {
                    point[entry.name] = entry[w];
                }
            });
            res.push(point);
        });
        return res;
    }, [employeeData, projectData, allPeriods, viewMode]);

    const CHART_COLORS = ['#5b8ff9', '#5ad8a6', '#5d7092', '#f6bd16', '#e8684a', '#6dc8ec', '#9270ca', '#ff9d4d', '#269a99', '#ff99c3'];

    // Category Breakdown view — an independent "View" mode (alongside
    // Employee/Project), not a display type, since it's a different
    // dimension (Client Project Billable/Non-billable vs Internal
    // sub-category) rather than another way of slicing employee/project data.
    const renderCategoryView = () => (
        <div style={{ padding: 24 }}>
            <Row gutter={[16, 12]} align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Space size={8}>
                        <span style={{ fontSize: 12, color: '#888' }}>Employee</span>
                        <Select
                            allowClear
                            showSearch
                            style={{ minWidth: 200 }}
                            placeholder="All employees"
                            value={categoryEmpFilter}
                            onChange={setCategoryEmpFilter}
                            options={employeeFilterOptions.map(n => ({ value: n, label: n }))}
                        />
                    </Space>
                </Col>
                <Col>
                    <Space size={8}>
                        <span style={{ fontSize: 12, color: '#888' }}>Project</span>
                        <Select
                            allowClear
                            showSearch
                            style={{ minWidth: 200 }}
                            placeholder="All projects"
                            value={categoryProjFilter}
                            onChange={setCategoryProjFilter}
                            options={projectFilterOptions.map(n => ({ value: n, label: n }))}
                        />
                    </Space>
                </Col>
            </Row>

            {categoryBreakdown.rows.length === 0 ? (
                <Empty description="No logged time for this selection" style={{ padding: 40 }} />
            ) : (
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={9}>
                        <div style={{ height: 280 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryBreakdown.pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={65}
                                        outerRadius={110}
                                        paddingAngle={1}
                                    >
                                        {categoryBreakdown.pieData.map((entry, idx) => (
                                            <Cell key={entry.name} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)} h`, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 12, color: '#888', margin: '-8px 0 10px' }}>
                            Total: <b style={{ color: '#333' }}>{categoryBreakdown.grandTotal.toFixed(1)} hrs</b> across selected range
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {categoryBreakdown.pieData.map((entry, idx) => (
                                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#555' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], flexShrink: 0 }} />
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                                    <span style={{ fontFamily: 'monospace', color: '#999' }}>
                                        {categoryBreakdown.grandTotal > 0 ? `${((entry.value / categoryBreakdown.grandTotal) * 100).toFixed(1)}%` : '0%'}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{entry.value.toFixed(1)}h</span>
                                </div>
                            ))}
                        </div>
                    </Col>
                    <Col xs={24} lg={15}>
                        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
                            🖱 Click a row to see employee/project-wise effort and the individual tasks behind it
                        </div>
                        <Table
                            size="small"
                            bordered
                            pagination={false}
                            rowKey="key"
                            scroll={{ x: 'max-content', y: 340 }}
                            dataSource={categoryBreakdown.rows}
                            onRow={(record) => ({
                                onClick: () => setCategoryDrillDown(record.key),
                                style: { cursor: 'pointer' },
                            })}
                            columns={[
                                {
                                    title: 'Category', dataIndex: 'category', key: 'category', width: 130,
                                    render: v => <Tag color={v === 'Internal' ? 'purple' : v === 'Client Project' ? 'blue' : 'default'}>{v}</Tag>
                                },
                                { title: 'Sub-category', dataIndex: 'subCategory', key: 'subCategory', width: 190 },
                                {
                                    title: 'Total (hrs)', dataIndex: 'total', key: 'total', width: 120, align: 'right',
                                    render: v => (
                                        <span>
                                            <b>{v.toFixed(2)}</b>
                                            {categoryBreakdown.grandTotal > 0 && (
                                                <span style={{ color: '#999', fontSize: 11, marginLeft: 6 }}>
                                                    ({((v / categoryBreakdown.grandTotal) * 100).toFixed(1)}%)
                                                </span>
                                            )}
                                        </span>
                                    ),
                                    sorter: (a, b) => a.total - b.total,
                                    defaultSortOrder: 'descend',
                                },
                            ]}
                        />
                    </Col>
                </Row>
            )}

            <Alert
                style={{ marginTop: 20 }}
                type="info"
                showIcon
                message="How categories are assigned"
                description="Client Project hours split into Billable / Non-billable based on that employee's own project allocation billing flag (no allocation found → Unallocated). Internal hours use the project's configured sub-category, overridden per-task where the project defines a task exception (e.g. a 'Leave' task counted under Leaves). Projects with no category configured show as Uncategorized — set one from Projects → Edit Project."
            />

            {/* Category row drill-down: employee × project matrix + individual tasks */}
            <Modal
                open={!!categoryDrillDown}
                onCancel={() => setCategoryDrillDown(null)}
                onOk={() => setCategoryDrillDown(null)}
                okText="Close"
                width={1200}
                styles={{ body: { maxHeight: '85vh', overflowY: 'auto' } }}
                style={{top: 20}}
                footer={null}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>
                            <PieChartOutlined style={{ color: '#722ed1', marginRight: 6 }} />
                            {categoryDrillDown}
                        </span>
                        {categoryDrillDownData && (
                            <>
                                <Tag color="blue" style={{ fontSize: 11 }}>{categoryDrillDownData.entryCount} log entries</Tag>
                                <Tag color="green" style={{ fontSize: 11 }}>{categoryDrillDownData.totalHours.toFixed(1)} hrs total</Tag>
                            </>
                        )}
                    </div>
                }
            >
                {categoryDrillDownData && (
                    categoryDrillDownData.tasks.length === 0 ? (
                        <Empty description="No logged time in this selection" style={{ padding: 24 }} />
                    ) : (
                        <>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 8 }}>
                                Employee × Project effort
                            </div>
                            <Table
                                size="small"
                                bordered
                                pagination={false}
                                rowKey="key"
                                style={{ marginBottom: 24 }}
                                scroll={{ x: 'max-content' }}
                                dataSource={categoryDrillDownData.matrixRows}
                                columns={[
                                    {
                                        title: 'Employee', dataIndex: 'employee', key: 'employee', fixed: 'left', width: 190,
                                        filters: categoryDrillDownData.matrixRows.map(r => ({ text: r.employee, value: r.employee })),
                                        filterSearch: true,
                                        onFilter: (value, record) => record.employee === value,
                                        render: v => <b style={{ fontSize: 12 }}>{v}</b>
                                    },
                                    ...categoryDrillDownData.projects.map(p => ({
                                        title: p, dataIndex: p, key: p, width: 150, align: 'right',
                                        filters: [{ text: p, value: p }],
                                        onFilter: (value, record) => (record[value] || 0) > 0,
                                        render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: v > 0 ? '#4f8ef7' : '#ccc' }}>{v ? v.toFixed(2) : '-'}</span>,
                                    })),
                                    {
                                        title: 'Total (hrs)', dataIndex: 'total', key: 'total', fixed: 'right', width: 110, align: 'right',
                                        render: v => <b style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.toFixed(2)}</b>,
                                        sorter: (a, b) => a.total - b.total,
                                    },
                                ]}
                            />

                            <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 8 }}>
                                Tasks
                            </div>
                            <Table
                                size="small"
                                bordered
                                pagination={{ pageSize: 10, size: 'small' }}
                                rowKey={(_, i) => i}
                                scroll={{ x: 'max-content' }}
                                dataSource={categoryDrillDownData.tasks}
                                columns={[
                                    { title: 'Date', dataIndex: 'date', key: 'date', width: 100,
                                        sorter: (a, b) => a.date.getTime() - b.date.getTime(),
                                        render: d => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{toISODate(d)}</span> },
                                    {
                                        title: 'Employee', dataIndex: 'empName', key: 'empName', width: 160,
                                        filters: [...new Set(categoryDrillDownData.tasks.map(t => t.empName))].sort().map(n => ({ text: n, value: n })),
                                        filterSearch: true,
                                        onFilter: (value, record) => record.empName === value,
                                        render: v => <span style={{ fontSize: 12 }}>{v}</span>
                                    },
                                    {
                                        title: 'Project', dataIndex: 'projName', key: 'projName', width: 160,
                                        filters: [...new Set(categoryDrillDownData.tasks.map(t => t.projName))].sort().map(n => ({ text: n, value: n })),
                                        filterSearch: true,
                                        onFilter: (value, record) => record.projName === value,
                                        render: v => <span style={{ fontSize: 12 }}>{v}</span>
                                    },
                                    { title: 'Key', dataIndex: 'key', key: 'key', width: 100,
                                        render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4f8ef7' }}>{v || '—'}</span> },
                                    { title: 'Task', dataIndex: 'title', key: 'title', width: 200, ellipsis: true,
                                        render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
                                    { title: 'State', dataIndex: 'state', key: 'state', width: 90,
                                        render: v => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : '—' },
                                    { title: 'Description', dataIndex: 'description', key: 'description',
                                        render: v => <span style={{ fontSize: 12, color: '#555' }}>{v || '—'}</span> },
                                    { title: 'Time (hrs)', dataIndex: 'hours', key: 'hours', width: 90, align: 'right',
                                        sorter: (a, b) => a.hours - b.hours,
                                        render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{v.toFixed(2)}</span> },
                                ]}
                            />
                        </>
                    )
                )}
            </Modal>
        </div>
    );

    const renderChart = () => {
        const data = viewMode === 'employee' ? employeeData : projectData;
        
        return (
            <div style={{ height: 600, width: '100%', padding: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data.slice(0, 15)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100}
                            interval={0}
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: -10 }} />
                        <Tooltip 
                            formatter={(value) => [`${Number(value).toFixed(2)} h`, '']}
                            cursor={{ fill: '#f5f5f5' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {allPeriods.map((p, idx) => (
                            <Bar 
                                key={p} 
                                dataKey={p} 
                                name={p}
                                stackId="a" 
                                fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                                maxBarSize={40}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const buildTimesheetWorkbook = () => {
        if (!employeeData.length) return null;

        const wb = XLSXStyle.utils.book_new();

        const buildSheet = (data, entityName) => {
            const rows = [];
            const header1 = [''];
            const header2 = [entityName === 'Employee' ? 'Employee Name' : 'Project Name'];
            
            allPeriods.forEach(p => {
                if (entityName === 'Employee') {
                    header1.push(p, '');
                    header2.push('Logged', 'Target');
                } else {
                    header1.push(p);
                    header2.push('');
                }
            });
            header1.push('Total');
            header2.push('(hrs)');
            rows.push(header1, header2);

            // Data
            data.forEach(item => {
                const row = [item.name];
                allPeriods.forEach(p => {
                    row.push(item[p] || 0);
                    if (entityName === 'Employee') row.push(item.targetHours?.[p] || 0);
                });
                row.push(item.Total || 0);
                rows.push(row);
            });

            // Add blank rows and notes
            for (let i = 0; i < 5; i++) rows.push([]);
            const notesStartRow = rows.length;
            rows.push(['Notes:']);
            
            const expectedBaseStr = periodType === 'week' ? "40" : "based on working days";
            const titleText = periodType === 'week' ? 'week' : 'month';
            rows.push([`• Base expectation per ${titleText} is ${expectedBaseStr} hours for full-time employees.`]);
            rows.push(['• Public holidays automatically deduct 8 hours from this expected target.']);
            rows.push(['• Approved leaves automatically deduct 8 hours from this expected target.']);
            rows.push(['• Cells are highlighted in red if logged hours fall below this dynamically calculated target.']);
            if (entityName === 'Project') {
                rows.push(['• Projects expect to have 40 hours × total FTE allocation logged per week.']);
            }

            if (entityName === 'Employee' && timesheetRange) {
                // Filter relevant holidays
                const relevantHols = holidays.filter(h => {
                    const t = new Date(h.dateStr).getTime();
                    return t >= timesheetRange.min && t <= timesheetRange.max;
                });
                if (relevantHols.length > 0) {
                    rows.push([]);
                    rows.push(['Public Holidays in Period:']);
                    relevantHols.forEach(h => rows.push([`• ${h.name} (${h.dateStr})`]));
                }

                // Filter relevant leaves
                const employeesWithLeaves = employeeData.filter(emp => emp.leaveDates && emp.leaveDates.length > 0);
                if (employeesWithLeaves.length > 0) {
                    rows.push([]);
                    rows.push(['Employee Leaves in Period:']);
                    employeesWithLeaves.forEach(emp => {
                        rows.push([`• ${emp.name}: ${emp.leaveDates.join(', ')}`]);
                    });
                }
            }

            const ws = XLSXStyle.utils.aoa_to_sheet(rows);

            // Style notes
            const noteHeaderRef = XLSXStyle.utils.encode_cell({ r: notesStartRow, c: 0 });
            if (ws[noteHeaderRef]) ws[noteHeaderRef].s = { font: { bold: true, color: { rgb: '333333' } } };
            
            for(let r = notesStartRow + 1; r < rows.length; r++) {
                const cellRef = XLSXStyle.utils.encode_cell({ r: r, c: 0 });
                const val = String(rows[r][0] || '');
                if (ws[cellRef]) {
                    if (val.endsWith(':')) {
                        ws[cellRef].s = { font: { bold: true, color: { rgb: '333333' } } };
                    } else if (val.startsWith('•')) {
                        ws[cellRef].s = { font: { italic: true, color: { rgb: '666666' } } };
                    }
                }
            }
            
            // Basic styling for header
            for(let i = 0; i < header1.length; i++) {
                [0, 1].forEach(r => {
                    const cellRef = XLSXStyle.utils.encode_cell({ r: r, c: i });
                    if (ws[cellRef]) {
                        ws[cellRef].s = {
                            font: { bold: true, color: { rgb: 'FFFFFF' } },
                            fill: { patternType: 'solid', fgColor: { rgb: '1F4E79' } },
                            alignment: { horizontal: 'center' }
                        };
                    }
                });
            }

            // Conditional styling
            if (entityName === 'Employee') {
                data.forEach((item, rIdx) => {
                    allPeriods.forEach((p, cIdx) => {
                        const val = item[p] || 0;
                        const target = item.targetHours?.[p] ?? 40;
                        if (val < target) {
                            // Column index for logged value is 1 + cIdx * 2
                            const cellRef = XLSXStyle.utils.encode_cell({ r: rIdx + 2, c: 1 + cIdx * 2 });
                            if (ws[cellRef]) {
                                ws[cellRef].s = {
                                    fill: { fgColor: { rgb: 'FFFFE6E6' } }, // light red
                                    font: { color: { rgb: 'FFCF1322' } }   // dark red text
                                };
                            }
                        }
                    });
                });
            } else if (entityName === 'Project') {
                data.forEach((item, rIdx) => {
                    if (item.allocation > 0) {
                        allPeriods.forEach((p, cIdx) => {
                            const val = item[p] || 0;
                            if (val < (40 * item.allocation)) {
                                const cellRef = XLSXStyle.utils.encode_cell({ r: rIdx + 2, c: cIdx + 1 });
                                if (ws[cellRef]) {
                                    ws[cellRef].s = {
                                        fill: { fgColor: { rgb: 'FFFFE6E6' } },
                                        font: { color: { rgb: 'FFCF1322' } }
                                    };
                                }
                            }
                        });
                    }
                });
            }

            // Column widths
            const colWidths = [
                { wch: 30 }
            ];
            allPeriods.forEach(() => {
                if (entityName === 'Employee') {
                    colWidths.push({ wch: 10 }, { wch: 10 }); // Logged, Target
                } else {
                    colWidths.push({ wch: 15 });
                }
            });
            colWidths.push({ wch: 15 }); // Total
            ws['!cols'] = colWidths;

            return ws;
        };

        XLSXStyle.utils.book_append_sheet(wb, buildSheet(employeeData, 'Employee'), 'Employee Weekly Time Log');
        XLSXStyle.utils.book_append_sheet(wb, buildSheet(projectData, 'Project'), 'Project Weekly Time Log');
        
        // Add Missing Logs sheet
        const missingRows = [['Employee', 'Missing Date', 'Reason']];
        employeeData.forEach(emp => {
            if (emp.missingLogs && emp.missingLogs.length > 0) {
                emp.missingLogs.forEach(d => {
                    missingRows.push([emp.name, d, 'No time log, leave or holiday found']);
                });
            }
        });
        if (missingRows.length > 1) {
            const missingWs = XLSXStyle.utils.aoa_to_sheet(missingRows);
            // style header
            for(let i=0; i<3; i++) {
                const cell = XLSXStyle.utils.encode_cell({r:0, c:i});
                if(missingWs[cell]) missingWs[cell].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '1F4E79' } } };
            }
            missingWs['!cols'] = [{wch: 30}, {wch: 15}, {wch: 40}];
            XLSXStyle.utils.book_append_sheet(wb, missingWs, 'Missing Time Logs');
        }

        // Add 3rd sheet with original data
        if (rawRows && rawRows.length > 0) {
            const rawWs = XLSXStyle.utils.json_to_sheet(rawRows);
            XLSXStyle.utils.book_append_sheet(wb, rawWs, 'Timesheet data');
        }

        return wb;
    };

    const handleDownload = () => {
        const wb = buildTimesheetWorkbook();
        if (!wb) return;

        const baseName = (fileName || 'timesheet').replace(/\.[^.]+$/, '');
        const today = new Date();
        const stamp = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
        XLSXStyle.writeFile(wb, `${baseName}_summary_${stamp}.xlsx`);
    };

    const handleCombinedDownload = () => {
        if (!effortsExportRef || !effortsExportRef.current) return;
        
        try {
            const effortsWb = effortsExportRef.current();
            const timesheetWb = buildTimesheetWorkbook();
            
            if (!effortsWb || !timesheetWb) return;

            const combinedWb = XLSXStyle.utils.book_new();
            
            // Append Efforts sheets first
            effortsWb.SheetNames.forEach(sheetName => {
                XLSXStyle.utils.book_append_sheet(combinedWb, effortsWb.Sheets[sheetName], sheetName);
            });

            // Append Timesheet sheets next
            timesheetWb.SheetNames.forEach(sheetName => {
                XLSXStyle.utils.book_append_sheet(combinedWb, timesheetWb.Sheets[sheetName], sheetName);
            });

            const baseName = 'Combined_Efforts_Timesheet';
            const today = new Date();
            const stamp = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
            XLSXStyle.writeFile(combinedWb, `${baseName}_summary_${stamp}.xlsx`);
            message.success("Combined report downloaded successfully");
        } catch (e) {
            console.error("Failed to generate combined report", e);
            message.error("Failed to generate combined report");
        }
    };

    if (initializing) {
        return (
            <div style={{ textAlign: 'center', padding: 80 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#888' }}>Loading saved timelog data…</div>
            </div>
        );
    }

    if (!hasSavedData || showUploadPanel) {
        return (
            <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
                {hasSavedData && (
                    <Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0, marginBottom: 12, fontSize: 13 }}
                        onClick={() => setShowUploadPanel(false)}>
                        Back to saved data
                    </Button>
                )}

                <Card
                    bordered={false}
                    style={{ borderRadius: 16, textAlign: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
                    bodyStyle={{ padding: '40px 40px 32px' }}
                >
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%', background: '#e6f4ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
                    }}>
                        <ClockCircleOutlined style={{ fontSize: 26, color: '#1890ff' }} />
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: '#1f1f1f' }}>Timesheet Analyser</div>
                    <p style={{ color: '#888', fontSize: 13, lineHeight: 1.7, margin: '10px auto 16px', maxWidth: 420 }}>
                        Upload a timesheet export to see week-wise effort logged per employee and per project.
                        Data is saved to the database, employee-wise per month — re-uploading a past sheet
                        safely updates existing entries instead of duplicating them.
                    </p>
                    <Popover content={<FormatInfoContent />} title="Expected Excel format" trigger="click" placement="bottom">
                        <Button
                            type="dashed"
                            size="small"
                            icon={<InfoCircleOutlined />}
                            style={{ marginBottom: 24, color: '#1890ff', borderColor: '#91caff' }}
                        >
                            What should the Excel file look like?
                        </Button>
                    </Popover>

                    {isHRorAdmin ? (
                        <Spin spinning={saving} tip="Saving to the database…">
                            <Upload.Dragger
                                accept=".xlsx,.xls"
                                beforeUpload={handleFile}
                                showUploadList={false}
                                disabled={saving}
                                style={{ background: '#fafbfc', borderRadius: 12, border: '1px dashed #d9e2ec', padding: '10px 0' }}
                            >
                                <p className="ant-upload-drag-icon" style={{ marginBottom: 6 }}>
                                    <UploadOutlined style={{ fontSize: 28, color: '#4f8ef7' }} />
                                </p>
                                <p className="ant-upload-text" style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                                    Click or drag file to this area to upload
                                </p>
                                <p className="ant-upload-hint" style={{ fontSize: 12, color: '#aaa', margin: 0 }}>
                                    Excel files only — .xlsx or .xls
                                </p>
                            </Upload.Dragger>
                        </Spin>
                    ) : (
                        <Alert
                            type="info"
                            showIcon
                            style={{ textAlign: 'left' }}
                            message="No timelog data available yet"
                            description="Uploading a timesheet export is restricted to HR/Admin. Please reach out to HR or an Admin to upload one."
                        />
                    )}

                    <div style={{ marginTop: 24, textAlign: 'left' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                            Required columns
                        </div>
                        <Space size={[6, 6]} wrap>
                            {REQUIRED_COLS.map(c => (
                                <Tag key={c} style={{ margin: 0, borderRadius: 4, fontSize: 12, color: '#555' }}>{c}</Tag>
                            ))}
                        </Space>
                    </div>

                    {importSummary && (
                        <Alert
                            style={{ marginTop: 24, textAlign: 'left', borderRadius: 10 }}
                            type="success"
                            showIcon
                            icon={<CheckCircleOutlined />}
                            message="Saved to the database"
                            description={
                                <div style={{ fontSize: 12, marginTop: 4 }}>
                                    {importSummary.map(g => (
                                        <div key={`${g.employeeName}-${g.month}`} style={{ marginBottom: 2 }}>
                                            <b>{g.employeeName}</b> ({g.month}): {g.totalEntries} total · {g.added} new · {g.changed.length} changed · {g.unchanged} unchanged
                                        </div>
                                    ))}
                                </div>
                            }
                        />
                    )}
                </Card>

                {/* Validation errors modal */}
                <Modal
                    open={!!validationErrors}
                    title={
                        <span style={{ color: '#cf1322', fontWeight: 700 }}>
                            ⚠ Validation Errors — {validationErrors?.fileName}
                        </span>
                    }
                    onOk={() => setValidationErrors(null)}
                    onCancel={() => setValidationErrors(null)}
                    okText="Close &amp; fix file"
                    cancelButtonProps={{ style: { display: 'none' } }}
                    width={660}
                    styles={{ body: { maxHeight: 460, overflowY: 'auto' } }}
                >
                    <p style={{ color: '#555', marginBottom: 12, fontSize: 13 }}>
                        Please fix the issues below in your Excel file and re-upload. All columns are required.
                    </p>

                    {validationErrors?.errors.some(e => e.type === 'missing_columns') && (
                        <Alert type="error" showIcon style={{ marginBottom: 10, borderRadius: 8 }}
                            message="Missing required columns"
                            description={validationErrors.errors
                                .filter(e => e.type === 'missing_columns')
                                .map(e => e.message).join('; ')}
                        />
                    )}

                    {validationErrors?.errors.some(e => e.type === 'empty_cell') && (<>
                        <Alert type="warning" showIcon style={{ marginBottom: 6, borderRadius: 8 }}
                            message={`${validationErrors.errors.filter(e => e.type === 'empty_cell').length} row(s) have empty cells`}
                        />
                        <Table size="small"
                            dataSource={validationErrors.errors.filter(e => e.type === 'empty_cell')}
                            rowKey="row"
                            pagination={{ pageSize: 8, size: 'small' }}
                            style={{ marginBottom: 12 }}
                            columns={[
                                { title: 'Excel Row', dataIndex: 'row', key: 'row', width: 90,
                                    render: v => <b style={{ color: '#cf1322' }}>Row {v}</b> },
                                { title: 'Empty Column(s)', dataIndex: 'message', key: 'message',
                                    render: v => <span style={{ fontSize: 12 }}>{v.replace(/^Row \d+: /, '')}</span> },
                            ]}
                        />
                    </>)}
                </Modal>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 8px' }}>
            {/* Toolbar — one card, two tiers, instead of a single crowded row */}
            <Card style={{ borderRadius: 12, marginBottom: 16 }}>
                {/* Tier 1: primary controls */}
                <Row gutter={[16, 12]} align="middle" justify="space-between">
                    <Col>
                        <Space size={24} wrap>
                            <Space size={8}>
                                <span style={{ fontSize: 12, color: '#888' }}>Date range</span>
                                <RangePicker
                                    value={dateRange}
                                    onChange={handleDateRangeChange}
                                    presets={getDateRangePresets()}
                                    allowClear={false}
                                    format="DD MMM YYYY"
                                />
                                {refreshing && <Spin size="small" />}
                            </Space>
                            <Space size={8}>
                                <span style={{ fontSize: 12, color: '#888' }}>View</span>
                                <Segmented value={viewMode} onChange={setViewMode}
                                    options={[
                                        { label: 'Category', value: 'category', icon: <PieChartOutlined /> },
                                        { label: 'Project', value: 'project' },
                                        { label: 'Employee', value: 'employee' },
                                    ]} />
                            </Space>
                            {viewMode !== 'category' && (
                                <Space size={8}>
                                    <span style={{ fontSize: 12, color: '#888' }}>Group by</span>
                                    <Segmented value={periodType} onChange={setPeriodType}
                                        options={[{ label: 'Week', value: 'week' }, { label: 'Month', value: 'month' }]} />
                                </Space>
                            )}
                        </Space>
                    </Col>
                    {viewMode !== 'category' && (
                        <Col>
                            <Segmented value={displayType} onChange={setDisplayType}
                                options={[
                                    { label: 'Table', value: 'table', icon: <TableOutlined /> },
                                    { label: 'Chart', value: 'chart', icon: <BarChartOutlined /> },
                                    { label: 'Missing Logs', value: 'gaps', icon: <WarningOutlined /> },
                                    { label: 'Trend', value: 'trend', icon: <LineChartOutlined /> },
                                ]} />
                        </Col>
                    )}
                </Row>

                <Divider style={{ margin: '14px 0' }} />

                {/* Tier 2: record count + actions */}
                <Row gutter={[12, 12]} align="middle" justify="space-between">
                    <Col>
                        <span style={{ fontSize: 12, color: '#888' }}>
                            {rawRows.length} log entries in this range · saved to the database, employee-wise per month
                        </span>
                    </Col>
                    <Col>
                        <Space size={8}>
                            {isHRorAdmin && hasEffortsData && (
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    onClick={handleCombinedDownload}
                                    style={{ background: '#1890ff', borderColor: '#1890ff' }}
                                >
                                    Download Combined Report
                                </Button>
                            )}
                            {isHRorAdmin && (
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleDownload}
                                >
                                    Download Summary
                                </Button>
                            )}
                            {isHRorAdmin && (
                                <Button
                                    icon={<UploadOutlined />}
                                    onClick={() => { setImportSummary(null); setShowUploadPanel(true); }}
                                >
                                    Upload New File
                                </Button>
                            )}
                            <Popover content={<FormatInfoContent />} title="Expected Excel format" trigger="click" placement="bottomRight">
                                <Button icon={<InfoCircleOutlined />}>
                                    File Format
                                </Button>
                            </Popover>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Weekly analytics — quick-info flags, always week-wise regardless
                of the page's Group By setting */}
            <Card
                size="small"
                style={{ borderRadius: 12, marginBottom: 16 }}
                title={<span style={{ fontWeight: 700, fontSize: 13, color: '#333' }}>Weekly Analytics</span>}
                extra={
                    <Space size={8}>
                        <span style={{ fontSize: 12, color: '#888' }}>Hide current (in-progress) week</span>
                        <Switch size="small" checked={hideCurrentWeek} onChange={setHideCurrentWeek} />
                    </Space>
                }
            >
                <WeeklyFlagPanel
                    title="Employee-weeks logged under 40 hours"
                    emptyText="No employee logged under 40 hours in any checked week."
                    color="#cf1322" bgColor="#fff1f0" borderColor="#ffccc7"
                    rows={under40HourWeeks}
                    columns={[
                        { title: 'Employee', dataIndex: 'employee', key: 'employee', width: 170,
                            render: v => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span> },
                        { title: 'Week', dataIndex: 'week', key: 'week', width: 160,
                            render: v => <span style={{ fontSize: 12 }}>{v}</span> },
                        { title: 'Logged (hrs)', dataIndex: 'hours', key: 'hours', width: 110, align: 'right',
                            render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.toFixed(1)}</span> },
                        { title: 'Shortfall (hrs)', dataIndex: 'deficit', key: 'deficit', width: 120, align: 'right',
                            render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#cf1322' }}>{v.toFixed(1)}</span> },
                    ]}
                />
                <WeeklyFlagPanel
                    title="Employee-project-weeks off their allocation"
                    emptyText="No employee logged under/over their weekly project allocation."
                    color="#fa8c16" bgColor="#fffbe6" borderColor="#ffe58f"
                    rows={allocationWeeks}
                    columns={[
                        { title: 'Employee', dataIndex: 'employee', key: 'employee', width: 170,
                            render: v => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span> },
                        { title: 'Week', dataIndex: 'week', key: 'week', width: 160,
                            render: v => <span style={{ fontSize: 12 }}>{v}</span> },
                        { title: 'Project', dataIndex: 'project', key: 'project', width: 180,
                            render: v => <span style={{ fontSize: 12 }}>{v}</span> },
                        { title: 'Logged (hrs)', dataIndex: 'hours', key: 'hours', width: 100, align: 'right',
                            render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.toFixed(1)}</span> },
                        { title: 'Allocated (hrs/wk)', dataIndex: 'targetHrs', key: 'targetHrs', width: 130, align: 'right',
                            render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#888' }}>{v.toFixed(1)}</span> },
                        { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
                            render: v => v === 'under'
                                ? <Tag color="warning" style={{ fontSize: 11 }}>Under</Tag>
                                : <Tag color="purple" style={{ fontSize: 11 }}>Over</Tag> },
                        { title: 'Δ (hrs)', dataIndex: 'delta', key: 'delta', width: 100, align: 'right',
                            render: v => (
                                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: v < 0 ? '#fa8c16' : '#722ed1' }}>
                                    {v > 0 ? '+' : ''}{v.toFixed(1)}
                                </span>
                            ) },
                    ]}
                />
            </Card>

            <Card
                bodyStyle={{ padding: 0 }}
                title={(viewMode !== 'category' && displayType === 'table') ? (
                    <span style={{ fontSize: 12, fontWeight: 400, color: '#aaa' }}>
                        🖱 Click a{viewMode === 'employee' ? 'n employee' : ' project'} row to see {viewMode === 'employee' ? 'their project-wise effort' : 'employee-wise effort'} and individual logs
                    </span>
                ) : null}
            >
                {viewMode === 'category' ? renderCategoryView() : displayType === 'table' ? (
                    <Table
                        columns={tableColumns}
                        dataSource={viewMode === 'employee' ? employeeData : projectData}
                        rowKey="name"
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 'max-content', y: 600 }}
                        size="small"
                        bordered
                        onRow={(record) => ({
                            onClick: () => setDrillDown({ type: viewMode, name: record.name }),
                            style: { cursor: 'pointer' },
                        })}
                    />
                ) : displayType === 'chart' ? (
                    <div style={{ height: 600, padding: 24 }}>
                        {chartData.length > 0 ? (
                            renderChart()
                        ) : (
                            <div style={{ textAlign: 'center', marginTop: 100 }}>No data for chart</div>
                        )}
                    </div>
                ) : displayType === 'trend' ? (
                    <div style={{ padding: 24 }}>
                        <Row gutter={[16, 12]} align="middle" style={{ marginBottom: 16 }}>
                            <Col>
                                <Space size={8}>
                                    <span style={{ fontSize: 12, color: '#888' }}>{viewMode === 'employee' ? 'Employee' : 'Project'}</span>
                                    <Select
                                        style={{ minWidth: 240 }}
                                        value={trendEntity}
                                        onChange={setTrendEntity}
                                        options={trendEntityOptions}
                                        showSearch
                                        optionFilterProp="label"
                                    />
                                </Space>
                            </Col>
                            <Col flex="auto" />
                            <Col>
                                <Space size={20} style={{ fontSize: 12, color: '#888' }}>
                                    <span>Backlog: <b style={{ color: '#333' }}>{trendData.totalBacklogHours.toFixed(1)} hrs</b></span>
                                    <span>Capacity: <b style={{ color: '#333' }}>{trendData.weeklyRate.toFixed(1)} hrs/wk</b></span>
                                    {trendData.totalBacklogHours > 0 && (
                                        <span>Est. clear in: <b style={{ color: '#fa8c16' }}>~{trendData.weeksToClear} wk{trendData.weeksToClear !== 1 ? 's' : ''}</b></span>
                                    )}
                                </Space>
                            </Col>
                        </Row>

                        {trendData.series.length ? (
                            <div style={{ height: 440 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData.series} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 11 }} />
                                        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: -10 }} />
                                        <Tooltip formatter={(v, name) => [v != null ? `${Number(v).toFixed(1)} h` : '-', name]} />
                                        <Legend />
                                        {trendData.lastLoggedWeek && (
                                            <ReferenceLine x={trendData.lastLoggedWeek} stroke="#bbb" strokeDasharray="3 3"
                                                label={{ value: 'Now', position: 'top', fontSize: 11, fill: '#999' }} />
                                        )}
                                        <Line type="monotone" dataKey="actual" name="Logged" stroke="#4f8ef7"
                                            strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                                        <Line type="monotone" dataKey="projected" name="Planned (projected)" stroke="#fa8c16"
                                            strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', marginTop: 100, color: '#999' }}>Not enough data to build a trend.</div>
                        )}

                        <Alert
                            style={{ marginTop: 16 }}
                            type="info"
                            showIcon
                            message="How this projection works"
                            description={`The solid line is what was actually logged, week by week. The dashed line spreads the remaining planned (not-yet-done) backlog forward at ${trendData.weeklyRate.toFixed(1)} hrs/week — this entity's own allocation-based capacity — starting the week after the last logged week, until the backlog is exhausted. It does not use each task's individual due date.`}
                        />
                    </div>
                ) : (
                    <div style={{ padding: 24 }}>
                        <Alert
                            message="Missing Time Logs Report"
                            description="Showing working days where no time log was found and employee was not on approved leave or public holiday."
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                        <Table 
                            size="small"
                            dataSource={employeeData.filter(e => e.missingLogs && e.missingLogs.length > 0)}
                            rowKey="name"
                            columns={[
                                { title: 'Employee', dataIndex: 'name', key: 'name', width: 200, render: v => <b>{v}</b> },
                                { 
                                    title: 'Missing Dates', 
                                    dataIndex: 'missingLogs', 
                                    key: 'missingLogs',
                                    render: (dates) => (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {dates.sort().map(d => <Tag key={d} color="orange">{d}</Tag>)}
                                        </div>
                                    )
                                },
                                { 
                                    title: 'Count', 
                                    dataIndex: 'missingLogs', 
                                    key: 'count', 
                                    width: 100, 
                                    align: 'right',
                                    render: v => <Badge count={v.length} style={{ backgroundColor: '#fa8c16' }} />,
                                    sorter: (a, b) => a.missingLogs.length - b.missingLogs.length
                                }
                            ]}
                            pagination={{ pageSize: 20 }}
                        />
                    </div>
                )}
            </Card>

            <div style={{ marginTop: 24, padding: 16, background: '#fafafa', border: '1px solid #eee', borderRadius: 6 }}>
                <b style={{ color: '#333' }}>Notes:</b>
                <ul style={{ margin: 0, paddingLeft: 20, marginTop: 8, color: '#666', fontSize: 13, lineHeight: '1.6' }}>
                    <li>Base expectation per week is 40 hours for full-time employees.</li>
                    <li>Public holidays automatically deduct 8 hours from this expected target.</li>
                    <li>Approved leaves automatically deduct 8 hours from this expected target.</li>
                    <li>Cells are highlighted in <span style={{ color: '#cf1322', fontWeight: 500 }}>red</span> if logged hours fall below this dynamically calculated target.</li>
                    <li>Projects expect to have 40 hours × total FTE allocation logged per week.</li>
                </ul>

                {timesheetRange && (
                    <div style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
                        {(() => {
                            const relevantHols = holidays.filter(h => {
                                const t = new Date(h.dateStr).getTime();
                                return t >= timesheetRange.min && t <= timesheetRange.max;
                            });
                            const titleText = periodType === 'week' ? 'week' : 'month';
                            const expectedBaseStr = periodType === 'week' ? "40" : "based on working days";
                            if (relevantHols.length > 0) {
                                return (
                                    <>
                                        <p style={{ margin: 0 }}>* Base expectation per {titleText} is {expectedBaseStr} hours for full-time employees. Target hours are automatically reduced by 8 hours for each holiday or approved privilege/sick leave day.</p>
                                        <p style={{ margin: '4px 0 0' }}>* Holidays accounted for in this dataset: <strong>{relevantHols.map(h => `${h.name} (${h.dateStr})`).join(', ')}</strong></p>
                                    </>
                                );
                            }
                            return <p style={{ margin: 0 }}>* Base expectation per {titleText} is {expectedBaseStr} hours for full-time employees. Target hours are automatically reduced by 8 hours for each holiday or approved privilege/sick leave day.</p>;
                        })()}

                        {(() => {
                            const employeesWithLeaves = employeeData.filter(emp => emp.leaveDates && emp.leaveDates.length > 0);
                            if (employeesWithLeaves.length > 0) {
                                return (
                                    <>
                                        <b style={{ color: '#333', display: 'block', marginTop: 12 }}>Employee Leaves in Period:</b>
                                        <ul style={{ margin: 0, paddingLeft: 20, marginTop: 4 }}>
                                            {employeesWithLeaves.map((emp, i) => (
                                                <li key={i}>{emp.name}: {emp.leaveDates.join(', ')}</li>
                                            ))}
                                        </ul>
                                    </>
                                );
                            }
                            return null;
                        })()}
                    </div>
                )}
            </div>

            {/* Employee drill-down: project-wise effort + individual logs */}
            <Modal
                open={!!drillDown}
                onCancel={() => setDrillDown(null)}
                onOk={() => setDrillDown(null)}
                okText="Close"
                cancelButtonProps={{ style: { display: 'none' } }}
                width={1200}
                styles={{ body: { maxHeight: '85vh', overflowY: 'auto' } }}
                style={{top: 20}}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>
                            {drillDown?.type === 'employee'
                                ? <UserOutlined style={{ color: '#722ed1', marginRight: 6 }} />
                                : <ProjectOutlined style={{ color: '#4f8ef7', marginRight: 6 }} />}
                            {drillDown?.name}
                        </span>
                        {drillDownData && (
                            <>
                                <Tag color="blue" style={{ fontSize: 11 }}>{drillDownData.entryCount} log entries</Tag>
                                <Tag color="green" style={{ fontSize: 11 }}>{drillDownData.totalHours.toFixed(1)} hrs total</Tag>
                            </>
                        )}
                    </div>
                }
                footer={null}
            >
                {drillDownData && (
                    <>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
                            Selected range: {dateRange?.[0]?.format('DD MMM YYYY')} – {dateRange?.[1]?.format('DD MMM YYYY')}
                            &nbsp;·&nbsp; {periodType === 'week' ? 'Week-wise' : 'Month-wise'}
                        </div>

                        {drillDownData.groupNames.length === 0 ? (
                            <Empty description="No logged time in this range" style={{ padding: 24 }} />
                        ) : (
                            <>
                                {(() => {
                                    const pieData = drillDownData.type === 'employee' ? drillDownData.categoryPieData : drillDownData.employeePieData;
                                    const pieTitle = drillDownData.type === 'employee' ? 'Time by category' : 'Time by employee';
                                    const hasPie = pieData.length > 0;
                                    return (
                                <Row gutter={[16, 16]}>
                                    {hasPie && (
                                        <Col xs={24} md={9}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 8 }}>
                                                {pieTitle}
                                            </div>
                                            <div style={{ height: 220 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            innerRadius={45}
                                                            outerRadius={80}
                                                            paddingAngle={1}
                                                        >
                                                            {pieData.map((entry, idx) => (
                                                                <Cell key={entry.name} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)} h`, name]} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, paddingBottom: 24, borderBottom: '1px solid #f0f0f0' }}>
                                                {pieData.map((entry, idx) => (
                                                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}>
                                                        <span style={{ width: 9, height: 9, borderRadius: 2, background: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], flexShrink: 0 }} />
                                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                                                        <span style={{ fontFamily: 'monospace', color: '#999' }}>
                                                            {drillDownData.totalHours > 0 ? `${((entry.value / drillDownData.totalHours) * 100).toFixed(1)}%` : '0%'}
                                                        </span>
                                                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{entry.value.toFixed(1)}h</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Col>
                                    )}
                                    <Col xs={24} md={hasPie ? 15 : 24}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 8 }}>
                                            {drillDownData.groupLabel}-wise effort
                                        </div>
                                        <Table
                                            size="small"
                                            bordered
                                            pagination={false}
                                            rowKey="group"
                                            style={{ marginBottom: 24 }}
                                            scroll={{ x: 'max-content', y: drillDownData.type === 'employee' ? 260 : undefined }}
                                            dataSource={drillDownData.groupNames.map(g => {
                                                const row = { group: g, total: 0, ...drillDownData.groupCategoryMap[g] };
                                                drillDownData.periods.forEach(period => {
                                                    const v = drillDownData.groupPeriodMap[g]?.[period] || 0;
                                                    row[period] = v;
                                                    row.total += v;
                                                });
                                                return row;
                                            })}
                                            columns={[
                                                { title: drillDownData.groupLabel, dataIndex: 'group', key: 'group', fixed: 'left', width: 200,
                                                    render: v => <b style={{ fontSize: 12 }}>{v}</b> },
                                                ...(drillDownData.type === 'employee' ? [{
                                                    title: 'Category', dataIndex: 'category', key: 'category', width: 190,
                                                    render: (category, record) => category ? (
                                                        <>
                                                            <Tag color={category === 'Internal' ? 'purple' : category === 'Client Project' ? 'blue' : 'default'} style={{ fontSize: 11 }}>{category}</Tag>
                                                            {category !== 'Uncategorized' && record.subCategory && (
                                                                <div><small style={{ color: '#888' }}>{record.subCategory}</small></div>
                                                            )}
                                                        </>
                                                    ) : '-'
                                                }] : []),
                                                ...drillDownData.periods.map(period => ({
                                                    title: period, dataIndex: period, key: period, width: 130, align: 'right',
                                                    render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: v > 0 ? '#4f8ef7' : '#ccc' }}>{v ? v.toFixed(1) : '-'}</span>,
                                                })),
                                                { title: 'Total (hrs)', dataIndex: 'total', key: 'total', fixed: 'right', width: 110, align: 'right',
                                                    render: v => <b style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.toFixed(1)}</b>,
                                                    sorter: (a, b) => a.total - b.total },
                                            ]}
                                        />
                                    </Col>
                                </Row>
                                    );
                                })()}

                                <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginTop: 20, marginBottom: 8 }}>
                                    Individual log entries
                                </div>
                                {drillDownData.groupNames.map(g => (
                                    <div key={g} style={{ marginBottom: 18 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                            {drillDownData.type === 'employee'
                                                ? <ProjectOutlined style={{ color: '#4f8ef7', fontSize: 12 }} />
                                                : <UserOutlined style={{ color: '#722ed1', fontSize: 12 }} />}
                                            <span style={{ fontWeight: 600, fontSize: 12, color: '#333' }}>{g}</span>
                                            <Tag style={{ fontSize: 11 }}>{drillDownData.logsByGroup[g].length} entries</Tag>
                                        </div>
                                        <Table
                                            size="small"
                                            pagination={{ pageSize: 5, size: 'small', showSizeChanger: false }}
                                            rowKey={(_, i) => i}
                                            scroll={{ x: 'max-content' }}
                                            dataSource={drillDownData.logsByGroup[g]}
                                            columns={[
                                                { title: 'Date', dataIndex: 'date', key: 'date', width: 100,
                                                    sorter: (a, b) => a.date.getTime() - b.date.getTime(),
                                                    render: d => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{toISODate(d)}</span> },
                                                { title: 'Key', dataIndex: 'key', key: 'key', width: 100,
                                                    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4f8ef7' }}>{v || '—'}</span> },
                                                { title: 'Task', dataIndex: 'title', key: 'title', width: 200, ellipsis: true,
                                                    render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
                                                { title: 'State', dataIndex: 'state', key: 'state', width: 90,
                                                    render: v => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : '—' },
                                                { title: 'Description', dataIndex: 'description', key: 'description',
                                                    render: v => <span style={{ fontSize: 12, color: '#555' }}>{v || '—'}</span> },
                                                { title: 'Time (hrs)', dataIndex: 'hours', key: 'hours', width: 90, align: 'right',
                                                    sorter: (a, b) => a.hours - b.hours,
                                                    render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{v.toFixed(2)}</span> },
                                            ]}
                                        />
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
};

export default TimesheetAnalyser;
