import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse } from '../types';
import { apiService } from '../services/api';
import { databaseService } from '../services/database';
import { websocketService } from '../services/websocket';
import { notificationService } from '../services/notification';

interface AuthState {
  // 状态
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  networkLoading: boolean;
  error: string | null;

  // 动作
  login: (username: string, password: string) => Promise<void>;
  loginWithGitHub: (code: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  setToken: (token: string) => void;
  updateUser: (user: Partial<User>) => void;
  checkAuthStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      networkLoading: false,
      error: null,

      // 登录
      login: async (username: string, password: string) => {
        set({ isLoading: true, networkLoading: true, error: null });
        
        try {
          // 添加测试账户支持
          if (username === 'test' && password === 'test123') {
            const testUser: User = {
              id: 1,
              username: 'test',
              email: 'test@example.com',
              avatar: '',
              status: 'online',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const testToken = 'test_token_' + Date.now();
            
            set({
              isAuthenticated: true,
              user: testUser,
              token: testToken,
              refreshToken: 'test_refresh_token',
              isLoading: false,
              networkLoading: false,
              error: null
            });
            
            try {
               await databaseService.saveUser(testUser);
             } catch (error) {
               console.warn('Failed to save user to database:', error);
             }
             notificationService.showSuccessNotification('测试登录成功！');
             return;
          }
          
          // 添加第二个测试账户支持
          if (username === 'test2' && password === 'test456') {
            const testUser2: User = {
              id: 2,
              username: 'test2',
              email: 'test2@example.com',
              avatar: '',
              status: 'online',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const testToken2 = 'test_token_2_' + Date.now();
            
            set({
              isAuthenticated: true,
              user: testUser2,
              token: testToken2,
              refreshToken: 'test_refresh_token_2',
              isLoading: false,
              networkLoading: false,
              error: null
            });
            
            try {
               await databaseService.saveUser(testUser2);
             } catch (error) {
               console.warn('Failed to save user to database:', error);
             }
             notificationService.showSuccessNotification('第二个测试账户登录成功！');
             return;
          }
          
          const response: AuthResponse = await apiService.login({ username, password });
          
          // 保存认证信息
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isLoading: false,
            networkLoading: false,
            error: null
          });

          // 保存用户信息到本地数据库
          try {
            await databaseService.saveUser(response.user);
            
            // 保存认证令牌到本地数据库
            if (response.refresh_token) {
              await databaseService.saveAuthToken({
                id: 0, // 数据库会自动生成
                user_id: response.user.id,
                access_token: response.access_token,
                refresh_token: response.refresh_token,
                expires_at: new Date(Date.now() + response.expires_in * 1000).toISOString(),
                created_at: new Date().toISOString()
              });
            }
          } catch (error) {
            console.warn('Failed to save to database:', error);
          }

          // 连接WebSocket (跳过测试token)
          if (!response.access_token.startsWith('test_token_')) {
            try {
              await websocketService.connect();
              // 更新用户在线状态
              await apiService.updateUserStatus('online');
            } catch (error) {
              console.warn('WebSocket connection or status update failed:', error);
            }
          }
          
          notificationService.showSuccessNotification('登录成功！');
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || '登录失败';
          set({ 
            isLoading: false, 
            networkLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null
          });
          notificationService.showErrorNotification(errorMessage);
          throw error;
        }
      },

      // GitHub登录
      loginWithGitHub: async (code: string) => {
        set({ isLoading: true, networkLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiService.loginWithGitHub(code);
          
          // 保存认证信息
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isLoading: false,
            networkLoading: false,
            error: null
          });

          // 保存用户信息到本地数据库
          try {
            await databaseService.saveUser(response.user);
            
            // 保存认证令牌到本地数据库
            if (response.refresh_token) {
              await databaseService.saveAuthToken({
                id: 0, // 数据库会自动生成
                user_id: response.user.id,
                access_token: response.access_token,
                refresh_token: response.refresh_token,
                expires_at: new Date(Date.now() + response.expires_in * 1000).toISOString(),
                created_at: new Date().toISOString()
              });
            }
          } catch (error) {
            console.warn('Failed to save to database:', error);
          }

          // 连接WebSocket
          try {
            await websocketService.connect();
            // 更新用户在线状态
            await apiService.updateUserStatus('online');
          } catch (error) {
            console.warn('WebSocket connection or status update failed:', error);
          }
          
          notificationService.showSuccessNotification('GitHub登录成功！');
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'GitHub登录失败';
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null
          });
          notificationService.showErrorNotification(errorMessage);
          throw error;
        }
      },

      // 注册
      register: async (username: string, password: string, email?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiService.register({ username, password, email });
          
          // 保存认证信息
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isLoading: false,
            error: null
          });

          // 保存用户信息到本地数据库
          await databaseService.saveUser(response.user);
          
          // 保存认证令牌到本地数据库
          if (response.refresh_token) {
            await databaseService.saveAuthToken({
              id: 0,
              user_id: response.user.id,
              access_token: response.access_token,
              refresh_token: response.refresh_token,
              expires_at: new Date(Date.now() + response.expires_in * 1000).toISOString(),
              created_at: new Date().toISOString()
            });
          }

          // 连接WebSocket
          await websocketService.connect();
          
          // 更新用户在线状态
          await apiService.updateUserStatus('online');
          
          notificationService.showSuccessNotification('注册成功！');
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || '注册失败';
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null
          });
          notificationService.showErrorNotification(errorMessage);
          throw error;
        }
      },

      // 登出
      logout: async () => {
        const { user } = get();
        
        try {
          // 更新用户离线状态
          if (user) {
            await apiService.updateUserStatus('offline');
            await databaseService.removeAuthToken(user.id);
          }
          
          // 调用API登出
          await apiService.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          // 断开WebSocket连接
          websocketService.disconnect();
          
          // 清除状态
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            error: null
          });
          
          notificationService.showSuccessNotification('已退出登录');
        }
      },

      // 刷新认证
      refreshAuth: async () => {
        const { refreshToken, user } = get();
        
        if (!refreshToken || !user) {
          throw new Error('No refresh token available');
        }

        try {
          const newToken = await apiService.refreshToken();
          
          set({ token: newToken });
          
          // 更新数据库中的token
          await databaseService.saveAuthToken({
            id: 0,
            user_id: user.id,
            access_token: newToken,
            refresh_token: refreshToken,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 假设1小时过期
            created_at: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('Token refresh failed:', error);
          // 刷新失败，执行登出
          await get().logout();
          throw error;
        }
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 设置token
      setToken: (token: string) => {
        set({ token });
      },

      // 更新用户信息
      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...userData };
          set({ user: updatedUser });
          
          // 更新本地数据库
          databaseService.saveUser(updatedUser);
        }
      },

      // 检查认证状态
      checkAuthStatus: async () => {
        const { token, user, refreshToken } = get();
        
        if (!token || !user) {
          // 清除可能存在的无效状态
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null
          });
          return;
        }

        try {
          // 检查token是否过期
          if (apiService.isTokenExpired(token)) {
            if (refreshToken) {
              try {
                await get().refreshAuth();
              } catch (error) {
                console.error('Auto refresh failed:', error);
                await get().logout();
              }
            } else {
              await get().logout();
            }
          } else {
            // Token有效，确保认证状态正确
            set({ isAuthenticated: true });
            
            // 连接WebSocket (跳过测试token)
            if (!websocketService.isConnected() && !token.startsWith('test_token_')) {
              try {
                await websocketService.connect();
              } catch (error) {
                console.warn('WebSocket connection failed:', error);
              }
            }
          }
        } catch (error) {
          console.error('Auth status check failed:', error);
          // 发生错误时清除认证状态
          await get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);