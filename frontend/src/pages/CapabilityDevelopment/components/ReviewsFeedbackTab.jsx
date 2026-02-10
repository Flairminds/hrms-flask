import React, { useState, useEffect } from 'react';
import styles from './ReviewsFeedbackTab.module.css';
import { getReceivedFeedback, getGivenFeedback, submitFeedback } from '../../../services/api';
import FeedbackCard from './FeedbackCard';
import GiveFeedbackModal from './GiveFeedbackModal';
import { toast } from 'react-toastify';

const ReviewsFeedbackTab = () => {
    const [view, setView] = useState('received'); // received or given
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGiveModal, setShowGiveModal] = useState(false);
    const [filter, setFilter] = useState({ category: 'all', minRating: null });

    useEffect(() => {
        fetchFeedback();
    }, [view, filter]);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filter.category !== 'all') params.category = filter.category;
            if (filter.minRating) params.minRating = filter.minRating;

            const response = view === 'received'
                ? await getReceivedFeedback(params)
                : await getGivenFeedback(params);

            setFeedbacks(response.data || []);
        } catch (error) {
            console.error('Error fetching feedback:', error);
            toast.error('Failed to load feedback');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFeedback = async (feedbackData) => {
        try {
            await submitFeedback(feedbackData);
            toast.success('Feedback submitted successfully');
            setShowGiveModal(false);
            if (view === 'given') fetchFeedback();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error('Failed to submit feedback');
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading feedback...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2>Reviews & Feedback</h2>
                    <p>Peer-to-peer feedback system</p>
                </div>
                <button
                    className={styles.giveButton}
                    onClick={() => setShowGiveModal(true)}
                >
                    + Give Feedback
                </button>
            </div>

            <div className={styles.viewToggle}>
                <button
                    className={`${styles.toggleButton} ${view === 'received' ? styles.active : ''}`}
                    onClick={() => setView('received')}
                >
                    📥 Received ({feedbacks.filter(f => f).length})
                </button>
                <button
                    className={`${styles.toggleButton} ${view === 'given' ? styles.active : ''}`}
                    onClick={() => setView('given')}
                >
                    📤 Given ({feedbacks.filter(f => f).length})
                </button>
            </div>

            <div className={styles.filters}>
                <select
                    className={styles.filterSelect}
                    value={filter.category}
                    onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                >
                    <option value="all">All Categories</option>
                    <option value="skill">Skill</option>
                    <option value="performance">Performance</option>
                    <option value="behavior">Behavior</option>
                    <option value="goal">Goal</option>
                    <option value="general">General</option>
                </select>

                <select
                    className={styles.filterSelect}
                    value={filter.minRating || 'all'}
                    onChange={(e) => setFilter({ ...filter, minRating: e.target.value === 'all' ? null : Number(e.target.value) })}
                >
                    <option value="all">All Ratings</option>
                    <option value="4">4+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="2">2+ Stars</option>
                </select>
            </div>

            {feedbacks.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>💬</div>
                    <h3>No feedback found</h3>
                    <p>
                        {view === 'received'
                            ? 'You haven\'t received any feedback yet'
                            : 'You haven\'t given any feedback yet'}
                    </p>
                    {view === 'given' && (
                        <button
                            className={styles.giveButton}
                            onClick={() => setShowGiveModal(true)}
                        >
                            Give Feedback
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.feedbackList}>
                    {feedbacks.map(feedback => (
                        <FeedbackCard
                            key={feedback.feedbackId}
                            feedback={feedback}
                            view={view}
                        />
                    ))}
                </div>
            )}

            {showGiveModal && (
                <GiveFeedbackModal
                    onClose={() => setShowGiveModal(false)}
                    onSubmit={handleSubmitFeedback}
                />
            )}
        </div>
    );
};

export default ReviewsFeedbackTab;
