# Setup Instructions

## Prerequisites

- Node.js 18+ and pnpm
- Python 3.9+
- API Keys:
  - Deepgram API key
  - OpenAI API key
  - Google Cloud service account JSON file (for Vertex AI)
  - Vertex AI Knowledge Base ID (already set up)

## Step 1: Install Dependencies

### Root (pnpm workspace)
```bash
pnpm install
```

### Backend (Node.js)
```bash
cd apps/backend
npm install
```

### Frontend (React)
```bash
cd apps/frontend
pnpm install
```

### Backend-Agent (Python with uv)
```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

cd apps/backend-agent
uv sync  # This will create venv and install dependencies
```

## Step 2: Configure Environment Variables

### Backend-Agent (.env)
Create `apps/backend-agent/.env`:
```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=google-creds.json
VERTEX_AI_PROJECT_ID=ccai-platform-servify
VERTEX_AI_LOCATION=europe-west3
VERTEX_AI_RAG_CORPUS_ID=137359788634800128
DATABASE_PATH=./calls.db
BACKEND_WS_URL=ws://localhost:3001
PORT=8000
```

### Backend (.env)
Create `apps/backend/.env`:
```env
BACKEND_AGENT_WS_URL=ws://localhost:8000/backend
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### Frontend (.env.local)
Create `apps/frontend/.env.local`:
```env
VITE_API_URL=http://localhost:3001
```

## Step 3: Set Python Path

For the backend-agent to import shared Python models, set PYTHONPATH:

```bash
# Linux/Mac
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Windows (PowerShell)
$env:PYTHONPATH = "$env:PYTHONPATH;$PWD"
```

Or run backend-agent from the project root:
```bash
cd /path/to/hackathon
python -m apps.backend-agent.main
```

## Step 4: Start Services

### Terminal 1: Backend-Agent
```bash
cd apps/backend-agent
export PYTHONPATH="${PYTHONPATH}:$(pwd)/../.."
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Important**: Use `--host 0.0.0.0` to bind to all network interfaces (allows connections from other devices/IPs, not just localhost)

### Terminal 2: Backend
```bash
cd apps/backend
npm run dev
```

### Terminal 3: Frontend
```bash
cd apps/frontend
pnpm dev
```

## Step 5: Connect Desktop App

Desktop app should connect to: `ws://localhost:8000/audio`

First message should be JSON:
```json
{"callId": "optional-uuid-or-empty"}
```

Then send binary audio chunks (16-bit PCM, 44.1kHz).

## Step 6: Access Frontend

Open browser: `http://localhost:5173`

## Troubleshooting

### Python Import Errors
- Ensure PYTHONPATH includes project root
- Check that shared/python/__init__.py exists
- Verify virtual environment is activated

### WebSocket Connection Issues
- Check that backend-agent is running on port 8000
- Verify backend is running on port 3001
- Check CORS settings in backend

### SSE Connection Issues
- Verify backend is running
- Check browser console for errors
- Ensure callId is provided in query parameter

### Database Issues
- Check DATABASE_PATH in backend-agent/.env
- Ensure write permissions for database file
- Database will be created automatically on first run

