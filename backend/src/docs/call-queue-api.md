# Call Queue API Documentation

## Database Model

The `CallQueue` model manages the queuing of outbound calls and the tracking of their status as they move through the dialing process.

### CallQueue Schema

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| queueId | STRING | Unique identifier for the queue entry |
| contactId | INTEGER | Foreign key to contacts table |
| campaignId | STRING | Foreign key to campaigns table |
| priority | INTEGER | Call priority (higher numbers = higher priority) |
| status | STRING | Queue status (pending, in-progress, completed, failed, canceled) |
| attemptCount | INTEGER | Number of call attempts made |
| nextAttemptTime | DATE | Scheduled time for next attempt |
| lastAttemptTime | DATE | Time of most recent attempt |
| lastAttemptResult | STRING | Result of the most recent attempt |
| callSid | STRING | SignalWire call SID when call is active |
| agentId | STRING | ElevenLabs agent ID assigned to this call |
| callbackRequested | BOOLEAN | Whether a callback was requested |
| callbackTime | DATE | Scheduled time for callback |
| retryAfter | INTEGER | Minutes to wait before retry |
| maxAttempts | INTEGER | Maximum number of attempts allowed |
| metadata | JSONB | Additional queue entry metadata |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

### Associations

- `CallQueue` belongs to `Contact` via `contactId`
- `CallQueue` belongs to `Campaign` via `campaignId`
- `CallQueue` may have one `CallLog` via `callSid`

## API Endpoints

### Get Queue Status

Retrieves the status of the call queue, including counts of items in various states.

```
GET /api/call-queue/status
```

**Query Parameters:**

- `campaignId`: Filter by campaign ID

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "queueStatus": {
    "totalItems": 125,
    "pendingItems": 80,
    "inProgressItems": 10,
    "completedItems": 30,
    "failedItems": 5,
    "callbackItems": 15,
    "campaignCounts": [
      {
        "campaignId": "campaign-123",
        "name": "Q3 Sales Outreach",
        "total": 75,
        "pending": 50,
        "inProgress": 5,
        "completed": 15,
        "failed": 5
      },
      {
        "campaignId": "campaign-456",
        "name": "Support Follow-up",
        "total": 50,
        "pending": 30,
        "inProgress": 5,
        "completed": 15,
        "failed": 0
      }
    ],
    "nextScheduledCall": "2023-07-29T17:00:00Z",
    "currentRate": 12.5  // calls per hour
  }
}
```

### Get Queue Items

Retrieves a paginated list of items in the call queue.

```
GET /api/call-queue
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status
- `campaignId`: Filter by campaign ID
- `contactId`: Filter by contact ID
- `search`: Search by contact name or phone number
- `sortBy`: Sort field (default: 'nextAttemptTime')
- `sortDir`: Sort direction ('asc' or 'desc', default: 'asc')

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "count": 20,
  "total": 125,
  "page": 1,
  "pages": 7,
  "queueItems": [
    {
      "id": 1,
      "queueId": "queue_123456",
      "contactId": 42,
      "campaignId": "campaign-123",
      "priority": 5,
      "status": "pending",
      "attemptCount": 0,
      "nextAttemptTime": "2023-07-29T17:00:00Z",
      "maxAttempts": 3,
      "createdAt": "2023-07-29T10:00:00Z",
      "updatedAt": "2023-07-29T10:00:00Z",
      "contact": {
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "+18005551234"
      }
    },
    {
      "id": 2,
      "queueId": "queue_234567",
      "contactId": 43,
      "campaignId": "campaign-123",
      "priority": 3,
      "status": "in-progress",
      "attemptCount": 1,
      "lastAttemptTime": "2023-07-29T16:45:00Z",
      "callSid": "CA123456789abcdef",
      "maxAttempts": 3,
      "createdAt": "2023-07-29T10:05:00Z",
      "updatedAt": "2023-07-29T16:45:00Z",
      "contact": {
        "firstName": "Jane",
        "lastName": "Smith",
        "phoneNumber": "+18005557890"
      }
    },
    // More queue items...
  ]
}
```

### Get Queue Item Details

Retrieves details about a specific queue item.

```
GET /api/call-queue/:id
```

**URL Parameters:**

- `id`: Queue item ID or queueId

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "queueItem": {
    "id": 1,
    "queueId": "queue_123456",
    "contactId": 42,
    "campaignId": "campaign-123",
    "priority": 5,
    "status": "pending",
    "attemptCount": 0,
    "nextAttemptTime": "2023-07-29T17:00:00Z",
    "lastAttemptTime": null,
    "lastAttemptResult": null,
    "callSid": null,
    "agentId": "agent-789",
    "callbackRequested": false,
    "callbackTime": null,
    "retryAfter": 60,
    "maxAttempts": 3,
    "metadata": {
      "initialPriority": 3,
      "priorityBoost": {
        "reason": "high-value-customer",
        "value": 2
      }
    },
    "createdAt": "2023-07-29T10:00:00Z",
    "updatedAt": "2023-07-29T10:00:00Z",
    "contact": {
      "id": 42,
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+18005551234",
      "email": "john.doe@example.com"
    },
    "campaign": {
      "id": "campaign-123",
      "name": "Q3 Sales Outreach"
    }
  },
  "history": [
    {
      "timestamp": "2023-07-29T10:00:00Z",
      "action": "created",
      "details": "Added to queue"
    },
    {
      "timestamp": "2023-07-29T14:30:00Z",
      "action": "priority_updated",
      "details": "Priority increased from 3 to 5",
      "reason": "high-value-customer"
    }
  ]
}
```

