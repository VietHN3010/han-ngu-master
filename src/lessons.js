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

    const vVocab = document.getElementById('lesson-subview-vocab');
    const vDialogue = document.getElementById('lesson-subview-dialogue');
    const vGrammar = document.getElementById('lesson-subview-grammar');
    const vPractice = document.getElementById('lesson-subview-practice');

    if (vVocab) vVocab.style.display = tab === 'vocab' ? 'block' : 'none';
    if (vDialogue) vDialogue.style.display = tab === 'dialogue' ? 'block' : 'none';
    if (vGrammar) vGrammar.style.display = tab === 'grammar' ? 'block' : 'none';
    if (vPractice) vPractice.style.display = tab === 'practice' ? 'block' : 'none';

    if (tab === 'grammar') {
      this.renderGrammarTab();
    } else if (tab === 'practice') {
      this.renderPracticeTab();
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

      <!-- Quick Review Footer inside Vocab Tab -->
      <div style="margin-top:1.25rem; padding:1.1rem 1.25rem; border-radius:var(--radius-lg); background:linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(59, 130, 246, 0.06)); border:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; box-shadow:var(--shadow-sm);">
        <div>
          <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);">🎯 Ôn luyện Từ vựng & Ngữ pháp Bài ${this.currentLesson.id}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.15rem;">Củng cố phản xạ qua Flashcard, Trắc nghiệm và Ghép câu ngữ pháp bài này</div>
        </div>
        <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="LessonBrowser.studyCurrentLessonFlashcards()">🎴 Ôn Flashcard</button>
          <button class="btn btn-secondary btn-sm" onclick="LessonBrowser.quizCurrentLesson()">📝 Trắc nghiệm</button>
          <button class="btn btn-outline btn-sm" onclick="LessonBrowser.grammarPracticeMode('reorder')" style="border-color:#d97706; color:#d97706; background:var(--bg-card);">🧩 Ghép câu</button>
        </div>
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
        <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
          <button id="btn-dialogue-autoplay" class="btn btn-primary btn-sm" onclick="LessonBrowser.toggleDialogueAutoPlay()">
            ▶️ Tự động phát hội thoại
          </button>
          <button class="btn btn-outline btn-sm" onclick="LessonBrowser.openLessonReviewModal()" style="border-color:var(--secondary); color:var(--secondary); font-weight:700;" title="Ôn tập từ vựng & ngữ pháp bài này">
            ⚡ Ôn tập bài này
          </button>
        </div>
      </div>
    `;

    const dialogueBubbles = this.currentLesson.dialogue.map((d, idx) => `
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

    const wordCount = this.currentLesson.words ? this.currentLesson.words.length : 0;
    const reviewCta = `
      <div class="dialogue-review-cta" style="margin-top:1.5rem; padding:1.25rem; border-radius:var(--radius-lg); background:linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(59, 130, 246, 0.06)); border:1.5px solid var(--border); box-shadow:var(--shadow-sm);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin:0 0 0.2rem 0; display:flex; align-items:center; gap:0.4rem;">
              <span>🎯</span> <span>Ôn tập toàn diện Bài ${this.currentLesson.id} (Từ vựng & Ngữ pháp)</span>
            </h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
              Luyện ngay toàn bộ ${wordCount} từ mới và các mẫu câu ngữ pháp xuất hiện trong bài khóa này:
            </p>
          </div>
          <span style="background:var(--secondary); color:white; font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:999px; font-weight:700;">
            Bài ${this.currentLesson.id} • HSK ${this.currentLesson.hsk}
          </span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.65rem; margin-top:0.75rem;">
          <!-- 1. Flashcard bài này -->
          <button class="btn btn-primary" onclick="LessonBrowser.studyCurrentLessonFlashcards()" style="padding:0.75rem 0.6rem; display:flex; align-items:center; justify-content:center; gap:0.4rem; font-size:0.85rem; font-weight:700;">
            <span>🎴</span> <span>Ôn Flashcard (${wordCount} từ)</span>
          </button>

          <!-- 2. Trắc nghiệm bài này -->
          <button class="btn btn-secondary" onclick="LessonBrowser.quizCurrentLesson()" style="padding:0.75rem 0.6rem; display:flex; align-items:center; justify-content:center; gap:0.4rem; font-size:0.85rem; font-weight:700;">
            <span>📝</span> <span>Thi trắc nghiệm từ vựng</span>
          </button>

          <!-- 3. Sắp xếp câu ngữ pháp bài này -->
          <button class="btn btn-outline" onclick="LessonBrowser.grammarPracticeMode('reorder')" style="padding:0.75rem 0.6rem; display:flex; align-items:center; justify-content:center; gap:0.4rem; font-size:0.85rem; font-weight:700; border-color:#d97706; color:#d97706; background:var(--bg-card);">
            <span>🧩</span> <span>Sắp xếp câu ngữ pháp</span>
          </button>

          <!-- 4. Dịch câu bài này -->
          <button class="btn btn-outline" onclick="LessonBrowser.grammarPracticeMode('vi_to_zh')" style="padding:0.75rem 0.6rem; display:flex; align-items:center; justify-content:center; gap:0.4rem; font-size:0.85rem; font-weight:700; border-color:var(--accent-jade); color:var(--accent-jade); background:var(--bg-card);">
            <span>🇨🇳</span> <span>Luyện dịch câu Vi ➔ Zh</span>
          </button>
        </div>
      </div>
    `;

    container.innerHTML = toolbar + dialogueBubbles + reviewCta;
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

  // ==========================================
  // IN-LESSON CLOSED-LOOP PRACTICE SYSTEM
  // ==========================================
  practiceType: null,      // 'grammar' | 'quiz' | 'flashcard'
  practiceMode: null,      // 'reorder' | 'vi_to_zh' | 'zh_to_vi'
  practiceQuestions: [],
  practiceIndex: 0,
  practiceScore: 0,
  practiceIsAnswered: false,
  practiceSelectedTokens: [],
  practiceAvailableTokens: [],
  practiceFcIndex: 0,
  practiceFcIsFlipped: false,

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
      this.practiceQuestions = [...pool];
    } else if (type === 'quiz') {
      const words = this.currentLesson.words || [];
      const allWords = (window.CHINESE_DATA && window.CHINESE_DATA.words) ? window.CHINESE_DATA.words : words;
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

    const wordCount = this.currentLesson.words ? this.currentLesson.words.length : 0;

    container.innerHTML = `
      <div style="margin-bottom:1.25rem;">
        <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.4rem;">
          <span>🎯</span> <span>Vòng luyện tập khép kín Bài ${this.currentLesson.id}</span>
        </h3>
        <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">
          Tất cả bài tập đều nằm trọn vẹn trong phạm vi từ vựng và ngữ pháp của Bài ${this.currentLesson.id}:
        </p>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:0.85rem;">
        <!-- 1. Sắp xếp câu ngữ pháp -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:1.15rem; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-sm);">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <div style="width:38px; height:38px; border-radius:10px; background:#fef3c7; color:#d97706; display:flex; align-items:center; justify-content:center; font-size:1.25rem;">🧩</div>
              <span style="font-size:0.7rem; font-weight:800; background:#fef3c7; color:#d97706; padding:0.15rem 0.55rem; border-radius:999px;">Ngữ pháp</span>
            </div>
            <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin:0 0 0.25rem 0;">Sắp xếp ghép câu (连词成句)</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin:0;">Chạm các mảnh từ để ghép thành câu hoàn chỉnh theo đúng cấu trúc ngữ pháp bài này.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="LessonBrowser.startLessonPractice('grammar', 'reorder')" style="margin-top:1rem; font-weight:700;">
            Luyện ghép câu ▶
          </button>
        </div>

        <!-- 2. Dịch câu Việt -> Trung -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:1.15rem; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-sm);">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <div style="width:38px; height:38px; border-radius:10px; background:#fff1f0; color:#d93829; display:flex; align-items:center; justify-content:center; font-size:1.25rem;">🇨🇳</div>
              <span style="font-size:0.7rem; font-weight:800; background:#fff1f0; color:#d93829; padding:0.15rem 0.55rem; border-radius:999px;">Dịch câu</span>
            </div>
            <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin:0 0 0.25rem 0;">Luyện dịch Việt ➔ Trung</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin:0;">Đọc câu dịch tiếng Việt và phản xạ chọn câu chữ Hán chuẩn ngữ pháp.</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="LessonBrowser.startLessonPractice('grammar', 'vi_to_zh')" style="margin-top:1rem; font-weight:700; border-color:var(--primary); color:var(--primary);">
            Luyện dịch Vi ➔ Zh ▶
          </button>
        </div>

        <!-- 3. Thi trắc nghiệm từ vựng -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:1.15rem; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-sm);">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <div style="width:38px; height:38px; border-radius:10px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:1.25rem;">📝</div>
              <span style="font-size:0.7rem; font-weight:800; background:#eff6ff; color:#2563eb; padding:0.15rem 0.55rem; border-radius:999px;">${wordCount} từ</span>
            </div>
            <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin:0 0 0.25rem 0;">Trắc nghiệm từ vựng bài này</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin:0;">Kiểm tra phản xạ nghĩa của toàn bộ từ mới xuất hiện trong Bài ${this.currentLesson.id}.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="LessonBrowser.startLessonPractice('quiz')" style="margin-top:1rem; font-weight:700;">
            Thi trắc nghiệm từ vựng ▶
          </button>
        </div>

        <!-- 4. Flashcard 3D bài này -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:1.15rem; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-sm);">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <div style="width:38px; height:38px; border-radius:10px; background:#ecfdf5; color:#059669; display:flex; align-items:center; justify-content:center; font-size:1.25rem;">🎴</div>
              <span style="font-size:0.7rem; font-weight:800; background:#ecfdf5; color:#059669; padding:0.15rem 0.55rem; border-radius:999px;">Flashcard 3D</span>
            </div>
            <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin:0 0 0.25rem 0;">Thẻ ghi nhớ Flashcard bài này</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin:0;">Lật thẻ 3 chiều, nghe phát âm giọng đọc Bắc Kinh chuẩn từng từ.</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="LessonBrowser.startLessonPractice('flashcard')" style="margin-top:1rem; font-weight:700; border-color:var(--accent-jade); color:var(--accent-jade);">
            Ôn Flashcard 3D ▶
          </button>
        </div>
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
      StorageManager.addXP(20);
    }
    if (typeof App !== 'undefined' && App.updateDashboardStats) {
      App.updateDashboardStats();
    }

    const total = this.practiceQuestions.length;
    const score = this.practiceScore;
    const pct = total > 0 ? Math.round((score / total) * 100) : 100;

    container.innerHTML = `
      <div style="max-width:540px; margin:1rem auto; background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-xl); padding:2rem 1.5rem; text-align:center; box-shadow:var(--shadow-lg);">
        <div style="font-size:3.5rem; margin-bottom:0.5rem;">🏆</div>
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
            🔄 Luyện tập lại bài này
          </button>
          <button class="btn btn-outline" onclick="LessonBrowser.exitLessonPractice()" style="padding:0.8rem; font-weight:700;">
            📖 Trở về xem bài học Bài ${this.currentLesson.id}
          </button>
          ${this.currentLesson.id < 30 ? `
            <button class="btn btn-outline" onclick="LessonBrowser.exitLessonPractice(); LessonBrowser.nextLesson();" style="padding:0.8rem; font-weight:700; border-color:var(--secondary); color:var(--secondary);">
              Bài tiếp theo (Bài ${this.currentLesson.id + 1}) ➡️
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
          ${q.point ? `<div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed var(--border); font-size:0.8rem; color:#d97706; font-weight:600;">💡 Ngữ pháp: ${escapeHtml(q.point)}</div>` : ''}
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
          ${q.point ? `<div style="color:#d97706; font-size:0.78rem; margin-top:0.25rem;">💡 ${escapeHtml(q.point)}</div>` : ''}
        </div>
      `;
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
  },

  nextPracticeStep() {
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
