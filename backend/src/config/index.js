/**
 * Configuration settings for 11Wire backend
 */

const config = {
  port: process.env.PORT || 3000,
  
  // CORS configuration
  corsOptions: {
    origin: process.env.CLIENT_URL || 'http://localhost:3001',
    credentials: true,
    optionsSuccessStatus: 200
  },
  
  // Database config
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || '11wire',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    ssl: process.env.DB_SSL === 'true'
  },
  
  // SignalWire credentials
  signalWire: {
    projectId: process.env.SIGNALWIRE_PROJECT_ID,
    spaceUrl: process.env.SIGNALWIRE_SPACE_URL,
    apiToken: process.env.SIGNALWIRE_API_TOKEN,
    signingSecret: process.env.SIGNALWIRE_SIGNING_SECRET
  },
  
  // ElevenLabs credentials
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    webhook: {
      signingSecret: process.env.ELEVENLABS_WEBHOOK_SECRET || '',
      // URL for receiving webhook callbacks from ElevenLabs (async STT)
      url: process.env.ELEVENLABS_WEBHOOK_URL || 'https://your-domain.com/api/webhooks/elevenlabs',
      // List of allowed IPs for ElevenLabs webhooks
      // Example IPs - replace with actual ElevenLabs IPs in production
      allowedIPs: process.env.ELEVENLABS_WEBHOOK_IPS ? 
        process.env.ELEVENLABS_WEBHOOK_IPS.split(',') : 
        ['34.232.126.174', '52.202.195.162', '35.173.222.126']
    }
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    jwtExpiresIn: '1d'
  },
  
  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};

module.exports = config;
