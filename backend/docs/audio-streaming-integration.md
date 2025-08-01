# Real-Time Audio Bridging Integration

This document describes the implementation of real-time audio bridging between SignalWire SIP calls and ElevenLabs AI voice services in the 11Wire AI Dialer platform.

## Overview

The audio bridging system enables bidirectional real-time audio streaming between:
- SignalWire telephony calls (inbound/outbound audio)
- ElevenLabs Speech-to-Text and Text-to-Speech services

This implementation replaces the previous file-based approach where audio was generated, saved as MP3 files, and then played via TwiML, which had higher latency and was not suitable for conversational interactions.

## Architecture

The audio bridging system consists of several components:

1. **WebSocket Server**: Handles connections from SignalWire `<Stream>` TwiML verb
2. **Audio Bridge Service**: Manages sessions and routes audio between systems
3. **Audio Processing Pipeline**: Converts audio formats between systems
4. **Stream Webhook Handler**: Generates TwiML to establish streaming connections
5. **ElevenLabs Integration**: Uses real-time WebSocket APIs for STT and TTS

### Workflow

1. When a call is established, the system instructs SignalWire to stream audio to our WebSocket server
2. The WebSocket server receives audio frames from the call
3. The audio bridge processes these frames and forwards them to ElevenLabs for speech recognition
4. When transcription results are available, they're sent to the ElevenLabs conversational AI
5. AI-generated responses are streamed back to the call via the WebSocket connection

## Implementation Details

### WebSocket Server (`websocket-server.service.js`)

- Initializes a WebSocket server on the `/stream` path
- Manages SignalWire WebSocket connections
- Handles real-time audio streaming using the SignalWire protocol

### Audio Bridge (`audio-bridge.service.js`)

- `AudioBridgeSession` class manages the connection between SignalWire and ElevenLabs
- Handles decoding and processing audio frames
- Maintains conversation context for ongoing calls
- Provides clean shutdown and resource management
- Implements audio format conversion pipeline

### Audio Processing Pipeline

The audio processing pipeline handles format conversion between different audio encodings:

- **Format Detection**: Identifies source audio format (μ-law/a-law/PCM)
- **Codec Conversion**: Converts between μ-law/a-law and PCM
- **Sample Rate Conversion**: Resamples audio (e.g., 8kHz to 16kHz)
- **Bit Depth Conversion**: Converts between different bit depths (8-bit to 16-bit)
- **Channel Management**: Handles mono/stereo channel conversion

SignalWire typically uses μ-law encoded audio at 8kHz, while ElevenLabs expects PCM at 16kHz. The pipeline automatically detects and converts between these formats for seamless integration.

### SignalWire Integration

- Updated `generateTwiML` function to support the `<Stream>` verb
- Added customizable parameters for voice agent selection
- Manages bidirectional audio streaming

### Call Controller Integration

- Added `handleStreamWebhook` endpoint to manage streaming sessions
- Updates call logs with streaming status
- Provides fallback mechanisms for error handling

## Usage

To initiate a call with real-time audio streaming:

1. Make a regular call using the `/api/calls/outbound` endpoint
2. Set the webhook URL to include `/webhook/stream` to enable streaming
3. Specify a voice agent ID in the call metadata

Example:

```json
{
  "to": "+15551234567",
  "from": "+15557654321",
  "voiceAgentId": "eleven_labs_voice_id",
  "webhookUrl": "https://your-domain.com/api/calls/webhook/stream"
}
```

## Session Management

- Each call creates a unique audio bridge session
- Sessions are automatically cleaned up when calls end
- Resources are properly released to prevent memory leaks

## Error Handling and Fallbacks

- If WebSocket connection fails, the system falls back to standard TTS generation
- If ElevenLabs services are unavailable, a fallback message is played
- All errors are logged for troubleshooting

## Performance Considerations

- Audio is streamed in real-time with minimal buffering
- The system handles multiple concurrent calls
- Memory usage scales with the number of active calls

## Security Considerations

- WebSocket connections are secured if HTTPS is used
- API keys are never exposed to clients
- Audio data is encrypted in transit

## Future Improvements

1. Implement advanced noise reduction for better speech recognition
2. Add call analytics based on transcription data
3. Support for multiple language recognition and translation
4. Implement voice activity detection to optimize transcription requests
5. Enhance audio processing with better resampling algorithms (e.g., sinc interpolation instead of nearest-neighbor)

## Related Files

- `websocket-server.service.js`: WebSocket server implementation
- `audio-bridge.service.js`: Audio bridging logic
- `call.controller.js`: Stream webhook handler
- `signalwire.service.js`: TwiML generation with Stream verb
- `call.routes.js`: Route registration for streaming webhook
