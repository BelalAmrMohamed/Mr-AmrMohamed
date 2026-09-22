// public\ai\app.js — Main AI chat widget: modal, sidebar/history, message rendering, etc...
import { store } from '../storage.js';
import { renderToolCall } from './tools.js';
import { historyToContents, sendMessage } from './api.js';

const SUGGESTED_PROMPTS = [
  'What can you help me with?',
  'Explain the present perfect tense',
  'Quiz me on 5 intermediate vocabulary words',
  'Correct my writing: "I have went to school yesterday."',
  'Tell me info about Mr. Amr, his contact details, his picture, and any videos.',
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
    brand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19 10.5 5h3L20 19h-3l-1.3-3H8.3L7 19H4Zm5.5-6h5L12 7.5 9.5 13Z"/><path d="M18.4 2.5 19.2 4l1.5.8-1.5.7-.8 1.5-.7-1.5-1.5-.7 1.5-.8.7-1.5Z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H9v2h6v-2h-2v-3.08A7 7 0 0 0 19 11h-2Z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>',
    brandSmall: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19 10.5 5h3L20 19h-3l-1.3-3H8.3L7 19H4Zm5.5-6h5L12 7.5 9.5 13Z"/><path d="M18.4 2.5 19.2 4l1.5.8-1.5.7-.8 1.5-.7-1.5-1.5-.7 1.5-.8.7-1.5Z"/></svg>',
    panelLeftOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>',
    panelRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>',
    panelRightOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m10 15-3-3 3-3"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.59l3.3-3.3 1.4 1.42L12 17.4l-4.7-4.7 1.4-1.42 3.3 3.3V3h2ZM5 19h14v2H5v-2Z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5c0 .83-.67 1.5-1.5 1.5H7v2H5.5V8H8c.83 0 1.5.67 1.5 1.5v2zm5 3.5h-3.5V8h3.5c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm-5-3.5H8v-2h1.5v2zm5 2H16v-4h1.5v4zM19 13h-2.5v-1.5H18V10h-1.5V9.5H19V8h-4v7h1.5v-2H19v-1z"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1Zm1 2v1h4V4h-4ZM6 6v14h12V6h-2v1H8V6H6Z"/></svg>',
    rename: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  };
  return icons[name] || '';
}

function normalizeToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls) || toolCalls.length < 2) return toolCalls;

  const isQuizQuestion = (tc) =>
    tc?.name === 'render_component' && ['mcq', 'fill_blank'].includes(tc?.args?.type);

  const questionCalls = toolCalls.filter(isQuizQuestion);
  if (questionCalls.length < 2) return toolCalls;

  // The model emitted several standalone mcq/fill_blank calls in one turn
  // instead of a single "quiz" call. Merge them into one quiz component so
  // the UI shows one card with next/back navigation instead of N stacked
  // cards, and so scoring is tracked in one place instead of N.
  const quizId = questionCalls[0]?.args?.data?.quizId || `quiz-${Date.now()}`;
  const questions = questionCalls.map((tc) => {
    const d = tc.args.data || {};
    if (tc.args.type === 'fill_blank') {
      return {
        type: 'fill_blank',
        prompt: d.prompt || '',
        answers: Array.isArray(d.answers) ? d.answers : [d.answer].filter(Boolean),
        explanation: d.explanation || '',
      };
    }
    return {
      type: 'mcq',
      question: d.question || '',
      options: d.options || [],
      correctIndex: d.correctIndex,
      explanation: d.explanation || '',
    };
  });

  const mergedQuizCall = {
    name: 'render_component',
    args: {
      type: 'quiz',
      data: { quizId, totalQuestions: questions.length, questions },
    },
  };

  const rest = toolCalls.filter((tc) => !isQuizQuestion(tc));
  return [mergedQuizCall, ...rest];
}

class AiChat {
  constructor() {
    this.speaking = null;
    this.recognition = null;
    this.isListening = false;
    this.voiceBaseText = '';
    this.voiceShouldSend = false;
    this.build();
    this.wire();
    this.renderHistory();
    this.renderActiveChat();
  }

