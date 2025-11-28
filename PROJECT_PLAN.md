# Compliance Support AI Agent - Project Plan

## Project Overview

Building a compliance support AI agent that assists customer support agents during live calls to prevent misselling and ensure accurate information delivery. The system will provide real-time assistance during calls and perform post-call analysis.

## Hackathon MVP Scope

**Goal**: Build a working demo that showcases the core value proposition - real-time compliance assistance during live calls.

**Key Design Decision**: **"Assist" Button for On-Demand Compliance Checks**
- Transcription runs continuously (Deepgram)
- Compliance checking is **on-demand** - triggered by "Assist" button
- **Benefits**: Reduces unnecessary LLM API calls, lowers costs, faster response when needed
- Agent clicks "Assist" when they need compliance help, not on every utterance

### MVP Features (Must Have for Demo)

1. **Real-time Audio Processing**
   - ✅ Desktop app streams audio to backend-agent
   - ✅ Real-time transcription via Deepgram (continuous)
   - ✅ **On-demand compliance analysis** via OpenAI with Vertex AI Knowledge Base (triggered by "Assist" button)

2. **Frontend Display**
   - ✅ Show live transcription (agent + customer speech)
   - ✅ **"Assist" button** - triggers on-demand compliance check (reduces unnecessary LLM calls)
   - ✅ Display compliance suggestions/alerts when assist button is clicked
   - ✅ Start/stop call recording button
   - ✅ Basic visual indicators (compliance status, loading state for assist)

3. **Core Compliance Detection** (On-Demand)
   - ✅ Compliance rules stored in Vertex AI Knowledge Base
   - ✅ **On-demand compliance checking** - triggered by "Assist" button (reduces LLM API calls)
   - ✅ Alerts/suggestions generated when assist button is clicked
   - ✅ Suggestions generated using knowledge base context
   - ✅ Uses current transcript context when assist is triggered

4. **Post-Call Summary** (Basic)
   - ✅ Show final transcript
   - ✅ Show compliance report summary
   - ✅ List of issues found

### Out of Scope for MVP (Future Enhancements)

- ❌ Authentication/authorization (skip for demo)
- ❌ Call history persistence (basic storage only, no advanced queries)
- ❌ Multi-tenant support
- ❌ Advanced analytics dashboard
- ❌ Export functionality (PDF, CSV)
- ❌ Speaker diarization (if complex - can add if time permits)
- ❌ Complex compliance rule engine (start with simple rules)
- ❌ Advanced database features (indexes, optimization, migrations)

### MVP Simplifications

- **Database**: SQLite (file-based, no server setup needed - perfect for MVP)
- **Authentication**: Skip for demo (or use simple mock)
- **BFF**: Can simplify or merge some functionality if needed for speed
- **Error Handling**: Basic error handling (see recommendations below)
- **Testing**: Manual testing sufficient (no comprehensive test suite needed)
- **Deployment**: Local development setup is fine (no cloud deployment required)
- **LLM Calls**: On-demand via "Assist" button (reduces costs and unnecessary API calls)
- **Call Management**: UUID generated when "Start Recording" clicked, used throughout call lifecycle

### Demo Flow

1. **Setup**: Start all services (backend-agent, backend, frontend)
2. **Start Call**: Click "Start Recording" in frontend
3. **Live Demo**: 
   - Desktop app streams audio
   - Frontend shows real-time transcription (continuous)
   - Agent clicks "Assist" button when they need compliance help
   - Frontend shows compliance suggestions/alerts (on-demand)
4. **End Call**: Click "Stop Recording"
5. **Show Results**: Display post-call summary with compliance report

## Tech Stack Summary

- **Frontend**: React
- **Backend (BFF)**: Node.js/Express
- **Backend-agent**: Python (FastAPI recommended)
- **STT**: Deepgram Streaming API
- **LLM**: OpenAI Streaming API
- **Knowledge Base**: Vertex AI Knowledge Base (for compliance rules/guidelines)
- **Communication Protocol**: Hybrid (SSE + REST for frontend, WebSocket for backend-agent)
- **Package Manager**: pnpm (Node.js/React), pip (Python)
- **Monorepo Tool**: pnpm workspaces (simpler, better Python support)

## Monorepo Structure

