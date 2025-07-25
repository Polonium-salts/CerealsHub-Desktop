// OAuth配置
export const OAUTH_CONFIG = {
  github: {
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || 'Iv23lisKSUgFoKRy0CyU',
    redirectUri: import.meta.env.VITE_APP_URL || 'http://localhost:1420/',
    scope: 'user:email'
  }
};

// 开发环境配置
export const DEV_CONFIG = {
  apiBaseUrl: 'https://capi.cereals.fun',
  wsUrl: 'wss://capi.cereals.fun/ws',
  appUrl: 'http://localhost:1420/'
};

// 生产环境配置
export const PROD_CONFIG = {
  apiBaseUrl: 'https://capi.cereals.fun',
  wsUrl: 'wss://capi.cereals.fun/ws',
  appUrl: 'https://cereals.fun/'
};

export const getConfig = () => {
  return import.meta.env.MODE === 'production' ? PROD_CONFIG : DEV_CONFIG;
};