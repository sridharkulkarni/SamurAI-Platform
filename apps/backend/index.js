/** Express server with SSE and REST endpoints */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import BackendAgentClient from './websocket_client.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const BACKEND_AGENT_WS_URL = process.env.BACKEND_AGENT_WS_URL || 'ws://localhost:8000/backend';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// SSE clients storage
const sseClients = new Map(); // callId -> Set of response objects

// Backend-agent WebSocket client
const backendAgentClient = new BackendAgentClient(BACKEND_AGENT_WS_URL);

// Handle messages from backend-agent
backendAgentClient.on('message', (message) => {
  const callId = message.callId;
  let type = message.type;

  // Map assist_response to compliance_suggestion for frontend
  if (type === 'assist_response') {
    type = 'compliance_suggestion';
  }

  // Forward to all SSE clients for this call
  if (callId && sseClients.has(callId)) {
    const clients = sseClients.get(callId);
    
    // Include timestamp from message level if available
    const sseData = {
      ...message.data,
      timestamp: message.timestamp 
        ? new Date(message.timestamp).toISOString() 
        : new Date().toISOString()
    };
    
    const sseMessage = formatSSEMessage(type, sseData);

    clients.forEach((res) => {
      try {
        res.write(sseMessage);
      } catch (error) {
        console.error('[Backend] Error sending SSE message:', error);
      }
    });
  }
});

// Handle connection errors gracefully (don't crash server)
backendAgentClient.on('error', (error) => {
  // Only log non-connection errors
  if (error.code !== 'ECONNREFUSED') {
    console.error('[Backend] Backend-agent connection error:', error.message || error);
  }
  // Don't let errors crash the server - connection will retry automatically
});

// Connect to backend-agent (will retry if connection fails)
backendAgentClient.connect();

// SSE endpoint
app.get('/api/stream', (req, res) => {
  const callId = req.query.callId;

  if (!callId) {
    return res.status(400).json({ error: 'callId query parameter is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Store client
  if (!sseClients.has(callId)) {
    sseClients.set(callId, new Set());
  }
  sseClients.get(callId).add(res);

  // Send connection status
  res.write(formatSSEMessage('connection_status', {
    status: 'connected',
    timestamp: new Date().toISOString()
  }));

  // Handle client disconnect
  req.on('close', () => {
    if (sseClients.has(callId)) {
      sseClients.get(callId).delete(res);
      if (sseClients.get(callId).size === 0) {
        sseClients.delete(callId);
      }
    }
  });
});

// REST: Start call
app.post('/api/calls/start', async (req, res) => {
  try {
    const callId = uuidv4();
    const startedAt = new Date().toISOString();

    // Send call_start to backend-agent
    if (backendAgentClient.isConnected()) {
      backendAgentClient.send({
        type: 'call_start',
        callId: callId,
        timestamp: Date.now(),
        data: { callId: callId }
      });
    }

    res.json({
      callId: callId,
      status: 'active',
      startedAt: startedAt
    });
  } catch (error) {
    console.error('[Backend] Error starting call:', error);
    res.status(500).json({ error: 'Failed to start call' });
  }
});

// REST: Stop call
app.post('/api/calls/stop', async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'callId is required' });
    }

    // Send call_end to backend-agent
    if (backendAgentClient.isConnected()) {
      backendAgentClient.send({
        type: 'call_end',
        callId: callId,
        timestamp: Date.now(),
        data: { callId: callId }
      });
    }

    // Close SSE connections for this call
    if (sseClients.has(callId)) {
      const clients = sseClients.get(callId);
      clients.forEach((res) => {
        try {
          res.write(formatSSEMessage('call_end', {
            callId: callId,
            endedAt: new Date().toISOString()
          }));
          res.end();
        } catch (error) {
          console.error('[Backend] Error closing SSE connection:', error);
        }
      });
      sseClients.delete(callId);
    }

    res.json({
      success: true,
      callId: callId,
      endedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Backend] Error stopping call:', error);
    res.status(500).json({ error: 'Failed to stop call' });
  }
});

// REST: Assist request
app.post('/api/assist', async (req, res) => {
  try {
    const { callId, transcript } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'callId is required' });
    }

    // Forward assist request to backend-agent
    if (backendAgentClient.isConnected()) {
      const success = backendAgentClient.send({
        type: 'assist_request',
        callId: callId,
        timestamp: Date.now(),
        data: {
          transcript: transcript // Optional: last 30-40 seconds
        }
      });

      if (success) {
        res.json({
          success: true,
          callId: callId,
          message: 'Assist request sent'
        });
      } else {
        res.status(503).json({ error: 'Backend-agent not connected' });
      }
    } else {
      res.status(503).json({ error: 'Backend-agent not connected' });
    }
  } catch (error) {
    console.error('[Backend] Error processing assist request:', error);
    res.status(500).json({ error: 'Failed to process assist request' });
  }
});

// REST: Get post-call summary
app.get('/api/calls/:callId/summary', async (req, res) => {
  try {
    const { callId } = req.params;

    // This would typically query the database
    // For MVP, we'll return a placeholder
    res.json({
      callId: callId,
      message: 'Post-call summary endpoint - to be implemented with database query'
    });
  } catch (error) {
    console.error('[Backend] Error getting post-call summary:', error);
    res.status(500).json({ error: 'Failed to get post-call summary' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'backend',
    backendAgentConnected: backendAgentClient.isConnected()
  });
});

// Helper function to format SSE messages
function formatSSEMessage(eventType, data) {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Start server
app.listen(PORT, () => {
  console.log(`[Backend] Server running on port ${PORT}`);
  console.log(`[Backend] Frontend URL: ${FRONTEND_URL}`);
  console.log(`[Backend] Backend-agent URL: ${BACKEND_AGENT_WS_URL}`);
});

