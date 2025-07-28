// 环境配置
const DEV_CONFIG = {
  apiBaseUrl: 'https://capi.cereals.fun',
  wsUrl: 'wss://capi.cereals.fun/ws',
  appUrl: 'http://localhost:1420/',
  github: {
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || 'Iv23lisKSUgFoKRy0CyU',
    scope: 'user:email',
    redirectUri: 'http://localhost:1420/auth/github/callback'
  }
};

// 生产环境配置
const PROD_CONFIG = {
  apiBaseUrl: 'https://capi.cereals.fun',
  wsUrl: 'wss://capi.cereals.fun/ws',
  appUrl: 'https://cereals.fun/',
  github: {
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || 'Iv23lisKSUgFoKRy0CyU',
    scope: 'user:email',
    redirectUri: 'https://cereals.fun/auth/github/callback'
  }
};

const baseConfig = import.meta.env.MODE === 'production' ? PROD_CONFIG : DEV_CONFIG;

export const config = {
  ...baseConfig,
  oauth: {
    github: {
      ...baseConfig.github
    }
  }
};

export const OAUTH_CONFIG = config.oauth;