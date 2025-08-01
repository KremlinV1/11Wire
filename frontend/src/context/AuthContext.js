import React, { createContext, useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import * as authService from '../services/authService';

// Create the authentication context
export const AuthContext = createContext();

/**
 * Authentication Provider Component
 * 
 * Manages authentication state and provides authentication methods
 * to all child components via React Context.
 */
export const AuthProvider = ({ children }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          // Verify token is still valid with backend
          await authService.verifyToken();
          
          // Load user data
          const userData = authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Token validation failed:', err);
          // If token validation fails, logout
          handleLogout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Handle user login
   * 
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Login result
   */
  const handleLogin = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(email, password);
      
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        toast.success('Login successful');
        return { success: true, user: response.user };
      } else {
        setError(response.message || 'Login failed');
        toast.error(response.message || 'Login failed');
        return { success: false, message: response.message };
      }
    } catch (err) {
      const message = err.message || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    setLoading(true);
    
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      toast.info('Logged out successfully');
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update current user data
   * 
   * @param {Object} userData - Updated user data
   */
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  /**
   * Handle password reset request
   * 
   * @param {string} email - User email
   * @returns {Promise<Object>} - Request result
   */
  const handlePasswordResetRequest = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.requestPasswordReset(email);
      
      if (response.success) {
        toast.success('Password reset instructions sent to your email');
        return { success: true };
      } else {
        setError(response.message || 'Failed to request password reset');
        toast.error(response.message || 'Failed to request password reset');
        return { success: false, message: response.message };
      }
    } catch (err) {
      const message = err.message || 'Failed to request password reset';
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle password reset
   * 
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Reset result
   */
  const handlePasswordReset = async (token, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.resetPassword(token, newPassword);
      
      if (response.success) {
        toast.success('Password reset successful. Please login with your new password.');
        return { success: true };
      } else {
        setError(response.message || 'Failed to reset password');
        toast.error(response.message || 'Failed to reset password');
        return { success: false, message: response.message };
      }
    } catch (err) {
      const message = err.message || 'Failed to reset password';
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Context value to be provided
  const contextValue = {
    isAuthenticated,
    user,
    loading,
    error,
    login: handleLogin,
    logout: handleLogout,
    updateUser,
    requestPasswordReset: handlePasswordResetRequest,
    resetPassword: handlePasswordReset
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
