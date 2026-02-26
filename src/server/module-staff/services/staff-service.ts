/**
 * Staff service - handles staff-specific operations
 * Re-exports chat service functions and adds staff-specific helpers
 */

export {
  getSession,
  listSessions,
  getMessages,
  sendMessage,
  markAsRead,
} from '@server/module-chat/services/chat-service';

import { getSession as getSessionBase, listSessions as listSessionsBase } from '@server/module-chat/services/chat-service';
import type { Session, SessionStatus, TaskStatus } from '@shared/types';

/**
 * Update session topic
 */
export async function updateSessionTopic(sessionId: string, topic: string): Promise<Session | null> {
  const { sqlite } = await import('@server/shared/db');
  const now = Date.now();

  const stmt = sqlite.prepare(`
    UPDATE sessions SET topic = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(topic, now, sessionId);

  return getSessionBase(sessionId);
}

/**
 * Update session task status
 */
export async function updateTaskStatus(sessionId: string, taskStatus: TaskStatus): Promise<Session | null> {
  const { sqlite } = await import('@server/shared/db');
  const now = Date.now();

  const stmt = sqlite.prepare(`
    UPDATE sessions SET task_status = ?, task_status_updated_at = ?, updated_at = ? WHERE id = ?
  `);
  stmt.run(taskStatus, now, now, sessionId);

  return getSessionBase(sessionId);
}

/**
 * Get session with message preview
 */
export async function getSessionWithPreview(sessionId: string): Promise<{
  session: Session | null;
  lastMessage?: {
    content: string;
    contentType: string;
    createdAt: Date;
  };
}> {
  const session = await getSessionBase(sessionId);
  if (!session) {
    return { session: null };
  }

  // Get last message
  const { sqlite } = await import('@server/shared/db');
  const stmt = sqlite.prepare(`
    SELECT content, content_type, created_at
    FROM messages
    WHERE session_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const row = stmt.get(sessionId) as any;

  if (row) {
    return {
      session,
      lastMessage: {
        content: row.content,
        contentType: row.content_type,
        createdAt: new Date(row.created_at),
      },
    };
  }

  return { session };
}

/**
 * List sessions with last message preview
 */
export async function listSessionsWithPreview(status?: SessionStatus): Promise<
  (Session & {
    lastMessage?: {
      content: string;
      contentType: string;
      createdAt: Date;
    };
  })[]
> {
  const sessions = await listSessionsBase(status);

  if (sessions.length === 0) {
    return [];
  }

  // Get last messages for all sessions
  const { sqlite } = await import('@server/shared/db');
  const sessionIds = sessions.map((s) => s.id);
  const placeholders = sessionIds.map(() => '?').join(',');

  const stmt = sqlite.prepare(`
    SELECT session_id, content, content_type, created_at
    FROM messages
    WHERE session_id IN (${placeholders})
    AND id IN (
      SELECT MAX(id) FROM messages WHERE session_id IN (${placeholders}) GROUP BY session_id
    )
  `);

  const rows = stmt.all(...sessionIds, ...sessionIds) as any[];

  const lastMessages = new Map<
    string,
    { content: string; contentType: string; createdAt: Date }
  >();

  for (const row of rows) {
    lastMessages.set(row.session_id, {
      content: row.content,
      contentType: row.content_type,
      createdAt: new Date(row.created_at),
    });
  }

  return sessions.map((session) => ({
    ...session,
    lastMessage: lastMessages.get(session.id),
  }));
}

/**
 * Get total unread count across all sessions
 */
export async function getTotalUnreadCount(): Promise<number> {
  const { sqlite } = await import('@server/shared/db');
  const stmt = sqlite.prepare(`
    SELECT SUM(unread_by_staff) as total FROM sessions WHERE status = 'active'
  `);
  const row = stmt.get() as any;
  return row?.total || 0;
}
