import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { contactService } from '../../services/contactService';

/**
 * Contact Import Modal
 * 
 * Modal for importing contacts via CSV or XLSX files
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSuccess - Function to call on successful import with count of imported contacts
 * @param {Array} props.campaigns - List of available campaigns
 */
const ContactImportModal = ({ onClose, onSuccess, campaigns = [] }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: ''
  });

  // Supported file extensions
  const supportedFormats = ['.csv', '.xlsx', '.xls'];
  
  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setPreviewData(null);
      return;
    }
    
    // Check file extension
    const fileName = selectedFile.name.toLowerCase();
    const isValidFormat = supportedFormats.some(format => 
      fileName.endsWith(format)
    );
    
    if (!isValidFormat) {
      setError(`Invalid file format. Please upload a CSV or Excel file (${supportedFormats.join(', ')})`);
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    setError('');
    
    // Generate preview
    generatePreview(selectedFile);
  };

  // Generate preview data from the file
  const generatePreview = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await contactService.previewImport(formData);
      
      if (response && response.preview) {
        setPreviewData(response.preview);
        
        // Try to auto-map columns based on headers
        if (response.headers && response.headers.length > 0) {
          const autoMapping = {
            name: '',
            phone: '',
            email: '',
            company: '',
            notes: ''
          };
          
          response.headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();
            
            if (lowerHeader.includes('name')) {
              autoMapping.name = index.toString();
            }
            else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('cell')) {
              autoMapping.phone = index.toString();
            }
            else if (lowerHeader.includes('email')) {
              autoMapping.email = index.toString();
            }
            else if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
              autoMapping.company = index.toString();
            }
            else if (lowerHeader.includes('note') || lowerHeader.includes('comment')) {
              autoMapping.notes = index.toString();
            }
          });
          
          setColumnMapping(autoMapping);
        }
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      setError('Failed to preview file. Please ensure the file is valid and try again.');
    }
  };

  // Handle column mapping change
  const handleColumnMappingChange = (field, value) => {
    setColumnMapping(prevMapping => ({
      ...prevMapping,
      [field]: value
    }));
  };

  // Handle import form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to import.');
      return;
    }
    
    try {
      setUploading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('columnMapping', JSON.stringify(columnMapping));
      
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      
      // Use axios for upload progress
      const response = await contactService.importContacts(
        formData,
        (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      );
      
      // Call the success handler with the number of imported contacts
      onSuccess(response.importedCount || 0);
    } catch (error) {
      console.error('Error importing contacts:', error);
      setError(error.response?.data?.message || 'Failed to import contacts. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl p-6 mx-4 bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import Contacts
          </h3>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* File upload section */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Upload File (CSV, XLSX)
            </label>
            
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${
                  file 
                    ? 'border-green-500 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                    : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <i className="fas fa-file-check text-3xl mb-2 text-green-500 dark:text-green-400"></i>
                      <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">{file.name}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-upload text-3xl mb-2 text-gray-500 dark:text-gray-400"></i>
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        CSV, XLSX or XLS (MAX. 10MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-400" role="alert">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}

          {/* Campaign selection */}
          <div className="mb-6">
            <label
              htmlFor="campaign"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Assign to Campaign (Optional)
            </label>
            <select
              id="campaign"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              disabled={uploading}
            >
              <option value="">No Campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          {/* Preview and column mapping */}
          {previewData && previewData.rows && previewData.rows.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Map Columns
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Name mapping */}
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    Name Column
                  </label>
                  <select
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={columnMapping.name}
                    onChange={(e) => handleColumnMappingChange('name', e.target.value)}
                    disabled={uploading}
                  >
                    <option value="">Not Mapped</option>
                    {previewData.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Phone mapping */}
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    Phone Column
                  </label>
                  <select
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={columnMapping.phone}
                    onChange={(e) => handleColumnMappingChange('phone', e.target.value)}
                    disabled={uploading}
                  >
                    <option value="">Not Mapped</option>
                    {previewData.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Email mapping */}
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    Email Column
                  </label>
                  <select
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={columnMapping.email}
                    onChange={(e) => handleColumnMappingChange('email', e.target.value)}
                    disabled={uploading}
                  >
                    <option value="">Not Mapped</option>
                    {previewData.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Company mapping */}
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    Company Column
                  </label>
                  <select
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={columnMapping.company}
                    onChange={(e) => handleColumnMappingChange('company', e.target.value)}
                    disabled={uploading}
                  >
                    <option value="">Not Mapped</option>
                    {previewData.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Notes mapping */}
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    Notes Column
                  </label>
                  <select
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={columnMapping.notes}
                    onChange={(e) => handleColumnMappingChange('notes', e.target.value)}
                    disabled={uploading}
                  >
                    <option value="">Not Mapped</option>
                    {previewData.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Data preview */}
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Data Preview (First {previewData.rows.length} rows)
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        {previewData.headers.map((header, index) => (
                          <th key={index} scope="col" className="px-4 py-2">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Upload Progress
              </label>
              <div className="w-full bg-gray-200 rounded-full dark:bg-gray-700">
                <div
                  className="bg-primary-600 text-xs font-medium text-primary-100 text-center p-0.5 leading-none rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                >
                  {uploadProgress}%
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end mt-6 space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-700 dark:hover:bg-primary-800 disabled:bg-gray-400 disabled:dark:bg-gray-600"
            >
              {uploading ? 'Importing...' : 'Import Contacts'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

ContactImportModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  campaigns: PropTypes.array
};

export default ContactImportModal;
