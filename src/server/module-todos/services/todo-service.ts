/**
 * Todo service layer
 * Business logic for todo operations
 * Using Node.js native 'node:sqlite'
 */

import type { Todo, CreateTodoInput, UpdateTodoInput } from '@shared/types';
import { sqlite } from '../../shared/db';

/**
 * List all todos
 */
export async function listTodos(): Promise<Todo[]> {
  const stmt = sqlite.prepare('SELECT * FROM todos ORDER BY created_at DESC');
  const rows = stmt.all() as any[];
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Get a todo by ID
 */
export async function getTodo(id: number): Promise<Todo | null> {
  const stmt = sqlite.prepare('SELECT * FROM todos WHERE id = :id');
  const row = stmt.get({ id }) as any;

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Create a new todo
 */
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const now = Date.now();
  const stmt = sqlite.prepare(`
    INSERT INTO todos (title, description, status, created_at, updated_at)
    VALUES (:title, :description, :status, :created_at, :updated_at)
  `);

  stmt.run({
    title: input.title,
    description: input.description || null,
    status: 'pending',
    created_at: now,
    updated_at: now,
  });

  // Get the inserted todo
  const lastId = sqlite.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
  return getTodo(lastId.id) as Promise<Todo>;
}

/**
 * Update a todo
 */
export async function updateTodo(
  id: number,
  input: UpdateTodoInput
): Promise<Todo | null> {
  const now = Date.now();

  // Build update query dynamically
  const updates: string[] = [];
  const params: any = { id, updated_at: now };

  if (input.title !== undefined) {
    updates.push('title = :title');
    params.title = input.title;
  }
  if (input.description !== undefined) {
    updates.push('description = :description');
    params.description = input.description;
  }
  if (input.status !== undefined) {
    updates.push('status = :status');
    params.status = input.status;
  }

  if (updates.length === 0) return getTodo(id);

  updates.push('updated_at = :updated_at');

  const stmt = sqlite.prepare(`
    UPDATE todos
    SET ${updates.join(', ')}
    WHERE id = :id
  `);

  stmt.run(params);

  return getTodo(id);
}

/**
 * Delete a todo
 */
export async function deleteTodo(id: number): Promise<boolean> {
  const stmt = sqlite.prepare('DELETE FROM todos WHERE id = :id');
  const result = stmt.run({ id });
  return result.changes > 0;
}
