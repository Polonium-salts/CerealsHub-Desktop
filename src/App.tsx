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
import { Toaster } from 'react-hot-toast';
import { StagewiseToolbar } from '@stagewise/toolbar-react';
import ReactPlugin from '@stagewise-plugins/react';
import './index.css';

type ActivePage = 'chat' | 'contacts' | 'notifications' | 'settings';

function App() {
  const { isAuthenticated, user, checkAuthStatus } = useAuthStore();
  const { setConnectionStatus, addMessage, updateUserStatus, setTypingStatus } = useChatStore();
  const [activePage, setActivePage] = useState<ActivePage>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    return (
      <>
        <LoginForm />
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
        <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
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
        {activePage === 'chat' && (
          <>
            <ContactList className="hidden lg:block w-80 xl:w-96 flex-shrink-0 border-r border-base-300" />
            <ChatWindow className="flex-1 min-w-0" />
          </>
        )}
        {activePage === 'contacts' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <h2 className="text-xl sm:text-2xl font-bold text-base-content mb-2">联系人管理</h2>
              <p className="text-sm sm:text-base text-base-content/70">联系人管理功能正在开发中...</p>
            </div>
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
      
      {/* Stagewise Toolbar */}
      <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
    </div>
  );
}

export default App;
