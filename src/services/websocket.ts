import { WSMessage, Message } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { databaseService } from './database';
import { notificationService } from './notification';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1秒
  private heartbeatInterval: number | null = null;
  private isConnecting = false;
  private isManualClose = false;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.isManualClose = false;

    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No authentication token available');
      }

      const wsUrl = `wss://capi.cereals.fun/ws?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    this.clearHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    useChatStore.getState().setConnectionStatus(false);
  }

  private onOpen(): void {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    useChatStore.getState().setConnectionStatus(true);
  }

  private async onMessage(event: MessageEvent): Promise<void> {
    try {
      const wsMessage: WSMessage = JSON.parse(event.data);
      await this.handleMessage(wsMessage);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private onClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnecting = false;
    this.clearHeartbeat();
    useChatStore.getState().setConnectionStatus(false);

    if (!this.isManualClose && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private onError(error: Event): void {
    console.error('WebSocket error:', error);
    this.isConnecting = false;
  }

  private async handleMessage(wsMessage: WSMessage): Promise<void> {
    const { type, data } = wsMessage;
    // const chatStore = useChatStore.getState();
    // const currentUser = useAuthStore.getState().user;

    switch (type) {
      case 'message':
        await this.handleNewMessage(data as Message);
        break;

      case 'typing':
        this.handleTypingIndicator(data);
        break;

      case 'read_receipt':
        this.handleReadReceipt(data);
        break;

      case 'user_status':
        this.handleUserStatusChange(data);
        break;

      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }

  private async handleNewMessage(message: Message): Promise<void> {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    // 保存到本地数据库
    try {
      await databaseService.saveMessage(message);
    } catch (error) {
      console.warn('Failed to save message to database:', error);
    }

    // 更新聊天状态
    const chatStore = useChatStore.getState();
    chatStore.addMessage(message);

    // 如果不是当前用户发送的消息，显示通知
    if (message.sender_id !== currentUser.id) {
      try {
        const sender = await databaseService.getUser(message.sender_id);
        if (sender) {
          await notificationService.showMessageNotification(sender, message);
        }
      } catch (error) {
        console.warn('Failed to get sender info from database:', error);
        // 使用默认发送者信息显示通知
        await notificationService.showMessageNotification(
          { id: message.sender_id, username: `User ${message.sender_id}`, avatar_url: '', status: 'offline', created_at: new Date().toISOString() },
          message
        );
      }
    }
  }

  private handleTypingIndicator(data: { user_id: number; is_typing: boolean }): void {
    const chatStore = useChatStore.getState();
    chatStore.setTypingStatus(data.user_id, data.is_typing);
  }

  private handleReadReceipt(data: { message_id: number; user_id: number }): void {
    const chatStore = useChatStore.getState();
    chatStore.markMessageAsRead(data.message_id);
  }

  private handleUserStatusChange(data: { user_id: number; status: string }): void {
    const chatStore = useChatStore.getState();
    chatStore.updateUserStatus(data.user_id, data.status as 'online' | 'offline' | 'away');
    
    // 更新本地数据库
    try {
      databaseService.updateUserStatus(data.user_id, data.status);
    } catch (error) {
      console.warn('Failed to update user status in database:', error);
    }
  }

  // 发送消息
  sendMessage(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WSMessage = {
        type: type as any,
        data,
        timestamp: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', { type, data });
    }
  }

  // 发送文本消息
  sendTextMessage(receiverId: number, content: string): void {
    this.sendMessage('message', {
      receiver_id: receiverId,
      content,
      message_type: 'text'
    });
  }

  // 发送打字指示器
  sendTypingIndicator(receiverId: number, isTyping: boolean): void {
    this.sendMessage('typing', {
      receiver_id: receiverId,
      is_typing: isTyping
    });
  }

  // 发送已读回执
  sendReadReceipt(messageId: number): void {
    this.sendMessage('read_receipt', {
      message_id: messageId
    });
  }

  // 更新用户状态
  sendUserStatus(status: 'online' | 'offline' | 'away'): void {
    this.sendMessage('user_status', {
      status
    });
  }

  // 心跳机制
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage('ping', {});
      }
    }, 30000); // 每30秒发送一次心跳
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 重连机制
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isManualClose) {
        this.connect();
      }
    }, delay);
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // 获取连接状态描述
  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'unknown';
    }
  }
}

export const websocketService = new WebSocketService();
export default websocketService;