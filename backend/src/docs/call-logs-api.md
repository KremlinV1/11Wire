# Call Logs API Documentation

## Database Model

The `CallLog` model tracks detailed information about all calls in the system, including transfer-related data.

### CallLog Schema

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| callSid | STRING | SignalWire Call SID (unique) |
| contactId | INTEGER | Foreign key to contacts table |
| campaignId | STRING | Foreign key to campaigns table |
| direction | ENUM | 'inbound' or 'outbound' |
| from | STRING | Originating phone number |
| to | STRING | Destination phone number |
| status | STRING | Call status (queued, ringing, in-progress, completed, busy, failed, etc.) |
| duration | INTEGER | Call duration in seconds |
| startTime | DATE | When the call started |
| endTime | DATE | When the call ended |
| voiceAgentId | STRING | ElevenLabs voice agent ID used for this call |
| recordingUrl | STRING | URL to call recording (if any) |
| transcription | TEXT | Call transcription (if available) |
| callData | JSONB | Additional call metadata |
| metrics | JSONB | Call performance metrics |
| notes | TEXT | Notes about the call |
| transferStatus | ENUM | 'none', 'requested', 'in-progress', 'completed', 'failed' |
| transferredTo | STRING | Identifier of agent/endpoint call was transferred to |
| transferredFrom | STRING | Identifier of agent/endpoint call was transferred from |
| transferTime | DATE | When the transfer was initiated |
| transferType | ENUM | 'warm' (announced) or 'cold' (direct) |
| transferMetadata | JSONB | Additional data related to the transfer |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

### Associations

- `CallLog` belongs to `Contact` via `contactId`
- `CallLog` belongs to `Campaign` via `campaignId`
- `CallLog` has many `CallRecordings` via `callSid`

## API Endpoints

### Get All Call Logs

Retrieves a paginated list of call logs.

```
GET /api/calls
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `direction`: Filter by direction ('inbound', 'outbound')
- `status`: Filter by call status
- `campaignId`: Filter by campaign ID
- `contactId`: Filter by contact ID
- `fromDate`: Filter by start date (ISO format)
- `toDate`: Filter by end date (ISO format)

**Response:**

```json
{
  "success": true,
  "count": 50,
  "total": 243,
  "page": 1,
  "pages": 13,
  "calls": [
    {
      "id": 1,
      "callSid": "CA123456789abcdef",
      "direction": "outbound",
      "from": "+18005551234",
      "to": "+18005551235",
      "status": "completed",
      "duration": 125,
      "startTime": "2023-07-29T10:15:00Z",
      "endTime": "2023-07-29T10:17:05Z",
      "transferStatus": "none",
      "createdAt": "2023-07-29T10:15:00Z",
      "updatedAt": "2023-07-29T10:17:05Z"
      // Additional fields included based on query params
    },
    // More call logs...
  ]
}
```

### Get Call Log Details

Retrieves detailed information about a specific call.

```
GET /api/calls/:id
```

**URL Parameters:**

- `id`: Call log ID or callSid

**Response:**

```json
{
  "success": true,
  "call": {
    "id": 1,
    "callSid": "CA123456789abcdef",
    "contactId": 42,
    "campaignId": "campaign-123",
    "direction": "outbound",
    "from": "+18005551234",
    "to": "+18005551235",
    "status": "completed",
    "duration": 125,
    "startTime": "2023-07-29T10:15:00Z",
    "endTime": "2023-07-29T10:17:05Z",
    "voiceAgentId": "agent-456",
    "recordingUrl": "https://recordings.example.com/CA123456789abcdef",
    "transcription": "Hello, this is a sample transcription...",
    "callData": {
      "custom": "metadata",
      "agentName": "Sales Bot"
    },
    "metrics": {
      "sentiment": 0.8,
      "talkTime": 115,
      "silenceTime": 10
    },
    "notes": "Customer was interested in pricing",
    "transferStatus": "completed",
    "transferredTo": "+18005557890",
    "transferredFrom": "agent-456",
    "transferTime": "2023-07-29T10:16:30Z",
    "transferType": "warm",
    "transferMetadata": {
      "initiatedBy": "system",
      "reason": "customer requested sales agent"
    },
    "createdAt": "2023-07-29T10:15:00Z",
    "updatedAt": "2023-07-29T10:17:05Z",
    "contact": {
      // Contact details if included
    },
    "campaign": {
      // Campaign details if included
    },
    "recordings": [
      // Call recording details if included
    ]
  }
}
```

### Get Call Statistics

Retrieves statistical information about calls.

```
GET /api/calls/statistics
```

**Query Parameters:**

- `fromDate`: Filter by start date (ISO format)
- `toDate`: Filter by end date (ISO format)
- `campaignId`: Filter by campaign ID

**Response:**

```json
{
  "success": true,
  "statistics": {
    "totalCalls": 243,
    "completedCalls": 210,
    "failedCalls": 33,
    "totalDuration": 28350,
    "averageDuration": 135,
    "callsByDirection": {
      "inbound": 102,
      "outbound": 141
    },
    "callsByStatus": {
      "completed": 210,
      "failed": 15,
      "busy": 5,
      "no-answer": 13
    },
    "callsByDay": [
      {
        "date": "2023-07-28",
        "count": 85
      },
      {
        "date": "2023-07-29",
        "count": 158
      }
    ],
    "transferStatistics": {
      "totalTransfers": 45,
      "completedTransfers": 42,
      "failedTransfers": 3,
      "transfersByType": {
        "warm": 30,
        "cold": 15
      }
    }
  }
}
```

### Update Call Log

Updates an existing call log.

```
PUT /api/calls/:id
```

**URL Parameters:**

- `id`: Call log ID or callSid

**Request Body:**

```json
{
  "status": "completed",
  "duration": 135,
  "endTime": "2023-07-29T10:17:15Z",
  "notes": "Updated notes about the call",
  "callData": {
    "custom": "updated metadata"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Call log updated successfully",
  "call": {
    // Updated call log details
  }
}
```

### Delete Call Log

Deletes a call log.

```
DELETE /api/calls/:id
```

**URL Parameters:**

- `id`: Call log ID or callSid

**Response:**

```json
{
  "success": true,
  "message": "Call log deleted successfully"
}
```
