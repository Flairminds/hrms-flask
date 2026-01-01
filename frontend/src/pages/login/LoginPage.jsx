import React, { useState, useEffect } from 'react';
import styles from './LoginPage.module.css';
import FMLogonew from '../../assets/login/FMLogonew.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { loginUser } from '../../services/api';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loader, setLoader] = useState(false);

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

  const handleRememberMeChange = (event) => {
    setRememberMe(event.target.checked);
  };

  const handleSubmit = async (event) => {
    setLoader(true);
    event.preventDefault();

    if (!email || !password) {
      toast.error('Please enter both email and password');
      setLoader(false);
      return;
    }

    setValidationMessage('');

    try {
      const response = await loginUser(email, password);
      const { accessToken, employeeId, roleName, email: userEmail, fullName } = response.data;

      // Store accessToken in cookie and user data in context
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
      <div className={styles.midContainer}>
        <div className={styles.imageContainer}>
          <div className={styles.headingContainer}>
            <div className={styles.heading}>
              {/* <b>Flairminds</b> */}
              <img src="https://media.giphy.com/media/26xBKuuVuNxp8seTS/giphy.gif" style={{ height: "200px", width: "200px" }} alt="GIF" />
            </div>
            <div className={styles.companySlogan}>
              <p>
                Flair For Technology <br />
                Focus For Success
              </p>
            </div>
          </div>
        </div>
        <div className={styles.formContainer}>
          <div className="logoContainer">
            <img src={FMLogonew} alt="LogoImage" className={styles.logoImage} />
          </div>
          <div className={styles.innerForm}>
            <form onSubmit={handleSubmit}>
              <div className={styles.inputContainer}>
                <div className={styles.login}>Login</div>
                <label htmlFor="email"></label>
                <input
                  type="text"
                  id="email"
                  value={email}
                  placeholder="Username"
                  onChange={handleEmailChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputContainer1}>
                <label htmlFor="password"></label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  placeholder="Password"
                  onChange={handlePasswordChange}
                  className={styles.input}
                />
                <span onClick={handleShowPasswordChange} className={styles.eyeIcon}>
                  {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </span>
              </div>

              <div className={styles.resetPassword}>
                <Link to='/resetPassword'>Reset Password </Link>
              </div>

              <Button type="submit" onClick={handleSubmit} className={styles.submitButton} loading={loader}>
                LOGIN
              </Button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// export default LoginPage;