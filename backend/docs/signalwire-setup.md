# SignalWire Integration Setup

## Credentials Overview

The 11Wire backend uses SignalWire for voice and telephony functionality. The following credentials are required for proper integration:

### Core API Credentials
- **Project ID**: Used to identify your SignalWire project
- **Space URL**: Your SignalWire space domain (e.g., `example.signalwire.com`)
- **API Token**: Used for API authentication
- **Signing Secret**: Used for webhook validation

### SIP Endpoint Credentials
- **SIP Address**: The full SIP address for your endpoint
- **SIP Password**: Authentication password for the SIP endpoint

## Environment Variables

These credentials should be configured in your environment file (`.env.test` for testing or `.env` for production):

```
# SignalWire API credentials
SIGNALWIRE_PROJECT_ID=your-project-id
SIGNALWIRE_SPACE_URL=your-space.signalwire.com
SIGNALWIRE_API_TOKEN=your-api-token
SIGNALWIRE_SIGNING_SECRET=your-signing-secret

# SignalWire SIP Endpoint credentials
SIGNALWIRE_SIP_ADDRESS=your-sip-address
SIGNALWIRE_SIP_PASSWORD=your-sip-password
```

## SignalWire Client Usage

The SignalWire client is initialized in `src/services/signalwire.service.js` with the following parameters:

- **project**: Project ID from the environment variables
- **token**: API Token from the environment variables
- **contexts**: Array of contexts for the client (default: ['office'])
- **host**: Space URL for proper routing

## Testing SignalWire Integration

You can test the SignalWire integration by running:

```
node run-test.js
```

This will verify connectivity to SignalWire and perform basic API operations.

## Troubleshooting

If you encounter authentication errors:

1. Verify all environment variables are correctly set
2. Ensure the SignalWire space URL includes only the domain portion (e.g., `example.signalwire.com`)
3. Confirm the API token and project ID match those in your SignalWire dashboard

For SIP endpoint issues, verify the SIP address and password are correctly configured.
