import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { callService } from '../../services/callService';

/**
 * Call Details Modal
 * 
 * Modal for viewing call details, transcript, and recording playback
 * 
 * @param {Object} props - Component props
 * @param {string} props.callId - ID of the call to display
 * @param {Function} props.onClose - Function to close the modal
 */
const CallDetailsModal = ({ callId, onClose }) => {
  // State
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [transcript, setTranscript] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState(null);
  
  // Tabs
  const tabs = [
    { id: 'details', label: 'Call Details' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'recording', label: 'Recording' }
  ];

  // Load call details
  useEffect(() => {
    const fetchCallDetails = async () => {
      try {
        setLoading(true);
        const callData = await callService.getCallDetails(callId);
        setCall(callData);
        
        // Clean up audio player if call changes
        if (audioPlayer) {
          audioPlayer.pause();
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('Error fetching call details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCallDetails();
    
    // Clean up function
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
        setAudioPlayer(null);
      }
    };
  }, [callId, audioPlayer]);

  // Load transcript when transcript tab is active
  useEffect(() => {
    const fetchTranscript = async () => {
      if (activeTab === 'transcript' && call && !transcript) {
        try {
          setLoadingTranscript(true);
          const transcriptData = await callService.getCallTranscript(callId);
          setTranscript(transcriptData);
        } catch (error) {
          console.error('Error fetching transcript:', error);
          setTranscript('No transcript available for this call.');
        } finally {
          setLoadingTranscript(false);
        }
      }
    };
    
    fetchTranscript();
  }, [activeTab, call, transcript, callId]);

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // Handle play/pause recording
  const handleTogglePlayback = () => {
    if (!call?.recordingUrl) return;
    
    if (audioPlayer) {
      if (isPlaying) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      const audio = new Audio(call.recordingUrl);
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      audio.play();
      setAudioPlayer(audio);
      setIsPlaying(true);
    }
  };

  // Download recording
  const handleDownloadRecording = () => {
    if (!call?.recordingUrl) return;
    
    const a = document.createElement('a');
    a.href = call.recordingUrl;
    a.download = `call-recording-${callId}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download transcript
  const handleDownloadTranscript = () => {
    if (!transcript) return;
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-transcript-${callId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Render tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return renderDetailsTab();
      case 'transcript':
        return renderTranscriptTab();
      case 'recording':
        return renderRecordingTab();
      default:
        return renderDetailsTab();
    }
  };

  // Render details tab content
  const renderDetailsTab = () => {
    if (loading || !call) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Call Information</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Call ID:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{call.id}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Start Time:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(call.startTime || call.timestamp || call.createdAt)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">End Time:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {call.endTime ? formatDate(call.endTime) : 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Duration:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDuration(call.duration)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
              <span className={`text-sm font-medium text-${call.statusColor || 'gray'}-600 dark:text-${call.statusColor || 'gray'}-400`}>
                {call.status || 'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Direction:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {call.direction || 'Outbound'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Recording:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {call.recordingUrl ? 'Available' : 'Not available'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Transcript:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {call.hasTranscript ? 'Available' : 'Not available'}
              </span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Contact Information</h4>
          
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-12 h-12">
              <img
                className="w-12 h-12 rounded-full"
                src={call.contact?.profileImage || `https://randomuser.me/api/portraits/men/${call.id.charAt(0).charCodeAt(0) % 100}.jpg`}
                alt={call.contact?.name || 'Contact'}
              />
            </div>
            <div className="ml-4">
              <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                {call.contact?.name || 'Unknown Contact'}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {call.contact?.email || 'No email'}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Phone Number:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {call.contact?.phone || call.phoneNumber || 'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Company:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {call.contact?.company || 'Not available'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Campaign:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {call.campaign?.name || 'Not assigned'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Agent:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {call.agent || 'Not assigned'}
              </span>
            </div>
          </div>
          
          {call.notes && (
            <>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mt-6 mb-2">Notes</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                {call.notes}
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render transcript tab content
  const renderTranscriptTab = () => {
    if (loadingTranscript) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      );
    }
    
    if (!transcript) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No transcript available for this call.</p>
        </div>
      );
    }
    
    // Format transcript with speaker labels if available
    const formattedTranscript = transcript.split('\n').map((line, index) => {
      // Check if line has speaker label format "[Speaker]: Text"
      const speakerMatch = line.match(/^\[(.*?)\]:(.*)/);
      
      if (speakerMatch) {
        const speaker = speakerMatch[1].trim();
        const text = speakerMatch[2].trim();
        
        return (
          <div key={index} className="mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{speaker}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
              {text}
            </p>
          </div>
        );
      } else if (line.trim()) {
        // Regular text line
        return (
          <p key={index} className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {line}
          </p>
        );
      } else {
        // Empty line
        return <div key={index} className="h-2"></div>;
      }
    });
    
    return (
      <div>
        <div className="flex justify-end mb-4">
          <button
            onClick={handleDownloadTranscript}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-700 dark:hover:bg-primary-800"
          >
            <i className="fas fa-download mr-1.5"></i>
            Download Transcript
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg max-h-96 overflow-y-auto">
          {formattedTranscript}
        </div>
      </div>
    );
  };

  // Render recording tab content
  const renderRecordingTab = () => {
    if (!call) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      );
    }
    
    if (!call.recordingUrl) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No recording available for this call.</p>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-64 h-64 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
          <button
            onClick={handleTogglePlayback}
            className="w-20 h-20 flex items-center justify-center bg-primary-600 hover:bg-primary-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-700 dark:hover:bg-primary-800"
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-white text-3xl`}></i>
          </button>
        </div>
        
        <div className="text-center mb-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            {call.contact?.name || 'Unknown Contact'}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDuration(call.duration)} • {formatDate(call.startTime || call.timestamp || call.createdAt)}
          </p>
        </div>
        
        <button
          onClick={handleDownloadRecording}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-700 dark:hover:bg-primary-800"
        >
          <i className="fas fa-download mr-2"></i>
          Download Recording
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl p-6 mx-4 bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Call Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <ul className="flex flex-wrap -mb-px">
            {tabs.map((tab) => (
              <li key={tab.id} className="mr-2">
                <button
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium border-b-2 rounded-t-lg ${
                    activeTab === tab.id
                      ? 'text-primary-600 border-primary-600 dark:text-primary-500 dark:border-primary-500'
                      : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Tab content */}
        <div className="tab-content">
          {renderTabContent()}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end mt-6 space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

CallDetailsModal.propTypes = {
  callId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired
};

export default CallDetailsModal;
