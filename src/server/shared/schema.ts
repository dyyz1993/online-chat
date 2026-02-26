/**
 * Drizzle database schema for Todo and Chat application
 */

import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ==========================================
// TODO TABLES
// ==========================================

export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type TodoTable = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

// ==========================================
// CHAT TABLES
// ==========================================

// Sessions table - visitor chat sessions
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // UUID v4
  visitorName: text('visitor_name').notNull(),
  status: text('status').notNull().default('active'), // active/closed
  lastMessageAt: integer('last_message_at', { mode: 'timestamp' }),
  unreadByVisitor: integer('unread_by_visitor').default(0), // unread messages from staff
  unreadByStaff: integer('unread_by_staff').default(0), // unread messages from visitor
  // 新增字段：主题和任务进度
  topic: text('topic'), // 会话主题
  taskStatus: text('task_status').notNull().default('requirement_discussion'), // 任务状态
  taskStatusUpdatedAt: integer('task_status_updated_at', { mode: 'timestamp' }),
  // 排队相关
  queuePosition: integer('queue_position'), // 排队位置
  estimatedWaitMinutes: integer('estimated_wait_minutes'), // 预计等待分钟
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Messages table - chat messages
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  senderType: text('sender_type').notNull(), // visitor/staff
  contentType: text('content_type').notNull(), // text/image/video
  content: text('content').notNull(), // text content or file path
  thumbnailUrl: text('thumbnail_url'), // video/image thumbnail
  fileName: text('file_name'), // original file name
  fileSize: integer('file_size'), // file size in bytes
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type SessionTable = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type MessageTable = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
