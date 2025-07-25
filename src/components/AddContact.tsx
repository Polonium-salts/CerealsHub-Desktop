import React, { useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { apiService } from '../services/api';
import { User } from '../types';
import { notificationService } from '../services/notification';

interface AddContactProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddContact: React.FC<AddContactProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { addContact, contacts } = useChatStore();

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // 模拟搜索结果（在实际应用中应该调用API）
      const mockUsers: User[] = [
        {
          id: 3,
          username: 'alice',
          avatar_url: '',
          status: 'online',
          created_at: new Date().toISOString()
        },
        {
          id: 4,
          username: 'bob',
          avatar_url: '',
          status: 'offline',
          created_at: new Date().toISOString()
        },
        {
          id: 5,
          username: 'charlie',
          avatar_url: '',
          status: 'away',
          created_at: new Date().toISOString()
        }
      ];

      // 过滤搜索结果
      const filtered = mockUsers.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // 排除已经是联系人的用户
      const existingContactIds = contacts.map(c => c.contact_id);
      const availableUsers = filtered.filter(user => !existingContactIds.includes(user.id));

      setSearchResults(availableUsers);
    } catch (error) {
      console.error('Search failed:', error);
      notificationService.showErrorNotification('搜索用户失败');
    } finally {
      setIsSearching(false);
    }
  };

  // 添加联系人
  const handleAddContact = async (userId: number) => {
    setIsAdding(true);
    try {
      await addContact(userId);
      // 从搜索结果中移除已添加的用户
      setSearchResults(prev => prev.filter(user => user.id !== userId));
      notificationService.showSuccessNotification('联系人添加成功');
    } catch (error) {
      console.error('Add contact failed:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // 重置状态
  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-success';
      case 'away': return 'bg-warning';
      case 'offline': return 'bg-base-300';
      default: return 'bg-base-300';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">添加联系人</h3>
          <button 
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="输入用户名搜索..."
                className="input input-bordered w-full pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <svg 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50"
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
            <button 
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                '搜索'
              )}
            </button>
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-96 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              {searchQuery ? (
                isSearching ? (
                  <div className="flex flex-col items-center">
                    <span className="loading loading-spinner loading-md mb-2"></span>
                    <p>搜索中...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v2.306" />
                    </svg>
                    <p>未找到匹配的用户</p>
                    <p className="text-sm mt-1">尝试使用其他关键词</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>输入用户名开始搜索</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-base-200 hover:bg-base-50"
                >
                  <div className="flex items-center space-x-3">
                    {/* 头像 */}
                    <div className="relative">
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="bg-primary/20 flex items-center justify-center w-full h-full text-primary font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 在线状态指示器 */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-base-100 ${getStatusColor(user.status)}`}></div>
                    </div>

                    {/* 用户信息 */}
                    <div>
                      <h4 className="font-medium text-base-content">{user.username}</h4>
                      <p className="text-sm text-base-content/70">
                        {user.status === 'online' ? '在线' : 
                         user.status === 'away' ? '离开' : '离线'}
                      </p>
                    </div>
                  </div>

                  {/* 添加按钮 */}
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddContact(user.id)}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      '添加'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="modal-action">
          <button className="btn" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddContact;