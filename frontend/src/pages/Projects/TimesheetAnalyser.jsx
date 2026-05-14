import React, { useState, useCallback, useMemo } from 'react';
import { Button, Upload, message, Table, Space, Row, Col, Card, Alert, Switch } from 'antd';
import { UploadOutlined, BarChartOutlined, TableOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import * as XLSXStyle from 'xlsx-js-style';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import Cookies from 'js-cookie';
import { getProjects, getLeaveTransactionsByApprover, holidayListData, getEmployeeAllocations } from '../../services/api';

// Mapping rules mirroring EffortsAnalyser
const PROJECT_NAME_MAP = {
    '2 OnPepper Leverage Modelling & Hummingbird': 'Onpepper',
    '2 BNYM': 'BNY-M',
    '2 XMPro 10': 'XMPS-2000',
    'Bridge Platform': 'Bridge Connect'
};

const resolveProjectName = (excelName) => {
    if (!excelName) return excelName;
    const key = Object.keys(PROJECT_NAME_MAP).find(
        k => k.toLowerCase().trim() === excelName.toLowerCase().trim()
    );
    return key ? `${PROJECT_NAME_MAP[key]} (${excelName})` : excelName;
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

const REQUIRED_COLS = ['Primary Assignee', 'Project', 'Time', 'Date'];

const TimesheetAnalyser = ({ effortsExportRef, hasEffortsData }) => {
    const [rawRows, setRawRows] = useState([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [viewMode, setViewMode] = useState('employee'); // 'employee' or 'project'
    const [periodType, setPeriodType] = useState('week'); // 'week' or 'month'
    const [displayType, setDisplayType] = useState('table'); // 'table' or 'chart'
    const [hrmsProjects, setHrmsProjects] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [allocations, setAllocations] = useState([]);

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

                const firstRow = json[0];
                const missing = REQUIRED_COLS.filter(c => !(c in firstRow));
                if (missing.length > 0) {
                    message.error(`Missing required columns: ${missing.join(', ')}`);
                    return;
                }

                setFileName(file.name);
                setRawRows(json);
            } catch (err) {
                console.error(err);
                message.error('Failed to parse file.');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    }, []);

    const { employeeData, projectData, allPeriods, timesheetRange } = useMemo(() => {
        if (!rawRows.length) return { employeeData: [], projectData: [], allPeriods: [], timesheetRange: null };

        const empMap = {};
        const projMap = {};
        const periodSet = new Set();
        const periodStartDates = {};
        let actualMinTime = Infinity;
        let actualMaxTime = -Infinity;

        rawRows.forEach(row => {
            const rawEmp = row['Primary Assignee'];
            const rawProj = row['Project'];
            const rawTime = row['Time'];
            const rawDate = row['Date'];

            if (!rawEmp || !rawDate) return;

            const empName = resolveEmployeeName(String(rawEmp).trim());
            const projName = resolveProjectName(rawProj ? String(rawProj).trim() : 'Unknown Project');
            
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

            if (!empMap[empName]) empMap[empName] = { name: empName, targetHours: {} };
            empMap[empName][periodStr] = (empMap[empName][periodStr] || 0) + timeHrs;

            if (!projMap[projName]) projMap[projName] = { name: projName, rawName: projName };
            projMap[projName][periodStr] = (projMap[projName][periodStr] || 0) + timeHrs;
        });

        // Add all employees from HRMS who have active project allocations
        allocations.forEach(alloc => {
            if (alloc.projects && alloc.projects.length > 0) {
                const empName = resolveEmployeeName(alloc.employee_name);
                if (!empMap[empName]) empMap[empName] = { name: empName, targetHours: {} };
            }
        });

        // Calculate dynamic weekly targets for each employee
        const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        const minDatasetTime = new Date(actualMinTime);
        minDatasetTime.setHours(0, 0, 0, 0);
        const minDatasetT = minDatasetTime.getTime();
        
        const maxDatasetTime = new Date(actualMaxTime);
        maxDatasetTime.setHours(23, 59, 59, 999);
        const maxDatasetT = maxDatasetTime.getTime();

        Object.values(empMap).forEach(emp => {
            // Find all leaves for this employee
            const empLeaves = leaves.filter(l => {
                const name = l.EmployeeName || l.employeeName || l.appliedByName || l.applied_by_name || '';
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

        const allStarts = Object.values(periodStartDates);
        const minTime = actualMinTime !== Infinity ? actualMinTime : Math.min(...allStarts);
        const maxTime = actualMaxTime !== -Infinity ? actualMaxTime : Math.max(...allStarts) + 6 * 24 * 60 * 60 * 1000;

        return { 
            employeeData: formatData(empMap), 
            projectData: formatData(projMap), 
            allPeriods: sortedPeriods,
            timesheetRange: { min: minTime, max: maxTime }
        };
    }, [rawRows, hrmsProjects, leaves, holidays, allocations, periodType]);

    const tableColumns = useMemo(() => {
        if (!allPeriods.length) return [];
        const base = [{
            title: viewMode === 'employee' ? 'Employee' : 'Project',
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 200,
            render: (text) => <b>{text}</b>
        }];

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
    }, [allPeriods, viewMode]);

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

    if (rawRows.length === 0) {
        return (
            <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
                <Alert
                    message="Timesheet Analyser"
                    description="Upload your timesheet export to see week-wise efforts logged per employee and per project."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24, textAlign: 'left' }}
                />
                <Upload.Dragger
                    accept=".csv, .xlsx, .xls"
                    beforeUpload={handleFile}
                    showUploadList={false}
                >
                    <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                    <p className="ant-upload-hint">Ensure columns include Primary Assignee, Project, Time, and Date.</p>
                </Upload.Dragger>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 8px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Space size="large">
                        <Space>
                            <b>Group By:</b>
                            <Switch 
                                checkedChildren="Month" 
                                unCheckedChildren="Week" 
                                checked={periodType === 'month'} 
                                onChange={v => setPeriodType(v ? 'month' : 'week')}
                            />
                        </Space>
                        <Space>
                            <b>View:</b>
                            <Switch 
                                checkedChildren="Project" 
                                unCheckedChildren="Employee" 
                                checked={viewMode === 'project'} 
                                onChange={v => setViewMode(v ? 'project' : 'employee')}
                            />
                        </Space>
                        <Space>
                            <b>Display:</b>
                            <Button.Group>
                                <Button 
                                    type={displayType === 'table' ? 'primary' : 'default'} 
                                    icon={<TableOutlined />} 
                                    onClick={() => setDisplayType('table')}
                                >
                                    Table
                                </Button>
                                <Button 
                                    type={displayType === 'chart' ? 'primary' : 'default'} 
                                    icon={<BarChartOutlined />} 
                                    onClick={() => setDisplayType('chart')}
                                >
                                    Chart
                                </Button>
                            </Button.Group>
                        </Space>
                    </Space>
                </Col>
                <Col>
                    <Space>
                        <span style={{ color: '#888' }}>{fileName}</span>
                        {hasEffortsData && (
                            <Button 
                                type="primary"
                                icon={<DownloadOutlined />} 
                                onClick={handleCombinedDownload}
                                style={{ background: '#1890ff', borderColor: '#1890ff' }}
                            >
                                Download Combined Report
                            </Button>
                        )}
                        <Button 
                            type="primary"
                            icon={<DownloadOutlined />} 
                            onClick={handleDownload}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        >
                            Download Summary
                        </Button>
                        <Button 
                            icon={<UploadOutlined />} 
                            onClick={() => { setRawRows([]); setFileName(''); }}
                        >
                            Upload Another
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Card bodyStyle={{ padding: 0 }}>
                {displayType === 'table' ? (
                    <Table
                        columns={tableColumns}
                        dataSource={viewMode === 'employee' ? employeeData : projectData}
                        rowKey="name"
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 'max-content', y: 600 }}
                        size="small"
                        bordered
                    />
                ) : (
                    <div style={{ height: 600, padding: 24 }}>
                        {chartData.length > 0 ? (
                            renderChart()
                        ) : (
                            <div style={{ textAlign: 'center', marginTop: 100 }}>No data for chart</div>
                        )}
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
        </div>
    );
};

export default TimesheetAnalyser;
