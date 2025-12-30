import React, { useState , useEffect  } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { LoginPage } from './pages/login/LoginPage.jsx';
import {LeaveManagementPage} from "./pages/leaveMangament/LeaveMangament.jsx"
// import ProtectedRoute from './components/protectedRoutes/protectedRoutes.jsx';
// import { AuthProvider } from './context/context.jsx';
import { useNavigate } from 'react-router-dom';
// import { PageLayout } from './layout/pageLayout/Pagelayout.jsx';
import { Dashboard } from './pages/dashboard/Dashboard.jsx';
import { PageLayout } from './layout/pageLayout/PageLayout.jsx';
import HolidayPage from './pages/holiday/HolidayPage.jsx';
import { PolicyPage } from './pages/policy/Policypage.jsx';
import { TeamLeaves } from './pages/teamLeaves/TeamLeaves.jsx';
// import {PageLayout} from './layout/pageLayout/PageLayout'
// import DashboardPage from './pages/dashboardPage/DashboardPage.jsx';
// import HolidayPage from './pages/holiday/HolidayPage.jsx';
// import { PolicyPage } from './pages/policyPage/PolicyPage.jsx';
import PersonalInfo from './pages/PersonalInfoPage/PersonalInfoPage.jsx';
import HRLeaveManagement from './pages/hrLevelMangement/HrLeaveManagement.jsx'
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import { GoalSettingForm } from './pages/goalSeetingForm/GoalSettingForm.jsx';
import { getCookie } from './util/CookieSet.jsx';
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
// import { Evaluation } from './pages/SkillEvaluation/Evaluation.jsx';
import { EmployeesSkillEvaluationList } from './pages/EmployeesSkillEvaluationList/EmployeesSkillEvaluationList.jsx';
import { GoalSettingPage } from './pages/GoalSettingPage/GoalSettingPage.jsx';
import {RelievingLetter} from './pages/RelievingLetter/RelievingLetter.jsx'
import PCsPage from './pages/PCsPage/PCsPage.jsx';
import AssignmentsPage from "./pages/AssignmentsPage/AssignmentsPage.jsx";
import MaintenancePage from "./pages/MaintenanceManagementPage/MaintenancePage.jsx";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const[isRole,setIsRole]=useState("")
  const navigate = useNavigate();
  useEffect(() => {
    const storedAuth = getCookie('isAuthenticated');
    const storedRole = getCookie('role');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      setIsRole(storedRole || '');
    }
  }, []);
  return (
    <div className='App'>
    <Routes>
      {/* Swagger Route */}
      <Route path="/swagger" element={() => {
        window.location.href = '/swagger/index.html';
        return null;
      }} />
       
      {/* Public Routes */}
      <Route path="/" element={<LoginPage isRole={isRole} setIsRole={setIsRole} setIsAuthenticated={setIsAuthenticated} isAuthenticated={isAuthenticated} />} />
      <Route path="/login" element={<LoginPage isRole={isRole} setIsRole={setIsRole} setIsAuthenticated={setIsAuthenticated} isAuthenticated={isAuthenticated} />} />
      <Route path="/resetPassword" element={<ResetPassword isRole={isRole} setIsRole={setIsRole} setIsAuthenticated={setIsAuthenticated} isAuthenticated={isAuthenticated} />} />

      {/* Protected Routes */}
      {isAuthenticated && (
        <Route path="/" element={<PageLayout isRole={isRole} />}>
          <Route path="/leave" element={<LeaveManagementPage />} />
          <Route path="/holiday" element={<HolidayPage />} />
          <Route path="/personalInfo" element={<PersonalInfo />} />
          <Route path="/dashboard1" element={<Dashboard />} />
          <Route path="/companyPolicy" element={<PolicyPage />} />
          <Route path="/goalSeetingForm" element={<GoalSettingForm />} />
          <Route path="/teamLeaveManagement" element={<TeamLeaves isRole={isRole} setIsRole={setIsRole} />} />
          <Route path="/HRLeaveManagement" element={<HRLeaveManagement />} />
          <Route path="/EmployeeData" element={<EmployeeData />} />
          <Route path="/allLeaveRecords" element={<AllLeavesRecords />} />
          <Route path="/updateLeaveApprover" element={<UpdateLeaveApprover />} />
          <Route path="/Accessibility" element={<Accessibility />} />
          <Route path="/MasterHR" element={<MasterHR />} />
          <Route path="/salarySlipUpload" element={<SalarySlipUpload />} />
          <Route path="/MonthlyReport" element={<MonthlyReport />} />
          <Route path='/SkillTracking' element={<SkillTracking/>}/>
          <Route path='/AllDocumentRecords' element={<AllDocRecords/>}/>
          <Route path='/ScoreCards' element={<AllDocRecords/>}/>
          {/* <Route path='/Evaluation' element={<Evaluation/>}/> */}
          <Route path='/EmployeesSkillEvaluationList' element={<EmployeesSkillEvaluationList/>}/>
          <Route path='/goalSetting' element={<GoalSettingPage/>}/>
          <Route path='/RelievingLetter' element={<RelievingLetter/>}/>
          <Route path='/PCsPage' element={<PCsPage/>}/>
          <Route path="/Assignments" element={<AssignmentsPage/>} />
          <Route path="/Maintenance" element={<MaintenancePage/>} />      
        </Route>
      )}
    </Routes>
    <ToastContainer />
  </div>
  );
}
 
export default App;