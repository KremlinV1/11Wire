/**
 * Performance monitoring middleware
 * Tracks endpoint response times and other metrics
 */
const logger = require('../utils/logger');

// Store metrics in memory (in production, consider a proper metrics store)
const metrics = {
  endpoints: {},
  totalRequests: 0,
  requestsPerMinute: 0,
  startTime: Date.now()
};

// Reset requests per minute counter
setInterval(() => {
  metrics.requestsPerMinute = 0;
}, 60000);

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  // Increment request counters
  metrics.totalRequests++;
  metrics.requestsPerMinute++;
  
  // Get endpoint path (normalize dynamic routes)
  const endpoint = req.route ? req.baseUrl + req.route.path : req.path;
  
  // Initialize metrics for this endpoint if not exists
  if (!metrics.endpoints[endpoint]) {
    metrics.endpoints[endpoint] = {
      calls: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      minResponseTime: Number.MAX_SAFE_INTEGER,
      maxResponseTime: 0,
      errors: 0,
      lastCalled: null
    };
  }
  
  // Increment call counter for this endpoint
  metrics.endpoints[endpoint].calls++;
  metrics.endpoints[endpoint].lastCalled = new Date().toISOString();
  
  // Store start time for this request
  const startTime = process.hrtime();
  
  // Override end method to calculate response time
  const originalEnd = res.end;
  res.end = function() {
    // Calculate response time
    const hrTime = process.hrtime(startTime);
    const responseTimeMs = hrTime[0] * 1000 + hrTime[1] / 1000000;
    
    // Update metrics for this endpoint
    const endpointMetrics = metrics.endpoints[endpoint];
    endpointMetrics.totalResponseTime += responseTimeMs;
    endpointMetrics.avgResponseTime = endpointMetrics.totalResponseTime / endpointMetrics.calls;
    endpointMetrics.minResponseTime = Math.min(endpointMetrics.minResponseTime, responseTimeMs);
    endpointMetrics.maxResponseTime = Math.max(endpointMetrics.maxResponseTime, responseTimeMs);
    
    // Track errors
    if (res.statusCode >= 400) {
      endpointMetrics.errors++;
    }
    
    // Log slow responses (over 1000ms)
    if (responseTimeMs > 1000) {
      logger.warn(`Slow response detected: ${endpoint} took ${responseTimeMs.toFixed(2)}ms`, {
        endpoint,
        method: req.method,
        responseTime: responseTimeMs,
        statusCode: res.statusCode
      });
    }
    
    // Call original end method
    return originalEnd.apply(this, arguments);
  };
  
  next();
};

// Expose metrics endpoint
const getMetrics = (req, res) => {
  // Calculate uptime
  const uptime = (Date.now() - metrics.startTime) / 1000;
  
  res.json({
    status: 'ok',
    uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    totalRequests: metrics.totalRequests,
    requestsPerMinute: metrics.requestsPerMinute,
    endpoints: metrics.endpoints
  });
};

module.exports = {
  performanceMonitor,
  getMetrics
};
