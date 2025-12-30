import React, { useState, useEffect } from 'react';
import PolicyPageStyle from "./PolicyPage.module.css";
import PolicyModal from '../../components/policyModal/PolicyModal';
import { updatePolicyAcknowledgment, updateWarningCount, getWarningCount } from '../../services/api';
import Cookies from 'js-cookie';
import axios from 'axios';
import { PoliyWarningModal } from '../../components/modal/poliyWarningModal/PoliyWarningModal';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

export const PolicyPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinalModalOpen, setIsFinalModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [acknowledgedPolicies, setAcknowledgedPolicies] = useState({});
  const [showReadAllMessage, setShowReadAllMessage] = useState(false);
  const [hasEmailBeenSent, setHasEmailBeenSent] = useState(false);
  const [warningModal, setWarningModal] = useState(false);
  const [count, setCount] = useState(0);
  const [showRelievedMessage, setShowRelievedMessage] = useState(false);
  const [isMissingInfoModal, setIsMissingInfoModal] = useState(false);
  const [missingInfoMessage, setMissingInfoMessage] = useState('');
console.log(count, "count in policy page");

  const policies = [
    { name: 'Leave Policy', url: 'https://drive.google.com/file/d/1_Tcg5K9-W54YmHyNRXMPsf4MWTUY2BwF/view' },
    { name: 'Work From Home Policy', url: 'https://drive.google.com/file/d/1RbOHnAYeOtLJlomSAjbtGDrpD5Qa29EL/view?usp=drive_link' },
    { name: 'Exit Policy & Process', url: 'https://drive.google.com/file/d/128MNJshhLD2YUW_wYauk-TrYQ1l2qOCs/view' },
    { name: 'Salary Advance & Recovery Policy', url: 'https://drive.google.com/file/d/1AKUQNWXNTW6x6f2Dfaj3XuLqZUNtZoOH/view' },
    { name: 'Probation To Confirmation Policy', url: 'https://drive.google.com/file/d/10XugR8XEqKgCmlFNPwyEF8U2wTcdfy9i/view' },
    { name: 'Salary and appraisal process Policy', url: 'https://drive.google.com/file/d/1EpooopuV80YGVCz2IFobaxaeRGMkp4uX/view?usp=drive_link' }
  ];

  useEffect(() => {
    const fetchPolicyStatus = async () => {
      try {
        const employeeId = Cookies.get('employeeId');
        if (!employeeId) return;

        const response = await axios.get(`https://hrms-flask.azurewebsites.net/api/policy-acknowledgment/${employeeId}`);
        const data = response.data;
        
        const acknowledgments = {
          'Leave Policy': data.LeavePolicyAcknowledged,
          'Work From Home Policy': data.WorkFromHomePolicyAcknowledged,
          'Exit Policy & Process': data.ExitPolicyAndProcessAcknowledged,
          'Salary Advance & Recovery Policy': data.SalaryAdvanceRecoveryPolicyAcknowledged,
          'Probation To Confirmation Policy': data.ProbationToConfirmationPolicyAcknowledged,
          'Salary and appraisal process Policy': data.SalaryAndAppraisalPolicyAcknowledged
        };

        setAcknowledgedPolicies(acknowledgments);

        // Check if all policies are acknowledged
        const allAcknowledged = Object.values(acknowledgments).every(status => status === true);
        if (!allAcknowledged) {
          setShowReadAllMessage(true);
        }

        // Show warning modal if any policy is unacknowledged
        const hasUnacknowledgedPolicies = Object.values(acknowledgments).some(status => status === false);
        setWarningModal(hasUnacknowledgedPolicies);

      } catch (error) {
        console.error('Error fetching policy status:', error);
      }
    };

    fetchPolicyStatus();
  }, []);

  useEffect(() => {
    const fetchWarningCount = async () => {
      try {
        const employeeId = Cookies.get('employeeId');
        if (employeeId) {
          const response = await getWarningCount(employeeId);
          setCount(response.data.warningCount);
        }
      } catch (error) {
        console.error('Error fetching warning count:', error);
      }
    };

    fetchWarningCount();
  }, []);

  const handleCheckboxClick = (policy) => {
    setSelectedPolicy(policy);
    setIsModalOpen(true);
  };

  const sendEmailToHR = async () => {
    try {
      const employeeId = Cookies.get('employeeId');
      const response = await axios.post('https://hrms-flask.azurewebsites.net/api/send-policy-email', {
        employeeId
      });
      
      if (response.status === 200) {
        setHasEmailBeenSent(true);
        setIsFinalModalOpen(true);
        // Refresh the page after successful email send
        setTimeout(() => {
          window.location.reload();
        }, 2000); // Wait for 2 seconds to show the success message before refresh
      }
    } catch (error) {
      console.error('Error sending email:', error);
      // Optionally show an error message to the user
    }
  };

  const handleModalConfirm = async () => {
    try {
      const employeeId = Cookies.get('employeeId');
      if (!employeeId) {
        console.error('Employee ID not found in cookies');
        return;
      }
      await updatePolicyAcknowledgment(employeeId, selectedPolicy.name);
      
      // Update the acknowledged policies state
      const updatedAcknowledged = {
        ...acknowledgedPolicies,
        [selectedPolicy.name]: true
      };
      setAcknowledgedPolicies(updatedAcknowledged);

      // Check if all policies are now acknowledged
      const allAcknowledged = Object.values(updatedAcknowledged).every(status => status === true);
      
      if (allAcknowledged && !hasEmailBeenSent) {
        await sendEmailToHR();
        setWarningModal(false); // Hide warning modal when all policies are acknowledged
      } else if (!allAcknowledged) {
        setShowReadAllMessage(true);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating policy acknowledgment:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPolicy(null);
  };

  const handleCloseFinalModal = () => {
    setIsFinalModalOpen(false);
    window.location.reload();
  };

  const handleWarningModalClose = async () => {
    setWarningModal(false);
    try {
      const employeeId = Cookies.get('employeeId');
      if (employeeId) {
        const response = await updateWarningCount(employeeId);
        setCount(response.data.warningCount);
        console.log(response.data,"responsegb");
       
        // If status was updated to Relieved
        if (response.data.warningCount == 4 ) {
          setShowRelievedMessage(true);
          // Redirect to login after 5 seconds
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      }
    } catch (error) {
      console.error('Error updating warning count:', error);
    }
  };

  const handleModalOk = () => {
    setIsMissingInfoModal(false);
  };
   const allAcknowledged = Object.values(acknowledgedPolicies).every(status => status === true);

  return (
    <div className={PolicyPageStyle.main}>
      {showRelievedMessage && (
        <div className={PolicyPageStyle.relievedBanner}>
        You will have limited options, as only a restricted number of counts can be passed to the read and policy operations.</div>
      )}
      {count >= 3 && !allAcknowledged   && (
        <div className={PolicyPageStyle.warningBanner}>
          You have reached the maximum warning count. Please acknowledge all policies to proceed.
        </div>
      )}

      {showReadAllMessage && (
        <div className={PolicyPageStyle.messageBanner}>
          Please read all the documents and acknowledge them by checking the checkboxes.
        </div>
      )}

      <div className={PolicyPageStyle.policyDocDiv}>
        <h2 className={PolicyPageStyle.heading}>Please click on the following links to open policy documents:</h2>
        {policies.map((policy, index) => (
          <div key={index} className={PolicyPageStyle.policyRow}>
            <input
              type="checkbox"
              checked={acknowledgedPolicies[policy.name] || false}
              onChange={() => handleCheckboxClick(policy)}
              className={PolicyPageStyle.checkbox}
            />
            <a 
              className={PolicyPageStyle.aTag} 
              href={policy.url} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {policy.name}
            </a>
          </div>
        ))}
      </div>

      <div className={PolicyPageStyle.htDocs}> 
        <h3>HR Documents Provisioning Procedure</h3>
        <span>One of the functions of HR is to provide required documents to all the associates. Most common documents are as below. This is one of the responsibilities of HR. And to make sure there are no errors or mistakes in these documents, they go through 2 levels of approvals internally within HR. This process needs to be given required time as they are handling it along with the other activities they are handling. So, the timeline set for providing any of these documents is 8 to 10 working days from the date they are requested or become due.</span>
        <ul>
          <li>Salary slips (signed or unsigned)</li>
          <li>Confirmation letter</li>
          <li>Relieving & experience letter</li>
          <li>Signed confirmation, offer letter</li>
          <li>These are most common but there can be more such documents</li>
        </ul>
        <span>The idea of automating this process is being worked on with a new HRMS system; however, currently, this is a manual process. Any verbal or chat requests will not be entertained, but the request must be sent via email.</span>
      </div>

      {isModalOpen && selectedPolicy && (
        <PolicyModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
          onConfirm={handleModalConfirm}
          policyName={selectedPolicy.name}
        />
      )}

      {isFinalModalOpen && (
        <div className={PolicyPageStyle.modalOverlay}>
          <div className={PolicyPageStyle.modalContent}>
            <h2>All Policies Acknowledged</h2>
            <p>You have confirmed that you have read all documents. An email has been sent to HR regarding that you have read all the documents.</p>
            <button onClick={handleCloseFinalModal} className={PolicyPageStyle.confirmButton}>
              OK
            </button>
          </div>
        </div>
      )}

      <PoliyWarningModal 
        warningModal={warningModal} 
        setWarningModal={handleWarningModalClose}
        remainingAttempts={Math.max(0, 3 - count)}
        acknowledgedPolicies={acknowledgedPolicies}
      />

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Missing Information</span>
          </div>
        }
        open={isMissingInfoModal}
        onOk={handleModalOk}
        onCancel={() => setIsMissingInfoModal(false)}
        footer={[
          <Button key="ok" type="primary" onClick={handleModalOk}>
            OK
          </Button>
        ]}
        maskClosable={false}
        closable={false}
      >
        <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
          {missingInfoMessage.split('\n').map((item, index) => (
            <li key={index} style={{ marginBottom: '8px' }}>{item}</li>
          ))}
        </ul>
      </Modal>
    </div>
  );
};