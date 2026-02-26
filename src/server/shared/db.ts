/**
 * Database connection and initialization
 * Using Node.js native 'node:sqlite' module (requires Node.js v20.12.0+)
 */

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Ensure data directory exists
const dbDir = dirname('./data/todos.db');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Ensure uploads directory exists
if (!existsSync('./data/uploads')) {
  mkdirSync('./data/uploads', { recursive: true });
}

// Create SQLite connection using Node.js native module
const sqlite = new DatabaseSync('./data/todos.db');

// Enable foreign keys
sqlite.exec('PRAGMA foreign_keys = ON');

// Export the database instance for use with services
export { sqlite };

/**
 * Initialize database schema
 */
export async function initializeDb() {
  // Create todos table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  // Create sessions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      visitor_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      last_message_at INTEGER,
      unread_by_visitor INTEGER DEFAULT 0,
      unread_by_staff INTEGER DEFAULT 0,
      topic TEXT,
      task_status TEXT NOT NULL DEFAULT 'requirement_discussion',
      task_status_updated_at INTEGER,
      queue_position INTEGER,
      estimated_wait_minutes INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  // Migration: Add new columns to existing sessions table
  try {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN topic TEXT`);
  } catch {
    /* Column already exists */
  }
  try {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN task_status TEXT NOT NULL DEFAULT 'requirement_discussion'`);
  } catch {
    /* Column already exists */
  }
  try {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN task_status_updated_at INTEGER`);
  } catch {
    /* Column already exists */
  }
  try {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN queue_position INTEGER`);
  } catch {
    /* Column already exists */
  }
  try {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN estimated_wait_minutes INTEGER`);
  } catch {
    /* Column already exists */
  }

  // Create messages table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content TEXT NOT NULL,
      thumbnail_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for messages table
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS messages_session_id_idx ON messages(session_id)
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at)
  `);
}

// Initialize on import
initializeDb().catch(console.error);
