import React, { useState } from 'react';
import styles from './CapabilityDevelopment.module.css';
import MySkillsTab from './components/MySkillsTab';
import TeamSkillsTab from './components/TeamSkillsTab';
import MyGoalsTab from './components/MyGoalsTab';
import ReviewsFeedbackTab from './components/ReviewsFeedbackTab';
import ScorecardTab from './components/ScorecardTab';

export const CapabilityDevelopment = () => {
    const [activeTab, setActiveTab] = useState('skills');

    const tabs = [
        { id: 'skills', label: 'My Skills', icon: '🎯' },
        { id: 'teamskills', label: 'Team Skills', icon: '👥' },
        { id: 'goals', label: 'My Goals', icon: '📋' },
        { id: 'feedback', label: 'Reviews & Feedback', icon: '💬' },
        { id: 'scorecard', label: 'Scorecard', icon: '📊' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'skills':
                return <MySkillsTab />;
            case 'teamskills':
                return <TeamSkillsTab />;
            case 'goals':
                return <MyGoalsTab />;
            case 'feedback':
                return <ReviewsFeedbackTab />;
            case 'scorecard':
                return <ScorecardTab />;
            default:
                return <MySkillsTab />;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Capability Development</h2>
                <p>Track your skills, goals, feedback, and performance</p>
            </div>

            <div className={styles.tabNavigation}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {/* <span className={styles.tabIcon}>{tab.icon}</span> */}
                        <span className={styles.tabLabel}>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className={styles.tabContent}>
                {renderTabContent()}
            </div>
        </div>
    );
};
