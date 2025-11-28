/** WebSocket client to backend-agent */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

class BackendAgentClient extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 3000; // 3 seconds
    this.reconnectTimer = null;
    this.isConnecting = false;
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log(`[Backend] Connecting to backend-agent at ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('[Backend] Connected to backend-agent');
        this.isConnecting = false;
        this.emit('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.emit('message', message);
        } catch (error) {
          console.error('[Backend] Error parsing message from backend-agent:', error);
        }
      });

      this.ws.on('error', (error) => {
        // Don't log ECONNREFUSED as error - backend-agent might not be started yet
        if (error.code === 'ECONNREFUSED') {
          console.log('[Backend] Backend-agent not available yet, will retry in 3 seconds...');
        } else {
          console.error('[Backend] WebSocket error:', error.message || error);
        }
        this.isConnecting = false;
        // Schedule reconnect for connection refused errors
        if (error.code === 'ECONNREFUSED') {
          this.scheduleReconnect();
        } else {
          // For other errors, emit but don't crash
          this.emit('error', error);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log('[Backend] Disconnected from backend-agent', code ? `(code: ${code})` : '');
        this.isConnecting = false;
        this.emit('disconnected');
        // Only reconnect if it wasn't a manual close
        if (code !== 1000) {
          this.scheduleReconnect();
        }
      });

    } catch (error) {
      console.error('[Backend] Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[Backend] Attempting to reconnect to backend-agent...');
      this.connect();
    }, this.reconnectInterval);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('[Backend] Error sending message to backend-agent:', error);
        return false;
      }
    } else {
      console.warn('[Backend] WebSocket not connected, cannot send message');
      return false;
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default BackendAgentClient;

