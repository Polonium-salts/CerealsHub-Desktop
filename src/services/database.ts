import Database from '@tauri-apps/plugin-sql';
import { User, Message, Contact, AuthToken, Group, GroupMember, GroupContact } from '../types';

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
    await db.execute('DELETE FROM groups');
    await db.execute('DELETE FROM group_members');
    await db.execute('DELETE FROM group_contacts');
    await db.execute('DELETE FROM group_messages');
  }

  // 群聊相关操作
  async saveGroup(group: Group): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      `INSERT OR REPLACE INTO groups (id, name, description, avatar_url, member_count, created_by, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [group.id, group.name, group.description, group.avatar_url, group.member_count, group.created_by, group.created_at]
    );
  }

  async getGroup(id: string): Promise<Group | null> {
    const db = this.ensureDb();
    const result = await db.select<Group[]>(
      'SELECT * FROM groups WHERE id = ?',
      [id]
    );
    return result.length > 0 ? result[0] : null;
  }

  async getAllGroups(): Promise<Group[]> {
    const db = this.ensureDb();
    return await db.select<Group[]>('SELECT * FROM groups ORDER BY name');
  }

  async saveGroupMember(member: GroupMember): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      `INSERT OR REPLACE INTO group_members (group_id, user_id, role, joined_at) 
       VALUES (?, ?, ?, ?)`,
      [member.group_id, member.user_id, member.role, member.joined_at]
    );
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const db = this.ensureDb();
    return await db.select<GroupMember[]>(
      `SELECT gm.*, u.username, u.avatar_url, u.status
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at`,
      [groupId]
    );
  }

  async removeGroupMember(groupId: string, userId: number): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
  }

  async isGroupMember(groupId: string, userId: number): Promise<boolean> {
    const db = this.ensureDb();
    const result = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    return (result[0]?.count || 0) > 0;
  }

  async saveGroupContact(contact: GroupContact): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      'INSERT OR REPLACE INTO group_contacts (user_id, group_id, joined_at) VALUES (?, ?, ?)',
      [contact.user_id, contact.group_id, contact.joined_at]
    );
  }

  async getGroupContacts(userId: number): Promise<GroupContact[]> {
    const db = this.ensureDb();
    return await db.select<GroupContact[]>(
      `SELECT gc.*, g.name, g.description, g.avatar_url, g.member_count, g.created_by, g.created_at
       FROM group_contacts gc
       JOIN groups g ON gc.group_id = g.id
       WHERE gc.user_id = ?
       ORDER BY g.name`,
      [userId]
    );
  }

  async removeGroupContact(userId: number, groupId: string): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      'DELETE FROM group_contacts WHERE user_id = ? AND group_id = ?',
      [userId, groupId]
    );
  }

  async saveGroupMessage(message: Message): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      `INSERT OR REPLACE INTO group_messages 
       (id, sender_id, group_id, content, message_type, timestamp, is_read) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.sender_id,
        message.receiver_id, // 在群聊中，receiver_id 存储群聊ID
        message.content,
        message.message_type,
        message.timestamp,
        message.is_read
      ]
    );
  }

  async getGroupMessages(groupId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const db = this.ensureDb();
    return await db.select<Message[]>(
      `SELECT * FROM group_messages 
       WHERE group_id = ?
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [groupId, limit, offset]
    );
  }

  async getLatestGroupMessage(groupId: string): Promise<Message | null> {
    const db = this.ensureDb();
    const result = await db.select<Message[]>(
      `SELECT * FROM group_messages 
       WHERE group_id = ?
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [groupId]
    );
    return result.length > 0 ? result[0] : null;
  }

  // 数据库统计
  async getStats(): Promise<{
    userCount: number;
    messageCount: number;
    contactCount: number;
    groupCount: number;
    groupMessageCount: number;
  }> {
    const db = this.ensureDb();
    
    const [userResult, messageResult, contactResult, groupResult, groupMessageResult] = await Promise.all([
      db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM users'),
      db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM messages'),
      db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM contacts'),
      db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM groups'),
      db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM group_messages')
    ]);

    return {
      userCount: userResult[0]?.count || 0,
      messageCount: messageResult[0]?.count || 0,
      contactCount: contactResult[0]?.count || 0,
      groupCount: groupResult[0]?.count || 0,
      groupMessageCount: groupMessageResult[0]?.count || 0
    };
  }
}

export const databaseService = new DatabaseService();
export default databaseService;