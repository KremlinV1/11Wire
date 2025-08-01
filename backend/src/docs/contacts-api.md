# Contacts API Documentation

## Database Model

The `Contact` model stores information about individuals who can be contacted through the system.

### Contact Schema

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| firstName | STRING | First name |
| lastName | STRING | Last name |
| phoneNumber | STRING | Primary phone number (E.164 format) |
| email | STRING | Email address |
| address | STRING | Physical address |
| city | STRING | City |
| state | STRING | State/province |
| postalCode | STRING | ZIP/postal code |
| country | STRING | Country |
| notes | TEXT | Additional notes about the contact |
| tags | ARRAY | Array of tags/labels associated with the contact |
| campaignId | STRING | Foreign key to campaigns table |
| status | STRING | Contact status (e.g., active, inactive, contacted) |
| lastContactedAt | DATE | When the contact was last reached |
| customFields | JSONB | Custom fields for additional data |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

### Associations

- `Contact` belongs to `Campaign` via `campaignId`
- `Contact` has many `CallLogs`
- `Contact` has many `Conversations`

## API Endpoints

### Get All Contacts

Retrieves a paginated list of contacts.

```
GET /api/contacts
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term for name, email, or phone
- `campaignId`: Filter by campaign ID
- `status`: Filter by contact status
- `tags`: Filter by tags (comma-separated)
- `sortBy`: Sort field (default: 'lastName')
- `sortDir`: Sort direction ('asc' or 'desc', default: 'asc')

**Response:**

```json
{
  "success": true,
  "count": 25,
  "total": 150,
  "page": 1,
  "pages": 8,
  "contacts": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+18005551234",
      "email": "john.doe@example.com",
      "status": "active",
      "tags": ["prospect", "high-value"],
      "campaignId": "campaign-123",
      "lastContactedAt": "2023-07-25T14:30:00Z",
      "createdAt": "2023-07-20T10:15:00Z",
      "updatedAt": "2023-07-25T14:30:00Z"
    },
    // More contacts...
  ]
}
```

### Get Contact Details

Retrieves detailed information about a specific contact.

```
GET /api/contacts/:id
```

**URL Parameters:**

- `id`: Contact ID

**Response:**

```json
{
  "success": true,
  "contact": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+18005551234",
    "email": "john.doe@example.com",
    "address": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "postalCode": "12345",
    "country": "USA",
    "notes": "Interested in premium package",
    "tags": ["prospect", "high-value"],
    "campaignId": "campaign-123",
    "status": "active",
    "lastContactedAt": "2023-07-25T14:30:00Z",
    "customFields": {
      "leadSource": "website",
      "industryType": "healthcare",
      "budget": "10000+"
    },
    "createdAt": "2023-07-20T10:15:00Z",
    "updatedAt": "2023-07-25T14:30:00Z",
    "campaign": {
      // Campaign details if included
    },
    "callLogs": [
      // Recent call logs if included
    ],
    "conversations": [
      // Recent conversations if included
    ]
  }
}
```

### Create Contact

Creates a new contact.

```
POST /api/contacts
```

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+18005557890",
  "email": "jane.smith@example.com",
  "address": "456 Oak Ave",
  "city": "Othertown",
  "state": "NY",
  "postalCode": "67890",
  "country": "USA",
  "notes": "Referred by John Doe",
  "tags": ["new-lead", "referral"],
  "campaignId": "campaign-123",
  "status": "active",
  "customFields": {
    "leadSource": "referral",
    "industryType": "finance",
    "budget": "5000-10000"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Contact created successfully",
  "contact": {
    "id": 2,
    "firstName": "Jane",
    "lastName": "Smith",
    // Other contact fields...
    "createdAt": "2023-07-29T13:45:00Z",
    "updatedAt": "2023-07-29T13:45:00Z"
  }
}
```

### Update Contact

Updates an existing contact.

```
PUT /api/contacts/:id
```

**URL Parameters:**

- `id`: Contact ID

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith-Johnson",
  "email": "jane.smith-johnson@example.com",
  "status": "contacted",
  "notes": "Updated contact information, now married",
  "tags": ["new-lead", "referral", "follow-up"],
  "lastContactedAt": "2023-07-29T14:00:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Contact updated successfully",
  "contact": {
    // Updated contact details
  }
}
```

### Delete Contact

Deletes a contact.

```
DELETE /api/contacts/:id
```

**URL Parameters:**

- `id`: Contact ID

**Response:**

```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

### Bulk Import Contacts

Imports multiple contacts from a CSV file.

```
POST /api/contacts/import
```

**Request:**

Multipart form data with a CSV file attached.

**CSV Format:**

```
firstName,lastName,phoneNumber,email,status,tags,campaignId
John,Doe,+18005551234,john.doe@example.com,active,"prospect,high-value",campaign-123
Jane,Smith,+18005557890,jane.smith@example.com,active,"new-lead,referral",campaign-123
```

**Response:**

```json
{
  "success": true,
  "message": "Contacts imported successfully",
  "imported": 2,
  "failed": 0,
  "errors": []
}
```

### Export Contacts

Exports contacts to a CSV file.

```
GET /api/contacts/export
```

**Query Parameters:**

- Same filtering options as the list endpoint

**Response:**

CSV file download with contact data.

### Get Contact Call History

Retrieves call history for a specific contact.

```
GET /api/contacts/:id/calls
```

**URL Parameters:**

- `id`: Contact ID

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**

```json
{
  "success": true,
  "count": 5,
  "total": 12,
  "page": 1,
  "pages": 3,
  "calls": [
    {
      "id": 10,
      "callSid": "CA123456789abcdef",
      "direction": "outbound",
      "from": "+18005551234",
      "to": "+18005557890",
      "status": "completed",
      "duration": 125,
      "startTime": "2023-07-29T10:15:00Z",
      "endTime": "2023-07-29T10:17:05Z",
      // Other call log fields...
    },
    // More call logs...
  ]
}
```

## Frontend Integration

To integrate with the frontend:

1. **List & Search**: Use `/api/contacts` with search parameters to populate contact lists
2. **Detail View**: Use `/api/contacts/:id` to show full contact information
3. **History**: Use `/api/contacts/:id/calls` to display contact communication history
4. **Bulk Operations**: Use import/export endpoints for CSV operations
5. **Forms**: Create/update forms should map to the contact model fields

All endpoints require authentication using the standard authentication middleware.
