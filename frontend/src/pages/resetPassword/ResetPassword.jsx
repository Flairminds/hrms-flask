import React, { useState } from 'react'
import styles from './ResetPassword.module.css';
import FMLogonew from '../../assets/login/FMLogonew.png';
import { Button } from 'antd';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { resetPassword, sendOTP } from '../../services/api'; 
import axios from 'axios';

export const ResetPassword = () => {

    const [resetFormData, setResetFormData] = useState({
        email:"",
        otp:"",   
        password:'',
        retype_password:'',
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [otpSent, setOtpSent] = useState(false); 
    const [isOtpValid, setIsOtpValid] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    const handleSendOTP = async () => {
        const username = resetFormData.email?.trim();

        if (!username) {
            setErrors(prev => ({ ...prev, email: "Email should not be empty" }));
            return;
        }
        try {
            const res = await sendOTP(username);
            if (res?.status === 200) {
                toast.success("OTP sent to your email");
                setOtpSent(true);
            } else {
                toast.error(res?.data?.message || "Failed to send OTP");
            }
        } catch (e) {
            console.error("Error sending OTP:", e);
            toast.error(e.response?.data?.message || "Failed to send OTP");
        }
    };
       // Verify OTP API
    const verifyOTP = async (username, otp) => {
        try {
            const res = await axios.post(
                'https://hrms.flairminds.com/api/Account/VerifyOtp',
                { username, otp },
                { headers: { 'Content-Type': 'application/json' } }
            );
            return res;
        } catch (error) {
            throw error;
        }
    };
    const handleSubmit = async () => {
        const newErrors = {};
        if (!resetFormData.email) newErrors.email = "Email should not be empty";
        if (!resetFormData.otp) newErrors.otp = "OTP should not be empty";
        if (!resetFormData.password) newErrors.password = "Password should not be empty";
        if (resetFormData.password !== resetFormData.retype_password) newErrors.retype_password = "Passwords do not match";
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        try{
            const res = await resetPassword(
                resetFormData.email,
                resetFormData.otp,
                resetFormData.password
            );
            if(res.status == 200){
                setResetFormData({
                    email:"",
                    otp:"",
                    password:'',
                    retype_password:'',
                });
                toast.success("Password Changed Successfully");
                setTimeout(() => navigate("/"), 1000);
            }
        } catch (e) {
            toast.error(e.response?.data || "Failed to reset password");
            console.log(e);
        }
    };
    const handleChange = (field, value) => {
        setResetFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        setErrors(prev => ({ ...prev, [field]: "" }));
    };
    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.resetPassForm}>
                    <div className={styles.logoContainer}>
                        <img src={FMLogonew} alt="LogoImage" className={styles.fmLogo} />
                    </div>
                    <div className={styles.ResetForm}>
                        <div className={styles.inputContainer}>
                            <input
                                type="text"
                                id="email"
                                value={resetFormData.email}
                                placeholder="Username"
                                onChange={(e) => handleChange("email", e.target.value)}
                                onBlur={() => handleBlur("email")}
                                className={styles.input}
                            />
                            {touched.email && errors.email && (
                                <div className={styles.passMatchError}>{errors.email}</div>
                            )}
                        </div>
                        <div className={styles.otpLink}>
                            <span onClick={handleSendOTP}className={styles.linkText}>
                                {otpSent ? "Resend OTP" : "Send OTP"}
                            </span>
                            <br /><br />
                        </div>
                        <div className={styles.inputContainer}>
                            <input
                                type="text"
                                id="otp"
                                maxLength={6}
                                value={resetFormData.otp}
                                placeholder="Enter OTP"
                                onChange={async (e) => {
                                    const value = e.target.value;
                                     // Allow only digits
                                    if (!/^\d*$/.test(value)) return;
                                    handleChange("otp", value);
                                    // Automatically verify OTP when 6 digits entered
                                    if (value.length === 6) {
                                        try {
                                            const res = await verifyOTP(resetFormData.email, value);
                                            if (res.status === 200) {
                                                toast.success("OTP verified successfully");
                                                setIsOtpValid(true);
                                            } else {
                                                toast.error(res.data?.message || "Invalid OTP");
                                                setIsOtpValid(false);
                                            }
                                        } catch (err) {
                                            toast.error(err.response?.data?.message || "Invalid OTP");
                                            setIsOtpValid(false);
                                        }
                                    } else {
                                        setIsOtpValid(false);
                                    }
                                }}
                                onBlur={() => handleBlur("otp")}
                                className={styles.input}
                            />
                            {touched.otp && errors.otp && (
                                <div className={styles.passMatchError}>{errors.otp}</div>
                            )}
                        </div>

                        <div className={styles.inputContainer}>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={resetFormData.password}
                                placeholder="New password"
                                onChange={(e) => handleChange("password", e.target.value)}
                                onBlur={() => handleBlur("password")}
                                className={styles.input}
                                disabled={!isOtpValid}
                            />
                            {touched.password && errors.password && (
                                <div className={styles.passMatchError}>{errors.password}</div>
                            )}
                        </div>

                        <div className={styles.inputContainer}>
                            <input
                              type={showPassword ? "text" : "password"}
                                id="retype_password"
                                value={resetFormData.retype_password}
                                placeholder="Confirm password"
                                onChange={(e) => handleChange("retype_password", e.target.value)}
                                onBlur={() => handleBlur("retype_password")}
                                className={styles.input}
                                disabled={!isOtpValid}
                            />
                            {touched.retype_password && errors.retype_password && (
                                <div className={styles.passMatchError}>{errors.retype_password}</div>
                            )}
                        </div>
                             <div className={styles.inputContainer}>
                            <input
                                type="checkbox"
                                id="showPassword"
                                checked={showPassword}
                                onChange={() => setShowPassword(!showPassword)}
                                disabled={!isOtpValid} // optional: enable only after OTP verified
                            />{" "}
                            Show Password
                        </div>   
                        <Button type="primary" onClick={handleSubmit} className={styles.resetButton}>
                            Reset Password
                        </Button>

                    </div>
                    
                </div>
            </div>
            <ToastContainer />
        </>
    );
}