import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatsCard from '../components/dashboard/StatsCard';
import CallActivityChart from '../components/dashboard/CallActivityChart';
import CampaignPerformanceChart from '../components/dashboard/CampaignPerformanceChart';
import DataTable from '../components/common/DataTable';
import { statisticsService } from '../services/statisticsService';

/**
 * Dashboard page component
 * 
 * Main dashboard with summary statistics, charts, and recent calls
 */
const Dashboard = () => {
  // State for dashboard data
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [callActivity, setCallActivity] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);

  // Load dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all dashboard data in parallel
        const [statsData, activityData, campaignsData, callsData] = await Promise.all([
          statisticsService.getDashboardStats(),
          statisticsService.getCallActivity(),
          statisticsService.getCampaignPerformance(),
          statisticsService.getRecentCalls(5) // Get 5 most recent calls
        ]);
        
        setStats(statsData);
        setCallActivity(activityData);
        setCampaigns(campaignsData);
        setRecentCalls(callsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Column definitions for the recent calls table
  const callColumns = [
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10">
            <img 
              className="w-10 h-10 rounded-full" 
              src={row.contact.profileImage || `https://randomuser.me/api/portraits/men/${row.id % 100}.jpg`} 
              alt={row.contact.name} 
            />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {row.contact.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.contact.phone}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'agent',
      header: 'Agent',
      render: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">{row.agent}</div>
      )
    },
    {
      key: 'campaign',
      header: 'Campaign',
      render: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">{row.campaign}</div>
      )
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">{row.duration}</div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        // Status badge colors
        const statusColors = {
          completed: 'green',
          failed: 'red',
          'in progress': 'yellow',
          scheduled: 'blue'
        };
        
        const color = statusColors[row.status.toLowerCase()] || 'gray';
        
        return (
          <span className={`inline-flex px-2 text-xs font-semibold leading-5 text-${color}-800 bg-${color}-100 rounded-full dark:bg-${color}-900 dark:text-${color}-200`}>
            {row.status}
          </span>
        );
      }
    },
    {
      key: 'time',
      header: 'Time',
      render: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">{row.time}</div>
      )
    }
  ];

  // Quick action items
  const quickActions = [
    {
      title: 'New Campaign',
      description: 'Create',
      icon: 'fa-plus',
      color: 'primary',
      link: '/campaigns/new'
    },
    {
      title: 'Add Contact',
      description: 'Import',
      icon: 'fa-user-plus',
      color: 'green',
      link: '/contacts/import'
    },
    {
      title: 'New Agent',
      description: 'Configure',
      icon: 'fa-robot',
      color: 'blue',
      link: '/agents/new'
    },
    {
      title: 'Start Calling',
      description: 'Now',
      icon: 'fa-phone-volume',
      color: 'purple',
      link: '/calls/start'
    }
  ];

  return (
    <Layout pageTitle="Dashboard Overview">
      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Calls"
          value={stats.todayCalls || 0}
          icon="fa-phone"
          iconColor="primary"
          changeValue={stats.callsChange || "+0%"}
          changeLabel="from yesterday"
          changeType={stats.callsChange?.startsWith('+') ? 'positive' : 'negative'}
          animationDelay="0s"
        />
        
        <StatsCard
          title="Active Agents"
          value={stats.activeAgents || 0}
          icon="fa-robot"
          iconColor="green"
          changeValue={stats.agentsChange > 0 ? `+${stats.agentsChange}` : stats.agentsChange}
          changeLabel="this week"
          changeType={stats.agentsChange > 0 ? 'positive' : 'neutral'}
          animationDelay="0.1s"
        />
        
        <StatsCard
          title="Success Rate"
          value={`${stats.successRate || 0}%`}
          icon="fa-chart-line"
          iconColor="blue"
          changeValue={stats.successRateChange || "+0%"}
          changeLabel="from last week"
          changeType={stats.successRateChange?.startsWith('+') ? 'positive' : 'negative'}
          animationDelay="0.2s"
        />
        
        <StatsCard
          title="Avg. Duration"
          value={stats.avgDuration || "0:00"}
          icon="fa-clock"
          iconColor="purple"
          changeValue={stats.durationChange || "0:00"}
          changeLabel="from last week"
          changeType={stats.durationChange?.startsWith('-') ? 'negative' : 'positive'}
          animationDelay="0.3s"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <CallActivityChart data={callActivity} loading={loading} />
        <CampaignPerformanceChart campaigns={campaigns} loading={loading} />
      </div>
      
      {/* Recent Calls */}
      <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800 fade-in mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Calls</h2>
          <Link 
            to="/calls" 
            className="px-3 py-1 text-xs font-medium rounded-md bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
          >
            View All
          </Link>
        </div>
        
        <DataTable 
          columns={callColumns}
          data={recentCalls}
          loading={loading}
          onRowClick={(row) => window.location.href = `/calls/${row.id}`}
        />
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action, index) => (
          <Link 
            key={index}
            to={action.link}
            className="flex items-center justify-center p-6 bg-white rounded-lg shadow dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className={`p-3 mr-4 rounded-full bg-${action.color}-100 dark:bg-${action.color}-900`}>
              <i className={`text-${action.color}-600 dark:text-${action.color}-300 fas ${action.icon}`}></i>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{action.title}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default Dashboard;
