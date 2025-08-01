import React, { useState } from 'react';
import { 
  PlayCircleIcon, 
  PauseCircleIcon, 
  StopCircleIcon, 
  CogIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';

/**
 * CampaignControls component - Provides UI controls for campaign scheduler operations
 * Handles starting, pausing, resuming, and stopping campaigns
 */
const CampaignControls = ({ 
  campaignId, 
  initialStatus = 'idle', 
  onStatusChange,
  size = 'default',
  showLabels = false,
  showSettings = true,
  className = '',
  disableTooltips = false,
  orientation = 'horizontal' 
}) => {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  
  // Size classes for icons
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-5 w-5',
    large: 'h-6 w-6'
  };
  
  // Button classes based on size
  const buttonClasses = {
    small: 'p-1',
    default: 'p-1.5',
    large: 'p-2'
  };
  
  // Layout class for orientation
  const layoutClass = orientation === 'vertical' ? 'flex-col' : 'flex-row';
  
  // Helper function to call the campaign scheduler API
  const callCampaignScheduler = async (action, payload = {}) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/scheduler/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to perform campaign action');
      }
      
      // Update local status
      const newStatus = action === 'start' ? 'active' : 
                        action === 'pause' ? 'paused' : 
                        action === 'resume' ? 'active' : 
                        action === 'stop' ? 'completed' : status;
      
      setStatus(newStatus);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
      // Show success message
      toast.success(`Campaign ${action}ed successfully`);
      
      return data;
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      toast.error(error.message || `Failed to ${action} campaign`);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Handler functions for campaign actions
  const handleStart = async () => {
    try {
      await callCampaignScheduler('start');
    } catch (error) {
      // Error is already handled in callCampaignScheduler
    }
  };
  
  const handlePause = async () => {
    try {
      await callCampaignScheduler('pause');
    } catch (error) {
      // Error is already handled in callCampaignScheduler
    }
  };
  
  const handleResume = async () => {
    try {
      await callCampaignScheduler('resume');
    } catch (error) {
      // Error is already handled in callCampaignScheduler
    }
  };
  
  const handleStop = async () => {
    try {
      await callCampaignScheduler('stop');
    } catch (error) {
      // Error is already handled in callCampaignScheduler
    }
  };
  
  // Helper to get status info
  const getStatusInfo = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/scheduler/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get campaign status');
      }
      
      return data;
    } catch (error) {
      console.error('Error getting campaign status:', error);
      toast.error(error.message || 'Failed to get campaign status');
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const refreshStatus = async () => {
    try {
      const data = await getStatusInfo();
      
      // Update local status based on scheduler status
      if (data.result && data.result.status) {
        const newStatus = data.result.isRunning ? 
                          (data.result.isPaused ? 'paused' : 'active') : 
                          'idle';
        
        setStatus(newStatus);
        
        // Notify parent component
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      }
    } catch (error) {
      // Error is already handled in getStatusInfo
    }
  };
  
  // Helper to create a button with tooltip
  const createButton = (icon, label, onClick, disabled = false, tooltipText) => {
    const button = (
      <button
        className={`${buttonClasses[size]} rounded-full text-gray-500 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:text-primary-400`}
        onClick={onClick}
        disabled={disabled || loading}
        title={disableTooltips ? undefined : tooltipText}
      >
        <div className="flex items-center">
          {React.cloneElement(icon, { className: sizeClasses[size] })}
          {showLabels && <span className="ml-1 text-xs">{label}</span>}
        </div>
      </button>
    );
    
    return button;
  };
  
  return (
    <div className={`flex ${layoutClass} items-center space-x-1 ${className}`}>
      {status === 'idle' && createButton(<PlayCircleIcon />, 'Start', handleStart, false, 'Start Campaign')}
      {status === 'active' && createButton(<PauseCircleIcon />, 'Pause', handlePause, false, 'Pause Campaign')}
      {status === 'paused' && createButton(<PlayCircleIcon />, 'Resume', handleResume, false, 'Resume Campaign')}
      {(status === 'active' || status === 'paused') && createButton(<StopCircleIcon />, 'Stop', handleStop, false, 'Stop Campaign')}
      
      {createButton(<ArrowPathIcon className={loading ? 'animate-spin' : ''} />, 'Refresh', refreshStatus, false, 'Refresh Status')}
      
      {showSettings && createButton(<CogIcon />, 'Settings', () => {}, false, 'Campaign Settings')}
    </div>
  );
};

CampaignControls.propTypes = {
  campaignId: PropTypes.string.isRequired,
  initialStatus: PropTypes.oneOf(['idle', 'active', 'paused', 'completed', 'failed']),
  onStatusChange: PropTypes.func,
  size: PropTypes.oneOf(['small', 'default', 'large']),
  showLabels: PropTypes.bool,
  showSettings: PropTypes.bool,
  className: PropTypes.string,
  disableTooltips: PropTypes.bool,
  orientation: PropTypes.oneOf(['horizontal', 'vertical'])
};

export default CampaignControls;
