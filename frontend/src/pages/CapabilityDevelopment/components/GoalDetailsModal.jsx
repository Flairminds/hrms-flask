import React from 'react';
import styles from './GoalDetailsModal.module.css';

const GoalDetailsModal = ({ goal, onClose, onUpdate }) => {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Goal Details</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h3>{goal.goalType === 'skill' ? goal.skillName : goal.goalTitle}</h3>
                        <p>{goal.goalDescription}</p>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.detailRow}>
                            <span className={styles.label}>Status:</span>
                            <span className={styles.value}>{goal.status}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.label}>Progress:</span>
                            <span className={styles.value}>{goal.progressPercentage}%</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.label}>Deadline:</span>
                            <span className={styles.value}>{new Date(goal.deadline).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className={styles.placeholder}>
                        <p>💬 Comments and reviews coming soon...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalDetailsModal;
