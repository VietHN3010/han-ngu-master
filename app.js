/**
 * Main Application Orchestrator & View Router
 */
const App = {
  data: null,
  currentTab: 'home',

  init() {
    // Check if data is loaded
    if (!window.CHINESE_DATA) {
      console.error('CHINESE_DATA not found. Please ensure data.js is loaded.');
      return;
    }
    this.data = window.CHINESE_DATA;

    // Initialize Submodules
    StorageManager.updateStreak();
    FlashcardController.init(this.data.all_words);
    QuizController.init(this.data.all_words);
    HanziController.init('hanzi-writer-target');
    MatchGame.init(this.data.all_words);
    LessonBrowser.init(this.data.lessons);
    DictionaryController.init(this.data.all_words);

    // Setup Theme & Audio Settings
    this.initTheme();
    this.initAudioSettings();
    this.updateDashboardStats();
    this.setupEventListeners();

    console.log('App initialized with', this.data.total_words, 'words across', this.data.total_lessons, 'lessons.');
  },

  navigateTo(tabId) {
    this.currentTab = tabId;

    // Update Tab UI
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.target === tabId);
    });

    // Update View Sections
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    // Tab-specific lifecycle hooks
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

    const bestScoreEl = document.getElementById('stat-best-score');
    if (bestScoreEl) bestScoreEl.innerText = `${stats.bestScore}%`;
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
    
    // Words due for review or not mastered
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
    // Navigation bar click handling
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.onclick = () => this.navigateTo(tab.dataset.target);
    });

    // Theme toggle button
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) themeBtn.onclick = () => this.toggleTheme();

    // Flashcard filters
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

    // Populate Lesson Options in Quiz and Flashcard Scope Selectors
    const quizScopeSelect = document.getElementById('quiz-scope-select');
    if (quizScopeSelect && fcFilterSelect) {
      this.data.lessons.forEach(l => {
        const opt = document.createElement('option');
        opt.value = `lesson_${l.id}`;
        opt.innerText = `Bài ${l.id}: ${l.zh_title} (${l.title})`;
        
        quizScopeSelect.appendChild(opt.cloneNode(true));
        fcFilterSelect.appendChild(opt);
      });
    }

    // Quiz Start form
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

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
