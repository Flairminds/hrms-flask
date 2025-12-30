import React, { useState } from 'react';
import { Modal, Button, Input } from 'antd';
import style from './EmployeeLeaveDetailsModal.module.css';

const { TextArea } = Input;

const EmployeeLeaveDetailsModal = ({ visible, onClose, employee, keys, onApprove }) => {
  const [comments, setComments] = useState('');

  const handleApprove = () => {
    onApprove();
  };

  const handleReject = () => {
    onClose();
  };

  const handleCommentsChange = (e) => {
    setComments(e.target.value);
  };

  return (
    <Modal
      title="Employee Leave Details"
      open={visible}
      onOk={onClose}
      onCancel={onClose}
      footer={[
        <Button key="approve" className={style.approveButton} onClick={handleApprove}>
          Approve
        </Button>,
        <Button key="reject" className={style.cancelButton} onClick={handleReject}>
          Cancel
        </Button>,
      ]}
    >
      {employee && (
        <div>
          {keys.map((key) => (
            <div key={key} className={style.space}>
              <strong>{key}: </strong>{employee[key]}
            </div>
          ))}
          <TextArea
            rows={4}
            placeholder="Add your comments here"
            value={comments}
            onChange={handleCommentsChange}
          />
        </div>
      )}
    </Modal>
  );
};

export default EmployeeLeaveDetailsModal;
