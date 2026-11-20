/**
 * Storage & Auth Manager
 * - Supabase Auth (email + password, password recovery)
 * - Progress synced to table `user_progress` (RLS protected), with automatic
 *   fallback to auth user_metadata if the table does not exist yet.
 * - Local cache in localStorage so the app opens instantly and works offline.
 */

const SUPABASE_CONFIG = {
  url: 'https://rtcmjdecdyznajdezdvs.supabase.co',
  anonKey: 'sb_publishable_ExOdmbWDygSsppnRNvPpRg_HQ8XDj8Q'
};

let _supabaseClient = null;
function getSupabase() {
  if (!_supabaseClient && typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    try {
      _supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    } catch (e) {
      console.warn('Supabase client init failed:', e);
    }
  }
  return _supabaseClient;
}

const PROGRESS_FIELDS = [
  'completedLessons', 'lastActiveLesson', 'bookmarks', 'wordProgress',
  'customWords', 'streak', 'lastActiveDate', 'quizHighScores', 'updatedAt',
  'xp', 'dailyGoals', 'lessonSteps', 'reviewScope'
];

function emptyProgress() {
  return {
    completedLessons: [],
    lastActiveLesson: 1,
    bookmarks: [],
    wordProgress: {},
    customWords: [],
    streak: 1,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    quizHighScores: { totalQuizzes: 0, totalCorrect: 0, bestScore: 0 },
    xp: 0,
    dailyGoals: {},
    lessonSteps: {},
    reviewScope: null,
    updatedAt: 0
  };
}

function pickProgress(src) {
  const base = emptyProgress();
  if (!src) return base;
  PROGRESS_FIELDS.forEach(k => {
    if (src[k] !== undefined && src[k] !== null) base[k] = src[k];
  });
  return base;
}

const StorageManager = {
  KEY_USERS: 'chinese_app_users_v3',
  KEY_CURRENT_USER: 'chinese_app_session_v3',
  GUEST_KEY: '__guest__',
  useProgressTable: null,   // null = unknown, true/false after first probe
  _syncTimer: null,
  _pendingSync: null,
  syncState: 'idle',        // 'idle' | 'saving' | 'saved' | 'offline'

  getAllUsers() {
    try {
      const raw = localStorage.getItem(this.KEY_USERS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  saveAllUsers(users) {
    try {
      localStorage.setItem(this.KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users:', e);
    }
  },

  getCurrentUser() {
    const userKey = localStorage.getItem(this.KEY_CURRENT_USER);
    if (!userKey) return null;
    const users = this.getAllUsers();
    return users[userKey] || null;
  },

  getData() {
    return this.getCurrentUser() || {};
  },

  _cacheUser(user) {
    const key = this.isGuest(user) ? this.GUEST_KEY : (user.email || user.username || '').toLowerCase();
    if (!key) return;
    const users = this.getAllUsers();
    // Never keep passwords in local cache
    delete user.password;
    users[key] = user;
    this.saveAllUsers(users);
    localStorage.setItem(this.KEY_CURRENT_USER, key);
  },

  /** Save locally + schedule a debounced cloud sync. */
  saveCurrentUser(user) {
    if (!user) return;
    user.updatedAt = Date.now();
    this._cacheUser(user);
    this.scheduleSync(user);
  },

  setSyncState(state) {
    this.syncState = state;
    const el = document.getElementById('sync-indicator');
    if (!el) return;
    const map = {
      saving: ['⏳', 'Đang lưu lên đám mây...'],
      saved: ['☁️', 'Đã đồng bộ đám mây'],
      offline: ['⚠️', 'Chưa đồng bộ (mất kết nối) - sẽ thử lại'],
      idle: ['☁️', 'Đã đồng bộ đám mây']
    };
    const [icon, title] = map[state] || map.idle;
    el.textContent = icon;
    el.title = title;
    el.dataset.state = state;
  },

  scheduleSync(user) {
    if (this.isGuest(user)) return; // guest progress stays on this device only
    this._pendingSync = user;
    clearTimeout(this._syncTimer);
    this.setSyncState('saving');
    this._syncTimer = setTimeout(() => this.flushSync(), 1200);
  },

  async flushSync() {
    clearTimeout(this._syncTimer);
    const user = this._pendingSync;
    this._pendingSync = null;
    if (!user) return;
    const ok = await this.syncToCloud(user);
    this.setSyncState(ok ? 'saved' : 'offline');
    if (!ok) {
      // retry later
      this._pendingSync = this._pendingSync || user;
      this._syncTimer = setTimeout(() => this.flushSync(), 15000);
    }
  },

  async _probeTable(sb, uid) {
    const { data, error } = await sb.from('user_progress').select('data, updated_at').eq('user_id', uid).maybeSingle();
    if (error) {
      // Table missing / not exposed -> fall back to user_metadata
      this.useProgressTable = false;
      return { ok: false };
    }
    this.useProgressTable = true;
    return { ok: true, row: data };
  },

  async syncToCloud(user) {
    const sb = getSupabase();
    if (!sb || !user || !user.id) return false;
    try {
      const progress = pickProgress(user);
      if (this.useProgressTable === null) await this._probeTable(sb, user.id);

      if (this.useProgressTable) {
        const { error } = await sb.from('user_progress').upsert({
          user_id: user.id,
          data: progress,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
        return true;
      }

      // Fallback: store in user_metadata (kept compact)
      const { error } = await sb.auth.updateUser({
        data: { full_name: user.fullName, username: user.username, ...progress }
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('Cloud sync failed:', e && e.message);
      return false;
    }
  },

  /** Build the app user object from a Supabase auth user + cloud progress. */
  async _hydrateFromCloud(authUser) {
    const sb = getSupabase();
    const meta = authUser.user_metadata || {};
    const cached = this.getAllUsers()[(authUser.email || '').toLowerCase()];

    let cloudProgress = null;
    let migrateFromMeta = false;
    const probe = await this._probeTable(sb, authUser.id);
    if (probe.ok && probe.row && probe.row.data) {
      cloudProgress = probe.row.data;
    } else {
      cloudProgress = meta;               // legacy / fallback storage
      migrateFromMeta = probe.ok;         // table exists but empty -> migrate
    }

    let progress = pickProgress(cloudProgress);
    // Keep whichever copy is newer (local edits made while offline win)
    if (cached && (cached.updatedAt || 0) > (progress.updatedAt || 0)) {
      progress = pickProgress(cached);
      migrateFromMeta = true;
    }

    const user = {
      id: authUser.id,
      email: authUser.email,
      fullName: meta.full_name || meta.fullName || (cached && cached.fullName) || 'Học viên',
      username: meta.username || authUser.email.split('@')[0],
      ...progress
    };
    this._cacheUser(user);

    if (migrateFromMeta) {
      await this.syncToCloud(user);
      // Remove heavy progress data from the JWT once it lives in the table
      if (this.useProgressTable && meta.wordProgress) {
        try {
          const cleared = {};
          PROGRESS_FIELDS.forEach(k => { cleared[k] = null; });
          await sb.auth.updateUser({ data: cleared });
        } catch (e) { /* non-critical */ }
      }
    }
    this.setSyncState('saved');
    return user;
  },

  // ---------- GUEST MODE ----------
  isGuest(user) {
    return !!(user && user.isGuest);
  },

  /** Returns the on-device guest learner, creating it on first visit. */
  ensureGuest() {
    const users = this.getAllUsers();
    let guest = users[this.GUEST_KEY];
    if (!guest) {
      guest = { id: null, isGuest: true, email: '', username: this.GUEST_KEY, fullName: 'Bạn', ...emptyProgress() };
      users[this.GUEST_KEY] = guest;
      this.saveAllUsers(users);
    }
    localStorage.setItem(this.KEY_CURRENT_USER, this.GUEST_KEY);
    return guest;
  },

  /** True when the guest has progress worth keeping (used to prompt sign-up). */
  guestHasProgress() {
    const g = this.getAllUsers()[this.GUEST_KEY];
    if (!g) return false;
    return (g.completedLessons || []).length > 0 || (g.xp || 0) > 0 || Object.keys(g.wordProgress || {}).length > 0;
  },

  /** Merge on-device guest progress into a real account, then drop the guest record. */
  _mergeGuestInto(user) {
    const users = this.getAllUsers();
    const g = users[this.GUEST_KEY];
    if (!g || !user || this.isGuest(user)) return false;
    const hasProgress = (g.completedLessons || []).length || (g.xp || 0) || Object.keys(g.wordProgress || {}).length;
    if (!hasProgress) {
      delete users[this.GUEST_KEY];
      this.saveAllUsers(users);
      return false;
    }
    const union = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));
    user.completedLessons = union(user.completedLessons, g.completedLessons);
    user.bookmarks = union(user.bookmarks, g.bookmarks);
    user.wordProgress = user.wordProgress || {};
    Object.entries(g.wordProgress || {}).forEach(([id, gp]) => {
      const cur = user.wordProgress[id];
      if (!cur || (gp.lastStudied || 0) > (cur.lastStudied || 0)) user.wordProgress[id] = gp;
    });
    user.customWords = [...(user.customWords || []), ...(g.customWords || []).filter((cw) => !(user.customWords || []).some((u) => u.id === cw.id))];
    user.xp = (user.xp || 0) + (g.xp || 0);
    if ((g.lastActiveLesson || 1) > (user.lastActiveLesson || 1)) user.lastActiveLesson = g.lastActiveLesson;
    user.dailyGoals = { ...(g.dailyGoals || {}), ...(user.dailyGoals || {}) };
    delete users[this.GUEST_KEY];
    this.saveAllUsers(users);
    this.saveCurrentUser(user);
    return true;
  },

  // ---------- REVIEW SCOPE ----------
  /**
   * Which part of the course the learner wants to review, saved with the account (syncs across devices):
   *   { levels: [1, 2], lessons: [] }   -> every lesson of HSK 1 and HSK 2
   *   { levels: [], lessons: [3, 4, 5] } -> only these lessons (overrides levels)
   * null means "not chosen yet": review everything the learner has reached.
   */
  getReviewScope() {
    const user = this.getCurrentUser();
    const sc = user && user.reviewScope;
    if (!sc) return null;
    return {
      levels: Array.isArray(sc.levels) ? sc.levels.map(Number).filter(Boolean) : [],
      lessons: Array.isArray(sc.lessons) ? sc.lessons.map(Number).filter(Boolean) : []
    };
  },

  setReviewScope(scope) {
    const user = this.getCurrentUser();
    if (!user) return;
    user.reviewScope = scope
      ? { levels: [...new Set((scope.levels || []).map(Number))].sort(), lessons: [...new Set((scope.lessons || []).map(Number))].sort((a, b) => a - b) }
      : null;
    this.saveCurrentUser(user);
  },

  hasChosenScope() {
    return !!this.getReviewScope();
  },

  /** Words inside a scope (all words when no scope / empty scope). */
  scopeWords(allWords, scope = this.getReviewScope()) {
    if (!scope) return allWords;
    if (scope.lessons && scope.lessons.length) {
      const set = new Set(scope.lessons);
      return allWords.filter((w) => set.has(w.lesson));
    }
    if (scope.levels && scope.levels.length) return allWords.filter((w) => scope.levels.includes(w.hsk));
    return allWords;
  },

  // ---------- SPACED REPETITION QUEUE ----------
  /**
   * Builds today's review queue: words whose nextReview is due (most overdue first),
   * then up to `newLimit` new words. Only words inside the learner's review scope are used.
   * Without a chosen scope, new words come from lessons the learner has opened/completed;
   * with a chosen scope, from the earliest unseen lessons inside that scope.
   */
  getReviewQueue(allWords, newLimit = 10, scope = this.getReviewScope()) {
    const user = this.getCurrentUser();
    const progress = (user && user.wordProgress) || {};
    const now = Date.now();
    const scoped = this.scopeWords(allWords, scope);
    const due = scoped
      .filter((w) => progress[w.id] && (progress[w.id].nextReview || 0) <= now)
      .sort((a, b) => (progress[a.id].nextReview || 0) - (progress[b.id].nextReview || 0));
    const reached = new Set([...(user && user.completedLessons) || [], (user && user.lastActiveLesson) || 1]);
    const maxLesson = Math.max(...reached);
    const today = new Date().toISOString().slice(0, 10);
    const introducedToday = Object.values(progress).filter((p) => p.firstSeen === today).length;
    const room = Math.max(0, newLimit - introducedToday);
    const fresh = scoped
      .filter((w) => !progress[w.id] && typeof w.lesson === 'number' && (scope || w.lesson <= maxLesson))
      .sort((a, b) => a.lesson - b.lesson)
      .slice(0, room);
    const hard = scoped.filter((w) => progress[w.id] && (progress[w.id].lapses || 0) >= 2 && (progress[w.id].nextReview || 0) <= now);
    return { due, fresh, hard, all: [...due, ...fresh] };
  },

  /** Days until next review for a given rating (for button labels). */
  previewInterval(wordId, quality) {
    const user = this.getCurrentUser();
    const p = (user && user.wordProgress && user.wordProgress[wordId]) || { srsLevel: 0 };
    const intervals = [1, 2, 4, 7, 14, 30];
    let lvl = p.srsLevel || 0;
    if (quality === 'again') return 0;
    if (quality === 'hard') lvl = Math.max(0, lvl);
    if (quality === 'good') lvl = Math.min(intervals.length - 1, lvl + 1);
    if (quality === 'easy') lvl = Math.min(intervals.length - 1, lvl + 2);
    return intervals[lvl];
  },

  async checkSession() {
    const sb = getSupabase();
    if (!sb) return this.getCurrentUser() || this.ensureGuest();   // offline: cached session or guest
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session && data.session.user) {
        const user = await this._hydrateFromCloud(data.session.user);
        this._mergeGuestInto(user);
        return this.getCurrentUser() || user;
      }
      // No cloud session -> learn as an on-device guest
      return this.ensureGuest();
    } catch (e) {
      console.warn('Supabase getSession failed:', e);
      return this.getCurrentUser() || this.ensureGuest();
    }
  },

  translateError(msg) {
    const m = (msg || '').toLowerCase();
    if (m.includes('already registered') || m.includes('already been registered')) return 'Email này đã được đăng ký. Hãy chọn Đăng nhập hoặc Quên mật khẩu.';
    if (m.includes('invalid login credentials')) return 'Sai email hoặc mật khẩu. Vui lòng kiểm tra lại.';
    if (m.includes('email not confirmed')) return 'Email chưa được xác nhận. Hãy mở hộp thư (kể cả mục Spam) để xác nhận.';
    if (m.includes('rate limit')) return 'Bạn thao tác quá nhanh. Vui lòng đợi 1 phút rồi thử lại.';
    if (m.includes('password should be at least')) return 'Mật khẩu tối thiểu 6 ký tự.';
    if (m.includes('invalid') && m.includes('email')) return 'Địa chỉ email không hợp lệ.';
    if (m.includes('failed to fetch') || m.includes('network')) return 'Không kết nối được máy chủ. Vui lòng kiểm tra Internet.';
    if (m.includes('same password') || m.includes('different from the old')) return 'Mật khẩu mới phải khác mật khẩu cũ.';
    return msg || 'Đã có lỗi xảy ra, vui lòng thử lại.';
  },

  async register(fullName, email, username, password) {
    const cleanName = (fullName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUser = (username || '').trim().toLowerCase();

    if (!cleanName) return { success: false, message: 'Vui lòng nhập họ và tên của bạn!' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { success: false, message: 'Vui lòng nhập địa chỉ Email hợp lệ!' };
    if (!cleanUser || cleanUser.length < 3) return { success: false, message: 'Tên hiển thị tối thiểu 3 ký tự!' };
    if (!password || password.length < 6) return { success: false, message: 'Mật khẩu tối thiểu 6 ký tự!' };

    const sb = getSupabase();
    if (!sb) return { success: false, message: 'Không kết nối được máy chủ. Vui lòng kiểm tra Internet và tải lại trang.' };

    try {
      const { data, error } = await sb.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: cleanName, username: cleanUser } }
      });
      if (error) return { success: false, message: this.translateError(error.message) };

      // Supabase returns a user with empty identities when the email already exists
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { success: false, message: this.translateError('already registered') };
      }

      if (!data.session) {
        return { success: true, needsConfirm: true };
      }

      const user = await this._hydrateFromCloud(data.user);
      const merged = this._mergeGuestInto(user);
      return { success: true, user: this.getCurrentUser() || user, needsConfirm: false, hasSession: true, merged };
    } catch (err) {
      return { success: false, message: this.translateError(err.message) };
    }
  },

  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return { success: false, message: 'Vui lòng nhập Email!' };
    if (!password) return { success: false, message: 'Vui lòng nhập mật khẩu!' };

    const sb = getSupabase();
    if (!sb) return { success: false, message: 'Không kết nối được máy chủ. Vui lòng kiểm tra Internet và tải lại trang.' };

    let targetEmail = cleanEmail;
    if (!targetEmail.includes('@')) {
      const found = Object.values(this.getAllUsers()).find(u => u.username && u.username.toLowerCase() === cleanEmail);
      if (!found || !found.email) return { success: false, message: 'Vui lòng đăng nhập bằng địa chỉ Email bạn đã dùng khi đăng ký.' };
      targetEmail = found.email;
    }

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: targetEmail, password });
      if (error) return { success: false, message: this.translateError(error.message) };
      const user = await this._hydrateFromCloud(data.user);
      const merged = this._mergeGuestInto(user);
      this.updateStreak();
      return { success: true, user: this.getCurrentUser() || user, merged };
    } catch (err) {
      return { success: false, message: this.translateError(err.message) };
    }
  },

  async forgotPassword(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, message: 'Vui lòng nhập địa chỉ Email hợp lệ!' };
    }
    const sb = getSupabase();
    if (!sb) return { success: false, message: 'Không kết nối được máy chủ.' };
    try {
      const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, { redirectTo: window.location.origin });
      if (error) return { success: false, message: this.translateError(error.message) };
      return {
        success: true,
        message: `Đã gửi liên kết đặt lại mật khẩu tới ${cleanEmail}. Hãy kiểm tra Hộp thư đến (hoặc mục Spam).`
      };
    } catch (err) {
      return { success: false, message: this.translateError(err.message) };
    }
  },

  async updateNewPassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Mật khẩu mới tối thiểu 6 ký tự!' };
    }
    const sb = getSupabase();
    if (!sb) return { success: false, message: 'Không kết nối được máy chủ.' };
    try {
      const { data, error } = await sb.auth.updateUser({ password: newPassword });
      if (error) return { success: false, message: this.translateError(error.message) };
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, message: this.translateError(e.message) };
    }
  },

  async logout() {
    if (this._pendingSync) await this.flushSync();
    const sb = getSupabase();
    if (sb) {
      try { await sb.auth.signOut(); } catch (e) { /* ignore */ }
    }
    localStorage.removeItem(this.KEY_CURRENT_USER);
    const users = this.getAllUsers();
    delete users[this.GUEST_KEY];
    this.saveAllUsers(users);
  },

  updateStreak() {
    const user = this.getCurrentUser();
    if (!user) return 1;

    const today = new Date().toISOString().slice(0, 10);
    const lastDate = user.lastActiveDate;

    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastDate === yesterday) {
        user.streak = (user.streak || 1) + 1;
      } else {
        user.streak = 1;
      }
      user.lastActiveDate = today;
      this.saveCurrentUser(user);
    }
    return user.streak || 1;
  },

  // LESSON COMPLETION TRACKING
  toggleLessonCompleted(lessonId) {
    const user = this.getCurrentUser();
    if (!user) return false;
    user.completedLessons = user.completedLessons || [];
    const idx = user.completedLessons.indexOf(lessonId);
    let isCompleted = false;
    if (idx > -1) {
      user.completedLessons.splice(idx, 1);
      isCompleted = false;
    } else {
      user.completedLessons.push(lessonId);
      isCompleted = true;
      this.addXP(50, `Hoàn thành Bài ${lessonId}`);
    }
    this.saveCurrentUser(user);
    return isCompleted;
  },

  /** Mark a lesson as completed (idempotent, never un-completes). Returns true if newly completed. */
  markLessonCompleted(lessonId) {
    const user = this.getCurrentUser();
    if (!user) return false;
    user.completedLessons = user.completedLessons || [];
    if (user.completedLessons.includes(lessonId)) return false;
    user.completedLessons.push(lessonId);
    this.saveCurrentUser(user);
    this.addXP(50, `Hoàn thành Bài ${lessonId}`);
    return true;
  },

  getLessonStep(lessonId) {
    const user = this.getCurrentUser();
    return (user && user.lessonSteps && user.lessonSteps[lessonId]) || 0;
  },

  setLessonStep(lessonId, step) {
    const user = this.getCurrentUser();
    if (!user) return;
    user.lessonSteps = user.lessonSteps || {};
    if ((user.lessonSteps[lessonId] || 0) >= step) return;
    user.lessonSteps[lessonId] = step;
    this.saveCurrentUser(user);
  },

  isLessonCompleted(lessonId) {
    const user = this.getCurrentUser();
    if (!user || !user.completedLessons) return false;
    return user.completedLessons.includes(lessonId);
  },

  setLastActiveLesson(lessonId) {
    const user = this.getCurrentUser();
    if (!user) return;
    user.lastActiveLesson = lessonId;
    this.saveCurrentUser(user);
  },

  // BOOKMARKS
  toggleBookmark(wordId) {
    const user = this.getCurrentUser();
    if (!user) return false;
    user.bookmarks = user.bookmarks || [];
    const idx = user.bookmarks.indexOf(wordId);
    if (idx > -1) {
      user.bookmarks.splice(idx, 1);
    } else {
      user.bookmarks.push(wordId);
    }
    this.saveCurrentUser(user);
    return idx === -1;
  },

  isBookmarked(wordId) {
    const user = this.getCurrentUser();
    if (!user || !user.bookmarks) return false;
    return user.bookmarks.includes(wordId);
  },

  // SRS PROGRESS
  updateWordSrs(wordId, quality) {
    const user = this.getCurrentUser();
    if (!user) return;
    user.wordProgress = user.wordProgress || {};
    if (!user.wordProgress[wordId]) {
      user.wordProgress[wordId] = { srsLevel: 0, reviewCount: 0 };
    }
    const item = user.wordProgress[wordId];
    if (!item.firstSeen) item.firstSeen = new Date().toISOString().slice(0, 10);
    item.reviewCount = (item.reviewCount || 0) + 1;
    item.lastStudied = Date.now();

    const intervals = [1, 2, 4, 7, 14, 30];
    if (quality === 'again') {
      item.srsLevel = 0;
      item.lapses = (item.lapses || 0) + 1;
    } else if (quality === 'hard') {
      item.srsLevel = Math.max(0, item.srsLevel || 0);
    } else if (quality === 'good') {
      item.srsLevel = Math.min(intervals.length - 1, (item.srsLevel || 0) + 1);
    } else if (quality === 'easy') {
      item.srsLevel = Math.min(intervals.length - 1, (item.srsLevel || 0) + 2);
    }

    // "again" comes back in ~10 minutes within the same session; others after N days
    item.nextReview = quality === 'again'
      ? Date.now() + 10 * 60000
      : Date.now() + intervals[item.srsLevel] * 86400000;
    this.saveCurrentUser(user);
    this.addXP(2, 'Ôn từ vựng');
    this.recordDailyAction('vocab', 1);
  },

  // CUSTOM WORDS
  addCustomWord(word) {
    const user = this.getCurrentUser();
    if (!user) return null;
    user.customWords = user.customWords || [];
    const newWord = {
      id: 'custom_' + Date.now(),
      hsk: word.hsk || 1,
      lesson: 'Tự thêm',
      hanzi: word.hanzi.trim(),
      pinyin: word.pinyin.trim(),
      pos: word.pos || 'Từ vựng',
      hanviet: word.hanviet.trim(),
      meaning: word.meaning.trim(),
      isCustom: true
    };
    user.customWords.push(newWord);
    this.saveCurrentUser(user);
    return newWord;
  },

  deleteCustomWord(wordId) {
    const user = this.getCurrentUser();
    if (!user || !user.customWords) return;
    user.customWords = user.customWords.filter(w => w.id !== wordId);
    this.saveCurrentUser(user);
  },

  recordQuiz(correctCount, totalCount) {
    const user = this.getCurrentUser();
    if (!user) return;
    user.quizHighScores = user.quizHighScores || { totalQuizzes: 0, totalCorrect: 0, bestScore: 0 };
    user.quizHighScores.totalQuizzes += 1;
    user.quizHighScores.totalCorrect += correctCount;
    const scorePct = Math.round((correctCount / totalCount) * 100);
    if (scorePct > (user.quizHighScores.bestScore || 0)) {
      user.quizHighScores.bestScore = scorePct;
    }
    this.saveCurrentUser(user);

    // Gamification rewards for quiz
    const earnedXP = correctCount * 5 + (scorePct === 100 ? 20 : 0);
    this.addXP(earnedXP, 'Luyện trắc nghiệm');
    this.recordDailyAction('quiz', 1);
  },

  // XP & GAMIFICATION
  addXP(amount, reason = '') {
    const user = this.getCurrentUser();
    if (!user) return null;
    const oldLevel = this.getXPLevel(user.xp || 0);
    user.xp = Math.max(0, (user.xp || 0) + amount);
    const newLevel = this.getXPLevel(user.xp);

    this.saveCurrentUser(user);

    if (newLevel.level > oldLevel.level) {
      if (typeof AudioEngine !== 'undefined' && AudioEngine.playVictorySound) {
        AudioEngine.playVictorySound();
      }
      if (typeof App !== 'undefined' && App.toast) {
        App.toast(`🎉 Chúc mừng! Bạn đã thăng cấp: ${newLevel.badge} ${newLevel.title}!`, 'success', 5000);
      }
    } else if (amount >= 10 && typeof App !== 'undefined' && App.toast) {
      App.toast(`+${amount} XP ${reason ? `(${reason})` : ''}`, 'info', 2000);
    }

    if (typeof App !== 'undefined' && App.updateDashboardStats) {
      App.updateDashboardStats();
    }
    return newLevel;
  },

  getXPLevel(xp = 0) {
    const current = Math.max(0, xp);
    const levels = [
      { level: 1, title: 'Sơ nhập Giang hồ', badge: '🌱', minXP: 0, nextXP: 200 },
      { level: 2, title: 'Học đồ Hán ngữ', badge: '🥉', minXP: 200, nextXP: 500 },
      { level: 3, title: 'Hiệp khách HSK 1', badge: '🥈', minXP: 500, nextXP: 1000 },
      { level: 4, title: 'Cao thủ HSK 2', badge: '🥇', minXP: 1000, nextXP: 2000 },
      { level: 5, title: 'Hán Ngữ Tinh Anh', badge: '💎', minXP: 2000, nextXP: 4000 },
      { level: 6, title: 'Đại Sư Hán Học', badge: '👑', minXP: 4000, nextXP: 99999 }
    ];

    let found = levels[0];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (current >= levels[i].minXP) {
        found = levels[i];
        break;
      }
    }

    const range = found.nextXP - found.minXP;
    const inRange = current - found.minXP;
    const progressPct = found.nextXP >= 99999 ? 100 : Math.min(100, Math.round((inRange / range) * 100));

    return {
      level: found.level,
      title: found.title,
      badge: found.badge,
      currentXP: current,
      minXP: found.minXP,
      nextXP: found.nextXP,
      progressPct
    };
  },

  // DAILY GOALS
  getDailyGoals() {
    const user = this.getCurrentUser();
    const today = new Date().toISOString().slice(0, 10);
    const defaults = {
      vocab: { current: 0, target: 10, label: 'Ôn 10 từ vựng' },
      writing: { current: 0, target: 3, label: 'Luyện viết 3 chữ' },
      quiz: { current: 0, target: 1, label: 'Làm 1 bài trắc nghiệm' },
      speech: { current: 0, target: 2, label: 'Luyện phát âm 2 từ' }
    };

    if (!user) return defaults;
    user.dailyGoals = user.dailyGoals || {};
    if (!user.dailyGoals[today]) {
      user.dailyGoals[today] = { vocab: 0, writing: 0, quiz: 0, speech: 0 };
    }
    const todayData = user.dailyGoals[today];
    return {
      vocab: { current: todayData.vocab || 0, target: 10, label: 'Ôn 10 từ vựng' },
      writing: { current: todayData.writing || 0, target: 3, label: 'Luyện viết 3 chữ' },
      quiz: { current: todayData.quiz || 0, target: 1, label: 'Làm 1 bài trắc nghiệm' },
      speech: { current: todayData.speech || 0, target: 2, label: 'Luyện phát âm 2 từ' }
    };
  },

  recordDailyAction(type, amount = 1) {
    const user = this.getCurrentUser();
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    user.dailyGoals = user.dailyGoals || {};
    if (!user.dailyGoals[today]) {
      user.dailyGoals[today] = { vocab: 0, writing: 0, quiz: 0, speech: 0 };
    }
    const oldVal = user.dailyGoals[today][type] || 0;
    user.dailyGoals[today][type] = oldVal + amount;

    // Check if goal just completed
    const targets = { vocab: 10, writing: 3, quiz: 1, speech: 2 };
    const target = targets[type] || 1;
    if (oldVal < target && user.dailyGoals[today][type] >= target) {
      this.addXP(25, 'Hoàn thành mục tiêu ngày');
    } else {
      this.saveCurrentUser(user);
    }
  },

  getStats(totalAppWords) {
    const user = this.getCurrentUser();
    if (!user) {
      return {
        streak: 1,
        mastered: 0,
        learning: 0,
        notStarted: totalAppWords,
        bookmarksCount: 0,
        customCount: 0,
        completedLessonsCount: 0,
        totalQuizzes: 0,
        bestScore: 0
      };
    }

    const progressValues = Object.values(user.wordProgress || {});
    const mastered = progressValues.filter(p => p.srsLevel >= 3).length;
    const learning = progressValues.filter(p => p.srsLevel > 0 && p.srsLevel < 3).length;
    const customCount = (user.customWords || []).length;
    const totalWords = totalAppWords + customCount;
    const completedLessonsCount = (user.completedLessons || []).length;

    return {
      streak: user.streak || 1,
      mastered,
      learning,
      notStarted: Math.max(0, totalWords - mastered - learning),
      bookmarksCount: (user.bookmarks || []).length,
      customCount,
      completedLessonsCount,
      totalQuizzes: user.quizHighScores ? user.quizHighScores.totalQuizzes : 0,
      bestScore: user.quizHighScores ? user.quizHighScores.bestScore : 0
    };
  }
};

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
/**
 * Audio Engine: Web Speech API (Chinese TTS) + Web Audio API Sound Effects
 * With high-reliability /api/tts serverless proxy fallback and Chromium/Safari protection.
 */
const AudioEngine = {
  speechRate: 0.9,
  audioCtx: null,
  _activeUtterances: [],
  _fallbackAudio: null,
  _voice: null,

  initAudioContext() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch(e) {}
  },

  getMandarinVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const norm = v => (v.lang || '').toLowerCase().replace('_', '-');
    const score = v => {
      const l = norm(v);
      const n = (v.name || '').toLowerCase();
      let s = 0;
      if (l === 'zh-cn' || l.startsWith('cmn')) s += 100;
      else if (l.startsWith('zh-hans')) s += 90;
      else if (l === 'zh-tw') s += 40;
      else if (l.startsWith('zh-hk') || l.startsWith('yue')) s -= 50;
      else if (l.startsWith('zh')) s += 30;
      else return -1000;
      if (/google|tingting|ting-ting|xiaoxiao|yunxi|lili|meijia|sinji|kangkang/.test(n)) s += 15;
      if (v.localService) s += 2;
      return s;
    };
    const best = voices.map(v => [score(v), v]).filter(x => x[0] > -1000).sort((a, b) => b[0] - a[0])[0];
    this._voice = best ? best[1] : null;
    return this._voice;
  },

  speak(text, onEnd) {
    if (!text) return;
    const cleanText = String(text).replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return;

    // Wake up AudioContext on user interaction
    this.initAudioContext();

    // Check if browser has Web Speech API support
    const hasSpeech = (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');
    
    if (hasSpeech) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const voices = window.speechSynthesis.getVoices() || [];
        const zhVoice = this.getMandarinVoice();

        // If voices list is already populated and absolutely NO Chinese voice exists, jump directly to serverless TTS fallback
        if (voices.length > 0 && !zhVoice) {
          this.playFallbackAudio(cleanText, onEnd);
          return;
        }

        // Only cancel if speech is currently playing to avoid Chromium idle cancel race
        if (window.speechSynthesis.speaking) {
          try { window.speechSynthesis.cancel(); } catch(e) {}
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'zh-CN';
        utterance.rate = this.speechRate || 0.9;

        if (zhVoice) {
          utterance.voice = zhVoice;
        }

        this._activeUtterances.push(utterance);

        let hasStarted = false;
        let hasFinished = false;

        const cleanup = () => {
          if (hasFinished) return;
          hasFinished = true;
          if (watchdog) clearTimeout(watchdog);
          const idx = this._activeUtterances.indexOf(utterance);
          if (idx > -1) this._activeUtterances.splice(idx, 1);
        };

        // Watchdog: If native speech fails to trigger onstart within 350ms, switch to online fallback
        const watchdog = setTimeout(() => {
          if (!hasStarted && !hasFinished) {
            console.warn('Native speech watchdog timed out, playing fallback audio');
            cleanup();
            try { window.speechSynthesis.cancel(); } catch(e) {}
            this.playFallbackAudio(cleanText, onEnd);
          }
        }, 350);

        utterance.onstart = () => {
          hasStarted = true;
          if (watchdog) clearTimeout(watchdog);
        };

        utterance.onend = () => {
          cleanup();
          if (onEnd) onEnd();
        };

        utterance.onerror = (err) => {
          console.warn('Native speech utterance error:', err);
          cleanup();
          this.playFallbackAudio(cleanText, onEnd);
        };

        // Call speak synchronously inside user interaction
        window.speechSynthesis.speak(utterance);

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        return;
      } catch (err) {
        console.warn('SpeechSynthesis exception, using fallback:', err);
        this.playFallbackAudio(cleanText, onEnd);
        return;
      }
    }

    // Fallback if speechSynthesis is not available
    this.playFallbackAudio(cleanText, onEnd);
  },

  playFallbackAudio(text, onEnd) {
    try {
      if (this._fallbackAudio) {
        try {
          this._fallbackAudio.pause();
          this._fallbackAudio.src = '';
        } catch(e) {}
      }

      const encoded = encodeURIComponent(String(text).trim());
      // Proxy through high-speed Vercel serverless function with proper headers and caching
      const audioUrl = `/api/tts?text=${encoded}`;
      const audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous';
      this._fallbackAudio = audio;

      let hasFinished = false;
      const done = () => {
        if (hasFinished) return;
        hasFinished = true;
        if (onEnd) onEnd();
      };

      audio.onended = done;
      audio.onerror = (e) => {
        console.warn('TTS proxy playback error:', e);
        done();
      };

      const playPromise = audio.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(e => {
          console.warn('Audio play() promise rejected:', e);
          done();
        });
      }
    } catch(e) {
      console.warn('playFallbackAudio exception:', e);
      if (onEnd) onEnd();
    }
  },

  playCorrectSound() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch(e) {}
  },

  playWrongSound() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch(e) {}
  },

  playVictorySound() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = this.audioCtx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const startTime = now + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch(e) {}
  },

  playClickSound() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch(e) {}
  },

  _recognition: null,
  isListening: false,

  recognizeSpeech(expectedText, onResult) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (typeof App !== 'undefined' && App.toast) {
        App.toast('Trình duyệt chưa hỗ trợ ghi âm tiếng Trung. Bạn hãy thử Google Chrome hoặc Edge nhé!', 'warning', 4000);
      }
      return;
    }

    if (this.isListening && this._recognition) {
      try { this._recognition.stop(); } catch(e) {}
      this.isListening = false;
      return;
    }

    try {
      this._recognition = new SpeechRecognition();
      this._recognition.lang = 'zh-CN';
      this._recognition.interimResults = false;
      this._recognition.maxAlternatives = 3;

      this.isListening = true;
      if (typeof App !== 'undefined' && App.toast) {
        App.toast(`🎙️ Đang nghe... Hãy đọc to: "${expectedText}"`, 'info', 3000);
      }

      this._recognition.onresult = (event) => {
        this.isListening = false;
        const results = event.results[0];
        const spoken = results && results[0] ? results[0].transcript.trim() : '';
        const cleanExp = (expectedText || '').replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').toLowerCase();
        const cleanSpoken = spoken.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').toLowerCase();

        const isExact = cleanSpoken === cleanExp;
        const isClose = cleanSpoken.includes(cleanExp) || cleanExp.includes(cleanSpoken);

        if (isExact || (isClose && cleanSpoken.length > 0)) {
          this.playCorrectSound();
          if (typeof App !== 'undefined') {
            App.toast(`🎉 Xuất sắc! Phát âm rất chuẩn: "${spoken}"`, 'success', 3500);
            if (typeof StorageManager !== 'undefined' && StorageManager.addXP) {
              StorageManager.addXP(10, 'Phát âm chuẩn');
              StorageManager.recordDailyAction('speech', 1);
            }
          }
          if (onResult) onResult({ success: true, spoken, expected: expectedText });
        } else {
          this.playWrongSound();
          if (typeof App !== 'undefined') {
            App.toast(`Âm bạn vừa đọc: "${spoken}". Chưa khớp với "${expectedText}", hãy thử lại!`, 'warning', 4000);
          }
          if (onResult) onResult({ success: false, spoken, expected: expectedText });
        }
      };

      this._recognition.onerror = (e) => {
        this.isListening = false;
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          if (typeof App !== 'undefined' && App.toast) {
            App.toast('Vui lòng cấp quyền truy cập Micro trên trình duyệt để luyện nói.', 'warning', 4000);
          }
        } else if (e.error !== 'aborted') {
          if (typeof App !== 'undefined' && App.toast) {
            App.toast('Chưa thu được âm thanh. Hãy nhấn lại Micro và đọc to rõ hơn nhé!', 'info', 3000);
          }
        }
        if (onResult) onResult({ success: false, error: e.error });
      };

      this._recognition.onend = () => {
        this.isListening = false;
      };

      this._recognition.start();
    } catch (err) {
      this.isListening = false;
      console.warn('Failed to start speech recognition:', err);
    }
  }
};

// Global User Interaction Listener to unlock AudioContext and SpeechSynthesis
if (typeof document !== 'undefined') {
  const unlockAudio = () => {
    AudioEngine.initAudioContext();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };
  document.addEventListener('click', unlockAudio, { passive: true });
  document.addEventListener('touchstart', unlockAudio, { passive: true });
}

// Pre-load voices on browser
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    AudioEngine._voice = null;
    AudioEngine.getMandarinVoice();
  };
}

/** Escape user-provided text before injecting into HTML. */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Escape text for use inside a single-quoted JS string within an HTML attribute. */
function jsArg(str) {
  return escapeHtml(String(str == null ? '' : str).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}

if (typeof window !== 'undefined') {
  window.AudioEngine = AudioEngine;
  window.escapeHtml = escapeHtml;
  window.jsArg = jsArg;
}
/**
 * Shared UI kit (v14 redesign)
 * - Icon: inline SVG line icons (consistent across iOS / Android / Windows, replaces emoji icons)
 * - Tone: pinyin syllable segmentation + tone colouring
 * - Prefs: learner display preferences (pinyin / Hán Việt visibility)
 * - UI: toast, confirm dialog and bottom sheet (replace window.alert / confirm)
 */

const Icon = {
  paths: {
    learn: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M8 7h7M8 11h5"/>',
    review: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/>',
    dict: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sound: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    starFill: '<path fill="currentColor" d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-7 0-3.2-2-5.8-4-7.5.2 2-1 3.5-2.5 3.5C11 11 12 7 9.5 3 9 7 5 9.5 5 15c0 4.3 3 7 7 7z"/>',
    cards: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01"/>',
    puzzle: '<path d="M4 7h3a2 2 0 1 0 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H4v-3a2 2 0 1 0 0-4z"/>',
    grammar: '<path d="M4 6h16M4 12h10M4 18h7"/><path d="m15 15 2.5 2.5L22 13"/>',
    headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pause: '<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.3-8.8A6 6 0 0 0 4.5 13 3 3 0 0 0 6 19z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    book: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  },

  /** Returns an inline SVG string. `cls` is added to the svg element. */
  svg(name, cls = '') {
    const p = this.paths[name] || this.paths.sparkle;
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${p}</svg>`;
  }
};

const Tone = {
  // Toned vowel -> [base, tone]
  map: (() => {
    const m = {};
    const rows = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
    Object.entries(rows).forEach(([base, marks]) => {
      [...marks].forEach((ch, i) => { m[ch] = [base, i + 1]; m[ch.toUpperCase()] = [base.toUpperCase(), i + 1]; });
    });
    return m;
  })(),

  FINALS: ['iang', 'iong', 'uang', 'ueng', 'ang', 'eng', 'ing', 'ong', 'uai', 'uan', 'ian', 'iao', 'van', 'üan',
    'ai', 'ei', 'ao', 'ou', 'an', 'en', 'in', 'un', 'ün', 'vn', 'ia', 'ie', 'iu', 'ua', 'uo', 'ui', 'ue', 'üe', 've', 'er',
    'a', 'o', 'e', 'i', 'u', 'ü', 'v'],
  INITIALS: ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'],

  /** Strip tone marks. Returns { plain, tones[] } where tones[i] is the tone carried at index i (0 = none). */
  _strip(word) {
    let plain = '';
    const tones = [];
    for (const ch of word) {
      const hit = this.map[ch];
      plain += hit ? hit[0] : ch;
      tones.push(hit ? hit[1] : 0);
    }
    return { plain, tones };
  },

  /** Split one space-free pinyin word into syllables. Returns [{text, tone}] or null when it cannot be parsed. */
  splitWord(word) {
    const { plain, tones } = this._strip(word);
    const chars = [...word];
    const low = plain.toLowerCase();
    const out = [];
    let i = 0;
    const isVowel = (c) => 'aeiouüv'.includes(c);
    while (i < low.length) {
      if (low[i] === "'" || low[i] === '’' || low[i] === '-') { i++; continue; }
      let init = '';
      for (const ini of this.INITIALS) { if (low.startsWith(ini, i)) { init = ini; break; } }
      const rest = i + init.length;
      const candidates = this.FINALS.filter((f) => low.startsWith(f, rest)).sort((a, b) => b.length - a.length);
      if (!candidates.length) {
        if (init === 'r' || (init === '' && low[i] === 'r')) { // erhua "r"
          out.push({ start: i, end: i + 1 }); i += 1; continue;
        }
        return null;
      }
      let pick = candidates[0];
      // Prefer a shorter final if the longer one would steal the next syllable's initial vowel
      for (const f of candidates) {
        const after = low[rest + f.length];
        if (!after || !isVowel(after)) { pick = f; break; }
      }
      const end = rest + pick.length;
      out.push({ start: i, end });
      i = end;
    }
    return out.map(({ start, end }) => {
      const text = chars.slice(start, end).join('');
      const tone = tones.slice(start, end).find((t) => t > 0) || 5;
      return { text, tone };
    });
  },

  /** Returns HTML with each syllable wrapped in a tone span. Falls back to escaped text. */
  html(pinyin) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    if (!pinyin) return '';
    return String(pinyin).split(/(\s+|[,.?!;:，。？！；：、…“”"()（）]+)/).map((tok) => {
      if (!tok || /^\s+$/.test(tok) || /^[,.?!;:，。？！；：、…“”"()（）]+$/.test(tok)) return esc(tok);
      const parts = this.splitWord(tok);
      if (!parts) return esc(tok);
      return parts.map((p) => `<span class="t${p.tone}">${esc(p.text)}</span>`).join('');
    }).join('');
  }
};

const Prefs = {
  KEY: 'hnm_prefs_v1',
  data: { pinyin: true, hanviet: true, toneColors: true, newPerDay: 10 },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { /* storage unavailable */ }
    this.apply();
  },

  set(key, value) {
    this.data[key] = value;
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    this.apply();
  },

  apply() {
    if (typeof document === 'undefined' || !document.body || !document.body.classList) return;
    document.body.classList.toggle('pref-hide-pinyin', !this.data.pinyin);
    document.body.classList.toggle('pref-hide-hanviet', !this.data.hanviet);
    document.body.classList.toggle('pref-no-tone-colors', !this.data.toneColors);
  }
};

const UI = {
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  toast(message, type = 'info', duration = 2600) {
    let box = document.getElementById('app-toast-container');
    if (!box) {
      box = document.createElement('div');
      box.id = 'app-toast-container';
      box.className = 'toast-stack';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'check' : (type === 'error' ? 'x' : (type === 'warning' ? 'bulb' : 'sparkle'));
    el.innerHTML = `${Icon.svg(icon)}<span>${this.esc(message)}</span>`;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, duration);
  },

  /** In-page dialog. Resolves true / false. */
  confirm({ title, body = '', ok = 'Đồng ý', cancel = 'Hủy', danger = false }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'dialog-backdrop';
      wrap.innerHTML = `
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h3 id="dialog-title">${this.esc(title)}</h3>
          ${body ? `<div class="dialog-body">${body}</div>` : ''}
          <div class="dialog-actions">
            ${cancel ? `<button type="button" class="btn btn-outline" data-r="0">${this.esc(cancel)}</button>` : ''}
            <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${this.esc(ok)}</button>
          </div>
        </div>`;
      const close = (v) => {
        wrap.classList.remove('show');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => wrap.remove(), 180);
        resolve(v);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(false); };
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) close(false);
        const b = e.target.closest('[data-r]');
        if (b) close(b.dataset.r === '1');
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      requestAnimationFrame(() => {
        wrap.classList.add('show');
        const primary = wrap.querySelector('[data-r="1"]');
        if (primary) primary.focus();
      });
    });
  },

  _scripts: {},
  /** Load an external script once; resolves when ready. */
  loadScript(src) {
    if (this._scripts[src]) return this._scripts[src];
    this._scripts[src] = new Promise((resolve, reject) => {
      if (typeof document === 'undefined' || !document.head || !document.head.appendChild) { reject(new Error('no DOM')); return; }
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = () => resolve(true);
      el.onerror = () => { delete this._scripts[src]; reject(new Error('load failed: ' + src)); };
      document.head.appendChild(el);
    });
    return this._scripts[src];
  },

  alert(title, body = '') {
    return this.confirm({ title, body, ok: 'Đã hiểu', cancel: '' });
  }
};

/**
 * Notes: renders knowledge from the teacher's slides (window.LESSON_NOTES, built by scripts/build-notes.js).
 * Lines containing Chinese become tappable so learners can hear the example.
 */
const Notes = {
  LABELS: {
    chiet_tu: 'Chiết tự', cach_dung: 'Cách dùng', cau_vi_du: 'Ví dụ', tu_mo_rong: 'Từ mở rộng',
    ngu_phap: 'Ngữ pháp', ngu_am: 'Ngữ âm', van_hoa: 'Văn hóa', khac: 'Ghi chú'
  },

  data() {
    return (typeof window !== 'undefined' && window.LESSON_NOTES) || { words: {}, lessons: {} };
  },

  forWord(id) {
    return this.data().words[id] || [];
  },

  forLesson(id, cats) {
    const all = this.data().lessons[id] || [];
    return cats ? all.filter((n) => cats.includes(n.c)) : all;
  },

  /** First chiết tự note of a word, shortened for compact cards (flashcard back, review intro). */
  mnemonic(id) {
    const n = this.forWord(id).find((x) => x.c === 'chiet_tu');
    if (!n) return '';
    return n.x.split('\n').filter((l) => !/^Hán Việt/i.test(l)).join(' ').slice(0, 220);
  },

  /** One line of note text: escapes, highlights hanzi, and makes Chinese tappable to hear it. */
  line(text) {
    const esc = UI.esc(text);
    const han = text.match(/[㐀-鿿][㐀-鿿，。？！、；：“”‘’（）()…—\s]*[㐀-鿿。？！]?/);
    const marked = esc.replace(/([㐀-鿿]+)/g, '<span class="hanzi">$1</span>');
    if (han && han[0].replace(/[^㐀-鿿]/g, '').length >= 2) {
      const zh = han[0].trim();
      return `<button class="note-line note-say" onclick="AudioEngine.speak('${typeof jsArg === 'function' ? jsArg(zh) : zh}')"><span class="note-text">${marked}</span>${Icon.svg('sound')}</button>`;
    }
    return `<p class="note-line">${marked}</p>`;
  },

  item(n, showTag = true) {
    const lines = n.x.split('\n').map((l) => l.trim()).filter(Boolean);
    return `
      <div class="note-item note-${n.c}">
        <div class="note-head">${showTag ? `<span class="note-tag">${this.LABELS[n.c] || ''}</span>` : ''}${n.t ? `<b>${UI.esc(n.t)}</b>` : ''}</div>
        ${lines.map((l) => this.line(l)).join('')}
      </div>`;
  },

  /** Collapsible block under a vocabulary card. */
  wordBlock(id) {
    const notes = this.forWord(id);
    if (!notes.length) return '';
    const cats = [...new Set(notes.map((n) => this.LABELS[n.c]))].join(' · ');
    return `
      <details class="word-notes">
        <summary>${Icon.svg('bulb')}<span>${cats}</span><span class="wn-count">${notes.length}</span></summary>
        <div class="word-notes-body">${notes.map((n) => this.item(n)).join('')}</div>
      </details>`;
  },

  /** Section listing lesson-level notes of the given categories. */
  lessonSection(id, cats, title, intro = '') {
    const notes = this.forLesson(id, cats);
    if (!notes.length) return '';
    return `
      <section class="lesson-notes">
        <h3 class="section-label">${title}</h3>
        ${intro ? `<p class="step-intro">${intro}</p>` : ''}
        <div class="note-list">${notes.map((n) => this.item(n)).join('')}</div>
      </section>`;
  }
};

if (typeof window !== 'undefined') {
  window.Notes = Notes;
  window.Icon = Icon;
  window.Tone = Tone;
  window.Prefs = Prefs;
  window.UI = UI;
}
/**
 * Hanzi Writer & Calligraphy Grid Controller
 */
const HanziController = {
  writerInstance: null,
  currentChar: '好',
  currentWord: '好',
  currentWordChars: ['好'],
  currentCharIndex: 0,
  isQuizActive: false,

  init(containerId) {
    this.containerId = containerId;
    this.loadCharacter('好');
  },

  loadCharacter(input, charIdx = 0) {
    if (!input) return;
    const raw = String(input).trim();
    if (!raw) return;
    const matched = raw.match(/[\u4e00-\u9fa5]/g);
    const chars = (matched && matched.length) ? matched : [raw.charAt(0)];
    const safeIdx = Math.max(0, Math.min(parseInt(charIdx, 10) || 0, chars.length - 1));
    const target = chars[safeIdx];

    this.currentWord = raw;
    this.currentWordChars = chars;
    this.currentCharIndex = safeIdx;
    this.currentChar = target;

    const el = document.getElementById(this.containerId);
    if (!el) return;
    el.innerHTML = '';

    // HanziWriter is loaded on demand (only when the learner opens writing practice)
    if (typeof HanziWriter === 'undefined' && typeof UI !== 'undefined' && UI.loadScript && typeof HANZI_WRITER_URL !== 'undefined' && !this._libTried) {
      this._libTried = true;
      el.innerHTML = '<p class="muted-sm" style="padding:2rem 0; text-align:center;">Đang tải bộ nét chữ...</p>';
      UI.loadScript(HANZI_WRITER_URL)
        .then(() => this.loadCharacter(this.currentWord, this.currentCharIndex))
        .catch(() => this.drawCanvasFallback(target));
      return;
    }

    if (typeof HanziWriter !== 'undefined') {
      try {
        const frameWidth = el.clientWidth || 270;
        const targetSize = Math.max(220, Math.min(280, frameWidth - 10));
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.writerInstance = HanziWriter.create(this.containerId, target, {
          width: targetSize,
          height: targetSize,
          padding: 20,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 150,
          strokeColor: isDark ? '#f1f5f9' : '#0f172a',
          radicalColor: '#ef4444',
          outlineColor: isDark ? '#334155' : '#e2e8f0',
          drawingColor: '#ef4444',
          showOutline: true,
          showCharacter: true
        });
      } catch (err) {
        console.warn('HanziWriter load error, using canvas fallback:', err);
        this.drawCanvasFallback(target);
      }
    } else {
      this.drawCanvasFallback(target);
    }
    
    // Update character details in UI
    const charDisplay = document.getElementById('writer-char-info');
    if (charDisplay) {
      let infoText = chars.length > 1 ? chars.join('') : target;
      if (window.CHINESE_DATA && window.CHINESE_DATA.all_words) {
        const words = window.CHINESE_DATA.all_words;
        const cleanWord = chars.join('');
        const found = words.find(w => w.hanzi === raw || w.hanzi === cleanWord)
          || words.find(w => w.hanzi === target)
          || words.find(w => w.hanzi && w.hanzi.includes(target));
        if (found) {
          infoText = `${found.hanzi} [ ${found.pinyin} ] • ${found.hanviet ? `Hán Việt: ${found.hanviet} • ` : ''}${found.meaning}`;
        }
      }
      const safeInfo = typeof escapeHtml === 'function' ? escapeHtml(infoText) : infoText;
      const safeWordArg = typeof jsArg === 'function' ? jsArg(raw) : raw;
      const pillsHtml = chars.length > 1 ? `
        <div style="display:flex; gap:0.35rem; justify-content:center; flex-wrap:wrap; margin-top:0.45rem;">
          ${chars.map((ch, idx) => `
            <button type="button" class="btn btn-sm ${idx === safeIdx ? 'btn-primary' : 'btn-outline'}" onclick="HanziController.loadCharacter('${safeWordArg}', ${idx})" style="font-family:var(--font-hanzi); font-size:1.1rem; min-width:36px; padding:0.2rem 0.55rem;">
              ${ch}
            </button>
          `).join('')}
        </div>
      ` : '';
      charDisplay.innerHTML = `<div>${safeInfo}</div>${pillsHtml}`;
    }
  },

  animate() {
    if (this.writerInstance) {
      this.writerInstance.showCharacter();
      this.writerInstance.animateCharacter();
    }
  },

  loop() {
    if (this.writerInstance) {
      this.writerInstance.loopCharacterAnimation();
    }
  },

  startQuiz() {
    if (!this.writerInstance) return;
    const feedbackEl = document.getElementById('writer-feedback');
    if (feedbackEl) {
      feedbackEl.innerText = 'Hãy dùng chuột / ngón tay vẽ theo đúng thứ tự nét!';
      feedbackEl.style.color = 'var(--primary)';
    }

    this.isQuizActive = true;
    this.writerInstance.quiz({
      onMistake: (strokeData) => {
        AudioEngine.playWrongSound();
        if (feedbackEl) {
          feedbackEl.innerText = `Sai nét số ${strokeData.strokeNum + 1}! Hãy thử lại.`;
          feedbackEl.style.color = '#ef4444';
        }
      },
      onCorrectStroke: (strokeData) => {
        AudioEngine.playClickSound();
        if (feedbackEl) {
          feedbackEl.innerText = `Nét ${strokeData.strokeNum + 1} chính xác!`;
          feedbackEl.style.color = '#22c55e';
        }
      },
      onComplete: (summaryData) => {
        AudioEngine.playVictorySound();
        if (feedbackEl) {
          feedbackEl.innerText = `Tuyệt vời! Bạn đã hoàn thành chữ "${this.currentChar}" với ${summaryData.totalMistakes} lỗi!`;
          feedbackEl.style.color = '#15803d';
        }
        if (typeof StorageManager !== 'undefined') {
          StorageManager.addXP(10, `Tập viết chữ "${this.currentChar}"`);
          StorageManager.recordDailyAction('writing', 1);
        }
      }
    });
  },

  drawCanvasFallback(char) {
    const el = document.getElementById(this.containerId);
    if (!el) return;
    el.innerHTML = `
      <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; position:relative;">
        <span style="font-family:var(--font-hanzi); font-size:160px; color:rgba(194,59,34,0.18); user-select:none;">${char}</span>
        <canvas id="fallback-canvas" width="290" height="290" style="position:absolute; inset:0; cursor:crosshair;"></canvas>
      </div>
    `;

    // Setup interactive drawing canvas
    const canvas = document.getElementById('fallback-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    ctx.strokeStyle = '#c23b22';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const moveDraw = (e) => {
      if (!drawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const endDraw = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveDraw(e); });
    canvas.addEventListener('touchend', endDraw);
  },

  clearFallbackCanvas() {
    const canvas = document.getElementById('fallback-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
};

if (typeof window !== 'undefined') {
  window.HanziController = HanziController;
}
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
    if (/^hsk\d$/.test(scope)) {
      pool = pool.filter(w => w.hsk === +scope.slice(3));
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
/**
 * Grammar & Sentence Construction Controller (HSK 1 & HSK 2)
 * Duolingo-style Word Ordering (连词成句) & 2-Way Translation (Vi ↔ Zh)
 */

const GRAMMAR_DATA = [
  {
    "id": "g_1_1",
    "lesson": 1,
    "hsk": 1,
    "zh": "你好吗？",
    "py": "Nǐ hǎo ma?",
    "vi": "Bạn khỏe không?",
    "tokens": [
      "你",
      "好",
      "吗",
      "？"
    ],
    "grammarNote": "Câu hỏi nghi vấn cơ bản: [Mệnh đề] + Trợ từ ngữ khí 吗？",
    "distractors": [
      "呢"
    ],
    "wrongVi": [
      "Bạn tên là gì?",
      "Bạn đi đâu đấy?",
      "Bạn có bận không?"
    ],
    "wrongZh": [
      "你好呢？",
      "你是好吗？",
      "你吗好？"
    ]
  },
  {
    "id": "g_1_2",
    "lesson": 1,
    "hsk": 1,
    "zh": "我很好，你呢？",
    "py": "Wǒ hěn hǎo, nǐ ne?",
    "vi": "Tôi rất khỏe, còn bạn?",
    "tokens": [
      "我",
      "很",
      "好",
      "，",
      "你",
      "呢",
      "？"
    ],
    "grammarNote": "Phó từ mức độ 很 đứng trước tính từ; Trợ từ 呢 dùng để hỏi tỉnh lược (Còn... thì sao?).",
    "distractors": [
      "也"
    ],
    "wrongVi": [
      "Tôi không khỏe lắm, còn bạn?",
      "Tôi cũng rất tốt.",
      "Tôi rất bận, bạn thì sao?"
    ],
    "wrongZh": [
      "我很不好，你呢？",
      "也很好我，你呢？",
      "我好很，你呢？"
    ]
  },
  {
    "id": "g_1_3",
    "lesson": 1,
    "hsk": 1,
    "zh": "我也很好。",
    "py": "Wǒ yě hěn hǎo.",
    "vi": "Tôi cũng rất khỏe.",
    "tokens": [
      "我",
      "也",
      "很",
      "好",
      "。"
    ],
    "grammarNote": "Phó từ 也 (cũng) đứng trước phó từ 很 và vị ngữ: Chủ ngữ + 也 + 很 + Tính từ.",
    "distractors": [
      "都"
    ],
    "wrongVi": [
      "Tôi không khỏe.",
      "Chúng tôi đều khỏe.",
      "Bạn cũng khỏe chứ?"
    ],
    "wrongZh": [
      "我也不好。",
      "我很也好。",
      "我也是好。"
    ]
  },
  {
    "id": "g_1_4",
    "lesson": 1,
    "hsk": 1,
    "zh": "妈妈好吗？",
    "py": "Māma hǎo ma?",
    "vi": "Mẹ có khỏe không?",
    "tokens": [
      "妈妈",
      "好",
      "吗",
      "？"
    ],
    "grammarNote": "Chủ ngữ ngôi thứ ba + Tính từ + Trợ từ nghi vấn 吗？",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Mẹ đi đâu rồi?",
      "Mẹ rất khỏe.",
      "Mẹ có bận không?"
    ],
    "wrongZh": [
      "妈妈吗好？",
      "妈妈很好吗？",
      "好妈妈吗？"
    ]
  },
  {
    "id": "g_2_1",
    "lesson": 2,
    "hsk": 1,
    "zh": "汉语不太难。",
    "py": "Hànyǔ bú tài nán.",
    "vi": "Tiếng Hán không khó lắm.",
    "tokens": [
      "汉语",
      "不太",
      "难",
      "。"
    ],
    "grammarNote": "Phó từ 不太 (không... lắm) đứng trước tính từ để giảm nhẹ mức độ.",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Tiếng Hán rất khó.",
      "Tiếng Hán quá khó.",
      "Tiếng Hán không dễ."
    ],
    "wrongZh": [
      "汉语太不难。",
      "汉语很大难。",
      "不汉语太难。"
    ]
  },
  {
    "id": "g_2_2",
    "lesson": 2,
    "hsk": 1,
    "zh": "你忙吗？我很忙。",
    "py": "Nǐ máng ma? Wǒ hěn máng.",
    "vi": "Bạn bận không? Tôi rất bận.",
    "tokens": [
      "你",
      "忙",
      "吗",
      "？",
      "我",
      "很",
      "忙",
      "。"
    ],
    "grammarNote": "Trong câu khẳng định vị ngữ tính từ, thường thêm phó từ 很 trước tính từ.",
    "distractors": [
      "太"
    ],
    "wrongVi": [
      "Bạn khỏe không? Tôi rất khỏe.",
      "Bạn bận không? Tôi không bận.",
      "Bạn học gì? Tôi học tiếng Hán."
    ],
    "wrongZh": [
      "你忙吗？我太忙。",
      "你忙呢？我很忙。",
      "你很忙吗？我不忙。"
    ]
  },
  {
    "id": "g_2_3",
    "lesson": 2,
    "hsk": 1,
    "zh": "爸爸妈妈都很好。",
    "py": "Bàba māma dōu hěn hǎo.",
    "vi": "Bố mẹ đều rất khỏe.",
    "tokens": [
      "爸爸",
      "妈妈",
      "都",
      "很",
      "好",
      "。"
    ],
    "grammarNote": "Phó từ 都 (đều) bổ nghĩa cho chủ ngữ số nhiều, đứng trước vị ngữ.",
    "distractors": [
      "也"
    ],
    "wrongVi": [
      "Bố mẹ tôi cũng khỏe.",
      "Bố mẹ rất bận.",
      "Bố mẹ đi làm rồi."
    ],
    "wrongZh": [
      "爸爸妈妈也很忙。",
      "都爸爸妈妈很好。",
      "爸爸妈妈很都好。"
    ]
  },
  {
    "id": "g_2_4",
    "lesson": 2,
    "hsk": 1,
    "zh": "哥哥不忙，弟弟呢？",
    "py": "Gēge bù máng, dìdi ne?",
    "vi": "Anh trai không bận, còn em trai thì sao?",
    "tokens": [
      "哥哥",
      "不",
      "忙",
      "，",
      "弟弟",
      "呢",
      "？"
    ],
    "grammarNote": "Phủ định dùng 不 (bù), câu hỏi tỉnh lược dùng [Danh từ] + 呢？",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Anh trai rất bận, em trai cũng bận.",
      "Anh trai không khỏe, em trai khỏe không?",
      "Bố không bận, mẹ thì sao?"
    ],
    "wrongZh": [
      "哥哥不忙，弟弟吗？",
      "哥哥不太忙，弟弟呢？",
      "不哥哥忙，弟弟呢？"
    ]
  },
  {
    "id": "g_3_1",
    "lesson": 3,
    "hsk": 1,
    "zh": "明天见！",
    "py": "Míngtiān jiàn!",
    "vi": "Ngày mai gặp lại!",
    "tokens": [
      "明天",
      "见",
      "！"
    ],
    "grammarNote": "Từ chỉ thời gian + 见: Hẹn gặp lại vào mốc thời gian đó (VD: 一会儿见, 星期一见).",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Hôm nay gặp nhé.",
      "Ngày mai bạn đi không?",
      "Hẹn gặp tuần sau."
    ],
    "wrongZh": [
      "今天见！",
      "明天去！",
      "见明天！"
    ]
  },
  {
    "id": "g_3_2",
    "lesson": 3,
    "hsk": 1,
    "zh": "你去不去北京？",
    "py": "Nǐ qù bu qù Běijīng?",
    "vi": "Bạn đi Bắc Kinh không?",
    "tokens": [
      "你",
      "去",
      "不",
      "去",
      "北京",
      "？"
    ],
    "grammarNote": "Câu hỏi chính phản: Động từ + 不 + Động từ (去不去). Không dùng trợ từ 吗 ở cuối câu.",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Bạn đang ở Bắc Kinh à?",
      "Bạn có thích Bắc Kinh không?",
      "Bao giờ bạn đi Bắc Kinh?"
    ],
    "wrongZh": [
      "你去不去北京吗？",
      "你去北京不？",
      "你去北京去？"
    ]
  },
  {
    "id": "g_3_3",
    "lesson": 3,
    "hsk": 1,
    "zh": "你学英语吗？不，学汉语。",
    "py": "Nǐ xué Yīngyǔ ma? Bù, xué Hànyǔ.",
    "vi": "Bạn học tiếng Anh à? Không, học tiếng Hán.",
    "tokens": [
      "你",
      "学",
      "英语",
      "吗",
      "？",
      "不",
      "，",
      "学",
      "汉语",
      "。"
    ],
    "grammarNote": "Câu hỏi với trợ từ 吗 và câu trả lời phủ định ngắn gọn với 不.",
    "distractors": [
      "没"
    ],
    "wrongVi": [
      "Bạn học tiếng Pháp à? Không, học tiếng Anh.",
      "Bạn học tiếng Hán không? Có, tôi học.",
      "Bạn dạy tiếng Anh à? Không."
    ],
    "wrongZh": [
      "你学英语呢？不，学汉语。",
      "你学英语吗？没，学汉语。",
      "你学英语不？学汉语。"
    ]
  },
  {
    "id": "g_3_4",
    "lesson": 3,
    "hsk": 1,
    "zh": "这是汉语书，那是英语书。",
    "py": "Zhè shì Hànyǔ shū, nà shì Yīngyǔ shū.",
    "vi": "Đây là sách tiếng Hán, kia là sách tiếng Anh.",
    "tokens": [
      "这",
      "是",
      "汉语",
      "书",
      "，",
      "那",
      "是",
      "英语",
      "书",
      "。"
    ],
    "grammarNote": "Đại từ chỉ định 这 (đây/gần) và 那 (kia/xa) kết hợp với động từ 是.",
    "distractors": [
      "哪"
    ],
    "wrongVi": [
      "Đây là sách tiếng Anh, kia là sách tiếng Hán.",
      "Đây có phải sách tiếng Hán không?",
      "Sách tiếng Hán ở đâu?"
    ],
    "wrongZh": [
      "哪是汉语书，那是英语书。",
      "这是汉语书，这是英语书。",
      "那是汉语书，这是英语书。"
    ]
  },
  {
    "id": "g_4_1",
    "lesson": 4,
    "hsk": 1,
    "zh": "今天星期几？",
    "py": "Jīntiān xīngqī jǐ?",
    "vi": "Hôm nay là thứ mấy?",
    "tokens": [
      "今天",
      "星期",
      "几",
      "？"
    ],
    "grammarNote": "Hỏi thứ trong tuần: 今天 / 明天 + 星期几？ Đại từ 几 dùng hỏi số lượng nhỏ dưới 10.",
    "distractors": [
      "多少"
    ],
    "wrongVi": [
      "Hôm nay ngày mấy?",
      "Bây giờ là mấy giờ?",
      "Hôm nay thứ mấy bạn đi học?"
    ],
    "wrongZh": [
      "今天星期多少？",
      "今天几星期？",
      "星期几今天？"
    ]
  },
  {
    "id": "g_4_2",
    "lesson": 4,
    "hsk": 1,
    "zh": "你去哪儿？我去天安门。",
    "py": "Nǐ qù nǎr? Wǒ qù Tiān'ānmén.",
    "vi": "Bạn đi đâu đấy? Tôi đi Thiên An Môn.",
    "tokens": [
      "你",
      "去",
      "哪儿",
      "？",
      "我",
      "去",
      "天安门",
      "。"
    ],
    "grammarNote": "Đại từ nghi vấn nơi chốn 哪儿 (nǎr): Chủ ngữ + 去 + 哪儿？",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Bạn ở đâu? Tôi ở Thiên An Môn.",
      "Bạn đi Thiên An Môn với ai?",
      "Bạn từ đâu tới? Tôi tới từ Thiên An Môn."
    ],
    "wrongZh": [
      "你在哪儿？我去天安门。",
      "你去那儿？我去天安门。",
      "你去哪儿？我在天安门。"
    ]
  },
  {
    "id": "g_4_3",
    "lesson": 4,
    "hsk": 1,
    "zh": "我不去，我回学校。",
    "py": "Wǒ bú qù, wǒ huí xuéxiào.",
    "vi": "Tôi không đi, tôi về trường học.",
    "tokens": [
      "我",
      "不",
      "去",
      "，",
      "我",
      "回",
      "学校",
      "。"
    ],
    "grammarNote": "Động từ 回 (về): 回 + Địa điểm (về trường, về nhà, về nước).",
    "distractors": [
      "来"
    ],
    "wrongVi": [
      "Tôi không đi, tôi ở trường học.",
      "Tôi đi trường học, bạn đi không?",
      "Tôi về nhà rồi."
    ],
    "wrongZh": [
      "我没去，我回学校。",
      "我不去，我去学校。",
      "我不来，我回学校。"
    ]
  },
  {
    "id": "g_4_4",
    "lesson": 4,
    "hsk": 1,
    "zh": "今天我去银行，明天去天安门。",
    "py": "Jīntiān wǒ qù yínháng, míngtiān qù Tiān'ānmén.",
    "vi": "Hôm nay tôi đi ngân hàng, ngày mai đi Thiên An Môn.",
    "tokens": [
      "今天",
      "我",
      "去",
      "银行",
      "，",
      "明天",
      "去",
      "天安门",
      "。"
    ],
    "grammarNote": "Quy tắc vàng: Trạng ngữ thời gian (今天, 明天) đứng trước hoặc ngay sau chủ ngữ, trước động từ.",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Hôm nay tôi ở ngân hàng, ngày mai ở Thiên An Môn.",
      "Hôm qua tôi đi ngân hàng, hôm nay đi Thiên An Môn.",
      "Ngày mai tôi đi ngân hàng cùng bạn."
    ],
    "wrongZh": [
      "今天我去银行，明天在天安门。",
      "我今天去银行，去明天天安门。",
      "今天我去天安门，明天去银行。"
    ]
  },
  {
    "id": "g_5_1",
    "lesson": 5,
    "hsk": 1,
    "zh": "这是王老师，这是我爸爸。",
    "py": "Zhè shì Wáng lǎoshī, zhè shì wǒ bàba.",
    "vi": "Đây là thầy Vương, đây là bố tôi.",
    "tokens": [
      "这",
      "是",
      "王老师",
      "，",
      "这",
      "是",
      "我",
      "爸爸",
      "。"
    ],
    "grammarNote": "Câu chữ 是 giới thiệu người: 这 + 是 + [Danh từ xưng hô / Tên riêng].",
    "distractors": [
      "那"
    ],
    "wrongVi": [
      "Kia là thầy Vương, kia là bố tôi.",
      "Đây là bố tôi, kia là thầy Vương.",
      "Thầy Vương là bố của tôi."
    ],
    "wrongZh": [
      "那是王老师，这是我爸爸。",
      "这有王老师，这是我爸爸。",
      "王老师是这，爸爸是我。"
    ]
  },
  {
    "id": "g_5_2",
    "lesson": 5,
    "hsk": 1,
    "zh": "请进，请坐，请喝茶。",
    "py": "Qǐng jìn, qǐng zuò, qǐng hē chá.",
    "vi": "Mời vào, mời ngồi, mời uống trà.",
    "tokens": [
      "请进",
      "，",
      "请坐",
      "，",
      "请喝茶",
      "。"
    ],
    "grammarNote": "Từ lịch sự 请 (mời, xin) đứng đầu câu cầu khiến: 请 + Động từ.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Mời vào, mời uống nước, mời ngồi.",
      "Xin chào, mời vào uống trà.",
      "Thầy giáo mời chúng tôi uống trà."
    ],
    "wrongZh": [
      "去进，去坐，去喝茶。",
      "请坐，请进，请喝茶。",
      "请进，请喝茶，请坐。"
    ]
  },
  {
    "id": "g_5_3",
    "lesson": 5,
    "hsk": 1,
    "zh": "工作忙不忙？不太忙。",
    "py": "Gōngzuò máng bu máng? Bú tài máng.",
    "vi": "Công việc bận không? Không bận lắm.",
    "tokens": [
      "工作",
      "忙",
      "不",
      "忙",
      "？",
      "不太",
      "忙",
      "。"
    ],
    "grammarNote": "Câu hỏi chính phản với tính từ: Tính từ + 不 + Tính từ (忙不忙).",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Công việc tốt không? Rất tốt.",
      "Bạn có bận việc không? Rất bận.",
      "Công việc của bạn thế nào?"
    ],
    "wrongZh": [
      "工作忙不忙吗？不太忙。",
      "工作不忙吗？不太忙。",
      "工作忙忙不？不太忙。"
    ]
  },
  {
    "id": "g_5_4",
    "lesson": 5,
    "hsk": 1,
    "zh": "我的老师是中国人。",
    "py": "Wǒ de lǎoshī shì Zhōngguó rén.",
    "vi": "Thầy giáo của tôi là người Trung Quốc.",
    "tokens": [
      "我",
      "的",
      "老师",
      "是",
      "中国",
      "人",
      "。"
    ],
    "grammarNote": "Trợ từ kết cấu 的 biểu thị sở hữu: Định ngữ + 的 + Trung tâm ngữ.",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Thầy giáo của tôi dạy tiếng Trung.",
      "Thầy giáo tôi đang ở Trung Quốc.",
      "Tôi là học sinh của thầy giáo Trung Quốc."
    ],
    "wrongZh": [
      "我老师有中国人。",
      "我的老师在日本人。",
      "中国是我的老师。"
    ]
  },
  {
    "id": "g_6_1",
    "lesson": 6,
    "hsk": 1,
    "zh": "你叫什么名字？",
    "py": "Nǐ jiào shénme míngzi?",
    "vi": "Bạn tên là gì?",
    "tokens": [
      "你",
      "叫",
      "什么",
      "名字",
      "？"
    ],
    "grammarNote": "Đại từ nghi vấn 什么 đặt trước danh từ 名字.",
    "distractors": [
      "哪"
    ],
    "wrongVi": [
      "Bạn họ gì?",
      "Bạn là ai?",
      "Bạn ở đâu?"
    ],
    "wrongZh": [
      "你叫谁名字？",
      "你是名字什么？",
      "名字你叫什么？"
    ]
  },
  {
    "id": "g_6_2",
    "lesson": 6,
    "hsk": 1,
    "zh": "我学习汉语，汉字很难。",
    "py": "Wǒ xuéxí Hànyǔ, hànzì hěn nán.",
    "vi": "Tôi học tiếng Hán, chữ Hán rất khó.",
    "tokens": [
      "我",
      "学习",
      "汉语",
      "，",
      "汉字",
      "很",
      "难",
      "。"
    ],
    "grammarNote": "Động từ 学习 mang tân ngữ 汉语; Vị ngữ tính từ 很难.",
    "distractors": [
      "不"
    ],
    "wrongVi": [
      "Tôi học tiếng Anh, phát âm rất khó.",
      "Tiếng Hán không khó lắm.",
      "Tôi viết chữ Hán rất đẹp."
    ],
    "wrongZh": [
      "我学汉语，汉字不难。",
      "我学习汉语，汉字太难。",
      "汉语我学，难汉字。"
    ]
  },
  {
    "id": "g_6_3",
    "lesson": 6,
    "hsk": 1,
    "zh": "请问，你贵姓？我姓张。",
    "py": "Qǐngwèn, nǐ guìxìng? Wǒ xìng Zhāng.",
    "vi": "Xin hỏi, bạn họ gì? Tôi họ Trương.",
    "tokens": [
      "请问",
      "，",
      "你",
      "贵姓",
      "？",
      "我",
      "姓",
      "张",
      "。"
    ],
    "grammarNote": "Cách hỏi họ lịch sự: 贵姓; Trả lời dùng: 我姓 + Họ.",
    "distractors": [
      "叫"
    ],
    "wrongVi": [
      "Xin hỏi, bạn tên gì? Tôi tên Trương.",
      "Bạn là người nước nào?",
      "Tôi là bạn của Trương Đông."
    ],
    "wrongZh": [
      "请问，你叫什么？我姓张。",
      "请问，你名字？我姓张。",
      "你贵姓请问？我张姓。"
    ]
  },
  {
    "id": "g_6_4",
    "lesson": 6,
    "hsk": 1,
    "zh": "你是哪国人？我是越南人。",
    "py": "Nǐ shì nǎ guó rén? Wǒ shì Yuènán rén.",
    "vi": "Bạn là người nước nào? Tôi là người Việt Nam.",
    "tokens": [
      "你",
      "是",
      "哪",
      "国",
      "人",
      "？",
      "我",
      "是",
      "越南",
      "人",
      "。"
    ],
    "grammarNote": "Đại từ 哪 (nào): 哪 + Danh từ / Quốc gia (哪国人).",
    "distractors": [
      "什么"
    ],
    "wrongVi": [
      "Bạn đi nước nào?",
      "Bạn có phải người Việt Nam không?",
      "Bạn biết nói tiếng nước nào?"
    ],
    "wrongZh": [
      "你是谁国人？我是越南人。",
      "你是什么国人？我是越南人。",
      "哪国人你是？我是越南人。"
    ]
  },
  {
    "id": "g_7_1",
    "lesson": 7,
    "hsk": 1,
    "zh": "中午你去哪儿吃饭？",
    "py": "Zhōngwǔ nǐ qù nǎr chīfàn?",
    "vi": "Buổi trưa bạn đi đâu ăn cơm?",
    "tokens": [
      "中午",
      "你",
      "去",
      "哪儿",
      "吃饭",
      "？"
    ],
    "grammarNote": "Câu liên động: Đi đâu làm gì (去 + Địa điểm + Động từ).",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Buổi trưa bạn ăn cái gì?",
      "Buổi chiều bạn đi ăn cơm không?",
      "Ai đi ăn cơm cùng bạn?"
    ],
    "wrongZh": [
      "中午你在哪儿吃饭？",
      "去哪儿中午你吃饭？",
      "中午你吃饭哪儿？"
    ]
  },
  {
    "id": "g_7_2",
    "lesson": 7,
    "hsk": 1,
    "zh": "我去食堂吃馒头。",
    "py": "Wǒ qù shítáng chī mántou.",
    "vi": "Tôi đi nhà ăn ăn màn thầu.",
    "tokens": [
      "我",
      "去",
      "食堂",
      "吃",
      "馒头",
      "。"
    ],
    "grammarNote": "Câu liên động: 去 + 食堂 + 吃馒头.",
    "distractors": [
      "来"
    ],
    "wrongVi": [
      "Tôi ở nhà ăn ăn bánh bao.",
      "Tôi đi ăn cơm cùng bạn.",
      "Nhà ăn có bánh bao không?"
    ],
    "wrongZh": [
      "我在食堂吃包子。",
      "我去食堂买米饭。",
      "食堂我去吃馒头。"
    ]
  },
  {
    "id": "g_7_3",
    "lesson": 7,
    "hsk": 1,
    "zh": "你要几个包子？我要四个。",
    "py": "Nǐ yào jǐ ge bāozi? Wǒ yào sì ge.",
    "vi": "Bạn muốn mấy cái bánh bao? Tôi muốn 4 cái.",
    "tokens": [
      "你",
      "要",
      "几",
      "个",
      "包子",
      "？",
      "我",
      "要",
      "四",
      "个",
      "。"
    ],
    "grammarNote": "Lượng từ 个 (gè) đứng sau số từ / đại từ 几: 几个包子, 四个.",
    "distractors": [
      "杯"
    ],
    "wrongVi": [
      "Bạn ăn mấy bát cơm?",
      "Bánh bao bao nhiêu tiền một cái?",
      "Bạn có muốn ăn bánh bao không?"
    ],
    "wrongZh": [
      "你要多少包子？我要四个。",
      "你要四包子？我要四个。",
      "几包子你要？我要四个。"
    ]
  },
  {
    "id": "g_7_4",
    "lesson": 7,
    "hsk": 1,
    "zh": "我喝一碗鸡蛋汤。",
    "py": "Wǒ hē yì wǎn jīdàntāng.",
    "vi": "Tôi uống một bát canh trứng gà.",
    "tokens": [
      "我",
      "喝",
      "一碗",
      "鸡蛋汤",
      "。"
    ],
    "grammarNote": "Lượng từ chỉ đồ đựng: 一碗 (một bát) + Danh từ (鸡蛋汤).",
    "distractors": [
      "瓶"
    ],
    "wrongVi": [
      "Tôi ăn một bát cơm.",
      "Tôi uống một cốc trà.",
      "Canh trứng gà rất ngon."
    ],
    "wrongZh": [
      "我吃一碗鸡蛋汤。",
      "我喝一杯鸡蛋汤。",
      "一碗鸡蛋汤我喝。"
    ]
  },
  {
    "id": "g_8_1",
    "lesson": 8,
    "hsk": 1,
    "zh": "苹果一斤多少钱？",
    "py": "Píngguǒ yì jīn duōshao qián?",
    "vi": "Táo bao nhiêu tiền một cân?",
    "tokens": [
      "苹果",
      "一斤",
      "多少",
      "钱",
      "？"
    ],
    "grammarNote": "Mẫu câu hỏi giá: [Đồ vật] + [Đơn vị] + 多少钱？",
    "distractors": [
      "几"
    ],
    "wrongVi": [
      "Táo này có ngon không?",
      "Một cân táo có mấy quả?",
      "Bạn mua mấy cân táo?"
    ],
    "wrongZh": [
      "苹果一斤几钱？",
      "多少钱一斤苹果？",
      "苹果多少钱一斤吗？"
    ]
  },
  {
    "id": "g_8_2",
    "lesson": 8,
    "hsk": 1,
    "zh": "太贵了，便宜一点儿吧。",
    "py": "Tài guì le, piányi yìdiǎnr ba.",
    "vi": "Đắt quá rồi, rẻ một chút đi mà.",
    "tokens": [
      "太",
      "贵",
      "了",
      "，",
      "便宜",
      "一点儿",
      "吧",
      "。"
    ],
    "grammarNote": "Cảm thán: 太...了; Tính từ + 一点儿 (rẻ hơn một chút); Trợ từ 吧 biểu thị thương lượng.",
    "distractors": [
      "有点儿"
    ],
    "wrongVi": [
      "Rẻ quá rồi, mua thêm chút đi.",
      "Đắt quá, tôi không mua đâu.",
      "Rẻ hơn thì tôi mua hai cân."
    ],
    "wrongZh": [
      "有点贵了，便宜一点儿吧。",
      "太贵了，便宜有点儿吧。",
      "便宜一点儿吧，真贵了。"
    ]
  },
  {
    "id": "g_8_3",
    "lesson": 8,
    "hsk": 1,
    "zh": "我要三斤苹果和两斤香蕉。",
    "py": "Wǒ yào sān jīn píngguǒ hé liǎng jīn xiāngjiāo.",
    "vi": "Tôi muốn 3 cân táo và 2 cân chuối.",
    "tokens": [
      "我",
      "要",
      "三斤",
      "苹果",
      "和",
      "两斤",
      "香蕉",
      "。"
    ],
    "grammarNote": "Số từ 2 đứng trước lượng từ dùng 两 (liǎng), không dùng 二 (èr).",
    "distractors": [
      "二斤"
    ],
    "wrongVi": [
      "Tôi mua hai cân táo và ba cân chuối.",
      "Táo và chuối hết bao nhiêu tiền?",
      "Tôi không muốn mua chuối."
    ],
    "wrongZh": [
      "我要三斤苹果和二斤香蕉。",
      "我要三苹果和两香蕉。",
      "三斤苹果和两斤香蕉我要。"
    ]
  },
  {
    "id": "g_8_4",
    "lesson": 8,
    "hsk": 1,
    "zh": "一共多少钱？一共二十五块。",
    "py": "Yígòng duōshao qián? Yígòng èrshíwǔ kuài.",
    "vi": "Tổng cộng bao nhiêu tiền? Tổng cộng 25 tệ.",
    "tokens": [
      "一共",
      "多少",
      "钱",
      "？",
      "一共",
      "二十五块",
      "。"
    ],
    "grammarNote": "Phó từ 一共 (tổng cộng) + 多少钱 / Số tiền + 块 (đồng/tệ).",
    "distractors": [
      "分"
    ],
    "wrongVi": [
      "Một cân bao nhiêu tiền?",
      "Bạn đưa tôi hai mươi tệ.",
      "Còn thừa bao nhiêu tiền thối?."
    ],
    "wrongZh": [
      "一共几钱？一共二十五块。",
      "多少钱一共？一共二十五块。",
      "一共多少钱？一共二十五毛。"
    ]
  },
  {
    "id": "g_9_1",
    "lesson": 9,
    "hsk": 1,
    "zh": "下午我要去银行换钱。",
    "py": "Xiàwǔ wǒ yào qù yínháng huàn qián.",
    "vi": "Buổi chiều tôi phải đi ngân hàng đổi tiền.",
    "tokens": [
      "下午",
      "我",
      "要",
      "去",
      "银行",
      "换",
      "钱",
      "。"
    ],
    "grammarNote": "Động từ năng nguyện 要 (cần, muốn) + Động từ (去银行换钱).",
    "distractors": [
      "想"
    ],
    "wrongVi": [
      "Buổi sáng tôi đi ngân hàng đổi tiền.",
      "Buổi chiều bạn có đi ngân hàng không?",
      "Tôi đi ngân hàng rút tiền."
    ],
    "wrongZh": [
      "下午我想在银行换钱。",
      "去银行下午我要换钱。",
      "下午我要在银行换钱。"
    ]
  },
  {
    "id": "g_9_2",
    "lesson": 9,
    "hsk": 1,
    "zh": "先生，您换什么钱？",
    "py": "Xiānsheng, nín huàn shénme qián?",
    "vi": "Thưa ông, ngài đổi tiền gì ạ?",
    "tokens": [
      "先生",
      "，",
      "您",
      "换",
      "什么",
      "钱",
      "？"
    ],
    "grammarNote": "Đại từ nhân xưng tôn kính 您; 换什么钱 (đổi loại tiền gì).",
    "distractors": [
      "你"
    ],
    "wrongVi": [
      "Thưa ông, ngài muốn đổi bao nhiêu tiền?",
      "Thưa ông, ngài gửi tiền gì ạ?",
      "Ngài có tiền mặt không?"
    ],
    "wrongZh": [
      "先生，你换多少钱？",
      "先生，您换几钱？",
      "您换什么钱先生？"
    ]
  },
  {
    "id": "g_9_3",
    "lesson": 9,
    "hsk": 1,
    "zh": "我想换五百美元的人民币。",
    "py": "Wǒ xiǎng huàn wǔbǎi Měiyuán de Rénmínbì.",
    "vi": "Tôi muốn đổi 500 đô la Mỹ lấy Nhân dân tệ.",
    "tokens": [
      "我",
      "想",
      "换",
      "五百美元",
      "的",
      "人民币",
      "。"
    ],
    "grammarNote": "Cụm danh từ chữ 的: [Số tiền ngoại tệ] + 的 + 人民币.",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Tôi muốn đổi 500 tệ lấy đô la Mỹ.",
      "Tôi có năm trăm đô la Mỹ.",
      "Tỷ giá năm trăm đô la là bao nhiêu?"
    ],
    "wrongZh": [
      "我想有五百美元的人民币。",
      "换我想五百美元的人民币。",
      "我想换五百的人民币美元。"
    ]
  },
  {
    "id": "g_9_4",
    "lesson": 9,
    "hsk": 1,
    "zh": "请等一会儿，请数一数。",
    "py": "Qǐng děng yíhuìr, qǐng shǔ yi shǔ.",
    "vi": "Xin đợi một lát, xin hãy đếm lại.",
    "tokens": [
      "请",
      "等",
      "一会儿",
      "，",
      "请",
      "数一数",
      "。"
    ],
    "grammarNote": "Cấu trúc 等一会儿 (đợi một lát); Lặp lại động từ 数一数 (đếm thử xem).",
    "distractors": [
      "看"
    ],
    "wrongVi": [
      "Xin đợi một chút rồi đi.",
      "Xin mời kiểm tra lại tiền.",
      "Đợi một lát tôi quay lại."
    ],
    "wrongZh": [
      "请等一点儿，请数一数。",
      "请等等，请看看。",
      "等一会儿请，数一数请。"
    ]
  },
  {
    "id": "g_10_1",
    "lesson": 10,
    "hsk": 1,
    "zh": "王老师不在办公室，他在家呢。",
    "py": "Wáng lǎoshī bú zài bàngōngshì, tā zài jiā ne.",
    "vi": "Thầy Vương không ở văn phòng, thầy ở nhà.",
    "tokens": [
      "王老师",
      "不",
      "在",
      "办公室",
      "，",
      "他",
      "在",
      "家",
      "呢",
      "。"
    ],
    "grammarNote": "Giới từ 在 chỉ vị trí nơi chốn; Trợ từ 呢 ở cuối câu trần thuật biểu thị trạng thái.",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Thầy Vương đang ở văn phòng.",
      "Thầy Vương có ở nhà không?",
      "Thầy Vương đi về nhà rồi."
    ],
    "wrongZh": [
      "王老师没在办公室，他在家呢。",
      "王老师在办公室不，他在家呢。",
      "王老师在不在办公室，他在家。"
    ]
  },
  {
    "id": "g_10_2",
    "lesson": 10,
    "hsk": 1,
    "zh": "请问，他住几号楼几门？",
    "py": "Qǐngwèn, tā zhù jǐ hào lóu jǐ mén?",
    "vi": "Xin hỏi, thầy ấy sống ở tòa nhà số mấy, cửa số mấy?",
    "tokens": [
      "请问",
      "，",
      "他",
      "住",
      "几号楼",
      "几门",
      "？"
    ],
    "grammarNote": "Cách hỏi số nhà, số tầng: 住 + 几号楼 + 几门？",
    "distractors": [
      "哪"
    ],
    "wrongVi": [
      "Thầy ấy sống ở đâu?",
      "Văn phòng thầy ấy ở tầng mấy?",
      "Số điện thoại của thầy ấy là bao nhiêu?"
    ],
    "wrongZh": [
      "请问，他住在哪楼哪门？",
      "请问，他住多少号楼？",
      "他住几号楼几门请问？"
    ]
  },
  {
    "id": "g_10_3",
    "lesson": 10,
    "hsk": 1,
    "zh": "他住在十八楼七号。",
    "py": "Tā zhù zài shíbā lóu qī hào.",
    "vi": "Thầy ấy sống ở tầng 18 phòng số 7.",
    "tokens": [
      "他",
      "住",
      "在",
      "十八楼",
      "七号",
      "。"
    ],
    "grammarNote": "Cấu trúc 住 + 在 + [Địa chỉ chi tiết].",
    "distractors": [
      "是"
    ],
    "wrongVi": [
      "Thầy ấy sống ở tầng 7 phòng 18.",
      "Nhà thầy ấy có 18 người.",
      "Thầy ấy đang ở tầng 18."
    ],
    "wrongZh": [
      "他住在七楼十八号。",
      "他是十八楼七号住。",
      "他在十八楼七号住。"
    ]
  },
  {
    "id": "g_10_4",
    "lesson": 10,
    "hsk": 1,
    "zh": "你知道他的电话号码吗？",
    "py": "Nǐ zhīdào tā de diànhuà hàomǎ ma?",
    "vi": "Bạn có biết số điện thoại của thầy ấy không?",
    "tokens": [
      "你",
      "知道",
      "他",
      "的",
      "电话号码",
      "吗",
      "？"
    ],
    "grammarNote": "Động từ 知道 (biết) mang tân ngữ sở hữu 他的电话号码.",
    "distractors": [
      "认识"
    ],
    "wrongVi": [
      "Số điện thoại của bạn là bao nhiêu?",
      "Bạn có gọi điện cho thầy ấy không?",
      "Thầy ấy có điện thoại không?"
    ],
    "wrongZh": [
      "你认识他的电话号码吗？",
      "你知道他的电话号码呢？",
      "他的电话号码你知道吗？"
    ]
  },
  {
    "id": "g_11_1",
    "lesson": 11,
    "hsk": 1,
    "zh": "我们不都是中国留学生。",
    "py": "Wǒmen bù dōu shì Zhōngguó liúxuéshēng.",
    "vi": "Chúng tôi không phải tất cả đều là lưu học sinh Trung Quốc.",
    "tokens": [
      "我们",
      "不",
      "都",
      "是",
      "中国",
      "留学生",
      "。"
    ],
    "grammarNote": "Phủ định bộ phận: 不都 (không phải tất cả), khác với 都不 (hoàn toàn không).",
    "distractors": [
      "没"
    ],
    "wrongVi": [
      "Chúng tôi đều không phải lưu học sinh.",
      "Chúng tôi đều là lưu học sinh Trung Quốc.",
      "Tất cả chúng tôi đều học tiếng Trung."
    ],
    "wrongZh": [
      "我们都不是中国留学生。",
      "都不我们是中国留学生。",
      "我们是不都中国留学生。"
    ]
  },
  {
    "id": "g_11_2",
    "lesson": 11,
    "hsk": 1,
    "zh": "这位是王教授，那位是马校长。",
    "py": "Zhè wèi shì Wáng jiàoshòu, nà wèi shì Mǎ xiàozhǎng.",
    "vi": "Vị này là giáo sư Vương, vị kia là hiệu trưởng Mã.",
    "tokens": [
      "这",
      "位",
      "是",
      "王教授",
      "，",
      "那",
      "位",
      "是",
      "马校长",
      "。"
    ],
    "grammarNote": "Lượng từ tôn kính 位 (wèi) dùng cho người có địa vị.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Đây là thầy Vương, kia là thầy Mã.",
      "Giáo sư Vương là hiệu trưởng trường này.",
      "Hiệu trưởng Mã chào giáo sư Vương."
    ],
    "wrongZh": [
      "这个是王教授，那个是马校长。",
      "这位有王教授，那位有马校长。",
      "王教授是这位，马校长是那位。"
    ]
  },
  {
    "id": "g_11_3",
    "lesson": 11,
    "hsk": 1,
    "zh": "我和他一起去图书馆借书。",
    "py": "Wǒ hé tā yìqǐ qù túshūguǎn jiè shū.",
    "vi": "Tôi và cậu ấy cùng nhau đi thư viện mượn sách.",
    "tokens": [
      "我",
      "和",
      "他",
      "一起",
      "去",
      "图书馆",
      "借",
      "书",
      "。"
    ],
    "grammarNote": "Cấu trúc liên động: A 和/跟 B 一起 + Động từ.",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Tôi đi thư viện mượn sách cho cậu ấy.",
      "Cậu ấy mượn sách ở thư viện.",
      "Chúng tôi cùng nhau đọc sách ở nhà."
    ],
    "wrongZh": [
      "我和他去图书馆一起借书。",
      "我跟他一起在图书馆借书。",
      "一起我和他去图书馆借书。"
    ]
  },
  {
    "id": "g_11_4",
    "lesson": 11,
    "hsk": 1,
    "zh": "他们俩都是语言学院的新学生。",
    "py": "Tāmen liǎ dōu shì Yǔyán Xuéyuàn de xīn xuésheng.",
    "vi": "Hai người bọn họ đều là học sinh mới của Học viện Ngôn ngữ.",
    "tokens": [
      "他们俩",
      "都",
      "是",
      "语言学院",
      "的",
      "新学生",
      "。"
    ],
    "grammarNote": "Cụm 他们俩 (hai người bọn họ) + Phó từ 都 + 是.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Bọn họ là học sinh cũ của trường.",
      "Hai người bọn họ học tiếng Trung ở đâu?",
      "Tất cả học sinh mới đều đến rồi."
    ],
    "wrongZh": [
      "他们俩是在语言学院的新学生。",
      "他们俩都新学生是语言学院。",
      "语言学院的新学生是他们俩都。"
    ]
  },
  {
    "id": "g_12_1",
    "lesson": 12,
    "hsk": 1,
    "zh": "你在哪儿学习汉语？",
    "py": "Nǐ zài nǎr xuéxí Hànyǔ?",
    "vi": "Bạn học tiếng Hán ở đâu?",
    "tokens": [
      "你",
      "在",
      "哪儿",
      "学习",
      "汉语",
      "？"
    ],
    "grammarNote": "Trạng ngữ chỉ nơi chốn đứng trước động từ: 在哪儿 + 学习.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Bạn học tiếng Hán với ai?",
      "Bạn học tiếng Hán từ bao giờ?",
      "Tiếng Hán của bạn học thế nào?"
    ],
    "wrongZh": [
      "你学习汉语在哪儿？",
      "你去哪儿学习汉语？",
      "在哪儿你学习汉语？"
    ]
  },
  {
    "id": "g_12_2",
    "lesson": 12,
    "hsk": 1,
    "zh": "我在北京语言大学学习。",
    "py": "Wǒ zài Běijīng Yǔyán Dàxué xuéxí.",
    "vi": "Tôi học tập tại Đại học Ngôn ngữ Bắc Kinh.",
    "tokens": [
      "我",
      "在",
      "北京语言大学",
      "学习",
      "。"
    ],
    "grammarNote": "Cấu trúc: Chủ ngữ + 在 + [Địa điểm] + Động từ.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Tôi đi Đại học Ngôn ngữ Bắc Kinh.",
      "Đại học Ngôn ngữ Bắc Kinh ở đâu?",
      "Tôi thích học ở Bắc Kinh."
    ],
    "wrongZh": [
      "我学习在北京语言大学。",
      "我去北京语言大学学习。",
      "北京语言大学我在学习。"
    ]
  },
  {
    "id": "g_12_3",
    "lesson": 12,
    "hsk": 1,
    "zh": "你觉得汉语难不难？",
    "py": "Nǐ juéde Hànyǔ nán bu nán?",
    "vi": "Bạn cảm thấy tiếng Hán có khó không?",
    "tokens": [
      "你",
      "觉得",
      "汉语",
      "难",
      "不",
      "难",
      "？"
    ],
    "grammarNote": "Động từ 觉得 (cảm thấy) + Câu hỏi chính phản (难不难).",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Bạn thấy tiếng Hán thế nào?",
      "Bạn có thích học tiếng Hán không?",
      "Bạn học tiếng Hán được bao lâu rồi?"
    ],
    "wrongZh": [
      "你觉得汉语难不难吗？",
      "你觉得汉语难吗？",
      "汉语你觉得难不难？"
    ]
  },
  {
    "id": "g_12_4",
    "lesson": 12,
    "hsk": 1,
    "zh": "我觉得听和说比较容易。",
    "py": "Wǒ juéde tīng hé shuō bǐjiào róngyì.",
    "vi": "Tôi cảm thấy nghe và nói tương đối dễ.",
    "tokens": [
      "我",
      "觉得",
      "听",
      "和",
      "说",
      "比较",
      "容易",
      "。"
    ],
    "grammarNote": "Phó từ mức độ 比较 (tương đối, khá) đứng trước tính từ 容易.",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Tôi thấy đọc và viết rất khó.",
      "Tôi cảm thấy nghe nói không khó lắm.",
      "Tiếng Hán dễ hơn tiếng Anh."
    ],
    "wrongZh": [
      "我觉得听说都比较容易。",
      "听和说我觉得很比较容易。",
      "我觉得听和说更容易。"
    ]
  },
  {
    "id": "g_13_1",
    "lesson": 13,
    "hsk": 1,
    "zh": "这是不是中药？这是西药。",
    "py": "Zhè shì bu shì zhōngyào? Zhè shì xīyào.",
    "vi": "Đây có phải là thuốc bắc không? Đây là thuốc tây.",
    "tokens": [
      "这",
      "是",
      "不",
      "是",
      "中药",
      "？",
      "这",
      "是",
      "西药",
      "。"
    ],
    "grammarNote": "Câu hỏi chính phản với 是: 是不是 + Danh từ？",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Đây là thuốc gì?",
      "Thuốc này uống thế nào?",
      "Bạn có mang thuốc không?"
    ],
    "wrongZh": [
      "这是不是中药吗？这是西药。",
      "这是中药不是？这是西药。",
      "这是中药还是西药？"
    ]
  },
  {
    "id": "g_13_2",
    "lesson": 13,
    "hsk": 1,
    "zh": "这个箱子里边没有违禁品。",
    "py": "Zhè ge xiāngzi lǐbiān méiyǒu wéijìnpǐn.",
    "vi": "Bên trong chiếc vali này không có đồ cấm.",
    "tokens": [
      "这个",
      "箱子",
      "里边",
      "没有",
      "违禁品",
      "。"
    ],
    "grammarNote": "Phủ định của 有 (sở hữu / tồn hiện) bắt buộc dùng 没有, không dùng 不有.",
    "distractors": [
      "不有"
    ],
    "wrongVi": [
      "Chiếc vali này là của ai?",
      "Trong vali có rất nhiều đồ dùng.",
      "Chiếc vali này rất nặng."
    ],
    "wrongZh": [
      "这个箱子里边不有违禁品。",
      "这个箱子里边没违禁品有。",
      "箱子这个里边没有违禁品。"
    ]
  },
  {
    "id": "g_13_3",
    "lesson": 13,
    "hsk": 1,
    "zh": "这里边都是我买的日用品。",
    "py": "Zhè lǐbiān dōu shì wǒ mǎi de rìyòngpǐn.",
    "vi": "Bên trong này đều là đồ dùng hàng ngày tôi mua.",
    "tokens": [
      "这",
      "里边",
      "都",
      "是",
      "我",
      "买",
      "的",
      "日用品",
      "。"
    ],
    "grammarNote": "Cụm danh từ chữ 的: [Mệnh đề định ngữ: 我买] + 的 + [Trung tâm ngữ: 日用品].",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Đồ dùng hàng ngày tôi mua ở đâu?",
      "Trong vali có đồ dùng hàng ngày không?",
      "Tôi mua rất nhiều đồ dùng ở siêu thị."
    ],
    "wrongZh": [
      "这里边都是我买日用品。",
      "这里边有我买的日用品。",
      "我买的日用品这里边都是。"
    ]
  },
  {
    "id": "g_13_4",
    "lesson": 13,
    "hsk": 1,
    "zh": "我还有两瓶药和一把雨伞。",
    "py": "Wǒ hái yǒu liǎng píng yào hé yì bǎ yǔsǎn.",
    "vi": "Tôi còn có hai lọ thuốc và một chiếc ô.",
    "tokens": [
      "我",
      "还",
      "有",
      "两瓶",
      "药",
      "和",
      "一把",
      "雨伞",
      "。"
    ],
    "grammarNote": "Phó từ 还 (vẫn còn); Lượng từ 瓶 (bình/lọ) và 把 (cái/chiếc ô).",
    "distractors": [
      "二瓶"
    ],
    "wrongVi": [
      "Tôi có một chiếc ô và một lọ thuốc.",
      "Chiếc ô này là của bạn à?",
      "Bạn mua thuốc ở hiệu thuốc nào?"
    ],
    "wrongZh": [
      "我还由二瓶药和一把雨伞。",
      "我有两瓶药和一件雨伞。",
      "两瓶药和一把雨伞我还由。"
    ]
  },
  {
    "id": "g_14_1",
    "lesson": 14,
    "hsk": 1,
    "zh": "你的自行车是新的还是旧的？",
    "py": "Nǐ de zìxíngchē shì xīn de háishì jiù de?",
    "vi": "Xe đạp của bạn là xe mới hay xe cũ?",
    "tokens": [
      "你",
      "的",
      "自行车",
      "是",
      "新",
      "的",
      "还是",
      "旧",
      "的",
      "？"
    ],
    "grammarNote": "Câu hỏi lựa chọn với 还是: A 还是 B？ Cụm chữ 的 thay thế danh từ.",
    "distractors": [
      "或者"
    ],
    "wrongVi": [
      "Xe đạp của bạn màu gì?",
      "Bạn mua xe đạp ở đâu?",
      "Xe đạp mới này bao nhiêu tiền?"
    ],
    "wrongZh": [
      "你的自行车是新的或者旧的？",
      "你的车是新还是旧？",
      "自行车是你的新的还是旧的？"
    ]
  },
  {
    "id": "g_14_2",
    "lesson": 14,
    "hsk": 1,
    "zh": "那辆蓝色的自行车是我的。",
    "py": "Nà liàng lánsè de zìxíngchē shì wǒ de.",
    "vi": "Chiếc xe đạp màu xanh lam kia là của tôi.",
    "tokens": [
      "那",
      "辆",
      "蓝色",
      "的",
      "自行车",
      "是",
      "我",
      "的",
      "。"
    ],
    "grammarNote": "Lượng từ 辆 (chiếc/xe); Cụm chữ 的 chỉ sở hữu 我的 = 我的自行车.",
    "distractors": [
      "本"
    ],
    "wrongVi": [
      "Chiếc xe đạp màu đỏ này là của bạn à?",
      "Xe đạp của tôi là xe mới.",
      "Bạn thích xe đạp màu gì?"
    ],
    "wrongZh": [
      "那个蓝色的自行车是我的。",
      "那辆蓝色的自行车有我的。",
      "我的自行车是那辆蓝色的。"
    ]
  },
  {
    "id": "g_14_3",
    "lesson": 14,
    "hsk": 1,
    "zh": "今天你喝咖啡还是喝茶？",
    "py": "Jīntiān nǐ hē kāfēi háishì hē chá?",
    "vi": "Hôm nay bạn uống cà phê hay uống trà?",
    "tokens": [
      "今天",
      "你",
      "喝",
      "咖啡",
      "还是",
      "喝",
      "茶",
      "？"
    ],
    "grammarNote": "Câu hỏi lựa chọn hành động: V1 + Tân ngữ 1 + 还是 + V2 + Tân ngữ 2？",
    "distractors": [
      "或者"
    ],
    "wrongVi": [
      "Hôm nay bạn uống cà phê không?",
      "Bạn thích uống trà hơn hay cà phê hơn?",
      "Chúng ta cùng đi uống cà phê nhé."
    ],
    "wrongZh": [
      "今天你喝咖啡或者喝茶？",
      "你今天喝咖啡是喝茶？",
      "喝咖啡还是喝茶今天你？"
    ]
  },
  {
    "id": "g_14_4",
    "lesson": 14,
    "hsk": 1,
    "zh": "我买了一件红色的羽绒服。",
    "py": "Wǒ mǎi le yí jiàn hóngsè de yǔróngfú.",
    "vi": "Tôi đã mua một chiếc áo lông vũ màu đỏ.",
    "tokens": [
      "我",
      "买",
      "了",
      "一件",
      "红色",
      "的",
      "羽绒服",
      "。"
    ],
    "grammarNote": "Trợ từ động thái 了 biểu thị hành động đã hoàn thành; Lượng từ 件.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Chiếc áo lông vũ màu đỏ này rất đẹp.",
      "Tôi muốn mua áo lông vũ màu đen.",
      "Bạn mua chiếc áo này bao nhiêu tiền?"
    ],
    "wrongZh": [
      "我买一件红色的羽绒服了。",
      "我买了一个红色的羽绒服。",
      "一件红色的羽绒服我买了。"
    ]
  },
  {
    "id": "g_15_1",
    "lesson": 15,
    "hsk": 1,
    "zh": "你家有几口人？我家有四口人。",
    "py": "Nǐ jiā yǒu jǐ kǒu rén? Wǒ jiā yǒu sì kǒu rén.",
    "vi": "Nhà bạn có mấy người? Nhà tôi có 4 người.",
    "tokens": [
      "你",
      "家",
      "有",
      "几口",
      "人",
      "？",
      "我",
      "家",
      "有",
      "四口",
      "人",
      "。"
    ],
    "grammarNote": "Lượng từ 口 dùng cho nhân khẩu gia đình: 几口人.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Gia đình bạn sống ở đâu?",
      "Gia đình bạn có những ai?",
      "Nhà bạn có anh chị em không?"
    ],
    "wrongZh": [
      "你家有几个口人？我家有四个人。",
      "你家几人有？我家有四人。",
      "家你有几口人？我家有四口人。"
    ]
  },
  {
    "id": "g_15_2",
    "lesson": 15,
    "hsk": 1,
    "zh": "全班一共有二十个学生。",
    "py": "Quán bān yígòng yǒu èrshí ge xuésheng.",
    "vi": "Cả lớp tổng cộng có 20 học sinh.",
    "tokens": [
      "全班",
      "一共",
      "有",
      "二十个",
      "学生",
      "。"
    ],
    "grammarNote": "Cấu trúc 全 + Danh từ (toàn bộ, cả); Phó từ 一共.",
    "distractors": [
      "都"
    ],
    "wrongVi": [
      "Cả lớp đều là học sinh chăm chỉ.",
      "Lớp bạn có bao nhiêu học sinh nam?",
      "Học sinh trong lớp đều là người Việt Nam."
    ],
    "wrongZh": [
      "全班都由二十个学生。",
      "一共全班有二十个学生。",
      "二十个学生全班一共有。"
    ]
  },
  {
    "id": "g_15_3",
    "lesson": 15,
    "hsk": 1,
    "zh": "你有兄弟姐妹吗？我没有。",
    "py": "Nǐ yǒu xiōngdì jiěmèi ma? Wǒ méiyǒu.",
    "vi": "Bạn có anh chị em không? Tôi không có.",
    "tokens": [
      "你",
      "有",
      "兄弟姐妹",
      "吗",
      "？",
      "我",
      "没有",
      "。"
    ],
    "grammarNote": "Phủ định của động từ 有 là 没有 (không được dùng 不有).",
    "distractors": [
      "不有"
    ],
    "wrongVi": [
      "Gia đình bạn có mấy anh chị em?",
      "Anh trai bạn làm nghề gì?",
      "Tôi có hai người chị gái."
    ],
    "wrongZh": [
      "你有兄弟姐妹吗？我不有。",
      "你有兄弟姐妹不？我没有。",
      "兄弟姐妹你有吗？我没有。"
    ]
  },
  {
    "id": "g_15_4",
    "lesson": 15,
    "hsk": 1,
    "zh": "这是我们全家的照片。",
    "py": "Zhè shì wǒmen quán jiā de zhàopiàn.",
    "vi": "Đây là bức ảnh chụp cả gia đình chúng tôi.",
    "tokens": [
      "这",
      "是",
      "我们",
      "全家",
      "的",
      "照片",
      "。"
    ],
    "grammarNote": "Cụm danh từ: 全家 (cả nhà) + 的 + 照片 (bức ảnh).",
    "distractors": [
      "那"
    ],
    "wrongVi": [
      "Bức ảnh này chụp ở đâu?",
      "Gia đình bạn chụp ảnh khi nào?",
      "Trong ảnh có những ai?"
    ],
    "wrongZh": [
      "那是我们全家的照片。",
      "这是我们全家照片的。",
      "我们全家的照片是这。"
    ]
  },
  {
    "id": "g_16_1",
    "lesson": 16,
    "hsk": 2,
    "zh": "我常常在宿舍复习生词。",
    "py": "Wǒ chángcháng zài sùshè fùxí shēngcí.",
    "vi": "Tôi thường ôn tập từ mới ở ký túc xá.",
    "tokens": [
      "我",
      "常常",
      "在",
      "宿舍",
      "复习",
      "生词",
      "。"
    ],
    "grammarNote": "Phó từ chỉ tần suất 常常 đứng trước vị ngữ / trạng ngữ nơi chốn.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Tôi thường đi thư viện đọc sách.",
      "Ký túc xá của tôi rất yên tĩnh.",
      "Bạn có hay ôn bài ở ký túc xá không?"
    ],
    "wrongZh": [
      "我在宿舍常常复习生词。",
      "我常在宿舍常常复习生词。",
      "常常我复习生词在宿舍。"
    ]
  },
  {
    "id": "g_16_2",
    "lesson": 16,
    "hsk": 2,
    "zh": "有时候去，有时候不去。",
    "py": "Yǒushíhou qù, yǒushíhou bú qù.",
    "vi": "Có lúc thì đi, có lúc không đi.",
    "tokens": [
      "有时候",
      "去",
      "，",
      "有时候",
      "不",
      "去",
      "。"
    ],
    "grammarNote": "Cấu trúc 有时候... 有时候... biểu thị sự xen kẽ.",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Tôi thường xuyên đi vào buổi tối.",
      "Thỉnh thoảng tôi mới đi thư viện.",
      "Lúc nào bạn cũng đi à?"
    ],
    "wrongZh": [
      "有的去，有的时候不去。",
      "有时候去，很时候不去。",
      "去有时候，不去有时候。"
    ]
  },
  {
    "id": "g_16_3",
    "lesson": 16,
    "hsk": 2,
    "zh": "星期六我们一起去公园玩儿吧。",
    "py": "Xīngqīliù wǒmen yìqǐ qù gōngyuán wánr ba.",
    "vi": "Thứ bảy chúng mình cùng đi công viên chơi nhé.",
    "tokens": [
      "星期六",
      "我们",
      "一起",
      "去",
      "公园",
      "玩儿",
      "吧",
      "。"
    ],
    "grammarNote": "Thời gian + Chủ ngữ + 一起 + Động từ + 吧.",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Chủ nhật bạn có đi công viên không?",
      "Công viên này rất đẹp và rộng.",
      "Chúng mình đi công viên bằng xe bus nhé."
    ],
    "wrongZh": [
      "星期六我们一起在公园玩儿吧。",
      "我们星期六去公园一起玩儿吧。",
      "星期六一起我们去公园玩儿吧。"
    ]
  },
  {
    "id": "g_16_4",
    "lesson": 16,
    "hsk": 2,
    "zh": "晚上我一般上网跟朋友聊天儿。",
    "py": "Wǎnshang wǒ yìbān shàngwǎng gēn péngyou liáotiānr.",
    "vi": "Buổi tối tôi thường lên mạng nói chuyện với bạn bè.",
    "tokens": [
      "晚上",
      "我",
      "一般",
      "上网",
      "跟",
      "朋友",
      "聊天儿",
      "。"
    ],
    "grammarNote": "Phó từ 一般 (thường thường, nhìn chung); Giới từ 跟 (cùng với ai).",
    "distractors": [
      "和"
    ],
    "wrongVi": [
      "Buổi tối tôi lên mạng nghe nhạc.",
      "Bạn hay nói chuyện với ai?",
      "Tôi không hay lên mạng vào ban đêm."
    ],
    "wrongZh": [
      "晚上我一般跟朋友上网聊天儿。",
      "我一般晚上上网跟朋友聊天儿。",
      "晚上我一般上网和朋友说。"
    ]
  },
  {
    "id": "g_17_1",
    "lesson": 17,
    "hsk": 2,
    "zh": "他在做什么呢？他正在听音乐呢。",
    "py": "Tā zài zuò shénme ne? Tā zhèngzài tīng yīnyuè ne.",
    "vi": "Cậu ấy đang làm gì thế? Cậu ấy đang nghe nhạc.",
    "tokens": [
      "他",
      "在",
      "做",
      "什么",
      "呢",
      "？",
      "他",
      "正在",
      "听",
      "音乐",
      "呢",
      "。"
    ],
    "grammarNote": "Hành động đang tiếp diễn: 正在 / 在 + Động từ + 呢.",
    "distractors": [
      "了"
    ],
    "wrongVi": [
      "Cậu ấy nghe nhạc xong chưa?",
      "Cậu ấy thích nghe loại nhạc gì?",
      "Bây giờ bạn đang làm gì thế?"
    ],
    "wrongZh": [
      "他在做什么呢？他听了音乐呢。",
      "他在做呢什么？他正在听音乐。",
      "正在他听音乐呢。"
    ]
  },
  {
    "id": "g_17_2",
    "lesson": 17,
    "hsk": 2,
    "zh": "外面正下着雨呢。",
    "py": "Wàimiàn zhèng xià zhe yǔ ne.",
    "vi": "Bên ngoài trời đang mưa đấy.",
    "tokens": [
      "外面",
      "正",
      "下",
      "着",
      "雨",
      "呢",
      "。"
    ],
    "grammarNote": "Cấu trúc biểu thị trạng thái đang tiếp diễn: 正 + V + 着 + Tân ngữ + 呢.",
    "distractors": [
      "了"
    ],
    "wrongVi": [
      "Bên ngoài trời đã tạnh mưa rồi.",
      "Trời sắp đổ mưa to rồi.",
      "Hôm nay trời có mưa không?"
    ],
    "wrongZh": [
      "外面正下了雨呢。",
      "外面下雨正着呢。",
      "正外面下着雨呢。"
    ]
  },
  {
    "id": "g_17_3",
    "lesson": 17,
    "hsk": 2,
    "zh": "玛丽正在宿舍写汉字作业呢。",
    "py": "Mǎlì zhèngzài sùshè xiě hànzì zuòyè ne.",
    "vi": "Mary đang ở ký túc xá viết bài tập chữ Hán.",
    "tokens": [
      "玛丽",
      "正在",
      "宿舍",
      "写",
      "汉字",
      "作业",
      "呢",
      "。"
    ],
    "grammarNote": "Chủ ngữ + 正在 + [Nơi chốn] + Động từ + Tân ngữ + 呢.",
    "distractors": [
      "看"
    ],
    "wrongVi": [
      "Mary đã làm xong bài tập chưa?",
      "Mary đang đọc sách ở thư viện.",
      "Bài tập chữ Hán hôm nay rất khó."
    ],
    "wrongZh": [
      "玛丽在宿舍正写汉字作业呢。",
      "玛丽正在宿舍写了汉字作业。",
      "正在玛丽在宿舍写汉字作业呢。"
    ]
  },
  {
    "id": "g_17_4",
    "lesson": 17,
    "hsk": 2,
    "zh": "你找他有什么事吗？",
    "py": "Nǐ zhǎo tā yǒu shénme shì ma?",
    "vi": "Bạn tìm cậu ấy có việc gì không?",
    "tokens": [
      "你",
      "找",
      "他",
      "有",
      "什么",
      "事",
      "吗",
      "？"
    ],
    "grammarNote": "Câu liên động biểu thị mục đích: 找他 + 有什么事.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Bạn có việc gì cần tôi giúp không?",
      "Cậu ấy có ở phòng không?",
      "Khi nào cậu ấy quay lại?"
    ],
    "wrongZh": [
      "你找他做什么事吗？",
      "你找他在有什么事吗？",
      "有什么事你找他吗？"
    ]
  },
  {
    "id": "g_18_1",
    "lesson": 18,
    "hsk": 2,
    "zh": "我去邮局顺便买几张邮票。",
    "py": "Wǒ qù yóujú shùnbiàn mǎi jǐ zhāng yóupiào.",
    "vi": "Tôi đi bưu điện tiện thể mua mấy con tem.",
    "tokens": [
      "我",
      "去",
      "邮局",
      "顺便",
      "买",
      "几张",
      "邮票",
      "。"
    ],
    "grammarNote": "Phó từ 顺便 (tiện thể, nhân tiện) đứng trước động từ thứ hai.",
    "distractors": [
      "就"
    ],
    "wrongVi": [
      "Tôi đi bưu điện gửi bưu phẩm.",
      "Bưu điện có bán tem không?",
      "Bạn mua giúp tôi mấy con tem nhé."
    ],
    "wrongZh": [
      "我去邮局买顺便几张邮票。",
      "我顺便去邮局买几张邮票。",
      "去邮局我顺便买几张邮票。"
    ]
  },
  {
    "id": "g_18_2",
    "lesson": 18,
    "hsk": 2,
    "zh": "麻烦你帮我寄一封信。",
    "py": "Máfan nǐ bāng wǒ jì yì fēng xìn.",
    "vi": "Làm phiền bạn gửi giúp tôi một bức thư.",
    "tokens": [
      "麻烦",
      "你",
      "帮",
      "我",
      "寄",
      "一封",
      "信",
      "。"
    ],
    "grammarNote": "Cấu trúc nhờ vả lịch sự: 麻烦你 + 帮我 + Động từ; Lượng từ 封 (bức thư).",
    "distractors": [
      "请"
    ],
    "wrongVi": [
      "Bạn gửi thư cho ai thế?",
      "Lá thư này gửi đi đâu?",
      "Cảm ơn bạn đã giúp tôi gửi thư."
    ],
    "wrongZh": [
      "麻烦你请我寄一封信。",
      "请你帮我麻烦寄一封信。",
      "帮我麻烦你寄一封信。"
    ]
  },
  {
    "id": "g_18_3",
    "lesson": 18,
    "hsk": 2,
    "zh": "明天咱们一起去外文书店吧。",
    "py": "Míngtiān zánmen yìqǐ qù wàiwén shūdiàn ba.",
    "vi": "Ngày mai chúng mình cùng đi hiệu sách ngoại văn nhé.",
    "tokens": [
      "明天",
      "咱们",
      "一起",
      "去",
      "外文书店",
      "吧",
      "。"
    ],
    "grammarNote": "Đại từ 咱们 (chúng ta / bao gồm cả người nghe); 一起 + Động từ.",
    "distractors": [
      "我们"
    ],
    "wrongVi": [
      "Hiệu sách ngoại văn ở đâu?",
      "Bạn muốn mua sách gì ở hiệu sách?",
      "Hôm nay tôi bận, mai đi nhé."
    ],
    "wrongZh": [
      "明天我们一起在外文书店吧。",
      "咱们明天一起去外文书店吧。",
      "明天咱们去外文书店一起吧。"
    ]
  },
  {
    "id": "g_18_4",
    "lesson": 18,
    "hsk": 2,
    "zh": "这个包裹寄到美国要多少钱？",
    "py": "Zhè ge bāoguǒ jì dào Měiguó yào duōshao qián?",
    "vi": "Bưu phẩm này gửi đến Mỹ hết bao nhiêu tiền?",
    "tokens": [
      "这个",
      "包裹",
      "寄到",
      "美国",
      "要",
      "多少",
      "钱",
      "？"
    ],
    "grammarNote": "Động từ kết hợp giới từ 寄到 (gửi đến) + Địa điểm.",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Bưu phẩm này gửi bằng đường hàng không à?",
      "Mất bao lâu bưu phẩm mới tới Mỹ?",
      "Bạn gửi bưu phẩm cho ai ở Mỹ?"
    ],
    "wrongZh": [
      "这个包裹寄在美国要多少钱？",
      "这个包裹要寄到美国多少钱？",
      "寄到美国这个包裹要多少钱？"
    ]
  },
  {
    "id": "g_19_1",
    "lesson": 19,
    "hsk": 2,
    "zh": "这件羽绒服我可以试试吗？",
    "py": "Zhè jiàn yǔróngfú wǒ kěyǐ shìshi ma?",
    "vi": "Chiếc áo lông vũ này tôi có thể thử một chút không?",
    "tokens": [
      "这件",
      "羽绒服",
      "我",
      "可以",
      "试试",
      "吗",
      "？"
    ],
    "grammarNote": "Động từ năng nguyện 可以 (có thể); Lặp lại động từ 试试 (thử một chút).",
    "distractors": [
      "能"
    ],
    "wrongVi": [
      "Chiếc áo này có cỡ lớn hơn không?",
      "Chiếc áo này giá bao nhiêu tiền?",
      "Tôi không thích màu áo này."
    ],
    "wrongZh": [
      "这件羽绒服我能试试吗？",
      "这件羽绒服我可以试一试吗？",
      "我可以试试这件羽绒服吗？"
    ]
  },
  {
    "id": "g_19_2",
    "lesson": 19,
    "hsk": 2,
    "zh": "这件衣服有一点儿长，不太合适。",
    "py": "Zhè jiàn yīfu yǒuyìdiǎnr cháng, bú tài héshì.",
    "vi": "Chiếc áo này hơi dài một chút, không vừa lắm.",
    "tokens": [
      "这件",
      "衣服",
      "有一点儿",
      "长",
      "，",
      "不太",
      "合适",
      "。"
    ],
    "grammarNote": "Phó từ 有一点儿 (yǒuyìdiǎnr) đứng trước tính từ biểu thị ý không hài lòng.",
    "distractors": [
      "一点儿"
    ],
    "wrongVi": [
      "Chiếc áo này rất vừa và đẹp.",
      "Chiếc áo này có màu khác không?",
      "Bạn mặc chiếc áo này rất hợp."
    ],
    "wrongZh": [
      "这件衣服一点儿长，不太合适。",
      "这件衣服长有一点儿，不太合适。",
      "这件衣服有点长，不太合适。"
    ]
  },
  {
    "id": "g_19_3",
    "lesson": 19,
    "hsk": 2,
    "zh": "肥瘦正合适，颜色也很好看。",
    "py": "Féishòu zhèng héshì, yánsè yě hěn hǎokàn.",
    "vi": "Rộng chật vừa vặn, màu sắc cũng rất đẹp.",
    "tokens": [
      "肥瘦",
      "正",
      "合适",
      "，",
      "颜色",
      "也",
      "很",
      "好看",
      "。"
    ],
    "grammarNote": "Từ ghép 肥瘦 (độ rộng chật); Phó từ 正 (vừa đúng lúc/mức).",
    "distractors": [
      "太"
    ],
    "wrongVi": [
      "Chiếc áo này hơi chật một chút.",
      "Bạn có thích màu này không?",
      "Màu này không hợp với bạn lắm."
    ],
    "wrongZh": [
      "肥瘦太合适，颜色也很好看。",
      "肥瘦正合适，颜色太好看。",
      "正合适肥瘦，颜色也很好看。"
    ]
  },
  {
    "id": "g_19_4",
    "lesson": 19,
    "hsk": 2,
    "zh": "太贵了，便宜一点儿我就买。",
    "py": "Tài guì le, piányi yìdiǎnr wǒ jiù mǎi.",
    "vi": "Đắt quá, rẻ hơn một chút là tôi mua ngay.",
    "tokens": [
      "太",
      "贵",
      "了",
      "，",
      "便宜",
      "一点儿",
      "我",
      "就",
      "买",
      "。"
    ],
    "grammarNote": "Tính từ + 一点儿; Phó từ 就 biểu thị điều kiện dẫn đến hành động ngay.",
    "distractors": [
      "有一点儿"
    ],
    "wrongVi": [
      "Rẻ quá rồi, tôi mua hai chiếc.",
      "Nếu đắt quá thì tôi không mua đâu.",
      "Cửa hàng này bán đồ rất rẻ."
    ],
    "wrongZh": [
      "太贵了，便宜有一点儿我就买。",
      "有点贵了，便宜一点儿我就买。",
      "太贵了，便宜一点儿我才买。"
    ]
  },
  {
    "id": "g_20_1",
    "lesson": 20,
    "hsk": 2,
    "zh": "今天是我朋友二十岁的生日。",
    "py": "Jīntiān shì wǒ péngyou èrshí suì de shēngrì.",
    "vi": "Hôm nay là sinh nhật tuổi 20 của bạn tôi.",
    "tokens": [
      "今天",
      "是",
      "我",
      "朋友",
      "二十岁",
      "的",
      "生日",
      "。"
    ],
    "grammarNote": "Cách nói tuổi: Số từ + 岁; Cụm định ngữ chỉ sở hữu với 的.",
    "distractors": [
      "年"
    ],
    "wrongVi": [
      "Hôm nay là sinh nhật của ai?",
      "Bạn tổ chức sinh nhật ở đâu?",
      "Chúc bạn sinh nhật vui vẻ!"
    ],
    "wrongZh": [
      "今天是我的朋友二十年的生日。",
      "今天我朋友二十岁的生日是。",
      "我朋友二十岁的生日是今天。"
    ]
  },
  {
    "id": "g_20_2",
    "lesson": 20,
    "hsk": 2,
    "zh": "祝你生日快乐，学习进步！",
    "py": "Zhù nǐ shēngrì kuàilè, xuéxí jìnbù!",
    "vi": "Chúc bạn sinh nhật vui vẻ, học tập tiến bộ!",
    "tokens": [
      "祝",
      "你",
      "生日快乐",
      "，",
      "学习",
      "进步",
      "！"
    ],
    "grammarNote": "Câu chúc tụng: 祝你 + [Lời chúc tốt đẹp].",
    "distractors": [
      "请"
    ],
    "wrongVi": [
      "Chúc mừng năm mới, vạn sự như ý!",
      "Cảm ơn bạn đã đến dự sinh nhật.",
      "Hôm nay bạn nhận được nhiều quà không?"
    ],
    "wrongZh": [
      "请你生日快乐，学习进步！",
      "祝你快乐生日，进步学习！",
      "生日快乐祝你，学习进步！"
    ]
  },
  {
    "id": "g_20_3",
    "lesson": 20,
    "hsk": 2,
    "zh": "我们打算晚上开一个生日晚会。",
    "py": "Wǒmen dǎsuàn wǎnshang kāi yí ge shēngrì wǎnhuì.",
    "vi": "Chúng tôi dự định tối nay tổ chức một buổi tiệc sinh nhật.",
    "tokens": [
      "我们",
      "打算",
      "晚上",
      "开",
      "一个",
      "生日晚会",
      "。"
    ],
    "grammarNote": "Động từ 打算 (dự định, lên kế hoạch) + Động từ 开 (tổ chức).",
    "distractors": [
      "想"
    ],
    "wrongVi": [
      "Buổi tiệc sinh nhật diễn ra ở đâu?",
      "Bạn có mời nhiều bạn bè không?",
      "Tối nay chúng mình đi ăn nhà hàng nhé."
    ],
    "wrongZh": [
      "我们想晚上开一个生日晚会。",
      "晚上我们打算开一个生日晚会。",
      "我们打算开一个生日晚会晚上。"
    ]
  },
  {
    "id": "g_20_4",
    "lesson": 20,
    "hsk": 2,
    "zh": "我送给你一个漂亮的生日蛋糕。",
    "py": "Wǒ sòng gěi nǐ yí ge piàoliang de shēngrì dàngāo.",
    "vi": "Tôi tặng cho bạn một chiếc bánh sinh nhật thật đẹp.",
    "tokens": [
      "我",
      "送给",
      "你",
      "一个",
      "漂亮",
      "的",
      "生日蛋糕",
      "。"
    ],
    "grammarNote": "Động từ mang 2 tân ngữ (Tân ngữ gián tiếp + Tân ngữ trực tiếp): 送给 + 你 + 一个蛋糕.",
    "distractors": [
      "买"
    ],
    "wrongVi": [
      "Bánh sinh nhật này ngon lắm.",
      "Ai mua chiếc bánh sinh nhật này?",
      "Tôi nhận được rất nhiều quà sinh nhật."
    ],
    "wrongZh": [
      "我买给你一个漂亮的生日蛋糕。",
      "我送你一个漂亮的生日蛋糕给。",
      "一个漂亮的生日蛋糕我送给你。"
    ]
  },
  {
    "id": "g_21_1",
    "lesson": 21,
    "hsk": 2,
    "zh": "现在几点？现在差一刻八点。",
    "py": "Xiànzài jǐ diǎn? Xiànzài chà yí kè bā diǎn.",
    "vi": "Bây giờ là mấy giờ? Bây giờ là 8 giờ kém 15 phút.",
    "tokens": [
      "现在",
      "几点",
      "？",
      "现在",
      "差一刻",
      "八点",
      "。"
    ],
    "grammarNote": "Cách nói giờ kém: 差 + Số phút/Số khắc + Giờ (差一刻八点).",
    "distractors": [
      "多少"
    ],
    "wrongVi": [
      "Bây giờ là mấy giờ rồi?",
      "Mấy giờ chúng ta xuất phát?",
      "Đồng hồ của bạn chạy nhanh hay chậm?"
    ],
    "wrongZh": [
      "现在多少点？现在差一刻八点。",
      "现在几点？现在八点差一刻。",
      "几点现在？现在差一刻八点。"
    ]
  },
  {
    "id": "g_21_2",
    "lesson": 21,
    "hsk": 2,
    "zh": "我们明天早上七点一刻在校门口集合。",
    "py": "Wǒmen míngtiān zǎoshang qī diǎn yí kè zài xiàoménkǒu jíhé.",
    "vi": "Sáng mai 7 giờ 15 chúng mình tập trung ở cổng trường.",
    "tokens": [
      "我们",
      "明天早上",
      "七点一刻",
      "在",
      "校门口",
      "集合",
      "。"
    ],
    "grammarNote": "Trật tự thời gian từ lớn đến nhỏ (明天 -> 早上 -> 七点一刻); Trạng ngữ nơi chốn đứng trước động từ.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Mấy giờ bạn đến cổng trường?",
      "Chúng ta tập trung ở đâu?",
      "Ngày mai ai đi cùng chúng mình?"
    ],
    "wrongZh": [
      "我们明天早上七点一刻去校门口集合。",
      "明天早上七点一刻我们在校门口集合。",
      "我们在校门口集合明天早上七点一刻。"
    ]
  },
  {
    "id": "g_21_3",
    "lesson": 21,
    "hsk": 2,
    "zh": "爬山的时候大家一定要注意安全。",
    "py": "Páshān de shíhou dàjiā yídìng yào zhùyì ānquán.",
    "vi": "Lúc leo núi mọi người nhất định phải chú ý an toàn.",
    "tokens": [
      "爬山",
      "的",
      "时候",
      "大家",
      "一定",
      "要",
      "注意",
      "安全",
      "。"
    ],
    "grammarNote": "Cấu trúc thời gian: [Hành động] + 的时候 (Khi, lúc làm gì).",
    "distractors": [
      "了"
    ],
    "wrongVi": [
      "Hôm nay chúng mình đi leo núi rất vui.",
      "Núi này cao bao nhiêu mét?",
      "Khi leo núi nhớ mang theo nước uống."
    ],
    "wrongZh": [
      "爬山的时候大家一定要安全注意。",
      "大家爬山的时候一定要注意安全。",
      "爬山了时候大家一定要注意安全。"
    ]
  },
  {
    "id": "g_21_4",
    "lesson": 21,
    "hsk": 2,
    "zh": "回来的路上我们常常聊天儿。",
    "py": "Huílái de lùshang wǒmen chángcháng liáotiānr.",
    "vi": "Trên đường trở về chúng tôi thường trò chuyện vui vẻ.",
    "tokens": [
      "回来",
      "的",
      "路上",
      "我们",
      "常常",
      "聊天儿",
      "。"
    ],
    "grammarNote": "Cụm danh từ chỉ nơi chốn/hoàn cảnh: 在...的路上 (Trên đường...).",
    "distractors": [
      "中"
    ],
    "wrongVi": [
      "Mấy giờ các bạn về đến trường?",
      "Chuyến đi hôm nay thế nào?",
      "Trên đường về xe có đông không?"
    ],
    "wrongZh": [
      "回来的路上我们常聊天儿。",
      "我们在回来的路上常常聊天儿。",
      "回来的路上我们聊天儿常常。"
    ]
  },
  {
    "id": "g_22_1",
    "lesson": 22,
    "hsk": 2,
    "zh": "我打算请老师教我唱京剧。",
    "py": "Wǒ dǎsuàn qǐng lǎoshī jiāo wǒ chàng jīngjù.",
    "vi": "Tôi dự định nhờ thầy giáo dạy tôi hát Kinh kịch.",
    "tokens": [
      "我",
      "打算",
      "请",
      "老师",
      "教",
      "我",
      "唱",
      "京剧",
      "。"
    ],
    "grammarNote": "Câu kiêm ngữ: Tân ngữ của động từ thứ nhất (老师) là chủ ngữ của động từ thứ hai (教).",
    "distractors": [
      "让"
    ],
    "wrongVi": [
      "Thầy giáo có dạy Kinh kịch không?",
      "Bạn học Kinh kịch được bao lâu rồi?",
      "Tôi rất thích xem Kinh kịch."
    ],
    "wrongZh": [
      "我打算让老师教我唱京剧。",
      "老师请我打算教我唱京剧。",
      "我打算请老师教我唱京剧吗。"
    ]
  },
  {
    "id": "g_22_2",
    "lesson": 22,
    "hsk": 2,
    "zh": "老师让我明天下午去他办公室。",
    "py": "Lǎoshī ràng wǒ míngtiān xiàwǔ qù tā bàngōngshì.",
    "vi": "Thầy giáo bảo tôi chiều mai đến văn phòng của thầy.",
    "tokens": [
      "老师",
      "让",
      "我",
      "明天下午",
      "去",
      "他",
      "办公室",
      "。"
    ],
    "grammarNote": "Câu kiêm ngữ với động từ cầu khiến 让 (ràng - bảo, cho phép).",
    "distractors": [
      "叫"
    ],
    "wrongVi": [
      "Thầy giáo tìm bạn có việc gì không?",
      "Chiều mai bạn có rảnh không?",
      "Văn phòng thầy giáo ở tầng mấy?"
    ],
    "wrongZh": [
      "老师叫我明天下午去他办公室。",
      "明天下午老师让我去他办公室。",
      "老师让我去他办公室明天下午。"
    ]
  },
  {
    "id": "g_22_3",
    "lesson": 22,
    "hsk": 2,
    "zh": "爸爸叫我早点儿回宿舍休息。",
    "py": "Bàba jiào wǒ zǎodiǎnr huí sùshè xiūxi.",
    "vi": "Bố bảo tôi về ký túc xá nghỉ ngơi sớm một chút.",
    "tokens": [
      "爸爸",
      "叫",
      "我",
      "早点儿",
      "回",
      "宿舍",
      "休息",
      "。"
    ],
    "grammarNote": "Câu kiêm ngữ với 叫 (jiào - bảo, kêu); Phó từ 早点儿 (sớm một chút).",
    "distractors": [
      "请"
    ],
    "wrongVi": [
      "Bố bạn gọi điện cho bạn khi nào?",
      "Bạn có hay về ký túc xá muộn không?",
      "Nghỉ ngơi sớm rất tốt cho sức khỏe."
    ],
    "wrongZh": [
      "爸爸请我早点儿回宿舍休息。",
      "爸爸叫我早点儿在宿舍休息。",
      "早点儿爸爸叫我回宿舍休息。"
    ]
  },
  {
    "id": "g_22_4",
    "lesson": 22,
    "hsk": 2,
    "zh": "我们请玛丽唱一首中国歌吧。",
    "py": "Wǒmen qǐng Mǎlì chàng yì shǒu Zhōngguó gē ba.",
    "vi": "Chúng mình mời Mary hát một bài hát Trung Quốc đi.",
    "tokens": [
      "我们",
      "请",
      "玛丽",
      "唱",
      "一首",
      "中国",
      "歌",
      "吧",
      "。"
    ],
    "grammarNote": "Câu kiêm ngữ với 请; Lượng từ 首 (bài hát): 一首歌.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Mary hát có hay không?",
      "Bạn biết hát bài hát tiếng Trung nào không?",
      "Chúng ta cùng hát một bài nhé."
    ],
    "wrongZh": [
      "我们让玛丽唱一首中国歌吧。",
      "我们请玛丽唱一个中国歌吧。",
      "请玛丽唱一首中国歌吧我们。"
    ]
  },
  {
    "id": "g_23_1",
    "lesson": 23,
    "hsk": 2,
    "zh": "学校里边有邮局和超市吗？",
    "py": "Xuéxiào lǐbiān yǒu yóujú hé chāoshì ma?",
    "vi": "Bên trong trường học có bưu điện và siêu thị không?",
    "tokens": [
      "学校",
      "里边",
      "有",
      "邮局",
      "和",
      "超市",
      "吗",
      "？"
    ],
    "grammarNote": "Câu tồn hiện: Nơi chốn (学校里边) + 有 + Sự vật (邮局和超市).",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Bưu điện của trường ở chỗ nào?",
      "Siêu thị trong trường có to không?",
      "Bạn đi bưu điện hay đi siêu thị?"
    ],
    "wrongZh": [
      "学校里边在邮局和超市吗？",
      "邮局和超市在学校里边吗？",
      "学校里边有邮局吗和超市？"
    ]
  },
  {
    "id": "g_23_2",
    "lesson": 23,
    "hsk": 2,
    "zh": "邮局在图书馆的东边，教学楼后边。",
    "py": "Yóujú zài túshūguǎn de dōngbiān, jiàoxuélóu hòubiān.",
    "vi": "Bưu điện ở phía đông thư viện, phía sau tòa nhà học.",
    "tokens": [
      "邮局",
      "在",
      "图书馆",
      "的",
      "东边",
      "，",
      "教学楼",
      "后边",
      "。"
    ],
    "grammarNote": "Phương vị từ: 东边 (phía đông), 后边 (phía sau).",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Thư viện ở phía nào của trường?",
      "Bưu điện cách giảng đường có xa không?",
      "Tòa nhà học ở đâu?"
    ],
    "wrongZh": [
      "邮局有图书馆的东边，教学楼后边。",
      "图书馆的东边在邮局，教学楼后边。",
      "邮局在东边图书馆，后边教学楼。"
    ]
  },
  {
    "id": "g_23_3",
    "lesson": 23,
    "hsk": 2,
    "zh": "从这儿到银行走路只要五分钟。",
    "py": "Cóng zhèr dào yínháng zǒulù zhǐ yào wǔ fēnzhōng.",
    "vi": "Từ đây đến ngân hàng đi bộ chỉ mất 5 phút.",
    "tokens": [
      "从",
      "这儿",
      "到",
      "银行",
      "走路",
      "只",
      "要",
      "五分钟",
      "。"
    ],
    "grammarNote": "Cấu trúc khoảng cách: 从...到... (từ... đến...); 只要 (chỉ cần).",
    "distractors": [
      "离"
    ],
    "wrongVi": [
      "Ngân hàng có gần đây không?",
      "Đi xe bus đến ngân hàng mất bao lâu?",
      "Từ trường học đến ngân hàng đi đường nào?"
    ],
    "wrongZh": [
      "离这儿到银行走路只要五分钟。",
      "从这儿到银行走路只有五分钟。",
      "走路从这儿到银行只要五分钟。"
    ]
  },
  {
    "id": "g_23_4",
    "lesson": 23,
    "hsk": 2,
    "zh": "往前面走一百米就是那个书店。",
    "py": "Wǎng qiánmiàn zǒu yìbǎi mǐ jiù shì nà ge shūdiàn.",
    "vi": "Đi về phía trước 100 mét chính là hiệu sách đó.",
    "tokens": [
      "往",
      "前面",
      "走",
      "一百米",
      "就",
      "是",
      "那个",
      "书店",
      "。"
    ],
    "grammarNote": "Giới từ chỉ hướng 往: 往 + Phương vị từ + Động từ (往前面走).",
    "distractors": [
      "从"
    ],
    "wrongVi": [
      "Hiệu sách đó nằm ở bên trái hay bên phải?",
      "Đi bộ đến hiệu sách mất bao nhiêu mét?",
      "Bạn có biết hiệu sách đó không?"
    ],
    "wrongZh": [
      "从前面走一百米就是那个书店。",
      "往前面走一百米有那个书店。",
      "前面往走一百米就是那个书店。"
    ]
  },
  {
    "id": "g_24_1",
    "lesson": 24,
    "hsk": 2,
    "zh": "老师，我想学太极拳，可以吗？",
    "py": "Lǎoshī, wǒ xiǎng xué tàijíquán, kěyǐ ma?",
    "vi": "Thầy ơi, em muốn học Thái Cực Quyền, được không ạ?",
    "tokens": [
      "老师",
      "，",
      "我",
      "想",
      "学",
      "太极拳",
      "，",
      "可以",
      "吗",
      "？"
    ],
    "grammarNote": "Động từ năng nguyện 想 (muốn) và câu hỏi xin phép: 可以吗？",
    "distractors": [
      "会"
    ],
    "wrongVi": [
      "Thầy có dạy Thái Cực Quyền không ạ?",
      "Lớp Thái Cực Quyền khai giảng khi nào?",
      "Học Thái Cực Quyền có khó không thầy?"
    ],
    "wrongZh": [
      "老师，我会学太极拳，可以吗？",
      "老师，我想学太极拳，能吗？",
      "老师，我想学太极拳可以不？"
    ]
  },
  {
    "id": "g_24_2",
    "lesson": 24,
    "hsk": 2,
    "zh": "下星期一你可以来我们班报名。",
    "py": "Xià xīngqīyī nǐ kěyǐ lái wǒmen bān bàomíng.",
    "vi": "Thứ hai tuần sau bạn có thể đến lớp chúng tôi đăng ký.",
    "tokens": [
      "下星期一",
      "你",
      "可以",
      "来",
      "我们班",
      "报名",
      "。"
    ],
    "grammarNote": "Động từ năng nguyện 可以 (có thể / được phép); 来 + Nơi chốn + Động từ.",
    "distractors": [
      "想"
    ],
    "wrongVi": [
      "Đăng ký học Thái Cực Quyền ở đâu?",
      "Học phí bao nhiêu tiền một khóa?",
      "Thứ hai tuần sau mấy giờ bắt đầu học?"
    ],
    "wrongZh": [
      "下星期一你想来我们班报名。",
      "你可以下星期一来我们班报名。",
      "下星期一你可以去我们班报名。"
    ]
  },
  {
    "id": "g_24_3",
    "lesson": 24,
    "hsk": 2,
    "zh": "一节课要上多长时间？一个小时。",
    "py": "Yì jié kè yào shàng duō cháng shíjiān? Yí ge xiǎoshí.",
    "vi": "Một tiết học phải học trong bao lâu? Một tiếng đồng hồ.",
    "tokens": [
      "一节课",
      "要",
      "上",
      "多长时间",
      "？",
      "一个小时",
      "。"
    ],
    "grammarNote": "Hỏi thời lượng: 多长时间？ Lượng từ tiết học 节; 一个小时 (1 giờ).",
    "distractors": [
      "多少"
    ],
    "wrongVi": [
      "Mỗi tuần học mấy tiết?",
      "Mấy giờ tan học?",
      "Học một tiếng có mệt không?"
    ],
    "wrongZh": [
      "一节课要上多少时间？一个小时。",
      "一节课要上多长的时间？一个小时。",
      "多长时间一节课要上？一个小时。"
    ]
  },
  {
    "id": "g_24_4",
    "lesson": 24,
    "hsk": 2,
    "zh": "我会说一点儿汉语，也能听懂。",
    "py": "Wǒ huì shuō yìdiǎnr Hànyǔ, yě néng tīngdǒng.",
    "vi": "Tôi biết nói một chút tiếng Hán, cũng có thể nghe hiểu.",
    "tokens": [
      "我",
      "会",
      "说",
      "一点儿",
      "汉语",
      "，",
      "也",
      "能",
      "听懂",
      "。"
    ],
    "grammarNote": "Phân biệt 会 (biết nhờ học tập) và 能 (năng lực làm được).",
    "distractors": [
      "可以"
    ],
    "wrongVi": [
      "Bạn học tiếng Hán được bao lâu rồi?",
      "Người Trung Quốc nói chuyện bạn có hiểu không?",
      "Tôi chỉ biết viết chữ Hán, không biết nói."
    ],
    "wrongZh": [
      "我可以说明天汉语，也能听懂。",
      "我会说一点儿汉语，也可以听懂。",
      "我能说一点儿汉语，也会听懂。"
    ]
  },
  {
    "id": "g_25_1",
    "lesson": 25,
    "hsk": 2,
    "zh": "她太极拳打得真好！",
    "py": "Tā tàijíquán dǎ de zhēn hǎo!",
    "vi": "Cô ấy đánh Thái Cực Quyền thật là giỏi!",
    "tokens": [
      "她",
      "太极拳",
      "打",
      "得",
      "真",
      "好",
      "！"
    ],
    "grammarNote": "Bổ ngữ trạng thái: Động từ + 得 + Cụm miêu tả; Tân ngữ đặt trước động từ.",
    "distractors": [
      "的"
    ],
    "wrongVi": [
      "Cô ấy học Thái Cực Quyền ở đâu?",
      "Cô ấy tập Thái Cực Quyền bao lâu rồi?",
      "Động tác của cô ấy rất đẹp mắt."
    ],
    "wrongZh": [
      "她太极拳打的真好！",
      "她打得太极拳真好！",
      "太极拳她打得很真好！"
    ]
  },
  {
    "id": "g_25_2",
    "lesson": 25,
    "hsk": 2,
    "zh": "她说汉语说得非常流利。",
    "py": "Tā shuō Hànyǔ shuō de fēicháng liúlì.",
    "vi": "Cô ấy nói tiếng Hán nói rất lưu loát.",
    "tokens": [
      "她",
      "说",
      "汉语",
      "说",
      "得",
      "非常",
      "流利",
      "。"
    ],
    "grammarNote": "Quy tắc khi mang tân ngữ: V + O + V + 得 + Cụm miêu tả.",
    "distractors": [
      "得"
    ],
    "wrongVi": [
      "Tiếng Hán của cô ấy rất chuẩn.",
      "Cô ấy học tiếng Hán rất chăm chỉ.",
      "Cô ấy nói tiếng Hán nhanh như người bản xứ."
    ],
    "wrongZh": [
      "她说汉语得非常流利。",
      "她说汉语非常流利说得。",
      "她汉语说得说非常流利。"
    ]
  },
  {
    "id": "g_25_3",
    "lesson": 25,
    "hsk": 2,
    "zh": "他每天早上起得很早去跑步。",
    "py": "Tā měitiān zǎoshang qǐ de hěn zǎo qù pǎobù.",
    "vi": "Anh ấy mỗi sáng đều dậy rất sớm để đi chạy bộ.",
    "tokens": [
      "他",
      "每天",
      "早上",
      "起",
      "得",
      "很早",
      "去",
      "跑步",
      "。"
    ],
    "grammarNote": "Bổ ngữ trạng thái chỉ thói quen / kết quả: 起得很早.",
    "distractors": [
      "的地"
    ],
    "wrongVi": [
      "Buổi sáng anh ấy chạy bộ ở đâu?",
      "Mấy giờ anh ấy thức dậy?",
      "Chạy bộ buổi sáng rất tốt cho sức khỏe."
    ],
    "wrongZh": [
      "他每天早上起的很早去跑步。",
      "每天早上他起得早很去跑步。",
      "他每天早上去跑步起得很早。"
    ]
  },
  {
    "id": "g_25_4",
    "lesson": 25,
    "hsk": 2,
    "zh": "弟弟跑得不快，但是很有劲儿。",
    "py": "Dìdi pǎo de bú kuài, dànshì hěn yǒu jìnr.",
    "vi": "Em trai chạy không nhanh, nhưng rất có sức.",
    "tokens": [
      "弟弟",
      "跑",
      "得",
      "不快",
      "，",
      "但是",
      "很",
      "有劲儿",
      "。"
    ],
    "grammarNote": "Dạng phủ định của bổ ngữ trạng thái: V + 得 + 不 + Tính từ (跑得不快).",
    "distractors": [
      "没"
    ],
    "wrongVi": [
      "Em trai chạy nhanh nhất lớp.",
      "Em trai có thích thể thao không?",
      "Em trai chạy bộ mệt rồi."
    ],
    "wrongZh": [
      "弟弟跑得没快，但是很有劲儿。",
      "弟弟跑不快得，但是很有劲儿。",
      "弟弟没跑得快，但是很有劲儿。"
    ]
  },
  {
    "id": "g_26_1",
    "lesson": 26,
    "hsk": 2,
    "zh": "田芳去哪儿了？她去同学家了。",
    "py": "Tián Fāng qù nǎr le? Tā qù tóngxué jiā le.",
    "vi": "Điền Phương đi đâu rồi? Cô ấy đến nhà bạn học rồi.",
    "tokens": [
      "田芳",
      "去",
      "哪儿",
      "了",
      "？",
      "她",
      "去",
      "同学",
      "家",
      "了",
      "。"
    ],
    "grammarNote": "Trợ từ động thái 了 biểu thị hành động đã xảy ra / thay đổi trạng thái.",
    "distractors": [
      "过"
    ],
    "wrongVi": [
      "Điền Phương có ở nhà không?",
      "Điền Phương đi với ai?",
      "Bao giờ Điền Phương về nhà?"
    ],
    "wrongZh": [
      "田芳去哪儿过？她去同学家过。",
      "田芳去了哪儿？她去同学家了。",
      "去哪儿了田芳？她去同学家了。"
    ]
  },
  {
    "id": "g_26_2",
    "lesson": 26,
    "hsk": 2,
    "zh": "我买了一本很厚的汉英词典。",
    "py": "Wǒ mǎi le yì běn hěn hòu de Hàn-Yīng cídiǎn.",
    "vi": "Tôi đã mua một cuốn từ điển Hán-Anh rất dày.",
    "tokens": [
      "我",
      "买",
      "了",
      "一本",
      "很厚",
      "的",
      "汉英词典",
      "。"
    ],
    "grammarNote": "Cấu trúc: V + 了 + Số lượng + Định ngữ + Tân ngữ (买了一本词典).",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Cuốn từ điển này giá bao nhiêu tiền?",
      "Bạn mua từ điển ở hiệu sách nào?",
      "Từ điển Hán-Anh này rất có ích."
    ],
    "wrongZh": [
      "我买一本很厚的汉英词典了。",
      "我买了一个很厚的汉英词典。",
      "一本很厚的汉英词典我买了。"
    ]
  },
  {
    "id": "g_26_3",
    "lesson": 26,
    "hsk": 2,
    "zh": "昨天晚上我没有看电影。",
    "py": "Zuótiān wǎnshang wǒ méiyǒu kàn diànyǐng.",
    "vi": "Tối hôm qua tôi không xem phim.",
    "tokens": [
      "昨天晚上",
      "我",
      "没有",
      "看",
      "电影",
      "。"
    ],
    "grammarNote": "Phủ định của hành động trong quá khứ bắt buộc dùng 没有 + V (KHÔNG dùng 不+V+了).",
    "distractors": [
      "不看了"
    ],
    "wrongVi": [
      "Tối hôm qua bạn làm gì?",
      "Bộ phim hôm qua có hay không?",
      "Tôi đi xem phim cùng bạn bè."
    ],
    "wrongZh": [
      "昨天晚上我不看电影了。",
      "昨天晚上我没看了电影。",
      "我昨天晚上看电影没有。"
    ]
  },
  {
    "id": "g_26_4",
    "lesson": 26,
    "hsk": 2,
    "zh": "你吃晚饭了没有？还没吃呢。",
    "py": "Nǐ chī wǎnfàn le méiyǒu? Hái méi chī ne.",
    "vi": "Bạn đã ăn cơm tối chưa? Vẫn chưa ăn.",
    "tokens": [
      "你",
      "吃",
      "晚饭",
      "了",
      "没有",
      "？",
      "还",
      "没",
      "吃",
      "呢",
      "。"
    ],
    "grammarNote": "Câu hỏi chính phản về hành động đã xảy ra: [Hành động] + 了没有？",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Cơm tối hôm nay có món gì?",
      "Bạn ăn cơm tối ở đâu?",
      "Chúng mình cùng đi ăn tối nhé."
    ],
    "wrongZh": [
      "你吃晚饭了么？还没吃呢。",
      "你吃了晚饭没有吗？还没吃呢。",
      "晚饭你吃了没有？还没吃呢。"
    ]
  },
  {
    "id": "g_27_1",
    "lesson": 27,
    "hsk": 2,
    "zh": "玛丽，你怎么了？为什么哭了？",
    "py": "Mǎlì, nǐ zěnme le? Wèishénme kū le?",
    "vi": "Mary, bạn bị làm sao thế? Sao lại khóc?",
    "tokens": [
      "玛丽",
      "，",
      "你",
      "怎么",
      "了",
      "？",
      "为什么",
      "哭",
      "了",
      "？"
    ],
    "grammarNote": "Câu hỏi thăm dò tình trạng: 怎么了？ và nguyên nhân: 为什么...了？",
    "distractors": [
      "什么"
    ],
    "wrongVi": [
      "Mary cảm thấy thế nào rồi?",
      "Có chuyện gì xảy ra với Mary thế?",
      "Đừng khóc nữa, có chuyện gì kể tôi nghe."
    ],
    "wrongZh": [
      "玛丽，你什么了？为什么哭了？",
      "玛丽，你怎么呢？为什么哭了？",
      "为什么哭了玛丽，你怎么了？"
    ]
  },
  {
    "id": "g_27_2",
    "lesson": 27,
    "hsk": 2,
    "zh": "因为我感冒了，头疼、发烧。",
    "py": "Yīnwèi wǒ gǎnmào le, tóuténg, fāshāo.",
    "vi": "Bởi vì tôi bị cảm cúm rồi, đau đầu, sốt.",
    "tokens": [
      "因为",
      "我",
      "感冒",
      "了",
      "，",
      "头疼",
      "、",
      "发烧",
      "。"
    ],
    "grammarNote": "Cặp liên từ chỉ nguyên nhân kết quả: 因为... (Bởi vì...).",
    "distractors": [
      "所以"
    ],
    "wrongVi": [
      "Bạn đã uống thuốc hạ sốt chưa?",
      "Bị sốt bao nhiêu độ rồi?",
      "Bạn cần đi khám bác sĩ ngay."
    ],
    "wrongZh": [
      "所以感冒了，我头疼发烧。",
      "因为我感冒，头疼、发烧了。",
      "我因为感冒了，头疼发烧。"
    ]
  },
  {
    "id": "g_27_3",
    "lesson": 27,
    "hsk": 2,
    "zh": "我想家了，身体很不舒服。",
    "py": "Wǒ xiǎng jiā le, shēntǐ hěn bù shūfu.",
    "vi": "Tôi nhớ nhà rồi, người rất khó chịu mệt mỏi.",
    "tokens": [
      "我",
      "想家",
      "了",
      "，",
      "身体",
      "很",
      "不",
      "舒服",
      "。"
    ],
    "grammarNote": "Biến đổi cảm xúc với 了: 想家了; Tính từ 舒服 (dễ chịu).",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Khi bị ốm ai cũng dễ nhớ nhà.",
      "Bạn có muốn ăn chút gì không?",
      "Tôi ở lại chăm sóc bạn nhé."
    ],
    "wrongZh": [
      "我正在想家，身体很不舒服。",
      "我想家，身体很不舒服了。",
      "身体很不舒服，我想家了。"
    ]
  },
  {
    "id": "g_27_4",
    "lesson": 27,
    "hsk": 2,
    "zh": "别哭了，走，我陪你去医院看病。",
    "py": "Bié kū le, zǒu, wǒ péi nǐ qù yīyuàn kànbìng.",
    "vi": "Đừng khóc nữa, đi nào, tôi đưa bạn đến bệnh viện khám bệnh.",
    "tokens": [
      "别",
      "哭",
      "了",
      "，",
      "走",
      "，",
      "我",
      "陪",
      "你",
      "去",
      "医院",
      "看病",
      "。"
    ],
    "grammarNote": "Khuyên ngăn: 别 + V + 了 (Đừng... nữa); Động từ 陪 (đi cùng, đồng hành).",
    "distractors": [
      "不"
    ],
    "wrongVi": [
      "Bác sĩ nói bạn bị bệnh gì?",
      "Bệnh viện ở gần trường không?",
      "Uống thuốc này sẽ đỡ ngay thôi."
    ],
    "wrongZh": [
      "不哭了，走，我陪你去医院看病。",
      "别哭，走，我请你去医院看病。",
      "走，我陪你去医院看病，别哭了。"
    ]
  },
  {
    "id": "g_28_1",
    "lesson": 28,
    "hsk": 2,
    "zh": "我吃了早饭就去找你。",
    "py": "Wǒ chī le zǎofàn jiù qù zhǎo nǐ.",
    "vi": "Tôi ăn sáng xong là đi tìm bạn ngay.",
    "tokens": [
      "我",
      "吃",
      "了",
      "早饭",
      "就",
      "去",
      "找",
      "你",
      "。"
    ],
    "grammarNote": "Cấu trúc liên kết hai hành động liên tiếp: V1 + 了... 就 + V2... (Làm xong A là làm B ngay).",
    "distractors": [
      "才"
    ],
    "wrongVi": [
      "Bạn ăn sáng lúc mấy giờ?",
      "Tôi đợi bạn ở ký túc xá nhé.",
      "Chúng mình cùng đi ăn sáng đi."
    ],
    "wrongZh": [
      "我吃早饭了就去找你。",
      "我吃了早饭才去找你。",
      "吃了早饭我去找你马上。"
    ]
  },
  {
    "id": "g_28_2",
    "lesson": 28,
    "hsk": 2,
    "zh": "你等我一会儿，我马上就来。",
    "py": "Nǐ děng wǒ yíhuìr, wǒ mǎshàng jiù lái.",
    "vi": "Bạn đợi tôi một lát, tôi đến ngay đây.",
    "tokens": [
      "你",
      "等",
      "我",
      "一会儿",
      "，",
      "我",
      "马上",
      "就",
      "来",
      "。"
    ],
    "grammarNote": "Phó từ chỉ sự mau chóng: 马上 (ngay lập tức), 就.",
    "distractors": [
      "才"
    ],
    "wrongVi": [
      "Bao giờ bạn mới đến?",
      "Tôi đã đợi bạn nửa tiếng rồi.",
      "Đừng vội, cứ từ từ đi."
    ],
    "wrongZh": [
      "你等我一会儿，我马上才来。",
      "你等我一点儿，我马上就来。",
      "我马上就来，你等我一会儿。"
    ]
  },
  {
    "id": "g_28_3",
    "lesson": 28,
    "hsk": 2,
    "zh": "你看这套房子，又干净又安静。",
    "py": "Nǐ kàn zhè tào fángzi, yòu gānjìng yòu ānjìng.",
    "vi": "Bạn xem căn nhà này này, vừa sạch sẽ lại vừa yên tĩnh.",
    "tokens": [
      "你",
      "看",
      "这套",
      "房子",
      "，",
      "又",
      "干净",
      "又",
      "安静",
      "。"
    ],
    "grammarNote": "Cấu trúc song hành tính chất: 又 + Tính từ 1 + 又 + Tính từ 2 (Vừa... lại vừa...).",
    "distractors": [
      "也"
    ],
    "wrongVi": [
      "Căn nhà này giá thuê bao nhiêu một tháng?",
      "Căn nhà này có mấy phòng ngủ?",
      "Tôi rất thích căn nhà yên tĩnh này."
    ],
    "wrongZh": [
      "你看这套房子，也干净也安静。",
      "你看这套房子，又干净还安静。",
      "这套房子你看，又干净又安静。"
    ]
  },
  {
    "id": "g_28_4",
    "lesson": 28,
    "hsk": 2,
    "zh": "看完书以后，咱们一起去租房子。",
    "py": "Kàn wán shū yǐhòu, zánmen yìqǐ qù zū fángzi.",
    "vi": "Đọc sách xong, chúng mình cùng đi thuê nhà nhé.",
    "tokens": [
      "看",
      "完",
      "书",
      "以后",
      "，",
      "咱们",
      "一起",
      "去",
      "租",
      "房子",
      "。"
    ],
    "grammarNote": "Bổ ngữ kết quả 完 (xong); Cấu trúc ...以后 (Sau khi làm gì).",
    "distractors": [
      "了"
    ],
    "wrongVi": [
      "Bạn muốn thuê nhà ở khu vực nào?",
      "Giá thuê nhà ở đây có đắt không?",
      "Chúng mình thuê chung một căn nhà nhé."
    ],
    "wrongZh": [
      "看了书以后，咱们一起去租房子。",
      "看书完了以后，咱们一起去租房子。",
      "咱们一起去租房子，看完书以后。"
    ]
  },
  {
    "id": "g_29_1",
    "lesson": 29,
    "hsk": 2,
    "zh": "今天的考试题你做完了吗？",
    "py": "Jīntiān de kǎoshì tí nǐ zuò wán le ma?",
    "vi": "Đề thi hôm nay bạn đã làm xong chưa?",
    "tokens": [
      "今天",
      "的",
      "考试题",
      "你",
      "做",
      "完",
      "了",
      "吗",
      "？"
    ],
    "grammarNote": "Bổ ngữ kết quả 完 (hoàn thành): Động từ + 完 + 了.",
    "distractors": [
      "过"
    ],
    "wrongVi": [
      "Đề thi hôm nay có khó không?",
      "Bạn làm được bao nhiêu câu?",
      "Còn bao nhiêu phút nữa thì hết giờ?"
    ],
    "wrongZh": [
      "今天的考试题你做过了吗？",
      "今天的考试题你做了完吗？",
      "你做完了今天的考试题没有？"
    ]
  },
  {
    "id": "g_29_2",
    "lesson": 29,
    "hsk": 2,
    "zh": "这次的题我都做对了，没写错。",
    "py": "Zhè cì de tí wǒ dōu zuò duì le, méi xiě cuò.",
    "vi": "Đề thi lần này tôi đều làm đúng cả, không viết sai.",
    "tokens": [
      "这次",
      "的",
      "题",
      "我",
      "都",
      "做",
      "对",
      "了",
      "，",
      "没",
      "写",
      "错",
      "。"
    ],
    "grammarNote": "Bổ ngữ kết quả 对 (đúng) và 错 (sai); Phủ định dùng 没 + V + Bổ ngữ kết quả.",
    "distractors": [
      "不"
    ],
    "wrongVi": [
      "Tôi làm sai mất hai câu.",
      "Bạn được bao nhiêu điểm?",
      "Đề thi lần này dễ hơn lần trước."
    ],
    "wrongZh": [
      "这次的题我都做对了，不写错。",
      "这次的题我都做了对，没写错。",
      "我这次的题都做对了，没写错了。"
    ]
  },
  {
    "id": "g_29_3",
    "lesson": 29,
    "hsk": 2,
    "zh": "老师讲的内容我都听懂了。",
    "py": "Lǎoshī jiǎng de nèiróng wǒ dōu tīng dǒng le.",
    "vi": "Nội dung thầy giáo giảng tôi đều nghe hiểu hết rồi.",
    "tokens": [
      "老师",
      "讲",
      "的",
      "内容",
      "我",
      "都",
      "听",
      "懂",
      "了",
      "。"
    ],
    "grammarNote": "Bổ ngữ kết quả 懂 (hiểu): 听懂 (nghe hiểu), 看懂 (đọc hiểu).",
    "distractors": [
      "完"
    ],
    "wrongVi": [
      "Có chỗ nào bạn chưa hiểu không?",
      "Thầy giáo giảng bài rất dễ hiểu.",
      "Bạn ghi chép bài đầy đủ chứ?"
    ],
    "wrongZh": [
      "老师讲的内容我都听完了。",
      "老师讲的内容我都听懂没有。",
      "我都听懂了老师讲的内容。"
    ]
  },
  {
    "id": "g_29_4",
    "lesson": 29,
    "hsk": 2,
    "zh": "你看见我的汉语词典了吗？",
    "py": "Nǐ kànjiàn wǒ de Hànyǔ cídiǎn le ma?",
    "vi": "Bạn có nhìn thấy cuốn từ điển tiếng Hán của tôi không?",
    "tokens": [
      "你",
      "看见",
      "我",
      "的",
      "汉语词典",
      "了",
      "吗",
      "？"
    ],
    "grammarNote": "Bổ ngữ kết quả 见 (thấy): 看见 (nhìn thấy), 听见 (nghe thấy).",
    "distractors": [
      "完"
    ],
    "wrongVi": [
      "Từ điển của bạn màu gì?",
      "Bạn để từ điển ở đâu?",
      "Tôi mượn từ điển của bạn một lát nhé."
    ],
    "wrongZh": [
      "你看完我的汉语词典了吗？",
      "你看了见我的汉语词典吗？",
      "我的汉语词典你看见没有了吗？"
    ]
  },
  {
    "id": "g_30_1",
    "lesson": 30,
    "hsk": 2,
    "zh": "我已经来中国两个多月了。",
    "py": "Wǒ yǐjīng lái Zhōngguó liǎng ge duō yuè le.",
    "vi": "Tôi đã đến Trung Quốc được hơn hai tháng rồi.",
    "tokens": [
      "我",
      "已经",
      "来",
      "中国",
      "两个多月",
      "了",
      "。"
    ],
    "grammarNote": "Bổ ngữ thời lượng: Động từ + Tân ngữ + Thời lượng + 了 (Hành động đang tiếp diễn).",
    "distractors": [
      "二个"
    ],
    "wrongVi": [
      "Bạn đến Trung Quốc vào mùa nào?",
      "Cuộc sống ở Trung Quốc thế nào?",
      "Bạn dự định ở Trung Quốc bao lâu?"
    ],
    "wrongZh": [
      "我已经来中国二个多月了。",
      "我已经来了中国两个多月。",
      "来中国我已经两个多月了。"
    ]
  },
  {
    "id": "g_30_2",
    "lesson": 30,
    "hsk": 2,
    "zh": "我对这儿的生活差不多已经习惯了。",
    "py": "Wǒ duì zhèr de shēnghuó chàbuduō yǐjīng xíguàn le.",
    "vi": "Tôi đối với cuộc sống ở đây hầu như đã quen rồi.",
    "tokens": [
      "我",
      "对",
      "这儿",
      "的",
      "生活",
      "差不多",
      "已经",
      "习惯",
      "了",
      "。"
    ],
    "grammarNote": "Giới từ 对 (đối với): A 对 B + [Thái độ / Cảm nhận / Thói quen].",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Bạn có quen ăn đồ ăn ở đây không?",
      "Khí hậu ở đây có khắc nghiệt không?",
      "Tôi vẫn chưa quen với thời tiết lạnh."
    ],
    "wrongZh": [
      "我在对这儿的生活差不多已经习惯了。",
      "我对这儿的生活已经差不多习惯了。",
      "这儿的生活我对差不多已经习惯了。"
    ]
  },
  {
    "id": "g_30_3",
    "lesson": 30,
    "hsk": 2,
    "zh": "北京的冬天比上海冷得多。",
    "py": "Běijīng de dōngtiān bǐ Shànghǎi lěng de duō.",
    "vi": "Mùa đông ở Bắc Kinh lạnh hơn Thượng Hải nhiều.",
    "tokens": [
      "北京",
      "的",
      "冬天",
      "比",
      "上海",
      "冷",
      "得",
      "多",
      "。"
    ],
    "grammarNote": "Câu so sánh hơn với chữ 比: A 比 B + Tính từ + 得多 / 多了.",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Mùa đông ở Thượng Hải có tuyết không?",
      "Bắc Kinh lạnh hơn hay Thượng Hải lạnh hơn?",
      "Mùa đông ở đây rất lạnh và khô."
    ],
    "wrongZh": [
      "北京的冬天比上海很冷。",
      "北京的冬天比较上海冷得多。",
      "比上海北京的冬天冷得多。"
    ]
  },
  {
    "id": "g_30_4",
    "lesson": 30,
    "hsk": 2,
    "zh": "我坚持每天下午锻炼一个小时。",
    "py": "Wǒ jiānchí měitiān xiàwǔ duànliàn yí ge xiǎoshí.",
    "vi": "Tôi kiên trì mỗi buổi chiều rèn luyện thân thể một tiếng đồng hồ.",
    "tokens": [
      "我",
      "坚持",
      "每天下午",
      "锻炼",
      "一个小时",
      "。"
    ],
    "grammarNote": "Bổ ngữ thời lượng: Động từ + [Khoảng thời gian: 一个小时].",
    "distractors": [
      "钟头"
    ],
    "wrongVi": [
      "Bạn thường tập môn thể thao gì?",
      "Tập thể dục giúp cơ thể khỏe mạnh hơn.",
      "Buổi chiều tôi hay đi chạy bộ."
    ],
    "wrongZh": [
      "我坚持每天下午锻炼一个钟头。",
      "每天下午我坚持一个小时锻炼。",
      "我坚持锻炼一个小时每天下午。"
    ]
  }
];

const GrammarController = {
  sentences: [],
  currentQuestions: [],
  currentIndex: 0,
  score: 0,
  mode: 'reorder', // 'reorder', 'vi_to_zh', 'zh_to_vi'
  selectedTokens: [],
  availableTokens: [],
  isAnswered: false,
  missedQuestions: [],

  init(allLessons) {
    this.sentences = GRAMMAR_DATA;
    this.populateSelects(allLessons);
  },

  populateSelects(lessons) {
    const scopeSelect = document.getElementById('grammar-scope-select');
    if (!scopeSelect || !lessons) return;
    scopeSelect.querySelectorAll('option[value^="lesson_"]').forEach(o => o.remove());
    lessons.forEach(l => {
      const opt = document.createElement('option');
      opt.value = `lesson_${l.id}`;
      opt.innerText = `Bài ${l.id}: ${l.zh_title}`;
      scopeSelect.appendChild(opt);
    });
  },

  resetToSetup() {
    const setupView = document.getElementById('grammar-setup-view');
    const playView = document.getElementById('grammar-play-view');
    const resultsView = document.getElementById('grammar-results-view');
    if (setupView) setupView.style.display = 'block';
    if (playView) playView.style.display = 'none';
    if (resultsView) resultsView.style.display = 'none';
  },

  exitExercise() {
    this.resetToSetup();
  },

  startExercise(options = {}) {
    if (!this.sentences || !this.sentences.length) {
      this.sentences = (typeof GRAMMAR_DATA !== 'undefined' ? GRAMMAR_DATA : (window.GRAMMAR_DATA || []));
    }
    this.mode = options.mode || 'reorder';
    const scope = options.scope || 'all';
    const count = parseInt(options.count || 10, 10);

    let pool = [...this.sentences];
    if (/^hsk\d$/.test(scope)) {
      pool = pool.filter(s => s.hsk === +scope.slice(3));
    } else if (scope.startsWith('lesson_')) {
      const lNum = parseInt(scope.replace('lesson_', ''), 10);
      pool = pool.filter(s => s.lesson === lNum);
      if (!pool.length) {
        const lessonObj = (window.CHINESE_DATA && window.CHINESE_DATA.lessons || []).find(l => l.id === lNum);
        const level = lessonObj ? lessonObj.hsk : (lNum <= 15 ? 1 : 2);
        pool = this.sentences.filter(s => s.hsk === level);
      }
    }

    if (!pool.length) pool = this.sentences;

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    this.currentQuestions = shuffled.slice(0, Math.min(count, pool.length));
    this.currentIndex = 0;
    this.score = 0;
    this.missedQuestions = [];

    const setupView = document.getElementById('grammar-setup-view');
    const playView = document.getElementById('grammar-play-view');
    const resultsView = document.getElementById('grammar-results-view');

    if (setupView) setupView.style.display = 'none';
    if (resultsView) resultsView.style.display = 'none';
    if (playView) playView.style.display = 'block';

    this.renderQuestion();
  },

  renderQuestion() {
    this.isAnswered = false;
    if (!this.currentQuestions || !this.currentQuestions.length) return;
    const q = this.currentQuestions[this.currentIndex];
    if (!q) return;

    const total = this.currentQuestions.length;

    // Update Progress Headers
    const curNum = document.getElementById('grammar-cur-num');
    if (curNum) curNum.innerText = this.currentIndex + 1;
    const totNum = document.getElementById('grammar-tot-num');
    if (totNum) totNum.innerText = total;
    const liveScore = document.getElementById('grammar-live-score');
    if (liveScore) liveScore.innerText = this.score;

    const progFill = document.getElementById('grammar-progress-fill');
    if (progFill) progFill.style.width = `${((this.currentIndex) / total) * 100}%`;

    const feedbackBox = document.getElementById('grammar-feedback-box');
    if (feedbackBox) {
      feedbackBox.style.display = 'none';
      feedbackBox.innerHTML = '';
    }

    const checkBtn = document.getElementById('grammar-check-btn');
    const nextBtn = document.getElementById('grammar-next-btn');
    if (checkBtn) {
      checkBtn.style.display = this.mode === 'reorder' ? 'inline-flex' : 'none';
      checkBtn.disabled = this.mode === 'reorder';
    }
    if (nextBtn) nextBtn.style.display = 'none';

    // Container Views
    const reorderArea = document.getElementById('grammar-reorder-area');
    const choiceArea = document.getElementById('grammar-choice-area');
    const promptVi = document.getElementById('grammar-prompt-vi');
    const promptZh = document.getElementById('grammar-prompt-zh');

    if (this.mode === 'reorder') {
      if (reorderArea) reorderArea.style.display = 'block';
      if (choiceArea) choiceArea.style.display = 'none';
      if (promptVi) promptVi.innerHTML = `<span class="quiz-prompt-label">Ghép thành câu có nghĩa</span><strong class="quiz-prompt-mean">${UI.esc(q.vi)}</strong>`;
      if (promptZh) promptZh.style.display = 'none';

      // Setup tokens
      this.selectedTokens = [];
      const allTokens = [...q.tokens];
      if (q.distractors && q.distractors.length) {
        allTokens.push(...q.distractors);
      }
      this.availableTokens = allTokens.map((t, i) => ({ id: i, text: t })).sort(() => 0.5 - Math.random());

      this.renderTiles();
    } else if (this.mode === 'vi_to_zh') {
      if (reorderArea) reorderArea.style.display = 'none';
      if (choiceArea) choiceArea.style.display = 'block';
      if (promptVi) promptVi.innerHTML = `<span class="quiz-prompt-label">Chọn câu tiếng Trung đúng cho</span><strong class="quiz-prompt-mean">${UI.esc(q.vi)}</strong>`;
      if (promptZh) promptZh.style.display = 'none';

      this.renderTranslationChoices(q, 'zh');
    } else if (this.mode === 'zh_to_vi') {
      if (reorderArea) reorderArea.style.display = 'none';
      if (choiceArea) choiceArea.style.display = 'block';
      if (promptVi) promptVi.innerHTML = `<span class="quiz-prompt-label">Chọn nghĩa tiếng Việt của câu</span>`;
      if (promptZh) {
        promptZh.style.display = 'block';
        promptZh.innerHTML = `
          <div class="grammar-zh hanzi">${q.zh}</div>
          <div class="py grammar-py">${Tone.html(q.py || q.pinyin || '')}</div>
          <button class="btn btn-outline btn-sm" onclick="AudioEngine.speak('${jsArg(q.zh)}')">${Icon.svg('sound')}<span>Nghe câu</span></button>
        `;
      }

      this.renderTranslationChoices(q, 'vi');
    }
  },

  renderTiles() {
    const slotContainer = document.getElementById('grammar-answer-slot');
    const poolContainer = document.getElementById('grammar-pool-slot');
    const checkBtn = document.getElementById('grammar-check-btn');

    if (slotContainer) {
      if (!this.selectedTokens.length) {
        slotContainer.innerHTML = '<span class="tile-placeholder">Chạm vào các từ bên dưới để ghép câu theo đúng trật tự...</span>';
      } else {
        slotContainer.innerHTML = '';
        this.selectedTokens.forEach((t, idx) => {
          const btn = document.createElement('button');
          btn.className = 'grammar-tile';
          btn.innerText = t.text;
          btn.onclick = () => this.unselectTile(idx);
          slotContainer.appendChild(btn);
        });
      }
    }

    if (poolContainer) {
      poolContainer.innerHTML = '';
      this.availableTokens.forEach((t, idx) => {
        const btn = document.createElement('button');
        btn.className = 'grammar-tile';
        btn.innerText = t.text;
        btn.onclick = () => this.selectTile(idx);
        poolContainer.appendChild(btn);
      });
    }

    if (checkBtn) {
      checkBtn.disabled = this.selectedTokens.length === 0;
    }
  },

  resetAnswerState() {
    this.isAnswered = false;
    const feedbackBox = document.getElementById('grammar-feedback-box');
    if (feedbackBox) {
      feedbackBox.style.display = 'none';
      feedbackBox.innerHTML = '';
    }
    const checkBtn = document.getElementById('grammar-check-btn');
    const nextBtn = document.getElementById('grammar-next-btn');
    if (checkBtn) {
      checkBtn.style.display = 'inline-flex';
      checkBtn.disabled = this.selectedTokens.length === 0;
    }
    if (nextBtn) {
      nextBtn.style.display = 'none';
    }
    const slot = document.getElementById('grammar-answer-slot');
    if (slot) {
      slot.classList.remove('slot-correct', 'slot-wrong');
    }
  },

  selectTile(poolIndex) {
    if (this.isAnswered) {
      this.resetAnswerState();
    }
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    const token = this.availableTokens.splice(poolIndex, 1)[0];
    if (token) this.selectedTokens.push(token);
    this.renderTiles();
  },

  unselectTile(slotIndex) {
    if (this.isAnswered) {
      this.resetAnswerState();
    }
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    const token = this.selectedTokens.splice(slotIndex, 1)[0];
    if (token) this.availableTokens.push(token);
    this.renderTiles();
  },

  clearTiles() {
    this.resetAnswerState();
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    if (this.selectedTokens && this.selectedTokens.length) {
      this.availableTokens.push(...this.selectedTokens);
      this.selectedTokens = [];
    }
    this.renderTiles();
  },

  renderTranslationChoices(q, targetType) {
    const container = document.getElementById('grammar-choice-area');
    if (!container) return;

    const correctText = targetType === 'zh' ? q.zh : q.vi;
    const wrongOptions = targetType === 'zh' ? (q.wrongZh || []) : (q.wrongVi || []);

    const allChoices = [
      { text: correctText, isCorrect: true },
      ...wrongOptions.map(t => ({ text: t, isCorrect: false }))
    ].sort(() => 0.5 - Math.random());

    container.innerHTML = `
      <div class="grammar-options-grid">
        ${allChoices.map((c, idx) => `
          <button class="grammar-opt-btn" onclick="GrammarController.handleChoiceAnswer(${c.isCorrect}, this)">
            <span class="opt-letter">${String.fromCharCode(65 + idx)}.</span>
            <span class="opt-text ${targetType === 'zh' ? 'hanzi' : ''}">${c.text}</span>
          </button>
        `).join('')}
      </div>
    `;
  },

  handleChoiceAnswer(isCorrect, buttonEl) {
    if (this.isAnswered) return;
    this.isAnswered = true;

    const q = this.currentQuestions[this.currentIndex];
    const allBtns = document.querySelectorAll('.grammar-opt-btn');
    allBtns.forEach(b => b.disabled = true);

    if (isCorrect) {
      buttonEl.classList.add('correct');
      this.score++;
      AudioEngine.playCorrectSound();
      AudioEngine.speak(q.zh);
      if (typeof StorageManager !== 'undefined') {
        StorageManager.addXP(10, 'Dịch câu đúng');
        StorageManager.recordDailyAction('quiz', 1);
      }
    } else {
      buttonEl.classList.add('wrong');
      AudioEngine.playWrongSound();
      this.missedQuestions.push(q);
      allBtns.forEach(b => {
        if (b.innerText.includes(this.mode === 'vi_to_zh' ? q.zh : q.vi)) {
          b.classList.add('correct');
        }
      });
    }

    this.showFeedback(isCorrect, q);
  },

  checkReorderAnswer() {
    if (this.isAnswered || !this.selectedTokens.length) return;
    this.isAnswered = true;

    const q = this.currentQuestions[this.currentIndex];
    const userAssembled = this.selectedTokens.map(t => t.text).join('').replace(/[,.?!，。？！]/g, '');
    const expected = q.zh.replace(/[,.?!，。？！]/g, '');

    const isCorrect = userAssembled === expected;

    const slot = document.getElementById('grammar-answer-slot');
    if (slot) {
      slot.classList.add(isCorrect ? 'slot-correct' : 'slot-wrong');
    }

    if (isCorrect) {
      this.score++;
      AudioEngine.playCorrectSound();
      AudioEngine.speak(q.zh);
      if (typeof StorageManager !== 'undefined') {
        StorageManager.addXP(15, 'Sắp xếp câu chính xác');
        StorageManager.recordDailyAction('quiz', 1);
      }
    } else {
      AudioEngine.playWrongSound();
      this.missedQuestions.push(q);
    }

    this.showFeedback(isCorrect, q);
  },

  showFeedback(isCorrect, q) {
    const feedbackBox = document.getElementById('grammar-feedback-box');
    const checkBtn = document.getElementById('grammar-check-btn');
    const nextBtn = document.getElementById('grammar-next-btn');

    if (checkBtn) checkBtn.style.display = 'none';
    if (nextBtn) {
      nextBtn.style.display = 'inline-flex';
      nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Hear the correct sentence right away (we are inside the learner's tap)
    if (typeof AudioEngine !== 'undefined' && q && q.zh) AudioEngine.speak(q.zh);

    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.className = `grammar-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
      feedbackBox.innerHTML = `
        <div class="rv-fb-head">${Icon.svg(isCorrect ? 'check' : 'x')}<b>${isCorrect ? 'Chính xác' : 'Chưa đúng. Câu đúng là:'}</b></div>
        <button class="say-line" onclick="AudioEngine.speak('${jsArg(q.zh)}')"><span class="hanzi">${q.zh}</span><span class="py">${Tone.html(q.py || q.pinyin || '')}</span><span class="say-vi">${UI.esc(q.vi)}</span>${Icon.svg('sound')}</button>
        <div class="grammar-tip-badge">${Icon.svg('bulb')}<span><b>Ngữ pháp:</b> ${UI.esc(q.grammarNote || q.point || 'Chú ý trật tự từ: thời gian và nơi chốn đứng trước động từ.')}</span></div>
      `;
    }
  },

  nextQuestion() {
    const slot = document.getElementById('grammar-answer-slot');
    if (slot) slot.classList.remove('slot-correct', 'slot-wrong');

    if (this.currentIndex < this.currentQuestions.length - 1) {
      this.currentIndex++;
      this.renderQuestion();
    } else {
      this.showResults();
    }
  },

  showResults() {
    const playView = document.getElementById('grammar-play-view');
    const resultsView = document.getElementById('grammar-results-view');
    if (playView) playView.style.display = 'none';
    if (resultsView) resultsView.style.display = 'block';

    const total = this.currentQuestions.length;
    const pct = total > 0 ? Math.round((this.score / total) * 100) : 0;

    if (pct >= 80) {
      AudioEngine.playVictorySound();
    }

    const resScore = document.getElementById('grammar-res-score');
    if (resScore) resScore.innerText = `${this.score} / ${total}`;
    const resPct = document.getElementById('grammar-res-pct');
    if (resPct) resPct.innerText = `${pct}%`;

    let badge = 'Cần luyện tập thêm nhé!';
    if (pct === 100) badge = 'Tuyệt đối! Bạn nắm chắc cấu trúc câu.';
    else if (pct >= 80) badge = 'Rất tốt! Chỉ còn vài lỗi nhỏ.';
    else if (pct >= 60) badge = 'Khá tốt. Xem lại các câu sai bên dưới.';
    const badgeEl = document.getElementById('grammar-res-badge');
    if (badgeEl) badgeEl.innerText = badge;

    // Render missed items
    const missedArea = document.getElementById('grammar-missed-area');
    const missedList = document.getElementById('grammar-missed-list');
    if (this.missedQuestions.length > 0 && missedArea && missedList) {
      missedArea.style.display = 'block';
      missedList.innerHTML = this.missedQuestions.map(m => `
        <button class="say-line say-block" onclick="AudioEngine.speak('${jsArg(m.zh)}')">
          <span class="hanzi">${m.zh}</span><span class="py">${Tone.html(m.py || '')}</span><span class="say-vi">${UI.esc(m.vi)}</span>${Icon.svg('sound')}
          <span class="say-note">${UI.esc(m.grammarNote || '')}</span>
        </button>
      `).join('');
    } else if (missedArea) {
      missedArea.style.display = 'none';
    }
  }
};

if (typeof window !== 'undefined') {
  window.GRAMMAR_DATA = GRAMMAR_DATA;
  window.GrammarController = GrammarController;
}
/**
 * HSK 3 grammar exercises (Bài 31–40) from the teacher's slides.
 * AUTO-GENERATED by scripts/build-hsk3.js from slide-audit/hsk3/lesson_*.json. Do not edit by hand.
 */
GRAMMAR_DATA.push(...[{"id":"g_31_1","lesson":31,"hsk":3,"zh":"上海的气温比北京高得多。","py":"Shànghǎi de qìwēn bǐ Běijīng gāo de duō.","vi":"Nhiệt độ ở Thượng Hải cao hơn Bắc Kinh nhiều.","tokens":["上海的","气温","比","北京","高","得多","。"],"grammarNote":"A 比 B + tính từ + 得多: biểu thị chênh lệch rất lớn; trước tính từ không dùng 很.","distractors":["很"],"wrongVi":["Nhiệt độ ở Thượng Hải thấp hơn Bắc Kinh nhiều.","Nhiệt độ ở Bắc Kinh cao hơn Thượng Hải một chút.","Nhiệt độ ở Thượng Hải bằng Bắc Kinh."],"wrongZh":["上海的气温比北京很高。","上海的气温高比北京得多。","北京比上海的气温得多高。"]},{"id":"g_31_2","lesson":31,"hsk":3,"zh":"他比我考得好。","py":"Tā bǐ wǒ kǎo de hǎo.","vi":"Anh ấy thi tốt hơn tôi.","tokens":["他","比","我","考得","好","。"],"grammarNote":"Câu so sánh với bổ ngữ trạng thái: A 比 B + động từ + 得 + tính từ (= A + động từ + 得 + 比 B + tính từ).","distractors":["很"],"wrongVi":["Tôi thi tốt hơn anh ấy.","Anh ấy thi không tốt bằng tôi.","Anh ấy thi tốt như tôi."],"wrongZh":["他比我考得很好。","他考比我得好。","我比他好考得。"]},{"id":"g_31_3","lesson":31,"hsk":3,"zh":"火车没有飞机快。","py":"Huǒchē méiyǒu fēijī kuài.","vi":"Tàu hỏa không nhanh bằng máy bay.","tokens":["火车","没有","飞机","快","。"],"grammarNote":"Phủ định của câu chữ 比: B 没有 A + tính từ (B không bằng A).","distractors":["比"],"wrongVi":["Tàu hỏa nhanh hơn máy bay.","Máy bay không nhanh bằng tàu hỏa.","Tàu hỏa nhanh như máy bay."],"wrongZh":["火车没有飞机很快。","没有火车飞机快。","火车飞机没有快。"]},{"id":"g_31_4","lesson":31,"hsk":3,"zh":"飞机比汽车更快。","py":"Fēijī bǐ qìchē gèng kuài.","vi":"Máy bay còn nhanh hơn ô tô.","tokens":["飞机","比","汽车","更","快","。"],"grammarNote":"更 + tính từ trong câu so sánh: càng…, hơn nữa (không dùng 很、真、非常).","distractors":["很"],"wrongVi":["Ô tô nhanh hơn máy bay.","Máy bay không nhanh bằng ô tô.","Máy bay chậm hơn ô tô."],"wrongZh":["飞机比汽车很快。","飞机比汽车快更。","比飞机汽车更快。"]},{"id":"g_31_5","lesson":31,"hsk":3,"zh":"他比弟弟大两岁。","py":"Tā bǐ dìdi dà liǎng suì.","vi":"Anh ấy lớn hơn em trai hai tuổi.","tokens":["他","比","弟弟","大","两岁","。"],"grammarNote":"Bổ ngữ số lượng: A 比 B + tính từ + số lượng, nói rõ mức chênh lệch cụ thể.","distractors":["多"],"wrongVi":["Em trai lớn hơn anh ấy hai tuổi.","Anh ấy nhỏ hơn em trai hai tuổi.","Anh ấy bằng tuổi em trai."],"wrongZh":["他比弟弟两岁大。","他比弟弟很大两岁。","他大两岁比弟弟。"]},{"id":"g_32_1","lesson":32,"hsk":3,"zh":"小王跟小张一样大。","py":"Xiǎo Wáng gēn Xiǎo Zhāng yíyàng dà.","vi":"Tiểu Vương và Tiểu Trương bằng tuổi nhau.","tokens":["小王","跟","小张","一样","大","。"],"grammarNote":"So sánh ngang bằng: A 跟 B 一样 + tính từ.","distractors":["比"],"wrongVi":["Tiểu Vương lớn hơn Tiểu Trương.","Tiểu Vương không bằng tuổi Tiểu Trương.","Tiểu Vương và Tiểu Trương cao như nhau."],"wrongZh":["小王跟小张大一样。","小王一样跟小张大。","小王跟小张一样很大。"]},{"id":"g_32_2","lesson":32,"hsk":3,"zh":"她跟我一样喜欢听音乐。","py":"Tā gēn wǒ yíyàng xǐhuan tīng yīnyuè.","vi":"Cô ấy cũng thích nghe nhạc giống tôi.","tokens":["她","跟","我","一样","喜欢","听","音乐","。"],"grammarNote":"A 跟 B 一样 + động từ + tân ngữ: A và B giống nhau ở hành động/sở thích.","distractors":["比"],"wrongVi":["Cô ấy thích nghe nhạc hơn tôi.","Cô ấy không thích nghe nhạc như tôi.","Tôi thích hát giống cô ấy."],"wrongZh":["她跟我喜欢一样听音乐。","她一样跟我喜欢听音乐。","跟她我一样喜欢听音乐。"]},{"id":"g_32_3","lesson":32,"hsk":3,"zh":"这双皮鞋跟那双不一样大。","py":"Zhè shuāng píxié gēn nà shuāng bù yíyàng dà.","vi":"Đôi giày da này không cùng cỡ với đôi kia.","tokens":["这双皮鞋","跟","那双","不一样","大","。"],"grammarNote":"Phủ định: A 跟 B 不一样 + tính từ.","distractors":["没有"],"wrongVi":["Đôi giày da này to bằng đôi kia.","Đôi giày da này to hơn đôi kia.","Đôi giày da này rẻ hơn đôi kia."],"wrongZh":["这双皮鞋跟那双不一样很大。","这双皮鞋跟那双没一样大。","跟这双皮鞋那双不一样大。"]},{"id":"g_32_4","lesson":32,"hsk":3,"zh":"他不但会说英语，而且还会法语。","py":"Tā búdàn huì shuō Yīngyǔ, érqiě hái huì Fǎyǔ.","vi":"Anh ấy không những biết nói tiếng Anh mà còn biết cả tiếng Pháp.","tokens":["他","不但","会说","英语","，","而且","还会","法语","。"],"grammarNote":"不但……而且……: hai phân câu cùng chủ ngữ thì 不但 đặt sau chủ ngữ.","distractors":["但是"],"wrongVi":["Anh ấy biết tiếng Pháp nhưng không biết tiếng Anh.","Anh ấy không biết tiếng Anh cũng không biết tiếng Pháp.","Anh ấy chỉ biết nói tiếng Anh."],"wrongZh":["不但他会说英语，而且还会法语。","他会说英语不但，而且还会法语。","他不但会说英语，还而且会法语。"]},{"id":"g_32_5","lesson":32,"hsk":3,"zh":"不但她会说汉语，而且她妹妹也会说汉语。","py":"Búdàn tā huì shuō Hànyǔ, érqiě tā mèimei yě huì shuō Hànyǔ.","vi":"Không những cô ấy biết nói tiếng Hán mà em gái cô ấy cũng biết nói tiếng Hán.","tokens":["不但","她","会说","汉语","，","而且","她妹妹","也","会说","汉语","。"],"grammarNote":"不但……而且……: hai phân câu khác chủ ngữ thì 不但 đặt trước chủ ngữ của phân câu thứ nhất.","distractors":["但是"],"wrongVi":["Cô ấy biết nói tiếng Hán nhưng em gái cô ấy thì không.","Em gái cô ấy biết nói tiếng Hán còn cô ấy thì không.","Cô ấy và em gái đều không biết nói tiếng Hán."],"wrongZh":["她不但会说汉语，而且她妹妹也会说汉语。","不但她会说汉语，她妹妹而且也会说汉语。","而且她会说汉语，不但她妹妹也会说汉语。"]},{"id":"g_33_1","lesson":33,"hsk":3,"zh":"冬天快要到了。","py":"Dōngtiān kuàiyào dào le.","vi":"Mùa đông sắp đến rồi.","tokens":["冬天","快要","到","了","。"],"grammarNote":"快要……了: biểu thị động tác/sự việc sắp xảy ra.","distractors":["已经"],"wrongVi":["Mùa đông đã qua rồi.","Mùa đông còn lâu mới đến.","Mùa đông năm nay rất lạnh."],"wrongZh":["冬天快要到。","快要冬天到了。","冬天到快要了。"]},{"id":"g_33_2","lesson":33,"hsk":3,"zh":"下个月姐姐就要结婚了。","py":"Xià ge yuè jiějie jiù yào jiéhūn le.","vi":"Tháng sau chị gái sẽ kết hôn rồi.","tokens":["下个月","姐姐","就要","结婚","了","。"],"grammarNote":"Có trạng ngữ thời gian cụ thể (下个月) thì dùng 就要……了, không dùng 快要……了.","distractors":["快要"],"wrongVi":["Tháng trước chị gái đã kết hôn.","Tháng sau chị gái không kết hôn nữa.","Chị gái vừa kết hôn được một tháng."],"wrongZh":["下个月姐姐快要结婚了。","下个月姐姐结婚就要了。","就要下个月姐姐结婚了。"]},{"id":"g_33_3","lesson":33,"hsk":3,"zh":"同学们都在努力地学习。","py":"Tóngxuémen dōu zài nǔlì de xuéxí.","vi":"Các bạn học đều đang chăm chỉ học tập.","tokens":["同学们","都","在","努力地","学习","。"],"grammarNote":"Trạng ngữ + 地 + động từ: 努力地学习 (học một cách chăm chỉ).","distractors":["得"],"wrongVi":["Các bạn học đều không chịu học.","Các bạn học đều đã học xong.","Các bạn học đều đang vui vẻ chơi đùa."],"wrongZh":["同学们都在努力得学习。","同学们都在学习努力地。","都同学们在努力地学习。"]},{"id":"g_33_4","lesson":33,"hsk":3,"zh":"结婚后，她不工作了。","py":"Jiéhūn hòu, tā bù gōngzuò le.","vi":"Sau khi kết hôn, cô ấy không đi làm nữa.","tokens":["结婚后","，","她","不","工作","了","。"],"grammarNote":"不……了: biểu thị sự thay đổi (trước kia có làm, nay không làm nữa).","distractors":["没"],"wrongVi":["Sau khi kết hôn, cô ấy vẫn đi làm.","Trước khi kết hôn, cô ấy không đi làm.","Sau khi kết hôn, cô ấy đi làm lại."],"wrongZh":["结婚后，她不了工作。","结婚后，她工作不了了不。","结婚后，不她工作了。"]},{"id":"g_33_5","lesson":33,"hsk":3,"zh":"时间还早着呢。","py":"Shíjiān hái zǎo zhene.","vi":"Thời gian vẫn còn sớm lắm.","tokens":["时间","还","早","着呢","。"],"grammarNote":"Tính từ + 着呢 (= 很): nhấn mạnh mức độ, không dùng thêm 很.","distractors":["很"],"wrongVi":["Thời gian không còn sớm nữa.","Đã muộn lắm rồi.","Thời gian trôi nhanh quá."],"wrongZh":["时间还很早着呢。","时间着呢还早。","时间还着呢早。"]},{"id":"g_34_1","lesson":34,"hsk":3,"zh":"他回家去了。","py":"Tā huí jiā qù le.","vi":"Anh ấy về nhà rồi.","tokens":["他","回","家","去","了","。"],"grammarNote":"Động từ + tân ngữ chỉ địa điểm + 去: hướng đi xa người nói (người nói ở ngoài nhà).","distractors":["来"],"wrongVi":["Anh ấy đến nhà tôi rồi.","Anh ấy vẫn chưa về nhà.","Anh ấy từ nhà đi ra rồi."],"wrongZh":["他回去家了。","他家回去了。","他回了家去来。"]},{"id":"g_34_2","lesson":34,"hsk":3,"zh":"我到小赵家去了。","py":"Wǒ dào Xiǎo Zhào jiā qù le.","vi":"Tôi đã đến nhà Tiểu Triệu.","tokens":["我","到","小赵家","去","了","。"],"grammarNote":"Tân ngữ chỉ địa điểm đặt giữa động từ và 来/去: 到 + nơi chốn + 去.","distractors":["在"],"wrongVi":["Tiểu Triệu đã đến nhà tôi.","Tôi chưa đến nhà Tiểu Triệu.","Tôi đang ở nhà Tiểu Triệu."],"wrongZh":["我到去小赵家了。","我小赵家到去了。","我到小赵家了去。"]},{"id":"g_34_3","lesson":34,"hsk":3,"zh":"我给你带来了一些东西。","py":"Wǒ gěi nǐ dàilaile yìxiē dōngxi.","vi":"Tôi mang đến cho bạn một ít đồ.","tokens":["我","给你","带来了","一些","东西","。"],"grammarNote":"Tân ngữ chỉ sự vật có thể đứng sau 来/去: 带来了一些东西 (= 带了一些东西来).","distractors":["拿去"],"wrongVi":["Bạn mang đến cho tôi một ít đồ.","Tôi mang đi một ít đồ của bạn.","Tôi muốn mua cho bạn một ít đồ."],"wrongZh":["我给你来带了一些东西。","给你我带来了一些东西。","我给你带了来一些东西。"]},{"id":"g_34_4","lesson":34,"hsk":3,"zh":"你不是北京人吗？","py":"Nǐ bú shì Běijīngrén ma?","vi":"Chẳng phải bạn là người Bắc Kinh sao?","tokens":["你","不是","北京人","吗","？"],"grammarNote":"不是……吗: câu phản vấn nhấn mạnh ý khẳng định (tôi biết bạn là người Bắc Kinh).","distractors":["呢"],"wrongVi":["Bạn có phải người Thượng Hải không?","Tôi không phải người Bắc Kinh.","Bạn sống ở Bắc Kinh bao lâu rồi?"],"wrongZh":["你是不北京人吗？","不是你北京人吗？","你不是北京人呢吗？"]},{"id":"g_34_5","lesson":34,"hsk":3,"zh":"还麻烦你跑一趟。","py":"Hái máfan nǐ pǎo yí tàng.","vi":"Còn phiền bạn phải chạy một chuyến.","tokens":["还","麻烦","你","跑","一趟","。"],"grammarNote":"趟 là động lượng từ chỉ số lần đi lại: 跑一趟.","distractors":["一声"],"wrongVi":["Phiền bạn nói với tôi một tiếng.","Bạn không cần đến đâu.","Cảm ơn bạn đã gọi điện cho tôi."],"wrongZh":["还麻烦你一趟跑。","还你麻烦跑一趟。","还麻烦你跑一声。"]},{"id":"g_35_1","lesson":35,"hsk":3,"zh":"你以前来过中国没有？","py":"Nǐ yǐqián láiguo Zhōngguó méiyǒu?","vi":"Trước đây bạn đã từng đến Trung Quốc chưa?","tokens":["你","以前","来过","中国","没有","？"],"grammarNote":"Câu hỏi về trải nghiệm: Động từ + 过 + Tân ngữ + 没有？","distractors":["吗"],"wrongVi":["Trước đây bạn có sống ở Trung Quốc không?","Bạn định bao giờ đến Trung Quốc?","Bạn đã về Trung Quốc chưa?"],"wrongZh":["你以前来中国过没有？","你以前没有来过中国？","以前你来没有过中国？"]},{"id":"g_35_2","lesson":35,"hsk":3,"zh":"我没吃过北京烤鸭。","py":"Wǒ méi chīguo Běijīng kǎoyā.","vi":"Tôi chưa từng ăn vịt quay Bắc Kinh.","tokens":["我","没","吃过","北京","烤鸭","。"],"grammarNote":"Phủ định của 过: 没（有）+ Động từ + 过, không dùng 不.","distractors":["了"],"wrongVi":["Tôi không thích ăn vịt quay Bắc Kinh.","Tôi đã ăn vịt quay Bắc Kinh rồi.","Tôi muốn ăn vịt quay Bắc Kinh."],"wrongZh":["我不吃过北京烤鸭。","我吃没过北京烤鸭。","我没吃过了北京烤鸭。"]},{"id":"g_35_3","lesson":35,"hsk":3,"zh":"他来过两次中国。","py":"Tā láiguo liǎng cì Zhōngguó.","vi":"Anh ấy đã từng đến Trung Quốc hai lần.","tokens":["他","来过","两次","中国","。"],"grammarNote":"Bổ ngữ động lượng: 过 đặt sau động từ, trước bổ ngữ động lượng; tân ngữ chỉ nơi chốn/sự vật đặt sau.","distractors":["一下"],"wrongVi":["Anh ấy đã đến Trung Quốc hai năm rồi.","Anh ấy muốn đến Trung Quốc hai lần.","Anh ấy chưa từng đến Trung Quốc lần nào."],"wrongZh":["他两次来过中国。","他来两次过中国。","他过来两次中国。"]},{"id":"g_35_4","lesson":35,"hsk":3,"zh":"他找过你一次。","py":"Tā zhǎoguo nǐ yí cì.","vi":"Anh ấy đã từng tìm bạn một lần.","tokens":["他","找过","你","一次","。"],"grammarNote":"Tân ngữ là đại từ nhân xưng bắt buộc đặt trước bổ ngữ động lượng: Động từ + 过 + Đại từ + Số lần.","distractors":["两遍"],"wrongVi":["Anh ấy đã tìm bạn hai lần.","Bạn đã từng tìm anh ấy một lần.","Anh ấy chưa bao giờ tìm bạn."],"wrongZh":["他找过一次你。","他一次找过你。","他找你过一次。"]},{"id":"g_35_5","lesson":35,"hsk":3,"zh":"我一本中文书也没看过。","py":"Wǒ yì běn Zhōngwén shū yě méi kànguo.","vi":"Tôi chưa từng đọc cuốn sách tiếng Trung nào cả.","tokens":["我","一本","中文书","也","没","看过","。"],"grammarNote":"Kết cấu 一 + lượng từ + danh từ + 也 + 没 + Động từ + 过: phủ định hoàn toàn.","distractors":["都"],"wrongVi":["Tôi đã đọc một cuốn sách tiếng Trung.","Tôi chỉ đọc một cuốn sách tiếng Trung.","Tôi muốn đọc một cuốn sách tiếng Trung."],"wrongZh":["我一本中文书没也看过。","我也一本中文书没看过。","我一本中文书也不看过。"]},{"id":"g_36_1","lesson":36,"hsk":3,"zh":"我是去年九月来中国的。","py":"Wǒ shì qùnián jiǔ yuè lái Zhōngguó de.","vi":"Tôi đến Trung Quốc vào tháng 9 năm ngoái.","tokens":["我","是","去年九月","来","中国","的","。"],"grammarNote":"是……的 nhấn mạnh thời gian của động tác đã xảy ra: 是 + thời gian + Động từ + 的.","distractors":["了"],"wrongVi":["Tôi sẽ đến Trung Quốc vào tháng 9 năm sau.","Tôi đã ở Trung Quốc từ tháng 9.","Tháng 9 năm ngoái tôi rời Trung Quốc."],"wrongZh":["我是来中国的去年九月。","我去年九月是的来中国。","是我去年九月来中国了的。"]},{"id":"g_36_2","lesson":36,"hsk":3,"zh":"他是坐飞机来的。","py":"Tā shì zuò fēijī lái de.","vi":"Anh ấy đi máy bay đến.","tokens":["他","是","坐飞机","来","的","。"],"grammarNote":"是……的 nhấn mạnh phương thức của động tác: 是 + phương thức + Động từ + 的.","distractors":["过"],"wrongVi":["Anh ấy đi tàu hỏa đến.","Anh ấy muốn đi máy bay.","Anh ấy không đi máy bay đến."],"wrongZh":["他是来坐飞机的。","他坐飞机是来的。","他是坐飞机的来。"]},{"id":"g_36_3","lesson":36,"hsk":3,"zh":"我不是来旅行的，我是来留学的。","py":"Wǒ bú shì lái lǚxíng de, wǒ shì lái liúxué de.","vi":"Tôi không phải đến để du lịch, tôi đến để du học.","tokens":["我","不是","来","旅行","的","，","我","是","来","留学","的","。"],"grammarNote":"Phủ định của 是……的: 不是……的, không được bỏ 是; ở đây nhấn mạnh mục đích.","distractors":["没"],"wrongVi":["Tôi đến để du lịch, không phải để du học.","Tôi không thích du lịch, tôi thích du học.","Tôi chưa từng du lịch hay du học."],"wrongZh":["我不来旅行的，我是来留学的。","我是不来旅行的，我来是留学的。","我没是来旅行的，我是来留学的。"]},{"id":"g_36_4","lesson":36,"hsk":3,"zh":"中国人一听就知道你是老外。","py":"Zhōngguórén yì tīng jiù zhīdào nǐ shì lǎowài.","vi":"Người Trung Quốc vừa nghe là biết ngay bạn là người nước ngoài.","tokens":["中国人","一","听","就","知道","你","是","老外","。"],"grammarNote":"一……就……: hành động thứ nhất là điều kiện dẫn đến kết quả tất yếu.","distractors":["才"],"wrongVi":["Người Trung Quốc nghe mãi mới biết bạn là người nước ngoài.","Người nước ngoài vừa nghe là hiểu tiếng Trung.","Người Trung Quốc không biết bạn là người nước ngoài."],"wrongZh":["中国人就听一知道你是老外。","一中国人听就知道你是老外。","中国人一听知道就你是老外。"]},{"id":"g_36_5","lesson":36,"hsk":3,"zh":"你是在哪儿学的汉语？","py":"Nǐ shì zài nǎr xué de Hànyǔ?","vi":"Bạn học tiếng Hán ở đâu?","tokens":["你","是","在哪儿","学","的","汉语","？"],"grammarNote":"是……的 nhấn mạnh địa điểm; tân ngữ danh từ (汉语) thường đặt sau 的.","distractors":["了"],"wrongVi":["Bạn học tiếng Hán bao lâu rồi?","Bạn định học tiếng Hán ở đâu?","Ai dạy bạn tiếng Hán?"],"wrongZh":["你是学的在哪儿汉语？","你在哪儿是学汉语的的？","你是汉语在哪儿的学？"]},{"id":"g_37_1","lesson":37,"hsk":3,"zh":"我的护照你找到了没有？","py":"Wǒ de hùzhào nǐ zhǎodào le méiyǒu?","vi":"Hộ chiếu của tôi bạn tìm thấy chưa?","tokens":["我的护照","你","找到","了","没有","？"],"grammarNote":"Câu vị ngữ chủ vị: Chủ ngữ lớn (我的护照) + [Chủ ngữ nhỏ (你) + Động từ]; câu hỏi …了没有？","distractors":["吗"],"wrongVi":["Bạn có hộ chiếu không?","Hộ chiếu của bạn tôi tìm thấy rồi.","Bạn để hộ chiếu của tôi ở đâu?"],"wrongZh":["你找到了我的护照没有了？","我的护照找到你了没有？","我的护照你没有找到了？"]},{"id":"g_37_2","lesson":37,"hsk":3,"zh":"我的词典你放在哪儿了？","py":"Wǒ de cídiǎn nǐ fàng zài nǎr le?","vi":"Từ điển của tôi bạn để ở đâu rồi?","tokens":["我的词典","你","放","在","哪儿","了","？"],"grammarNote":"Bổ ngữ kết quả 在: Động từ + 在 + nơi chốn, biểu thị người/vật ở vị trí nào nhờ động tác.","distractors":["从"],"wrongVi":["Bạn mua từ điển của tôi ở đâu?","Từ điển của tôi bạn tìm thấy chưa?","Bạn có từ điển không?"],"wrongZh":["我的词典你在哪儿放了？","我的词典你放哪儿在了？","我的词典在你放哪儿了？"]},{"id":"g_37_3","lesson":37,"hsk":3,"zh":"你要的那本书我给你买着了。","py":"Nǐ yào de nà běn shū wǒ gěi nǐ mǎizháo le.","vi":"Cuốn sách bạn cần tôi đã mua được cho bạn rồi.","tokens":["你要的","那本书","我","给你","买着","了","。"],"grammarNote":"Bổ ngữ kết quả 着 (zháo): Động từ + 着, biểu thị mục đích của động tác đã đạt được.","distractors":["完"],"wrongVi":["Cuốn sách bạn cần tôi không mua được.","Bạn đã mua cuốn sách tôi cần.","Tôi muốn mua cuốn sách đó cho bạn."],"wrongZh":["你要的那本书我买着给你了。","那本书你要的我给你着买了。","我给你买着了你要的那本书了。"]},{"id":"g_37_4","lesson":37,"hsk":3,"zh":"我跟老板商量好了。","py":"Wǒ gēn lǎobǎn shāngliang hǎo le.","vi":"Tôi đã bàn bạc xong xuôi với ông chủ rồi.","tokens":["我","跟","老板","商量","好","了","。"],"grammarNote":"Bổ ngữ kết quả 好: Động từ + 好, động tác đã hoàn thành và đạt mức hoàn thiện, khiến người ta hài lòng.","distractors":["成"],"wrongVi":["Tôi đã cãi nhau với ông chủ.","Tôi muốn bàn bạc với ông chủ.","Ông chủ chưa bàn bạc với tôi."],"wrongZh":["我跟老板好商量了。","我商量好跟老板了。","我跟好老板商量了。"]},{"id":"g_37_5","lesson":37,"hsk":3,"zh":"这篇故事他翻译成了英语。","py":"Zhè piān gùshi tā fānyì chéng le Yīngyǔ.","vi":"Câu chuyện này anh ấy đã dịch sang tiếng Anh.","tokens":["这篇故事","他","翻译","成","了","英语","。"],"grammarNote":"Bổ ngữ kết quả 成: Động từ + 成, khiến sự vật thay đổi thành một dạng khác.","distractors":["在"],"wrongVi":["Câu chuyện này anh ấy viết bằng tiếng Anh.","Anh ấy đã đọc câu chuyện này bằng tiếng Anh.","Câu chuyện này anh ấy chưa dịch xong."],"wrongZh":["这篇故事他翻译了成英语。","这篇故事他成翻译了英语。","他这篇故事英语翻译成了。"]},{"id":"g_38_1","lesson":38,"hsk":3,"zh":"我的眼镜摔坏了。","py":"Wǒ de yǎnjìng shuāihuài le.","vi":"Kính của tôi rơi hỏng rồi.","tokens":["我的","眼镜","摔","坏","了","。"],"grammarNote":"Câu bị động ý nghĩa: Chủ ngữ tiếp nhận động tác (我的眼镜) + Động từ + Bổ ngữ kết quả (摔坏) + 了.","distractors":["把"],"wrongVi":["Tôi làm rơi mất kính rồi.","Kính của tôi bị bẩn rồi.","Tôi muốn mua một chiếc kính mới."],"wrongZh":["眼镜我的摔坏了。","我的眼镜坏摔了。","我的眼镜摔了坏。"]},{"id":"g_38_2","lesson":38,"hsk":3,"zh":"这些照片张张照得都很好。","py":"Zhèxiē zhàopiàn zhāngzhāng zhào de dōu hěn hǎo.","vi":"Những tấm ảnh này tấm nào cũng chụp rất đẹp.","tokens":["这些","照片","张张","照","得","都","很好","。"],"grammarNote":"Lặp lại lượng từ (张张) biểu thị “mỗi / tất cả”, thường đi với 都.","distractors":["个个"],"wrongVi":["Những tấm ảnh này không tấm nào đẹp cả.","Tôi muốn rửa thêm vài tấm ảnh nữa.","Những tấm ảnh này rửa chưa xong."],"wrongZh":["这些照片张照得都很好。","这些照片张张都照得很好得。","张张这些照片照很好得都。"]},{"id":"g_38_3","lesson":38,"hsk":3,"zh":"有汽车的人一年比一年多。","py":"Yǒu qìchē de rén yì nián bǐ yì nián duō.","vi":"Người có ô tô mỗi năm một nhiều hơn.","tokens":["有","汽车","的","人","一年","比","一年","多","。"],"grammarNote":"一年比一年 + Tính từ: diễn đạt mức độ tăng dần theo thời gian.","distractors":["更"],"wrongVi":["Người có ô tô năm nay ít hơn năm ngoái.","Năm nào tôi cũng mua một chiếc ô tô.","Người đi xe đạp ngày càng ít."],"wrongZh":["有汽车的人一年一年比多。","有汽车的人比一年一年多。","有汽车的人一年比多一年。"]},{"id":"g_38_4","lesson":38,"hsk":3,"zh":"今天早上，我差点儿迟到。","py":"Jīntiān zǎoshang, wǒ chàdiǎnr chídào.","vi":"Sáng nay tôi suýt nữa thì đến muộn.","tokens":["今天","早上","，","我","差点儿","迟到","。"],"grammarNote":"差点儿 + việc không tốt (迟到): suýt xảy ra nhưng thực tế không xảy ra, mang ý may mắn.","distractors":["已经"],"wrongVi":["Sáng nay tôi đến muộn mất rồi.","Sáng nay tôi đến sớm hơn mọi ngày.","Sáng mai tôi sẽ không đến muộn nữa."],"wrongZh":["今天早上，我迟到差点儿。","差点儿今天早上，我迟到。","今天早上，我差迟到点儿。"]},{"id":"g_38_5","lesson":38,"hsk":3,"zh":"听说北京的冬天冷得很。","py":"Tīngshuō Běijīng de dōngtiān lěng de hěn.","vi":"Nghe nói mùa đông ở Bắc Kinh lạnh lắm.","tokens":["听说","北京","的","冬天","冷","得","很","。"],"grammarNote":"Tính từ + 得很: 很 làm bổ ngữ sau 得, biểu thị mức độ cực kỳ cao.","distractors":["非常"],"wrongVi":["Nghe nói mùa đông ở Bắc Kinh không lạnh lắm.","Nghe nói mùa hè ở Bắc Kinh nóng lắm.","Mùa đông năm nay Bắc Kinh lạnh hơn năm ngoái."],"wrongZh":["听说北京的冬天很得冷。","听说北京的冬天得很冷。","听说北京的冬天冷很得。"]},{"id":"g_39_1","lesson":39,"hsk":3,"zh":"我买回来一本书。","py":"Wǒ mǎi huílai yì běn shū.","vi":"Tôi mua về một cuốn sách.","tokens":["我","买","回来","一","本","书","。"],"grammarNote":"Bổ ngữ xu hướng kép 回来 đứng sau động từ 买; tân ngữ chỉ sự vật (一本书) có thể đứng sau 来.","distractors":["进去"],"wrongVi":["Tôi mang trả lại một cuốn sách.","Tôi muốn mua một cuốn sách.","Tôi mượn một cuốn sách ở thư viện."],"wrongZh":["我回来买一本书。","我买一本回来书。","我书买回来一本。"]},{"id":"g_39_2","lesson":39,"hsk":3,"zh":"我看见他走进图书馆去了。","py":"Wǒ kànjiàn tā zǒujìn túshūguǎn qu le.","vi":"Tôi nhìn thấy anh ấy đi vào thư viện rồi.","tokens":["我","看见","他","走进","图书馆","去","了","。"],"grammarNote":"Tân ngữ chỉ địa điểm (图书馆) bắt buộc đứng giữa 进 và 去; 了 đặt cuối câu.","distractors":["把"],"wrongVi":["Tôi nhìn thấy anh ấy từ thư viện đi ra.","Tôi muốn cùng anh ấy đến thư viện.","Anh ấy nhìn thấy tôi ở thư viện."],"wrongZh":["我看见他走进去图书馆了。","我看见他图书馆走进去了。","我看见他走图书馆进去了。"]},{"id":"g_39_3","lesson":39,"hsk":3,"zh":"他们都爬上山去了。","py":"Tāmen dōu pá shàng shān qu le.","vi":"Bọn họ đều đã leo lên núi rồi.","tokens":["他们","都","爬","上","山","去","了","。"],"grammarNote":"Có tân ngữ chỉ nơi chốn (山) → tân ngữ đứng trước 去, trợ từ 了 bắt buộc ở cuối câu.","distractors":["来"],"wrongVi":["Bọn họ đều đã xuống núi rồi.","Bọn họ đều muốn leo núi.","Bọn họ đều chưa leo lên núi."],"wrongZh":["他们都爬上去山了。","他们都爬了上山去。","他们都山爬上去了。"]},{"id":"g_39_4","lesson":39,"hsk":3,"zh":"我给你买回来了一件羽绒服。","py":"Wǒ gěi nǐ mǎi huílai le yí jiàn yǔróngfú.","vi":"Tôi đã mua về cho bạn một chiếc áo lông vũ.","tokens":["我","给","你","买","回来","了","一","件","羽绒服","。"],"grammarNote":"Tân ngữ chỉ sự vật → 了 đặt sau bổ ngữ xu hướng kép (回来), trước tân ngữ (一件羽绒服).","distractors":["条"],"wrongVi":["Bạn đã mua về cho tôi một chiếc áo lông vũ.","Tôi muốn mua cho bạn một chiếc áo lông vũ.","Tôi đã gửi về cho bạn một chiếc áo khoác."],"wrongZh":["我给你回来买了一件羽绒服。","我给你买了回来了一件羽绒服。","我给你一件羽绒服买了回来。"]},{"id":"g_39_5","lesson":39,"hsk":3,"zh":"我们买的书和光盘正好都能放进去。","py":"Wǒmen mǎi de shū hé guāngpán zhènghǎo dōu néng fàng jìnqu.","vi":"Sách và đĩa chúng tôi mua vừa khít bỏ vào được hết.","tokens":["我们","买","的","书","和","光盘","正好","都","能","放","进去","。"],"grammarNote":"Bổ ngữ xu hướng kép 进去 đứng sau động từ 放, câu không có tân ngữ.","distractors":["出来"],"wrongVi":["Sách và đĩa chúng tôi mua không bỏ vào được.","Chúng tôi vừa mua rất nhiều sách và đĩa.","Sách và đĩa chúng tôi mua đều đã lấy ra hết."],"wrongZh":["我们买的书和光盘正好都能进去放。","我们买的书和光盘都正好放能进去。","我们买的书和光盘正好都能放去进。"]},{"id":"g_40_1","lesson":40,"hsk":3,"zh":"墙上贴着红双喜字。","py":"Qiáng shang tiēzhe hóng shuāngxǐ zì.","vi":"Trên tường dán chữ song hỷ đỏ.","tokens":["墙上","贴","着","红","双喜字","。"],"grammarNote":"Nơi chốn + Động từ + 着 + Sự vật: biểu thị trạng thái tồn tại sau khi động tác (贴) đã xảy ra.","distractors":["过"],"wrongVi":["Trên tường treo một tấm bản đồ.","Anh ấy đang dán chữ song hỷ lên tường.","Trên cửa dán một tờ thông báo."],"wrongZh":["墙上着贴红双喜字。","贴着墙上红双喜字。","墙上贴红双喜字着。"]},{"id":"g_40_2","lesson":40,"hsk":3,"zh":"她穿着一件红西服。","py":"Tā chuānzhe yí jiàn hóng xīfú.","vi":"Cô ấy mặc một chiếc áo vest đỏ.","tokens":["她","穿","着","一","件","红","西服","。"],"grammarNote":"Động từ + 着: trạng thái 穿 (mặc) được duy trì sau khi động tác xảy ra.","distractors":["条"],"wrongVi":["Cô ấy mặc một chiếc váy đen.","Cô ấy muốn mua một chiếc áo vest đỏ.","Cô ấy đeo một cặp kính."],"wrongZh":["她着穿一件红西服。","她穿一件着红西服。","她穿着红一件西服。"]},{"id":"g_40_3","lesson":40,"hsk":3,"zh":"那里离这儿不远，我们走着去吧。","py":"Nàli lí zhèr bù yuǎn, wǒmen zǒuzhe qù ba.","vi":"Chỗ đó cách đây không xa, chúng ta đi bộ đến đó đi.","tokens":["那里","离","这儿","不远","，","我们","走","着","去","吧","。"],"grammarNote":"Động từ 1 + 着 + Động từ 2: 走着 chỉ phương thức tiến hành của hành động 去.","distractors":["了"],"wrongVi":["Chỗ đó cách đây rất xa, chúng ta đi xe đi.","Chúng ta đi đến đó bằng xe đạp đi.","Chỗ đó gần đây, chúng ta đừng đi nữa."],"wrongZh":["那里离这儿不远，我们去着走吧。","那里离这儿不远，我们着走去吧。","那里这儿离不远，我们走着去吧着。"]},{"id":"g_40_4","lesson":40,"hsk":3,"zh":"里边正上着课呢。","py":"Lǐbian zhèng shàngzhe kè ne.","vi":"Bên trong đang có tiết học đấy.","tokens":["里边","正","上","着","课","呢","。"],"grammarNote":"正 + Động từ + 着 + Tân ngữ + 呢: nhấn mạnh động tác đang diễn ra và kéo dài.","distractors":["过"],"wrongVi":["Bên trong vừa tan học rồi.","Bên trong không có ai cả.","Bên trong đang họp đấy."],"wrongZh":["里边正着上课呢。","里边上着正课呢。","里边正上课着呢。"]},{"id":"g_40_5","lesson":40,"hsk":3,"zh":"教室的门没开着。","py":"Jiàoshì de mén méi kāizhe.","vi":"Cửa phòng học không mở.","tokens":["教室","的","门","没","开","着","。"],"grammarNote":"Phủ định của Động từ + 着: 没（有）+ Động từ + 着 (ít dùng trong giao tiếp).","distractors":["不"],"wrongVi":["Cửa phòng học đang mở.","Cửa phòng hội nghị đang mở.","Cửa phòng học bị hỏng rồi."],"wrongZh":["教室的门不开着。","教室的门开着没。","教室的门没着开。"]}]);
/**
 * Fast Reflex Chinese Word Matching Game
 */
const MatchGame = {
  allWords: [],
  cards: [],
  selectedCard: null,
  matchedCount: 0,
  timerInterval: null,
  secondsElapsed: 0,

  init(allWords) {
    this.allWords = allWords || [];
  },

  startGame(scope = 'hsk1', pairCount = 8) {
    let pool = [...this.allWords];
    if (/^hsk\d$/.test(scope)) pool = pool.filter(w => w.hsk === +scope.slice(3));

    if (pool.length < pairCount) pool = this.allWords;

    const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, pairCount);
    
    // Create card pairs (Hanzi card + Meaning/Pinyin card)
    this.cards = [];
    selected.forEach(word => {
      this.cards.push({
        id: 'h_' + word.id,
        wordId: word.id,
        type: 'hanzi',
        text: word.hanzi,
        word
      });
      this.cards.push({
        id: 'm_' + word.id,
        wordId: word.id,
        type: 'meaning',
        text: word.meaning.split(/[,;]/)[0], // short meaning
        word
      });
    });

    // Shuffle cards
    this.cards.sort(() => 0.5 - Math.random());
    this.selectedCard = null;
    this.matchedCount = 0;
    this.secondsElapsed = 0;

    // Reset & start timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    const timerEl = document.getElementById('match-timer');
    if (timerEl) timerEl.innerText = '0s';
    this.timerInterval = setInterval(() => {
      this.secondsElapsed++;
      if (timerEl) timerEl.innerText = `${this.secondsElapsed}s`;
    }, 1000);

    this.render();
  },

  handleCardClick(card, element) {
    if (element.classList.contains('matched') || element.classList.contains('selected')) return;

    if (!this.selectedCard) {
      // First card chosen
      this.selectedCard = { card, element };
      element.classList.add('selected');
      AudioEngine.playClickSound();
    } else {
      // Second card chosen
      if (this.selectedCard.card.id === card.id) return;

      const first = this.selectedCard;
      element.classList.add('selected');

      // Check match
      if (first.card.wordId === card.wordId && first.card.type !== card.type) {
        // MATCH! Speak synchronously in user gesture handler for mobile browser compatibility
        if (first.card.word && first.card.word.hanzi && typeof AudioEngine !== 'undefined' && AudioEngine.speak) {
          AudioEngine.speak(first.card.word.hanzi);
        }
        setTimeout(() => {
          first.element.classList.remove('selected');
          element.classList.remove('selected');
          first.element.classList.add('matched');
          element.classList.add('matched');
          AudioEngine.playCorrectSound();
          this.matchedCount++;

          if (this.matchedCount === this.cards.length / 2) {
            clearInterval(this.timerInterval);
            AudioEngine.playVictorySound();
            if (typeof StorageManager !== 'undefined' && StorageManager.addXP) {
              StorageManager.addXP(15, 'Hoàn thành ghép từ');
              StorageManager.recordDailyAction('vocab', 2);
            }
            if (typeof App !== 'undefined' && App.toast) {
              App.toast(`🎉 Chúc mừng! Bạn đã ghép đúng tất cả trong ${this.secondsElapsed} giây!`, 'success', 5000);
            } else {
              UI.alert('Hoàn thành!', `Bạn đã ghép xong trong ${this.secondsElapsed} giây.`);
            }
          }
        }, 150);
      } else {
        // WRONG MATCH
        setTimeout(() => {
          first.element.classList.remove('selected');
          element.classList.remove('selected');
          AudioEngine.playWrongSound();
        }, 350);
      }
      this.selectedCard = null;
    }
  },

  render() {
    const grid = document.getElementById('match-game-grid');
    if (!grid) return;
    grid.innerHTML = '';

    this.cards.forEach(c => {
      const cardEl = document.createElement('div');
      cardEl.className = 'match-card';
      if (c.type === 'hanzi') {
        cardEl.innerHTML = `<span class="hanzi" style="font-size:1.75rem;">${c.text}</span>`;
      } else {
        cardEl.innerHTML = `<span style="font-size:0.9rem; line-height:1.2;">${c.text}</span>`;
      }
      cardEl.onclick = () => this.handleCardClick(c, cardEl);
      grid.appendChild(cardEl);
    });
  }
};

if (typeof window !== 'undefined') {
  window.MatchGame = MatchGame;
}
/**
 * Lesson Browser & Detail Viewer (all HSK levels in CHINESE_DATA.lessons)
 */
const LessonBrowser = {
  lessons: [],
  currentLesson: null,
  activeFilter: 'all', // 'all', 'hsk1', 'hsk2'

  init(lessons) {
    this.lessons = lessons || [];
    this.renderLessonList();
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.renderLessonList();
  },

  renderLessonList() {
    const container = document.getElementById('lesson-grid-container');
    if (!container) return;

    document.querySelectorAll('.seg-btn[data-filter]').forEach((b) => b.classList.toggle('active', b.dataset.filter === this.activeFilter));

    let filtered = this.lessons;
    const lvl = /^hsk(\d)$/.exec(this.activeFilter);
    if (lvl) filtered = filtered.filter(l => l.hsk === +lvl[1]);

    const user = StorageManager.getCurrentUser();
    const current = (user && user.lastActiveLesson) || 1;
    container.innerHTML = filtered.map(l => {
      const isCompleted = StorageManager.isLessonCompleted(l.id);
      const step = StorageManager.getLessonStep ? StorageManager.getLessonStep(l.id) : 0;
      const isCurrent = !isCompleted && l.id === current;
      const status = isCompleted
        ? `<span class="lc-status done">${Icon.svg('check')}Đã xong</span>`
        : (step > 0 ? `<span class="lc-status doing">Bước ${step + 1}/4</span>` : `<span class="lc-status">${l.words ? l.words.length : 0} từ</span>`);
      return `
        <button class="lesson-card ${isCompleted ? 'lesson-card-completed' : ''} ${isCurrent ? 'lesson-card-current' : ''}" onclick="LessonBrowser.openLesson(${l.id})">
          <span class="lc-num">${l.id}</span>
          <span class="lc-body">
            <span class="lesson-card-zh hanzi">${l.zh_title}</span>
            <span class="lesson-card-vi">${UI.esc(l.title)}</span>
            <span class="lc-meter"><i style="width:${isCompleted ? 100 : step * 25}%"></i></span>
          </span>
          <span class="lc-side"><span class="lc-hsk">HSK ${l.hsk}</span>${status}</span>
        </button>
      `;
    }).join('');
  },

  openLesson(lessonId, pushHistory = true) {
    if (!this.lessons || !this.lessons.length) {
      this.lessons = (window.CHINESE_DATA && window.CHINESE_DATA.lessons) ? window.CHINESE_DATA.lessons : [];
    }
    const lesson = this.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    this.currentLesson = lesson;

    this.stopDialogueAutoPlay();
    StorageManager.setLastActiveLesson(lessonId);

    if (pushHistory && window.location.hash !== '#lesson-' + lessonId) {
      history.pushState({ type: 'lesson', lessonId }, '', '#lesson-' + lessonId);
    }

    document.getElementById('lesson-list-view').style.display = 'none';
    const detailView = document.getElementById('lesson-detail-view');
    detailView.style.display = 'block';

    // Always reset in-lesson practice view back to main lesson content
    const mainWrap = document.getElementById('lesson-main-wrapper');
    const practiceWrap = document.getElementById('lesson-practice-wrapper');
    if (mainWrap) mainWrap.style.display = 'block';
    if (practiceWrap) {
      practiceWrap.style.display = 'none';
      practiceWrap.innerHTML = '';
    }

    document.getElementById('lesson-detail-title').innerText = `Bài ${lesson.id}: ${lesson.zh_title}`;
    document.getElementById('lesson-detail-subtitle').innerText = `${lesson.pinyin_title || ''} • ${lesson.title}`;

    this.updateCompleteButton();
    this.updateNavigationButtons();
    this.renderVocabTab();
    this.renderDialogueTab();
    this.renderGrammarTab();
    const saved = StorageManager.getLessonStep ? StorageManager.getLessonStep(lessonId) : 0;
    const done = StorageManager.isLessonCompleted(lessonId);
    this.switchLessonTab(done ? 'vocab' : this.STEPS[Math.min(saved, 3)]);
    window.scrollTo({ top: 0, behavior: 'auto' });
  },

  closeLesson(triggerHistoryBack = true) {
    this.stopDialogueAutoPlay();
    if (triggerHistoryBack && window.location.hash.startsWith('#lesson-')) {
      history.back();
      return;
    }
    document.getElementById('lesson-detail-view').style.display = 'none';
    document.getElementById('lesson-list-view').style.display = 'block';
    this.renderLessonList();
    App.updateDashboardStats();
  },

  prevLesson() {
    if (this.currentLesson && this.currentLesson.id > 1) {
      this.openLesson(this.currentLesson.id - 1);
    }
  },

  /** Highest lesson id in the curriculum (30 for HSK 1–2, grows as levels are added). */
  lastLessonId() {
    return this.lessons.length ? Math.max(...this.lessons.map(l => l.id)) : 30;
  },

  nextLesson() {
    if (this.currentLesson && this.currentLesson.id < this.lastLessonId()) {
      this.openLesson(this.currentLesson.id + 1);
    }
  },

  updateNavigationButtons() {
    if (!this.currentLesson) return;
    const prevBtn = document.getElementById('btn-lesson-prev');
    const nextBtn = document.getElementById('btn-lesson-next');
    if (prevBtn) {
      prevBtn.style.visibility = this.currentLesson.id > 1 ? 'visible' : 'hidden';
      prevBtn.innerHTML = `⬅️ Bài ${this.currentLesson.id - 1}`;
    }
    if (nextBtn) {
      nextBtn.style.visibility = this.currentLesson.id < this.lastLessonId() ? 'visible' : 'hidden';
      nextBtn.innerHTML = `Bài ${this.currentLesson.id + 1} ➡️`;
    }
  },

  updateCompleteButton() {
    if (!this.currentLesson) return;
    const isCompleted = StorageManager.isLessonCompleted(this.currentLesson.id);
    const topBtn = document.getElementById('btn-toggle-complete-lesson');
    const bottomBtn = document.getElementById('btn-lesson-complete-bottom');
    const label = isCompleted ? '✅ Đã học xong' : '⬜ Đánh dấu đã học xong';
    const cls = isCompleted ? 'btn btn-sm btn-lesson-done' : 'btn btn-outline btn-sm';
    
    if (topBtn) {
      topBtn.innerHTML = label;
      topBtn.className = cls;
    }
    if (bottomBtn) {
      bottomBtn.innerHTML = label;
      bottomBtn.className = cls;
    }
  },

  toggleCurrentLessonCompleted() {
    if (!this.currentLesson) return;
    const isDone = StorageManager.toggleLessonCompleted(this.currentLesson.id);
    if (isDone) {
      AudioEngine.playVictorySound();
    } else {
      AudioEngine.playClickSound();
    }
    this.updateCompleteButton();
    App.updateDashboardStats();
  },

  STEPS: ['vocab', 'dialogue', 'grammar', 'practice'],
  STEP_LABELS: { vocab: 'Từ vựng', dialogue: 'Bài khóa', grammar: 'Ngữ pháp', practice: 'Luyện tập' },
  currentStep: 'vocab',

  switchLessonTab(tab) {
    if (!this.STEPS.includes(tab)) tab = 'vocab';
    this.currentStep = tab;
    const idx = this.STEPS.indexOf(tab);
    const lessonId = this.currentLesson ? this.currentLesson.id : null;
    const done = lessonId ? StorageManager.isLessonCompleted(lessonId) : false;
    const reached = lessonId && StorageManager.getLessonStep ? StorageManager.getLessonStep(lessonId) : 0;

    this.STEPS.forEach((name, i) => {
      const btn = document.getElementById(`lesson-tab-btn-${name}`);
      if (btn) {
        btn.classList.toggle('active', name === tab);
        btn.classList.toggle('done', done || i < Math.max(idx, reached));
        if (btn.setAttribute) btn.setAttribute('aria-selected', name === tab ? 'true' : 'false');
      }
      const view = document.getElementById(`lesson-subview-${name}`);
      if (view) view.style.display = name === tab ? 'block' : 'none';
    });

    const count = document.getElementById('lesson-step-count');
    if (count) count.innerText = `${idx + 1}/4`;

    const prev = document.getElementById('btn-step-prev');
    if (prev) prev.style.visibility = idx === 0 ? 'hidden' : 'visible';
    const next = document.getElementById('btn-step-next');
    if (next) {
      const isLast = idx === this.STEPS.length - 1;
      const label = isLast
        ? (done ? (lessonId < this.lastLessonId() ? `Sang Bài ${lessonId + 1}` : 'Về lộ trình') : 'Hoàn thành bài')
        : `Tiếp: ${this.STEP_LABELS[this.STEPS[idx + 1]]}`;
      next.innerHTML = `<span>${label}</span>${typeof Icon !== 'undefined' ? Icon.svg(isLast && !done ? 'check' : 'arrowRight') : ''}`;
    }

    if (lessonId && StorageManager.setLessonStep) StorageManager.setLessonStep(lessonId, idx);
    if (typeof App !== 'undefined' && App.syncPrefControls) App.syncPrefControls();

    if (tab === 'grammar') {
      this.renderGrammarTab();
    } else if (tab === 'practice') {
      this.renderPracticeTab();
    } else if (tab !== 'dialogue') {
      this.stopDialogueAutoPlay();
    }
  },

  prevStep() {
    const idx = this.STEPS.indexOf(this.currentStep);
    if (idx > 0) {
      this.switchLessonTab(this.STEPS[idx - 1]);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  },

  async nextStep() {
    const idx = this.STEPS.indexOf(this.currentStep);
    if (idx < this.STEPS.length - 1) {
      this.switchLessonTab(this.STEPS[idx + 1]);
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (!this.currentLesson) return;
    const id = this.currentLesson.id;
    if (!StorageManager.isLessonCompleted(id)) {
      this.completeCurrentLesson();
      return;
    }
    if (id < this.lastLessonId()) this.openLesson(id + 1);
    else this.closeLesson();
  },

  /** Marks the lesson complete, celebrates and (for guests) offers to save progress. */
  completeCurrentLesson() {
    if (!this.currentLesson) return;
    const id = this.currentLesson.id;
    const newly = StorageManager.markLessonCompleted ? StorageManager.markLessonCompleted(id) : false;
    if (newly && typeof AudioEngine !== 'undefined') AudioEngine.playVictorySound();
    if (id < this.lastLessonId()) StorageManager.setLastActiveLesson(id + 1);
    this.switchLessonTab('practice');
    if (typeof App !== 'undefined' && App.updateDashboardStats) App.updateDashboardStats();
    const user = StorageManager.getCurrentUser();
    if (newly && StorageManager.isGuest && StorageManager.isGuest(user) && typeof UI !== 'undefined') {
      UI.confirm({
        title: `Hoàn thành Bài ${id}!`,
        body: 'Tiến độ đang lưu trên máy này. Tạo tài khoản miễn phí để không bị mất và học tiếp trên thiết bị khác.',
        ok: 'Tạo tài khoản',
        cancel: 'Để sau'
      }).then((yes) => { if (yes) App.showAuthModal('register'); });
    } else if (newly && typeof App !== 'undefined') {
      App.toast(`Hoàn thành Bài ${id}`, 'success');
    }
  },

  renderVocabTab() {
    const container = document.getElementById('lesson-vocab-container');
    if (!container || !this.currentLesson) return;
    const arg = (v) => (typeof jsArg === 'function' ? jsArg(v) : v);
    const esc = (v) => (typeof escapeHtml === 'function' ? escapeHtml(v) : v);
    const py = (v) => (typeof Tone !== 'undefined' ? Tone.html(v) : esc(v));
    const ico = (n) => (typeof Icon !== 'undefined' ? Icon.svg(n) : '');

    container.innerHTML = `
      <p class="step-intro">Nghe từng từ, chú ý thanh điệu. Bấm ${ico('star')} để lưu từ khó vào Sổ tay.</p>
      <div class="vocab-cards-list">
        ${this.currentLesson.words.map(w => {
          const isFav = StorageManager.isBookmarked(w.id);
          return `
            <div class="vocab-item-card">
              <button class="vocab-play" onclick="AudioEngine.speak('${arg(w.hanzi)}')" aria-label="Nghe ${esc(w.hanzi)}">${ico('sound')}</button>
              <div class="vocab-item-info">
                <div class="vocab-line">
                  <span class="vocab-item-hanzi hanzi">${w.hanzi}</span>
                  <span class="vocab-item-py py">${py(w.pinyin)}</span>
                </div>
                <div class="vocab-item-mean">${esc(w.meaning)}</div>
                <div class="vocab-item-meta">
                  ${w.hanviet ? `<span class="hv-badge">${esc(w.hanviet)}</span>` : ''}
                  ${w.pos ? `<span class="pos-badge">${esc(w.pos)}</span>` : ''}
                </div>
                ${w.example ? `<div class="vocab-example">${esc(w.example)}</div>` : ''}
                ${typeof Notes !== 'undefined' ? Notes.wordBlock(w.id) : ''}
              </div>
              <div class="vocab-actions">
                <button class="icon-btn" onclick="AudioEngine.recognizeSpeech('${arg(w.hanzi)}')" aria-label="Luyện phát âm ${esc(w.hanzi)}" title="Luyện phát âm">${ico('mic')}</button>
                <button class="icon-btn" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${arg(w.hanzi)}');" aria-label="Tập viết ${esc(w.hanzi)}" title="Tập viết">${ico('pen')}</button>
                <button class="icon-btn ${isFav ? 'on' : ''}" onclick="LessonBrowser.toggleBookmark('${w.id}', this)" aria-label="Lưu ${esc(w.hanzi)} vào Sổ tay" aria-pressed="${isFav}" title="Lưu vào Sổ tay">${ico(isFav ? 'starFill' : 'star')}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${typeof Notes !== 'undefined' ? Notes.lessonSection(this.currentLesson.id, ['tu_mo_rong'], 'Từ mở rộng từ bài giảng', 'Các từ thầy cô giới thiệu thêm trong bài, ngoài danh sách từ mới.') : ''}
    `;
  },

  toggleDialogueAutoPlay() {
    if (this.isDialoguePlaying) {
      this.stopDialogueAutoPlay();
    } else {
      this.startDialogueAutoPlay();
    }
  },

  startDialogueAutoPlay() {
    if (!this.currentLesson || !this.currentLesson.dialogue || !this.currentLesson.dialogue.length) return;
    this.isDialoguePlaying = true;
    this.dialogueIndex = 0;
    const btn = document.getElementById('btn-dialogue-autoplay');
    if (btn) {
      btn.innerHTML = `${typeof Icon !== 'undefined' ? Icon.svg('pause') : ''}<span>Tạm dừng</span>`;
      btn.className = 'btn btn-secondary btn-sm';
    }
    this.playCurrentDialogueSentence();
  },

  stopDialogueAutoPlay() {
    this.isDialoguePlaying = false;
    if (this.dialogueTimeout) clearTimeout(this.dialogueTimeout);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    document.querySelectorAll('.dialogue-bubble').forEach(el => el.classList.remove('active-reading'));
    const btn = document.getElementById('btn-dialogue-autoplay');
    if (btn) {
      btn.innerHTML = `${typeof Icon !== 'undefined' ? Icon.svg('play') : ''}<span>Nghe cả bài</span>`;
      btn.className = 'btn btn-primary btn-sm';
    }
  },

  playCurrentDialogueSentence() {
    if (!this.isDialoguePlaying || !this.currentLesson || !this.currentLesson.dialogue) return;
    if (this.dialogueIndex >= this.currentLesson.dialogue.length) {
      this.stopDialogueAutoPlay();
      if (typeof App !== 'undefined' && App.toast) {
        App.toast('🎉 Đã phát xong toàn bộ bài khóa!', 'success', 3000);
      }
      return;
    }

    const d = this.currentLesson.dialogue[this.dialogueIndex];
    document.querySelectorAll('.dialogue-bubble').forEach((el, idx) => {
      const isActive = idx === this.dialogueIndex;
      el.classList.toggle('active-reading', isActive);
      if (isActive) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    AudioEngine.speak(d.zh, () => {
      if (!this.isDialoguePlaying) return;
      this.dialogueTimeout = setTimeout(() => {
        this.dialogueIndex++;
        this.playCurrentDialogueSentence();
      }, 750);
    });
  },

  renderDialogueTab() {
    const container = document.getElementById('lesson-dialogue-content');
    if (!container || !this.currentLesson) return;

    if (!this.currentLesson.dialogue || !this.currentLesson.dialogue.length) {
      container.innerHTML = '<p style="color:var(--text-muted); padding:1rem; font-size:0.85rem;">Chưa có dữ liệu bài khóa cho bài học này.</p>';
      return;
    }

    const ico = (n) => (typeof Icon !== 'undefined' ? Icon.svg(n) : '');
    const toolbar = `
      <div class="dialogue-toolbar">
        <span class="step-intro">Nghe cả bài, rồi bấm vào từng câu để luyện đọc theo.</span>
        <button id="btn-dialogue-autoplay" class="btn btn-primary btn-sm" onclick="LessonBrowser.toggleDialogueAutoPlay()">
          ${ico('play')}<span>Nghe cả bài</span>
        </button>
      </div>
    `;

    let lastSection = null;
    const dialogueBubbles = this.currentLesson.dialogue.map((d, idx) => {
      let sectionHeaderHtml = '';
      if (d.section && d.section !== lastSection) {
        lastSection = d.section;
        sectionHeaderHtml = `
          <div class="dialogue-section-header" style="margin:0.85rem 0 0.5rem; padding:0.5rem 0.85rem; border-radius:var(--radius-md); background:var(--bg-subtle); border-left:4px solid var(--secondary); font-weight:800; font-size:0.88rem; color:var(--secondary);">
            ${typeof escapeHtml === 'function' ? escapeHtml(d.section) : d.section}
          </div>
        `;
      }
      return `${sectionHeaderHtml}
      <div class="dialogue-bubble" style="padding:0.85rem 1rem; border-radius:var(--radius-md); background:var(--bg-card); border:1px solid var(--border); margin-bottom:0.6rem; display:flex; align-items:flex-start; justify-content:space-between; gap:0.75rem; transition:all 0.25s ease;">
        <div style="min-width:0; flex:1; word-break:break-word;">
          <div style="font-weight:700; color:var(--secondary); font-size:0.8rem; margin-bottom:0.15rem;">${d.speaker || `Nhân vật ${idx + 1}`}:</div>
          <div class="hanzi" style="font-size:1.15rem; color:var(--text-main); font-weight:600; margin-bottom:0.15rem;">${d.zh}</div>
          <div class="py dialogue-py">${typeof Tone !== 'undefined' ? Tone.html(d.py) : d.py}</div>
          <div style="color:var(--text-muted); font-size:0.82rem;">${d.vi}</div>
        </div>
        <div style="display:flex; gap:0.3rem; flex-shrink:0;">
          <button class="icon-btn" onclick="AudioEngine.recognizeSpeech('${typeof jsArg === 'function' ? jsArg(d.zh) : d.zh}')" aria-label="Luyện đọc câu này" title="Luyện đọc câu này">${ico('mic')}</button>
          <button class="icon-btn icon-btn-primary" onclick="AudioEngine.speak('${typeof jsArg === 'function' ? jsArg(d.zh) : d.zh}')" aria-label="Nghe câu này" title="Nghe câu">${ico('sound')}</button>
        </div>
      </div>
    `;
    }).join('');

    container.innerHTML = toolbar + dialogueBubbles;
  },

  renderGrammarTab() {
    const container = document.getElementById('lesson-grammar-content');
    if (!container || !this.currentLesson) return;

    const grammarPoints = this.currentLesson.grammar || [];

    let theoryHtml = '';
    if (grammarPoints.length > 0) {
      theoryHtml = grammarPoints.map((g, idx) => {
        const colonIdx = g.indexOf(':');
        const title = colonIdx > -1 ? g.slice(0, colonIdx).trim() : g;
        const body = colonIdx > -1 ? g.slice(colonIdx + 1).trim() : '';
        return `
        <div class="grammar-point">
          <span class="gp-num">${idx + 1}</span>
          <div>
            <div class="gp-title">${typeof escapeHtml === 'function' ? escapeHtml(title) : title}</div>
            ${body ? `<div class="gp-body">${typeof escapeHtml === 'function' ? escapeHtml(body) : body}</div>` : ''}
          </div>
        </div>
      `;
      }).join('');
    } else {
      theoryHtml = '<p style="color:var(--text-muted); padding:0.5rem 0; font-size:0.85rem;">Bài này tập trung vào củng cố từ vựng và hội thoại.</p>';
    }

    container.innerHTML = `
      <p class="step-intro">Đọc kỹ từng điểm ngữ pháp. Bước tiếp theo sẽ luyện ngay các mẫu câu này.</p>
      <div class="grammar-points">${theoryHtml}</div>
      ${typeof Notes !== 'undefined' ? Notes.lessonSection(this.currentLesson.id, ['ngu_phap', 'cach_dung', 'cau_vi_du'], 'Giảng thêm từ bài giảng', 'Cách dùng, phân biệt và lưu ý ngữ pháp trích từ slide bài giảng.') : ''}
      ${typeof Notes !== 'undefined' ? Notes.lessonSection(this.currentLesson.id, ['ngu_am', 'van_hoa', 'khac', 'chiet_tu'], 'Phát âm, văn hóa và ghi chú khác') : ''}
    `;
  },

  toggleBookmark(wordId, btn) {
    const isNow = StorageManager.toggleBookmark(wordId);
    if (btn) {
      btn.innerHTML = typeof Icon !== 'undefined' ? Icon.svg(isNow ? 'starFill' : 'star') : (isNow ? '★' : '☆');
      btn.classList.toggle('on', isNow);
      if (btn.setAttribute) btn.setAttribute('aria-pressed', isNow ? 'true' : 'false');
    }
    if (typeof App !== 'undefined') App.toast(isNow ? 'Đã lưu vào Sổ tay' : 'Đã bỏ khỏi Sổ tay', 'info', 1600);
  },

  studyCurrentLessonFlashcards() {
    this.startLessonPractice('flashcard');
  },

  quizCurrentLesson() {
    this.startLessonPractice('quiz');
  },

  grammarPracticeMode(mode = 'reorder') {
    this.startLessonPractice('grammar', mode);
  },

  grammarPracticeCurrentLesson() {
    this.startLessonPractice('grammar', 'reorder');
  },

  startLessonPractice(type = 'grammar', mode = 'reorder') {
    if (!this.currentLesson) return;
    this.stopDialogueAutoPlay();
    this.practiceType = type;
    this.practiceMode = mode;
    this.practiceIndex = 0;
    this.practiceScore = 0;
    this.practiceIsAnswered = false;

    // Build question pool strictly for this lesson
    if (type === 'grammar') {
      const allGrammar = (typeof GRAMMAR_DATA !== 'undefined' ? GRAMMAR_DATA : (window.GRAMMAR_DATA || []));
      let pool = allGrammar.filter(s => s.lesson === this.currentLesson.id);
      if (!pool.length) {
        pool = allGrammar.filter(s => s.hsk === this.currentLesson.hsk);
      }
      this.practiceQuestions = pool.map(s => {
        let choices = [];
        if (mode === 'vi_to_zh') {
          choices = [s.zh, ...(s.wrongZh || []).slice(0, 3)].filter(Boolean).sort(() => 0.5 - Math.random());
        } else if (mode === 'zh_to_vi') {
          choices = [s.vi, ...(s.wrongVi || []).slice(0, 3)].filter(Boolean).sort(() => 0.5 - Math.random());
        }
        return { ...s, choices };
      });
    } else if (type === 'quiz') {
      const words = this.currentLesson.words || [];
      const allWords = (window.CHINESE_DATA && window.CHINESE_DATA.all_words) ? window.CHINESE_DATA.all_words : words;
      this.practiceQuestions = words.map(w => {
        const otherWords = allWords.filter(other => other.id !== w.id && other.meaning !== w.meaning);
        const distractors = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, 3).map(o => o.meaning);
        const choices = [w.meaning, ...distractors].sort(() => 0.5 - Math.random());
        return {
          word: w,
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          correct: w.meaning,
          choices: choices
        };
      }).sort(() => 0.5 - Math.random());
    } else if (type === 'flashcard') {
      this.practiceQuestions = this.currentLesson.words || [];
      this.practiceFcIndex = 0;
      this.practiceFcIsFlipped = false;
    }

    const mainWrap = document.getElementById('lesson-main-wrapper');
    const practiceWrap = document.getElementById('lesson-practice-wrapper');
    if (mainWrap) mainWrap.style.display = 'none';
    if (practiceWrap) practiceWrap.style.display = 'block';

    this.renderCurrentPracticeStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  exitLessonPractice() {
    const mainWrap = document.getElementById('lesson-main-wrapper');
    const practiceWrap = document.getElementById('lesson-practice-wrapper');
    if (practiceWrap) {
      practiceWrap.style.display = 'none';
      practiceWrap.innerHTML = '';
    }
    if (mainWrap) mainWrap.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderPracticeTab() {
    const container = document.getElementById('lesson-practice-tab-content');
    if (!container || !this.currentLesson) return;
    const l = this.currentLesson;
    const wordCount = l.words ? l.words.length : 0;
    const done = StorageManager.isLessonCompleted(l.id);
    const ico = (n) => (typeof Icon !== 'undefined' ? Icon.svg(n) : '');
    const item = (onclick, icon, tone, title, desc, tag) => `
      <button class="practice-row" onclick="${onclick}">
        <span class="pt-icon ${tone}">${ico(icon)}</span>
        <span class="pr-text"><b>${title}</b><span>${desc}</span></span>
        <span class="pr-tag">${tag}</span>
      </button>`;

    container.innerHTML = `
      ${done ? `<div class="done-banner">${ico('trophy')}<div><b>Bạn đã hoàn thành Bài ${l.id}</b><span>Luyện lại bất cứ lúc nào. Từ của bài đã vào hàng đợi ôn tập.</span></div></div>`
             : `<p class="step-intro">Làm ít nhất một bài luyện rồi bấm <b>Hoàn thành bài</b>. Mọi câu hỏi chỉ dùng từ và ngữ pháp của Bài ${l.id}.</p>`}
      <div class="practice-list">
        ${item("LessonBrowser.startLessonPractice('quiz')", 'quiz', 'pt-blue', 'Trắc nghiệm từ vựng', `Kiểm tra nghĩa của ${wordCount} từ mới`, `${wordCount} câu`)}
        ${item("LessonBrowser.startLessonPractice('grammar', 'reorder')", 'puzzle', 'pt-amber', 'Sắp xếp câu (连词成句)', 'Chạm các mảnh từ để ghép câu đúng ngữ pháp', 'Ngữ pháp')}
        ${item("LessonBrowser.startLessonPractice('grammar', 'vi_to_zh')", 'grammar', 'pt-red', 'Dịch Việt → Trung', 'Chọn câu chữ Hán đúng với câu tiếng Việt', 'Dịch')}
        ${item("LessonBrowser.startLessonPractice('grammar', 'zh_to_vi')", 'book', 'pt-navy', 'Dịch Trung → Việt', 'Đọc câu chữ Hán, chọn nghĩa đúng', 'Dịch')}
        ${item("LessonBrowser.startLessonPractice('flashcard')", 'cards', 'pt-jade', 'Flashcard bài này', 'Lật thẻ, nghe phát âm từng từ', `${wordCount} thẻ`)}
      </div>
    `;
  },

  renderCurrentPracticeStep() {
    const container = document.getElementById('lesson-practice-wrapper');
    if (!container || !this.currentLesson) return;

    if (this.practiceType === 'flashcard') {
      this.renderLessonFlashcard(container);
      return;
    }

    if (this.practiceIndex >= this.practiceQuestions.length) {
      this.renderPracticeSummary(container);
      return;
    }

    this.practiceIsAnswered = false;
    const q = this.practiceQuestions[this.practiceIndex];
    const total = this.practiceQuestions.length;
    const progressPct = Math.round((this.practiceIndex / total) * 100);

    let modeTitle = 'Bài tập ngữ pháp';
    if (this.practiceType === 'quiz') modeTitle = 'Trắc nghiệm từ vựng';
    else if (this.practiceMode === 'reorder') modeTitle = 'Sắp xếp ghép câu';
    else if (this.practiceMode === 'vi_to_zh') modeTitle = 'Dịch Việt ➔ Trung';
    else if (this.practiceMode === 'zh_to_vi') modeTitle = 'Dịch Trung ➔ Việt';

    let questionContentHtml = '';

    if (this.practiceType === 'grammar' && this.practiceMode === 'reorder') {
      this.practiceIsAnswered = false;
      this.practiceSelectedTokens = [];
      const allTokens = [...q.tokens];
      if (q.distractors && q.distractors.length) {
        allTokens.push(...q.distractors);
      }
      this.practiceAvailableTokens = allTokens.map((t, idx) => ({ id: idx, text: t })).sort(() => 0.5 - Math.random());

      questionContentHtml = `
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:1.25rem; margin-bottom:1rem; box-shadow:var(--shadow-sm);">
          <div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-bottom:0.4rem; display:flex; align-items:center; gap:0.35rem;">
            <span>🇻🇳 Dịch nghĩa tiếng Việt:</span>
          </div>
          <div style="font-size:1.15rem; font-weight:800; color:var(--text-main); line-height:1.4;">
            "${q.vi}"
          </div>
        </div>

        <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:0.4rem;">
          Khung ghép câu của bạn:
        </div>
        <div id="lesson-practice-answer-slot" class="grammar-slot-box" style="min-height:75px; padding:0.75rem; border-radius:var(--radius-md); border:2px dashed var(--border); display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center; margin-bottom:0.75rem; background:var(--bg-subtle);">
          <span style="color:var(--text-muted); font-size:0.82rem;">Chạm vào các từ bên dưới để ghép câu...</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">Các từ có sẵn (Chạm để chọn):</span>
          <button type="button" class="btn btn-outline btn-sm" onclick="LessonBrowser.clearPracticeTiles()" style="font-size:0.75rem; padding:0.25rem 0.6rem; cursor:pointer;" title="Làm lại câu này">
            🧹 Làm lại
          </button>
        </div>

        <div id="lesson-practice-pool" class="grammar-pool-box" style="min-height:60px; padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--border); display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem; background:var(--bg-card);">
        </div>

        <div id="lesson-practice-feedback" style="display:none; margin-bottom:1rem;"></div>

        <div style="display:flex; justify-content:center; gap:0.5rem;">
          <button id="lesson-practice-check-btn" class="btn btn-primary" onclick="LessonBrowser.checkGrammarReorderAnswer()" style="min-width:180px; padding:0.75rem 1.25rem; font-weight:800;" disabled>
            ✓ Kiểm tra đáp án
          </button>
          <button id="lesson-practice-next-btn" class="btn btn-primary" onclick="LessonBrowser.nextPracticeStep()" style="display:none; min-width:180px; padding:0.75rem 1.25rem; font-weight:800; background:var(--secondary);">
            Câu tiếp theo ➔
          </button>
        </div>
      `;
    } else if (this.practiceType === 'grammar' && (this.practiceMode === 'vi_to_zh' || this.practiceMode === 'zh_to_vi')) {
      const isViToZh = this.practiceMode === 'vi_to_zh';
      const promptText = isViToZh ? q.vi : q.zh;
      const choices = q.choices || [q.zh, ...(q.distractors || []).slice(0, 3)];

      questionContentHtml = `
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:1.25rem; margin-bottom:1.25rem; box-shadow:var(--shadow-sm);">
          <div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-bottom:0.4rem;">
            ${isViToZh ? '🇻🇳 Đọc câu tiếng Việt và chọn câu Hán ngữ tương ứng:' : '🇨🇳 Đọc câu chữ Hán và chọn nghĩa tiếng Việt chuẩn:'}
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
            <div style="font-size:1.2rem; font-weight:800; color:var(--text-main); font-family:${isViToZh ? 'inherit' : 'var(--font-hanzi)'};">
              ${promptText}
            </div>
            ${!isViToZh ? `<button class="btn-speaker" onclick="AudioEngine.speak('${escapeHtml(q.zh)}')" title="Phát âm">🔊</button>` : ''}
          </div>
          ${!isViToZh && (q.py || q.pinyin) ? `<div style="color:var(--text-muted); font-size:0.85rem; margin-top:0.25rem;">${q.py || q.pinyin}</div>` : ''}
        </div>

        <div style="display:flex; flex-direction:column; gap:0.6rem; margin-bottom:1rem;">
          ${choices.map((c, i) => `
            <button class="btn btn-outline lesson-choice-btn" onclick="LessonBrowser.checkChoiceAnswer('${escapeHtml(c)}', this)" style="text-align:left; justify-content:flex-start; padding:0.85rem 1rem; font-size:0.95rem; font-weight:600; background:var(--bg-card); font-family:${isViToZh ? 'var(--font-hanzi)' : 'inherit'};">
              <span style="display:inline-block; width:24px; height:24px; border-radius:50%; background:var(--bg-subtle); text-align:center; line-height:24px; margin-right:0.6rem; font-size:0.75rem; font-weight:800;">${String.fromCharCode(65 + i)}</span>
              <span>${c}</span>
            </button>
          `).join('')}
        </div>

        <div id="lesson-practice-feedback" style="display:none; margin-bottom:1rem;"></div>

        <div style="display:flex; justify-content:center;">
          <button id="lesson-practice-next-btn" class="btn btn-primary" onclick="LessonBrowser.nextPracticeStep()" style="display:none; min-width:180px; padding:0.75rem 1.25rem; font-weight:800; background:var(--secondary);">
            Câu tiếp theo ➔
          </button>
        </div>
      `;
    } else if (this.practiceType === 'quiz') {
      questionContentHtml = `
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:1.25rem; margin-bottom:1.25rem; text-align:center; box-shadow:var(--shadow-sm);">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Chọn nghĩa đúng của từ mới</span>
          <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin:0.75rem 0 0.25rem;">
            <div style="font-size:2.4rem; font-weight:900; font-family:var(--font-hanzi); color:var(--text-main);">${q.hanzi}</div>
            <button class="btn-speaker" onclick="AudioEngine.speak('${escapeHtml(q.hanzi)}')" style="font-size:1.35rem;" title="Phát âm">🔊</button>
          </div>
          <div style="color:var(--text-muted); font-size:0.95rem; font-weight:600;">${q.pinyin}</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.6rem; margin-bottom:1rem;">
          ${q.choices.map((c, i) => `
            <button class="btn btn-outline lesson-choice-btn" onclick="LessonBrowser.checkQuizAnswer('${escapeHtml(c)}', this)" style="text-align:left; justify-content:flex-start; padding:0.85rem 1rem; font-size:0.92rem; font-weight:600; background:var(--bg-card);">
              <span style="display:inline-block; width:24px; height:24px; border-radius:50%; background:var(--bg-subtle); text-align:center; line-height:24px; margin-right:0.6rem; font-size:0.75rem; font-weight:800;">${String.fromCharCode(65 + i)}</span>
              <span>${c}</span>
            </button>
          `).join('')}
        </div>

        <div id="lesson-practice-feedback" style="display:none; margin-bottom:1rem;"></div>

        <div style="display:flex; justify-content:center;">
          <button id="lesson-practice-next-btn" class="btn btn-primary" onclick="LessonBrowser.nextPracticeStep()" style="display:none; min-width:180px; padding:0.75rem 1.25rem; font-weight:800; background:var(--secondary);">
            Câu tiếp theo ➔
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="max-width:680px; margin:0 auto;">
        <!-- Top In-Lesson Nav Bar -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
          <button class="btn btn-outline btn-sm" onclick="LessonBrowser.exitLessonPractice()" style="font-weight:700;">
            &larr; Trở về Bài ${this.currentLesson.id}
          </button>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">
              Câu: <strong style="color:var(--text-main);">${this.practiceIndex + 1}</strong>/${total}
            </span>
            <span style="font-weight:700; font-size:0.85rem; color:var(--primary); background:var(--primary-light); padding:0.15rem 0.55rem; border-radius:999px;">
              Điểm: ${this.practiceScore}
            </span>
          </div>
        </div>

        <!-- Mode Badge Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.65rem;">
          <div style="font-weight:800; font-size:0.95rem; color:var(--text-main); display:flex; align-items:center; gap:0.35rem;">
            <span>🎯</span> <span>Bài ${this.currentLesson.id}: ${this.currentLesson.zh_title} • ${modeTitle}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="width:100%; height:6px; background:var(--bg-subtle); border-radius:999px; overflow:hidden; margin-bottom:1.15rem; border:1px solid var(--border);">
          <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, #d93829, #f59e0b); transition:width 0.3s ease; border-radius:999px;"></div>
        </div>

        <!-- Question Body -->
        ${questionContentHtml}
      </div>
    `;

    if (this.practiceType === 'grammar' && this.practiceMode === 'reorder') {
      this.renderPracticeTiles();
    }
  },

  renderLessonFlashcard(container) {
    const words = this.practiceQuestions;
    if (!words || !words.length) {
      container.innerHTML = `<p style="padding:2rem; text-align:center;">Bài này chưa có từ vựng.</p>`;
      return;
    }
    const currentWord = words[this.practiceFcIndex];
    const total = words.length;
    const progressPct = Math.round(((this.practiceFcIndex + 1) / total) * 100);

    container.innerHTML = `
      <div style="max-width:540px; margin:0 auto;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
          <button class="btn btn-outline btn-sm" onclick="LessonBrowser.exitLessonPractice()" style="font-weight:700;">
            &larr; Trở về Bài ${this.currentLesson.id}
          </button>
          <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">
            Thẻ: <strong style="color:var(--text-main);">${this.practiceFcIndex + 1}</strong> / ${total}
          </span>
        </div>

        <div style="width:100%; height:6px; background:var(--bg-subtle); border-radius:999px; overflow:hidden; margin-bottom:1rem; border:1px solid var(--border);">
          <div style="width:${progressPct}%; height:100%; background:var(--primary); transition:width 0.2s;"></div>
        </div>

        <!-- 3D Flashcard Flip Card -->
        <div id="lesson-fc-card" onclick="LessonBrowser.toggleFcFlip()" style="cursor:pointer; min-height:260px; background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-xl); padding:1.75rem 1.25rem; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; box-shadow:var(--shadow-md); transition:transform 0.2s ease; margin-bottom:1.25rem;">
          ${!this.practiceFcIsFlipped ? `
            <!-- Mặt trước: Chữ Hán -->
            <span style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.05em;">Chạm thẻ để lật nghĩa ↻</span>
            <div style="font-size:3.2rem; font-weight:900; font-family:var(--font-hanzi); color:var(--text-main); line-height:1.2;">${currentWord.hanzi}</div>
            <div style="font-size:1.15rem; color:var(--primary); font-weight:700; margin:0.4rem 0 0.8rem;">${currentWord.pinyin}</div>
            <button class="btn-speaker" onclick="event.stopPropagation(); AudioEngine.speak('${escapeHtml(currentWord.hanzi)}')" style="font-size:1.4rem;">🔊</button>
          ` : `
            <!-- Mặt sau: Nghĩa & Ví dụ -->
            <span style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.05em;">Ý nghĩa tiếng Việt ↻</span>
            <div style="font-size:1.4rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem;">${currentWord.meaning}</div>
            <div style="font-size:0.85rem; color:var(--secondary); font-weight:600; margin-bottom:0.6rem;">${currentWord.hanviet ? `Hán Việt: ${currentWord.hanviet}` : ''}</div>
            ${currentWord.example ? `<div style="font-size:0.85rem; color:var(--text-muted); font-style:italic; background:var(--bg-subtle); padding:0.5rem 0.75rem; border-radius:var(--radius-md);">💡 ${escapeHtml(currentWord.example)}</div>` : ''}
          `}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <button class="btn btn-outline btn-sm" onclick="LessonBrowser.prevFcCard()" ${this.practiceFcIndex === 0 ? 'disabled' : ''} style="flex:1;">
            &larr; Thẻ trước
          </button>
          <button class="btn btn-outline btn-sm" onclick="AudioEngine.speak('${escapeHtml(currentWord.hanzi)}')" style="padding:0.45rem 0.8rem;">
            🔊 Nghe lại
          </button>
          <button class="btn btn-primary btn-sm" onclick="LessonBrowser.nextFcCard()" style="flex:1;">
            ${this.practiceFcIndex === total - 1 ? 'Hoàn thành 🎉' : 'Thẻ tiếp &rarr;'}
          </button>
        </div>
      </div>
    `;
  },

  renderPracticeSummary(container) {
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playVictorySound) {
      AudioEngine.playVictorySound();
    }
    if (typeof StorageManager !== 'undefined' && StorageManager.addXP) {
      StorageManager.addXP(20, 'Luyện tập bài học');
    }
    const firstCompletion = this.currentLesson && StorageManager.isLessonCompleted && !StorageManager.isLessonCompleted(this.currentLesson.id);
    if (typeof App !== 'undefined' && App.updateDashboardStats) {
      App.updateDashboardStats();
    }

    const total = this.practiceQuestions.length;
    const score = this.practiceScore;
    const pct = total > 0 ? Math.round((score / total) * 100) : 100;

    container.innerHTML = `
      <div style="max-width:540px; margin:1rem auto; background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-xl); padding:2rem 1.5rem; text-align:center; box-shadow:var(--shadow-lg);">
        <div class="summary-trophy">${typeof Icon !== "undefined" ? Icon.svg("trophy") : ""}</div>
        <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem;">
          Xuất sắc! Hoàn thành bài tập
        </h2>
        <p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:1.25rem;">
          Bạn vừa hoàn thành trọn vẹn vòng bài tập của <strong>Bài ${this.currentLesson.id}: ${this.currentLesson.zh_title}</strong>!
        </p>

        <div style="display:flex; justify-content:center; gap:1.5rem; margin-bottom:1.5rem; padding:1rem; background:var(--bg-subtle); border-radius:var(--radius-lg);">
          <div>
            <div style="font-size:1.6rem; font-weight:800; color:var(--primary);">${score}/${total}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Câu đúng (${pct}%)</div>
          </div>
          <div style="width:1px; background:var(--border);"></div>
          <div>
            <div style="font-size:1.6rem; font-weight:800; color:var(--accent-gold);">+20 XP</div>
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Kinh nghiệm tích lũy</div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.6rem;">
          <button class="btn btn-primary" onclick="LessonBrowser.startLessonPractice('${this.practiceType}', '${this.practiceMode}')" style="padding:0.8rem; font-weight:800;">
            Luyện lại
          </button>
          ${firstCompletion ? `
          <button class="btn btn-gold" onclick="LessonBrowser.exitLessonPractice(); LessonBrowser.completeCurrentLesson();" style="padding:0.8rem; font-weight:800;">
            Hoàn thành Bài ${this.currentLesson.id}
          </button>` : ''}
          <button class="btn btn-outline" onclick="LessonBrowser.exitLessonPractice()" style="padding:0.8rem; font-weight:700;">
            Trở về Bài ${this.currentLesson.id}
          </button>
          ${this.currentLesson.id < this.lastLessonId() ? `
            <button class="btn btn-outline" onclick="LessonBrowser.exitLessonPractice(); LessonBrowser.nextLesson();" style="padding:0.8rem; font-weight:700; border-color:var(--secondary); color:var(--secondary);">
              Bài tiếp theo (Bài ${this.currentLesson.id + 1})
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  selectPracticeTile(poolIndex) {
    if (this.practiceIsAnswered) {
      this.resetPracticeAnswerState();
    }
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    const token = this.practiceAvailableTokens.splice(poolIndex, 1)[0];
    if (token) this.practiceSelectedTokens.push(token);
    this.renderPracticeTiles();
  },

  unselectPracticeTile(slotIndex) {
    if (this.practiceIsAnswered) {
      this.resetPracticeAnswerState();
    }
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    const token = this.practiceSelectedTokens.splice(slotIndex, 1)[0];
    if (token) this.practiceAvailableTokens.push(token);
    this.renderPracticeTiles();
  },

  clearPracticeTiles() {
    this.resetPracticeAnswerState();
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    if (this.practiceSelectedTokens && this.practiceSelectedTokens.length) {
      this.practiceAvailableTokens.push(...this.practiceSelectedTokens);
      this.practiceSelectedTokens = [];
    }
    this.renderPracticeTiles();
  },

  resetPracticeAnswerState() {
    this.practiceIsAnswered = false;
    const fb = document.getElementById('lesson-practice-feedback');
    if (fb) {
      fb.style.display = 'none';
      fb.innerHTML = '';
    }
    const checkBtn = document.getElementById('lesson-practice-check-btn');
    const nextBtn = document.getElementById('lesson-practice-next-btn');
    if (checkBtn) {
      checkBtn.style.display = 'inline-flex';
      checkBtn.disabled = this.practiceSelectedTokens.length === 0;
    }
    if (nextBtn) nextBtn.style.display = 'none';
  },

  renderPracticeTiles() {
    const slot = document.getElementById('lesson-practice-answer-slot');
    const pool = document.getElementById('lesson-practice-pool');
    const checkBtn = document.getElementById('lesson-practice-check-btn');

    if (slot) {
      if (!this.practiceSelectedTokens.length) {
        slot.innerHTML = `<span style="color:var(--text-muted); font-size:0.82rem;">Chạm vào các từ bên dưới để ghép câu...</span>`;
      } else {
        slot.innerHTML = this.practiceSelectedTokens.map((t, idx) => `
          <button type="button" class="grammar-token selected" onclick="LessonBrowser.unselectPracticeTile(${idx})" style="padding:0.4rem 0.75rem; font-size:1.15rem; font-family:var(--font-hanzi); font-weight:700; border-radius:var(--radius-sm); border:1.5px solid var(--primary); background:var(--bg-card); cursor:pointer;">
            ${escapeHtml(t.text)}
          </button>
        `).join('');
      }
    }

    if (pool) {
      pool.innerHTML = this.practiceAvailableTokens.map((t, idx) => `
        <button type="button" class="grammar-token" onclick="LessonBrowser.selectPracticeTile(${idx})" style="padding:0.4rem 0.75rem; font-size:1.15rem; font-family:var(--font-hanzi); font-weight:700; border-radius:var(--radius-sm); border:1.5px solid var(--border); background:var(--bg-card); cursor:pointer;">
          ${escapeHtml(t.text)}
        </button>
      `).join('');
    }

    if (checkBtn) {
      checkBtn.disabled = this.practiceSelectedTokens.length === 0;
    }
  },

  checkGrammarReorderAnswer() {
    if (this.practiceIsAnswered) return;
    this.practiceIsAnswered = true;
    const q = this.practiceQuestions[this.practiceIndex];
    if (!q) return;

    const userAnswer = this.practiceSelectedTokens.map(t => t.text).join('').trim();
    const cleanUser = userAnswer.replace(/[，。！？,.!?\s]/g, '');
    const cleanExpected = q.zh.replace(/[，。！？,.!?\s]/g, '');

    const isCorrect = (cleanUser === cleanExpected);

    if (isCorrect) {
      this.practiceScore++;
      if (typeof AudioEngine !== 'undefined' && AudioEngine.playCorrectSound) {
        AudioEngine.playCorrectSound();
      }
    } else {
      if (typeof AudioEngine !== 'undefined' && AudioEngine.playWrongSound) {
        AudioEngine.playWrongSound();
      }
    }

    const checkBtn = document.getElementById('lesson-practice-check-btn');
    const nextBtn = document.getElementById('lesson-practice-next-btn');
    if (checkBtn) checkBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'inline-flex';

    const fb = document.getElementById('lesson-practice-feedback');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `
        <div style="padding:1rem; border-radius:var(--radius-md); background:${isCorrect ? '#f0fdf4' : '#fef2f2'}; border:1.5px solid ${isCorrect ? '#86efac' : '#fca5a5'};">
          <div style="font-weight:800; font-size:0.95rem; color:${isCorrect ? '#16a34a' : '#dc2626'}; margin-bottom:0.35rem;">
            ${isCorrect ? '🎉 Chính xác!' : '❌ Chưa chính xác!'}
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; margin-bottom:0.25rem;">
            <div style="font-size:1.15rem; font-weight:800; font-family:var(--font-hanzi); color:var(--text-main);">${q.zh}</div>
            <button class="btn-speaker" onclick="AudioEngine.speak('${escapeHtml(q.zh)}')">🔊</button>
          </div>
          <div style="color:var(--primary); font-size:0.85rem; font-weight:600; margin-bottom:0.25rem;">${q.py || q.pinyin || ''}</div>
          <div style="color:var(--text-muted); font-size:0.82rem;">${q.vi}</div>
          ${(q.grammarNote || q.point) ? `<div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed var(--border); font-size:0.8rem; color:#d97706; font-weight:600;">💡 Ngữ pháp: ${escapeHtml(q.grammarNote || q.point)}</div>` : ''}
        </div>
      `;
    }

    if (typeof AudioEngine !== 'undefined' && AudioEngine.speak) {
      setTimeout(() => AudioEngine.speak(q.zh), 200);
    }
  },

  checkChoiceAnswer(selectedChoice, btn) {
    if (this.practiceIsAnswered) return;
    this.practiceIsAnswered = true;
    const q = this.practiceQuestions[this.practiceIndex];
    if (!q) return;

    const isViToZh = this.practiceMode === 'vi_to_zh';
    const expected = isViToZh ? q.zh : q.vi;
    const isCorrect = (selectedChoice.trim() === expected.trim());

    if (isCorrect) {
      this.practiceScore++;
      btn.style.borderColor = '#16a34a';
      btn.style.background = '#f0fdf4';
      btn.style.color = '#16a34a';
      if (typeof AudioEngine !== 'undefined' && AudioEngine.playCorrectSound) {
        AudioEngine.playCorrectSound();
      }
    } else {
      btn.style.borderColor = '#dc2626';
      btn.style.background = '#fef2f2';
      btn.style.color = '#dc2626';
      if (typeof AudioEngine !== 'undefined' && AudioEngine.playWrongSound) {
        AudioEngine.playWrongSound();
      }
    }

    document.querySelectorAll('.lesson-choice-btn').forEach(b => {
      b.disabled = true;
      if (b.innerText.includes(expected)) {
        b.style.borderColor = '#16a34a';
        b.style.background = '#f0fdf4';
        b.style.color = '#16a34a';
      }
    });

    const nextBtn = document.getElementById('lesson-practice-next-btn');
    if (nextBtn) nextBtn.style.display = 'inline-flex';

    const fb = document.getElementById('lesson-practice-feedback');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `
        <div style="padding:0.85rem; border-radius:var(--radius-md); background:${isCorrect ? '#f0fdf4' : '#fef2f2'}; border:1px solid ${isCorrect ? '#86efac' : '#fca5a5'}; font-size:0.88rem;">
          <strong>${isCorrect ? '🎉 Chính xác!' : '❌ Đáp án đúng:'}</strong> ${expected}
          ${(q.py || q.pinyin) ? `<div style="color:var(--text-muted); font-size:0.8rem; margin-top:0.2rem;">${q.py || q.pinyin}</div>` : ''}
          ${(q.grammarNote || q.point) ? `<div style="color:#d97706; font-size:0.78rem; margin-top:0.25rem;">💡 ${escapeHtml(q.grammarNote || q.point)}</div>` : ''}
        </div>
      `;
    }

    if (typeof AudioEngine !== 'undefined' && AudioEngine.speak) {
      AudioEngine.speak(q.zh);
    }
  },

  checkQuizAnswer(selectedChoice, btn) {
    if (this.practiceIsAnswered) return;
    this.practiceIsAnswered = true;
    const q = this.practiceQuestions[this.practiceIndex];
    if (!q) return;

    const isCorrect = (selectedChoice.trim() === q.correct.trim());

    if (isCorrect) {
      this.practiceScore++;
      btn.style.borderColor = '#16a34a';
      btn.style.background = '#f0fdf4';
      btn.style.color = '#16a34a';
      if (typeof AudioEngine !== 'undefined' && AudioEngine.playCorrectSound) {
        AudioEngine.playCorrectSound();
      }
    } else {
      btn.style.borderColor = '#dc2626';
      btn.style.background = '#fef2f2';
      btn.style.color = '#dc2626';
      if (typeof AudioEngine !== 'undefined' && AudioEngine.playWrongSound) {
        AudioEngine.playWrongSound();
      }
    }

    document.querySelectorAll('.lesson-choice-btn').forEach(b => {
      b.disabled = true;
      if (b.innerText.includes(q.correct)) {
        b.style.borderColor = '#16a34a';
        b.style.background = '#f0fdf4';
        b.style.color = '#16a34a';
      }
    });

    const nextBtn = document.getElementById('lesson-practice-next-btn');
    if (nextBtn) nextBtn.style.display = 'inline-flex';

    const fb = document.getElementById('lesson-practice-feedback');
    if (fb) {
      const w = q.word || {};
      const safeHanzi = typeof escapeHtml === 'function' ? escapeHtml(q.hanzi) : q.hanzi;
      const safePinyin = typeof escapeHtml === 'function' ? escapeHtml(q.pinyin || '') : (q.pinyin || '');
      const safeCorrect = typeof escapeHtml === 'function' ? escapeHtml(q.correct) : q.correct;
      const safeHv = w.hanviet ? (typeof escapeHtml === 'function' ? escapeHtml(w.hanviet) : w.hanviet) : '';
      const safeEx = w.example ? (typeof escapeHtml === 'function' ? escapeHtml(w.example) : w.example) : '';
      fb.style.display = 'block';
      fb.innerHTML = `
        <div style="padding:0.85rem; border-radius:var(--radius-md); background:${isCorrect ? '#f0fdf4' : '#fef2f2'}; border:1px solid ${isCorrect ? '#86efac' : '#fca5a5'}; font-size:0.88rem;">
          <strong>${isCorrect ? '🎉 Chính xác!' : '❌ Đáp án đúng:'}</strong> ${safeHanzi} (${safePinyin}) — ${safeCorrect}
          ${safeHv ? `<div style="color:var(--secondary); font-size:0.8rem; margin-top:0.2rem; font-weight:600;">Hán Việt: ${safeHv}</div>` : ''}
          ${safeEx ? `<div style="color:var(--text-muted); font-size:0.78rem; margin-top:0.25rem; font-style:italic;">💡 ${safeEx}</div>` : ''}
        </div>
      `;
    }

    if (typeof AudioEngine !== 'undefined' && AudioEngine.speak) {
      AudioEngine.speak(q.hanzi);
    }
  },

  nextPracticeStep() {
    this.practiceIsAnswered = false;
    this.practiceIndex++;
    this.renderCurrentPracticeStep();
  },

  toggleFcFlip() {
    this.practiceFcIsFlipped = !this.practiceFcIsFlipped;
    const container = document.getElementById('lesson-practice-wrapper');
    if (container) this.renderLessonFlashcard(container);
  },

  nextFcCard() {
    if (this.practiceFcIndex < this.practiceQuestions.length - 1) {
      this.practiceFcIndex++;
      this.practiceFcIsFlipped = false;
      const container = document.getElementById('lesson-practice-wrapper');
      if (container) this.renderLessonFlashcard(container);
    } else {
      const container = document.getElementById('lesson-practice-wrapper');
      this.practiceScore = this.practiceQuestions.length;
      if (container) this.renderPracticeSummary(container);
    }
  },

  prevFcCard() {
    if (this.practiceFcIndex > 0) {
      this.practiceFcIndex--;
      this.practiceFcIsFlipped = false;
      const container = document.getElementById('lesson-practice-wrapper');
      if (container) this.renderLessonFlashcard(container);
    }
  },

  openLessonReviewModal() {
    if (!this.currentLesson) return;
    const modal = document.getElementById('lesson-review-modal');
    const title = document.getElementById('lesson-review-modal-title');
    const subtitle = document.getElementById('lesson-review-modal-subtitle');
    const wordCount = document.getElementById('review-modal-word-count');

    if (title) title.innerText = `🎯 Ôn tập Bài ${this.currentLesson.id}: ${this.currentLesson.zh_title}`;
    if (subtitle) subtitle.innerText = `Phạm vi: Toàn bộ từ mới & ngữ pháp của ${this.currentLesson.title}`;
    if (wordCount) wordCount.innerText = this.currentLesson.words ? this.currentLesson.words.length : 0;

    if (modal) modal.classList.add('active');
  },

  closeLessonReviewModal() {
    const modal = document.getElementById('lesson-review-modal');
    if (modal) modal.classList.remove('active');
  }
};

if (typeof window !== 'undefined') {
  window.LessonBrowser = LessonBrowser;
}
/**
 * Dictionary Search & Custom Vocabulary Notebook
 */
const DictionaryController = {
  allWords: [],
  currentResults: [],
  activeTab: 'all', // 'all', 'bookmarks', 'custom'

  init(allWords) {
    this.allWords = allWords || [];
    this.search('');
  },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.dict-tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`dict-tab-${tab}`);
    if (btn) btn.classList.add('active');
    
    const query = document.getElementById('dict-search-input').value;
    this.search(query);
  },

  search(query) {
    const q = (query || '').trim().toLowerCase();
    const user = StorageManager.getCurrentUser() || {};
    const customWords = user.customWords || [];
    const combined = [...customWords, ...this.allWords];

    let filtered = combined;
    if (this.activeTab === 'bookmarks') {
      filtered = filtered.filter(w => StorageManager.isBookmarked(w.id));
    } else if (this.activeTab === 'custom') {
      filtered = filtered.filter(w => w.isCustom);
    }

    if (q) {
      filtered = filtered.filter(w => {
        const hanziMatch = w.hanzi && w.hanzi.includes(q);
        const pinyinMatch = w.pinyin && w.pinyin.toLowerCase().includes(q);
        const meaningMatch = w.meaning && w.meaning.toLowerCase().includes(q);
        const hanvietMatch = w.hanviet && w.hanviet.toLowerCase().includes(q);
        return hanziMatch || pinyinMatch || meaningMatch || hanvietMatch;
      });
    }

    this.currentResults = filtered;
    this.render();
  },

  render() {
    const container = document.getElementById('dict-container');
    const countEl = document.getElementById('dict-result-count');
    if (!container) return;

    if (countEl) countEl.innerText = `${this.currentResults.length} từ`;

    if (!this.currentResults.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.85rem;">
          Không tìm thấy từ vựng nào phù hợp.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="vocab-cards-list vocab-v2">
        ${this.currentResults.slice(0, 100).map(w => {
          const isFav = StorageManager.isBookmarked(w.id);
          const arg = typeof jsArg === 'function' ? jsArg(w.hanzi) : w.hanzi;
          const esc = (v) => UI.esc(v);
          return `
            <div class="vocab-item-card">
              <button class="vocab-play" onclick="AudioEngine.speak('${arg}')" aria-label="Nghe ${esc(w.hanzi)}">${Icon.svg('sound')}</button>
              <div class="vocab-item-info">
                <div class="vocab-line">
                  <span class="vocab-item-hanzi hanzi">${w.hanzi}</span>
                  <span class="vocab-item-py py">${Tone.html(w.pinyin)}</span>
                </div>
                <div class="vocab-item-mean">${esc(w.meaning)}</div>
                <div class="vocab-item-meta">
                  ${w.hanviet ? `<span class="hv-badge">${esc(w.hanviet)}</span>` : ''}
                  ${w.pos ? `<span class="pos-badge">${esc(w.pos)}</span>` : ''}
                  ${typeof w.lesson === 'number' ? `<span class="pos-badge">Bài ${w.lesson}</span>` : ''}
                  ${w.isCustom ? '<span class="hv-badge">Tự thêm</span>' : ''}
                </div>
                ${w.example ? `<div class="vocab-example">${esc(w.example)}</div>` : ''}
                ${typeof Notes !== 'undefined' ? Notes.wordBlock(w.id) : ''}
              </div>
              <div class="vocab-actions">
                <button class="icon-btn" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${arg}');" aria-label="Tập viết ${esc(w.hanzi)}" title="Tập viết">${Icon.svg('pen')}</button>
                <button class="icon-btn ${isFav ? 'on' : ''}" onclick="DictionaryController.toggleBookmark('${w.id}', this)" aria-label="Lưu ${esc(w.hanzi)}" aria-pressed="${isFav}" title="Lưu vào Sổ tay">${Icon.svg(isFav ? 'starFill' : 'star')}</button>
                ${w.isCustom ? `<button class="icon-btn" onclick="DictionaryController.deleteCustom('${w.id}')" aria-label="Xóa từ ${esc(w.hanzi)}" title="Xóa">${Icon.svg('x')}</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${this.currentResults.length > 100 ? '<p style="text-align:center; padding:1rem; font-size:0.8rem; color:var(--text-muted);">Hiển thị 100 từ đầu tiên. Hãy gõ từ khóa để lọc chi tiết hơn.</p>' : ''}
    `;
  },

  toggleBookmark(wordId, btn) {
    const isNow = StorageManager.toggleBookmark(wordId);
    btn.innerHTML = Icon.svg(isNow ? 'starFill' : 'star');
    btn.classList.toggle('on', isNow);
    btn.setAttribute('aria-pressed', isNow ? 'true' : 'false');
  },

  async deleteCustom(wordId) {
    const ok = await UI.confirm({ title: 'Xóa từ này khỏi Sổ tay?', body: 'Từ tự thêm sẽ bị xóa và không khôi phục được.', ok: 'Xóa', danger: true });
    if (ok) {
      StorageManager.deleteCustomWord(wordId);
      this.search(document.getElementById('dict-search-input').value);
      App.updateDashboardStats();
    }
  },

  openAddModal(pushHistory = true) {
    document.getElementById('add-word-modal').classList.add('active');
    if (pushHistory && window.location.hash !== '#add-word') {
      history.pushState({ type: 'modal', modal: 'add-word' }, '', '#add-word');
    }
  },

  closeAddModal(triggerHistoryBack = true) {
    document.getElementById('add-word-modal').classList.remove('active');
    if (triggerHistoryBack && window.location.hash === '#add-word') {
      history.back();
    }
  },

  handleSaveCustomWord(e) {
    e.preventDefault();
    const hanzi = document.getElementById('custom-hanzi').value;
    const pinyin = document.getElementById('custom-pinyin').value;
    const hanviet = document.getElementById('custom-hanviet').value;
    const meaning = document.getElementById('custom-meaning').value;
    const pos = document.getElementById('custom-pos').value;

    if (!hanzi || !meaning) {
      App.toast('Vui lòng nhập Chữ Hán và Nghĩa.', 'warning');
      return;
    }

    StorageManager.addCustomWord({ hanzi, pinyin, hanviet, meaning, pos });
    this.closeAddModal();
    document.getElementById('add-word-form').reset();
    this.search(document.getElementById('dict-search-input').value);
    App.updateDashboardStats();
  },

  exportBackup() {
    const data = StorageManager.getCurrentUser() || {};
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chinese_app_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

if (typeof window !== 'undefined') {
  window.DictionaryController = DictionaryController;
}
/**
 * Interactive Pinyin Pronunciation Matrix (Thanh mẫu, Vận mẫu & 4 Thanh điệu)
 */

const PinyinController = {
  initials: [
    { pinyin: 'b', sound: '玻', vi: 'púa (âm môi)', ex: 'bàba' },
    { pinyin: 'p', sound: '坡', vi: 'pua (bật hơi mạnh)', ex: 'píngguǒ' },
    { pinyin: 'm', sound: '摸', vi: 'mua (m- như tiếng Việt)', ex: 'māma' },
    { pinyin: 'f', sound: '佛', vi: 'phua (ph- như tiếng Việt)', ex: 'fēi' },
    { pinyin: 'd', sound: '得', vi: 'tưa (như chữ T)', ex: 'dà' },
    { pinyin: 't', sound: '特', vi: 'thưa (như chữ TH, bật hơi)', ex: 'tā' },
    { pinyin: 'n', sound: '讷', vi: 'nưa (như chữ N)', ex: 'nǐ' },
    { pinyin: 'l', sound: '勒', vi: 'lưa (như chữ L)', ex: 'lǎo' },
    { pinyin: 'g', sound: '哥', vi: 'cưa (như chữ C/K)', ex: 'gēge' },
    { pinyin: 'k', sound: '科', vi: 'khưa (như chữ KH, bật hơi)', ex: 'kāi' },
    { pinyin: 'h', sound: '喝', vi: 'hưa (như chữ H nhẹ)', ex: 'hǎo' },
    { pinyin: 'j', sound: '基', vi: 'chi (mặt lưỡi)', ex: 'jiā' },
    { pinyin: 'q', sound: '欺', vi: 'chi (bật hơi sắc)', ex: 'qǐng' },
    { pinyin: 'x', sound: '希', vi: 'xi (như chữ X)', ex: 'xièxie' },
    { pinyin: 'zh', sound: '知', vi: 'trưa (uốn lưỡi, không bật)', ex: 'zhōng' },
    { pinyin: 'ch', sound: '蚩', vi: 'trưa (uốn lưỡi, bật hơi)', ex: 'chī' },
    { pinyin: 'sh', sound: '诗', vi: 'sưa (uốn lưỡi như S)', ex: 'shì' },
    { pinyin: 'r', sound: '日', vi: 'rưa (như R tiếng Việt)', ex: 'rén' },
    { pinyin: 'z', sound: '资', vi: 'chưa (đầu lưỡi thẳng)', ex: 'zài' },
    { pinyin: 'c', sound: '雌', vi: 'thưa/chưa (bật hơi đầu lưỡi)', ex: 'cài' },
    { pinyin: 's', sound: '思', vi: 'xưa (đầu lưỡi thẳng)', ex: 'sān' },
    { pinyin: 'y', sound: '衣', vi: 'di (bán nguyên âm)', ex: 'yī' },
    { pinyin: 'w', sound: '乌', vi: 'ua (bán nguyên âm)', ex: 'wǒ' }
  ],

  finals: [
    { pinyin: 'a', sound: '啊', vi: 'a (mở to miệng)', ex: 'mā' },
    { pinyin: 'o', sound: '喔', vi: 'ua/ô (tròn môi)', ex: 'bō' },
    { pinyin: 'e', sound: '鹅', vi: 'ưa (nửa mở)', ex: 'gē' },
    { pinyin: 'i', sound: '衣', vi: 'i (dẹt môi)', ex: 'qī' },
    { pinyin: 'u', sound: '乌', vi: 'u (tròn môi nhô)', ex: 'bù' },
    { pinyin: 'ü', sound: '迂', vi: 'uy (tròn môi giữ nguyên)', ex: 'nǚ (女)' },
    { pinyin: 'er', sound: '儿', vi: 'ơr (uốn lưỡi)', ex: 'érzi' },
    { pinyin: 'ai', sound: '哀', vi: 'ai', ex: 'bái' },
    { pinyin: 'ei', sound: '杯', vi: 'ây', ex: 'běi' },
    { pinyin: 'ao', sound: '熬', vi: 'ao', ex: 'hǎo' },
    { pinyin: 'ou', sound: '欧', vi: 'âu', ex: 'dǒu' },
    { pinyin: 'an', sound: '安', vi: 'an', ex: 'sān' },
    { pinyin: 'en', sound: '恩', vi: 'ơn/ân', ex: 'hěn' },
    { pinyin: 'ang', sound: '昂', vi: 'ang', ex: 'máng' },
    { pinyin: 'eng', sound: '亨', vi: 'âng/ơng', ex: 'fēng' },
    { pinyin: 'ong', sound: '轰', vi: 'ung', ex: 'zhōng' },
    { pinyin: 'ia', sound: '呀', vi: 'ia', ex: 'jiā' },
    { pinyin: 'ie', sound: '耶', vi: 'iê', ex: 'xiè' },
    { pinyin: 'iao', sound: '腰', vi: 'ieo', ex: 'xiǎo' },
    { pinyin: 'iu', sound: '优', vi: 'iêu', ex: 'liù' },
    { pinyin: 'ian', sound: '烟', vi: 'iên', ex: 'tiān' },
    { pinyin: 'in', sound: '因', vi: 'in', ex: 'jīn' },
    { pinyin: 'iang', sound: '央', vi: 'iang', ex: 'liǎng' },
    { pinyin: 'ing', sound: '英', vi: 'inh', ex: 'míng' },
    { pinyin: 'iong', sound: '拥', vi: 'iung', ex: 'xióng' },
    { pinyin: 'ua', sound: '蛙', vi: 'oa', ex: 'huā' },
    { pinyin: 'uo', sound: '窝', vi: 'ua/uô', ex: 'zuò' },
    { pinyin: 'uai', sound: '歪', vi: 'oai', ex: 'kuài' },
    { pinyin: 'ui', sound: '威', vi: 'uêi/ui', ex: 'duì' },
    { pinyin: 'uan', sound: '弯', vi: 'oan', ex: 'guān' },
    { pinyin: 'un', sound: '温', vi: 'uân', ex: 'cūn (村)' },
    { pinyin: 'uang', sound: '汪', vi: 'oang', ex: 'huáng' },
    { pinyin: 'ueng', sound: '翁', vi: 'uâng', ex: 'wēng' },
    { pinyin: 'üe', sound: '约', vi: 'uyê', ex: 'yuè' },
    { pinyin: 'üan', sound: '冤', vi: 'uyên', ex: 'yuán' },
    { pinyin: 'ün', sound: '晕', vi: 'uyn', ex: 'yún' }
  ],

  tones: [
    { name: 'Thanh 1 (Âm Bình)', mark: 'ā (55)', desc: 'Cao, phẳng đều, ngân dài', sample: 'mā (妈 - mẹ)', sound: '妈' },
    { name: 'Thanh 2 (Dương Bình)', mark: 'á (35)', desc: 'Từ trung bình vút lên cao (như dấu sắc nhẹ)', sample: 'má (麻 - sợi đay)', sound: '麻' },
    { name: 'Thanh 3 (Thượng Thanh)', mark: 'ǎ (214)', desc: 'Hạ thấp rồi uốn nhẹ lên (hơi giống dấu hỏi)', sample: 'mǎ (马 - con ngựa)', sound: '马' },
    { name: 'Thanh 4 (Khứ Thanh)', mark: 'à (51)', desc: 'Rơi thẳng dứt khoát từ cao nhất xuống thấp nhất', sample: 'mà (骂 - mắng)', sound: '骂' },
    { name: 'Khinh Thanh (Thanh nhẹ)', mark: 'ma (0)', desc: 'Đọc thật ngắn, nhẹ và lướt', sample: 'ma (吗 - không?)', sound: '吗' }
  ],

  openModal(pushHistory = true) {
    const modal = document.getElementById('pinyin-matrix-modal');
    if (!modal) return;
    this.render();
    modal.classList.add('active');
    if (pushHistory && window.location.hash !== '#pinyin') {
      history.pushState({ type: 'modal', modal: 'pinyin' }, '', '#pinyin');
    }
  },

  closeModal(triggerHistoryBack = true) {
    const modal = document.getElementById('pinyin-matrix-modal');
    if (modal) modal.classList.remove('active');
    if (triggerHistoryBack && window.location.hash === '#pinyin') {
      history.back();
    }
  },

  render() {
    const initContainer = document.getElementById('pinyin-initials-grid');
    const finalContainer = document.getElementById('pinyin-finals-grid');
    const tonesContainer = document.getElementById('pinyin-tones-grid');

    if (initContainer && !initContainer.children.length) {
      initContainer.innerHTML = this.initials.map(item => `
        <button class="pinyin-cell" onclick="AudioEngine.speak('${item.sound || item.pinyin}')" title="Phát âm: ${item.vi}">
          <span class="pinyin-name">${item.pinyin}</span>
          <span class="pinyin-tip">${item.vi}</span>
          <span class="pinyin-ex">VD: ${item.ex}</span>
        </button>
      `).join('');
    }

    if (finalContainer && !finalContainer.children.length) {
      finalContainer.innerHTML = this.finals.map(item => `
        <button class="pinyin-cell" onclick="AudioEngine.speak('${item.sound || item.pinyin}')" title="Phát âm: ${item.vi}">
          <span class="pinyin-name">${item.pinyin}</span>
          <span class="pinyin-tip">${item.vi}</span>
          <span class="pinyin-ex">VD: ${item.ex}</span>
        </button>
      `).join('');
    }

    if (tonesContainer && !tonesContainer.children.length) {
      tonesContainer.innerHTML = this.tones.map(t => `
        <div class="pinyin-tone-card" onclick="AudioEngine.speak('${t.sound}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--primary); font-size:1.05rem;">${t.name}</strong>
            <span style="background:var(--primary-light); color:var(--primary); font-weight:800; padding:0.15rem 0.5rem; border-radius:6px;">${t.mark}</span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin:0.35rem 0;">${t.desc}</div>
          <div style="font-size:0.88rem; font-weight:600; color:var(--secondary); display:flex; justify-content:space-between; align-items:center;">
            <span>Ví dụ: ${t.sample}</span>
            <span style="font-size:1.2rem;">🔊</span>
          </div>
        </div>
      `).join('');
    }
  }
};

if (typeof window !== 'undefined') {
  window.PinyinController = PinyinController;
}
/**
 * Review: today's spaced-repetition queue with mixed exercise types.
 *
 *   intro    new word: see it, hear it, then it is quizzed later in the same session
 *   flip     classic flashcard with self rating (Quên / Khó / Nhớ / Dễ)
 *   meaning  hanzi -> choose Vietnamese meaning
 *   reverse  Vietnamese -> choose hanzi
 *   listen   audio only -> choose hanzi
 *   write    write a single character stroke by stroke (HanziWriter quiz)
 *
 * Grading feeds StorageManager.updateWordSrs: first-try correct = good, wrong = again (requeued).
 */
const HANZI_WRITER_URL = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js';

const Review = {
  queue: [],
  index: 0,
  total: 0,
  stats: { correct: 0, wrong: 0, words: new Set() },
  mode: 'today',
  answered: false,
  _writer: null,

  words() {
    return (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
  },

  renderHub() {
    const hub = document.getElementById('review-hub');
    const sess = document.getElementById('review-session');
    if (this.active) return;
    if (hub) hub.hidden = false;
    if (sess) sess.hidden = true;
    ReviewScope.renderCard();
    if (typeof App !== 'undefined' && App.updateDashboardStats) App.updateDashboardStats();
  },

  /**
   * Words to practise when nothing is due: inside the learner's review scope, words already
   * studied come first (weakest first), topped up with the earliest unseen words of the scope.
   * Without a chosen scope, only lessons the learner has reached are used.
   */
  learnedPool(limit = 15) {
    const user = StorageManager.getCurrentUser();
    const progress = (user && user.wordProgress) || {};
    const scope = StorageManager.getReviewScope();
    const maxLesson = Math.max(1, ...((user && user.completedLessons) || []), (user && user.lastActiveLesson) || 1);
    let base = StorageManager.scopeWords(this.words(), scope).filter((w) => typeof w.lesson === 'number');
    if (!scope) base = base.filter((w) => w.lesson <= maxLesson);
    const weakest = (a, b) => ((progress[a.id] || {}).srsLevel || 0) - ((progress[b.id] || {}).srsLevel || 0) || Math.random() - 0.5;
    const seen = base.filter((w) => progress[w.id]).sort(weakest);
    const unseen = base.filter((w) => !progress[w.id]).sort((a, b) => a.lesson - b.lesson);
    return [...seen, ...unseen].slice(0, limit);
  },

  /** Start today's review. The first time, ask which courses / lessons to review. */
  startToday(skipPicker = false) {
    if (!skipPicker && !StorageManager.hasChosenScope()) {
      ReviewScope.openPicker(() => this.startToday(true));
      return;
    }
    const limit = (typeof Prefs !== 'undefined' && Prefs.data.newPerDay) || 10;
    const q = StorageManager.getReviewQueue(this.words(), limit);
    let words = q.all;
    if (!words.length) {
      words = this.learnedPool(12);
      if (words.length) App.toast(`Đã ôn hết thẻ đến hạn trong ${ReviewScope.label()}. Đây là lượt ôn thêm các từ yếu nhất.`, 'info', 3200);
    }
    this.begin(words, 'today');
  },

  startListening() {
    const pool = this.learnedPool(10);
    this.begin(pool, 'listen');
  },

  begin(words, mode) {
    if (!words.length) {
      App.toast(StorageManager.hasChosenScope() ? `Chưa có từ để ôn trong ${ReviewScope.label()}. Hãy đổi phạm vi ôn tập.` : 'Chưa có từ để ôn. Hãy học Bài 1 trước nhé.', 'info', 3200);
      return;
    }
    this.mode = mode;
    this.active = true;
    const progress = (StorageManager.getCurrentUser() || {}).wordProgress || {};
    this.queue = [];
    if (mode === 'listen') {
      words.forEach((w) => this.queue.push({ word: w, type: 'listen' }));
    } else {
      const known = words.filter((w) => progress[w.id]);
      const fresh = words.filter((w) => !progress[w.id]);
      known.forEach((w, i) => this.queue.push({ word: w, type: this.pickType(w, i) }));
      // New words: introduce, then quiz each one right after the next introduction
      fresh.forEach((w, i) => {
        this.queue.push({ word: w, type: 'intro' });
        if (i > 0) this.queue.push({ word: fresh[i - 1], type: (i - 1) % 2 ? 'listen' : 'meaning' });
      });
      if (fresh.length) this.queue.push({ word: fresh[fresh.length - 1], type: (fresh.length - 1) % 2 ? 'listen' : 'meaning' });
    }

    this.index = 0;
    this.total = this.queue.length;
    this.stats = { correct: 0, wrong: 0, words: new Set() };

    if (App.currentTab !== 'review') App.navigateTo('review');
    const hub = document.getElementById('review-hub');
    const sess = document.getElementById('review-session');
    if (hub) hub.hidden = true;
    if (sess) sess.hidden = false;
    this.render();
  },

  pickType(w, i) {
    const single = [...w.hanzi].filter((c) => /[一-龥]/.test(c)).length === 1;
    const types = ['flip', 'meaning', 'listen', 'reverse'];
    if (single) types.push('write');
    return types[i % types.length];
  },

  exit(rerender = true) {
    this.active = false;
    this._writer = null;
    if (typeof AudioEngine !== 'undefined' && AudioEngine.stop) AudioEngine.stop();
    if (rerender) this.renderHub();
  },

  current() {
    return this.queue[this.index];
  },

  choices(word, field) {
    const pool = this.words().filter((w) => w.id !== word.id && w[field] && w[field] !== word[field]);
    const sameLevel = pool.filter((w) => w.hsk === word.hsk);
    const src = sameLevel.length >= 3 ? sameLevel : pool;
    const picked = new Set();
    const out = [];
    while (out.length < 3 && picked.size < src.length) {
      const c = src[Math.floor(Math.random() * src.length)];
      if (!picked.has(c.id) && !out.some((o) => o[field] === c[field])) { out.push(c); }
      picked.add(c.id);
    }
    return [...out, word].sort(() => Math.random() - 0.5);
  },

  render() {
    const sess = document.getElementById('review-session');
    if (!sess) return;
    const item = this.current();
    if (!item) { this.renderSummary(); return; }
    this.answered = false;
    const w = item.word;
    const pct = Math.round((this.index / this.total) * 100);
    const esc = UI.esc.bind(UI);
    const typeLabel = { intro: 'Từ mới', flip: 'Lật thẻ', meaning: 'Chọn nghĩa', reverse: 'Chọn chữ Hán', listen: 'Nghe và chọn', write: 'Viết chữ' }[item.type];

    let body = '';
    let footer = '';
    if (item.type === 'intro') {
      body = `
        <div class="rv-card">
          <span class="rv-tag">Từ mới · Bài ${w.lesson}</span>
          <div class="rv-hanzi hanzi">${w.hanzi}</div>
          <div class="rv-py py">${Tone.html(w.pinyin)}</div>
          <div class="rv-mean">${esc(w.meaning)}</div>
          ${w.hanviet ? `<span class="hv-badge hv-lg">${esc(w.hanviet)}</span>` : ''}
          ${Notes.mnemonic(w.id) ? `<div class="fc-mnemonic">${Icon.svg('bulb')}<span>${esc(Notes.mnemonic(w.id))}</span></div>` : ''}
          <button class="icon-btn icon-btn-primary rv-sound" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')" aria-label="Nghe lại">${Icon.svg('sound')}</button>
        </div>`;
      footer = `<button class="btn btn-primary btn-block" onclick="Review.introDone()">Đã ghi nhớ, tiếp tục</button>`;
    } else if (item.type === 'flip') {
      body = `
        <div class="rv-card rv-flip" onclick="Review.reveal()">
          <span class="rv-tag">Bài ${w.lesson}</span>
          <div class="rv-hanzi hanzi">${w.hanzi}</div>
          <div class="rv-back" id="rv-back" hidden>
            <div class="rv-py py">${Tone.html(w.pinyin)}</div>
            <div class="rv-mean">${esc(w.meaning)}</div>
            ${w.hanviet ? `<span class="hv-badge hv-lg">${esc(w.hanviet)}</span>` : ''}
          </div>
          <p class="rv-hint" id="rv-hint">Nhớ nghĩa và cách đọc, rồi chạm để kiểm tra</p>
        </div>`;
      const fmt = (d) => (d <= 0 ? '10 phút' : `${d} ngày`);
      footer = `
        <button class="btn btn-primary btn-block" id="rv-reveal-btn" onclick="Review.reveal()">Xem đáp án</button>
        <div class="grades" id="rv-grades" hidden>
          <button class="grade g-again" onclick="Review.grade('again')"><b>Quên</b><small>${fmt(0)}</small></button>
          <button class="grade g-hard" onclick="Review.grade('hard')"><b>Khó</b><small>${fmt(StorageManager.previewInterval(w.id, 'hard'))}</small></button>
          <button class="grade g-good" onclick="Review.grade('good')"><b>Nhớ</b><small>${fmt(StorageManager.previewInterval(w.id, 'good'))}</small></button>
          <button class="grade g-easy" onclick="Review.grade('easy')"><b>Dễ</b><small>${fmt(StorageManager.previewInterval(w.id, 'easy'))}</small></button>
        </div>`;
    } else if (item.type === 'write') {
      body = `
        <div class="rv-card">
          <span class="rv-tag">Viết chữ có nghĩa</span>
          <div class="rv-mean">${esc(w.meaning)}</div>
          <div class="rv-py py">${Tone.html(w.pinyin)}</div>
          <div class="rv-write-grid"><div class="migrid-lines"></div><div class="migrid-diagonal"></div><div id="rv-writer"></div></div>
          <p class="rv-hint" id="rv-write-msg">Viết từng nét theo đúng thứ tự. Sai 3 lần sẽ có gợi ý.</p>
        </div>`;
      footer = `<button class="btn btn-outline btn-block" onclick="Review.writeGiveUp()">Không nhớ, xem cách viết</button>`;
    } else {
      // multiple choice: meaning / reverse / listen
      const field = item.type === 'meaning' ? 'meaning' : 'hanzi';
      const opts = this.choices(w, field);
      this._correctId = w.id;
      const prompt = item.type === 'meaning'
        ? `<div class="rv-hanzi hanzi">${w.hanzi}</div><button class="icon-btn rv-sound" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')" aria-label="Nghe">${Icon.svg('sound')}</button>`
        : item.type === 'reverse'
          ? `<div class="rv-mean rv-mean-lg">${esc(w.meaning)}</div>${w.hanviet ? `<span class="hv-badge">${esc(w.hanviet)}</span>` : ''}`
          : `<button class="rv-listen" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')" aria-label="Nghe lại">${Icon.svg('sound')}</button><p class="rv-hint">Chạm để nghe lại</p>`;
      body = `
        <div class="rv-card">
          <span class="rv-tag">${typeLabel}</span>
          ${prompt}
        </div>
        <div class="rv-options ${field === 'hanzi' ? 'rv-options-hanzi' : ''}">
          ${opts.map((o) => `<button class="rv-opt ${field === 'hanzi' ? 'hanzi' : ''}" data-id="${o.id}" onclick="Review.choose('${o.id}', this)">${esc(o[field])}</button>`).join('')}
        </div>`;
      footer = '';
    }

    sess.innerHTML = `
      <div class="rv-top">
        <button class="icon-btn" onclick="Review.exit()" aria-label="Thoát lượt ôn">${Icon.svg('x')}</button>
        <div class="meter rv-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <span class="rv-count">${this.index + 1}/${this.total}</span>
      </div>
      <div class="rv-body">${body}</div>
      <div class="rv-feedback" id="rv-feedback" aria-live="polite"></div>
      <div class="rv-footer" id="rv-footer">${footer}</div>
    `;

    // Audio-first exercises play immediately (we are inside the user's tap)
    if (item.type === 'listen' || item.type === 'intro' || item.type === 'meaning') AudioEngine.speak(w.hanzi);
    if (item.type === 'write') this.mountWriter(w);
  },

  introDone() {
    const item = this.current();
    if (item) {
      this.stats.words.add(item.word.id);
      StorageManager.updateWordSrs(item.word.id, 'hard'); // registers firstSeen, due again tomorrow
    }
    this.advance();
  },

  reveal() {
    const back = document.getElementById('rv-back');
    if (!back || !back.hidden) return;
    back.hidden = false;
    const hint = document.getElementById('rv-hint');
    if (hint) hint.hidden = true;
    const btn = document.getElementById('rv-reveal-btn');
    if (btn) btn.hidden = true;
    const grades = document.getElementById('rv-grades');
    if (grades) grades.hidden = false;
    const item = this.current();
    if (item) AudioEngine.speak(item.word.hanzi);
  },

  grade(quality) {
    const item = this.current();
    if (!item) return;
    StorageManager.updateWordSrs(item.word.id, quality);
    this.stats.words.add(item.word.id);
    if (quality === 'again') {
      this.stats.wrong++;
      this.queue.push({ word: item.word, type: 'meaning' });
      this.total = this.queue.length;
      AudioEngine.playWrongSound();
    } else {
      this.stats.correct++;
      AudioEngine.playCorrectSound();
    }
    this.advance();
  },

  choose(id, btn) {
    if (this.answered) return;
    this.answered = true;
    const item = this.current();
    const w = item.word;
    const ok = id === w.id;
    document.querySelectorAll('.rv-opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === w.id) b.classList.add('correct');
    });
    if (!ok && btn) btn.classList.add('wrong');
    this.stats.words.add(w.id);
    if (ok) {
      this.stats.correct++;
      AudioEngine.playCorrectSound();
      StorageManager.updateWordSrs(w.id, 'good');
    } else {
      this.stats.wrong++;
      AudioEngine.playWrongSound();
      StorageManager.updateWordSrs(w.id, 'again');
      this.queue.push({ word: w, type: 'flip' });
      this.total = this.queue.length;
    }
    if (item.type === 'listen' || item.type === 'reverse') AudioEngine.speak(w.hanzi);
    this.showFeedback(ok, w);
  },

  showFeedback(ok, w) {
    const fb = document.getElementById('rv-feedback');
    if (fb) {
      fb.className = `rv-feedback ${ok ? 'ok' : 'bad'}`;
      fb.innerHTML = `
        <div class="rv-fb-head">${Icon.svg(ok ? 'check' : 'x')}<b>${ok ? 'Chính xác' : 'Chưa đúng, sẽ ôn lại cuối lượt'}</b></div>
        <div class="rv-fb-word"><span class="hanzi">${w.hanzi}</span> <span class="py">${Tone.html(w.pinyin)}</span> · ${UI.esc(w.meaning)}
        ${w.hanviet ? `<span class="hv-badge">${UI.esc(w.hanviet)}</span>` : ''}</div>`;
    }
    const footer = document.getElementById('rv-footer');
    if (footer) {
      footer.innerHTML = `<button class="btn ${ok ? 'btn-primary' : 'btn-outline'} btn-block" id="rv-next" onclick="Review.advance()">Tiếp tục</button>`;
      const next = document.getElementById('rv-next');
      if (next && next.focus) next.focus();
    }
  },

  loadWriterLib() {
    if (typeof HanziWriter !== 'undefined') return Promise.resolve(true);
    return UI.loadScript(HANZI_WRITER_URL).then(() => typeof HanziWriter !== 'undefined').catch(() => false);
  },

  mountWriter(w) {
    const ch = [...w.hanzi].find((c) => /[一-龥]/.test(c));
    this.loadWriterLib().then((ok) => {
      const target = document.getElementById('rv-writer');
      if (!target || this.current() == null || this.current().word.id !== w.id) return;
      if (!ok) {
        // Library unavailable (offline): fall back to a choice question
        this.queue[this.index] = { word: w, type: 'reverse' };
        this.render();
        return;
      }
      const size = Math.min(240, (target.parentElement && target.parentElement.clientWidth) || 240);
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      target.innerHTML = '';
      this._writer = HanziWriter.create('rv-writer', ch, {
        width: size, height: size, padding: 14, showCharacter: false, showOutline: false,
        strokeColor: dark ? '#f1f5f9' : '#1d1a1f', drawingColor: '#d93829', highlightColor: '#059669', outlineColor: dark ? '#334155' : '#e7e1dd'
      });
      let mistakes = 0;
      this._writer.quiz({
        showHintAfterMisses: 3,
        onMistake: () => { mistakes++; },
        onComplete: () => {
          if (this.answered) return;
          this.answered = true;
          const ok = mistakes <= 3;
          this.stats.words.add(w.id);
          StorageManager.recordDailyAction('writing', 1);
          if (ok) { this.stats.correct++; AudioEngine.playCorrectSound(); StorageManager.updateWordSrs(w.id, mistakes === 0 ? 'easy' : 'good'); }
          else { this.stats.wrong++; AudioEngine.playWrongSound(); StorageManager.updateWordSrs(w.id, 'again'); }
          AudioEngine.speak(w.hanzi);
          this.showFeedback(ok, w);
        }
      });
    });
  },

  writeGiveUp() {
    const item = this.current();
    if (!item || this.answered) return;
    this.answered = true;
    if (this._writer && this._writer.showCharacter) {
      this._writer.cancelQuiz();
      this._writer.showOutline();
      this._writer.animateCharacter();
    }
    this.stats.wrong++;
    this.stats.words.add(item.word.id);
    StorageManager.updateWordSrs(item.word.id, 'again');
    AudioEngine.speak(item.word.hanzi);
    this.showFeedback(false, item.word);
  },

  advance() {
    this.index++;
    this._writer = null;
    if (this.index >= this.queue.length) this.renderSummary();
    else this.render();
  },

  renderSummary() {
    const sess = document.getElementById('review-session');
    this.active = false;
    const total = this.stats.correct + this.stats.wrong;
    const pct = total ? Math.round(this.stats.correct / total * 100) : 100;
    AudioEngine.playVictorySound();
    StorageManager.addXP(10, 'Hoàn thành lượt ôn');
    if (sess) {
      sess.innerHTML = `
        <div class="rv-summary">
          <div class="summary-trophy">${Icon.svg('trophy')}</div>
          <h2>Xong lượt ôn${this.mode === 'listen' ? ' nghe' : ''}!</h2>
          <p class="muted-sm">Lịch ôn của ${this.stats.words.size} từ đã được cập nhật.</p>
          <div class="due-row">
            <div><b>${this.stats.words.size}</b><span>từ đã ôn</span></div>
            <div><b>${pct}%</b><span>trả lời đúng</span></div>
            <div><b>+10</b><span>XP</span></div>
          </div>
          <div class="rv-summary-actions">
            <button class="btn btn-primary btn-block" onclick="Review.exit(); App.navigateTo('home')">Về trang Hôm nay</button>
            <button class="btn btn-outline btn-block" onclick="Review.exit()">Luyện thêm dạng bài khác</button>
          </div>
        </div>`;
    }
    if (App.updateDashboardStats) App.updateDashboardStats();
  }
};

/**
 * ReviewScope: lets each learner choose which HSK courses (or specific lessons) to review,
 * instead of mixing every level together. Saved with the account via StorageManager.setReviewScope.
 */
const ReviewScope = {
  draft: null,

  lessons() {
    return (window.CHINESE_DATA && window.CHINESE_DATA.lessons) || [];
  },

  levels() {
    return [...new Set(this.lessons().map((l) => l.hsk))].sort();
  },

  /** Default selection for a learner who has not chosen yet: the levels of lessons they have reached. */
  suggested() {
    const user = StorageManager.getCurrentUser();
    const reached = new Set([...((user && user.completedLessons) || []), (user && user.lastActiveLesson) || 1]);
    const levels = [...new Set(this.lessons().filter((l) => reached.has(l.id)).map((l) => l.hsk))];
    return { levels: levels.length ? levels : [1], lessons: [] };
  },

  current() {
    return StorageManager.getReviewScope() || this.suggested();
  },

  /** Short human label, e.g. "HSK 1 + HSK 2" or "Bài 3, 4, 5". */
  label(scope = StorageManager.getReviewScope()) {
    if (!scope) return 'tất cả bài đã học';
    if (scope.lessons && scope.lessons.length) {
      const ids = scope.lessons;
      return ids.length > 4 ? `${ids.length} bài đã chọn` : `Bài ${ids.join(', ')}`;
    }
    if (scope.levels && scope.levels.length) return scope.levels.map((h) => `HSK ${h}`).join(' + ');
    return 'tất cả bài';
  },

  counts(scope) {
    const words = StorageManager.scopeWords((window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [], scope);
    const limit = (typeof Prefs !== 'undefined' && Prefs.data.newPerDay) || 10;
    const q = StorageManager.getReviewQueue(window.CHINESE_DATA.all_words, limit, scope);
    return { words: words.length, due: q.due.length, fresh: q.fresh.length };
  },

  isEmpty(scope) {
    return !(scope.lessons && scope.lessons.length) && !(scope.levels && scope.levels.length);
  },

  /** Picker markup bound to this.draft; `where` is 'card' (Review hub) or 'dialog'. */
  pickerHtml(where) {
    const d = this.draft;
    const byLesson = d.lessons.length > 0;
    const words = (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
    const levelChips = this.levels().map((h) => {
      const n = words.filter((w) => w.hsk === h).length;
      const lessonIds = this.lessons().filter((l) => l.hsk === h).map((l) => l.id);
      const on = !byLesson && d.levels.includes(h);
      const partial = byLesson && lessonIds.some((id) => d.lessons.includes(id));
      return `<button type="button" class="scope-chip ${on ? 'on' : ''} ${partial ? 'partial' : ''}" aria-pressed="${on}" aria-label="HSK ${h}, bài ${Math.min(...lessonIds)} đến ${Math.max(...lessonIds)}, ${n} từ" onclick="ReviewScope.toggleLevel(${h}, '${where}')">
        <span class="scope-check">${on ? Icon.svg('check') : ''}</span><span><b>HSK ${h}</b><small>Bài ${Math.min(...lessonIds)}–${Math.max(...lessonIds)} · ${n} từ</small></span></button>`;
    }).join('');
    const lessonGroups = this.levels().map((h) => `
      <div class="scope-group">
        <div class="scope-group-head"><b>HSK ${h}</b>
          <button type="button" class="btn-ghost btn-sm" onclick="ReviewScope.selectLessons(${h}, true, '${where}')">Chọn cả khóa</button>
          <button type="button" class="btn-ghost btn-sm" onclick="ReviewScope.selectLessons(${h}, false, '${where}')">Bỏ chọn</button></div>
        <div class="scope-lessons">${this.lessons().filter((l) => l.hsk === h).map((l) => {
          const on = byLesson ? d.lessons.includes(l.id) : d.levels.includes(h);
          return `<label class="scope-lesson ${on ? 'on' : ''}"><input type="checkbox" ${on ? 'checked' : ''} aria-label="Bài ${l.id}: ${UI.esc(l.title)}" onchange="ReviewScope.toggleLesson(${l.id}, this.checked, '${where}')"><span class="sl-num">${l.id}</span><span class="sl-title hanzi">${l.zh_title}</span></label>`;
        }).join('')}</div>
      </div>`).join('');
    const empty = this.isEmpty(d);
    const c = empty ? { words: 0, due: 0, fresh: 0 } : this.counts(d);
    return `
      <div class="scope-chips" role="group" aria-label="Chọn khóa HSK">${levelChips}</div>
      <details class="scope-details" ${byLesson ? 'open' : ''}>
        <summary>Hoặc chọn từng bài cụ thể${byLesson ? ` · đang chọn ${d.lessons.length} bài` : ''}</summary>
        ${lessonGroups}
      </details>
      <p class="scope-summary ${empty ? 'warn' : ''}" aria-live="polite">${empty
        ? 'Hãy chọn ít nhất một khóa hoặc một bài.'
        : `Phạm vi: <b>${UI.esc(this.label(d))}</b> · ${c.words} từ · <b>${c.due}</b> thẻ đến hạn · <b>${c.fresh}</b> từ mới hôm nay`}</p>`;
  },

  rerender(where) {
    if (where === 'dialog') {
      const body = document.getElementById('scope-dialog-body');
      if (body) body.innerHTML = this.pickerHtml('dialog');
      const start = document.getElementById('scope-dialog-start');
      if (start) start.disabled = this.isEmpty(this.draft);
    } else {
      // Inline card saves immediately
      if (!this.isEmpty(this.draft)) StorageManager.setReviewScope(this.draft);
      this.renderCard();
      if (App.updateDashboardStats) App.updateDashboardStats();
    }
  },

  toggleLevel(h, where) {
    const d = this.draft;
    if (d.lessons.length) { d.lessons = []; d.levels = [h]; }
    else if (d.levels.includes(h)) d.levels = d.levels.filter((x) => x !== h);
    else d.levels = [...d.levels, h].sort();
    this.rerender(where);
  },

  /** Switch to lesson mode, starting from the lessons implied by the selected levels. */
  toLessonMode() {
    const d = this.draft;
    if (!d.lessons.length) d.lessons = this.lessons().filter((l) => d.levels.includes(l.hsk)).map((l) => l.id);
    d.levels = [];
  },

  toggleLesson(id, on, where) {
    this.toLessonMode();
    const d = this.draft;
    d.lessons = on ? [...new Set([...d.lessons, id])] : d.lessons.filter((x) => x !== id);
    this.normalise();
    this.rerender(where);
  },

  selectLessons(h, on, where) {
    this.toLessonMode();
    const ids = this.lessons().filter((l) => l.hsk === h).map((l) => l.id);
    const d = this.draft;
    d.lessons = on ? [...new Set([...d.lessons, ...ids])] : d.lessons.filter((x) => !ids.includes(x));
    this.normalise();
    this.rerender(where);
  },

  /** If the chosen lessons are exactly whole levels, store them as levels (shorter label). */
  normalise() {
    const d = this.draft;
    if (!d.lessons.length) return;
    const set = new Set(d.lessons);
    const full = this.levels().filter((h) => this.lessons().filter((l) => l.hsk === h).every((l) => set.has(l.id)));
    const covered = this.lessons().filter((l) => full.includes(l.hsk)).map((l) => l.id);
    if (covered.length === d.lessons.length) { d.levels = full; d.lessons = []; }
  },

  /** Inline card in the Review hub. */
  renderCard() {
    const el = document.getElementById('review-scope-card');
    if (!el) return;
    this.draft = JSON.parse(JSON.stringify(this.current()));
    el.innerHTML = `
      <div class="today-card-head"><h3>Phạm vi ôn tập</h3><span class="muted-sm">Lưu theo tài khoản</span></div>
      <p class="muted-sm">Chọn khóa hoặc bài bạn muốn ôn. Hàng đợi, luyện nghe và luyện thanh điệu chỉ lấy từ trong phạm vi này.</p>
      ${this.pickerHtml('card')}`;
  },

  /** Modal shown before the first review session. */
  openPicker(onStart) {
    this.draft = JSON.parse(JSON.stringify(this.current()));
    const wrap = document.createElement('div');
    wrap.className = 'dialog-backdrop';
    wrap.innerHTML = `
      <div class="dialog scope-dialog" role="dialog" aria-modal="true" aria-labelledby="scope-dialog-title">
        <h3 id="scope-dialog-title">Bạn muốn ôn phần nào?</h3>
        <p class="dialog-body">Chọn khóa HSK hoặc từng bài. Lựa chọn được lưu lại, đổi bất cứ lúc nào trong tab Ôn tập.</p>
        <div id="scope-dialog-body">${this.pickerHtml('dialog')}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn-outline" data-act="cancel">Để sau</button>
          <button type="button" class="btn btn-primary" id="scope-dialog-start" data-act="start" ${this.isEmpty(this.draft) ? 'disabled' : ''}>Bắt đầu ôn</button>
        </div>
      </div>`;
    const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 180); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) { close(); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'cancel') { close(); return; }
      if (b.dataset.act === 'start' && !this.isEmpty(this.draft)) {
        StorageManager.setReviewScope(this.draft);
        close();
        this.renderCard();
        if (onStart) onStart();
      }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
  }
};

if (typeof window !== 'undefined') {
  window.ReviewScope = ReviewScope;
  window.Review = Review;
}
/**
 * ToneDrill: tone perception training.
 *
 *   single  one-syllable words: hear it, pick tone 1-4
 *   pair    two-syllable words: pick the tone of each syllable (2nd may be neutral)
 *
 * Practice in pairs is the approach most Mandarin teachers recommend, because most words are
 * two syllables and each tone combination has its own contour. Words whose spoken tones differ
 * from the written ones (3+3 sandhi, 一, 不) are left out so the answer always matches what the
 * learner hears; those rules are explained in Kiến thức > Thanh điệu.
 *
 * Per-pair accuracy is kept on this device (localStorage) to surface the learner's weakest pairs.
 */
const ToneDrill = {
  STATS_KEY: 'hnm_tone_stats_v1',
  SESSION: 10,
  mode: 'pair',
  items: [],
  index: 0,
  score: 0,
  picked: [],
  answered: false,

  /** SVG contour for a tone (1-5) drawn on the 5-level pitch scale. */
  contour(t, cls = '') {
    const paths = { 1: 'M4 6 H28', 2: 'M4 18 L28 6', 3: 'M4 14 Q14 30 28 8', 4: 'M4 6 L28 26', 5: 'M16 18 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0' };
    return `<svg class="tone-contour t${t} ${cls}" viewBox="0 0 32 32" aria-hidden="true"><path d="${paths[t] || paths[5]}"/></svg>`;
  },

  NAMES: { 1: 'Thanh 1 · ngang', 2: 'Thanh 2 · sắc', 3: 'Thanh 3 · hỏi', 4: 'Thanh 4 · huyền nặng', 5: 'Thanh nhẹ' },
  SHORT: { 1: 'Thanh 1', 2: 'Thanh 2', 3: 'Thanh 3', 4: 'Thanh 4', 5: 'Nhẹ' },

  loadStats() {
    try { return JSON.parse(localStorage.getItem(this.STATS_KEY)) || {}; } catch (e) { return {}; }
  },

  saveStat(key, ok) {
    const s = this.loadStats();
    s[key] = s[key] || { n: 0, ok: 0 };
    s[key].n++;
    if (ok) s[key].ok++;
    try { localStorage.setItem(this.STATS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  },

  /** Weakest tone pairs with at least 3 attempts, lowest accuracy first. */
  weakest(limit = 3) {
    return Object.entries(this.loadStats())
      .filter(([k, v]) => k.includes('-') && v.n >= 3)
      .map(([k, v]) => ({ key: k, acc: v.ok / v.n, n: v.n }))
      .sort((a, b) => a.acc - b.acc)
      .slice(0, limit);
  },

  /** Words usable for the drill, with their syllable tones. */
  pool(mode) {
    const words = (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
    const out = [];
    words.forEach((w) => {
      const chars = [...w.hanzi].filter((c) => /[一-龥]/.test(c));
      if (!w.pinyin || chars.some((c) => c === '一' || c === '不')) return;
      const syl = Tone.splitWord(w.pinyin.replace(/\s+/g, ''));
      if (!syl || syl.length !== chars.length) return;
      const tones = syl.map((s) => s.tone);
      if (mode === 'single' && chars.length === 1 && tones[0] <= 4) out.push({ word: w, tones });
      if (mode === 'pair' && chars.length === 2 && tones[0] <= 4 && !(tones[0] === 3 && tones[1] === 3)) out.push({ word: w, tones });
    });
    return out;
  },

  start(mode = 'pair') {
    this.mode = mode;
    const user = StorageManager.getCurrentUser();
    const maxLesson = Math.max(3, (user && user.lastActiveLesson) || 1, ...(((user && user.completedLessons) || [])));
    let pool = this.pool(mode);
    const scope = StorageManager.getReviewScope();
    if (scope) {
      // Learner chose which courses / lessons to practise
      const ids = new Set(StorageManager.scopeWords(pool.map((p) => p.word), scope).map((w) => w.id));
      const inScope = pool.filter((p) => ids.has(p.word.id));
      if (inScope.length >= 4) pool = inScope;
    } else {
      const reached = pool.filter((p) => typeof p.word.lesson === 'number' && p.word.lesson <= maxLesson);
      if (reached.length >= this.SESSION) pool = reached;
    }

    // Bias towards the learner's weakest pairs
    const weak = new Set(this.weakest(3).map((w) => w.key));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const favoured = shuffled.filter((p) => weak.has(p.tones.join('-')));
    const rest = shuffled.filter((p) => !weak.has(p.tones.join('-')));
    this.items = [...favoured.slice(0, 4), ...rest].slice(0, this.SESSION).sort(() => Math.random() - 0.5);
    this.index = 0;
    this.score = 0;
    App.navigateTo('tones');
    this.render();
  },

  render() {
    const box = document.getElementById('tones-session');
    const hub = document.getElementById('tones-hub');
    if (!box) return;
    if (hub) hub.hidden = true;
    box.hidden = false;
    const item = this.items[this.index];
    if (!item) { this.renderSummary(); return; }
    this.picked = item.tones.map(() => 0);
    this.answered = false;
    const n = item.tones.length;
    const rows = item.tones.map((_, si) => `
      <div class="tone-row">
        ${n > 1 ? `<span class="tone-row-label">Âm tiết ${si + 1}</span>` : ''}
        <div class="tone-btns">
          ${[1, 2, 3, 4].concat(si > 0 ? [5] : []).map((t) => `
            <button class="tone-btn" data-s="${si}" data-t="${t}" onclick="ToneDrill.pick(${si}, ${t})" aria-label="${this.NAMES[t]}">
              ${this.contour(t)}<span>${this.SHORT[t]}</span>
            </button>`).join('')}
        </div>
      </div>`).join('');

    box.innerHTML = `
      <div class="rv-top">
        <button class="icon-btn" onclick="ToneDrill.exit()" aria-label="Thoát">${Icon.svg('x')}</button>
        <div class="meter rv-meter" aria-hidden="true"><i style="width:${Math.round(this.index / this.items.length * 100)}%"></i></div>
        <span class="rv-count">${this.index + 1}/${this.items.length}</span>
      </div>
      <div class="rv-card tone-card">
        <span class="rv-tag">${n > 1 ? 'Cặp thanh' : 'Một âm tiết'}</span>
        <button class="rv-listen" onclick="ToneDrill.play()" aria-label="Nghe lại">${Icon.svg('sound')}</button>
        <p class="rv-hint" id="tone-hint">Nghe rồi chọn thanh${n > 1 ? ' cho từng âm tiết' : ''}. Chạm loa để nghe lại.</p>
        <div class="tone-reveal" id="tone-reveal" hidden></div>
      </div>
      <div class="tone-rows">${rows}</div>
      <div class="rv-feedback" id="tone-feedback" aria-live="polite"></div>
      <div class="rv-footer" id="tone-footer"></div>
    `;
    this.play();
  },

  play() {
    const item = this.items[this.index];
    if (item) AudioEngine.speak(item.word.hanzi);
  },

  pick(si, t) {
    if (this.answered) return;
    this.picked[si] = t;
    document.querySelectorAll(`.tone-btn[data-s="${si}"]`).forEach((b) => b.classList.toggle('sel', +b.dataset.t === t));
    if (this.picked.every((p) => p > 0)) this.check();
  },

  check() {
    const item = this.items[this.index];
    this.answered = true;
    const ok = item.tones.every((t, i) => t === this.picked[i]);
    if (ok) { this.score++; AudioEngine.playCorrectSound(); } else { AudioEngine.playWrongSound(); }
    this.saveStat(item.tones.join('-'), ok);
    item.tones.forEach((t) => this.saveStat(String(t), ok));

    document.querySelectorAll('.tone-btn').forEach((b) => {
      b.disabled = true;
      const s = +b.dataset.s;
      const t = +b.dataset.t;
      if (item.tones[s] === t) b.classList.add('correct');
      else if (this.picked[s] === t) b.classList.add('wrong');
    });
    const w = item.word;
    const reveal = document.getElementById('tone-reveal');
    if (reveal) {
      reveal.hidden = false;
      reveal.innerHTML = `
        <div class="rv-hanzi hanzi">${w.hanzi}</div>
        <div class="rv-py py">${Tone.html(w.pinyin)}</div>
        <div class="tone-contours">${item.tones.map((t) => this.contour(t, 'lg')).join('')}</div>
        <div class="rv-mean">${UI.esc(w.meaning)}</div>`;
    }
    const hint = document.getElementById('tone-hint');
    if (hint) hint.hidden = true;
    const fb = document.getElementById('tone-feedback');
    if (fb) {
      fb.className = `rv-feedback ${ok ? 'ok' : 'bad'}`;
      fb.innerHTML = `<div class="rv-fb-head">${Icon.svg(ok ? 'check' : 'x')}<b>${ok ? 'Chính xác' : `Đáp án: ${item.tones.map((t) => this.SHORT[t]).join(' + ')}`}</b></div>`;
    }
    const footer = document.getElementById('tone-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="ToneDrill.play()">${Icon.svg('sound')}<span>Nghe lại</span></button>
        <button class="btn btn-primary" id="tone-next" onclick="ToneDrill.next()">Tiếp tục</button>`;
      footer.classList.add('rv-footer-2');
    }
  },

  next() {
    this.index++;
    this.render();
  },

  renderSummary() {
    const box = document.getElementById('tones-session');
    const pct = Math.round(this.score / Math.max(1, this.items.length) * 100);
    AudioEngine.playVictorySound();
    StorageManager.addXP(10, 'Luyện thanh điệu');
    StorageManager.recordDailyAction('speech', 1);
    const weak = this.weakest(3);
    box.innerHTML = `
      <div class="rv-summary">
        <div class="summary-trophy">${Icon.svg('trophy')}</div>
        <h2>${pct >= 80 ? 'Tai nghe rất tốt!' : 'Xong lượt luyện thanh'}</h2>
        <div class="due-row">
          <div><b>${this.score}/${this.items.length}</b><span>câu đúng</span></div>
          <div><b>${pct}%</b><span>chính xác</span></div>
          <div><b>+10</b><span>XP</span></div>
        </div>
        ${weak.length ? `<p class="muted-sm">Cặp thanh bạn hay nhầm: ${weak.map((w) => `<b>${w.key.replace('-', '+').replace('5', 'nhẹ')}</b> (${Math.round(w.acc * 100)}%)`).join(', ')}. Lượt sau sẽ ưu tiên các cặp này.</p>` : ''}
        <div class="rv-summary-actions">
          <button class="btn btn-primary btn-block" onclick="ToneDrill.start('${this.mode}')">Luyện thêm 10 câu</button>
          <button class="btn btn-outline btn-block" onclick="ToneDrill.exit()">Về trang Luyện thanh điệu</button>
        </div>
      </div>`;
  },

  exit() {
    const box = document.getElementById('tones-session');
    const hub = document.getElementById('tones-hub');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    if (hub) hub.hidden = false;
    this.renderHub();
  },

  renderHub() {
    const el = document.getElementById('tones-stats');
    if (!el) return;
    const s = this.loadStats();
    const cell = (k) => {
      const v = s[k];
      if (!v) return '<span class="tp-cell tp-none">–</span>';
      const acc = Math.round(v.ok / v.n * 100);
      return `<span class="tp-cell ${acc >= 80 ? 'tp-good' : acc >= 50 ? 'tp-mid' : 'tp-bad'}" title="${v.ok}/${v.n} câu đúng">${acc}%</span>`;
    };
    el.innerHTML = `
      <div class="tp-grid" role="table" aria-label="Độ chính xác theo cặp thanh">
        <span class="tp-head" role="columnheader">1 \\ 2</span>
        ${[1, 2, 3, 4, 5].map((b) => `<span class="tp-head" role="columnheader">${b === 5 ? 'nhẹ' : b}</span>`).join('')}
        ${[1, 2, 3, 4].map((a) => `<span class="tp-head" role="rowheader">${a}</span>${[1, 2, 3, 4, 5].map((b) => (a === 3 && b === 3 ? '<span class="tp-cell tp-none" title="3+3 đọc thành 2+3">2+3</span>' : cell(`${a}-${b}`))).join('')}`).join('')}
      </div>
      <p class="muted-sm">Ô trống là cặp chưa luyện. Hàng là thanh của âm tiết đầu, cột là âm tiết sau.</p>`;
  }
};

if (typeof window !== 'undefined') {
  window.ToneDrill = ToneDrill;
}
/**
 * Guide: "Kiến thức" reference pages for Vietnamese learners.
 * Sections: tones & tone sandhi, radicals (bộ thủ), measure words, numbers / time / dates, HSK exam.
 * Examples are pulled from the app's own curriculum so every example links to a word
 * the learner will meet in the lessons.
 */
const Guide = {
  section: 'tones',

  SECTIONS: [
    { id: 'tones', label: 'Thanh điệu' },
    { id: 'phonetics', label: 'Ngữ âm' },
    { id: 'hanzi', label: 'Chữ Hán' },
    { id: 'radicals', label: 'Bộ thủ' },
    { id: 'measure', label: 'Lượng từ' },
    { id: 'numbers', label: 'Số, giờ, ngày' },
    { id: 'hsk', label: 'Kỳ thi HSK' }
  ],

  // Common radicals for HSK 1-2: [radical, Hán Việt name, meaning, example characters containing it]
  RADICALS: [
    ['亻', 'Nhân đứng', 'người', '你他们住做休候'],
    ['口', 'Khẩu', 'miệng, nói, ăn', '吃喝叫吗呢哪唱'],
    ['女', 'Nữ', 'phụ nữ', '她妈姐妹好奶'],
    ['子', 'Tử', 'con, trẻ nhỏ', '字学孩'],
    ['氵', 'Thủy (ba chấm thủy)', 'nước, chất lỏng', '没汉洗游海酒'],
    ['扌', 'Thủ (tài gảy)', 'tay, động tác bằng tay', '打找把换'],
    ['忄', 'Tâm đứng', 'tim, tình cảm', '忙快怕'],
    ['心', 'Tâm', 'tim, suy nghĩ', '想您意思息'],
    ['日', 'Nhật', 'mặt trời, ngày, thời gian', '明时晚早昨是星'],
    ['月', 'Nguyệt / Nhục', 'mặt trăng; thịt, bộ phận cơ thể', '朋有脑期服'],
    ['木', 'Mộc', 'cây, gỗ', '机树椅桌校杯'],
    ['讠', 'Ngôn', 'lời nói', '说话语请谢课认识读'],
    ['宀', 'Miên', 'mái nhà', '家字安室客'],
    ['艹', 'Thảo', 'cỏ, cây cối', '茶菜苹花'],
    ['辶', 'Sước', 'bước đi, di chuyển', '这还进远近过道送'],
    ['门', 'Môn', 'cửa', '们问间'],
    ['钅', 'Kim', 'kim loại', '钱钟'],
    ['纟', 'Mịch', 'sợi tơ', '红给经绍级'],
    ['土', 'Thổ', 'đất', '地在坐场块'],
    ['灬', 'Hỏa (bốn chấm hỏa)', 'lửa, nhiệt', '点热照'],
    ['足', 'Túc', 'chân, đi lại', '跑跳路跟'],
    ['目', 'Mục', 'mắt, nhìn', '看睡眼睛'],
    ['贝', 'Bối', 'vỏ sò, tiền bạc', '贵费'],
    ['马', 'Mã', 'ngựa (thường gợi âm "ma")', '妈吗骑'],
    ['饣', 'Thực', 'ăn uống', '饭饿馆饺'],
    ['衤', 'Y', 'quần áo', '衬裤'],
    ['禾', 'Hòa', 'lúa, ngũ cốc', '和种秋'],
    ['⺮', 'Trúc', 'tre, đồ làm bằng tre', '笔第等答篮'],
    ['田', 'Điền', 'ruộng', '男'],
    ['力', 'Lực', 'sức lực', '动助加'],
    ['刂', 'Đao đứng', 'dao, cắt', '到别'],
    ['阝', 'Phụ / Ấp', 'gò đất (bên trái) / vùng đất (bên phải)', '院阴那都'],
    ['疒', 'Nạch', 'bệnh tật', '病疼'],
    ['雨', 'Vũ', 'mưa, thời tiết', '雪'],
    ['王', 'Ngọc', 'ngọc, đồ quý', '玩现球班'],
    ['广', 'Nghiễm', 'mái hiên, nhà rộng', '店床'],
    ['犭', 'Khuyển', 'chó, động vật', '狗猫'],
    ['鸟', 'Điểu', 'chim', '鸡'],
    ['页', 'Hiệt', 'đầu, trang', '题颜'],
    ['走', 'Tẩu', 'chạy, đi', '起'],
    ['见', 'Kiến', 'nhìn thấy', '觉现视'],
    ['攵', 'Phộc', 'đánh nhẹ, hành động', '教'],
    ['冫', 'Băng', 'băng, lạnh', '冷次准'],
    ['白', 'Bạch', 'màu trắng', '的百']
  ],

  // [measure word, pinyin, Hán Việt, used for, example zh, example py, example vi]
  MEASURES: [
    ['个', 'gè', 'cá', 'người, đồ vật nói chung (dùng nhiều nhất)', '一个人', 'yí gè rén', 'một người'],
    ['本', 'běn', 'bản', 'sách, vở', '两本书', 'liǎng běn shū', 'hai quyển sách'],
    ['张', 'zhāng', 'trương', 'vật mỏng, phẳng: giấy, vé, bàn, giường', '一张票', 'yì zhāng piào', 'một tấm vé'],
    ['杯', 'bēi', 'bôi', 'cốc, chén (đồ uống)', '一杯茶', 'yì bēi chá', 'một cốc trà'],
    ['件', 'jiàn', 'kiện', 'áo; sự việc', '一件衣服', 'yí jiàn yīfu', 'một chiếc áo'],
    ['条', 'tiáo', 'điều', 'vật dài, mảnh: quần, cá, đường, sông', '一条鱼', 'yì tiáo yú', 'một con cá'],
    ['只', 'zhī', 'chích', 'con vật nhỏ; một chiếc trong đôi', '一只猫', 'yì zhī māo', 'một con mèo'],
    ['辆', 'liàng', 'lượng', 'xe cộ', '一辆车', 'yí liàng chē', 'một chiếc xe'],
    ['口', 'kǒu', 'khẩu', 'số người trong gia đình', '我家有四口人', 'wǒ jiā yǒu sì kǒu rén', 'nhà tôi có bốn người'],
    ['块', 'kuài', 'khối', 'miếng, cục; đồng (tiền, khẩu ngữ)', '五块钱', 'wǔ kuài qián', 'năm đồng'],
    ['位', 'wèi', 'vị', 'người (lịch sự, trang trọng)', '一位老师', 'yí wèi lǎoshī', 'một thầy giáo'],
    ['双', 'shuāng', 'song', 'đôi: giày, đũa, tất', '一双鞋', 'yì shuāng xié', 'một đôi giày'],
    ['家', 'jiā', 'gia', 'cửa hàng, công ty, nhà hàng', '一家饭馆', 'yì jiā fànguǎn', 'một nhà hàng'],
    ['次', 'cì', 'thứ', 'số lần', '去过一次', 'qù guo yí cì', 'đã đi một lần'],
    ['些', 'xiē', 'ta', 'một vài, một ít', '一些水果', 'yì xiē shuǐguǒ', 'một ít hoa quả'],
    ['把', 'bǎ', 'bả', 'đồ vật có tay cầm: ghế, ô, dao', '一把椅子', 'yì bǎ yǐzi', 'một cái ghế']
  ],

  words() {
    return (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
  },

  /** App words containing a character (shortest first), for live examples. */
  wordsWith(ch, limit = 3) {
    return this.words().filter((w) => w.hanzi.includes(ch)).sort((a, b) => a.hanzi.length - b.hanzi.length).slice(0, limit);
  },

  /** First app word whose tones match a pattern, e.g. [1, 4]. Skips 一/不 and 3+3. */
  wordForPair(a, b) {
    if (!this._pairs) {
      this._pairs = {};
      this.words().forEach((w) => {
        const chars = [...w.hanzi].filter((c) => /[一-龥]/.test(c));
        if (chars.length !== 2 || chars.some((c) => c === '一' || c === '不')) return;
        const syl = Tone.splitWord((w.pinyin || '').replace(/\s+/g, ''));
        if (!syl || syl.length !== 2) return;
        const key = `${syl[0].tone}-${syl[1].tone}`;
        if (!this._pairs[key] || (w.lesson || 99) < (this._pairs[key].lesson || 99)) this._pairs[key] = w;
      });
    }
    return this._pairs[`${a}-${b}`] || null;
  },

  open(section) {
    if (section) this.section = section;
    if (App.currentTab !== 'guide') App.navigateTo('guide');
    else this.render();
  },

  wordChip(w) {
    return `<button class="word-chip" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')" aria-label="Nghe ${UI.esc(w.hanzi)}">
      <span class="hanzi">${w.hanzi}</span><span class="py">${Tone.html(w.pinyin)}</span><span class="wc-mean">${UI.esc(w.meaning)}</span></button>`;
  },

  say(zh, py, vi) {
    return `<button class="say-line" onclick="AudioEngine.speak('${jsArg(zh)}')"><span class="hanzi">${zh}</span><span class="py">${Tone.html(py)}</span><span class="say-vi">${UI.esc(vi)}</span>${Icon.svg('sound')}</button>`;
  },

  render() {
    const nav = document.getElementById('guide-nav');
    const body = document.getElementById('guide-body');
    if (!nav || !body) return;
    nav.innerHTML = this.SECTIONS.map((s) => `<button class="seg-btn ${s.id === this.section ? 'active' : ''}" onclick="Guide.open('${s.id}')">${s.label}</button>`).join('');
    const fn = { tones: 'renderTones', phonetics: 'renderPhonetics', hanzi: 'renderHanzi', radicals: 'renderRadicals', measure: 'renderMeasures', numbers: 'renderNumbers', hsk: 'renderHsk' }[this.section] || 'renderTones';
    body.innerHTML = this[fn]();
  },

  renderTones() {
    const c = (t) => ToneDrill.contour(t, 'lg');
    const tones = [
      [1, 'mā', '妈', 'Cao và bằng, giữ giọng ở mức cao (gần thanh ngang nhưng cao hơn).'],
      [2, 'má', '麻', 'Đi lên từ giữa lên cao, giống hỏi lại "hả?" (gần thanh sắc).'],
      [3, 'mǎ', '马', 'Xuống thấp rồi lên. Trong câu thường chỉ đọc nửa đầu: thấp và trầm.'],
      [4, 'mà', '骂', 'Rơi mạnh từ cao xuống thấp, dứt khoát như ra lệnh.'],
      [5, 'ma', '吗', 'Thanh nhẹ: ngắn, nhẹ, không dấu, cao độ phụ thuộc âm tiết trước.']
    ];
    const pairCell = (a, b) => {
      if (a === 3 && b === 3) return '<td class="pair-sandhi" title="3+3 đọc thành 2+3">đọc 2+3</td>';
      const w = this.wordForPair(a, b);
      return w ? `<td><button class="pair-word" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')"><span class="hanzi">${w.hanzi}</span><span class="py">${Tone.html(w.pinyin)}</span></button></td>` : '<td class="pair-empty">–</td>';
    };
    return `
      <article class="guide-card">
        <h3>4 thanh và thanh nhẹ</h3>
        <p class="guide-lead">Cùng âm <b>ma</b> nhưng khác thanh là khác nghĩa. Chạm vào từng dòng để nghe.</p>
        <div class="tone-list">
          ${tones.map(([t, py, zh, desc]) => `
            <button class="tone-item" onclick="AudioEngine.speak('${zh}')">
              ${c(t)}
              <span class="tone-item-main"><b class="t${t}">${py}</b> <span class="hanzi">${zh}</span></span>
              <span class="tone-item-desc">${desc}</span>
            </button>`).join('')}
        </div>
        <button class="btn btn-primary" onclick="ToneDrill.start('pair')">${Icon.svg('headphones')}<span>Luyện nghe phân biệt thanh</span></button>
      </article>

      <article class="guide-card">
        <h3>Quy tắc biến điệu</h3>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">3 + 3</span><div><b>Hai thanh 3 đứng liền nhau: thanh 3 đầu đọc thành thanh 2.</b>
            <p>Vẫn viết dấu thanh 3, chỉ đổi khi đọc.</p>${this.say('你好', 'nǐ hǎo', 'đọc là ní hǎo')}${this.say('很好', 'hěn hǎo', 'đọc là hén hǎo')}</div></div>
          <div class="rule"><span class="rule-tag">不</span><div><b>不 bù đứng trước thanh 4 đọc thành bú.</b>
            <p>Trước thanh 1, 2, 3 giữ nguyên bù.</p>${this.say('不是', 'bú shì', 'không phải')}${this.say('不去', 'bú qù', 'không đi')}${this.say('不好', 'bù hǎo', 'không tốt')}</div></div>
          <div class="rule"><span class="rule-tag">一</span><div><b>一 yī đổi thanh theo âm tiết phía sau.</b>
            <p>Trước thanh 4 (và 个) đọc yí; trước thanh 1, 2, 3 đọc yì; khi đếm số, đọc số thứ tự hoặc đứng cuối từ thì giữ yī.</p>${this.say('一个', 'yí gè', 'một cái')}${this.say('一天', 'yì tiān', 'một ngày')}${this.say('第一', 'dì yī', 'thứ nhất')}</div></div>
          <div class="rule"><span class="rule-tag">nhẹ</span><div><b>Thanh nhẹ thường gặp ở trợ từ và âm tiết lặp.</b>
            <p>吗, 呢, 的, 了 và âm tiết thứ hai của 妈妈, 爸爸, 谢谢.</p>${this.say('谢谢', 'xièxie', 'cảm ơn')}</div></div>
        </div>
      </article>

      <article class="guide-card">
        <h3>Bảng 20 cặp thanh</h3>
        <p class="guide-lead">Phần lớn từ tiếng Trung có hai âm tiết, nên luyện theo cặp giúp nhớ đường nét giọng của cả từ. Hàng là thanh âm tiết đầu, cột là âm tiết sau. Ví dụ lấy từ giáo trình.</p>
        <div class="table-scroll">
          <table class="pair-table">
            <thead><tr><th></th><th>+ 1</th><th>+ 2</th><th>+ 3</th><th>+ 4</th><th>+ nhẹ</th></tr></thead>
            <tbody>${[1, 2, 3, 4].map((a) => `<tr><th>${a}</th>${[1, 2, 3, 4, 5].map((b) => pairCell(a, b)).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      </article>`;
  },

  /** Intro-deck notes (lesson 0) split by topic. */
  introNotes(kind) {
    if (typeof Notes === 'undefined') return [];
    const all = Notes.forLesson(0);
    const isHsk = (n) => /HSK/i.test(n.t + n.x.slice(0, 40));
    if (kind === 'phonetics') return all.filter((n) => n.c === 'ngu_am');
    if (kind === 'hsk') return all.filter((n) => n.c !== 'ngu_am' && isHsk(n));
    return all.filter((n) => n.c !== 'ngu_am' && !isHsk(n));
  },

  notesCards(notes, empty) {
    if (!notes.length) return `<p class="muted-sm">${empty}</p>`;
    return notes.map((n) => `<article class="guide-card note-card">${Notes.item(n, false)}</article>`).join('');
  },

  renderPhonetics() {
    return `
      <article class="guide-card">
        <h3>Phát âm cho người Việt</h3>
        <p class="guide-lead">Tổng hợp từ bài giảng phần phiên âm: so sánh âm tiếng Trung với âm tiếng Việt, các quy tắc viết pinyin và những điểm dễ đọc sai. Bảng đầy đủ 23 thanh mẫu và 36 vận mẫu có ở mục Bảng Pinyin.</p>
        <button class="btn btn-outline" onclick="PinyinController.openModal()">${Icon.svg('music')}<span>Mở Bảng Pinyin</span></button>
      </article>
      ${this.notesCards(this.introNotes('phonetics'), 'Chưa có ghi chú ngữ âm.')}`;
  },

  renderHanzi() {
    return `
      <article class="guide-card">
        <h3>Chữ Hán: cấu tạo và cách viết</h3>
        <p class="guide-lead">Từ bài giảng nhập môn: chữ Hán được tạo ra thế nào, chữ giản thể và phồn thể, các nét cơ bản và quy tắc thứ tự nét. Mỗi từ trong bài học còn có phần <b>Chiết tự</b> (bấm "Chiết tự" dưới thẻ từ) để nhớ chữ theo bộ thành phần.</p>
      </article>
      ${this.notesCards(this.introNotes('hanzi'), 'Chưa có ghi chú về chữ Hán.')}`;
  },

  renderRadicals() {
    return `
      <article class="guide-card">
        <h3>Vì sao nên học bộ thủ</h3>
        <p class="guide-lead">Phần lớn chữ Hán ghép từ một bộ chỉ nghĩa và một phần gợi âm. Ví dụ 妈 = 女 (phụ nữ, gợi nghĩa) + 马 (mã, gợi âm "ma"). Nhận ra bộ thủ giúp đoán nghĩa chữ mới và nhớ lâu hơn. Dưới đây là ${this.RADICALS.length} bộ thủ gặp nhiều nhất ở trình độ sơ cấp.</p>
      </article>
      <div class="radical-grid">
        ${this.RADICALS.map(([r, name, mean, chars]) => {
          const ex = [...chars].map((ch) => this.wordsWith(ch, 1)[0]).filter(Boolean).slice(0, 3);
          return `
          <article class="radical-card">
            <div class="radical-head">
              <span class="radical-glyph hanzi">${r}</span>
              <div><b>${name}</b><span>${mean}</span></div>
            </div>
            <div class="radical-chars hanzi">${[...chars].map((ch) => `<button onclick="App.navigateTo('writer'); HanziController.loadCharacter('${ch}')" aria-label="Tập viết ${ch}">${ch}</button>`).join('')}</div>
            ${ex.length ? `<div class="radical-ex">${ex.map((w) => this.wordChip(w)).join('')}</div>` : ''}
          </article>`;
        }).join('')}
      </div>
      <p class="muted-sm guide-foot">Chạm vào một chữ để luyện viết theo thứ tự nét.</p>`;
  },

  renderMeasures() {
    return `
      <article class="guide-card">
        <h3>Lượng từ là gì</h3>
        <p class="guide-lead">Tiếng Trung giống tiếng Việt: giữa số và danh từ phải có lượng từ (một <b>quyển</b> sách = 一<b>本</b>书). Cấu trúc: <b>Số + Lượng từ + Danh từ</b>. Trước lượng từ, số 2 dùng 两 liǎng chứ không dùng 二.</p>
      </article>
      <div class="measure-list">
        ${this.MEASURES.map(([mw, py, hv, use, zh, epy, vi]) => `
          <article class="measure-card">
            <button class="measure-head" onclick="AudioEngine.speak('${mw}')">
              <span class="radical-glyph hanzi">${mw}</span>
              <span><b class="py">${Tone.html(py)}</b> <span class="hv-badge">${hv}</span><span class="measure-use">${use}</span></span>
            </button>
            ${this.say(zh, epy, vi)}
          </article>`).join('')}
      </div>`;
  },

  renderNumbers() {
    const nums = [['零', 'líng', 0], ['一', 'yī', 1], ['二', 'èr', 2], ['三', 'sān', 3], ['四', 'sì', 4], ['五', 'wǔ', 5], ['六', 'liù', 6], ['七', 'qī', 7], ['八', 'bā', 8], ['九', 'jiǔ', 9], ['十', 'shí', 10]];
    return `
      <article class="guide-card">
        <h3>Số đếm</h3>
        <div class="num-grid">${nums.map(([zh, py, n]) => `<button class="num-cell" onclick="AudioEngine.speak('${zh}')"><span class="num-n">${n}</span><span class="hanzi">${zh}</span><span class="py">${Tone.html(py)}</span></button>`).join('')}</div>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">11–99</span><div><b>Ghép như tiếng Việt: chục + đơn vị.</b>${this.say('十五', 'shíwǔ', '15')}${this.say('二十', 'èrshí', '20')}${this.say('九十九', 'jiǔshíjiǔ', '99')}</div></div>
          <div class="rule"><span class="rule-tag">百 千 万</span><div><b>Trăm, nghìn, vạn (10.000).</b><p>Tiếng Trung đếm theo vạn: 10.000 là 一万, 100.000 là 十万.</p>${this.say('一百', 'yìbǎi', '100')}${this.say('三千', 'sānqiān', '3.000')}${this.say('一万', 'yíwàn', '10.000')}</div></div>
          <div class="rule"><span class="rule-tag">两</span><div><b>Trước lượng từ dùng 两, khi đếm dùng 二.</b>${this.say('两个人', 'liǎng gè rén', 'hai người')}${this.say('第二', 'dì èr', 'thứ hai')}</div></div>
        </div>
      </article>

      <article class="guide-card">
        <h3>Giờ giấc</h3>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">点 分</span><div><b>Giờ + 点, phút + 分.</b>${this.say('现在几点？', 'xiànzài jǐ diǎn?', 'bây giờ mấy giờ?')}${this.say('八点十分', 'bā diǎn shí fēn', '8 giờ 10 phút')}</div></div>
          <div class="rule"><span class="rule-tag">半 刻</span><div><b>半 = rưỡi, 一刻 = 15 phút, 差 = kém.</b>${this.say('七点半', 'qī diǎn bàn', '7 giờ rưỡi')}${this.say('三点一刻', 'sān diǎn yí kè', '3 giờ 15')}${this.say('差五分十点', 'chà wǔ fēn shí diǎn', '10 giờ kém 5')}</div></div>
          <div class="rule"><span class="rule-tag">Thứ tự</span><div><b>Thời gian đứng trước động từ, từ lớn đến nhỏ.</b>${this.say('我早上七点起床', 'wǒ zǎoshang qī diǎn qǐchuáng', 'tôi dậy lúc 7 giờ sáng')}</div></div>
        </div>
      </article>

      <article class="guide-card">
        <h3>Ngày tháng và thứ</h3>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">年 月 日</span><div><b>Viết từ lớn đến nhỏ: năm, tháng, ngày.</b><p>Năm đọc từng chữ số. Trong khẩu ngữ, 号 hào thường thay 日 rì.</p>${this.say('二〇二六年十一月二十号', 'èr líng èr liù nián shíyī yuè èrshí hào', 'ngày 20 tháng 11 năm 2026')}</div></div>
          <div class="rule"><span class="rule-tag">星期</span><div><b>Thứ = 星期 + số (thứ hai là 星期一). Chủ nhật là 星期天 hoặc 星期日.</b>${this.say('今天星期五', 'jīntiān xīngqīwǔ', 'hôm nay thứ sáu')}${this.say('星期天', 'xīngqītiān', 'chủ nhật')}</div></div>
        </div>
      </article>

      <article class="guide-card">
        <h3>Tiền</h3>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">块 毛</span><div><b>Khẩu ngữ dùng 块 (đồng) và 毛 (hào); văn viết dùng 元 và 角. 1 块 = 10 毛.</b>${this.say('多少钱？', 'duōshao qián?', 'bao nhiêu tiền?')}${this.say('三块五', 'sān kuài wǔ', '3,5 đồng')}</div></div>
        </div>
      </article>`;
  },

  /** "40 bài … HSK 1 (Bài 1–15), HSK 2 (Bài 16–30), HSK 3 (Bài 31–40) … N từ" computed from the data. */
  courseSummary() {
    const lessons = (window.CHINESE_DATA && window.CHINESE_DATA.lessons) || [];
    const levels = [...new Set(lessons.map((l) => l.hsk))].sort();
    const parts = levels.map((h) => {
      const ids = lessons.filter((l) => l.hsk === h).map((l) => l.id);
      return `HSK ${h} (Bài ${Math.min(...ids)}–${Math.max(...ids)})`;
    });
    return `${lessons.length} bài của Hán Ngữ Master gồm ${parts.join(', ')}, tổng cộng ${this.words().length} từ, kèm Hán Việt và chiết tự cho người Việt.`;
  },

  renderHsk() {
    return `
      <article class="guide-card">
        <h3>Giáo trình này tương ứng với gì</h3>
        <p class="guide-lead">${this.courseSummary()}</p>
      </article>
      <article class="guide-card">
        <h3>HSK 3.0: kỳ thi đang đổi định dạng</h3>
        <p class="guide-lead">Theo các nguồn tổng hợp (chưa phải văn bản chính thức), chuẩn HSK mới có 9 cấp chia 3 bậc: Sơ cấp (1–3), Trung cấp (4–6), Cao cấp (7–9).</p>
        <div class="table-scroll">
          <table class="pair-table hsk-table">
            <thead><tr><th>Cấp</th><th>HSK 2.0 (cũ)</th><th>HSK 3.0, đề cương 2026 (cộng dồn)</th></tr></thead>
            <tbody>
              <tr><th>1</th><td>150 từ</td><td>khoảng 300 từ</td></tr>
              <tr><th>2</th><td>300 từ</td><td>khoảng 500 từ</td></tr>
              <tr><th>3</th><td>600 từ</td><td>khoảng 1.000 từ, có thi nói</td></tr>
            </tbody>
          </table>
        </div>
        <ul class="guide-points">
          <li>Kỳ thi đầu tiên theo định dạng mới được nhiều nguồn nhắc tới vào <b>tháng 12/2026</b>; các kỳ thi trước đó vẫn dùng HSK 2.0.</li>
          <li>Các nguồn chưa thống nhất về số từ và ngày áp dụng. <b>Hãy kiểm tra trên trang chính thức chinesetest.cn</b> trước khi đăng ký thi.</li>
          <li>Từ vựng trong giáo trình vẫn là nền tảng chung cho cả hai định dạng: luyện vững ${this.words().length} từ này là chuẩn bị tốt cho các cấp sơ cấp.</li>
        </ul>
      </article>
      ${this.introNotes('hsk').length ? `<h3 class="section-label">Từ bài giảng nhập môn</h3>${this.notesCards(this.introNotes('hsk'), '')}` : ''}`;
  }
};

if (typeof window !== 'undefined') {
  window.Guide = Guide;
}
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
      if (typeof ReviewScope !== 'undefined') setText('today-scope-label', StorageManager.hasChosenScope() ? ReviewScope.label() : 'chưa chọn (bấm để chọn khóa)');
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
