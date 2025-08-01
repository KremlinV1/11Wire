# Webhook API Documentation

## Overview

The Webhook API provides functionality for handling incoming webhooks from third-party services (like SignalWire and ElevenLabs) and for sending outbound webhook events to configured endpoints.

## Webhook Models

### WebhookConfig Model

Stores configuration for outbound webhooks.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| name | STRING | Name of the webhook configuration |
| url | STRING | Destination URL for webhook delivery |
| secret | STRING | Secret key for webhook signature verification |
| eventTypes | ARRAY | Array of event types to trigger this webhook |
| status | STRING | Status (active, inactive) |
| headers | JSONB | Custom headers to include with webhook requests |
| retryConfig | JSONB | Configuration for retry attempts |
| filters | JSONB | Event filters (e.g., by campaign, by agent) |
| metadata | JSONB | Additional webhook metadata |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

### WebhookEvent Model

Stores records of webhook events sent and received.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| direction | STRING | Direction (inbound, outbound) |
| source | STRING | Event source (signalwire, elevenlabs, etc.) |
| eventType | STRING | Type of event |
| payload | JSONB | Event payload data |
| status | STRING | Status (delivered, failed, pending) |
| attempts | INTEGER | Number of delivery attempts for outbound |
| webhookConfigId | INTEGER | ID of associated webhook config (if outbound) |
| responseData | JSONB | Response received from destination (if outbound) |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

## Inbound Webhook Endpoints

### SignalWire Webhook Handler

Receives and processes webhooks from SignalWire.

```
POST /api/webhooks/signalwire
```

**Security:**

This endpoint validates the signature using the SignalWire validation scheme. It verifies:
- Signature header against the shared secret
- Source IP against SignalWire's IP ranges (in production)

**Request Body:**

The body contains SignalWire event data in JSON format. Example for a call.created event:

```json
{
  "event_type": "call.created",
  "timestamp": "2023-07-29T15:00:00Z",
  "call_id": "CA123456789abcdef",
  "direction": "outbound",
  "from": "+18005551234",
  "to": "+18005557890",
  "state": "created",
  "metadata": {
    "campaignId": "campaign-123",
    "contactId": 42
  },
  // Additional call details...
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook received and processed"
}
```

### ElevenLabs Webhook Handler

Receives and processes webhooks from ElevenLabs.

```
POST /api/webhooks/elevenlabs
```

**Security:**

This endpoint validates:
- Signature header against the ElevenLabs secret
- Source IP against ElevenLabs' IP ranges (in production)

**Request Body:**

The body contains ElevenLabs event data in JSON format. Example:

```json
{
  "event_type": "voice.completed",
  "timestamp": "2023-07-29T15:05:00Z",
  "voice_id": "voice-123",
  "agent_id": "agent-456",
  "call_id": "CA123456789abcdef",
  "duration": 15.5,
  "metadata": {
    "campaignId": "campaign-123",
    "contactId": 42
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook received and processed"
}
```

## Outbound Webhook Configuration

### Get All Webhook Configurations

Retrieves a list of configured outbound webhooks.

```
GET /api/webhooks/config
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "webhooks": [
    {
      "id": 1,
      "name": "CRM Integration",
      "url": "https://example-crm.com/api/webhooks/11wire",
      "eventTypes": ["call.completed", "conversation.completed"],
      "status": "active",
      "createdAt": "2023-07-15T10:00:00Z",
      "updatedAt": "2023-07-29T14:00:00Z"
    },
    {
      "id": 2,
      "name": "Analytics Platform",
      "url": "https://analytics.example.com/ingest",
      "eventTypes": ["call.created", "call.completed", "conversation.completed"],
      "status": "active",
      "createdAt": "2023-07-20T11:00:00Z",
      "updatedAt": "2023-07-29T14:30:00Z"
    }
    // More webhook configs...
  ]
}
```

### Get Webhook Configuration Details

Retrieves details about a specific webhook configuration.

