# Conversations API Documentation

## Database Model

The `Conversation` model represents dialogue exchanges between agents and contacts, including references to calls, transcriptions, and metadata.

### Conversation Schema

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| conversationId | STRING | Unique identifier for the conversation |
| callSid | STRING | Foreign key to call_logs table via callSid |
| contactId | INTEGER | Foreign key to contacts table |
| campaignId | STRING | Foreign key to campaigns table |
| voiceAgentId | STRING | ElevenLabs voice agent ID used for this conversation |
| status | STRING | Conversation status (active, completed, terminated) |
| startTime | DATE | When the conversation started |
| endTime | DATE | When the conversation ended |
| duration | INTEGER | Conversation duration in seconds |
| transcription | TEXT | Full conversation transcription |
| summary | TEXT | AI-generated summary of the conversation |
| sentiment | FLOAT | Overall sentiment score (-1.0 to 1.0) |
| outcomes | JSONB | Tracked outcomes (appointment set, sale made, etc.) |
| metadata | JSONB | Additional conversation metadata |
| contextData | JSONB | Conversation context and state data |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

### Associations

- `Conversation` belongs to `CallLog` via `callSid`
- `Conversation` belongs to `Contact` via `contactId`
- `Conversation` belongs to `Campaign` via `campaignId`
- `Conversation` has many `CallRecordings` via `conversationId`

## API Endpoints

### Get All Conversations

Retrieves a paginated list of conversations.

