# CallOrchestrator

> An AI-powered voice calling agent that simulates real-time phone conversations for business use cases — built on a modular multi-agent architecture using only free and open-source tools.

---

## Overview

CallOrchestrator lets you have a natural voice conversation with an AI agent directly in the browser. Speak into your microphone, watch your words transcribed in real time, see the AI think and respond, and hear the response spoken back — all in a polished, SaaS-quality interface.

The system is built around four specialized agents:

| Agent | Responsibility |
|---|---|
| STT Agent | Converts microphone audio to text (Groq Whisper API) |
| LLM Reasoning Agent | Understands intent and generates responses (Groq Llama 3) |
| Dialogue Manager | Maintains session state, drives workflow steps, orchestrates agents |
| TTS Agent | Converts AI response text to speech (browser SpeechSynthesis API) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js (modular: routes → controllers → services → agents) |
| LLM | Groq API free tier (Llama 3 / Mixtral) with streaming |
| STT | Groq Whisper API free tier |
| TTS | Browser Web Speech API (SpeechSynthesis) |
| Real-time | WebSocket server (Railway / Render free tier) |
| REST APIs | Vercel serverless functions |
| Session State | In-memory (Node.js Map), Redis-ready |
| Mock Data | In-memory repository layer (seed data on start) |

---

## Features

- **Simulated call lifecycle** — Idle → Ringing → Active → Ended
- **Full appointment booking workflow** — multi-turn, end-to-end
- **Stubbed workflows** — customer follow-up, support query
- **Streaming LLM responses** — tokens stream word by word for a live feel
- **Agent Activity Panel** — see exactly which agent is active and how long each step takes
- **System Log Panel** — toggleable real-time debug view
- **Live Conversation View** — chat-style with timestamps and auto-scroll
- **Dark mode UI** — minimal, modern, responsive

---

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Groq API key](https://console.groq.com) (used for both LLM and STT)
- A Railway or Render account (free tier) for the WebSocket server

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/callorchestrator.git
cd callorchestrator

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

### Environment Variables

**Backend** (`/backend/.env`):
```
GROQ_API_KEY=your_groq_api_key_here
PORT=4000
WS_PORT=4001
NODE_ENV=development
```

**Frontend** (`/frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4001
```

### Running Locally

```bash
# Start the backend (REST API + WebSocket server)
cd backend && npm run dev

# Start the frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Project Structure

```
callorchestrator/
├── frontend/
│   └── src/
│       ├── components/        # Reusable UI components
│       │   ├── CallPanel/     # Start/End call, status, waveform, timer
│       │   ├── ConversationView/  # Chat-style message list
│       │   ├── AgentActivity/     # Active agent + timing display
│       │   └── SystemLog/         # Toggleable log panel
│       ├── pages/             # Top-level page layouts
│       ├── hooks/             # Custom React hooks (useCall, useWebSocket, useTTS)
│       ├── services/          # API and WebSocket client logic
│       └── store/             # Global state management
│
├── backend/
│   └── src/
│       ├── routes/            # API endpoint definitions
│       ├── controllers/       # Request/response handling
│       ├── services/          # Business logic
│       ├── agents/            # STT, LLM, TTS, Dialogue Manager
│       ├── workflows/         # Appointment, follow-up, support workflows
│       ├── mock/              # Mock data layer (appointments, contacts, tickets)
│       ├── middleware/        # Error handling, logging, validation
│       └── utils/             # Shared helpers
│
└── workspace/
    ├── prd.md                 # Product Requirements Document
    ├── architecture.md        # System architecture
    ├── adrs/                  # Architecture Decision Records
    ├── test-reports/          # QA sign-off reports
    └── documentation/         # API docs, schema docs, setup guides
```

---

## API Reference

See [`/workspace/documentation/api.md`](./workspace/documentation/api.md) for full endpoint documentation.

Key endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/call/start` | Initiate a new call session |
| POST | `/api/call/end` | End an active call session |
| POST | `/api/stt` | Transcribe audio (Groq Whisper) |
| POST | `/api/llm` | Send transcribed text, get streamed AI response |
| GET | `/api/session/:id` | Get current session state |

Real-time events are delivered via WebSocket — see [`/workspace/documentation/websocket.md`](./workspace/documentation/websocket.md).

---

## Architecture Decisions

All major technical decisions are documented with full rationale in [`/workspace/adrs/`](./workspace/adrs/).

---

## Extensibility

**The architecture is explicitly designed to support future integration with real telephony providers (Twilio, SIP, Vonage) without major refactoring.**

| Component | How it extends |
|---|---|
| STT Agent | Wrapped behind a service interface — swap Groq Whisper for Deepgram or Twilio STT by implementing the same interface. No changes to Dialogue Manager. |
| TTS Agent | Isolated behind a service interface — replace SpeechSynthesis with ElevenLabs or Twilio TTS without touching business logic. |
| Dialogue Manager | Operates on plain text input/output — replacing the browser mic with a Twilio Media Stream requires only a new STT adapter, not core logic changes. |
| WebSocket Server | Can be extended to accept Twilio Media Streams or SIP audio directly. |
| Session Context | Serializable to Redis — enable persistent sessions by swapping the in-memory store for a Redis adapter. |
| Mock Data Layer | Sits behind a repository interface — replace with PostgreSQL or MongoDB without changing service code. |

To integrate Twilio in the future:
1. Add a Twilio Media Stream adapter that feeds audio into the STT Agent
2. Add a Twilio TTS adapter that replaces SpeechSynthesis
3. Add a `/api/twilio/webhook` route for call control events
4. No changes required to the Dialogue Manager, LLM Agent, or session logic

---

## Built With MAOS

This project was built using the **MAOS (Multi Agent Orchestration System)** AI Dev Team:

| Agent | Role |
|---|---|
| PM Agent | Requirements & PRD |
| Architect Agent | System design & tech stack |
| UI/UX Coder | Design system & components |
| Frontend Coder | React implementation |
| Backend Coder | Node.js API & agents |
| DB Coder | Schema & mock data layer |
| Integration Coder | Groq API integration |
| Tester Agent | QA & sign-off |
| Docs Agent | This documentation |

---

## Contributing

1. Read `/workspace/architecture.md` before making changes
2. Follow the modular agent pattern — don't bypass the service layer
3. All new integrations must be wrapped in a provider interface
4. Run the test suite before submitting: `npm test`
5. Document your decisions in `/workspace/adrs/`
