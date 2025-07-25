import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
  PaginatedResponse
} from '../types';
import { useAuthStore } from '../stores/authStore';
import { OAUTH_CONFIG } from '../config/oauth';

class ApiService {
  private api: AxiosInstance;
  private baseURL = 'https://capi.cereals.fun';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
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
  async loginWithGitHub(code: string): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/github', { code });
    return response.data.data!;
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