```
hackathon/
├── apps/
│   ├── backend-agent/          # Python - Orchestrator service (STT, LLM, audio processing)
│   │   ├── requirements.txt    # Python dependencies (pip)
│   │   ├── .env                # Python environment variables
│   │   └── ...
│   ├── frontend/               # React - User interface for agents
│   │   ├── package.json
│   │   ├── .env.local
│   │   └── ...
│   └── backend/                # Node.js - Backend for Frontend (BFF) - API layer
│       ├── package.json
│       ├── .env
│       └── ...
├── shared/                     # Shared contracts/types (not a package)
│   ├── types/                  # TypeScript types for Node.js/React
│   │   ├── websocket.ts        # WebSocket message types
│   │   ├── api.ts              # REST API types
│   │   └── models.ts           # Data models
│   └── python/                 # Python type definitions (Pydantic models)
│       ├── models.py           # Pydantic models
│       └── websocket.py        # WebSocket message models
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── package.json                # Root package.json for workspace
└── README.md
```

**Note**: 
- Using **pnpm workspaces** for Node.js/React projects (frontend, backend)
- Using **pip** with `requirements.txt` for Python backend-agent (managed separately)
- **Shared folder** instead of package (simpler, no build step needed)
- Python project is in workspace but uses pip for dependencies
- All Node.js projects share dependencies via pnpm workspace

### Shared Types Folder

The `shared/` folder contains shared interfaces and API contracts between all services to ensure type safety and consistency.

**Contents**:
- **TypeScript types** (`shared/types/`): Shared TypeScript interfaces for frontend and backend
- **Python types** (`shared/python/`): Pydantic models for backend-agent
- **WebSocket message contracts**: Message formats for real-time communication
- **REST API contracts**: Request/response types for BFF APIs
- **Data models**: Call, transcription, compliance suggestion models

**Usage**:
- Frontend and Backend (BFF): Import TypeScript types using relative paths: `import { ... } from '../../shared/types/models'`
- Backend-agent: Import Python types: `from shared.python.models import ...`
- **No build step needed** - direct file imports (simpler for MVP)

## Applications Breakdown

### 1. backend-agent (Orchestrator)
**Purpose**: Core AI service that processes audio and provides compliance assistance

**MVP Responsibilities** (Priority Order):
1. ✅ Receive audio packets from desktop app via **WebSocket** (direct connection, 16-bit PCM, 44.1kHz)
2. ✅ Real-time Speech-to-Text (STT) processing via **Deepgram Streaming API** (continuous)
3. ✅ Store transcriptions in-memory during call (associate with Call UUID)
4. ✅ Stream transcriptions to backend via WebSocket (continuous)
5. ✅ **Handle "Assist" button requests** from backend via WebSocket (on-demand)
6. ✅ **Vertex AI Knowledge Base** integration for compliance rules/guidelines lookup (on assist request)
7. ✅ LLM integration via **OpenAI Streaming API** for compliance checking (triggered by assist button)
8. ✅ Generate compliance suggestions/responses using knowledge base context (streaming, on-demand)
9. ✅ Send compliance suggestions to backend via WebSocket (on-demand)
10. ✅ Save full transcript to SQLite when call ends
11. ✅ Post-call analysis processing (basic summary, saved to SQLite)

**Future Enhancements**:
- Speaker diarization (separate agent vs customer speech)
- Advanced compliance rule engine
- More sophisticated prompt engineering

**Tech Stack**:
- Language: **Python**
- Dependency Management: **pip** (requirements.txt)
- Framework: **FastAPI** (better async/WebSocket support)
- STT: **Deepgram Streaming API** (real-time transcription)
- LLM: **OpenAI Streaming API** (GPT-4 or GPT-3.5-turbo for compliance analysis)
- Knowledge Base: **Vertex AI Knowledge Base** (compliance rules/guidelines)
- Audio processing: **WebSocket server** for receiving audio streams from desktop app
- WebSocket library: `websockets` (Python) or FastAPI's built-in WebSocket support
- **Database**: SQLite (file-based, for call transcripts and compliance reports)
- **Audio Format**: 16-bit PCM, 44.1kHz sample rate (from desktop app)

### 2. frontend
**Purpose**: User interface for customer support agents

