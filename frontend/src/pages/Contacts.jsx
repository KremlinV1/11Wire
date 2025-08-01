import React, { useState } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// Mock data for contacts
const initialContacts = [
  {
    id: 1,
    name: 'Jane Cooper',
    phone: '+1 (555) 123-4567',
    email: 'janecooper@example.com',
    status: 'active',
    tags: ['customer', 'retail'],
    lastContacted: '2025-06-10T14:30:00',
  },
  {
    id: 2,
    name: 'Michael Johnson',
    phone: '+1 (555) 234-5678',
    email: 'michaelj@example.com',
    status: 'pending',
    tags: ['prospect', 'healthcare'],
    lastContacted: '2025-06-15T09:45:00',
  },
  {
    id: 3,
    name: 'Sarah Williams',
    phone: '+1 (555) 345-6789',
    email: 'sarahw@example.com',
    status: 'active',
    tags: ['customer', 'education'],
    lastContacted: '2025-06-18T11:20:00',
  },
  {
    id: 4,
    name: 'Robert Brown',
    phone: '+1 (555) 456-7890',
    email: 'robertb@example.com',
    status: 'inactive',
    tags: ['customer', 'technology'],
    lastContacted: '2025-05-28T15:10:00',
  },
  {
    id: 5,
    name: 'Emily Davis',
    phone: '+1 (555) 567-8901',
    email: 'emilyd@example.com',
    status: 'active',
    tags: ['prospect', 'finance'],
    lastContacted: '2025-06-21T10:15:00',
  },
  {
    id: 6,
    name: 'David Miller',
    phone: '+1 (555) 678-9012',
    email: 'davidm@example.com',
    status: 'active',
    tags: ['customer', 'retail'],
    lastContacted: '2025-06-19T13:40:00',
  },
  {
    id: 7,
    name: 'Lisa Garcia',
    phone: '+1 (555) 789-0123',
    email: 'lisag@example.com',
    status: 'pending',
    tags: ['prospect', 'healthcare'],
    lastContacted: '2025-06-14T16:30:00',
  },
];

function Contacts() {
  const [contacts, setContacts] = useState(initialContacts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Filter contacts based on search term and filter
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (selectedFilter === 'all') return matchesSearch;
    return matchesSearch && contact.status === selectedFilter;
  });
  
  // Handle bulk selection of contacts
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedContacts(filteredContacts.map(contact => contact.id));
    } else {
      setSelectedContacts([]);
    }
  };
  
  // Handle selection of individual contact
  const handleSelectContact = (contactId) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Contacts</h2>
          <p className="text-gray-500 dark:text-gray-300">Manage your contact list for campaigns</p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="btn-outline"
            onClick={() => setShowImportModal(true)}
          >
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            Import CSV
          </button>
          <button className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Contact
          </button>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="form-input pl-10"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</div>
            <select
              className="form-input py-1"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Contacts</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          {/* Actions for selected contacts */}
          <div className={`flex items-center space-x-2 ${selectedContacts.length > 0 ? 'visible' : 'invisible'}`}>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedContacts.length} selected
            </span>
            <button className="btn-outline py-1 px-2">
              <PhoneIcon className="h-4 w-4 mr-1" />
              Call
            </button>
            <button className="btn-danger py-1 px-2">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Contact Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      onChange={handleSelectAll}
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Phone
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Tags
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Last Contacted
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {contact.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {contact.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {contact.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contact.status === 'active' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Active
                      </span>
                    ) : contact.status === 'pending' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                        <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(contact.lastContacted).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      <button className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300" title="Call">
                        <PhoneIcon className="h-5 w-5" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300" title="Edit">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Delete">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Import Contacts</h3>
            <p className="mb-4 text-gray-500 dark:text-gray-300">
              Upload a CSV file with the following headers: name, phone, email, tags (comma-separated).
            </p>
            <div className="mb-4">
              <label 
                className="flex justify-center px-6 py-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="space-y-1 text-center">
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <span className="relative font-medium text-primary-600 hover:text-primary-500">
                      Upload a file
                    </span>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    CSV up to 10MB
                  </p>
                </div>
                <input type="file" className="sr-only" accept=".csv" />
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="btn-outline"
                onClick={() => setShowImportModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary">
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Contacts;
