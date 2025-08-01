import React from 'react';
import PropTypes from 'prop-types';

/**
 * Stats Card component for dashboard metrics
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Main value to display
 * @param {string} props.icon - FontAwesome icon class (e.g. 'fa-phone')
 * @param {string} props.iconColor - Color class for the icon background (e.g. 'primary', 'green')
 * @param {string} props.changeValue - Change value text (e.g. '+12.5%')
 * @param {string} props.changeLabel - Label explaining the change (e.g. 'from yesterday') 
 * @param {string} props.changeType - Type of change ('positive', 'negative', or 'neutral')
 * @param {string} props.animationDelay - CSS animation delay value (e.g. '0.1s')
 */
const StatsCard = ({ 
  title, 
  value, 
  icon, 
  iconColor = 'primary',
  changeValue, 
  changeLabel, 
  changeType = 'neutral',
  animationDelay 
}) => {
  // Map color names to Tailwind classes
  const colorMap = {
    primary: {
      bg: 'bg-primary-100 dark:bg-primary-900',
      text: 'text-primary-600 dark:text-primary-300'
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-600 dark:text-green-300'
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-600 dark:text-blue-300'
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-600 dark:text-purple-300'
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-600 dark:text-red-300'
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-600 dark:text-yellow-300'
    }
  };

  // Get color classes for the icon
  const iconBgClass = colorMap[iconColor]?.bg || colorMap.primary.bg;
  const iconTextClass = colorMap[iconColor]?.text || colorMap.primary.text;

  // Determine change text color based on change type
  const changeTextClass = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400'
  }[changeType];

  // Animation style
  const animationStyle = animationDelay ? { animationDelay } : {};

  return (
    <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800 slide-in" style={animationStyle}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${iconBgClass}`}>
          <i className={`${iconTextClass} fas ${icon}`}></i>
        </div>
      </div>
      
      {(changeValue || changeLabel) && (
        <div className="mt-4">
          {changeValue && (
            <span className={`text-sm font-medium ${changeTextClass}`}>{changeValue}</span>
          )}
          {changeLabel && (
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.string.isRequired,
  iconColor: PropTypes.oneOf(['primary', 'green', 'blue', 'purple', 'red', 'yellow']),
  changeValue: PropTypes.string,
  changeLabel: PropTypes.string,
  changeType: PropTypes.oneOf(['positive', 'negative', 'neutral']),
  animationDelay: PropTypes.string
};

export default StatsCard;
