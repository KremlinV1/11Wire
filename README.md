# 11Wire - Conversational AI Dialer

A cloud-based dialer application integrating ElevenLabs Conversational AI agents with SignalWire telephony infrastructure.

## Features

- Inbound call handling with AI voice agents
- Batch outbound calling capabilities
- Dashboard for call metrics and management
- Contact management with CSV upload
- Real-time call monitoring

## Architecture

- **Backend**: Node.js with Express
- **Frontend**: React.js with Tailwind CSS
- **Telephony**: SignalWire SDK + SIP trunking
- **AI/Voice**: ElevenLabs Conversational AI
- **Database**: PostgreSQL
- **Infrastructure**: Docker, AWS/GCP

## Project Structure

```
11Wire/
├── backend/          # Node.js Express API server
├── frontend/         # React.js web dashboard
├── infrastructure/   # Docker, deployment configs
└── docs/             # Project documentation
```

## Getting Started

Documentation coming soon.

## Security Notes

- API keys and credentials should never be committed to version control
- Use environment variables for all sensitive information