**MVP Responsibilities** (Priority Order):
1. ✅ Start/stop call recording button (REST POST to backend)
2. ✅ **SSE connection** to `/api/stream` for real-time updates
3. ✅ Display real-time transcription (agent + customer speech) - continuous via SSE
4. ✅ **"Assist" button** - triggers on-demand compliance check (REST POST to backend)
5. ✅ Show compliance suggestions/alerts when assist button is clicked (on-demand via SSE)
6. ✅ Basic visual indicators (compliance status, loading state for assist)
7. ✅ Post-call summary view (transcript + compliance report)
8. ✅ Connection status indicator (SSE connection status)

**Future Enhancements**:
- Advanced dashboard with call history
- Interactive compliance suggestions (accept/reject)
- Audio visualization components
- Advanced analytics

**Tech Stack**:
- Framework: **React**
- Build tool: **Vite** (faster, better for MVP)
- **SSE (Server-Sent Events)** for receiving real-time updates (transcriptions, compliance suggestions)
- **REST API** for sending requests (assist button, call control)
- Audio visualization components

### 3. backend (BFF - Backend for Frontend)
**Purpose**: API layer between frontend and backend-agent

**Responsibilities**:
- **SSE (Server-Sent Events)** endpoint for frontend to receive real-time updates
- **REST API** endpoints for frontend to send requests (assist, call control)
- **WebSocket client** connection to backend-agent (for relaying messages)
- Relay messages between frontend (SSE/REST) and backend-agent (WebSocket)
- Handle "Assist" button requests via REST from frontend → forward to backend-agent via WebSocket
- REST endpoints for call control (start/stop recording)
- Call session management (generate UUID on call start)
- Post-call analysis data retrieval
- CORS configuration for local development

**MVP Simplifications**:
- ❌ Skip authentication/authorization (or use simple mock)
- ❌ Skip rate limiting (not needed for demo)
- ✅ Focus on SSE/REST for frontend, WebSocket for backend-agent
- ✅ SSE streams transcriptions and compliance suggestions to frontend
- ✅ REST handles assist requests and call control from frontend

**Tech Stack**:
- Language: **Node.js**
- Framework: **Express** (simple and fast to set up)
- **SSE**: Express SSE endpoint (`/api/stream`) for real-time updates
- **REST API**: Express routes for assist requests and call control
- **WebSocket library**: `ws` (for connection to backend-agent)
- CORS: `cors` middleware for local development
- Database: SQLite (shared file, both backend and backend-agent can access)

### 4. shared (Shared Types Folder)
**Purpose**: Define shared contracts, types, and schemas between all services

**MVP Responsibilities** (Minimal):
- ✅ Basic TypeScript types for SSE events (`shared/types/sse.ts`)
- ✅ Basic TypeScript types for REST API (`shared/types/api.ts`)
- ✅ Basic TypeScript types for WebSocket messages (`shared/types/websocket.ts`) - for backend-agent
- ✅ Basic Python types (Pydantic models) for backend-agent (`shared/python/models.py`)
- ✅ Core data models (Call, Transcription, ComplianceSuggestion, AssistRequest)
- ✅ Call UUID type (string/UUID format)
- ✅ SSE event contracts (for frontend real-time updates)
- ✅ REST API contracts (for frontend requests)
- ✅ WebSocket message contracts (for backend ↔ backend-agent)
- ✅ Event types: `transcription`, `compliance_suggestion`, `error`, `call_start`, `call_end`

**Future Enhancements**:
- Full OpenAPI/Swagger specifications
- Comprehensive type definitions
- Validation schemas

**Tech Stack**:
- TypeScript for Node.js/React types (no compilation needed, direct imports)
- Pydantic for Python types
- Simple file-based structure (no package build step)

**Key Contracts to Define**:
- **SSE Event Structure**: `event: <type>\ndata: <JSON>\n\n` format
  - Event types: `transcription`, `compliance_suggestion`, `error`, `call_start`, `call_end`
  - Example: `event: transcription\ndata: {"callId": "...", "text": "...", "timestamp": ...}\n\n`
- **REST API Endpoints**:
  - `POST /api/assist`: `{ callId: string, transcript: string }` (last 30-40 seconds)
  - `POST /api/calls/start`: `{}` → Returns `{ callId: string }`
  - `POST /api/calls/stop`: `{ callId: string }` → Returns `{ success: boolean }`
- **WebSocket Message Structure** (Backend ↔ Backend-agent): JSON format with `type`, `callId`, `timestamp`, `data` fields
  - Message types: `assist_request`, `assist_response`, `transcription`, `error`
- **Data models**: Call (with UUID), Transcription, ComplianceSuggestion, Report, AssistRequest
- **Error formats**: SSE: `event: error\ndata: {"message": "...", "code": "..."}\n\n`

