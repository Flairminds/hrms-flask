import React, { useMemo, useState, useEffect } from 'react';
import { Modal, Table, Tag, Typography, Input, Select, Segmented, Tooltip, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { convertDate } from '../../../util/helperFunctions';
import { getReviewMatrix } from '../../../services/api';

const { Text } = Typography;

// Same fiscal-year convention the quarterly cycles/"Initiate Review" wizard
// use: this calendar year while before November, next year once November
// hits (November starts next cycle's Q1).
const currentFiscalYear = dayjs().month() < 10 ? dayjs().year() : dayjs().year() + 1;

const STATUS_META = {
    reviewed: { color: 'green', label: 'Reviewed' },
    pending: { color: 'orange', label: 'Pending' },
    missed: { color: 'red', label: 'Missed' },
    due: { color: 'blue', label: 'Due' },
    cancelled: { color: 'default', label: 'Cancelled' },
    not_scheduled: { color: 'default', label: '–' },
};

// Missed (period's over, nothing initiated) and Due (it's the current
// period and nothing's been initiated yet) can both be initiated directly
// from the grid — a future period can't, since its reviewer resolution
// (project leads / leave approvers as of that period) isn't meaningful yet.
const INITIABLE_STATUSES = new Set(['missed', 'due']);

const PeriodCell = ({ record, period, onInitiate }) => {
    const meta = STATUS_META[period.status] || STATUS_META.not_scheduled;
    const tooltip = (
        <div>
            <div>{period.range}</div>
            {period.reviewDate && <div>Scheduled: {convertDate(period.reviewDate)}</div>}
            {period.reviewedDate && <div>Reviewed: {convertDate(period.reviewedDate)}</div>}
            {INITIABLE_STATUSES.has(period.status) && <div>Click to initiate this review</div>}
        </div>
    );
    const initiable = INITIABLE_STATUSES.has(period.status);
    return (
        <Tooltip title={tooltip}>
            <Tag
                color={meta.color}
                style={{
                    minWidth: 72, textAlign: 'center',
                    cursor: initiable ? 'pointer' : 'default',
                }}
                onClick={initiable ? () => onInitiate(record, period) : undefined}
            >
                {meta.label}
            </Tag>
        </Tooltip>
    );
};

const ReviewSummaryModal = ({ visible, onClose, onInitiate }) => {
    const [matrix, setMatrix] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [year, setYear] = useState(currentFiscalYear);
    const [reviewType, setReviewType] = useState('quarterly');

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        getReviewMatrix(year)
            .then(res => setMatrix(Array.isArray(res.data?.matrix) ? res.data.matrix : []))
            .catch(err => console.error('Failed to fetch review matrix:', err))
            .finally(() => setLoading(false));
    }, [visible, year]);

    // Lets HR jump straight from a "Missed"/"Due" cell into the real
    // Initiate Review wizard, pre-filled with that employee + period — it
    // never creates a review itself; HR still confirms (and can still adjust
    // reviewers) in that same wizard everyone else uses.
    const handleInitiateCell = (record, period) => {
        onInitiate?.({
            employeeId: record.employeeId,
            reviewDate: period.endDate,
            ...period.period,
        });
    };

    const yearOptions = useMemo(() => {
        const options = [];
        for (let y = currentFiscalYear + 1; y >= currentFiscalYear - 3; y -= 1) {
            options.push({ value: y, label: `${y}` });
        }
        return options;
    }, []);

    const rowsForType = useMemo(
        () => matrix.filter(m => m.reviewType === reviewType),
        [matrix, reviewType]
    );

    const filteredRows = useMemo(() => {
        if (!searchText.trim()) return rowsForType;
        const q = searchText.toLowerCase();
        return rowsForType.filter(r =>
            r.employeeName?.toLowerCase().includes(q) || r.employeeId?.toLowerCase().includes(q)
        );
    }, [rowsForType, searchText]);

    const periodColumns = useMemo(() => {
        const sample = rowsForType[0];
        if (!sample) return [];
        return sample.periods.map((p, i) => ({
            title: p.label,
            key: p.key,
            width: 100,
            align: 'center',
            render: (_, record) => (
                <PeriodCell
                    record={record}
                    period={record.periods[i]}
                    onInitiate={handleInitiateCell}
                />
            ),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rowsForType]);

    const columns = [
        {
            title: 'Employee',
            dataIndex: 'employeeName',
            key: 'employeeName',
            fixed: 'left',
            width: 200,
            sorter: (a, b) => a.employeeName.localeCompare(b.employeeName),
            render: (text, record) => (
                <Text strong>{text} <Text type="secondary" style={{ fontSize: 12 }}>({record.employeeId})</Text></Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status) => <Tag>{status}</Tag>,
        },
        ...periodColumns,
    ];

    return (
        <Modal
            title="Review Summary & Schedule"
            open={visible}
            onCancel={onClose}
            width={reviewType === 'monthly' ? 1400 : 1100}
            footer={null}
            style={{ top: 15 }}
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Confirmed (and other non-probationary) employees are reviewed quarterly; Interns and Probationers
                are reviewed monthly instead. Pick a year to see that cycle&apos;s review status for everyone.
            </Text>
            <Space wrap style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
                <Space wrap>
                    <Segmented
                        value={reviewType}
                        onChange={setReviewType}
                        options={[
                            { label: 'Quarterly · Confirmed', value: 'quarterly' },
                            { label: 'Monthly · Intern / Probation', value: 'monthly' },
                        ]}
                    />
                    <Select value={year} onChange={setYear} options={yearOptions} style={{ width: 120 }} />
                </Space>
                <Input
                    placeholder="Search by employee name or ID..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 260 }}
                />
            </Space>
            <Table
                columns={columns}
                dataSource={filteredRows}
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
                size="small"
                rowKey="employeeId"
            />
        </Modal>
    );
};

export default ReviewSummaryModal;
