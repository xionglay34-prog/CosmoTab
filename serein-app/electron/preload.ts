import { contextBridge, ipcRenderer } from 'electron';

const api = {
  hideCard: () => ipcRenderer.invoke('card:hide'),
  resizeCard: (w: number, h: number) => ipcRenderer.invoke('card:resize', w, h),

  getNote: () => ipcRenderer.invoke('note:get'),
  saveNote: (content: string) => ipcRenderer.invoke('note:save', content),

  listTodos: () => ipcRenderer.invoke('todo:list'),
  addTodo: (text: string, dueAt: number | null) => ipcRenderer.invoke('todo:add', { text, dueAt }),
  updateTodo: (id: number, patch: any) => ipcRenderer.invoke('todo:update', id, patch),
  deleteTodo: (id: number) => ipcRenderer.invoke('todo:delete', id),

  saveImageFromDataURL: (dataUrl: string) => ipcRenderer.invoke('image:saveFromDataURL', dataUrl),

  testOverlay: (text: string) => ipcRenderer.invoke('overlay:test', text),
  dismissOverlay: () => ipcRenderer.invoke('overlay:dismiss'),

  onOverlayTrigger: (cb: (data: { text: string; dueAt: number | null; ts: number }) => void) => {
    const listener = (_: unknown, data: any) => cb(data);
    ipcRenderer.on('overlay:trigger', listener);
    return () => ipcRenderer.removeListener('overlay:trigger', listener);
  }
};

contextBridge.exposeInMainWorld('serein', api);

export type SereinApi = typeof api;
