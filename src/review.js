/**
 * Review: today's spaced-repetition queue with mixed exercise types.
 *
 *   intro    new word: see it, hear it, then it is quizzed later in the same session
 *   flip     classic flashcard with self rating (Quên / Khó / Nhớ / Dễ)
 *   meaning  hanzi -> choose Vietnamese meaning
 *   reverse  Vietnamese -> choose hanzi
 *   listen   audio only -> choose hanzi
 *   write    write a single character stroke by stroke (HanziWriter quiz)
 *
 * Grading feeds StorageManager.updateWordSrs: first-try correct = good, wrong = again (requeued).
 */
const HANZI_WRITER_URL = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js';

const Review = {
  queue: [],
  index: 0,
  total: 0,
  stats: { correct: 0, wrong: 0, words: new Set() },
  mode: 'today',
  answered: false,
  _writer: null,

  words() {
    return (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
  },

  renderHub() {
    const hub = document.getElementById('review-hub');
    const sess = document.getElementById('review-session');
    if (this.active) return;
    if (hub) hub.hidden = false;
    if (sess) sess.hidden = true;
    ReviewScope.renderCard();
    if (typeof App !== 'undefined' && App.updateDashboardStats) App.updateDashboardStats();
  },

  /**
   * Words to practise when nothing is due: inside the learner's review scope, words already
   * studied come first (weakest first), topped up with the earliest unseen words of the scope.
   * Without a chosen scope, only lessons the learner has reached are used.
   */
  learnedPool(limit = 15) {
    const user = StorageManager.getCurrentUser();
    const progress = (user && user.wordProgress) || {};
    const scope = StorageManager.getReviewScope();
    const maxLesson = Math.max(1, ...((user && user.completedLessons) || []), (user && user.lastActiveLesson) || 1);
    let base = StorageManager.scopeWords(this.words(), scope).filter((w) => typeof w.lesson === 'number');
    if (!scope) base = base.filter((w) => w.lesson <= maxLesson);
    const weakest = (a, b) => ((progress[a.id] || {}).srsLevel || 0) - ((progress[b.id] || {}).srsLevel || 0) || Math.random() - 0.5;
    const seen = base.filter((w) => progress[w.id]).sort(weakest);
    const unseen = base.filter((w) => !progress[w.id]).sort((a, b) => a.lesson - b.lesson);
    return [...seen, ...unseen].slice(0, limit);
  },

  /** Start today's review. The first time, ask which courses / lessons to review. */
  startToday(skipPicker = false) {
    if (!skipPicker && !StorageManager.hasChosenScope()) {
      ReviewScope.openPicker(() => this.startToday(true));
      return;
    }
    const limit = (typeof Prefs !== 'undefined' && Prefs.data.newPerDay) || 10;
    const q = StorageManager.getReviewQueue(this.words(), limit);
    let words = q.all;
    if (!words.length) {
      words = this.learnedPool(12);
      if (words.length) App.toast(`Đã ôn hết thẻ đến hạn trong ${ReviewScope.label()}. Đây là lượt ôn thêm các từ yếu nhất.`, 'info', 3200);
    }
    this.begin(words, 'today');
  },

  startListening() {
    const pool = this.learnedPool(10);
    this.begin(pool, 'listen');
  },

  begin(words, mode) {
    if (!words.length) {
      App.toast(StorageManager.hasChosenScope() ? `Chưa có từ để ôn trong ${ReviewScope.label()}. Hãy đổi phạm vi ôn tập.` : 'Chưa có từ để ôn. Hãy học Bài 1 trước nhé.', 'info', 3200);
      return;
    }
    this.mode = mode;
    this.active = true;
    const progress = (StorageManager.getCurrentUser() || {}).wordProgress || {};
    this.queue = [];
    if (mode === 'listen') {
      words.forEach((w) => this.queue.push({ word: w, type: 'listen' }));
    } else {
      const known = words.filter((w) => progress[w.id]);
      const fresh = words.filter((w) => !progress[w.id]);
      known.forEach((w, i) => this.queue.push({ word: w, type: this.pickType(w, i) }));
      // New words: introduce, then quiz each one right after the next introduction
      fresh.forEach((w, i) => {
        this.queue.push({ word: w, type: 'intro' });
        if (i > 0) this.queue.push({ word: fresh[i - 1], type: (i - 1) % 2 ? 'listen' : 'meaning' });
      });
      if (fresh.length) this.queue.push({ word: fresh[fresh.length - 1], type: (fresh.length - 1) % 2 ? 'listen' : 'meaning' });
    }

    this.index = 0;
    this.total = this.queue.length;
    this.stats = { correct: 0, wrong: 0, words: new Set() };

    if (App.currentTab !== 'review') App.navigateTo('review');
    const hub = document.getElementById('review-hub');
    const sess = document.getElementById('review-session');
    if (hub) hub.hidden = true;
    if (sess) sess.hidden = false;
    this.render();
  },

  pickType(w, i) {
    const single = [...w.hanzi].filter((c) => /[一-龥]/.test(c)).length === 1;
    const types = ['flip', 'meaning', 'listen', 'reverse'];
    if (single) types.push('write');
    return types[i % types.length];
  },

  exit(rerender = true) {
    this.active = false;
    this._writer = null;
    if (typeof AudioEngine !== 'undefined' && AudioEngine.stop) AudioEngine.stop();
    if (rerender) this.renderHub();
  },

  current() {
    return this.queue[this.index];
  },

  choices(word, field) {
    const pool = this.words().filter((w) => w.id !== word.id && w[field] && w[field] !== word[field]);
    const sameLevel = pool.filter((w) => w.hsk === word.hsk);
    const src = sameLevel.length >= 3 ? sameLevel : pool;
    const picked = new Set();
    const out = [];
    while (out.length < 3 && picked.size < src.length) {
      const c = src[Math.floor(Math.random() * src.length)];
      if (!picked.has(c.id) && !out.some((o) => o[field] === c[field])) { out.push(c); }
      picked.add(c.id);
    }
    return [...out, word].sort(() => Math.random() - 0.5);
  },

  render() {
    const sess = document.getElementById('review-session');
    if (!sess) return;
    const item = this.current();
    if (!item) { this.renderSummary(); return; }
    this.answered = false;
    const w = item.word;
    const pct = Math.round((this.index / this.total) * 100);
    const esc = UI.esc.bind(UI);
    const typeLabel = { intro: 'Từ mới', flip: 'Lật thẻ', meaning: 'Chọn nghĩa', reverse: 'Chọn chữ Hán', listen: 'Nghe và chọn', write: 'Viết chữ' }[item.type];

    let body = '';
    let footer = '';
    if (item.type === 'intro') {
      body = `
        <div class="rv-card">
          <span class="rv-tag">Từ mới · Bài ${w.lesson}</span>
          <div class="rv-hanzi hanzi">${w.hanzi}</div>
          <div class="rv-py py">${Tone.html(w.pinyin)}</div>
          <div class="rv-mean">${esc(w.meaning)}</div>
          ${w.hanviet ? `<span class="hv-badge hv-lg">${esc(w.hanviet)}</span>` : ''}
          ${Notes.mnemonic(w.id) ? `<div class="fc-mnemonic">${Icon.svg('bulb')}<span>${esc(Notes.mnemonic(w.id))}</span></div>` : ''}
          <button class="icon-btn icon-btn-primary rv-sound" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')" aria-label="Nghe lại">${Icon.svg('sound')}</button>
        </div>`;
      footer = `<button class="btn btn-primary btn-block" onclick="Review.introDone()">Đã ghi nhớ, tiếp tục</button>`;
    } else if (item.type === 'flip') {
      body = `
        <div class="rv-card rv-flip" onclick="Review.reveal()">
          <span class="rv-tag">Bài ${w.lesson}</span>
          <div class="rv-hanzi hanzi">${w.hanzi}</div>
          <div class="rv-back" id="rv-back" hidden>
            <div class="rv-py py">${Tone.html(w.pinyin)}</div>
            <div class="rv-mean">${esc(w.meaning)}</div>
            ${w.hanviet ? `<span class="hv-badge hv-lg">${esc(w.hanviet)}</span>` : ''}
          </div>
          <p class="rv-hint" id="rv-hint">Nhớ nghĩa và cách đọc, rồi chạm để kiểm tra</p>
        </div>`;
      const fmt = (d) => (d <= 0 ? '10 phút' : `${d} ngày`);
      footer = `
        <button class="btn btn-primary btn-block" id="rv-reveal-btn" onclick="Review.reveal()">Xem đáp án</button>
        <div class="grades" id="rv-grades" hidden>
          <button class="grade g-again" onclick="Review.grade('again')"><b>Quên</b><small>${fmt(0)}</small></button>
          <button class="grade g-hard" onclick="Review.grade('hard')"><b>Khó</b><small>${fmt(StorageManager.previewInterval(w.id, 'hard'))}</small></button>
          <button class="grade g-good" onclick="Review.grade('good')"><b>Nhớ</b><small>${fmt(StorageManager.previewInterval(w.id, 'good'))}</small></button>
          <button class="grade g-easy" onclick="Review.grade('easy')"><b>Dễ</b><small>${fmt(StorageManager.previewInterval(w.id, 'easy'))}</small></button>
        </div>`;
    } else if (item.type === 'write') {
      body = `
        <div class="rv-card">
          <span class="rv-tag">Viết chữ có nghĩa</span>
          <div class="rv-mean">${esc(w.meaning)}</div>
          <div class="rv-py py">${Tone.html(w.pinyin)}</div>
          <div class="rv-write-grid"><div class="migrid-lines"></div><div class="migrid-diagonal"></div><div id="rv-writer"></div></div>
          <p class="rv-hint" id="rv-write-msg">Viết từng nét theo đúng thứ tự. Sai 3 lần sẽ có gợi ý.</p>
        </div>`;
      footer = `<button class="btn btn-outline btn-block" onclick="Review.writeGiveUp()">Không nhớ, xem cách viết</button>`;
    } else {
      // multiple choice: meaning / reverse / listen
      const field = item.type === 'meaning' ? 'meaning' : 'hanzi';
      const opts = this.choices(w, field);
      this._correctId = w.id;
      const prompt = item.type === 'meaning'
        ? `<div class="rv-hanzi hanzi">${w.hanzi}</div><button class="icon-btn rv-sound" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')" aria-label="Nghe">${Icon.svg('sound')}</button>`
        : item.type === 'reverse'
          ? `<div class="rv-mean rv-mean-lg">${esc(w.meaning)}</div>${w.hanviet ? `<span class="hv-badge">${esc(w.hanviet)}</span>` : ''}`
          : `<button class="rv-listen" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')" aria-label="Nghe lại">${Icon.svg('sound')}</button><p class="rv-hint">Chạm để nghe lại</p>`;
      body = `
        <div class="rv-card">
          <span class="rv-tag">${typeLabel}</span>
          ${prompt}
        </div>
        <div class="rv-options ${field === 'hanzi' ? 'rv-options-hanzi' : ''}">
          ${opts.map((o) => `<button class="rv-opt ${field === 'hanzi' ? 'hanzi' : ''}" data-id="${o.id}" onclick="Review.choose('${o.id}', this)">${esc(o[field])}</button>`).join('')}
        </div>`;
      footer = '';
    }

    sess.innerHTML = `
      <div class="rv-top">
        <button class="icon-btn" onclick="Review.exit()" aria-label="Thoát lượt ôn">${Icon.svg('x')}</button>
        <div class="meter rv-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <span class="rv-count">${this.index + 1}/${this.total}</span>
      </div>
      <div class="rv-body">${body}</div>
      <div class="rv-feedback" id="rv-feedback" aria-live="polite"></div>
      <div class="rv-footer" id="rv-footer">${footer}</div>
    `;

    // Audio-first exercises play immediately (we are inside the user's tap)
    if (item.type === 'listen' || item.type === 'intro' || item.type === 'meaning') AudioEngine.speak(w.hanzi);
    if (item.type === 'write') this.mountWriter(w);
  },

  introDone() {
    const item = this.current();
    if (item) {
      this.stats.words.add(item.word.id);
      StorageManager.updateWordSrs(item.word.id, 'hard'); // registers firstSeen, due again tomorrow
    }
    this.advance();
  },

  reveal() {
    const back = document.getElementById('rv-back');
    if (!back || !back.hidden) return;
    back.hidden = false;
    const hint = document.getElementById('rv-hint');
    if (hint) hint.hidden = true;
    const btn = document.getElementById('rv-reveal-btn');
    if (btn) btn.hidden = true;
    const grades = document.getElementById('rv-grades');
    if (grades) grades.hidden = false;
    const item = this.current();
    if (item) AudioEngine.speak(item.word.hanzi);
  },

  grade(quality) {
    const item = this.current();
    if (!item) return;
    StorageManager.updateWordSrs(item.word.id, quality);
    this.stats.words.add(item.word.id);
    if (quality === 'again') {
      this.stats.wrong++;
      this.queue.push({ word: item.word, type: 'meaning' });
      this.total = this.queue.length;
      AudioEngine.playWrongSound();
    } else {
      this.stats.correct++;
      AudioEngine.playCorrectSound();
    }
    this.advance();
  },

  choose(id, btn) {
    if (this.answered) return;
    this.answered = true;
    const item = this.current();
    const w = item.word;
    const ok = id === w.id;
    document.querySelectorAll('.rv-opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === w.id) b.classList.add('correct');
    });
    if (!ok && btn) btn.classList.add('wrong');
    this.stats.words.add(w.id);
    if (ok) {
      this.stats.correct++;
      AudioEngine.playCorrectSound();
      StorageManager.updateWordSrs(w.id, 'good');
    } else {
      this.stats.wrong++;
      AudioEngine.playWrongSound();
      StorageManager.updateWordSrs(w.id, 'again');
      this.queue.push({ word: w, type: 'flip' });
      this.total = this.queue.length;
    }
    if (item.type === 'listen' || item.type === 'reverse') AudioEngine.speak(w.hanzi);
    this.showFeedback(ok, w);
  },

  showFeedback(ok, w) {
    const fb = document.getElementById('rv-feedback');
    if (fb) {
      fb.className = `rv-feedback ${ok ? 'ok' : 'bad'}`;
      fb.innerHTML = `
        <div class="rv-fb-head">${Icon.svg(ok ? 'check' : 'x')}<b>${ok ? 'Chính xác' : 'Chưa đúng, sẽ ôn lại cuối lượt'}</b></div>
        <div class="rv-fb-word"><span class="hanzi">${w.hanzi}</span> <span class="py">${Tone.html(w.pinyin)}</span> · ${UI.esc(w.meaning)}
        ${w.hanviet ? `<span class="hv-badge">${UI.esc(w.hanviet)}</span>` : ''}</div>`;
    }
    const footer = document.getElementById('rv-footer');
    if (footer) {
      footer.innerHTML = `<button class="btn ${ok ? 'btn-primary' : 'btn-outline'} btn-block" id="rv-next" onclick="Review.advance()">Tiếp tục</button>`;
      const next = document.getElementById('rv-next');
      if (next && next.focus) next.focus();
    }
  },

  loadWriterLib() {
    if (typeof HanziWriter !== 'undefined') return Promise.resolve(true);
    return UI.loadScript(HANZI_WRITER_URL).then(() => typeof HanziWriter !== 'undefined').catch(() => false);
  },

  mountWriter(w) {
    const ch = [...w.hanzi].find((c) => /[一-龥]/.test(c));
    this.loadWriterLib().then((ok) => {
      const target = document.getElementById('rv-writer');
      if (!target || this.current() == null || this.current().word.id !== w.id) return;
      if (!ok) {
        // Library unavailable (offline): fall back to a choice question
        this.queue[this.index] = { word: w, type: 'reverse' };
        this.render();
        return;
      }
      const size = Math.min(240, (target.parentElement && target.parentElement.clientWidth) || 240);
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      target.innerHTML = '';
      this._writer = HanziWriter.create('rv-writer', ch, {
        width: size, height: size, padding: 14, showCharacter: false, showOutline: false,
        strokeColor: dark ? '#f1f5f9' : '#1d1a1f', drawingColor: '#d93829', highlightColor: '#059669', outlineColor: dark ? '#334155' : '#e7e1dd'
      });
      let mistakes = 0;
      this._writer.quiz({
        showHintAfterMisses: 3,
        onMistake: () => { mistakes++; },
        onComplete: () => {
          if (this.answered) return;
          this.answered = true;
          const ok = mistakes <= 3;
          this.stats.words.add(w.id);
          StorageManager.recordDailyAction('writing', 1);
          if (ok) { this.stats.correct++; AudioEngine.playCorrectSound(); StorageManager.updateWordSrs(w.id, mistakes === 0 ? 'easy' : 'good'); }
          else { this.stats.wrong++; AudioEngine.playWrongSound(); StorageManager.updateWordSrs(w.id, 'again'); }
          AudioEngine.speak(w.hanzi);
          this.showFeedback(ok, w);
        }
      });
    });
  },

  writeGiveUp() {
    const item = this.current();
    if (!item || this.answered) return;
    this.answered = true;
    if (this._writer && this._writer.showCharacter) {
      this._writer.cancelQuiz();
      this._writer.showOutline();
      this._writer.animateCharacter();
    }
    this.stats.wrong++;
    this.stats.words.add(item.word.id);
    StorageManager.updateWordSrs(item.word.id, 'again');
    AudioEngine.speak(item.word.hanzi);
    this.showFeedback(false, item.word);
  },

  advance() {
    this.index++;
    this._writer = null;
    if (this.index >= this.queue.length) this.renderSummary();
    else this.render();
  },

  renderSummary() {
    const sess = document.getElementById('review-session');
    this.active = false;
    const total = this.stats.correct + this.stats.wrong;
    const pct = total ? Math.round(this.stats.correct / total * 100) : 100;
    AudioEngine.playVictorySound();
    StorageManager.addXP(10, 'Hoàn thành lượt ôn');
    if (sess) {
      sess.innerHTML = `
        <div class="rv-summary">
          <div class="summary-trophy">${Icon.svg('trophy')}</div>
          <h2>Xong lượt ôn${this.mode === 'listen' ? ' nghe' : ''}!</h2>
          <p class="muted-sm">Lịch ôn của ${this.stats.words.size} từ đã được cập nhật.</p>
          <div class="due-row">
            <div><b>${this.stats.words.size}</b><span>từ đã ôn</span></div>
            <div><b>${pct}%</b><span>trả lời đúng</span></div>
            <div><b>+10</b><span>XP</span></div>
          </div>
          <div class="rv-summary-actions">
            <button class="btn btn-primary btn-block" onclick="Review.exit(); App.navigateTo('home')">Về trang Hôm nay</button>
            <button class="btn btn-outline btn-block" onclick="Review.exit()">Luyện thêm dạng bài khác</button>
          </div>
        </div>`;
    }
    if (App.updateDashboardStats) App.updateDashboardStats();
  }
};

