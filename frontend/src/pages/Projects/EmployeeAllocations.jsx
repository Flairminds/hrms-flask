import React, { useState, useEffect } from 'react';
import { Table, Button, Input, message, Card, Tag, InputNumber } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getEmployeeAllocations } from '../../services/api';

const EmployeeAllocations = () => {
    const [employeeAllocations, setEmployeeAllocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employeeSearchText, setEmployeeSearchText] = useState('');
    const [allocationFilter, setAllocationFilter] = useState(null);

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
        const matchesAllocation = allocationFilter === null || emp.total_allocation < allocationFilter || emp.billable_allocation < allocationFilter;
        return matchesName && matchesAllocation;
    });

    const columns = [
        { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
        { title: 'Name', dataIndex: 'employee_name', key: 'employee_name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Total Allocation',
            dataIndex: 'total_allocation',
            key: 'total_allocation',
            render: (val) => <b>{val.toFixed(2)}</b>,
            sorter: (a, b) => a.total_allocation - b.total_allocation
        },
        {
            title: 'Billable Allocation',
            dataIndex: 'billable_allocation',
            key: 'billable_allocation',
            render: (val) => <b>{val.toFixed(2)}</b>,
            sorter: (a, b) => a.billable_allocation - b.billable_allocation
        }
    ];

    const expandedRowRender = (record) => {
        const projectColumns = [
            { title: 'Project', dataIndex: 'project_name', key: 'project_name' },
            { title: 'Role', dataIndex: 'role', key: 'role' },
            { title: 'Allocation %', dataIndex: 'allocation', key: 'allocation', render: (val) => `${val}%` },
            {
                title: 'Billable',
                dataIndex: 'is_billing',
                key: 'is_billing',
                render: (val) => val ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>
            }
        ];

        return (
            <div style={{ margin: 0 }}>
                <h4>Project Allocations:</h4>
                <Table
                    columns={projectColumns}
                    dataSource={record.projects}
                    pagination={false}
                    size="small"
                    rowKey="project_id"
                />
            </div>
        );
    };

    return (
        <div>
            {/* <h2 style={{ marginBottom: 24 }}>Employee Allocations Overview</h2> */}
            <Card>
                <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Input
                        placeholder="Search by employee name..."
                        prefix={<SearchOutlined />}
                        value={employeeSearchText}
                        onChange={e => setEmployeeSearchText(e.target.value)}
                        style={{ width: 300 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Show allocation {'<'}</span>
                        <InputNumber
                            min={0}
                            max={1}
                            step={0.1}
                            value={allocationFilter}
                            onChange={setAllocationFilter}
                            placeholder="e.g., 0.5"
                            style={{ width: 100 }}
                        />
                    </div>
                </div>

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
                />
            </Card>
        </div>
    );
};

export default EmployeeAllocations;
