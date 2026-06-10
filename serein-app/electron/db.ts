import Database from 'better-sqlite3';

let db: Database.Database;

export interface TodoRow {
  id: number;
  text: string;
  dueAt: number | null;
  done: 0 | 1;
  alerted: 0 | 1;
  createdAt: number;
}

export function initDB(file: string) {
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      dueAt INTEGER,
      done INTEGER NOT NULL DEFAULT 0,
      alerted INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
  `);
  // 单条笔记记录
  const row = db.prepare('SELECT id FROM notes WHERE id = 1').get();
  if (!row) {
    db.prepare('INSERT INTO notes (id, content, updatedAt) VALUES (1, ?, ?)').run('', Date.now());
  }
}

export function getNote(): string {
  const row = db.prepare('SELECT content FROM notes WHERE id = 1').get() as { content: string } | undefined;
  return row?.content ?? '';
}

export function upsertNote(content: string) {
  db.prepare('UPDATE notes SET content = ?, updatedAt = ? WHERE id = 1').run(content, Date.now());
}

export function listTodos(): TodoRow[] {
  return db.prepare('SELECT * FROM todos ORDER BY done ASC, COALESCE(dueAt, 9e15) ASC, id DESC').all() as TodoRow[];
}

export function addTodo(text: string, dueAt: number | null): TodoRow {
  const info = db.prepare('INSERT INTO todos (text, dueAt, done, alerted, createdAt) VALUES (?, ?, 0, 0, ?)').run(text, dueAt, Date.now());
  return db.prepare('SELECT * FROM todos WHERE id = ?').get(info.lastInsertRowid) as TodoRow;
}

export function updateTodo(id: number, patch: Partial<Pick<TodoRow, 'text' | 'dueAt' | 'done' | 'alerted'>>) {
  const fields: string[] = [];
  const values: any[] = [];
  for (const k of ['text', 'dueAt', 'done', 'alerted'] as const) {
    if (patch[k] !== undefined) { fields.push(`${k} = ?`); values.push(patch[k]); }
  }
  if (!fields.length) return;
  values.push(id);
  db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteTodo(id: number) {
  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
}

export function allUpcomingTodos(): TodoRow[] {
  return db.prepare('SELECT * FROM todos WHERE done = 0 AND dueAt IS NOT NULL').all() as TodoRow[];
}

export function markTodoAlerted(id: number) {
  db.prepare('UPDATE todos SET alerted = 1 WHERE id = ?').run(id);
}
