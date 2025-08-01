# Authentication API Documentation

## Overview

The Authentication API provides secure user authentication and authorization for the 11Wire platform. It includes user registration, login, token management, and permission controls.

## User Model

The `User` model stores user credentials and roles.

### User Schema

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key, auto-incremented |
| username | STRING | Unique username |
| email | STRING | Unique email address |
| passwordHash | STRING | Hashed password (not exposed via API) |
| firstName | STRING | First name |
| lastName | STRING | Last name |
| role | STRING | User role (admin, manager, agent, etc.) |
| permissions | JSONB | User-specific permissions |
| status | STRING | Account status (active, inactive, suspended) |
| lastLogin | DATE | Last login timestamp |
| profileImage | STRING | URL to profile image |
| settings | JSONB | User preferences and settings |
| metadata | JSONB | Additional user metadata |
| createdAt | DATE | Record creation timestamp |
| updatedAt | DATE | Record update timestamp |

## API Endpoints

### Register User

Creates a new user account.

```
POST /api/auth/register
```

**Request Body:**

```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "password": "SecureP@ssw0rd",
  "firstName": "John",
  "lastName": "Doe",
  "role": "manager"  // Optional, defaults to basic role
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "manager",
    "status": "active",
    "createdAt": "2023-07-29T10:00:00Z",
    "updatedAt": "2023-07-29T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // JWT token
}
```

### User Login

Authenticates a user and returns a JWT token.

```
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "SecureP@ssw0rd"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "manager",
    "status": "active",
    "lastLogin": "2023-07-29T11:30:00Z",
    "settings": {
      "theme": "light",
      "notifications": true
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2023-07-30T11:30:00Z"
}
```

### Refresh Token

Refreshes an existing JWT token.

```
POST /api/auth/refresh
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // New JWT token
  "expiresAt": "2023-07-30T12:30:00Z"
}
```

### Get Current User

Retrieves information about the currently authenticated user.

```
GET /api/auth/me
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "manager",
    "status": "active",
    "permissions": {
      "campaigns": ["read", "write"],
      "contacts": ["read", "write"],
      "calls": ["read"]
    },
    "lastLogin": "2023-07-29T11:30:00Z",
    "profileImage": "https://example.com/profiles/johndoe.jpg",
    "settings": {
      "theme": "light",
      "notifications": true,
      "dashboardLayout": "compact"
    },
    "createdAt": "2023-07-20T10:00:00Z",
    "updatedAt": "2023-07-29T11:30:00Z"
  }
}
```

### Logout

Invalidates the current JWT token.

```
POST /api/auth/logout
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Change Password

Changes the password for the authenticated user.

```
POST /api/auth/change-password
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "currentPassword": "SecureP@ssw0rd",
  "newPassword": "NewSecureP@ssw0rd"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Reset Password (Request)

Requests a password reset for a user.

```
POST /api/auth/reset-password/request
```

**Request Body:**

```json
{
  "email": "john.doe@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset instructions sent to email"
}
```

### Reset Password (Confirm)

Resets a user's password using a token.

```
POST /api/auth/reset-password/confirm
```

**Request Body:**

```json
{
  "token": "reset-token-123456",
  "newPassword": "NewSecureP@ssw0rd"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

### Update User Settings

Updates settings for the authenticated user.

```
PUT /api/auth/settings
```

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "settings": {
    "theme": "dark",
    "notifications": false,
    "dashboardLayout": "expanded"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": {
    "theme": "dark",
    "notifications": false,
    "dashboardLayout": "expanded"
  }
}
```

## Authentication Middleware

All protected API endpoints use middleware to verify JWT tokens. This middleware:

1. Extracts the token from the Authorization header
2. Verifies the token signature
3. Checks token expiration
4. Attaches user information to the request

### Error Responses

**Invalid Token:**

```json
{
  "success": false,
  "message": "Invalid token",
  "error": "jwt_invalid"
}
```

**Expired Token:**

```json
{
  "success": false,
  "message": "Token expired",
  "error": "jwt_expired"
}
```

**Missing Token:**

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "auth_required"
}
```

## Role-Based Access Control

The API implements role-based access control with the following roles:

- **Admin**: Full system access
- **Manager**: Access to campaigns, contacts, and call management
- **Agent**: Access to assigned calls and contacts
- **Viewer**: Read-only access to allowed resources

Each role has predefined permissions, which can be further customized per user.

## JWT Token Format

The JWT token contains the following claims:

- **sub**: User ID
- **username**: Username
- **email**: User email
- **role**: User role
- **permissions**: User permissions array
- **iat**: Token issued at time
- **exp**: Token expiration time

## Frontend Integration

To integrate with the frontend:

1. **Authentication Flow**: Use login/register endpoints to authenticate users
2. **Token Management**: Store JWT token securely (e.g., HttpOnly cookie or secure localStorage)
3. **Request Authentication**: Include token in Authorization header for all protected requests
4. **Token Expiration**: Implement token refresh logic when approaching expiration
5. **User Profile**: Use /api/auth/me endpoint to display user information
6. **Permission Handling**: Check user permissions for conditional UI rendering

For security best practices, implement:

1. HTTPS for all API calls
2. Token expiration handling
3. Secure token storage
4. Protection against XSS and CSRF attacks
