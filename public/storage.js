// storage.js — all chat-history persistence lives here (localStorage).
// Schema:
// {
//   chats: {
//     [id]: {
//       id, title, pinned, createdAt, updatedAt,
//       parentId: string|null,        // set when this chat was branched off another
//       branchIndex: number|null,     // message index in the parent it branched from
//       messages: [
//         { id, role: 'user'|'model', text, toolCalls?, createdAt, editedAt? }
//       ]
//     }
//   },
//   activeChatId: string|null
// }

const KEY = 'mrAmrAi.v1';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { chats: {}, activeChatId: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { chats: {}, activeChatId: null };
    parsed.chats ||= {};
    return parsed;
  } catch {
    return { chats: {}, activeChatId: null };
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[ai-chat] failed to persist history', err);
  }
}

export const store = {
  state: load(),

  persist() {
    save(this.state);
  },

  list() {
    // Pinned first (by updatedAt desc), then the rest (by updatedAt desc).
    const all = Object.values(this.state.chats);
    const pinned = all.filter((c) => c.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
    const rest = all.filter((c) => !c.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
    return [...pinned, ...rest];
  },

  get(id) {
    return this.state.chats[id] || null;
  },

  getActive() {
    return this.state.activeChatId ? this.get(this.state.activeChatId) : null;
  },

  setActive(id) {
    this.state.activeChatId = id;
    this.persist();
  },

  isEmptyChat(chat) {
    return !chat || chat.messages.length === 0;
  },

  createChat({ parentId = null, branchIndex = null } = {}) {
    const id = uid();
    const now = Date.now();
    const chat = {
      id,
      title: 'New chat',
      pinned: false,
      createdAt: now,
      updatedAt: now,
      parentId,
      branchIndex,
      messages: [],
    };
    this.state.chats[id] = chat;
    this.state.activeChatId = id;
    this.persist();
    return chat;
  },

  deleteChat(id) {
    delete this.state.chats[id];
    if (this.state.activeChatId === id) this.state.activeChatId = null;
    this.persist();
  },

  renameChat(id, title) {
    const chat = this.get(id);
    if (!chat) return;
    chat.title = title.trim().slice(0, 80) || chat.title;
    chat.updatedAt = Date.now();
    this.persist();
  },

  togglePin(id) {
    const chat = this.get(id);
    if (!chat) return;
    chat.pinned = !chat.pinned;
    this.persist();
  },

  autoTitle(chat) {
    if (chat.title !== 'New chat') return;
    const firstUser = chat.messages.find((m) => m.role === 'user');
    if (firstUser?.text) {
      chat.title = firstUser.text.trim().slice(0, 48) || chat.title;
    }
  },

  addMessage(chatId, { role, text, toolCalls = null }) {
    const chat = this.get(chatId);
    if (!chat) return null;
    const msg = { id: uid(), role, text, toolCalls, createdAt: Date.now() };
    chat.messages.push(msg);
    chat.updatedAt = Date.now();
    this.autoTitle(chat);
    this.persist();
    return msg;
  },

  updateMessageText(chatId, messageId, text) {
    const chat = this.get(chatId);
    if (!chat) return;
    const msg = chat.messages.find((m) => m.id === messageId);
    if (!msg) return;
    msg.text = text;
    msg.editedAt = Date.now();
    chat.updatedAt = Date.now();
    this.persist();
  },

  truncateAfter(chatId, messageId) {
    // Removes messageId and everything after it (used before regenerating).
    const chat = this.get(chatId);
    if (!chat) return;
    const idx = chat.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    chat.messages = chat.messages.slice(0, idx);
    chat.updatedAt = Date.now();
    this.persist();
  },

  /** Branch a new chat that copies messages [0, messageIndex) from the source
   *  chat, preserving the original untouched. Returns the new chat. */
  branchFrom(sourceChatId, messageIndex) {
    const source = this.get(sourceChatId);
    if (!source) return null;
    const branch = this.createChat({ parentId: sourceChatId, branchIndex: messageIndex });
    branch.messages = source.messages.slice(0, messageIndex).map((m) => ({ ...m, id: uid() }));
    branch.title = source.title === 'New chat' ? branch.title : `${source.title} (branch)`;
    this.persist();
    return branch;
  },

  exportAsMarkdown(chat) {
    const lines = [`# ${chat.title}`, ''];
    for (const m of chat.messages) {
      const who = m.role === 'user' ? 'You' : "Mr. Amr's AI";
      lines.push(`**${who}:**`, '', m.text || '_[interactive content]_', '');
    }
    return lines.join('\n');
  },

  exportAsText(chat) {
    const lines = [chat.title, ''];
    for (const m of chat.messages) {
      const who = m.role === 'user' ? 'You' : "Mr. Amr's AI";
      lines.push(`${who}: ${m.text || '[interactive content]'}`, '');
    }
    return lines.join('\n');
  },
};