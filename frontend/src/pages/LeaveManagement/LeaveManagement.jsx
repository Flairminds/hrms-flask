import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './LeaveManagement.module.css';
import { LeaveManagementPage } from '../leaveMangament/LeaveMangament.jsx';
import { TeamLeaves } from '../teamLeaves/TeamLeaves.jsx';
import { HRApplyLeaveModal } from '../../components/modal/hrApplyLeaveModal/HRApplyLeaveModal.jsx';
import { Button } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';

const LeaveManagement = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('myLeaves');
    const [isHRModalOpen, setIsHRModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Check if user has access to Team Leaves tab
    const isLeadOrAbove = user?.roleName === 'Lead' || user?.roleName === 'HR' || user?.roleName === 'Admin';
    const isHROrAdmin = user?.roleName === 'HR' || user?.roleName === 'Admin';

    const tabs = [
        { id: 'myLeaves', label: 'My Leaves', icon: '📝' },
    ];

    // Add Team Leaves tab only for Lead/HR/Admin
    if (isLeadOrAbove) {
        tabs.push({ id: 'teamLeaves', label: 'Team Leaves', icon: '👥' });
    }

    // Add Apply on Behalf tab only for HR/Admin
    if (isHROrAdmin) {
        tabs.push({ id: 'applyOnBehalf', label: 'Apply on Behalf', icon: '🧑‍💼' });
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'myLeaves':
                return <LeaveManagementPage key={refreshTrigger} />;
            case 'teamLeaves':
                return <TeamLeaves />;
            case 'applyOnBehalf':
                return (
                    <div style={{ padding: '32px 24px' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <Button
                                type="primary"
                                icon={<UserAddOutlined />}
                                size="large"
                                onClick={() => setIsHRModalOpen(true)}
                            >
                                Apply Leave on Behalf of Employee
                            </Button>
                        </div>
                        <p style={{ color: '#888', fontSize: '13px', maxWidth: '600px' }}>
                            As HR / Admin, you can apply leave for any employee. Standard timing and
                            advance-notice validations are bypassed — balance and overlap checks still apply.
                            The leave will record your Employee ID in the <strong>Applied By</strong> field.
                        </p>
                        <HRApplyLeaveModal
                            open={isHRModalOpen}
                            onClose={() => setIsHRModalOpen(false)}
                            onSuccess={() => {
                                setRefreshTrigger(t => t + 1);
                                setIsHRModalOpen(false);
                            }}
                        />
                    </div>
                );
            default:
                return <LeaveManagementPage />;
        }
    };

    return (
        <div className={styles.container}>
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

export default LeaveManagement;
