import React from 'react';
import styles from './CreateGoalModal.module.css'; // Reuse styles

const GiveFeedbackModal = ({ onClose, onSubmit }) => {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Give Feedback</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div style={{ padding: '24px', textAlign: 'center' }}>
                    <p style={{ color: '#6b7280' }}>💡 Feedback form coming soon...</p>
                </div>
            </div>
        </div>
    );
};

export default GiveFeedbackModal;
