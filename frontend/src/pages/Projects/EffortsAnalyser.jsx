import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Card, Tabs, Upload, Button, Radio, message, Empty, Spin,
    Row, Col, Statistic, Tag, Table, Input, Badge, Modal, Alert, Select
} from 'antd';
import {
    InboxOutlined, UploadOutlined, DownloadOutlined,
    TeamOutlined, ProjectOutlined, ClockCircleOutlined, CheckCircleOutlined, WarningOutlined
} from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, LabelList
} from 'recharts';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { getEmployeeAllocations, getProjects } from '../../services/api';

const { Dragger } = Upload;
const { TabPane } = Tabs;

// ── constants ──────────────────────────────────────────────────────────────
const DONE_STATES = ['done', 'completed', 'complete', 'closed', 'resolved', 'canceled'];

// No greens in this palette — green is reserved for "Planned Remaining" bars
const PERIOD_COLORS = [
    '#4f8ef7', // blue
    '#fa8c16', // orange
    '#722ed1', // purple
    '#f5222d', // red
    '#13c2c2', // cyan
    '#eb2f96', // pink
    '#faad14', // gold
    '#096dd9', // deep blue
    '#d4380d', // vermillion
    '#08979c', // teal
    '#9e1068', // magenta
    '#d46b08', // amber
    '#531dab', // dark purple
    '#006d75', // dark teal
    '#d4b106', // dark gold
];

// ── Project name mapping ───────────────────────────────────────────────────
// Maps Excel project names → HRMS project names.
// Keys   = exact project name as it appears in the Excel sheet (case-insensitive match).
// Values = exact project name as it appears in HRMS.
// Add one entry per mismatched project. Leave empty ({}) if names already match.
const PROJECT_NAME_MAP = {
    // 'Excel Project Name':  'HRMS Project Name',
    // 'ClientX Portal':      'Client X Portal',
    // 'website-redesign':    'Website Redesign',
    '2 OnPepper Leverage Modelling & Hummingbird': 'Onpepper',
    '2 BNYM': 'BNY-M',
    '2 XMPro 10': 'XMPS-2000',
    'Bridge Platform': 'Bridge Connect'
};

// Resolves an Excel project name to its HRMS equivalent (or returns it unchanged).
const resolveProjectName = (excelName) => {
    if (!excelName) return excelName;
    const key = Object.keys(PROJECT_NAME_MAP).find(
        k => k.toLowerCase().trim() === excelName.toLowerCase().trim()
    );
    return key ? PROJECT_NAME_MAP[key] : excelName;
};

// ── Employee name mapping ───────────────────────────────────────────────────
// Maps Excel assignee names → HRMS employee names.
// Keys   = exact name as it appears in the "Primary Assignee" column (case-insensitive).
// Values = exact employee name as it appears in HRMS.
const EMPLOYEE_NAME_MAP = {
    // 'Excel Name':   'HRMS Name',
    // 'J. Smith':     'John Smith',
};

// Resolves an Excel assignee name to its HRMS equivalent (or returns it unchanged).
const resolveEmployeeName = (excelName) => {
    if (!excelName) return excelName;
    const key = Object.keys(EMPLOYEE_NAME_MAP).find(
        k => k.toLowerCase().trim() === excelName.toLowerCase().trim()
    );
    return key ? EMPLOYEE_NAME_MAP[key] : excelName;
};

// ── date helpers ───────────────────────────────────────────────────────────
const parseExcelDate = (val) => {
    if (!val && val !== 0) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === 'string') {
        const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        const d = new Date(val.trim());
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
};

const pad = n => String(n).padStart(2, '0');

const fmtDate = (d) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime()))
        return <span style={{ color: '#f5222d', fontSize: 11 }}>⚠ invalid</span>;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getWeekLabel = (date) => {
    const d = new Date(date);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `W${pad(weekNum)}-${d.getFullYear()}`;
};

