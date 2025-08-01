// Simple test runner script for the integration tests
// that loads environment variables from .env.test

require('dotenv').config({ path: './.env.test' });

// Use the TEST_MOCK_MODE setting from .env.test
// If you want to force mock mode for safety, uncomment the next line:
// process.env.TEST_MOCK_MODE = 'true';

// Override the campaign-scheduler service with the mock version
const path = require('path');
const originalRequire = module.constructor.prototype.require;

// Mock the campaign scheduler service
module.constructor.prototype.require = function(name) {
  if (name === '../services/campaign-scheduler.service' || 
      name === './campaign-scheduler.service' ||
      name === path.resolve(__dirname, 'src/services/campaign-scheduler.service')) {
    return require('./src/services/campaign-scheduler.mock');
  }
  return originalRequire.call(this, name);
};

// Import and run the test
const tests = require('./src/tests/integration/telephony-integration.test.js');

console.log('Starting integration tests in MOCK mode...');
tests.runAllTests()
  .then(result => {
    if (result.success) {
      console.log('✅ All tests passed successfully in mock mode!');
      process.exit(0);
    } else {
      console.error('❌ Some tests failed in mock mode.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
