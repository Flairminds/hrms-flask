import React, { useState, useEffect } from 'react';
import styles from './MyGoalsTab.module.css';
import { getMyGoals, createGoalEnhanced, updateGoalProgress, getGoalComments, addGoalComment, getGoalReviews, addGoalReview } from '../../../services/api';
import GoalCard from './GoalCard';
import CreateGoalModal from './CreateGoalModal';
import GoalDetailsModal from './GoalDetailsModal';
import { toast } from 'react-toastify';

const MyGoalsTab = () => {
    const [skillGoals, setSkillGoals] = useState([]);
    const [otherGoals, setOtherGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [filter, setFilter] = useState('all'); // all, pending, in_progress, completed

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        try {
            setLoading(true);
            const response = await getMyGoals();
            setSkillGoals(response.data.skillDevelopment || []);
            setOtherGoals(response.data.other || []);
        } catch (error) {
            console.error('Error fetching goals:', error);
            toast.error('Failed to load goals');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGoal = async (goalData) => {
        try {
            await createGoalEnhanced(goalData);
            toast.success('Goal created successfully');
            setShowCreateModal(false);
            fetchGoals();
        } catch (error) {
            console.error('Error creating goal:', error);
            toast.error('Failed to create goal');
        }
    };

    const handleUpdateProgress = async (goalId, progress, notes) => {
        try {
            await updateGoalProgress(goalId, { progress, notes });
            toast.success('Progress updated');
            fetchGoals();
        } catch (error) {
            console.error('Error updating progress:', error);
            toast.error('Failed to update progress');
        }
    };

    const handleViewDetails = (goal) => {
        setSelectedGoal(goal);
    };

    const filterGoals = (goals) => {
        if (filter === 'all') return goals;
        return goals.filter(goal => goal.status === filter);
    };

    if (loading) {
        return <div className={styles.loading}>Loading goals...</div>;
    }

    const allGoals = [...skillGoals, ...otherGoals];
    const filteredGoals = filterGoals(allGoals);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2>My Goals</h2>
                    <p>{allGoals.length} total goals</p>
                </div>
                <div className={styles.headerRight}>
                    <select
                        className={styles.filterSelect}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Goals</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                    <button
                        className={styles.createButton}
                        onClick={() => setShowCreateModal(true)}
                    >
                        + Create Goal
                    </button>
                </div>
            </div>

            {filteredGoals.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📋</div>
                    <h3>No goals found</h3>
                    <p>Create your first goal to start tracking your development</p>
                    <button
                        className={styles.createButton}
                        onClick={() => setShowCreateModal(true)}
                    >
                        Create Goal
                    </button>
                </div>
            ) : (
                <div className={styles.goalsGrid}>
                    {filteredGoals.map(goal => (
                        <GoalCard
                            key={goal.goalId}
                            goal={goal}
                            onUpdateProgress={handleUpdateProgress}
                            onViewDetails={handleViewDetails}
                        />
                    ))}
                </div>
            )}

            {showCreateModal && (
                <CreateGoalModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateGoal}
                />
            )}

            {selectedGoal && (
                <GoalDetailsModal
                    goal={selectedGoal}
                    onClose={() => setSelectedGoal(null)}
                    onUpdate={fetchGoals}
                />
            )}
        </div>
    );
};

export default MyGoalsTab;
