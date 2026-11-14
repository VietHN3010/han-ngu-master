/**
 * Lesson Browser & Detail Viewer (HSK1 & HSK2, Lessons 1-30)
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

    let filtered = this.lessons;
    if (this.activeFilter === 'hsk1') filtered = filtered.filter(l => l.hsk === 1);
    else if (this.activeFilter === 'hsk2') filtered = filtered.filter(l => l.hsk === 2);

    container.innerHTML = filtered.map(l => {
      const isCompleted = StorageManager.isLessonCompleted(l.id);
      return `
        <div class="lesson-card ${isCompleted ? 'lesson-card-completed' : ''}" onclick="LessonBrowser.openLesson(${l.id})">
          <div class="lesson-card-header">
            <span class="lesson-num-pill">Bài ${l.id} • HSK ${l.hsk}</span>
            ${isCompleted ? '<span class="lesson-status-completed">✅ Đã học xong</span>' : `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${l.words ? l.words.length : 0} từ</span>`}
          </div>
          <div class="lesson-card-zh">${l.zh_title}</div>
          <div class="lesson-card-vi">${l.title}</div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; padding-top:0.5rem; border-top:1px solid var(--border-light);">
            <span>💬 ${l.dialogue ? l.dialogue.length : 0} câu thoại</span>
            <span>💡 ${l.grammar ? l.grammar.length : 0} ngữ pháp</span>
          </div>
        </div>
      `;
    }).join('');
  },

  openLesson(lessonId) {
    const lesson = this.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    this.currentLesson = lesson;

    StorageManager.setLastActiveLesson(lessonId);

    document.getElementById('lesson-list-view').style.display = 'none';
    const detailView = document.getElementById('lesson-detail-view');
    detailView.style.display = 'block';

    document.getElementById('lesson-detail-title').innerText = `Bài ${lesson.id}: ${lesson.zh_title}`;
    document.getElementById('lesson-detail-subtitle').innerText = `${lesson.pinyin_title || ''} • ${lesson.title}`;

    this.updateCompleteButton();
    this.renderVocabTab();
    this.renderDialogueTab();
    this.renderGrammarTab();
    this.switchLessonTab('vocab');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  closeLesson() {
    document.getElementById('lesson-detail-view').style.display = 'none';
    document.getElementById('lesson-list-view').style.display = 'block';
    this.renderLessonList();
    App.updateDashboardStats();
  },

  updateCompleteButton() {
    if (!this.currentLesson) return;
    const isCompleted = StorageManager.isLessonCompleted(this.currentLesson.id);
    const btn = document.getElementById('btn-toggle-complete-lesson');
    if (btn) {
      if (isCompleted) {
        btn.innerHTML = '✅ Đã học xong bài này';
        btn.className = 'btn btn-sm btn-lesson-done';
      } else {
        btn.innerHTML = '⬜ Đánh dấu đã học xong';
        btn.className = 'btn btn-outline btn-sm';
      }
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

  switchLessonTab(tab) {
    document.querySelectorAll('.lesson-subtab').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`lesson-tab-btn-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');

    document.getElementById('lesson-subview-vocab').style.display = tab === 'vocab' ? 'block' : 'none';
    document.getElementById('lesson-subview-dialogue').style.display = tab === 'dialogue' ? 'block' : 'none';
    document.getElementById('lesson-subview-grammar').style.display = tab === 'grammar' ? 'block' : 'none';
  },

  renderVocabTab() {
    const container = document.getElementById('lesson-vocab-container');
    if (!container || !this.currentLesson) return;

    container.innerHTML = `
      <div class="vocab-cards-list">
        ${this.currentLesson.words.map(w => {
          const isFav = StorageManager.isBookmarked(w.id);
          return `
            <div class="vocab-item-card">
              <div class="vocab-item-left">
                <button class="btn-speaker" onclick="AudioEngine.speak('${w.hanzi}')">🔊</button>
                <div class="vocab-item-info">
                  <div style="display:flex; align-items:baseline; gap:0.4rem;">
                    <span class="vocab-item-hanzi">${w.hanzi}</span>
                    <span class="vocab-item-py">${w.pinyin}</span>
                  </div>
                  <div class="vocab-item-mean">${w.meaning}</div>
                  ${w.example ? `<div style="font-size:0.78rem; color:var(--text-muted); font-style:italic; margin-top:0.25rem;">💡 ${typeof escapeHtml === 'function' ? escapeHtml(w.example) : w.example}</div>` : ''}
                  <div class="vocab-item-meta">${w.pos ? `<span class="flashcard-pos" style="margin:0.15rem 0.35rem 0 0;">${w.pos}</span>` : ''}${w.hanviet ? `Hán Việt: ${w.hanviet}` : ''}</div>
                </div>
              </div>
              <div style="display:flex; gap:0.3rem; flex-shrink:0;">
                <button class="btn btn-outline btn-sm" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${w.hanzi}');" title="Tập viết">✍️</button>
                <button class="btn btn-outline btn-sm" onclick="LessonBrowser.toggleBookmark('${w.id}', this)" title="Lưu">
                  ${isFav ? '★' : '☆'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderDialogueTab() {
    const container = document.getElementById('lesson-dialogue-content');
    if (!container || !this.currentLesson) return;

    if (!this.currentLesson.dialogue || !this.currentLesson.dialogue.length) {
      container.innerHTML = '<p style="color:var(--text-muted); padding:1rem; font-size:0.85rem;">Chưa có dữ liệu bài khóa cho bài học này.</p>';
      return;
    }

    container.innerHTML = this.currentLesson.dialogue.map((d, idx) => `
      <div style="padding:0.85rem 1rem; border-radius:var(--radius-md); background:var(--bg-card); border:1px solid var(--border); margin-bottom:0.6rem; display:flex; align-items:flex-start; justify-content:space-between; gap:0.75rem;">
        <div style="min-width:0; flex:1; word-break:break-word;">
          <div style="font-weight:700; color:var(--secondary); font-size:0.8rem; margin-bottom:0.15rem;">${d.speaker || `Nhân vật ${idx + 1}`}:</div>
          <div class="hanzi" style="font-size:1.15rem; color:var(--text-main); font-weight:600; margin-bottom:0.15rem;">${d.zh}</div>
          <div style="color:var(--primary); font-size:0.82rem; font-weight:600; margin-bottom:0.15rem;">${d.py}</div>
          <div style="color:var(--text-muted); font-size:0.82rem;">${d.vi}</div>
        </div>
        <button class="btn-speaker" onclick="AudioEngine.speak('${d.zh}')" title="Nghe câu" style="font-size:1.2rem; flex-shrink:0;">
          🔊
        </button>
      </div>
    `).join('');
  },

  renderGrammarTab() {
    const container = document.getElementById('lesson-grammar-content');
    if (!container || !this.currentLesson) return;

    if (!this.currentLesson.grammar || !this.currentLesson.grammar.length) {
      container.innerHTML = '<p style="color:var(--text-muted); padding:1rem; font-size:0.85rem;">Chưa có điểm ngữ pháp nổi bật cho bài này.</p>';
      return;
    }

    container.innerHTML = this.currentLesson.grammar.map((g, idx) => `
      <div style="padding:1rem; border-radius:var(--radius-md); background:var(--bg-card); border:1px solid var(--border); border-left:4px solid var(--primary); margin-bottom:0.65rem;">
        <div style="font-weight:700; color:var(--text-main); font-size:0.92rem; margin-bottom:0.25rem;">Điểm ${idx + 1}: ${g.split(':')[0]}</div>
        <div style="color:var(--text-muted); font-size:0.85rem; line-height:1.5;">${g.includes(':') ? g.split(':').slice(1).join(':') : g}</div>
      </div>
    `).join('');
  },

  toggleBookmark(wordId, btn) {
    const isNow = StorageManager.toggleBookmark(wordId);
    btn.innerText = isNow ? '★' : '☆';
  },

  studyCurrentLessonFlashcards() {
    if (!this.currentLesson) return;
    App.navigateTo('flashcard');
    FlashcardController.setWords(this.currentLesson.words);
  },

  quizCurrentLesson() {
    if (!this.currentLesson) return;
    App.navigateTo('quiz');
    QuizController.startQuiz({
      scope: `lesson_${this.currentLesson.id}`,
      count: 10,
      mode: 'hanzi_to_vi'
    });
  }
};
