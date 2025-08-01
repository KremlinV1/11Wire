import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { initializeSocket, subscribeToNotifications, unsubscribeFromNotifications, subscribeToSystemEvents, unsubscribeFromSystemEvents } from '../services/realTimeService';

// Create notification context
const NotificationContext = createContext();

/**
 * Notification severity levels
 */
export const NotificationSeverity = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

/**
 * NotificationProvider component
 * 
 * Provides notification functionality across the app:
 * - Shows toast notifications for real-time events
 * - Manages notification history
 * - Connects to WebSocket for real-time notifications
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const NotificationProvider = ({ children }) => {
  // State for notification history
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated } = useAuth();

  /**
   * Add a notification to history
   * 
   * @param {Object} notification - Notification object
   */
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast based on severity
    switch (notification.severity) {
      case NotificationSeverity.SUCCESS:
        toast.success(notification.message);
        break;
      case NotificationSeverity.WARNING:
        toast.warning(notification.message);
        break;
      case NotificationSeverity.ERROR:
        toast.error(notification.message);
        break;
      case NotificationSeverity.INFO:
      default:
        toast.info(notification.message);
    }
  }, []);

  /**
   * Mark notification as read
   * 
   * @param {number} id - Notification ID
   */
  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(notification => {
      if (notification.id === id && !notification.read) {
        setUnreadCount(prevCount => prevCount - 1);
        return { ...notification, read: true };
      }
      return notification;
    }));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setUnreadCount(0);
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  /**
   * Handle incoming WebSocket notification
   * 
   * @param {Object} data - Notification data from WebSocket
   */
  const handleWebSocketNotification = useCallback((data) => {
    addNotification({
      title: data.title || 'New Notification',
      message: data.message,
      severity: data.severity || NotificationSeverity.INFO,
      source: data.source || 'system',
      metadata: data.metadata || {},
    });
  }, [addNotification]);

  /**
   * Handle system alert from WebSocket
   * 
   * @param {Object} data - System alert data
   */
  const handleSystemAlert = useCallback((data) => {
    addNotification({
      title: data.title || 'System Alert',
      message: data.message,
      severity: data.severity || NotificationSeverity.WARNING,
      source: 'system',
      metadata: data.metadata || {},
    });
  }, [addNotification]);

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    // Set up WebSocket connection
    const onConnect = () => {
      console.log('WebSocket connected for notifications');
      
      // Subscribe to notification events
      subscribeToNotifications(handleWebSocketNotification);
      subscribeToSystemEvents(handleSystemAlert);
    };

    const onDisconnect = () => {
      console.log('WebSocket disconnected from notifications');
    };

    const onError = (error) => {
      console.error('WebSocket error:', error);
      // Add error notification
      addNotification({
        title: 'Connection Error',
        message: 'Real-time updates temporarily unavailable',
        severity: NotificationSeverity.ERROR,
        source: 'system',
      });
    };

    // Initialize socket with event handlers
    initializeSocket({}, onConnect, onDisconnect, onError);

    // Clean up on unmount
    return () => {
      unsubscribeFromNotifications();
      unsubscribeFromSystemEvents();
    };
  }, [isAuthenticated, handleWebSocketNotification, handleSystemAlert, addNotification]);

  // Provide notification context value
  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use the notification context
 * 
 * @returns {Object} Notification context value
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
};

export default NotificationContext;
