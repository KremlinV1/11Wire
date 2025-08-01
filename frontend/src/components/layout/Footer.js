import React from 'react';

/**
 * Footer component for the dashboard
 * Displays copyright info and application version
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();
  const appVersion = process.env.REACT_APP_VERSION || 'v2.4.1';

  return (
    <footer className="px-4 py-3 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {currentYear} 11Wire. All rights reserved.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{appVersion}</p>
      </div>
    </footer>
  );
};

export default Footer;
