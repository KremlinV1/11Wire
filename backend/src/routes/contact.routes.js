/**
 * Contact management API endpoints
 */

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, '/tmp'); // Temporary storage
  },
  filename: function(req, file, cb) {
    cb(null, 'contacts-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    // Accept only CSV files
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// GET all contacts (with pagination and filtering)
router.get('/', contactController.getContacts);

// GET contact statistics
router.get('/stats', contactController.getContactStats);

// GET a single contact by ID
router.get('/:contactId', contactController.getContactById);

// POST to create a new contact
router.post('/', contactController.createContact);

// POST to upload contacts via CSV
router.post('/upload', upload.single('file'), contactController.uploadContacts);

// PUT to update a contact
router.put('/:contactId', contactController.updateContact);

// DELETE a contact
router.delete('/:contactId', contactController.deleteContact);

// GET contact statistics
router.get('/stats', contactController.getContactStats);

module.exports = router;
