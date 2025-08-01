# Campaigns API Documentation

## Database Model

The `Campaign` model represents outbound calling campaigns with specific configurations and targets.

### Campaign Schema

| Field | Type | Description |
|-------|------|-------------|
| id | STRING | Primary key, unique identifier |
| name | STRING | Campaign name |
| description | TEXT | Campaign description |
| status | STRING | Campaign status (draft, active, paused, completed, canceled) |
| startDate | DATE | When the campaign starts |
| endDate | DATE | When the campaign ends |
| timezone | STRING | Campaign timezone |
| dailyStartTime | STRING | Daily start time (HH:MM format) |
| dailyEndTime | STRING | Daily end time (HH:MM format) |
| phoneNumberId | STRING | SignalWire phone number ID to use for calls |
| phoneNumber | STRING | Phone number in E.164 format |
| voiceAgentId | STRING | ElevenLabs voice agent ID for this campaign |
| agentConfig | JSONB | Voice agent configuration |
| maxConcurrentCalls | INTEGER | Maximum concurrent calls allowed |
| callAttemptsPerContact | INTEGER | Maximum attempts per contact |
| retryDelay | INTEGER | Delay between retry attempts (minutes) |
| scheduleType | STRING | Scheduling type (immediate, scheduled) |
| scheduleConfig | JSONB | Advanced scheduling configuration |
| callbackConfig | JSONB | Configuration for handling callbacks |
| transferConfig | JSONB | Configuration for handling transfers |
| tags | ARRAY | Array of tags/labels for the campaign |
| metadata | JSONB | Additional campaign metadata |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

### Associations

- `Campaign` has many `Contacts`
- `Campaign` has many `CallLogs`
- `Campaign` has many `Conversations`

## API Endpoints

### Get All Campaigns

Retrieves a paginated list of campaigns.

