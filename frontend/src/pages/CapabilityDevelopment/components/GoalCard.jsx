import React, { useState } from 'react';
import styles from './GoalCard.module.css';

const GoalCard = ({ goal, onUpdateProgress, onViewDetails }) => {
    const [showProgressUpdate, setShowProgressUpdate] = useState(false);
    const [progress, setProgress] = useState(goal.progressPercentage || 0);

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#10b981';
            case 'in_progress': return '#f59e0b';
            case 'pending': return '#6b7280';
            case 'cancelled': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusLabel = (status) => {
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const handleProgressUpdate = () => {
        onUpdateProgress(goal.goalId, progress);
        setShowProgressUpdate(false);
    };

    const deadlineDate = new Date(goal.deadline);
    const daysRemaining = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0 && goal.status !== 'completed';

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.goalType}>
                    {goal.goalType === 'skill' ? '🎯' : '📚'} {goal.goalType === 'skill' ? 'Skill Development' : 'Other Goal'}
                </div>
                <span
                    className={styles.status}
                    style={{ backgroundColor: getStatusColor(goal.status) }}
                >
                    {getStatusLabel(goal.status)}
                </span>
            </div>

            <h3 className={styles.title}>
                {goal.goalType === 'skill' ? goal.skillName : goal.goalTitle}
            </h3>

            {goal.goalDescription && (
                <p className={styles.description}>{goal.goalDescription}</p>
            )}

            {goal.goalCategory && (
                <div className={styles.category}>{goal.goalCategory}</div>
            )}

            <div className={styles.progress}>
                <div className={styles.progressHeader}>
                    <span>Progress</span>
                    <span className={styles.progressValue}>{Math.round(progress)}%</span>
                </div>
                <div className={styles.progressBar}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className={styles.metadata}>
                <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Deadline:</span>
                    <span className={`${styles.metaValue} ${isOverdue ? styles.overdue : ''}`}>
                        {deadlineDate.toLocaleDateString()}
                        {daysRemaining >= 0 && goal.status !== 'completed' && (
                            <span className={styles.daysRemaining}> ({daysRemaining}d left)</span>
                        )}
                        {isOverdue && <span className={styles.overdueLabel}> Overdue!</span>}
                    </span>
                </div>
                <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Set by:</span>
                    <span className={styles.metaValue}>{goal.setByName}</span>
                </div>
            </div>

            {(goal.commentsCount > 0 || goal.reviewsCount > 0) && (
                <div className={styles.interactions}>
                    {goal.commentsCount > 0 && (
                        <span className={styles.interactionBadge}>
                            💬 {goal.commentsCount}
                        </span>
                    )}
                    {goal.reviewsCount > 0 && (
                        <span className={styles.interactionBadge}>
                            ⭐ {goal.reviewsCount}
                        </span>
                    )}
                </div>
            )}

            <div className={styles.actions}>
                {showProgressUpdate ? (
                    <div className={styles.progressUpdate}>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                            className={styles.progressInput}
                        />
                        <button onClick={handleProgressUpdate} className={styles.saveButton}>
                            Save
                        </button>
                        <button onClick={() => setShowProgressUpdate(false)} className={styles.cancelButton}>
                            Cancel
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => setShowProgressUpdate(true)}
                            className={styles.actionButton}
                            disabled={goal.status === 'completed'}
                        >
                            Update Progress
                        </button>
                        <button
                            onClick={() => onViewDetails(goal)}
                            className={styles.actionButton}
                        >
                            View Details
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default GoalCard;
