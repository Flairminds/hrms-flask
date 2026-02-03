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
    const [routePermissions, setRoutePermissions] = useState({});

    // Fetch route permissions from backend
    const fetchRoutePermissions = async () => {
        try {
            const accessToken = getCookie('accessToken');
            if (!accessToken) return;

            const response = await axios.get(`${API_BASE_URL}/auth/route-permissions`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.data.status === 'success') {
                setRoutePermissions(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch route permissions:', error);
        }
    };

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

                // Set cookies for other components that might use them
                setCookie('employeeId', userData.employeeId, 7);
                setCookie('role', userData.roleName, 7);

                // Fetch route permissions after successful authentication
                await fetchRoutePermissions();
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

    // Helper to check if user has access to a route
    const hasRouteAccess = (path) => {
        if (!user || !routePermissions) return false;

        const allowedRoles = routePermissions[path];

        // If route is not configured, allow access (backward compatibility)
        if (!allowedRoles) return true;

        // Check if user's role is in the allowed roles list
        return allowedRoles.includes(user.roleName);
    };

    // Initialize user session on mount
    useEffect(() => {
        fetchCurrentUser();
    }, []);

    // Login function
    const login = (accessToken, userData) => {
        setCookie('accessToken', accessToken, 7); // 7 days expiry
        setCookie('employeeId', userData.employeeId, 7);
        setCookie('role', userData.roleName, 7);
        setUser(userData);
        setIsAuthenticated(true);
        // Fetch permissions after login
        fetchRoutePermissions();
    };

    // Logout function
    const logout = () => {
        deleteCookie('accessToken');
        deleteCookie('employeeId');
        deleteCookie('role');
        deleteCookie('isAuthenticated');
        setUser(null);
        setIsAuthenticated(false);
        setRoutePermissions({});
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        setUser,
        setIsAuthenticated,
        routePermissions,
        hasRouteAccess
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
