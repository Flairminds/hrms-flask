import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Input, message, Card, Tag, InputNumber, Tooltip, Col, Row, Statistic, Progress, Segmented } from 'antd';
import { SearchOutlined, CopyOutlined, TeamOutlined, DownloadOutlined } from '@ant-design/icons';
import { getEmployeeAllocations, getProjects } from '../../services/api';
import XLSXStyle from 'xlsx-js-style';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// Classifies one employee-project allocation the same way the Timesheet
// Analyser's Category Breakdown does, so the two screens agree: Client
// Project splits into Billable/Non-billable (by that allocation's own
// is_billing flag), Internal uses the project's configured sub-category, and
// a project with no category configured falls under Uncategorized.
const classifyAllocation = (projectName, isBilling, projectCategoryIndex) => {
    const proj = projectCategoryIndex[String(projectName || '').toLowerCase().trim()];
    if (proj?.category === 'Internal') {
        return { category: 'Internal', subCategory: proj.sub_category || 'Other Internal Work' };
    }
    if (proj?.category === 'Client Project') {
        return { category: 'Client Project', subCategory: isBilling ? 'Billable' : 'Non-billable' };
    }
    return { category: 'Uncategorized', subCategory: 'Uncategorized' };
};

// Roles that aren't really available for project assignment in the first
// place — excluded from the "Available for Billable Allocation" figure/filter.
const NON_PROJECT_SUB_ROLES = ['Human Resource Manager', 'Sales & Marketing'];

