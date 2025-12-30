import React from 'react';
import styles from './PolicyModal.module.css';

const PolicyModal = ({ isOpen, onClose, onConfirm, policyName }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Policy Acknowledgment</h2>
        <p>Are you sure you have read the {policyName}?</p>
        <div className={styles.buttonContainer}>
          <button onClick={onConfirm} className={styles.confirmButton}>
            Yes, I have read it
          </button>
          <button onClick={onClose} className={styles.cancelButton}>
            No, I haven't read it yet
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal; 