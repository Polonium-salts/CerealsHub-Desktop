import React, { useState } from 'react';
import { apiService } from '../services/api';
import { useChatStore } from '../stores/chatStore';
import { notificationService } from '../services/notification';

interface JoinGroupProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupJoined?: () => void;
}

const JoinGroup: React.FC<JoinGroupProps> = ({ isOpen, onClose, onGroupJoined }) => {
  const [groupUrl, setGroupUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { loadContacts } = useChatStore();

  // 从群聊URL中提取群聊ID
  const extractGroupId = (url: string): string | null => {
    try {
      // 匹配格式: https://capi.cereals.fun/group/时间戳_随机码
      const match = url.match(/\/group\/([^/?]+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  };

  const handleJoinGroup = async () => {
    if (!groupUrl.trim()) {
      notificationService.showErrorNotification('请输入群聊链接');
      return;
    }

    const groupId = extractGroupId(groupUrl.trim());
    if (!groupId) {
      notificationService.showErrorNotification('无效的群聊链接格式');
      return;
    }

    setIsJoining(true);
    try {
      // 加入群聊
      await apiService.joinGroup(groupId);
      
      // 重新加载联系人列表以包含新加入的群聊
      await loadContacts();
      
      notificationService.showSuccessNotification('成功加入群聊');
      setGroupUrl('');
      onClose();
      
      if (onGroupJoined) {
        onGroupJoined();
      }
    } catch (error: any) {
      console.error('Join group failed:', error);
      const errorMessage = error.response?.data?.message || '加入群聊失败';
      notificationService.showErrorNotification(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    if (!isJoining) {
      setGroupUrl('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">加入群聊</h3>
        
        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">群聊链接</span>
            </label>
            <input
              type="text"
              placeholder="请输入群聊链接，例如: https://capi.cereals.fun/group/时间戳_随机码"
              className="input input-bordered w-full"
              value={groupUrl}
              onChange={(e) => setGroupUrl(e.target.value)}
              disabled={isJoining}
            />
            <div className="label">
              <span className="label-text-alt text-base-content/70">
                群聊链接格式: https://capi.cereals.fun/group/群聊ID
              </span>
            </div>
          </div>

          <div className="bg-info/10 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-info">
                <p className="font-medium mb-1">如何获取群聊链接？</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>从群聊管理员或成员处获取邀请链接</li>
                  <li>链接格式为: https://capi.cereals.fun/group/群聊ID</li>
                  <li>确保链接完整且有效</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button 
            className="btn"
            onClick={handleClose}
            disabled={isJoining}
          >
            取消
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleJoinGroup}
            disabled={isJoining || !groupUrl.trim()}
          >
            {isJoining ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                加入中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                加入群聊
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinGroup;