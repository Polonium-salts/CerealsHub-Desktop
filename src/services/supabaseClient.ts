import { createClient } from '@supabase/supabase-js';
import { User } from '../types';
import { SUPABASE_CONFIG } from '../config/supabase';

// 创建Supabase客户端 - 客户端模式
// 参照my-app项目中的createClient实现
// 用于浏览器端操作，如登录、注册等
export function createBrowserClient() {
  return createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
  );
}

// 默认的Supabase客户端实例
export const supabase = createBrowserClient();

// Supabase认证服务
export class SupabaseAuthService {
  // 登录
  // 支持邮箱登录
  static async login(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const supabase = createBrowserClient();
      
      // 使用Supabase的signInWithPassword方法进行认证
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // 提供更具体的错误信息
        let errorMessage = '登录失败';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = '邮箱或密码错误';
        } else if (error.message.includes('User not found')) {
          errorMessage = '用户不存在';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '邮箱尚未验证';
        }
        return { user: null, error: new Error(errorMessage) };
      }

      if (data.user) {
        const user: User = {
          id: parseInt(data.user.id, 10),
          username: data.user.user_metadata?.username || data.user.email?.split('@')[0] || '',
          email: data.user.email || '',
          avatar: data.user.user_metadata?.avatar || '',
          status: 'online',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at,
        };
        return { user, error: null };
      }

      return { user: null, error: new Error('登录失败') };
    } catch (error: any) {
      return { user: null, error };
    }
  }

  // 注册
  static async register(username: string, password: string, email: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
          // 设置注册成功后的重定向URL
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        let errorMessage = '注册失败';
        if (error.message.includes('User already registered')) {
          errorMessage = '该邮箱已被注册';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = '邮箱格式不正确';
        } else if (error.message.includes('Password should be at least 8 characters')) {
          errorMessage = '密码长度至少为8位';
        }
        return { user: null, error: new Error(errorMessage) };
      }

      if (data.user) {
        const user: User = {
          id: parseInt(data.user.id, 10),
          username: username,
          email: email,
          avatar: '',
          status: 'online',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at,
        };
        return { user, error: null };
      }

      // 如果用户已创建但需要验证邮箱
      if (data.session === null && !error) {
        return { 
          user: null, 
          error: new Error('注册成功，请查收邮件进行验证') 
        };
      }

      return { user: null, error: new Error('注册失败') };
    } catch (error: any) {
      return { user: null, error };
    }
  }

  // 注销登录
  static async logout(): Promise<{ success: boolean; error: Error | null }> {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error };
    }
  }

  // 获取当前登录用户信息
  static async getCurrentUser(): Promise<{ user: User | null; error: Error | null }> {
    try {
      const supabase = createBrowserClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        return { user: null, error };
      }
      
      if (user) {
        const formattedUser: User = {
          id: parseInt(user.id, 10),
          username: user.user_metadata?.username || user.email?.split('@')[0] || '',
          email: user.email || '',
          avatar: user.user_metadata?.avatar || '',
          status: 'online',
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
        };
        return { user: formattedUser, error: null };
      }
      
      return { user: null, error: null };
    } catch (error: any) {
      return { user: null, error };
    }
  }

  // 检查用户是否已登录
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { user } = await this.getCurrentUser();
      return user !== null;
    } catch {
      return false;
    }
  }

  // 重置密码 - 发送重置邮件
  static async resetPassword(email: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      
      if (error) {
        let errorMessage = '发送重置邮件失败';
        if (error.message.includes('User not found')) {
          errorMessage = '该邮箱未注册';
        }
        return { success: false, error: new Error(errorMessage) };
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error };
    }
  }

  // 监听认证状态变化
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    const supabase = createBrowserClient();
    return supabase.auth.onAuthStateChange(callback);
  }
}