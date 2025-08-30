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
import { supabase, SupabaseAuthService } from './supabaseClient';

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

    this.setupInterceptors();
  }

  // 请求拦截器
  private setupInterceptors() {
    // 请求拦截器
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

    // 响应拦截器
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // 如果是401错误且不是刷新令牌请求
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // 尝试刷新令牌
            const newToken = await this.refreshToken();
            
            // 更新存储的令牌
            useAuthStore.getState().setToken(newToken);
            
            // 重试原始请求
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // 刷新令牌失败，执行登出
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
    // 使用Supabase认证
    // 注意：我们将credentials.usernameOrEmail传递给SupabaseAuthService.login方法
    // 该方法会自动判断是邮箱还是用户名并进行相应处理
    const { user, error } = await SupabaseAuthService.login(credentials.usernameOrEmail, credentials.password);
    
    if (error) {
      // 直接抛出经过处理的具体错误信息
      throw error;
    }
    
    if (!user) {
      throw new Error('登录失败');
    }
    
    // 获取Supabase会话令牌
    const { data: { session } } = await supabase.auth.getSession();
    
    // 确保session存在
    if (!session) {
      throw new Error('无法获取会话信息');
    }
    
    const authResponse: AuthResponse = {
      user,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in || 3600,
    };
    
    return authResponse;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    // 使用Supabase认证
    const { user, error } = await SupabaseAuthService.register(userData.username, userData.password, userData.email);
    
    if (error) {
      throw error;
    }
    
    if (!user) {
      throw new Error('注册失败');
    }
    
    // 获取Supabase会话令牌
    const { data: { session } } = await supabase.auth.getSession();
    
    const authResponse: AuthResponse = {
      user,
      access_token: session?.access_token || '',
      refresh_token: session?.refresh_token || '',
      expires_in: session?.expires_in || 3600,
    };
    
    return authResponse;
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

  // 监听认证状态变化
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // GitHub登录
  async signInWithGitHub(options: { redirectTo: string }) {
    return await supabase.auth.signInWithOAuth({
      provider: 'github',
      options
    });
  }

  async logout(): Promise<void> {
    try {
      // 使用Supabase认证登出
      await SupabaseAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // GitHub登录
  async loginWithGitHub(code: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          code
        }
      }
    });
    
    if (error) throw error;
    
    // Supabase会自动重定向到GitHub进行认证
    // 认证完成后会重定向回应用
    // 这里返回一个临时的响应，实际的用户信息会在回调中处理
    return {
      user: {
        id: '',
        username: '',
        email: '',
        avatar: '',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      },
      access_token: '',
      refresh_token: '',
      expires_in: 0,
      token_type: 'bearer'
    };
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