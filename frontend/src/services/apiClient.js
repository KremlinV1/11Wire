/**
 * Core API Client
 * 
 * This module provides the base HTTP client configuration for all API services.
 * It handles authentication tokens, request/response interceptors, and error handling.
 */

import axios from 'axios';

// Determine the base URL from environment or use a default
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Create an Axios instance with default configuration
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add authentication token to requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle common error cases
 */
apiClient.interceptors.response.use(
  (response) => {
    // Extract the data directly if it follows our API standard format
    if (response.data && response.data.success !== undefined) {
      return response.data;
    }
    // Otherwise return the whole response
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration and auto refresh
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem('refreshToken')
    ) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        if (response.data.success && response.data.token) {
          // Store new tokens
          localStorage.setItem('authToken', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);

          // Update header and retry original request
          apiClient.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // If refresh token fails, redirect to login
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // If we're in a browser environment, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Format error response consistently
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      const { data } = error.response;
      errorMessage = data.message || data.error || `Error ${error.response.status}`;
    } else if (error.request) {
      // Request made but no response received
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      // Something happened in setting up the request
      errorMessage = error.message;
    }

    // Standardize error format
    const formattedError = {
      success: false,
      message: errorMessage,
      originalError: error,
    };

    return Promise.reject(formattedError);
  }
);

export default apiClient;
