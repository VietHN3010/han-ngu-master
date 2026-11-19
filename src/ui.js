/**
 * Shared UI kit (v14 redesign)
 * - Icon: inline SVG line icons (consistent across iOS / Android / Windows, replaces emoji icons)
 * - Tone: pinyin syllable segmentation + tone colouring
 * - Prefs: learner display preferences (pinyin / Hán Việt visibility)
 * - UI: toast, confirm dialog and bottom sheet (replace window.alert / confirm)
 */

const Icon = {
  paths: {
    learn: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M8 7h7M8 11h5"/>',
    review: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/>',
    dict: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sound: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    starFill: '<path fill="currentColor" d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-7 0-3.2-2-5.8-4-7.5.2 2-1 3.5-2.5 3.5C11 11 12 7 9.5 3 9 7 5 9.5 5 15c0 4.3 3 7 7 7z"/>',
    cards: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01"/>',
    puzzle: '<path d="M4 7h3a2 2 0 1 0 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H4v-3a2 2 0 1 0 0-4z"/>',
    grammar: '<path d="M4 6h16M4 12h10M4 18h7"/><path d="m15 15 2.5 2.5L22 13"/>',
    headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pause: '<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.3-8.8A6 6 0 0 0 4.5 13 3 3 0 0 0 6 19z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    book: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  },

  /** Returns an inline SVG string. `cls` is added to the svg element. */
  svg(name, cls = '') {
    const p = this.paths[name] || this.paths.sparkle;
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${p}</svg>`;
  }
};

const Tone = {
  // Toned vowel -> [base, tone]
  map: (() => {
    const m = {};
    const rows = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
    Object.entries(rows).forEach(([base, marks]) => {
      [...marks].forEach((ch, i) => { m[ch] = [base, i + 1]; m[ch.toUpperCase()] = [base.toUpperCase(), i + 1]; });
    });
    return m;
  })(),

  FINALS: ['iang', 'iong', 'uang', 'ueng', 'ang', 'eng', 'ing', 'ong', 'uai', 'uan', 'ian', 'iao', 'van', 'üan',
    'ai', 'ei', 'ao', 'ou', 'an', 'en', 'in', 'un', 'ün', 'vn', 'ia', 'ie', 'iu', 'ua', 'uo', 'ui', 'ue', 'üe', 've', 'er',
    'a', 'o', 'e', 'i', 'u', 'ü', 'v'],
  INITIALS: ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'],

  /** Strip tone marks. Returns { plain, tones[] } where tones[i] is the tone carried at index i (0 = none). */
  _strip(word) {
    let plain = '';
    const tones = [];
    for (const ch of word) {
      const hit = this.map[ch];
      plain += hit ? hit[0] : ch;
      tones.push(hit ? hit[1] : 0);
    }
    return { plain, tones };
  },

  /** Split one space-free pinyin word into syllables. Returns [{text, tone}] or null when it cannot be parsed. */
  splitWord(word) {
    const { plain, tones } = this._strip(word);
    const chars = [...word];
    const low = plain.toLowerCase();
    const out = [];
    let i = 0;
    const isVowel = (c) => 'aeiouüv'.includes(c);
    while (i < low.length) {
      if (low[i] === "'" || low[i] === '’' || low[i] === '-') { i++; continue; }
      let init = '';
      for (const ini of this.INITIALS) { if (low.startsWith(ini, i)) { init = ini; break; } }
      const rest = i + init.length;
      const candidates = this.FINALS.filter((f) => low.startsWith(f, rest)).sort((a, b) => b.length - a.length);
      if (!candidates.length) {
        if (init === 'r' || (init === '' && low[i] === 'r')) { // erhua "r"
          out.push({ start: i, end: i + 1 }); i += 1; continue;
        }
        return null;
      }
      let pick = candidates[0];
      // Prefer a shorter final if the longer one would steal the next syllable's initial vowel
      for (const f of candidates) {
        const after = low[rest + f.length];
        if (!after || !isVowel(after)) { pick = f; break; }
      }
      const end = rest + pick.length;
      out.push({ start: i, end });
      i = end;
    }
    return out.map(({ start, end }) => {
      const text = chars.slice(start, end).join('');
      const tone = tones.slice(start, end).find((t) => t > 0) || 5;
      return { text, tone };
    });
  },

  /** Returns HTML with each syllable wrapped in a tone span. Falls back to escaped text. */
  html(pinyin) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    if (!pinyin) return '';
    return String(pinyin).split(/(\s+|[,.?!;:，。？！；：、…“”"()（）]+)/).map((tok) => {
      if (!tok || /^\s+$/.test(tok) || /^[,.?!;:，。？！；：、…“”"()（）]+$/.test(tok)) return esc(tok);
      const parts = this.splitWord(tok);
      if (!parts) return esc(tok);
      return parts.map((p) => `<span class="t${p.tone}">${esc(p.text)}</span>`).join('');
    }).join('');
  }
};

const Prefs = {
  KEY: 'hnm_prefs_v1',
  data: { pinyin: true, hanviet: true, toneColors: true, newPerDay: 10 },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { /* storage unavailable */ }
    this.apply();
  },

  set(key, value) {
    this.data[key] = value;
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    this.apply();
  },

  apply() {
    if (typeof document === 'undefined' || !document.body || !document.body.classList) return;
    document.body.classList.toggle('pref-hide-pinyin', !this.data.pinyin);
    document.body.classList.toggle('pref-hide-hanviet', !this.data.hanviet);
    document.body.classList.toggle('pref-no-tone-colors', !this.data.toneColors);
  }
};

const UI = {
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  toast(message, type = 'info', duration = 2600) {
    let box = document.getElementById('app-toast-container');
    if (!box) {
      box = document.createElement('div');
      box.id = 'app-toast-container';
      box.className = 'toast-stack';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'check' : (type === 'error' ? 'x' : (type === 'warning' ? 'bulb' : 'sparkle'));
    el.innerHTML = `${Icon.svg(icon)}<span>${this.esc(message)}</span>`;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, duration);
  },

  /** In-page dialog. Resolves true / false. */
  confirm({ title, body = '', ok = 'Đồng ý', cancel = 'Hủy', danger = false }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'dialog-backdrop';
      wrap.innerHTML = `
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h3 id="dialog-title">${this.esc(title)}</h3>
          ${body ? `<div class="dialog-body">${body}</div>` : ''}
          <div class="dialog-actions">
            ${cancel ? `<button type="button" class="btn btn-outline" data-r="0">${this.esc(cancel)}</button>` : ''}
            <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${this.esc(ok)}</button>
          </div>
        </div>`;
      const close = (v) => {
        wrap.classList.remove('show');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => wrap.remove(), 180);
        resolve(v);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(false); };
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) close(false);
        const b = e.target.closest('[data-r]');
        if (b) close(b.dataset.r === '1');
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      requestAnimationFrame(() => {
        wrap.classList.add('show');
        const primary = wrap.querySelector('[data-r="1"]');
        if (primary) primary.focus();
      });
    });
  },

  _scripts: {},
  /** Load an external script once; resolves when ready. */
  loadScript(src) {
    if (this._scripts[src]) return this._scripts[src];
    this._scripts[src] = new Promise((resolve, reject) => {
      if (typeof document === 'undefined' || !document.head || !document.head.appendChild) { reject(new Error('no DOM')); return; }
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = () => resolve(true);
      el.onerror = () => { delete this._scripts[src]; reject(new Error('load failed: ' + src)); };
      document.head.appendChild(el);
    });
    return this._scripts[src];
  },

  alert(title, body = '') {
    return this.confirm({ title, body, ok: 'Đã hiểu', cancel: '' });
  }
};

/**
 * Notes: renders knowledge from the teacher's slides (window.LESSON_NOTES, built by scripts/build-notes.js).
 * Lines containing Chinese become tappable so learners can hear the example.
 */
const Notes = {
  LABELS: {
    chiet_tu: 'Chiết tự', cach_dung: 'Cách dùng', cau_vi_du: 'Ví dụ', tu_mo_rong: 'Từ mở rộng',
    ngu_phap: 'Ngữ pháp', ngu_am: 'Ngữ âm', van_hoa: 'Văn hóa', khac: 'Ghi chú'
  },

  data() {
    return (typeof window !== 'undefined' && window.LESSON_NOTES) || { words: {}, lessons: {} };
  },

  forWord(id) {
    return this.data().words[id] || [];
  },

  forLesson(id, cats) {
    const all = this.data().lessons[id] || [];
    return cats ? all.filter((n) => cats.includes(n.c)) : all;
  },

  /** First chiết tự note of a word, shortened for compact cards (flashcard back, review intro). */
  mnemonic(id) {
    const n = this.forWord(id).find((x) => x.c === 'chiet_tu');
    if (!n) return '';
    return n.x.split('\n').filter((l) => !/^Hán Việt/i.test(l)).join(' ').slice(0, 220);
  },

  /** One line of note text: escapes, highlights hanzi, and makes Chinese tappable to hear it. */
  line(text) {
    const esc = UI.esc(text);
    const han = text.match(/[㐀-鿿][㐀-鿿，。？！、；：“”‘’（）()…—\s]*[㐀-鿿。？！]?/);
    const marked = esc.replace(/([㐀-鿿]+)/g, '<span class="hanzi">$1</span>');
    if (han && han[0].replace(/[^㐀-鿿]/g, '').length >= 2) {
      const zh = han[0].trim();
      return `<button class="note-line note-say" onclick="AudioEngine.speak('${typeof jsArg === 'function' ? jsArg(zh) : zh}')"><span class="note-text">${marked}</span>${Icon.svg('sound')}</button>`;
    }
    return `<p class="note-line">${marked}</p>`;
  },

  item(n, showTag = true) {
    const lines = n.x.split('\n').map((l) => l.trim()).filter(Boolean);
    return `
      <div class="note-item note-${n.c}">
        <div class="note-head">${showTag ? `<span class="note-tag">${this.LABELS[n.c] || ''}</span>` : ''}${n.t ? `<b>${UI.esc(n.t)}</b>` : ''}</div>
        ${lines.map((l) => this.line(l)).join('')}
      </div>`;
  },

  /** Collapsible block under a vocabulary card. */
  wordBlock(id) {
    const notes = this.forWord(id);
    if (!notes.length) return '';
    const cats = [...new Set(notes.map((n) => this.LABELS[n.c]))].join(' · ');
    return `
      <details class="word-notes">
        <summary>${Icon.svg('bulb')}<span>${cats}</span><span class="wn-count">${notes.length}</span></summary>
        <div class="word-notes-body">${notes.map((n) => this.item(n)).join('')}</div>
      </details>`;
  },

  /** Section listing lesson-level notes of the given categories. */
  lessonSection(id, cats, title, intro = '') {
    const notes = this.forLesson(id, cats);
    if (!notes.length) return '';
    return `
      <section class="lesson-notes">
        <h3 class="section-label">${title}</h3>
        ${intro ? `<p class="step-intro">${intro}</p>` : ''}
        <div class="note-list">${notes.map((n) => this.item(n)).join('')}</div>
      </section>`;
  }
};

if (typeof window !== 'undefined') {
  window.Notes = Notes;
  window.Icon = Icon;
  window.Tone = Tone;
  window.Prefs = Prefs;
  window.UI = UI;
}
