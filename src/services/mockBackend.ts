// 模拟后端API，用于处理GitHub OAuth
// 在实际项目中，这应该是真正的后端服务

import { AuthResponse } from '../types/auth';

// 模拟GitHub OAuth配置
const GITHUB_CLIENT_ID = 'Iv23lisKSUgFoKRy0CyU';
const GITHUB_CLIENT_SECRET = 'SHA256:BgPqOUKVEEAcbktxzWIafH+cUvMnJYn5a7fjz7Gw1Bw='; // GitHub OAuth密钥

export class MockBackendService {
  // 完全本地的GitHub OAuth模拟处理
  static async handleGitHubOAuth(code: string): Promise<AuthResponse> {
    try {
      // 模拟延迟，让用户感觉像真实的网络请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 验证code格式（GitHub的code通常是20个字符的字母数字组合）
      if (!code || code.length < 10) {
        throw new Error('Invalid authorization code');
      }

      // 模拟GitHub用户数据（基于code生成一致的用户信息）
      const userId = Math.abs(code.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0));
      
      const mockUser = {
        id: userId,
        login: `user_${userId.toString().slice(-6)}`,
        email: `user_${userId.toString().slice(-6)}@github.com`,
        avatar_url: `https://avatars.githubusercontent.com/u/${userId}?v=4`,
        name: `GitHub User ${userId.toString().slice(-6)}`,
        bio: 'Mock GitHub user for development',
        public_repos: Math.floor(Math.random() * 50),
        followers: Math.floor(Math.random() * 100)
      };

      // 构造本地用户对象
      const user = {
        id: mockUser.id,
        username: mockUser.login,
        email: mockUser.email,
        avatar: mockUser.avatar_url,
        status: 'online' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 生成模拟的access token
      const mockAccessToken = `gho_${btoa(code + Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 36)}`;

      // 生成本地JWT token
      const localToken = btoa(JSON.stringify({
        userId: user.id,
        username: user.username,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
        githubToken: mockAccessToken,
        mockUser: true // 标记这是模拟用户
      }));

      return {
        user,
        access_token: localToken,
        refresh_token: mockAccessToken,
        expires_in: 86400, // 24小时
        token_type: 'Bearer'
      };
    } catch (error: any) {
      console.error('GitHub OAuth error:', error);
      throw new Error(error.message || 'GitHub OAuth处理失败');
    }
  }
}