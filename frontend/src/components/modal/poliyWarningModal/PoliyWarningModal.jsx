import React from 'react';
import styles from './PoliyWarningModal.module.css';

export const PoliyWarningModal = ({ warningModal, setWarningModal, remainingAttempts, acknowledgedPolicies }) => {
  if (!warningModal) return null;

  // Check if all policies are acknowledged
  const allPoliciesAcknowledged = Object.values(acknowledgedPolicies).every(status => status === true);
  console.log(allPoliciesAcknowledged,'allPoliciesAcknowledged');
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
      <h2>Important</h2>
        <div className={styles.modalContent1}> 
          <p className={styles.modalContent1p}>
          It has been noticed that there is a significant lack of understanding of the policies and procedures, which is why reading these policies is essential.
          </p>  
        </div>
        <p>
        Kindly note that you have {remainingAttempts} attempts remaining to read and acknowledge all required policy documents. Please ensure this is completed promptly to avoid restrictions on certain HRMS features. Your account will remain active, but access to some options will be temporarily disabled until compliance is met</p>
        <button 
          className={styles.closeButton}
          onClick={() => setWarningModal(false)}
          // disabled={!allPoliciesAcknowledged}
        >
          I Understand 
        </button>
      </div>
    </div>
  );
};
