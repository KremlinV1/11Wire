import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  PhoneIcon, 
  PhoneXMarkIcon, 
  MicrophoneIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
  UserCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import io from 'socket.io-client';

/**
 * Call Detail View Component
 * 
 * Displays detailed information about a call and provides real-time updates
 * using the call events system via Socket.IO
 */
const CallDetailView = ({ 
  callSid, 
  initialCallData = null,
  onClose,
  showTranscript = true,
  showControls = true,
  showTimeline = true,
  className = ''
}) => {
  // Call data state
  const [callData, setCallData] = useState(initialCallData || {
    status: 'loading',
    direction: '',
    from: '',
    to: '',
    duration: 0,
    startTime: null,
    endTime: null,
    answeredBy: '',
    voiceAgent: '',
    campaign: null
  });
  
  // Transcript and events state
  const [transcript, setTranscript] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(!initialCallData);
  
  // Socket reference
  const socketRef = useRef(null);
  
  // Timer for call duration
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  
  useEffect(() => {
    // Fetch call details if not provided
    if (!initialCallData && callSid) {
      fetchCallDetails();
    }
    
    // Set up Socket.IO connection for real-time updates
    setupSocketConnection();
    
    // Set up timer for active calls
    if (callData.status === 'in-progress') {
      startTimer();
    }
    
    // Cleanup on unmount
    return () => {
      cleanupSocketConnection();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callSid]);
  
  // Fetch call details from API
  const fetchCallDetails = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/calls/${callSid}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch call details');
      }
      
      setCallData(data);
      
      // If call is in progress, start the timer
      if (data.status === 'in-progress') {
        startTimer();
      }
    } catch (error) {
      console.error('Error fetching call details:', error);
      toast.error('Failed to load call details');
    } finally {
      setLoading(false);
    }
  };
  
  // Set up Socket.IO connection
  const setupSocketConnection = () => {
    // Create Socket.IO connection
    socketRef.current = io({
      path: '/socket.io',
    });
    
    // Subscribe to events for this call
    socketRef.current.emit('subscribe', callSid);
    
    // Listen for call events
    socketRef.current.on('call_event', handleCallEvent);
    
    console.log('Socket.IO connection established for call:', callSid);
  };
  
  // Clean up Socket.IO connection
  const cleanupSocketConnection = () => {
    if (socketRef.current) {
      // Unsubscribe from call events
      socketRef.current.emit('unsubscribe', callSid);
      socketRef.current.off('call_event');
      socketRef.current.disconnect();
      socketRef.current = null;
      
      console.log('Socket.IO connection closed for call:', callSid);
    }
  };
  
  // Handle incoming call events
  const handleCallEvent = (event) => {
    if (event.data.callSid !== callSid) return;
    
    console.log('Received call event:', event);
    
    // Add event to timeline
    setEvents(prev => [...prev, {
      ...event,
      timestamp: Date.now()
    }]);
    
    // Handle different event types
    switch (event.type) {
      case 'transcript':
        // Add to transcript
        setTranscript(prev => [...prev, {
          text: event.data.transcript.text,
          speaker: event.data.transcript.speaker,
          timestamp: Date.now()
        }]);
        break;
        
      case 'completed':
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        // Call ended, update status and stop timer
        setCallData(prev => ({
          ...prev,
          status: event.data.status,
          endTime: event.data.timestamp,
          duration: (event.data.timestamp - (prev.startTime || Date.now())) / 1000
        }));
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        break;
        
      case 'in-progress':
        // Call connected, update status
        setCallData(prev => ({
          ...prev,
          status: 'in-progress',
          startTime: event.data.timestamp,
        }));
        
        // Start timer if not already running
        if (!timerRef.current) {
          startTimer();
        }
        break;
        
      default:
        // Update call data with latest info
        setCallData(prev => ({
          ...prev,
          ...event.data
        }));
    }
  };
  
  // Start timer for call duration
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    const startTime = callData.startTime || Date.now();
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const duration = Math.floor((now - startTime) / 1000);
      setElapsed(duration);
    }, 1000);
  };
  
  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle call actions
  const handleEndCall = async () => {
    try {
      const response = await fetch(`/api/calls/${callSid}/end`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to end call');
      }
      
      toast.success('Call ended successfully');
      
      // Update call status
      setCallData(prev => ({
        ...prev,
        status: 'completed',
        endTime: Date.now()
      }));
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Failed to end call');
    }
  };
  
  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'busy':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'no-answer':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };
  
  // Check if the call is active
  const isActiveCall = callData.status === 'in-progress' || callData.status === 'ringing';
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Call Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <PhoneIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
            Call Details
            {callData.status && (
              <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(callData.status)}`}>
                {callData.status}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Call ID: {callSid}</p>
        </div>
        {isActiveCall && (
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
              <ClockIcon className="h-4 w-4 inline mr-1" />
              {formatDuration(elapsed)}
            </span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        )}
      </div>
      
      {/* Call Info */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">From</p>
            <p className="text-base font-medium text-gray-900 dark:text-white flex items-center">
              <UserIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
              {callData.from || 'Unknown'}
            </p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">To</p>
            <p className="text-base font-medium text-gray-900 dark:text-white flex items-center">
              <UserCircleIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
              {callData.to || 'Unknown'}
            </p>
          </div>
          
          {callData.voiceAgent && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Voice Agent</p>
              <p className="text-base font-medium text-gray-900 dark:text-white flex items-center">
                <MicrophoneIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                {callData.voiceAgent}
              </p>
            </div>
          )}
          
          {callData.campaign && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Campaign</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {callData.campaign.name || callData.campaign.id || 'Unknown Campaign'}
              </p>
            </div>
          )}
        </div>
        
        <div>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Direction</p>
            <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
              {callData.direction || 'Unknown'}
            </p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Started At</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {callData.startTime ? new Date(callData.startTime).toLocaleString() : 'Not Started'}
            </p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ended At</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {callData.endTime ? new Date(callData.endTime).toLocaleString() : 'Active Call'}
            </p>
          </div>
          
          {callData.answeredBy && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Answered By</p>
              <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
                {callData.answeredBy.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Call Controls */}
      {showControls && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-center space-x-4">
            {isActiveCall && (
              <button 
                onClick={handleEndCall}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <PhoneXMarkIcon className="h-5 w-5 mr-2" />
                End Call
              </button>
            )}
            
            {!isActiveCall && onClose && (
              <button 
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Transcript Section */}
      {showTranscript && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
            Conversation Transcript
          </h3>
          
          {transcript.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <InformationCircleIcon className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500" />
              <p className="text-gray-500 dark:text-gray-400 mt-2">No transcript available for this call yet.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {transcript.map((entry, index) => (
                <div key={index} className={`flex ${entry.speaker === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3/4 rounded-lg p-3 ${
                    entry.speaker === 'agent' 
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    <p className="text-xs font-medium mb-1">
                      {entry.speaker === 'agent' ? 'AI Voice Agent' : 'Contact'}
                    </p>
                    <p>{entry.text}</p>
                    <p className="text-xs text-right mt-1 opacity-70">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Timeline Section */}
      {showTimeline && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
            Call Timeline
          </h3>
          
          {events.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <InformationCircleIcon className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500" />
              <p className="text-gray-500 dark:text-gray-400 mt-2">No events recorded for this call yet.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-0 bottom-0 left-6 w-px bg-gray-200 dark:bg-gray-700"></div>
              
              <ul className="space-y-6">
                {events.map((event, index) => (
                  <li key={index} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 flex items-center justify-center w-12 h-12">
                      <div className="w-3 h-3 rounded-full bg-primary-500 dark:bg-primary-400 ring-4 ring-white dark:ring-gray-800"></div>
                    </div>
                    
                    {/* Event content */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {event.type}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {event.type === 'transcript' 
                          ? `${event.data.transcript.speaker}: "${event.data.transcript.text}"` 
                          : `Call ${event.type}`
                        }
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

CallDetailView.propTypes = {
  callSid: PropTypes.string.isRequired,
  initialCallData: PropTypes.object,
  onClose: PropTypes.func,
  showTranscript: PropTypes.bool,
  showControls: PropTypes.bool,
  showTimeline: PropTypes.bool,
  className: PropTypes.string
};

export default CallDetailView;
