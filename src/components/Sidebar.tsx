import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

type ActivePage = 'chat' | 'contacts' | 'notifications' | 'settings';

interface SidebarProps {
  className?: string;
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '', activePage, onPageChange, collapsed = false, onToggleCollapse }) => {
  const { user } = useAuthStore();
  const { getTotalUnreadCount, notifications } = useChatStore();
  
  const totalUnreadCount = getTotalUnreadCount();
  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const menuItems = [
    {
      id: 'chat',
      label: '聊天',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      badge: totalUnreadCount,
      active: activePage === 'chat'
    },
    {
      id: 'contacts',
      label: '联系人',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: 0,
      active: activePage === 'contacts'
    },
    {
      id: 'notifications',
      label: '通知',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 17H6l5 5v-5zM12 3v3m6.366-.366l-2.12 2.12M21 12h-3m.366 6.366l-2.12-2.12M12 21v-3m-6.366.366l2.12-2.12M3 12h3m-.366-6.366l2.12 2.12" />
        </svg>
      ),
      badge: unreadNotifications,
      active: activePage === 'notifications'
    },
    {
      id: 'settings',
      label: '设置',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      badge: 0,
      active: activePage === 'settings'
    }
  ];

  return (
    <div className={`sidebar flex flex-col h-full bg-base-200 border-r border-base-300 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} ${className}`}>
      {/* 用户信息 */}
      <div className={`${collapsed ? 'p-2' : 'p-4'} border-b border-base-300`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="avatar cursor-pointer hover:scale-105 transition-transform duration-200" onClick={onToggleCollapse}>
            <div className={`${collapsed ? 'w-12 h-12' : 'w-12 h-12'} rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200`}>
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`bg-primary/20 flex items-center justify-center w-full h-full text-primary font-semibold ${collapsed ? 'text-lg' : 'text-lg'}`}>
                  {user?.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          
          {!collapsed && (
            <div className="flex-1">
              <h3 className="font-semibold text-base-content truncate">
                {user?.username}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-xs text-base-content/70">在线</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 导航菜单 */}
      <div className={`flex-1 ${collapsed ? 'px-1 py-3' : 'px-3 py-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center space-y-3">
            {menuItems.map((item) => (
              <div key={item.id} className="relative">
                <a 
                  className={`flex items-center justify-center w-12 h-12 rounded-lg cursor-pointer transition-all duration-200 ${
                    item.active 
                      ? 'bg-primary text-primary-content shadow-lg' 
                      : 'hover:bg-base-300 hover:shadow-md text-base-content'
                  }`}
                  onClick={() => onPageChange(item.id as ActivePage)}
                  title={item.label}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {item.icon}
                  </div>
                  
                  {item.badge > 0 && (
                    <div className={`badge badge-xs absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] text-[9px] ${
                      item.active ? 'badge-accent' : 'badge-primary'
                    } font-bold z-10 flex items-center justify-center`}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <ul className="menu menu-vertical w-full space-y-1">
            {menuItems.map((item) => (
              <li key={item.id} className="relative">
                <a 
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    item.active 
                      ? 'bg-primary text-primary-content shadow-lg' 
                      : 'hover:bg-base-300 hover:shadow-md text-base-content'
                  }`}
                  onClick={() => onPageChange(item.id as ActivePage)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                      <div className="w-6 h-6">
                        {item.icon}
                      </div>
                    </div>
                    <span className="font-medium flex-1">
                      {item.label}
                    </span>
                  </div>
                  
                  {item.badge > 0 && (
                    <div className={`badge badge-sm ml-auto ${
                      item.active ? 'badge-accent' : 'badge-primary'
                    } font-bold z-10 flex items-center justify-center`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 底部操作 */}
      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-base-300`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <span className="text-sm text-base-content/70">
              深色模式
            </span>
          )}
          <label className="swap swap-rotate cursor-pointer" title={collapsed ? '切换主题' : ''}>
            <input 
              type="checkbox" 
              className="hidden"
              onChange={(e) => {
                const theme = e.target.checked ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
              }}
              defaultChecked={localStorage.getItem('theme') === 'dark'}
            />
            <div className={`swap-off ${collapsed ? 'p-2 w-10 h-10' : 'p-1.5 w-8 h-8'} flex items-center justify-center rounded-lg hover:bg-base-300 hover:shadow-md transition-all duration-200`}>
              <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className={`swap-on ${collapsed ? 'p-2 w-10 h-10' : 'p-1.5 w-8 h-8'} flex items-center justify-center rounded-lg hover:bg-base-300 hover:shadow-md transition-all duration-200`}>
              <svg className="w-4 h-4 text-info" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;