import React, { useState } from 'react';
import {
  PhoneIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import CallLogsTable from './CallLogsTable';

// Mock data for call logs
const initialCallLogs = [
  {
    id: 1,
    contactName: 'Jane Cooper',
    phoneNumber: '+1 (555) 123-4567',
    direction: 'outbound',
    status: 'completed',
    duration: 142, // seconds
    timestamp: '2025-06-24T09:30:00',
    agent: 'Sales Assistant',
    recording: true,
    transcript: true,
    notes: 'Customer interested in premium plan',
  },
  {
    id: 2,
    contactName: 'Michael Johnson',
    phoneNumber: '+1 (555) 234-5678',
    direction: 'outbound',
    status: 'no-answer',
    duration: 0,
    timestamp: '2025-06-24T08:45:00',
    agent: 'Customer Support',
    recording: false,
    transcript: false,
    notes: 'No answer, scheduled callback',
  },
  {
    id: 3,
    contactName: 'Sarah Williams',
    phoneNumber: '+1 (555) 345-6789',
    direction: 'inbound',
    status: 'completed',
    duration: 305,
    timestamp: '2025-06-23T16:20:00',
    agent: 'Sales Assistant',
    recording: true,
    transcript: true,
    notes: 'Requested product demo',
  },
  {
    id: 4,
    contactName: 'Robert Brown',
    phoneNumber: '+1 (555) 456-7890',
    direction: 'outbound',
    status: 'failed',
    duration: 0,
    timestamp: '2025-06-23T15:10:00',
    agent: 'Collections',
    recording: false,
    transcript: false,
    notes: 'Technical issue with connection',
  },
  {
    id: 5,
    contactName: 'Emily Davis',
    phoneNumber: '+1 (555) 567-8901',
    direction: 'inbound',
    status: 'completed',
    duration: 187,
    timestamp: '2025-06-23T12:15:00',
    agent: 'Customer Support',
    recording: true,
    transcript: true,
    notes: 'Billing inquiry resolved',
  },
  {
    id: 6,
    contactName: 'David Miller',
    phoneNumber: '+1 (555) 678-9012',
    direction: 'outbound',
    status: 'voicemail',
    duration: 28,
    timestamp: '2025-06-23T11:40:00',
    agent: 'Sales Assistant',
    recording: true,
    transcript: false,
    notes: 'Left voicemail about new promotion',
  },
  {
    id: 7,
    contactName: 'Lisa Garcia',
    phoneNumber: '+1 (555) 789-0123',
    direction: 'inbound',
    status: 'completed',
    duration: 210,
    timestamp: '2025-06-22T16:30:00',
    agent: 'Customer Support',
    recording: true,
    transcript: true,
    notes: 'Product return requested',
  },
  {
    id: 8,
    contactName: 'Unknown',
    phoneNumber: '+1 (555) 890-1234',
    direction: 'inbound',
    status: 'missed',
    duration: 0,
    timestamp: '2025-06-22T10:05:00',
    agent: 'Auto Attendant',
    recording: false,
    transcript: false,
    notes: 'Missed call during off-hours',
  },
];

// Format duration from seconds to MM:SS
const formatDuration = (seconds) => {
  if (seconds === 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

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

function CallLogs() {
  const [callLogs, setCallLogs] = useState(initialCallLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    direction: 'all',
    status: 'all',
    agent: 'all',
    dateRange: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCallLogs, setSelectedCallLogs] = useState([]);
  const itemsPerPage = 5;
  
  // Filter call logs based on search term and filters
  const filteredCallLogs = callLogs.filter((log) => {
    const matchesSearch = 
      (log.contactName && log.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.phoneNumber.includes(searchTerm) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDirection = selectedFilters.direction === 'all' || log.direction === selectedFilters.direction;
    const matchesStatus = selectedFilters.status === 'all' || log.status === selectedFilters.status;
    const matchesAgent = selectedFilters.agent === 'all' || log.agent === selectedFilters.agent;
    
    // Date range filtering logic
    let matchesDateRange = true;
    const logDate = new Date(log.timestamp);
    const now = new Date();
    
    if (selectedFilters.dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchesDateRange = logDate >= today;
    } else if (selectedFilters.dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDateRange = logDate >= weekAgo;
    } else if (selectedFilters.dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDateRange = logDate >= monthAgo;
    }
    
    return matchesSearch && matchesDirection && matchesStatus && matchesAgent && matchesDateRange;
  });
  
  // Pagination
  const totalPages = Math.ceil(filteredCallLogs.length / itemsPerPage);
  const paginatedCallLogs = filteredCallLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Handle bulk selection of call logs
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCallLogs(paginatedCallLogs.map(log => log.id));
    } else {
      setSelectedCallLogs([]);
    }
  };
  
  // Handle selection of individual call log
  const handleSelectLog = (logId) => {
    if (selectedCallLogs.includes(logId)) {
      setSelectedCallLogs(selectedCallLogs.filter(id => id !== logId));
    } else {
      setSelectedCallLogs([...selectedCallLogs, logId]);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setSelectedFilters({
      ...selectedFilters,
      [filterType]: value
    });
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Get unique agent names for filter dropdown
  const agentOptions = [...new Set(callLogs.map(log => log.agent))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Call Logs</h2>
          <p className="text-gray-500 dark:text-gray-300">Review and analyze your conversation history</p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="btn-outline"
            disabled={selectedCallLogs.length === 0}
          >
            <ArchiveBoxIcon className="h-5 w-5 mr-2" />
            Archive
          </button>
          <button className="btn-primary">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="form-input pl-10"
              placeholder="Search name, phone or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Direction Filter */}
          <div className="flex items-center space-x-2">
            <PhoneIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            <select
              className="form-input py-1"
              value={selectedFilters.direction}
              onChange={(e) => handleFilterChange('direction', e.target.value)}
            >
              <option value="all">All Calls</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            <select
              className="form-input py-1"
              value={selectedFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="failed">Failed</option>
              <option value="no-answer">No Answer</option>
              <option value="voicemail">Voicemail</option>
            </select>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            <select
              className="form-input py-1"
              value={selectedFilters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
        
        {/* Second row of filters */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Agent Filter */}
          <div className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent:</div>
            <select
              className="form-input py-1"
              value={selectedFilters.agent}
              onChange={(e) => handleFilterChange('agent', e.target.value)}
            >
              <option value="all">All Agents</option>
              {agentOptions.map((agent) => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>
          
          {/* Results count */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredCallLogs.length} results
          </div>
        </div>
      </div>
      
      {/* Call Logs Table */}
      <CallLogsTable 
        paginatedCallLogs={paginatedCallLogs}
        selectedCallLogs={selectedCallLogs}
        handleSelectAll={handleSelectAll}
        handleSelectLog={handleSelectLog}
        formatDate={formatDate}
        formatDuration={formatDuration}
      />
      
      {/* Pagination Controls */}
      {filteredCallLogs.length > 0 && (
        <div className="card px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredCallLogs.length)}
                </span>{' '}
                of <span className="font-medium">{filteredCallLogs.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                {[...Array(totalPages).keys()].map(number => (
                  <button
                    key={number + 1}
                    onClick={() => setCurrentPage(number + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border ${currentPage === number + 1 
                      ? 'bg-primary-50 dark:bg-primary-900 border-primary-500 text-primary-600 dark:text-primary-200' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'} text-sm font-medium`}
                  >
                    {number + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CallLogs;
