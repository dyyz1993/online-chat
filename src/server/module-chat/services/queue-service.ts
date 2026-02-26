/**
 * Queue Service - Handles queue position and wait time calculations
 */

import { sqlite } from '@server/shared/db';
import type { QueueInfo, QueueItem, TaskStatus } from '@shared/types';

// Average handling time in minutes (configurable)
const AVG_HANDLE_TIME_MINUTES = 5;

/**
 * Calculate queue position for a session
 * Position is based on creation time among sessions in discussion/confirmed status
 */
export async function calculateQueuePosition(sessionId: string): Promise<number> {
  const stmt = sqlite.prepare(`
    SELECT id, created_at
    FROM sessions
    WHERE status = 'active'
    AND task_status IN ('requirement_discussion', 'requirement_confirmed')
    ORDER BY created_at ASC
  `);

  const rows = stmt.all() as any[];
  const position = rows.findIndex((row) => row.id === sessionId) + 1;

  return position > 0 ? position : 0;
}

/**
 * Estimate wait time for a session (in minutes)
 * Based on queue position and average handling time
 */
export async function estimateWaitTime(sessionId: string): Promise<number> {
  const position = await calculateQueuePosition(sessionId);

  if (position <= 1) {
    return 0;
  }

  // Wait time = (position - 1) * average handle time
  return (position - 1) * AVG_HANDLE_TIME_MINUTES;
}

/**
 * Get queue info for a specific session
 */
export async function getQueueInfo(sessionId: string): Promise<QueueInfo> {
  const [position, estimatedWaitMinutes] = await Promise.all([
    calculateQueuePosition(sessionId),
    estimateWaitTime(sessionId),
  ]);

  // Get total in queue
  const stmt = sqlite.prepare(`
    SELECT COUNT(*) as count
    FROM sessions
    WHERE status = 'active'
    AND task_status IN ('requirement_discussion', 'requirement_confirmed')
  `);
  const row = stmt.get() as any;
  const totalInQueue = row?.count || 0;

  return {
    position,
    estimatedWaitMinutes,
    totalInQueue,
  };
}

/**
 * Get all items in the queue (for staff view)
 */
export async function getQueueList(): Promise<QueueItem[]> {
  const stmt = sqlite.prepare(`
    SELECT
      id as sessionId,
      visitor_name as visitorName,
      topic,
      task_status as taskStatus,
      created_at as createdAt
    FROM sessions
    WHERE status = 'active'
    AND task_status IN ('requirement_discussion', 'requirement_confirmed', 'in_progress')
    ORDER BY
      CASE task_status
        WHEN 'in_progress' THEN 1
        WHEN 'requirement_confirmed' THEN 2
        WHEN 'requirement_discussion' THEN 3
      END,
      created_at ASC
  `);

  const rows = stmt.all() as any[];

  // Calculate position and wait time for each
  let discussionPosition = 0;
  let confirmedPosition = 0;

  return rows.map((row, index) => {
    let position = index + 1;
    let waitMinutes = 0;

    if (row.taskStatus === 'requirement_discussion' || row.taskStatus === 'requirement_confirmed') {
      discussionPosition++;
      position = discussionPosition;
      waitMinutes = (position - 1) * AVG_HANDLE_TIME_MINUTES;
    } else if (row.taskStatus === 'in_progress') {
      position = 0; // Currently being handled
      waitMinutes = 0;
    }

    return {
      sessionId: row.sessionId,
      visitorName: row.visitorName,
      topic: row.topic || undefined,
      taskStatus: row.taskStatus as TaskStatus,
      position,
      waitMinutes,
      createdAt: new Date(row.createdAt),
    };
  });
}

/**
 * Update queue position and estimated wait time for a session
 */
export async function updateSessionQueueInfo(sessionId: string): Promise<void> {
  const position = await calculateQueuePosition(sessionId);
  const estimatedWaitMinutes = await estimateWaitTime(sessionId);

  const stmt = sqlite.prepare(`
    UPDATE sessions
    SET queue_position = ?, estimated_wait_minutes = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    position > 0 ? position : null,
    estimatedWaitMinutes > 0 ? estimatedWaitMinutes : null,
    Date.now(),
    sessionId
  );
}

/**
 * Recalculate queue info for all active sessions
 * Call this when a session status changes or a session is closed
 */
export async function recalculateAllQueueInfo(): Promise<void> {
  const stmt = sqlite.prepare(`
    SELECT id FROM sessions
    WHERE status = 'active'
    AND task_status IN ('requirement_discussion', 'requirement_confirmed')
  `);

  const rows = stmt.all() as any[];

  for (const row of rows) {
    await updateSessionQueueInfo(row.id);
  }
}
