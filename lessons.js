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

    container.innerHTML = filtered.map(l => `
      <div class="lesson-card" onclick="LessonBrowser.openLesson(${l.id})">
        <div class="lesson-card-header">
          <span class="lesson-num-pill">Bài ${l.id} • HSK ${l.hsk}</span>
          <span style="font-size:0.8rem; color:var(--text-muted);">${l.words ? l.words.length : 0} từ</span>
        </div>
        <div class="lesson-card-zh">${l.zh_title}</div>
        <div class="lesson-card-vi">${l.title}</div>
        <div class="lesson-card-meta">
          <span>📖 ${l.dialogue ? l.dialogue.length : 0} câu hội thoại</span>
          <span>💡 ${l.grammar ? l.grammar.length : 0} điểm ngữ pháp</span>
        </div>
      </div>
    `).join('');
  },

  openLesson(lessonId) {
    const lesson = this.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    this.currentLesson = lesson;

    document.getElementById('lesson-list-view').style.display = 'none';
    const detailView = document.getElementById('lesson-detail-view');
    detailView.style.display = 'block';

    document.getElementById('lesson-detail-title').innerText = `Bài ${lesson.id}: ${lesson.zh_title} (${lesson.pinyin_title || ''})`;
    document.getElementById('lesson-detail-subtitle').innerText = lesson.title;

    // Render Vocabulary Tab
    this.renderVocabTab();
    // Render Dialogue Tab
    this.renderDialogueTab();
    // Render Grammar Tab
    this.renderGrammarTab();

    // Default to vocab tab
    this.switchLessonTab('vocab');
  },

  closeLesson() {
    document.getElementById('lesson-detail-view').style.display = 'none';
    document.getElementById('lesson-list-view').style.display = 'block';
  },

  switchLessonTab(tab) {
    document.querySelectorAll('.lesson-subtab').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`lesson-tab-btn-${tab}`).classList.add('active');

    document.getElementById('lesson-subview-vocab').style.display = tab === 'vocab' ? 'block' : 'none';
    document.getElementById('lesson-subview-dialogue').style.display = tab === 'dialogue' ? 'block' : 'none';
    document.getElementById('lesson-subview-grammar').style.display = tab === 'grammar' ? 'block' : 'none';
  },

  renderVocabTab() {
    const tbody = document.getElementById('lesson-vocab-tbody');
    if (!tbody || !this.currentLesson) return;

    tbody.innerHTML = this.currentLesson.words.map(w => {
      const isFav = StorageManager.isBookmarked(w.id);
      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <button class="btn-speaker" onclick="AudioEngine.speak('${w.hanzi}')">🔊</button>
              <span class="hanzi" style="font-size:1.35rem; font-weight:600; color:var(--text-primary);">${w.hanzi}</span>
            </div>
          </td>
          <td style="color:var(--primary); font-weight:600;">${w.pinyin}</td>
          <td style="color:var(--text-secondary); text-transform:uppercase; font-size:0.85rem;">${w.hanviet || '—'}</td>
          <td><span class="flashcard-pos" style="margin:0;">${w.pos || 'Từ vựng'}</span></td>
          <td style="font-weight:500;">${w.meaning}</td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              <button class="btn btn-outline btn-sm" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${w.hanzi}');" title="Luyện viết">✍️</button>
              <button class="btn btn-outline btn-sm" onclick="LessonBrowser.toggleBookmark('${w.id}', this)" title="Lưu từ">
                ${isFav ? '★' : '☆'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderDialogueTab() {
    const container = document.getElementById('lesson-dialogue-content');
    if (!container || !this.currentLesson) return;

    if (!this.currentLesson.dialogue || !this.currentLesson.dialogue.length) {
      container.innerHTML = '<p style="color:var(--text-secondary); padding:1rem;">Chưa có dữ liệu bài khóa cho bài học này.</p>';
      return;
    }

    container.innerHTML = this.currentLesson.dialogue.map((d, idx) => `
      <div style="padding:1rem; border-radius:var(--radius-md); background:var(--bg-main); margin-bottom:0.75rem; display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;">
        <div>
          <div style="font-weight:700; color:var(--secondary); font-size:0.85rem; margin-bottom:0.25rem;">${d.speaker || `Nhân vật ${idx + 1}`}:</div>
          <div class="hanzi" style="font-size:1.25rem; color:var(--text-primary); margin-bottom:0.2rem;">${d.zh}</div>
          <div style="color:var(--primary); font-size:0.9rem; font-weight:500; margin-bottom:0.2rem;">${d.py}</div>
          <div style="color:var(--text-secondary); font-size:0.9rem;">${d.vi}</div>
        </div>
        <button class="btn-speaker" onclick="AudioEngine.speak('${d.zh}')" title="Nghe câu này" style="font-size:1.3rem;">
          🔊
        </button>
      </div>
    `).join('');
  },

  renderGrammarTab() {
    const container = document.getElementById('lesson-grammar-content');
    if (!container || !this.currentLesson) return;

    if (!this.currentLesson.grammar || !this.currentLesson.grammar.length) {
      container.innerHTML = '<p style="color:var(--text-secondary); padding:1rem;">Chưa có điểm ngữ pháp nổi bật cho bài học này.</p>';
      return;
    }

    container.innerHTML = this.currentLesson.grammar.map((g, idx) => `
      <div style="padding:1.15rem; border-radius:var(--radius-md); background:var(--bg-main); border-left:4px solid var(--primary); margin-bottom:0.85rem;">
        <div style="font-weight:700; color:var(--text-primary); font-size:1rem; margin-bottom:0.35rem;">Điểm ${idx + 1}: ${g.split(':')[0]}</div>
        <div style="color:var(--text-secondary); font-size:0.92rem; line-height:1.6;">${g.includes(':') ? g.split(':').slice(1).join(':') : g}</div>
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
