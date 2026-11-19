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