## Desktop App Integration

**Existing Component**: Desktop app that collects mic and speaker input

**Integration Points**:
- ✅ **Desktop app → backend-agent**: Direct WebSocket connection (streams audio packets)
- ✅ **Selected Protocol**: WebSocket for desktop app (binary audio streaming)
- ✅ **Audio Format**: 16-bit PCM, 44.1kHz sample rate
- **Note**: Frontend uses SSE + REST, backend-agent uses WebSocket (hybrid architecture)

## Data Flow

### During Live Call (Streaming Architecture with On-Demand Assist):
1. **Call Start**: User clicks "Start Recording" → Frontend sends REST POST → Backend generates unique **Call UUID**
2. Frontend opens **SSE connection** to `/api/stream` for real-time updates
3. Desktop app captures mic (agent) + speaker (customer) audio (16-bit PCM, 44.1kHz)
4. Desktop app streams audio packets to backend-agent via **WebSocket** (direct connection)
5. **Continuous Transcription** (always running):
   - **Deepgram Streaming**: Audio → Real-time transcription (streaming results)
   - Transcriptions stored in backend-agent (in-memory during call, saved to SQLite)
   - backend-agent sends transcriptions to backend via **WebSocket**
   - Backend forwards transcriptions to frontend via **SSE** (continuous stream)
6. **On-Demand Compliance Check** (when "Assist" button clicked):
   - Frontend sends assist request via **REST POST** `/api/assist` with:
     - Call UUID
     - Current transcript context (last 30-40 seconds to avoid token limits)
   - Backend forwards request to backend-agent via **WebSocket**
   - **Vertex AI Knowledge Base**: Query compliance rules/guidelines using transcript text
   - **OpenAI Streaming**: Current transcript + Knowledge Base context → Compliance analysis (streaming responses)
   - Generate compliance suggestions/responses using knowledge base context
7. backend-agent sends results:
   - Transcriptions (from Deepgram) → backend via WebSocket → frontend via SSE (continuous)
   - Compliance suggestions (from OpenAI with KB context) → backend via WebSocket → frontend via SSE (on-demand)
8. Frontend displays:
   - Real-time transcriptions (updating as speech is recognized) - continuous via SSE
   - Compliance alerts/suggestions (when assist button clicked) - on-demand via SSE
   - Visual feedback: loading state during assist processing, status indicators

### Post-Call:
1. Desktop app signals end of call
2. backend-agent processes full call transcript
3. backend-agent generates compliance report
4. Report stored and displayed in frontend

## Key Questions for Clarification

### MVP Critical Questions (Need Answers)
1. **Desktop App Communication**: 
   - ✅ **Selected Protocol**: WebSocket
   - ✅ **Connection Path**: Desktop app connects directly to backend-agent
   - ✅ **Audio Format**: 16-bit PCM, 44.1kHz sample rate
   - Does desktop app send separate audio streams for mic/speaker or combined?

2. **Compliance Rules & Vertex AI Knowledge Base**:
   - ✅ **Selected**: Vertex AI Knowledge Base for storing compliance rules
   - What compliance rules/guidelines need to be in the knowledge base?
   - Do you have compliance documents to upload to Vertex AI KB?
   - What format are the compliance documents? (PDF, text, structured data?)
   - What should the compliance suggestions look like? (warnings, corrections, suggestions?)

3. **OpenAI Model Selection**:
   - Which model? (GPT-3.5-turbo for speed/cost, or GPT-4 for accuracy?)

### Architecture & Integration
- ✅ **Communication Protocol**: Hybrid (SSE + REST + WebSocket)
  - **Frontend ↔ Backend**: SSE (for receiving transcriptions/suggestions) + REST (for sending requests)
  - **Backend ↔ Backend-agent**: WebSocket (for bidirectional message relay)
  - **Desktop app → Backend-agent**: WebSocket (for binary audio streaming)
  - **Benefits**: Simpler frontend code, automatic SSE reconnection, WebSocket where needed for bidirectional/binary

### Post-MVP / Nice to Have Questions
2. **Audio Processing** (Post-MVP):
   - What sample rate and bit depth? (can use defaults for MVP)
   - Do we need to separate agent vs customer speech? (speaker diarization - post-MVP)

