import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { LoginRequest, RegisterRequest } from '../types';
import { apiService } from '../services/api';

interface LoginFormProps {
  className?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ className = '' }) => {
  const { login, loginWithGitHub, register, isLoading, networkLoading, error, clearError } = useAuthStore();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 处理GitHub OAuth回调
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state === 'github_oauth') {
      // 立即清除URL参数，防止重复处理
      window.history.replaceState({}, document.title, window.location.pathname);
      handleGitHubCallback(code);
    }
  }, []);

  // 处理GitHub OAuth回调
  const handleGitHubCallback = async (code: string) => {
    try {
      await loginWithGitHub(code);
    } catch (error) {
      console.error('GitHub login failed:', error);
    }
  };

  // 处理GitHub登录
  const handleGitHubLogin = () => {
    const authUrl = apiService.getGitHubAuthUrl();
    window.location.href = authUrl;
  };

  // 表单验证
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      errors.username = '用户名至少需要3个字符';
    }

    if (!formData.password) {
      errors.password = '密码不能为空';
    } else if (formData.password.length < 6) {
      errors.password = '密码至少需要6个字符';
    }

    if (isRegisterMode) {
      if (!formData.email.trim()) {
        errors.email = '邮箱不能为空';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = '请输入有效的邮箱地址';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = '两次输入的密码不一致';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除该字段的验证错误
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // 清除全局错误
    if (error) {
      clearError();
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isRegisterMode) {
        const registerData: RegisterRequest = {
          username: formData.username.trim(),
          password: formData.password,
          email: formData.email.trim()
        };
        await register(registerData.username, registerData.password, registerData.email);
      } else {
        const loginData: LoginRequest = {
          username: formData.username.trim(),
          password: formData.password
        };
        await login(loginData.username, loginData.password);
      }
    } catch {
      // 错误已经在store中处理
    }
  };

  // 切换登录/注册模式
  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      email: ''
    });
    setValidationErrors({});
    clearError();
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-base-200 p-4 ${className}`}>
      <div className="card w-full max-w-sm sm:max-w-md bg-base-100 shadow-xl">
        <div className="card-body p-4 sm:p-6">
          {/* 头部 */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="avatar mb-3 sm:mb-4">
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-8 sm:w-10 h-8 sm:h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-base-content">
              CerealsHub
            </h1>
            <p className="text-sm sm:text-base text-base-content/70 mt-2">
              {isRegisterMode ? '创建新账户' : '欢迎回来'}
            </p>
          </div>

          {/* 全局错误提示 */}
          {error && (
            <div className="alert alert-error mb-4">
              <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-6 relative">
          {networkLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
            {/* 用户名 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">用户名</span>
              </label>
              <input
                type="text"
                className={`input input-bordered w-full ${
                  validationErrors.username ? 'input-error' : ''
                }`}
                placeholder="请输入用户名"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={isLoading}
              />
              {validationErrors.username && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.username}</span>
                </label>
              )}
            </div>

            {/* 邮箱 (仅注册模式) */}
            {isRegisterMode && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">邮箱</span>
                </label>
                <input
                  type="email"
                  className={`input input-bordered w-full ${
                    validationErrors.email ? 'input-error' : ''
                  }`}
                  placeholder="请输入邮箱地址"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isLoading}
                />
                {validationErrors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.email}</span>
                  </label>
                )}
              </div>
            )}

            {/* 密码 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">密码</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input input-bordered w-full pr-12 ${
                    validationErrors.password ? 'input-error' : ''
                  }`}
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.password}</span>
                </label>
              )}
            </div>

            {/* 确认密码 (仅注册模式) */}
            {isRegisterMode && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">确认密码</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input input-bordered w-full ${
                    validationErrors.confirmPassword ? 'input-error' : ''
                  }`}
                  placeholder="请再次输入密码"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  disabled={isLoading}
                />
                {validationErrors.confirmPassword && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.confirmPassword}</span>
                  </label>
                )}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="form-control mt-6">
              <button 
                type="submit" 
                className={`btn btn-primary w-full ${
                  isLoading ? 'loading' : ''
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  isRegisterMode ? '注册' : '登录'
                )}
              </button>
            </div>
          </form>

          {/* GitHub登录 (仅登录模式) */}
          {!isRegisterMode && (
            <>
              <div className="divider">或</div>
              <div className="form-control">
                <button 
                  type="button"
                  className="btn btn-outline w-full"
                  onClick={handleGitHubLogin}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  使用 GitHub 登录
                </button>
              </div>
            </>
          )}

          {/* 切换模式 */}
          <div className="divider">{!isRegisterMode ? '或' : ''}</div>
          <div className="text-center">
            <button 
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={toggleMode}
              disabled={isLoading}
            >
              {isRegisterMode ? '已有账户？立即登录' : '没有账户？立即注册'}
            </button>
          </div>

          {/* 底部信息 */}
          <div className="text-center mt-4 sm:mt-6 text-xs text-base-content/50">
            <p className="text-xs sm:text-sm">使用 CerealsHub 即表示您同意我们的</p>
            <div className="space-x-2 mt-1">
              <a href="#" className="link link-primary text-xs sm:text-sm">服务条款</a>
              <span className="text-xs sm:text-sm">和</span>
              <a href="#" className="link link-primary text-xs sm:text-sm">隐私政策</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;