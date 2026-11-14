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
  'customWords', 'streak', 'lastActiveDate', 'quizHighScores', 'updatedAt'
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
    const key = (user.email || user.username || '').toLowerCase();
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

  async checkSession() {
    const sb = getSupabase();
    if (!sb) return this.getCurrentUser();   // offline: use cached session
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session && data.session.user) {
        return await this._hydrateFromCloud(data.session.user);
      }
      // No valid cloud session -> forget stale local session
      localStorage.removeItem(this.KEY_CURRENT_USER);
      return null;
    } catch (e) {
      console.warn('Supabase getSession failed:', e);
      return this.getCurrentUser();
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
      return { success: true, user, needsConfirm: false };
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
      this.updateStreak();
      return { success: true, user };
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
    }
    this.saveCurrentUser(user);
    return isCompleted;
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
    item.reviewCount = (item.reviewCount || 0) + 1;
    item.lastStudied = Date.now();

    const intervals = [1, 2, 4, 7, 14, 30];
    if (quality === 'again') {
      item.srsLevel = 0;
    } else if (quality === 'good') {
      item.srsLevel = Math.min(intervals.length - 1, (item.srsLevel || 0) + 1);
    } else if (quality === 'easy') {
      item.srsLevel = Math.min(intervals.length - 1, (item.srsLevel || 0) + 2);
    }

    const daysToAdd = intervals[item.srsLevel];
    item.nextReview = Date.now() + daysToAdd * 86400000;
    this.saveCurrentUser(user);
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
