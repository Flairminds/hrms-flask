import { Button, Modal } from 'antd';
import React, { useState, useEffect } from 'react';
import style from './ConfirmationChecklist.module.css';
import { updateLeaveStatus } from '../../../services/api';
import { ToastContainer, toast } from 'react-toastify';
import { getCookie } from '../../../util/CookieSet';


export const ConfirmationChecklistModal = ({
  isConfirmationChecklistModalOpen,
  setIsConfirmationChecklistModalOpen,
  shouldReopenLeaveStatusPending,
  setShouldReopenLeaveStatusPending,
  employee
}) => {
  const [informedCustomer, setInformedCustomer] = useState(false);
  const [communicatedWithinTeam, setCommunicatedWithinTeam] = useState(false);
  const [handedOverResponsibilities, setHandedOverResponsibilities] = useState(false);
  const handleCheckboxChange = (setter) => (event) => {
    setter(event.target.checked);
  };

  const allChecked = informedCustomer && communicatedWithinTeam && handedOverResponsibilities;

  const handleCancel = () => {
    setIsConfirmationChecklistModalOpen(false);
    setShouldReopenLeaveStatusPending(true);
    setInformedCustomer(false)
    setCommunicatedWithinTeam(false)
    setHandedOverResponsibilities(false)
  };
  const handleApprove = async () => {
    const approverId = getCookie('employeeId');

    const tranId = employee?.leaveTranId || employee?.LeaveTranId || employee?.leave_tran_id;
    const payload = {
      leaveTranId: tranId,
      leaveStatus: "Approved",
      approverComment: employee?.comments || "",
      isBillable: employee?.isBillable || false,
      isCommunicatedToTeam: communicatedWithinTeam,
      isCustomerApprovalRequired: employee?.isCustomerApprovalRequired || false,
      approvedById: approverId
    };

    try {
      const response = await updateLeaveStatus(payload);
      if (response && (response.status === 200 || response.statusCode === 200)) {
        toast.success('Leave approved successfully..');
      }
    } catch (error) {
      console.error('Failed to update leave status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve leave';
      toast.error(errorMessage);
    }

    setIsConfirmationChecklistModalOpen(false);
    setInformedCustomer(false);
    setCommunicatedWithinTeam(false);
    setHandedOverResponsibilities(false);
  };

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover={true}
        draggable
        pauseOnFocusLoss={false}
        newestOnTop
      />
      <Modal open={isConfirmationChecklistModalOpen} footer={null} width={600} closable={false}>
        <h2 className={style.heading}>Approver's Confirmation Checklist</h2>
        <div>
          <input
            type="checkbox"
            checked={informedCustomer}
            onChange={handleCheckboxChange(setInformedCustomer)}
          />
          <label className={style.space}> Informed Customer?</label>
        </div>
        <div>
          <input
            type="checkbox"
            checked={communicatedWithinTeam}
            onChange={handleCheckboxChange(setCommunicatedWithinTeam)}
          />
          <label className={style.space}> Communicated Within The Team?</label>
        </div>
        <div className={style.heading}>
          <input
            type="checkbox"
            checked={handedOverResponsibilities}
            onChange={handleCheckboxChange(setHandedOverResponsibilities)}
          />
          <label className={style.space}> Handed Over Or Planned Responsibilities To Others?</label>
        </div>
        {/* <div className={style.msg}>Select at least one checkbox</div> */}
        <h4>Are you sure you want to save above response ?</h4>
        <div className={style.footerButtons}>
          <Button className={style.approveButton} onClick={handleApprove} disabled={!allChecked}>Approve</Button>
          <Button className={style.cancelButton} onClick={handleCancel}>Cancel</Button>
        </div>
      </Modal>
    </>
  );
};
