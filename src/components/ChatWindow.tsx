import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { Message } from '../types';
import { format, isToday, isYesterday } from 'date-fns';
// import { zhCN } from 'date-fns/locale';

interface ChatWindowProps {
  className?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ className = '' }) => {
  const { 
    activeContactId, 
    chatSessions, 
    sendMessage, 
    // markMessageAsRead,
    setTypingStatus 
  } = useChatStore();
  
  const { user } = useAuthStore();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const activeSession = activeContactId ? chatSessions[activeContactId] : null;

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  // 处理打字状态
  const handleTyping = () => {
    if (!isTyping && activeContactId) {
      setIsTyping(true);
      setTypingStatus(activeContactId, true);
    }

    // 清除之前的定时器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // 设置新的定时器
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeContactId) {
        setTypingStatus(activeContactId, false);
      }
    }, 1000);
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeContactId || isSending) {
      return;
    }

    const content = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    try {
      await sendMessage(activeContactId, content);
      
      // 清除打字状态
      setIsTyping(false);
      setTypingStatus(activeContactId, false);
      
      // 聚焦输入框
      inputRef.current?.focus();
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // 恢复消息内容
      setMessageInput(content);
    } finally {
      setIsSending(false);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 格式化消息时间
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `昨天 ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MM-dd HH:mm');
    }
  };

  // 渲染消息气泡
  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.sender_id === user?.id;
    const prevMessage = index > 0 ? activeSession?.messages[index - 1] : null;
    const showTime = !prevMessage || 
      new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() > 300000; // 5分钟

    return (
      <div key={message.id} className={`chat ${isOwn ? 'chat-end' : 'chat-start'}`}>
        {showTime && (
          <div className="chat-header text-xs text-base-content/50 mb-1">
            {formatMessageTime(message.timestamp)}
          </div>
        )}
        
        <div className="chat-image avatar">
          <div className="w-8 h-8 rounded-full">
            {isOwn ? (
              user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} />
              ) : (
                <div className="bg-primary/20 flex items-center justify-center w-full h-full text-primary text-sm font-semibold">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
              )
            ) : (
              activeSession?.contact.avatar_url ? (
                <img src={activeSession.contact.avatar_url} alt={activeSession.contact.username} />
              ) : (
                <div className="bg-base-300 flex items-center justify-center w-full h-full text-base-content text-sm font-semibold">
                  {activeSession?.contact.username.charAt(0).toUpperCase()}
                </div>
              )
            )}
          </div>
        </div>
        
        <div className={`chat-bubble max-w-[200px] xs:max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl ${
          isOwn 
            ? 'chat-bubble-primary text-primary-content' 
            : 'chat-bubble-secondary'
        }`}>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
        
        <div className="chat-footer opacity-50 text-xs xs:text-sm mt-1">
          {isOwn && (
            <span className={`inline-flex items-center space-x-1 ${
              message.is_read ? 'text-success' : 'text-base-content/50'
            }`}>
              {message.is_read ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>已读</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>已送达</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (!activeContactId || !activeSession) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-base-100 ${className}`}>
        <div className="text-center px-4">
          <svg className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-4 sm:mb-6 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-base-content/70 mb-2">
            选择一个联系人开始聊天
          </h3>
          <p className="text-sm sm:text-base text-base-content/50">
            从左侧联系人列表中选择一个好友开始对话
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-base-100 ${className}`}>
      {/* 聊天头部 */}
      <div className="chat-header p-2 sm:p-3 md:p-4 border-b border-base-200 bg-base-100">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="avatar">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
              {activeSession.contact.avatar_url ? (
                <img 
                  src={activeSession.contact.avatar_url} 
                  alt={activeSession.contact.username}
                />
              ) : (
                <div className="bg-primary/20 flex items-center justify-center w-full h-full text-primary font-semibold">
                  {activeSession.contact.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base-content text-sm sm:text-base truncate">
              {activeSession.contact.username}
            </h2>
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-base-content/70">
              <span className={`w-2 h-2 rounded-full ${
                activeSession.contact.status === 'online' ? 'bg-success' :
                activeSession.contact.status === 'away' ? 'bg-warning' : 'bg-base-300'
              }`}></span>
              <span>
                {activeSession.contact.status === 'online' ? '在线' :
                 activeSession.contact.status === 'away' ? '离开' : '离线'}
              </span>
              {activeSession.isTyping && (
                <span className="typing-indicator text-primary">正在输入...</span>
              )}
            </div>
          </div>
          
          <div className="flex space-x-1 sm:space-x-2">
            <button className="btn btn-ghost btn-xs sm:btn-sm btn-circle">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button className="btn btn-ghost btn-xs sm:btn-sm btn-circle">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="btn btn-ghost btn-xs sm:btn-sm btn-circle">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="message-list flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4">
        {activeSession.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/50 px-4">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-base sm:text-lg font-medium mb-2">开始对话</p>
            <p className="text-xs sm:text-sm text-center">发送第一条消息开始聊天</p>
          </div>
        ) : (
          activeSession.messages.map((message, index) => renderMessage(message, index))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="chat-input p-2 sm:p-3 md:p-4 border-t border-base-200 bg-base-100">
        <div className="flex items-end space-x-2 sm:space-x-3">
          {/* 附件按钮 */}
          <button className="btn btn-ghost btn-xs sm:btn-sm btn-circle">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          {/* 表情按钮 */}
          <button className="btn btn-ghost btn-xs sm:btn-sm btn-circle">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {/* 输入框 */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={inputRef}
              className="textarea textarea-bordered w-full resize-none min-h-[2rem] sm:min-h-[2.5rem] max-h-24 sm:max-h-32 text-sm sm:text-base"
              placeholder="输入消息..."
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              rows={1}
              style={{
                height: 'auto',
                minHeight: window.innerWidth < 640 ? '2rem' : '2.5rem'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                const maxHeight = window.innerWidth < 640 ? 96 : 128;
                target.style.height = Math.min(target.scrollHeight, maxHeight) + 'px';
              }}
            />
          </div>
          
          {/* 发送按钮 */}
          <button 
            className={`btn btn-primary btn-xs sm:btn-sm btn-circle ${
              (!messageInput.trim() || isSending) ? 'btn-disabled' : ''
            }`}
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending}
          >
            {isSending ? (
              <span className="loading loading-spinner loading-xs sm:loading-sm"></span>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;