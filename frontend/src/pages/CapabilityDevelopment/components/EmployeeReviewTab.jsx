import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Modal, Form, Input, DatePicker, Select, Space,
    Popconfirm, Typography, Tag, message, Spin, Tooltip, Empty, Row, Col, Card, Statistic, Segmented
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
    LinkOutlined, ExclamationCircleOutlined, FileTextOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import {
    getEmployeeReviews,
    getAllEmployees
} from '../../../services/api';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { convertDate } from '../../../util/helperFunctions';

dayjs.extend(isBetween);

const { Text, Title, Link } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const STATUS_COLOR = {
    'Pending': 'orange',
    'Reviewed': 'green',
    'Extended': 'blue'
};

// Reviews are only scheduled for people currently on the team — exclude
// employees who've left (Relieved/Absconding/Terminated) from the pickers.
const INACTIVE_STATUSES = ['relieved', 'absconding', 'terminated'];

const EmployeeReviewTab = ({ onOpenPerformanceReview } = {}) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const activeEmployees = useMemo(
        () => employees.filter(e => !INACTIVE_STATUSES.includes((e.employmentStatus || '').toLowerCase())),
        [employees]
    );
    const [search, setSearch] = useState('');
    const [loadingEmployees, setLoadingEmployees] = useState(false);


    // RBAC: HR/Admin/Lead can edit/delete/add
    const canManage = ['admin', 'hr', 'lead'].includes(user?.roleName?.toLowerCase());

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch reviews
            const res = await getEmployeeReviews();
            setReviews(Array.isArray(res.data) ? res.data : []);

            // If manager, fetch employee list for dropdown/filter
            if (canManage) {
                setLoadingEmployees(true);
                const empRes = await getAllEmployees();
                setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
                setLoadingEmployees(false);
            }
        } catch (err) {
            console.error(err);
            message.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user, canManage]);

    // Filtered Reviews
    const filteredReviews = useMemo(() => {
        if (!search.trim()) return reviews;
        const q = search.toLowerCase();
        return reviews.filter(r => {
            return (
                r.employee_name.toLowerCase().includes(q) ||
                (r.review_comment && r.review_comment.toLowerCase().includes(q)) ||
                (r.status && r.status.toLowerCase().includes(q))
            );
        });
    }, [reviews, search, employees]);

    // Calculate monthly stats
    const monthlyStats = useMemo(() => {
        const currentMonth = dayjs().startOf('month');
        const currentMonthEnd = dayjs().endOf('month');

        const pending = reviews.filter(r => 
            r.status === 'Pending' && 
            dayjs(r.review_date).isBetween(currentMonth, currentMonthEnd, null, '[]')
        ).length;

        const scheduled = reviews.filter(r => 
            r.status === 'Scheduled' && 
            dayjs(r.review_date).isBetween(currentMonth, currentMonthEnd, null, '[]')
        ).length;

        const completed = reviews.filter(r => 
            r.status === 'Reviewed' && 
            r.reviewed_date && 
            dayjs(r.reviewed_date).isBetween(currentMonth, currentMonthEnd, null, '[]')
        ).length;

        return { pending, scheduled, completed };
    }, [reviews]);

    // Columns
    const columns = [
        {
            title: 'Employee',
            dataIndex: 'employee_id',
            key: 'employee_id',
            filters: [...new Set(reviews.map(e => e.employee_name).filter(Boolean))].map(s => ({ text: s, value: s })),
            onFilter: (value, record) => record.employee_name === value,
            filterSearch: true,
            render: (id) => {
                const emp = reviews.find(e => e.employee_id === id);
                return <Text strong>{emp.employee_name} <Text type="secondary" style={{ fontSize: 12 }}>({id})</Text></Text>
            }
        },
        {
            title: 'Employee Status',
            dataIndex: 'employment_status',
            key: 'employment_status',
            filters: [...new Set(reviews.map(e => e.employment_status).filter(Boolean))].map(s => ({ text: s, value: s })),
            onFilter: (value, record) => {
                const emp = reviews.find(e => e.employment_status === record.employment_status);
                return emp?.employment_status === value;
            },
            render: (status) => {
                return <Text strong>{status}</Text>;
            },
        },
        {
            title: 'Period',
            dataIndex: 'period',
            key: 'period',
            filters: [...new Set(reviews.map(e => e.period).filter(Boolean))].map(s => ({ text: s, value: s })),
            onFilter: (value, record) => record.period === value,
            filterSearch: true,
            render: (period, record) => period ? (
                <div>
                    <Tag>{period}</Tag>
                    {record.period_range && record.period_range !== period && (
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{record.period_range}</div>
                    )}
                </div>
            ) : '-'
        },
        {
            title: 'Scheduled Date',
            dataIndex: 'review_date',
            key: 'review_date',
            sorter: (a, b) => new Date(a.review_date) - new Date(b.review_date),
            render: (date) => convertDate(date) || '-'
        },
        {
            title: 'Reviewed Date',
            dataIndex: 'reviewed_date',
            key: 'reviewed_date',
            render: (date) => convertDate(date) || '-'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => <Tag color={STATUS_COLOR[status] || 'default'}>{status}</Tag>,
            filters: [...new Set(reviews.map(e => e.status).filter(Boolean))].map(s => ({ text: s, value: s })),
            onFilter: (value, record) => {
                const emp = reviews.find(e => e.status === record.status);
                return emp?.status === value;
            },
            defaultFilteredValue: ['Pending']
        },
        {
            title: 'Comments',
            dataIndex: 'review_comment',
            key: 'review_comment',
            ellipsis: true,
            render: (text) => (
                <Tooltip title={text}>
                    <span>{text}</span>
                </Tooltip>
            )
        },
        {
            title: 'File',
            dataIndex: 'file_link',
            key: 'file_link',
            render: (link) => link ? (
                <Link href={link} target="_blank" rel="noopener noreferrer">
                    <LinkOutlined /> View
                </Link>
            ) : '-'
        },
        ...(canManage ? [{
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.perf_cycle_id && onOpenPerformanceReview && (
                        <Tooltip title="Fill in / view the Self, Lead & HR scored review">
                            <Button
                                size="small"
                                icon={<FileTextOutlined />}
                                onClick={() => onOpenPerformanceReview({
                                    cycleId: record.perf_cycle_id,
                                    employeeId: record.employee_id,
                                })}
                            >
                                Review
                            </Button>
                        </Tooltip>
                    )}
                </Space>
            )
        }] : [])
    ];

    return (
        <div style={{ padding: '0 4px' }}>
            <p>
                Reviews to be done monthly for Interns and Probationers, and quarterly for Confirmed employees.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <Space>
                    {/* <Input
                        placeholder="Search..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', maxWidth: 250 }}
                    /> */}
                    <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                        <div>This month:</div>
                        <div style={{background: 'white', padding: '12px', borderRadius: '12px'}}><span style={{fontSize: 'larger', fontWeight: '600', color: 'red'}}>{monthlyStats.pending}</span> pending</div>
                        <div style={{background: 'white', padding: '12px', borderRadius: '12px'}}><span style={{fontSize: 'larger', fontWeight: '600', color: 'orange'}}>{monthlyStats.scheduled}</span> scheduled</div>
                        <div style={{background: 'white', padding: '12px', borderRadius: '12px'}}><span style={{fontSize: 'larger', fontWeight: '600', color: 'green'}}>{monthlyStats.completed}</span> completed</div>
                    </div>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={filteredReviews}
                rowKey="review_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
};

export default EmployeeReviewTab;
