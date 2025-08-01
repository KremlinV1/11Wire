# Call Transfer API Documentation

## Overview

The Call Transfer API provides endpoints for initiating, managing, and completing call transfers between agents, phone numbers, and SIP endpoints. It supports both cold transfers (direct) and warm transfers (announced).

## Database Fields

Call transfer information is stored in the `CallLog` model with the following transfer-specific fields:

| Field | Type | Description |
|-------|------|-------------|
| transferStatus | ENUM | Status of any transfer ('none', 'requested', 'in-progress', 'completed', 'failed') |
| transferredTo | STRING | Identifier of agent/endpoint call was transferred to |
| transferredFrom | STRING | Identifier of agent/endpoint call was transferred from |
| transferTime | DATE | When the transfer was initiated |
| transferType | ENUM | Type of transfer ('warm' = announced, 'cold' = direct) |
| transferMetadata | JSONB | Additional data related to the transfer |

## API Endpoints

### Initiate Transfer

Transfers an active call to another phone number or SIP endpoint.

```
POST /api/transfer/initiate
```

**Request Body:**

```json
{
  "callSid": "CA123456789abcdef",
  "targetEndpoint": "+18005557890",  // or "sip:user@example.com" for SIP
  "transferType": "cold",            // "cold" or "warm"
  "announcement": "Transferring to sales",  // Optional, for warm transfers
  "timeout": 30,                     // Optional, seconds to wait for answer
  "fromNumber": "+18005551234",      // Optional, caller ID for phone transfers
  "fromSipUri": "sip:agent@domain.com", // Optional, for SIP transfers
  "initiatedBy": "system"            // Optional, who/what initiated the transfer
}
```

**Response:**

```json
{
  "success": true,
  "message": "Call transfer initiated",
  "transferResult": {
    "success": true,
    "callSid": "CA123456789abcdef",
    "peerId": "CA987654321fedcba",
    "transferTarget": "+18005557890",
    "transferType": "cold",
    "status": "connected"
  }
}
```

### Complete Transfer

Marks a transfer as completed.

```
POST /api/transfer/complete
```

**Request Body:**

```json
{
  "callSid": "CA123456789abcdef",
  "status": "completed",           // "completed" or other final status
  "notes": "Transfer completed successfully",  // Optional
  "completedBy": "agent-123"       // Optional, who completed the transfer
}
```

**Response:**

```json
{
  "success": true,
  "message": "Call transfer completed",
  "transferStatus": "completed"
}
```

### Cancel Transfer

Cancels an in-progress transfer.

```
POST /api/transfer/cancel
```

**Request Body:**

```json
{
  "callSid": "CA123456789abcdef",
  "reason": "Customer changed mind",  // Optional
  "cancelledBy": "agent-123"         // Optional, who cancelled the transfer
}
```

**Response:**

```json
{
  "success": true,
  "message": "Call transfer cancelled",
  "transferStatus": "failed"
}
```

### Generate Transfer TwiML

Generates TwiML for call transfer to be used with SignalWire.

```
POST /api/transfer/twiml
```

**Request Body:**

```json
{
  "targetEndpoint": "+18005557890",  // or "sip:user@example.com" for SIP
  "transferType": "cold",            // "cold" or "warm"
  "announcement": "Transferring to sales",  // Optional, for warm transfers
  "callerId": "+18005551234",        // Optional, caller ID to use
  "timeout": 30,                     // Optional, seconds to wait for answer
  "action": "/callback-url"          // Optional, callback URL after transfer
}
```

**Response:**

```json
{
  "success": true,
  "twiml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Dial callerId=\"+18005551234\">+18005557890</Dial></Response>"
}
```

### Get Pending Transfers

Retrieves a list of all in-progress transfers.

```
GET /api/transfer/pending
```

**Response:**

```json
{
  "success": true,
  "count": 2,
  "pendingTransfers": [
    {
      "id": 1,
      "callSid": "CA123456789abcdef",
      "transferStatus": "in-progress",
      "transferredTo": "+18005557890",
      "transferredFrom": "agent-456",
      "transferTime": "2023-07-29T10:16:30Z",
      "transferType": "warm",
      // Other call log fields...
    },
    // More pending transfers...
  ]
}
```

### Get Transfer History

Retrieves transfer history for a specific call.

```
GET /api/transfer/:callSid/history
```

**URL Parameters:**

- `callSid`: SignalWire Call SID

**Response:**

```json
{
  "success": true,
  "transferDetails": {
    "callSid": "CA123456789abcdef",
    "transferStatus": "completed",
    "transferredTo": "+18005557890",
    "transferredFrom": "agent-456",
    "transferTime": "2023-07-29T10:16:30Z",
    "transferType": "warm",
    "transferMetadata": {
      "initiatedBy": "system",
      "peerId": "CA987654321fedcba",
      "completedAt": "2023-07-29T10:17:15Z",
      "completionStatus": "completed",
      "completedBy": "agent-123"
    }
  }
}
```

## Integration with SignalWire

The transfer API integrates with SignalWire's Realtime API and TwiML to handle different types of call transfers:

1. **Realtime API**: Used for advanced transfer scenarios with call control
   - Supports both cold and warm transfers
   - Maintains call context through the entire transfer flow
   - Enables actions on both legs of the call

2. **TwiML/cXML**: Used for simple transfer scenarios
   - Generates XML instructions for call routing
   - Good for static transfer rules or IVR-based transfers

## Frontend Integration

To integrate with the frontend:

1. **Monitor Calls**: Use `/api/calls` endpoints to monitor active calls
2. **Initiate Transfers**: Use `/api/transfer/initiate` when a transfer is needed
3. **Track Transfer Status**: Poll `/api/transfer/:callSid/history` to track status
4. **Complete Transfers**: Use `/api/transfer/complete` when transfer is finished

All endpoints require authentication using the standard authentication middleware.
