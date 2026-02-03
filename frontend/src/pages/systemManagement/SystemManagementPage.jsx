import React from 'react';
import { Tabs } from 'antd';
import PCsPage from '../PCsPage/PCsPage';
import AssignmentsPage from '../AssignmentsPage/AssignmentsPage';
import MaintenancePage from '../MaintenanceManagementPage/MaintenancePage';

const { TabPane } = Tabs;

export const SystemManagementPage = () => {
    return (
        <div style={{ padding: '24px', background: '#fff', minHeight: '100vh' }}>
            <Tabs defaultActiveKey="1">
                <TabPane tab="PCs Page" key="1">
                    <PCsPage />
                </TabPane>
                <TabPane tab="Assignments" key="2">
                    <AssignmentsPage />
                </TabPane>
                <TabPane tab="Maintenance" key="3">
                    <MaintenancePage />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default SystemManagementPage;
