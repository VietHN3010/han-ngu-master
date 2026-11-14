/**
 * Storage & Auth Manager: Supabase Cloud Authentication & Multi-Device Realtime Persistence
 * Seamless cross-device synchronization (PC <-> Mobile) with offline localStorage fallback.
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
    } catch(e) {
      console.warn('Supabase client init failed:', e);
    }
  }
  return _supabaseClient;
}

const StorageManager = {
  KEY_USERS: 'chinese_app_users_v3',
  KEY_CURRENT_USER: 'chinese_app_session_v3',

  getAllUsers() {
    try {
      const raw = localStorage.getItem(this.KEY_USERS);
      return raw ? JSON.parse(raw) : {};
    } catch(e) {
      return {};
    }
  },

  saveAllUsers(users) {
    try {
      localStorage.setItem(this.KEY_USERS, JSON.stringify(users));
    } catch(e) {
      console.error('Error saving users:', e);
    }
  },

  getCurrentUser() {
    const userKey = localStorage.getItem(this.KEY_CURRENT_USER);
    if (!userKey) return null;
    const users = this.getAllUsers();
    return users[userKey] || null;
  },

  saveCurrentUser(user) {
    if (!user) return;
    const key = (user.email || user.username || '').toLowerCase();
    if (!key) return;
    const users = this.getAllUsers();
    users[key] = user;
    this.saveAllUsers(users);
    this.syncToCloud(user);
  },

  async syncToCloud(user) {
    const sb = getSupabase();
    if (!sb || !user) return;
    try {
      await sb.auth.updateUser({
        data: {
          full_name: user.fullName,
          username: user.username,
          completedLessons: user.completedLessons || [],
          lastActiveLesson: user.lastActiveLesson || 1,
          bookmarks: user.bookmarks || [],
          wordProgress: user.wordProgress || {},
          customWords: user.customWords || [],
          streak: user.streak || 1,
          lastActiveDate: user.lastActiveDate,
          quizHighScores: user.quizHighScores || {}
        }
      });
    } catch(e) {
      // Quiet fail if not online
    }
  },

  async checkSession() {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        if (data && data.session && data.session.user) {
          const u = data.session.user;
          const meta = u.user_metadata || {};
          const loadedUser = {
            id: u.id,
            email: u.email,
            fullName: meta.full_name || meta.fullName || 'Học viên Hán Ngữ',
            username: meta.username || u.email.split('@')[0],
            completedLessons: meta.completedLessons || [],
            lastActiveLesson: meta.lastActiveLesson || 1,
            bookmarks: meta.bookmarks || [],
            wordProgress: meta.wordProgress || {},
            customWords: meta.customWords || [],
            streak: meta.streak || 1,
            lastActiveDate: meta.lastActiveDate || new Date().toISOString().slice(0, 10),
            quizHighScores: meta.quizHighScores || { totalQuizzes: 0, totalCorrect: 0, bestScore: 0 }
          };
          this.saveCurrentUser(loadedUser);
          localStorage.setItem(this.KEY_CURRENT_USER, loadedUser.email.toLowerCase());
          return loadedUser;
        }
      } catch(e) {
        console.warn('Supabase getSession failed:', e);
      }
    }
    return this.getCurrentUser();
  },

  async register(fullName, email, username, password) {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUser = username.trim().toLowerCase();

    if (!cleanName) return { success: false, message: 'Vui lòng nhập họ và tên của bạn!' };
    if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, message: 'Vui lòng nhập địa chỉ Email hợp lệ!' };
    if (!cleanUser || cleanUser.length < 3) return { success: false, message: 'Tên hiển thị tối thiểu 3 ký tự!' };
    if (!password || password.length < 6) return { success: false, message: 'Mật khẩu tối thiểu 6 ký tự!' };

    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: cleanName,
              username: cleanUser,
              completedLessons: [],
              lastActiveLesson: 1,
              bookmarks: [],
              wordProgress: {},
              customWords: [],
              streak: 1,
              lastActiveDate: new Date().toISOString().slice(0, 10),
              quizHighScores: { totalQuizzes: 0, totalCorrect: 0, bestScore: 0 }
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered')) {
            return { success: false, message: 'Email này đã được đăng ký. Bạn vui lòng chọn Đăng nhập hoặc Quên mật khẩu!' };
          }
          return { success: false, message: error.message };
        }

        const newUser = {
          id: data.user ? data.user.id : 'usr_' + Date.now(),
          fullName: cleanName,
          email: cleanEmail,
          username: cleanUser,
          completedLessons: [],
          lastActiveLesson: 1,
          bookmarks: [],
          wordProgress: {},
          customWords: [],
          streak: 1,
          lastActiveDate: new Date().toISOString().slice(0, 10),
          quizHighScores: { totalQuizzes: 0, totalCorrect: 0, bestScore: 0 }
        };

        this.saveCurrentUser(newUser);
        localStorage.setItem(this.KEY_CURRENT_USER, cleanEmail);

        return { 
          success: true, 
          user: newUser,
          hasSession: !!data.session
        };
      } catch(err) {
        return { success: false, message: 'Lỗi kết nối máy chủ: ' + err.message };
      }
    }

    // Local fallback
    const newUser = {
      fullName: cleanName,
      email: cleanEmail,
      username: cleanUser,
      password: password,
      completedLessons: [],
      lastActiveLesson: 1,
      bookmarks: [],
      wordProgress: {},
      customWords: [],
      streak: 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      quizHighScores: { totalQuizzes: 0, totalCorrect: 0, bestScore: 0 }
    };
    this.saveCurrentUser(newUser);
    localStorage.setItem(this.KEY_CURRENT_USER, cleanEmail);
    return { success: true, user: newUser, hasSession: true };
  },

  async login(emailOrUser, password) {
    const cleanInput = emailOrUser.trim().toLowerCase();
    if (!cleanInput) return { success: false, message: 'Vui lòng nhập Email hoặc tên đăng nhập!' };
    if (!password) return { success: false, message: 'Vui lòng nhập mật khẩu!' };

    const sb = getSupabase();
    if (sb) {
      try {
        let targetEmail = cleanInput;
        if (!targetEmail.includes('@')) {
          const allUsers = this.getAllUsers();
          const found = Object.values(allUsers).find(u => (u.username && u.username.toLowerCase() === cleanInput) || (u.email && u.email.toLowerCase() === cleanInput));
          if (found && found.email) {
            targetEmail = found.email;
          } else {
            return { success: false, message: 'Vui lòng đăng nhập bằng địa chỉ Email bạn đã đăng ký để đồng bộ đám mây!' };
          }
        }

        const { data, error } = await sb.auth.signInWithPassword({
          email: targetEmail,
          password: password
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            return { success: false, message: 'Sai email hoặc mật khẩu! Vui lòng kiểm tra lại.' };
          }
          if (error.message.includes('Email not confirmed')) {
            return { success: false, message: 'Email chưa được xác nhận. Vui lòng mở hộp thư email (hoặc hòm Spam) để bấm xác nhận tài khoản!' };
          }
          return { success: false, message: error.message };
        }

        const meta = data.user.user_metadata || {};
        const loadedUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: meta.full_name || meta.fullName || 'Học viên Hán Ngữ',
          username: meta.username || targetEmail.split('@')[0],
          completedLessons: meta.completedLessons || [],
          lastActiveLesson: meta.lastActiveLesson || 1,
          bookmarks: meta.bookmarks || [],
          wordProgress: meta.wordProgress || {},
          customWords: meta.customWords || [],
          streak: meta.streak || 1,
          lastActiveDate: meta.lastActiveDate || new Date().toISOString().slice(0, 10),
          quizHighScores: meta.quizHighScores || { totalQuizzes: 0, totalCorrect: 0, bestScore: 0 }
        };

        this.saveCurrentUser(loadedUser);
        localStorage.setItem(this.KEY_CURRENT_USER, loadedUser.email.toLowerCase());
        this.updateStreak();
        return { success: true, user: loadedUser };
      } catch(err) {
        return { success: false, message: 'Lỗi đăng nhập: ' + err.message };
      }
    }

    // Local fallback
    const allUsers = this.getAllUsers();
    const user = allUsers[cleanInput];
    if (!user || user.password !== password) {
      return { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu!' };
    }
    localStorage.setItem(this.KEY_CURRENT_USER, cleanInput);
    this.updateStreak();
    return { success: true, user };
  },

  async forgotPassword(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Vui lòng nhập địa chỉ Email hợp lệ!' };
    }

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin
        });

        if (error) {
          return { success: false, message: error.message };
        }

        return { 
          success: true, 
          message: `Đã gửi liên kết khôi phục mật khẩu vào hòm thư ${cleanEmail}. Bạn vui lòng kiểm tra Hộp thư đến (hoặc hòm thư Spam) để đặt lại mật khẩu nhé!` 
        };
      } catch(err) {
        return { success: false, message: 'Lỗi kết nối máy chủ: ' + err.message };
      }
    }
    return { success: false, message: 'Chưa thể kết nối tới dịch vụ khôi phục mật khẩu.' };
  },

  async updateNewPassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Mật khẩu mới tối thiểu 6 ký tự!' };
    }
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.auth.updateUser({ password: newPassword });
        if (error) return { success: false, message: error.message };
        return { success: true, user: data.user };
      } catch(e) {
        return { success: false, message: e.message };
      }
    }
    return { success: false, message: 'Không thể kết nối máy chủ.' };
  },

  async logout() {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch(e) {}
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
