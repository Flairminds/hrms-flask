import React, { useState, useEffect } from 'react';
import styles from './ScorecardTab.module.css';
import { getMyMetrics, getMetricsHistory } from '../../../services/api';
import { toast } from 'react-toastify';

const ScorecardTab = () => {
    const [currentMetrics, setCurrentMetrics] = useState(null);
    const [history, setHistory] = useState([]);
    const [periodType, setPeriodType] = useState('monthly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
    }, [periodType]);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const [metricsRes, historyRes] = await Promise.all([
                getMyMetrics(periodType),
                getMetricsHistory(periodType, 12)
            ]);
            setCurrentMetrics(metricsRes.data);
            setHistory(historyRes.data || []);
        } catch (error) {
            console.error('Error fetching metrics:', error);
            toast.error('Failed to load scorecard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading scorecard...</div>;
    }

    if (!currentMetrics) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <h3>No metrics available</h3>
                <p>Start setting goals and getting feedback to build your scorecard</p>
            </div>
        );
    }

    const metrics = [
        {
            title: 'Overall Performance',
            value: currentMetrics.overallPerformanceScore,
            color: '#2563eb',
            icon: '⭐'
        },
        {
            title: 'Skill Proficiency',
            value: currentMetrics.skillProficiencyScore,
            color: '#10b981',
            icon: '🎯'
        },
        {
            title: 'Goal Completion',
            value: currentMetrics.goalCompletionRate,
            color: '#f59e0b',
            icon: '📋'
        },
        {
            title: 'Peer Feedback',
            value: currentMetrics.peerFeedbackScore,
            color: '#8b5cf6',
            icon: '💬'
        }
    ];

    const stats = [
        { label: 'Goals Set', value: currentMetrics.goalsSetCount },
        { label: 'Goals Completed', value: currentMetrics.goalsCompletedCount },
        { label: 'Skills Evaluated', value: currentMetrics.skillsEvaluatedCount },
        { label: 'Feedback Received', value: currentMetrics.feedbackReceivedCount }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>Performance Scorecard</h2>
                    <p>Your performance metrics and trends</p>
                </div>
                <select
                    className={styles.periodSelect}
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value)}
                >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>

            <div className={styles.periodInfo}>
                <strong>Current Period:</strong>{' '}
                {new Date(currentMetrics.periodStart).toLocaleDateString()} -{' '}
                {new Date(currentMetrics.periodEnd).toLocaleDateString()}
            </div>

            <div className={styles.metricsGrid}>
                {metrics.map((metric, index) => (
                    <div key={index} className={styles.metricCard} style={{ borderTopColor: metric.color }}>
                        <div className={styles.metricIcon}>{metric.icon}</div>
                        <div className={styles.metricContent}>
                            <h3 className={styles.metricTitle}>{metric.title}</h3>
                            <div className={styles.metricValue} style={{ color: metric.color }}>
                                {metric.value !== null ? `${metric.value.toFixed(1)}%` : 'N/A'}
                            </div>
                            {metric.value !== null && (
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{
                                            width: `${Math.min(metric.value, 100)}%`,
                                            backgroundColor: metric.color
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.statsSection}>
                <h3>Activity Summary</h3>
                <div className={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <div key={index} className={styles.statCard}>
                            <div className={styles.statValue}>{stat.value}</div>
                            <div className={styles.statLabel}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {history.length > 0 && (
                <div className={styles.historySection}>
                    <h3>Performance History</h3>
                    <div className={styles.historyTable}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>Overall</th>
                                    <th>Skills</th>
                                    <th>Goals</th>
                                    <th>Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((record, index) => (
                                    <tr key={index}>
                                        <td>
                                            {new Date(record.periodStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>{record.overallPerformanceScore?.toFixed(1) || 'N/A'}%</td>
                                        <td>{record.skillProficiencyScore?.toFixed(1) || 'N/A'}%</td>
                                        <td>{record.goalCompletionRate?.toFixed(1) || 'N/A'}%</td>
                                        <td>{record.peerFeedbackScore?.toFixed(1) || 'N/A'}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScorecardTab;
