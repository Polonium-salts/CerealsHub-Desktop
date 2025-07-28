import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

// 扩展AxiosRequestConfig接口，以支持自定义的重试配置
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  retry?: number;
  retryDelay?: number;
  retryCount?: number;
}
import { jwtDecode } from 'jwt-decode';
import { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  ApiResponse,
  Contact,
  Message,
  PaginationParams,
  PaginatedResponse,
  Group,
  GroupMember,
  GroupContact
} from '../types';
import { useAuthStore } from '../stores/authStore';
import { OAUTH_CONFIG, config } from '../config/oauth';
import { MockBackendService } from './mockBackend';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      // 启用重试机制
      retry: 3,
      retryDelay: 1000,
    });

    // 添加重试拦截器
    this.api.interceptors.response.use(undefined, async (err) => {
      const config = err.config as CustomAxiosRequestConfig;
      if (!config || !config.retry) {
        return Promise.reject(err);
      }
      config.retryCount = config.retryCount || 0;
      
      if (config.retryCount >= config.retry) {
        return Promise.reject(err);
      }
      
      config.retryCount += 1;
      const delayRetry = new Promise(resolve => {
        setTimeout(resolve, config.retryDelay || 1000);
      });
      
      await delayRetry;
      return this.api(config);
    });

    // 请求拦截器 - 添加认证token
    this.api.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理token过期
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            const token = useAuthStore.getState().token;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            useAuthStore.getState().logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // 认证相关
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/login', credentials);
    return response.data.data!;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/register', userData);
    return response.data.data!;
  }

  async refreshToken(): Promise<string> {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response: AxiosResponse<ApiResponse<{ access_token: string }>> = await this.api.post('/auth/refresh', {
      refresh_token: refreshToken
    });
    
    const newToken = response.data.data!.access_token;
    useAuthStore.getState().setToken(newToken);
    return newToken;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // GitHub OAuth登录
  // 使用模拟后端处理GitHub OAuth流程
  async loginWithGitHub(code: string): Promise<AuthResponse> {
    try {
      // 使用模拟后端服务处理GitHub OAuth
      return await MockBackendService.handleGitHubOAuth(code);
    } catch (error: any) {
      console.error('GitHub login error:', error);
      throw new Error(error.message || 'GitHub登录失败');
    }
  }

  // 获取GitHub OAuth授权URL
  getGitHubAuthUrl(): string {
    const { clientId, redirectUri, scope } = OAUTH_CONFIG.github;
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const encodedScope = encodeURIComponent(scope);
    const state = 'github_oauth';
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${encodedScope}&state=${state}`;
  }

  // 用户相关
  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<User>>> = await this.api.get('/users', { params });
    return response.data.data!;
  }

  async getUserById(id: number): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get(`/users/${id}`);
    return response.data.data!;
  }

  async updateUserStatus(status: 'online' | 'offline' | 'away'): Promise<void> {
    await this.api.patch('/users/status', { status });
  }

  // 联系人相关
  async getContacts(): Promise<Contact[]> {
    const response: AxiosResponse<ApiResponse<Contact[]>> = await this.api.get('/contacts');
    return response.data.data!;
  }

  async addContact(contactId: number): Promise<Contact> {
    const response: AxiosResponse<ApiResponse<Contact>> = await this.api.post('/contacts', { contact_id: contactId });
    return response.data.data!;
  }

  async removeContact(contactId: number): Promise<void> {
    await this.api.delete(`/contacts/${contactId}`);
  }

  // 消息相关
  async getMessages(contactId: number, params?: PaginationParams): Promise<PaginatedResponse<Message>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<Message>>> = await this.api.get(
      `/messages/${contactId}`, 
      { params }
    );
    return response.data.data!;
  }

  async sendMessage(receiverId: number, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<Message> {
    const response: AxiosResponse<ApiResponse<Message>> = await this.api.post('/messages', {
      receiver_id: receiverId,
      content,
      message_type: messageType
    });
    return response.data.data!;
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await this.api.patch(`/messages/${messageId}/read`);
  }

  async markAllMessagesAsRead(contactId: number): Promise<void> {
    await this.api.patch(`/messages/read-all/${contactId}`);
  }

  // 文件上传
  async uploadFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<ApiResponse<{ url: string }>> = await this.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data!;
  }

  // 群聊相关
  async getGroups(): Promise<Group[]> {
    const response: AxiosResponse<ApiResponse<Group[]>> = await this.api.get('/groups');
    return response.data.data!;
  }

  async joinGroup(groupId: string): Promise<GroupMember> {
    const response: AxiosResponse<ApiResponse<GroupMember>> = await this.api.post(`/group/${groupId}/join`);
    return response.data.data!;
  }

  async leaveGroup(groupId: string): Promise<void> {
    await this.api.post(`/group/${groupId}/leave`);
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const response: AxiosResponse<ApiResponse<GroupMember[]>> = await this.api.get(`/group/${groupId}/members`);
    return response.data.data!;
  }

  async getGroupInfo(groupId: string): Promise<Group> {
    const response: AxiosResponse<ApiResponse<Group>> = await this.api.get(`/group/${groupId}`);
    return response.data.data!;
  }

  // 发送群聊消息
  async sendGroupMessage(groupId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<Message> {
    const response: AxiosResponse<ApiResponse<Message>> = await this.api.post('/messages', {
      receiver_id: groupId,
      content,
      message_type: messageType,
      type: 'group'
    });
    return response.data.data!;
  }

  // 获取群聊消息
  async getGroupMessages(groupId: string, params?: PaginationParams): Promise<PaginatedResponse<Message>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<Message>>> = await this.api.get(
      `/group/${groupId}/messages`, 
      { params }
    );
    return response.data.data!;
  }

  // 工具方法
  isTokenExpired(token: string): boolean {
    try {
      // 测试token不会过期
      if (token.startsWith('test_token_')) {
        return false;
      }
      
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  getWebSocketUrl(): string {
    return 'wss://capi.cereals.fun/ws';
  }
}

export const apiService = new ApiService();
export default apiService;