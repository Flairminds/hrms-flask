import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Card, Tabs, Upload, Button, Radio, message, Empty, Spin,
    Row, Col, Statistic, Tag, Table, Input, Badge, Modal, Alert
} from 'antd';
import {
    InboxOutlined, UploadOutlined,
    TeamOutlined, ProjectOutlined, ClockCircleOutlined, CheckCircleOutlined, WarningOutlined
} from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, LabelList
} from 'recharts';
import * as XLSX from 'xlsx';
import { getEmployeeAllocations } from '../../services/api';

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
    '2 BNYM': 'BNY-M'
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
const runHealthChecks = (rows, allocationMap) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overHours     = [];  // rule 1: estimate or logged > 40 hrs
    const loggedOverEst = [];  // rule 2: logged > estimated
    const overdueOpen   = [];  // rule 3: past end date but not done

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
    });

    // ── Mapping diagnostics: find Excel names with no HRMS allocation match ─────
    const excelProjects  = [...new Set(rows.map(r => r.project))].sort();
    const excelEmployees = [...new Set(rows.map(r => r.assignee))].sort();

    // All HRMS employee keys and project keys available in the allocation map
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

    return { overHours, loggedOverEst, overdueOpen, unmappedProjects, unmappedEmployees };
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
    const { overHours, loggedOverEst, overdueOpen, unmappedProjects, unmappedEmployees } = checks;
    const total = overHours.length + loggedOverEst.length + overdueOpen.length;
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
                    <BarChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: bottomMargin }}
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
                                        content={({ x, y, width, value }) => {
                                            if (!value) return null;
                                            const isPercent = String(value).endsWith('%');
                                            const pct = isPercent ? parseInt(value) : null;
                                            const pctColor = pct == null ? '#666'
                                                : pct >= 90 ? '#096dd9'
                                                : pct >= 60 ? '#d46b08' : '#cf1322';
                                            return (
                                                <text x={x + width / 2} y={y - 3}
                                                    textAnchor="middle" fill={pctColor}
                                                    fontSize={9} fontWeight={700}>
                                                    {value}
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
                                        content={({ x, y, width, value }) => {
                                            if (!value) return null;
                                            const isPercent = String(value).endsWith('%');
                                            const pct = isPercent ? parseInt(value) : null;
                                            const pctColor = pct == null ? '#666'
                                                : pct >= 90 ? '#096dd9'
                                                : pct >= 60 ? '#d46b08' : '#cf1322';
                                            return (
                                                <text x={x + width / 2} y={y - 3}
                                                    textAnchor="middle" fill={pctColor}
                                                    fontSize={9} fontWeight={700}>
                                                    {value}
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

// ── main component ─────────────────────────────────────────────────────────
const EffortsAnalyser = () => {
    const [rawRows, setRawRows] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [periodMode, setPeriodMode] = useState('monthly');
    const [fileName, setFileName] = useState('');
    const [validationErrors, setValidationErrors] = useState(null); // null = closed
    const [drillDown, setDrillDown] = useState(null);     // { type, name, rows }
    const [healthChecks, setHealthChecks] = useState(null); // null = closed

    // Fetch HRMS employee allocations once on mount
    useEffect(() => {
        getEmployeeAllocations()
            .then(res => setAllocations(res.data || []))
            .catch(e => console.error('Failed to load allocations', e));
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

    const WEEKS_PER_MONTH = 4.33;
    const getAllocHrs = useCallback((assignee, project) => {
        // Resolve both Excel names to their HRMS equivalents before lookup
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
    const buildChartData = useCallback((entities, getKey, getAllocForEntity) =>
        entities.map(entity => {
            const entry = { name: entity };
            allPeriods.forEach(period => {
                const done = doneRows
                    .filter(r => getKey(r) === entity && getPeriod(r) === period)
                    .reduce((s, r) => s + r.loggedTime, 0);
                // Planned: use estimateEffort directly (not max(0, est - logged))
                const planned = plannedRows
                    .filter(r => getKey(r) === entity && getPeriod(r) === period)
                    .reduce((s, r) => s + r.estimateEffort, 0);
                const allocated = getAllocForEntity(entity);

                const donePct    = allocated > 0 ? Math.round(done    / allocated * 100) : null;
                const plannedPct = allocated > 0 ? Math.round(planned / allocated * 100) : null;
                const totalPct   = allocated > 0 ? Math.round((done + planned) / allocated * 100) : null;

                entry[`${period}__done`]       = parseFloat(done.toFixed(1));
                entry[`${period}__planned`]    = parseFloat(planned.toFixed(1));
                entry[`${period}__allocated`]  = allocated > 0 ? parseFloat(allocated.toFixed(1)) : 0;
                entry[`${period}__donePct`]    = donePct;
                entry[`${period}__plannedPct`] = plannedPct;
                entry[`${period}__totalPct`]   = totalPct;

                // Pre-computed top-of-bar labels — split so each bar only shows
                // the label when it is the topmost segment.
                const total = done + planned;
                const labelText = total <= 0 ? ''
                    : totalPct != null ? `${totalPct}%`
                    : total.toFixed(0);
                // done bar carries the label only when there is no planned bar on top
                entry[`${period}__label_done`]    = (total > 0 && planned === 0) ? labelText : '';
                // planned bar carries the label when it is the topmost segment
                entry[`${period}__label_planned`] = (total > 0 && planned > 0)  ? labelText : '';
            });
            return entry;
        }),
    [doneRows, plannedRows, allPeriods, getPeriod, getAllocHrs]);

    // Project chart: allocated = sum of all assignees on that project
    const projectChartData = useMemo(() => buildChartData(
        allProjects, r => r.project,
        (proj) => {
            const assignees = [...new Set(rawRows.filter(r => r.project === proj).map(r => r.assignee))];
            return assignees.reduce((s, a) => { const h = getAllocHrs(a, proj); return h !== null ? s + h : s; }, 0);
        }
    ), [buildChartData, allProjects, rawRows, getAllocHrs]);

    // Employee chart: allocated = sum across all projects of that employee
    const employeeChartData = useMemo(() => buildChartData(
        allEmployees, r => r.assignee,
        (emp) => {
            const projects = [...new Set(rawRows.filter(r => r.assignee === emp).map(r => r.project))];
            return projects.reduce((s, proj) => { const h = getAllocHrs(emp, proj); return h !== null ? s + h : s; }, 0);
        }
    ), [buildChartData, allEmployees, rawRows, getAllocHrs]);

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
                                onClick={() => setHealthChecks(runHealthChecks(rawRows, allocationMap))}>
                                Run Checks
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
                                    <span style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>
                                        Hours by Employee
                                        <span style={{ fontWeight: 400, color: '#888', fontSize: 12, marginLeft: 8 }}>
                                            — {periodMode === 'weekly' ? 'week' : 'month'}-wise · % label = % of allocation
                                        </span>
                                    </span>
                                }
                                extra={<span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>🖱 Click a bar to inspect rows</span>}
                                >
                                <GroupedBarChart data={employeeChartData} periods={allPeriods}
                                    onBarClick={(name) => setDrillDown({
                                        type: 'employee', name,
                                        rows: rawRows.filter(r => r.assignee === name),
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

