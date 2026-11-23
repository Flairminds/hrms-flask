import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Tooltip, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getAllLeaveBalances } from '../../services/api';
import { convertDate } from '../../util/helperFunctions';

const LEAVE_COLUMNS = [
    { title: 'Privilege Leave', leaveName: 'Privilege Leave' },
    { title: 'Sick/Emergency Leave', leaveName: 'Sick/Emergency Leave' },
    { title: 'Work From Home', leaveName: 'Work From Home' },
];

const getRemaining = (record, leaveName) => record.balances?.[leaveName]?.remaining;

// Remaining leaves of every active employee (current financial year). HR/Admin only.
export const LeaveBalancesTable = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchBalances = async () => {
        setLoading(true);
        try {
            const res = await getAllLeaveBalances();
            setRows(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            message.error('Failed to fetch leave balances');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    const uniqueFilters = (key) => [...new Set(rows.map((r) => r[key]))].filter(Boolean).map((v) => ({ text: v, value: v }));

    const columns = [
        {
            title: 'Employee ID',
            dataIndex: 'employee_id',
            key: 'employee_id',
            width: 130,
            filters: uniqueFilters('employee_id'),
            filterSearch: true,
            onFilter: (value, record) => record.employee_id === value,
        },
        {
            title: 'Employee Name',
            dataIndex: 'employee_name',
            key: 'employee_name',
            filters: uniqueFilters('employee_name'),
            filterSearch: true,
            onFilter: (value, record) => record.employee_name === value,
        },
        {
            title: 'Status',
            dataIndex: 'employment_status',
            key: 'employment_status',
            filters: uniqueFilters('employment_status'),
            onFilter: (value, record) => record.employment_status === value,
        },
        {
            title: 'Date of Joining',
            dataIndex: 'date_of_joining',
            key: 'date_of_joining',
            sorter: (a, b) => (a.date_of_joining || '').localeCompare(b.date_of_joining || ''),
            render: (value, record) => (
                <span>
                    {value ? convertDate(value) : '-'}
                    {record.joined_less_than_year && (
                        <Tooltip title="Has not completed 1 year yet">
                            <Tag color="orange" style={{ marginLeft: 8 }}>&lt; 1 year</Tag>
                        </Tooltip>
                    )}
                </span>
            ),
        },
        ...LEAVE_COLUMNS.map(({ title, leaveName }) => ({
            title,
            key: leaveName,
            align: 'center',
            sorter: (a, b) => (getRemaining(a, leaveName) ?? -Infinity) - (getRemaining(b, leaveName) ?? -Infinity),
            render: (_, record) => {
                const b = record.balances?.[leaveName];
                if (!b) return <span style={{ color: '#bbb' }}>-</span>;
                return (
                    <span>
                        <strong style={{ color: b.remaining < 0 ? '#f5222d' : undefined }}>{b.remaining}</strong>
                        <span style={{ color: '#999', fontSize: 12 }}> / {b.allotted}</span>
                    </span>
                );
            },
        })),
    ];

    return (
        <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                    <h3 style={{ margin: 0 }}>Remaining Leaves</h3>
                    <span style={{ color: '#888', fontSize: 12 }}>Active employees, current financial year (remaining / allotted)</span>
                </div>
                <Button icon={<ReloadOutlined />} onClick={fetchBalances} loading={loading}>Refresh</Button>
            </div>
            <Table
                columns={columns}
                dataSource={rows}
                rowKey="employee_id"
                loading={loading}
                pagination={{ pageSize: 15, showSizeChanger: false }}
                scroll={{ x: 'max-content' }}
                size="middle"
            />
        </div>
    );
};
