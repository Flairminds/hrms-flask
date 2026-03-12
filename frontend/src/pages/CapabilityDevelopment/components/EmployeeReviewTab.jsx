import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Modal, Form, Input, DatePicker, Select, Space,
    Popconfirm, Typography, Tag, message, Spin, Tooltip, Empty, Row, Col
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
    LinkOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import {
    getEmployeeReviews, createEmployeeReview, updateEmployeeReview, deleteEmployeeReview,
    getAllEmployees
} from '../../../services/api';
import dayjs from 'dayjs';
import ReviewSummaryModal from './ReviewSummaryModal';
import { convertDate } from '../../../util/helperFunctions';

const { Text, Title, Link } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const STATUS_COLOR = {
    'Pending': 'orange',
    'Reviewed': 'green',
    'Extended': 'blue'
};

const EmployeeReviewTab = () => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [summaryModalOpen, setSummaryModalOpen] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [form] = Form.useForm();
    const [employees, setEmployees] = useState([]);
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

    // Handle Submit
    const handleSubmit = async (values) => {
        try {
            const payload = {
                ...values,
                review_date: values.review_date.format('YYYY-MM-DD'),
                reviewed_date: values.reviewed_date ? values.reviewed_date.format('YYYY-MM-DD') : null
            };

            if (editingReview) {
                await updateEmployeeReview(editingReview.review_id, payload);
                message.success("Review updated successfully");
            } else {
                await createEmployeeReview(payload);
                message.success("Review created successfully");
            }
            setModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            message.error("Failed to save review");
        }
    };

    // Handle Delete
    const handleDelete = async (id) => {
        try {
            await deleteEmployeeReview(id);
            message.success("Review deleted");
            fetchData();
        } catch (err) {
            console.error(err);
            message.error("Failed to delete review");
        }
    };

    // Open Modal
    const openModal = (review = null) => {
        setEditingReview(review);
        if (review) {
            form.setFieldsValue({
                ...review,
                review_date: review.review_date ? dayjs(review.review_date) : null,
                reviewed_date: review.reviewed_date ? dayjs(review.reviewed_date) : null
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 'Pending' });
        }
        setModalOpen(true);
    };

    // Filtered Reviews
    const filteredReviews = useMemo(() => {
        if (!search.trim()) return reviews;
        const q = search.toLowerCase();
        return reviews.filter(r => {
            // Find employee name from employees list if available, or use cached name if provided by backend (backend provides ID usually)
            // Backend response has employee_id. We need name.
            // Wait, backend response: 
            // 'employee_id': r.employee_id
            // It doesn't fetch name eagerly unless implementation changed. 
            // employee list matches ID to name.

            // For employee view, they know their name.
            // For HR view, we need names.

            // Let's assume we map ID to name using `employees` list.
            return (
                r.employee_name.toLowerCase().includes(q) ||
                (r.review_comment && r.review_comment.toLowerCase().includes(q)) ||
                (r.status && r.status.toLowerCase().includes(q))
            );
        });
    }, [reviews, search, employees]);

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
            render: status => <Tag color={STATUS_COLOR[status] || 'default'}>{status}</Tag>
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
                    <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => openModal(record)}
                    />
                    <Popconfirm
                        title="Delete review?"
                        onConfirm={() => handleDelete(record.review_id)}
                        okText="Yes" cancelText="No"
                    >
                        <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                        />
                    </Popconfirm>
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
                    <Input
                        placeholder="Search..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', maxWidth: 250 }}
                    />
                </Space>
                {canManage && (
                    <Space>
                        <Button onClick={() => setSummaryModalOpen(true)}>
                            Review Summary
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                            Add Review
                        </Button>
                    </Space>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={filteredReviews}
                rowKey="review_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
            />

            <ReviewSummaryModal
                visible={summaryModalOpen}
                onClose={() => setSummaryModalOpen(false)}
            />

            <Modal
                title={editingReview ? "Edit Review" : "Add Review"}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                style={{ top: 15 }}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    {/* Row 1: Employee (full width) */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="employee_id"
                                label="Employee"
                                rules={[{ required: true, message: 'Please select employee' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Select Employee"
                                    optionFilterProp="label"
                                    filterOption={(input, option) =>
                                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    disabled={!!editingReview}
                                >
                                    {employees.map(e => (
                                        <Option key={e.employeeId} value={e.employeeId} label={`${e.employeeName} (${e.employeeId})`}>
                                            {e.employeeName} ({e.employeeId})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="review_date"
                                label="Scheduled Review Date"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Row 2: Dates */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="status" label="Status" initialValue="Pending">
                                <Select>
                                    <Option value="Pending">Pending</Option>
                                    <Option value="Reviewed">Reviewed</Option>
                                    <Option value="Extended">Extended</Option>
                                    <Option value="Scheduled">Scheduled</Option>
                                    <Option value="Cancelled">Cancelled</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="reviewed_date" label="Actual Reviewed Date">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="file_link" label="Document/File Link">
                        <Input prefix={<LinkOutlined />} placeholder="https://..." />
                    </Form.Item>

                    {/* Row 4: Comments */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="review_comment" label="Review Key Comments">
                                <TextArea rows={3} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="other_comments" label="Other Comments">
                                <TextArea rows={3} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setModalOpen(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit">
                            Save
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default EmployeeReviewTab;
