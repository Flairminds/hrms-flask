import React, { useMemo } from 'react';
import { Modal, Table, Button, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { convertDate } from '../../../util/helperFunctions';
import { employmentStatusOptions } from '../../../util/helper';

const { Text } = Typography;

const ReviewSummaryModal = ({ visible, onClose, employees, reviews }) => {

    // Helper to calculate summary data
    const summaryData = useMemo(() => {
        if (!employees || !employees.length) return [];

        return employees.map(emp => {
            // 1. Get employee reviews
            const empReviews = reviews.filter(r => r.employee_id === emp.employeeId);

            // 2. Find last review
            // Sort by reviewed_date desc (if exists) or review_date
            // "Last Reviewed Date" implies completed review.
            const completedReviews = empReviews.filter(r => r.status === 'Reviewed' && r.reviewed_date);
            // If no completed, maybe look at pending? No, "Last Reviewed" means done.

            let lastReviewDate = null;
            if (completedReviews.length > 0) {
                // Sort descending
                completedReviews.sort((a, b) => dayjs(b.reviewed_date).diff(dayjs(a.reviewed_date)));
                lastReviewDate = completedReviews[0].reviewed_date;
            }

            // 3. Time since last review
            let timeSince = '-';
            if (lastReviewDate) {
                const now = dayjs();
                const last = dayjs(lastReviewDate);
                const months = now.diff(last, 'month');
                const days = now.diff(last, 'day') % 30; // Approx

                if (months > 0) timeSince = `${months}m ${days}d`;
                else timeSince = `${days}d`;
            }

            // 4. Next Schedule
            let nextSchedule = '-';
            const status = emp.employmentStatus;
            const joiningDate = emp.joiningDate ? dayjs(emp.joiningDate) : null;
            const today = dayjs();

            if (!lastReviewDate) {
                if (joiningDate) {
                    const oneMonthMark = joiningDate.add(1, 'month');
                    // If more than 1 month of joining then schedule in next 1 week
                    if (today.isAfter(oneMonthMark, 'day')) {
                        nextSchedule = today.add(3, 'day').format('YYYY-MM-DD');
                    } else {
                        // Else schedule when 1 month is to be over
                        nextSchedule = oneMonthMark.format('YYYY-MM-DD');
                    }
                }
            } else {
                if (status === 'Intern' || status === 'Probation') {
                    if (joiningDate) {
                        // Monthly from joining date
                        // Find next date > today
                        // Joining: 14 Jan. Today: 20 Feb.
                        // Due: 14 Feb (Past), 14 Mar (Next).

                        // Simple algo: start from joining, add months until > today
                        // Optimization: 
                        const monthsDiff = today.diff(joiningDate, 'month');
                        let target = joiningDate.add(monthsDiff, 'month');
                        if (target.isBefore(today, 'day') || target.isSame(today, 'day')) {
                            target = target.add(1, 'month');
                        }
                        nextSchedule = target.format('YYYY-MM-DD');
                    }
                } else if (status === 'Confirmed') {
                    // Quarterly based on calendar (Mar, Jun, Sep, Dec end)
                    const year = today.year();
                    const quarters = [
                        dayjs(`${year}-04-20`),
                        dayjs(`${year}-07-20`),
                        dayjs(`${year}-10-20`),
                        dayjs(`${year}-01-20`)
                    ];

                    let target = quarters.find(q => q.isAfter(today, 'day'));
                    if (!target) {
                        // Next year Q1
                        target = dayjs(`${year + 1}-04-20`);
                    }
                    nextSchedule = target.format('YYYY-MM-DD');
                } else {
                    nextSchedule = 'N/A'; // Resigned etc?
                }
            }


            // 5. Next Review Scheduled (Pending)
            const pendingReviews = empReviews.filter(r => (r.status === 'Pending' || r.status === 'Scheduled') && r.review_date);
            let scheduledPending = '-';
            if (pendingReviews.length > 0) {
                pendingReviews.sort((a, b) => dayjs(a.review_date).diff(dayjs(b.review_date)));
                scheduledPending = pendingReviews[0].review_date;
            }

            return {
                key: emp.employeeId,
                employeeName: emp.employeeName,
                employeeId: emp.employeeId,
                status: emp.employmentStatus,
                lastReviewDate: lastReviewDate,
                timeSince: timeSince,
                nextSchedule: nextSchedule,
                scheduledPending: scheduledPending,
                joiningDate: emp.joiningDate
            };
        });
    }, [employees, reviews]);

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
            filters: [...new Set(summaryData.map(d => d.status).filter(Boolean))].map(s => ({ text: s, value: s })),
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
    ], [summaryData]);

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
                dataSource={summaryData}
                pagination={{ pageSize: 10 }}
                scroll={{ x: true }}
                size="small"
            />
        </Modal>
    );
};

export default ReviewSummaryModal;
