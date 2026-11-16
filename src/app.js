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
    this.initPWA();
    this.initRouting();

    // Pre-initialize modules with curriculum data so UI components are immediately ready
    if (this.data) {
      if (typeof LessonBrowser !== 'undefined') LessonBrowser.init(this.data.lessons);
      if (typeof GrammarController !== 'undefined') GrammarController.init(this.data.lessons);
      if (typeof FlashcardController !== 'undefined') FlashcardController.init(this.data.all_words);
      if (typeof QuizController !== 'undefined') QuizController.init(this.data.all_words);
      if (typeof HanziController !== 'undefined') HanziController.init('hanzi-writer-target');
      if (typeof MatchGame !== 'undefined') MatchGame.init(this.data.all_words);
      if (typeof DictionaryController !== 'undefined') DictionaryController.init(this.data.all_words);
    }

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
    if (typeof GrammarController !== 'undefined') {
      GrammarController.init(this.data.lessons);
    }

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

  initRouting() {
    // If no initial state, replace state with current hash or home
    const currentHash = window.location.hash || '#home';
    if (!history.state) {
      history.replaceState({ type: 'initial', hash: currentHash }, '', currentHash);
    }

    // Handle initial route on startup if present
    if (window.location.hash && window.location.hash !== '#home') {
      setTimeout(() => {
        this.handleRoute(window.location.hash, false);
      }, 80);
    }

    // Listen to browser Back / Forward events
    window.addEventListener('popstate', (e) => {
      const hash = window.location.hash || '#home';
      this.handleRoute(hash, false);
    });
  },

  handleRoute(hash, pushHistory = false) {
    if (!hash || hash === '#' || hash === '#home') {
      this.closeAllModals();
      if (typeof LessonBrowser !== 'undefined' && LessonBrowser.closeLesson) {
        LessonBrowser.closeLesson(false);
      }
      this.navigateTo('home', pushHistory);
      return;
    }

    if (hash.startsWith('#lesson-')) {
      const match = hash.match(/#lesson-(\d+)/);
      if (match) {
        const lId = parseInt(match[1], 10);
        this.closeAllModals();
        this.navigateTo('lessons', false);
        if (typeof LessonBrowser !== 'undefined' && LessonBrowser.openLesson) {
          LessonBrowser.openLesson(lId, pushHistory);
        }
        return;
      }
    }

    if (hash === '#pinyin') {
      if (typeof PinyinController !== 'undefined' && PinyinController.openModal) {
        PinyinController.openModal(pushHistory);
      }
      return;
    }

    const tab = hash.replace('#', '');
    const validTabs = ['home', 'lessons', 'flashcard', 'quiz', 'grammar', 'writer', 'match', 'dict'];
    if (validTabs.includes(tab)) {
      this.closeAllModals();
      if (typeof LessonBrowser !== 'undefined' && LessonBrowser.closeLesson) {
        LessonBrowser.closeLesson(false);
      }
      this.navigateTo(tab, pushHistory);
    }
  },

  closeAllModals() {
    const pinyinModal = document.getElementById('pinyin-matrix-modal');
    if (pinyinModal) pinyinModal.classList.remove('active');
    const addWordModal = document.getElementById('add-word-modal');
    if (addWordModal) addWordModal.classList.remove('active');
  },

  navigateTo(tabId, pushHistory = true) {
    this.currentTab = tabId;

    if (pushHistory && window.location.hash !== '#' + tabId) {
      history.pushState({ type: 'tab', tab: tabId }, '', '#' + tabId);
    }

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
    } else if (tabId === 'grammar') {
      if (typeof GrammarController !== 'undefined') {
        GrammarController.resetToSetup();
      }
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

    // Update XP and Gamification
    const lvl = StorageManager.getXPLevel(user ? user.xp : 0);
    const lvlBadge = document.getElementById('user-level-badge');
    if (lvlBadge) lvlBadge.innerText = `${lvl.badge} Cấp ${lvl.level}: ${lvl.title}`;

    const xpText = document.getElementById('user-xp-text');
    if (xpText) xpText.innerText = `${lvl.currentXP} / ${lvl.nextXP >= 99999 ? 'MAX' : `${lvl.nextXP} XP`}`;

    const xpFill = document.getElementById('user-xp-fill');
    if (xpFill) xpFill.style.width = `${lvl.progressPct}%`;

    // Render Daily Goals
    const goalsContainer = document.getElementById('daily-goals-list');
    if (goalsContainer) {
      const goals = StorageManager.getDailyGoals();
      goalsContainer.innerHTML = Object.entries(goals).map(([key, g]) => {
        const isDone = g.current >= g.target;
        return `
          <div class="goal-item ${isDone ? 'goal-completed' : ''}" style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.85rem; border-radius:var(--radius-md); background:var(--bg-main); border:1px solid var(--border); font-size:0.85rem; margin-bottom:0.4rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="font-size:1.1rem;">${isDone ? '✅' : '⬜'}</span>
              <span style="font-weight:600; color:${isDone ? 'var(--text-muted)' : 'var(--text-main)'}; text-decoration:${isDone ? 'line-through' : 'none'};">${g.label}</span>
            </div>
            <span style="font-weight:700; color:${isDone ? 'var(--accent-jade)' : 'var(--primary)'};">${g.current} / ${g.target}</span>
          </div>
        `;
      }).join('');
    }

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

  deferredPrompt: null,

  initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.warn('SW registration failed:', err);
        });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) installBtn.style.display = 'inline-flex';
    });
  },

  async installPWA() {
    if (!this.deferredPrompt) {
      this.toast('Để cài đặt: Trên Chrome hãy chọn biểu tượng Cài đặt trên thanh địa chỉ, hoặc trên Safari chọn "Chia sẻ" ➔ "Thêm vào MH chính"!', 'info', 5000);
      return;
    }
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.toast('🎉 Cảm ơn bạn đã cài đặt Hán Ngữ Master!', 'success');
    }
    this.deferredPrompt = null;
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) installBtn.style.display = 'none';
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

  handleUserBadgeClick() {
    const user = StorageManager.getCurrentUser();
    if (!user) {
      this.showAuthModal('login');
      return;
    }
    const email = user.email || 'Chưa liên kết email';
    const isCloud = user.id && user.id.length > 20;
    const msg = `👤 Tài khoản: ${user.fullName} (@${user.username})\n📧 Email: ${email}\n☁️ Trạng thái: ${isCloud ? 'Đã liên kết Cloud Supabase' : 'Lưu cục bộ'}\n\nBạn có muốn đăng xuất không?`;
    if (confirm(msg)) {
      this.handleLogout(true);
    }
  },

  async handleLogout(skipConfirm = false) {
    if (skipConfirm || confirm('Bạn có chắc muốn đăng xuất khỏi tài khoản này? Toàn bộ tiến độ của bạn đã được lưu an toàn trên đám mây.')) {
      await StorageManager.logout();
      location.reload();
    }
  },

  toast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); z-index:99999; display:flex; flex-direction:column; gap:8px; pointer-events:none; max-width:90vw; width:max-content;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const bg = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#1e293b'));
    toast.style.cssText = `background:${bg}; color:#fff; padding:10px 18px; border-radius:30px; font-size:0.9rem; font-weight:600; box-shadow:0 10px 25px rgba(0,0,0,0.25); opacity:0; transform:translateY(15px); transition:all 0.25s ease; text-align:center; pointer-events:auto; display:flex; align-items:center; gap:8px;`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : 'ℹ️'));
    const safeMsg = typeof escapeHtml === 'function' ? escapeHtml(message) : message;
    toast.innerHTML = `<span>${icon}</span> <span>${safeMsg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
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

    // Grammar form
    const grammarForm = document.getElementById('grammar-setup-form');
    if (grammarForm) {
      grammarForm.onsubmit = (e) => {
        e.preventDefault();
        const mode = document.getElementById('grammar-mode-select').value;
        const scope = document.getElementById('grammar-scope-select').value;
        const count = document.getElementById('grammar-count-select').value;
        GrammarController.startExercise({ mode, scope, count });
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

if (typeof window !== 'undefined') {
  window.App = App;
}

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
