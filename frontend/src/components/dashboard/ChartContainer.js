import React from 'react';
import PropTypes from 'prop-types';

/**
 * Chart Container component for dashboard visualizations
 * 
 * Provides consistent container and header styling for various charts
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Chart title
 * @param {React.ReactNode} props.children - Chart content
 * @param {React.ReactNode} props.actions - Optional actions to show in header
 * @param {boolean} props.loading - Whether the chart is loading
 */
const ChartContainer = ({ title, children, actions, loading = false }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800 fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {actions && <div className="flex space-x-2">{actions}</div>}
      </div>
      
      <div className="chart-container">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

ChartContainer.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  actions: PropTypes.node,
  loading: PropTypes.bool
};

export default ChartContainer;