### Add to Queue

Adds a new item to the call queue.

```
POST /api/call-queue
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "contactId": 44,
  "campaignId": "campaign-123",
  "priority": 3,
  "nextAttemptTime": "2023-07-29T18:00:00Z",
  "agentId": "agent-789",
  "retryAfter": 60,
  "maxAttempts": 3,
  "metadata": {
    "source": "manual-entry",
    "notes": "Customer requested information about premium package"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Item added to queue successfully",
  "queueItem": {
    "id": 3,
    "queueId": "queue_345678",
    "contactId": 44,
    "campaignId": "campaign-123",
    "status": "pending",
    // Other queue item fields...
    "createdAt": "2023-07-29T16:45:00Z",
    "updatedAt": "2023-07-29T16:45:00Z"
  }
}
```

### Update Queue Item

Updates an existing queue item.

```
PUT /api/call-queue/:id
```

**URL Parameters:**

- `id`: Queue item ID or queueId

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "priority": 7,
  "nextAttemptTime": "2023-07-29T19:00:00Z",
  "status": "pending",
  "metadata": {
    "notes": "High priority lead, follow up ASAP"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Queue item updated successfully",
  "queueItem": {
    // Updated queue item details
  }
}
```

### Delete Queue Item

Removes an item from the queue.

```
DELETE /api/call-queue/:id
```

**URL Parameters:**

- `id`: Queue item ID or queueId

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "message": "Queue item deleted successfully"
}
```

### Bulk Add to Queue

Adds multiple contacts to the call queue.

```
POST /api/call-queue/bulk
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "campaignId": "campaign-123",
  "contacts": [45, 46, 47, 48, 49],  // Contact IDs
  "priority": 3,
  "startTime": "2023-07-29T18:00:00Z",
  "spacing": 300,  // seconds between calls
  "agentId": "agent-789",
  "retryAfter": 60,
  "maxAttempts": 3,
  "metadata": {
    "source": "bulk-upload",
    "notes": "Monthly follow-up batch"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "5 items added to queue successfully",
  "addedCount": 5,
  "failedCount": 0,
  "queueIds": ["queue_456789", "queue_567890", "queue_678901", "queue_789012", "queue_890123"]
}
```

### Cancel Call

Cancels an in-progress call and updates the queue item.

```
POST /api/call-queue/:id/cancel
```

**URL Parameters:**

- `id`: Queue item ID or queueId

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "reason": "customer_request",
  "notes": "Customer asked to cancel the call"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Call canceled successfully",
  "queueItem": {
    "id": 2,
    "queueId": "queue_234567",
    "status": "canceled",
    "lastAttemptResult": "canceled",
    // Other updated queue item fields...
    "updatedAt": "2023-07-29T16:50:00Z"
  }
}
```

### Schedule Callback

Schedules a callback for a queue item.

```
POST /api/call-queue/:id/callback
```

**URL Parameters:**

- `id`: Queue item ID or queueId

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "callbackTime": "2023-07-30T15:00:00Z",
  "priority": 5,  // Optional, new priority for the callback
  "notes": "Customer requested callback tomorrow afternoon"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Callback scheduled successfully",
  "queueItem": {
    "id": 2,
    "queueId": "queue_234567",
    "status": "pending",
    "callbackRequested": true,
    "callbackTime": "2023-07-30T15:00:00Z",
    "priority": 5,
    // Other updated queue item fields...
    "updatedAt": "2023-07-29T16:55:00Z"
  }
}
```

### Manually Initiate Call

Manually initiates a call for a queue item, bypassing the normal queue processing.

```
POST /api/call-queue/:id/call-now
```

**URL Parameters:**

- `id`: Queue item ID or queueId

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "agentId": "agent-789",  // Optional override for agent ID
  "priority": 10,  // Optional, set high priority
  "override": {  // Optional overrides
    "callerIdNumber": "+18005559876",
    "recordCall": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Call initiated successfully",
  "queueItem": {
    "id": 1,
    "queueId": "queue_123456",
    "status": "in-progress",
    "callSid": "CA234567890abcdef",
    "attemptCount": 1,
    "lastAttemptTime": "2023-07-29T17:00:00Z",
    // Other updated queue item fields...
    "updatedAt": "2023-07-29T17:00:00Z"
  },
  "call": {
    "callSid": "CA234567890abcdef",
    "status": "initiated",
    "from": "+18005559876",
    "to": "+18005551234"
  }
}
```

## Queue Processing

The call queue is processed by a background scheduler that:

1. Identifies pending queue items that are due for calling
2. Respects campaign-level concurrency limits
3. Manages priorities to ensure high-priority calls are made first
4. Handles retry logic based on call outcomes
5. Processes callbacks at their scheduled times

Frontend applications can monitor the queue status but do not need to manage queue processing directly.

## Frontend Integration

To integrate with the frontend:

1. **Queue Dashboard**: Use queue status endpoint to build monitoring dashboards
2. **Queue Management**: Use CRUD endpoints to manage queue items
3. **Manual Control**: Use call-now endpoint for immediate outbound calls
4. **Callback Management**: Use callback scheduling for follow-up management
5. **Priority Management**: Update queue item priorities based on business rules

All endpoints require authentication using the standard authentication middleware.
