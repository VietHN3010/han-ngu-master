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

  setWords(filteredWords) {
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
      favBtn.innerHTML = isNowBookmarked ? '★' : '☆';
    }
    AudioEngine.playClickSound();
  },

  render() {
    const cardEl = document.getElementById('main-flashcard');
    const counterEl = document.getElementById('flashcard-counter');
    const progressFill = document.getElementById('flashcard-progress-fill');

    if (!this.words.length) {
      if (cardEl) {
        cardEl.innerHTML = `
          <div class="flashcard-face">
            <p style="color:var(--text-secondary); font-size:1.1rem;">Không có từ vựng nào trong danh mục này.</p>
          </div>
        `;
      }
      if (counterEl) counterEl.innerText = '0 / 0';
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

    if (cardEl) {
      cardEl.classList.remove('flipped');
      this.isFlipped = false;

      cardEl.innerHTML = `
        <!-- FRONT -->
        <div class="flashcard-face flashcard-front">
          <span class="flashcard-badge">HSK ${w.hsk || 1} • Bài ${w.lesson}</span>
          <button id="flashcard-fav-btn" class="flashcard-fav ${isBookmarked ? 'active' : ''}" title="Yêu thích / Đánh dấu">
            ${isBookmarked ? '★' : '☆'}
          </button>
          
          <div class="flashcard-hanzi">${w.hanzi}</div>
          
          <button id="flashcard-audio-btn" class="btn-speaker" title="Phát âm" style="margin-top:0.5rem; font-size:1.4rem;">
            🔊
          </button>

          <p class="flashcard-hint">
            <span>💡 Nhấn vào thẻ hoặc nhấn Phím Cách (Space) để lật</span>
          </p>
        </div>

        <!-- BACK -->
        <div class="flashcard-face flashcard-back">
          <span class="flashcard-badge">HSK ${w.hsk || 1} • Bài ${w.lesson}</span>
          
          <div class="flashcard-pinyin">${w.pinyin}</div>
          <div class="flashcard-hanviet">Hán Việt: ${w.hanviet || '—'}</div>
          ${w.pos ? `<span class="flashcard-pos">${w.pos}</span>` : ''}
          <div class="flashcard-meaning">${w.meaning}</div>

          <div style="display:flex; gap:0.5rem; margin-top:1rem;">
            <button id="flashcard-draw-btn" class="btn btn-outline btn-sm">
              ✍️ Luyện viết chữ này
            </button>
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
