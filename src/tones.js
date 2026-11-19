/**
 * ToneDrill: tone perception training.
 *
 *   single  one-syllable words: hear it, pick tone 1-4
 *   pair    two-syllable words: pick the tone of each syllable (2nd may be neutral)
 *
 * Practice in pairs is the approach most Mandarin teachers recommend, because most words are
 * two syllables and each tone combination has its own contour. Words whose spoken tones differ
 * from the written ones (3+3 sandhi, 一, 不) are left out so the answer always matches what the
 * learner hears; those rules are explained in Kiến thức > Thanh điệu.
 *
 * Per-pair accuracy is kept on this device (localStorage) to surface the learner's weakest pairs.
 */
const ToneDrill = {
  STATS_KEY: 'hnm_tone_stats_v1',
  SESSION: 10,
  mode: 'pair',
  items: [],
  index: 0,
  score: 0,
  picked: [],
  answered: false,

  /** SVG contour for a tone (1-5) drawn on the 5-level pitch scale. */
  contour(t, cls = '') {
    const paths = { 1: 'M4 6 H28', 2: 'M4 18 L28 6', 3: 'M4 14 Q14 30 28 8', 4: 'M4 6 L28 26', 5: 'M16 18 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0' };
    return `<svg class="tone-contour t${t} ${cls}" viewBox="0 0 32 32" aria-hidden="true"><path d="${paths[t] || paths[5]}"/></svg>`;
  },

  NAMES: { 1: 'Thanh 1 · ngang', 2: 'Thanh 2 · sắc', 3: 'Thanh 3 · hỏi', 4: 'Thanh 4 · huyền nặng', 5: 'Thanh nhẹ' },
  SHORT: { 1: 'Thanh 1', 2: 'Thanh 2', 3: 'Thanh 3', 4: 'Thanh 4', 5: 'Nhẹ' },

  loadStats() {
    try { return JSON.parse(localStorage.getItem(this.STATS_KEY)) || {}; } catch (e) { return {}; }
  },

  saveStat(key, ok) {
    const s = this.loadStats();
    s[key] = s[key] || { n: 0, ok: 0 };
    s[key].n++;
    if (ok) s[key].ok++;
    try { localStorage.setItem(this.STATS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  },

  /** Weakest tone pairs with at least 3 attempts, lowest accuracy first. */
  weakest(limit = 3) {
    return Object.entries(this.loadStats())
      .filter(([k, v]) => k.includes('-') && v.n >= 3)
      .map(([k, v]) => ({ key: k, acc: v.ok / v.n, n: v.n }))
      .sort((a, b) => a.acc - b.acc)
      .slice(0, limit);
  },

  /** Words usable for the drill, with their syllable tones. */
  pool(mode) {
    const words = (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
    const out = [];
    words.forEach((w) => {
      const chars = [...w.hanzi].filter((c) => /[一-龥]/.test(c));
      if (!w.pinyin || chars.some((c) => c === '一' || c === '不')) return;
      const syl = Tone.splitWord(w.pinyin.replace(/\s+/g, ''));
      if (!syl || syl.length !== chars.length) return;
      const tones = syl.map((s) => s.tone);
      if (mode === 'single' && chars.length === 1 && tones[0] <= 4) out.push({ word: w, tones });
      if (mode === 'pair' && chars.length === 2 && tones[0] <= 4 && !(tones[0] === 3 && tones[1] === 3)) out.push({ word: w, tones });
    });
    return out;
  },

  start(mode = 'pair') {
    this.mode = mode;
    const user = StorageManager.getCurrentUser();
    const maxLesson = Math.max(3, (user && user.lastActiveLesson) || 1, ...(((user && user.completedLessons) || [])));
    let pool = this.pool(mode);
    const reached = pool.filter((p) => typeof p.word.lesson === 'number' && p.word.lesson <= maxLesson);
    if (reached.length >= this.SESSION) pool = reached;

    // Bias towards the learner's weakest pairs
    const weak = new Set(this.weakest(3).map((w) => w.key));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const favoured = shuffled.filter((p) => weak.has(p.tones.join('-')));
    const rest = shuffled.filter((p) => !weak.has(p.tones.join('-')));
    this.items = [...favoured.slice(0, 4), ...rest].slice(0, this.SESSION).sort(() => Math.random() - 0.5);
    this.index = 0;
    this.score = 0;
    App.navigateTo('tones');
    this.render();
  },

  render() {
    const box = document.getElementById('tones-session');
    const hub = document.getElementById('tones-hub');
    if (!box) return;
    if (hub) hub.hidden = true;
    box.hidden = false;
    const item = this.items[this.index];
    if (!item) { this.renderSummary(); return; }
    this.picked = item.tones.map(() => 0);
    this.answered = false;
    const n = item.tones.length;
    const rows = item.tones.map((_, si) => `
      <div class="tone-row">
        ${n > 1 ? `<span class="tone-row-label">Âm tiết ${si + 1}</span>` : ''}
        <div class="tone-btns">
          ${[1, 2, 3, 4].concat(si > 0 ? [5] : []).map((t) => `
            <button class="tone-btn" data-s="${si}" data-t="${t}" onclick="ToneDrill.pick(${si}, ${t})" aria-label="${this.NAMES[t]}">
              ${this.contour(t)}<span>${this.SHORT[t]}</span>
            </button>`).join('')}
        </div>
      </div>`).join('');

    box.innerHTML = `
      <div class="rv-top">
        <button class="icon-btn" onclick="ToneDrill.exit()" aria-label="Thoát">${Icon.svg('x')}</button>
        <div class="meter rv-meter" aria-hidden="true"><i style="width:${Math.round(this.index / this.items.length * 100)}%"></i></div>
        <span class="rv-count">${this.index + 1}/${this.items.length}</span>
      </div>
      <div class="rv-card tone-card">
        <span class="rv-tag">${n > 1 ? 'Cặp thanh' : 'Một âm tiết'}</span>
        <button class="rv-listen" onclick="ToneDrill.play()" aria-label="Nghe lại">${Icon.svg('sound')}</button>
        <p class="rv-hint" id="tone-hint">Nghe rồi chọn thanh${n > 1 ? ' cho từng âm tiết' : ''}. Chạm loa để nghe lại.</p>
        <div class="tone-reveal" id="tone-reveal" hidden></div>
      </div>
      <div class="tone-rows">${rows}</div>
      <div class="rv-feedback" id="tone-feedback" aria-live="polite"></div>
      <div class="rv-footer" id="tone-footer"></div>
    `;
    this.play();
  },

  play() {
    const item = this.items[this.index];
    if (item) AudioEngine.speak(item.word.hanzi);
  },

  pick(si, t) {
    if (this.answered) return;
    this.picked[si] = t;
    document.querySelectorAll(`.tone-btn[data-s="${si}"]`).forEach((b) => b.classList.toggle('sel', +b.dataset.t === t));
    if (this.picked.every((p) => p > 0)) this.check();
  },

  check() {
    const item = this.items[this.index];
    this.answered = true;
    const ok = item.tones.every((t, i) => t === this.picked[i]);
    if (ok) { this.score++; AudioEngine.playCorrectSound(); } else { AudioEngine.playWrongSound(); }
    this.saveStat(item.tones.join('-'), ok);
    item.tones.forEach((t) => this.saveStat(String(t), ok));

    document.querySelectorAll('.tone-btn').forEach((b) => {
      b.disabled = true;
      const s = +b.dataset.s;
      const t = +b.dataset.t;
      if (item.tones[s] === t) b.classList.add('correct');
      else if (this.picked[s] === t) b.classList.add('wrong');
    });
    const w = item.word;
    const reveal = document.getElementById('tone-reveal');
    if (reveal) {
      reveal.hidden = false;
      reveal.innerHTML = `
        <div class="rv-hanzi hanzi">${w.hanzi}</div>
        <div class="rv-py py">${Tone.html(w.pinyin)}</div>
        <div class="tone-contours">${item.tones.map((t) => this.contour(t, 'lg')).join('')}</div>
        <div class="rv-mean">${UI.esc(w.meaning)}</div>`;
    }
    const hint = document.getElementById('tone-hint');
    if (hint) hint.hidden = true;
    const fb = document.getElementById('tone-feedback');
    if (fb) {
      fb.className = `rv-feedback ${ok ? 'ok' : 'bad'}`;
      fb.innerHTML = `<div class="rv-fb-head">${Icon.svg(ok ? 'check' : 'x')}<b>${ok ? 'Chính xác' : `Đáp án: ${item.tones.map((t) => this.SHORT[t]).join(' + ')}`}</b></div>`;
    }
    const footer = document.getElementById('tone-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="ToneDrill.play()">${Icon.svg('sound')}<span>Nghe lại</span></button>
        <button class="btn btn-primary" id="tone-next" onclick="ToneDrill.next()">Tiếp tục</button>`;
      footer.classList.add('rv-footer-2');
    }
  },

  next() {
    this.index++;
    this.render();
  },

  renderSummary() {
    const box = document.getElementById('tones-session');
    const pct = Math.round(this.score / Math.max(1, this.items.length) * 100);
    AudioEngine.playVictorySound();
    StorageManager.addXP(10, 'Luyện thanh điệu');
    StorageManager.recordDailyAction('speech', 1);
    const weak = this.weakest(3);
    box.innerHTML = `
      <div class="rv-summary">
        <div class="summary-trophy">${Icon.svg('trophy')}</div>
        <h2>${pct >= 80 ? 'Tai nghe rất tốt!' : 'Xong lượt luyện thanh'}</h2>
        <div class="due-row">
          <div><b>${this.score}/${this.items.length}</b><span>câu đúng</span></div>
          <div><b>${pct}%</b><span>chính xác</span></div>
          <div><b>+10</b><span>XP</span></div>
        </div>
        ${weak.length ? `<p class="muted-sm">Cặp thanh bạn hay nhầm: ${weak.map((w) => `<b>${w.key.replace('-', '+').replace('5', 'nhẹ')}</b> (${Math.round(w.acc * 100)}%)`).join(', ')}. Lượt sau sẽ ưu tiên các cặp này.</p>` : ''}
        <div class="rv-summary-actions">
          <button class="btn btn-primary btn-block" onclick="ToneDrill.start('${this.mode}')">Luyện thêm 10 câu</button>
          <button class="btn btn-outline btn-block" onclick="ToneDrill.exit()">Về trang Luyện thanh điệu</button>
        </div>
      </div>`;
  },

  exit() {
    const box = document.getElementById('tones-session');
    const hub = document.getElementById('tones-hub');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    if (hub) hub.hidden = false;
    this.renderHub();
  },

  renderHub() {
    const el = document.getElementById('tones-stats');
    if (!el) return;
    const s = this.loadStats();
    const cell = (k) => {
      const v = s[k];
      if (!v) return '<span class="tp-cell tp-none">–</span>';
      const acc = Math.round(v.ok / v.n * 100);
      return `<span class="tp-cell ${acc >= 80 ? 'tp-good' : acc >= 50 ? 'tp-mid' : 'tp-bad'}" title="${v.ok}/${v.n} câu đúng">${acc}%</span>`;
    };
    el.innerHTML = `
      <div class="tp-grid" role="table" aria-label="Độ chính xác theo cặp thanh">
        <span class="tp-head" role="columnheader">1 \\ 2</span>
        ${[1, 2, 3, 4, 5].map((b) => `<span class="tp-head" role="columnheader">${b === 5 ? 'nhẹ' : b}</span>`).join('')}
        ${[1, 2, 3, 4].map((a) => `<span class="tp-head" role="rowheader">${a}</span>${[1, 2, 3, 4, 5].map((b) => (a === 3 && b === 3 ? '<span class="tp-cell tp-none" title="3+3 đọc thành 2+3">2+3</span>' : cell(`${a}-${b}`))).join('')}`).join('')}
      </div>
      <p class="muted-sm">Ô trống là cặp chưa luyện. Hàng là thanh của âm tiết đầu, cột là âm tiết sau.</p>`;
  }
};

if (typeof window !== 'undefined') {
  window.ToneDrill = ToneDrill;
}
