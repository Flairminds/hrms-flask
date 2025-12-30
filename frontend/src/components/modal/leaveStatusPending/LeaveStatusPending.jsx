import React, { useEffect, useState } from 'react';
import { Input, Button, Modal, Descriptions } from 'antd';
import styles from '../leaveStatusPending/LeaveStatusPending.module.css';
import { ConfirmationChecklistModal } from '../ConfirmationChecklist/ConfirmationChecklist';
import { getTeamLead, updateLeaveStatus } from '../../../services/api';
import { ToastContainer, toast } from 'react-toastify';
import { getCookie } from '../../../util/CookieSet';

export const LeaveStatusPending = ({ setMyEmployeeData, setLoading, isLeaveApprovalModalOpen, setIsLeaveApprovalModalOpen, employee, onStatusChange,selectedRange }) => {
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
        const response = await getTeamLead(employeeId,selectedRange);
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
 
  
  const updatedEmployee = { ...employee, ApproverComment: approverComments, approvedById: employeeId };


  const shouldShowCheckboxes = ![
    "Visiting Client Location",
    "Customer Holiday",
    "Working Late Today"
  ].includes(employee.LeaveType);

  // Update allChecked logic to include any new checkboxes
  const allChecked = informedCustomer && communicatedWithinTeam && handedOverResponsibilities;
  const customerApprovedChecked = employee.LeaveType === 'Customer Approved Comp-off' && informedCustomer;
  const workFromHomeChecked = employee.LeaveType === 'Work From Home' && informedCustomer;
  const customerApprovedWFHChecked = employee.LeaveType === 'Customer Approved Work From Home' && informedCustomer;

  const enableApproveButton = shouldShowCheckboxes
  ? (employee.LeaveType === 'Customer Approved Comp-off'
    ? customerApprovedChecked
    : employee.LeaveType === 'Work From Home'
      ? true
      : employee.LeaveType === 'Customer Approved Work From Home'
        ? customerApprovedWFHChecked
        : allChecked)
  : true;


  const showWorkingLateDetails = employee.LeaveType === "Working Late Today";
  const showCustomerHolidayDetails = employee.LeaveType === "Customer Holiday";
  const showCompOffDetails = employee.LeaveType === "Customer Approved Comp-off";
  const handleApprove = async () => {
    setIsButtonDisabled(true);
    const {
      leaveTranId,
      isBillable,
      isCommunicatedToTeam,
      isCustomerApprovalRequired,
      approvedById
    } = updatedEmployee;
    
    const isBillableNum = isBillable ? 1 : 0;
    const isCommunicatedToTeamNum = isCommunicatedToTeam ? 1 : 0;
    const isCustomerApprovalRequiredNum = isCustomerApprovalRequired ? 1 : 0;
  
    const updatedData = {
      leaveTranId: leaveTranId,
      leaveStatus: "Approved",
      approverComment: approverComments, // Corrected: Use approverComments here
      isBillable: isBillableNum,
      isCommunicatedToTeam: isCommunicatedToTeamNum,
      isCustomerApprovalRequired: isCustomerApprovalRequiredNum,
      approvedById: approvedById
    };
 
    try {
      await updateLeaveStatus(
        updatedData.leaveTranId,
        updatedData.leaveStatus,
        updatedData.approverComment,
        updatedData.isBillable,
        updatedData.isCommunicatedToTeam,
        updatedData.isCustomerApprovalRequired,
        updatedData.approvedById
      );
      fetchEmployeeData();
      toast.success('Leave approved successfully..');
    } catch (error) {
      console.error('Failed to update leave status:', error);
    }
  
    setApproverComments('');
    setInformedCustomer(false);
    setCommunicatedWithinTeam(false);
    setHandedOverResponsibilities(false);
    setIsLeaveApprovalModalOpen(false);
    onStatusChange(updatedData.leaveStatus);
    setIsButtonDisabled(false);
  };
  
  const handleReject = async () => {
    setIsButtonDisabled(true);
    const {
      leaveTranId,
      isBillable,
      isCommunicatedToTeam,
      isCustomerApprovalRequired,
      approvedById
    } = updatedEmployee;
  
    const isBillableNum = isBillable ? 1 : 0;
    const isCommunicatedToTeamNum = isCommunicatedToTeam ? 1 : 0;
    const isCustomerApprovalRequiredNum = isCustomerApprovalRequired ? 1 : 0;
  
    const updatedData = {
      leaveTranId: leaveTranId,
      leaveStatus: "Reject", 
      approverComment: approverComments,
      isBillable: isBillableNum,
      isCommunicatedToTeam: isCommunicatedToTeamNum,
      isCustomerApprovalRequired: isCustomerApprovalRequiredNum,
      approvedById: approvedById
    };

    try {
      await updateLeaveStatus(
        updatedData.leaveTranId,
        updatedData.leaveStatus,
        updatedData.approverComment,
        updatedData.isBillable,
        updatedData.isCommunicatedToTeam,
        updatedData.isCustomerApprovalRequired,
        updatedData.approvedById
      );
      fetchEmployeeData();
      toast.success('Leave rejected');
    } catch (error) {
      console.error('Failed to update leave status:', error);
    }
  
    setApproverComments('');
    setInformedCustomer(false);
    setCommunicatedWithinTeam(false);
    setHandedOverResponsibilities(false);
    setIsLeaveApprovalModalOpen(false);
    onStatusChange(updatedData.leaveStatus);
    setIsButtonDisabled(false);
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
    if (employee.LeaveType === "Missed Door Entry") {
      if (value.length >= 250) {
        setIsCommentValid(true); 
        setErrorMessage(""); 
      } else {
        setIsCommentValid(false);
        setErrorMessage(
          "Comments must be at least 250 characters for 'Missed Door Entry'."
        );
      }
    } else {
      setIsCommentValid(true); 
      setErrorMessage(""); 
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
      <Modal
        title="Pending Leave Details"
        open={isLeaveApprovalModalOpen}
        onCancel={handleCancel}
        footer={[
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
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Employee Name" labelStyle={{ fontWeight: 'bold' }}>{employee.empName}</Descriptions.Item>
          <Descriptions.Item label="Leave Type" labelStyle={{ fontWeight: 'bold' }}>{employee.LeaveType}</Descriptions.Item>
          <Descriptions.Item label="Duration" labelStyle={{ fontWeight: 'bold' }}>{employee.duration}</Descriptions.Item>
          <Descriptions.Item label="From Date" labelStyle={{ fontWeight: 'bold' }}>{employee.fromDate}</Descriptions.Item>
          <Descriptions.Item label="To Date" labelStyle={{ fontWeight: 'bold' }}>{employee.toDate}</Descriptions.Item>
          <Descriptions.Item label="Hand Over Comment" labelStyle={{ fontWeight: 'bold' }}>{employee.handOverComments}</Descriptions.Item>

          {showWorkingLateDetails && (
            <>
              <Descriptions.Item label="From Time" labelStyle={{ fontWeight: 'bold' }}>{employee.fromTime}</Descriptions.Item>
              <Descriptions.Item label="To Time" labelStyle={{ fontWeight: 'bold' }}>{employee.toTime}</Descriptions.Item>
              <Descriptions.Item label="Reasons for Working Late" labelStyle={{ fontWeight: 'bold' }}>{employee.reasonForWorkingLate}</Descriptions.Item>
            </>
          )}{showCustomerHolidayDetails && (
            <>
              <Descriptions.Item label="Worked Date" labelStyle={{ fontWeight: 'bold' }}>{employee.workedDate}</Descriptions.Item>
            </>
          )}{showCompOffDetails && (
            <>
              {employee.compOffDetails && employee.compOffDetails.length > 0 && (
                employee.compOffDetails.map((transaction, index) => {
                const compOffDate = new Date(transaction.compOffDate);
                const formattedDate = `${compOffDate.getFullYear()}-${String(compOffDate.getMonth() + 1).padStart(2, '0')}-${String(compOffDate.getDate()).padStart(2, '0')}`;                 

                  return (
                    <React.Fragment key={index}>
                      <Descriptions.Item label="Comp Off Date" labelStyle={{ fontWeight: 'bold' }}>{formattedDate}</Descriptions.Item>
                      <Descriptions.Item label="Number of Hours" labelStyle={{ fontWeight: 'bold' }}>{transaction.numberOfHours}</Descriptions.Item>
                    </React.Fragment>
                  );
                })
              )}
            </>
          )}

          <Descriptions.Item label="Number of Days" labelStyle={{ fontWeight: 'bold' }}>{employee.appliedLeaveCount}</Descriptions.Item>
          <Descriptions.Item label="Application Date" labelStyle={{ fontWeight: 'bold' }}>{employee.applicationDate}</Descriptions.Item>
          <Descriptions.Item label="Comments" labelStyle={{ fontWeight: 'bold' }}>{employee.comments}</Descriptions.Item>
          <Descriptions.Item label="Leave Status" labelStyle={{ fontWeight: 'bold' }}>
            <Button
              key="status"
             className={styles.pendingLeave}
            >
              {employee.leaveStatus}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="Approver" labelStyle={{ fontWeight: 'bold' }}>{employee.approvedBy}</Descriptions.Item>
          <Descriptions.Item label="Approver's Comments" labelStyle={{ fontWeight: 'bold' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input.TextArea rows={4} placeholder="Enter your comments here" style={{ width: '100%' }}
                value={approverComments}
                onChange={handleCommentsChange}
              />
              {employee.LeaveType === "Missed Door Entry" && !isCommentValid && (
        <span style={{ color: "red", fontSize: "12px" }}>{errorMessage}</span>
      )}
            </div>
          </Descriptions.Item>
        </Descriptions>

        {shouldShowCheckboxes && (
          <>
            {employee.LeaveType === 'Customer Approved Comp-off' ? (
              <div className={styles.checkboxDiv}>
                <div style={{ padding: "0.2rem" }}>
                  <h3 className={styles.heading}>Customer Approved Comp-Off Checklist</h3>
                </div>

                <input
                  type="checkbox"
                  checked={informedCustomer}
                  onChange={handleCheckboxChange(setInformedCustomer)}
                />
                <label className={styles.space}> Received and Reviewed Customer Approval?</label>
                <div style={{ padding: "0.2rem" }}>
                  <h4 className={styles.heading}>Note for approving for Comp-Off</h4>
                  <ol className={styles.orderList}>
                    <li className={styles.orderListLI}>When approving full day comp off, the logged time in Zymmr for the day of comp-off must be a minimum of 8 hrs.</li>
                    <li className={styles.orderListLI}>When approving half day comp off, the logged time in Zymmr for the day of comp-off must be a minimum of 4 hrs.</li>
                    <li className={styles.orderListLI}>There must be approval from the customer before approving comp-off.</li>
                  </ol>
                </div>
              </div>
            ) : employee.LeaveType === 'Work From Home' ? (
              <div className={styles.checkboxDiv}>

                <div style={{ padding: "0.2rem" }}>
                  <h4 className={styles.heading}>Note for approver: The approver is required to check and validate compliance for the below requirements before approving.</h4>
                  <ol className={styles.orderList}>
                    <li className={styles.orderListLI}>Associates working from home must dedicate their time to work-related tasks and refrain from engaging in personal activities during designated working hours.</li>
                    <li className={styles.orderListLI}>There cannot be background noise to ensure professionalism during calls or meetings.</li>
                    <li className={styles.orderListLI}>Associates are responsible for maintaining a stable internet connection and power supply, as well as ensuring the functionality of required devices.</li>
                    <li className={styles.orderListLI}>In the event of work being affected by issues related to the above points or any other reasons, WFH approval may be revoked, or the day may be considered as paid leave</li>
                  </ol>
                </div>
              </div>
            ) : employee.LeaveType === "Customer Approved Work From Home" ? (
              <div className={styles.checkboxDiv}>
                <div style={{ padding: "0.2rem" }}>
                  <h3 className={styles.heading}>Customer Approved work from home Checklist</h3>
                </div>
                <input
                  type="checkbox"
                  checked={informedCustomer}
                  onChange={handleCheckboxChange(setInformedCustomer)}
                />
                <label className={styles.space}> Received and Reviewed Customer Approval?</label>
                <div style={{ padding: "0.2rem" }}>
                  <h4 className={styles.heading}>Note for approving for Customer Approved work from home</h4>
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
                  <h2 className={styles.heading}>Approver's Confirmation Checklist</h2>
                  <div className={styles.checkboxDiv}>
                    <input
                      type="checkbox"
                      checked={informedCustomer}
                      onChange={handleCheckboxChange(setInformedCustomer)}
                    />
                    <label className={styles.space}> Informed Customer?</label>
                  </div>
                  <div className={styles.checkboxDiv}>
                    <input
                      type="checkbox"
                      checked={communicatedWithinTeam}
                      onChange={handleCheckboxChange(setCommunicatedWithinTeam)}
                    />
                    <label className={styles.space}> Communicated Within The Team?</label>
                  </div>
                  <div className={styles.checkboxDiv}>
                    <input
                      type="checkbox"
                      checked={handedOverResponsibilities}
                      onChange={handleCheckboxChange(setHandedOverResponsibilities)}
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
        employee={updatedEmployee}
      />
    </>
  );
};