/**
 * Node.js production entry point
 * Initializes database and storage, then starts HTTP server
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initializeNodeDb } from './shared/db';
import { initializeNodeStorage } from './shared/storage';
import { apiRoutes } from './module-todos/routes/todos-routes';
import { chatRoutes } from './module-chat/routes/chat-routes';
import { staffRoutes } from './module-staff/routes/staff-routes';

// Get project root directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const distDir = join(projectRoot, 'dist');
const uploadDir = join(projectRoot, 'data', 'uploads');
const port = parseInt(process.env.PORT || '3010', 10);

// Ensure data directories exist
if (!existsSync(join(projectRoot, 'data'))) {
  mkdirSync(join(projectRoot, 'data'), { recursive: true });
}

// Create Hono app for Node.js production
const app = new Hono();

// Static file serving for uploads
app.get('/uploads/:filename', (c) => {
  const filename = c.req.param('filename');
  const filepath = join(uploadDir, filename);
  if (!existsSync(filepath)) {
    return c.json({ error: 'File not found' }, 404);
  }
  return serveStatic({ root: uploadDir })(c, async () => c.json({ error: 'File not found' }, 404));
});

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  credentials: true,
}));

// API routes
app.route('/api', apiRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/staff', staffRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Static file serving for SPA (dist folder)
app.use('*', serveStatic({ root: distDir }));

// SPA fallback - serve index.html for non-API routes
app.notFound(async (c) => {
  const path = c.req.path;
  if (path.startsWith('/api/') || path.startsWith('/uploads/')) {
    return c.json({ success: false, error: 'Not found' }, 404);
  }
  const indexPath = join(distDir, 'index.html');
  if (existsSync(indexPath)) {
    return c.html(readFileSync(indexPath, 'utf-8'));
  }
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ success: false, error: err.message || 'Internal server error' }, 500);
});

// Initialize and start server
async function start(): Promise<void> {
  console.log('[Node] Initializing database...');
  await initializeNodeDb();
  console.log('[Node] Database initialized');

  console.log('[Node] Initializing storage at:', uploadDir);
  initializeNodeStorage(uploadDir);
  console.log('[Node] Storage initialized');

  console.log('[Node] Starting server...');
  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`\n🚀 Server running at http://localhost:${port}`);
  console.log(`   - User chat: http://localhost:${port}/chat`);
  console.log(`   - Staff panel: http://localhost:${port}/staff`);
  console.log(`   - Health check: http://localhost:${port}/health\n`);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
