import React, { useState, useEffect } from 'react';
import styles from './LoginPage.module.css';
import FMLogonew from '../../assets/login/FMLogonew.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { loginUser } from '../../services/api';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loader, setLoader] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handleShowPasswordChange = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    setLoader(true);

    if (!email || !password) {
      toast.error('Please enter both email and password');
      setLoader(false);
      return;
    }

    try {
      const response = await loginUser(email, password);
      const { accessToken, employeeId, roleName, email: userEmail, fullName } = response.data;

      const userData = {
        employeeId,
        roleName,
        email: userEmail,
        fullName
      };

      login(accessToken, userData);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      console.error('There was a problem with the login operation:', error);
      toast.error('Login failed. Please check your credentials and try again.');
    } finally {
      setLoader(false);
    }
  };

  return (
    <div className={styles.container}>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover={true}
        draggable
        pauseOnFocusLoss={false}
        newestOnTop
      />

      <div className={styles.loginCard}>
        <div className={styles.brandingSection}>
          <div className={styles.meshBackground}></div>
          <div className={styles.brandingContent}>
            <div className={styles.logoWrapper}>
              <img src={FMLogonew} alt="Flairminds Logo" className={styles.brandedLogo} />
            </div>
            <div className={styles.brandingText}>
              <p className={styles.subSlogan}>Flair For Technology • Focus For Success</p>
            </div>
          </div>
        </div>

        <div className={styles.verticalSeparator}></div>

        <div className={styles.formSection}>
          <div className={styles.formContent}>
            <div className={styles.welcomeText}>
              {/* <h2>Welcome Back</h2> */}
              {/* <p>Sign in using email and password</p> */}
            </div>

            <form onSubmit={handleSubmit} className={styles.loginForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email</label>
                <div className={styles.inputWrapper}>
                  <UserOutlined className={styles.inputIcon} />
                  <input
                    type="text"
                    id="email"
                    value={email}
                    placeholder="name@company.com"
                    onChange={handleEmailChange}
                    className={styles.inputField}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor="password">Password</label>
                  <span className={styles.forgotLink} onClick={showModal} style={{ cursor: 'pointer' }}>Forgot/Change Password?</span>
                </div>
                <div className={styles.inputWrapper}>
                  <LockOutlined className={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    placeholder="••••••••"
                    onChange={handlePasswordChange}
                    className={styles.inputField}
                    required
                  />
                  <span onClick={handleShowPasswordChange} className={styles.passwordToggle}>
                    {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  </span>
                </div>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                className={styles.loginButton}
                loading={loader}
                block
              >
                Sign In
              </Button>
            </form>

            <div className={styles.footer}>
              <p>© 2026 Flairminds. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
      <Modal title="Forgot/Change Password" open={isModalVisible} onOk={handleOk} onCancel={handleCancel} footer={null}>
        <p>Contact HR to change your password</p>
      </Modal>
    </div>
  );
}
