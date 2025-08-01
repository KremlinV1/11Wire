/**
 * File Helper Utilities
 * Provides common file handling functions for the application
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * Create a temporary file with given content
 * @param {string} content - Content to write to temp file
 * @param {string} extension - File extension (default: 'tmp')
 * @returns {string} Path to the temporary file
 */
exports.createTempFile = async (content, extension = 'tmp') => {
  // Create a unique filename
  const filename = `${crypto.randomBytes(8).toString('hex')}.${extension}`;
  const tempFilePath = path.join(os.tmpdir(), filename);
  
  // Write content to the file
  await fs.promises.writeFile(tempFilePath, content, 'utf8');
  
  return tempFilePath;
};

/**
 * Remove a file if it exists
 * @param {string} filePath - Path to the file to remove
 * @returns {Promise<boolean>} True if file was removed, false if it didn't exist
 */
exports.removeFileIfExists = async (filePath) => {
  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    // File doesn't exist or other error
    return false;
  }
};

/**
 * Ensure a directory exists, creating it if needed
 * @param {string} dirPath - Directory path to ensure exists
 * @returns {Promise<void>}
 */
exports.ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.promises.access(dirPath);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename to extract extension from
 * @returns {string} File extension without the dot
 */
exports.getFileExtension = (filename) => {
  return path.extname(filename).slice(1);
};

/**
 * Read a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<object>} Parsed JSON content
 */
exports.readJsonFile = async (filePath) => {
  const content = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

/**
 * Write JSON to a file
 * @param {string} filePath - Path to write the JSON file
 * @param {object} data - Data to serialize as JSON
 * @returns {Promise<void>}
 */
exports.writeJsonFile = async (filePath, data) => {
  const content = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(filePath, content, 'utf8');
};
