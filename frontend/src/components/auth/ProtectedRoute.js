import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute Component
 * 
 * Protects routes that require authentication.
 * If the user is not authenticated, they are redirected to the login page.
 * If authenticated, renders the child routes (Outlet)
 */
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  // If authentication is still being checked, show loading
  if (loading) {
    // You could replace this with a loading spinner component
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If authenticated, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
