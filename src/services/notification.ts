import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { User, Message, Notification } from '../types';
import { useChatStore } from '../stores/chatStore';
import toast from 'react-hot-toast';

class NotificationService {
  private permissionGranted = false;

  async initialize(): Promise<void> {
    try {
      this.permissionGranted = await isPermissionGranted();
      
      if (!this.permissionGranted) {
        const permission = await requestPermission();
        this.permissionGranted = permission === 'granted';
      }
      
      console.log('Notification permission:', this.permissionGranted ? 'granted' : 'denied');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  // 显示消息通知
  async showMessageNotification(sender: User, message: Message): Promise<void> {
    if (!this.permissionGranted) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      // 检查是否应该显示通知（例如，窗口是否在前台）
      if (await this.shouldShowNotification()) {
        await sendNotification({
          title: `新消息来自 ${sender.username}`,
          body: this.formatMessageContent(message.content, message.message_type),
          icon: sender.avatar_url || '/tauri.svg',
        });
      }

      // 同时显示应用内通知
      this.showInAppNotification({
        id: `msg_${message.id}`,
        type: 'message',
        title: sender.username,
        message: this.formatMessageContent(message.content, message.message_type),
        timestamp: message.timestamp,
        isRead: false,
        data: { senderId: sender.id, messageId: message.id }
      });

    } catch (error) {
      console.error('Failed to show message notification:', error);
    }
  }

  // 显示系统通知
  async showSystemNotification(title: string, message: string, icon?: string): Promise<void> {
    if (!this.permissionGranted) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      await sendNotification({
        title,
        body: message,
        icon: icon || '/tauri.svg',
      });

      this.showInAppNotification({
        id: `sys_${Date.now()}`,
        type: 'system',
        title,
        message,
        timestamp: new Date().toISOString(),
        isRead: false
      });

    } catch (error) {
      console.error('Failed to show system notification:', error);
    }
  }

  // 显示联系人请求通知
  async showContactRequestNotification(requester: User): Promise<void> {
    if (!this.permissionGranted) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      await sendNotification({
        title: '新的联系人请求',
        body: `${requester.username} 想要添加您为联系人`,
        icon: requester.avatar_url || '/tauri.svg',
      });

      this.showInAppNotification({
        id: `contact_${requester.id}`,
        type: 'contact_request',
        title: '联系人请求',
        message: `${requester.username} 想要添加您为联系人`,
        timestamp: new Date().toISOString(),
        isRead: false,
        data: { requesterId: requester.id }
      });

    } catch (error) {
      console.error('Failed to show contact request notification:', error);
    }
  }

  // 显示应用内通知
  private showInAppNotification(notification: Notification): void {
    const chatStore = useChatStore.getState();
    chatStore.addNotification(notification);

    // 使用 react-hot-toast 显示临时通知
    switch (notification.type) {
      case 'message':
        toast.success(`${notification.title}: ${notification.message}`, {
          duration: 3000,
          position: 'top-right',
        });
        break;
      case 'contact_request':
        toast(`${notification.title}: ${notification.message}`, {
          duration: 5000,
          position: 'top-right',
          icon: '👤',
        });
        break;
      case 'system':
        toast(notification.message, {
          duration: 4000,
          position: 'top-right',
          icon: 'ℹ️',
        });
        break;
    }
  }

  // 显示错误通知
  showErrorNotification(message: string): void {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
    });
  }

  // 显示成功通知
  showSuccessNotification(message: string): void {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
    });
  }

  // 显示警告通知
  showWarningNotification(message: string): void {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
    });
  }

  // 显示加载通知
  showLoadingNotification(message: string): string {
    return toast.loading(message, {
      position: 'top-right',
    });
  }

  // 关闭加载通知
  dismissNotification(toastId: string): void {
    toast.dismiss(toastId);
  }

  // 格式化消息内容
  private formatMessageContent(content: string, messageType: string): string {
    switch (messageType) {
      case 'image':
        return '[图片]';
      case 'file':
        return '[文件]';
      case 'text':
      default:
        // 限制通知内容长度
        return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
  }

  // 检查是否应该显示通知
  private async shouldShowNotification(): Promise<boolean> {
    // 这里可以添加更多逻辑，比如检查窗口是否在前台、用户设置等
    try {
      // 检查文档是否可见（窗口是否在前台）
      return document.hidden;
    } catch {
      return true;
    }
  }

  // 清除所有通知
  clearAllNotifications(): void {
    const chatStore = useChatStore.getState();
    chatStore.clearNotifications();
    toast.dismiss();
  }

  // 标记通知为已读
  markNotificationAsRead(notificationId: string): void {
    const chatStore = useChatStore.getState();
    chatStore.markNotificationAsRead(notificationId);
  }

  // 获取未读通知数量
  getUnreadNotificationCount(): number {
    const chatStore = useChatStore.getState();
    return chatStore.notifications.filter(n => !n.isRead).length;
  }

  // 检查通知权限状态
  async checkPermission(): Promise<boolean> {
    try {
      this.permissionGranted = await isPermissionGranted();
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to check notification permission:', error);
      return false;
    }
  }

  // 请求通知权限
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;