/**
 * Main Application Orchestrator & View Router
 */
const App = {
  data: null,
  currentTab: 'home',

  init() {
    if (!window.CHINESE_DATA) {
      console.error('CHINESE_DATA not found.');
      return;
    }
    this.data = window.CHINESE_DATA;

    StorageManager.updateStreak();
    FlashcardController.init(this.data.all_words);
    QuizController.init(this.data.all_words);
    HanziController.init('hanzi-writer-target');
    MatchGame.init(this.data.all_words);
    LessonBrowser.init(this.data.lessons);
    DictionaryController.init(this.data.all_words);

    this.initTheme();
    this.initAudioSettings();
    this.updateDashboardStats();
    this.setupEventListeners();
  },

  navigateTo(tabId) {
    this.currentTab = tabId;

    // Sync Desktop Top Navigation
    document.querySelectorAll('.desktop-nav .nav-item').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.target === tabId);
    });

    // Sync Mobile Bottom Navigation
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === tabId);
    });

    // Toggle Section Views
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    // Tab hooks
    if (tabId === 'home') {
      this.updateDashboardStats();
    } else if (tabId === 'writer') {
      setTimeout(() => {
        HanziController.loadCharacter(HanziController.currentChar || '好');
      }, 50);
    } else if (tabId === 'match') {
      MatchGame.startGame('hsk1');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateDashboardStats() {
    const stats = StorageManager.getStats(this.data.total_words);

    const streakEl = document.getElementById('stat-streak');
    if (streakEl) streakEl.innerText = stats.streak;

    const streakHeaderEl = document.getElementById('header-streak-count');
    if (streakHeaderEl) streakHeaderEl.innerText = `${stats.streak} ngày`;

    const masteredEl = document.getElementById('stat-mastered');
    if (masteredEl) masteredEl.innerText = stats.mastered;

    const learningEl = document.getElementById('stat-learning');
    if (learningEl) learningEl.innerText = stats.learning;

    const totalEl = document.getElementById('stat-total');
    if (totalEl) totalEl.innerText = this.data.total_words + stats.customCount;
  },

  initTheme() {
    const savedTheme = localStorage.getItem('chinese_app_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('chinese_app_theme', next);

    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.innerHTML = next === 'dark' ? '☀️' : '🌙';
    }
  },

  initAudioSettings() {
    const speedSelect = document.getElementById('audio-speed-select');
    if (speedSelect) {
      speedSelect.value = AudioEngine.speechRate;
      speedSelect.onchange = (e) => {
        AudioEngine.speechRate = parseFloat(e.target.value);
      };
    }
  },

  startDailyReview() {
    const data = StorageManager.getData();
    const progress = data.wordProgress;
    
    const dueWords = this.data.all_words.filter(w => {
      const p = progress[w.id];
      return p && (p.srsLevel < 3 || (p.nextReview && p.nextReview <= Date.now()));
    });

    this.navigateTo('flashcard');
    if (dueWords.length > 0) {
      FlashcardController.setWords(dueWords);
    } else {
      FlashcardController.setWords(this.data.all_words.slice(0, 30));
    }
  },

  setupEventListeners() {
    // Desktop Nav Clicks
    document.querySelectorAll('.desktop-nav .nav-item').forEach(tab => {
      tab.onclick = () => this.navigateTo(tab.dataset.target);
    });

    // Mobile Bottom Nav Clicks
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(btn => {
      btn.onclick = () => this.navigateTo(btn.dataset.target);
    });

    // Theme toggle
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) themeBtn.onclick = () => this.toggleTheme();

    // Flashcard Scope
    const fcFilterSelect = document.getElementById('fc-scope-select');
    if (fcFilterSelect) {
      fcFilterSelect.onchange = (e) => {
        const val = e.target.value;
        if (val === 'all') {
          FlashcardController.setWords(this.data.all_words);
        } else if (val === 'hsk1') {
          FlashcardController.setWords(this.data.all_words.filter(w => w.hsk === 1));
        } else if (val === 'hsk2') {
          FlashcardController.setWords(this.data.all_words.filter(w => w.hsk === 2));
        } else if (val === 'bookmarks') {
          FlashcardController.setWords(this.data.all_words.filter(w => StorageManager.isBookmarked(w.id)));
        } else if (val.startsWith('lesson_')) {
          const lNum = parseInt(val.replace('lesson_', ''), 10);
          FlashcardController.setWords(this.data.all_words.filter(w => w.lesson === lNum));
        }
      };
    }

    // Populate Lessons in Selects
    const quizScopeSelect = document.getElementById('quiz-scope-select');
    if (quizScopeSelect && fcFilterSelect) {
      this.data.lessons.forEach(l => {
        const opt = document.createElement('option');
        opt.value = `lesson_${l.id}`;
        opt.innerText = `Bài ${l.id}: ${l.zh_title}`;
        quizScopeSelect.appendChild(opt.cloneNode(true));
        fcFilterSelect.appendChild(opt);
      });
    }

    // Quiz form
    const quizForm = document.getElementById('quiz-setup-form');
    if (quizForm) {
      quizForm.onsubmit = (e) => {
        e.preventDefault();
        const scope = document.getElementById('quiz-scope-select').value;
        const count = document.getElementById('quiz-count-select').value;
        const mode = document.getElementById('quiz-mode-select').value;
        QuizController.startQuiz({ scope, count, mode });
      };
    }

    // Writer controls
    const btnAnimate = document.getElementById('btn-writer-animate');
    if (btnAnimate) btnAnimate.onclick = () => HanziController.animate();

    const btnLoop = document.getElementById('btn-writer-loop');
    if (btnLoop) btnLoop.onclick = () => HanziController.loop();

    const btnQuiz = document.getElementById('btn-writer-quiz');
    if (btnQuiz) btnQuiz.onclick = () => HanziController.startQuiz();

    const btnClearCanvas = document.getElementById('btn-writer-clear');
    if (btnClearCanvas) btnClearCanvas.onclick = () => HanziController.clearFallbackCanvas();

    const writerCharInput = document.getElementById('writer-input-char');
    if (writerCharInput) {
      writerCharInput.oninput = (e) => {
        const val = e.target.value.trim();
        if (val) HanziController.loadCharacter(val);
      };
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
