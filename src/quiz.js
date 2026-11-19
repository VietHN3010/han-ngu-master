/**
 * Interactive Quiz System: 4 Modes with Smart Distractors & Results Breakdown
 */
const QuizController = {
  allWords: [],
  quizPool: [],
  currentQuestions: [],
  currentIndex: 0,
  score: 0,
  mode: 'hanzi_to_vi', // 'hanzi_to_vi', 'hanzi_to_pinyin', 'listen_to_hanzi', 'vi_to_hanzi'
  selectedOptionIndex: null,
  isAnswered: false,
  missedQuestions: [],

  init(allWords) {
    this.allWords = allWords || [];
  },

  /** One-tap presets: 'recent' = 10 meaning questions from the current lesson and the ones before it. */
  quickStart(kind) {
    const user = StorageManager.getCurrentUser();
    const last = (user && user.lastActiveLesson) || 1;
    if (kind === 'listen') {
      this.startQuiz({ scope: 'lesson_' + last, count: 10, mode: 'listen_to_hanzi', maxLesson: last });
    } else {
      this.startQuiz({ scope: 'upto_' + last, count: 10, mode: 'hanzi_to_vi' });
    }
  },

  startQuiz(options = {}) {
    const scope = options.scope || 'all'; // 'all', 'hsk1', 'hsk2', 'lesson_X', 'bookmarks'
    const count = parseInt(options.count || 10, 10);
    this.mode = options.mode || 'hanzi_to_vi';

    // Filter words according to scope
    let pool = [...this.allWords];
    if (scope === 'hsk1') {
      pool = pool.filter(w => w.hsk === 1);
    } else if (scope === 'hsk2') {
      pool = pool.filter(w => w.hsk === 2);
    } else if (scope.startsWith('upto_')) {
      const maxL = parseInt(scope.replace('upto_', ''), 10);
      pool = pool.filter(w => typeof w.lesson === 'number' && w.lesson <= maxL);
    } else if (scope.startsWith('lesson_')) {
      const lNum = parseInt(scope.replace('lesson_', ''), 10);
      pool = pool.filter(w => w.lesson === lNum);
    } else if (scope === 'bookmarks') {
      pool = pool.filter(w => StorageManager.isBookmarked(w.id));
    }

    if (pool.length === 0) {
      App.toast('Không có từ nào trong phạm vi này. Hãy chọn phạm vi khác.', 'warning');
      return;
    }

    // Shuffle pool and pick questions
    this.quizPool = pool;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, Math.min(count, pool.length));

    // Generate questions with 4 distinct choices
    this.currentQuestions = selectedWords.map(word => {
      // Find 3 distractors (prefer from pool, fallback to allWords)
      let candidateDistractors = pool.filter(w => w.id !== word.id);
      if (candidateDistractors.length < 3) {
        candidateDistractors = this.allWords.filter(w => w.id !== word.id);
      }
      const otherWords = candidateDistractors.sort(() => 0.5 - Math.random()).slice(0, 3);
      const choices = [word, ...otherWords].sort(() => 0.5 - Math.random());
      const correctIdx = choices.findIndex(c => c.id === word.id);

      return {
        word,
        choices,
        correctIdx
      };
    });

    this.currentIndex = 0;
    this.score = 0;
    this.missedQuestions = [];
    this.isAnswered = false;

    const setupView = document.getElementById('quiz-setup-view');
    const resultsView = document.getElementById('quiz-results-view');
    const playView = document.getElementById('quiz-play-view');
    if (setupView) setupView.style.display = 'none';
    if (resultsView) resultsView.style.display = 'none';
    if (playView) playView.style.display = 'block';

    this.renderQuestion();
  },

  renderQuestion() {
    this.isAnswered = false;
    if (!this.currentQuestions || this.currentQuestions.length === 0) return;
    const q = this.currentQuestions[this.currentIndex];
    if (!q) return;
    const total = this.currentQuestions.length;

    // Update progress safely
    const curNum = document.getElementById('quiz-current-num');
    if (curNum) curNum.innerText = this.currentIndex + 1;
    const totNum = document.getElementById('quiz-total-num');
    if (totNum) totNum.innerText = total;
    const liveScore = document.getElementById('quiz-live-score');
    if (liveScore) liveScore.innerText = this.score;

    // Support both quiz-progress-fill and quiz-progress-bar
    const progressBar = document.getElementById('quiz-progress-fill') || document.getElementById('quiz-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${((this.currentIndex) / total) * 100}%`;
    }

    const promptCard = document.getElementById('quiz-prompt-area');
    const optionsContainer = document.getElementById('quiz-options-grid');
    const nextBtn = document.getElementById('quiz-next-btn');
    if (nextBtn) nextBtn.style.display = 'none';

    if (!promptCard || !optionsContainer) return;

    // Render prompt based on mode
    const cleanHanzi = q.word.hanzi;
    const cleanMeaning = (q.word.meaning || '').replace(/\s+,/g, ',');
    const cleanPinyin = q.word.pinyin || '';
    const cleanHanviet = q.word.hanviet || '—';

    if (this.mode === 'hanzi_to_vi') {
      promptCard.innerHTML = `
        <div class="quiz-prompt-label">Chọn nghĩa tiếng Việt của từ</div>
        <div class="quiz-prompt-hanzi hanzi">${cleanHanzi}</div>
        <div class="quiz-prompt-py py">${Tone.html(cleanPinyin)}</div>
        <button class="icon-btn icon-btn-primary" onclick="AudioEngine.speak('${jsArg(cleanHanzi)}')" aria-label="Nghe phát âm">${Icon.svg('sound')}</button>
      `;
    } else if (this.mode === 'hanzi_to_pinyin') {
      promptCard.innerHTML = `
        <div class="quiz-prompt-label">Chọn cách đọc (Pinyin) đúng</div>
        <div class="quiz-prompt-hanzi hanzi">${cleanHanzi}</div>
        <div class="quiz-prompt-sub">${UI.esc(cleanMeaning)}</div>
      `;
    } else if (this.mode === 'listen_to_hanzi') {
      promptCard.innerHTML = `
        <div class="quiz-prompt-label">Nghe rồi chọn chữ Hán đúng</div>
        <button class="rv-listen" onclick="AudioEngine.speak('${jsArg(cleanHanzi)}')" aria-label="Nghe lại">${Icon.svg('sound')}</button>
        <details class="quiz-hint"><summary>Xem gợi ý nghĩa</summary>${UI.esc(cleanMeaning)}</details>
      `;
      // Speak synchronously: render() always runs inside the learner's tap (start / next),
      // a delayed call would be blocked by mobile autoplay rules.
      AudioEngine.speak(cleanHanzi);
    } else if (this.mode === 'vi_to_hanzi') {
      promptCard.innerHTML = `
        <div class="quiz-prompt-label">Chọn chữ Hán có nghĩa</div>
        <div class="quiz-prompt-mean">${UI.esc(cleanMeaning)}</div>
        <span class="hv-badge">${UI.esc(cleanHanviet)}</span>
      `;
    }

    // Render options
    optionsContainer.innerHTML = '';
    q.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';

      const choiceMeaning = (choice.meaning || (choice.hanviet ? `Hán Việt: ${choice.hanviet}` : choice.pinyin)).replace(/\s+,/g, ',');
      let text = '';
      if (this.mode === 'hanzi_to_vi') {
        text = `<span>${UI.esc(choiceMeaning)}</span>`;
      } else if (this.mode === 'hanzi_to_pinyin') {
        text = `<span class="py">${Tone.html(choice.pinyin)}</span>`;
      } else if (this.mode === 'listen_to_hanzi' || this.mode === 'vi_to_hanzi') {
        text = `<span class="hanzi quiz-opt-hanzi">${choice.hanzi}</span>`;
      }

      btn.innerHTML = text;
      btn.onclick = () => this.handleAnswer(idx);
      optionsContainer.appendChild(btn);
    });
  },

  handleAnswer(selectedIdx) {
    if (this.isAnswered) return;
    this.isAnswered = true;

    const q = this.currentQuestions[this.currentIndex];
    const buttons = document.querySelectorAll('.quiz-option-btn');
    const isCorrect = selectedIdx === q.correctIdx;

    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correctIdx) {
        btn.classList.add('correct');
      } else if (idx === selectedIdx && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    // Results feed the spaced-repetition schedule
    if (q.word && q.word.id && !q.word.isCustom) StorageManager.updateWordSrs(q.word.id, isCorrect ? 'good' : 'again');
    if (this.mode !== 'hanzi_to_vi') AudioEngine.speak(q.word.hanzi);

    if (isCorrect) {
      this.score++;
      AudioEngine.playCorrectSound();
      const scoreEl = document.getElementById('quiz-live-score');
      if (scoreEl) scoreEl.innerText = this.score;
    } else {
      AudioEngine.playWrongSound();
      this.missedQuestions.push(q);
    }

    // Show Next Button
    const nextBtn = document.getElementById('quiz-next-btn');
    if (nextBtn) {
      nextBtn.style.display = 'inline-flex';
      nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  nextQuestion() {
    if (this.currentIndex < this.currentQuestions.length - 1) {
      this.currentIndex++;
      this.renderQuestion();
    } else {
      this.showResults();
    }
  },

  showResults() {
    const playView = document.getElementById('quiz-play-view');
    if (playView) playView.style.display = 'none';
    const resultsView = document.getElementById('quiz-results-view');
    if (resultsView) resultsView.style.display = 'block';

    const total = this.currentQuestions.length;
    const pct = total > 0 ? Math.round((this.score / total) * 100) : 0;

    StorageManager.recordQuiz(this.score, total);
    if (pct >= 80) {
      AudioEngine.playVictorySound();
    }

    const resScore = document.getElementById('quiz-res-score');
    if (resScore) resScore.innerText = `${this.score} / ${total}`;
    const resPct = document.getElementById('quiz-res-pct');
    if (resPct) resPct.innerText = `${pct}%`;

    let badge = 'Cố gắng thêm nhé!';
    if (pct === 100) badge = '🌟 Xuất sắc tuyệt đối!';
    else if (pct >= 80) badge = '🎉 Rất xuất sắc!';
    else if (pct >= 60) badge = '👍 Khá tốt!';
    const badgeEl = document.getElementById('quiz-res-badge');
    if (badgeEl) badgeEl.innerText = badge;

    // Render missed words
    const missedArea = document.getElementById('quiz-missed-area');
    const missedContainer = document.getElementById('quiz-missed-list');
    if (this.missedQuestions.length > 0 && missedContainer && missedArea) {
      missedArea.style.display = 'block';
      missedContainer.innerHTML = this.missedQuestions.map(m => `
        <div class="missed-row">
          <button class="icon-btn" onclick="AudioEngine.speak('${jsArg(m.word.hanzi)}')" aria-label="Nghe">${Icon.svg('sound')}</button>
          <div class="missed-main">
            <span class="hanzi">${m.word.hanzi}</span> <span class="py">${Tone.html(m.word.pinyin)}</span>
            ${m.word.hanviet ? `<span class="hv-badge">${UI.esc(m.word.hanviet)}</span>` : ''}
            <div class="missed-mean">${UI.esc(m.word.meaning)}</div>
          </div>
        </div>
      `).join('') + `<button class="btn btn-primary btn-block" style="margin-top:0.6rem" onclick="Review.begin(QuizController.missedQuestions.map(m => m.word), 'today')">Ôn ngay ${this.missedQuestions.length} từ sai</button>`;
    } else if (missedArea) {
      missedArea.style.display = 'none';
    }
  }
};

if (typeof window !== 'undefined') {
  window.QuizController = QuizController;
}
