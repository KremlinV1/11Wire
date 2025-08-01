import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Sidebar navigation component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether sidebar is open on mobile
 */
const Sidebar = ({ open }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Navigation items configuration
  const navItems = [
    {
      name: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      path: '/dashboard',
    },
    {
      name: 'Contacts',
      icon: 'fas fa-users',
      path: '/contacts',
    },
    {
      name: 'Call Logs',
      icon: 'fas fa-history',
      path: '/calls',
    },
    {
      name: 'Voice Agents',
      icon: 'fas fa-robot',
      path: '/agents',
    },
    {
      name: 'Campaigns',
      icon: 'fas fa-bullhorn',
      path: '/campaigns',
    },
    {
      name: 'Settings',
      icon: 'fas fa-cog',
      path: '/settings',
    },
  ];

  // Function to check if a nav item is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div 
      className={`sidebar-transition fixed z-20 flex flex-col flex-shrink-0 w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-primary-600">
        <div className="flex items-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
          <span className="ml-2 text-xl font-bold text-white">11Wire</span>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                isActive(item.path)
                  ? 'text-white bg-primary-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              } group`}
            >
              <i
                className={`${item.icon} mr-3 ${
                  isActive(item.path)
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                }`}
              ></i>
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* User info footer */}
      {user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <img
              className="w-10 h-10 rounded-full"
              src={user.profileImage || "https://randomuser.me/api/portraits/women/68.jpg"}
              alt="User profile"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user.name || "User"}
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {user.role || "User"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
