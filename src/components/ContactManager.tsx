import React, { useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { Contact } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { notificationService } from '../services/notification';
import AddContact from './AddContact';

interface ContactManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (contactId: number) => void;
}

const ContactManager: React.FC<ContactManagerProps> = ({ isOpen, onClose, onStartChat }) => {
  const { contacts, removeContact, loadContacts } = useChatStore();
  const { user } = useAuthStore();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // 删除联系人
  const handleDeleteContact = async (contactId: number) => {
    setIsDeleting(true);
    try {
      await removeContact(contactId);
      setShowDeleteConfirm(null);
      setSelectedContact(null);
      notificationService.showSuccessNotification('联系人已删除');
    } catch (error) {
      console.error('Delete contact failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 刷新联系人列表
  const handleRefresh = async () => {
    try {
      await loadContacts();
      notificationService.showSuccessNotification('联系人列表已刷新');
    } catch (error) {
      console.error('Refresh contacts failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-success';
      case 'away': return 'bg-warning';
      case 'offline': return 'bg-base-300';
      default: return 'bg-base-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return '在线';
      case 'away': return '离开';
      case 'offline': return '离线';
      default: return '未知';
    }
  };

  const getLastActiveTime = (contact: Contact) => {
    if (contact.user.status === 'online') {
      return '现在在线';
    }
    
    // 模拟最后活跃时间
    const lastActive = new Date(Date.now() - Math.random() * 86400000);
    return `最后活跃：${formatDistanceToNow(lastActive, { addSuffix: true })}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="h-full p-6 bg-base-100">
        <div className="h-full max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl">联系人管理</h3>
          </div>

          <div className="flex h-full">
            {/* 左侧联系人列表 */}
            <div className="w-1/2 pr-4 border-r border-base-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-lg">我的联系人 ({contacts.length})</h4>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={handleRefresh}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    刷新
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowAddContact(true)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    添加联系人
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-base-content/50">
                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-lg font-medium mb-2">暂无联系人</p>
                    <p className="text-sm">点击"添加联系人"开始添加好友</p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.contact_id}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedContact?.contact_id === contact.contact_id
                          ? 'bg-primary/10 border-primary'
                          : 'border-base-200 hover:bg-base-100'
                      }`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <div className="flex items-center space-x-3">
                        {/* 头像 */}
                        <div className="relative">
                          <div className="avatar">
                            <div className="w-12 h-12 rounded-full">
                              {contact.user.avatar_url ? (
                                <img 
                                  src={contact.user.avatar_url} 
                                  alt={contact.user.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="bg-primary/20 flex items-center justify-center w-full h-full text-primary font-semibold">
                                  {contact.user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* 在线状态指示器 */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-base-100 ${getStatusColor(contact.user.status)}`}></div>
                        </div>

                        {/* 联系人信息 */}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-base-content truncate">
                            {contact.user.username}
                          </h5>
                          <p className="text-sm text-base-content/70">
                            {getStatusText(contact.user.status)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 右侧联系人详情 */}
            <div className="w-1/2 pl-4">
              {selectedContact ? (
                <div className="space-y-6">
                  <div className="text-center">
                    {/* 大头像 */}
                    <div className="relative inline-block">
                      <div className="avatar">
                        <div className="w-24 h-24 rounded-full">
                          {selectedContact.user.avatar_url ? (
                            <img 
                              src={selectedContact.user.avatar_url} 
                              alt={selectedContact.user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="bg-primary/20 flex items-center justify-center w-full h-full text-primary font-bold text-2xl">
                              {selectedContact.user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 在线状态指示器 */}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-base-100 ${getStatusColor(selectedContact.user.status)}`}></div>
                    </div>

                    <h3 className="text-xl font-bold mt-4">{selectedContact.user.username}</h3>
                    <p className="text-base-content/70">{getStatusText(selectedContact.user.status)}</p>
                  </div>

                  {/* 详细信息 */}
                  <div className="space-y-4">
                    <div className="bg-base-100 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">详细信息</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-base-content/70">用户ID:</span>
                          <span>{selectedContact.user.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">状态:</span>
                          <span className={`badge ${
                            selectedContact.user.status === 'online' ? 'badge-success' :
                            selectedContact.user.status === 'away' ? 'badge-warning' :
                            'badge-ghost'
                          }`}>
                            {getStatusText(selectedContact.user.status)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">添加时间:</span>
                          <span>{formatDistanceToNow(new Date(selectedContact.added_at), { addSuffix: true })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">最后活跃:</span>
                          <span>{getLastActiveTime(selectedContact)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="space-y-2">
                      <button 
                        className="btn btn-primary w-full"
                        onClick={() => {
                          if (onStartChat) {
                            onStartChat(selectedContact.contact_id);
                          }
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        发送消息
                      </button>
                      
                      <button 
                        className="btn btn-error btn-outline w-full"
                        onClick={() => setShowDeleteConfirm(selectedContact.contact_id)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除联系人
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-base-content/50">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">选择一个联系人</p>
                  <p className="text-sm">点击左侧联系人查看详细信息</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认删除联系人</h3>
            <p className="mb-6">
              确定要删除联系人 <strong>{selectedContact?.user.username}</strong> 吗？
              <br />
              <span className="text-warning text-sm">此操作无法撤销，相关聊天记录也将被删除。</span>
            </p>
            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
              >
                取消
              </button>
              <button 
                className="btn btn-error"
                onClick={() => handleDeleteContact(showDeleteConfirm)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  '确认删除'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加联系人对话框 */}
      <AddContact 
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
      />
    </>
  );
};

export default ContactManager;