```
GET /api/campaigns
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by campaign status
- `search`: Search by name or description
- `sortBy`: Sort field (default: 'createdAt')
- `sortDir`: Sort direction ('asc' or 'desc', default: 'desc')

**Response:**

```json
{
  "success": true,
  "count": 10,
  "total": 28,
  "page": 1,
  "pages": 3,
  "campaigns": [
    {
      "id": "campaign-123",
      "name": "Q3 Sales Outreach",
      "description": "Sales outreach for Q3 leads",
      "status": "active",
      "startDate": "2023-07-01T00:00:00Z",
      "endDate": "2023-09-30T23:59:59Z",
      "phoneNumber": "+18005551234",
      "voiceAgentId": "agent-456",
      "maxConcurrentCalls": 10,
      "createdAt": "2023-06-25T14:30:00Z",
      "updatedAt": "2023-07-29T10:15:00Z"
    },
    // More campaigns...
  ]
}
```

### Get Campaign Details

Retrieves detailed information about a specific campaign.

```
GET /api/campaigns/:id
```

**URL Parameters:**

- `id`: Campaign ID

**Response:**

```json
{
  "success": true,
  "campaign": {
    "id": "campaign-123",
    "name": "Q3 Sales Outreach",
    "description": "Sales outreach for Q3 leads",
    "status": "active",
    "startDate": "2023-07-01T00:00:00Z",
    "endDate": "2023-09-30T23:59:59Z",
    "timezone": "America/Chicago",
    "dailyStartTime": "09:00",
    "dailyEndTime": "17:00",
    "phoneNumberId": "pn_123456789abcdef",
    "phoneNumber": "+18005551234",
    "voiceAgentId": "agent-456",
    "agentConfig": {
      "voice": "male-professional",
      "script": "sales-script-v2",
      "languages": ["en-US"],
      "fallbackAgentId": "agent-789"
    },
    "maxConcurrentCalls": 10,
    "callAttemptsPerContact": 3,
    "retryDelay": 60,
    "scheduleType": "scheduled",
    "scheduleConfig": {
      "daysOfWeek": [1, 2, 3, 4, 5],  // Monday to Friday
      "excludeDates": ["2023-07-04"]
    },
    "callbackConfig": {
      "enabled": true,
      "maxAttempts": 2,
      "delayMinutes": 30
    },
    "transferConfig": {
      "enabled": true,
      "transferTargets": [
        {
          "name": "Sales Team",
          "number": "+18005557890",
          "type": "phone"
        },
        {
          "name": "Support Team",
          "endpoint": "sip:support@example.com",
          "type": "sip"
        }
      ]
    },
    "tags": ["sales", "outreach", "q3-2023"],
    "metadata": {
      "department": "Sales",
      "priority": "high",
      "goalCompletionRate": 0.75
    },
    "createdAt": "2023-06-25T14:30:00Z",
    "updatedAt": "2023-07-29T10:15:00Z",
    "stats": {
      "totalContacts": 250,
      "contactedCount": 125,
      "completedCount": 100,
      "failedCount": 25,
      "callbackCount": 15,
      "transferCount": 30
    }
  }
}
```

### Create Campaign

Creates a new campaign.

```
POST /api/campaigns
```

**Request Body:**

```json
{
  "name": "Q4 Sales Outreach",
  "description": "Sales outreach for Q4 leads",
  "status": "draft",
  "startDate": "2023-10-01T00:00:00Z",
  "endDate": "2023-12-31T23:59:59Z",
  "timezone": "America/Chicago",
  "dailyStartTime": "09:00",
  "dailyEndTime": "17:00",
  "phoneNumberId": "pn_123456789abcdef",
  "phoneNumber": "+18005551234",
  "voiceAgentId": "agent-456",
  "agentConfig": {
    "voice": "male-professional",
    "script": "sales-script-v3",
    "languages": ["en-US"],
    "fallbackAgentId": "agent-789"
  },
  "maxConcurrentCalls": 10,
  "callAttemptsPerContact": 3,
  "retryDelay": 60,
  "scheduleType": "scheduled",
  "scheduleConfig": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "excludeDates": ["2023-12-25", "2023-12-26"]
  },
  "callbackConfig": {
    "enabled": true,
    "maxAttempts": 2,
    "delayMinutes": 30
  },
  "transferConfig": {
    "enabled": true,
    "transferTargets": [
      {
        "name": "Sales Team",
        "number": "+18005557890",
        "type": "phone"
      },
      {
        "name": "Support Team",
        "endpoint": "sip:support@example.com",
        "type": "sip"
      }
    ]
  },
  "tags": ["sales", "outreach", "q4-2023"],
  "metadata": {
    "department": "Sales",
    "priority": "high",
    "goalCompletionRate": 0.8
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Campaign created successfully",
  "campaign": {
    "id": "campaign-456",
    "name": "Q4 Sales Outreach",
    // Other campaign fields...
    "createdAt": "2023-07-29T15:00:00Z",
    "updatedAt": "2023-07-29T15:00:00Z"
  }
}
```

### Update Campaign

Updates an existing campaign.

```
PUT /api/campaigns/:id
```

**URL Parameters:**

- `id`: Campaign ID

**Request Body:**

```json
{
  "name": "Q4 Sales Outreach - Updated",
  "description": "Updated description",
  "status": "active",
  "maxConcurrentCalls": 15,
  "callAttemptsPerContact": 4,
  "agentConfig": {
    "voice": "female-professional",
    "script": "sales-script-v3.1",
    "languages": ["en-US"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Campaign updated successfully",
  "campaign": {
    // Updated campaign details
  }
}
```

### Delete Campaign

Deletes a campaign.

```
DELETE /api/campaigns/:id
```

**URL Parameters:**

- `id`: Campaign ID

**Response:**

```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

### Campaign Statistics

Retrieves statistical information about a campaign.

```
GET /api/campaigns/:id/statistics
```

**URL Parameters:**

- `id`: Campaign ID

**Query Parameters:**

- `fromDate`: Filter by start date (ISO format)
- `toDate`: Filter by end date (ISO format)

**Response:**

```json
{
  "success": true,
  "campaignId": "campaign-123",
  "statistics": {
    "contactMetrics": {
      "totalContacts": 250,
      "contactedCount": 125,
      "contactedPercentage": 50.0,
      "remainingCount": 125,
      "activeCount": 25
    },
    "callMetrics": {
      "totalCalls": 150,
      "completedCalls": 100,
      "failedCalls": 25,
      "callbacksScheduled": 15,
      "transfersInitiated": 30,
      "transfersCompleted": 28,
      "averageCallDuration": 142,
      "averageWaitTime": 2.5
    },
    "timeMetrics": {
      "campaignDuration": {
        "total": "30 days",
        "elapsed": "15 days",
        "remaining": "15 days"
      },
      "callTimeDistribution": {
        "morning": 45,
        "afternoon": 65,
        "evening": 40
      },
      "peakCallHours": [
        {
          "hour": 10,
          "count": 25
        },
        {
          "hour": 14,
          "count": 30
        }
      ]
    },
    "outcomesMetrics": {
      "successfulOutcomes": 80,
      "callbackRequests": 15,
      "transferredToAgent": 28,
      "voicemails": 10,
      "noAnswers": 15,
      "conversionRate": 53.3
    },
    "performanceTrend": [
      {
        "date": "2023-07-15",
        "calls": 25,
        "successRate": 60.0
      },
      {
        "date": "2023-07-16",
        "calls": 30,
        "successRate": 66.7
      },
      // More daily stats...
    ]
  }
}
```

### Campaign Contacts

Retrieves contacts associated with a campaign.

```
GET /api/campaigns/:id/contacts
```

**URL Parameters:**

- `id`: Campaign ID

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by contact status
- `search`: Search by name, email, or phone

**Response:**

```json
{
  "success": true,
  "campaignId": "campaign-123",
  "count": 20,
  "total": 250,
  "page": 1,
  "pages": 13,
  "contacts": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+18005551234",
      "email": "john.doe@example.com",
      "status": "contacted",
      // Other contact fields...
    },
    // More contacts...
  ]
}
```

### Start Campaign

Activates and starts a campaign.

```
POST /api/campaigns/:id/start
```

**URL Parameters:**

- `id`: Campaign ID

**Response:**

```json
{
  "success": true,
  "message": "Campaign started successfully",
  "status": "active",
  "startedAt": "2023-07-29T15:30:00Z"
}
```

### Pause Campaign

Temporarily pauses an active campaign.

```
POST /api/campaigns/:id/pause
```

**URL Parameters:**

- `id`: Campaign ID

**Request Body:**

```json
{
  "reason": "Holiday break"  // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Campaign paused successfully",
  "status": "paused",
  "pausedAt": "2023-07-29T16:00:00Z"
}
```

### Resume Campaign

Resumes a paused campaign.

```
POST /api/campaigns/:id/resume
```

**URL Parameters:**

- `id`: Campaign ID

**Response:**

```json
{
  "success": true,
  "message": "Campaign resumed successfully",
  "status": "active",
  "resumedAt": "2023-07-29T17:00:00Z"
}
```

### End Campaign

Completes and ends a campaign.

```
POST /api/campaigns/:id/end
```

**URL Parameters:**

- `id`: Campaign ID

**Request Body:**

```json
{
  "reason": "Campaign goals met"  // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Campaign ended successfully",
  "status": "completed",
  "endedAt": "2023-07-29T18:00:00Z"
}
```

## Frontend Integration

To integrate with the frontend:

1. **Dashboard**: Use campaign statistics endpoints to build dashboards
2. **Campaign Management**: Use CRUD endpoints to manage campaigns
3. **Contact Assignment**: Associate contacts with campaigns
4. **Campaign Control**: Use start/pause/resume/end endpoints for campaign flow control
5. **Performance Monitoring**: Use statistics endpoints for real-time monitoring

All endpoints require authentication using the standard authentication middleware.
