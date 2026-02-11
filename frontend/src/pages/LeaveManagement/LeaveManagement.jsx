import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './LeaveManagement.module.css';
import { LeaveManagementPage } from '../leaveMangament/LeaveMangament.jsx';
import { TeamLeaves } from '../teamLeaves/TeamLeaves.jsx';

const LeaveManagement = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('myLeaves');

    // Check if user has access to Team Leaves tab
    const isLeadOrAbove = user?.roleName === 'Lead' || user?.roleName === 'HR' || user?.roleName === 'Admin';

    const tabs = [
        { id: 'myLeaves', label: 'My Leaves', icon: '📝' },
    ];

    // Add Team Leaves tab only for Lead/HR/Admin
    if (isLeadOrAbove) {
        tabs.push({ id: 'teamLeaves', label: 'Team Leaves', icon: '👥' });
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'myLeaves':
                return <LeaveManagementPage />;
            case 'teamLeaves':
                return <TeamLeaves />;
            default:
                return <LeaveManagementPage />;
        }
    };

    return (
        <div className={styles.container}>
            {/* <div className={styles.header}>
                <h1>Leave Management</h1>
                <p>Manage your leaves and view team leave requests</p>
            </div> */}

            <div className={styles.tabNavigation}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
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

export default LeaveManagement;
