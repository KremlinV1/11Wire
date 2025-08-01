import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import ChartContainer from './ChartContainer';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Call Activity Chart component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - Call activity data
 * @param {boolean} props.loading - Whether data is loading
 */
const CallActivityChart = ({ data, loading = false }) => {
  const [timeRange, setTimeRange] = useState('day'); // 'day', 'week', 'month'
  const [chartData, setChartData] = useState(null);

  // Prepare chart data based on selected time range
  useEffect(() => {
    if (!data) return;

    // Filter data based on selected time range
    let filteredData;
    let labels;

    switch (timeRange) {
      case 'week':
        filteredData = data.weekData || [];
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      case 'month':
        filteredData = data.monthData || [];
        labels = [...Array(30)].map((_, i) => (i + 1).toString());
        break;
      case 'day':
      default:
        filteredData = data.dayData || [];
        labels = [
          '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM',
          '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
          '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
          '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
        ];
    }

    // Create chart data object
    setChartData({
      labels,
      datasets: [
        {
          label: 'Total Calls',
          data: filteredData.map(item => item.totalCalls || 0),
          borderColor: 'rgb(79, 70, 229)', // primary-600
          backgroundColor: 'rgba(79, 70, 229, 0.1)', // primary-600 with transparency
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgb(79, 70, 229)'
        },
        {
          label: 'Successful Calls',
          data: filteredData.map(item => item.successfulCalls || 0),
          borderColor: 'rgb(34, 197, 94)', // green-500
          backgroundColor: 'transparent',
          tension: 0.4,
          fill: false,
          pointBackgroundColor: 'rgb(34, 197, 94)'
        }
      ]
    });
  }, [data, timeRange]);

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
        mode: 'index',
        intersect: false,
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
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  // Action buttons for time range selection
  const actionButtons = (
    <>
      <button 
        className={`px-3 py-1 text-xs font-medium rounded-md ${
          timeRange === 'day'
            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}
        onClick={() => setTimeRange('day')}
      >
        Day
      </button>
      <button 
        className={`px-3 py-1 text-xs font-medium rounded-md ${
          timeRange === 'week'
            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}
        onClick={() => setTimeRange('week')}
      >
        Week
      </button>
      <button 
        className={`px-3 py-1 text-xs font-medium rounded-md ${
          timeRange === 'month'
            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}
        onClick={() => setTimeRange('month')}
      >
        Month
      </button>
    </>
  );

  return (
    <ChartContainer 
      title="Call Activity" 
      actions={actionButtons}
      loading={loading}
    >
      {chartData && (
        <Line data={chartData} options={chartOptions} />
      )}
    </ChartContainer>
  );
};

CallActivityChart.propTypes = {
  data: PropTypes.shape({
    dayData: PropTypes.array,
    weekData: PropTypes.array,
    monthData: PropTypes.array
  }),
  loading: PropTypes.bool
};

export default CallActivityChart;
