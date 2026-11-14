/**
 * Storage Manager: LocalStorage persistence for user progress, SRS, custom words, and bookmarks.
 */
const StorageManager = {
  KEY_DATA: 'chinese_app_userdata_v1',

  getData() {
    try {
      const raw = localStorage.getItem(this.KEY_DATA);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch(e) {
      console.error('Failed to read localStorage:', e);
    }
    return {
      bookmarks: [],         // array of word ids
      wordProgress: {},      // { [wordId]: { srsLevel: 0..5, nextReview: timestamp, lastStudied: timestamp } }
      customWords: [],       // array of user-added word objects
      streak: 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      quizHighScores: {
        totalQuizzes: 0,
        totalCorrect: 0,
        bestScore: 0
      }
    };
  },

  saveData(data) {
    try {
      localStorage.setItem(this.KEY_DATA, JSON.stringify(data));
    } catch(e) {
      console.error('Failed to write localStorage:', e);
    }
  },

  updateStreak() {
    const data = this.getData();
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = data.lastActiveDate;

    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastDate === yesterday) {
        data.streak += 1;
      } else {
        data.streak = 1;
      }
      data.lastActiveDate = today;
      this.saveData(data);
    }
    return data.streak;
  },

  toggleBookmark(wordId) {
    const data = this.getData();
    const idx = data.bookmarks.indexOf(wordId);
    if (idx > -1) {
      data.bookmarks.splice(idx, 1);
    } else {
      data.bookmarks.push(wordId);
    }
    this.saveData(data);
    return idx === -1; // true if added
  },

  isBookmarked(wordId) {
    const data = this.getData();
    return data.bookmarks.includes(wordId);
  },

  updateWordSrs(wordId, quality) {
    // quality: 'again' (0), 'good' (+1), 'easy' (+2)
    const data = this.getData();
    if (!data.wordProgress[wordId]) {
      data.wordProgress[wordId] = { srsLevel: 0, reviewCount: 0 };
    }
    const item = data.wordProgress[wordId];
    item.reviewCount = (item.reviewCount || 0) + 1;
    item.lastStudied = Date.now();

    const intervals = [1, 2, 4, 7, 14, 30]; // days
    if (quality === 'again') {
      item.srsLevel = 0;
    } else if (quality === 'good') {
      item.srsLevel = Math.min(intervals.length - 1, (item.srsLevel || 0) + 1);
    } else if (quality === 'easy') {
      item.srsLevel = Math.min(intervals.length - 1, (item.srsLevel || 0) + 2);
    }

    const daysToAdd = intervals[item.srsLevel];
    item.nextReview = Date.now() + daysToAdd * 86400000;
    this.saveData(data);
  },

  addCustomWord(word) {
    const data = this.getData();
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
    data.customWords.push(newWord);
    this.saveData(data);
    return newWord;
  },

  deleteCustomWord(wordId) {
    const data = this.getData();
    data.customWords = data.customWords.filter(w => w.id !== wordId);
    this.saveData(data);
  },

  recordQuiz(correctCount, totalCount) {
    const data = this.getData();
    data.quizHighScores.totalQuizzes += 1;
    data.quizHighScores.totalCorrect += correctCount;
    const scorePct = Math.round((correctCount / totalCount) * 100);
    if (scorePct > (data.quizHighScores.bestScore || 0)) {
      data.quizHighScores.bestScore = scorePct;
    }
    this.saveData(data);
  },

  getStats(totalAppWords) {
    const data = this.getData();
    const progressValues = Object.values(data.wordProgress);
    const mastered = progressValues.filter(p => p.srsLevel >= 3).length;
    const learning = progressValues.filter(p => p.srsLevel > 0 && p.srsLevel < 3).length;
    const customCount = data.customWords.length;
    const totalWords = totalAppWords + customCount;

    return {
      streak: data.streak || 1,
      mastered,
      learning,
      notStarted: Math.max(0, totalWords - mastered - learning),
      bookmarksCount: data.bookmarks.length,
      customCount,
      totalQuizzes: data.quizHighScores.totalQuizzes || 0,
      bestScore: data.quizHighScores.bestScore || 0
    };
  }
};
