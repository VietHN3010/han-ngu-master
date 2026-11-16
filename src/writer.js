/**
 * Hanzi Writer & Calligraphy Grid Controller
 */
const HanziController = {
  writerInstance: null,
  currentChar: '好',
  isQuizActive: false,

  init(containerId) {
    this.containerId = containerId;
    this.loadCharacter('好');
  },

  loadCharacter(char) {
    if (!char) return;
    const target = char.charAt(0);
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
      let infoText = target;
      if (window.CHINESE_DATA && window.CHINESE_DATA.all_words) {
        const found = window.CHINESE_DATA.all_words.find(w => w.hanzi === target || w.hanzi.includes(target));
        if (found) {
          infoText = `${found.hanzi} [ ${found.pinyin} ] • ${found.hanviet ? `Hán Việt: ${found.hanviet} • ` : ''}${found.meaning}`;
        }
      }
      charDisplay.innerText = infoText;
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
