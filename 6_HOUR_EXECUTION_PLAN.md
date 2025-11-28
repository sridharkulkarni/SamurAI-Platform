# 6-Hour Execution Plan - Compliance Support AI Agent

**Timeline**: 6 hours  
**Team**: 4 members (2 tech, 2 non-tech)  
**Goal**: Working demo with all core features

---

## ⚠️ Pre-Hackathon Setup (Do Before 6 Hours Start)

### Non-Tech Member 1 (Critical - Do First):
- [ ] Set up GCP project
- [ ] Enable Vertex AI APIs
- [ ] Create Vertex AI Knowledge Base
- [ ] Upload compliance documents (PDF/text)
- [ ] Test KB queries
- [ ] Document KB ID, project ID, location
- [ ] Create `.env.example` with required keys

**Time Required**: 2-3 hours (can be done days before)

### Tech Members (Optional but Recommended):
- [ ] Set up monorepo structure locally
- [ ] Create basic project skeletons
- [ ] Install dependencies
- [ ] Set up `.env` templates
- [ ] Test basic connections

**Time Required**: 1 hour (saves time during hackathon)

---

## Hour 1: Foundation + Quick Wins (0:00 - 1:00)

### Tech Member 1: Backend-Agent Foundation

**Tasks** (60 min):
- [ ] Set up pnpm workspace structure (5 min)
  ```bash
  pnpm init
  # Create pnpm-workspace.yaml
  ```
- [ ] Create `apps/backend-agent/` folder (5 min)
- [ ] Set up Python virtual environment (5 min)
  ```bash
  python -m venv venv
  source venv/bin/activate  # or venv\Scripts\activate on Windows
  ```
- [ ] Install dependencies (5 min)
  ```bash
  pip install fastapi uvicorn websockets deepgram-sdk openai google-cloud-aiplatform sqlite3
  ```
- [ ] Create `main.py` with FastAPI WebSocket server skeleton (10 min)
  - Basic WebSocket endpoint for desktop app
  - Basic WebSocket endpoint for backend
- [ ] Set up SQLite database (10 min)
  - Create `database.py` with schema
  - 3 tables: calls, transcripts, compliance_reports
  - Basic connection function
- [ ] Deepgram streaming connection test (15 min)
  - Import Deepgram SDK
  - Create basic connection (test with sample audio or mock)
- [ ] Store transcriptions in-memory (dict/list) (5 min)

**Deliverables**:
- ✅ WebSocket server running
- ✅ SQLite database created
- ✅ Deepgram connection working

---

### Tech Member 2: Backend + Frontend Foundation

**Tasks** (60 min):
- [ ] Create `apps/backend/` folder (5 min)
- [ ] Initialize Node.js project (5 min)
  ```bash
  npm init -y
  npm install express ws cors
  npm install -D nodemon
  ```
- [ ] Create `apps/frontend/` folder (5 min)
- [ ] Set up React + Vite (5 min)
  ```bash
  pnpm create vite apps/frontend --template react
  cd apps/frontend && pnpm install
  ```
- [ ] Express server with SSE endpoint (15 min)
  - Create `index.js`
  - Set up `/api/stream` SSE endpoint
  - CORS configuration
- [ ] REST API endpoints (15 min)
  - `POST /api/calls/start` - Start call
  - `POST /api/calls/stop` - Stop call
  - `POST /api/assist` - Request compliance check
- [ ] WebSocket client to backend-agent (10 min)
  - Install `ws` library
  - Create WebSocket client connection
  - Basic message relay
- [ ] Frontend basic UI layout (10 min)
  - Transcription display area
  - Assist button
  - Suggestions display area
  - Basic styling

**Deliverables**:
- ✅ Express server running
- ✅ SSE endpoint working
- ✅ REST endpoints created
- ✅ React app running
- ✅ Basic UI layout

---

### Non-Tech Member 1: Vertex AI KB Finalization

**Tasks** (60 min):
- [ ] Verify Vertex AI KB is set up (if not done pre-hackathon)
- [ ] Test KB queries with sample questions
- [ ] Document query format for tech member 1
- [ ] Prepare compliance test scenarios
- [ ] Create compliance rules reference document

**Deliverables**:
- ✅ Vertex AI KB ready
- ✅ Query documentation ready
- ✅ Test scenarios prepared

---

### Non-Tech Member 2: Testing Prep

**Tasks** (60 min):
- [ ] Create testing checklist
- [ ] Prepare demo script
- [ ] Set up bug tracking (simple doc/spreadsheet)
- [ ] Prepare test call scenarios
- [ ] Document expected behaviors

**Deliverables**:
- ✅ Testing checklist ready
- ✅ Demo script prepared

---

## Hour 2: Core Integrations (1:00 - 2:00)

### Tech Member 1: Deepgram + Vertex AI KB

**Tasks** (60 min):
- [ ] Complete Deepgram streaming integration (20 min)
  - Handle audio chunks from desktop app
  - Stream to Deepgram
  - Receive transcriptions
  - Store in-memory + save to SQLite
