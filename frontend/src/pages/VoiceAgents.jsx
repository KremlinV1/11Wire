import React, { useState } from 'react';
import {
  MagnifyingGlassIcon, 
  PlusIcon,
  SpeakerWaveIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import VoiceAgentsTable from './VoiceAgentsTable';
import VoiceAgentScripts from '../components/VoiceAgentScripts';

// Mock data for voice agents
const initialVoiceAgents = [
  {
    id: 1,
    name: 'Sales Assistant',
    description: 'Outbound sales calls for new products',
    voice: 'Emma',
    status: 'active',
    lastUsed: '2025-06-24T09:30:00',
    scriptCount: 3,
    callCount: 145,
  },
  {
    id: 2,
    name: 'Customer Support',
    description: 'Handle inbound support inquiries',
    voice: 'Michael',
    status: 'active',
    lastUsed: '2025-06-24T08:45:00',
    scriptCount: 5,
    callCount: 289,
  },
  {
    id: 3,
    name: 'Appointment Reminder',
    description: 'Send appointment reminders to clients',
    voice: 'Olivia',
    status: 'inactive',
    lastUsed: '2025-06-22T16:20:00',
    scriptCount: 1,
    callCount: 76,
  },
  {
    id: 4,
    name: 'Collections Agent',
    description: 'Payment reminder and collection calls',
    voice: 'James',
    status: 'active',
    lastUsed: '2025-06-23T13:15:00',
    scriptCount: 2,
    callCount: 52,
  },
  {
    id: 5,
    name: 'Lead Qualification',
    description: 'Initial call to qualify sales leads',
    voice: 'Sophie',
    status: 'paused',
    lastUsed: '2025-06-20T11:05:00',
    scriptCount: 3,
    callCount: 118,
  },
];

// Voice options from ElevenLabs
const voiceOptions = [
  { id: 1, name: 'Emma', gender: 'female', accent: 'American' },
  { id: 2, name: 'Michael', gender: 'male', accent: 'American' },
  { id: 3, name: 'Olivia', gender: 'female', accent: 'British' },
  { id: 4, name: 'James', gender: 'male', accent: 'British' },
  { id: 5, name: 'Sophie', gender: 'female', accent: 'Australian' },
  { id: 6, name: 'Thomas', gender: 'male', accent: 'American' },
  { id: 7, name: 'Ava', gender: 'female', accent: 'American' },
  { id: 8, name: 'William', gender: 'male', accent: 'British' },
];

function VoiceAgents() {
  const [voiceAgents, setVoiceAgents] = useState(initialVoiceAgents);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  
  // Filter agents based on search term and status filter
  const filteredAgents = voiceAgents.filter((agent) => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.voice.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  // Handle selecting an agent to view details
  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setViewMode('detail');
  };
  
  // Handle going back to the list view
  const handleBackToList = () => {
    setSelectedAgent(null);
    setViewMode('list');
  };
  
  // Handle opening the add/edit agent modal
  const handleOpenModal = (agent = null) => {
    setCurrentAgent(agent);
    setIsModalOpen(true);
  };
  
  // Handle closing the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAgent(null);
  };
  
  // Handle confirmation modal for delete
  const handleDeleteConfirm = (agent) => {
    setAgentToDelete(agent);
    setIsConfirmDeleteOpen(true);
  };
  
  // Handle delete agent
  const handleDeleteAgent = () => {
    setVoiceAgents(voiceAgents.filter(agent => agent.id !== agentToDelete.id));
    setIsConfirmDeleteOpen(false);
    setAgentToDelete(null);
  };
  
  // Handle agent status toggle
  const handleToggleAgentStatus = (agentId) => {
    setVoiceAgents(voiceAgents.map(agent => {
      if (agent.id === agentId) {
        const newStatus = agent.status === 'active' ? 'paused' : 'active';
        return { ...agent, status: newStatus };
      }
      return agent;
    }));
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' ? (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Voice Agents</h2>
              <p className="text-gray-500 dark:text-gray-300">Manage your AI voice agents for automated calls</p>
            </div>
            <button 
              className="btn-primary"
              onClick={() => handleOpenModal()}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Agent
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Detail Header */}
          <div className="flex items-center">
            <button 
              className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleBackToList}
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedAgent.name}</h2>
              <p className="text-gray-500 dark:text-gray-300">{selectedAgent.description}</p>
            </div>
          </div>
        </>
      )}
      
      {viewMode === 'list' && (
        /* Search and Filters */
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="form-input pl-10"
                placeholder="Search agents by name, description or voice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              <select
                className="form-input py-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'list' ? (
        /* Voice Agents Table */
        <VoiceAgentsTable 
          filteredAgents={filteredAgents}
          formatDate={formatDate}
          handleOpenModal={handleOpenModal}
          handleDeleteConfirm={handleDeleteConfirm}
          handleToggleAgentStatus={handleToggleAgentStatus}
          handleViewAgent={handleViewAgent}
        />
      ) : (
        /* Agent Detail View */
        <div className="space-y-6">
          {/* Agent Detail Card */}
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Agent Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Voice</h3>
                  <div className="mt-1 flex items-center">
                    <SpeakerWaveIcon className="h-5 w-5 text-primary-500 mr-2" />
                    <p className="text-gray-900 dark:text-white">{selectedAgent.voice}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                  <div className="mt-1">
                    {selectedAgent.status === 'active' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        <CheckIcon className="h-3.5 w-3.5 mr-1" />
                        Active
                      </span>
                    ) : selectedAgent.status === 'paused' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                        <PauseIcon className="h-3.5 w-3.5 mr-1" />
                        Paused
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        <XMarkIcon className="h-3.5 w-3.5 mr-1" />
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Used</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">{formatDate(selectedAgent.lastUsed)}</p>
                </div>
              </div>
              
              {/* Right Column - Stats */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Scripts</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{selectedAgent.scriptCount}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Calls</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{selectedAgent.callCount}</p>
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <button 
                    className="btn-primary-sm"
                    onClick={() => handleToggleAgentStatus(selectedAgent.id)}
                  >
                    {selectedAgent.status === 'active' ? 'Pause Agent' : 'Activate Agent'}
                  </button>
                  <button 
                    className="btn-outline-sm"
                    onClick={() => handleOpenModal(selectedAgent)}
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scripts Section */}
          <VoiceAgentScripts agentId={selectedAgent.id} agentName={selectedAgent.name} />
        </div>
      )}
      
      {/* Add/Edit Agent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {currentAgent ? 'Edit Voice Agent' : 'Create New Voice Agent'}
                </h3>
                <div className="mt-4 space-y-4">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="agent-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      id="agent-name"
                      className="form-input mt-1"
                      placeholder="Enter agent name"
                      defaultValue={currentAgent?.name || ''}
                    />
                  </div>
                  
                  {/* Description Field */}
                  <div>
                    <label htmlFor="agent-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      id="agent-description"
                      rows="3"
                      className="form-input mt-1"
                      placeholder="What does this agent do?"
                      defaultValue={currentAgent?.description || ''}
                    />
                  </div>
                  
                  {/* Voice Selection */}
                  <div>
                    <label htmlFor="agent-voice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Voice
                    </label>
                    <select
                      id="agent-voice"
                      className="form-input mt-1"
                      defaultValue={currentAgent?.voice || ''}
                    >
                      <option value="" disabled>Select a voice</option>
                      {voiceOptions.map(voice => (
                        <option key={voice.id} value={voice.name}>
                          {voice.name} ({voice.gender}, {voice.accent})
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex items-center">
                      <SpeakerWaveIcon className="h-5 w-5 text-primary-500 mr-2" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Click to preview voice</span>
                    </div>
                  </div>
                  
                  {/* Status Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <div className="mt-2 space-x-4">
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="status" 
                          value="active" 
                          defaultChecked={!currentAgent || currentAgent.status === 'active'} 
                          className="form-radio" 
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Active</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="status" 
                          value="paused" 
                          defaultChecked={currentAgent?.status === 'paused'} 
                          className="form-radio" 
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Paused</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="status" 
                          value="inactive" 
                          defaultChecked={currentAgent?.status === 'inactive'} 
                          className="form-radio" 
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Inactive</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="btn-primary sm:ml-3"
                  onClick={handleCloseModal}
                >
                  {currentAgent ? 'Update' : 'Create'}
                </button>
                <button 
                  type="button" 
                  className="btn-outline mt-3 sm:mt-0" 
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <XMarkIcon className="h-6 w-6 text-red-600 dark:text-red-300" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Delete Voice Agent
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete the voice agent "{agentToDelete?.name}"? 
                        This action cannot be undone and all associated scripts and call records will be archived.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteAgent}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsConfirmDeleteOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoiceAgents;
