import React from 'react';
import { Button, Modal, Descriptions, Input } from 'antd';
import styles from './LeaveStatusApproved.module.css';

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
    </Modal>
  );
};

export default LeaveStatusApproved;
