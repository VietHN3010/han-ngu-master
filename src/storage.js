/**
 * Storage & Auth Manager: Multi-user authentication and per-account cloud-like persistence.
 */
const StorageManager = {
  KEY_USERS: 'chinese_app_users_v2',
  KEY_CURRENT_USER: 'chinese_app_session_v2',

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
    const username = localStorage.getItem(this.KEY_CURRENT_USER);
    if (!username) return null;
    const users = this.getAllUsers();
    return users[username] || null;
  },

  saveCurrentUser(user) {
    if (!user || !user.username) return;
    const users = this.getAllUsers();
    users[user.username] = user;
    this.saveAllUsers(users);
  },

  register(fullName, username, password) {
    const cleanUser = username.trim().toLowerCase();
    const cleanName = fullName.trim();
    if (!cleanName) return { success: false, message: 'Vui lòng nhập họ và tên của bạn!' };
    if (!cleanUser || cleanUser.length < 3) return { success: false, message: 'Tên đăng nhập tối thiểu 3 ký tự!' };
    if (!password || password.length < 4) return { success: false, message: 'Mật khẩu tối thiểu 4 ký tự!' };

    const users = this.getAllUsers();
    if (users[cleanUser]) {
      return { success: false, message: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác!' };
    }

    const newUser = {
      fullName: cleanName,
      username: cleanUser,
      password: password,
      createdAt: Date.now(),
      completedLessons: [],    // list of lesson IDs: [1, 2, ...]
      lastActiveLesson: 1,      // default lesson 1
      bookmarks: [],            // word IDs
      wordProgress: {},         // { [wordId]: { srsLevel, reviewCount, nextReview } }
      customWords: [],          // user created words
      streak: 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      quizHighScores: {
        totalQuizzes: 0,
        totalCorrect: 0,
        bestScore: 0
      }
    };

    users[cleanUser] = newUser;
    this.saveAllUsers(users);
    localStorage.setItem(this.KEY_CURRENT_USER, cleanUser);
    return { success: true, user: newUser };
  },

  login(username, password) {
    const cleanUser = username.trim().toLowerCase();
    const users = this.getAllUsers();
    const user = users[cleanUser];

    if (!user || user.password !== password) {
      return { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu!' };
    }

    localStorage.setItem(this.KEY_CURRENT_USER, cleanUser);
    this.updateStreak();
    return { success: true, user };
  },

  logout() {
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
