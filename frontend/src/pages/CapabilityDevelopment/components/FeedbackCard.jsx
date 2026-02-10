import React from 'react';
import styles from './FeedbackCard.module.css';

const FeedbackCard = ({ feedback, view }) => {
    const getCategoryBadge = (category) => {
        const colors = {
            skill: '#2563eb',
            performance: '#10b981',
            behavior: '#f59e0b',
            goal: '#8b5cf6',
            general: '#6b7280'
        };
        return colors[category] || '#6b7280';
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div>
                    <div className={styles.name}>
                        {view === 'received' ? `From: ${feedback.feedbackByName}` : `To: ${feedback.forEmployeeName}`}
                    </div>
                    <div className={styles.date}>
                        {new Date(feedback.feedbackDate).toLocaleDateString()}
                    </div>
                </div>
                <div className={styles.badges}>
                    <span
                        className={styles.category}
                        style={{ backgroundColor: getCategoryBadge(feedback.feedbackCategory) }}
                    >
                        {feedback.feedbackCategory}
                    </span>
                    {feedback.rating && (
                        <span className={styles.rating}>
                            ⭐ {feedback.rating.toFixed(1)}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.content}>
                <p>{feedback.feedbackText}</p>
            </div>

            {feedback.relatedSkillName && (
                <div className={styles.related}>
                    Related to: <strong>{feedback.relatedSkillName}</strong>
                </div>
            )}
        </div>
    );
};

export default FeedbackCard;
