import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCookie, setCookie, deleteCookie } from '../util/CookieSet';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Fetch current user from accessToken
    const fetchCurrentUser = async () => {
        try {
            const accessToken = getCookie('accessToken');
            if (!accessToken) {
                setLoading(false);
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/account/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.data.status === 'success') {
                const userData = response.data.data;
                setUser(userData);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            // Invalid token, clear it
            deleteCookie('accessToken');
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    // Initialize user session on mount
    useEffect(() => {
        fetchCurrentUser();
    }, []);

    // Login function
    const login = (accessToken, userData) => {
        setCookie('accessToken', accessToken, 7); // 7 days expiry
        setUser(userData);
        setIsAuthenticated(true);
    };

    // Logout function
    const logout = () => {
        deleteCookie('accessToken');
        deleteCookie('employeeId');
        deleteCookie('role');
        deleteCookie('isAuthenticated');
        setUser(null);
        setIsAuthenticated(false);
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        setUser,
        setIsAuthenticated
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
