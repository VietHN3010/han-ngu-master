/**
 * Audio Engine: Web Speech API (Chinese TTS) + Web Audio API Sound Effects
 */
const AudioEngine = {
  speechRate: 0.9,
  audioCtx: null,

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  _voice: null,

  getMandarinVoice() {
    if (this._voice) return this._voice;
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
      if (/google|tingting|ting-ting|xiaoxiao|yunxi|lili|meijia/.test(n)) s += 10;
      if (v.localService) s += 2;
      return s;
    };
    const best = voices.map(v => [score(v), v]).filter(x => x[0] > -1000).sort((a, b) => b[0] - a[0])[0];
    this._voice = best ? best[1] : null;
    return this._voice;
  },

  speak(text, onEnd) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
      if (typeof App !== 'undefined' && App.toast) App.toast('Trình duyệt này không hỗ trợ phát âm.', 'warning');
      return;
    }
    window.speechSynthesis.cancel(); // Stop any pending speech

    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9,\.!\?，。！？]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';
    utterance.rate = this.speechRate;

    // Pick a Mandarin (Mainland) voice; avoid Cantonese (zh-HK) when possible
    const zhVoice = this.getMandarinVoice();
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }
    window.speechSynthesis.speak(utterance);
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
  }
};

// Pre-load voices on browser
if ('speechSynthesis' in window) {
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
