import React from 'react';
import PropTypes from 'prop-types';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import ChartContainer from './ChartContainer';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Campaign Performance Chart component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.campaigns - Campaign data
 * @param {boolean} props.loading - Whether data is loading
 */
const CampaignPerformanceChart = ({ campaigns = [], loading = false }) => {
  // Prepare chart data
  const chartData = {
    labels: campaigns.map(campaign => campaign.name),
    datasets: [
      {
        label: 'Success Rate (%)',
        data: campaigns.map(campaign => campaign.successRate || 0),
        backgroundColor: 'rgba(79, 70, 229, 0.6)', // primary-600 with transparency
        borderColor: 'rgb(79, 70, 229)', // primary-600
        borderWidth: 1,
      },
      {
        label: 'Call Volume',
        data: campaigns.map(campaign => campaign.callVolume || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.6)', // blue-500 with transparency
        borderColor: 'rgb(59, 130, 246)', // blue-500
        borderWidth: 1,
      }
    ]
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: document.documentElement.classList.contains('dark') 
            ? 'rgba(255, 255, 255, 0.8)'
            : 'rgba(0, 0, 0, 0.8)'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.label === 'Success Rate (%)') {
                label += context.parsed.y.toFixed(1) + '%';
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: document.documentElement.classList.contains('dark')
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark')
            ? 'rgba(255, 255, 255, 0.8)'
            : 'rgba(0, 0, 0, 0.8)'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: document.documentElement.classList.contains('dark')
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: document.documentElement.classList.contains('dark')
            ? 'rgba(255, 255, 255, 0.8)'
            : 'rgba(0, 0, 0, 0.8)'
        }
      }
    }
  };

  // View all button for the chart header
  const actionButton = (
    <button 
      className="px-3 py-1 text-xs font-medium rounded-md bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
      onClick={() => window.location.href = '/campaigns'}
    >
      View All
    </button>
  );

  return (
    <ChartContainer 
      title="Campaign Performance" 
      actions={actionButton}
      loading={loading}
    >
      {campaigns.length > 0 ? (
        <Bar data={chartData} options={chartOptions} />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded dark:bg-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No campaign data available</p>
        </div>
      )}
    </ChartContainer>
  );
};

CampaignPerformanceChart.propTypes = {
  campaigns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string.isRequired,
      successRate: PropTypes.number,
      callVolume: PropTypes.number
    })
  ),
  loading: PropTypes.bool
};

export default CampaignPerformanceChart;
