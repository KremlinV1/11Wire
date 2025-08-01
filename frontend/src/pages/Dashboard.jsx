import React from 'react';
import {
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Mock data for the dashboard
const stats = [
  {
    id: 1,
    name: 'Total Calls',
    stat: '1,024',
    icon: PhoneIcon,
    change: '12%',
    changeType: 'increase',
  },
  {
    id: 2,
    name: 'Avg. Call Duration',
    stat: '3:45',
    icon: ClockIcon,
    change: '2%',
    changeType: 'decrease',
  },
  {
    id: 3,
    name: 'Active Contacts',
    stat: '12,340',
    icon: UserGroupIcon,
    change: '5%',
    changeType: 'increase',
  },
  {
    id: 4,
    name: 'Cost This Month',
    stat: '$1,523.50',
    icon: BanknotesIcon,
    change: '8%',
    changeType: 'increase',
  },
];

// Recent calls data
const recentCalls = [
  {
    id: 1,
    phone: '+1 (555) 123-4567',
    type: 'outbound',
    duration: '2:34',
    status: 'completed',
    agent: 'Sales Assistant',
    timestamp: '2025-06-24T08:45:30',
  },
  {
    id: 2,
    phone: '+1 (555) 987-6543',
    type: 'inbound',
    duration: '4:12',
    status: 'completed',
    agent: 'Support Agent',
    timestamp: '2025-06-24T09:12:15',
  },
  {
    id: 3,
    phone: '+1 (555) 234-5678',
    type: 'outbound',
    duration: '1:45',
    status: 'no-answer',
    agent: 'Appointment Scheduler',
    timestamp: '2025-06-24T07:30:00',
  },
  {
    id: 4,
    phone: '+1 (555) 345-6789',
    type: 'outbound',
    duration: '3:22',
    status: 'completed',
    agent: 'Sales Assistant',
    timestamp: '2025-06-24T06:50:45',
  },
  {
    id: 5,
    phone: '+1 (555) 456-7890',
    type: 'inbound',
    duration: '0:45',
    status: 'dropped',
    agent: 'Support Agent',
    timestamp: '2025-06-24T06:20:30',
  },
];

function Dashboard() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Data for line chart
  const callVolumeData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Outbound',
        data: [65, 78, 52, 91, 85, 40, 36],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Inbound',
        data: [28, 35, 40, 42, 50, 25, 30],
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.3,
      },
    ],
  };
  
  // Data for call outcome doughnut chart
  const callOutcomeData = {
    labels: ['Completed', 'No Answer', 'Busy', 'Failed', 'Dropped'],
    datasets: [
      {
        label: 'Call Outcomes',
        data: [65, 15, 8, 7, 5],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(107, 114, 128, 0.7)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(107, 114, 128, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Data for call duration bar chart
  const callDurationData = {
    labels: ['0-1 min', '1-2 min', '2-3 min', '3-4 min', '4-5 min', '5+ min'],
    datasets: [
      {
        label: 'Call Duration Distribution',
        data: [25, 35, 45, 20, 15, 10],
        backgroundColor: 'rgba(14, 165, 233, 0.7)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-300">{formattedDate}</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-outline">
            <PhoneIcon className="h-5 w-5 mr-2" />
            New Call
          </button>
          <button className="btn-primary">
            <PhoneArrowUpRightIcon className="h-5 w-5 mr-2" />
            Start Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.id} className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <item.icon className="h-10 w-10 text-primary-600 dark:text-primary-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-300">{item.name}</dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{item.stat}</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className={`flex items-center text-sm ${
                item.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {item.changeType === 'increase' ? (
                  <ArrowUpIcon className="self-center flex-shrink-0 h-5 w-5" aria-hidden="true" />
                ) : (
                  <ArrowDownIcon className="self-center flex-shrink-0 h-5 w-5" aria-hidden="true" />
                )}
                <span className="ml-1">{item.change} from last week</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Line Chart */}
        <div className="card p-5">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Call Volume - Past Week</h3>
          <div className="h-80">
            <Line 
              data={callVolumeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
              }} 
            />
          </div>
        </div>

        {/* Call Outcome Doughnut Chart */}
        <div className="card p-5">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Call Outcomes</h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut 
              data={callOutcomeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }} 
            />
          </div>
        </div>

        {/* Call Duration Bar Chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Call Duration Distribution</h3>
          <div className="h-64">
            <Bar 
              data={callDurationData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                },
              }} 
            />
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="card p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Calls</h3>
          <a href="#" className="text-sm text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300">
            View all calls
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Phone Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Agent
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentCalls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {call.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex items-center">
                      {call.type === 'outbound' ? (
                        <>
                          <PhoneArrowUpRightIcon className="h-4 w-4 text-primary-600 mr-1" />
                          <span>Outbound</span>
                        </>
                      ) : (
                        <>
                          <PhoneArrowDownLeftIcon className="h-4 w-4 text-secondary-600 mr-1" />
                          <span>Inbound</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {call.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {call.status === 'completed' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Completed
                      </span>
                    ) : call.status === 'no-answer' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                        <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                        No Answer
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Dropped
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {call.agent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(call.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="card p-5">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="card p-4 text-center hover:bg-gray-50 transition-colors">
            <PhoneArrowUpRightIcon className="mx-auto h-8 w-8 text-primary-600" />
            <span className="mt-2 block font-medium">New Outbound Call</span>
          </button>
          <button className="card p-4 text-center hover:bg-gray-50 transition-colors">
            <UserGroupIcon className="mx-auto h-8 w-8 text-primary-600" />
            <span className="mt-2 block font-medium">Import Contacts</span>
          </button>
          <button className="card p-4 text-center hover:bg-gray-50 transition-colors">
            <SpeakerWaveIcon className="mx-auto h-8 w-8 text-primary-600" />
            <span className="mt-2 block font-medium">Manage Voice Agents</span>
          </button>
          <button className="card p-4 text-center hover:bg-gray-50 transition-colors">
            <ClockIcon className="mx-auto h-8 w-8 text-primary-600" />
            <span className="mt-2 block font-medium">Schedule Campaign</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
