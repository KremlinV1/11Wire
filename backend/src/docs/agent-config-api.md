# Agent Configuration API Documentation

## Database Model

The `AgentConfig` model stores configuration details for ElevenLabs AI voice agents used in the system.

### AgentConfig Schema

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| agentId | STRING | Unique ElevenLabs voice agent ID |
| name | STRING | Human-readable name of the agent |
| voiceId | STRING | ElevenLabs voice ID |
| description | TEXT | Description of the agent |
| type | STRING | Agent type (sales, support, information, etc.) |
| status | STRING | Agent status (active, inactive) |
| languages | ARRAY | Supported language codes (e.g., ["en-US", "es-ES"]) |
| defaultScript | TEXT | Default conversation script |
| scriptVariables | JSONB | Variables available for script customization |
| fallbackAgentId | STRING | ID of fallback agent if this one fails |
| contextConfig | JSONB | Configuration for context handling |
| transferConfig | JSONB | Configuration for transfers |
| voicemailConfig | JSONB | Configuration for voicemail handling |
| metrics | JSONB | Performance metrics for the agent |
| settings | JSONB | Additional agent settings |
| metadata | JSONB | Agent metadata |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

## API Endpoints

### Get All Configured Agents

Retrieves a paginated list of configured agents.

```
GET /api/agents
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by agent status
- `type`: Filter by agent type
- `search`: Search by name or description

**Response:**

```json
{
  "success": true,
  "count": 8,
  "total": 15,
  "page": 1,
  "pages": 2,
  "agents": [
    {
      "id": 1,
      "agentId": "agent-123",
      "name": "Sales Representative",
      "voiceId": "voice-456",
      "type": "sales",
      "status": "active",
      "languages": ["en-US"],
      "createdAt": "2023-07-15T10:00:00Z",
      "updatedAt": "2023-07-29T14:00:00Z"
    },
    // More agents...
  ]
}
```

### Get Agent Details

Retrieves detailed information about a specific agent configuration.

```
GET /api/agents/:id
```

**URL Parameters:**

- `id`: Agent ID (database ID or ElevenLabs agentId)

**Response:**

```json
{
  "success": true,
  "agent": {
    "id": 1,
    "agentId": "agent-123",
    "name": "Sales Representative",
    "voiceId": "voice-456",
    "description": "AI agent for outbound sales calls",
    "type": "sales",
    "status": "active",
    "languages": ["en-US", "en-GB"],
    "defaultScript": "Hi, this is {agent_name} from {company_name}. I'm calling about {product_name}...",
    "scriptVariables": {
      "agent_name": "Alex",
      "company_name": "11Wire",
      "product_name": "AI Dialer"
    },
    "fallbackAgentId": "agent-789",
    "contextConfig": {
      "memoryDuration": 86400,
      "importantTopics": ["pricing", "features", "support"],
      "sentimentTracking": true
    },
    "transferConfig": {
      "enabled": true,
      "transferThreshold": 0.7,
      "transferTargets": [
        {
          "name": "Sales Team",
          "number": "+18005551234",
          "priority": 1
        },
        {
          "name": "Support Team",
          "number": "+18005557890",
          "priority": 2
        }
      ]
    },
    "voicemailConfig": {
      "enabled": true,
      "detectionEnabled": true,
      "leaveMessage": true,
      "message": "Sorry I missed you. I'll try again later or you can call us back at {callback_number}.",
      "variables": {
        "callback_number": "+18005551234"
      }
    },
    "metrics": {
      "successRate": 0.75,
      "averageCallDuration": 142,
      "transferRate": 0.15,
      "callbackRate": 0.08
    },
    "settings": {
      "speechRate": 1.0,
      "interruptible": true,
      "maxTurnDuration": 20,
      "silenceThreshold": 2.5
    },
    "metadata": {
      "creator": "admin",
      "version": "1.2",
      "trainedOn": "2023-06-15"
    },
    "createdAt": "2023-07-15T10:00:00Z",
    "updatedAt": "2023-07-29T14:00:00Z"
  }
}
```

### Create Agent Configuration

Creates a new agent configuration.

```
POST /api/agents
```

**Request Body:**

```json
{
  "agentId": "agent-456",
  "name": "Customer Support Agent",
  "voiceId": "voice-789",
  "description": "AI agent for customer support calls",
  "type": "support",
  "status": "active",
  "languages": ["en-US", "es-ES"],
  "defaultScript": "Hello, this is {agent_name} from {company_name} customer support. How can I help you today?",
  "scriptVariables": {
    "agent_name": "Sam",
    "company_name": "11Wire"
  },
  "fallbackAgentId": "agent-123",
  "contextConfig": {
    "memoryDuration": 86400,
    "importantTopics": ["technical issues", "billing", "returns"],
    "sentimentTracking": true
  },
  "transferConfig": {
    "enabled": true,
    "transferThreshold": 0.6,
    "transferTargets": [
      {
        "name": "Technical Support",
        "number": "+18005552345",
        "priority": 1
      },
      {
        "name": "Billing Department",
        "number": "+18005553456",
        "priority": 2
      }
    ]
  },
  "voicemailConfig": {
    "enabled": true,
    "detectionEnabled": true,
    "leaveMessage": true,
    "message": "Sorry I missed you. Please call our support line at {support_number} for assistance.",
    "variables": {
      "support_number": "+18005552345"
    }
  },
  "settings": {
    "speechRate": 0.9,
    "interruptible": true,
    "maxTurnDuration": 30,
    "silenceThreshold": 3.0
  },
  "metadata": {
    "creator": "admin",
    "version": "1.0",
    "trainedOn": "2023-07-15"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Agent configuration created successfully",
  "agent": {
    "id": 2,
    "agentId": "agent-456",
    "name": "Customer Support Agent",
    // Other agent fields...
    "createdAt": "2023-07-29T15:30:00Z",
    "updatedAt": "2023-07-29T15:30:00Z"
  }
}
```

### Update Agent Configuration

Updates an existing agent configuration.

```
PUT /api/agents/:id
```

**URL Parameters:**

- `id`: Agent ID (database ID or ElevenLabs agentId)

**Request Body:**

```json
{
  "name": "Customer Support Specialist",
  "description": "Updated description",
  "status": "active",
  "languages": ["en-US", "es-ES", "fr-FR"],
  "defaultScript": "Updated script content...",
  "settings": {
    "speechRate": 0.95,
    "interruptible": true,
    "maxTurnDuration": 25,
    "silenceThreshold": 2.8
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Agent configuration updated successfully",
  "agent": {
    // Updated agent details
  }
}
```

### Delete Agent Configuration

Deletes an agent configuration.

```
DELETE /api/agents/:id
```

**URL Parameters:**

- `id`: Agent ID (database ID or ElevenLabs agentId)

**Response:**

```json
{
  "success": true,
  "message": "Agent configuration deleted successfully"
}
```

### Get Agent Metrics

Retrieves performance metrics for a specific agent.

```
GET /api/agents/:id/metrics
```

**URL Parameters:**

- `id`: Agent ID (database ID or ElevenLabs agentId)

**Query Parameters:**

- `fromDate`: Filter by start date (ISO format)
- `toDate`: Filter by end date (ISO format)
- `campaignId`: Filter by specific campaign

**Response:**

```json
{
  "success": true,
  "agentId": "agent-123",
  "metrics": {
    "callMetrics": {
      "totalCalls": 250,
      "completedCalls": 225,
      "failedCalls": 25,
      "averageCallDuration": 145,
      "maxCallDuration": 420,
      "minCallDuration": 45
    },
    "performanceMetrics": {
      "successRate": 0.75,
      "transferRate": 0.15,
      "callbackRate": 0.08,
      "voicemailRate": 0.12,
      "completionRate": 0.90
    },
    "conversationMetrics": {
      "averageTurns": 12.5,
      "averageAgentResponseTime": 1.2,
      "averageUserResponseTime": 3.5,
      "mostCommonTopics": [
        {
          "topic": "pricing",
          "occurrences": 120
        },
        {
          "topic": "features",
          "occurrences": 95
        },
        {
          "topic": "support",
          "occurrences": 35
        }
      ]
    },
    "sentimentMetrics": {
      "averageSentiment": 0.62,
      "sentimentTrend": [
        {
          "date": "2023-07-25",
          "sentiment": 0.58
        },
        {
          "date": "2023-07-26",
          "sentiment": 0.61
        },
        {
          "date": "2023-07-27",
          "sentiment": 0.64
        },
        {
          "date": "2023-07-28",
          "sentiment": 0.65
        }
      ]
    },
    "trendsOverTime": [
      {
        "date": "2023-07-25",
        "calls": 60,
        "successRate": 0.72
      },
      {
        "date": "2023-07-26",
        "calls": 65,
        "successRate": 0.74
      },
      {
        "date": "2023-07-27",
        "calls": 70,
        "successRate": 0.76
      },
      {
        "date": "2023-07-28",
        "calls": 55,
        "successRate": 0.78
      }
    ]
  }
}
```

### Get Available ElevenLabs Voices

Retrieves a list of available ElevenLabs voice options.

```
GET /api/agents/voices
```

**Response:**

```json
{
  "success": true,
  "voices": [
    {
      "voiceId": "voice-123",
      "name": "Alex (Male)",
      "gender": "male",
      "accent": "American",
      "description": "Professional male voice with American accent",
      "previewUrl": "https://api.elevenlabs.io/v1/voices/voice-123/preview",
      "tags": ["professional", "friendly", "clear"]
    },
    {
      "voiceId": "voice-456",
      "name": "Emily (Female)",
      "gender": "female",
      "accent": "British",
      "description": "Professional female voice with British accent",
      "previewUrl": "https://api.elevenlabs.io/v1/voices/voice-456/preview",
      "tags": ["professional", "warm", "authoritative"]
    },
    // More voices...
  ]
}
```

### Test Agent Voice

Tests an agent voice configuration with a sample text.

```
POST /api/agents/test-voice
```

**Request Body:**

```json
{
  "voiceId": "voice-123",
  "text": "Hello, this is a test of the AI voice agent system.",
  "settings": {
    "stability": 0.5,
    "similarityBoost": 0.75,
    "style": 0.0,
    "speakerBoost": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Voice test generated successfully",
  "audioUrl": "https://api.example.com/temp/voice-test-123456.mp3",
  "settings": {
    "stability": 0.5,
    "similarityBoost": 0.75,
    "style": 0.0,
    "speakerBoost": true
  },
  "expiresAt": "2023-07-29T16:30:00Z"  // URL expiration time
}
```

## Integration with ElevenLabs

The Agent Configuration API integrates with ElevenLabs' voice generation services:

1. **Voice Selection**: Choose from available ElevenLabs voices
2. **Agent Configuration**: Define conversation parameters and behavior
3. **Performance Monitoring**: Track agent effectiveness metrics
4. **Voice Testing**: Test voice configurations before deployment

## Frontend Integration

To integrate with the frontend:

1. **Agent Management**: Use CRUD endpoints to create and manage voice agents
2. **Voice Selection**: Use the voices endpoint to offer voice options
3. **Testing Interface**: Use test-voice endpoint for preview functionality
4. **Dashboard**: Use metrics endpoints for agent performance monitoring
5. **Campaign Integration**: Associate agents with specific campaigns

All endpoints require authentication using the standard authentication middleware.
