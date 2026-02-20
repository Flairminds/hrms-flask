import React from 'react';
import { Button, Modal, Descriptions, Input } from 'antd';
import styles from './LeaveStatusApproved.module.css';
import { convertDate, getWeekDay } from '../../../util/helperFunctions';

export const LeaveStatusApproved = ({ isLeaveApprovalModalOpen, setIsLeaveApprovalModalOpen, employee }) => {

  const handleOk = () => {
    setIsLeaveApprovalModalOpen(false);
  }

  const handleCancel = () => {
    setIsLeaveApprovalModalOpen(false);
  };

  return (
    <Modal
      title="Leave Details"
      open={isLeaveApprovalModalOpen}
      onOk={handleOk}
      centered
      onCancel={handleCancel}
      footer={[
        <Button key="ok" type="primary" onClick={handleOk}>
          OK
        </Button>
      ]}
      bodyStyle={{ maxHeight: '100%', maxWidth: '100%', overflowY: 'auto', overflowX: 'auto' }}
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Employee Name " labelStyle={{ fontWeight: 'bold' }}>{employee.empName}</Descriptions.Item>
        <Descriptions.Item label="Leave Type" labelStyle={{ fontWeight: 'bold' }}>{employee.LeaveType}</Descriptions.Item>
        <Descriptions.Item label="Duration" labelStyle={{ fontWeight: 'bold' }}>{employee.duration}</Descriptions.Item>
        <Descriptions.Item label="From Date" labelStyle={{ fontWeight: 'bold' }}>{employee.fromDate}</Descriptions.Item>
        <Descriptions.Item label="To Date" labelStyle={{ fontWeight: 'bold' }}>{employee.toDate}</Descriptions.Item>
        <Descriptions.Item label="Number of Days" labelStyle={{ fontWeight: 'bold' }}>{employee.appliedLeaveCount}</Descriptions.Item>
        <Descriptions.Item label="Application Date" labelStyle={{ fontWeight: 'bold' }}>{employee.applicationDate}</Descriptions.Item>

        <Descriptions.Item label="Leave Status" labelStyle={{ fontWeight: 'bold' }} className={styles.leaveStatus}>
          <Button
            key="approve"
            className={
              employee.leaveStatus === 'Pending' ? styles.pendingLeave :
                employee.leaveStatus === 'Approved' ? styles.approvedLeave :
                  employee.leaveStatus === 'Reject' ? styles.rejectLeave :
                    employee.leaveStatus === 'Partial Approved' ? styles.partialApprovedLeave :
                      ''
            }
            style={{ cursor: 'default' }}
          >
            {employee.leaveStatus}
          </Button>

        </Descriptions.Item>
        {employee.LeaveStatus === 'Rejected' && (
          <Descriptions.Item label="Comments" labelStyle={{ fontWeight: 'bold' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input.TextArea rows={4} value={employee.comments}
                style={{
                  width: '100%',
                  color: '#000',
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #000',
                }}
                disabled></Input.TextArea>
            </div>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Approved By" labelStyle={{ fontWeight: 'bold' }}>{employee.approvedBy}</Descriptions.Item>
      </Descriptions>

      {employee.leaveTypeName === 'Customer Approved Comp-off' &&
        employee.compOffTransactions?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Comp Off Details</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e8e8e8' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '8px 16px', border: '1px solid #e8e8e8', textAlign: 'left' }}>Comp Off Date</th>
                  <th style={{ padding: '8px 16px', border: '1px solid #e8e8e8', textAlign: 'left' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {employee.compOffTransactions.map((t, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 16px', border: '1px solid #e8e8e8' }}>
                      {convertDate(t.compOffDate)} ({getWeekDay(t.compOffDate)})
                    </td>
                    <td style={{ padding: '8px 16px', border: '1px solid #e8e8e8' }}>{t.numberOfHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Modal>
  );
};

export default LeaveStatusApproved;
