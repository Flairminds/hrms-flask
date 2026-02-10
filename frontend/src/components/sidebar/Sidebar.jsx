import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import stylesSidebar from "./Sidebar.module.css";
import {
  DashboardOutlined,
  UserOutlined,
  GiftOutlined,
  FileProtectOutlined,
  CalendarOutlined,
  ProjectOutlined,
  StarOutlined,
  TeamOutlined,
  TrophyOutlined,
  ContactsOutlined,
  FileSyncOutlined,
  LaptopOutlined,
  BarChartOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import FMLogo from '../../assets/login/FMLogonew.png';
import Cookies from 'js-cookie';
import { useAuth } from '../../context/AuthContext';
import { getAllEmployeeEvaluators } from '../../services/api';

export const Sidebar = ({ isRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [activePath, setActivePath] = useState(location.pathname);
  const [isEvaluator, setIsEvaluator] = useState(false);

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const checkEvaluatorStatus = async () => {
      try {
        const employeeId = Cookies.get('employeeId');
        if (!employeeId) return;

        const response = await getAllEmployeeEvaluators();
        const evaluators = response.data;
        if (Array.isArray(evaluators)) {
          const isUserEvaluator = evaluators.some(emp => emp.evaluatorIds && emp.evaluatorIds.includes(employeeId));
          setIsEvaluator(isUserEvaluator);
        }
      } catch (error) {
        console.error('Error checking evaluator status:', error);
      }
    };

    checkEvaluatorStatus();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('loginEmail');
    localStorage.removeItem('loginPassword');
    logout();
    navigate('/login');
  };

  const isActive = (path) => path === activePath;

  const menuItems = useMemo(() => [
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: DashboardOutlined,
      roles: ['Employee', 'Lead', 'Intern', 'Manager', 'HR'],
      infoClass: true
    },
    {
      key: 'personal-info',
      label: 'Personal Info',
      path: '/personal-info',
      icon: UserOutlined,
      roles: ['Employee', 'Lead', 'Intern', 'Manager', 'HR'],
      infoClass: true
    },
    {
      key: 'holiday',
      label: 'Holiday List',
      path: '/holiday',
      icon: GiftOutlined,
      roles: ['Employee', 'Lead', 'Intern', 'Manager', 'HR']
    },
    {
      key: 'company-policy',
      label: 'Company Policy',
      path: '/company-policy',
      icon: FileProtectOutlined,
      roles: ['Employee', 'Lead', 'Intern', 'Manager', 'HR']
    },
    {
      key: 'leave',
      label: 'Leave Management',
      path: '/leave',
      icon: CalendarOutlined,
      roles: ['Employee', 'Lead', 'Intern', 'Manager', 'HR']
    },
    {
      key: 'projects',
      label: 'Projects',
      path: '/projects',
      icon: ProjectOutlined,
      roles: ['Employee', 'Lead', 'Intern', 'Manager', 'HR']
    },
    {
      key: 'skill-evaluation',
      label: 'Skill Evaluation',
      path: '/EmployeesSkillEvaluationList',
      icon: StarOutlined,
      show: isEvaluator
    },
    {
      key: 'team-leave-management',
      label: 'Team Leave Management',
      path: '/team-leave-management',
      icon: TeamOutlined,
      roles: ['Lead', 'Manager', 'HR']
    },
    {
      key: 'capability-development',
      label: 'Capability Development',
      path: '/capability-development',
      icon: TrophyOutlined,
      roles: ['All'],
      infoClass: true
    },
    {
      key: 'employee-management',
      label: 'Employee Management',
      path: '/employee-management',
      icon: ContactsOutlined,
      roles: ['HR', 'Manager']
    },
    {
      key: 'documents',
      label: 'Documents',
      path: '/document-repo',
      icon: FileSyncOutlined,
      roles: ['HR', 'Manager']
    },
    {
      key: 'hardware-management',
      label: 'Hardware Management',
      path: '/hardware-management',
      icon: LaptopOutlined,
      roles: ['HR', 'Manager']
    },
    {
      key: 'monthly-report',
      label: 'Monthly Report',
      path: '/monthly-report',
      icon: BarChartOutlined,
      roles: ['HR', 'Manager']
    }
  ], [isEvaluator]);

  const filteredItems = menuItems.filter(item => {
    if (typeof item.show === 'boolean') return item.show;
    if (item.roles && item.roles.includes('All')) return true;
    if (item.roles && isRole) return item.roles.includes(isRole);
    return false;
  });

  return (
    <div className={stylesSidebar.main}>
      <div className={stylesSidebar.logoContainer}>
        <img src={FMLogo} alt="Flairminds" className={stylesSidebar.logo} />
      </div>

      {filteredItems.map(item => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={`${stylesSidebar.divs} ${isActive(item.path) ? stylesSidebar.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon className={stylesSidebar.iconsSidebar} />
            <span className={item.infoClass ? stylesSidebar.info : ''}>{item.label}</span>
          </div>
        );
      })}

      <div className={stylesSidebar.divs} onClick={handleLogout}>
        <LogoutOutlined className={stylesSidebar.iconsSidebar} />
        <span>Log Out</span>
      </div>
    </div>
  );
};
