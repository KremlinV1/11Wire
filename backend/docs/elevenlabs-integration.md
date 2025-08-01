# ElevenLabs Integration Documentation

## Overview
This document details the integration between 11Wire backend and ElevenLabs AI services, including API authentication, real-time audio bridging, and webhook configuration.

## Date
Last Updated: July 30, 2025

## Integration Components

### 1. API Authentication
- **API Key Configuration**: 
  - Stored in environment variables via `.env` file
  - Used for all ElevenLabs API calls
  - Configuration path: `config/index.js` → `elevenLabs.apiKey`
  - Current implementation validates API key with ElevenLabs endpoints

### 2. Real-Time Audio Bridge
- **Overview**: 
  - Bidirectional audio streaming between SignalWire SIP calls and ElevenLabs AI
  - Implementation located in `services/audio-bridge.service.js`

- **Components**:
  - WebSocket server for audio streaming (`/stream` endpoint)
  - Audio format conversion pipeline (μ-law to PCM)
  - Session mapping between calls and ElevenLabs sessions
  - Audio buffer management for real-time communication

- **Audio Format Handling**:
  - SignalWire provides 8kHz μ-law encoded audio
  - ElevenLabs requires 16kHz PCM format
  - Conversion performed using `wav` and `pcm-util` libraries

### 3. Webhook Integration
- **Endpoint**: `/api/webhooks/elevenlabs`
- **Implementation**: `controllers/elevenlabs-webhook.controller.js`
- **Authentication Method**: HMAC verification
- **Webhook Secret**: Configured in environment variables as `ELEVENLABS_WEBHOOK_SECRET`

- **Supported Events**:
  - `conversation.completed`: Handles completed conversations
  - Stores conversation data in the database
  - Links conversations to campaigns where applicable

- **Webhook Security**:
  - HMAC signature verification
  - IP allowlist validation
  - Development bypass mode for testing

### 4. Conversation Data Processing
- Storage of conversation transcripts in the database
- Association with calls and campaigns
- Metrics tracking for reporting

## Configuration Requirements

### Environment Variables
```
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret
ELEVENLABS_WEBHOOK_IPS=34.232.126.174,52.202.195.162,35.173.222.126
```

### Development/Testing
- For local development, use ngrok to expose webhook endpoints
- Webhook URL format: `https://your-ngrok-domain.ngrok.io/api/webhooks/elevenlabs`

## Testing Procedures

### API Key Validation
1. Start the backend server
2. Check logs for successful API calls to ElevenLabs endpoints
3. Validate voice list retrieval

### Webhook Testing
1. Start ngrok tunnel: `ngrok http 3000`
2. Configure webhook in ElevenLabs dashboard with ngrok URL
3. Use test webhook script: `/tmp/test-webhook.sh`
4. Validate webhook receipt in server logs
5. Confirm database entries for test conversations

### Audio Bridge Testing
1. Generate test audio files using `generate-test-audio.js`
2. Run the audio bridge test script: `audio-bridge-test.js`
3. Validate bidirectional audio streaming

## Troubleshooting

### Common Issues
- **403 Forbidden Errors**: Check API key validity and permissions
- **WebSocket Connection Errors**: Verify network connectivity and port availability
- **Audio Format Issues**: Validate audio conversion pipeline
- **Webhook Validation Failures**: Check webhook secret and signature calculation

### Debugging
- Enable debug logging: Set `LOG_LEVEL=debug` in `.env`
- Monitor WebSocket events in audio bridge service
- Check ngrok interface for webhook delivery details

## Next Steps
- Implement additional ElevenLabs webhook event handlers
- Optimize audio processing pipeline for lower latency
- Add more robust error handling and recovery
- Expand metrics and analytics for voice agent performance