  build() {
    this.launcher = el(`
      <button class="ai-widget-btn" type="button" aria-label="Open Mr. Amr's AI assistant">
        ${icon('brand')}
      </button>
    `);
    document.body.append(this.launcher);

    this.modal = el(`
      <div class="ai-modal" hidden>
        <div class="ai-modal-backdrop"></div>
        <div class="ai-modal-panel" role="dialog" aria-modal="true" aria-label="Mr. Amr's AI assistant">
          <aside class="ai-sidebar">
            <div class="ai-sidebar-header">
              <button type="button" class="ai-sidebar-logo-btn" aria-label="Expand sidebar" title="Expand sidebar">
                <span class="ai-sidebar-logo-icon">${icon('brandSmall')}</span>
                <span class="ai-sidebar-logo-hover">${icon('panelLeftOpen')}</span>
              </button>
              <div class="ai-sidebar-brand">
                <span class="ai-title-brand">${icon('brandSmall')}</span>
                <span class="ai-sidebar-brand-name">Mr. Amr's AI</span>
              </div>
              <button type="button" class="ai-icon-btn ai-sidebar-collapse-btn" aria-label="Collapse sidebar" title="Collapse sidebar">
                <span class="ai-sidebar-collapse-icon">${icon('panelRight')}</span>
                <span class="ai-sidebar-collapse-hover">${icon('panelRightOpen')}</span>
              </button>
              <button type="button" class="ai-icon-btn ai-sidebar-close-btn" aria-label="Close sidebar" title="Close sidebar">${icon('close')}</button>
            </div>
            <div class="ai-sidebar-actions">
              <button type="button" class="ai-new-chat-btn">${icon('plus')}<span>New chat</span></button>
            </div>
            <div class="ai-history-list"></div>
          </aside>
          <section class="ai-main">
            <header class="ai-chat-header">
              <button type="button" class="ai-icon-btn ai-mobile-menu-btn" aria-label="Toggle history" title="Toggle history">${icon('menu')}</button>
              <div class="ai-chat-title"><span class="ai-title-brand">${icon('brandSmall')}</span><span>Mr. Amr's AI</span></div>
              <button type="button" class="ai-icon-btn ai-close-btn" aria-label="Close">${icon('close')}</button>
            </header>
            <div class="ai-messages"></div>
            <div class="ai-suggested-prompts"></div>
            <form class="ai-composer">
              <div class="ai-input-shell">
                <textarea class="ai-input" placeholder="Ask anything about English or Mr. Amr…" dir="auto" rows="1"></textarea>
                <div class="ai-input-actions">
                  <button type="button" class="ai-mic-btn" aria-label="Start voice input" title="Voice input">${icon('mic')}</button>
                  <button type="submit" class="ai-send-btn" aria-label="Send" title="Send">${icon('send')}</button>
                  <button type="button" class="ai-stop-btn" aria-label="Stop generating" title="Stop generating" hidden style="display: none;">${icon('stop')}</button>
                </div>
              </div>
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
    this.$sidebarLogoBtn = this.modal.querySelector('.ai-sidebar-logo-btn');
    this.$sidebarCollapseBtn = this.modal.querySelector('.ai-sidebar-collapse-btn');
    this.$micBtn = this.modal.querySelector('.ai-mic-btn');
    this.$sendBtn = this.modal.querySelector('.ai-send-btn');
    this.$stopBtn = this.modal.querySelector('.ai-stop-btn');
    this.$mobileMenuBtn = this.modal.querySelector('.ai-mobile-menu-btn');
    this.$panel = this.modal.querySelector('.ai-modal-panel');
  }

  wire() {
    this.launcher.addEventListener('click', () => this.open());
    this.modal.querySelector('.ai-close-btn').addEventListener('click', () => this.close());
    this.modal.querySelector('.ai-modal-backdrop').addEventListener('click', () => this.close());
    if (this.$mobileMenuBtn) {
      this.$mobileMenuBtn.addEventListener('click', () => {
        this.$sidebar.classList.toggle('is-open');
      });
    }
    const $sidebarCloseBtn = this.modal.querySelector('.ai-sidebar-close-btn');
    if ($sidebarCloseBtn) {
      $sidebarCloseBtn.addEventListener('click', () => {
        this.$sidebar.classList.remove('is-open');
      });
    }
    this.$sidebarLogoBtn.addEventListener('click', () => {
      this.$panel.classList.remove('sidebar-collapsed');
    });
    this.$sidebarCollapseBtn.addEventListener('click', () => {
      this.$panel.classList.add('sidebar-collapsed');
    });
    this.$micBtn.addEventListener('click', () => this.toggleVoiceInput());
    this.$stopBtn.addEventListener('click', () => this.stopGenerating());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.hidden) this.close();
    });

    this.$newChatBtn.addEventListener('click', () => this.newChat());

    this.$composer.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitCurrentInput();
    });
    this.$input.addEventListener('input', () => {
      this.autoGrow();
      this.updateSendState();
    });
    this.$input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.$composer.requestSubmit();
      }
    });
    this.updateSendState();
  }

  updateSendState() {
    this.$sendBtn.disabled = !this.$input.value.trim();
  }

  autoGrow() {
    const maxHeight = 160;
    this.$input.style.height = '0px';
    this.$input.style.height = `${Math.min(this.$input.scrollHeight, maxHeight)}px`;
    this.$input.style.overflowY = this.$input.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  submitCurrentInput() {
    if (this.activeController) return;
    const text = this.$input.value.trim();
    if (!text) return;
    if (this.isListening) {
      this.voiceShouldSend = true;
      this.stopVoiceInput();
    }
    this.$input.value = '';
    this.autoGrow();
    this.updateSendState();
    this.handleSend(text);
  }

  getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  toggleVoiceInput() {
    if (this.isListening) {
      this.voiceShouldSend = true;
      this.stopVoiceInput();
      setTimeout(() => this.submitCurrentInput(), 80);
      return;
    }
    const Recognition = this.getSpeechRecognition();
    if (!Recognition) {
      this.showCustomNotice('Voice input is not supported by this browser.');
      return;
    }
    this.recognition = new Recognition();
    this.recognition.lang = /[\\u0600-\\u06FF]/.test(this.$input.value) ? 'ar-EG' : 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.voiceBaseText = this.$input.value.trim();
    this.voiceShouldSend = false;
    this.isListening = true;
    this.$micBtn.classList.add('is-listening');
    this.$micBtn.innerHTML = icon('stop');
    this.$micBtn.setAttribute('aria-label', 'Stop voice input and send');
    this.$micBtn.title = 'Stop and send';
    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const base = this.voiceBaseText ? `${this.voiceBaseText} ` : '';
      this.$input.value = `${base}${transcript}`.trimStart();
      this.autoGrow();
    };
    this.recognition.onerror = (event) => {
      if (event.error !== 'aborted') this.showCustomNotice(`Voice input error: ${event.error}.`);
      this.stopVoiceInput(false);
    };
    this.recognition.onend = () => {
      const shouldSend = this.voiceShouldSend;
      this.stopVoiceInput(false);
      if (shouldSend) setTimeout(() => this.submitCurrentInput(), 0);
    };
    this.recognition.start();
  }

  stopVoiceInput(clearSendFlag = true) {
    const recognition = this.recognition;
    this.isListening = false;
    this.$micBtn.classList.remove('is-listening');
    this.$micBtn.innerHTML = icon('mic');
    this.$micBtn.setAttribute('aria-label', 'Start voice input');
    this.$micBtn.title = 'Voice input';
    if (clearSendFlag) this.voiceShouldSend = false;
    if (recognition) {
      try { recognition.stop(); } catch {}
    }
    this.recognition = null;
  }

  showCustomNotice(message) {
    this.closeHistoryMenu();
    const notice = el(`<div class="ai-custom-dialog ai-notice-dialog" role="alertdialog" aria-modal="true">
      <div class="ai-dialog-card"><div class="ai-dialog-icon">${icon('brandSmall')}</div><p>${this.escape(message)}</p>
      <button type="button" class="ai-btn-mini ai-btn-primary" data-act="close">OK</button></div></div>`);
    document.body.append(notice);
    notice.querySelector('[data-act="close"]').addEventListener('click', () => notice.remove());
    requestAnimationFrame(() => notice.classList.add('is-visible'));
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
        <div class="ai-history-item ${active?.id === chat.id ? 'is-active' : ''} ${chat.pinned ? 'is-pinned' : ''}" data-id="${chat.id}">
          <span class="ai-history-title">${this.escape(chat.title)}</span>
          <span class="ai-history-actions">
            <button type="button" class="ai-icon-btn ai-history-pin" aria-label="${chat.pinned ? 'Pinned chat' : 'Pin chat'}" data-id="${chat.id}">${icon('pin')}</button>
            <button type="button" class="ai-icon-btn ai-history-more" aria-label="More options" data-id="${chat.id}">${icon('more')}</button>
          </span>
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
      item.querySelector('.ai-history-pin').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!chat.pinned) {
          store.togglePin(chat.id);
          this.renderHistory();
        } else {
          this.openHistoryMenu(chat.id, e.currentTarget);
        }
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
        <button type="button" data-act="pin">${icon('pin')}<span>${chat.pinned ? 'Unpin' : 'Pin'}</span></button>
        <button type="button" data-act="rename">${icon('rename')}<span>Rename</span></button>
        <button type="button" data-act="copy">${icon('clipboard')}<span>Copy to clipboard</span></button>
        <button type="button" data-act="download">${icon('download')}<span>Download as file</span></button>
        <button type="button" data-act="pdf">${icon('pdf')}<span>Export as PDF</span></button>
        <button type="button" data-act="delete" class="is-danger">${icon('trash')}<span>Delete</span></button>
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
      case 'rename':
        this.startInlineRename(chatId);
        break;
      case 'copy':
        this.copyChatToClipboard(chat);
        break;
      case 'download':
        this.download(`${chat.title}.md`, store.exportAsMarkdown(chat), 'text/markdown');
        break;
      case 'pdf':
        this.exportAsPdf(chatId);
        break;
      case 'delete':
        this.openDeleteDialog(chatId);
        break;
    }
  }

  exportAsPdf(chatId) {
    const chat = store.get(chatId);
    if (!chat) return;
    if (store.getActive()?.id !== chatId) {
      this.selectChat(chatId);
    }
    if (this.modal.hidden) {
      this.open();
    }
    requestAnimationFrame(() => {
      window.print();
    });
  }

  startInlineRename(chatId) {
    const item = this.$historyList.querySelector(`[data-id="${CSS.escape(chatId)}"]`);
    const chat = store.get(chatId);
    if (!item || !chat) return;
    const title = item.querySelector('.ai-history-title');
    const input = el(`<input class="ai-history-rename" type="text" value="${this.escape(chat.title)}" maxlength="80" aria-label="Rename chat">`);
    title.replaceWith(input);
    input.focus();
    input.select();
    const finish = (save) => {
      if (!input.isConnected) return;
      if (save) store.renameChat(chatId, input.value);
      this.renderHistory();
      if (store.getActive()?.id === chatId) this.renderChatTitle();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true), { once: true });
  }

  openDeleteDialog(chatId) {
    const chat = store.get(chatId);
    if (!chat) return;
    const dialog = el(`<div class="ai-custom-dialog" role="dialog" aria-modal="true">
      <div class="ai-dialog-card">
        <div class="ai-dialog-icon">${icon('brandSmall')}</div>
        <h3>Delete conversation?</h3>
        <p>This will permanently delete “${this.escape(chat.title)}”.</p>
        <div class="ai-dialog-actions">
          <button type="button" class="ai-btn-mini" data-act="cancel">Cancel</button>
          <button type="button" class="ai-btn-mini ai-btn-danger" data-act="delete">Delete</button>
        </div>
      </div>
    </div>`);
    document.body.append(dialog);
    const close = () => dialog.remove();
    dialog.querySelector('[data-act="cancel"]').addEventListener('click', close);
    dialog.querySelector('[data-act="delete"]').addEventListener('click', () => {
      const wasActive = store.getActive()?.id === chatId;
      store.deleteChat(chatId);
      close();
      this.renderHistory();
      if (wasActive) this.renderActiveChat();
    });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    requestAnimationFrame(() => dialog.classList.add('is-visible'));
  }

  async copyChatToClipboard(chat) {
    try {
      await navigator.clipboard?.writeText(store.exportAsMarkdown(chat));
    } catch (err) {
      console.error('[ai-chat] copy to clipboard failed', err);
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
    chat.messages.filter((m) => m.role !== 'interaction').forEach((m) => this.$messages.append(this.buildMessageEl(chat.id, m)));
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
        const node = renderToolCall(tc.name, tc.args, {
          onInteract: (result) => this.handleComponentInteraction(chatId, tc, result),
        });
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

  async handleComponentInteraction(chatId, toolCall, result) {
    const chat = store.get(chatId);
    if (!chat) return;
    const data = toolCall?.args?.data || {};
    const component = toolCall?.args?.type || '';
    const quizId = data.quizId || null;
    if (!quizId && !['mcq', 'fill_blank', 'quiz'].includes(component)) return;

    const interaction = {
      component,
      quizId,
      questionNumber: data.questionNumber ?? null,
      totalQuestions: data.totalQuestions ?? null,
      result,
      prompt: data.question || data.prompt || '',
      answer: typeof result === 'object' ? result.answer : undefined,
    };
    store.addMessage(chatId, {
      role: 'interaction',
      text: JSON.stringify(interaction),
      interaction,
    });
    if (store.getActive()?.id === chatId) {
      const typingEl = el(`<div class="ai-message is-model is-typing"><div class="ai-message-content"><div class="ai-thinking"><span class="ai-thinking-orb">${icon('brandSmall')}</span></div></div></div>`);
      this.$messages.append(typingEl);
      this.scrollToBottom();
      await this.generateReply(chatId, typingEl);
    } else {
      await this.generateReply(chatId);
    }
  }

  async handleSend(text) {
    const chat = this.ensureActiveChat();
    store.addMessage(chat.id, { role: 'user', text });
    this.renderHistory();
    this.renderActiveChat();
    this.updateNewChatState();
    await this.generateReply(chat.id);
  }

  async generateReply(chatId, existingTypingEl = null) {
    const chat = store.get(chatId);
    if (!chat) return;
    const typingEl = existingTypingEl || el(`<div class="ai-message is-model is-typing"><div class="ai-message-content"><div class="ai-thinking"><span class="ai-thinking-orb">${icon('brandSmall')}</span></div></div></div>`);
    if (!typingEl.isConnected) this.$messages.append(typingEl);
    this.scrollToBottom();

    const controller = new AbortController();
    this.activeController = controller;
    this.setGenerating(true);

    try {
      const contents = historyToContents(chat.messages);
      const { text, toolCalls: rawToolCalls, geminiTurns } = await sendMessage(contents, { signal: controller.signal });
      const toolCalls = normalizeToolCalls(rawToolCalls);
      typingEl.remove();
      const msg = store.addMessage(chatId, {
        role: 'model',
        text: text || (toolCalls.length ? '' : "Sorry, I couldn't come up with a reply. Please try again."),
        toolCalls: toolCalls.length ? toolCalls : null,
        geminiTurns,
      });
      if (store.getActive()?.id === chatId) {
        this.$messages.append(this.buildMessageEl(chatId, msg));
        this.scrollToBottom();
      }
      this.renderHistory();
    } catch (err) {
      typingEl.remove();
      if (err?.name === 'AbortError') {
        const msg = store.addMessage(chatId, { role: 'model', text: '_Stopped._' });
        if (store.getActive()?.id === chatId) {
          this.$messages.append(this.buildMessageEl(chatId, msg));
          this.scrollToBottom();
        }
        this.renderHistory();
        return;
      }
      console.error('[ai-chat] generation failed', err);
      const msg = store.addMessage(chatId, {
        role: 'model',
        text: `⚠️ ${err.message || 'Something went wrong reaching the assistant.'}`,
      });
      if (store.getActive()?.id === chatId) {
        this.$messages.append(this.buildMessageEl(chatId, msg));
        this.scrollToBottom();
      }
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
        this.setGenerating(false);
      }
    }
  }

  setGenerating(isGenerating) {
    this.$sendBtn.hidden = isGenerating;
    this.$sendBtn.style.display = isGenerating ? 'none' : '';
    this.$stopBtn.hidden = !isGenerating;
    this.$stopBtn.style.display = isGenerating ? '' : 'none';
    this.$micBtn.disabled = isGenerating;
    if (!isGenerating) this.updateSendState();
  }

  stopGenerating() {
    if (!this.activeController) return;
    this.activeController.abort();
    // Optimistically reflect the stop immediately instead of waiting for the
    // aborted fetch to reject and unwind through generateReply's catch —
    // that round-trip can lag on some networks and make Stop feel dead.
    this.activeController = null;
    this.setGenerating(false);
  }

  scrollToBottom() {
    this.$messages.scrollTop = this.$messages.scrollHeight;
  }
}

document.addEventListener('DOMContentLoaded', () => new AiChat());