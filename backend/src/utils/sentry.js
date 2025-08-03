const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const { version } = require('../../package.json');

// Initialize Sentry
// Replace the DSN below with your actual Sentry DSN
const initSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",
    integrations: [
      // Enable profiling for performance monitoring
      new ProfilingIntegration(),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    tracesSampleRate: 1.0,
    // Set profilesSampleRate to 1.0 to profile 100%
    // of sampled transactions.
    // We recommend adjusting this value in production.
    profilesSampleRate: 1.0,
    // Specify release version for better tracking
    release: version,
    environment: process.env.NODE_ENV || 'development',
    // Only capture errors in production mode
    enabled: process.env.NODE_ENV === 'production'
  });

  console.log(`Sentry initialized in ${process.env.NODE_ENV || 'development'} mode`);
};

// Utility function to track errors with extra context
const captureException = (error, context = {}) => {
  Sentry.withScope((scope) => {
    // Add extra context information
    Object.keys(context).forEach(key => {
      scope.setExtra(key, context[key]);
    });
    
    // Capture the error
    Sentry.captureException(error);
  });
};

// Performance monitoring
const startTransaction = (name, op) => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

module.exports = {
  initSentry,
  captureException,
  startTransaction,
  Sentry
};
