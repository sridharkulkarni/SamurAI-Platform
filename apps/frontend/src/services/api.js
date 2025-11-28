/** REST API client */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[API] Request error:', error);
    throw error;
  }
}

export const api = {
  // Start a new call
  startCall: async () => {
    return request('/api/calls/start', {
      method: 'POST',
    });
  },

  // Stop a call
  stopCall: async (callId) => {
    return request('/api/calls/stop', {
      method: 'POST',
      body: JSON.stringify({ callId }),
    });
  },

  // Request compliance assistance
  requestAssist: async (callId, transcript = null) => {
    return request('/api/assist', {
      method: 'POST',
      body: JSON.stringify({ callId, transcript }),
    });
  },

  // Get post-call summary
  getPostCallSummary: async (callId) => {
    return request(`/api/calls/${callId}/summary`, {
      method: 'GET',
    });
  },

  // Health check
  healthCheck: async () => {
    return request('/health', {
      method: 'GET',
    });
  },
};