```
GET /api/conversations
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status
- `campaignId`: Filter by campaign ID
- `contactId`: Filter by contact ID
- `fromDate`: Filter by start date (ISO format)
- `toDate`: Filter by end date (ISO format)
- `voiceAgentId`: Filter by ElevenLabs voice agent ID

**Response:**

```json
{
  "success": true,
  "count": 25,
  "total": 105,
  "page": 1,
  "pages": 6,
  "conversations": [
    {
      "id": 1,
      "conversationId": "conv_123456789abcdef",
      "callSid": "CA123456789abcdef",
      "status": "completed",
      "startTime": "2023-07-29T10:15:00Z",
      "endTime": "2023-07-29T10:17:15Z",
      "duration": 135,
      "summary": "Customer inquired about premium package pricing",
      "sentiment": 0.65,
      "createdAt": "2023-07-29T10:15:00Z",
      "updatedAt": "2023-07-29T10:17:15Z"
    },
    // More conversations...
  ]
}
```

### Get Conversation Details

Retrieves detailed information about a specific conversation.

```
GET /api/conversations/:id
```

**URL Parameters:**

- `id`: Conversation ID or conversationId

**Response:**

```json
{
  "success": true,
  "conversation": {
    "id": 1,
    "conversationId": "conv_123456789abcdef",
    "callSid": "CA123456789abcdef",
    "contactId": 42,
    "campaignId": "campaign-123",
    "voiceAgentId": "agent-456",
    "status": "completed",
    "startTime": "2023-07-29T10:15:00Z",
    "endTime": "2023-07-29T10:17:15Z",
    "duration": 135,
    "transcription": "Agent: Hello, this is AI Assistant. How can I help you today?\nCaller: I'm interested in your premium package...",
    "summary": "Customer inquired about premium package pricing. Was interested in monthly payment plans.",
    "sentiment": 0.65,
    "outcomes": {
      "appointmentSet": true,
      "callbackRequested": false,
      "leadQualified": true
    },
    "metadata": {
      "transferredToAgent": true,
      "customerIntent": "pricing_inquiry"
    },
    "contextData": {
      "previousInteractions": 2,
      "referredBy": "google_ads"
    },
    "createdAt": "2023-07-29T10:15:00Z",
    "updatedAt": "2023-07-29T10:17:15Z",
    "contact": {
      // Contact details if included
    },
    "campaign": {
      // Campaign details if included
    },
    "call": {
      // Call details if included
    },
    "recordings": [
      // Recording details if included
    ]
  }
}
```

### Create Conversation

Creates a new conversation.

```
POST /api/conversations
```

**Request Body:**

```json
{
  "callSid": "CA123456789abcdef",
  "contactId": 42,
  "campaignId": "campaign-123",
  "voiceAgentId": "agent-456",
  "status": "active",
  "startTime": "2023-07-29T10:15:00Z",
  "metadata": {
    "initialContext": "Returning customer",
    "priority": "high"
  },
  "contextData": {
    "previousInteractions": 2,
    "referredBy": "google_ads"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Conversation created successfully",
  "conversation": {
    "id": 1,
    "conversationId": "conv_123456789abcdef",
    "callSid": "CA123456789abcdef",
    "status": "active",
    "startTime": "2023-07-29T10:15:00Z",
    // Other conversation fields...
    "createdAt": "2023-07-29T10:15:00Z",
    "updatedAt": "2023-07-29T10:15:00Z"
  }
}
```

### Update Conversation

Updates an existing conversation.

```
PUT /api/conversations/:id
```

**URL Parameters:**

- `id`: Conversation ID or conversationId

**Request Body:**

```json
{
  "status": "completed",
  "endTime": "2023-07-29T10:17:15Z",
  "duration": 135,
  "transcription": "Agent: Hello, this is AI Assistant. How can I help you today?\nCaller: I'm interested in your premium package...",
  "summary": "Customer inquired about premium package pricing. Was interested in monthly payment plans.",
  "sentiment": 0.65,
  "outcomes": {
    "appointmentSet": true,
    "callbackRequested": false,
    "leadQualified": true
  },
  "contextData": {
    "previousInteractions": 2,
    "referredBy": "google_ads",
    "nextAction": "follow_up_email"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Conversation updated successfully",
  "conversation": {
    // Updated conversation details
  }
}
```

### Delete Conversation

Deletes a conversation.

```
DELETE /api/conversations/:id
```

**URL Parameters:**

- `id`: Conversation ID or conversationId

**Response:**

```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

### Get Conversation Analytics

Retrieves analytics and insights for conversations.

```
GET /api/conversations/analytics
```

**Query Parameters:**

- `campaignId`: Filter by campaign ID
- `fromDate`: Filter by start date (ISO format)
- `toDate`: Filter by end date (ISO format)
- `voiceAgentId`: Filter by ElevenLabs voice agent ID

**Response:**

```json
{
  "success": true,
  "analytics": {
    "totalConversations": 105,
    "averageDuration": 142,
    "sentimentDistribution": {
      "positive": 65,
      "neutral": 25,
      "negative": 15
    },
    "outcomes": {
      "appointmentSet": 42,
      "callbackRequested": 18,
      "leadQualified": 78
    },
    "commonTopics": [
      {
        "topic": "pricing",
        "occurrences": 58
      },
      {
        "topic": "product_features",
        "occurrences": 37
      },
      {
        "topic": "support",
        "occurrences": 25
      }
    ],
    "trendsOverTime": [
      {
        "date": "2023-07-28",
        "conversationCount": 45,
        "averageSentiment": 0.62
      },
      {
        "date": "2023-07-29",
        "conversationCount": 60,
        "averageSentiment": 0.58
      }
    ]
  }
}
```

### Get Conversation Transcript

Retrieves the full transcript for a conversation.

```
GET /api/conversations/:id/transcript
```

**URL Parameters:**

- `id`: Conversation ID or conversationId

**Query Parameters:**

- `format`: Output format (default: 'json', options: 'json', 'text', 'html')

**Response (JSON format):**

```json
{
  "success": true,
  "transcript": {
    "conversationId": "conv_123456789abcdef",
    "duration": 135,
    "participants": ["Agent", "Customer"],
    "turns": [
      {
        "speaker": "Agent",
        "text": "Hello, this is AI Assistant. How can I help you today?",
        "timestamp": "2023-07-29T10:15:05Z",
        "confidence": 0.98
      },
      {
        "speaker": "Customer",
        "text": "I'm interested in your premium package. Can you tell me about the pricing?",
        "timestamp": "2023-07-29T10:15:12Z",
        "confidence": 0.95
      },
      // More dialogue turns...
    ]
  }
}
```

## Integration with Call Transfers

The Conversations API works with the Call Transfer API to maintain context during transfers:

1. When a call is transferred, the conversation context can be preserved
2. The `contextData` field stores state that can be passed to human agents
3. Both original and transferred conversations are linked via metadata

## Frontend Integration

To integrate with the frontend:

1. **List Conversations**: Use `/api/conversations` to list available conversations
2. **View Details**: Use `/api/conversations/:id` to get full conversation context
3. **Review Transcripts**: Use `/api/conversations/:id/transcript` for dialogue
4. **Analyze Performance**: Use `/api/conversations/analytics` for insights

All endpoints require authentication using the standard authentication middleware.
