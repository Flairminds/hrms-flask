import React, { useState } from 'react';
import styles from './CapabilityDevelopment.module.css';
import MySkillsTab from './components/MySkillsTab';
import TeamSkillsTab from './components/TeamSkillsTab';
import SkillsMasterTab from './components/SkillsMasterTab';
import MyGoalsTab from './components/MyGoalsTab';
import ReviewsFeedbackTab from './components/ReviewsFeedbackTab';
import ScorecardTab from './components/ScorecardTab';
import { useAuth } from '../../context/AuthContext';

export const CapabilityDevelopment = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('skills');

    const tabs = [
        { id: 'skills', label: 'My Skills', allowedRoles: ['admin', 'hr', 'lead', 'employee'] },
        { id: 'teamskills', label: 'Team Skills', allowedRoles: ['admin', 'hr', 'lead', 'employee'] },
        { id: 'skillsmaster', label: 'Skills Master', allowedRoles: ['admin', 'hr'] },
        { id: 'goals', label: 'My Goals', allowedRoles: ['admin', 'hr', 'lead', 'employee'] },
        { id: 'feedback', label: 'Reviews & Feedback', allowedRoles: ['admin', 'hr', 'lead', 'employee'] },
        { id: 'scorecard', label: 'Scorecard', allowedRoles: ['admin', 'hr', 'lead', 'employee'] }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'skills':
                return <MySkillsTab />;
            case 'teamskills':
                return <TeamSkillsTab />;
            case 'skillsmaster':
                return <SkillsMasterTab />;
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
            {/* <div className={styles.header}>
                <h2>Capability Development</h2>
                <p>Track your skills, goals, feedback, and performance</p>
            </div> */}

            <div className={styles.tabNavigation}>
                {tabs.filter(tab => tab.allowedRoles.includes(user?.roleName.toLowerCase())).map(tab => (
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