- [ ] Send transcriptions to backend via WebSocket (10 min)
  - Format: `{type: 'transcription', callId: '...', text: '...', timestamp: '...'}`
- [ ] Vertex AI Knowledge Base integration (20 min)
  - Install `google-cloud-aiplatform`
  - Set up authentication (service account key)
  - Create KB query function
  - Test with sample query
- [ ] OpenAI integration setup (10 min)
  - Install OpenAI SDK
  - Create basic API call function
  - Test connection

**Deliverables**:
- ✅ Real-time transcriptions working
- ✅ Vertex AI KB queries working
- ✅ OpenAI connection working

---

### Tech Member 2: SSE Relay + Frontend Display

**Tasks** (60 min):
- [ ] Complete WebSocket client to backend-agent (15 min)
  - Handle connection/reconnection
  - Relay messages from backend-agent
- [ ] Complete SSE relay (15 min)
  - Forward transcriptions to frontend via SSE
  - Format messages properly
- [ ] Frontend SSE client (15 min)
  - Use EventSource to connect to `/api/stream`
  - Handle incoming messages
  - Update state with transcriptions
- [ ] Display transcriptions in UI (15 min)
  - Real-time transcription display
  - Auto-scroll to latest
  - Basic formatting

**Deliverables**:
- ✅ Transcriptions flowing: backend-agent → backend → frontend
- ✅ Real-time display working

---

## Hour 3: Assist Flow + Compliance (2:00 - 3:00)

### Tech Member 1: Assist Logic + Compliance

**Tasks** (60 min):
- [ ] Assist request handler (15 min)
  - Receive assist request from backend
  - Get last 30-40 seconds of transcript
  - Query Vertex AI KB for relevant rules
- [ ] OpenAI compliance check (20 min)
  - Build prompt with transcript + KB context
  - Call OpenAI API
  - Parse response
  - Format compliance suggestions
- [ ] Send suggestions to backend (10 min)
  - Format: `{type: 'assist_response', callId: '...', suggestions: [...]}`
- [ ] Post-call analysis skeleton (15 min)
  - Function to analyze full transcript
  - Generate summary report
  - Save to SQLite

**Deliverables**:
- ✅ Assist button triggers compliance check
- ✅ Suggestions returned
- ✅ Post-call analysis function ready

---

### Tech Member 2: Frontend Assist + Display

**Tasks** (60 min):
- [ ] Assist button functionality (15 min)
  - Connect button to REST API
  - POST to `/api/assist` with callId
  - Show loading state
- [ ] Display compliance suggestions (20 min)
  - Receive suggestions via SSE
  - Display in UI
  - Format nicely (list, cards, etc.)
- [ ] Post-call summary view (20 min)
  - New view/component for post-call
  - Fetch summary from backend
  - Display report
- [ ] Basic styling (5 min)
  - Make it look presentable
  - Add basic colors, spacing

**Deliverables**:
- ✅ Assist button works
- ✅ Suggestions display
- ✅ Post-call view ready

---

## Hour 4: Polish + Shared Types (3:00 - 4:00)

### Tech Member 1: Shared Types + Polish

**Tasks** (60 min):
- [ ] Create `shared/` folder structure (5 min)
  - `shared/python/` for Pydantic models
  - `shared/types/` for TypeScript types
- [ ] Define Python models (15 min)
  - `Call`, `Transcript`, `ComplianceReport` models
  - WebSocket message models
- [ ] Complete post-call analysis (20 min)
  - Analyze full transcript
  - Generate compliance report
  - Count issues
  - Save to SQLite
- [ ] Basic error handling (10 min)
  - Try/catch blocks
  - Log errors
  - Return error messages
- [ ] Bug fixes (10 min)

**Deliverables**:
- ✅ Shared types defined
- ✅ Post-call analysis complete
- ✅ Basic error handling

---

### Tech Member 2: Shared Types + UI Polish

**Tasks** (60 min):
- [ ] Define TypeScript types (15 min)
  - `Call`, `Transcript`, `ComplianceSuggestion` types
  - API request/response types
  - SSE message types
- [ ] UI polish (25 min)
  - Better styling
  - Loading states
  - Error messages display
  - Status indicators
- [ ] Basic error handling (10 min)
  - Try/catch in API calls
  - Display error messages
  - Handle SSE disconnections
- [ ] Bug fixes (10 min)

**Deliverables**:
- ✅ Shared types defined
- ✅ UI polished
- ✅ Error handling in place

---

## Hour 5: Desktop App Integration (4:00 - 5:00)

### Tech Member 1 + Tech Member 2: Integration

**Tasks** (60 min):
- [ ] Connect desktop app to backend-agent (20 min)
  - Test WebSocket connection
  - Verify audio format (16-bit PCM, 44.1kHz)
  - Handle audio chunks
- [ ] End-to-end testing (25 min)
  - Test full flow: audio → transcription → assist → suggestions
  - Test post-call analysis
  - Verify database saves
