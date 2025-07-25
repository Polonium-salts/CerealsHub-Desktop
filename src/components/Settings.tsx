import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { notificationService } from '../services/notification';

interface SettingsProps {
  className?: string;
}

const Settings: React.FC<SettingsProps> = ({ className = '' }) => {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      notificationService.showSuccessNotification('已退出登录');
    } catch (error) {
      notificationService.showErrorNotification('退出登录失败');
    }
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  };

  return (
    <div className={`settings-page h-full bg-base-100 flex flex-col ${className}`}>
      {/* 设置页面头部 */}
      <div className="p-4 sm:p-6 border-b border-base-300 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-base-content">设置</h1>
        <p className="text-base-content/70 mt-1 text-sm sm:text-base">管理您的账户和应用偏好</p>
      </div>

      {/* 设置内容 */}
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
        {/* 账户信息 */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base sm:text-lg mb-3 sm:mb-4">账户信息</h2>
            
            <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
              <div className="avatar">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full">
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="bg-primary/20 flex items-center justify-center w-full h-full text-primary font-semibold text-lg sm:text-xl">
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-base-content">
                  {user?.username}
                </h3>
                <p className="text-base-content/70 text-sm">用户ID: {user?.id}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-xs sm:text-sm text-base-content/70">在线</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">用户名</span>
                </label>
                <input 
                  type="text" 
                  value={user?.username || ''} 
                  className="input input-bordered" 
                  disabled 
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">注册时间</span>
                </label>
                <input 
                  type="text" 
                  value={user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : ''} 
                  className="input input-bordered" 
                  disabled 
                />
              </div>
            </div>
          </div>
        </div>

        {/* 应用设置 */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base sm:text-lg mb-3 sm:mb-4">应用设置</h2>
            
            <div className="space-y-3 sm:space-y-4">
              {/* 主题设置 */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-base-100 rounded-lg">
                <div>
                  <h3 className="font-medium text-base-content text-sm sm:text-base">深色模式</h3>
                  <p className="text-xs sm:text-sm text-base-content/70">切换应用的外观主题</p>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary" 
                  onChange={handleThemeChange}
                  defaultChecked={localStorage.getItem('theme') === 'dark'}
                />
              </div>

              {/* 通知设置 */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-base-100 rounded-lg">
                <div>
                  <h3 className="font-medium text-base-content text-sm sm:text-base">桌面通知</h3>
                  <p className="text-xs sm:text-sm text-base-content/70">接收新消息的桌面通知</p>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary toggle-sm sm:toggle-md" 
                  defaultChecked={true}
                />
              </div>

              {/* 声音设置 */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-base-100 rounded-lg">
                <div>
                  <h3 className="font-medium text-base-content text-sm sm:text-base">消息提示音</h3>
                  <p className="text-xs sm:text-sm text-base-content/70">新消息到达时播放提示音</p>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary toggle-sm sm:toggle-md" 
                  defaultChecked={true}
                />
              </div>

              {/* 自动启动 */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-base-100 rounded-lg">
                <div>
                  <h3 className="font-medium text-base-content text-sm sm:text-base">开机自启动</h3>
                  <p className="text-xs sm:text-sm text-base-content/70">系统启动时自动打开应用</p>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary toggle-sm sm:toggle-md" 
                  defaultChecked={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 隐私与安全 */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base sm:text-lg mb-3 sm:mb-4">隐私与安全</h2>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-base-100 rounded-lg">
                <div>
                  <h3 className="font-medium text-base-content text-sm sm:text-base">在线状态</h3>
                  <p className="text-xs sm:text-sm text-base-content/70">让其他用户看到您的在线状态</p>
                </div>
                <select className="select select-bordered select-xs sm:select-sm">
                  <option value="online">在线</option>
                  <option value="away">离开</option>
                  <option value="busy">忙碌</option>
                  <option value="invisible">隐身</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-base-100 rounded-lg">
                <div>
                  <h3 className="font-medium text-base-content text-sm sm:text-base">已读回执</h3>
                  <p className="text-xs sm:text-sm text-base-content/70">发送消息已读状态给对方</p>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary toggle-sm sm:toggle-md" 
                  defaultChecked={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 危险操作 */}
        <div className="card bg-base-200 shadow-sm border border-error/20">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-base sm:text-lg mb-3 sm:mb-4 text-error">危险操作</h2>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-error/5 rounded-lg border border-error/20">
                <h3 className="font-medium text-base-content mb-2 text-sm sm:text-base">退出登录</h3>
                <p className="text-xs sm:text-sm text-base-content/70 mb-3 sm:mb-4">
                  退出当前账户，您需要重新登录才能继续使用
                </p>
                <button 
                  className="btn btn-error btn-xs sm:btn-sm"
                  onClick={handleLogout}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">退出登录</span>
                  <span className="sm:hidden">退出</span>
                </button>
              </div>

              <div className="p-3 sm:p-4 bg-error/5 rounded-lg border border-error/20">
                <h3 className="font-medium text-base-content mb-2 text-sm sm:text-base">清除本地数据</h3>
                <p className="text-xs sm:text-sm text-base-content/70 mb-3 sm:mb-4">
                  清除所有本地缓存的聊天记录和用户数据
                </p>
                <button className="btn btn-outline btn-error btn-xs sm:btn-sm">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">清除数据</span>
                  <span className="sm:hidden">清除</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;