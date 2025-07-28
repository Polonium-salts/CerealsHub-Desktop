import { create } from 'zustand';
import { Message, Contact, ChatSession, Notification, Group, GroupContact, GroupMember } from '../types';
import { databaseService } from '../services/database';
import { apiService } from '../services/api';
import { notificationService } from '../services/notification';

interface ChatState {
  // 状态
  contacts: Contact[];
  groups: Group[];
  groupContacts: GroupContact[];
  chatSessions: Record<number | string, ChatSession>;
  activeContactId: number | string | null;
  isConnected: boolean;
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filteredContacts: Contact[];
  filteredGroups: Group[];

  // 动作
  // 联系人管理
  loadContacts: () => Promise<void>;
  addContact: (contactId: number) => Promise<void>;
  removeContact: (contactId: number) => Promise<void>;
  searchContacts: (query: string) => void;
  
  // 群聊管理
  loadGroups: () => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  getGroupInfo: (groupId: string) => Promise<Group | null>;
  
  // 聊天会话管理
  setActiveContact: (contactId: number | string | null) => void;
  loadChatSession: (contactId: number | string) => Promise<void>;
  addMessage: (message: Message) => void;
  sendMessage: (contactId: number | string, content: string, messageType?: 'text' | 'image' | 'file') => Promise<void>;
  markMessageAsRead: (messageId: number) => void;
  markAllMessagesAsRead: (contactId: number | string) => Promise<void>;
  
  // 实时状态
  setConnectionStatus: (isConnected: boolean) => void;
  setTypingStatus: (contactId: number, isTyping: boolean) => void;
  updateUserStatus: (userId: number, status: 'online' | 'offline' | 'away') => void;
  
  // 通知管理
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
  
  // 工具方法
  getUnreadCount: (contactId: number) => number;
  getTotalUnreadCount: () => number;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 初始状态
  contacts: [],
  groups: [],
  groupContacts: [],
  chatSessions: {},
  activeContactId: null,
  isConnected: false,
  notifications: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredContacts: [],
  filteredGroups: [],

  // 加载联系人列表
  loadContacts: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // 从API获取最新联系人
      const apiContacts = await apiService.getContacts();
      
      // 保存到本地数据库
      try {
        for (const contact of apiContacts) {
          await databaseService.saveContact(contact);
          await databaseService.saveUser(contact.user);
        }
      } catch (error) {
        console.warn('Failed to save contacts to database:', error);
      }
      
