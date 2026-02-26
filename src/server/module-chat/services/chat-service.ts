/**
 * Chat service - handles sessions and messages
 */

import { randomUUID } from 'node:crypto';
import { sqlite } from '@server/shared/db';
import type {
  Session,
  Message,
  CreateSessionInput,
  SendMessageInput,
  SenderType,
  TaskStatus,
} from '@shared/types';

// ==========================================
// Session Services
// ==========================================

/**
 * Generate a random visitor name
 */
function generateVisitorName(): string {
  const adjectives = ['Happy', 'Clever', 'Swift', 'Bright', 'Calm', 'Eager', 'Gentle', 'Kind'];
  const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Fox', 'Owl', 'Bear', 'Wolf'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

/**
 * Create a new session or get existing one
 */
export async function createOrGetSession(input: CreateSessionInput = {}): Promise<Session> {
  // If sessionId provided, try to get existing session
  if (input.sessionId) {
    const existing = await getSession(input.sessionId);
    if (existing) {
      return existing;
    }
  }

  // Create new session
  const sessionId = input.sessionId || randomUUID();
  const visitorName = input.visitorName || generateVisitorName();
  const now = Date.now();

  const stmt = sqlite.prepare(`
    INSERT INTO sessions (id, visitor_name, status, task_status, created_at, updated_at)
    VALUES (?, ?, 'active', 'requirement_discussion', ?, ?)
  `);

  stmt.run(sessionId, visitorName, now, now);

  // 使用 getSession 获取完整的 session 信息（包括所有新字段）
  const session = await getSession(sessionId);
  if (!session) {
    // 不应该发生，但作为保险
    return {
      id: sessionId,
      visitorName,
      status: 'active',
      taskStatus: 'requirement_discussion',
      unreadByVisitor: 0,
      unreadByStaff: 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  return session;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const stmt = sqlite.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `);
  const row = stmt.get(sessionId) as any;

  if (!row) {
    return null;
  }

  return mapRowToSession(row);
}

/**
 * List all sessions
 */
export async function listSessions(status?: 'active' | 'closed'): Promise<Session[]> {
  let sql = 'SELECT * FROM sessions';
  const params: string[] = [];

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY last_message_at DESC NULLS LAST, created_at DESC';

  const stmt = sqlite.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map(mapRowToSession);
}

/**
 * Update session's last message time
 */
export async function updateSessionLastMessage(sessionId: string): Promise<void> {
  const now = Date.now();
  const stmt = sqlite.prepare(`
    UPDATE sessions
    SET last_message_at = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(now, now, sessionId);
}

// ==========================================
// Message Services
// ==========================================

/**
 * Send a message
 */
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const now = Date.now();

  const stmt = sqlite.prepare(`
    INSERT INTO messages (session_id, sender_type, content_type, content, thumbnail_url, file_name, file_size, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  const result = stmt.run(
    input.sessionId,
    input.senderType,
    input.contentType,
    input.content,
    input.thumbnailUrl || null,
    input.fileName || null,
    input.fileSize || null,
    now
  );

  // Update session
  await updateSessionLastMessage(input.sessionId);

  // Increment unread counter
  if (input.senderType === 'visitor') {
    const updateStmt = sqlite.prepare(`
      UPDATE sessions SET unread_by_staff = unread_by_staff + 1, updated_at = ? WHERE id = ?
    `);
    updateStmt.run(now, input.sessionId);
  } else {
    const updateStmt = sqlite.prepare(`
      UPDATE sessions SET unread_by_visitor = unread_by_visitor + 1, updated_at = ? WHERE id = ?
    `);
    updateStmt.run(now, input.sessionId);
  }

  return {
    id: result.lastInsertRowid as number,
    sessionId: input.sessionId,
    senderType: input.senderType,
    contentType: input.contentType,
    content: input.content,
    thumbnailUrl: input.thumbnailUrl,
    fileName: input.fileName,
    fileSize: input.fileSize,
    isRead: false,
    createdAt: new Date(now),
  };
}

/**
 * Get messages for a session with pagination
 */
export async function getMessages(
  sessionId: string,
  before?: number,
  limit: number = 20
): Promise<{ messages: Message[]; hasMore: boolean }> {
  let sql = 'SELECT * FROM messages WHERE session_id = ?';
  const params: (string | number)[] = [sessionId];

  if (before) {
    sql += ' AND id < ?';
    params.push(before);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit + 1); // Fetch one extra to check hasMore

  const stmt = sqlite.prepare(sql);
  const rows = stmt.all(...params) as any[];

  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).map(mapRowToMessage).reverse();

  return { messages, hasMore };
}

/**
 * Mark messages as read
 */
export async function markAsRead(sessionId: string, readerType: SenderType): Promise<void> {
  const now = Date.now();

  // Mark messages from the other party as read
  const senderType = readerType === 'visitor' ? 'staff' : 'visitor';

  const updateMessagesStmt = sqlite.prepare(`
    UPDATE messages
    SET is_read = 1
    WHERE session_id = ? AND sender_type = ? AND is_read = 0
  `);
  updateMessagesStmt.run(sessionId, senderType);

  // Reset unread counter
  const counterField = readerType === 'visitor' ? 'unread_by_visitor' : 'unread_by_staff';
  const updateSessionStmt = sqlite.prepare(`
    UPDATE sessions SET ${counterField} = 0, updated_at = ? WHERE id = ?
  `);
  updateSessionStmt.run(now, sessionId);
}

// ==========================================
// Helpers
// ==========================================

function mapRowToSession(row: any): Session {
  return {
    id: row.id,
    visitorName: row.visitor_name,
    status: row.status,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
    unreadByVisitor: row.unread_by_visitor || 0,
    unreadByStaff: row.unread_by_staff || 0,
    topic: row.topic || undefined,
    taskStatus: (row.task_status as TaskStatus) || 'requirement_discussion',
    taskStatusUpdatedAt: row.task_status_updated_at ? new Date(row.task_status_updated_at) : undefined,
    queuePosition: row.queue_position || undefined,
    estimatedWaitMinutes: row.estimated_wait_minutes || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderType: row.sender_type,
    contentType: row.content_type,
    content: row.content,
    thumbnailUrl: row.thumbnail_url || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size || undefined,
    isRead: Boolean(row.is_read),
    createdAt: new Date(row.created_at),
  };
}
