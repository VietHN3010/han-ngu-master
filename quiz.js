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
    } else if (scope.startsWith('lesson_')) {
      const lNum = parseInt(scope.replace('lesson_', ''), 10);
      pool = pool.filter(w => w.lesson === lNum);
    } else if (scope === 'bookmarks') {
      pool = pool.filter(w => StorageManager.isBookmarked(w.id));
    }

    if (pool.length < 4) {
      alert('Không đủ từ vựng để tạo bài thi trắc nghiệm (Cần tối thiểu 4 từ). Hãy chọn phạm vi rộng hơn!');
      return;
    }

    // Shuffle pool and pick questions
    this.quizPool = pool;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, Math.min(count, pool.length));

    // Generate questions with 4 distinct choices
    this.currentQuestions = selectedWords.map(word => {
      // Find 3 distractors
      const otherWords = pool.filter(w => w.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3);
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

    document.getElementById('quiz-setup-view').style.display = 'none';
    document.getElementById('quiz-results-view').style.display = 'none';
    document.getElementById('quiz-play-view').style.display = 'block';

    this.renderQuestion();
  },

  renderQuestion() {
    this.isAnswered = false;
    const q = this.currentQuestions[this.currentIndex];
    const total = this.currentQuestions.length;

    // Update progress
    document.getElementById('quiz-current-num').innerText = this.currentIndex + 1;
    document.getElementById('quiz-total-num').innerText = total;
    document.getElementById('quiz-live-score').innerText = this.score;
    document.getElementById('quiz-progress-bar').style.width = `${((this.currentIndex) / total) * 100}%`;

    const promptCard = document.getElementById('quiz-prompt-area');
    const optionsContainer = document.getElementById('quiz-options-grid');
    const nextBtn = document.getElementById('quiz-next-btn');
    nextBtn.style.display = 'none';

    // Render prompt based on mode
    if (this.mode === 'hanzi_to_vi') {
      promptCard.innerHTML = `
        <div class="quiz-prompt-label">Hãy chọn nghĩa tiếng Việt chính xác của chữ Hán sau:</div>
        <div class="quiz-prompt-hanzi">${q.word.hanzi}</div>
        <div style="font-size:1.2rem; color:var(--primary); font-weight:600;">${q.word.pinyin}</div>
        <button class="btn-speaker" onclick="AudioEngine.speak('${q.word.hanzi}')" title="Nghe" style="margin-top:0.4rem; font-size:1.3rem;">🔊</button>
      `;
    } else if (this.mode === 'hanzi_to_pinyin') {
      promptCard.innerHTML = `
        <div class="quiz-prompt-label">Hãy chọn Phiên âm (Pinyin) đúng của chữ Hán:</div>
        <div class="quiz-prompt-hanzi">${q.word.hanzi}</div>
        <div style="font-size:1rem; color:var(--text-secondary);">${q.word.meaning}</div>
      `;
    } else if (this.mode === 'listen_to_hanzi') {
      promptCard.innerHTML = `
        <div class="quiz-prompt-label">Nghe phát âm và chọn Chữ Hán tương ứng:</div>
        <div style="margin: 1.5rem 0;">
          <button class="btn btn-primary" onclick="AudioEngine.speak('${q.word.hanzi}')" style="font-size:1.1rem; padding: 0.85rem 1.75rem;">
            🔊 Nghe lại phát âm
          </button>
        </div>
        <div class="quiz-prompt-label">Gợi ý: ${q.word.meaning}</div>
      `;
      // Auto-play audio on question load
      setTimeout(() => AudioEngine.speak(q.word.hanzi), 300);
    } else if (this.mode === 'vi_to_hanzi') {
      promptCard.innerHTML = `
        <div class="quiz-prompt-label">Chọn Chữ Hán có nghĩa là:</div>
        <div style="font-size:2rem; font-weight:700; color:var(--secondary); margin: 0.5rem 0;">"${q.word.meaning}"</div>
        <div style="font-size:1.1rem; color:var(--text-secondary);">Hán Việt: ${q.word.hanviet || '—'}</div>
      `;
    }

    // Render options
    optionsContainer.innerHTML = '';
    q.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';

      let text = '';
      if (this.mode === 'hanzi_to_vi') {
        text = `<span><strong>${String.fromCharCode(65 + idx)}.</strong> ${choice.meaning}</span>`;
      } else if (this.mode === 'hanzi_to_pinyin') {
        text = `<span><strong>${String.fromCharCode(65 + idx)}.</strong> ${choice.pinyin}</span>`;
      } else if (this.mode === 'listen_to_hanzi' || this.mode === 'vi_to_hanzi') {
        text = `
          <span><strong>${String.fromCharCode(65 + idx)}.</strong> <span class="hanzi" style="font-size:1.35rem; margin-left:0.35rem;">${choice.hanzi}</span></span>
          <span style="font-size:0.85rem; color:var(--text-muted);">${choice.pinyin}</span>
        `;
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

    if (isCorrect) {
      this.score++;
      AudioEngine.playCorrectSound();
      document.getElementById('quiz-live-score').innerText = this.score;
    } else {
      AudioEngine.playWrongSound();
      this.missedQuestions.push(q);
    }

    // Show Next Button
    const nextBtn = document.getElementById('quiz-next-btn');
    nextBtn.style.display = 'inline-flex';
    nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    document.getElementById('quiz-play-view').style.display = 'none';
    const resultsView = document.getElementById('quiz-results-view');
    resultsView.style.display = 'block';

    const total = this.currentQuestions.length;
    const pct = Math.round((this.score / total) * 100);

    StorageManager.recordQuiz(this.score, total);
    if (pct >= 80) {
      AudioEngine.playVictorySound();
    }

    document.getElementById('quiz-res-score').innerText = `${this.score} / ${total}`;
    document.getElementById('quiz-res-pct').innerText = `${pct}%`;

    let badge = 'Cố gắng thêm nhé!';
    if (pct === 100) badge = '🌟 Xuất sắc tuyệt đối!';
    else if (pct >= 80) badge = '🎉 Rất xuất sắc!';
    else if (pct >= 60) badge = '👍 Khá tốt!';
    document.getElementById('quiz-res-badge').innerText = badge;

    // Render missed words
    const missedContainer = document.getElementById('quiz-missed-list');
    if (this.missedQuestions.length > 0) {
      document.getElementById('quiz-missed-area').style.display = 'block';
      missedContainer.innerHTML = this.missedQuestions.map(m => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:0.75rem; border-bottom:1px solid var(--border-subtle);">
          <div>
            <span class="hanzi" style="font-size:1.4rem; font-weight:600; color:var(--text-primary); margin-right:0.5rem;">${m.word.hanzi}</span>
            <span style="color:var(--primary); font-weight:500;">${m.word.pinyin}</span>
            <span style="color:var(--text-secondary); margin-left:0.5rem;">(${m.word.hanviet})</span>
            <div style="color:var(--text-primary); font-size:0.9rem;">${m.word.meaning}</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${m.word.hanzi}');">
            ✍️ Luyện viết
          </button>
        </div>
      `).join('');
    } else {
      document.getElementById('quiz-missed-area').style.display = 'none';
    }
  }
};
