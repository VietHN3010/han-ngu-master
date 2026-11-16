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

    document.getElementById('lesson-detail-title').innerText = `Bài ${lesson.id}: ${lesson.zh_title}`;
    document.getElementById('lesson-detail-subtitle').innerText = `${lesson.pinyin_title || ''} • ${lesson.title}`;

    this.updateCompleteButton();
    this.updateNavigationButtons();
    this.renderVocabTab();
    this.renderDialogueTab();
    this.renderGrammarTab();
    this.switchLessonTab('vocab');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  nextLesson() {
    if (this.currentLesson && this.currentLesson.id < 30) {
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
      nextBtn.style.visibility = this.currentLesson.id < 30 ? 'visible' : 'hidden';
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

  switchLessonTab(tab) {
    document.querySelectorAll('.lesson-subtab').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`lesson-tab-btn-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');

    document.getElementById('lesson-subview-vocab').style.display = tab === 'vocab' ? 'block' : 'none';
    document.getElementById('lesson-subview-dialogue').style.display = tab === 'dialogue' ? 'block' : 'none';
    document.getElementById('lesson-subview-grammar').style.display = tab === 'grammar' ? 'block' : 'none';

    if (tab === 'grammar') {
      this.renderGrammarTab();
    }
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
                <button class="btn btn-outline btn-sm" onclick="AudioEngine.recognizeSpeech('${typeof jsArg === 'function' ? jsArg(w.hanzi) : w.hanzi}')" title="Luyện phát âm với Micro">🎙️</button>
                <button class="btn btn-outline btn-sm" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${typeof jsArg === 'function' ? jsArg(w.hanzi) : w.hanzi}');" title="Tập viết">✍️</button>
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

  isDialoguePlaying: false,
  dialogueIndex: 0,
  dialogueTimeout: null,

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
      btn.innerHTML = '⏸️ Tạm dừng phát';
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
      btn.innerHTML = '▶️ Tự động phát hội thoại';
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

    const toolbar = `
      <div class="dialogue-toolbar" style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-card); padding:0.6rem 0.9rem; border-radius:var(--radius-md); border:1px solid var(--border); margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
        <span style="font-weight:700; font-size:0.85rem; color:var(--text-main);">🎧 Nghe tự động toàn bài</span>
        <button id="btn-dialogue-autoplay" class="btn btn-primary btn-sm" onclick="LessonBrowser.toggleDialogueAutoPlay()">
          ▶️ Tự động phát hội thoại
        </button>
      </div>
    `;

    container.innerHTML = toolbar + this.currentLesson.dialogue.map((d, idx) => `
      <div class="dialogue-bubble" style="padding:0.85rem 1rem; border-radius:var(--radius-md); background:var(--bg-card); border:1px solid var(--border); margin-bottom:0.6rem; display:flex; align-items:flex-start; justify-content:space-between; gap:0.75rem; transition:all 0.25s ease;">
        <div style="min-width:0; flex:1; word-break:break-word;">
          <div style="font-weight:700; color:var(--secondary); font-size:0.8rem; margin-bottom:0.15rem;">${d.speaker || `Nhân vật ${idx + 1}`}:</div>
          <div class="hanzi" style="font-size:1.15rem; color:var(--text-main); font-weight:600; margin-bottom:0.15rem;">${d.zh}</div>
          <div style="color:var(--primary); font-size:0.82rem; font-weight:600; margin-bottom:0.15rem;">${d.py}</div>
          <div style="color:var(--text-muted); font-size:0.82rem;">${d.vi}</div>
        </div>
        <div style="display:flex; gap:0.3rem; flex-shrink:0;">
          <button class="btn btn-outline btn-sm" onclick="AudioEngine.recognizeSpeech('${typeof jsArg === 'function' ? jsArg(d.zh) : d.zh}')" title="Luyện đọc câu này" style="font-size:1.05rem;">
            🎙️
          </button>
          <button class="btn-speaker" onclick="AudioEngine.speak('${typeof jsArg === 'function' ? jsArg(d.zh) : d.zh}')" title="Nghe câu" style="font-size:1.2rem; flex-shrink:0;">
            🔊
          </button>
        </div>
      </div>
    `).join('');
  },

  renderGrammarTab() {
    const container = document.getElementById('lesson-grammar-content');
    if (!container || !this.currentLesson) return;

    const grammarPoints = this.currentLesson.grammar || [];

    let theoryHtml = '';
    if (grammarPoints.length > 0) {
      theoryHtml = grammarPoints.map((g, idx) => `
        <div style="padding:1rem; border-radius:var(--radius-md); background:var(--bg-card); border:1px solid var(--border); border-left:4px solid var(--primary); margin-bottom:0.65rem;">
          <div style="font-weight:700; color:var(--text-main); font-size:0.92rem; margin-bottom:0.25rem;">Điểm ${idx + 1}: ${g.split(':')[0]}</div>
          <div style="color:var(--text-muted); font-size:0.85rem; line-height:1.5;">${g.includes(':') ? g.split(':').slice(1).join(':') : g}</div>
        </div>
      `).join('');
    } else {
      theoryHtml = '<p style="color:var(--text-muted); padding:0.5rem 0; font-size:0.85rem;">Bài này tập trung vào củng cố từ vựng và hội thoại.</p>';
    }

    const practiceCardHtml = `
      <div class="lesson-grammar-practice-card" style="margin-top:1.25rem; padding:1.25rem; border-radius:var(--radius-lg); background:linear-gradient(135deg, rgba(239, 68, 68, 0.04), rgba(245, 158, 11, 0.08)); border:1.5px solid var(--primary-light, #fca5a5);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:0.4rem; margin:0 0 0.2rem 0;">
              <span>🎯</span> <span>Luyện tập Ngữ pháp Bài ${this.currentLesson.id}</span>
            </h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">Áp dụng ngay cấu trúc ngữ pháp vừa học vào bài tập tương tác</p>
          </div>
          <span style="background:var(--primary); color:white; font-size:0.72rem; padding:0.2rem 0.6rem; border-radius:999px; font-weight:700;">+15 XP / câu</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:0.75rem; margin-top:0.75rem;">
          <!-- 1. Sắp xếp câu -->
          <div onclick="LessonBrowser.grammarPracticeMode('reorder')" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            <div>
              <div style="font-size:1.4rem; margin-bottom:0.35rem;">🧩</div>
              <div style="font-weight:800; font-size:0.92rem; color:var(--text-main); margin-bottom:0.25rem;">Sắp xếp câu (连词成句)</div>
              <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.4;">Chạm các mảnh từ để xếp thành câu đúng vị trí ngữ pháp.</div>
            </div>
            <button class="btn btn-primary btn-sm" style="margin-top:0.85rem; width:100%;">
              Luyện ghép câu &rarr;
            </button>
          </div>

          <!-- 2. Dịch Việt -> Trung -->
          <div onclick="LessonBrowser.grammarPracticeMode('vi_to_zh')" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            <div>
              <div style="font-size:1.4rem; margin-bottom:0.35rem;">🇨🇳</div>
              <div style="font-weight:800; font-size:0.92rem; color:var(--text-main); margin-bottom:0.25rem;">Dịch Việt ➔ Trung</div>
              <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.4;">Đọc câu tiếng Việt và chọn câu chữ Hán chuẩn ngữ pháp.</div>
            </div>
            <button class="btn btn-outline btn-sm" style="margin-top:0.85rem; width:100%; border-color:var(--primary); color:var(--primary);">
              Luyện dịch Vi ➔ Zh &rarr;
            </button>
          </div>

          <!-- 3. Dịch Trung -> Việt -->
          <div onclick="LessonBrowser.grammarPracticeMode('zh_to_vi')" style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            <div>
              <div style="font-size:1.4rem; margin-bottom:0.35rem;">🇻🇳</div>
              <div style="font-weight:800; font-size:0.92rem; color:var(--text-main); margin-bottom:0.25rem;">Dịch Trung ➔ Việt</div>
              <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.4;">Phân tích ngữ cảnh chữ Hán và chọn nghĩa tiếng Việt chuẩn xác.</div>
            </div>
            <button class="btn btn-outline btn-sm" style="margin-top:0.85rem; width:100%; border-color:var(--secondary); color:var(--secondary);">
              Luyện dịch Zh ➔ Vi &rarr;
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = `
      <div style="margin-bottom:0.5rem;">
        <h4 style="font-size:0.95rem; font-weight:800; color:var(--secondary); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.35rem;">
          <span>📖</span> <span>Kiến thức trọng tâm</span>
        </h4>
        ${theoryHtml}
      </div>
      ${practiceCardHtml}
    `;
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
  },

  grammarPracticeMode(mode = 'reorder') {
    if (!this.currentLesson) return;
    App.navigateTo('grammar');
    GrammarController.startExercise({
      scope: `lesson_${this.currentLesson.id}`,
      count: 5,
      mode: mode
    });
  },

  grammarPracticeCurrentLesson() {
    this.grammarPracticeMode('reorder');
  }
};

if (typeof window !== 'undefined') {
  window.LessonBrowser = LessonBrowser;
}
