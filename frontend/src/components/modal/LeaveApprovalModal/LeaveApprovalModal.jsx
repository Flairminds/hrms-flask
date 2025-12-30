import { Button, Modal } from 'antd';
import React from 'react';
import style from './LeaveApprovalModal.module.css';

export const LeaveApprovalModal = ({ isLeaveApprovalModalOpen, setIsLeaveApprovalModalOpen }) => {

    const handleCancel = () => {
        setIsLeaveApprovalModalOpen(false);
    };

    const handleApprove = () => {
        setIsLeaveApprovalModalOpen(false);
    };

    return (
        <>
            <Modal open={isLeaveApprovalModalOpen} footer={null} width={600} closable={false}>
                <h2>Customer Approved Work From Home Checklist</h2>
                <input type="checkbox" />
                <label> Received and Reviewed Customer Approval?</label>
                <div>
                    <div className={style.note}>
                        Note for approver: The approver is required to check and validate compliance for the below
                        requirements before approving.
                    </div>
                    <div>
                        <div className={style.space}>
                            1.Associates working from home must dedicate their time to work-related tasks and refrain from
                            engaging in personal activities during designated working hours.
                        </div>
                        <div className={style.space}>
                            2.There cannot be background noise to ensure professionalism during calls or meetings.
                        </div>
                        <div className={style.space}>
                            3.Associates are responsible for maintaining a stable internet connection and power supply, as
                            well as ensuring the functionality of required devices.
                        </div>
                        <div className={style.space}>
                            4.In the event of work being affected by issues related to the above points or any other reasons
                            WFH approval may be revoked, or the day may be considered as a leave of absence.
                        </div>
                    </div>
                </div>
                <h4>Are you sure you want to save above response</h4>
                <div className={style.footerButtons}>
                    <Button className={style.approveButton} onClick={handleApprove}>Approve</Button>
                    <Button className={style.cancelButton} onClick={handleCancel}>Cancel</Button>
                </div>
            </Modal>
        </>
    );
}
