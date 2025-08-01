# 11Wire API Documentation

## Overview

This documentation provides a comprehensive guide to the 11Wire backend API endpoints and database models. These resources are designed to help frontend developers integrate with the backend services efficiently.

## Available Documentation

| Feature | Description | Documentation Link |
|---------|-------------|-------------------|
| Authentication | User authentication & authorization | [Authentication API](./auth-api.md) |
| Call Logs | Call history and details | [Call Logs API](./call-logs-api.md) |
| Call Transfers | Call transfer operations | [Transfer API](./transfer-api.md) |
| Call Recordings | Call recording management | [Call Recordings API](./call-recordings-api.md) |
| Call Queue | Outbound call scheduling | [Call Queue API](./call-queue-api.md) |
| Conversations | AI conversation tracking | [Conversations API](./conversations-api.md) |
| Contacts | Contact management | [Contacts API](./contacts-api.md) |
| Campaigns | Campaign configuration | [Campaigns API](./campaigns-api.md) |
| Agent Configuration | ElevenLabs voice agents | [Agent Config API](./agent-config-api.md) |
| Webhooks | Event integrations | [Webhook API](./webhook-api.md) |

## Database Schema Overview

The 11Wire backend uses several interconnected models:

- **User**: Stores user credentials and permissions for authentication
- **CallLog**: Tracks all call details, including transfer information
- **CallRecording**: Manages call recordings and their metadata
- **Conversation**: Represents AI agent conversations with contacts
- **Contact**: Stores contact information and history
- **Campaign**: Defines call campaigns and their settings
- **AgentConfig**: Configures ElevenLabs AI voice agents
- **CallQueue**: Manages outbound call scheduling
- **WebhookConfig**: Configures integrations with external systems
- **WebhookEvent**: Tracks webhook events sent and received

### Key Model Relationships

```
User
  |
  v
Campaign <-----> Contact
  |               |
  v               v
CallQueue -----> CallLog <----> CallRecording
                  |
                  v
               Conversation
```

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the request header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens can be obtained via the `/api/auth/login` endpoint. See the [Authentication API](./auth-api.md) documentation for details.

## Common Request/Response Patterns

All API endpoints follow consistent patterns:

### Success Responses

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }  // Resource-specific data
}
```

### Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Pagination

List endpoints support pagination with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

Paginated responses include:

```json
{
  "success": true,
  "count": 20,    // Items on current page
  "total": 243,   // Total items
  "page": 1,      // Current page
  "pages": 13,    // Total pages
  "data": [ ... ] // Resource-specific data
}
```

## Environment Configuration

The backend API uses environment variables for configuration. Refer to the `.env.example` file for required variables.

## External Service Integrations

### SignalWire Integration

The backend integrates with SignalWire for telephony services:

- Call control via SignalWire Realtime API
- Call recordings via SignalWire API
- Call transfers via SignalWire connect() method and TwiML

### ElevenLabs Integration

The backend integrates with ElevenLabs for AI voice agents:

- Voice agent configuration and management
- Voice generation and processing
- Conversation analysis and sentiment tracking

## Feature Implementation Overview

### Call Flow

1. **Outbound Calls**: Managed through the Call Queue API
2. **Call Management**: Handled by the Call Logs API
3. **Call Recording**: Managed by the Call Recordings API
4. **Call Transfers**: Implemented through the Transfer API
5. **Conversation Tracking**: Handled by the Conversations API

### Campaign Management

1. **Campaign Setup**: Configured through the Campaigns API
2. **Contact Management**: Handled by the Contacts API
3. **Agent Configuration**: Managed by the Agent Config API
4. **Queue Management**: Controlled by the Call Queue API

## Getting Started for Frontend Developers

1. **Authentication**: Use the Authentication API to obtain JWT tokens
2. **Data Access**: Use the appropriate API endpoints to access and modify data
3. **Event Handling**: Set up webhook configurations for real-time updates
4. **Call Management**: Implement call flow using the Call Logs and Transfer APIs
5. **Monitoring**: Use analytics endpoints to track performance metrics

For questions or issues, please contact the backend development team.
