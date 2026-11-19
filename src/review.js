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
    if (typeof App !== 'undefined' && App.updateDashboardStats) App.updateDashboardStats();
  },

  /** Words the learner has already met (lessons reached), weakest first. */
  learnedPool(limit = 15) {
    const user = StorageManager.getCurrentUser();
    const progress = (user && user.wordProgress) || {};
    const maxLesson = Math.max(1, ...((user && user.completedLessons) || []), (user && user.lastActiveLesson) || 1);
    return this.words()
      .filter((w) => typeof w.lesson === 'number' && w.lesson <= maxLesson)
      .sort((a, b) => ((progress[a.id] || {}).srsLevel || 0) - ((progress[b.id] || {}).srsLevel || 0) || Math.random() - 0.5)
      .slice(0, limit);
  },

  startToday() {
    const limit = (typeof Prefs !== 'undefined' && Prefs.data.newPerDay) || 10;
    const q = StorageManager.getReviewQueue(this.words(), limit);
    let words = q.all;
    if (!words.length) {
      words = this.learnedPool(12);
      App.toast('Đã ôn hết thẻ đến hạn. Đây là lượt ôn thêm các từ yếu nhất.', 'info', 3200);
    }
    this.begin(words, 'today');
  },

  startListening() {
    const pool = this.learnedPool(10);
    this.begin(pool, 'listen');
  },

  begin(words, mode) {
    if (!words.length) {
      App.toast('Chưa có từ để ôn. Hãy học Bài 1 trước nhé.', 'info');
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

if (typeof window !== 'undefined') {
  window.Review = Review;
}
