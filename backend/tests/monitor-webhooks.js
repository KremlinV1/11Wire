/**
 * Webhook Monitor Script
 * 
 * Monitors the backend logs for webhook events
 * and reports on incoming ElevenLabs transcriptions
 */

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const logger = require('../src/utils/logger');

// Timestamps to track events
const startTime = new Date();
let lastEvent = null;

// Configure middleware
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    // Store raw body for signature verification
    req.rawBody = buf.toString();
  }
}));

// Create endpoint to view recent events
app.get('/status', (req, res) => {
  res.json({
    monitoring_since: startTime,
    last_event: lastEvent,
    uptime_seconds: Math.floor((new Date() - startTime) / 1000)
  });
});

// Create webhook endpoint that logs all incoming requests
app.post('/webhook-debug', (req, res) => {
  const now = new Date();
  lastEvent = {
    time: now.toISOString(),
    headers: req.headers,
    body: req.body
  };
  
  console.log('=============================================');
  console.log(`⚡ WEBHOOK RECEIVED at ${now.toISOString()}`);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  console.log('=============================================');
  
  // Always acknowledge receipt
  res.status(200).json({ 
    success: true,
    received_at: now.toISOString()
  });
});

// Start monitoring server
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`
🔍 Webhook Monitor Running
============================
📅 Started at: ${startTime.toISOString()}
🌐 Status URL: http://localhost:${PORT}/status
📥 Debug webhook: http://localhost:${PORT}/webhook-debug
💡 Tips: 
  - Use this to debug webhook format & content
  - Keep running to capture incoming webhooks
  - Visit status URL to check if monitor is active
============================
  `);
});

// Also monitor events from the event emitter
try {
  const eventEmitter = require('../src/utils/event-emitter');
  
  // Listen for STT result events
  eventEmitter.on('stt-result', (data) => {
    console.log('=============================================');
    console.log(`🎙️ STT RESULT EVENT at ${new Date().toISOString()}`);
    console.log('📄 Transcription:', data.text);
    console.log('📞 Call ID:', data.call_id);
    console.log('🌐 Language:', data.language);
    console.log('📝 Metadata:', JSON.stringify(data.metadata, null, 2));
    console.log('=============================================');
  });
  
  console.log('✅ Event emitter monitoring active');
} catch (error) {
  console.error('❌ Failed to connect to event emitter:', error.message);
}
