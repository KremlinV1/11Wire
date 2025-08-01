/**
 * Authentication Service
 * 
 * Provides methods for user authentication, registration, and token management.
 * Works with the backend Auth API endpoints.
 */

import apiClient from './apiClient';

/**
 * Login with username/email and password
 * 
 * @param {string} email - User email or username
 * @param {string} password - User password
 * @returns {Promise<Object>} - Login response with tokens and user data
 */
export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    
    // Store auth data in localStorage
    if (response.success && response.token) {
      localStorage.setItem('authToken', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    }
    
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Register a new user
 * 
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Registration response
 */
export const register = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

/**
 * Logout the current user and clear local storage
 */
export const logout = () => {
  // Clear auth data from localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // Optional: Make a call to the backend to invalidate the token
  try {
    return apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Still clear local tokens even if API call fails
    return { success: true, message: 'Logged out locally' };
  }
};

/**
 * Check if the current user is authenticated
 * 
 * @returns {boolean} - True if authenticated
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('authToken');
};

/**
 * Get the current user data
 * 
 * @returns {Object|null} - User data or null if not authenticated
 */
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

/**
 * Get current auth token
 * 
 * @returns {string|null} - Auth token or null if not available
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Refresh authentication token
 * 
 * @returns {Promise<Object>} - Token refresh response
 */
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await apiClient.post('/auth/refresh-token', { refreshToken });
    
    if (response.success && response.token) {
      localStorage.setItem('authToken', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
    }
    
    return response;
  } catch (error) {
    console.error('Token refresh failed:', error);
    logout();
    throw error;
  }
};

/**
 * Verify current token is valid
 * 
 * @returns {Promise<Object>} - Token verification response
 */
export const verifyToken = async () => {
  try {
    return await apiClient.get('/auth/verify');
  } catch (error) {
    console.error('Token verification failed:', error);
    throw error;
  }
};

/**
 * Request password reset
 * 
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Password reset request response
 */
export const requestPasswordReset = async (email) => {
  try {
    return await apiClient.post('/auth/forgot-password', { email });
  } catch (error) {
    console.error('Password reset request failed:', error);
    throw error;
  }
};

/**
 * Reset password with token
 * 
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Password reset response
 */
export const resetPassword = async (token, newPassword) => {
  try {
    return await apiClient.post('/auth/reset-password', { token, newPassword });
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
};

export default {
  login,
  register,
  logout,
  isAuthenticated,
  getCurrentUser,
  getAuthToken,
  refreshToken,
  verifyToken,
  requestPasswordReset,
  resetPassword
};