      // 同时加载群聊信息
      try {
        const groups = await apiService.getGroups();
        set({ 
          contacts: apiContacts, 
          filteredContacts: apiContacts,
          groups: groups,
          filteredGroups: groups,
          isLoading: false 
        });
      } catch (groupError) {
        console.warn('Failed to load groups:', groupError);
        set({ 
          contacts: apiContacts, 
          filteredContacts: apiContacts,
          isLoading: false 
        });
      }
      
    } catch (error: any) {
      console.error('Failed to load contacts from API, trying local database:', error);
      
      try {
        // 如果API失败，从本地数据库加载
        const localContacts = await databaseService.getContacts(1); // 假设当前用户ID为1
        set({ 
          contacts: localContacts, 
          filteredContacts: localContacts,
          groups: [], // 本地数据库暂不支持群聊缓存
          filteredGroups: [],
          isLoading: false,
          error: 'Unable to sync with server, showing cached data'
        });
      } catch (dbError) {
        set({ 
          isLoading: false, 
          error: 'Failed to load contacts' 
        });
        notificationService.showErrorNotification('加载联系人失败');
      }
    }
  },

  // 添加联系人
  addContact: async (contactId: number) => {
    try {
      const contact = await apiService.addContact(contactId);
      
      // 保存到本地数据库
      await databaseService.saveContact(contact);
      await databaseService.saveUser(contact.user);
      
      const { contacts } = get();
      const updatedContacts = [...contacts, contact];
      
      set({ 
        contacts: updatedContacts,
        filteredContacts: updatedContacts
      });
      
      notificationService.showSuccessNotification(`已添加 ${contact.user.username} 为联系人`);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '添加联系人失败';
      set({ error: errorMessage });
      notificationService.showErrorNotification(errorMessage);
    }
  },

  // 移除联系人
  removeContact: async (contactId: number) => {
    try {
      await apiService.removeContact(contactId);
      
      // 从本地数据库移除
      await databaseService.removeContact(1, contactId); // 假设当前用户ID为1
      
      const { contacts, chatSessions, activeContactId } = get();
      const updatedContacts = contacts.filter(c => c.contact_id !== contactId);
      
      // 移除聊天会话
      const updatedSessions = { ...chatSessions };
      delete updatedSessions[contactId];
      
      set({ 
        contacts: updatedContacts,
        filteredContacts: updatedContacts,
        chatSessions: updatedSessions,
        activeContactId: activeContactId === contactId ? null : activeContactId
      });
      
      notificationService.showSuccessNotification('联系人已移除');
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '移除联系人失败';
      set({ error: errorMessage });
      notificationService.showErrorNotification(errorMessage);
    }
  },

  // 搜索联系人
  searchContacts: (query: string) => {
    const { contacts, groups } = get();
    
    if (!query.trim()) {
      set({ searchQuery: '', filteredContacts: contacts, filteredGroups: groups });
      return;
    }
    
    const filteredContacts = contacts.filter(contact => 
      contact.user.username.toLowerCase().includes(query.toLowerCase())
    );
    
    const filteredGroups = groups.filter(group => 
      group.name.toLowerCase().includes(query.toLowerCase())
    );
    
    set({ searchQuery: query, filteredContacts, filteredGroups });
  },

  // 加载群聊列表
  loadGroups: async () => {
    try {
      const groups = await apiService.getGroups();
      set({ groups, filteredGroups: groups });
    } catch (error: any) {
      console.error('Failed to load groups:', error);
      const errorMessage = error.response?.data?.message || '加载群聊列表失败';
      notificationService.showErrorNotification(errorMessage);
    }
  },

  // 加入群聊
  joinGroup: async (groupId: string) => {
    try {
      await apiService.joinGroup(groupId);
      
      // 重新加载群聊列表
      await get().loadGroups();
      
      notificationService.showSuccessNotification('成功加入群聊');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '加入群聊失败';
      notificationService.showErrorNotification(errorMessage);
      throw error;
    }
  },

  // 离开群聊
  leaveGroup: async (groupId: string) => {
    try {
      await apiService.leaveGroup(groupId);
      
      const { groups, chatSessions, activeContactId } = get();
      const updatedGroups = groups.filter(g => g.id !== groupId);
      
      // 移除聊天会话
      const updatedSessions = { ...chatSessions };
      delete updatedSessions[groupId];
      
      set({ 
        groups: updatedGroups,
        filteredGroups: updatedGroups,
        chatSessions: updatedSessions,
        activeContactId: activeContactId === groupId ? null : activeContactId
      });
      
      notificationService.showSuccessNotification('已离开群聊');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '离开群聊失败';
      notificationService.showErrorNotification(errorMessage);
      throw error;
    }
  },

  // 获取群聊信息
  getGroupInfo: async (groupId: string): Promise<Group | null> => {
    try {
      const group = await apiService.getGroupInfo(groupId);
      return group;
    } catch (error: any) {
      console.error('Failed to get group info:', error);
      return null;
    }
  },

  // 设置活跃联系人
  setActiveContact: (contactId: number | string | null) => {
    set({ activeContactId: contactId });
    
    if (contactId) {
      // 加载聊天会话
      get().loadChatSession(contactId);
      
      // 标记所有消息为已读
      get().markAllMessagesAsRead(contactId);
    }
  },

  // 加载聊天会话
  loadChatSession: async (contactId: number | string) => {
    const { chatSessions } = get();
    
    // 如果会话已存在，不重复加载
    if (chatSessions[contactId]) {
      return;
    }
    
    try {
      let messages: any[] = [];
      let contact: any = null;
      let unreadCount = 0;
      
      if (typeof contactId === 'string') {
        // 群聊会话
        try {
          const groupMessages = await apiService.getGroupMessages(contactId, { page: 1, limit: 50 });
          messages = groupMessages.data.reverse();
          
          const groupInfo = await get().getGroupInfo(contactId);
          if (groupInfo) {
            contact = {
              id: groupInfo.id,
              username: groupInfo.name,
              avatar_url: groupInfo.avatar_url,
              status: 'online',
              created_at: groupInfo.created_at
            };
          }
        } catch (error) {
          console.warn('Failed to load group messages from API:', error);
          // 创建空的群聊会话
          contact = {
            id: contactId,
            username: `群聊 ${contactId}`,
            avatar_url: '',
            status: 'online',
            created_at: new Date().toISOString()
          };
        }
      } else {
        // 用户会话
        messages = await databaseService.getMessages(1, contactId, 50);
        contact = await databaseService.getUser(contactId);
        unreadCount = await databaseService.getUnreadMessageCount(1, contactId);
      }
      
      if (contact) {
        const session: ChatSession = {
          contact,
          messages: messages.reverse(), // 按时间正序排列
          unreadCount,
          lastMessage: messages[0] || undefined,
          isTyping: false
        };
        
        set({ 
          chatSessions: { 
            ...chatSessions, 
            [contactId]: session 
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to load chat session:', error);
      // 在浏览器模式下，创建一个空的会话
      if (error instanceof Error && error.message.includes('Database operations not available')) {
        const emptySession: ChatSession = {
          contact: { id: contactId, username: `User ${contactId}`, avatar_url: '', status: 'offline', created_at: new Date().toISOString() },
          messages: [],
          unreadCount: 0,
          lastMessage: undefined,
          isTyping: false
        };
        
        set({ 
          chatSessions: { 
            ...chatSessions, 
            [contactId]: emptySession 
          }
        });
      } else {
        notificationService.showErrorNotification('加载聊天记录失败');
      }
    }
  },

  // 添加消息
  addMessage: (message: Message) => {
    const { chatSessions } = get();
    let contactId: number | string;
    
    // 判断是群聊消息还是私聊消息
    if (typeof message.receiver_id === 'string') {
      // 群聊消息
      contactId = message.receiver_id;
    } else {
      // 私聊消息
      contactId = message.sender_id === 1 ? message.receiver_id : message.sender_id; // 假设当前用户ID为1
    }
    
    const session = chatSessions[contactId];
    if (session) {
      const updatedSession = {
        ...session,
        messages: [...session.messages, message],
        lastMessage: message,
        unreadCount: message.sender_id !== 1 ? session.unreadCount + 1 : session.unreadCount
      };
      
      set({ 
        chatSessions: { 
          ...chatSessions, 
          [contactId]: updatedSession 
        }
      });
    }
  },

  // 发送消息
  sendMessage: async (contactId: number | string, content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
    try {
      let message;
      
      if (typeof contactId === 'string') {
        // 发送群聊消息
        message = await apiService.sendGroupMessage(contactId, content, messageType);
      } else {
        // 发送私聊消息
        message = await apiService.sendMessage(contactId, content, messageType);
        // 保存到本地数据库
        await databaseService.saveMessage(message);
      }
      
      // 添加到聊天会话
      get().addMessage(message);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '发送消息失败';
      notificationService.showErrorNotification(errorMessage);
      throw error;
    }
  },

  // 标记消息为已读
  markMessageAsRead: (messageId: number) => {
    const { chatSessions } = get();
    
    // 更新本地状态
    const updatedSessions = { ...chatSessions };
    Object.keys(updatedSessions).forEach(contactIdStr => {
      const contactId = parseInt(contactIdStr);
      const session = updatedSessions[contactId];
      
      const messageIndex = session.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        session.messages[messageIndex].is_read = true;
        session.unreadCount = Math.max(0, session.unreadCount - 1);
      }
    });
    
    set({ chatSessions: updatedSessions });
    
    // 更新数据库
    try {
      databaseService.markMessageAsRead(messageId);
    } catch (error) {
      console.warn('Failed to mark message as read in database:', error);
    }
    
    // 通知服务器
    apiService.markMessageAsRead(messageId).catch(console.error);
  },

  // 标记所有消息为已读
  markAllMessagesAsRead: async (contactId: number | string) => {
    try {
      if (typeof contactId === 'number') {
        await apiService.markAllMessagesAsRead(contactId);
        
        try {
          await databaseService.markAllMessagesAsRead(1, contactId); // 假设当前用户ID为1
        } catch (dbError) {
          console.warn('Failed to mark messages as read in database:', dbError);
        }
      }
      // 群聊消息暂时不支持标记已读功能
      
      const { chatSessions } = get();
      const session = chatSessions[contactId];
      
      if (session) {
        const updatedSession = {
          ...session,
          messages: session.messages.map(m => ({ ...m, is_read: true })),
          unreadCount: 0
        };
        
        set({ 
          chatSessions: { 
            ...chatSessions, 
            [contactId]: updatedSession 
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  // 设置连接状态
  setConnectionStatus: (isConnected: boolean) => {
    set({ isConnected });
  },

  // 设置打字状态
  setTypingStatus: (contactId: number, isTyping: boolean) => {
    const { chatSessions } = get();
    const session = chatSessions[contactId];
    
    if (session) {
      set({ 
        chatSessions: { 
          ...chatSessions, 
          [contactId]: { ...session, isTyping } 
        }
      });
    }
  },

  // 更新用户状态
  updateUserStatus: (userId: number, status: 'online' | 'offline' | 'away') => {
    const { contacts, chatSessions } = get();
    
    // 更新联系人状态
    const updatedContacts = contacts.map(contact => 
      contact.user.id === userId 
        ? { ...contact, user: { ...contact.user, status } }
        : contact
    );
    
    // 更新聊天会话中的用户状态
    const updatedSessions = { ...chatSessions };
    Object.keys(updatedSessions).forEach(contactIdStr => {
      const contactId = parseInt(contactIdStr);
      const session = updatedSessions[contactId];
      
      if (session.contact.id === userId) {
        session.contact.status = status;
      }
    });
    
    set({ 
      contacts: updatedContacts,
      filteredContacts: updatedContacts,
      chatSessions: updatedSessions
    });
  },

  // 添加通知
  addNotification: (notification: Notification) => {
    const { notifications } = get();
    set({ notifications: [notification, ...notifications] });
  },

  // 标记通知为已读
  markNotificationAsRead: (notificationId: string) => {
    const { notifications } = get();
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    set({ notifications: updatedNotifications });
  },

  // 清除所有通知
  clearNotifications: () => {
    set({ notifications: [] });
  },

  // 获取未读消息数量
  getUnreadCount: (contactId: number) => {
    const { chatSessions } = get();
    return chatSessions[contactId]?.unreadCount || 0;
  },

  // 获取总未读消息数量
  getTotalUnreadCount: () => {
    const { chatSessions } = get();
    return Object.values(chatSessions).reduce((total, session) => total + session.unreadCount, 0);
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));