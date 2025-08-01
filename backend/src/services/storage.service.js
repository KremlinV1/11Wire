/**
 * Storage Service
 * Handles file storage operations for the application
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config');

// Default storage directory (can be configured in config)
const STORAGE_DIR = config.storage?.baseDir || path.join(process.cwd(), 'storage');
const AUDIO_DIR = path.join(STORAGE_DIR, 'audio');

// Ensure storage directories exist
const initStorage = () => {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
      logger.info(`Created storage directory: ${STORAGE_DIR}`);
    }
    
    if (!fs.existsSync(AUDIO_DIR)) {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
      logger.info(`Created audio storage directory: ${AUDIO_DIR}`);
    }
  } catch (error) {
    logger.error(`Failed to initialize storage: ${error.message}`);
    throw error;
  }
};

// Initialize storage on module load
initStorage();

/**
 * Store a buffer as a file
 * @param {Buffer} buffer - Data buffer to store
 * @param {string} fileName - Name for the file (optional, will generate UUID if not provided)
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} Storage result with path and other metadata
 */
const storeBuffer = async (buffer, fileName = null, mimeType = 'application/octet-stream') => {
  try {
    // Generate a unique filename if not provided
    const finalFileName = fileName || `${uuidv4()}.bin`;
    
    // Determine appropriate subdirectory based on mime type
    let targetDir = STORAGE_DIR;
    if (mimeType.startsWith('audio/')) {
      targetDir = AUDIO_DIR;
    }
    
    // Full path for storing the file
    const filePath = path.join(targetDir, finalFileName);
    
    // Write the file
    await fs.promises.writeFile(filePath, buffer);
    
    const stats = await fs.promises.stat(filePath);
    
    logger.info(`Stored file: ${filePath} (${stats.size} bytes)`);
    
    return {
      path: filePath,
      fileName: finalFileName,
      mimeType,
      sizeBytes: stats.size,
      storedAt: new Date(),
      storageType: 'local',
      relativePath: path.relative(STORAGE_DIR, filePath)
    };
  } catch (error) {
    logger.error(`Failed to store buffer: ${error.message}`);
    throw error;
  }
};

/**
 * Store base64 encoded data as a file
 * @param {string} base64Data - Base64 encoded data
 * @param {string} fileName - Name for the file (optional)
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} Storage result with path and metadata
 */
const storeBase64Data = async (base64Data, fileName = null, mimeType = 'application/octet-stream') => {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    return await storeBuffer(buffer, fileName, mimeType);
  } catch (error) {
    logger.error(`Failed to store base64 data: ${error.message}`);
    throw error;
  }
};

/**
 * Retrieve a file as a buffer
 * @param {string} filePath - Path to the file
 * @returns {Promise<Buffer>} File contents as buffer
 */
const getFileBuffer = async (filePath) => {
  try {
    return await fs.promises.readFile(filePath);
  } catch (error) {
    logger.error(`Failed to read file: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a file
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<boolean>} Whether deletion was successful
 */
const deleteFile = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
    logger.info(`Deleted file: ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete file: ${error.message}`);
    return false;
  }
};

module.exports = {
  initStorage,
  storeBuffer,
  storeBase64Data,
  getFileBuffer,
  deleteFile,
  STORAGE_DIR,
  AUDIO_DIR
};
