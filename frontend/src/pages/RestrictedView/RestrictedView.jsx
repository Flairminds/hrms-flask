import React from 'react';
import { Layout, Menu } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './RestrictedView.module.css';

const { Header, Sider, Content } = Layout;

function RestrictedView() {
  const navigate = useNavigate();

  const handleMenuClick = (key) => {
    if (key === 'personal') {
      navigate('/personal-info');
    } else if (key === 'logout') {
      // Handle logout logic here
      localStorage.removeItem('counterLimitReached');
      navigate('/login');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} className={styles.sider}>
        <div className={styles.logo}>HRMS</div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['personal']}
          style={{ height: '100%', borderRight: 0 }}
          onClick={({ key }) => handleMenuClick(key)}
        >
          <Menu.Item key="personal" icon={<UserOutlined />}>
            Personal Info
          </Menu.Item>
          <Menu.Item key="logout" icon={<LogoutOutlined />}>
            Logout
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout className={styles.siteLayout}>
        <Header className={styles.header}>
          <h2>HR Management System</h2>
        </Header>
        <Content className={styles.content}>
          <div className={styles.message}>
            <h3>Access Restricted</h3>
            <p>Please complete your profile information to access all features.</p>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default RestrictedView; 