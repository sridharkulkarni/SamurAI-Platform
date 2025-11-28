/** SSE connection hook */

import { useEffect, useRef, useState, useCallback } from 'react';

export function useSSE(url, callId, onMessage) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    if (!callId) {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const fullUrl = `${url}?callId=${callId}`;
    console.log('[SSE] Connecting to:', fullUrl);

    try {
      const eventSource = new EventSource(fullUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] Connected');
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage(event.type || 'message', data);
          }
        } catch (err) {
          console.error('[SSE] Error parsing message:', err);
        }
      };

      // Handle specific event types
      eventSource.addEventListener('transcription', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage('transcription', data);
          }
        } catch (err) {
          console.error('[SSE] Error parsing transcription:', err);
        }
      });

      eventSource.addEventListener('compliance_suggestion', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage('compliance_suggestion', data);
          }
        } catch (err) {
          console.error('[SSE] Error parsing compliance_suggestion:', err);
        }
      });

      eventSource.addEventListener('error', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage('error', data);
          }
          setError(data.message || 'SSE error occurred');
        } catch (err) {
          console.error('[SSE] Error parsing error event:', err);
        }
      });

      eventSource.addEventListener('call_start', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage('call_start', data);
          }
        } catch (err) {
          console.error('[SSE] Error parsing call_start:', err);
        }
      });

      eventSource.addEventListener('call_end', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage('call_end', data);
          }
        } catch (err) {
          console.error('[SSE] Error parsing call_end:', err);
        }
      });

      eventSource.addEventListener('connection_status', (event) => {
        try {
          const data = JSON.parse(event.data);
          setConnectionStatus(data.status || 'connected');
        } catch (err) {
          console.error('[SSE] Error parsing connection_status:', err);
        }
      });

      eventSource.onerror = (err) => {
        console.error('[SSE] Connection error:', err);
        setConnectionStatus('disconnected');
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setConnectionStatus('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[SSE] Reconnecting (attempt ${reconnectAttemptsRef.current})...`);
            connect();
          }, reconnectDelay);
        } else {
          setError('Failed to connect after multiple attempts');
          setConnectionStatus('disconnected');
        }
      };

    } catch (err) {
      console.error('[SSE] Error creating EventSource:', err);
      setError(err.message);
      setConnectionStatus('disconnected');
    }
  }, [url, callId, onMessage]);

  useEffect(() => {
    if (callId) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [callId, connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  return {
    connectionStatus,
    error,
    disconnect,
    reconnect: connect
  };
}

