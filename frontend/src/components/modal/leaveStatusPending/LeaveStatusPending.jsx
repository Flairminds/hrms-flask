import React, { useEffect, useState } from 'react';
import { Input, Button, Modal, Descriptions } from 'antd';
import styles from '../leaveStatusPending/LeaveStatusPending.module.css';
import { ConfirmationChecklistModal } from '../ConfirmationChecklist/ConfirmationChecklist';
import { getTeamLead, updateLeaveStatus } from '../../../services/api';
import { ToastContainer, toast } from 'react-toastify';
import { getCookie } from '../../../util/CookieSet';
import { convertDate, getWeekDay } from '../../../util/helperFunctions';

export const LeaveStatusPending = ({ setMyEmployeeData, setLoading, isLeaveApprovalModalOpen, setIsLeaveApprovalModalOpen, employee, onStatusChange, selectedRange, readOnly = false }) => {
  const [isConfirmationChecklistModalOpen, setIsConfirmationChecklistModalOpen] = useState(false);
  const [shouldReopenLeaveStatusPending, setShouldReopenLeaveStatusPending] = useState(false);
  const [approverComments, setApproverComments] = useState('');
  const [informedCustomer, setInformedCustomer] = useState(false);
  const [communicatedWithinTeam, setCommunicatedWithinTeam] = useState(false);
  const [handedOverResponsibilities, setHandedOverResponsibilities] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [isCommentValid, setIsCommentValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  let employeeId;
  employeeId = getCookie('employeeId');
  const fetchEmployeeData = async () => {
    if (employeeId) {
      try {
        const response = await getTeamLead(employeeId, selectedRange);
        if (response.data.leaveTransactions) {
          setMyEmployeeData(response.data.leaveTransactions);
        } else {
          setMyEmployeeData([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData(); // Initial fetch
    // const intervalId = fetchEmployeeData, 3000);
    // return () => clearInterval(intervalId);
  }, []);

  // Populate data when in read-only mode
  useEffect(() => {
    if (readOnly && employee) {
      setApproverComments(employee.approvalComment || employee.approverComment || '');
      setInformedCustomer(employee.isCustomerApprovalRequired || employee.haveCustomerApproval || false);
      setCommunicatedWithinTeam(employee.isCommunicatedToTeam || false);
      setHandedOverResponsibilities(employee.isBillable || false);
    }
  }, [readOnly, employee]);

  const shouldShowCheckboxes = ![
    "Visiting Client Location",
    "Customer Holiday",
    "Working Late Today"
  ].includes(employee.leaveTypeName);

  // Update allChecked logic to include any new checkboxes
  const allChecked = informedCustomer && communicatedWithinTeam && handedOverResponsibilities;
  const customerApprovedChecked = employee.leaveTypeName === 'Customer Approved Comp-off' && informedCustomer;
  const workFromHomeChecked = employee.leaveTypeName === 'Work From Home' && informedCustomer;
  const customerApprovedWFHChecked = employee.leaveTypeName === 'Customer Approved Work From Home' && informedCustomer;

  const enableApproveButton = shouldShowCheckboxes
    ? (employee.leaveTypeName === 'Customer Approved Comp-off'
      ? customerApprovedChecked
      : employee.leaveTypeName === 'Work From Home'
        ? true
        : employee.leaveTypeName === 'Customer Approved Work From Home'
          ? customerApprovedWFHChecked
          : allChecked)
    : true;

  const showWorkingLateDetails = employee.leaveTypeName === "Working Late Today";
  const showCustomerHolidayDetails = employee.leaveTypeName === "Customer Holiday";
  const showCompOffDetails = employee.leaveTypeName === "Customer Approved Comp-off";

  const handleApprove = async () => {
    setIsButtonDisabled(true);
    const approverId = getCookie('employeeId');

    const tranId = employee.leaveTranId || employee.LeaveTranId || employee.leave_tran_id;
    const payload = {
      leaveTranId: tranId,
      leaveStatus: "Approved",
      approverComment: approverComments,
      isBillable: false,
      isCommunicatedToTeam: communicatedWithinTeam,
      isCustomerApprovalRequired: false,
      approvedById: approverId
    };

    try {
      const response = await updateLeaveStatus(payload);
      await fetchEmployeeData();

      setApproverComments('');
      setInformedCustomer(false);
      setCommunicatedWithinTeam(false);
      setHandedOverResponsibilities(false);
      setIsLeaveApprovalModalOpen(false);
      onStatusChange(payload.leaveStatus);

      toast.success(response?.data?.Message || 'Leave approved successfully');
    } catch (error) {
      console.error('Failed to update leave status:', error);
      const errorMsg = error?.response?.data?.Message || error?.response?.data?.message || 'Failed to approve leave';
      toast.error(errorMsg);
    } finally {
      setIsButtonDisabled(false);
    }
  };

  const handleReject = async () => {
    setIsButtonDisabled(true);
    const approverId = getCookie('employeeId');

    const tranId = employee.leaveTranId || employee.LeaveTranId || employee.leave_tran_id;
    const payload = {
      leaveTranId: tranId,
      leaveStatus: "Reject",
      approverComment: approverComments,
      isBillable: false,
      isCommunicatedToTeam: communicatedWithinTeam,
      isCustomerApprovalRequired: false,
      approvedById: approverId
    };

    try {
      const response = await updateLeaveStatus(payload);
      await fetchEmployeeData();

      setApproverComments('');
      setInformedCustomer(false);
      setCommunicatedWithinTeam(false);
      setHandedOverResponsibilities(false);
      setIsLeaveApprovalModalOpen(false);
      onStatusChange(payload.leaveStatus);

      toast.success(response?.data?.Message || 'Leave rejected successfully');
    } catch (error) {
      console.error('Failed to update leave status:', error);
      const errorMsg = error?.response?.data?.Message || error?.response?.data?.message || 'Failed to reject leave';
      toast.error(errorMsg);
    } finally {
      setIsButtonDisabled(false);
    }
  };


  const handleCheckboxChange = (setter) => (event) => {
    setter(event.target.checked);
  };

  const handleConfirmationModalCancel = () => {
    setIsConfirmationChecklistModalOpen(false);
    if (shouldReopenLeaveStatusPending) {
      setIsLeaveApprovalModalOpen(true);
    }
    setShouldReopenLeaveStatusPending(false);
  };

  const handleCommentsChange = (e) => {
    const value = e.target.value;
    setApproverComments(value);
    if (value.length >= 5) {
      setIsCommentValid(true);
      setErrorMessage("");
    } else {
      setIsCommentValid(false);
      setErrorMessage("Comments must be at least 5 characters");
    }
  };

  const handleCancel = () => {
    setApproverComments('');
    setInformedCustomer(false);
    setCommunicatedWithinTeam(false);
    setHandedOverResponsibilities(false);
    setIsLeaveApprovalModalOpen(false);
  };

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
      />
      <Modal
        title={readOnly ? "Leave Details" : "Pending Leave Details"}
        open={isLeaveApprovalModalOpen}
        onCancel={handleCancel}
        footer={readOnly ? null : [
          <Button key="cancel" onClick={handleReject} className={styles.cancelButton} disabled={isButtonDisabled}>
            Reject
          </Button>,
          <Button key="approve" onClick={handleApprove} className={styles.approveButton} disabled={!enableApproveButton || isButtonDisabled || !isCommentValid}>
            Approve
          </Button>
        ]}
        width={1000}
        centered
      >
        <div className={styles.detailsContainer}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Employee Name</span>
            <span className={styles.detailValue}>{employee.empName}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Leave Type</span>
            <span className={styles.detailValue}>{employee.leaveTypeName}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Duration</span>
            <span className={styles.detailValue}>{employee.duration}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>From Date</span>
            <span className={styles.detailValue}>{convertDate(employee.fromDate)} ({getWeekDay(employee.fromDate)})</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>To Date</span>
            <span className={styles.detailValue}>{convertDate(employee.toDate)} ({getWeekDay(employee.toDate)})</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Number of Days</span>
            <span className={styles.detailValue}>{employee.appliedLeaveCount}</span>
          </div>

          {showWorkingLateDetails && (
            <>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>From Time</span>
                <span className={styles.detailValue}>{employee.fromTime}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>To Time</span>
                <span className={styles.detailValue}>{employee.toTime}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Reasons for Working Late</span>
                <span className={styles.detailValue}>{employee.reasonForWorkingLate}</span>
              </div>
            </>
          )}

          {showCustomerHolidayDetails && (
            <>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Worked Date</span>
                <span className={styles.detailValue}>{employee.workedDate}</span>
              </div>
              <div style={{ padding: '8px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '4px', marginBottom: '10px', fontSize: '13px' }}>
                Note: Approver has to verify the time log for worked date for approval.
              </div>
            </>
          )}
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Hand Over Comment</span>
            <span className={styles.detailValue}>{employee.handOverComments}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Comments</span>
            <span className={styles.detailValue}>{employee.comments}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Application Date</span>
            <span className={styles.detailValue}>{convertDate(employee.applicationDate)} ({getWeekDay(employee.applicationDate)})</span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Leave Status</span>
            <div className={styles.detailValue}>
              <span className={styles.pendingLeave}>{employee.leaveStatus}</span>
            </div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Approver</span>
            <span className={styles.detailValue}>{employee.approverName}</span>
          </div>
        </div>

        {showCompOffDetails && employee.compOffTransactions?.length > 0 && (
          <div style={{ marginTop: '10px', marginBottom: '10px' }}>
            <span className={styles.detailLabel} style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Comp Off Details</span>
            <table style={{ borderCollapse: 'collapse', border: '1px solid #e8e8e8' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '8px 16px', border: '1px solid #e8e8e8', textAlign: 'left', fontWeight: '600' }}>Comp Off Date</th>
                  <th style={{ padding: '8px 16px', border: '1px solid #e8e8e8', textAlign: 'left', fontWeight: '600' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {employee.compOffTransactions.map((transaction, index) => {
                  return (
                    <tr key={index}>
                      <td style={{ padding: '8px 16px', border: '1px solid #e8e8e8' }}>{convertDate(transaction.compOffDate)} ({getWeekDay(transaction.compOffDate)})</td>
                      <td style={{ padding: '8px 16px', border: '1px solid #e8e8e8' }}>{transaction.numberOfHours}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.textareaContainer}>
          <div className={styles.heading}>Approver's Comments</div>
          <Input.TextArea
            rows={2}
            placeholder={readOnly ? "No comments provided" : "Enter your comments here"}
            style={{ width: '100%', borderRadius: '8px' }}
            value={approverComments}
            onChange={handleCommentsChange}
            disabled={readOnly}
          />
          {employee.leaveTypeName === "Missed Door Entry" && !isCommentValid && !readOnly && (
            <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{errorMessage}</div>
          )}
        </div>

        {shouldShowCheckboxes && (
          <>
            {employee.leaveTypeName === 'Customer Approved Comp-off' ? (
              <div className={styles.checkboxDiv}>
                <div className={styles.heading}>Customer Approved Comp-Off Checklist</div>

                <input
                  type="checkbox"
                  checked={informedCustomer}
                  onChange={handleCheckboxChange(setInformedCustomer)}
                  disabled={readOnly}
                />
                <label className={styles.space}> Received and Reviewed Customer Approval?</label>
                <div style={{ marginTop: '12px' }}>
                  <div className={styles.heading}>Note for approving for Comp-Off</div>
                  <ol className={styles.orderList}>
                    <li className={styles.orderListLI}>When approving full day comp off, the logged time in Zymmr for the day of comp-off must be a minimum of 8 hrs.</li>
                    <li className={styles.orderListLI}>When approving half day comp off, the logged time in Zymmr for the day of comp-off must be a minimum of 4 hrs.</li>
                    <li className={styles.orderListLI}>There must be approval from the customer before approving comp-off.</li>
                  </ol>
                </div>
              </div>
            ) : employee.leaveTypeName === 'Work From Home' ? (
              <div className={styles.checkboxDiv}>
                <div className={styles.heading}>Note for approver</div>
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>The approver is required to check and validate compliance for the below requirements before approving.</div>
                <ol className={styles.orderList}>
                  <li className={styles.orderListLI}>Associates working from home must dedicate their time to work-related tasks and refrain from engaging in personal activities during designated working hours.</li>
                  <li className={styles.orderListLI}>There cannot be background noise to ensure professionalism during calls or meetings.</li>
                  <li className={styles.orderListLI}>Associates are responsible for maintaining a stable internet connection and power supply, as well as ensuring the functionality of required devices.</li>
                  <li className={styles.orderListLI}>In the event of work being affected by issues related to the above points or any other reasons, WFH approval may be revoked, or the day may be considered as paid leave</li>
                </ol>
              </div>
            ) : employee.leaveTypeName === "Customer Approved Work From Home" ? (
              <div className={styles.checkboxDiv}>
                <div className={styles.heading}>Customer Approved work from home Checklist</div>
                <input
                  type="checkbox"
                  checked={informedCustomer}
                  onChange={handleCheckboxChange(setInformedCustomer)}
                  disabled={readOnly}
                />
                <label className={styles.space}> Received and Reviewed Customer Approval?</label>
                <div style={{ marginTop: '12px' }}>
                  <div className={styles.heading}>Note for approving for Customer Approved work from home</div>
                  <ol className={styles.orderList}>
                    <li className={styles.orderListLI}>Associates working from home must dedicate their time to work-related tasks and refrain from engaging in personal activities during designated working hours.</li>
                    <li className={styles.orderListLI}>There cannot be background noise to ensure professionalism during calls or meetings.</li>
                    <li className={styles.orderListLI}>Associates are responsible for maintaining a stable internet connection and power supply, as well as ensuring the functionality of required devices.</li>
                    <li className={styles.orderListLI}>In the event of work being affected by issues related to the above points or any other reasons WFH approval may be revoked, or the day may be considered as a leave of absence.</li>
                  </ol>
                </div>
              </div>
            ) :
              (
                <>
                  <div className={styles.heading}>Approver's Confirmation Checklist</div>
                  <div className={styles.checkboxDiv}>
                    <input
                      type="checkbox"
                      checked={informedCustomer}
                      onChange={handleCheckboxChange(setInformedCustomer)}
                      disabled={readOnly}
                    />
                    <label className={styles.space}> Informed Customer?</label>
                  </div>
                  <div className={styles.checkboxDiv}>
                    <input
                      type="checkbox"
                      checked={communicatedWithinTeam}
                      onChange={handleCheckboxChange(setCommunicatedWithinTeam)}
                      disabled={readOnly}
                    />
                    <label className={styles.space}> Communicated Within The Team?</label>
                  </div>
                  <div className={styles.checkboxDiv}>
                    <input
                      type="checkbox"
                      checked={handedOverResponsibilities}
                      onChange={handleCheckboxChange(setHandedOverResponsibilities)}
                      disabled={readOnly}
                    />
                    <label className={styles.space}> Handed Over Or Planned Responsibilities To Others?</label>
                  </div>
                </>
              )}
          </>
        )}
      </Modal>

      <ConfirmationChecklistModal
        isConfirmationChecklistModalOpen={isConfirmationChecklistModalOpen}
        setIsConfirmationChecklistModalOpen={handleConfirmationModalCancel}
        shouldReopenLeaveStatusPending={shouldReopenLeaveStatusPending}
        setShouldReopenLeaveStatusPending={setShouldReopenLeaveStatusPending}
        employee={employee}
      />
    </>
  );
};