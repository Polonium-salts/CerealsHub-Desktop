import React, { useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { Contact } from '../types';
import { formatDistanceToNow } from 'date-fns';
// import { zhCN } from 'date-fns/locale';

interface ContactListProps {
  className?: string;
}

const ContactList: React.FC<ContactListProps> = ({ className = '' }) => {
  const { 
    filteredContacts, 
    activeContactId, 
    isLoading, 
    error,
    searchQuery,
    loadContacts, 
    setActiveContact, 
    searchContacts,
    getUnreadCount,
    clearError
  } = useChatStore();
  
  const { user } = useAuthStore();
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user, loadContacts]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchContacts(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchContacts]);

  const handleContactClick = (contact: Contact) => {
    setActiveContact(contact.contact_id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-success';
      case 'away': return 'bg-warning';
      case 'offline': return 'bg-base-300';
      default: return 'bg-base-300';
    }
  };

  const getLastActiveTime = (contact: Contact) => {
    if (contact.user.status === 'online') {
      return '在线';
    }
    
    // 这里应该从后端获取最后活跃时间，暂时使用模拟数据
    const lastActive = new Date(Date.now() - Math.random() * 86400000); // 随机1天内
    return formatDistanceToNow(lastActive, { 
      addSuffix: true
      // locale: zhCN 
    });
  };

  if (isLoading && filteredContacts.length === 0) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-3 sm:p-4">
          <div className="skeleton h-8 sm:h-10 w-full mb-3 sm:mb-4"></div>
        </div>
        <div className="flex-1 p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2 sm:space-x-3">
              <div className="skeleton w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0"></div>
              <div className="flex-1">
                <div className="skeleton h-3 sm:h-4 w-3/4 mb-1 sm:mb-2"></div>
                <div className="skeleton h-2 sm:h-3 w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-base-100 ${className}`}>
      {/* 搜索栏 */}
      <div className="p-3 sm:p-4 border-b border-base-200">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索联系人..."
            className="input input-bordered w-full pl-8 sm:pl-10 pr-3 sm:pr-4 text-sm sm:text-base h-8 sm:h-12"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <svg 
            className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-base-content/50"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
        
        {searchQuery && (
          <div className="mt-2 text-xs sm:text-sm text-base-content/70">
            找到 {filteredContacts.length} 个联系人
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-3 sm:mx-4 mt-3 sm:mt-4">
          <div className="alert alert-warning">
            <svg className="stroke-current shrink-0 w-4 h-4 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs sm:text-sm">{error}</span>
            <button 
              className="btn btn-xs sm:btn-sm btn-ghost"
              onClick={clearError}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 联系人列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/50 px-4">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-base sm:text-lg font-medium mb-2 text-center">
              {searchQuery ? '未找到匹配的联系人' : '暂无联系人'}
            </p>
            <p className="text-xs sm:text-sm text-center">
              {searchQuery ? '尝试使用其他关键词搜索' : '开始添加联系人来聊天吧'}
            </p>
          </div>
        ) : (
          <div className="p-1 sm:p-2">
            {filteredContacts.map((contact) => {
              const unreadCount = getUnreadCount(contact.contact_id);
              const isActive = activeContactId === contact.contact_id;
              
              return (
                <div
                  key={contact.contact_id}
                  className={`contact-item p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${
                    isActive 
                      ? 'bg-primary/10 border-l-2 sm:border-l-4 border-primary' 
                      : 'hover:bg-base-200'
                  }`}
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* 头像 */}
                    <div className="relative">
                      <div className="avatar">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full">
                          {contact.user.avatar_url ? (
                            <img 
                              src={contact.user.avatar_url} 
                              alt={contact.user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="bg-primary/20 flex items-center justify-center w-full h-full text-primary font-semibold text-sm sm:text-base">
                              {contact.user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 在线状态指示器 */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-base-100 ${getStatusColor(contact.user.status)}`}></div>
                    </div>

                    {/* 联系人信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium truncate text-sm sm:text-base ${
                          isActive ? 'text-primary' : 'text-base-content'
                        }`}>
                          {contact.user.username}
                        </h3>
                        
                        {unreadCount > 0 && (
                          <div className="badge badge-primary badge-xs sm:badge-sm">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-base-content/70 truncate">
                          {getLastActiveTime(contact)}
                        </p>
                        
                        {contact.user.status === 'online' && (
                          <div className="online-indicator">
                            <span className="text-xs text-success">●</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 加载更多指示器 */}
      {isLoading && filteredContacts.length > 0 && (
        <div className="p-3 sm:p-4 text-center">
          <span className="loading loading-spinner loading-xs sm:loading-sm"></span>
          <span className="ml-2 text-xs sm:text-sm text-base-content/70">加载中...</span>
        </div>
      )}
    </div>
  );
};

export default ContactList;