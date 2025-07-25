// 用户类型
export interface User {
  id: number;
  username: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  created_at: string;
}

// 消息类型
export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  message_type: 'text' | 'image' | 'file';
  timestamp: string;
  is_read: boolean;
}

// 联系人类型
export interface Contact {
  user_id: number;
  contact_id: number;
  added_at: string;
  user: User;
}

// 认证令牌类型
export interface AuthToken {
  id: number;
  user_id: number;
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  created_at: string;
}

// 登录请求类型
export interface LoginRequest {
  username: string;
  password: string;
}

// 注册请求类型
export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

// 认证响应类型
export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

// WebSocket消息类型
export interface WSMessage {
  type: 'message' | 'typing' | 'read_receipt' | 'user_status';
  data: any;
  timestamp: string;
}

// 聊天会话类型
export interface ChatSession {
  contact: User;
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
  isTyping: boolean;
}

// 应用状态类型
export interface AppState {
  isAuthenticated: boolean;
  currentUser: User | null;
  contacts: Contact[];
  chatSessions: Record<number, ChatSession>;
  activeContactId: number | null;
  isConnected: boolean;
  notifications: Notification[];
}

// 通知类型
export interface Notification {
  id: string;
  type: 'message' | 'contact_request' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页参数类型
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}