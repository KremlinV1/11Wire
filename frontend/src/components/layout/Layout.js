import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

/**
 * Main Layout component
 * 
 * Provides the overall page structure with sidebar, header, main content area, and footer
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content to render in the main area
 * @param {string} props.pageTitle - Title of the current page
 */
const Layout = ({ children, pageTitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar on large screens, keep state on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On desktop/tablet, we don't need to manage open state
        // Sidebar is always visible
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-full min-h-full bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-gray-900 bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />

      {/* Mobile sidebar toggle */}
      <button 
        className="md:hidden fixed bottom-4 left-4 z-30 p-3 bg-primary-600 rounded-full shadow-lg text-white"
        onClick={toggleSidebar}
      >
        <i className="fas fa-bars"></i>
      </button>

      {/* Main content */}
      <div className="flex flex-col flex-1 md:ml-64">
        {/* Header */}
        <Header pageTitle={pageTitle} />

        {/* Main content area */}
        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
