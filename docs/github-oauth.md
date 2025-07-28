# GitHub OAuth 登录配置指南

## 概述

本应用支持使用 GitHub 账户进行登录，用户可以通过 GitHub OAuth 快速登录而无需注册新账户。应用采用前端直接处理 GitHub OAuth 流程，无需后端服务器参与认证过程。

## 配置步骤

### 1. 创建 GitHub OAuth 应用

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写应用信息：
   - **Application name**: CerealsHub Desktop
   - **Homepage URL**: `https://cereals.fun`
   - **Application description**: CerealsHub 桌面应用
   - **Authorization callback URL**: 见下方回调地址配置

### 2. 回调地址配置

根据不同环境配置相应的回调地址：

#### 开发环境
```
http://localhost:1420/auth/github/callback
```

#### 生产环境
```
https://cereals.fun/auth/github/callback
```

### 3. 环境变量配置

1. 复制 `.env.example` 文件为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 在 `.env` 文件中配置 GitHub OAuth 信息：
   ```env
   VITE_GITHUB_CLIENT_ID=your_actual_github_client_id
   VITE_GITHUB_CLIENT_SECRET=your_actual_github_client_secret
   ```

**注意**: 在桌面应用中使用客户端密钥存在安全风险，建议在生产环境中考虑使用 PKCE 流程。

## 使用地址

### OAuth 授权流程

1. **授权请求地址**:
   ```
   https://github.com/login/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope=user:email&state=github_oauth
   ```

2. **回调处理地址**:
   - 开发环境: `http://localhost:1420/`
   - 生产环境: `https://cereals.fun/`

3. **API 端点**:
   - GitHub 登录处理: `POST /api/auth/github`
   - 参数: `{ code: string }` (从 GitHub 回调获取的授权码)

### 权限范围

应用请求的 GitHub 权限：
- `user:email` - 获取用户的邮箱地址

## 技术实现

### 前端流程

1. 用户点击 "使用 GitHub 登录" 按钮
2. 跳转到 GitHub OAuth 授权页面
3. 用户授权后，GitHub 重定向回应用并携带授权码
4. 前端检测到授权码，调用后端 API 完成登录
5. 后端验证授权码，获取用户信息，返回 JWT token
6. 前端保存 token，完成登录流程

### 安全考虑

- 使用 `state` 参数防止 CSRF 攻击
- 授权码仅使用一次，防止重放攻击
- JWT token 有过期时间，支持刷新机制
- 敏感信息通过环境变量配置，不提交到代码仓库

## 故障排除

### 常见问题

1. **授权失败**
   - 检查 GitHub OAuth 应用的回调地址是否正确
   - 确认客户端 ID 配置正确

2. **回调处理失败**
   - 检查前端路由是否正确处理 OAuth 回调
   - 确认后端 API 端点可用

3. **环境变量未生效**
   - 确认 `.env` 文件存在且格式正确
   - 重启开发服务器

### 调试信息

开发环境下，可以在浏览器控制台查看 OAuth 流程的详细日志。