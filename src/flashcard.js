/**
 * 3D Flashcard & SRS Controller
 */
const FlashcardController = {
  words: [],
  currentIndex: 0,
  isFlipped: false,

  init(words) {
    this.words = words || [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.render();
    this.setupListeners();
  },

  scope: 'all',

  /** 'due' = today's spaced-repetition queue (due + new words); anything else keeps the given list. */
  setScope(scope) {
    this.scope = scope;
    const sel = document.getElementById('fc-scope-select');
    if (sel && sel.value !== scope) sel.value = scope;
    if (scope === 'due') this.refreshDue();
  },

  refreshDue() {
    if (this.scope !== 'due' || !window.CHINESE_DATA) return;
    const limit = (typeof Prefs !== 'undefined' && Prefs.data.newPerDay) || 10;
    const q = StorageManager.getReviewQueue(window.CHINESE_DATA.all_words, limit);
    this.words = q.all;
    this.currentIndex = 0;
    this.isFlipped = false;
    this.render();
  },

  setWords(filteredWords) {
    if (this.scope === 'due' && filteredWords !== this.words) this.scope = 'custom';
    this.words = filteredWords;
    this.currentIndex = 0;
    this.isFlipped = false;
    this.render();
  },

  getCurrentWord() {
    if (!this.words.length) return null;
    return this.words[this.currentIndex];
  },

  flip() {
    this.isFlipped = !this.isFlipped;
    const cardEl = document.getElementById('main-flashcard');
    if (cardEl) {
      if (this.isFlipped) {
        cardEl.classList.add('flipped');
        AudioEngine.playClickSound();
        // Auto-speak on flip if back face shown
        const w = this.getCurrentWord();
        if (w) AudioEngine.speak(w.hanzi);
      } else {
        cardEl.classList.remove('flipped');
      }
    }
  },

  next() {
    if (this.currentIndex < this.words.length - 1) {
      this.currentIndex++;
      this.isFlipped = false;
      this.render();
    }
  },

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.isFlipped = false;
      this.render();
    }
  },

  rateSRS(quality) {
    const w = this.getCurrentWord();
    if (w) {
      StorageManager.updateWordSrs(w.id, quality);
      if (this.scope === 'due' && quality !== 'again') {
        // Remove from today's queue; "again" stays and comes back at the end
        this.words.splice(this.currentIndex, 1);
        this.currentIndex = Math.min(this.currentIndex, Math.max(0, this.words.length - 1));
        this.isFlipped = false;
        if (quality === 'again') AudioEngine.playWrongSound(); else AudioEngine.playCorrectSound();
        this.render();
        return;
      }
      if (this.scope === 'due' && quality === 'again') {
        this.words.push(this.words.splice(this.currentIndex, 1)[0]);
        AudioEngine.playWrongSound();
        this.isFlipped = false;
        this.render();
        return;
      }
      if (quality === 'again') {
        AudioEngine.playWrongSound();
      } else {
        AudioEngine.playCorrectSound();
      }
    }
    this.next();
  },

  toggleBookmark() {
    const w = this.getCurrentWord();
    if (!w) return;
    const isNowBookmarked = StorageManager.toggleBookmark(w.id);
    const favBtn = document.getElementById('flashcard-fav-btn');
    if (favBtn) {
      favBtn.classList.toggle('active', isNowBookmarked);
      favBtn.innerHTML = Icon.svg(isNowBookmarked ? 'starFill' : 'star');
    }
    AudioEngine.playClickSound();
  },

  render() {
    const cardEl = document.getElementById('main-flashcard');
    const counterEl = document.getElementById('flashcard-counter');
    const progressFill = document.getElementById('flashcard-progress-fill');

    if (!this.words.length) {
      if (cardEl) {
        cardEl.innerHTML = this.scope === 'due' ? `
          <div class="flashcard-face fc-empty">
            <div class="fc-empty-icon">${Icon.svg('check')}</div>
            <b>Đã ôn xong hôm nay</b>
            <p>Không còn thẻ đến hạn. Học bài mới để thêm từ vào hàng đợi, hoặc chọn một bài ở ô phía trên để ôn thêm.</p>
          </div>` : `
          <div class="flashcard-face fc-empty"><p>Không có từ vựng nào trong danh mục này.</p></div>`;
      }
      if (counterEl) counterEl.innerText = '0 / 0';
      if (progressFill) progressFill.style.width = '100%';
      return;
    }

    const w = this.words[this.currentIndex];
    const isBookmarked = StorageManager.isBookmarked(w.id);

    if (counterEl) {
      counterEl.innerText = `${this.currentIndex + 1} / ${this.words.length}`;
    }
    if (progressFill) {
      progressFill.style.width = `${((this.currentIndex + 1) / this.words.length) * 100}%`;
    }

    const fmt = (d) => (d <= 0 ? '10 phút' : `${d} ngày`);
    const setInt = (id, q) => { const el = document.getElementById(id); if (el) el.innerText = fmt(StorageManager.previewInterval(w.id, q)); };
    setInt('srs-int-again', 'again');
    setInt('srs-int-good', 'good');
    setInt('srs-int-easy', 'easy');

    if (cardEl) {
      cardEl.classList.remove('flipped');
      this.isFlipped = false;

      cardEl.innerHTML = `
        <!-- FRONT -->
        <div class="flashcard-face flashcard-front">
          <span class="flashcard-badge">HSK ${w.hsk || 1} • Bài ${w.lesson}</span>
          <button id="flashcard-fav-btn" class="flashcard-fav ${isBookmarked ? 'active' : ''}" aria-label="Lưu vào Sổ tay" aria-pressed="${isBookmarked}">
            ${Icon.svg(isBookmarked ? 'starFill' : 'star')}
          </button>

          <div class="flashcard-hanzi">${w.hanzi}</div>

          <div class="fc-actions">
            <button id="flashcard-audio-btn" class="icon-btn icon-btn-primary" aria-label="Nghe phát âm">${Icon.svg('sound')}</button>
            <button id="flashcard-mic-btn" class="icon-btn" aria-label="Luyện phát âm với micro">${Icon.svg('mic')}</button>
          </div>

          <p class="flashcard-hint">Chạm thẻ hoặc nhấn phím cách để lật</p>
        </div>

        <!-- BACK -->
        <div class="flashcard-face flashcard-back">
          <span class="flashcard-badge">HSK ${w.hsk || 1} • Bài ${w.lesson}</span>
          
          <div class="flashcard-pinyin">${Tone.html(w.pinyin)}</div>
          ${w.hanviet ? `<span class="hv-badge hv-lg">${UI.esc(w.hanviet)}</span>` : ''}
          ${w.pos ? `<span class="flashcard-pos">${w.pos}</span>` : ''}
          <div class="flashcard-meaning">${w.meaning}</div>
          ${typeof Notes !== 'undefined' && Notes.mnemonic(w.id) ? `<div class="fc-mnemonic">${Icon.svg('bulb')}<span>${UI.esc(Notes.mnemonic(w.id))}</span></div>` : ''}
          ${w.example ? `<div class="flashcard-example" style="margin-top:0.65rem; font-size:0.85rem; color:var(--text-muted); font-style:italic; border-top:1px dashed var(--border); padding-top:0.45rem;">${typeof escapeHtml === 'function' ? escapeHtml(w.example) : w.example}</div>` : ''}

          <div style="display:flex; gap:0.5rem; margin-top:1rem;">
            <button id="flashcard-draw-btn" class="btn btn-outline btn-sm">${Icon.svg('pen')}<span>Luyện viết chữ này</span></button>
          </div>
        </div>
      `;

      // Setup event listeners inside card
      const favBtn = document.getElementById('flashcard-fav-btn');
      if (favBtn) {
        favBtn.onclick = (e) => {
          e.stopPropagation();
          this.toggleBookmark();
        };
      }

      const audioBtn = document.getElementById('flashcard-audio-btn');
      if (audioBtn) {
        audioBtn.onclick = (e) => {
          e.stopPropagation();
          AudioEngine.speak(w.hanzi);
        };
      }

      const micBtn = document.getElementById('flashcard-mic-btn');
      if (micBtn) {
        micBtn.onclick = (e) => {
          e.stopPropagation();
          AudioEngine.recognizeSpeech(w.hanzi);
        };
      }

      const drawBtn = document.getElementById('flashcard-draw-btn');
      if (drawBtn) {
        drawBtn.onclick = (e) => {
          e.stopPropagation();
          App.navigateTo('writer');
          HanziController.loadCharacter(w.hanzi);
        };
      }
    }
  },

  setupListeners() {
    const cardEl = document.getElementById('main-flashcard');
    if (cardEl) {
      cardEl.onclick = () => this.flip();
    }

    // Keyboard navigation
    if (this._keydownBound) return;
    this._keydownBound = true;
    window.addEventListener('keydown', (e) => {
      // Only trigger if flashcard view is active and no modal/input focused
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
      const flashcardView = document.getElementById('view-flashcard');
      if (!flashcardView || !flashcardView.classList.contains('active')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.flip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.next();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
      } else if (e.key === '1') {
        this.rateSRS('again');
      } else if (e.key === '2') {
        this.rateSRS('good');
      } else if (e.key === '3') {
        this.rateSRS('easy');
      } else if (e.key === 's' || e.key === 'S') {
        const w = this.getCurrentWord();
        if (w) AudioEngine.speak(w.hanzi);
      }
    });
  }
};

if (typeof window !== 'undefined') {
  window.FlashcardController = FlashcardController;
}