3. **STT Requirements** (Deepgram Streaming):
   - ✅ **Selected**: Deepgram Streaming API
   - Deepgram model selection? (nova-2 recommended for MVP - best accuracy)
   - Language support? (English only for MVP, multi-language post-MVP)
   - Speaker diarization? (Post-MVP feature)

4. **LLM & Compliance** (OpenAI Streaming + Vertex AI Knowledge Base):
   - ✅ **Selected**: OpenAI Streaming API
   - ✅ **Selected**: Vertex AI Knowledge Base for compliance rules
   - ✅ **MVP**: On-demand compliance checking via "Assist" button (reduces unnecessary LLM calls)
   - ✅ **MVP**: Responses triggered by assist button with knowledge base context
   - Integration: Query Vertex AI KB → Use results as context for OpenAI prompts
   - **Benefit**: Only calls LLM when agent needs help, reducing costs and API usage
   - Prompt engineering can be refined during development

5. **Frontend Requirements** (Post-MVP):
   - Web-based for MVP (Electron can be post-MVP)
   - Interactive suggestions (accept/reject) - post-MVP
   - Call history dashboard - post-MVP

6. **Post-Call Analysis** (MVP - Basic):
   - MVP: Basic summary with transcript and compliance issues list
   - Post-MVP: Advanced metrics, export formats

7. **Infrastructure** (Post-MVP):
   - MVP: Local development
   - Post-MVP: Cloud deployment, authentication, multi-tenant

8. **Monorepo Tooling**:
   - ✅ **Package manager**: pnpm (for Node.js/React projects)
   - ✅ **Python dependency management**: pip + requirements.txt
   - ✅ **Monorepo tool**: pnpm workspaces
   - pnpm workspaces handle dependency management and linking between Node.js projects

## Technical Decisions

- [x] **STT provider**: Deepgram Streaming API
- [x] **LLM provider**: OpenAI Streaming API (on-demand via "Assist" button)
- [x] **Knowledge Base**: Vertex AI Knowledge Base (for compliance rules/guidelines)
- [x] **Compliance Check**: On-demand via "Assist" button (reduces LLM API calls)
- [x] **Frontend**: React
- [x] **Frontend Build Tool**: Vite
- [x] **Backend (BFF)**: Node.js/Express
- [x] **Backend-agent**: Python/FastAPI
- [x] **Package Manager**: pnpm (for Node.js/React projects)
- [x] **Python dependency management**: pip + requirements.txt
- [x] **Monorepo Tool**: pnpm workspaces (simpler, better Python support)
- [x] **Shared Types**: Shared folder (not a package, simpler for MVP)
- [x] **Real-time communication**: Hybrid architecture
  - Frontend ↔ Backend: SSE + REST (simpler, automatic reconnection)
  - Backend ↔ Backend-agent: WebSocket (bidirectional relay)
  - Desktop app → Backend-agent: WebSocket (binary audio streaming)
- [x] **Database**: SQLite (file-based, no server setup needed - perfect for MVP)
- [x] **MVP Authentication**: Skip or simple mock
- [x] **Desktop App Connection**: Direct to backend-agent via WebSocket
- [x] **Audio Format**: 16-bit PCM, 44.1kHz sample rate
- [x] **Call Management**: UUID generated on call start
- [x] **WebSocket Library**: `ws` for Node.js (recommended)
- [x] **Backend-agent ↔ Backend**: Backend-agent WebSocket server, backend as client
- [ ] Authentication/authorization approach (for future/post-MVP)
- [ ] Deployment strategy (local dev for MVP)

## Configuration & Environment Variables

**Required API Keys** (store in `.env` files):
- `DEEPGRAM_API_KEY` - For Deepgram STT
- `OPENAI_API_KEY` - For OpenAI LLM
- `VERTEX_AI_PROJECT_ID` - For Vertex AI Knowledge Base
- `VERTEX_AI_LOCATION` - For Vertex AI (e.g., "us-central1")
- `VERTEX_AI_KNOWLEDGE_BASE_ID` - For Vertex AI Knowledge Base

**Database Configuration**:
- **Database**: SQLite (file-based, no server needed)
- **Database File**: `compliance.db` (stored in project root or `data/` folder)
- **Connection**: SQLite connection string (e.g., `sqlite:///compliance.db` or file path)
- **Tables**: `calls`, `transcripts`, `compliance_reports`
- **Note**: No separate database server needed - just a file!

