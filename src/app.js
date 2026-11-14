/**
 * Main Application Orchestrator & Multi-User Auth Controller
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

    this.initTheme();
    this.initAudioSettings();
    this.setupEventListeners();

    // Check User Session
    const user = StorageManager.getCurrentUser();
    if (!user) {
      this.showAuthModal('login');
    } else {
      this.onUserLoggedIn(user);
    }
  },

  onUserLoggedIn(user) {
    this.hideAuthModal();
    StorageManager.updateStreak();

    // Initialize all modules with active user state
    FlashcardController.init(this.data.all_words);
    QuizController.init(this.data.all_words);
    HanziController.init('hanzi-writer-target');
    MatchGame.init(this.data.all_words);
    LessonBrowser.init(this.data.lessons);
    DictionaryController.init(this.data.all_words);

    // Update Header with User Info
    const userBadge = document.getElementById('header-user-btn');
    if (userBadge) {
      const shortName = user.fullName.split(' ').pop();
      userBadge.innerHTML = `<span>👤</span> <span>${shortName}</span>`;
      userBadge.title = `Đang đăng nhập: ${user.fullName} (@${user.username})`;
    }

    // Update Dashboard Welcome & Progress
    const welcomeTitle = document.getElementById('welcome-user-name');
    if (welcomeTitle) {
      welcomeTitle.innerText = `Chào bạn, ${user.fullName}!`;
    }

    this.updateDashboardStats();
  },

  navigateTo(tabId) {
    this.currentTab = tabId;

    // Desktop Nav Sync
    document.querySelectorAll('.desktop-nav .nav-item').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.target === tabId);
    });

    // Mobile Bottom Nav Sync
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === tabId);
    });

    // Toggle Views
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    if (tabId === 'home') {
      this.updateDashboardStats();
    } else if (tabId === 'lessons') {
      LessonBrowser.renderLessonList();
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
    const user = StorageManager.getCurrentUser();

    // Update KPI Numbers
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

    // Update Course Progress Bar
    const completedCount = stats.completedLessonsCount || 0;
    const completedPct = Math.round((completedCount / 30) * 100);

    const progText = document.getElementById('course-progress-text');
    if (progText) progText.innerText = `Đã hoàn thành ${completedCount}/30 bài (${completedPct}%)`;

    const progFill = document.getElementById('course-progress-fill');
    if (progFill) progFill.style.width = `${completedPct}%`;

    // Last Active Lesson button
    const resumeBtn = document.getElementById('btn-resume-lesson');
    if (resumeBtn && user) {
      const lId = user.lastActiveLesson || 1;
      resumeBtn.innerText = `▶️ Tiếp tục: Bài ${lId}`;
      resumeBtn.onclick = () => {
        App.navigateTo('lessons');
        LessonBrowser.openLesson(lId);
      };
    }
  },

  // AUTH MODAL & LOGIC
  showAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-gate-modal');
    if (modal) modal.style.display = 'flex';
    this.switchAuthTab(tab);
  },

  hideAuthModal() {
    const modal = document.getElementById('auth-gate-modal');
    if (modal) modal.style.display = 'none';
  },

  switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
    const tabBtn = document.getElementById(`auth-tab-btn-${tab}`);
    if (tabBtn) tabBtn.classList.add('active');

    document.getElementById('auth-form-login').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('auth-form-register').style.display = tab === 'register' ? 'block' : 'none';

    // Hide error messages
    const errLogin = document.getElementById('auth-error-login');
    const errReg = document.getElementById('auth-error-register');
    if (errLogin) errLogin.style.display = 'none';
    if (errReg) errReg.style.display = 'none';
  },

  handleLogin(e) {
    e.preventDefault();
    const userField = document.getElementById('login-username').value;
    const passField = document.getElementById('login-password').value;
    const res = StorageManager.login(userField, passField);

    const errBox = document.getElementById('auth-error-login');
    if (!res.success) {
      if (errBox) {
        errBox.innerText = res.message;
        errBox.style.display = 'block';
      }
    } else {
      AudioEngine.playCorrectSound();
      this.onUserLoggedIn(res.user);
    }
  },

  handleRegister(e) {
    e.preventDefault();
    const nameField = document.getElementById('reg-fullname').value;
    const userField = document.getElementById('reg-username').value;
    const passField = document.getElementById('reg-password').value;
    const res = StorageManager.register(nameField, userField, passField);

    const errBox = document.getElementById('auth-error-register');
    if (!res.success) {
      if (errBox) {
        errBox.innerText = res.message;
        errBox.style.display = 'block';
      }
    } else {
      AudioEngine.playVictorySound();
      alert(`🎉 Đăng ký thành công! Chào mừng ${res.user.fullName} đến với Hán Ngữ Master!`);
      this.onUserLoggedIn(res.user);
    }
  },

  handleLogout() {
    if (confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản này? Toàn bộ tiến độ của bạn đã được lưu an toàn.')) {
      StorageManager.logout();
      location.reload();
    }
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
    const user = StorageManager.getCurrentUser();
    if (!user) return;
    const progress = user.wordProgress || {};
    
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
    // Desktop Nav
    document.querySelectorAll('.desktop-nav .nav-item').forEach(tab => {
      tab.onclick = () => this.navigateTo(tab.dataset.target);
    });

    // Mobile Bottom Nav
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
