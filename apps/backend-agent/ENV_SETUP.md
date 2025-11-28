# Backend-Agent Environment Variables

Create a `.env` file in this directory with the following content:

```env
# Deepgram API
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Vertex AI Configuration (RAG Corpus)
GOOGLE_APPLICATION_CREDENTIALS=google-creds.json
VERTEX_AI_PROJECT_ID=ccai-platform-servify
VERTEX_AI_LOCATION=europe-west3
VERTEX_AI_RAG_CORPUS_ID=137359788634800128

# Database
DATABASE_PATH=./calls.db

# Backend WebSocket URL
BACKEND_WS_URL=ws://localhost:3001

# Server Configuration
PORT=8000
```

## Notes

- `GOOGLE_APPLICATION_CREDENTIALS` should point to your GCP service account JSON file (e.g., `google-creds.json`)
- Make sure the service account has permissions to access the RAG Corpus
- The RAG Corpus ID is already configured for your project