- [ ] Fix critical bugs (15 min)
  - Connection issues
  - Message format issues
  - API errors

**Deliverables**:
- ✅ Desktop app connected
- ✅ End-to-end flow working
- ✅ Critical bugs fixed

---

### Non-Tech Member 2: Testing

**Tasks** (60 min):
- [ ] Test all user flows
  - Start call
  - See transcriptions
  - Click assist button
  - See suggestions
  - End call
  - View post-call summary
- [ ] Report bugs to tech members
- [ ] Verify demo script works
- [ ] Test edge cases (if time)

**Deliverables**:
- ✅ All flows tested
- ✅ Bugs documented
- ✅ Demo script verified

---

## Hour 6: Final Polish + Demo Prep (5:00 - 6:00)

### All Team Members

**Tasks** (60 min):
- [ ] Final bug fixes (20 min)
  - Tech members fix remaining bugs
  - Non-tech members verify fixes
- [ ] UI polish (15 min)
  - Final styling touches
  - Ensure everything looks good
- [ ] Demo script run-through (15 min)
  - Practice demo
  - Time it
  - Fix any issues
- [ ] Prepare presentation (10 min)
  - Key features to highlight
  - Architecture diagram (if time)
  - Prepare talking points

**Deliverables**:
- ✅ Demo-ready system
- ✅ Demo script practiced
- ✅ Presentation ready

---

## Critical Path (Must Work for Demo)

1. **Desktop App → Backend-Agent** (WebSocket) - 30 min
2. **Backend-Agent → Deepgram** (Streaming) - 30 min
3. **Backend-Agent → Backend** (WebSocket) - 15 min
4. **Backend → Frontend** (SSE) - 15 min
5. **Assist Button → OpenAI** (Compliance Check) - 30 min
6. **Display Suggestions** - 15 min

**Total Core Flow**: ~2 hours  
**Remaining Time**: 4 hours for polish, Vertex AI KB, SQLite, post-call, shared types

---

## Time-Saving Tips

### 1. Use Templates/Boilerplate
- Copy FastAPI WebSocket examples
- Copy Express SSE examples
- Copy React + Vite setup
- Copy SQLite schema templates

### 2. Copy-Paste from Docs
- Deepgram streaming example code
- OpenAI streaming example code
- Vertex AI KB query example
- SSE implementation example

### 3. Minimal but Functional
- SQLite: 3 tables, no indexes (add if needed)
- Shared types: Minimal types, expand later
- UI: Functional, not perfect
- Error handling: Try/catch + user message

### 4. Parallel Work
- Tech 1 and Tech 2 work simultaneously
- Non-tech members handle setup/testing in parallel
- No blocking dependencies

---

## Success Criteria

### Must Work:
- ✅ Desktop app streams audio to backend-agent
- ✅ Real-time transcriptions display in frontend
- ✅ Assist button triggers compliance check
- ✅ Compliance suggestions appear
- ✅ Post-call summary generated
- ✅ Basic UI is functional

### Nice to Have:
- ✅ UI looks polished
- ✅ Error handling is robust
- ✅ All edge cases handled
- ✅ Performance optimized

---

## Quick Reference: Key Commands

### Backend-Agent (Python)
```bash
cd apps/backend-agent
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Backend (Node.js)
```bash
cd apps/backend
npm run dev  # or nodemon index.js
```

### Frontend (React)
```bash
cd apps/frontend
pnpm dev
```

### Install All Dependencies
```bash
# Root
pnpm install

# Backend-agent
cd apps/backend-agent
pip install -r requirements.txt
```

---

## Environment Variables Needed

### Backend-Agent (.env)
```
DEEPGRAM_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
VERTEX_AI_PROJECT_ID=...
VERTEX_AI_LOCATION=...
VERTEX_AI_KB_ID=...
DATABASE_PATH=./calls.db
BACKEND_WS_URL=ws://localhost:3001
```

### Backend (.env)
```
BACKEND_AGENT_WS_URL=ws://localhost:8000
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:3001
```

---

## Troubleshooting Quick Fixes

### WebSocket Connection Failed
- Check ports (8000 for backend-agent, 3001 for backend)
- Check CORS settings
- Verify WebSocket URLs

### Deepgram Not Working
- Check API key
- Verify audio format (may need conversion)
- Check network connection

### Vertex AI KB Not Working
- Verify service account key path
- Check project ID and location
- Verify KB ID

### SSE Not Working
- Check EventSource URL
- Verify CORS on backend
- Check browser console for errors

### SQLite Errors
- Check file permissions
- Verify database path
- Check schema creation

---

## Final Checklist (Before Demo)

- [ ] All services running
- [ ] Desktop app connected
- [ ] Transcriptions working
- [ ] Assist button working
- [ ] Suggestions displaying
- [ ] Post-call analysis working
- [ ] Database saving data
- [ ] UI looks presentable
- [ ] Demo script practiced
- [ ] Presentation ready

---

**Good luck! Focus on the critical path first, then add polish. You've got this! 🚀**

