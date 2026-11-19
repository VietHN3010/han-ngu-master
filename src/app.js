/**
 * Main Application Orchestrator & Multi-User Auth Controller
 */
const App = {
  data: null,
  currentTab: 'home',

  // Which bottom-nav tab each view belongs to
  TAB_GROUP: {
    home: 'learn', lessons: 'learn',
    review: 'review', flashcard: 'review', quiz: 'review', grammar: 'review', writer: 'review', match: 'review',
    tones: 'review', guide: 'learn',
    dict: 'dict', me: 'me'
  },
  VALID_VIEWS: ['home', 'lessons', 'review', 'flashcard', 'quiz', 'grammar', 'writer', 'match', 'tones', 'guide', 'dict', 'me'],
  STEP_NAMES: ['Từ vựng', 'Bài khóa', 'Ngữ pháp', 'Luyện tập'],

  async init() {
    if (!window.CHINESE_DATA) {
      console.error('CHINESE_DATA not found.');
      return;
    }
    this.data = window.CHINESE_DATA;

    if (typeof Prefs !== 'undefined') Prefs.load();
    this.initTheme();
    this.initAudioSettings();
    this.setupEventListeners();
    this.checkPasswordRecoveryUrl();
    this.initPWA();

    // Modules render immediately from curriculum data (works before the session resolves)
    if (typeof LessonBrowser !== 'undefined') LessonBrowser.init(this.data.lessons);
    if (typeof GrammarController !== 'undefined') GrammarController.init(this.data.lessons);
    if (typeof QuizController !== 'undefined') QuizController.init(this.data.all_words);
    if (typeof HanziController !== 'undefined') HanziController.containerId = 'hanzi-writer-target';
    if (typeof DictionaryController !== 'undefined') DictionaryController.init(this.data.all_words);

    // Cloud session if any, otherwise an on-device guest learner (no login wall)
    const user = await StorageManager.checkSession();
    this.onUserLoggedIn(user || StorageManager.ensureGuest(), { silent: true });
    this.initRouting();
  },

  onUserLoggedIn(user, opts = {}) {
    if (!user) return;
    this.hideAuthModal();
    StorageManager.updateStreak();

    FlashcardController.init(this.data.all_words);
    if (FlashcardController.setScope) FlashcardController.setScope('due');
    QuizController.init(this.data.all_words);
    MatchGame.init(this.data.all_words);
    LessonBrowser.init(this.data.lessons);
    DictionaryController.init(this.data.all_words);
    if (typeof GrammarController !== 'undefined') GrammarController.init(this.data.lessons);

    this.renderAccountUI(user);
    this.updateDashboardStats();
    if (!opts.silent && !StorageManager.isGuest(user)) {
      this.toast(`Đã đăng nhập: ${user.fullName || user.email}`, 'success');
    }
  },

  renderAccountUI(user) {
    const isGuest = StorageManager.isGuest(user);
    const name = (user && user.fullName) || 'Bạn';
    const initial = isGuest ? '?' : (name.trim().split(/\s+/).pop() || '?').charAt(0).toUpperCase();

    const badge = document.getElementById('header-user-btn');
    if (badge) {
      badge.innerHTML = `<span class="avatar-initial">${UI.esc(initial)}</span>`;
      badge.setAttribute('aria-label', isGuest ? 'Tài khoản: đang học không đăng nhập' : `Tài khoản: ${name}`);
      badge.classList.toggle('is-guest', isGuest);
    }

    const welcome = document.getElementById('welcome-user-name');
    if (welcome) welcome.innerText = isGuest ? 'Chào bạn!' : `Chào ${name.trim().split(/\s+/).pop()}!`;

    const meAvatar = document.getElementById('me-avatar');
    if (meAvatar) meAvatar.innerText = initial;
    const meName = document.getElementById('me-name');
    if (meName) meName.innerText = isGuest ? 'Bạn đang học thử' : name;
    const meStatus = document.getElementById('me-status');
    if (meStatus) {
      meStatus.innerText = isGuest
        ? 'Tiến độ chỉ lưu trên máy này. Tạo tài khoản để đồng bộ.'
        : `${user.email || '@' + user.username} · Đã đồng bộ đám mây`;
    }
    const actions = document.getElementById('me-account-actions');
    if (actions) {
      actions.innerHTML = isGuest
        ? `<button class="btn btn-primary btn-sm" onclick="App.showAuthModal('register')">Tạo tài khoản</button>
           <button class="btn btn-outline btn-sm" onclick="App.showAuthModal('login')">Đăng nhập</button>`
        : `<button class="btn btn-outline btn-sm" onclick="App.handleLogout()">${Icon.svg('logout')}<span>Đăng xuất</span></button>`;
    }
    const banner = document.getElementById('guest-banner');
    if (banner) banner.hidden = !(isGuest && StorageManager.guestHasProgress());
  },

  initRouting() {
    const currentHash = window.location.hash || '#home';
    if (!history.state) {
      history.replaceState({ type: 'initial', hash: currentHash }, '', currentHash);
    }
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) installBtn.style.display = 'none';

    // Resolve the initial route synchronously once the session is known
    this.handleRoute(currentHash, false);

    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.hash || '#home', false);
    });
    window.addEventListener('hashchange', () => {
      const h = window.location.hash || '#home';
      const expected = this.currentTab === 'lessons' && LessonBrowser.currentLesson ? `#lesson-${LessonBrowser.currentLesson.id}` : `#${this.currentTab}`;
      if (h !== expected) this.handleRoute(h, false);
    });
  },

  handleRoute(hash, pushHistory = false) {
    if (hash.includes('access_token') || hash.includes('type=recovery')) return;
    if (!hash || hash === '#' || hash === '#home') {
      this.closeAllModals();
      if (typeof LessonBrowser !== 'undefined' && LessonBrowser.closeLesson) LessonBrowser.closeLesson(false);
      this.navigateTo('home', pushHistory);
      return;
    }

    const lessonMatch = hash.match(/^#lesson-(\d+)/);
    if (lessonMatch) {
      this.closeAllModals();
      this.navigateTo('lessons', false, { keepLesson: true });
      if (typeof LessonBrowser !== 'undefined' && LessonBrowser.openLesson) {
        LessonBrowser.openLesson(parseInt(lessonMatch[1], 10), pushHistory);
      }
      return;
    }

    if (hash === '#pinyin') {
      if (typeof PinyinController !== 'undefined' && PinyinController.openModal) PinyinController.openModal(pushHistory);
      return;
    }

    const tab = hash.replace('#', '');
    if (this.VALID_VIEWS.includes(tab)) {
      this.closeAllModals();
      if (typeof LessonBrowser !== 'undefined' && LessonBrowser.closeLesson) LessonBrowser.closeLesson(false);
      this.navigateTo(tab, pushHistory);
    }
  },

  closeAllModals() {
    const pinyinModal = document.getElementById('pinyin-matrix-modal');
    if (pinyinModal) pinyinModal.classList.remove('active');
    const addWordModal = document.getElementById('add-word-modal');
    if (addWordModal) addWordModal.classList.remove('active');
  },

  navigateTo(tabId, pushHistory = true, opts = {}) {
    if (!this.VALID_VIEWS.includes(tabId)) tabId = 'home';
    const leavingReviewSession = this.currentTab === 'review' && tabId !== 'review';
    this.currentTab = tabId;

    if (pushHistory && window.location.hash !== '#' + tabId) {
      history.pushState({ type: 'tab', tab: tabId }, '', '#' + tabId);
    }

    // One source of truth for the active tab (desktop + mobile)
    const group = this.TAB_GROUP[tabId] || 'learn';
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      const on = btn.dataset.tab === group;
      btn.classList.toggle('active', on);
      if (on) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });

    document.querySelectorAll('.view-section').forEach((view) => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    if (leavingReviewSession && typeof Review !== 'undefined') Review.exit(false);

    if (tabId === 'home' || tabId === 'me') {
      this.updateDashboardStats();
    } else if (tabId === 'review') {
      if (typeof Review !== 'undefined') Review.renderHub();
    } else if (tabId === 'lessons') {
      if (!opts.keepLesson && typeof LessonBrowser !== 'undefined') LessonBrowser.closeLesson(false);
    } else if (tabId === 'writer') {
      HanziController.loadCharacter(HanziController.currentWord || HanziController.currentChar || '好', HanziController.currentCharIndex || 0);
    } else if (tabId === 'match') {
      MatchGame.startGame('hsk1');
    } else if (tabId === 'grammar') {
      if (typeof GrammarController !== 'undefined') GrammarController.resetToSetup();
    } else if (tabId === 'flashcard') {
      if (FlashcardController.refreshDue) FlashcardController.refreshDue();
    } else if (tabId === 'guide') {
      if (typeof Guide !== 'undefined') Guide.render();
    } else if (tabId === 'tones') {
      const sess = document.getElementById('tones-session');
      if (typeof ToneDrill !== 'undefined' && (!sess || sess.hidden)) ToneDrill.renderHub();
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  },

  togglePref(key, value) {
    if (typeof Prefs === 'undefined') return;
    const next = value === undefined ? !Prefs.data[key] : value;
    Prefs.set(key, next);
    this.syncPrefControls();
    if (key === 'newPerDay') this.updateDashboardStats();
  },

  syncPrefControls() {
    if (typeof Prefs === 'undefined') return;
    ['pinyin', 'hanviet', 'toneColors'].forEach((k) => {
      const cb = document.getElementById(`pref-${k}`);
      if (cb) cb.checked = !!Prefs.data[k];
      document.querySelectorAll(`.chip-toggle[data-pref="${k}"]`).forEach((b) => {
        b.classList.toggle('on', !!Prefs.data[k]);
        b.setAttribute('aria-pressed', Prefs.data[k] ? 'true' : 'false');
      });
    });
    const sel = document.getElementById('pref-newPerDay');
    if (sel) sel.value = String(Prefs.data.newPerDay || 10);
  },

  updateDashboardStats() {
    const stats = StorageManager.getStats(this.data.total_words);
    const user = StorageManager.getCurrentUser();

    // Header + Me stats
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    setText('stat-streak', stats.streak);
    setText('header-streak-count', stats.streak);
    setText('stat-mastered', stats.mastered);
    setText('stat-learning', stats.learning);
    setText('stat-total', this.data.total_words + stats.customCount);

    const lvl = StorageManager.getXPLevel(user ? user.xp : 0);
    setText('user-level-badge', `Cấp ${lvl.level}: ${lvl.title}`);
    setText('user-xp-text', `${lvl.currentXP} / ${lvl.nextXP >= 99999 ? 'MAX' : `${lvl.nextXP} XP`}`);
    const xpFill = document.getElementById('user-xp-fill');
    if (xpFill) xpFill.style.width = `${lvl.progressPct}%`;
    setText('user-xp-tip', lvl.nextXP >= 99999 ? 'Bạn đã đạt cấp độ tối đa!' : `Còn ${lvl.nextXP - lvl.currentXP} XP để lên Cấp ${lvl.level + 1}`);

    // Brand subtitle reflects the curriculum size
    const levels = [...new Set(this.data.lessons.map((l) => l.hsk))];
    setText('brand-sub', `HSK 1–${Math.max(...levels)} · ${this.data.lessons.length} bài học`);

    // Today: date line
    const dateEl = document.getElementById('today-date');
    if (dateEl) {
      const d = new Date();
      const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
      dateEl.innerText = `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
    }

    // Today: daily goal ring + compact list
    const goals = StorageManager.getDailyGoals();
    const entries = Object.values(goals);
    const doneCount = entries.filter((g) => g.current >= g.target).length;
    const pct = Math.round(entries.reduce((a, g) => a + Math.min(1, g.current / g.target), 0) / entries.length * 100);
    const ring = document.getElementById('goal-ring');
    if (ring && ring.style && ring.style.setProperty) ring.style.setProperty('--p', pct);
    setText('goal-ring-text', `${pct}%`);
    setText('goal-summary', `${doneCount}/${entries.length} việc`);
    const goalsContainer = document.getElementById('daily-goals-list');
    if (goalsContainer) {
      goalsContainer.innerHTML = entries.map((g) => {
        const done = g.current >= g.target;
        return `<div class="goal-item ${done ? 'done' : ''}">${Icon.svg(done ? 'check' : 'target')}<span>${UI.esc(g.label)}</span><b>${Math.min(g.current, g.target)}/${g.target}</b></div>`;
      }).join('');
    }

    // Today: course progress
    const completedCount = stats.completedLessonsCount || 0;
    const completedPct = Math.round((completedCount / this.data.lessons.length) * 100);
    setText('course-progress-text', `Đã hoàn thành ${completedCount}/${this.data.lessons.length} bài`);
    setText('course-progress-badge', `${completedPct}%`);
    const progFill = document.getElementById('course-progress-fill');
    if (progFill) progFill.style.width = `${completedPct}%`;

    // Me: weekly dots
    const streakDots = document.getElementById('weekly-streak-dots');
    if (streakDots) {
      const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const dow = new Date().getDay();
      const todayIndex = dow === 0 ? 6 : dow - 1;
      streakDots.innerHTML = days.map((day, idx) => {
        const isToday = idx === todayIndex;
        const active = idx <= todayIndex && idx > todayIndex - stats.streak;
        return `<div class="week-dot ${active ? 'on' : ''} ${isToday ? 'today' : ''}"><span>${day}</span><i>${active ? Icon.svg('flame') : ''}</i></div>`;
      }).join('');
    }
    setText('weekly-streak-label', `${stats.streak} ngày liên tiếp`);

    // Today hero: next lesson to study + step
    const lId = (user && user.lastActiveLesson) ? user.lastActiveLesson : 1;
    const lessonObj = (this.data && this.data.lessons) ? this.data.lessons.find((l) => l.id === lId) : null;
    if (lessonObj) {
      setText('hero-lesson-title', `Bài ${lessonObj.id}: ${lessonObj.zh_title}`);
      setText('hero-lesson-sub', `${lessonObj.pinyin_title || ''} • ${lessonObj.title}`);
      setText('hero-lesson-hsk-badge', `HSK ${lessonObj.hsk}`);
      setText('hero-lesson-han', (lessonObj.zh_title || '你').charAt(0));
      const done = StorageManager.isLessonCompleted(lessonObj.id);
      const step = StorageManager.getLessonStep ? StorageManager.getLessonStep(lessonObj.id) : 0;
      setText('hero-lesson-step', done ? 'Đã hoàn thành · ôn lại hoặc sang bài tiếp' : `Bước ${step + 1}/4: ${this.STEP_NAMES[Math.min(step, 3)]}`);
      const prog = document.getElementById('hero-lesson-progress');
      if (prog) prog.style.width = `${done ? 100 : Math.round(step / 4 * 100)}%`;
    }
    const resumeBtn = document.getElementById('btn-resume-lesson');
    if (resumeBtn) {
      resumeBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        App.navigateTo('lessons', true, { keepLesson: true });
        LessonBrowser.openLesson(lId);
      };
    }

    // Review queue counts (Today + Review hub + nav badge)
    if (StorageManager.getReviewQueue) {
      const newLimit = (typeof Prefs !== 'undefined' && Prefs.data.newPerDay) || 10;
      const q = StorageManager.getReviewQueue(this.data.all_words, newLimit);
      const total = q.due.length + q.fresh.length;
      const eta = Math.max(1, Math.round(total * 0.25));
      ['today', 'hub'].forEach((pre) => {
        setText(`${pre}-due`, q.due.length);
        setText(`${pre}-new`, q.fresh.length);
        setText(`${pre}-hard`, q.hard.length);
        setText(`${pre}-review-eta`, total ? `khoảng ${eta} phút` : 'đã xong hôm nay');
      });
      const startBtn = document.getElementById('btn-start-review');
      if (startBtn) startBtn.innerText = total ? `Bắt đầu ôn ${total} thẻ` : 'Ôn thêm từ đã học';
      document.querySelectorAll('[data-due-badge]').forEach((b) => {
        b.hidden = q.due.length === 0;
        b.textContent = q.due.length > 99 ? '99+' : String(q.due.length);
      });
    }

    if (user) this.renderAccountUI(user);
    this.syncPrefControls();
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
    const first = document.querySelector(`#auth-form-${tab} input`);
    if (first && first.focus) setTimeout(() => first.focus(), 50);
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
      if (res.needsConfirm || !res.user) {
        this.hideAuthModal();
        UI.alert('Kiểm tra email để kích hoạt', `Đã gửi thư xác nhận tới <b>${UI.esc(emailField)}</b>. Mở thư (kể cả mục Spam) rồi đăng nhập lại. Tiến độ trên máy này vẫn được giữ và sẽ chuyển vào tài khoản khi bạn đăng nhập.`);
        return;
      }
      this.onUserLoggedIn(res.user);
      UI.alert(`Chào mừng ${res.user.fullName}!`, res.merged ? 'Tài khoản đã được tạo và tiến độ học thử đã được chuyển vào tài khoản.' : 'Tài khoản đã được tạo. Tiến độ từ giờ sẽ đồng bộ giữa các thiết bị.');
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
      await UI.alert('Đã đổi mật khẩu', 'Bạn đã được đăng nhập bằng mật khẩu mới.');
      window.location.hash = '';
      window.location.reload();
    }
  },

  handleUserBadgeClick() {
    this.navigateTo('me');
  },

  async handleLogout(skipConfirm = false) {
    const ok = skipConfirm || await UI.confirm({
      title: 'Đăng xuất khỏi tài khoản?',
      body: 'Tiến độ đã được lưu trên đám mây. Đăng nhập lại bất cứ lúc nào để học tiếp.',
      ok: 'Đăng xuất',
      danger: true
    });
    if (ok) {
      await StorageManager.logout();
      location.reload();
    }
  },

  toast(message, type = 'info', duration = 2600) {
    const clean = String(message).replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\s]+/u, '');
    if (typeof UI !== 'undefined') UI.toast(clean, type, duration);
  },

  initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('chinese_app_theme'); } catch (e) { saved = null; }
    const prefersDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    const cb = document.getElementById('btn-toggle-theme');
    if (cb) cb.checked = theme === 'dark';
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('chinese_app_theme', next); } catch (e) { /* ignore */ }
    const cb = document.getElementById('btn-toggle-theme');
    if (cb) cb.checked = next === 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#0f1220' : '#d93829');
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
    if (typeof Review !== 'undefined') Review.startToday();
  },

  setupEventListeners() {
    // Primary navigation (desktop top bar + mobile bottom bar)
    document.querySelectorAll('[data-tab][data-target]').forEach((btn) => {
      btn.onclick = () => this.navigateTo(btn.dataset.target);
    });

    // Theme switch (Me > Settings)
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) themeBtn.onchange = () => this.toggleTheme();

    // Flashcard Scope
    const fcFilterSelect = document.getElementById('fc-scope-select');
    if (fcFilterSelect) {
      fcFilterSelect.onchange = (e) => {
        const val = e.target.value;
        if (val === 'due') {
          FlashcardController.setScope('due');
        } else if (val === 'all') {
          FlashcardController.setWords(this.data.all_words);
        } else if (/^hsk\d$/.test(val)) {
          FlashcardController.setWords(this.data.all_words.filter(w => w.hsk === +val.slice(3)));
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
      quizScopeSelect.querySelectorAll('option[value^="lesson_"]').forEach(o => o.remove());
      fcFilterSelect.querySelectorAll('option[value^="lesson_"]').forEach(o => o.remove());
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
