import { Platform } from 'react-native';

type MessageCallback = (message: any) => void;

class SocketManager {
  private socket: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseDelay = 1000;
  private callbacks: Set<MessageCallback> = new Set();
  private isConnecting = false;
  private currentJobId: number | null = null;
  private currentToken: string | null = null;

  // Derive WebSocket URL from the HTTP API Base URL if EXPO_PUBLIC_SOCKET_URL is not set
  private getSocketUrl(jobId: number, token: string): string {
    const defaultSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (defaultSocketUrl) {
      return `${defaultSocketUrl}/ws/chat/${jobId}/?token=${token}`;
    }

    let apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    
    // Cross-platform host resolution
    if (Platform.OS === 'web' && apiBase.includes('10.0.2.2')) {
      apiBase = apiBase.replace('10.0.2.2', 'localhost');
    } else if (Platform.OS === 'android' && apiBase.includes('localhost')) {
      apiBase = apiBase.replace('localhost', '10.0.2.2');
    }

    let wsHost = apiBase.replace(/^http/, 'ws').replace('/api/v1', '');
    
    return `${wsHost}/ws/chat/${jobId}/?token=${token}`;
  }

  public connect(jobId: number, token: string) {
    if (this.socket && this.currentJobId === jobId) {
      return;
    }

    this.disconnect();
    this.currentJobId = jobId;
    this.currentToken = token;
    this.isConnecting = true;

    const url = this.getSocketUrl(jobId, token);
    console.log(`[SocketManager] Connecting to ${url}`);

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('[SocketManager] WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.callbacks.forEach((cb) => cb(data));
        } catch (e) {
          console.warn('[SocketManager] Failed to parse socket message:', event.data);
        }
      };

      this.socket.onclose = (event) => {
        console.log('[SocketManager] WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.socket = null;
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        console.warn('[SocketManager] WebSocket error:', error);
      };
    } catch (err) {
      console.error('[SocketManager] Error creating WebSocket:', err);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.currentJobId === null || this.currentToken === null) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[SocketManager] Max reconnect attempts reached. Falling back to HTTP polling.');
      return;
    }

    const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    console.log(`[SocketManager] Reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.currentJobId !== null && this.currentToken !== null) {
        this.connect(this.currentJobId, this.currentToken);
      }
    }, delay);
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      // Clear event listeners before closing to prevent reconnect loops
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }

    this.currentJobId = null;
    this.currentToken = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    console.log('[SocketManager] WebSocket disconnected');
  }

  public sendMessage(content: string): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ content }));
      return true;
    }
    console.warn('[SocketManager] Socket not open. Message not sent via WebSocket.');
    return false;
  }

  public onMessage(callback: MessageCallback) {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }
}

export const socketManager = new SocketManager();
