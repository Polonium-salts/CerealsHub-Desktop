import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useChatStore } from './stores/chatStore';
import { websocketService } from './services/websocket';
import { databaseService } from './services/database';
// import { notificationService } from './services/notification';
import LoginForm from './components/LoginForm';
import Sidebar from './components/Sidebar';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';
import Settings from './components/Settings';
import ContactManager from './components/ContactManager';
import NetworkError from './components/NetworkError';
import { Toaster } from 'react-hot-toast';
import './index.css';

type ActivePage = 'chat' | 'contacts' | 'notifications' | 'settings';

function App() {
  const { isAuthenticated, user, checkAuthStatus, loginWithGitHub } = useAuthStore();
  const { setConnectionStatus, addMessage, updateUserStatus, setTypingStatus, setActiveContact } = useChatStore();
  const [activePage, setActivePage] = useState<ActivePage>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isProcessingGitHubCallback, setIsProcessingGitHubCallback] = useState(false);


  // 从联系人管理器开始聊天
  const handleStartChat = (contactId: number) => {
    setActiveContact(contactId);
    setActivePage('chat');
  };

  useEffect(() => {
    // 初始化数据库
    const initializeApp = async () => {
      try {
        await databaseService.initialize();
        console.log('Database initialized successfully');
        
        // 检查认证状态
        checkAuthStatus();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    
    initializeApp();
    
    // 初始化通知服务
    // notificationService.init();
    
    // 设置主题
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, [checkAuthStatus]);

  // 处理GitHub OAuth回调
  useEffect(() => {
    const handleGitHubCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      
      // 检查是否是GitHub回调
      if (window.location.pathname === '/auth/github/callback' || (code && state === 'github_oauth')) {
        setIsProcessingGitHubCallback(true);
        
        if (error) {
          console.error('GitHub OAuth error:', error);
          // 清理URL参数
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsProcessingGitHubCallback(false);
          return;
        }
        
        if (code) {
          try {
            await loginWithGitHub(code);
            // 清理URL参数
            window.history.replaceState({}, document.title, '/');
          } catch (error) {
            console.error('GitHub login failed:', error);
            // 清理URL参数
            window.history.replaceState({}, document.title, '/');
          } finally {
            setIsProcessingGitHubCallback(false);
          }
        }
      }
    };
    
    handleGitHubCallback();
  }, [loginWithGitHub]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // 连接WebSocket
      websocketService.connect();
      
      return () => {
        websocketService.disconnect();
      };
    }
  }, [isAuthenticated, user, setConnectionStatus, addMessage, updateUserStatus, setTypingStatus]);

  // 如果未认证，显示登录表单
  if (!isAuthenticated) {
    // 如果正在处理GitHub回调，显示加载状态
    if (isProcessingGitHubCallback) {
      return (
        <>
          <div className="min-h-screen flex items-center justify-center bg-base-100">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
              <h2 className="text-xl font-semibold text-base-content mb-2">正在处理GitHub登录...</h2>
              <p className="text-base-content/70">请稍候，我们正在验证您的GitHub账户</p>
            </div>
          </div>
          <NetworkError />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--fallback-b1,oklch(var(--b1)))',
                color: 'var(--fallback-bc,oklch(var(--bc)))',
                border: '1px solid var(--fallback-b3,oklch(var(--b3)))'
              }
            }}
          />

        </>
      );
    }
    
    return (
      <>
        <LoginForm />
        <NetworkError />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--fallback-b1,oklch(var(--b1)))',
              color: 'var(--fallback-bc,oklch(var(--bc)))',
              border: '1px solid var(--fallback-b3,oklch(var(--b3)))'
            }
          }}
        />

      </>
    );
  }

  // 主应用界面
  return (
    <div className="flex h-screen bg-base-100 overflow-hidden">
      {/* 左侧边栏 - 响应式宽度 */}
      <Sidebar 
        className="flex-shrink-0" 
        activePage={activePage} 
        onPageChange={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* 主要内容区域 */}
      <div className="flex flex-1 min-w-0">
        <NetworkError />
        {activePage === 'chat' && (
          <>
            <ContactList className="w-80 xl:w-96 flex-shrink-0 border-r border-base-300" />
            <ChatWindow className="flex-1 min-w-0" />
          </>
        )}
        {activePage === 'contacts' && (
          <div className="flex-1 min-w-0">
            <ContactManager 
              isOpen={true}
              onClose={() => {}}
              onStartChat={handleStartChat}
            />
          </div>
        )}
        {activePage === 'notifications' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <h2 className="text-xl sm:text-2xl font-bold text-base-content mb-2">通知中心</h2>
              <p className="text-sm sm:text-base text-base-content/70">通知中心功能正在开发中...</p>
            </div>
          </div>
        )}
        {activePage === 'settings' && (
          <Settings className="flex-1 min-w-0" />
        )}
      </div>
      
      {/* 全局通知 */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--fallback-b1,oklch(var(--b1)))',
            color: 'var(--fallback-bc,oklch(var(--bc)))',
            border: '1px solid var(--fallback-b3,oklch(var(--b3)))'
          }
        }}
      />
      


    </div>
  );
}

export default App;
