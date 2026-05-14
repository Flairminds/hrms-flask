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

const REQUIRED_COLS = ['Primary Assignee', 'Project', 'Time', 'Date'];

const TimesheetAnalyser = () => {
    const [rawRows, setRawRows] = useState([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [viewMode, setViewMode] = useState('employee'); // 'employee' or 'project'
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

    const { employeeData, projectData, allWeeks, timesheetRange } = useMemo(() => {
        if (!rawRows.length) return { employeeData: [], projectData: [], allWeeks: [], timesheetRange: null };

        const empMap = {};
        const projMap = {};
        const weekSet = new Set();
        const weekStartDates = {};
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
            
            const weekStr = getWeekRangeString(d);
            weekSet.add(weekStr);
            
            if (!weekStartDates[weekStr]) {
                const day = d.getDay() || 7;
                const start = new Date(d);
                start.setDate(d.getDate() - (day - 1));
                weekStartDates[weekStr] = start.getTime();
            }

            if (!empMap[empName]) empMap[empName] = { name: empName, targetHours: {} };
            empMap[empName][weekStr] = (empMap[empName][weekStr] || 0) + timeHrs;

            if (!projMap[projName]) projMap[projName] = { name: projName, rawName: projName };
            projMap[projName][weekStr] = (projMap[projName][weekStr] || 0) + timeHrs;
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
            
            Object.keys(weekStartDates).forEach(w => {
                const wStart = new Date(weekStartDates[w]);
                let holidaysCount = 0;
                let leavesCount = 0;
                let outOfBoundsCount = 0;
                
                // Iterate through Monday to Friday (5 days)
                for (let i = 0; i < 5; i++) {
                    const currentDay = new Date(wStart);
                    currentDay.setDate(wStart.getDate() + i);
                    const currentDayStr = fmtDate(currentDay);
                    const currentDayTime = currentDay.getTime();

                    // Check if the day is outside the bounds of the dataset
                    if (currentDayTime < minDatasetT || currentDayTime > maxDatasetT) {
                        outOfBoundsCount++;
                        continue;
                    }

                    // Check if it's a holiday
                    if (holidays.some(h => h.dateStr === currentDayStr)) {
                        holidaysCount++;
                        continue;
                    }
                    
                    // Check if employee is on leave
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
                    }
                }
                
                const deduction = (holidaysCount + leavesCount + outOfBoundsCount) * 8;
                emp.targetHours[w] = Math.max(0, 40 - deduction);
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

        // Sort weeks chronologically
        const sortedWeeks = Array.from(weekSet).sort((a, b) => weekStartDates[a] - weekStartDates[b]);

        const formatData = (map) => {
            return Object.values(map).map(item => {
                let total = 0;
                sortedWeeks.forEach(w => {
                    if (item[w]) item[w] = Number(item[w].toFixed(2));
                    total += (item[w] || 0);
                });
                item.Total = Number(total.toFixed(2));
                return item;
            }).sort((a, b) => b.Total - a.Total);
        };

        const allStarts = Object.values(weekStartDates);
        const minTime = actualMinTime !== Infinity ? actualMinTime : Math.min(...allStarts);
        const maxTime = actualMaxTime !== -Infinity ? actualMaxTime : Math.max(...allStarts) + 6 * 24 * 60 * 60 * 1000;

        return { 
            employeeData: formatData(empMap), 
            projectData: formatData(projMap), 
            allWeeks: sortedWeeks,
            timesheetRange: { min: minTime, max: maxTime }
        };
    }, [rawRows, hrmsProjects, leaves, holidays, allocations]);

    const tableColumns = useMemo(() => {
        if (!allWeeks.length) return [];
        const base = [{
            title: viewMode === 'employee' ? 'Employee' : 'Project',
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 250,
            sorter: (a, b) => a.name.localeCompare(b.name)
        }];
        
        allWeeks.forEach(w => {
            base.push({
                title: w,
                dataIndex: w,
                key: w,
                width: 140,
                align: 'right',
                render: (val, record) => {
                    const num = val || 0;
                    const content = val ? val.toFixed(2) : '-';
                    
                    let isLow = false;
                    let target = 40;
                    if (viewMode === 'employee') {
                        target = record.targetHours?.[w] ?? 40;
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
    }, [allWeeks, viewMode]);

    // Build Chart Data for Recharts
    // We want a structure like [{ name: 'Week 1', 'Employee A': 10, 'Employee B': 15 }]
    const chartData = useMemo(() => {
        const source = viewMode === 'employee' ? employeeData : projectData;
        const res = [];
        allWeeks.forEach(w => {
            const point = { week: w };
            source.forEach(entry => {
                if (entry[w]) {
                    point[entry.name] = entry[w];
                }
            });
            res.push(point);
        });
        return res;
    }, [employeeData, projectData, allWeeks, viewMode]);

    // Generate random but consistent colors for chart bars
    const getBarColor = (index) => {
        const colors = ['#5b8ff9', '#5ad8a6', '#5d7092', '#f6bd16', '#e8684a', '#6dc8ec', '#9270ca', '#ff9d4d', '#269a99', '#ff99c3'];
        return colors[index % colors.length];
    };

    const handleDownload = () => {
        if (!employeeData.length) return;

        const wb = XLSXStyle.utils.book_new();

        const buildSheet = (data, entityName) => {
            const rows = [];
            // Header
            const headers = entityName === 'Employee' 
                ? [entityName, ...allWeeks, 'Holidays (days)', 'Leaves (days)', 'Total (hrs)']
                : [entityName, ...allWeeks, 'Total (hrs)'];
            rows.push(headers);

            // Data
            data.forEach(item => {
                const row = [item.name];
                allWeeks.forEach(w => {
                    row.push(item[w] || 0);
                });
                if (entityName === 'Employee') {
                    row.push(item.totalHolidays || 0);
                    row.push(item.totalLeaves || 0);
                }
                row.push(item.Total || 0);
                rows.push(row);
            });

            // Add blank rows and notes
            for (let i = 0; i < 5; i++) rows.push([]);
            const notesStartRow = rows.length;
            rows.push(['Notes:']);
            rows.push(['• Base expectation per week is 40 hours for full-time employees.']);
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
            headers.forEach((h, i) => {
                const cellRef = XLSXStyle.utils.encode_cell({ r: 0, c: i });
                if (ws[cellRef]) {
                    ws[cellRef].s = {
                        font: { bold: true, color: { rgb: 'FFFFFF' } },
                        fill: { patternType: 'solid', fgColor: { rgb: '1F4E79' } },
                        alignment: { horizontal: 'center' }
                    };
                }
            });

            // Conditional styling
            if (entityName === 'Employee') {
                data.forEach((item, rIdx) => {
                    allWeeks.forEach((w, cIdx) => {
                        const val = item[w] || 0;
                        const target = item.targetHours?.[w] ?? 40;
                        if (val < target) {
                            const cellRef = XLSXStyle.utils.encode_cell({ r: rIdx + 1, c: cIdx + 1 });
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
                        allWeeks.forEach((w, cIdx) => {
                            const val = item[w] || 0;
                            if (val < (40 * item.allocation)) {
                                const cellRef = XLSXStyle.utils.encode_cell({ r: rIdx + 1, c: cIdx + 1 });
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
                { wch: 30 },
                ...allWeeks.map(() => ({ wch: 15 }))
            ];
            if (entityName === 'Employee') {
                colWidths.push({ wch: 15 }, { wch: 15 }); // Holidays and Leaves
            }
            colWidths.push({ wch: 15 }); // Total
            ws['!cols'] = colWidths;

            return ws;
        };

        XLSXStyle.utils.book_append_sheet(wb, buildSheet(employeeData, 'Employee'), 'By Employee');
        XLSXStyle.utils.book_append_sheet(wb, buildSheet(projectData, 'Project'), 'By Project');

        const baseName = (fileName || 'timesheet').replace(/\.[^.]+$/, '');
        const today = new Date();
        const stamp = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
        XLSXStyle.writeFile(wb, `${baseName}_summary_${stamp}.xlsx`);
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
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="week" angle={-45} textAnchor="end" height={60} />
                                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                                    <RechartsTooltip formatter={(value) => `${value.toFixed(2)} hrs`} />
                                    <Legend verticalAlign="top" height={36} />
                                    {(viewMode === 'employee' ? employeeData : projectData).map((entry, idx) => (
                                        <Bar key={entry.name} dataKey={entry.name} stackId="a" fill={getBarColor(idx)} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
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
                            if (relevantHols.length > 0) {
                                return (
                                    <>
                                        <b style={{ color: '#333', display: 'block', marginTop: 12 }}>Public Holidays in Period:</b>
                                        <ul style={{ margin: 0, paddingLeft: 20, marginTop: 4 }}>
                                            {relevantHols.map((h, i) => <li key={i}>{h.name} ({h.dateStr})</li>)}
                                        </ul>
                                    </>
                                );
                            }
                            return null;
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
