/**
 * Hanzi Writer & Calligraphy Grid Controller
 */
const HanziController = {
  writerInstance: null,
  currentChar: '好',
  currentWord: '好',
  currentWordChars: ['好'],
  currentCharIndex: 0,
  isQuizActive: false,

  init(containerId) {
    this.containerId = containerId;
    this.loadCharacter('好');
  },

  loadCharacter(input, charIdx = 0) {
    if (!input) return;
    const raw = String(input).trim();
    if (!raw) return;
    const matched = raw.match(/[\u4e00-\u9fa5]/g);
    const chars = (matched && matched.length) ? matched : [raw.charAt(0)];
    const safeIdx = Math.max(0, Math.min(parseInt(charIdx, 10) || 0, chars.length - 1));
    const target = chars[safeIdx];

    this.currentWord = raw;
    this.currentWordChars = chars;
    this.currentCharIndex = safeIdx;
    this.currentChar = target;

    const el = document.getElementById(this.containerId);
    if (!el) return;
    el.innerHTML = '';

    // Check if HanziWriter library is loaded
    if (typeof HanziWriter !== 'undefined') {
      try {
        const frameWidth = el.clientWidth || 270;
        const targetSize = Math.max(220, Math.min(280, frameWidth - 10));
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.writerInstance = HanziWriter.create(this.containerId, target, {
          width: targetSize,
          height: targetSize,
          padding: 20,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 150,
          strokeColor: isDark ? '#f1f5f9' : '#0f172a',
          radicalColor: '#ef4444',
          outlineColor: isDark ? '#334155' : '#e2e8f0',
          drawingColor: '#ef4444',
          showOutline: true,
          showCharacter: true
        });
      } catch (err) {
        console.warn('HanziWriter load error, using canvas fallback:', err);
        this.drawCanvasFallback(target);
      }
    } else {
      this.drawCanvasFallback(target);
    }
    
    // Update character details in UI
    const charDisplay = document.getElementById('writer-char-info');
    if (charDisplay) {
      let infoText = chars.length > 1 ? chars.join('') : target;
      if (window.CHINESE_DATA && window.CHINESE_DATA.all_words) {
        const words = window.CHINESE_DATA.all_words;
        const cleanWord = chars.join('');
        const found = words.find(w => w.hanzi === raw || w.hanzi === cleanWord)
          || words.find(w => w.hanzi === target)
          || words.find(w => w.hanzi && w.hanzi.includes(target));
        if (found) {
          infoText = `${found.hanzi} [ ${found.pinyin} ] • ${found.hanviet ? `Hán Việt: ${found.hanviet} • ` : ''}${found.meaning}`;
        }
      }
      const safeInfo = typeof escapeHtml === 'function' ? escapeHtml(infoText) : infoText;
      const safeWordArg = typeof jsArg === 'function' ? jsArg(raw) : raw;
      const pillsHtml = chars.length > 1 ? `
        <div style="display:flex; gap:0.35rem; justify-content:center; flex-wrap:wrap; margin-top:0.45rem;">
          ${chars.map((ch, idx) => `
            <button type="button" class="btn btn-sm ${idx === safeIdx ? 'btn-primary' : 'btn-outline'}" onclick="HanziController.loadCharacter('${safeWordArg}', ${idx})" style="font-family:var(--font-hanzi); font-size:1.1rem; min-width:36px; padding:0.2rem 0.55rem;">
              ${ch}
            </button>
          `).join('')}
        </div>
      ` : '';
      charDisplay.innerHTML = `<div>${safeInfo}</div>${pillsHtml}`;
    }
  },

  animate() {
    if (this.writerInstance) {
      this.writerInstance.showCharacter();
      this.writerInstance.animateCharacter();
    }
  },

  loop() {
    if (this.writerInstance) {
      this.writerInstance.loopCharacterAnimation();
    }
  },

  startQuiz() {
    if (!this.writerInstance) return;
    const feedbackEl = document.getElementById('writer-feedback');
    if (feedbackEl) {
      feedbackEl.innerText = 'Hãy dùng chuột / ngón tay vẽ theo đúng thứ tự nét!';
      feedbackEl.style.color = 'var(--primary)';
    }

    this.isQuizActive = true;
    this.writerInstance.quiz({
      onMistake: (strokeData) => {
        AudioEngine.playWrongSound();
        if (feedbackEl) {
          feedbackEl.innerText = `Sai nét số ${strokeData.strokeNum + 1}! Hãy thử lại.`;
          feedbackEl.style.color = '#ef4444';
        }
      },
      onCorrectStroke: (strokeData) => {
        AudioEngine.playClickSound();
        if (feedbackEl) {
          feedbackEl.innerText = `Nét ${strokeData.strokeNum + 1} chính xác!`;
          feedbackEl.style.color = '#22c55e';
        }
      },
      onComplete: (summaryData) => {
        AudioEngine.playVictorySound();
        if (feedbackEl) {
          feedbackEl.innerText = `Tuyệt vời! Bạn đã hoàn thành chữ "${this.currentChar}" với ${summaryData.totalMistakes} lỗi!`;
          feedbackEl.style.color = '#15803d';
        }
        if (typeof StorageManager !== 'undefined') {
          StorageManager.addXP(10, `Tập viết chữ "${this.currentChar}"`);
          StorageManager.recordDailyAction('writing', 1);
        }
      }
    });
  },

  drawCanvasFallback(char) {
    const el = document.getElementById(this.containerId);
    if (!el) return;
    el.innerHTML = `
      <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; position:relative;">
        <span style="font-family:var(--font-hanzi); font-size:160px; color:rgba(194,59,34,0.18); user-select:none;">${char}</span>
        <canvas id="fallback-canvas" width="290" height="290" style="position:absolute; inset:0; cursor:crosshair;"></canvas>
      </div>
    `;

    // Setup interactive drawing canvas
    const canvas = document.getElementById('fallback-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    ctx.strokeStyle = '#c23b22';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const moveDraw = (e) => {
      if (!drawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const endDraw = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveDraw(e); });
    canvas.addEventListener('touchend', endDraw);
  },

  clearFallbackCanvas() {
    const canvas = document.getElementById('fallback-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
};

if (typeof window !== 'undefined') {
  window.HanziController = HanziController;
}
