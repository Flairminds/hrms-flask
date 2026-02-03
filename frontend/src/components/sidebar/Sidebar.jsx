import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import stylesSidebar from "./Sidebar.module.css";
import {
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  GiftOutlined,
  FileProtectOutlined,
  TeamOutlined,
  AuditOutlined,
  TrophyOutlined,
  StarOutlined,
  ContactsOutlined,
  FolderOpenOutlined,
  UserSwitchOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  UnlockOutlined,
  SettingOutlined,
  LineChartOutlined,
  FileSyncOutlined,
  ToolOutlined,
  FileTextOutlined,
  LogoutOutlined,
  LaptopOutlined,
  ContainerOutlined
} from '@ant-design/icons';
import FMLogo from '../../assets/login/FMLogonew.png';
import axiosInstance, { getWarningCount } from '../../services/api';
import Cookies from 'js-cookie';
import { useAuth } from '../../context/AuthContext';
import { getAllEmployeeEvaluators } from '../../services/api';


export const Sidebar = ({ isRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [activePath, setActivePath] = useState(location.pathname);
  const [warningCount, setWarningCount] = useState(0);
  const [areAllPoliciesAcknowledged, setAreAllPoliciesAcknowledged] = useState(false);
  const [countPersonalInfo, setCountPersonalInfo] = useState(0);
  const [isEvaluator, setIsEvaluator] = useState(false);
  const [openSystem, setOpenSystem] = useState(false);


  useEffect(() => {
    const fetchPolicyStatus = async () => {
      try {
        const employeeId = Cookies.get('employeeId');
        if (!employeeId) return;

        const response = await axios.get(`https://hrms-flask.azurewebsites.net/api/policy-acknowledgment/${employeeId}`);
        const data = response.data;

        const allAcknowledged =
          data.LeavePolicyAcknowledged &&
          data.WorkFromHomePolicyAcknowledged &&
          data.ExitPolicyAndProcessAcknowledged &&
          data.SalaryAdvanceRecoveryPolicyAcknowledged &&
          data.ProbationToConfirmationPolicyAcknowledged &&
          data.SalaryAndAppraisalPolicyAcknowledged;

        setAreAllPoliciesAcknowledged(allAcknowledged);
      } catch (error) {
        console.error('Error fetching policy status:', error);
      }
    };

    const checkEvaluatorStatus = async () => {
      try {
        const employeeId = Cookies.get('employeeId');
        if (!employeeId) return;

        const response = await getAllEmployeeEvaluators();
        const evaluators = response.data;
        const isUserEvaluator = evaluators.some(emp => emp.evaluatorIds.includes(employeeId));
        setIsEvaluator(isUserEvaluator);
      } catch (error) {
        console.error('Error checking evaluator status:', error);
      }
    };

    fetchPolicyStatus();
    checkEvaluatorStatus();
  }, []);

  useEffect(() => {
    const fetchWarningCount = async () => {
      try {
        const employeeId = Cookies.get('employeeId');
        if (employeeId) {
          // const response = await getWarningCount(employeeId);
          // setWarningCount(response.data.warningCount);

          // const responsePersonal = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/complete-employee-details/${employeeId}`);
          // setCountPersonalInfo(responsePersonal.data.data.Addresses[0].counter);
        }
      } catch (error) {
        console.error('Error fetching warning count:', error);
      }
    };

    fetchWarningCount();
  }, [countPersonalInfo]);

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  const handleLogout = () => {
    // Clear all localStorage items
    localStorage.removeItem('loginEmail');
    localStorage.removeItem('loginPassword');

    // Call AuthContext logout which clears cookies and user state
    logout();

    // Navigate to login page
    navigate('/login');
  };

  const isActive = (path) => path === activePath;

  // Show only company policy and logout if policy acknowledgment is pending and warning count is high
  // if (warningCount > 3 && !areAllPoliciesAcknowledged) {
  //   return (
  //     <div className={stylesSidebar.main}>
  //       <div
  //         className={`${stylesSidebar.divs} ${isActive('/companyPolicy') ? stylesSidebar.active : ''}`}
  //         onClick={() => navigate('/companyPolicy')}
  //       >
  //         <img src={policyIconIcon} className={stylesSidebar.iconsSidebar} alt="Company Policy" />
  //         <span>Company Policy</span>
  //       </div>
  //       <div className={stylesSidebar.divs} onClick={handleLogout}>
  //         <img src={logOutIcon} className={stylesSidebar.iconsSidebar} alt="Log Out" />
  //         <span>Log Out</span>
  //       </div>
  //     </div>
  //   );
  // }

  // Show only personalInfo and logout if personal info count is too high
  if (countPersonalInfo > 3) {
    return (
      <div className={stylesSidebar.main}>
        <div
          className={`${stylesSidebar.divs} ${isActive('/personal-info') ? stylesSidebar.active : ''}`}
          onClick={() => navigate('/personal-info')}
        >
          <UserOutlined className={stylesSidebar.iconsSidebar} />
          <span className={stylesSidebar.info}>Personal Info</span>
        </div>
        <div className={stylesSidebar.divs} onClick={handleLogout}>
          <LogoutOutlined className={stylesSidebar.iconsSidebar} />
          <span>Log Out</span>
        </div>
      </div>
    );
  }

  // Default: Full Sidebar
  return (
    <div className={stylesSidebar.main}>
      {/* Flairminds Logo */}
      <div className={stylesSidebar.logoContainer}>
        <img src={FMLogo} alt="Flairminds" className={stylesSidebar.logo} />
      </div>

      {(isRole === "Employee" || isRole === "Lead" || isRole === "Intern" || isRole === 'Manager' || isRole === "HR") && (
        <>
          <div className={`${stylesSidebar.divs} ${isActive('/') ? stylesSidebar.active : ''}`} onClick={() => navigate('/')}>
            <DashboardOutlined className={stylesSidebar.iconsSidebar} />
            <span className={stylesSidebar.info}>Dashboard</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/personal-info') ? stylesSidebar.active : ''}`} onClick={() => navigate('/personal-info')}>
            <UserOutlined className={stylesSidebar.iconsSidebar} />
            <span className={stylesSidebar.info}>Personal Info</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/holiday') ? stylesSidebar.active : ''}`} onClick={() => navigate('/holiday')}>
            <GiftOutlined className={stylesSidebar.iconsSidebar} />
            <span>Holiday List</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/company-policy') ? stylesSidebar.active : ''}`} onClick={() => navigate('/company-policy')}>
            <FileProtectOutlined className={stylesSidebar.iconsSidebar} />
            <span>Company Policy</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/leave') ? stylesSidebar.active : ''}`} onClick={() => navigate('/leave')}>
            <CalendarOutlined className={stylesSidebar.iconsSidebar} />
            <span>Leave Management</span>
          </div>
        </>
      )}
      {isEvaluator && (
        <div className={`${stylesSidebar.divs} ${isActive('/EmployeesSkillEvaluationList') ? stylesSidebar.active : ''}`} onClick={() => navigate('/EmployeesSkillEvaluationList')}>
          <StarOutlined className={stylesSidebar.iconsSidebar} />
          <span>Skill Evaluation</span>
        </div>
      )}

      {(isRole === "Lead" || isRole === "Manager" || isRole === "HR") && (
        <div className={`${stylesSidebar.divs} ${isActive('/team-leave-management') ? stylesSidebar.active : ''}`} onClick={() => navigate('/team-leave-management')}>
          <TeamOutlined className={stylesSidebar.iconsSidebar} />
          <span>Team Leave Management</span>
        </div>
      )}

      <div className={`${stylesSidebar.divs} ${isActive('/goalSetting') ? stylesSidebar.active : ''}`} onClick={() => navigate('/goalSetting')}>
        <TrophyOutlined className={stylesSidebar.iconsSidebar} />
        <span className={stylesSidebar.info}>Goal Setting</span>
      </div>

      {(isRole === "HR" || isRole === "Manager") && (
        <>
          {/* <div className={`${stylesSidebar.divs} ${isActive('/HRLeaveManagement') ? stylesSidebar.active : ''}`} onClick={() => navigate('/HRLeaveManagement')}>
            <AuditOutlined className={stylesSidebar.iconsSidebar} />
            <span>HR Leave Management</span>
          </div> */}
          <div className={`${stylesSidebar.divs} ${isActive('/employee-management') ? stylesSidebar.active : ''}`} onClick={() => navigate('/employee-management')}>
            <ContactsOutlined className={stylesSidebar.iconsSidebar} />
            <span>Employee Management</span>
          </div>
          {/* <div className={`${stylesSidebar.divs} ${isActive('/allLeaveRecords') ? stylesSidebar.active : ''}`} onClick={() => navigate('/allLeaveRecords')}>
            <FolderOpenOutlined className={stylesSidebar.iconsSidebar} />
            <span>All Leave Records</span>
          </div>
          {/* <div className={`${stylesSidebar.divs} ${isActive('/updateLeaveApprover') ? stylesSidebar.active : ''}`} onClick={() => navigate('/updateLeaveApprover')}>
            <UserSwitchOutlined className={stylesSidebar.iconsSidebar} />
            <span>Update Leave Approver</span>
          </div> */}
          <div className={`${stylesSidebar.divs} ${isActive('https://hrms-monthly-report.streamlit.app/') ? stylesSidebar.active : ''}`} onClick={() => window.open('https://hrms-monthly-report.streamlit.app/', '_blank')}>
            <ClockCircleOutlined className={stylesSidebar.iconsSidebar} />
            <span>Monthly Attendance Data</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/MonthlyReport') ? stylesSidebar.active : ''}`} onClick={() => navigate('/MonthlyReport')}>
            <BarChartOutlined className={stylesSidebar.iconsSidebar} />
            <span>Monthly Report</span>
          </div>
          {/* <div className={`${stylesSidebar.divs} ${isActive('/Accessibility') ? stylesSidebar.active : ''}`} onClick={() => navigate('/Accessibility')}>
            <UnlockOutlined className={stylesSidebar.iconsSidebar} />
            <span>Accessibility</span>
          </div> */}
          {/* <div className={`${stylesSidebar.divs} ${isActive('/MasterHR') ? stylesSidebar.active : ''}`} onClick={() => navigate('/MasterHR')}>
            <SettingOutlined className={stylesSidebar.iconsSidebar} />
            <span>MasterHR</span>
          </div> */}
          {/* <div className={`${stylesSidebar.divs} ${isActive('/SkillTracking') ? stylesSidebar.active : ''}`} onClick={() => navigate('/SkillTracking')}>
            <LineChartOutlined className={stylesSidebar.iconsSidebar} />
            <span>Skill Tracking</span>
          </div> */}
          <div className={`${stylesSidebar.divs} ${isActive('/AllDocumentRecords') ? stylesSidebar.active : ''}`} onClick={() => navigate('/AllDocumentRecords')}>
            <FileSyncOutlined className={stylesSidebar.iconsSidebar} />
            <span>All Document Records</span>
          </div>
          <div className={stylesSidebar.sidebarContainer}>
            <div className={`${stylesSidebar.divs} ${openSystem ? stylesSidebar.activeParent : ""}`} onClick={() => setOpenSystem(!openSystem)}>
              <ToolOutlined className={stylesSidebar.iconsSidebar} />
              <span className={stylesSidebar.info}>System Management</span>
            </div>

            {openSystem && (
              <div className={stylesSidebar.subMenu}>
                <div className={`${stylesSidebar.subItem} ${isActive("/PCsPage") ? stylesSidebar.active : ""}`} onClick={() => navigate("/PCsPage")}>
                  <LaptopOutlined className={stylesSidebar.subIcon} />
                  <span className={stylesSidebar.info}>PCs Page</span>
                </div>

                <div className={`${stylesSidebar.subItem} ${isActive("/Assignments") ? stylesSidebar.active : ""}`} onClick={() => navigate("/Assignments")} >
                  <ContainerOutlined className={stylesSidebar.subIcon} />
                  <span className={stylesSidebar.info}>Assignments</span>
                </div>

                <div className={`${stylesSidebar.subItem} ${isActive("/Maintenance") ? stylesSidebar.active : ""}`} onClick={() => navigate("/Maintenance")} >
                  <ToolOutlined className={stylesSidebar.subIcon} />
                  <span className={stylesSidebar.info}>Maintenance</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className={stylesSidebar.divs} onClick={handleLogout}>
        <LogoutOutlined className={stylesSidebar.iconsSidebar} />
        <span>Log Out</span>
      </div>
    </div>
  );
};
