import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import stylesSidebar from "./Sidebar.module.css";
import personalInfoIcon from "../../assets/sidebarIcons/personalInfo.svg";
import leaveManagmentIcon from '../../assets/sidebarIcons/leave-7.svg';
import holidayListIcon from "../../assets/sidebarIcons/holiday.svg";
import policyIconIcon from "../../assets/sidebarIcons/policy.svg";
import learningSpaceIcon from "../../assets/sidebarIcons/learningSpaceIcon01.png";
import logOutIcon from "../../assets/sidebarIcons/logoutIcon.svg";
import teamLeadIcon from "../../assets/sidebarIcons/teamLead.svg";
import axiosInstance, { getWarningCount } from '../../services/api';
import Cookies from 'js-cookie';
import { useAuth } from '../../context/AuthContext';
import { getAllEmployeeEvaluators } from '../../services/api';
// import skillEvaluationIcon from "../../assets/sidebarIcons/skillEvaluation.svg"; // New icon for Skill 
import goalIcon from "../../assets/sidebarIcons/goal-icon.svg";
import skillEvaluationIcon from "../../assets/sidebarIcons/skills.svg";
import relievingLetterIcon from "../../assets/sidebarIcons/relievingLetterIcon.svg";
import systemIcon from "../../assets/sidebarIcons/skills.svg"; // any icon for System Management


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
          const response = await getWarningCount(employeeId);
          setWarningCount(response.data.warningCount);

          const responsePersonal = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/complete-employee-details/${employeeId}`);
          setCountPersonalInfo(responsePersonal.data.data.Addresses[0].counter);
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
          <img src={personalInfoIcon} className={stylesSidebar.iconsSidebar} alt="Personal Info" />
          <span className={stylesSidebar.info}>Personal Info</span>
        </div>
        <div className={stylesSidebar.divs} onClick={handleLogout}>
          <img src={logOutIcon} className={stylesSidebar.iconsSidebar} alt="Log Out" />
          <span>Log Out</span>
        </div>
      </div>
    );
  }

  // Default: Full Sidebar
  return (
    <div className={stylesSidebar.main}>
      {(isRole === "Employee" || isRole === "Lead" || isRole === "Intern" || isRole === 'Manager' || isRole === "HR") && (
        <>
          <div className={`${stylesSidebar.divs} ${isActive('/') ? stylesSidebar.active : ''}`} onClick={() => navigate('/')}>
            <img src={personalInfoIcon} className={stylesSidebar.iconsSidebar} alt="Dashboard" />
            <span className={stylesSidebar.info}>Dashboard</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/personal-info') ? stylesSidebar.active : ''}`} onClick={() => navigate('/personal-info')}>
            <img src={personalInfoIcon} className={stylesSidebar.iconsSidebar} alt="Personal Info" />
            <span className={stylesSidebar.info}>Personal Info</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/leave') ? stylesSidebar.active : ''}`} onClick={() => navigate('/leave')}>
            <img src={leaveManagmentIcon} className={stylesSidebar.iconsSidebar} alt="Leave Management" />
            <span>Leave Management</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/holiday') ? stylesSidebar.active : ''}`} onClick={() => navigate('/holiday')}>
            <img src={holidayListIcon} className={stylesSidebar.iconsSidebar} alt="Holiday List" />
            <span>Holiday List</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/company-policy') ? stylesSidebar.active : ''}`} onClick={() => navigate('/company-policy')}>
            <img src={policyIconIcon} className={stylesSidebar.iconsSidebar} alt="Company Policy" />
            <span>Company Policy</span>
          </div>
          {/* <div className={`${stylesSidebar.divs} ${isActive('/https://dev-learning-space-v1.vercel.app/') ? stylesSidebar.active : ''}`} onClick={() => window.open('https://dev-learning-space-v1.vercel.app/', '_blank')}>
            <img src={learningSpaceIcon} className={stylesSidebar.iconsSidebar} alt="Learning Space" />
            <span>Learning Space</span>
          </div> */}
        </>
      )}
      {isEvaluator && (
        <div className={`${stylesSidebar.divs} ${isActive('/EmployeesSkillEvaluationList') ? stylesSidebar.active : ''}`} onClick={() => navigate('/EmployeesSkillEvaluationList')}>
          <img src={skillEvaluationIcon} className={stylesSidebar.iconsSidebar} alt="Skill Evaluation" />
          <span>Skill Evaluation</span>
        </div>
      )}

      <div className={`${stylesSidebar.divs} ${isActive('/goalSetting') ? stylesSidebar.active : ''}`} onClick={() => navigate('/goalSetting')}>
        <img src={goalIcon} className={stylesSidebar.iconsSidebar} alt="Goal Setting" />
        <span className={stylesSidebar.info}>Goal Setting</span>
      </div>





      {(isRole === "Lead" || isRole === "Manager" || isRole === "HR") && (
        <div className={`${stylesSidebar.divs} ${isActive('/teamLeaveManagement') ? stylesSidebar.active : ''}`} onClick={() => navigate('/teamLeaveManagement')}>
          <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="Team Leave Management" />
          <span>Team Leave Management</span>
        </div>
      )}



      {(isRole === "HR" || isRole === "Manager") && (
        <>
          <div className={`${stylesSidebar.divs} ${isActive('/HRLeaveManagement') ? stylesSidebar.active : ''}`} onClick={() => navigate('/HRLeaveManagement')}>
            <img src={leaveManagmentIcon} className={stylesSidebar.iconsSidebar} alt="HR Leave Management" />
            <span>HR Leave Management</span>
          </div>
          {/* <div className={`${stylesSidebar.divs} ${isActive('/goalSeetingForm') ? stylesSidebar.active : ''}`} onClick={() => navigate('/goalSeetingForm')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="Goal Setting Form" />
            <span>Goal Setting Form</span>
          </div> */}
          <div className={`${stylesSidebar.divs} ${isActive('/EmployeeData') ? stylesSidebar.active : ''}`} onClick={() => navigate('/EmployeeData')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="Employee Data" />
            <span>Employee Data</span>
          </div>

          {/*<div className={`${stylesSidebar.divs} ${isActive('/RelievingLetter') ? stylesSidebar.active : ''}`} onClick={() => navigate('/RelievingLetter')}>
            <img src={relievingLetterIcon} className={stylesSidebar.iconsSidebar} alt="Relieving Letter" />
            <span className={stylesSidebar.info}>Relieving Letter</span>
          </div>*/}

          <div className={`${stylesSidebar.divs} ${isActive('/allLeaveRecords') ? stylesSidebar.active : ''}`} onClick={() => navigate('/allLeaveRecords')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="All Leaves data" />
            <span>All Leave Records</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/updateLeaveApprover') ? stylesSidebar.active : ''}`} onClick={() => navigate('/updateLeaveApprover')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="Update Leave Approver" />
            <span>Update Leave Approver</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('https://hrms-monthly-report.streamlit.app/') ? stylesSidebar.active : ''}`} onClick={() => window.open('https://hrms-monthly-report.streamlit.app/', '_blank')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="Monthly Attendance" />
            <span>Monthly Attendance Data</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/MonthlyReport') ? stylesSidebar.active : ''}`} onClick={() => navigate('/MonthlyReport')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="MonthlyReport" />
            <span>Monthly Report</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/Accessibility') ? stylesSidebar.active : ''}`} onClick={() => navigate('/Accessibility')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="Accessibility" />
            <span>Accessibility</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/MasterHR') ? stylesSidebar.active : ''}`} onClick={() => navigate('/MasterHR')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="MasterHR" />
            <span>MasterHR</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/SkillTracking') ? stylesSidebar.active : ''}`} onClick={() => navigate('/SkillTracking')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="SkillTracking" />
            <span>Skill Tracking</span>
          </div>
          <div className={`${stylesSidebar.divs} ${isActive('/AllDocumentRecords') ? stylesSidebar.active : ''}`} onClick={() => navigate('/AllDocumentRecords')}>
            <img src={teamLeadIcon} className={stylesSidebar.iconsSidebar} alt="AllDocumentRecords" />
            <span>All Document Records</span>
          </div>
          <div className={stylesSidebar.sidebarContainer}>
            <div className={`${stylesSidebar.divs} ${openSystem ? stylesSidebar.activeParent : ""}`} onClick={() => setOpenSystem(!openSystem)}>
              <img src={systemIcon} className={stylesSidebar.iconsSidebar} alt="System Management" />
              <span className={stylesSidebar.info}>System Management</span>
            </div>

            {openSystem && (
              <div className={stylesSidebar.subMenu}>
                <div className={`${stylesSidebar.subItem} ${isActive("/PCsPage") ? stylesSidebar.active : ""}`} onClick={() => navigate("/PCsPage")}>
                  <span className={stylesSidebar.info}> 💻 PCs Page</span>
                </div>

                <div className={`${stylesSidebar.subItem} ${isActive("/Assignments") ? stylesSidebar.active : ""}`} onClick={() => navigate("/Assignments")} >
                  <span className={stylesSidebar.info}> 🧾 Assignments</span>
                </div>

                <div className={`${stylesSidebar.subItem} ${isActive("/Maintenance") ? stylesSidebar.active : ""}`} onClick={() => navigate("/Maintenance")} >
                  <span className={stylesSidebar.info}>🛠️ Maintenance</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className={stylesSidebar.divs} onClick={handleLogout}>
        <img src={logOutIcon} className={stylesSidebar.iconsSidebar} alt="Log Out" />
        <span>Log Out</span>
      </div>
    </div>
  );
};
