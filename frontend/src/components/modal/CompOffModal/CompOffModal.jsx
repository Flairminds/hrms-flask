import { Button, Modal } from 'antd';
import React from 'react';
import style from './CompOffModal.module.css';

export const CompOffModal = ({ isCompOffModalOpen, setIsCompOffModalOpen }) => {

    const handleCancel = () => {
        setIsCompOffModalOpen(false);
    };

    const handleApprove = () => {
        setIsCompOffModalOpen(false);
    };

    return (
        <>
            <Modal open={isCompOffModalOpen} footer={null} width={600} closable={false}>
                <h2>Customer Approved Comp-off Checklist</h2>
                <input type="checkbox" />
                <label> Received and Reviewed Customer Approval?</label>
                <div>
                    <div className={style.note}>
                        Note for approving for comp-off:- 
                    </div>
                    <div>
                        <div className={style.space}>
                            1.When approving full day comp off the logged time in zymmr for the day of compoff must be minimum of 8hrs.
                        </div>
                        <div className={style.space}>
                            2.When approving full day comp off the logged time in zymmr for the day of compoff must be minimum of 4hrs.
                        </div>
                        <div className={style.space}>
                            3.There must be approval from customer before approving compoff.
                        </div>
                    </div>
                </div>
                <h4>Are you sure you want to save above response..? </h4>
                <div className={style.footerButtons}>
                    <Button className={style.approveButton} onClick={handleApprove}>Approve</Button>
                    <Button className={style.cancelButton} onClick={handleCancel}>Cancel</Button>
                </div>
            </Modal>
        </>
    );
}
