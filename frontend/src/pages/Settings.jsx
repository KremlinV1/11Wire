import React, { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  ShieldCheckIcon, 
  PhoneIcon, 
  SpeakerWaveIcon,
  CheckCircleIcon,
  XCircleIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import elevenLabsApi from '../services/elevenLabsApi';

/**
 * Settings page component for managing API keys, integration settings,
 * and system preferences for the 11Wire application
 */
function Settings() {
  // API keys state
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [signalWireKey, setSignalWireKey] = useState('');
  const [signalWireProject, setSignalWireProject] = useState('');
  const [signalWireSpace, setSignalWireSpace] = useState('');
  
  // Connection status
  const [elevenLabsStatus, setElevenLabsStatus] = useState({ testing: false, connected: false });
  const [signalWireStatus, setSignalWireStatus] = useState({ testing: false, connected: false });
  
  // Settings state
  const [callLogsRetention, setCallLogsRetention] = useState('90');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [defaultVoice, setDefaultVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  
  // Success/error message
  const [saveMessage, setSaveMessage] = useState({ type: '', message: '' });
  
  // Load saved settings on component mount
  useEffect(() => {
    // In a production app, these would ideally be fetched from backend
    // For demo purposes, using localStorage
    const loadSettings = () => {
      const elevenLabsKey = localStorage.getItem('elevenLabsApiKey') || '';
      const signalWireKey = localStorage.getItem('signalWireApiKey') || '';
      const signalWireProject = localStorage.getItem('signalWireProjectId') || '';
      const signalWireSpace = localStorage.getItem('signalWireSpaceUrl') || '';
      const callLogsRetention = localStorage.getItem('callLogsRetention') || '90';
      const timezone = localStorage.getItem('timezone') || 'America/Chicago';
      const defaultVoice = localStorage.getItem('defaultVoice') || '';
      
      setElevenLabsKey(elevenLabsKey);
      setSignalWireKey(signalWireKey);
      setSignalWireProject(signalWireProject);
      setSignalWireSpace(signalWireSpace);
      setCallLogsRetention(callLogsRetention);
      setTimezone(timezone);
      setDefaultVoice(defaultVoice);
      
      // Test connections if keys exist
      if (elevenLabsKey) {
        testElevenLabsConnection();
      }
      
      if (signalWireKey && signalWireProject) {
        testSignalWireConnection();
      }
    };
    
    loadSettings();
  }, []);
  
  // Test ElevenLabs API connection
  const testElevenLabsConnection = async () => {
    setElevenLabsStatus({ testing: true, connected: false });
    try {
      // First save the key to localStorage so the API service can use it
      localStorage.setItem('elevenLabsApiKey', elevenLabsKey);
      
      const success = await elevenLabsApi.testApiConnection();
      
      if (success) {
        setElevenLabsStatus({ testing: false, connected: true });
        // If connected successfully, also load available voices
        try {
          const voices = await elevenLabsApi.getVoices();
          setAvailableVoices(voices || []);
        } catch (error) {
          console.error('Error loading voices:', error);
        }
      } else {
        setElevenLabsStatus({ testing: false, connected: false });
      }
    } catch (error) {
      console.error('Error testing ElevenLabs connection:', error);
      setElevenLabsStatus({ testing: false, connected: false });
    }
  };
  
  // Test SignalWire API connection
  const testSignalWireConnection = async () => {
    setSignalWireStatus({ testing: true, connected: false });
    try {
      // Mock API test for SignalWire - in a real app, would call actual API
      localStorage.setItem('signalWireApiKey', signalWireKey);
      localStorage.setItem('signalWireProjectId', signalWireProject);
      localStorage.setItem('signalWireSpaceUrl', signalWireSpace);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // For demo purposes, consider it successful
      setSignalWireStatus({ testing: false, connected: true });
    } catch (error) {
      console.error('Error testing SignalWire connection:', error);
      setSignalWireStatus({ testing: false, connected: false });
    }
  };
  
  // Save all settings
  const handleSaveSettings = async () => {
    try {
      // Save all settings to localStorage
      // In a production app, these would be saved to a backend
      localStorage.setItem('elevenLabsApiKey', elevenLabsKey);
      localStorage.setItem('signalWireApiKey', signalWireKey);
      localStorage.setItem('signalWireProjectId', signalWireProject);
      localStorage.setItem('signalWireSpaceUrl', signalWireSpace);
      localStorage.setItem('callLogsRetention', callLogsRetention);
      localStorage.setItem('timezone', timezone);
      localStorage.setItem('defaultVoice', defaultVoice);
      
      setSaveMessage({ 
        type: 'success', 
        message: 'Settings saved successfully!' 
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage({ type: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({ 
        type: 'error', 
        message: 'Error saving settings. Please try again.' 
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-gray-500 dark:text-gray-300">Configure your API keys and application preferences</p>
      </div>
      
      {/* Settings Sections */}
      <div className="grid grid-cols-1 gap-6">
        {/* API Integrations Section */}
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">API Integrations</h3>
          
          {/* ElevenLabs API */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <SpeakerWaveIcon className="h-6 w-6 text-primary-500 mr-2" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">ElevenLabs Voice API</h4>
              
              {elevenLabsStatus.connected && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                  <CheckCircleIcon className="h-3.5 w-3.5 mr-1" /> Connected
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label htmlFor="elevenLabsKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  API Key
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="relative flex items-stretch flex-grow">
                    <input
                      type="password"
                      id="elevenLabsKey"
                      className="form-input block w-full rounded-none rounded-l-md"
                      placeholder="Enter your ElevenLabs API key"
                      value={elevenLabsKey}
                      onChange={(e) => setElevenLabsKey(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm font-medium rounded-r-md hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={testElevenLabsConnection}
                    disabled={elevenLabsStatus.testing || !elevenLabsKey}
                  >
                    {elevenLabsStatus.testing ? (
                      <ArrowPathIcon className="animate-spin h-4 w-4 mr-1" />
                    ) : (
                      <span>Test Connection</span>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get your API key from the <a href="https://elevenlabs.io/app/account" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">ElevenLabs dashboard</a>.
                </p>
              </div>
              
              <div>
                <label htmlFor="defaultVoice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default Voice
                </label>
                <select
                  id="defaultVoice"
                  className="form-input mt-1 block w-full"
                  value={defaultVoice}
                  onChange={(e) => setDefaultVoice(e.target.value)}
                  disabled={!elevenLabsStatus.connected || availableVoices.length === 0}
                >
                  <option value="">Select a default voice</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* SignalWire API */}
          <div>
            <div className="flex items-center mb-4">
              <PhoneIcon className="h-6 w-6 text-primary-500 mr-2" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">SignalWire Telephony API</h4>
              
              {signalWireStatus.connected && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                  <CheckCircleIcon className="h-3.5 w-3.5 mr-1" /> Connected
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="signalWireKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  API Key
                </label>
                <input
                  type="password"
                  id="signalWireKey"
                  className="form-input mt-1 block w-full"
                  placeholder="Enter SignalWire API key"
                  value={signalWireKey}
                  onChange={(e) => setSignalWireKey(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="signalWireProject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project ID
                </label>
                <input
                  type="text"
                  id="signalWireProject"
                  className="form-input mt-1 block w-full"
                  placeholder="Enter Project ID"
                  value={signalWireProject}
                  onChange={(e) => setSignalWireProject(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="signalWireSpace" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Space URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="signalWireSpace"
                    className="form-input block w-full rounded-l-md"
                    placeholder="example.signalwire.com"
                    value={signalWireSpace}
                    onChange={(e) => setSignalWireSpace(e.target.value)}
                  />
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm font-medium rounded-r-md hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={testSignalWireConnection}
                    disabled={signalWireStatus.testing || !signalWireKey || !signalWireProject || !signalWireSpace}
                  >
                    {signalWireStatus.testing ? (
                      <ArrowPathIcon className="animate-spin h-4 w-4 mr-1" />
                    ) : (
                      <span>Test Connection</span>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Find your credentials in the <a href="https://dashboard.signalwire.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">SignalWire dashboard</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* General Settings */}
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">General Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Call Logs Retention */}
            <div>
              <label htmlFor="callLogsRetention" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Call Logs Retention (days)
              </label>
              <select
                id="callLogsRetention"
                className="form-input mt-1 block w-full"
                value={callLogsRetention}
                onChange={(e) => setCallLogsRetention(e.target.value)}
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
                <option value="730">2 years</option>
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                How long to keep call logs before archiving
              </p>
            </div>
            
            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Timezone
              </label>
              <select
                id="timezone"
                className="form-input mt-1 block w-full"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="UTC">UTC</option>
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Timezone for reporting and scheduling
              </p>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveSettings}
          >
            <CheckIcon className="h-5 w-5 mr-2" />
            Save Settings
          </button>
        </div>
        
        {/* Status Message */}
        {saveMessage.message && (
          <div className={`mt-4 p-4 rounded-md ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
              : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {saveMessage.type === 'success' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-400 dark:text-green-500" aria-hidden="true" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-400 dark:text-red-500" aria-hidden="true" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{saveMessage.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