**Service Ports** (defaults for local dev):
- Frontend: `3000`
- Backend (BFF): `3001`
- Backend-agent: `8000`

**API Endpoints**:
- **Frontend → Backend**:
  - SSE: `GET http://localhost:3001/api/stream` (real-time transcriptions and suggestions)
  - REST: `POST http://localhost:3001/api/assist` (assist button requests)
  - REST: `POST http://localhost:3001/api/calls/start` (start call)
  - REST: `POST http://localhost:3001/api/calls/stop` (stop call)
- **Backend → Backend-agent**: `ws://localhost:8000/backend` (WebSocket for message relay)
- **Desktop app → Backend-agent**: `ws://localhost:8000/audio` (WebSocket for audio streaming)

**Environment Files**:
- `apps/frontend/.env.local` - Frontend config
- `apps/backend/.env` - Backend config (includes DATABASE_PATH for SQLite)
- `apps/backend-agent/.env` - Backend-agent config (Python, includes DATABASE_PATH for SQLite)

## Database Schema (SQLite)

**Database File**: `compliance.db` (SQLite file-based database)

**Tables**:

1. **calls**
   - `id` (TEXT, primary key) - Call UUID generated on start (stored as TEXT in SQLite)
   - `started_at` (TEXT/DATETIME) - ISO format timestamp
   - `ended_at` (TEXT/DATETIME, nullable) - ISO format timestamp
   - `status` (TEXT) - 'active', 'ended', 'error'
   - `created_at` (TEXT/DATETIME) - ISO format timestamp
   - `updated_at` (TEXT/DATETIME) - ISO format timestamp

2. **transcripts**
   - `id` (INTEGER, primary key, autoincrement)
   - `call_id` (TEXT, foreign key → calls.id)
   - `text` (TEXT) - Transcription text
   - `timestamp` (TEXT/DATETIME) - When this segment was transcribed
   - `speaker` (TEXT, nullable) - 'agent' or 'customer' (if speaker diarization available)
   - `created_at` (TEXT/DATETIME) - ISO format timestamp

3. **compliance_reports**
   - `id` (INTEGER, primary key, autoincrement)
   - `call_id` (TEXT, foreign key → calls.id)
   - `report` (TEXT) - Full compliance report (JSON stored as TEXT in SQLite)
   - `issues_found` (INTEGER) - Count of compliance issues
   - `created_at` (TEXT/DATETIME) - ISO format timestamp

**Note**: SQLite uses TEXT for UUIDs and JSON, and INTEGER for auto-increment IDs. No separate server needed!

## MVP Development Priorities

### Phase 1: Foundation (Day 1)
1. Set up monorepo structure with pnpm workspaces
2. Initialize all apps (backend-agent, backend, frontend)
3. Set up shared types folder with core types (TypeScript + Python)
4. Set up SQLite database schema
5. Get basic services running locally
6. **Non-tech member**: Set up Vertex AI Knowledge Base (can be done in parallel)

### Phase 2: Core Integration (Day 1-2)
1. **backend-agent**: 
   - Set up Deepgram streaming connection
   - Set up Vertex AI Knowledge Base connection
   - Set up OpenAI streaming connection
   - Basic audio → transcription → knowledge base lookup → compliance flow
2. **backend**: 
   - SSE endpoint setup (`/api/stream`)
   - REST API endpoints (`/api/assist`, `/api/calls/start`, `/api/calls/stop`)
   - WebSocket client connection to backend-agent
   - Relay messages between frontend (SSE/REST) and backend-agent (WebSocket)
3. **frontend**: 
   - Basic UI layout
   - SSE client connection to `/api/stream`
   - REST API calls for assist and call control
   - Display transcription stream from SSE

### Phase 3: Real-time Features (Day 2)
1. Complete real-time transcription display (SSE stream)
2. Implement "Assist" button in frontend (REST POST)
3. Implement assist button request handling (REST → WebSocket relay → backend-agent)
4. Implement compliance suggestion display (on-demand via SSE)
5. Add visual indicators (alerts, status, loading state, SSE connection status)
6. Test end-to-end flow with desktop app

### Phase 4: Polish & Demo Prep (Day 2-3)
1. Post-call summary view
2. Basic compliance report generation
3. UI polish
4. Demo script preparation
5. Fix critical bugs

## Architecture Decisions & Recommendations

### ✅ Decisions Made

