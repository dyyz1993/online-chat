/**
 * Node.js development entry point
 * Initializes database and storage before starting server
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeNodeDb } from './shared/db';
import { initializeNodeStorage } from './shared/storage';

// Get project root directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = (__dirname.includes('/src/server'))
  ? __dirname.replace(/\/src\/server.*$/, '')
  : __dirname;

// Initialize database and storage
async function initialize(): Promise<void> {
  const uploadDir = `${projectRoot}/data/uploads`;
  console.log('[Node] Initializing database...');
  await initializeNodeDb();
  console.log('[Node] Database initialized');

  console.log('[Node] Initializing storage at:', uploadDir);
  initializeNodeStorage(uploadDir);
  console.log('[Node] Storage initialized');
}

// Initialize immediately
initialize().catch(console.error);

// Re-export the main app
export { default } from './index';
export type { AppType } from './index';
