import React, { useMemo, useState, useEffect } from 'react';
import { Modal, Table, Button, Tag, Typography, Spin } from 'antd';
import dayjs from 'dayjs';
import { convertDate } from '../../../util/helperFunctions';
import { employmentStatusOptions } from '../../../util/helper';
import { getReviewSummaries } from '../../../services/api';

const { Text } = Typography;

const ReviewSummaryModal = ({ visible, onClose }) => {
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setLoading(true);
            getReviewSummaries()
                .then(res => {
                    setSummaries(Array.isArray(res.data) ? res.data : []);
                })
                .catch(err => {
                    console.error('Failed to fetch review summaries:', err);
                })
                .finally(() => setLoading(false));
        }
    }, [visible]);

    const columns = useMemo(() => [
        {
            title: 'Employee',
            dataIndex: 'employeeName',
            key: 'employeeName',
            render: (text, record) => (
                <Text strong>{text} <Text type="secondary" style={{ fontSize: 12 }}>({record.employeeId})</Text></Text>
            ),
            sorter: (a, b) => a.employeeName.localeCompare(b.employeeName),
            fixed: 'left',
            width: 200
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            filters: [...new Set(summaries.map(d => d.status).filter(Boolean))].map(s => ({ text: s, value: s })),
            onFilter: (value, record) => record.status === value,
            render: status => <Tag>{status}</Tag>,
            defaultFilteredValue: employmentStatusOptions.filter(status => status !== 'Relieved' && status !== 'Absconding')
        },
        {
            title: 'Joining Date',
            dataIndex: 'joiningDate',
            key: 'joiningDate',
            render: (date, record) => {
                return date == null ? '-' : convertDate(date);
            },
            sorter: (a, b) => {
                if (!a.joiningDate) return -1;
                if (!b.joiningDate) return 1;
                return dayjs(a.joiningDate).diff(dayjs(b.joiningDate));
            }
        },
        {
            title: 'Last Reviewed',
            dataIndex: 'lastReviewDate',
            key: 'lastReviewDate',
            render: (date, record) => {
                return date == null ? '-' : convertDate(date);
            },
            sorter: (a, b) => {
                if (!a.lastReviewDate) return -1;
                if (!b.lastReviewDate) return 1;
                return dayjs(a.lastReviewDate).diff(dayjs(b.lastReviewDate));
            }
        },
        {
            title: 'Time Since',
            dataIndex: 'timeSince',
            key: 'timeSince'
        },
        {
            title: 'Next Review By',
            dataIndex: 'nextSchedule',
            key: 'nextSchedule',
            sorter: (a, b) => {
                if (a.nextSchedule === 'N/A' || a.nextSchedule === '-') return 1;
                if (b.nextSchedule === 'N/A' || b.nextSchedule === '-') return -1;
                return dayjs(a.nextSchedule).diff(dayjs(b.nextSchedule));
            },
            render: (date, record) => {
                const isNotSet = !date || date === 'N/A' || date === '-';
                const isCurrentMonth = !isNotSet && dayjs(date).isSame(dayjs(), 'month');

                const text = isNotSet ? '-' : convertDate(date);

                if (isNotSet || isCurrentMonth) {
                    return <span style={{ color: 'red' }}>{text}</span>;
                }
                return text;
            },
            defaultSortOrder: 'ascend'
        },
        {
            title: 'Next Scheduled',
            dataIndex: 'scheduledPending',
            key: 'scheduledPending',
            sorter: (a, b) => {
                if (a.scheduledPending === '-' || a.scheduledPending === 'N/A') return 1;
                if (b.scheduledPending === '-' || b.scheduledPending === 'N/A') return -1;
                return dayjs(a.scheduledPending).diff(dayjs(b.scheduledPending));
            },
            render: (date, record) => {
                // Highlight if close?
                return date == 'N/A' || date == '-' ? '-' : convertDate(date);
            },
        }
    ], [summaries]);

    return (
        <Modal
            title="Review Summary & Schedule"
            open={visible}
            onCancel={onClose}
            width={1000}
            footer={null}
            style={{ top: 15 }}
        >
            <Table
                columns={columns}
                dataSource={summaries}
                loading={loading}
                pagination={{ pageSize: 12 }}
                scroll={{ x: true }}
                size="small"
                rowKey="employeeId"
            />
        </Modal>
    );
};

export default ReviewSummaryModal;
