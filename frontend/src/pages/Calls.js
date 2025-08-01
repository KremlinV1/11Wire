import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import DataTable from '../components/common/DataTable';
import CallDetailsModal from '../components/calls/CallDetailsModal';
import callService, { callLogs, callRecordings } from '../services/callService';

/**
 * Calls page component
 * 
 * Displays a table of call logs with filtering, sorting, and call details
 */
const Calls = () => {
  // State
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCalls, setTotalCalls] = useState(0);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterDateRange, setFilterDateRange] = useState({ start: '', end: '' });
  const [campaigns, setCampaigns] = useState([]);
  const [showCallDetails, setShowCallDetails] = useState(false);
  
  const itemsPerPage = 10;
  
  // Date range options for quick filter
  const dateRangeOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last7days' },
    { label: 'Last 30 Days', value: 'last30days' },
    { label: 'This Month', value: 'thismonth' },
    { label: 'Last Month', value: 'lastmonth' },
    { label: 'Custom Range', value: 'custom' }
  ];

  // Load calls data
  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        
        // Prepare date filters
        let startDate = filterDateRange.start;
        let endDate = filterDateRange.end;
        
        // Handle predefined date ranges
        if (filterDateRange.preset) {
          const now = new Date();
          switch (filterDateRange.preset) {
            case 'today':
              startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
              endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString().split('T')[0];
              break;
            case 'yesterday':
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              startDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
              endDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString().split('T')[0];
              break;
            case 'last7days':
              const last7Days = new Date(now);
              last7Days.setDate(last7Days.getDate() - 7);
              startDate = new Date(last7Days).toISOString().split('T')[0];
              endDate = new Date(now).toISOString().split('T')[0];
              break;
            case 'last30days':
              const last30Days = new Date(now);
              last30Days.setDate(last30Days.getDate() - 30);
              startDate = new Date(last30Days).toISOString().split('T')[0];
              endDate = new Date(now).toISOString().split('T')[0];
              break;
            case 'thismonth':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
              endDate = new Date(now).toISOString().split('T')[0];
              break;
            case 'lastmonth':
              const lastMonth = new Date(now);
              lastMonth.setMonth(lastMonth.getMonth() - 1);
              startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0];
              endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];
              break;
            default:
              break;
          }
        }
        
        // Fetch calls data
        const response = await callLogs.getCallLogs({
          page: currentPage,
          limit: itemsPerPage,
          search: searchQuery,
          status: filterStatus || undefined,
          campaignId: filterCampaign || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        });
        
        setCalls(response.data || []);
        setTotalCalls(response.total || 0);
        
        // Also fetch campaigns for filter dropdown if not already loaded
        if (campaigns.length === 0) {
          try {
            const campaignsResponse = await apiClient.get('/campaigns');
            setCampaigns(campaignsResponse.data || []);
          } catch (error) {
            console.error('Error fetching campaigns:', error);
            setCampaigns([]);
          }
        }
      } catch (error) {
        console.error('Error fetching calls:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCalls();
  }, [currentPage, searchQuery, filterStatus, filterCampaign, filterDateRange, campaigns.length]);

  // Column definitions for calls table
  const columns = [
    {
      key: 'contact',
      header: 'Contact',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10">
            <img
              className="w-10 h-10 rounded-full"
              src={row.contact?.profileImage || `https://randomuser.me/api/portraits/men/${row.id.charAt(0).charCodeAt(0) % 100}.jpg`}
              alt={row.contact?.name || 'Contact'}
            />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {row.contact?.name || 'Unknown Contact'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.contact?.phone || row.phoneNumber || 'No phone number'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'campaign',
      header: 'Campaign',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {row.campaign?.name || 'No Campaign'}
        </div>
      )
    },
    {
      key: 'agent',
      header: 'Agent',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          {row.agent ? (
            <>
              <span className="inline-block w-2 h-2 mr-2 rounded-full bg-green-500"></span>
              <span className="text-sm text-gray-900 dark:text-white">{row.agent}</span>
            </>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">Not assigned</span>
          )}
        </div>
      )
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      render: (row) => {
        const formatDuration = (seconds) => {
          if (!seconds) return '0:00';
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {formatDuration(row.duration)}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const statusColors = {
          completed: 'green',
          failed: 'red',
          'in-progress': 'yellow',
          scheduled: 'blue',
          missed: 'gray',
          busy: 'orange',
          voicemail: 'purple'
        };
        
        const status = row.status?.toLowerCase() || 'unknown';
        const color = statusColors[status] || 'gray';
        
        return (
          <span className={`inline-flex px-2 text-xs font-semibold leading-5 text-${color}-800 bg-${color}-100 rounded-full dark:bg-${color}-900 dark:text-${color}-200`}>
            {row.status || 'Unknown'}
          </span>
        );
      }
    },
    {
      key: 'time',
      header: 'Date & Time',
      sortable: true,
      render: (row) => {
        const formatDate = (dateString) => {
          if (!dateString) return 'Unknown';
          const date = new Date(dateString);
          return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(date);
        };
        
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {formatDate(row.startTime || row.timestamp || row.createdAt)}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewCallDetails(row.id);
            }}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
            title="View Details"
          >
            <i className="fas fa-eye"></i>
          </button>
          {row.recordingUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayRecording(row.recordingUrl);
              }}
              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
              title="Play Recording"
            >
              <i className="fas fa-play-circle"></i>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadTranscript(row.id);
            }}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
            title="Download Transcript"
            disabled={!row.hasTranscript}
          >
            <i className={`fas fa-file-alt ${!row.hasTranscript ? 'opacity-50' : ''}`}></i>
          </button>
        </div>
      )
    }
  ];

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle filter status change
  const handleStatusFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1); // Reset to first page on new filter
  };

  // Handle filter campaign change
  const handleCampaignFilterChange = (e) => {
    setFilterCampaign(e.target.value);
    setCurrentPage(1); // Reset to first page on new filter
  };

  // Handle date range preset selection
  const handleDateRangePresetChange = (e) => {
    const preset = e.target.value;
    
    if (preset === 'custom') {
      setFilterDateRange({
        ...filterDateRange,
        preset
      });
    } else {
      setFilterDateRange({
        start: '',
        end: '',
        preset
      });
      setCurrentPage(1); // Reset to first page on new filter
    }
  };

  // Handle custom date range change
  const handleDateRangeChange = (field, value) => {
    setFilterDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Only update if both dates are set
    if (field === 'end' && filterDateRange.start && value) {
      setCurrentPage(1); // Reset to first page on new filter
    }
  };

  // Handle view call details
  const handleViewCallDetails = (callId) => {
    setSelectedCallId(callId);
    setShowCallDetails(true);
  };

  // Handle play recording
  const handlePlayRecording = (recordingUrl) => {
    // Create an audio element and play the recording
    const audio = new Audio(recordingUrl);
    audio.play();
  };

  // Handle download transcript
  const handleDownloadTranscript = async (callId) => {
    try {
      const transcript = await callService.getCallTranscript(callId);
      
      // Create blob and download
      const blob = new Blob([transcript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-transcript-${callId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading transcript:', error);
      alert('Failed to download transcript.');
    }
  };

  // Handle close call details modal
  const handleCloseCallDetails = () => {
    setShowCallDetails(false);
    setSelectedCallId(null);
  };

  return (
    <Layout pageTitle="Call Logs">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary-600 focus:border-primary-600 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
              placeholder="Search by contact or ID..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <select
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            value={filterStatus}
            onChange={handleStatusFilterChange}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="in-progress">In Progress</option>
            <option value="scheduled">Scheduled</option>
            <option value="missed">Missed</option>
            <option value="busy">Busy</option>
            <option value="voicemail">Voicemail</option>
          </select>
          
          <select
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            value={filterCampaign}
            onChange={handleCampaignFilterChange}
          >
            <option value="">All Campaigns</option>
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            value={filterDateRange.preset || 'custom'}
            onChange={handleDateRangePresetChange}
          >
            {dateRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {(filterDateRange.preset === 'custom' || !filterDateRange.preset) && (
            <div className="flex gap-2">
              <input
                type="date"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                value={filterDateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                placeholder="Start Date"
              />
              <input
                type="date"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                value={filterDateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                placeholder="End Date"
                min={filterDateRange.start}
              />
            </div>
          )}
        </div>
      </div>

      {/* Calls table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={calls}
          loading={loading}
          pagination={true}
          totalItems={totalCalls}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onRowClick={(call) => handleViewCallDetails(call.id)}
        />
      </div>

      {/* Call details modal */}
      {showCallDetails && selectedCallId && (
        <CallDetailsModal
          callId={selectedCallId}
          onClose={handleCloseCallDetails}
        />
      )}
    </Layout>
  );
};

export default Calls;
