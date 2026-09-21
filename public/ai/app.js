// public\ai\app.js — Main AI chat widget: modal, sidebar/history, message rendering, etc...
import { store } from '../storage.js';
import { renderToolCall } from './tools.js';
import { historyToContents, sendMessage } from './api.js';

const SUGGESTED_PROMPTS = [
  'What can you help me with?',
  'Explain the present perfect tense',
  'Quiz me on 5 intermediate vocabulary words',
  'Correct my writing: "I have went to school yesterday."',
  'How can I contact Mr. Amr?',
  'Let’s practice a job interview conversation',
];

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function renderMarkdown(text = '') {
  try {
    if (window.marked && window.DOMPurify) {
      const html = window.marked.parse(text, { breaks: true });
      return window.DOMPurify.sanitize(html);
    }
  } catch (err) {
    console.error('[ai-chat] markdown render failed', err);
  }
  // Fallback: plain text, still escaped.
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

function icon(name) {
  const icons = {
    copy: '<svg viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M17.65 6.35A8 8 0 1 0 19.94 13h-2.02A6 6 0 1 1 12 6a5.9 5.9 0 0 1 4.22 1.78L13 11h7V4l-2.35 2.35Z"/></svg>',
    speak: '<svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 5V5L7 10H3Zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12ZM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23Z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
    more: '<svg viewBox="0 0 24 24"><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M16 3v6l2 3v2h-6v6l-1 1-1-1v-6H4v-2l2-3V3h10Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M11 5v6H5v2h6v6h2v-6h6v-2h-6V5h-2Z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4l-6.3 6.3-1.41-1.41L9.17 12 2.88 5.71 4.3 4.29l6.3 6.3 6.29-6.3z"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.62 1.32 4.96 3.4 6.56V22l3.62-2.12c.94.24 1.94.37 2.98.37 5.52 0 10-3.94 10-8.8S17.52 2 12 2Z"/></svg>',
  };
  return icons[name] || '';
}

class AiChat {
  constructor() {
    this.speaking = null; // messageId currently being read aloud
    this.build();
    this.wire();
    this.renderHistory();
    this.renderActiveChat();
  }

  build() {
    this.launcher = el(`
      <button class="ai-widget-btn" type="button" aria-label="Open Mr. Amr's AI assistant">
        ${icon('chat')}
      </button>
    `);
    document.body.append(this.launcher);

    this.modal = el(`
      <div class="ai-modal" hidden>
        <div class="ai-modal-backdrop"></div>
        <div class="ai-modal-panel" role="dialog" aria-modal="true" aria-label="Mr. Amr's AI assistant">
          <aside class="ai-sidebar">
            <div class="ai-sidebar-header">
              <button type="button" class="ai-new-chat-btn">${icon('plus')}<span>New chat</span></button>
            </div>
            <div class="ai-history-list"></div>
          </aside>
          <section class="ai-main">
            <header class="ai-chat-header">
              <button type="button" class="ai-icon-btn ai-sidebar-toggle" aria-label="Toggle history">${icon('menu')}</button>
              <div class="ai-chat-title">Mr. Amr's AI</div>
              <button type="button" class="ai-icon-btn ai-close-btn" aria-label="Close">${icon('close')}</button>
            </header>
            <div class="ai-messages"></div>
            <div class="ai-suggested-prompts"></div>
            <form class="ai-composer">
              <textarea class="ai-input" placeholder="Ask anything about English or Mr. Amr…" dir="auto" rows="1"></textarea>
              <button type="submit" class="ai-send-btn" aria-label="Send">➤</button>
            </form>
          </section>
        </div>
      </div>
    `);
    document.body.append(this.modal);

    this.$sidebar = this.modal.querySelector('.ai-sidebar');
    this.$historyList = this.modal.querySelector('.ai-history-list');
    this.$messages = this.modal.querySelector('.ai-messages');
    this.$suggested = this.modal.querySelector('.ai-suggested-prompts');
    this.$composer = this.modal.querySelector('.ai-composer');
    this.$input = this.modal.querySelector('.ai-input');
    this.$newChatBtn = this.modal.querySelector('.ai-new-chat-btn');
  }

  wire() {
    this.launcher.addEventListener('click', () => this.open());
    this.modal.querySelector('.ai-close-btn').addEventListener('click', () => this.close());
    this.modal.querySelector('.ai-modal-backdrop').addEventListener('click', () => this.close());
    this.modal.querySelector('.ai-sidebar-toggle').addEventListener('click', () => {
      this.$sidebar.classList.toggle('is-open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.hidden) this.close();
    });

    this.$newChatBtn.addEventListener('click', () => this.newChat());

    this.$composer.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.$input.value.trim();
      if (!text) return;
      this.$input.value = '';
      this.autoGrow();
      this.handleSend(text);
    });
    this.$input.addEventListener('input', () => this.autoGrow());
    this.$input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.$composer.requestSubmit();
      }
    });
  }

  autoGrow() {
    this.$input.style.height = 'auto';
    this.$input.style.height = `${Math.min(this.$input.scrollHeight, 160)}px`;
  }

  open() {
    this.modal.hidden = false;
    document.body.classList.add('ai-modal-open');
    requestAnimationFrame(() => this.modal.classList.add('is-visible'));
    this.$input.focus();
  }

  close() {
    this.modal.classList.remove('is-visible');
    document.body.classList.remove('ai-modal-open');
    setTimeout(() => {
      this.modal.hidden = true;
    }, 200);
  }

  // ---------------------------------------------------------------- history

  renderHistory() {
    this.$historyList.innerHTML = '';
    const chats = store.list();
    if (!chats.length) {
      this.$historyList.append(el(`<p class="ai-history-empty">No conversations yet.</p>`));
      return;
    }
    const active = store.getActive();
    for (const chat of chats) {
      const item = el(`
        <div class="ai-history-item ${active?.id === chat.id ? 'is-active' : ''}" data-id="${chat.id}">
          <span class="ai-history-title">${chat.pinned ? '📌 ' : ''}${this.escape(chat.title)}</span>
          <button type="button" class="ai-icon-btn ai-history-more" aria-label="More options" data-id="${chat.id}">${icon('more')}</button>
        </div>
      `);
      item.addEventListener('click', (e) => {
        if (e.target.closest('.ai-history-more')) return;
        this.selectChat(chat.id);
      });
      item.querySelector('.ai-history-more').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openHistoryMenu(chat.id, e.currentTarget);
      });
      this.$historyList.append(item);
    }
  }

  openHistoryMenu(chatId, anchor) {
    this.closeHistoryMenu();
    const chat = store.get(chatId);
    if (!chat) return;
    const menu = el(`
      <div class="ai-context-menu">
        <button type="button" data-act="pin">${chat.pinned ? 'Unpin' : 'Pin'}</button>
        <button type="button" data-act="rename">Rename</button>
        <button type="button" data-act="export-md">Export as Markdown</button>
        <button type="button" data-act="export-txt">Export as Text</button>
        <button type="button" data-act="export-pdf">Export as PDF</button>
        <button type="button" data-act="delete" class="is-danger">Delete</button>
      </div>
    `);
    document.body.append(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${Math.max(8, rect.right - menu.offsetWidth - 140)}px`;

    menu.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (!act) return;
      this.handleHistoryAction(act, chatId);
      this.closeHistoryMenu();
    });
    this._menu = menu;
    setTimeout(() => document.addEventListener('click', this._menuOutside = () => this.closeHistoryMenu(), { once: true }), 0);
  }

  closeHistoryMenu() {
    this._menu?.remove();
    this._menu = null;
  }

  handleHistoryAction(act, chatId) {
    const chat = store.get(chatId);
    if (!chat) return;
    switch (act) {
      case 'pin':
        store.togglePin(chatId);
        this.renderHistory();
        break;
      case 'rename': {
        const name = prompt('Rename chat', chat.title);
        if (name && name.trim()) {
          store.renameChat(chatId, name.trim());
          this.renderHistory();
          if (store.getActive()?.id === chatId) this.renderChatTitle();
        }
        break;
      }
      case 'export-md':
        this.download(`${chat.title}.md`, store.exportAsMarkdown(chat), 'text/markdown');
        break;
      case 'export-txt':
        this.download(`${chat.title}.txt`, store.exportAsText(chat), 'text/plain');
        break;
      case 'export-pdf':
        this.exportPdf(chat);
        break;
      case 'delete':
        if (confirm(`Delete "${chat.title}"? This cannot be undone.`)) {
          const wasActive = store.getActive()?.id === chatId;
          store.deleteChat(chatId);
          this.renderHistory();
          if (wasActive) this.renderActiveChat();
        }
        break;
    }
  }

  download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = el(`<a href="${url}" download="${filename}"></a>`);
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  exportPdf(chat) {
    const win = window.open('', '_blank');
    if (!win) return;
    const body = chat.messages
      .map((m) => `<p><strong>${m.role === 'user' ? 'You' : "Mr. Amr's AI"}:</strong></p><div dir="auto">${renderMarkdown(m.text || '[interactive content]')}</div>`)
      .join('<hr>');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${this.escape(chat.title)}</title>
      <style>body{font-family:sans-serif;max-width:700px;margin:40px auto;line-height:1.6} hr{border:none;border-top:1px solid #ddd;margin:16px 0}</style>
      </head><body><h1>${this.escape(chat.title)}</h1>${body}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  // ------------------------------------------------------------- chat flow

  newChat() {
    const active = store.getActive();
    if (store.isEmptyChat(active)) {
      this.$newChatBtn.classList.add('is-shake');
      setTimeout(() => this.$newChatBtn.classList.remove('is-shake'), 300);
      return;
    }
    store.createChat();
    this.renderHistory();
    this.renderActiveChat();
  }

  selectChat(id) {
    store.setActive(id);
    this.renderHistory();
    this.renderActiveChat();
    this.$sidebar.classList.remove('is-open');
  }

  ensureActiveChat() {
    let chat = store.getActive();
    if (!chat) chat = store.createChat();
    return chat;
  }

  renderChatTitle() {
    const chat = store.getActive();
    this.modal.querySelector('.ai-chat-title').textContent = chat ? chat.title : "Mr. Amr's AI";
  }

  updateNewChatState() {
    const active = store.getActive();
    this.$newChatBtn.disabled = store.isEmptyChat(active);
  }

  renderActiveChat() {
    const chat = store.getActive();
    this.$messages.innerHTML = '';
    this.renderChatTitle();
    this.updateNewChatState();

    if (!chat || !chat.messages.length) {
      this.renderSuggested();
      if (chat?.parentId) this.renderBranchBanner(chat);
      return;
    }
    this.$suggested.innerHTML = '';
    if (chat.parentId) this.renderBranchBanner(chat);
    chat.messages.forEach((m) => this.$messages.append(this.buildMessageEl(chat.id, m)));
    this.scrollToBottom();
  }

  renderBranchBanner(chat) {
    const parent = chat.parentId ? store.get(chat.parentId) : null;
    this.$messages.append(
      el(`<div class="ai-branch-banner">🌿 Branched${parent ? ` from “${this.escape(parent.title)}”` : ''} — the original conversation is unchanged.</div>`)
    );
  }

  renderSuggested() {
    this.$suggested.innerHTML = '';
    const wrap = el('<div class="ai-suggested-inner"></div>');
    wrap.append(el(`<p class="ai-suggested-title">Try asking…</p>`));
    const chips = el('<div class="ai-suggested-chips"></div>');
    SUGGESTED_PROMPTS.forEach((p) => {
      const chip = el(`<button type="button" class="ai-suggested-chip">${this.escape(p)}</button>`);
      chip.addEventListener('click', () => this.handleSend(p));
      chips.append(chip);
    });
    wrap.append(chips);
    this.$suggested.append(wrap);
  }

  escape(s = '') {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  buildMessageEl(chatId, msg) {
    const isUser = msg.role === 'user';
    const bubble = el(`<div class="ai-message ${isUser ? 'is-user' : 'is-model'}" data-id="${msg.id}"></div>`);
    const content = el(`<div class="ai-message-content" dir="auto"></div>`);
    if (msg.text) content.innerHTML = renderMarkdown(msg.text);
    bubble.append(content);

    if (msg.toolCalls?.length) {
      const toolsWrap = el('<div class="ai-message-tools"></div>');
      for (const tc of msg.toolCalls) {
        const node = renderToolCall(tc.name, tc.args);
        if (node) toolsWrap.append(node);
      }
      bubble.append(toolsWrap);
    }

    const actions = el('<div class="ai-message-actions"></div>');
    const copyBtn = el(`<button type="button" class="ai-icon-btn" aria-label="Copy" title="Copy">${icon('copy')}</button>`);
    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(msg.text || content.textContent || '');
      copyBtn.classList.add('is-done');
      setTimeout(() => copyBtn.classList.remove('is-done'), 900);
    });
    actions.append(copyBtn);

    if (isUser) {
      const editBtn = el(`<button type="button" class="ai-icon-btn" aria-label="Edit" title="Edit">${icon('edit')}</button>`);
      editBtn.addEventListener('click', () => this.startEdit(chatId, msg, content, bubble));
      actions.append(editBtn);
    } else {
      const speakBtn = el(`<button type="button" class="ai-icon-btn" aria-label="Read aloud" title="Read aloud">${icon('speak')}</button>`);
      speakBtn.addEventListener('click', () => this.toggleSpeak(msg, content, speakBtn));
      const redoBtn = el(`<button type="button" class="ai-icon-btn" aria-label="Regenerate" title="Regenerate">${icon('redo')}</button>`);
      redoBtn.addEventListener('click', () => this.regenerate(chatId, msg.id));
      actions.append(speakBtn, redoBtn);
    }
    bubble.append(actions);
    return bubble;
  }

  toggleSpeak(msg, content, btn) {
    if (this.speaking === msg.id) {
      speechSynthesis.cancel();
      this.speaking = null;
      btn.innerHTML = icon('speak');
      return;
    }
    speechSynthesis.cancel();
    const text = content.textContent || msg.text || '';
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-EG' : 'en-US';
    u.onend = () => {
      this.speaking = null;
      btn.innerHTML = icon('speak');
    };
    this.speaking = msg.id;
    btn.innerHTML = icon('stop');
    speechSynthesis.speak(u);
  }

  startEdit(chatId, msg, contentEl, bubbleEl) {
    const chat = store.get(chatId);
    const idx = chat.messages.findIndex((m) => m.id === msg.id);
    const textarea = el(`<textarea class="ai-edit-textarea" dir="auto">${this.escape(msg.text || '')}</textarea>`);
    const actions = el(`<div class="ai-edit-actions">
        <button type="button" class="ai-btn-mini" data-act="cancel">Cancel</button>
        <button type="button" class="ai-btn-mini ai-btn-primary" data-act="save">Save & send</button>
      </div>`);
    contentEl.replaceWith(textarea);
    bubbleEl.querySelector('.ai-message-actions').before(actions);
    textarea.focus();

    actions.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'cancel') {
        this.renderActiveChat();
        return;
      }
      if (act === 'save') {
        const newText = textarea.value.trim();
        if (!newText) return;
        this.applyEdit(chatId, idx, newText);
      }
    });
  }

  isLastUserMessage(chat, idx) {
    return !chat.messages.slice(idx + 1).some((m) => m.role === 'user');
  }

  async applyEdit(chatId, idx, newText) {
    const chat = store.get(chatId);
    const msg = chat.messages[idx];
    const isLatest = this.isLastUserMessage(chat, idx);

    if (isLatest) {
      // Continue in this conversation: replace text, drop anything after it, regenerate.
      store.updateMessageText(chatId, msg.id, newText);
      store.truncateAfter(chatId, chat.messages[idx + 1]?.id ?? '___none___');
      this.renderActiveChat();
      await this.generateReply(chatId);
    } else {
      // Branch: preserve the original chat, create a new one up to (not including) this message.
      const branch = store.branchFrom(chatId, idx);
      store.addMessage(branch.id, { role: 'user', text: newText });
      this.renderHistory();
      this.selectChat(branch.id);
      await this.generateReply(branch.id);
    }
    this.renderHistory();
  }

  async regenerate(chatId, modelMessageId) {
    const chat = store.get(chatId);
    const idx = chat.messages.findIndex((m) => m.id === modelMessageId);
    if (idx === -1) return;
    store.truncateAfter(chatId, modelMessageId);
    this.renderActiveChat();
    await this.generateReply(chatId);
  }

  async handleSend(text) {
    const chat = this.ensureActiveChat();
    store.addMessage(chat.id, { role: 'user', text });
    this.renderHistory();
    this.renderActiveChat();
    this.updateNewChatState();
    await this.generateReply(chat.id);
  }

  async generateReply(chatId) {
    const chat = store.get(chatId);
    if (!chat) return;
    const typingEl = el(`<div class="ai-message is-model is-typing"><div class="ai-message-content"><span></span><span></span><span></span></div></div>`);
    this.$messages.append(typingEl);
    this.scrollToBottom();

    try {
      const contents = historyToContents(chat.messages);
      const { text, toolCalls } = await sendMessage(contents);
      typingEl.remove();
      const msg = store.addMessage(chatId, {
        role: 'model',
        text: text || (toolCalls.length ? '' : "Sorry, I couldn't come up with a reply. Please try again."),
        toolCalls: toolCalls.length ? toolCalls : null,
      });
      if (store.getActive()?.id === chatId) {
        this.$messages.append(this.buildMessageEl(chatId, msg));
        this.scrollToBottom();
      }
      this.renderHistory();
    } catch (err) {
      console.error('[ai-chat] generation failed', err);
      typingEl.remove();
      const msg = store.addMessage(chatId, {
        role: 'model',
        text: `⚠️ ${err.message || 'Something went wrong reaching the assistant.'}`,
      });
      if (store.getActive()?.id === chatId) {
        this.$messages.append(this.buildMessageEl(chatId, msg));
        this.scrollToBottom();
      }
    }
  }

  scrollToBottom() {
    this.$messages.scrollTop = this.$messages.scrollHeight;
  }
}

document.addEventListener('DOMContentLoaded', () => new AiChat());