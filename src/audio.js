/**
 * Audio Engine: Web Speech API (Chinese TTS) + Web Audio API Sound Effects
 * With high-reliability /api/tts serverless proxy fallback and Chromium/Safari protection.
 */
const AudioEngine = {
  speechRate: 0.9,
  audioCtx: null,
  _activeUtterances: [],
  _fallbackAudio: null,
  _voice: null,

  initAudioContext() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch(e) {}
  },

  getMandarinVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const norm = v => (v.lang || '').toLowerCase().replace('_', '-');
    const score = v => {
      const l = norm(v);
      const n = (v.name || '').toLowerCase();
      let s = 0;
      if (l === 'zh-cn' || l.startsWith('cmn')) s += 100;
      else if (l.startsWith('zh-hans')) s += 90;
      else if (l === 'zh-tw') s += 40;
      else if (l.startsWith('zh-hk') || l.startsWith('yue')) s -= 50;
      else if (l.startsWith('zh')) s += 30;
      else return -1000;
      if (/google|tingting|ting-ting|xiaoxiao|yunxi|lili|meijia|sinji|kangkang/.test(n)) s += 15;
      if (v.localService) s += 2;
      return s;
    };
    const best = voices.map(v => [score(v), v]).filter(x => x[0] > -1000).sort((a, b) => b[0] - a[0])[0];
    this._voice = best ? best[1] : null;
    return this._voice;
  },

  speak(text, onEnd) {
    if (!text) return;
    const cleanText = String(text).replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return;

    // Wake up AudioContext on user interaction
    this.initAudioContext();

    // Check if browser has Web Speech API support
    const hasSpeech = (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');
    
    if (hasSpeech) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const voices = window.speechSynthesis.getVoices() || [];
        const zhVoice = this.getMandarinVoice();

        // If voices list is already populated and absolutely NO Chinese voice exists, jump directly to serverless TTS fallback
        if (voices.length > 0 && !zhVoice) {
          this.playFallbackAudio(cleanText, onEnd);
          return;
        }

        // Only cancel if speech is currently playing to avoid Chromium idle cancel race
        if (window.speechSynthesis.speaking) {
          try { window.speechSynthesis.cancel(); } catch(e) {}
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'zh-CN';
        utterance.rate = this.speechRate || 0.9;

        if (zhVoice) {
          utterance.voice = zhVoice;
        }

        this._activeUtterances.push(utterance);

        let hasStarted = false;
        let hasFinished = false;

        const cleanup = () => {
          if (hasFinished) return;
          hasFinished = true;
          if (watchdog) clearTimeout(watchdog);
          const idx = this._activeUtterances.indexOf(utterance);
          if (idx > -1) this._activeUtterances.splice(idx, 1);
        };

        // Watchdog: If native speech fails to trigger onstart within 350ms, switch to online fallback
        const watchdog = setTimeout(() => {
          if (!hasStarted && !hasFinished) {
            console.warn('Native speech watchdog timed out, playing fallback audio');
            cleanup();
            try { window.speechSynthesis.cancel(); } catch(e) {}
            this.playFallbackAudio(cleanText, onEnd);
          }
        }, 350);

        utterance.onstart = () => {
          hasStarted = true;
          if (watchdog) clearTimeout(watchdog);
        };

        utterance.onend = () => {
          cleanup();
          if (onEnd) onEnd();
        };

        utterance.onerror = (err) => {
          console.warn('Native speech utterance error:', err);
          cleanup();
          this.playFallbackAudio(cleanText, onEnd);
        };

        // Call speak synchronously inside user interaction
        window.speechSynthesis.speak(utterance);

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        return;
      } catch (err) {
        console.warn('SpeechSynthesis exception, using fallback:', err);
        this.playFallbackAudio(cleanText, onEnd);
        return;
      }
    }

    // Fallback if speechSynthesis is not available
    this.playFallbackAudio(cleanText, onEnd);
  },

  playFallbackAudio(text, onEnd) {
    try {
      if (this._fallbackAudio) {
        try {
          this._fallbackAudio.pause();
          this._fallbackAudio.src = '';
        } catch(e) {}
      }

      const encoded = encodeURIComponent(String(text).trim());
      // Proxy through high-speed Vercel serverless function with proper headers and caching
      const audioUrl = `/api/tts?text=${encoded}`;
      const audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous';
      this._fallbackAudio = audio;

      let hasFinished = false;
      const done = () => {
        if (hasFinished) return;
        hasFinished = true;
        if (onEnd) onEnd();
      };

      audio.onended = done;
      audio.onerror = (e) => {
        console.warn('TTS proxy playback error:', e);
        done();
      };

      const playPromise = audio.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(e => {
          console.warn('Audio play() promise rejected:', e);
          done();
        });
      }
    } catch(e) {
      console.warn('playFallbackAudio exception:', e);
      if (onEnd) onEnd();
    }
  },

  playCorrectSound() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch(e) {}
  },

  playWrongSound() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch(e) {}
  },

  playVictorySound() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = this.audioCtx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const startTime = now + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch(e) {}
  },

  playClickSound() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch(e) {}
  },

  _recognition: null,
  isListening: false,

  recognizeSpeech(expectedText, onResult) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (typeof App !== 'undefined' && App.toast) {
        App.toast('Trình duyệt chưa hỗ trợ ghi âm tiếng Trung. Bạn hãy thử Google Chrome hoặc Edge nhé!', 'warning', 4000);
      }
      return;
    }

    if (this.isListening && this._recognition) {
      try { this._recognition.stop(); } catch(e) {}
      this.isListening = false;
      return;
    }

    try {
      this._recognition = new SpeechRecognition();
      this._recognition.lang = 'zh-CN';
      this._recognition.interimResults = false;
      this._recognition.maxAlternatives = 3;

      this.isListening = true;
      if (typeof App !== 'undefined' && App.toast) {
        App.toast(`🎙️ Đang nghe... Hãy đọc to: "${expectedText}"`, 'info', 3000);
      }

      this._recognition.onresult = (event) => {
        this.isListening = false;
        const results = event.results[0];
        const spoken = results && results[0] ? results[0].transcript.trim() : '';
        const cleanExp = (expectedText || '').replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').toLowerCase();
        const cleanSpoken = spoken.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').toLowerCase();

        const isExact = cleanSpoken === cleanExp;
        const isClose = cleanSpoken.includes(cleanExp) || cleanExp.includes(cleanSpoken);

        if (isExact || (isClose && cleanSpoken.length > 0)) {
          this.playCorrectSound();
          if (typeof App !== 'undefined') {
            App.toast(`🎉 Xuất sắc! Phát âm rất chuẩn: "${spoken}"`, 'success', 3500);
            if (typeof StorageManager !== 'undefined' && StorageManager.addXP) {
              StorageManager.addXP(10, 'Phát âm chuẩn');
              StorageManager.recordDailyAction('speech', 1);
            }
          }
          if (onResult) onResult({ success: true, spoken, expected: expectedText });
        } else {
          this.playWrongSound();
          if (typeof App !== 'undefined') {
            App.toast(`Âm bạn vừa đọc: "${spoken}". Chưa khớp với "${expectedText}", hãy thử lại!`, 'warning', 4000);
          }
          if (onResult) onResult({ success: false, spoken, expected: expectedText });
        }
      };

      this._recognition.onerror = (e) => {
        this.isListening = false;
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          if (typeof App !== 'undefined' && App.toast) {
            App.toast('Vui lòng cấp quyền truy cập Micro trên trình duyệt để luyện nói.', 'warning', 4000);
          }
        } else if (e.error !== 'aborted') {
          if (typeof App !== 'undefined' && App.toast) {
            App.toast('Chưa thu được âm thanh. Hãy nhấn lại Micro và đọc to rõ hơn nhé!', 'info', 3000);
          }
        }
        if (onResult) onResult({ success: false, error: e.error });
      };

      this._recognition.onend = () => {
        this.isListening = false;
      };

      this._recognition.start();
    } catch (err) {
      this.isListening = false;
      console.warn('Failed to start speech recognition:', err);
    }
  }
};

// Global User Interaction Listener to unlock AudioContext and SpeechSynthesis
if (typeof document !== 'undefined') {
  const unlockAudio = () => {
    AudioEngine.initAudioContext();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };
  document.addEventListener('click', unlockAudio, { passive: true });
  document.addEventListener('touchstart', unlockAudio, { passive: true });
}

// Pre-load voices on browser
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    AudioEngine._voice = null;
    AudioEngine.getMandarinVoice();
  };
}

/** Escape user-provided text before injecting into HTML. */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Escape text for use inside a single-quoted JS string within an HTML attribute. */
function jsArg(str) {
  return escapeHtml(String(str == null ? '' : str).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}

if (typeof window !== 'undefined') {
  window.AudioEngine = AudioEngine;
  window.escapeHtml = escapeHtml;
  window.jsArg = jsArg;
}