const EmployeeAllocations = () => {
    const [employeeAllocations, setEmployeeAllocations] = useState([]);
    const [hrmsProjects, setHrmsProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employeeSearchText, setEmployeeSearchText] = useState('');
    const [allocationFilter, setAllocationFilter] = useState(null);
    const [billableAllocationFilter, setBillableAllocationFilter] = useState(null);
    const [summaryCategoryFilter, setSummaryCategoryFilter] = useState(null); // null | a summary row's key — set by clicking an Allocation Summary row
    const [summaryLevel, setSummaryLevel] = useState('category'); // 'category' or 'subcategory'

    useEffect(() => {
        fetchEmployeeAllocations();
        getProjects()
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data?.projects || []);
                setHrmsProjects(data);
            })
            .catch(e => console.error('Failed to load projects for allocation categorization', e));
    }, []);

    const fetchEmployeeAllocations = async () => {
        setLoading(true);
        try {
            const response = await getEmployeeAllocations();
            setEmployeeAllocations(response.data);
        } catch (err) {
            message.error('Failed to fetch employee allocations');
        } finally {
            setLoading(false);
        }
    };

    const projectCategoryIndex = useMemo(() => {
        const idx = {};
        hrmsProjects.forEach(p => {
            const key = String(p.project_name || '').toLowerCase().trim();
            if (key) idx[key] = p;
        });
        return idx;
    }, [hrmsProjects]);

    const downloadExcel = () => {
        const wb = XLSXStyle.utils.book_new();

        // ── Sheet 1: Allocation Details (one row per employee-project) ──
        const sheet1Rows = [];
        employeeAllocations.forEach(emp => {
            if (emp.projects && emp.projects.length > 0) {
                emp.projects.forEach(proj => {
                    sheet1Rows.push({
                        'Employee Name': emp.employee_name,
                        'Employee ID': emp.employee_id,
                        'Project Name': proj.project_name,
                        'Allocation (%)': proj.allocation,
                        'Billable': proj.is_billing ? 'Yes' : 'No',
                        'Role': proj.role || '',
                        'Lead': proj.lead_name || ''
                    });
                });
            } else {
                sheet1Rows.push({
                    'Employee Name': emp.employee_name,
                    'Employee ID': emp.employee_id,
                    'Project Name': '—',
                    'Allocation (%)': 0,
                    'Billable': '—',
                    'Role': '—',
                    'Lead': '—'
                });
            }
        });
        const ws1 = XLSXStyle.utils.json_to_sheet(sheet1Rows);
        ws1['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 22 }];
        XLSXStyle.utils.book_append_sheet(wb, ws1, 'Allocation Details');

        // ── Sheet 2: Employee-level aggregation with conditional cell coloring ──
        const sheet2Data = employeeAllocations.map(emp => {
            const projects = emp.projects || [];
            const billableAlloc = projects
                .filter(p => p.is_billing)
                .reduce((sum, p) => sum + (p.allocation || 0), 0);
            return {
                employeeName: emp.employee_name,
                employeeId: emp.employee_id,
                managerName: emp.manager_name || '',
                totalAllocation: Number((emp.total_allocation * 100).toFixed(2)),
                totalBillable: Number(billableAlloc.toFixed(2)),
                projectCount: projects.length
            };
        });

        // Helper: determine ROW background color based on Total Allocation (%)
        // Returns light red for <=50 or empty, light orange for 50<val<100, null for 100%
        const getRowBgColor = (val) => {
            if (val === null || val === undefined || val === '') return 'FFFFE6E6'; // light red
            if (val <= 50) return 'FFFFE6E6';  // light red
            if (val < 100) return 'FFFFF3E0'; // light orange
            return null; // no fill for 100%
        };

        // Build header row manually
        const s2Headers = ['Employee Name', 'Employee ID', 'Manager (Leave Approver)', 'Total Allocation (%)', 'Total Billable Allocation (%)', 'No. of Projects Assigned'];
        const headerStyle = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'FFD3D3D3' } },
            border: {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' }
            }
        };

        const ws2 = {};
        // Write header
        s2Headers.forEach((h, ci) => {
            const cellRef = XLSXStyle.utils.encode_cell({ r: 0, c: ci });
            ws2[cellRef] = { v: h, t: 's', s: headerStyle };
        });

        // Write data rows — entire row gets the row color; Total Allocation cell also gets bold
        sheet2Data.forEach((row, ri) => {
            const rowValues = [
                row.employeeName,
                row.employeeId,
                row.managerName,
                row.totalAllocation,
                row.totalBillable,
                row.projectCount
            ];
            const rowBgRgb = getRowBgColor(row.totalAllocation);

            rowValues.forEach((val, ci) => {
                const cellRef = XLSXStyle.utils.encode_cell({ r: ri + 1, c: ci });
                const cellType = typeof val === 'number' ? 'n' : 's';
                const cellStyle = {};

                if (rowBgRgb) {
                    // Apply light row highlight to all columns
                    cellStyle.fill = { fgColor: { rgb: rowBgRgb } };
                }

                if (ci === 3 && rowBgRgb) {
                    // Make the Total Allocation cell bold for emphasis (now at index 3)
                    cellStyle.font = { bold: true };
                }

                ws2[cellRef] = { v: val, t: cellType, s: Object.keys(cellStyle).length ? cellStyle : undefined };
            });
        });

        ws2['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sheet2Data.length, c: s2Headers.length - 1 } });
        ws2['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 28 }, { wch: 24 }];
        XLSXStyle.utils.book_append_sheet(wb, ws2, 'Employee Summary');

        // ── Sheet 3: Company-level summary ──
        const totalActiveEmployees = employeeAllocations.length;
        const totalAllocation = employeeAllocations.reduce((sum, emp) => sum + (emp.total_allocation || 0), 0);
        const totalBillable = employeeAllocations.reduce((sum, emp) => sum + (emp.billable_allocation || 0), 0);
        const sheet3Rows = [
            {
                'Metric': 'Total Active Employees',
                'Value': totalActiveEmployees
            },
            {
                'Metric': 'Total Allocation (sum across employees)',
                'Value': Number(totalAllocation.toFixed(2))
            },
            {
                'Metric': 'Total Billable Allocation (sum across employees)',
                'Value': Number(totalBillable.toFixed(2))
            }
        ];
        const ws3 = XLSXStyle.utils.json_to_sheet(sheet3Rows);
        ws3['!cols'] = [{ wch: 48 }, { wch: 16 }];
        XLSXStyle.utils.book_append_sheet(wb, ws3, 'Company Summary');

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mmm = now.toLocaleString('en-GB', { month: 'short' });
        const yy = String(now.getFullYear()).slice(-2);
        const dateSuffix = `${dd}-${mmm}-${yy}`;
        XLSXStyle.writeFile(wb, `Employee_Allocations_${dateSuffix}.xlsx`);
        message.success('Excel downloaded successfully!');
    };

    // summaryCategoryFilter is a row key: 'Not Allocated', 'Available for
    // Allocation', a bare category ('Client Project', 'Internal',
    // 'Uncategorized') from the category-level view, or 'Category —
    // Sub-category' from the sub-category view.
    const matchesSummaryCategory = (emp) => {
        if (!summaryCategoryFilter) return true;
        if (summaryCategoryFilter === 'Not Allocated') return (emp.total_allocation || 0) <= 0.001;
        if (summaryCategoryFilter === 'Available for Billable Allocation') {
            if (NON_PROJECT_SUB_ROLES.includes(emp.sub_role_name)) return false;
            const totalAlloc = emp.total_allocation || 0;
            const nonBillableAlloc = totalAlloc - (emp.billable_allocation || 0);
            const isNotAllocated = totalAlloc <= 0.001;
            return isNotAllocated || nonBillableAlloc > 0.001;
        }
        const [filterCategory, filterSub] = summaryCategoryFilter.split(' — ');
        return (emp.projects || []).some(p => {
            const { category, subCategory } = classifyAllocation(p.project_name, p.is_billing, projectCategoryIndex);
            if (category !== filterCategory) return false;
            return filterSub ? subCategory === filterSub : true;
        });
    };

    const filteredData = employeeAllocations.filter(emp => {
        const matchesName = !employeeSearchText || emp.employee_name.toLowerCase().includes(employeeSearchText.toLowerCase());
        const matchesAllocation = allocationFilter === null || emp.total_allocation <= allocationFilter;
        const matchesBillableAllocation = billableAllocationFilter === null || emp.billable_allocation <= billableAllocationFilter;
        return matchesName && matchesAllocation && matchesBillableAllocation && matchesSummaryCategory(emp);
    });

    const columns = [
        { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
        { title: 'Name', dataIndex: 'employee_name', key: 'employee_name' },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (email) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{email}</span>
                    {email && (
                        <Tooltip title="Copy email">
                            <CopyOutlined
                                style={{ color: '#1890ff', cursor: 'pointer', fontSize: 13 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(email).then(() => {
                                        message.success('Email copied!');
                                    });
                                }}
                            />
                        </Tooltip>
                    )}
                </span>
            ),
        },
        {
            title: 'Total Allocation',
            dataIndex: 'total_allocation',
            key: 'total_allocation',
            render: (val) => <span style={{ color: val < 1 ? 'red' : 'inherit' }}>{val.toFixed(2)}</span>,
            sorter: (a, b) => a.total_allocation - b.total_allocation
        },
        {
            title: 'Billable Allocation',
            dataIndex: 'billable_allocation',
            key: 'billable_allocation',
            render: (val) => <span>{val.toFixed(2)}</span>,
            sorter: (a, b) => a.billable_allocation - b.billable_allocation
        }
    ];

    const expandedRowRender = (record) => {
        const projectColumns = [
            { title: 'Project', dataIndex: 'project_name', key: 'project_name' },
            { title: 'Role', dataIndex: 'role', key: 'role' },
            { title: 'Lead', dataIndex: 'lead_name', key: 'lead_name' },
            { title: 'Allocation %', dataIndex: 'allocation', key: 'allocation', render: (val) => `${val}%` },
            {
                title: 'Billable',
                dataIndex: 'is_billing',
                key: 'is_billing',
                render: (val) => val ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>
            }
        ];

        return (
            <div style={{ margin: '0 0 0 5rem' }}>
                {/* <h4>Project Allocations:</h4> */}
                <Table
                    columns={projectColumns}
                    dataSource={record.projects}
                    pagination={false}
                    size="small"
                    rowKey="project_id"
                    scroll={{ x: 'max-content' }}
                />
            </div>
        );
    };

    // Sub-category rows: sum each employee-project allocation (as FTE,
    // allocation% / 100) into its "Category — Sub-category" bucket, the same
    // taxonomy the Timesheet Analyser's Category Breakdown uses.
    const allocationSubRows = (() => {
        const map = {};
        employeeAllocations.forEach(emp => {
            (emp.projects || []).forEach(p => {
                const { category, subCategory } = classifyAllocation(p.project_name, p.is_billing, projectCategoryIndex);
                const key = `${category} — ${subCategory}`;
                if (!map[key]) map[key] = { key, category, subCategory, value: 0 };
                map[key].value += (p.allocation || 0) / 100;
            });
        });
        return Object.values(map)
            .map(r => ({ ...r, value: Number(r.value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
    })();

    // Category-level rollup of the sub-rows above (Client Project / Internal
    // / Uncategorized) — the default view.
    const allocationCategoryRows = (() => {
        const map = {};
        allocationSubRows.forEach(r => {
            if (!map[r.category]) map[r.category] = { key: r.category, category: r.category, value: 0 };
            map[r.category].value += r.value;
        });
        return Object.values(map)
            .map(r => ({ ...r, value: Number(r.value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
    })();

    // "Not Allocated" is a headcount of employees with (effectively) zero
    // allocation — computed from this same employeeAllocations roster so it
    // always reconciles with the category rows above and the "Total Active
    // Employees" count below, rather than an FTE gap against the separate
    // `stats` dashboard aggregate (a different backend query, which can
    // disagree with this roster's own numbers and silently mask real
    // unallocated headcount, e.g. when over-allocated employees offset it).
    const notAllocatedCount = employeeAllocations.filter(emp => (emp.total_allocation || 0) <= 0.001).length;
    const notAllocatedRow = { key: 'Not Allocated', category: 'Not Allocated', value: notAllocatedCount };

    // "Available for Billable Allocation to a project" — headcount, not a row in the
    // breakdown above: total active employees, minus the FTE already
    // committed to billable client work, minus employees whose role isn't
    // really available for project assignment in the first place (HR /
    // Sales & Marketing).
    const billableAllocationFTE = employeeAllocations.reduce((sum, emp) => sum + (emp.billable_allocation || 0), 0);
    const nonProjectRoleCount = employeeAllocations.filter(emp => NON_PROJECT_SUB_ROLES.includes(emp.sub_role_name)).length;
    const availableForAllocation = employeeAllocations.length - billableAllocationFTE - nonProjectRoleCount;

    const summaryRows = [
        ...(summaryLevel === 'subcategory' ? allocationSubRows : allocationCategoryRows),
        notAllocatedRow,
    ];

    const PIE_COLORS_PALETTE = ['#87d068', '#108ee9', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#a0d911', '#faad14'];
    const colorForRow = (row, idx) => row.key === 'Not Allocated' ? '#ff4d4f' : PIE_COLORS_PALETTE[idx % PIE_COLORS_PALETTE.length];

    const pieData = summaryRows.map(r => ({ name: r.key, value: r.value }));
    const PIE_COLORS = summaryRows.map((r, idx) => colorForRow(r, idx));

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value }) => {
        if (value === 0) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const summaryColumns = [
        { title: '', dataIndex: 'category', key: 'category', render: (text, record) => <span style={{ color: record.color, fontWeight: 'bold' }}>{text}</span> },
        { title: 'Value', dataIndex: 'value', key: 'value', render: val => <b>{val}</b> }
    ];

    const summaryData = [
        { key: 'total', category: 'Total Active Employees', value: employeeAllocations.length, color: '#000', filterKey: null },
        ...summaryRows.map((r, idx) => ({
            key: r.key,
            category: r.key,
            value: r.value,
            color: colorForRow(r, idx),
            filterKey: r.key,
        })),
    ];

    return (
        <div>
            {/* <h2 style={{ marginBottom: 24 }}>Employee Allocations Overview</h2> */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={24} md={12} lg={10}>
                    <Card bordered={false} size='small' title="Allocation Overview">
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={24} md={12} lg={14}>
                    <Card bordered={false} size='small' title="Allocation Summary"
                        extra={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>Click a row to filter the table below</span>
                                <Segmented
                                    size="small"
                                    value={summaryLevel}
                                    onChange={setSummaryLevel}
                                    options={[
                                        { label: 'Category', value: 'category' },
                                        { label: 'Sub-category', value: 'subcategory' },
                                    ]}
                                />
                            </div>
                        }>
                        <Table
                            columns={summaryColumns}
                            dataSource={summaryData}
                            pagination={false}
                            size="small"
                            onRow={(record) => {
                                const isActive = summaryCategoryFilter !== null && record.filterKey === summaryCategoryFilter;
                                return {
                                    onClick: () => setSummaryCategoryFilter(prev => (prev === record.filterKey ? null : record.filterKey)),
                                    style: {
                                        cursor: 'pointer',
                                        background: isActive ? '#e6f4ff' : undefined,
                                    },
                                };
                            }}
                        />
                    </Card>
                </Col>
            </Row>
            <Card>
                <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Input
                        placeholder="Search by employee name..."
                        prefix={<SearchOutlined />}
                        value={employeeSearchText}
                        onChange={e => setEmployeeSearchText(e.target.value)}
                        style={{ width: '100%', maxWidth: 300 }}
                    />
                    <div>Filter:</div>
                    <Button
                        type={allocationFilter === 0.5 ? 'primary' : 'default'}
                        onClick={() => setAllocationFilter(allocationFilter === 0.5 ? null : 0.5)}
                    >
                        {`Total allocation <= 0.5`}
                    </Button>
                    <Button
                        type={billableAllocationFilter === 0.5 ? 'primary' : 'default'}
                        onClick={() => setBillableAllocationFilter(billableAllocationFilter === 0.5 ? null : 0.5)}
                    >
                        {`Billable allocation <= 0.5`}
                    </Button>
                    <Tooltip title={`Basis: ${employeeAllocations.length} total employees − ${billableAllocationFTE.toFixed(2)} FTE already committed to billable client work − ${nonProjectRoleCount} employees in HR / Sales & Marketing roles = ${availableForAllocation.toFixed(2)}. Filters the table to employees with spare capacity (total allocation < 1) who aren't in an HR/Sales role — this headcount won't exactly equal the FTE figure above, since one is a capacity estimate and the other counts people.`}>
                        <Button
                            type={summaryCategoryFilter === 'Available for Billable Allocation' ? 'primary' : 'default'}
                            onClick={() => setSummaryCategoryFilter(prev => (prev === 'Available for Billable Allocation' ? null : 'Available for Billable Allocation'))}
                        >
                            Available for Billable Allocation: {availableForAllocation.toFixed(2)}
                        </Button>
                    </Tooltip>
                    {summaryCategoryFilter && (
                        <Tag
                            color="blue"
                            closable
                            onClose={() => setSummaryCategoryFilter(null)}
                        >
                            {summaryCategoryFilter}
                        </Tag>
                    )}
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={downloadExcel}
                        style={{ marginLeft: 'auto' }}
                    >
                        Download Excel
                    </Button>
                </div>

                {filteredData.length} employees

                <Table
                    columns={columns}
                    dataSource={filteredData}
                    expandable={{
                        expandedRowRender,
                        rowExpandable: (record) => record.projects && record.projects.length > 0
                    }}
                    rowKey="employee_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>
        </div>
    );
};

export default EmployeeAllocations;
