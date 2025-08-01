import React, { useState, useEffect } from 'react';
import CreateCampaignModal from '../components/campaigns/CreateCampaignModal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

/**
 * Campaigns page component for managing outbound call campaigns
 * Connects contacts with voice agents for automated calling
 */
function Campaigns() {
  // State for campaigns list
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('active');
  
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  
  // Fetch campaigns data
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        // In a real app, this would be an API call
        // For now, we'll use mock data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockCampaigns = [
          {
            id: 'camp-001',
            name: 'New Product Launch',
            status: 'active',
            startDate: '2025-06-15T09:00:00',
            endDate: '2025-06-30T18:00:00',
            contactsCount: 250,
            completedCalls: 75,
            successRate: 68,
            voiceAgent: 'Sales Representative Sarah',
            voiceAgentId: 'agent-001',
            createdAt: '2025-06-14T10:30:00',
          },
          {
            id: 'camp-002',
            name: 'Customer Feedback Survey',
            status: 'paused',
            startDate: '2025-06-10T08:00:00',
            endDate: '2025-07-10T17:00:00',
            contactsCount: 500,
            completedCalls: 125,
            successRate: 75,
            voiceAgent: 'Survey Agent Michael',
            voiceAgentId: 'agent-002',
            createdAt: '2025-06-09T14:15:00',
          },
          {
            id: 'camp-003',
            name: 'Appointment Reminder',
            status: 'completed',
            startDate: '2025-06-01T09:00:00',
            endDate: '2025-06-07T17:00:00',
            contactsCount: 150,
            completedCalls: 150,
            successRate: 92,
            voiceAgent: 'Reminder Agent Emily',
            voiceAgentId: 'agent-003',
            createdAt: '2025-05-30T16:45:00',
          },
          {
            id: 'camp-004',
            name: 'Event Registration Follow-up',
            status: 'failed',
            startDate: '2025-06-18T10:00:00',
            endDate: '2025-06-19T15:00:00',
            contactsCount: 75,
            completedCalls: 10,
            successRate: 30,
            voiceAgent: 'Events Agent John',
            voiceAgentId: 'agent-004',
            createdAt: '2025-06-17T13:20:00',
          }
        ];
        
        setCampaigns(mockCampaigns);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCampaigns();
  }, []);
  
  // Filter campaigns based on active tab and search query
  const filteredCampaigns = campaigns.filter(campaign => {
    // Filter by tab
    if (activeTab !== 'all' && campaign.status !== activeTab) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // Toggle campaign selection
  const toggleCampaignSelection = (campaignId) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      } else {
        return [...prev, campaignId];
      }
    });
  };
  
  // Toggle all campaigns selection
  const toggleAllCampaigns = () => {
    if (selectedCampaigns.length === filteredCampaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(filteredCampaigns.map(campaign => campaign.id));
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    let bgColor, textColor, icon;
    
    switch (status) {
      case 'active':
        bgColor = 'bg-green-100 dark:bg-green-800/20';
        textColor = 'text-green-800 dark:text-green-300';
        icon = <CheckCircleIcon className="h-4 w-4 mr-1" />;
        break;
      case 'paused':
        bgColor = 'bg-yellow-100 dark:bg-yellow-800/20';
        textColor = 'text-yellow-800 dark:text-yellow-300';
        icon = <PauseCircleIcon className="h-4 w-4 mr-1" />;
        break;
      case 'completed':
        bgColor = 'bg-blue-100 dark:bg-blue-800/20';
        textColor = 'text-blue-800 dark:text-blue-300';
        icon = <CheckCircleIcon className="h-4 w-4 mr-1" />;
        break;
      case 'failed':
        bgColor = 'bg-red-100 dark:bg-red-800/20';
        textColor = 'text-red-800 dark:text-red-300';
        icon = <XCircleIcon className="h-4 w-4 mr-1" />;
        break;
      default:
        bgColor = 'bg-gray-100 dark:bg-gray-800/20';
        textColor = 'text-gray-800 dark:text-gray-300';
        icon = null;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your outbound calling campaigns
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Campaign
          </button>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['all', 'active', 'paused', 'completed', 'failed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 min-w-0 max-w-lg">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="form-input block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FunnelIcon className="h-4 w-4 mr-1" />
            Filter
          </button>
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => {
              // Refresh logic here
            }}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Campaigns table */}
      <div className="bg-white dark:bg-gray-900 shadow overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-primary-400"
                    checked={filteredCampaigns.length > 0 && selectedCampaigns.length === filteredCampaigns.length}
                    onChange={toggleAllCampaigns}
                  />
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Campaign
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Schedule
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contacts
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Voice Agent
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th scope="col" className="relative px-3 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center">
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Loading campaigns...
                    </div>
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No campaigns found
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr 
                    key={campaign.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selectedCampaigns.includes(campaign.id) ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                    }`}
                  >
                    <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-primary-400"
                        checked={selectedCampaigns.includes(campaign.id)}
                        onChange={() => toggleCampaignSelection(campaign.id)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{campaign.name}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        Created {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                        <span>
                          {new Date(campaign.startDate).toLocaleDateString()} - 
                          {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {campaign.contactsCount}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {campaign.voiceAgent}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              campaign.status === 'failed' ? 'bg-red-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${Math.round((campaign.completedCalls / campaign.contactsCount) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {Math.round((campaign.completedCalls / campaign.contactsCount) * 100)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {campaign.completedCalls} / {campaign.contactsCount} calls • 
                        <span className={`ml-1 ${
                          campaign.successRate >= 70 ? 'text-green-500' : 
                          campaign.successRate >= 50 ? 'text-yellow-500' : 
                          'text-red-500'
                        }`}>
                          {campaign.successRate}% success
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {campaign.status === 'active' ? (
                          <button 
                            className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
                            title="Pause Campaign"
                          >
                            <PauseCircleIcon className="h-5 w-5" />
                          </button>
                        ) : campaign.status === 'paused' ? (
                          <button 
                            className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
                            title="Resume Campaign"
                          >
                            <PlayCircleIcon className="h-5 w-5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateCampaign={(campaign) => {
            // Add the new campaign to the list
            setCampaigns(prev => [campaign, ...prev]);
            
            // Show a success message or notification
            // This would be handled by a toast notification in a real app
            console.log('Campaign created:', campaign);
          }}
        />
      )}
    </div>
  );
}

export default Campaigns;
