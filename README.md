# Compliance Support AI Agent

A real-time compliance assistance system for customer support agents that provides on-demand compliance checking during live calls.

## Architecture

- **Frontend**: React + Vite (Enterprise UI)
- **Backend (BFF)**: Node.js/Express (SSE + REST + WebSocket relay)
- **Backend-Agent**: Python/FastAPI (STT, LLM, compliance logic)
- **STT**: Deepgram Streaming API
- **LLM**: OpenAI Streaming API
- **Knowledge Base**: Vertex AI RAG Corpus

## Project Structure

```
hackathon/
├── apps/
│   ├── backend-agent/    # Python/FastAPI - Orchestrator service
│   ├── backend/           # Node.js/Express - BFF (SSE + REST + WebSocket)
│   └── frontend/         # React - Enterprise UI
├── shared/               # Shared types and contracts
│   ├── types/           # TypeScript types
│   └── python/          # Python Pydantic models
└── pnpm-workspace.yaml
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- pnpm
- uv (Python package manager)
- API Keys: Deepgram, OpenAI, Vertex AI (GCP service account)

### Setup

1. **Install dependencies**:
   ```bash
   # Root
   pnpm install
   
   # Backend-agent (using uv)
   cd apps/backend-agent
   uv sync  # Installs dependencies using uv
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env` in each app directory
   - Fill in your API keys and configuration

3. **Start services**:
   ```bash
   # Terminal 1: Backend-agent (port 8000)
   cd apps/backend-agent
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/../.."
   uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

   # Terminal 2: Backend (port 3001)
   cd apps/backend
   npm run dev

   # Terminal 3: Frontend (port 5173)
   cd apps/frontend
   pnpm dev
   ```

4. **Connect desktop app**:
   - Desktop app should connect to `ws://localhost:8000/audio`
   - Frontend will be available at `http://localhost:5173`

## Features

- Real-time transcription (Deepgram streaming)
- On-demand compliance checking (Assist button)
- Vertex AI RAG Corpus integration
- Post-call analysis and reporting
- Enterprise-grade UI

## Communication Flow

1. **Desktop App → Backend-Agent**: WebSocket (`/audio`) - Binary audio streaming
2. **Backend-Agent → Backend**: WebSocket (`/backend`) - JSON messages
3. **Backend → Frontend**: SSE (`/api/stream`) - Real-time updates
4. **Frontend → Backend**: REST API - Requests (assist, call control)

## License

MIT

