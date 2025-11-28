# Next Steps - Getting the MVP Running

## ✅ What's Done

- ✅ Monorepo structure with pnpm workspaces
- ✅ Shared types (TypeScript + Python)
- ✅ Backend-agent (Python/FastAPI) with all integrations
- ✅ Backend (Node.js/Express) with SSE + REST + WebSocket
- ✅ Frontend (React) with enterprise UI
- ✅ Documentation (README, SETUP guide)

## 🚀 Immediate Next Steps

### Step 1: Install Dependencies (15 min)

```bash
# 1. Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Install root dependencies
pnpm install

# 3. Install backend dependencies
cd apps/backend
npm install
cd ../..

# 4. Install frontend dependencies
cd apps/frontend
pnpm install
cd ../..

# 5. Install backend-agent dependencies
cd apps/backend-agent
uv sync
cd ../..
```

### Step 2: Configure Environment Variables (10 min)

**Backend-Agent** - Create `apps/backend-agent/.env`:
```env
DEEPGRAM_API_KEY=your_actual_deepgram_key
OPENAI_API_KEY=your_actual_openai_key
GOOGLE_APPLICATION_CREDENTIALS=google-creds.json
VERTEX_AI_PROJECT_ID=ccai-platform-servify
VERTEX_AI_LOCATION=europe-west3
VERTEX_AI_RAG_CORPUS_ID=137359788634800128
DATABASE_PATH=./calls.db
BACKEND_WS_URL=ws://localhost:3001
PORT=8000
```

**Backend** - Create `apps/backend/.env`:
```env
BACKEND_AGENT_WS_URL=ws://localhost:8000/backend
FRONTEND_URL=http://localhost:5173
PORT=3001
```

**Frontend** - Create `apps/frontend/.env.local`:
```env
VITE_API_URL=http://localhost:3001
```

### Step 3: Test Individual Services (30 min)

#### Test Backend-Agent
```bash
cd apps/backend-agent
export PYTHONPATH="${PYTHONPATH}:$(pwd)/../.."
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Note**: `--host 0.0.0.0` allows connections from other devices/IPs, not just localhost

**Check:**
- ✅ Server starts without errors
- ✅ Visit `http://localhost:8000/health` - should return `{"status": "healthy"}`
- ✅ Check for import errors (especially shared Python models)

#### Test Backend
```bash
cd apps/backend
npm run dev
```

**Check:**
- ✅ Server starts on port 3001
- ✅ Visit `http://localhost:3001/health` - should return status
- ✅ WebSocket client attempts to connect to backend-agent

#### Test Frontend
```bash
cd apps/frontend
pnpm dev
```

**Check:**
- ✅ Frontend starts on port 5173
- ✅ Visit `http://localhost:5173` - UI loads
- ✅ No console errors

### Step 4: Fix Any Issues (30-60 min)

**Common Issues to Check:**

1. **Python Import Errors**
   - Ensure `PYTHONPATH` includes project root
   - Check that `shared/python/__init__.py` exists
   - Verify imports in `main.py`, `compliance.py`, etc.

2. **Vertex AI RAG API**
   - Verify `google-cloud-aiplatform` version supports RAG API
   - Check service account has RAG Corpus access
   - Test RAG client separately if needed

3. **Deepgram Integration**
   - Verify Deepgram SDK version compatibility
   - Check async callback handling
   - Test with sample audio if possible

4. **WebSocket Connections**
   - Verify ports (8000 for backend-agent, 3001 for backend)
   - Check CORS settings
   - Test WebSocket endpoints manually

5. **SSE Connection**
   - Verify backend SSE endpoint works
   - Check browser console for EventSource errors
   - Test SSE connection manually

### Step 5: End-to-End Testing (30 min)

**Test Flow:**

1. **Start All Services** (3 terminals)
   ```bash
   # Terminal 1: Backend-Agent
   cd apps/backend-agent
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/../.."
   uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

   # Terminal 2: Backend
   cd apps/backend
   npm run dev

   # Terminal 3: Frontend
   cd apps/frontend
   pnpm dev
   ```

2. **Test Frontend UI**
   - ✅ Open `http://localhost:5173`
   - ✅ Check status indicator shows connection
   - ✅ Click "Start Recording" - should generate call ID
   - ✅ UI should show call is active

3. **Test Desktop App Connection**
   - ✅ Desktop app connects to `ws://localhost:8000/audio`
   - ✅ Send first message: `{"callId": "test-call-id"}`
   - ✅ Send audio chunks (binary)
   - ✅ Check backend-agent logs for Deepgram connection

4. **Test Transcription Flow**
   - ✅ Audio → Deepgram → Transcription
   - ✅ Transcription appears in frontend via SSE
   - ✅ Check database for saved transcripts

5. **Test Assist Button**
   - ✅ Click "Assist" button in frontend
   - ✅ Check backend-agent logs for:
     - Vertex AI RAG query
     - OpenAI compliance check
   - ✅ Suggestions appear in frontend

6. **Test Post-Call**
   - ✅ Click "Stop Recording"
   - ✅ Post-call summary should appear
   - ✅ Check database for compliance report

### Step 6: Fix Integration Issues (As Needed)

**If things don't work:**

1. **Check Logs**
   - Backend-agent console output
   - Backend console output
   - Frontend browser console
   - Network tab for API calls

2. **Verify Message Flow**
   - Desktop app → Backend-agent (WebSocket `/audio`)
   - Backend-agent → Backend (WebSocket `/backend`)
   - Backend → Frontend (SSE `/api/stream`)
   - Frontend → Backend (REST API)

3. **Test Each Integration Separately**
   - Test Deepgram connection alone
   - Test Vertex AI RAG query alone
   - Test OpenAI API alone
   - Test WebSocket connections alone

### Step 7: Polish & Final Testing (30 min)

1. **UI Polish**
   - ✅ Check all components render correctly
   - ✅ Verify responsive design
   - ✅ Test loading states
   - ✅ Test error states

2. **Error Handling**
   - ✅ Test WebSocket disconnections
   - ✅ Test API failures
   - ✅ Verify error messages display

3. **Performance**
   - ✅ Check transcription latency
   - ✅ Check assist response time
   - ✅ Verify no memory leaks

## 🐛 Known Issues to Watch For

1. **Vertex AI RAG API** - May need API version adjustments
2. **Deepgram Callback** - Async handling may need tweaks
3. **Python Imports** - PYTHONPATH must be set correctly
4. **WebSocket Message Format** - Verify JSON structure matches
5. **SSE Event Format** - Check event names match frontend expectations

## 📝 Testing Checklist

- [ ] All services start without errors
- [ ] Backend-agent health check works
- [ ] Backend health check works
- [ ] Frontend loads without errors
- [ ] Desktop app can connect to backend-agent
- [ ] Audio streaming works
- [ ] Transcriptions appear in real-time
- [ ] Assist button triggers compliance check
- [ ] Compliance suggestions appear
- [ ] Post-call summary generates
- [ ] Database saves data correctly
- [ ] Error handling works
- [ ] UI looks professional

## 🎯 Success Criteria

You're ready for demo when:
- ✅ All services run simultaneously
- ✅ Desktop app streams audio successfully
- ✅ Real-time transcriptions display
- ✅ Assist button returns compliance suggestions
- ✅ Post-call summary shows complete report
- ✅ No critical errors in console/logs

## 🆘 If You Get Stuck

1. Check logs in all three terminals
2. Verify environment variables are set correctly
3. Test each service independently
4. Check browser console and network tab
5. Verify API keys are valid
6. Check service account permissions for Vertex AI

Good luck! 🚀

