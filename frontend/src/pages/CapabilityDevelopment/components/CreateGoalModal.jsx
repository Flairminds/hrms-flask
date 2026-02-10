import React, { useState } from 'react';
import styles from './CreateGoalModal.module.css';

const CreateGoalModal = ({ onClose, onCreate }) => {
    const [goalType, setGoalType] = useState('skill');
    const [goalData, setGoalData] = useState({
        goalType: 'skill',
        goalTitle: '',
        goalDescription: '',
        deadline: '',
        goalCategory: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate(goalData);
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Create New Goal</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>Goal Type</label>
                        <select
                            value={goalData.goalType}
                            onChange={(e) => setGoalData({ ...goalData, goalType: e.target.value })}
                            className={styles.input}
                        >
                            <option value="skill">Skill Development</option>
                            <option value="other">Other Goal</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Title *</label>
                        <input
                            type="text"
                            value={goalData.goalTitle}
                            onChange={(e) => setGoalData({ ...goalData, goalTitle: e.target.value })}
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                            value={goalData.goalDescription}
                            onChange={(e) => setGoalData({ ...goalData, goalDescription: e.target.value })}
                            className={styles.textarea}
                            rows={3}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Category</label>
                        <input
                            type="text"
                            value={goalData.goalCategory}
                            onChange={(e) => setGoalData({ ...goalData, goalCategory: e.target.value })}
                            className={styles.input}
                            placeholder="e.g., Certification, Training"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Deadline *</label>
                        <input
                            type="date"
                            value={goalData.deadline}
                            onChange={(e) => setGoalData({ ...goalData, deadline: e.target.value })}
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.createButton}>
                            Create Goal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGoalModal;
