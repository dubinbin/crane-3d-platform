import { io, Socket } from 'socket.io-client';
import { WEBSOCKET_SERVER_URL } from '../constants';

export type WebSocketEventCallback = (data: unknown) => void;

export interface AuthConfig {
  token?: string;
  userID?: string;
  userName?: string;
  [key: string]: unknown;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds
  private eventCallbacks: Map<string, WebSocketEventCallback[]> = new Map();
  private authConfig: AuthConfig | null = null;

  /**
   * 连接到WebSocket服务器
   * @param url 服务器地址，默认为开发环境地址
   */
  connect(url?: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const serverUrl = url || (import.meta.env.DEV ? WEBSOCKET_SERVER_URL : '/');
    
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('WebSocket disconnected');
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('WebSocket connected:', this.socket?.id);
      this.emitLocal('connected', { socketId: this.socket?.id });
      this.emitLocal('connect', { socketId: this.socket?.id });
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('WebSocket disconnected:', reason);
      this.emitLocal('disconnected', { reason });
      this.emitLocal('disconnect', { reason });
      
      // 如果不是主动断开，尝试重连
      if (reason !== 'io client disconnect') {
        this.handleReconnect();
      }
    });

    // 设置socket原生事件的转发
    this.setupSocketEventForwarding();
  }

  /**
   * 设置socket原生事件转发到内部事件系统
   */
  private setupSocketEventForwarding(): void {
    if (!this.socket) return;

    // 监听socket原生事件，并转发到内部事件系统
    // 注意：connect和disconnect已经在setupEventListeners中处理了
    const eventsToForward = ['client-msg', 'server-msg'];
    
    eventsToForward.forEach(eventName => {
      this.socket!.on(eventName, (data: unknown) => {
        this.emitLocal(eventName, data);
      });
    });
  }
  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emitLocal('error', { 
        message: 'Failed to reconnect after maximum attempts', 
        type: 'reconnect_failed' 
      });
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.reconnectSocket();
      }
    }, this.reconnectInterval);
  }

  /**
   * 重连socket（用于自动重连）
   */
  private reconnectSocket(): void {
    if (this.socket && !this.socket.connected) {
      // 重新创建socket以确保使用最新的认证配置
      const oldSocket = this.socket;
      this.socket = null;
      oldSocket.disconnect();
      
      const serverUrl = import.meta.env.DEV ? WEBSOCKET_SERVER_URL : '/';
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        auth: this.authConfig || {},
      });

      this.setupEventListeners();
    }
  }

  /**
   * 注册事件监听器
   * @param event 事件名称
   * @param callback 回调函数
   */
  on(event: string, callback: WebSocketEventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param callback 回调函数
   */
  off(event: string, callback?: WebSocketEventCallback): void {
    if (!this.eventCallbacks.has(event)) return;

    if (callback) {
      const callbacks = this.eventCallbacks.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.eventCallbacks.delete(event);
    }
  }

  /**
   * 触发本地事件
   * @param event 事件名称
   * @param data 事件数据
   */
  private emitLocal(event: string, data: unknown): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  /**
   * 发送消息到服务器
   * @param event 事件名称
   * @param data 数据（支持字符串、ArrayBuffer、Uint8Array等）
   */
  emit(event: string, data?: string | ArrayBuffer | Uint8Array): void {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 获取Socket实例
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * 设置认证配置
   * @param auth 认证配置
   */
  setAuth(auth: AuthConfig): void {
    this.authConfig = auth;
  }

  /**
   * 获取当前认证配置
   */
  getAuth(): AuthConfig | null {
    return this.authConfig;
  }

}

// 创建单例实例
export const webSocketService = new WebSocketService();

// 导出类型和实例
export default webSocketService;