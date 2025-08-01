# Call Recordings API Documentation

## Database Model

The `CallRecording` model tracks recordings of calls in the system, including metadata and storage information.

### CallRecording Schema

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| recordingSid | STRING | SignalWire Recording SID (unique) |
| callSid | STRING | Foreign key to call_logs table via callSid |
| status | STRING | Recording status (in-progress, completed, failed) |
| duration | INTEGER | Recording duration in seconds |
| url | STRING | URL to access the recording |
| mediaType | STRING | Media type (audio, video) |
| source | STRING | Source of recording (signalwire, elevenlabs, etc.) |
| channels | INTEGER | Number of audio channels |
| format | STRING | Recording format (wav, mp3, etc.) |
| startTime | DATE | When the recording started |
| endTime | DATE | When the recording ended |
| metadata | JSONB | Additional recording metadata |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

### Associations

- `CallRecording` belongs to `CallLog` via `callSid`
- `CallRecording` may be associated with `Conversation` via `conversationId`

## API Endpoints

### Get All Call Recordings

Retrieves a paginated list of call recordings.

```
GET /api/call-recordings
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `callSid`: Filter by call SID
- `status`: Filter by recording status
- `fromDate`: Filter by start date (ISO format)
- `toDate`: Filter by end date (ISO format)

**Response:**

```json
{
  "success": true,
  "count": 30,
  "total": 120,
  "page": 1,
  "pages": 6,
  "recordings": [
    {
      "id": 1,
      "recordingSid": "RE123456789abcdef",
      "callSid": "CA123456789abcdef",
      "status": "completed",
      "duration": 135,
      "url": "https://api.signalwire.com/recordings/RE123456789abcdef",
      "mediaType": "audio",
      "source": "signalwire",
      "startTime": "2023-07-29T10:15:00Z",
      "endTime": "2023-07-29T10:17:15Z",
      "createdAt": "2023-07-29T10:15:00Z",
      "updatedAt": "2023-07-29T10:17:15Z"
    },
    // More recordings...
  ]
}
```

### Get Recording Details

Retrieves detailed information about a specific recording.

```
GET /api/call-recordings/:id
```

**URL Parameters:**

- `id`: Recording ID or recordingSid

**Response:**

```json
{
  "success": true,
  "recording": {
    "id": 1,
    "recordingSid": "RE123456789abcdef",
    "callSid": "CA123456789abcdef",
    "status": "completed",
    "duration": 135,
    "url": "https://api.signalwire.com/recordings/RE123456789abcdef",
    "mediaType": "audio",
    "source": "signalwire",
    "channels": 2,
    "format": "wav",
    "startTime": "2023-07-29T10:15:00Z",
    "endTime": "2023-07-29T10:17:15Z",
    "metadata": {
      "transcriptionRequested": true,
      "transcriptionStatus": "completed"
    },
    "createdAt": "2023-07-29T10:15:00Z",
    "updatedAt": "2023-07-29T10:17:15Z",
    "call": {
      // Call details if included
    }
  }
}
```

### Start Recording

Initiates recording for an active call.

```
POST /api/call-recordings/start
```

**Request Body:**

```json
{
  "callSid": "CA123456789abcdef",
  "recordingTrack": "both",  // "inbound", "outbound", or "both"
  "recordingOptions": {
    "trim": true,
    "format": "wav"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Recording started",
  "recording": {
    "id": 1,
    "recordingSid": "RE123456789abcdef",
    "callSid": "CA123456789abcdef",
    "status": "in-progress",
    "startTime": "2023-07-29T10:15:00Z",
    // Other recording fields...
  }
}
```

### Stop Recording

Stops an active recording.

```
POST /api/call-recordings/stop
```

**Request Body:**

```json
{
  "recordingSid": "RE123456789abcdef"  // or "callSid": "CA123456789abcdef" to stop all recordings for a call
}
```

**Response:**

```json
{
  "success": true,
  "message": "Recording stopped",
  "recording": {
    "id": 1,
    "recordingSid": "RE123456789abcdef",
    "callSid": "CA123456789abcdef",
    "status": "completed",
    "duration": 135,
    "startTime": "2023-07-29T10:15:00Z",
    "endTime": "2023-07-29T10:17:15Z",
    // Other recording fields...
  }
}
```

### Delete Recording

Deletes a recording.

```
DELETE /api/call-recordings/:id
```

**URL Parameters:**

- `id`: Recording ID or recordingSid

**Response:**

```json
{
  "success": true,
  "message": "Recording deleted successfully"
}
```

### Get Recording Media

Retrieves the media file for a recording.

```
GET /api/call-recordings/:id/media
```

**URL Parameters:**

- `id`: Recording ID or recordingSid

**Response:**

Binary audio file (WAV, MP3, etc.) or redirect to storage URL

### Get Transcription for Recording

Retrieves the transcription for a recording (if available).

```
GET /api/call-recordings/:id/transcription
```

**URL Parameters:**

- `id`: Recording ID or recordingSid

**Response:**

```json
{
  "success": true,
  "transcription": {
    "status": "completed",
    "text": "Hello, this is a sample transcription of the call recording...",
    "segments": [
      {
        "start": 0.0,
        "end": 2.5,
        "text": "Hello, this is a",
        "speaker": "agent"
      },
      {
        "start": 2.5,
        "end": 5.0,
        "text": "sample transcription of",
        "speaker": "caller"
      },
      // More segments...
    ],
    "metadata": {
      "engine": "elevenlabs",
      "confidence": 0.92
    }
  }
}
```

### Request Transcription

Requests a transcription for an existing recording.

```
POST /api/call-recordings/:id/transcription
```

**URL Parameters:**

- `id`: Recording ID or recordingSid

**Request Body:**

```json
{
  "engine": "elevenlabs",  // Optional, transcription engine to use
  "options": {
    "speakerDiarization": true,
    "language": "en-US"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Transcription requested",
  "status": "processing"
}
```

## Integration with SignalWire

The recording API integrates with SignalWire's recording capabilities:

1. **Start Recording**: Initiates recording for an active call
2. **Stop Recording**: Ends an active recording
3. **Access Recordings**: Retrieves recordings via secure URLs
4. **Automatic Processing**: Supports automatic transcription of recordings

## Frontend Integration

To integrate with the frontend:

1. **List Recordings**: Use `/api/call-recordings` to list available recordings
2. **Play Recordings**: Use `/api/call-recordings/:id/media` to stream audio
3. **View Transcripts**: Use `/api/call-recordings/:id/transcription` for text
4. **Manage Recordings**: Use CRUD endpoints for recording management

All endpoints require authentication using the standard authentication middleware.
