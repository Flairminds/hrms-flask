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
    getEmployeeReviews, updateEmployeeReview, deleteEmployeeReview,
    getAllEmployees, getPerfReviewConfig, previewPerfReviewers, initiatePerfReview
} from '../../../services/api';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import ReviewSummaryModal from './ReviewSummaryModal';
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
    const [summaryModalOpen, setSummaryModalOpen] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [employees, setEmployees] = useState([]);
    const activeEmployees = useMemo(
        () => employees.filter(e => !INACTIVE_STATUSES.includes((e.employmentStatus || '').toLowerCase())),
        [employees]
    );
    const [search, setSearch] = useState('');
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // "Initiate Review" wizard (Add Review, remodeled): sets up a review
    // date, previews the review config applicable on that date and who will
    // do the reviewing, then confirms — creating the cycle/review/reviewer
    // records (plus a legacy row here, same as before) in one step.
    const [initiateOpen, setInitiateOpen] = useState(false);
    const [initiateForm] = Form.useForm();
    const [initiating, setInitiating] = useState(false);
    const [configPreview, setConfigPreview] = useState(null);
    const [configLoading, setConfigLoading] = useState(false);
    const [reviewersPreview, setReviewersPreview] = useState(null);
    const [reviewersLoading, setReviewersLoading] = useState(false);

    const watchedEmployeeId = Form.useWatch('employeeId', initiateForm);
    const watchedReviewDate = Form.useWatch('reviewDate', initiateForm);
    const watchedPeriodType = Form.useWatch('periodType', initiateForm) || 'monthly';
    const watchedMonth = Form.useWatch('month', initiateForm);
    const watchedQuarter = Form.useWatch('quarter', initiateForm);
    const watchedYear = Form.useWatch('year', initiateForm);

    // The auto-resolved reviewer list (project leads + leave approvers who
    // were active during the chosen period) is just a starting point — HR
    // can remove any of them or add someone else before confirming. This
    // holds that editable working copy; reviewersPreview itself is only
    // ever the fresh server suggestion.
    const [editableLeads, setEditableLeads] = useState([]);
    const [addReviewerId, setAddReviewerId] = useState(null);

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

    // Handle Cancel — a separate, explicitly-confirmed action (see the
    // Popconfirm on the Cancel button) rather than something reachable by
    // just editing dates, since cancelling a review is a bigger deal than
    // adjusting its schedule.
    const handleCancel = async (id) => {
        try {
            await updateEmployeeReview(id, { status: 'Cancelled' });
            message.success("Review cancelled");
            fetchData();
        } catch (err) {
            console.error(err);
            message.error("Failed to cancel review");
        }
    };

    // Edit an existing review in the same modal used to initiate one: only
    // the schedule/outcome fields apply (the cycle, period and reviewers were
    // fixed when it was initiated), plus status and the actual review date.
    const openEditModal = (review) => {
        initiateForm.resetFields();
        initiateForm.setFieldsValue({
            employeeId: review.employee_id,
            reviewDate: review.review_date ? dayjs(review.review_date) : null,
            reviewedDate: review.reviewed_date ? dayjs(review.reviewed_date) : null,
            status: review.status || 'Pending',
            file_link: review.file_link,
            review_comment: review.review_comment,
            other_comments: review.other_comments,
        });
        setConfigPreview(null);
        setReviewersPreview(null);
        setEditableLeads([]);
        setEditingReview(review);
        setInitiateOpen(true);
    };

    const handleReviewedDateChange = (d) => {
        const status = initiateForm.getFieldValue('status');
        if (d && status === 'Pending') initiateForm.setFieldsValue({ status: 'Reviewed' });
        if (!d && status === 'Reviewed') initiateForm.setFieldsValue({ status: 'Pending' });
    };

    const handleUpdate = async () => {
        let values;
        try {
            values = await initiateForm.validateFields();
        } catch {
            return;
        }
        setInitiating(true);
        try {
            await updateEmployeeReview(editingReview.review_id, {
                review_date: values.reviewDate.format('YYYY-MM-DD'),
                reviewed_date: values.reviewedDate ? values.reviewedDate.format('YYYY-MM-DD') : null,
                status: values.status,
                file_link: values.file_link || null,
                review_comment: values.review_comment || null,
                other_comments: values.other_comments || null,
            });
            message.success('Review updated successfully');
            setInitiateOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            message.error(err?.response?.data?.Message || 'Failed to update review');
        } finally {
            setInitiating(false);
        }
    };

    // Fetch the review config applicable on the chosen review date, and who
    // would review the chosen employee, as soon as each becomes known.
    useEffect(() => {
        if (!initiateOpen || !watchedReviewDate) {
            setConfigPreview(null);
            return;
        }
        setConfigLoading(true);
        getPerfReviewConfig(watchedReviewDate.format('YYYY-MM-DD'))
            .then(res => setConfigPreview(Array.isArray(res.data?.sections) ? res.data.sections : []))
            .catch(() => setConfigPreview([]))
            .finally(() => setConfigLoading(false));
    }, [initiateOpen, watchedReviewDate]);

    useEffect(() => {
        if (!initiateOpen || !watchedEmployeeId) {
            setReviewersPreview(null);
            return;
        }
        let period;
        if (watchedPeriodType === 'monthly' && watchedMonth) {
            period = { periodType: 'monthly', month: watchedMonth.format('YYYY-MM') };
        } else if (watchedPeriodType === 'quarterly' && watchedQuarter && watchedYear) {
            period = { periodType: 'quarterly', quarter: watchedQuarter, year: watchedYear };
        }
        setReviewersLoading(true);
        previewPerfReviewers(watchedEmployeeId, period)
            .then(res => setReviewersPreview(res.data))
            .catch(() => setReviewersPreview(null))
            .finally(() => setReviewersLoading(false));
    }, [initiateOpen, watchedEmployeeId, watchedPeriodType, watchedMonth, watchedQuarter, watchedYear]);

    // The auto-resolved lead list is just a starting point HR can edit —
    // reset the editable copy whenever a fresh suggestion comes in for a
    // (newly picked) employee/period, but not on every render.
    useEffect(() => {
        setEditableLeads(
            (reviewersPreview?.leads || [])
                .filter(l => l.employeeId)
                .map(l => ({ employeeId: l.employeeId, name: l.name }))
        );
    }, [reviewersPreview]);

    // Fiscal quarters start in November: Q1=Nov(year-1)-Jan(year), Q2=Feb-Apr(year),
    // Q3=May-Jul(year), Q4=Aug-Oct(year) — 'year' is the calendar year most of the
    // cycle (Q2-Q4, and Jan of Q1) falls in.
    const QUARTER_START = { 1: [11, -1], 2: [2, 0], 3: [5, 0], 4: [8, 0] };

    // The fiscal cycle currently in progress, in the same 'year' convention as
    // QUARTER_START: this calendar year while before November, next year once
    // November hits (since November starts next cycle's Q1).
    const currentFiscalYear = dayjs().month() < 10 ? dayjs().year() : dayjs().year() + 1;

    const quarterRangeLabel = (quarter, year) => {
        if (!quarter || !year) return null;
        const [month, yearOffset] = QUARTER_START[quarter];
        const start = dayjs(`${year + yearOffset}-${String(month).padStart(2, '0')}-01`);
        return `${start.format('MMM YYYY')} – ${start.add(2, 'month').endOf('month').format('MMM YYYY')}`;
    };

    // `prefill` (from a "Due"/"Missed" cell on the Review Summary grid) only
    // ever pre-fills the employee + period fields — it never creates
    // anything on its own; HR still goes through this same wizard (reviewer
    // preview, editable lead list, Confirm) before a review actually gets
    // initiated.
    const openInitiateModal = (prefill = null) => {
        initiateForm.resetFields();
        setEditingReview(null);
        const values = { periodType: prefill?.periodType || 'monthly' };
        if (prefill && prefill.employeeId) {
            values.employeeId = prefill.employeeId;
            values.reviewDate = dayjs(prefill.reviewDate);
            if (prefill.periodType === 'monthly') {
                values.month = dayjs(prefill.month, 'YYYY-MM');
            } else {
                values.quarter = prefill.quarter;
                values.year = prefill.year;
            }
        }
        initiateForm.setFieldsValue(values);
        setConfigPreview(null);
        setReviewersPreview(null);
        setEditableLeads([]);
        setAddReviewerId(null);
        setInitiateOpen(true);
    };

    const handleInitiate = async () => {
        let values;
        try {
            values = await initiateForm.validateFields();
        } catch {
            return; // antd already shows the inline field errors
        }
        setInitiating(true);
        try {
            const payload = {
                employeeId: values.employeeId,
                reviewDate: values.reviewDate.format('YYYY-MM-DD'),
                periodType: values.periodType,
            };
            if (values.periodType === 'monthly') {
                payload.month = values.month.format('YYYY-MM');
            } else {
                payload.quarter = values.quarter;
                payload.year = values.year;
            }
            payload.leads = editableLeads;
            const res = await initiatePerfReview(payload);
            message.success(`Review initiated for ${res.data?.cycle?.name || 'the selected period'}`);
            setInitiateOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            message.error(err?.response?.data?.Message || 'Failed to initiate review');
        } finally {
            setInitiating(false);
        }
    };

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
                    <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => openEditModal(record)}
                    />
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
                    {!['Cancelled', 'Reviewed'].includes(record.status) && (
                        <Popconfirm
                            title="Cancel this review?"
                            description="The employee will no longer be reviewed for this scheduled date."
                            onConfirm={() => handleCancel(record.review_id)}
                            okText="Yes, cancel" okType="danger" cancelText="No"
                        >
                            <Button size="small" danger>Cancel</Button>
                        </Popconfirm>
                    )}
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
                {canManage && (
                    <Space>
                        <Button onClick={() => setSummaryModalOpen(true)}>
                            Review Summary
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openInitiateModal()}>
                            Initiate Review
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
                onInitiate={(prefill) => {
                    setSummaryModalOpen(false);
                    openInitiateModal(prefill);
                }}
            />

            <Modal
                title={editingReview ? 'Edit Review' : 'Initiate Review Process'}
                open={initiateOpen}
                onCancel={() => setInitiateOpen(false)}
                footer={null}
                width={640}
                style={{ top: 24 }}
            >
                <Form form={initiateForm} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="employeeId"
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
                                    {activeEmployees.map(e => (
                                        <Option key={e.employeeId} value={e.employeeId} label={`${e.employeeName} (${e.employeeId})`}>
                                            {e.employeeName} ({e.employeeId})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="reviewDate"
                                label="Scheduled Review Date"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    {editingReview && (
                        <>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="reviewedDate" label="Actual Review Date">
                                        <DatePicker style={{ width: '100%' }} onChange={handleReviewedDateChange} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                        <Select options={['Pending', 'Extended', 'Reviewed', 'Cancelled'].map(v => ({ value: v, label: v }))} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <div style={{ marginBottom: 16 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Period: </Text>
                                {editingReview.period ? <Tag>{editingReview.period}</Tag> : '-'}
                                {editingReview.period_range && editingReview.period_range !== editingReview.period && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>{editingReview.period_range}</Text>
                                )}
                            </div>
                            <Form.Item name="file_link" label="Document/File Link">
                                <Input prefix={<LinkOutlined />} placeholder="https://..." />
                            </Form.Item>
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
                        </>
                    )}

                    {!editingReview && watchedReviewDate && (
                        <div style={{ marginBottom: 20 }}>
                            <Text strong style={{ fontSize: 13 }}>Applicable Review Config</Text>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                Sections/questions that will be used, as in effect on {watchedReviewDate.format('DD MMM YYYY')}
                            </div>
                            <div style={{ padding: 10, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                                {configLoading ? (
                                    <Spin size="small" />
                                ) : configPreview && configPreview.length ? (
                                    configPreview.map(s => (
                                        <div key={s.id} style={{ fontSize: 13, padding: '3px 0' }}>
                                            <b>{s.title}</b>
                                            <span style={{ color: '#888', marginLeft: 6 }}>
                                                {(s.questions || []).length} scored · {(s.writtenQuestions || []).length} written
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <Text type="secondary">No review config found for this date</Text>
                                )}
                            </div>
                        </div>
                    )}

                    {!editingReview && (<>
                    <Form.Item name="periodType" label="Review Type" rules={[{ required: true }]} initialValue="monthly">
                        <Segmented
                            options={[
                                { label: 'Monthly', value: 'monthly' },
                                { label: 'Quarterly', value: 'quarterly' },
                            ]}
                        />
                    </Form.Item>

                    {watchedPeriodType === 'monthly' ? (
                        <Form.Item name="month" label="Month" rules={[{ required: true, message: 'Select a month' }]}>
                            <DatePicker picker="month" style={{ width: '100%' }} />
                        </Form.Item>
                    ) : (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="quarter" label="Quarter" rules={[{ required: true, message: 'Select a quarter' }]}>
                                    <Select
                                        placeholder="Select quarter"
                                        options={[1, 2, 3, 4].map(q => ({
                                            value: q,
                                            label: watchedYear
                                                ? `Q${q} (${quarterRangeLabel(q, watchedYear)})`
                                                : `Q${q}`,
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="year"
                                    label="Annual Cycle"
                                    rules={[{ required: true, message: 'Select a cycle' }]}
                                    initialValue={currentFiscalYear}
                                >
                                    <Select
                                        options={[
                                            { value: currentFiscalYear, label: `Current Cycle (${currentFiscalYear})` },
                                            { value: currentFiscalYear + 1, label: `Next Cycle (${currentFiscalYear + 1})` },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    {watchedPeriodType === 'quarterly' && watchedQuarter && watchedYear && (
                        <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16 }}>
                            {quarterRangeLabel(watchedQuarter, watchedYear)}
                        </Text>
                    )}

                    {watchedEmployeeId && (
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 13 }}>Who Will Review</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                                Project leads and leave approvers active for this employee during the chosen
                                period are added automatically — remove any that don&apos;t apply, or add someone else.
                            </Text>
                            <div>
                                {reviewersLoading ? (
                                    <Spin size="small" />
                                ) : reviewersPreview ? (
                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                        <Tag color="blue">Self: {reviewersPreview.self.name}</Tag>
                                        <Space size={[6, 6]} wrap>
                                            {editableLeads.map(l => (
                                                <Tag
                                                    key={l.employeeId}
                                                    color="purple"
                                                    closable
                                                    onClose={(e) => {
                                                        e.preventDefault();
                                                        setEditableLeads(prev => prev.filter(x => x.employeeId !== l.employeeId));
                                                    }}
                                                >
                                                    {l.name}
                                                </Tag>
                                            ))}
                                            {!editableLeads.length && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>No reviewer added yet</Text>
                                            )}
                                        </Space>
                                        <Space size={6}>
                                            <Select
                                                showSearch
                                                size="small"
                                                placeholder="Add a reviewer"
                                                style={{ width: 220 }}
                                                value={addReviewerId}
                                                onChange={setAddReviewerId}
                                                optionFilterProp="label"
                                                options={activeEmployees
                                                    .filter(e => e.employeeId !== watchedEmployeeId && !editableLeads.some(l => l.employeeId === e.employeeId))
                                                    .map(e => ({ value: e.employeeId, label: `${e.employeeName} (${e.employeeId})` }))}
                                            />
                                            <Button
                                                size="small"
                                                icon={<PlusOutlined />}
                                                disabled={!addReviewerId}
                                                onClick={() => {
                                                    const emp = activeEmployees.find(e => e.employeeId === addReviewerId);
                                                    if (!emp) return;
                                                    setEditableLeads(prev => [...prev, { employeeId: emp.employeeId, name: emp.employeeName }]);
                                                    setAddReviewerId(null);
                                                }}
                                            >
                                                Add
                                            </Button>
                                        </Space>
                                        <Tag color="orange">HR: {reviewersPreview.hr.name}</Tag>
                                    </Space>
                                ) : null}
                            </div>
                        </div>
                    )}

                    </>)}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onClick={() => setInitiateOpen(false)}>Cancel</Button>
                        <Button type="primary" loading={initiating} onClick={editingReview ? handleUpdate : handleInitiate}>
                            {editingReview ? 'Save' : 'Confirm & Initiate'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default EmployeeReviewTab;
