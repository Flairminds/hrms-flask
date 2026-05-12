import React, { useState, useEffect } from 'react';
import { Table, Button, Input, message, Card, Tag, InputNumber, Tooltip, Col, Row, Statistic, Progress } from 'antd';
import { SearchOutlined, CopyOutlined, TeamOutlined, DownloadOutlined } from '@ant-design/icons';
import { getEmployeeAllocations } from '../../services/api';
import XLSXStyle from 'xlsx-js-style';

const EmployeeAllocations = ({ stats }) => {
    const [employeeAllocations, setEmployeeAllocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employeeSearchText, setEmployeeSearchText] = useState('');
    const [allocationFilter, setAllocationFilter] = useState(null);
    const [billableAllocationFilter, setBillableAllocationFilter] = useState(null);

    useEffect(() => {
        fetchEmployeeAllocations();
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

    const filteredData = employeeAllocations.filter(emp => {
        const matchesName = !employeeSearchText || emp.employee_name.toLowerCase().includes(employeeSearchText.toLowerCase());
        const matchesAllocation = allocationFilter === null || emp.total_allocation <= allocationFilter;
        const matchesBillableAllocation = billableAllocationFilter === null || emp.billable_allocation <= billableAllocationFilter;
        return matchesName && matchesAllocation && matchesBillableAllocation;
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

    return (
        <div>
            {/* <h2 style={{ marginBottom: 24 }}>Employee Allocations Overview</h2> */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={24} md={10}>
                    <Card bordered={false} size='small'>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Statistic
                                    title="Allocation"
                                    value={stats.total_allocation}
                                    precision={1}
                                    suffix={`/ ${stats.total_employees}`}
                                    prefix={<TeamOutlined />}
                                />
                                <Progress
                                    percent={Math.round((stats.total_allocation / (stats.total_employees || 1)) * 100)}
                                    size="small"
                                    status="active"
                                    strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Billable"
                                    value={stats.billable_allocation}
                                    precision={1}
                                    suffix={`/ ${stats.total_allocation}`}
                                    prefix={<TeamOutlined />}
                                />
                                <Progress
                                    percent={Math.round((stats.billable_allocation / (stats.total_allocation || 1)) * 100)}
                                    size="small"
                                    status="active"
                                    strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Billable (total)"
                                    value={stats.billable_allocation}
                                    precision={1}
                                    suffix={`/ ${stats.total_employees}`}
                                    prefix={<TeamOutlined />}
                                />
                                <Progress
                                    percent={Math.round((stats.billable_allocation / (stats.total_employees || 1)) * 100)}
                                    size="small"
                                    status="active"
                                    strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                                />
                            </Col>
                        </Row>
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
