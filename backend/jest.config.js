/**
 * Jest configuration
 * This config excludes the telephony integration tests from regular test runs
 */

module.exports = {
  // Default test environment
  testEnvironment: 'node',
  
  // Test file pattern matching
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src/tests/integration/telephony-integration.test.js' // Exclude the telephony integration tests
  ],
  
  // Test setup files
  setupFiles: [],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**/*.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov'],
  
  // Timeout for individual tests (in ms)
  testTimeout: 10000
};
