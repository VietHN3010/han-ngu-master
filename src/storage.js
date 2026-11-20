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