1. **Desktop App Connection Path** ✅
   - **Decision**: Desktop app connects **directly to backend-agent** via WebSocket
   - **Rationale**: Simpler architecture, fewer hops, lower latency for audio streaming

2. **Audio Format** ✅
   - **Decision**: 16-bit PCM, 44.1kHz sample rate
   - **Format**: Linear PCM (uncompressed)
   - **Compatibility**: Deepgram supports this format natively

3. **Call Session Management** ✅
   - **Decision**: Generate unique UUID when "Start Recording" clicked
   - **Implementation**: UUID passed through all services, used as primary key in SQLite
   - **Format**: Standard UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)

4. **Database** ✅
   - **Decision**: SQLite (file-based, no server setup needed)
   - **Usage**: Store call transcripts, compliance reports, call metadata
   - **Tables**: `calls`, `transcripts`, `compliance_reports`
   - **Benefits**: No database server needed, simple file-based storage, perfect for MVP

5. **Post-Call Analysis** ✅
   - **Decision**: Keep current implementation (automatic on call end)
   - **Trigger**: When "Stop Recording" clicked, backend-agent processes full transcript

### 📋 Recommendations

1. **Frontend ↔ Backend Communication** ✅
   - **Decision**: Hybrid architecture - SSE + REST
   - **SSE**: Frontend receives real-time updates (transcriptions, compliance suggestions)
   - **REST**: Frontend sends requests (assist button, call control)
   - **Benefits**: Simpler frontend code, automatic reconnection, easier debugging
   - **Implementation**: 
     - SSE endpoint: `GET /api/stream` (EventSource in React)
     - REST endpoints: `POST /api/assist`, `POST /api/calls/start`, `POST /api/calls/stop`

2. **Backend-agent ↔ Backend Communication**
   - **Decision**: Backend-agent has WebSocket server, backend connects as WebSocket client
   - **Pattern**: Backend maintains persistent WebSocket connection to backend-agent
   - **Implementation**: Backend connects to `ws://localhost:8000/backend` endpoint
   - **Messages**: Assist requests, transcriptions, compliance suggestions relayed via WebSocket

3. **WebSocket Library Choice**
   - **Recommendation**: Use `ws` library for Node.js backend (lightweight, simpler for MVP)
   - **Alternative**: `socket.io` if need rooms/namespaces for multi-call support
   - **Python**: Use FastAPI's built-in WebSocket support or `websockets` library

6. **Transcript Context for Assist**
   - **Recommendation**: Send **last 30-40 seconds of transcript** (to avoid OpenAI token limits)
   - **Rationale**: 
     - Recent context is most relevant for compliance checking
     - Avoids exceeding token limits and API costs
     - Faster response times
   - **Implementation**: Backend-agent maintains full transcript in-memory, extracts last 30-40s on assist request

9. **Error Handling Details**
   - **Recommendation**: Implement basic error handling for:
     - **WebSocket disconnections**: Auto-reconnect logic (exponential backoff)
     - **API failures**: 
       - Deepgram: Log error, continue transcription if possible
       - OpenAI: Return error message to frontend, show user-friendly message
       - Vertex AI: Fallback to basic compliance check without KB context
     - **Invalid messages**: Validate message structure, return error response
     - **Timeouts**: Set 30s timeout for assist requests, show timeout message
   - **Implementation**: Try-catch blocks, error logging, user-friendly error messages

10. **WebSocket Message Structure**
    - **Recommendation**: Use JSON message format with type field:
    ```typescript
    // Example message structure
    {
      type: 'audio' | 'transcription' | 'assist_request' | 'assist_response' | 'error' | 'call_start' | 'call_end',
      callId: string, // UUID
      timestamp: number,
      data: any // type-specific payload
    }
    ```
    - **Message Types**:
      - `audio`: Audio chunks from desktop app
      - `transcription`: Transcription updates from Deepgram
      - `assist_request`: Assist button click with transcript context
      - `assist_response`: Compliance suggestions from OpenAI
      - `error`: Error messages
      - `call_start`: Call initialization with UUID
      - `call_end`: Call termination signal

12. **Vertex AI KB Query Details**
    - **Recommendation**: Use Vertex AI Search API (Grounding API) for knowledge retrieval
    - **Query Format**: 
      - Send transcript text as query
      - Use semantic search to find relevant compliance rules
      - Retrieve top 3-5 most relevant documents/chunks
    - **Integration**: 
      - Use `google-cloud-aiplatform` Python SDK
      - Query format: `search(query=transcript_text, max_results=5)`
      - Include retrieved context in OpenAI prompt