```
GET /api/webhooks/config/:id
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "webhook": {
    "id": 1,
    "name": "CRM Integration",
    "url": "https://example-crm.com/api/webhooks/11wire",
    "eventTypes": ["call.completed", "conversation.completed"],
    "status": "active",
    "headers": {
      "X-API-Key": "crm-api-key-123"
    },
    "retryConfig": {
      "maxAttempts": 5,
      "initialDelay": 30,
      "maxDelay": 3600,
      "backoffFactor": 2
    },
    "filters": {
      "campaigns": ["campaign-123", "campaign-456"],
      "outcomes": ["appointment_set", "call_back"]
    },
    "metadata": {
      "owner": "sales-team",
      "priority": "high"
    },
    "createdAt": "2023-07-15T10:00:00Z",
    "updatedAt": "2023-07-29T14:00:00Z"
  }
}
```

### Create Webhook Configuration

Creates a new webhook configuration.

```
POST /api/webhooks/config
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "name": "Marketing Platform",
  "url": "https://marketing.example.com/webhooks/11wire",
  "secret": "webhooksecret123",
  "eventTypes": ["call.completed", "conversation.completed"],
  "status": "active",
  "headers": {
    "X-API-Key": "marketing-api-key-456"
  },
  "retryConfig": {
    "maxAttempts": 3,
    "initialDelay": 60,
    "maxDelay": 1800,
    "backoffFactor": 2
  },
  "filters": {
    "campaigns": ["campaign-789"],
    "outcomes": ["lead_qualified"]
  },
  "metadata": {
    "owner": "marketing-team",
    "priority": "medium"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook configuration created successfully",
  "webhook": {
    "id": 3,
    "name": "Marketing Platform",
    // Other webhook fields...
    "createdAt": "2023-07-29T16:00:00Z",
    "updatedAt": "2023-07-29T16:00:00Z"
  }
}
```

### Update Webhook Configuration

Updates an existing webhook configuration.

```
PUT /api/webhooks/config/:id
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "name": "Marketing Platform - Updated",
  "url": "https://new-marketing.example.com/webhooks/11wire",
  "status": "active",
  "eventTypes": ["call.created", "call.completed", "conversation.completed"],
  "filters": {
    "campaigns": ["campaign-789", "campaign-101"],
    "outcomes": ["lead_qualified", "appointment_set"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook configuration updated successfully",
  "webhook": {
    // Updated webhook details
  }
}
```

### Delete Webhook Configuration

Deletes a webhook configuration.

```
DELETE /api/webhooks/config/:id
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook configuration deleted successfully"
}
```

### Test Webhook Configuration

Tests a webhook configuration by sending a sample event.

```
POST /api/webhooks/config/:id/test
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "eventType": "call.completed",  // Must be one of the eventTypes configured
  "testPayload": {  // Optional custom payload
    "callId": "test-call-123",
    "duration": 120,
    "outcome": "appointment_set"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Test webhook sent successfully",
  "details": {
    "statusCode": 200,
    "responseBody": "Received",
    "responseTime": 245,  // milliseconds
    "eventId": "evt_test_123456"
  }
}
```

## Webhook Event History

### Get Webhook Event History

Retrieves a paginated list of webhook events.

