import { useEffect, useMemo, useRef, useState } from 'react';
import type { TodoRow } from '../shared/api';
import { parseChineseDateTime } from '../shared/parseTime';

type Tab = 'note' | 'todo';

/** 把旧 Markdown 文本（迁移）或纯文本转成 contentEditable 友好的 HTML */
function legacyToHtml(src: string): string {
  if (!src) return '';
  // 看上去已经是 HTML 就直接返回
  if (/<\w+[^>]*>/.test(src)) return src;
  // 处理 Markdown 图片 ![alt](url) → <img>
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = src.split('\n');
  const blocks = lines.map((line) => {
    const m = /^!\[[^\]]*\]\(([^)]+)\)\s*$/.exec(line.trim());
    if (m) return `<p><img src="${m[1]}" alt="" /></p>`;
    if (line.trim() === '') return '<p><br /></p>';
    return `<p>${escapeHtml(line)}</p>`;
  });
  return blocks.join('');
}

export function Card() {
  const [tab, setTab] = useState<Tab>('note');
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [todoInput, setTodoInput] = useState('');
  const noteRef = useRef<HTMLDivElement>(null);
  const todoRef = useRef<HTMLInputElement>(null);
  const noteHtmlRef = useRef<string>('');
  const initializedRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const parsed = useMemo(() => {
    if (!todoInput.trim()) return null;
    return parseChineseDateTime(todoInput);
  }, [todoInput]);

  // 首次加载笔记 → 注入 HTML
  useEffect(() => {
    window.serein.getNote().then((raw) => {
      noteHtmlRef.current = raw || '';
      if (noteRef.current) {
        noteRef.current.innerHTML = legacyToHtml(raw || '');
      }
      initializedRef.current = true;
    });
    window.serein.listTodos().then(setTodos);
  }, []);

  // 自动聚焦
  useEffect(() => {
    setTimeout(() => {
      if (tab === 'note') noteRef.current?.focus();
      else if (tab === 'todo') todoRef.current?.focus();
    }, 30);
  }, [tab]);

  // Esc 隐藏
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        window.serein.hideCard();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // debounce 保存（直接保存 HTML 字符串）
  const scheduleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      window.serein.saveNote(noteHtmlRef.current);
    }, 400);
  };

  const onNoteInput = () => {
    if (!noteRef.current) return;
    if (!initializedRef.current) return; // 初始注入 innerHTML 时不触发保存
    noteHtmlRef.current = noteRef.current.innerHTML;
    scheduleSave();
  };

  /**
   * 笔记键盘交互：
   *   - Tab / Shift+Tab：在列表中执行 indent / outdent；普通段落则插入 2 个空格
   *   - Enter：在 li 中如果当前 li 为空，则跳出列表；其它由浏览器原生处理（li 会自动新增并自动编号）
   *   - 行首 Markdown 快捷：
   *       "1. " 转有序列表 <ol>
   *       "- " / "* " 转无序列表 <ul>
   *       "[] " / "[ ] " 转无序列表（轻量待办风格）
   */
  const onNoteKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Tab：列表缩进 / outdent；非列表则插入空格
    if (e.key === 'Tab') {
      e.preventDefault();
      if (isCaretInList()) {
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
      } else {
        document.execCommand('insertText', false, '  ');
      }
      onNoteInput();
      return;
    }

    // Enter：空 li 跳出列表
    if (e.key === 'Enter' && !e.shiftKey) {
      const li = getCurrentLi();
      if (li && isLiEmpty(li)) {
        e.preventDefault();
        // outdent 一次：嵌套列表会上浮一级；最外层会变回普通段落
        document.execCommand('outdent');
        onNoteInput();
        return;
      }
    }

    // 空格触发 Markdown 行首快捷（仅在该行还没生成列表时）
    if (e.key === ' ') {
      const tok = getLineLeadingToken();
      if (!tok) return;
      if (isCaretInList()) return;
      // 1. / 1) → 有序列表
      if (/^\d+[.)]$/.test(tok)) {
        e.preventDefault();
        replaceCurrentLineLeading(tok.length);
        document.execCommand('insertOrderedList');
        onNoteInput();
        return;
      }
      // - / * → 无序列表
      if (tok === '-' || tok === '*') {
        e.preventDefault();
        replaceCurrentLineLeading(tok.length);
        document.execCommand('insertUnorderedList');
        onNoteInput();
        return;
      }
      // [] / [ ] → 无序列表
      if (tok === '[]' || tok === '[' /* 兼容 [ ] 中间空格情况由 getLineLeadingToken 取首段判断 */) {
        e.preventDefault();
        replaceCurrentLineLeading(tok.length);
        document.execCommand('insertUnorderedList');
        onNoteInput();
        return;
      }
    }
  };

  // 粘贴：图片直接以 dataURL 内联（最稳，不受跨协议限制）；后台异步落盘做备份
  const onPaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const it of Array.from(items)) {
      if (it.type.startsWith('image/')) {
        e.preventDefault();
        const file = it.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          // 直接用 dataURL，确保渲染立即可见
          insertHtmlAtCaret(`<img src="${dataUrl}" alt="" />`);
          onNoteInput();
          // 后台异步落盘做备份（不阻塞渲染、不替换 src）
          window.serein.saveImageFromDataURL(dataUrl).catch(() => {});
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // 纯文本：阻止默认（避免带样式 HTML 入侵），手动插入 textContent
    const text = e.clipboardData?.getData('text/plain');
    if (text != null) {
      e.preventDefault();
      insertHtmlAtCaret(escapeAndBreak(text));
      onNoteInput();
    }
  };

  const submitTodo = async () => {
    const raw = todoInput.trim();
    if (!raw) return;
    const p = parseChineseDateTime(raw);
    const text = p ? p.cleanText || raw : raw;
    const dueAt = p ? p.date.getTime() : null;
    const row = await window.serein.addTodo(text, dueAt);
    setTodos((prev) => [row, ...prev]);
    setTodoInput('');
  };

  const toggleTodo = async (t: TodoRow) => {
    const next = t.done ? 0 : 1;
    await window.serein.updateTodo(t.id, { done: next as 0 | 1 });
    setTodos((prev) => prev.map((x) => x.id === t.id ? { ...x, done: next as 0 | 1 } : x));
  };

  const removeTodo = async (id: number) => {
    await window.serein.deleteTodo(id);
    setTodos((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="card-shell">
      <div className="titlebar">
        <div className="tab-row">
          <button className={tab === 'note' ? 'active' : ''} onClick={() => setTab('note')}>笔记</button>
          <button className={tab === 'todo' ? 'active' : ''} onClick={() => setTab('todo')}>Todo</button>
        </div>
        <span className="hint">Esc 收起</span>
      </div>

      <div className="body">
        <div
          ref={noteRef}
          className="note-rich"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={onNoteInput}
          onKeyDown={onNoteKeyDown}
          onPaste={onPaste}
          data-placeholder="随便记点什么…  Ctrl+V 粘贴图片  ·  1. / - / [] + 空格 转列表  ·  Tab 缩进"
          style={{ display: tab === 'note' ? 'block' : 'none' }}
        />
        <div className="todo-pane" style={{ display: tab === 'todo' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <div className="todo-input">
            <input
              ref={todoRef}
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitTodo(); } }}
              placeholder="例如：明天下午3点 开会"
              spellCheck={false}
            />
            {parsed && (
              <span className="preview" title={parsed.matchedText}>⏰ {formatDate(parsed.date)}</span>
            )}
          </div>
          <ul className="todo-list">
            {todos.length === 0 && (
              <li style={{ opacity: 0.6, justifyContent: 'center' }}>
                <span className="text">还没有待办，键入一条试试 ✨</span>
              </li>
            )}
            {todos.map((t) => (
              <li key={t.id} className={t.done ? 'done' : ''}>
                <span className="checkbox" onClick={() => toggleTodo(t)} />
                <div style={{ flex: 1 }}>
                  <div className="text">{t.text}</div>
                  {t.dueAt && (
                    <div className={`due ${isUrgent(t.dueAt, t.done) ? 'warn' : ''}`}>
                      {formatDate(new Date(t.dueAt))} · {humanRemain(t.dueAt)}
                    </div>
                  )}
                </div>
                <button className="delete" onClick={() => removeTodo(t.id)} title="删除">×</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="toolbar">
        <div className="left">
          <span className="brand">FLASH NOTE</span>
          <span className="kbd-hint">Option/Alt + Space 唤起</span>
        </div>
        <div className="right">
          <button onClick={() => window.serein.testOverlay('测试一下，别摸鱼')}>测试催命符</button>
          <button onClick={() => window.serein.hideCard()}>隐藏</button>
        </div>
      </div>
    </div>
  );
}

/** 在当前光标位置插入 HTML 片段 */
function insertHtmlAtCaret(html: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const frag = tpl.content;
  const last = frag.lastChild;
  range.insertNode(frag);
  if (last) {
    range.setStartAfter(last);
    range.setEndAfter(last);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function escapeAndBreak(s: string) {
  const e = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return e.replace(/\n/g, '<br>');
}

function pad2(n: number) { return n < 10 ? '0' + n : '' + n; }

function formatDate(d: Date) {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (sameDay) return `今天 ${time}`;
  if (isTomorrow) return `明天 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

function humanRemain(due: number) {
  const diff = due - Date.now();
  if (diff < 0) return '已过期';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `还有 ${mins} 分钟`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `还有 ${h} 小时`;
  const d = Math.floor(h / 24);
  return `还有 ${d} 天`;
}

function isUrgent(due: number, done: 0 | 1) {
  if (done) return false;
  return due - Date.now() < 60 * 60 * 1000;
}

/* ----------------------- 列表 / 行首 工具函数 ----------------------- */

/** 当前 caret 是否落在 li 内 */
function isCaretInList(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  let n: Node | null = sel.getRangeAt(0).startContainer;
  while (n) {
    if (n.nodeType === 1 && (n as HTMLElement).tagName === 'LI') return true;
    n = n.parentNode;
  }
  return false;
}

/** 取得当前 caret 所在的 li 节点；若不在 li 内返回 null */
function getCurrentLi(): HTMLLIElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let n: Node | null = sel.getRangeAt(0).startContainer;
  while (n) {
    if ((n as HTMLElement).nodeType === 1 && (n as HTMLElement).tagName === 'LI') {
      return n as HTMLLIElement;
    }
    n = n.parentNode;
  }
  return null;
}

/** li 是否为空（没有可见文本、也没有图片等） */
function isLiEmpty(li: HTMLLIElement): boolean {
  const text = (li.textContent || '').replace(/\u200B/g, '').trim();
  if (text.length > 0) return false;
  if (li.querySelector('img,video,audio,svg')) return false;
  return true;
}

/**
 * 读取当前 caret 所在「行（block）」从行首到 caret 之间的纯文本，
 * 取首个非空白连续片段（如 "1." / "-" / "*" / "[]"）。
 */
function getLineLeadingToken(): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const block = getBlockElement(range.startContainer);
  if (!block) return null;
  // 用 Range 截取 block 起点 → caret 之间的文本
  const r = document.createRange();
  r.setStart(block, 0);
  r.setEnd(range.startContainer, range.startOffset);
  const text = r.toString();
  const m = /^\s*(\S+)$/.exec(text);
  return m ? m[1] : null;
}

/** 删除当前行从行首开始的 N 个字符（caret 之前部分） */
function replaceCurrentLineLeading(n: number) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const block = getBlockElement(range.startContainer);
  if (!block) return;
  const r = document.createRange();
  r.setStart(block, 0);
  r.setEnd(range.startContainer, range.startOffset);
  const text = r.toString();
  // 跳过空白后取 n 个字符删除
  const lead = /^\s*/.exec(text)?.[0].length ?? 0;
  // 在 text 中删除 [lead, lead + n] 这段
  // 实操上：把 caret 选区扩到包含这部分再删除
  const startOffset = findOffsetInBlock(block, lead);
  const endOffset = findOffsetInBlock(block, lead + n);
  if (!startOffset || !endOffset) return;
  const del = document.createRange();
  del.setStart(startOffset.node, startOffset.offset);
  del.setEnd(endOffset.node, endOffset.offset);
  del.deleteContents();
  sel.removeAllRanges();
  sel.addRange(range); // 维持原 caret
}

/** 找到从 block 起点出发第 charIndex 个字符所在的 textNode 与偏移 */
function findOffsetInBlock(block: Node, charIndex: number): { node: Node; offset: number } | null {
  let remaining = charIndex;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
  let node: Node | null = walker.nextNode();
  while (node) {
    const len = (node.nodeValue || '').length;
    if (remaining <= len) return { node, offset: remaining };
    remaining -= len;
    node = walker.nextNode();
  }
  return null;
}

/** 沿 parent 链找到最近的 block 元素（p/div/li/h1-3/blockquote 等） */
function getBlockElement(node: Node): HTMLElement | null {
  const blocks = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE']);
  let n: Node | null = node;
  while (n) {
    if (n.nodeType === 1 && blocks.has((n as HTMLElement).tagName)) return n as HTMLElement;
    n = n.parentNode;
  }
  return null;
}
