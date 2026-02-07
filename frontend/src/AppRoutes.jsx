import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { LoginPage } from './pages/login/LoginPage.jsx';
import { LeaveManagementPage } from "./pages/leaveMangament/LeaveMangament.jsx"
import { Dashboard } from './pages/dashboard/Dashboard.jsx';
import { PageLayout } from './layout/pageLayout/PageLayout.jsx';
import HolidayPage from './pages/holiday/HolidayPage.jsx';
import { PolicyPage } from './pages/policy/Policypage.jsx';
import { TeamLeaves } from './pages/teamLeaves/TeamLeaves.jsx';
import PersonalInfo from './pages/PersonalInfoPage/PersonalInfoPage.jsx';
import HRLeaveManagement from './pages/hrLevelMangement/HrLeaveManagement.jsx'
import { GoalSettingForm } from './pages/goalSeetingForm/GoalSettingForm.jsx';
import { EmployeeData } from './pages/employeeData/EmployeeData.jsx';
import { AllLeavesRecords } from './pages/allLeavesRecords/AllLeavesRecords.jsx';
import UpdateLeaveApprover from './pages/updateLeaveApprover/UpdateLeaveApprover.jsx';
import Accessibility from './components/Accessibility/Accessibility.jsx';
import MasterHR from './pages/MasterHR/MasterHR.jsx';
import MonthlyReport from './pages/MonthlyReport/MonthlyReport.jsx';
import { ResetPassword } from './pages/resetPassword/ResetPassword.jsx';
import { SalarySlipUpload } from './pages/salarySlipUpload/SalarySlipUpload.jsx';
import { SkillTracking } from './pages/skillTracking/SkillTracking.jsx';
import { AllDocRecords } from './pages/allDocRecords/AllDocRecords.jsx';
import { EmployeesSkillEvaluationList } from './pages/EmployeesSkillEvaluationList/EmployeesSkillEvaluationList.jsx';
import { GoalSettingPage } from './pages/GoalSettingPage/GoalSettingPage.jsx';
import { RelievingLetter } from './pages/RelievingLetter/RelievingLetter.jsx'
import PCsPage from './pages/PCsPage/PCsPage.jsx';
import AssignmentsPage from "./pages/AssignmentsPage/AssignmentsPage.jsx";
import MaintenancePage from "./pages/MaintenanceManagementPage/MaintenancePage.jsx";
import SystemManagementPage from './pages/systemManagement/SystemManagementPage.jsx';
import UnauthorizedPage from './pages/UnauthorizedPage/UnauthorizedPage.jsx';
import Projects from './pages/Projects/Projects.jsx';
import HardwareManagement from './pages/HardwareManagement/HardwareManagement.jsx';
// box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

function AppRoutes() {
    const { user, isAuthenticated } = useAuth();

    return (
        <Routes>
            {/* Swagger Route */}
            <Route path="/swagger" element={() => {
                window.location.href = '/swagger/index.html';
                return null;
            }} />

            {/* Public Routes */}
            <Route path="/login" element={isAuthenticated ? <Navigate to="/personal-info" replace /> : <LoginPage />} />
            <Route path="/resetPassword" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected Routes */}
            <Route path="/" element={
                <ProtectedRoute>
                    <PageLayout isRole={user?.roleName} />
                </ProtectedRoute>
            }>
                <Route path="/" element={<Dashboard />} />
                <Route path="leave" element={<LeaveManagementPage />} />
                <Route path="holiday" element={<HolidayPage />} />
                <Route path="personal-info" element={<PersonalInfo />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="company-policy" element={<PolicyPage />} />
                <Route path="goalSeetingForm" element={<GoalSettingForm />} />
                <Route path="team-leave-management" element={<TeamLeaves />} />
                {/* <Route path="HRLeaveManagement" element={<HRLeaveManagement />} /> */}
                <Route path="employee-management" element={<EmployeeData />} />
                {/* <Route path="allLeaveRecords" element={<AllLeavesRecords />} /> */}
                {/* <Route path="updateLeaveApprover" element={<UpdateLeaveApprover />} /> */}
                {/* <Route path="Accessibility" element={<Accessibility />} /> */}
                {/* <Route path="MasterHR" element={<MasterHR />} /> */}
                <Route path="salarySlipUpload" element={<SalarySlipUpload />} />
                <Route path="monthly-report" element={<MonthlyReport />} />
                {/* <Route path="SkillTracking" element={<SkillTracking />} /> */}
                <Route path="document-repo" element={<AllDocRecords />} />
                <Route path="ScoreCards" element={<AllDocRecords />} />
                <Route path="EmployeesSkillEvaluationList" element={<EmployeesSkillEvaluationList />} />
                <Route path="goalSetting" element={<GoalSettingPage />} />
                <Route path="RelievingLetter" element={<RelievingLetter />} />
                {/* <Route path="PCsPage" element={<PCsPage />} /> */}
                {/* <Route path="Assignments" element={<AssignmentsPage />} /> */}
                {/* <Route path="Maintenance" element={<MaintenancePage />} /> */}
                {/* <Route path="system-management" element={<SystemManagementPage />} /> */}
                <Route path="projects" element={<Projects />} />
                <Route path="hardware-management" element={<HardwareManagement />} />
                <Route path="*" element={<span>404 Not Found</span>} />
            </Route>
        </Routes>
    );
}

export default AppRoutes;
