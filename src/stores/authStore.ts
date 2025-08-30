import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse } from '../types';
import { apiService } from '../services/api';
import { databaseService } from '../services/database';
import { websocketService } from '../services/websocket';
import { notificationService } from '../services/notification';
import { supabase } from '../services/supabaseClient';

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
  login: (email: string, password: string) => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  setToken: (token: string) => void;
  updateUser: (userData: Partial<User>) => void;
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
      login: async (email: string, password: string) => {
        set({ isLoading: true, networkLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiService.login({ usernameOrEmail: email, password });
          
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
          
          notificationService.showSuccessNotification('登录成功！');
          
        } catch (error: any) {
          const errorMessage = error.message || '登录失败';
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
      loginWithGitHub: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Supabase会自动处理GitHub OAuth流程
          // 这里只需要监听认证状态变化
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
              redirectTo: window.location.origin
            }
          });
          
          if (error) throw error;
          
          // 成功后会自动重定向到GitHub进行认证
          // 认证完成后会重定向回应用
          notificationService.showSuccessNotification('正在跳转到GitHub登录...');
          
        } catch (error: any) {
          const errorMessage = error.message || 'GitHub登录失败';
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
          try {
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
          
          notificationService.showSuccessNotification('注册成功！');
          
        } catch (error: any) {
          const errorMessage = error.message || '注册失败';
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

      // 登出（本地处理版本）
      logout: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // 获取当前用户
          const currentUser = get().user;
          
          // 断开WebSocket连接
          try {
            await websocketService.disconnect();
          } catch (wsError) {
            console.warn('Failed to disconnect WebSocket during logout:', wsError);
            // 即使断开WebSocket失败，也继续登出流程
          }
          
          // 清除本地认证数据
          try {
            if (currentUser) {
              await databaseService.removeAuthToken(currentUser.id);
            }
          } catch (dbError) {
            console.warn('Failed to clear auth data during logout:', dbError);
            // 即使清除数据失败，也继续登出流程
          }
          
          // 注意：本地登出版本不调用外部服务器API
          console.log('Performing local-only logout');
          
          // 重置状态
          set({ 
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            error: null
          });
          
          notificationService.showSuccessNotification('已成功登出（本地）');
          
        } catch (error: any) {
          const errorMessage = error.message || '登出失败';
          set({ error: errorMessage, isLoading: false });
          notificationService.showErrorNotification(errorMessage);
        }
      },

      // 刷新认证
      refreshAuth: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // 使用Supabase刷新会话
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) throw error;
          
          if (data?.session) {
            const { session } = data;
            const user = {
              id: session.user.id,
              username: session.user.email?.split('@')[0] || session.user.id,
              email: session.user.email || '',
              avatar: session.user.user_metadata?.avatar_url || '',
              created_at: session.user.created_at,
              last_login: new Date().toISOString()
            };
            
            // 更新认证信息
            set({
              isAuthenticated: true,
              user: user,
              token: session.access_token,
              refreshToken: session.refresh_token,
              isLoading: false,
              error: null
            });

            // 更新本地数据库中的认证令牌
            const storedAuth = await databaseService.getAuthToken(user.id);
            if (storedAuth) {
              await databaseService.saveAuthToken({
                id: storedAuth.id,
                user_id: user.id,
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : new Date().toISOString(),
                created_at: storedAuth.created_at
              });
            }

            // 重新连接WebSocket
            await websocketService.reconnect();
            
            // 更新用户在线状态
            await apiService.updateUserStatus('online');
            
            return {
              user: user,
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_in: session.expires_in
            };
          } else {
            // 没有有效的会话，设置为未认证状态
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              refreshToken: null,
              isLoading: false
            });
            
            // 清除本地数据库中的认证数据
          await databaseService.clearAllData();
            
            throw new Error('No valid session found');
          }
        } catch (error: any) {
          const errorMessage = error.message || '认证刷新失败';
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null
          });
          
          // 清除本地数据库中的认证数据
            await databaseService.clearAllData();
          
          notificationService.showErrorNotification(errorMessage);
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
        set({ isLoading: true, error: null });
        
        try {
          // 使用Supabase获取当前会话
          const { data, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          if (data?.session) {
            const { session } = data;
            const user = {
              id: session.user.id,
              username: session.user.email?.split('@')[0] || session.user.id,
              email: session.user.email || '',
              avatar: session.user.user_metadata?.avatar_url || '',
              created_at: session.user.created_at,
              last_login: new Date().toISOString()
            };
            
            // 设置认证状态
            set({
              isAuthenticated: true,
              user: user,
              token: session.access_token,
              refreshToken: session.refresh_token,
              isLoading: false
            });
            
            // 更新本地数据库中的认证令牌
            const storedAuth = await databaseService.getAuthToken(user.id);
            if (storedAuth) {
              await databaseService.saveAuthToken({
                id: storedAuth.id,
                user_id: user.id,
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: new Date(session.expires_at * 1000).toISOString(),
                created_at: storedAuth.created_at
              });
            }
            
            // 连接WebSocket
            await websocketService.connect();
            
            // 更新用户在线状态
            await apiService.updateUserStatus('online');
            
            return true;
          } else {
            // 没有有效的会话
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              refreshToken: null,
              isLoading: false
            });
            
            return false;
          }
        } catch (error: any) {
          const errorMessage = error.message || '检查认证状态失败';
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          
          // 清除本地数据库中的认证数据
          await databaseService.clearAllData();
          
          notificationService.showErrorNotification(errorMessage);
          return false;
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