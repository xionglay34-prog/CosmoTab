export interface SereinApi {
  hideCard: () => Promise<void>;
  resizeCard: (w: number, h: number) => Promise<void>;
  getNote: () => Promise<string>;
  saveNote: (content: string) => Promise<void>;
  listTodos: () => Promise<TodoRow[]>;
  addTodo: (text: string, dueAt: number | null) => Promise<TodoRow>;
  updateTodo: (id: number, patch: Partial<TodoRow>) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  saveImageFromDataURL: (dataUrl: string) => Promise<string>;
  testOverlay: (text: string) => Promise<void>;
  dismissOverlay: () => Promise<void>;
  onOverlayTrigger: (cb: (data: { text: string; ts: number }) => void) => () => void;
}

export interface TodoRow {
  id: number;
  text: string;
  dueAt: number | null;
  done: 0 | 1;
  alerted: 0 | 1;
  createdAt: number;
}

declare global {
  interface Window {
    serein: SereinApi;
  }
}

export {};