const getMonthLabel = (date) => {
    const d = new Date(date);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${M[d.getMonth()]}-${d.getFullYear()}`;
};

const sortPeriods = (periods) =>
    [...periods].sort((a, b) => {
        const parse = (p) => {
            const wm = p.match(/^W(\d+)-(\d+)$/);
            if (wm) return parseInt(wm[2]) * 100 + parseInt(wm[1]);
            const mm = p.match(/^(\w{3})-(\d+)$/);
            if (mm) {
                const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return parseInt(mm[2]) * 100 + M.indexOf(mm[1]);
            }
            return 0;
        };
        return parse(a) - parse(b);
    });

const isDone = (state) => DONE_STATES.includes(String(state).toLowerCase().trim());

// ── custom tooltip ─────────────────────────────────────────────────────────
// chartData is passed via closure from GroupedBarChart so we can read pct fields directly
const makeTooltip = (chartData, periods) => ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    // Find the data row for this label
    const row = chartData.find(d => d.name === label) || {};

    const pctBadge = (pct) => {
        if (pct === null || pct === undefined) return null;
        const color = pct >= 90 ? '#52c41a' : pct >= 60 ? '#faad14' : '#f5222d';
        return <span style={{ marginLeft: 6, fontWeight: 700, color, fontSize: 11 }}>({pct}%)</span>;
    };

    // Build period entries from the actual data row
    const entries = periods.map((period, idx) => ({
        period,
        color: PERIOD_COLORS[idx % PERIOD_COLORS.length],
        done:       row[`${period}__done`]       || 0,
        planned:    row[`${period}__planned`]    || 0,
        allocated:  row[`${period}__allocated`]  || 0,
        donePct:    row[`${period}__donePct`]    ?? null,
        plannedPct: row[`${period}__plannedPct`] ?? null,
        totalPct:   row[`${period}__totalPct`]   ?? null,
        efficiency: row[`${period}__efficiency`] ?? null,
    })).filter(e => e.done > 0 || e.planned > 0);

    const grandTotal = entries.reduce((s, e) => s + e.done + e.planned, 0);

    return (
        <div style={{
            background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8,
            padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 12, minWidth: 230,
        }}>
            <p style={{ fontWeight: 700, color: '#222', fontSize: 13, marginBottom: 8,
                borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>{label}</p>
            {entries.map(e => (
                <div key={e.period} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: e.color, display: 'inline-block' }} />
                        <b style={{ color: '#333', fontSize: 12 }}>{e.period}</b>
                        {e.allocated > 0 && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888' }}>
                                Alloc: {e.allocated.toFixed(1)} hrs
                            </span>
                        )}
                    </div>
                    <div style={{ paddingLeft: 16, color: '#555', fontSize: 11, lineHeight: 2 }}>
                        <div>
                            <span style={{ color: e.color }}>▊ Done: {e.done.toFixed(1)} hrs</span>
                            {pctBadge(e.donePct)}
                        </div>
                        <div>
                            <span style={{ color: '#52c41a' }}>▊ Planned: {e.planned.toFixed(1)} hrs</span>
                            {pctBadge(e.plannedPct)}
                        </div>
                        {e.allocated > 0 && e.totalPct !== null && (
                            <div style={{ marginTop: 2, paddingTop: 2, borderTop: '1px dashed #f0f0f0' }}>
                                <span style={{ color: '#666' }}>Total vs Allocation: </span>
                                {pctBadge(e.totalPct)}
                            </div>
                        )}
                        {e.efficiency !== null && (
                            <div style={{ marginTop: 2, color: e.efficiency >= 100 ? '#52c41a' : '#d46b08' }}>
                                <ClockCircleOutlined style={{ fontSize: 10, marginRight: 4 }} />
                                <span>Efficiency: </span>
                                <b style={{ fontWeight: 700 }}>{e.efficiency}%</b>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {entries.length > 1 && (
                <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 4, paddingTop: 6,
                    display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Grand Total</span>
                    <b style={{ color: '#4f8ef7' }}>{grandTotal.toFixed(1)} hrs</b>
                </div>
            )}
        </div>
    );
};

// ── Raw Data table ─────────────────────────────────────────────────────────
const RawDataTable = ({ rows }) => {
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);

    const filtered = useMemo(() => {
        let data = showAll ? rows : rows.filter(r => isDone(r.state));
        if (search) {
            const q = search.toLowerCase();
            data = data.filter(r =>
                r.assignee.toLowerCase().includes(q) ||
                r.project.toLowerCase().includes(q) ||
                r.task.toLowerCase().includes(q)
            );
        }
        return data;
    }, [rows, search, showAll]);

    const columns = [
        { title: '#', key: 'idx', width: 44, render: (_, __, i) => <span style={{ color: '#bbb', fontSize: 11 }}>{i + 1}</span> },
        { title: 'Assignee', dataIndex: 'assignee', key: 'assignee', width: 140, sorter: (a, b) => a.assignee.localeCompare(b.assignee), render: v => <b style={{ fontSize: 12 }}>{v}</b> },
        { title: 'Project', dataIndex: 'project', key: 'project', width: 160, sorter: (a, b) => a.project.localeCompare(b.project) },
        {
            title: 'State', dataIndex: 'state', key: 'state', width: 110,
            render: v => <Tag color={isDone(v) ? 'green' : 'default'} style={{ fontSize: 11 }}>{v || '—'}</Tag>,
        },
        { title: 'Task', dataIndex: 'task', key: 'task', ellipsis: true, width: 200, render: v => <span style={{ fontSize: 11, color: '#555' }}>{v || '—'}</span> },
        {
            title: 'Start Date', dataIndex: 'startDate', key: 'startDate', width: 108,
            sorter: (a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0),
            render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtDate(v)}</span>,
        },
        {
            title: 'End Date', dataIndex: 'endDate', key: 'endDate', width: 108,
            defaultSortOrder: 'ascend',
            sorter: (a, b) => (a.endDate?.getTime() ?? 0) - (b.endDate?.getTime() ?? 0),
            render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmtDate(v)}</span>,
        },
        {
            title: 'Estimate', dataIndex: 'estimateEffort', key: 'estimateEffort', width: 90,
            sorter: (a, b) => a.estimateEffort - b.estimateEffort,
            render: v => <span style={{ fontFamily: 'monospace' }}>{v?.toFixed(1)}</span>,
        },
        {
            title: 'Logged (hrs)', dataIndex: 'loggedTime', key: 'loggedTime', width: 105,
            sorter: (a, b) => a.loggedTime - b.loggedTime,
            render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: v > 0 ? '#4f8ef7' : '#ccc' }}>{v?.toFixed(1)}</span>,
        },
        {
            title: 'Eff (%)', key: 'efficiency', width: 80,
            render: (_, r) => {
                if (!isDone(r.state) || r.loggedTime <= 0) return <span style={{ color: '#ccc' }}>—</span>;
                const eff = Math.round((r.estimateEffort / r.loggedTime) * 100);
                const color = eff >= 100 ? '#52c41a' : eff >= 80 ? '#faad14' : '#f5222d';
                return <span style={{ fontFamily: 'monospace', fontWeight: 700, color }}>{eff}%</span>;
            },
        },
    ];

    const doneCount = rows.filter(r => isDone(r.state)).length;

    return (
        <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
            title={
                <Row align="middle" gutter={12}>
                    <Col flex="auto">
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#333' }}>Raw Data</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
                            — verify parsed dates &amp; values
                        </span>
                        <Badge count={`${doneCount} completed`} style={{ background: '#52c41a', marginLeft: 10, fontSize: 11 }} />
                        <Badge count={`${rows.length - doneCount} other`} style={{ background: '#d9d9d9', color: '#666', marginLeft: 6, fontSize: 11 }} />
                    </Col>
                    <Col>
                        <Button size="small" type={showAll ? 'primary' : 'default'}
                            onClick={() => setShowAll(v => !v)}>
                            {showAll ? 'Showing all' : 'Showing completed only'}
                        </Button>
                    </Col>
                    <Col>
                        <Input.Search placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                            allowClear size="small" style={{ width: 220 }} />
                    </Col>
                </Row>
            }>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                {filtered.length} rows shown.
            </div>
            <Table columns={columns} dataSource={filtered} rowKey={(_, i) => i}
                size="small" pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
                scroll={{ x: 'max-content' }}
                rowClassName={r => isDone(r.state) ? '' : 'ant-table-row-disabled'}
            />
        </Card>
    );
};

// Custom X-axis tick: truncates long names, shows full name on hover via SVG title
const CustomXTick = ({ x, y, payload }) => {
    const MAX_CHARS = 50;
    const full = payload?.value || '';
    const label = full.length > MAX_CHARS ? full.slice(0, MAX_CHARS - 1) + '…' : full;
    return (
        <g transform={`translate(${x},${y})`}>
            <title>{full}</title>
            <text
                transform="rotate(-30)"
                x={0} y={0} dy={4}
                textAnchor="end"
                fill="#555"
                fontSize={11}
            >
                {label}
            </text>
        </g>
    );
};

// ── Health checks modal ──────────────────────────────────────────────────────────────────
const runHealthChecks = (rows, allocationMap, projectAllocMap) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overHours        = [];  // rule 1: estimate or logged > 40 hrs
    const loggedOverEst    = [];  // rule 2: logged > estimated
    const overdueOpen      = [];  // rule 3: past end date but not done
    const noAssignee       = [];  // rule 4: assignee is None / empty
    const noEstimateOpen   = [];  // rule 5: not done and no estimate

    rows.forEach((r, i) => {
        const rowNum = i + 2;
        if (r.estimateEffort > 40 || r.loggedTime > 40) {
            overHours.push({ ...r, rowNum,
                issue: `Estimate: ${r.estimateEffort.toFixed(2)} hrs, Logged: ${r.loggedTime.toFixed(2)} hrs` });
        }
        if (r.loggedTime > 0 && r.estimateEffort > 0 && r.loggedTime > r.estimateEffort) {
            loggedOverEst.push({ ...r, rowNum,
                issue: `Logged ${r.loggedTime.toFixed(2)} hrs > Estimate ${r.estimateEffort.toFixed(2)} hrs` });
        }
        if (r.endDate && r.endDate < today && !isDone(r.state)) {
            overdueOpen.push({ ...r, rowNum,
                issue: `End date ${fmtDate(r.endDate)} is past, state is "${r.state}"` });
        }
        // Rule 4: primary assignee is None / blank
        const assigneeStr = String(r.assignee || '').trim().toLowerCase();
        if (!assigneeStr || assigneeStr === 'none') {
            noAssignee.push({ ...r, rowNum, issue: 'Primary Assignee is None or empty' });
        }
        // Rule 5: task is not done and has no estimate
        if (!isDone(r.state) && (!r.estimateEffort || r.estimateEffort <= 0)) {
            noEstimateOpen.push({ ...r, rowNum,
                issue: `State is "${r.state}" but Estimate Effort is 0 or missing` });
        }
    });

    // ── Rule 6: project remaining < 25% of project-level total allocation ───────
    // "remaining" = sum of estimateEffort for non-done tasks on that project
    // "total allocation" = project FTE × 40 hrs × WEEKS_PER_MONTH (from Projects module)
    const lowRemainingProjects = [];
    const projects = [...new Set(rows.map(r => r.project))];
    const WEEKS_PER_MONTH = 4.33;

    projects.forEach(proj => {
        const projRows = rows.filter(r => r.project === proj);
        const remaining = projRows
            .filter(r => !isDone(r.state))
            .reduce((s, r) => s + r.estimateEffort, 0);

        // Look up project-level FTE from HRMS Projects module
        const hrmsProj = resolveProjectName(proj).toLowerCase().trim();
        const fte = projectAllocMap?.[hrmsProj] ?? null;
        if (fte === null || fte <= 0) return; // no allocation data, skip
        const totalAlloc = fte * 40 * WEEKS_PER_MONTH;

        if (remaining < totalAlloc * 0.25) {
            lowRemainingProjects.push({
                project: proj,
                remaining: remaining.toFixed(2),
                totalAlloc: totalAlloc.toFixed(2),
                pct: Math.round(remaining / totalAlloc * 100),
                issue: `Remaining ${remaining.toFixed(2)} hrs is ${Math.round(remaining / totalAlloc * 100)}% of allocation ${totalAlloc.toFixed(2)} hrs (FTE: ${fte.toFixed(2)}, threshold: 25%)`,
            });
        }
    });

    // ── Mapping diagnostics: find Excel names with no HRMS allocation match ─────
    const excelProjects  = [...new Set(rows.map(r => r.project))].sort();
    const excelEmployees = [...new Set(rows.map(r => r.assignee))].sort();

    const hrmsEmployeeKeys = new Set(Object.keys(allocationMap));
    const hrmsProjKeys     = new Set(
        Object.values(allocationMap).flatMap(projMap => Object.keys(projMap))
    );

    const unmappedProjects = excelProjects.filter(p => {
        const resolved = resolveProjectName(p).toLowerCase().trim();
        return !hrmsProjKeys.has(resolved);
    });

    const unmappedEmployees = excelEmployees.filter(e => {
        const resolved = resolveEmployeeName(e).toLowerCase().trim();
        return !hrmsEmployeeKeys.has(resolved);
    });

    return {
        overHours, loggedOverEst, overdueOpen,
        noAssignee, noEstimateOpen, lowRemainingProjects,
        unmappedProjects, unmappedEmployees,
    };
};

const CHECK_COLUMNS = [
    { title: 'Row', dataIndex: 'rowNum', key: 'rowNum', width: 60,
        render: v => <span style={{ color: '#fa8c16', fontWeight: 700, fontSize: 11 }}>#{v}</span> },
    { title: 'Assignee', dataIndex: 'assignee', key: 'assignee', width: 130,
        render: v => <b style={{ fontSize: 12 }}>{v}</b> },
    { title: 'Project', dataIndex: 'project', key: 'project', width: 140,
        ellipsis: true, render: v => <span style={{ fontSize: 11 }}>{v}</span> },
    { title: 'Task', dataIndex: 'task', key: 'task', ellipsis: true,
        render: v => <span style={{ fontSize: 11, color: '#555' }}>{v || '—'}</span> },
    { title: 'Issue', dataIndex: 'issue', key: 'issue',
        render: v => <span style={{ fontSize: 11, color: '#cf1322' }}>{v}</span> },
];

const HealthChecksModal = ({ checks, onClose }) => {
    if (!checks) return null;
    const {
        overHours, loggedOverEst, overdueOpen,
        noAssignee, noEstimateOpen, lowRemainingProjects,
        unmappedProjects, unmappedEmployees,
    } = checks;
    const total = overHours.length + loggedOverEst.length + overdueOpen.length
        + noAssignee.length + noEstimateOpen.length + lowRemainingProjects.length;
    const unmappedTotal = unmappedProjects.length + unmappedEmployees.length;

    const Section = ({ title, color, icon, rows, description }) => (
        rows.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                color: '#52c41a', fontSize: 12, marginBottom: 8 }}>
                <CheckCircleOutlined /> <span><b>{title}</b> — No issues found ✔</span>
            </div>
        ) : (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15 }}>{icon}</span>
                <span style={{ fontWeight: 700, color, fontSize: 13 }}>{title}</span>
                <Tag color={color === '#cf1322' ? 'error' : 'warning'} style={{ fontSize: 11 }}>
                    {rows.length} task{rows.length !== 1 ? 's' : ''}
                </Tag>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '-2px 0 8px 24px' }}>{description}</p>
            <Table
                dataSource={rows}
                columns={CHECK_COLUMNS}
                rowKey={(_, i) => i}
                size="small"
                pagination={{ pageSize: 6, size: 'small', showSizeChanger: false }}
                scroll={{ x: 'max-content' }}
                style={{ marginBottom: 16 }}
            />
        </>)
    );

    return (
        <Modal
            open={!!checks}
            onCancel={onClose}
            onOk={onClose}
            okText="Close"
            cancelButtonProps={{ style: { display: 'none' } }}
            width={820}
            styles={{ body: { maxHeight: '72vh', overflowY: 'auto', padding: '16px 24px' } }}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <WarningOutlined style={{ color: (total + unmappedTotal) === 0 ? '#52c41a' : '#fa8c16', fontSize: 17 }} />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Data Health Checks</span>
                    {(total + unmappedTotal) === 0
                        ? <Tag color="success">All checks passed</Tag>
                        : <Tag color="warning">{total} issue{total !== 1 ? 's' : ''} · {unmappedTotal} unmapped</Tag>
                    }
                </div>
            }
        >
            <p style={{ color: '#888', fontSize: 12, marginBottom: 16, marginTop: -4 }}>
                These are informational checks only — charts are not affected.
            </p>

            <Section
                title="Tasks exceeding 40 hours"
                color="#cf1322" icon="🚨"
                rows={overHours}
                description="Estimate Effort or Logged Time is greater than 40 hrs. Consider breaking the task into smaller pieces."
            />
            <Section
                title="Logged time exceeds estimate"
                color="#fa8c16" icon="⏱️"
                rows={loggedOverEst}
                description="More time was logged than originally estimated. May indicate scope creep or incorrect data."
            />
            <Section
                title="Overdue but not completed"
                color="#d46b08" icon="📅"
                rows={overdueOpen}
                description="End date is in the past but the task state is not Done/Completed. Needs follow-up."
            />
            <Section
                title="Tasks with no assignee (None)"
                color="#cf1322" icon="👤"
                rows={noAssignee}
                description="Primary Assignee is missing or set to None. These tasks cannot be tracked against any employee."
            />
            <Section
                title="Open tasks with no estimate"
                color="#fa8c16" icon="❓"
                rows={noEstimateOpen}
                description="Task is not completed but Estimate Effort is 0 or missing. Planned hours cannot be calculated for these tasks."
            />

            {/* Rule 6: low remaining at project level */}
            {lowRemainingProjects.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                    color: '#52c41a', fontSize: 12, marginBottom: 8 }}>
                    <CheckCircleOutlined />
                    <span><b>Project remaining vs allocation</b> — No issues found ✔</span>
                </div>
            ) : (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15 }}>📊</span>
                    <span style={{ fontWeight: 700, color: '#722ed1', fontSize: 13 }}>Low remaining effort vs allocation</span>
                    <Tag color="purple" style={{ fontSize: 11 }}>
                        {lowRemainingProjects.length} project{lowRemainingProjects.length !== 1 ? 's' : ''}
                    </Tag>
                </div>
                <p style={{ fontSize: 11, color: '#888', margin: '-2px 0 8px 24px' }}>
                    Total remaining (open tasks estimate) is less than 25% of the total HRMS allocation for the project. May indicate the project is nearly done or tasks are not logged.
                </p>
                <Table
                    dataSource={lowRemainingProjects}
                    rowKey="project"
                    size="small"
                    pagination={{ pageSize: 6, size: 'small', showSizeChanger: false }}
                    scroll={{ x: 'max-content' }}
                    style={{ marginBottom: 16 }}
                    columns={[
                        { title: 'Project', dataIndex: 'project', key: 'project', ellipsis: true,
                            render: v => <b style={{ fontSize: 11 }}>{v}</b> },
                        { title: 'Remaining (hrs)', dataIndex: 'remaining', key: 'remaining', width: 120,
                            render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
                        { title: 'Allocation (hrs)', dataIndex: 'totalAlloc', key: 'totalAlloc', width: 120,
                            render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
                        { title: '% Remaining', dataIndex: 'pct', key: 'pct', width: 100,
                            render: v => <Tag color="purple" style={{ fontSize: 11 }}>{v}%</Tag> },
                        { title: 'Issue', dataIndex: 'issue', key: 'issue', ellipsis: true,
                            render: v => <span style={{ fontSize: 11, color: '#722ed1' }}>{v}</span> },
                    ]}
                />
            </>)}

            {/* Mapping diagnostics */}
            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 15 }}>🔗</span>
                    <span style={{ fontWeight: 700, color: '#333', fontSize: 13 }}>Mapping Diagnostics</span>
                    <Tag color={unmappedTotal === 0 ? 'success' : 'orange'} style={{ fontSize: 11 }}>
                        {unmappedTotal === 0 ? 'All mapped' : `${unmappedTotal} unmatched`}
                    </Tag>
                </div>
                <p style={{ fontSize: 11, color: '#888', margin: '-4px 0 12px' }}>
                    Names below exist in the Excel sheet but have <b>no matching entry in HRMS allocation data</b>.
                    Bars for these entities show raw hours instead of %. Fix by adding them to
                    <code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, margin: '0 4px' }}>PROJECT_NAME_MAP</code>
                    or
                    <code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, margin: '0 4px' }}>EMPLOYEE_NAME_MAP</code>
                    in the source file.
                </p>
                <Row gutter={[16, 0]}>
                    <Col span={12}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#4f8ef7', marginBottom: 6 }}>
                            🗒 Unmatched Projects ({unmappedProjects.length})
                        </div>
                        {unmappedProjects.length === 0
                            ? <div style={{ fontSize: 11, color: '#52c41a' }}>✔ All projects matched</div>
                            : unmappedProjects.map(p => (
                                <div key={p} style={{ fontFamily: 'monospace', fontSize: 11,
                                    background: '#fff2e8', border: '1px solid #ffbb96',
                                    borderRadius: 4, padding: '3px 8px', marginBottom: 4, color: '#d4380d' }}>
                                    {p}
                                </div>
                            ))
                        }
                    </Col>
                    <Col span={12}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#722ed1', marginBottom: 6 }}>
                            👥 Unmatched Employees ({unmappedEmployees.length})
                        </div>
                        {unmappedEmployees.length === 0
                            ? <div style={{ fontSize: 11, color: '#52c41a' }}>✔ All employees matched</div>
                            : unmappedEmployees.map(e => (
                                <div key={e} style={{ fontFamily: 'monospace', fontSize: 11,
                                    background: '#f9f0ff', border: '1px solid #d3adf7',
                                    borderRadius: 4, padding: '3px 8px', marginBottom: 4, color: '#531dab' }}>
                                    {e}
                                </div>
                            ))
                        }
                    </Col>
                </Row>
            </div>
        </Modal>
    );
};

// ── Drill-down modal: raw rows for a clicked project / employee ────────────
const DrillDownModal = ({ drillDown, onClose }) => {
    const rows = drillDown?.rows || [];
    const columns = [
        { title: '#', key: 'idx', width: 44, render: (_, __, i) => <span style={{ color: '#bbb', fontSize: 11 }}>{i + 1}</span> },
        { title: 'Assignee', dataIndex: 'assignee', key: 'assignee', width: 140,
            sorter: (a, b) => a.assignee.localeCompare(b.assignee),
            render: v => <b style={{ fontSize: 12 }}>{v}</b> },
        { title: 'Project', dataIndex: 'project', key: 'project', width: 160,
            sorter: (a, b) => a.project.localeCompare(b.project) },
        { title: 'State', dataIndex: 'state', key: 'state', width: 100,
            render: v => <Tag color={isDone(v) ? 'green' : 'default'} style={{ fontSize: 11 }}>{v || '—'}</Tag> },
        { title: 'Task', dataIndex: 'task', key: 'task', ellipsis: true,
            render: v => <span style={{ fontSize: 11, color: '#555' }}>{v || '—'}</span> },
        { title: 'End Date', dataIndex: 'endDate', key: 'endDate', width: 108,
            sorter: (a, b) => (a.endDate?.getTime() ?? 0) - (b.endDate?.getTime() ?? 0),
            render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtDate(v)}</span> },
        { title: 'Estimate (hrs)', dataIndex: 'estimateEffort', key: 'estimateEffort', width: 110,
            sorter: (a, b) => a.estimateEffort - b.estimateEffort,
            render: v => <span style={{ fontFamily: 'monospace' }}>{v?.toFixed(2)}</span> },
        { title: 'Logged (hrs)', dataIndex: 'loggedTime', key: 'loggedTime', width: 105,
            sorter: (a, b) => a.loggedTime - b.loggedTime,
            render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: v > 0 ? '#4f8ef7' : '#ccc' }}>{v?.toFixed(2)}</span> },
    ];

    const doneRows    = rows.filter(r => isDone(r.state));
    const pendingRows = rows.filter(r => !isDone(r.state));
    const totalLogged  = doneRows.reduce((s, r) => s + r.loggedTime, 0);
    const totalEstimateDone = doneRows.reduce((s, r) => s + r.estimateEffort, 0);
    const efficiency = totalLogged > 0 ? Math.round((totalEstimateDone / totalLogged) * 100) : null;
    const totalEstimate = pendingRows.reduce((s, r) => s + r.estimateEffort, 0);

    return (
        <Modal
            open={!!drillDown}
            onCancel={onClose}
            onOk={onClose}
            okText="Close"
            cancelButtonProps={{ style: { display: 'none' } }}
            width={900}
            styles={{ body: { padding: '12px 0 0', maxHeight: '70vh', overflowY: 'auto' } }}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>
                        {drillDown?.type === 'project' ? <><ProjectOutlined style={{ color: '#4f8ef7', marginRight: 6 }} />{drillDown?.name}</> : <><TeamOutlined style={{ color: '#722ed1', marginRight: 6 }} />{drillDown?.name}</>}
                    </span>
                    <Tag color="blue" style={{ fontSize: 11 }}>{rows.length} rows</Tag>
                </div>
            }
        >
            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 16, padding: '0 16px 12px', flexWrap: 'wrap' }}>
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#389e0d' }}>
                    ✅ <b>{doneRows.length}</b> completed &nbsp;·&nbsp; Logged: <b>{totalLogged.toFixed(2)} hrs</b>
                    {efficiency !== null && (
                        <>
                            &nbsp;·&nbsp; Efficiency: <b style={{ color: efficiency >= 100 ? '#389e0d' : '#d46b08' }}>{efficiency}%</b>
                        </>
                    )}
                </div>
                <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#d46b08' }}>
                    🕐 <b>{pendingRows.length}</b> in-progress &nbsp;·&nbsp; Estimate: <b>{totalEstimate.toFixed(2)} hrs</b>
                </div>
            </div>
            <Table
                columns={columns}
                dataSource={rows}
                rowKey={(_, i) => i}
                size="small"
                pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'] }}
                scroll={{ x: 'max-content' }}
                rowClassName={r => isDone(r.state) ? '' : 'ant-table-row-disabled'}
                style={{ padding: '0 8px' }}
            />
        </Modal>
    );
};

// ── Stacked bar chart: done (period color) + planned (green) ────────────────
const GroupedBarChart = ({ data, periods, onBarClick }) => {
    if (!data.length)
        return <Empty description="No data found" style={{ padding: 40 }} />;

    const BAR_WIDTH = 28;
    const groupWidth = periods.length * (BAR_WIDTH + 6) + 32;
    const chartWidth = Math.max(data.length * groupWidth + 80, 500);

    const longestLabel = Math.max(...data.map(d => (d.name || '').length), 0);
    const bottomMargin = Math.min(Math.max(longestLabel * 5, 60), 140);

    // Tooltip reads allocation data directly from the data array via closure
    const TooltipContent = useMemo(() => makeTooltip(data, periods), [data, periods]);

    return (
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ minWidth: chartWidth, height: 420 + bottomMargin }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 32, right: 16, left: 8, bottom: bottomMargin }}
                        barCategoryGap="22%" barGap={2}
                        style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                        onClick={onBarClick ? (chartData) => {
                            if (chartData?.activeLabel) onBarClick(chartData.activeLabel);
                        } : undefined}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="name" tick={<CustomXTick />}
                            interval={0} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false}
                            label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#bbb' }} />
                        <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                        <Legend
                            wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                            payload={[
                                { value: 'Logged (Done)', type: 'rect', color: PERIOD_COLORS[0] },
                                { value: 'Planned (Estimated)', type: 'rect', color: '#52c41a' },
                            ]}
                        />
                        {periods.map((period, idx) => {
                            const color = PERIOD_COLORS[idx % PERIOD_COLORS.length];
                            return [
                                // Done segment — bottom, period color
                                // Carries the label when planned = 0 (it is the topmost segment)
                                <Bar key={`${period}__done`} dataKey={`${period}__done`}
                                    name={`${period} Done`} stackId={period}
                                    fill={color} maxBarSize={BAR_WIDTH} legendType="none"
                                    isAnimationActive={false}>
                                    <LabelList
                                        dataKey={`${period}__label_done`}
                                        position="top"
                                        content={({ x, y, width, value, index }) => {
                                            if (!value) return null;
                                            const row = data[index];
                                            const eff = row?.[`${period}__efficiency`] ?? null;
                                            const isPercent = String(value).endsWith('%');
                                            const pct = isPercent ? parseInt(value) : null;
                                            const pctColor = pct == null ? '#666'
                                                : pct >= 90 ? '#096dd9'
                                                : pct >= 60 ? '#d46b08' : '#cf1322';
                                            return (
                                                <text x={x + width / 2} y={y - 8} textAnchor="middle" fontWeight={500} fontSize={6}>
                                                    <tspan x={x + width / 2} dy={eff !== null ? "-0.6em" : "0"} fill={pctColor}>
                                                        {value.includes('%') ? value : `${value} h`}
                                                    </tspan>
                                                    {/* {eff !== null && (
                                                        <tspan x={x + width / 2} dy="1.1em" fill={eff >= 100 ? pctColor : '#d46b08'} fontSize={2}>
                                                            {`e: ${eff}%`}
                                                        </tspan>
                                                    )} */}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>,
                                // Planned segment — top, always green
                                // Carries the label when planned > 0 (it is the topmost segment)
                                <Bar key={`${period}__planned`} dataKey={`${period}__planned`}
                                    name={`${period} Planned`} stackId={period}
                                    fill="#52c41a" maxBarSize={BAR_WIDTH} legendType="none"
                                    isAnimationActive={false}
                                    radius={[3, 3, 0, 0]}>
                                    <LabelList
                                        dataKey={`${period}__label_planned`}
                                        position="top"
                                        content={({ x, y, width, value, index }) => {
                                            if (!value) return null;
                                            const row = data[index];
                                            const eff = row?.[`${period}__efficiency`] ?? null;
                                            const isPercent = String(value).endsWith('%');
                                            const pct = isPercent ? parseInt(value) : null;
                                            const pctColor = pct == null ? '#666'
                                                : pct >= 90 ? '#096dd9'
                                                : pct >= 60 ? '#d46b08' : '#cf1322';
                                            return (
                                                <text x={x + width / 2} y={y - 8} textAnchor="middle" fontWeight={500} fontSize={6}>
                                                    <tspan x={x + width / 2} dy={eff !== null ? "-0.6em" : "0"} fill={pctColor}>
                                                        {value.includes('%') ? value : `${value} h`}
                                                    </tspan>
                                                    {/* {eff !== null && (
                                                        <tspan x={x + width / 2} dy="1.1em" fill={eff >= 100 ? pctColor : '#d46b08'} fontSize={2}>
                                                            {`e: ${eff}%`}
                                                        </tspan>
                                                    )} */}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>,
                            ];
                        })}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {/* Period colour legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20, paddingLeft: 48, fontSize: 11, color: '#666', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} />
                    Planned (all periods)
                </span>
                <span style={{ color: '#ccc' }}>|</span>
                {periods.map((p, i) => {
                    const c = PERIOD_COLORS[i % PERIOD_COLORS.length];
                    return (
                        <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 12, height: 12, background: c, borderRadius: 2, display: 'inline-block' }} />
                            {p}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

// ── Excel export helper (xlsx-js-style for cell styling) ─────────────────
/**
 * Builds and downloads a .xlsx file with two sheets:
 *  1. "Employee Summary" — month-wise Done/Planned hrs + Allocation + Total vs Alloc % per employee
 *  2. "Project Summary"  — same breakdown per project
 *
 * Rows where aggregate Total vs Alloc % < 75% are highlighted in light red.
 */
const buildSummaryWorkbook = (employeeData, projectData, periods, fileName, periodMode, allocations, employeeProjectData, hrmsProjects, rawRows) => {
    // ── Styles ────────────────────────────────────────────────────────────
    const STYLE_HEADER = {
        font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill:      { patternType: 'solid', fgColor: { rgb: '1F4E79' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
            bottom: { style: 'thin', color: { rgb: '2F75B6' } },
            right:  { style: 'thin', color: { rgb: '2F75B6' } },
        },
    };
    const STYLE_HEADER_ENTITY = {
        ...STYLE_HEADER,
        alignment: { horizontal: 'left', vertical: 'center' },
    };
    const STYLE_LOW_PCT = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFD7D7' } },
    };
    const STYLE_LOW_PCT_BOLD = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFD7D7' } },
        font: { bold: true },
    };
    const STYLE_PCT_CELL = {
        alignment: { horizontal: 'center' },
    };
    const STYLE_PCT_RED = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFD7D7' } },
        alignment: { horizontal: 'center' },
        font: { color: { rgb: 'CF1322' }, bold: true },
    };

    // Cols per period: Done (hrs) | Planned (hrs) | Allocated (hrs) | Total vs Alloc %
    const COLS_PER_PERIOD = 4;

    // ── helper: build AOA rows + track which data rows need highlight ──────
    // entityKeys:    array of entry keys used as leading columns, e.g. ['name'] or ['name','project']
    // extraColumns:  optional static columns inserted after entity cols, before period cols
    //                each item: { header: string, getValue: (entry) => value }
    const buildSheetData = (data, entityKeys, entityLabels, extraColumns = []) => {
        const header = [...entityLabels, ...extraColumns.map(c => c.header)];
        periods.forEach(p => {
            header.push(
                `${p} – Done (hrs)`,
                `${p} – Planned (hrs)`,
                `${p} – Allocated (hrs)`,
                `${p} – Total vs Alloc %`,
            );
        });

        const rows = [header];
        const highlightRowIndices = [];   // 0-based row indices (excluding header)

        data.forEach((entry, idx) => {
            const row = [
                ...entityKeys.map(k => entry[k]),
                ...extraColumns.map(c => c.getValue(entry)),
            ];
            let aggDone = 0, aggPlanned = 0, aggAlloc = 0;

            periods.forEach(p => {
                const done      = entry[`${p}__done`]      ?? 0;
                const planned   = entry[`${p}__planned`]   ?? 0;
                const allocated = entry[`${p}__allocated`] ?? 0;
                const totalPct  = entry[`${p}__totalPct`]  ?? '';

                aggDone    += done;
                aggPlanned += planned;
                aggAlloc   += allocated;

                row.push(
                    parseFloat(done.toFixed(2)),
                    parseFloat(planned.toFixed(2)),
                    allocated > 0 ? parseFloat(allocated.toFixed(2)) : '',
                    totalPct !== '' ? totalPct : '',
                );
            });

            // Aggregate % across all periods: if < 75% → flag for highlight
            const aggPct = aggAlloc > 0
                ? Math.round((aggDone + aggPlanned) / aggAlloc * 100)
                : null;
            if (aggPct !== null && aggPct < 75) {
                highlightRowIndices.push(idx);
            }

            rows.push(row);
        });

        return { rows, highlightRowIndices, entityColCount: entityKeys.length + extraColumns.length };
    };

    // ── helper: convert AOA to styled worksheet ───────────────────────────
    // entityColCount: number of leading entity columns (1 for employee/project, 2 for employee+project)
    const buildStyledWorksheet = (aoa, highlightRowIndices, entityColCount = 1) => {
        const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
        const totalColsLocal = entityColCount + periods.length * COLS_PER_PERIOD;
        const highlightSet = new Set(highlightRowIndices);

        for (let r = 0; r < aoa.length; r++) {
            for (let c = 0; c < totalColsLocal; c++) {
                const addr = XLSXStyle.utils.encode_cell({ r, c });
                if (!ws[addr]) continue;

                if (r === 0) {
                    // Header row
                    ws[addr].s = c < entityColCount ? STYLE_HEADER_ENTITY : STYLE_HEADER;
                } else {
                    const dataRowIdx = r - 1; // 0-based data row
                    const isLow = highlightSet.has(dataRowIdx);

                    if (isLow) {
                        const colWithinPeriod = (c - entityColCount) % COLS_PER_PERIOD;
                        const isTotalPctCol = c >= entityColCount && colWithinPeriod === 3;
                        ws[addr].s = isTotalPctCol ? STYLE_PCT_RED
                            : c < entityColCount ? STYLE_LOW_PCT_BOLD
                            : STYLE_LOW_PCT;
                    } else {
                        const colWithinPeriod = (c - entityColCount) % COLS_PER_PERIOD;
                        if (c >= entityColCount && colWithinPeriod === 3) {
                            ws[addr].s = STYLE_PCT_CELL;
                        }
                    }
                }
            }
        }

        // Column widths
        ws['!cols'] = [
            ...Array(entityColCount).fill({ wch: 26 }),
            ...periods.flatMap(() => [
                { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
            ]),
        ];

        // Freeze header + entity columns
        ws['!freeze'] = { xSplit: entityColCount, ySplit: 1 };

        return ws;
    };

    // ── build sheets ──────────────────────────────────────────────────────
    // Allocation lookup: (empName_lower + \x00 + projName_lower) → alloc data
    const allocLookup = {};
    (allocations || []).forEach(emp => {
        (emp.projects || []).forEach(proj => {
            const key = `${(emp.employee_name || '').toLowerCase().trim()}\x00${(proj.project_name || '').toLowerCase().trim()}`;
            allocLookup[key] = {
                allocation: proj.allocation ?? '',
                is_billing: proj.is_billing,
                role:       proj.role || '',
                lead:       proj.lead_name || '',
            };
        });
    });
    const getAllocMeta = (empName, projName) => {
        const resolvedEmp  = resolveEmployeeName(empName  || '');
        const resolvedProj = resolveProjectName(projName || '');
        return allocLookup[`${resolvedEmp.toLowerCase().trim()}\x00${resolvedProj.toLowerCase().trim()}`] ?? null;
    };

    // Project metadata lookup: hrmsName_lower → { lead_name, total_allocation (FTE), billable_allocation (FTE), contractual_allocation, start_date }
    const projMetaLookup = {};
    (hrmsProjects || []).forEach(p => {
        const key = (p.project_name || '').toLowerCase().trim();
        if (key) {
            projMetaLookup[key] = {
                lead:            p.lead_name || '',
                totalAlloc:      p.total_allocation != null ? Number((p.total_allocation / 100).toFixed(2)) : '',
                billableAlloc:   p.billable_allocation != null ? Number((p.billable_allocation / 100).toFixed(2)) : '',
                contractualAlloc: p.contractual_allocation != null ? Number(p.contractual_allocation) : '',
                startDate:       p.start_date || '',
            };
        }
    });
    const getProjMeta = (excelProjName) => {
        const hrmsName = resolveProjectName(excelProjName || '').toLowerCase().trim();
        return projMetaLookup[hrmsName] ?? null;
    };

    // Employee by Project — enriched with allocation metadata, sorted by project then employee
    const sortedEmpProjData = [...(employeeProjectData || [])]
        .sort((a, b) => a.project.localeCompare(b.project) || a.name.localeCompare(b.name));

    const { rows: empProjRows, highlightRowIndices: empProjHighlight, entityColCount: empProjEntityCols } =
        buildSheetData(
            sortedEmpProjData,
            ['name', 'project'],
            ['Employee', 'Project'],
            [
                { header: 'Allocation (%)', getValue: e => getAllocMeta(e.name, e.project)?.allocation ?? '' },
                { header: 'Billable',       getValue: e => { const m = getAllocMeta(e.name, e.project); return m ? (m.is_billing ? 'Yes' : 'No') : ''; } },
                { header: 'Role',           getValue: e => getAllocMeta(e.name, e.project)?.role ?? '' },
                { header: 'Lead',           getValue: e => getAllocMeta(e.name, e.project)?.lead ?? '' },
            ]
        );

    // Project summary — enriched with project metadata
    const { rows: projRows, highlightRowIndices: projHighlight, entityColCount: projEntityCols } =
        buildSheetData(
            projectData, ['name'], ['Project'],
            [
                { header: 'Project Lead',             getValue: e => getProjMeta(e.name)?.lead            ?? '' },
                { header: 'Total Allocation (FTE)',   getValue: e => getProjMeta(e.name)?.totalAlloc      ?? '' },
                { header: 'Billable Allocation (FTE)',getValue: e => getProjMeta(e.name)?.billableAlloc   ?? '' },
                { header: 'Contractual Allocation',   getValue: e => getProjMeta(e.name)?.contractualAlloc ?? '' },
                { header: 'Start Date',               getValue: e => getProjMeta(e.name)?.startDate       ?? '' },
            ]
        );

    const wsEmpProj = buildStyledWorksheet(empProjRows, empProjHighlight, empProjEntityCols);
    const wsProj    = buildStyledWorksheet(projRows,    projHighlight,    projEntityCols);

    // Custom col widths for Employee by Project
    wsEmpProj['!cols'] = [
        { wch: 28 }, { wch: 26 },                     // Employee, Project
        { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 22 }, // Alloc%, Billable, Role, Lead
        ...periods.flatMap(() => [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]),
    ];
    // Custom col widths for Project Summary
    wsProj['!cols'] = [
        { wch: 30 },                                   // Project
        { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, // metadata
        ...periods.flatMap(() => [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]),
    ];

    // ── Employee Summary + Company Summary built below inside allocation block ──
    let wsEmpAlloc = null;
    let wsCompany  = null;

    // ── Employee Summary sheet (allocation + period-wise efforts) ─────────────
    if (allocations && allocations.length > 0) {
        // Lookup from employeeData by resolved HRMS name
        const empEffortsMap = {};
        (employeeData || []).forEach(entry => {
            const hrmsName = resolveEmployeeName(entry.name || '').toLowerCase().trim();
            empEffortsMap[hrmsName] = entry;
        });



        // Header style (dark grey)
        const empAllocHeaderStyle = {
            font: { bold: true, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: 'FFD3D3D3' } },
            border: {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' },
            },
        };
        // Navy header style for period columns (matches other sheets)
        const periodHeaderStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { patternType: 'solid', fgColor: { rgb: '1F4E79' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
                bottom: { style: 'thin', color: { rgb: '2F75B6' } },
                right:  { style: 'thin', color: { rgb: '2F75B6' } },
            },
        };

        const staticHeaders = [
            'Employee Name', 'Employee ID', 'Manager (Leave Approver)',
            'Total Allocation (%)', 'Total Billable Allocation (%)', 'No. of Projects Assigned',
            'More than 40 hours work planned',
        ];
        const periodHeaders = [];
        periods.forEach(p => {
            periodHeaders.push(`${p} \u2013 Done (hrs)`, `${p} \u2013 Planned (hrs)`, `${p} \u2013 Total vs Alloc %`);
        });
        const allHeaders = [...staticHeaders, ...periodHeaders, 'Comments'];

        const _wsEmpAlloc = {};

        // Write headers
        allHeaders.forEach((h, ci) => {
            const cellRef = XLSXStyle.utils.encode_cell({ r: 0, c: ci });
            let style = ci < staticHeaders.length ? empAllocHeaderStyle : periodHeaderStyle;
            if (h === 'Comments') style = empAllocHeaderStyle;
            _wsEmpAlloc[cellRef] = {
                v: h, t: 's',
                s: style,
            };
        });

        const parsePeriodForCheck = (p) => {
            const wm = p.match(/^W(\d+)-(\d+)$/);
            if (wm) return parseInt(wm[2]) * 100 + parseInt(wm[1]);
            const mm = p.match(/^(\w{3})-(\d+)$/);
            if (mm) {
                const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return parseInt(mm[2]) * 100 + M.indexOf(mm[1]);
            }
            return 0;
        };
        const exportDate = new Date();
        const currentPeriodStr = periodMode === 'weekly' ? getWeekLabel(exportDate) : getMonthLabel(exportDate);
        const currentPeriodVal = parsePeriodForCheck(currentPeriodStr);

        let employeesLessThan40Planned = 0;
        const employeesLessThan40List = [];
        const employeesFreeBandwidthList = [];

        // Write data rows
        allocations.forEach((emp, ri) => {
            const projects = emp.projects || [];
            const billableAlloc = projects
                .filter(p => p.is_billing)
                .reduce((sum, p) => sum + (p.allocation || 0), 0);
            const totalAllocation = Number((emp.total_allocation * 100).toFixed(2));

            const hrmsName = (emp.employee_name || '').toLowerCase().trim();
            const effortsEntry = empEffortsMap[hrmsName] || null;

            let totalPlannedForEmp = 0;
            let anyMonthEffLow = false;
            if (effortsEntry) {
                periods.forEach(p => {
                    totalPlannedForEmp += (effortsEntry[`${p}__planned`] ?? 0);
                    
                    const pVal = parsePeriodForCheck(p);
                    if (pVal > 0 && pVal < currentPeriodVal) {
                        const tPct = effortsEntry[`${p}__totalPct`];
                        if (tPct !== undefined && tPct !== '' && tPct !== null && tPct < 100) {
                            anyMonthEffLow = true;
                        }
                    }
                });
            }

            if ((emp.total_allocation || 0) < 1) {
                employeesFreeBandwidthList.push({
                    name: emp.employee_name,
                    freeAllocation: `${((1 - (emp.total_allocation || 0)) * 100).toFixed(2)}%`
                });
            }

            const moreThan40Planned = totalPlannedForEmp > 40 ? 'Yes' : 'No';
            if (moreThan40Planned === 'No') {
                employeesLessThan40Planned++;
                employeesLessThan40List.push(emp.employee_name);
            }

            const comments = [];
            if (anyMonthEffLow) comments.push(`Total vs alloc < 100% (past ${periodMode === 'weekly' ? 'week' : 'month'})`);
            if ((emp.total_allocation || 0) < 1) comments.push("Total alloc < 100%");
            if (moreThan40Planned === 'No') comments.push("Planned <= 40 hrs");

            const rowBgRgb = comments.length > 0 ? 'FFFFE6E6' : null;
            const commentText = comments.join('; ');

            const staticValues = [
                emp.employee_name,
                emp.employee_id,
                emp.manager_name || '',
                totalAllocation,
                Number(billableAlloc.toFixed(2)),
                projects.length,
                moreThan40Planned,
            ];

            // Write static columns
            staticValues.forEach((val, ci) => {
                const cellRef = XLSXStyle.utils.encode_cell({ r: ri + 1, c: ci });
                const cellType = typeof val === 'number' ? 'n' : 's';
                const cellStyle = {};
                if (rowBgRgb) cellStyle.fill = { fgColor: { rgb: rowBgRgb } };
                if (ci === 3 && rowBgRgb) cellStyle.font = { bold: true };
                _wsEmpAlloc[cellRef] = {
                    v: val, t: cellType,
                    s: Object.keys(cellStyle).length ? cellStyle : undefined,
                };
            });

            // Write period columns from efforts data
            let ci = staticHeaders.length;
            let aggDone = 0, aggPlanned = 0, aggAlloc = 0;
            periods.forEach(p => {
                const done      = effortsEntry ? (effortsEntry[`${p}__done`]      ?? 0) : 0;
                const planned   = effortsEntry ? (effortsEntry[`${p}__planned`]   ?? 0) : 0;
                const allocated = effortsEntry ? (effortsEntry[`${p}__allocated`] ?? 0) : 0;
                const totalPct  = effortsEntry ? (effortsEntry[`${p}__totalPct`]  ?? '') : '';
                aggDone    += done;
                aggPlanned += planned;
                aggAlloc   += allocated;

                const isTotalPctCol = (ci - staticHeaders.length) % 3 === 2;
                const periodCellStyle = rowBgRgb
                    ? isTotalPctCol
                        ? { fill: { fgColor: { rgb: rowBgRgb } }, font: { bold: true }, alignment: { horizontal: 'center' } }
                        : { fill: { fgColor: { rgb: rowBgRgb } } }
                    : isTotalPctCol
                        ? { alignment: { horizontal: 'center' } }
                        : undefined;

                const periodValues = [
                    parseFloat(done.toFixed(2)),
                    parseFloat(planned.toFixed(2)),
                    totalPct !== '' ? totalPct : '',
                ];
                periodValues.forEach(val => {
                    const cellRef = XLSXStyle.utils.encode_cell({ r: ri + 1, c: ci });
                    const cellType = typeof val === 'number' ? 'n' : 's';
                    _wsEmpAlloc[cellRef] = {
                        v: val === '' ? '' : val, t: cellType,
                        s: periodCellStyle,
                    };
                    ci++;
                });
            });

            // Write Comments column at the end
            const commentRef = XLSXStyle.utils.encode_cell({ r: ri + 1, c: ci });
            const commentStyle = {};
            if (rowBgRgb) {
                commentStyle.fill = { fgColor: { rgb: rowBgRgb } };
                commentStyle.font = { color: { rgb: 'FFCF1322' }, bold: true }; // dark red text for emphasis
            }
            _wsEmpAlloc[commentRef] = {
                v: commentText, t: 's',
                s: Object.keys(commentStyle).length ? commentStyle : undefined,
            };
        });

        _wsEmpAlloc['!ref'] = XLSXStyle.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: allocations.length, c: allHeaders.length - 1 },
        });
        _wsEmpAlloc['!cols'] = [
            { wch: 28 }, { wch: 14 }, { wch: 26 },  // Name, ID, Manager
            { wch: 20 }, { wch: 24 }, { wch: 22 },  // Alloc%, Billable%, Projects
            { wch: 32 },                            // More than 40 hours planned
            ...periods.flatMap(() => [{ wch: 14 }, { wch: 14 }, { wch: 16 }]),
            { wch: 45 },                            // Comments
        ];
        _wsEmpAlloc['!freeze'] = { xSplit: staticHeaders.length, ySplit: 1 };
        wsEmpAlloc = _wsEmpAlloc;

        // Company-level summary
        const totalActiveEmployees = allocations.length;
        const totalAllocSum    = allocations.reduce((s, e) => s + (e.total_allocation    || 0), 0);
        const totalBillableSum = allocations.reduce((s, e) => s + (e.billable_allocation || 0), 0);
        const employeesLessThan100 = allocations.filter(e => (e.total_allocation || 0) < 1).length;

        let activeProjects = 0, onHoldProjects = 0, closedProjects = 0;
        let totalContractualAlloc = 0, exceedingContractualAlloc = 0;

        (hrmsProjects || []).forEach(p => {
            if (p.project_status === 'Active') activeProjects++;
            else if (p.project_status === 'On-Hold') onHoldProjects++;
            else if (p.project_status === 'Closed') closedProjects++;

            const contractual = p.contractual_allocation ? Number(p.contractual_allocation) : 0;
            const totalAlloc = p.total_allocation != null ? Number(p.total_allocation) / 100 : 0;
            
            totalContractualAlloc += contractual;
            if (contractual > 0 && totalAlloc > contractual) {
                exceedingContractualAlloc++;
            }
        });

        const utilisationRate = totalContractualAlloc > 0 
            ? ((totalAllocSum / totalContractualAlloc) * 100).toFixed(2) + '%' 
            : 'N/A';

        const periodStr = periods && periods.length > 0 
            ? `${periods[0]} \u2192 ${periods[periods.length - 1]}` 
            : 'N/A';

        let grandDone = 0, grandPlanned = 0, grandAlloc = 0;
        const lowEfficiencyEmployees = [];
        
        (employeeData || []).forEach(entry => {
            let empDone = 0, empPlanned = 0, empAlloc = 0;
            periods.forEach(p => {
                empDone += entry[`${p}__done`] ?? 0;
                empPlanned += entry[`${p}__planned`] ?? 0;
                empAlloc += entry[`${p}__allocated`] ?? 0;
            });
            grandDone += empDone;
            grandPlanned += empPlanned;
            grandAlloc += empAlloc;

            const eff = empAlloc > 0 ? Math.round((empDone + empPlanned) / empAlloc * 100) : null;
            if (eff !== null && eff < 75) {
                lowEfficiencyEmployees.push(entry.name);
            }
        });

        const lowEfficiencyProjects = [];
        (projectData || []).forEach(entry => {
            let projDone = 0, projPlanned = 0, projAlloc = 0;
            periods.forEach(p => {
                projDone += entry[`${p}__done`] ?? 0;
                projPlanned += entry[`${p}__planned`] ?? 0;
                projAlloc += entry[`${p}__allocated`] ?? 0;
            });
            const eff = projAlloc > 0 ? Math.round((projDone + projPlanned) / projAlloc * 100) : null;
            if (eff !== null && eff < 75) {
                lowEfficiencyProjects.push(entry.name);
            }
        });

        const overallEfficiency = grandAlloc > 0 
            ? Math.round((grandDone + grandPlanned) / grandAlloc * 100) + '%' 
            : 'N/A';

        const companyRows = [
            { 'Metric': 'Report period (From \u2192 To)',                  'Value': periodStr },
            { 'Metric': '', 'Value': '' },
            { 'Metric': 'WORKFORCE METRICS',                              'Value': '' },
            { 'Metric': 'Total Active Employees',                          'Value': totalActiveEmployees },
            { 'Metric': 'Employees with free bandwidth',                   'Value': employeesLessThan100 },
            { 'Metric': 'Total Allocation (sum across employees)',          'Value': Number(totalAllocSum.toFixed(2)) },
            { 'Metric': 'Total Billable Allocation (sum across employees)', 'Value': Number(totalBillableSum.toFixed(2)) },
            { 'Metric': '', 'Value': '' },
            { 'Metric': 'PROJECT PORTFOLIO METRICS',                       'Value': '' },
            { 'Metric': 'Total Active Projects',                           'Value': activeProjects },
            { 'Metric': 'Total On-Hold Projects',                          'Value': onHoldProjects },
            { 'Metric': 'Total Closed Projects',                           'Value': closedProjects },
            { 'Metric': 'Total Contractual Allocation (FTE)',              'Value': Number(totalContractualAlloc.toFixed(2)) },
            { 'Metric': 'Utilisation Rate (Total Alloc / Contractual)',    'Value': utilisationRate },
            { 'Metric': 'Projects exceeding contractual allocation',       'Value': exceedingContractualAlloc },
            { 'Metric': '', 'Value': '' },
            { 'Metric': 'EFFORTS & EFFICIENCY METRICS',                    'Value': '' },
            { 'Metric': 'Total Done hours (across all employees)',         'Value': Number(grandDone.toFixed(2)) },
            { 'Metric': 'Total Planned hours',                             'Value': Number(grandPlanned.toFixed(2)) },
            { 'Metric': 'Employees with less than 40 hours work planned',  'Value': employeesLessThan40Planned },
            { 'Metric': 'Overall Total vs Allocation %',                   'Value': overallEfficiency },
            // { 'Metric': 'Employees below 75% work log',                  'Value': lowEfficiencyEmployees.length > 0 ? lowEfficiencyEmployees.join(', ') : 'None' },
            // { 'Metric': 'Projects below 75% work log',                   'Value': lowEfficiencyProjects.length > 0 ? lowEfficiencyProjects.join(', ') : 'None' },
        ];

        companyRows.push({ 'Metric': '', 'Value': '' });
        companyRows.push({ 'Metric': 'EMPLOYEES WITH LESS THAN 40 HOURS WORK PLANNED', 'Value': '' });
        if (employeesLessThan40List.length > 0) {
            employeesLessThan40List.forEach(name => {
                companyRows.push({ 'Metric': name, 'Value': '' });
            });
        } else {
            companyRows.push({ 'Metric': 'None', 'Value': '' });
        }

        companyRows.push({ 'Metric': '', 'Value': '' });
        companyRows.push({ 'Metric': 'EMPLOYEES WITH FREE BANDWIDTH', 'Value': 'Free Allocation' });
        if (employeesFreeBandwidthList.length > 0) {
            employeesFreeBandwidthList.forEach(item => {
                companyRows.push({ 'Metric': item.name, 'Value': item.freeAllocation });
            });
        } else {
            companyRows.push({ 'Metric': 'None', 'Value': '' });
        }
        
        wsCompany = XLSXStyle.utils.json_to_sheet(companyRows);
        wsCompany['!cols'] = [{ wch: 60 }, { wch: 40 }];
        
        // Bold the section headers dynamically
        const boldRowIndices = [];
        companyRows.forEach((row, i) => {
            if (row.Metric && row.Metric === row.Metric.toUpperCase() && row.Metric.length > 5) {
                boldRowIndices.push(i + 1); // +1 because row 0 is headers in excel
            }
        });
        
        boldRowIndices.forEach(rIdx => {
            const cellRef = XLSXStyle.utils.encode_cell({ r: rIdx, c: 0 });
            if (wsCompany[cellRef]) wsCompany[cellRef].s = { font: { bold: true } };
            const cellRefVal = XLSXStyle.utils.encode_cell({ r: rIdx, c: 1 });
            if (wsCompany[cellRefVal]) wsCompany[cellRefVal].s = { font: { bold: true } };
        });
    }

    // ── Assemble workbook in requested order ──────────────────────────────
    const wb = XLSXStyle.utils.book_new();
    if (wsCompany)  XLSXStyle.utils.book_append_sheet(wb, wsCompany,  'Company Efforts Metrics');
                    XLSXStyle.utils.book_append_sheet(wb, wsProj,     'Project Metrics');
    if (wsEmpAlloc) XLSXStyle.utils.book_append_sheet(wb, wsEmpAlloc, 'Emp Efforts Metrics');
                    XLSXStyle.utils.book_append_sheet(wb, wsEmpProj,  'Emp-Project Metrics');

    if (rawRows && rawRows.length > 0) {
        const rawWs = XLSXStyle.utils.json_to_sheet(rawRows);
        XLSXStyle.utils.book_append_sheet(wb, rawWs, 'Emp-Project Tasks Details');
    }

    return wb;
};

const downloadSummaryExcel = (employeeData, projectData, periods, fileName, periodMode, allocations, employeeProjectData, hrmsProjects, rawRows) => {
    const wb = buildSummaryWorkbook(employeeData, projectData, periods, fileName, periodMode, allocations, employeeProjectData, hrmsProjects, rawRows);
    const baseName = (fileName || 'efforts').replace(/\.[^.]+$/, '');
    const today    = new Date();
    const stamp    = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    XLSXStyle.writeFile(wb, `${baseName}_summary_${stamp}.xlsx`);
};

// ── main component ─────────────────────────────────────────────────────────
const EffortsAnalyser = ({ exportRef, setHasEffortsData }) => {
    const [rawRows, setRawRows] = useState([]);
    const [allocations, setAllocations] = useState([]);      // per-employee allocations
    const [hrmsProjects, setHrmsProjects] = useState([]);    // project-level data from Projects module
    const [uploading, setUploading] = useState(false);
    const [periodMode, setPeriodMode] = useState('monthly');
    const [fileName, setFileName] = useState('');
    const [validationErrors, setValidationErrors] = useState(null);
    const [drillDown, setDrillDown] = useState(null);
    const [healthChecks, setHealthChecks] = useState(null);
    const [empProjectFilter, setEmpProjectFilter] = useState(null); // null = all projects

    useEffect(() => {
        if (exportRef) {
            exportRef.current = () => buildSummaryWorkbook(
                filteredEmployeeChartData,
                projectChartData,
                allPeriods,
                fileName,
                periodMode,
                allocations,
                employeeProjectChartData,
                hrmsProjects,
                rawRows
            );
        }
        if (setHasEffortsData) {
            setHasEffortsData(rawRows && rawRows.length > 0);
        }
    });

    // Fetch HRMS data once on mount
    useEffect(() => {
        getEmployeeAllocations()
            .then(res => setAllocations(res.data || []))
            .catch(e => console.error('Failed to load employee allocations', e));
        getProjects()
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data?.projects || []);
                setHrmsProjects(data);
            })
            .catch(e => console.error('Failed to load projects', e));
    }, []);

    // ── upload validation ──────────────────────────────────────────────
    const REQUIRED_COLS = [
        'Primary Assignee', 'Workflow State', 'Title', 'Project',
        'Start Date', 'End Date', 'Estimate Effort', 'Logged Time',
    ];

    const validateRows = (rawJson) => {
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
            const n = {};
            Object.entries(rawRow).forEach(([k, v]) => { n[k.trim()] = v; });
            const emptyCols = REQUIRED_COLS.filter(col => {
                const v = n[col];
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

        // 3. Duplicate row check (all 8 column values identical)
        const signatures = rawJson.map((rawRow, i) => {
            const n = {};
            Object.entries(rawRow).forEach(([k, v]) => { n[k.trim()] = v; });
            return REQUIRED_COLS.map(c => String(n[c] ?? '')).join('|||');
        });
        const seen = {};
        signatures.forEach((sig, i) => {
            if (seen[sig] !== undefined) {
                errors.push({
                    type: 'duplicate_row',
                    row: i + 2,
                    message: `Row ${i + 2} is an exact duplicate of Row ${seen[sig] + 2}`,
                });
            } else {
                seen[sig] = i;
            }
        });

        return errors;
    };

    // ── parse ──────────────────────────────────────────────────────────
    const handleFile = useCallback((file) => {
        setUploading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

                // ── Validation ────────────────────────────────────────
                const errors = validateRows(json);
                if (errors.length > 0) {
                    setValidationErrors({ fileName: file.name, errors });
                    setUploading(false);
                    return; // Do not load data until errors are fixed
                }

                // ── Parse into typed rows ─────────────────────────────
                const rows = json.map(r => {
                    const n = {};
                    Object.entries(r).forEach(([k, v]) => { n[k.trim()] = v; });
                    return {
                        assignee: String(n['Primary Assignee'] || '').trim(),
                        state: String(n['Workflow State'] || '').trim(),
                        task: String(n['Title'] || '').trim(),
                        project: String(n['Project'] || '').trim(),
                        startDate: parseExcelDate(n['Start Date']),
                        endDate: parseExcelDate(n['End Date']),
                        estimateEffort: (parseFloat(n['Estimate Effort']) || 0) / 3600,
                        loggedTime: (parseFloat(n['Logged Time']) || 0) / 3600,
                    };
                }).filter(r => r.assignee && r.project && r.endDate);

                setRawRows(rows);
                setFileName(file.name);
                const doneCount = rows.filter(r => isDone(r.state)).length;
                message.success(`Loaded ${rows.length} rows (${doneCount} completed tasks)`);
            } catch (err) {
                message.error('Failed to parse Excel. Check column names.');
                console.error(err);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    }, []);

    // ── allocation map: empName_lower → { projName_lower → alloc% } ──────
    const allocationMap = useMemo(() => {
        const map = {};
        allocations.forEach(emp => {
            const empKey = emp.employee_name?.toLowerCase().trim();
            if (!empKey) return;
            map[empKey] = {};
            (emp.projects || []).forEach(p => {
                const projKey = p.project_name?.toLowerCase().trim();
                if (projKey) map[empKey][projKey] = p.allocation || 0;
            });
        });
        return map;
    }, [allocations]);

    // ── Project-level allocation map: hrmsName_lower → FTE (total_allocation / 100) ──
    // total_allocation in HRMS is stored ×100 (e.g. 335 = 3.35 FTE)
    const projectAllocMap = useMemo(() => {
        const map = {};
        hrmsProjects.forEach(p => {
            const key = p.project_name?.toLowerCase().trim();
            if (key) map[key] = (p.total_allocation || 0) / 100; // convert to FTE
        });
        return map;
    }, [hrmsProjects]);

    const WEEKS_PER_MONTH = 4.33;

    // Per-project allocation: FTE from Projects module → hours
    const getProjectAllocHrs = useCallback((excelProjName) => {
        const hrmsProj = resolveProjectName(excelProjName).toLowerCase().trim();
        const fte = projectAllocMap[hrmsProj] ?? null;
        if (fte === null) return null;
        const weeks = periodMode === 'weekly' ? 1 : WEEKS_PER_MONTH;
        return fte * 40 * weeks;
    }, [projectAllocMap, periodMode]);

    // Per-employee allocation: used only for the Employee chart
    const getAllocHrs = useCallback((assignee, project) => {
        const hrmsEmployee = resolveEmployeeName(assignee);
        const hrmsProject  = resolveProjectName(project);
        const pct = allocationMap[hrmsEmployee?.toLowerCase().trim()]?.[hrmsProject?.toLowerCase().trim()] ?? null;
        if (pct === null) return null;
        const weeks = periodMode === 'weekly' ? 1 : WEEKS_PER_MONTH;
        return (pct / 100) * 40 * weeks;
    }, [allocationMap, periodMode]);

    // ── row splits ─────────────────────────────────────────────────────
    const doneRows    = useMemo(() => rawRows.filter(r =>  isDone(r.state)), [rawRows]);
    const plannedRows = useMemo(() => rawRows.filter(r => !isDone(r.state)), [rawRows]);

    const getPeriod = useCallback(row =>
        periodMode === 'weekly' ? getWeekLabel(row.endDate) : getMonthLabel(row.endDate),
    [periodMode]);

    const allPeriods = useMemo(() => {
        const s = new Set(rawRows.map(r => getPeriod(r)));
        return sortPeriods([...s]);
    }, [rawRows, getPeriod]);

    const allProjects  = useMemo(() => [...new Set(rawRows.map(r => r.project))].sort(),  [rawRows]);
    const allEmployees = useMemo(() => [...new Set(rawRows.map(r => r.assignee))].sort(), [rawRows]);

    // ── chart data builders ────────────────────────────────────────────
    // rowFilter: optional (row) => bool applied on top of the entity filter
    const buildChartData = useCallback((entities, getKey, getAllocForEntity, rowFilter = null) =>
        entities.map(entity => {
            const entry = { name: entity };
            const filteredDone    = rowFilter ? doneRows.filter(rowFilter)    : doneRows;
            const filteredPlanned = rowFilter ? plannedRows.filter(rowFilter) : plannedRows;
            allPeriods.forEach(period => {
                const doneTasks = filteredDone
                    .filter(r => getKey(r) === entity && getPeriod(r) === period);
                const done = doneTasks.reduce((s, r) => s + r.loggedTime, 0);
                const doneEst = doneTasks.reduce((s, r) => s + r.estimateEffort, 0);

                const filteredPlannedForPeriod = filteredPlanned
                    .filter(r => getKey(r) === entity && getPeriod(r) === period);
                const planned = filteredPlannedForPeriod.reduce((s, r) => s + r.estimateEffort, 0);
                const allocated = getAllocForEntity(entity);

                const donePct    = allocated > 0 ? Math.round(done    / allocated * 100) : null;
                const plannedPct = allocated > 0 ? Math.round(planned / allocated * 100) : null;
                const totalPct   = allocated > 0 ? Math.round((done + planned) / allocated * 100) : null;

                const efficiency = done > 0 ? Math.round((doneEst / done) * 100) : null;

                entry[`${period}__done`]       = parseFloat(done.toFixed(1));
                entry[`${period}__planned`]    = parseFloat(planned.toFixed(1));
                entry[`${period}__allocated`]  = allocated > 0 ? parseFloat(allocated.toFixed(1)) : 0;
                entry[`${period}__donePct`]    = donePct;
                entry[`${period}__plannedPct`] = plannedPct;
                entry[`${period}__totalPct`]   = totalPct;
                entry[`${period}__efficiency`] = efficiency;

                const total = done + planned;
                const labelText = total <= 0 ? ''
                    : totalPct != null ? `${totalPct}%`
                    : total.toFixed(0);
                entry[`${period}__label_done`]    = (total > 0 && planned === 0) ? labelText : '';
                entry[`${period}__label_planned`] = (total > 0 && planned > 0)  ? labelText : '';
            });
            return entry;
        }),
    [doneRows, plannedRows, allPeriods, getPeriod, getAllocHrs]);

    // Project chart: allocated = project-level FTE from HRMS Projects module → hours
    const projectChartData = useMemo(() => buildChartData(
        allProjects, r => r.project,
        (proj) => getProjectAllocHrs(proj) ?? 0
    ), [buildChartData, allProjects, getProjectAllocHrs]);

    // Employee chart — full (all projects)
    const employeeChartData = useMemo(() => buildChartData(
        allEmployees, r => r.assignee,
        (emp) => {
            const projects = [...new Set(rawRows.filter(r => r.assignee === emp).map(r => r.project))];
            return projects.reduce((s, proj) => { const h = getAllocHrs(emp, proj); return h !== null ? s + h : s; }, 0);
        }
    ), [buildChartData, allEmployees, rawRows, getAllocHrs]);

    // Employee chart — filtered by selected project
    const filteredEmployees = useMemo(() => {
        if (!empProjectFilter) return allEmployees;
        return [...new Set(rawRows.filter(r => r.project === empProjectFilter).map(r => r.assignee))].sort();
    }, [rawRows, empProjectFilter, allEmployees]);

    const filteredEmployeeChartData = useMemo(() => {
        const rowFilter = empProjectFilter ? (r => r.project === empProjectFilter) : null;
        return buildChartData(
            filteredEmployees,
            r => r.assignee,
            (emp) => {
                if (empProjectFilter) {
                    // Allocation for this specific project only
                    const h = getAllocHrs(emp, empProjectFilter);
                    return h !== null ? h : 0;
                }
                const projects = [...new Set(rawRows.filter(r => r.assignee === emp).map(r => r.project))];
                return projects.reduce((s, proj) => { const h = getAllocHrs(emp, proj); return h !== null ? s + h : s; }, 0);
            },
            rowFilter
        );
    }, [buildChartData, filteredEmployees, rawRows, getAllocHrs, empProjectFilter]);

    // Employee-by-project breakdown — for the Excel "Employee by Project" sheet
    // One entry per unique (employee, project) pair, with same period structure
    const employeeProjectChartData = useMemo(() => {
        const pairs = [...new Set(
            rawRows.map(r => `${r.assignee}\x00${r.project}`)
        )].sort();

        return pairs.map(pair => {
            const [emp, proj] = pair.split('\x00');
            const entry = { name: emp, project: proj };

            allPeriods.forEach(period => {
                const done = doneRows
                    .filter(r => r.assignee === emp && r.project === proj && getPeriod(r) === period)
                    .reduce((s, r) => s + r.loggedTime, 0);
                const planned = plannedRows
                    .filter(r => r.assignee === emp && r.project === proj && getPeriod(r) === period)
                    .reduce((s, r) => s + r.estimateEffort, 0);
                const allocated = getAllocHrs(emp, proj) ?? 0;
                const totalPct  = allocated > 0 ? Math.round((done + planned) / allocated * 100) : null;

                entry[`${period}__done`]      = parseFloat(done.toFixed(1));
                entry[`${period}__planned`]   = parseFloat(planned.toFixed(1));
                entry[`${period}__allocated`] = allocated > 0 ? parseFloat(allocated.toFixed(1)) : 0;
                entry[`${period}__totalPct`]  = totalPct;
            });
            return entry;
        });
    }, [rawRows, doneRows, plannedRows, allPeriods, getPeriod, getAllocHrs]);

    // ── summary ────────────────────────────────────────────────────────
    const totalLogged  = doneRows.reduce((s, r) => s + r.loggedTime, 0);
    const totalPlanned = plannedRows.reduce((s, r) => s + r.estimateEffort, 0);

    // ── render ─────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '4px 0' }}>

            {/* Validation errors modal — always mounted so it can open over upload screen */}
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
                    Please fix the issues below in your Excel file and re-upload.
                </p>

                {/* Seconds reminder note */}
                <div style={{
                    background: '#fffbe6',
                    border: '1px solid #ffe58f',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 12,
                    color: '#7c4a00',
                }}>
                    <span style={{ fontSize: 15, lineHeight: 1.4 }}>⏱</span>
                    <span>
                        <b>Note:</b> The <b>Logged Time</b> and <b>Estimate Effort</b> columns must contain values in{' '}
                        <b>seconds</b> (e.g. <code style={{ background: '#fff1b8', padding: '1px 4px', borderRadius: 3 }}>3600</code>{' '}
                        = 1 hour). Values are automatically converted to hours for display.
                    </span>
                </div>


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

                {validationErrors?.errors.some(e => e.type === 'duplicate_row') && (<>
                    <Alert type="warning" showIcon style={{ marginBottom: 6, borderRadius: 8 }}
                        message={`${validationErrors.errors.filter(e => e.type === 'duplicate_row').length} exact duplicate row(s) found`}
                    />
                    <Table size="small"
                        dataSource={validationErrors.errors.filter(e => e.type === 'duplicate_row')}
                        rowKey="row"
                        pagination={{ pageSize: 8, size: 'small' }}
                        columns={[
                            { title: 'Excel Row', dataIndex: 'row', key: 'row', width: 90,
                                render: v => <b style={{ color: '#fa8c16' }}>Row {v}</b> },
                            { title: 'Issue', dataIndex: 'message', key: 'message',
                                render: v => <span style={{ fontSize: 12 }}>{v}</span> },
                        ]}
                    />
                </>)}
            </Modal>

            {/* Upload screen / Dashboard */}
            {!rawRows.length ? (
                <Card style={{ borderRadius: 12 }}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 700, color: '#333', marginBottom: 6 }}>
                            Upload Efforts Excel
                        </h3>
                        <p style={{ color: '#888', fontSize: 13 }}>
                            Required columns: <b>Primary Assignee, Workflow State, Title, Project, Start Date, End Date, Estimate Effort, Logged Time</b>
                        </p>
                        <p style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>
                            <CheckCircleOutlined /> Only tasks with state <b>Done / Completed</b> are counted in charts; planned tasks use <b>Estimate Effort</b>
                        </p>
                        <div style={{
                            background: '#fffbe6',
                            border: '1px solid #ffe58f',
                            borderRadius: 8,
                            padding: '10px 14px',
                            marginTop: 12,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            fontSize: 12,
                            color: '#7c4a00',
                            textAlign: 'left',
                        }}>
                            <span style={{ fontSize: 18, lineHeight: 1.3 }}>⏱</span>
                            <span>
                                <b>Note:</b> The <b>Logged Time</b> and <b>Estimate Effort</b> columns must contain values in{' '}
                                <b>seconds</b> — e.g.{' '}
                                <code style={{ background: '#fff1b8', padding: '1px 4px', borderRadius: 3 }}>3600</code>{' '}
                                = 1 hour. Values are automatically converted to hours for display and charts.
                            </span>
                        </div>
                    </div>
                    <Dragger accept=".xlsx,.xls" beforeUpload={handleFile} showUploadList={false}
                        style={{ borderRadius: 10, background: '#fafbff' }}>
                        <p style={{ fontSize: 44, color: '#4f8ef7', margin: '12px 0 8px' }}><InboxOutlined /></p>
                        <p style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>Click or drag an Excel file here</p>
                        <p style={{ color: '#aaa', fontSize: 12 }}>.xlsx or .xls files only</p>
                    </Dragger>
                    {uploading && <div style={{ textAlign: 'center', marginTop: 16 }}><Spin tip="Parsing…" /></div>}
                </Card>
            ) : (
                <>
                    {/* Header */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 12, alignItems: 'center' }}>
                        <Col flex="auto">
                            <span style={{ fontSize: 13, color: '#555' }}>
                                📄 <b>{fileName}</b>&nbsp;·&nbsp;
                                {rawRows.length} rows total&nbsp;·&nbsp;
                                <span style={{ color: '#52c41a', fontWeight: 600 }}>
                                    <CheckCircleOutlined /> {doneRows.length} completed tasks
                                </span>
                            </span>
                        </Col>
                        <Col>
                            <Button size="small" icon={<WarningOutlined />}
                                style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
                                onClick={() => setHealthChecks(runHealthChecks(rawRows, allocationMap, projectAllocMap))}>
                                Run Checks
                            </Button>
                        </Col>
                        <Col>
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                type="primary"
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                onClick={() => downloadSummaryExcel(
                                    filteredEmployeeChartData,
                                    projectChartData,
                                    allPeriods,
                                    fileName,
                                    periodMode,
                                    allocations,
                                    employeeProjectChartData,
                                    hrmsProjects,
                                    rawRows
                                )}
                            >
                                Download Summary
                            </Button>
                        </Col>
                        <Col>
                            <Button size="small" icon={<UploadOutlined />}
                                onClick={() => { setRawRows([]); setFileName(''); }}>
                                Re-upload
                            </Button>
                        </Col>
                    </Row>

                    {/* Summary cards */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                        {[
                            { title: 'Logged (Done tasks)', value: `${totalLogged.toFixed(1)} hrs`, icon: <CheckCircleOutlined />, color: '#52c41a' },
                            { title: 'Planned (Estimated)', value: `${totalPlanned.toFixed(1)} hrs`, icon: <ClockCircleOutlined />, color: '#fa8c16' },
                            { title: 'Assignees', value: allEmployees.length, icon: <TeamOutlined />, color: '#722ed1' },
                            { title: 'Projects', value: allProjects.length, icon: <ProjectOutlined />, color: '#4f8ef7' },
                        ].map(s => (
                            <Col key={s.title} xs={12} sm={6}>
                                <Card size="small" bordered={false}
                                    style={{ borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                                    <Statistic title={s.title} value={s.value}
                                        prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                                        valueStyle={{ fontSize: 16, fontWeight: 700, color: s.color }} />
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* Period toggle + detected periods */}
                    <Card size="small" style={{ borderRadius: 10, marginBottom: 14 }}>
                        <Row gutter={[16, 8]} align="middle">
                            <Col>
                                <span style={{ fontSize: 12, color: '#555', marginRight: 8 }}>View by:</span>
                                <Radio.Group value={periodMode}
                                    onChange={e => setPeriodMode(e.target.value)}
                                    buttonStyle="solid" size="small">
                                    <Radio.Button value="monthly">Monthly</Radio.Button>
                                    <Radio.Button value="weekly">Weekly</Radio.Button>
                                </Radio.Group>
                            </Col>
                            <Col>
                                <span style={{ fontSize: 11, color: '#999' }}>
                                    {allPeriods.length} {periodMode === 'weekly' ? 'week' : 'month'}{allPeriods.length !== 1 ? 's' : ''}:&nbsp;
                                    {allPeriods.map((p, i) => (
                                        <Tag key={p} style={{
                                            fontSize: 10, marginRight: 3, color: '#fff',
                                            background: PERIOD_COLORS[i % PERIOD_COLORS.length],
                                            borderColor: 'transparent'
                                        }}>{p}</Tag>
                                    ))}
                                </span>
                            </Col>
                        </Row>
                    </Card>

                    {/* Charts + Raw Data */}
                    <Tabs defaultActiveKey="project" type="card">
                        <TabPane tab={<span><ProjectOutlined /> Project Level</span>} key="project">
                            <Card bordered={false}
                                style={{ borderRadius: 10, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
                                title={
                                    <span style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>
                                        Hours by Project
                                        <span style={{ fontWeight: 400, color: '#888', fontSize: 12, marginLeft: 8 }}>
                                            — {periodMode === 'weekly' ? 'week' : 'month'}-wise · % label = % of allocation
                                        </span>
                                    </span>
                                }
                                extra={<span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>🖱 Click a bar to inspect rows</span>}
                                >
                                <GroupedBarChart data={projectChartData} periods={allPeriods}
                                    onBarClick={(name) => setDrillDown({
                                        type: 'project', name,
                                        rows: rawRows.filter(r => r.project === name),
                                    })} />
                            </Card>
                        </TabPane>

                        <TabPane tab={<span><TeamOutlined /> Employee Level</span>} key="employee">
                            <Card bordered={false}
                                style={{ borderRadius: 10, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
                                title={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>
                                            Hours by Employee
                                            <span style={{ fontWeight: 400, color: '#888', fontSize: 12, marginLeft: 8 }}>
                                                — {periodMode === 'weekly' ? 'week' : 'month'}-wise · % label = % of allocation
                                            </span>
                                        </span>
                                        <Select
                                            allowClear
                                            showSearch
                                            placeholder="Filter by project…"
                                            style={{ minWidth: 220, fontSize: 12 }}
                                            size="small"
                                            value={empProjectFilter}
                                            onChange={v => setEmpProjectFilter(v ?? null)}
                                            options={allProjects.map(p => ({ value: p, label: p }))}
                                        />
                                        {empProjectFilter && (
                                            <Tag color="blue" style={{ fontSize: 11 }}>
                                                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
                                            </Tag>
                                        )}
                                    </div>
                                }
                                extra={<span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>🖱 Click a bar to inspect rows</span>}
                            >
                                <GroupedBarChart data={filteredEmployeeChartData} periods={allPeriods}
                                    onBarClick={(name) => setDrillDown({
                                        type: 'employee', name,
                                        rows: (empProjectFilter
                                            ? rawRows.filter(r => r.assignee === name && r.project === empProjectFilter)
                                            : rawRows.filter(r => r.assignee === name)
                                        ),
                                    })} />
                            </Card>
                        </TabPane>

                        <TabPane tab={<span>🔍 Raw Data ({rawRows.length})</span>} key="raw">
                            <RawDataTable rows={rawRows} />
                        </TabPane>
                    </Tabs>

                    {/* Drill-down modal */}
                    <DrillDownModal drillDown={drillDown} onClose={() => setDrillDown(null)} />

                    {/* Health checks modal */}
                    <HealthChecksModal checks={healthChecks} onClose={() => setHealthChecks(null)} />
                </>
            )}
        </div>
    );
};

export default EffortsAnalyser;

