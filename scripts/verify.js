#!/usr/bin/env node
/**
 * Permanent Runtime & Curriculum Verification Suite for Hán Ngữ Master
 * Runs app.bundle.js in a Node VM with a lightweight DOM mock to catch
 * curriculum data defects, audio/TTS regressions, and UI controller bugs.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function createMockEnvironment() {
  const elements = {};
  function makeEl(id, tag = 'div') {
    const children = [];
    const el = {
      id,
      tagName: tag.toUpperCase(),
      style: {},
      dataset: {},
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); },
        toggle(c, force) {
          if (force === undefined) force = !this._set.has(c);
          if (force) this._set.add(c); else this._set.delete(c);
        }
      },
      children,
      innerHTML: '',
      innerText: '',
      textContent: '',
      value: '',
      disabled: false,
      clientWidth: 280,
      addEventListener() {},
      _attrs: {},
      setAttribute(k, v) { this._attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
      removeAttribute(k) { delete this._attrs[k]; },
      focus() {},
      getContext() {
        return { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, clearRect() {} };
      },
      appendChild(child) {
        children.push(child);
        return child;
      },
      remove() { this._removed = true; },
      querySelectorAll(sel) {
        if (sel.includes('option[value^="lesson_"]')) {
          return children.filter((c) => !c._removed && String(c.value || '').startsWith('lesson_'));
        }
        return [];
      },
      cloneNode() {
        const c = makeEl('', tag);
        c.value = el.value;
        c.innerText = el.innerText;
        return c;
      },
      scrollIntoView() {}
    };
    if (id) elements[id] = el;
    return el;
  }

  const doc = {
    documentElement: { setAttribute() {}, getAttribute() { return 'light'; } },
    addEventListener() {},
    getElementById(id) { return elements[id] || makeEl(id); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement(tag) { return makeEl('', tag); },
    activeElement: null,
    body: makeEl('body')
  };

  const win = {
    addEventListener() {},
    scrollTo() {},
    location: { hash: '', origin: 'https://han-ngu-master.vercel.app' },
    history: { state: null, pushState() {}, replaceState() {}, back() {} },
    navigator: {},
    localStorage: {
      _m: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
      setItem(k, v) { this._m[k] = String(v); },
      removeItem(k) { delete this._m[k]; }
    },
    document: doc
  };

  const sandbox = {
    window: win,
    document: doc,
    navigator: win.navigator,
    localStorage: win.localStorage,
    history: win.history,
    location: win.location,
    Audio: class MockAudio {
      pause() {}
      play() { return Promise.resolve(); }
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };

  return { sandbox, elements, makeEl, win };
}

function run() {
  const dataCode = fs.readFileSync(path.join(ROOT, 'data.bundle.js'), 'utf8');
  const bundleCode = fs.readFileSync(path.join(ROOT, 'app.bundle.js'), 'utf8');
  const { sandbox, elements, makeEl, win } = createMockEnvironment();
  vm.createContext(sandbox);
  vm.runInContext(dataCode, sandbox);
  vm.runInContext(bundleCode, sandbox);

  const data = sandbox.window.CHINESE_DATA;
  const grammar = sandbox.window.GRAMMAR_DATA;
  const LessonBrowser = sandbox.window.LessonBrowser;
  const PinyinController = sandbox.window.PinyinController;
  const HanziController = sandbox.window.HanziController;
  const GrammarController = sandbox.window.GrammarController;
  const FlashcardController = sandbox.window.FlashcardController;
  const App = sandbox.window.App;

  // 1. Lessons & 744 Vocabulary completeness
  // HSK 1–2 core stays fixed; later levels are appended by src/data-hsk3.js
  const core = data.lessons.filter((l) => l.hsk <= 2);
  assert.strictEqual(core.length, 30, 'Expected 30 HSK 1-2 lessons');
  assert.strictEqual(core.reduce((a, l) => a + l.words.length, 0), 744, 'Expected 744 HSK 1-2 words');
  const ids = data.lessons.map((l) => l.id);
  ids.forEach((id, i) => assert.strictEqual(id, i + 1, `Lesson ids must be consecutive (got ${id} at #${i + 1})`));
  assert.strictEqual(data.total_words, data.all_words.length, 'total_words must equal all_words.length');
  assert.strictEqual(data.total_lessons, data.lessons.length, 'total_lessons must equal lessons.length');
  const wordIdSet = new Set();
  data.all_words.forEach((w) => { assert(!wordIdSet.has(w.id), `Duplicate word id ${w.id}`); wordIdSet.add(w.id); });
  for (const w of data.all_words) {
    assert(w.hanzi && w.hanzi.trim(), `Missing hanzi on ${w.id}`);
    assert(w.pinyin && w.pinyin.trim(), `Missing pinyin on ${w.id}`);
    assert(w.pos && w.pos.trim(), `Missing pos on ${w.id}`);
    assert(w.hanviet && w.hanviet.trim(), `Missing hanviet on ${w.id}`);
    assert(w.meaning && w.meaning.trim(), `Missing meaning on ${w.id}`);
  }

  // 2. Dialogue completeness, TTS <= 180 chars limit & character name/pinyin consistency
  const namePairs = [
    ['玛丽', ['mǎlì']],
    ['罗兰', ['luólán']],
    ['麦克', ['màikè']],
    ['张东', ['zhāng dōng', 'zhāngdōng']],
    ['田芳', ['tián fāng', 'tiánfāng']],
    ['大卫', ['dàwèi']]
  ];

  for (const lesson of data.lessons) {
    assert(Array.isArray(lesson.dialogue) && lesson.dialogue.length > 0, `Empty dialogue in lesson ${lesson.id}`);
    lesson.dialogue.forEach((d, idx) => {
      assert(d.speaker && d.zh && d.py && d.vi, `Missing dialogue field in L${lesson.id}[${idx}]`);
      assert(d.zh.length <= 180, `Dialogue line L${lesson.id}[${idx}] exceeds 180 chars (${d.zh.length})`);
      const pyLow = d.py.toLowerCase();
      for (const [zhName, pyVariants] of namePairs) {
        const hasZh = d.zh.includes(zhName);
        const hasPy = pyVariants.some((p) => pyLow.includes(p));
        assert.strictEqual(
          hasZh,
          hasPy,
          `Name/pinyin mismatch in L${lesson.id} dialogue[${idx}]: zh="${d.zh}" vs py="${d.py}"`
        );
      }
    });

    // 3. Every grammar theory point must contain a colon separating title & explanation
    assert(Array.isArray(lesson.grammar) && lesson.grammar.length > 0, `Empty grammar notes in lesson ${lesson.id}`);
    lesson.grammar.forEach((gp, idx) => {
      assert(gp.includes(':'), `Grammar note L${lesson.id}[${idx}] missing colon separator: "${gp}"`);
      const parts = gp.split(':');
      assert(parts[0].trim().length > 0, `Empty grammar title in L${lesson.id}[${idx}]`);
      assert(parts.slice(1).join(':').trim().length > 0, `Empty grammar body in L${lesson.id}[${idx}]`);
    });
  }

  // Slide notes (src/notes.js): every word note must point at a real word, every note has text
  const notes = sandbox.window.LESSON_NOTES;
  assert(notes && notes.words && notes.lessons, 'LESSON_NOTES missing');
  const wordIds = new Set(data.all_words.map((w) => w.id));
  for (const [id, arr] of Object.entries(notes.words)) {
    assert(wordIds.has(id), `Note attached to unknown word id ${id}`);
    arr.forEach((n) => assert(n.c && n.x && n.x.trim(), `Empty note on ${id}`));
  }
  for (const [lid, arr] of Object.entries(notes.lessons)) {
    assert(+lid === 0 || data.lessons.some((l) => l.id === +lid), `Notes for unknown lesson ${lid}`);
    arr.forEach((n) => assert(n.c && n.x && n.x.trim(), `Empty lesson note in ${lid}`));
  }

  // Grammar items sanity check
  assert(Array.isArray(grammar) && grammar.length >= 120, 'Expected >= 120 grammar exercises');
  for (const g of grammar) {
    assert(g.zh && g.py && g.vi && g.grammarNote, `Incomplete grammar exercise ${g.id}`);
  }

  // 4. LessonBrowser practice loop, Question 2..N reset & dialogue section rendering
  LessonBrowser.init(data.lessons);
  for (const lesson of data.lessons) {
    LessonBrowser.currentLesson = lesson;

    // Check section header rendering on dialogue tab
    LessonBrowser.renderDialogueTab();
    const dlgHtml = elements['lesson-dialogue-content'].innerHTML;
    const expectedSections = new Set(lesson.dialogue.map((d) => d.section).filter(Boolean));
    for (const sec of expectedSections) {
      assert(dlgHtml.includes('dialogue-section-header'), `Missing section header class in L${lesson.id}`);
    }

    // Check grammar & quiz modes
    for (const mode of ['vi_to_zh', 'zh_to_vi', 'reorder']) {
      LessonBrowser.startLessonPractice('grammar', mode);
      assert(LessonBrowser.practiceQuestions.length >= 2, `Expected >=2 grammar questions in L${lesson.id}`);
      if (mode !== 'reorder') {
        for (const q of LessonBrowser.practiceQuestions) {
          assert.strictEqual(q.choices.length, 4, `Expected 4 choices for ${q.id} (${mode})`);
          const expectedAns = mode === 'vi_to_zh' ? q.zh : q.vi;
          assert(q.choices.includes(expectedAns), `Expected answer missing in ${q.id} (${mode})`);
        }
      }
      // Answer Q1 -> advance to Q2 -> practiceIsAnswered MUST reset to false
      LessonBrowser.practiceIsAnswered = true;
      LessonBrowser.nextPracticeStep();
      assert.strictEqual(
        LessonBrowser.practiceIsAnswered,
        false,
        `practiceIsAnswered stayed true on Q2 for L${lesson.id} mode=${mode}`
      );
    }

    LessonBrowser.startLessonPractice('quiz');
    assert.strictEqual(LessonBrowser.practiceQuestions.length, lesson.words.length, `Quiz count mismatch in L${lesson.id}`);
    for (const q of LessonBrowser.practiceQuestions) {
      assert.strictEqual(q.choices.length, 4, `Expected 4 quiz choices in L${lesson.id}`);
      assert(q.choices.includes(q.correct), `Expected answer missing in quiz L${lesson.id}`);
    }
    LessonBrowser.practiceIsAnswered = true;
    LessonBrowser.nextPracticeStep();
    assert.strictEqual(
      LessonBrowser.practiceIsAnswered,
      false,
      `practiceIsAnswered stayed true on Q2 for L${lesson.id} quiz`
    );

    // Verify checkQuizAnswer populates feedback box
    const q2 = LessonBrowser.practiceQuestions[LessonBrowser.practiceIndex];
    LessonBrowser.checkQuizAnswer(q2.correct, makeEl('', 'button'));
    assert(
      elements['lesson-practice-feedback'].innerHTML.includes(q2.hanzi),
      `checkQuizAnswer should render feedback for L${lesson.id}`
    );
  }

  // 5. PinyinController: 23 initials, 36 finals, 5 tones with single-Hanzi sound
  assert.strictEqual(PinyinController.initials.length, 23, 'Expected 23 initials');
  assert.strictEqual(PinyinController.finals.length, 36, 'Expected 36 finals');
  assert.strictEqual(PinyinController.tones.length, 5, 'Expected 5 tones');
  for (const item of [...PinyinController.initials, ...PinyinController.finals, ...PinyinController.tones]) {
    assert(
      item.sound && /^[\u4e00-\u9fa5]$/.test(item.sound),
      `Invalid single-Hanzi sound for ${item.pinyin || item.name}: ${item.sound}`
    );
  }

  // 6. HanziController, App dashboard & idempotency guards
  HanziController.init('hanzi-writer-target');
  HanziController.loadCharacter('汉语', 1);
  assert.strictEqual(HanziController.currentWord, '汉语');
  assert.strictEqual(JSON.stringify(HanziController.currentWordChars), JSON.stringify(['汉', '语']));
  assert.strictEqual(HanziController.currentChar, '语');

  App.data = data;
  elements['hero-lesson-title'] = makeEl('hero-lesson-title');
  sandbox.window.StorageManager.getCurrentUser = () => ({
    lastActiveLesson: 5,
    xp: 100,
    streak: 2,
    wordProgress: {},
    completedLessons: [1]
  });
  App.updateDashboardStats();
  assert.strictEqual(elements['hero-lesson-title'].innerText, 'Bài 5: 这是王老师');

  let keydownCount = 0;
  win.addEventListener = (ev) => { if (ev === 'keydown') keydownCount++; };
  FlashcardController.setupListeners();
  FlashcardController.setupListeners();
  assert.strictEqual(keydownCount, 1, 'Flashcard keydown listener must bind once');

  const gSel = makeEl('grammar-scope-select', 'select');
  GrammarController.populateSelects(data.lessons);
  GrammarController.populateSelects(data.lessons);
  assert.strictEqual(gSel.children.filter((c) => !c._removed).length, data.lessons.length, 'Grammar scope must not duplicate lessons');

  // 7. Pipeline config files
  const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  assert.strictEqual(vercelJson.outputDirectory, '.');
  assert(fs.existsSync(path.join(ROOT, '.claude/settings.json')), 'Missing .claude/settings.json');
  assert(fs.existsSync(path.join(ROOT, '.githooks/pre-commit')), 'Missing .githooks/pre-commit');
  assert.strictEqual(fs.lstatSync(path.join(ROOT, 'AGENTS.md')).isSymbolicLink(), false, 'AGENTS.md must be regular file');
  assert.strictEqual(
    fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8'),
    fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8'),
    'AGENTS.md must stay synced with CLAUDE.md'
  );

  console.log(`VERIFICATION SUITE PASSED: ${data.lessons.length} lessons, ${data.all_words.length} words, ${grammar.length} grammar exercises, dialogues, Pinyin, and controllers OK.`);
}

run();
