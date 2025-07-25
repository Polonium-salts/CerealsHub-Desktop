import Database from '@tauri-apps/plugin-sql';
import { User, Message, Contact, AuthToken } from '../types';

class DatabaseService {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    try {
      // 检查是否在Tauri环境中
      if (typeof window !== 'undefined' && window.__TAURI__) {
        this.db = await Database.load('sqlite:cereals.db');
        console.log('Database initialized successfully');
      } else {
        console.log('Running in browser mode, skipping database initialization');
        // 在浏览器环境中，我们可以使用模拟的数据库或localStorage
        this.db = null;
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private ensureDb(): Database {
    if (!this.db) {
      // 在浏览器环境中，返回一个模拟的数据库对象
      if (typeof window !== 'undefined' && !window.__TAURI__) {
        console.warn('Database operations not available in browser mode');
        throw new Error('Database operations not available in browser mode');
      }
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // 用户相关操作
  async saveUser(user: User): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      `INSERT OR REPLACE INTO users (id, username, avatar_url, status, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, user.username, user.avatar_url, user.status, user.created_at]
    );
  }

  async getUser(id: number): Promise<User | null> {
    const db = this.ensureDb();
    const result = await db.select<User[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return result.length > 0 ? result[0] : null;
  }

  async getAllUsers(): Promise<User[]> {
    const db = this.ensureDb();
    return await db.select<User[]>('SELECT * FROM users ORDER BY username');
  }

  async updateUserStatus(id: number, status: string): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );
  }

  // 消息相关操作
  async saveMessage(message: Message): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      `INSERT OR REPLACE INTO messages 
       (id, sender_id, receiver_id, content, message_type, timestamp, is_read) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.sender_id,
        message.receiver_id,
        message.content,
        message.message_type,
        message.timestamp,
        message.is_read
      ]
    );
  }

  async getMessages(userId: number, contactId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const db = this.ensureDb();
    return await db.select<Message[]>(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [userId, contactId, contactId, userId, limit, offset]
    );
  }

  async getLatestMessage(userId: number, contactId: number): Promise<Message | null> {
    const db = this.ensureDb();
    const result = await db.select<Message[]>(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [userId, contactId, contactId, userId]
    );
    return result.length > 0 ? result[0] : null;
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      'UPDATE messages SET is_read = TRUE WHERE id = ?',
      [messageId]
    );
  }

  async markAllMessagesAsRead(userId: number, contactId: number): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      'UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ?',
      [contactId, userId]
    );
  }

  async getUnreadMessageCount(userId: number, contactId: number): Promise<number> {
    const db = this.ensureDb();
    const result = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
      [contactId, userId]
    );
    return result[0]?.count || 0;
  }

  async getTotalUnreadCount(userId: number): Promise<number> {
    const db = this.ensureDb();
    const result = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
      [userId]
    );
    return result[0]?.count || 0;
  }

  // 联系人相关操作
  async saveContact(contact: Contact): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      'INSERT OR REPLACE INTO contacts (user_id, contact_id, added_at) VALUES (?, ?, ?)',
      [contact.user_id, contact.contact_id, contact.added_at]
    );
  }

  async getContacts(userId: number): Promise<Contact[]> {
    const db = this.ensureDb();
    return await db.select<Contact[]>(
      `SELECT c.*, u.username, u.avatar_url, u.status, u.created_at
       FROM contacts c
       JOIN users u ON c.contact_id = u.id
       WHERE c.user_id = ?
       ORDER BY u.username`,
      [userId]
    );
  }

  async removeContact(userId: number, contactId: number): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      'DELETE FROM contacts WHERE user_id = ? AND contact_id = ?',
      [userId, contactId]
    );
  }

  async isContact(userId: number, contactId: number): Promise<boolean> {
    const db = this.ensureDb();
    const result = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM contacts WHERE user_id = ? AND contact_id = ?',
      [userId, contactId]
    );
    return (result[0]?.count || 0) > 0;
  }

  // 认证令牌相关操作
  async saveAuthToken(token: AuthToken): Promise<void> {
    const db = this.ensureDb();
    // 先删除旧的token
    await db.execute('DELETE FROM auth_tokens WHERE user_id = ?', [token.user_id]);
    
    // 插入新token
    await db.execute(
      `INSERT INTO auth_tokens (user_id, access_token, refresh_token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [token.user_id, token.access_token, token.refresh_token, token.expires_at, token.created_at]
    );
  }

  async getAuthToken(userId: number): Promise<AuthToken | null> {
    const db = this.ensureDb();
    const result = await db.select<AuthToken[]>(
      'SELECT * FROM auth_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return result.length > 0 ? result[0] : null;
  }

  async removeAuthToken(userId: number): Promise<void> {
    const db = this.ensureDb();
    await db.execute('DELETE FROM auth_tokens WHERE user_id = ?', [userId]);
  }

  // 搜索功能
  async searchUsers(query: string): Promise<User[]> {
    const db = this.ensureDb();
    return await db.select<User[]>(
      'SELECT * FROM users WHERE username LIKE ? ORDER BY username LIMIT 20',
      [`%${query}%`]
    );
  }

  async searchMessages(userId: number, contactId: number, query: string): Promise<Message[]> {
    const db = this.ensureDb();
    return await db.select<Message[]>(
      `SELECT * FROM messages 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       AND content LIKE ?
       ORDER BY timestamp DESC 
       LIMIT 50`,
      [userId, contactId, contactId, userId, `%${query}%`]
    );
  }

  // 数据清理
  async clearOldMessages(daysOld: number = 30): Promise<void> {
    const db = this.ensureDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    await db.execute(
      'DELETE FROM messages WHERE timestamp < ?',
      [cutoffDate.toISOString()]
    );
  }

  async clearAllData(): Promise<void> {
    const db = this.ensureDb();
    await db.execute('DELETE FROM messages');
    await db.execute('DELETE FROM contacts');
    await db.execute('DELETE FROM users');
    await db.execute('DELETE FROM auth_tokens');
  }

  // 数据库统计
  async getStats(): Promise<{
    userCount: number;
    messageCount: number;
    contactCount: number;
  }> {
    const db = this.ensureDb();
    
    const [userResult, messageResult, contactResult] = await Promise.all([
      db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM users'),
      db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM messages'),
      db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM contacts')
    ]);

    return {
      userCount: userResult[0]?.count || 0,
      messageCount: messageResult[0]?.count || 0,
      contactCount: contactResult[0]?.count || 0
    };
  }
}

export const databaseService = new DatabaseService();
export default databaseService;