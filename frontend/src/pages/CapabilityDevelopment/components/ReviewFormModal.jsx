import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, Modal, Form, Input, DatePicker, Select, Space, Typography, Tag, message, Spin, Row, Col, Segmented
} from 'antd';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    updateEmployeeReview, getAllEmployees, getPerfReviewConfig, previewPerfReviewers, initiatePerfReview
} from '../../../services/api';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Reviews are only scheduled for people currently on the team — exclude
// employees who've left from the pickers.
const INACTIVE_STATUSES = ['relieved', 'absconding', 'terminated'];

/**
 * The one modal for both starting a review ("Initiate Review") and editing an
 * existing review's schedule/outcome (pass `editingReview`). `prefill` seeds
 * the employee + period from a Review Summary cell.
 */
const ReviewFormModal = ({ open, editingReview = null, prefill = null, onClose, onDone }) => {
    const [employees, setEmployees] = useState([]);
    useEffect(() => {
        if (!open || employees.length) return;
        getAllEmployees()
            .then(res => setEmployees(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error('Failed to load employees', err));
    }, [open, employees.length]);
    const activeEmployees = useMemo(
        () => employees.filter(e => !INACTIVE_STATUSES.includes((e.employmentStatus || '').toLowerCase())),
        [employees]
    );

    // "Initiate Review" wizard (Add Review, remodeled): sets up a review
    // date, previews the review config applicable on that date and who will
    // do the reviewing, then confirms — creating the cycle/review/reviewer
    // records (plus a legacy row here, same as before) in one step.
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

    // (Re)initialise the form each time the modal opens: either editing an
    // existing review's schedule/outcome, or initiating a new one — optionally
    // pre-filled with an employee + period from the Review Summary grid.
    useEffect(() => {
        if (!open) return;
        initiateForm.resetFields();
        setConfigPreview(null);
        setReviewersPreview(null);
        setEditableLeads([]);
        setAddReviewerId(null);
        if (editingReview) {
            initiateForm.setFieldsValue({
                employeeId: editingReview.employee_id,
                reviewDate: editingReview.review_date ? dayjs(editingReview.review_date) : null,
                reviewedDate: editingReview.reviewed_date ? dayjs(editingReview.reviewed_date) : null,
                status: editingReview.status || 'Pending',
                file_link: editingReview.file_link,
                review_comment: editingReview.review_comment,
                other_comments: editingReview.other_comments,
            });
            return;
        }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editingReview, prefill]);

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
            onClose();
            onDone?.();
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
        if (!open || !watchedReviewDate) {
            setConfigPreview(null);
            return;
        }
        setConfigLoading(true);
        getPerfReviewConfig(watchedReviewDate.format('YYYY-MM-DD'))
            .then(res => setConfigPreview(Array.isArray(res.data?.sections) ? res.data.sections : []))
            .catch(() => setConfigPreview([]))
            .finally(() => setConfigLoading(false));
    }, [open, watchedReviewDate]);

    useEffect(() => {
        if (!open || !watchedEmployeeId) {
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
    }, [open, watchedEmployeeId, watchedPeriodType, watchedMonth, watchedQuarter, watchedYear]);

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
            onClose();
            onDone?.();
        } catch (err) {
            console.error(err);
            message.error(err?.response?.data?.Message || 'Failed to initiate review');
        } finally {
            setInitiating(false);
        }
    };


    return (
    <Modal
            title={editingReview ? 'Edit Review' : 'Initiate Review Process'}
            open={open}
            onCancel={() => onClose()}
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
                    <Button onClick={() => onClose()}>Cancel</Button>
                    <Button type="primary" loading={initiating} onClick={editingReview ? handleUpdate : handleInitiate}>
                        {editingReview ? 'Save' : 'Confirm & Initiate'}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default ReviewFormModal;