```
GET /api/webhooks/events
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `direction`: Filter by direction ('inbound' or 'outbound')
- `source`: Filter by source
- `eventType`: Filter by event type
- `status`: Filter by status
- `fromDate`: Filter by start date (ISO format)
- `toDate`: Filter by end date (ISO format)

**Response:**

```json
{
  "success": true,
  "count": 20,
  "total": 156,
  "page": 1,
  "pages": 8,
  "events": [
    {
      "id": 1,
      "direction": "inbound",
      "source": "signalwire",
      "eventType": "call.completed",
      "status": "processed",
      "payload": {
        "call_id": "CA123456789abcdef",
        "direction": "outbound",
        "from": "+18005551234",
        "to": "+18005557890",
        "state": "completed",
        "duration": 125
      },
      "createdAt": "2023-07-29T10:17:05Z",
      "updatedAt": "2023-07-29T10:17:06Z"
    },
    {
      "id": 2,
      "direction": "outbound",
      "source": "11wire",
      "eventType": "call.completed",
      "status": "delivered",
      "webhookConfigId": 1,
      "attempts": 1,
      "payload": {
        "callId": "CA123456789abcdef",
        "direction": "outbound",
        "from": "+18005551234",
        "to": "+18005557890",
        "status": "completed",
        "duration": 125,
        "startTime": "2023-07-29T10:15:00Z",
        "endTime": "2023-07-29T10:17:05Z",
        "campaignId": "campaign-123",
        "contactId": 42,
        "outcomes": {
          "appointmentSet": true,
          "leadQualified": true
        }
      },
      "responseData": {
        "statusCode": 200,
        "body": "Received",
        "headers": {
          "content-type": "application/json",
          "server": "nginx/1.18.0"
        }
      },
      "createdAt": "2023-07-29T10:17:10Z",
      "updatedAt": "2023-07-29T10:17:12Z"
    },
    // More webhook events...
  ]
}
```

### Get Webhook Event Details

Retrieves details about a specific webhook event.

```
GET /api/webhooks/events/:id
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "event": {
    "id": 2,
    "direction": "outbound",
    "source": "11wire",
    "eventType": "call.completed",
    "status": "delivered",
    "webhookConfigId": 1,
    "attempts": 1,
    "payload": {
      "callId": "CA123456789abcdef",
      "direction": "outbound",
      "from": "+18005551234",
      "to": "+18005557890",
      "status": "completed",
      "duration": 125,
      "startTime": "2023-07-29T10:15:00Z",
      "endTime": "2023-07-29T10:17:05Z",
      "campaignId": "campaign-123",
      "contactId": 42,
      "outcomes": {
        "appointmentSet": true,
        "leadQualified": true
      },
      "metadata": {
        "transferredToAgent": false,
        "voicemailLeft": false
      }
    },
    "responseData": {
      "statusCode": 200,
      "body": "Received",
      "headers": {
        "content-type": "application/json",
        "server": "nginx/1.18.0",
        "date": "Sat, 29 Jul 2023 10:17:12 GMT",
        "connection": "close"
      },
      "timing": 245
    },
    "createdAt": "2023-07-29T10:17:10Z",
    "updatedAt": "2023-07-29T10:17:12Z"
  },
  "webhookConfig": {
    // Related webhook configuration if applicable
    "id": 1,
    "name": "CRM Integration",
    "url": "https://example-crm.com/api/webhooks/11wire"
  }
}
```

### Retry Failed Webhook

Retries sending a previously failed outbound webhook.

```
POST /api/webhooks/events/:id/retry
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook delivery retry queued",
  "event": {
    "id": 5,
    "status": "pending",
    "attempts": 2,
    "updatedAt": "2023-07-29T16:30:00Z"
    // Other event fields...
  }
}
```

## Supported Event Types

The webhook system supports the following event types:

### SignalWire Events

- `call.created`: When a new call is created
- `call.ringing`: When a call starts ringing
- `call.answered`: When a call is answered
- `call.completed`: When a call is completed
- `recording.started`: When call recording starts
- `recording.completed`: When call recording completes

### ElevenLabs Events

- `voice.processing`: When voice processing starts
- `voice.completed`: When voice processing completes
- `agent.ready`: When an AI agent is ready
- `agent.speaking`: When an AI agent is speaking
- `agent.listening`: When an AI agent is listening
- `agent.error`: When an AI agent encounters an error

### 11Wire Events

- `conversation.started`: When a conversation starts
- `conversation.completed`: When a conversation completes
- `transfer.initiated`: When a call transfer is initiated
- `transfer.completed`: When a call transfer completes
- `contact.created`: When a new contact is created
- `campaign.started`: When a campaign starts
- `campaign.completed`: When a campaign completes

## Security Measures

The webhook system implements several security measures:

1. **Inbound Verification**: Validates signatures and source IPs for inbound webhooks
2. **Outbound Signing**: Signs outbound webhooks with a secret key for verification
3. **Retry Logic**: Implements exponential backoff for failed webhook deliveries
4. **IP Whitelisting**: Restricts inbound webhooks to known IP ranges in production
5. **Request Logging**: Records all webhook attempts for audit purposes

## Frontend Integration

To integrate with the frontend:

1. **Configuration Management**: Use CRUD endpoints to manage webhook configurations
2. **Event Monitoring**: Use event history endpoints to view webhook activity
3. **Testing Interface**: Use test endpoint to verify webhook delivery
4. **Debugging**: Use event details to troubleshoot failed deliveries

All endpoints require authentication using the standard authentication middleware.
