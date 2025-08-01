# 11Wire: ElevenLabs and SignalWire Production Integration Guide

This document provides comprehensive guidelines for integrating SignalWire and ElevenLabs Conversational AI agents into a production environment for the 11Wire platform.

## Table of Contents

1. [Integration Overview](#integration-overview)
2. [Prerequisites](#prerequisites)
3. [SignalWire Configuration](#signalwire-configuration)
4. [ElevenLabs Conversational AI Agent Configuration](#elevenlabs-conversational-ai-agent-configuration)
5. [Webhook Implementation](#webhook-implementation)
6. [Security Considerations](#security-considerations)
7. [Business Logic Implementation](#business-logic-implementation)
8. [Testing Procedures](#testing-procedures)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)

## Integration Overview

The 11Wire platform integrates SignalWire for telephony services and ElevenLabs for AI-powered voice conversations. This integration enables automated phone calls with natural-sounding AI voices that can conduct conversations, collect information, and provide services to users.

**Flow Overview:**
1. 11Wire initiates a call through SignalWire
2. The call connects to an ElevenLabs Conversational AI agent
3. The agent conducts the conversation using predefined instructions/prompts
4. ElevenLabs sends webhooks back to 11Wire with conversation transcripts and audio data
5. 11Wire processes and stores this information for reporting and analysis

## Prerequisites

Before proceeding with the integration, ensure you have:

- Active SignalWire account with valid API credentials
- Active ElevenLabs account with Conversational AI feature enabled
- 11Wire backend deployed to a production server with SSL
- PostgreSQL database properly configured
- Network access for webhook communication

## SignalWire Configuration

### API Credentials

Set the following environment variables in your production environment:

```
SIGNALWIRE_PROJECT_ID=your-project-id
SIGNALWIRE_SPACE_URL=your-space-url
SIGNALWIRE_API_TOKEN=your-api-token
SIGNALWIRE_SIGNING_SECRET=your-signing-secret
```

### SIP Endpoint Configuration

For SIP calling functionality:

```
SIGNALWIRE_SIP_ENDPOINT=your-sip-endpoint
SIGNALWIRE_SIP_PASSWORD=your-sip-password
```

Example format: `username@your-project-id.sip.signalwire.com`

### Call Configuration

Configure your SignalWire call settings in `src/config/index.js`:

```javascript
// Call configuration
signalwireCall: {
  maxRetries: 3,
  retryDelay: 5000, // ms
  defaultCallTimeout: 60, // seconds
}
```

## ElevenLabs Conversational AI Agent Configuration

### Creating an Agent

1. Log in to your ElevenLabs account
2. Navigate to the "Conversational AI" section
3. Create a new agent with appropriate name and settings
4. Configure your agent's instructions and prompts
5. Select a voice that matches your brand's identity

### Webhook Configuration

Configure your agent to send webhooks to your 11Wire backend:

1. In your agent settings, add webhook URL:
   ```
   https://your-production-domain.com/api/webhooks/elevenlabs
   ```

2. Enable the following webhook events:
   - `post_call_transcription` - Sends conversation transcript after call
   - `post_call_audio` - Sends recorded call audio after call

## Webhook Implementation

The 11Wire backend has webhook endpoints implemented in:

- Controller: `src/controllers/elevenlabs-webhook.controller.js`
- Routes: `src/routes/webhook.routes.js`

### Production Enhancements

For production use, consider implementing these enhancements to the webhook controller:

```javascript
// Example enhancements for elevenlabs-webhook.controller.js

// 1. Add webhook signature validation
const validateSignature = (req) => {
  const signature = req.headers['x-elevenlabs-signature'];
  const timestamp = req.headers['x-elevenlabs-timestamp'];
  const payload = JSON.stringify(req.body);
  
  // Implement signature validation logic here
  // Return true if valid, false otherwise
};

// 2. Add IP whitelisting
const isAllowedIP = (ip) => {
  const allowedIPs = process.env.ELEVENLABS_WEBHOOK_ALLOWED_IPS.split(',');
  return allowedIPs.includes(ip);
};

// 3. Enhanced transcription processing
const processTranscription = async (data) => {
  try {
    // Store conversation in database
    const conversationRecord = await db.Conversation.create({
      call_id: data.call_id,
      agent_id: data.agent_id,
      campaign_id: data.metadata?.campaign_id,
      duration_seconds: data.metadata?.duration_seconds,
      messages: JSON.stringify(data.conversation.messages),
      timestamp: new Date()
    });
    
    // Additional processing as needed
    // Trigger analytics, notifications, etc.
    
    return conversationRecord;
  } catch (error) {
    logger.error(`Error processing transcription: ${error.message}`);
    throw error;
  }
};
```

## Security Considerations

### Webhook Security

Implement the following security measures for webhooks:

1. **Signature Validation**
   - Obtain a webhook signing secret from ElevenLabs
   - Validate the signature with each request
   - Reject requests with invalid signatures

2. **IP Whitelisting**
   - Get a list of ElevenLabs webhook source IPs
   - Configure your firewall to only allow these IPs
   - Add additional validation in your application

3. **HTTPS Only**
   - Ensure all webhook endpoints use HTTPS
   - Configure proper SSL/TLS settings

### API Key Management

1. Use environment variables for all API keys and secrets
2. Consider using a secrets management system like HashiCorp Vault
3. Implement key rotation policy
4. Monitor for unauthorized usage

## Business Logic Implementation

### Storing Conversation Data

Create a database schema for storing conversation data:

```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  call_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255),
  campaign_id VARCHAR(255),
  duration_seconds INTEGER,
  messages JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_call_id ON conversations(call_id);
CREATE INDEX idx_conversations_campaign_id ON conversations(campaign_id);
```

### Handling Audio Data

For processing audio data from webhooks:

1. **Storage Options**
   - Store in cloud storage (AWS S3, Google Cloud Storage)
   - Store in local file system (less recommended)
   - Stream to another service

2. **Implementation Example**:

```javascript
const processAudioWebhook = async (data) => {
  try {
    // Decode base64 audio
    const audioBuffer = Buffer.from(data.audio, 'base64');
    
    // Generate a unique filename
    const fileName = `${data.call_id}-${Date.now()}.mp3`;
    
    // Store audio file (example using cloud storage)
    const storageResponse = await storageService.uploadBuffer(
      audioBuffer, 
      fileName,
      'audio/mpeg'
    );
    
    // Create database record
    await db.CallRecording.create({
      call_id: data.call_id,
      campaign_id: data.metadata?.campaign_id,
      storage_path: storageResponse.path,
      duration_seconds: data.metadata?.duration_seconds,
      timestamp: new Date()
    });
    
    return storageResponse.path;
  } catch (error) {
    logger.error(`Error processing audio: ${error.message}`);
    throw error;
  }
};
```

## Testing Procedures

### Local Testing

Use the provided test script to validate webhook functionality:

```
node src/tests/elevenlabs-webhook-test.js
```

### Production Testing

1. **Manual Testing**
   - Configure a test agent in ElevenLabs
   - Make a test call through SignalWire
   - Verify webhook reception and processing
   - Check database for conversation and audio records

2. **Automated Testing**
   - Implement automated tests using Jest or Mocha
   - Create test fixtures for webhook payloads
   - Mock external services where appropriate

### Load Testing

Consider testing with increased volume:

```bash
# Example using k6 for load testing
k6 run --vus 10 --duration 30s webhook-load-test.js
```

## Monitoring and Maintenance

### Health Checks

Implement health checks for your integration:

1. **SignalWire Connection**
   - Periodic validation of API credentials
   - Test calls to verify connectivity

2. **Webhook Reception**
   - Monitor webhook endpoint health
   - Track webhook reception metrics

3. **Database Connectivity**
   - Monitor database connection pool
   - Set alerts for connection issues

### Metrics to Track

1. **Call Metrics**
   - Call volume
   - Call duration
   - Success/failure rates
   - Abandonment rates

2. **Agent Metrics**
   - Agent response time
   - Conversation length
   - Sentiment analysis

3. **System Metrics**
   - Webhook reception latency
   - Processing times
   - Error rates

### Logging

Configure comprehensive logging:

```javascript
logger.info('Call initiated', {
  call_id: callId,
  campaign_id: campaignId,
  timestamp: new Date().toISOString(),
  metadata: { /* additional context */ }
});
```

## Troubleshooting

### Common Issues

1. **SignalWire Connection Issues**
   - Verify API credentials
   - Check network connectivity
   - Confirm proper initialization parameters

2. **Webhook Reception Problems**
   - Verify webhook URL is correctly configured
   - Check server logs for incoming requests
   - Validate firewall and network settings

3. **Database Errors**
   - Verify database connection string
   - Check database user permissions
   - Validate schema existence

### Support Resources

- SignalWire API Documentation: https://docs.signalwire.com/
- ElevenLabs API Documentation: https://api.elevenlabs.io/docs
- Internal Support: [support@your-company.com](mailto:support@your-company.com)

---

*Document last updated: July 28, 2025*
