/**
 * Main Application Orchestrator & Multi-User Auth Controller
 */
const App = {
  data: null,
  currentTab: 'home',

  async init() {
    if (!window.CHINESE_DATA) {
      console.error('CHINESE_DATA not found.');
      return;
    }
    this.data = window.CHINESE_DATA;

    this.initTheme();
    this.initAudioSettings();
    this.setupEventListeners();
    this.checkPasswordRecoveryUrl();

    // Check User Session (Supabase Cloud + Local cache)
    const user = await StorageManager.checkSession();
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
    const tabs = ['login', 'register', 'forgot', 'reset'];
    tabs.forEach(t => {
      const btn = document.getElementById(`auth-tab-btn-${t}`);
      const form = document.getElementById(`auth-form-${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
      if (form) form.style.display = t === tab ? 'block' : 'none';
      const errMsg = document.getElementById(`auth-error-${t}`) || document.getElementById(`auth-msg-${t}`);
      if (errMsg) errMsg.style.display = 'none';
    });
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-login');
    const origText = btn ? btn.innerText : '🚀 Đăng nhập ngay';
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Đang đăng nhập...'; }

    const userField = document.getElementById('login-username').value;
    const passField = document.getElementById('login-password').value;
    const res = await StorageManager.login(userField, passField);

    if (btn) { btn.disabled = false; btn.innerText = origText; }

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

  async handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-reg');
    const origText = btn ? btn.innerText : '✨ Tạo tài khoản';
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Đang tạo tài khoản...'; }

    const nameField = document.getElementById('reg-fullname').value;
    const emailField = document.getElementById('reg-email').value;
    const userField = document.getElementById('reg-username').value;
    const passField = document.getElementById('reg-password').value;

    const res = await StorageManager.register(nameField, emailField, userField, passField);

    if (btn) { btn.disabled = false; btn.innerText = origText; }

    const errBox = document.getElementById('auth-error-register');
    if (!res.success) {
      if (errBox) {
        errBox.innerText = res.message;
        errBox.style.display = 'block';
      }
    } else {
      AudioEngine.playVictorySound();
      if (!res.hasSession) {
        alert(`🎉 Đăng ký thành công! Hãy kiểm tra hòm thư ${emailField} (kể cả hòm Spam) để kích hoạt tài khoản nếu được yêu cầu.`);
      } else {
        alert(`🎉 Chúc mừng ${res.user.fullName}! Tài khoản đã được kích hoạt thành công trên đám mây.`);
      }
      this.onUserLoggedIn(res.user);
    }
  },

  async handleForgotPassword(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-forgot');
    const origText = btn ? btn.innerText : '📩 Gửi link khôi phục mật khẩu';
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Đang gửi yêu cầu...'; }

    const emailField = document.getElementById('forgot-email').value;
    const res = await StorageManager.forgotPassword(emailField);

    if (btn) { btn.disabled = false; btn.innerText = origText; }

    const msgBox = document.getElementById('auth-msg-forgot');
    if (msgBox) {
      msgBox.innerText = res.message;
      msgBox.style.display = 'block';
      msgBox.style.background = res.success ? '#ecfdf5' : '#fef2f2';
      msgBox.style.color = res.success ? '#065f46' : '#dc2626';
      msgBox.style.borderColor = res.success ? '#a7f3d0' : '#fecaca';
    }
  },

  checkPasswordRecoveryUrl() {
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      this.showAuthModal('reset');
      this.switchAuthTab('reset');
    }
    const sb = getSupabase();
    if (sb) {
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          this.showAuthModal('reset');
          this.switchAuthTab('reset');
        }
      });
    }
  },

  async handleSetNewPassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('reset-new-password').value;
    const btn = document.getElementById('btn-submit-reset');
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Đang lưu...'; }

    const res = await StorageManager.updateNewPassword(newPass);
    if (btn) { btn.disabled = false; btn.innerText = '🔒 Lưu mật khẩu mới & Đăng nhập'; }

    const msgBox = document.getElementById('auth-msg-reset');
    if (!res.success) {
      if (msgBox) {
        msgBox.innerText = res.message;
        msgBox.style.display = 'block';
      }
    } else {
      alert('🎉 Đặt lại mật khẩu thành công! Bạn đã được đăng nhập an toàn.');
      window.location.hash = '';
      window.location.reload();
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