13. **CORS Configuration**
    - **Recommendation**: Configure CORS in Express backend for local development
    - **Implementation**: 
      ```javascript
      app.use(cors({
        origin: 'http://localhost:3000', // Frontend URL
        credentials: true
      }));
      ```
    - **Production**: Configure based on deployment environment

16. **Transcript Storage During Call**
    - **Recommendation**: 
      - Store transcript in-memory in backend-agent during call (associate with Call UUID)
      - Save to SQLite when call ends
      - For assist requests: Extract from in-memory transcript (last 30-40 seconds max to avoid token limits)
    - **Data Structure**: 
      ```python
      {
        call_id: str,
        transcript: List[Dict], # [{timestamp, text, speaker?}]
        created_at: datetime,
        updated_at: datetime
      }
      ```

17. **Desktop App Status Updates**
    - **Recommendation**: Define status message types:
      - `connection_status`: Connected/Disconnected
      - `recording_status`: Recording/Stopped
      - `error_status`: Error messages from desktop app
    - **Implementation**: Optional WebSocket connection desktop app ↔ frontend (or through backend)
    - **MVP**: Can skip if not critical for demo

## ⚠️ Feasibility Review & Decisions Applied

**See `FEASIBILITY_REVIEW.md` for detailed analysis**

### ✅ Decisions Applied:

1. **Monorepo Tool** ✅
   - **Decision**: Use **pnpm workspaces only** (no Nx)
   - **Rationale**: Simpler setup, better Python support, faster for hackathon

2. **Database** ✅
   - **Decision**: Use **SQLite** instead of PostgreSQL
   - **Rationale**: File-based, no server setup, perfect for MVP

3. **Vertex AI KB** ✅
   - **Decision**: Keep Vertex AI KB (non-tech member can set it up)
   - **Rationale**: Non-tech member can handle setup in parallel, good use of team resources

4. **Shared Types** ✅
   - **Decision**: Use **shared folder** instead of contract package
   - **Rationale**: No build step needed, simpler imports, faster development

5. **Services Architecture** ✅
   - **Decision**: Keep 3 services (acknowledge complexity but manageable)
   - **Rationale**: Good separation of concerns, team can work in parallel

### ✅ Additional Decisions:

6. **Frontend Communication** ✅
   - **Decision**: Hybrid architecture - SSE + REST (instead of WebSocket)
   - **Rationale**: Simpler frontend code, automatic reconnection, easier debugging
   - **Implementation**: SSE for receiving updates, REST for sending requests

### ⚠️ Remaining Considerations:

- **Three API Integrations**: Deepgram + OpenAI + Vertex AI (all needed for demo)
- **Transcript Context Size**: Limit to 30-40 seconds max for assist requests (to avoid token limits)
- **SSE Connection Management**: Handle SSE reconnection in frontend (EventSource handles this automatically)
- **Audio Format Verification**: Verify Deepgram accepts 16-bit PCM 44.1kHz directly (may need conversion to 16kHz mono if not supported)
- **Database Performance**: SQLite indexes not included in MVP (add if performance becomes an issue during demo)

## Next Steps

1. ✅ Finalize tech stack decisions (DONE)
2. ✅ Review feasibility issues and apply simplifications (DONE)
3. **Set up monorepo structure** with pnpm workspaces
4. **Set up shared types folder** with minimal MVP types (TypeScript + Python)
5. **Set up SQLite database** with schema (simple file-based)
6. **Non-tech member: Set up Vertex AI Knowledge Base** (can be done in parallel)
7. Build backend-agent core (Deepgram + OpenAI integration)
8. Build backend WebSocket relay
9. Build frontend basic UI
10. Integrate with desktop app
11. Test and polish for demo

## Team Assignment Suggestions (4 members, 2 non-tech)

**Tech Members (2)**:
- **Member 1**: Backend-agent (Python/FastAPI, Deepgram, OpenAI, SQLite, WebSocket server)
- **Member 2**: Backend (Node.js/Express, SSE + REST, WebSocket client) + Frontend (React, SSE client)

**Non-Tech Members (2)**:
- **Member 3**: Vertex AI Knowledge Base setup, compliance document preparation
- **Member 4**: Testing, documentation, demo preparation, UI/UX feedback

