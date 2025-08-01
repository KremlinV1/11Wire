# ElevenLabs Webhook & STT Testing Documentation

## Overview
This document provides detailed information on testing the ElevenLabs Speech-to-Text (STT) webhook integration with the 11Wire platform, focusing on the async STT workflow and persistent request-to-call mapping.

## Date
Last Updated: July 31, 2025

## Prerequisites
- Backend server running on port 3000
- PostgreSQL database initialized and connected
- Valid ElevenLabs API key in `.env`
- ngrok or similar tunnel for webhook callbacks
- Test audio files in WAV format

## Configuration Requirements

### Environment Variables
```
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret
ELEVENLABS_WEBHOOK_URL=https://your-ngrok-domain.ngrok-free.app/api/webhooks/elevenlabs
```

### Webhook Registration
1. Navigate to ElevenLabs dashboard
2. Register a new webhook with:
   - URL: Your public webhook endpoint (e.g., ngrok URL)
   - Webhook ID: A unique identifier (store this for signature validation)
   - Events: Select `speech_to_text_transcription`
   - Authentication: Enable HMAC and note the signing secret

## Database Schema

The system uses a persistent database model for mapping ElevenLabs request IDs to internal call IDs:

### SttRequestMapping Model
```javascript
// Model definition in src/models/stt-request-mapping.model.js
{
  request_id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  call_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'expired'),
    defaultValue: 'pending'
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  result_received_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}
```

## Testing Procedures

### 1. Standalone Webhook Testing

Use the dedicated test script to simulate the entire webhook flow:

```bash
# Run the webhook test script
node tests/test-elevenlabs-webhook.js
```

#### What This Test Does
1. Generates a unique test call ID
2. Loads test audio from `tests/fixtures/test-audio-8khz.wav`
3. Submits audio to ElevenLabs STT API with webhook configuration
4. Creates a database mapping between the request ID and call ID
5. Waits for the webhook callback
6. Verifies the mapping was updated correctly when the webhook was processed

#### Expected Output
```
🔍 Starting ElevenLabs webhook test...
📝 Using webhook URL: https://your-ngrok-domain.ngrok-free.app/api/webhooks/elevenlabs
🆔 Generated test call ID: test-call-1234567890123
📊 Loaded test audio: XXXXX bytes
📤 Submitting test audio to ElevenLabs STT API...
🔗 API endpoint: https://api.elevenlabs.io/v1/speech-to-text
📝 Metadata: {"test_id":"test_1234567890123","timestamp":"2025-08-01T04:15:17.610Z"}
🔗 Creating database mapping: abc123def456 -> test-call-1234567890123
✅ Database mapping created successfully
✅ API request successful!
📊 Response: {"message":"Request accepted...","request_id":"abc123def456"}
🔔 Now waiting for webhook callback...
...webhook arrives and gets processed...
✅ Webhook received and processed successfully!
📝 Mapping status updated to: completed
⏰ Result received at: Thu Jul 31 2025 23:15:19 GMT-0500
```

### 2. Testing STT Webhook Controller Directly

You can test the webhook controller directly with a simulated webhook payload:

```bash
# Run the webhook simulation test
node tests/elevenlabs-stt-webhook-test.js
```

#### What This Test Does
1. Creates a mapping entry in the database with a test request ID and call ID
2. Simulates an ElevenLabs webhook callback with the request ID
3. Verifies the mapping was retrieved and updated correctly

### 3. Testing Cleanup Process

The system includes an automated cleanup process for old/stale mappings:

```bash
# Run the cleanup process manually
node src/scripts/cleanup-stt-mappings.js
```

#### What This Does
1. Deletes completed mappings older than 7 days
2. Deletes pending mappings older than 1 day
3. Deletes failed mappings older than 3 days
4. Marks pending mappings older than 2 hours as expired

#### Automated Cleanup
The cleanup process runs automatically every 6 hours as part of the scheduled jobs system in `src/services/scheduled-jobs.service.js`.

## Integration Testing with Audio Bridge

To test the full audio bridge integration with SignalWire and ElevenLabs:

```bash
# Run the audio bridge integration test
node tests/audio-bridge-test.js
```

### Audio Format Requirements
- ElevenLabs requires audio in WAV format
- Default format from SignalWire is 8kHz μ-law
- Conversion to 16kHz PCM is performed in the audio bridge service

## Debugging Webhook Issues

### Common Issues and Solutions

#### 1. Webhook Not Received
- Verify ngrok tunnel is active and forwarding requests
- Check ElevenLabs webhook configuration (URL, events)
- Ensure correct permissions on ElevenLabs API key

#### 2. Signature Validation Failures
- Ensure webhook secret matches the one registered with ElevenLabs
- Check webhook ID configuration
- In development mode, signature validation can be bypassed (not recommended for production)

#### 3. Call ID Not Found for Request ID
- Verify database mapping was created before sending audio to ElevenLabs
- Check database connection and model initialization
- Ensure request_id field is correct in both mapping and webhook payload

### Debugging Tools

#### View Database Mappings
```sql
-- Query to view all STT request mappings
SELECT * FROM stt_request_mappings ORDER BY submitted_at DESC LIMIT 10;
```

#### Check Webhook Logs
```bash
# Grep for webhook-related log entries
grep -A 20 "webhook" logs/combined.log | tail -n 100
```

#### Monitor Real-time Webhook Reception
```bash
# Tail logs in real-time
tail -f logs/combined.log | grep "webhook"
```

## Best Practices

1. **Database Mapping**
   - Always create the database mapping before sending audio to ElevenLabs
   - Include metadata that might be useful for debugging or tracking

2. **Error Handling**
   - Implement retries for failed STT submissions
   - Set reasonable timeouts for webhook waiting
   - Track mapping status to identify stalled or expired requests

3. **Testing**
   - Use realistic audio samples for testing
   - Test with different audio languages and durations
   - Verify webhook processing with simulated and real callbacks

4. **Monitoring**
   - Monitor ratio of successful vs. failed/expired mappings
   - Set up alerts for high failure rates or processing delays

## References

- [ElevenLabs Speech-to-Text API Documentation](https://docs.elevenlabs.io/api-reference/speech-to-text)
- [ElevenLabs Webhook Documentation](https://docs.elevenlabs.io/api-reference/webhooks)
- [Internal Documentation: ElevenLabs Integration](./elevenlabs-integration.md)
- [Internal Documentation: SignalWire Integration](./elevenlabs-signalwire-integration.md)
