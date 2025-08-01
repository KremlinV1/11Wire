import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

/**
 * Component to display and manage scripts associated with a voice agent
 * Integrates with ElevenLabs API to fetch and display scripts
 */
const VoiceAgentScripts = ({ agentId, agentName }) => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedScript, setExpandedScript] = useState(null);

  // Mock ElevenLabs scripts data (to be replaced with API integration)
  const mockScripts = [
    {
      id: 'scr_001',
      name: 'Introduction Script',
      content: 'Hello, my name is [Agent Name] calling on behalf of [Company Name]. How are you doing today?',
      lastModified: '2025-06-20T14:30:00',
      usageCount: 45,
    },
    {
      id: 'scr_002',
      name: 'Product Offering',
      content: 'I wanted to let you know about our new [Product Name] that helps [Main Benefit]. Many of our customers have seen [Result] after using it.',
      lastModified: '2025-06-22T09:15:00',
      usageCount: 32,
    },
    {
      id: 'scr_003',
      name: 'Objection Handling',
      content: 'I understand your concern about [Objection]. Many customers initially felt the same way, but they found that [Resolution].',
      lastModified: '2025-06-23T11:45:00',
      usageCount: 28,
    }
  ];

  // Simulate API fetch (to be replaced with actual ElevenLabs API call)
  useEffect(() => {
    const fetchScripts = async () => {
      try {
        setLoading(true);
        // Replace with actual API call
        // const response = await fetch(`/api/voice-agents/${agentId}/scripts`);
        // const data = await response.json();
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setScripts(mockScripts);
        setLoading(false);
      } catch (err) {
        setError('Failed to load scripts from ElevenLabs API');
        setLoading(false);
      }
    };
    
    fetchScripts();
  }, [agentId]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Handle script expansion toggle
  const toggleScript = (scriptId) => {
    if (expandedScript === scriptId) {
      setExpandedScript(null);
    } else {
      setExpandedScript(scriptId);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex justify-center items-center h-32">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">Loading scripts from ElevenLabs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center text-red-700 dark:text-red-400">
          <p>{error}</p>
          <button 
            className="ml-4 px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          ElevenLabs Scripts
        </h3>
        <button className="btn-outline-sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          New Script
        </button>
      </div>
      
      {scripts.length > 0 ? (
        <div className="space-y-3">
          {scripts.map(script => (
            <div 
              key={script.id} 
              className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
            >
              <div 
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
                onClick={() => toggleScript(script.id)}
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-primary-500 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">{script.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last modified: {formatDate(script.lastModified)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Used: {script.usageCount} times
                  </span>
                  <button className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {expandedScript === script.id && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {script.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <DocumentTextIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">No scripts found for this agent</p>
          <button className="mt-2 btn-outline-sm">Create your first script</button>
        </div>
      )}
      
      <div className="mt-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Scripts are synchronized with ElevenLabs. Changes made here will be reflected in your ElevenLabs account.
        </p>
      </div>
    </div>
  );
};

export default VoiceAgentScripts;
