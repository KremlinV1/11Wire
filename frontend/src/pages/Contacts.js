import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import DataTable from '../components/common/DataTable';
import ContactImportModal from '../components/contacts/ContactImportModal';
import { contactService } from '../services/contactService';

/**
 * Contacts page component
 * 
 * Displays a list of contacts with search, filter, and import functionality
 */
const Contacts = () => {
  // State
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [filterCampaign, setFilterCampaign] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  
  const itemsPerPage = 10;

  // Load contacts data
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const response = await contactService.getContacts({
          page: currentPage,
          limit: itemsPerPage,
          search: searchQuery,
          campaignId: filterCampaign || undefined
        });
        
        setContacts(response.data);
        setTotalContacts(response.total);
        
        // Also fetch campaigns for the filter dropdown
        const campaignsData = await contactService.getCampaigns();
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContacts();
  }, [currentPage, searchQuery, filterCampaign]);

  // Column definitions for contacts table
  const columns = [
    {
      key: 'select',
      header: '',
      render: (row) => (
        <div className="flex items-center">
          <input
            type="checkbox"
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            checked={selectedContacts.includes(row.id)}
            onChange={() => handleContactSelect(row.id)}
          />
        </div>
      ),
      sortable: false
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10">
            <img
              className="w-10 h-10 rounded-full"
              src={row.profileImage || `https://randomuser.me/api/portraits/men/${row.id.charCodeAt(0) % 100}.jpg`}
              alt={row.name}
            />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {row.name || 'Unnamed Contact'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.email || 'No email'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {row.phone || 'No phone'}
        </div>
      )
    },
    {
      key: 'campaign',
      header: 'Campaign',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {row.campaign?.name || 'Not assigned'}
        </div>
      )
    },
    {
      key: 'lastCall',
      header: 'Last Contact',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {row.lastCall ? new Date(row.lastCall).toLocaleDateString() : 'Never'}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const statuses = {
          active: { text: 'Active', color: 'green' },
          inactive: { text: 'Inactive', color: 'gray' },
          completed: { text: 'Completed', color: 'blue' },
          failed: { text: 'Failed', color: 'red' },
          'do-not-call': { text: 'Do Not Call', color: 'red' }
        };
        
        const status = statuses[row.status?.toLowerCase()] || statuses.active;
        
        return (
          <span className={`inline-flex px-2 text-xs font-semibold leading-5 text-${status.color}-800 bg-${status.color}-100 rounded-full dark:bg-${status.color}-900 dark:text-${status.color}-200`}>
            {status.text}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditContact(row.id);
            }}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteContact(row.id);
            }}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      )
    }
  ];

  // Handle contact selection
  const handleContactSelect = (contactId) => {
    setSelectedContacts(prevSelected => {
      if (prevSelected.includes(contactId)) {
        return prevSelected.filter(id => id !== contactId);
      } else {
        return [...prevSelected, contactId];
      }
    });
  };

  // Handle "Select All" checkbox
  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(contact => contact.id));
    }
  };

  // Handle edit contact
  const handleEditContact = (contactId) => {
    // Navigate to edit contact page
    window.location.href = `/contacts/${contactId}/edit`;
  };

  // Handle delete contact
  const handleDeleteContact = async (contactId) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await contactService.deleteContact(contactId);
        
        // Refresh contacts list
        setContacts(contacts.filter(contact => contact.id !== contactId));
        setSelectedContacts(selectedContacts.filter(id => id !== contactId));
        
        // Update total count
        setTotalContacts(prevTotal => prevTotal - 1);
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact. Please try again.');
      }
    }
  };

  // Handle delete selected contacts
  const handleDeleteSelected = async () => {
    if (selectedContacts.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedContacts.length} selected contacts?`)) {
      try {
        await Promise.all(selectedContacts.map(contactId => 
          contactService.deleteContact(contactId)
        ));
        
        // Refresh contacts list
        setContacts(contacts.filter(contact => !selectedContacts.includes(contact.id)));
        setSelectedContacts([]);
        
        // Update total count
        setTotalContacts(prevTotal => prevTotal - selectedContacts.length);
      } catch (error) {
        console.error('Error deleting selected contacts:', error);
        alert('Failed to delete some contacts. Please try again.');
      }
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle campaign filter change
  const handleCampaignFilterChange = (e) => {
    setFilterCampaign(e.target.value);
    setCurrentPage(1); // Reset to first page on new filter
  };

  // Handle import success
  const handleImportSuccess = (importedCount) => {
    // Refresh contacts list after successful import
    setCurrentPage(1);
    setTotalContacts(prevTotal => prevTotal + importedCount);
    setShowImportModal(false);
  };

  return (
    <Layout pageTitle="Contacts">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary-600 focus:border-primary-600 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          <select
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            value={filterCampaign}
            onChange={handleCampaignFilterChange}
          >
            <option value="">All Campaigns</option>
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {selectedContacts.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Delete Selected ({selectedContacts.length})
            </button>
          )}

          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-700 dark:hover:bg-primary-800"
          >
            <i className="fas fa-file-upload mr-2"></i>
            Import Contacts
          </button>

          <Link
            to="/contacts/new"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-700 dark:hover:bg-green-800"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Contact
          </Link>
        </div>
      </div>

      {/* Select all header */}
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          checked={selectedContacts.length === contacts.length && contacts.length > 0}
          onChange={handleSelectAll}
        />
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
          {selectedContacts.length > 0
            ? `${selectedContacts.length} selected`
            : 'Select all'}
        </span>
      </div>

      {/* Contacts table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={contacts}
          loading={loading}
          pagination={true}
          totalItems={totalContacts}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onRowClick={(contact) => window.location.href = `/contacts/${contact.id}`}
        />
      </div>

      {/* Import modal */}
      {showImportModal && (
        <ContactImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
          campaigns={campaigns}
        />
      )}
    </Layout>
  );
};

export default Contacts;
