import React from 'react';
import { Table, Typography } from 'antd';

const { Title } = Typography;

const EmailNotifications = () => {
    const columns = [
        {
            title: 'Notification Type',
            dataIndex: 'type',
            key: 'type',
            width: '25%',
        },
        {
            title: 'Recipient(s)',
            dataIndex: 'recipients',
            key: 'recipients',
            width: '40%',
        },
        {
            title: 'Trigger',
            dataIndex: 'trigger',
            key: 'trigger',
            width: '35%',
        },
    ];

    const data = [
        // {
        //     key: '1',
        //     type: 'Daily Leave Report',
        //     recipients: 'Management & HR',
        //     trigger: 'Daily at 9:00 AM (Weekdays)',
        // },
        // {
        //     key: '2',
        //     type: 'Office Attendance Summary',
        //     recipients: 'Management & HR',
        //     trigger: 'Daily at 10:30 AM (Weekdays)',
        // },
        {
            key: '3',
            type: 'Leave Approval Request',
            recipients: <>
                <div>Team Lead / Approver</div>
                <br />
                <div>CC:</div>
                <div>Employee</div>
                <div>hr@flairminds.com</div>
            </>,
            trigger: 'Immediate (On Leave Application)',
        },
        {
            key: '4',
            type: 'Leave Status Notification',
            recipients: <>
                <div>Employee</div>
                <br />
                <div>CC:</div>
                <div>Team Lead / Approver</div>
                <div>hr@flairminds.com</div>
                <div>ahiresh.gaikwad@flairminds.com (Second approval)</div>
            </>,
            trigger: 'Immediate (On Approval/Rejection)',
        },
        {
            key: '5',
            type: 'Birthday Greeting',
            recipients: 'Employee',
            trigger: 'Daily (On Employee Birthday)',
        },
        {
            key: '6',
            type: 'Work Anniversary Greeting',
            recipients: 'Employee',
            trigger: 'Daily (On Work Anniversary)',
        },
        {
            key: '7',
            type: 'Internship/Probation End Alert',
            recipients: 'ahiresh.gaikwad@flairminds.com',
            trigger: 'Daily 9:00am - End Date is in 5 days or in past',
        },
        {
            key: '8',
            type: 'Employee Review Digest',
            recipients: 'ahiresh.gaikwad@flairminds.com',
            trigger: 'Daily 9:00am - Review Status is pending or not scheduled',
        },
        {
            key: '9',
            type: 'Leave Approver Change',
            recipients: <>
                <div>Employee</div>
                <br />
                <div>CC:</div>
                <div>hr@flairminds.com</div>
                <div>New Leave Approver</div>
                <div>Old Leave Approver</div>
            </>,
            trigger: 'Immediate (On Approver Assignment/Change)',
        },
    ];

    return (
        <div style={{ padding: '10px' }}>
            {/* <Title level={4} style={{ marginBottom: '20px' }}>Email Notification Summary</Title> */}
            <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                bordered
                size="middle"
            />
        </div>
    );
};

export default EmailNotifications;
