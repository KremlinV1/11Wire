import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CalendarIcon,
  UserGroupIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import elevenLabsApi from '../../services/elevenLabsApi';

/**
 * Modal component for creating a new outbound calling campaign
 */
function CreateCampaignModal({ isOpen, onClose, onCreateCampaign }) {
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contactsId, setContactsId] = useState('');
  const [voiceAgentId, setVoiceAgentId] = useState('');
  const [scriptId, setScriptId] = useState('');
  const [callsPerDay, setCallsPerDay] = useState(50);
  const [retryCount, setRetryCount] = useState(2);
  const [callHoursStart, setCallHoursStart] = useState('09:00');
  const [callHoursEnd, setCallHoursEnd] = useState('17:00');
  
  // Data states
  const [contacts, setContacts] = useState([]);
  const [voiceAgents, setVoiceAgents] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingScripts, setLoadingScripts] = useState(false);
  
  // Form validation
  const [formErrors, setFormErrors] = useState({});
  
  // Reset form when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchFormData();
    }
  }, [isOpen]);
  
  // Fetch contacts, voice agents, and scripts when modal is opened
  const fetchFormData = async () => {
    fetchContacts();
    fetchVoiceAgents();
  };
  
  // Fetch contacts
  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setContacts([
        { id: 'list-001', name: 'Sales Leads - Q2', count: 250 },
        { id: 'list-002', name: 'Event Attendees', count: 125 },
        { id: 'list-003', name: 'Newsletter Subscribers', count: 500 },
        { id: 'list-004', name: 'Customer Feedback Survey', count: 300 },
      ]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };
  
  // Fetch voice agents
  const fetchVoiceAgents = async () => {
    setLoadingAgents(true);
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 600));
      setVoiceAgents([
        { id: 'agent-001', name: 'Sales Representative Sarah' },
        { id: 'agent-002', name: 'Survey Agent Michael' },
        { id: 'agent-003', name: 'Reminder Agent Emily' },
        { id: 'agent-004', name: 'Events Agent John' },
      ]);
    } catch (error) {
      console.error('Error fetching voice agents:', error);
    } finally {
      setLoadingAgents(false);
    }
  };
  
  // Fetch scripts for selected voice agent
  const fetchScripts = async (agentId) => {
    if (!agentId) return;
    
    setLoadingScripts(true);
    try {
      // Use our elevenLabsApi service
      const agentScripts = await elevenLabsApi.getScriptsForAgent(agentId);
      setScripts(agentScripts);
    } catch (error) {
      console.error('Error fetching scripts:', error);
      setScripts([]);
    } finally {
      setLoadingScripts(false);
    }
  };
  
  // Handle voice agent selection change
  const handleVoiceAgentChange = (e) => {
    const selectedAgentId = e.target.value;
    setVoiceAgentId(selectedAgentId);
    setScriptId(''); // Reset script selection
    
    if (selectedAgentId) {
      fetchScripts(selectedAgentId);
    } else {
      setScripts([]);
    }
  };
  
  // Reset form fields
  const resetForm = () => {
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setContactsId('');
    setVoiceAgentId('');
    setScriptId('');
    setCallsPerDay(50);
    setRetryCount(2);
    setCallHoursStart('09:00');
    setCallHoursEnd('17:00');
    setFormErrors({});
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!name.trim()) errors.name = 'Campaign name is required';
    if (!startDate) errors.startDate = 'Start date is required';
    if (!endDate) errors.endDate = 'End date is required';
    if (new Date(startDate) > new Date(endDate)) errors.dates = 'End date must be after start date';
    if (!contactsId) errors.contactsId = 'Contact list is required';
    if (!voiceAgentId) errors.voiceAgentId = 'Voice agent is required';
    if (!scriptId) errors.scriptId = 'Script is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Create campaign object
    const newCampaign = {
      id: `camp-${Date.now()}`,
      name,
      description,
      status: 'active',
      startDate,
      endDate,
      contactsId,
      voiceAgentId,
      scriptId,
      settings: {
        callsPerDay,
        retryCount,
        callHoursStart,
        callHoursEnd
      },
      createdAt: new Date().toISOString()
    };
    
    // Call parent component's create function
    onCreateCampaign(newCampaign);
    
    // Close modal
    onClose();
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 overflow-y-auto z-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Modal header */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Create New Campaign
              </h3>
              <button
                type="button"
                className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Modal body */}
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                {/* Campaign Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Campaign Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="name"
                      className={`form-input block w-full ${formErrors.name ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''}`}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    {formErrors.name && (
                      <p className="mt-2 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>
                </div>
                
                {/* Campaign Description */}
                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description (Optional)
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      rows="3"
                      className="form-textarea block w-full"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                
                {/* Campaign Date Range */}
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="startDate"
                      className={`form-input block w-full pl-10 ${formErrors.startDate || formErrors.dates ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''}`}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    {formErrors.startDate && (
                      <p className="mt-2 text-sm text-red-600">{formErrors.startDate}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="endDate"
                      className={`form-input block w-full pl-10 ${formErrors.endDate || formErrors.dates ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''}`}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    {formErrors.endDate && (
                      <p className="mt-2 text-sm text-red-600">{formErrors.endDate}</p>
                    )}
                  </div>
                </div>
                
                {formErrors.dates && (
                  <div className="sm:col-span-2">
                    <p className="mt-2 text-sm text-red-600">{formErrors.dates}</p>
                  </div>
                )}
                
                {/* Contact List */}
                <div className="sm:col-span-2">
                  <label htmlFor="contactsId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact List
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserGroupIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="contactsId"
                      className={`form-select block w-full pl-10 ${formErrors.contactsId ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''}`}
                      value={contactsId}
                      onChange={(e) => setContactsId(e.target.value)}
                      disabled={loadingContacts}
                    >
                      <option value="">Select a contact list</option>
                      {contacts.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.count} contacts)
                        </option>
                      ))}
                    </select>
                    {loadingContacts && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
                      </div>
                    )}
                    {formErrors.contactsId && (
                      <p className="mt-2 text-sm text-red-600">{formErrors.contactsId}</p>
                    )}
                  </div>
                </div>
                
                {/* Voice Agent */}
                <div>
                  <label htmlFor="voiceAgentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Voice Agent
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SpeakerWaveIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="voiceAgentId"
                      className={`form-select block w-full pl-10 ${formErrors.voiceAgentId ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''}`}
                      value={voiceAgentId}
                      onChange={handleVoiceAgentChange}
                      disabled={loadingAgents}
                    >
                      <option value="">Select a voice agent</option>
                      {voiceAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    {loadingAgents && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
                      </div>
                    )}
                    {formErrors.voiceAgentId && (
                      <p className="mt-2 text-sm text-red-600">{formErrors.voiceAgentId}</p>
                    )}
                  </div>
                </div>
                
                {/* Script */}
                <div>
                  <label htmlFor="scriptId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Script
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="scriptId"
                      className={`form-select block w-full pl-10 ${formErrors.scriptId ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''}`}
                      value={scriptId}
                      onChange={(e) => setScriptId(e.target.value)}
                      disabled={loadingScripts || !voiceAgentId}
                    >
                      <option value="">Select a script</option>
                      {scripts.map((script) => (
                        <option key={script.id} value={script.id}>
                          {script.name}
                        </option>
                      ))}
                    </select>
                    {loadingScripts && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
                      </div>
                    )}
                    {formErrors.scriptId && (
                      <p className="mt-2 text-sm text-red-600">{formErrors.scriptId}</p>
                    )}
                  </div>
                </div>
                
                {/* Campaign Settings */}
                <div className="pt-4 sm:col-span-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Campaign Settings</h4>
                </div>
                
                {/* Calls Per Day */}
                <div>
                  <label htmlFor="callsPerDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Calls Per Day
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      id="callsPerDay"
                      className="form-input block w-full"
                      min="1"
                      max="1000"
                      value={callsPerDay}
                      onChange={(e) => setCallsPerDay(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                
                {/* Retry Count */}
                <div>
                  <label htmlFor="retryCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Retry Count
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      id="retryCount"
                      className="form-input block w-full"
                      min="0"
                      max="5"
                      value={retryCount}
                      onChange={(e) => setRetryCount(parseInt(e.target.value) || 0)}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Number of times to retry if call fails or no answer
                    </p>
                  </div>
                </div>
                
                {/* Call Hours */}
                <div>
                  <label htmlFor="callHoursStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Call Hours Start
                  </label>
                  <div className="mt-1">
                    <input
                      type="time"
                      id="callHoursStart"
                      className="form-input block w-full"
                      value={callHoursStart}
                      onChange={(e) => setCallHoursStart(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="callHoursEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Call Hours End
                  </label>
                  <div className="mt-1">
                    <input
                      type="time"
                      id="callHoursEnd"
                      className="form-input block w-full"
                      value={callHoursEnd}
                      onChange={(e) => setCallHoursEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="btn-primary sm:ml-3"
              >
                Create Campaign
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateCampaignModal;