/**
 * ReviewScope: lets each learner choose which HSK courses (or specific lessons) to review,
 * instead of mixing every level together. Saved with the account via StorageManager.setReviewScope.
 */
const ReviewScope = {
  draft: null,

  lessons() {
    return (window.CHINESE_DATA && window.CHINESE_DATA.lessons) || [];
  },

  levels() {
    return [...new Set(this.lessons().map((l) => l.hsk))].sort();
  },

  /** Default selection for a learner who has not chosen yet: the levels of lessons they have reached. */
  suggested() {
    const user = StorageManager.getCurrentUser();
    const reached = new Set([...((user && user.completedLessons) || []), (user && user.lastActiveLesson) || 1]);
    const levels = [...new Set(this.lessons().filter((l) => reached.has(l.id)).map((l) => l.hsk))];
    return { levels: levels.length ? levels : [1], lessons: [] };
  },

  current() {
    return StorageManager.getReviewScope() || this.suggested();
  },

  /** Short human label, e.g. "HSK 1 + HSK 2" or "Bài 3, 4, 5". */
  label(scope = StorageManager.getReviewScope()) {
    if (!scope) return 'tất cả bài đã học';
    if (scope.lessons && scope.lessons.length) {
      const ids = scope.lessons;
      return ids.length > 4 ? `${ids.length} bài đã chọn` : `Bài ${ids.join(', ')}`;
    }
    if (scope.levels && scope.levels.length) return scope.levels.map((h) => `HSK ${h}`).join(' + ');
    return 'tất cả bài';
  },

  counts(scope) {
    const words = StorageManager.scopeWords((window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [], scope);
    const limit = (typeof Prefs !== 'undefined' && Prefs.data.newPerDay) || 10;
    const q = StorageManager.getReviewQueue(window.CHINESE_DATA.all_words, limit, scope);
    return { words: words.length, due: q.due.length, fresh: q.fresh.length };
  },

  isEmpty(scope) {
    return !(scope.lessons && scope.lessons.length) && !(scope.levels && scope.levels.length);
  },

  /** Picker markup bound to this.draft; `where` is 'card' (Review hub) or 'dialog'. */
  pickerHtml(where) {
    const d = this.draft;
    const byLesson = d.lessons.length > 0;
    const words = (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
    const levelChips = this.levels().map((h) => {
      const n = words.filter((w) => w.hsk === h).length;
      const lessonIds = this.lessons().filter((l) => l.hsk === h).map((l) => l.id);
      const on = !byLesson && d.levels.includes(h);
      const partial = byLesson && lessonIds.some((id) => d.lessons.includes(id));
      return `<button type="button" class="scope-chip ${on ? 'on' : ''} ${partial ? 'partial' : ''}" aria-pressed="${on}" aria-label="HSK ${h}, bài ${Math.min(...lessonIds)} đến ${Math.max(...lessonIds)}, ${n} từ" onclick="ReviewScope.toggleLevel(${h}, '${where}')">
        <span class="scope-check">${on ? Icon.svg('check') : ''}</span><span><b>HSK ${h}</b><small>Bài ${Math.min(...lessonIds)}–${Math.max(...lessonIds)} · ${n} từ</small></span></button>`;
    }).join('');
    const lessonGroups = this.levels().map((h) => `
      <div class="scope-group">
        <div class="scope-group-head"><b>HSK ${h}</b>
          <button type="button" class="btn-ghost btn-sm" onclick="ReviewScope.selectLessons(${h}, true, '${where}')">Chọn cả khóa</button>
          <button type="button" class="btn-ghost btn-sm" onclick="ReviewScope.selectLessons(${h}, false, '${where}')">Bỏ chọn</button></div>
        <div class="scope-lessons">${this.lessons().filter((l) => l.hsk === h).map((l) => {
          const on = byLesson ? d.lessons.includes(l.id) : d.levels.includes(h);
          return `<label class="scope-lesson ${on ? 'on' : ''}"><input type="checkbox" ${on ? 'checked' : ''} aria-label="Bài ${l.id}: ${UI.esc(l.title)}" onchange="ReviewScope.toggleLesson(${l.id}, this.checked, '${where}')"><span class="sl-num">${l.id}</span><span class="sl-title hanzi">${l.zh_title}</span></label>`;
        }).join('')}</div>
      </div>`).join('');
    const empty = this.isEmpty(d);
    const c = empty ? { words: 0, due: 0, fresh: 0 } : this.counts(d);
    return `
      <div class="scope-chips" role="group" aria-label="Chọn khóa HSK">${levelChips}</div>
      <details class="scope-details" ${byLesson ? 'open' : ''}>
        <summary>Hoặc chọn từng bài cụ thể${byLesson ? ` · đang chọn ${d.lessons.length} bài` : ''}</summary>
        ${lessonGroups}
      </details>
      <p class="scope-summary ${empty ? 'warn' : ''}" aria-live="polite">${empty
        ? 'Hãy chọn ít nhất một khóa hoặc một bài.'
        : `Phạm vi: <b>${UI.esc(this.label(d))}</b> · ${c.words} từ · <b>${c.due}</b> thẻ đến hạn · <b>${c.fresh}</b> từ mới hôm nay`}</p>`;
  },

  rerender(where) {
    if (where === 'dialog') {
      const body = document.getElementById('scope-dialog-body');
      if (body) body.innerHTML = this.pickerHtml('dialog');
      const start = document.getElementById('scope-dialog-start');
      if (start) start.disabled = this.isEmpty(this.draft);
    } else {
      // Inline card saves immediately
      if (!this.isEmpty(this.draft)) StorageManager.setReviewScope(this.draft);
      this.renderCard();
      if (App.updateDashboardStats) App.updateDashboardStats();
    }
  },

  toggleLevel(h, where) {
    const d = this.draft;
    if (d.lessons.length) { d.lessons = []; d.levels = [h]; }
    else if (d.levels.includes(h)) d.levels = d.levels.filter((x) => x !== h);
    else d.levels = [...d.levels, h].sort();
    this.rerender(where);
  },

  /** Switch to lesson mode, starting from the lessons implied by the selected levels. */
  toLessonMode() {
    const d = this.draft;
    if (!d.lessons.length) d.lessons = this.lessons().filter((l) => d.levels.includes(l.hsk)).map((l) => l.id);
    d.levels = [];
  },

  toggleLesson(id, on, where) {
    this.toLessonMode();
    const d = this.draft;
    d.lessons = on ? [...new Set([...d.lessons, id])] : d.lessons.filter((x) => x !== id);
    this.normalise();
    this.rerender(where);
  },

  selectLessons(h, on, where) {
    this.toLessonMode();
    const ids = this.lessons().filter((l) => l.hsk === h).map((l) => l.id);
    const d = this.draft;
    d.lessons = on ? [...new Set([...d.lessons, ...ids])] : d.lessons.filter((x) => !ids.includes(x));
    this.normalise();
    this.rerender(where);
  },

  /** If the chosen lessons are exactly whole levels, store them as levels (shorter label). */
  normalise() {
    const d = this.draft;
    if (!d.lessons.length) return;
    const set = new Set(d.lessons);
    const full = this.levels().filter((h) => this.lessons().filter((l) => l.hsk === h).every((l) => set.has(l.id)));
    const covered = this.lessons().filter((l) => full.includes(l.hsk)).map((l) => l.id);
    if (covered.length === d.lessons.length) { d.levels = full; d.lessons = []; }
  },

  /** Inline card in the Review hub. */
  renderCard() {
    const el = document.getElementById('review-scope-card');
    if (!el) return;
    this.draft = JSON.parse(JSON.stringify(this.current()));
    el.innerHTML = `
      <div class="today-card-head"><h3>Phạm vi ôn tập</h3><span class="muted-sm">Lưu theo tài khoản</span></div>
      <p class="muted-sm">Chọn khóa hoặc bài bạn muốn ôn. Hàng đợi, luyện nghe và luyện thanh điệu chỉ lấy từ trong phạm vi này.</p>
      ${this.pickerHtml('card')}`;
  },

  /** Modal shown before the first review session. */
  openPicker(onStart) {
    this.draft = JSON.parse(JSON.stringify(this.current()));
    const wrap = document.createElement('div');
    wrap.className = 'dialog-backdrop';
    wrap.innerHTML = `
      <div class="dialog scope-dialog" role="dialog" aria-modal="true" aria-labelledby="scope-dialog-title">
        <h3 id="scope-dialog-title">Bạn muốn ôn phần nào?</h3>
        <p class="dialog-body">Chọn khóa HSK hoặc từng bài. Lựa chọn được lưu lại, đổi bất cứ lúc nào trong tab Ôn tập.</p>
        <div id="scope-dialog-body">${this.pickerHtml('dialog')}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn-outline" data-act="cancel">Để sau</button>
          <button type="button" class="btn btn-primary" id="scope-dialog-start" data-act="start" ${this.isEmpty(this.draft) ? 'disabled' : ''}>Bắt đầu ôn</button>
        </div>
      </div>`;
    const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 180); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) { close(); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'cancel') { close(); return; }
      if (b.dataset.act === 'start' && !this.isEmpty(this.draft)) {
        StorageManager.setReviewScope(this.draft);
        close();
        this.renderCard();
        if (onStart) onStart();
      }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
  }
};

if (typeof window !== 'undefined') {
  window.ReviewScope = ReviewScope;
  window.Review = Review;
}
