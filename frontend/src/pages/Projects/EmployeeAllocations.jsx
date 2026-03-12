import React, { useState, useEffect } from 'react';
import { Table, Button, Input, message, Card, Tag, InputNumber, Tooltip, Col, Row, Statistic, Progress } from 'antd';
import { SearchOutlined, CopyOutlined, TeamOutlined } from '@ant-design/icons';
import { getEmployeeAllocations } from '../../services/api';

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
