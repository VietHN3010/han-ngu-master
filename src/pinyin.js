/**
 * Interactive Pinyin Pronunciation Matrix (Thanh mẫu, Vận mẫu & 4 Thanh điệu)
 */

const PinyinController = {
  initials: [
    { pinyin: 'b', sound: '玻', vi: 'púa (âm môi)', ex: 'bàba' },
    { pinyin: 'p', sound: '坡', vi: 'pua (bật hơi mạnh)', ex: 'píngguǒ' },
    { pinyin: 'm', sound: '摸', vi: 'mua (m- như tiếng Việt)', ex: 'māma' },
    { pinyin: 'f', sound: '佛', vi: 'phua (ph- như tiếng Việt)', ex: 'fēi' },
    { pinyin: 'd', sound: '得', vi: 'tưa (như chữ T)', ex: 'dà' },
    { pinyin: 't', sound: '特', vi: 'thưa (như chữ TH, bật hơi)', ex: 'tā' },
    { pinyin: 'n', sound: '讷', vi: 'nưa (như chữ N)', ex: 'nǐ' },
    { pinyin: 'l', sound: '勒', vi: 'lưa (như chữ L)', ex: 'lǎo' },
    { pinyin: 'g', sound: '哥', vi: 'cưa (như chữ C/K)', ex: 'gēge' },
    { pinyin: 'k', sound: '科', vi: 'khưa (như chữ KH, bật hơi)', ex: 'kāi' },
    { pinyin: 'h', sound: '喝', vi: 'hưa (như chữ H nhẹ)', ex: 'hǎo' },
    { pinyin: 'j', sound: '基', vi: 'chi (mặt lưỡi)', ex: 'jiā' },
    { pinyin: 'q', sound: '欺', vi: 'chi (bật hơi sắc)', ex: 'qǐng' },
    { pinyin: 'x', sound: '希', vi: 'xi (như chữ X)', ex: 'xièxie' },
    { pinyin: 'zh', sound: '知', vi: 'trưa (uốn lưỡi, không bật)', ex: 'zhōng' },
    { pinyin: 'ch', sound: '蚩', vi: 'trưa (uốn lưỡi, bật hơi)', ex: 'chī' },
    { pinyin: 'sh', sound: '诗', vi: 'sưa (uốn lưỡi như S)', ex: 'shì' },
    { pinyin: 'r', sound: '日', vi: 'rưa (như R tiếng Việt)', ex: 'rén' },
    { pinyin: 'z', sound: '资', vi: 'chưa (đầu lưỡi thẳng)', ex: 'zài' },
    { pinyin: 'c', sound: '雌', vi: 'thưa/chưa (bật hơi đầu lưỡi)', ex: 'cài' },
    { pinyin: 's', sound: '思', vi: 'xưa (đầu lưỡi thẳng)', ex: 'sān' },
    { pinyin: 'y', sound: '衣', vi: 'di (bán nguyên âm)', ex: 'yī' },
    { pinyin: 'w', sound: '乌', vi: 'ua (bán nguyên âm)', ex: 'wǒ' }
  ],

  finals: [
    { pinyin: 'a', sound: '啊', vi: 'a (mở to miệng)', ex: 'mā' },
    { pinyin: 'o', sound: '喔', vi: 'ua/ô (tròn môi)', ex: 'bō' },
    { pinyin: 'e', sound: '鹅', vi: 'ưa (nửa mở)', ex: 'gē' },
    { pinyin: 'i', sound: '衣', vi: 'i (dẹt môi)', ex: 'qī' },
    { pinyin: 'u', sound: '乌', vi: 'u (tròn môi nhô)', ex: 'bù' },
    { pinyin: 'ü', sound: '迂', vi: 'uy (tròn môi giữ nguyên)', ex: 'nǚ (女)' },
    { pinyin: 'er', sound: '儿', vi: 'ơr (uốn lưỡi)', ex: 'érzi' },
    { pinyin: 'ai', sound: '哀', vi: 'ai', ex: 'bái' },
    { pinyin: 'ei', sound: '杯', vi: 'ây', ex: 'běi' },
    { pinyin: 'ao', sound: '熬', vi: 'ao', ex: 'hǎo' },
    { pinyin: 'ou', sound: '欧', vi: 'âu', ex: 'dǒu' },
    { pinyin: 'an', sound: '安', vi: 'an', ex: 'sān' },
    { pinyin: 'en', sound: '恩', vi: 'ơn/ân', ex: 'hěn' },
    { pinyin: 'ang', sound: '昂', vi: 'ang', ex: 'máng' },
    { pinyin: 'eng', sound: '亨', vi: 'âng/ơng', ex: 'fēng' },
    { pinyin: 'ong', sound: '轰', vi: 'ung', ex: 'zhōng' },
    { pinyin: 'ia', sound: '呀', vi: 'ia', ex: 'jiā' },
    { pinyin: 'ie', sound: '耶', vi: 'iê', ex: 'xiè' },
    { pinyin: 'iao', sound: '腰', vi: 'ieo', ex: 'xiǎo' },
    { pinyin: 'iu', sound: '优', vi: 'iêu', ex: 'liù' },
    { pinyin: 'ian', sound: '烟', vi: 'iên', ex: 'tiān' },
    { pinyin: 'in', sound: '因', vi: 'in', ex: 'jīn' },
    { pinyin: 'iang', sound: '央', vi: 'iang', ex: 'liǎng' },
    { pinyin: 'ing', sound: '英', vi: 'inh', ex: 'míng' },
    { pinyin: 'iong', sound: '拥', vi: 'iung', ex: 'xióng' },
    { pinyin: 'ua', sound: '蛙', vi: 'oa', ex: 'huā' },
    { pinyin: 'uo', sound: '窝', vi: 'ua/uô', ex: 'zuò' },
    { pinyin: 'uai', sound: '歪', vi: 'oai', ex: 'kuài' },
    { pinyin: 'ui', sound: '威', vi: 'uêi/ui', ex: 'duì' },
    { pinyin: 'uan', sound: '弯', vi: 'oan', ex: 'guān' },
    { pinyin: 'un', sound: '温', vi: 'uân', ex: 'cūn (村)' },
    { pinyin: 'uang', sound: '汪', vi: 'oang', ex: 'huáng' },
    { pinyin: 'ueng', sound: '翁', vi: 'uâng', ex: 'wēng' },
    { pinyin: 'üe', sound: '约', vi: 'uyê', ex: 'yuè' },
    { pinyin: 'üan', sound: '冤', vi: 'uyên', ex: 'yuán' },
    { pinyin: 'ün', sound: '晕', vi: 'uyn', ex: 'yún' }
  ],

  tones: [
    { name: 'Thanh 1 (Âm Bình)', mark: 'ā (55)', desc: 'Cao, phẳng đều, ngân dài', sample: 'mā (妈 - mẹ)', sound: '妈' },
    { name: 'Thanh 2 (Dương Bình)', mark: 'á (35)', desc: 'Từ trung bình vút lên cao (như dấu sắc nhẹ)', sample: 'má (麻 - sợi đay)', sound: '麻' },
    { name: 'Thanh 3 (Thượng Thanh)', mark: 'ǎ (214)', desc: 'Hạ thấp rồi uốn nhẹ lên (hơi giống dấu hỏi)', sample: 'mǎ (马 - con ngựa)', sound: '马' },
    { name: 'Thanh 4 (Khứ Thanh)', mark: 'à (51)', desc: 'Rơi thẳng dứt khoát từ cao nhất xuống thấp nhất', sample: 'mà (骂 - mắng)', sound: '骂' },
    { name: 'Khinh Thanh (Thanh nhẹ)', mark: 'ma (0)', desc: 'Đọc thật ngắn, nhẹ và lướt', sample: 'ma (吗 - không?)', sound: '吗' }
  ],

  openModal(pushHistory = true) {
    const modal = document.getElementById('pinyin-matrix-modal');
    if (!modal) return;
    this.render();
    modal.classList.add('active');
    if (pushHistory && window.location.hash !== '#pinyin') {
      history.pushState({ type: 'modal', modal: 'pinyin' }, '', '#pinyin');
    }
  },

  closeModal(triggerHistoryBack = true) {
    const modal = document.getElementById('pinyin-matrix-modal');
    if (modal) modal.classList.remove('active');
    if (triggerHistoryBack && window.location.hash === '#pinyin') {
      history.back();
    }
  },

  render() {
    const initContainer = document.getElementById('pinyin-initials-grid');
    const finalContainer = document.getElementById('pinyin-finals-grid');
    const tonesContainer = document.getElementById('pinyin-tones-grid');

    if (initContainer && !initContainer.children.length) {
      initContainer.innerHTML = this.initials.map(item => `
        <button class="pinyin-cell" onclick="AudioEngine.speak('${item.sound || item.pinyin}')" title="Phát âm: ${item.vi}">
          <span class="pinyin-name">${item.pinyin}</span>
          <span class="pinyin-tip">${item.vi}</span>
          <span class="pinyin-ex">VD: ${item.ex}</span>
        </button>
      `).join('');
    }

    if (finalContainer && !finalContainer.children.length) {
      finalContainer.innerHTML = this.finals.map(item => `
        <button class="pinyin-cell" onclick="AudioEngine.speak('${item.sound || item.pinyin}')" title="Phát âm: ${item.vi}">
          <span class="pinyin-name">${item.pinyin}</span>
          <span class="pinyin-tip">${item.vi}</span>
          <span class="pinyin-ex">VD: ${item.ex}</span>
        </button>
      `).join('');
    }

    if (tonesContainer && !tonesContainer.children.length) {
      tonesContainer.innerHTML = this.tones.map(t => `
        <div class="pinyin-tone-card" onclick="AudioEngine.speak('${t.sound}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--primary); font-size:1.05rem;">${t.name}</strong>
            <span style="background:var(--primary-light); color:var(--primary); font-weight:800; padding:0.15rem 0.5rem; border-radius:6px;">${t.mark}</span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin:0.35rem 0;">${t.desc}</div>
          <div style="font-size:0.88rem; font-weight:600; color:var(--secondary); display:flex; justify-content:space-between; align-items:center;">
            <span>Ví dụ: ${t.sample}</span>
            <span style="font-size:1.2rem;">🔊</span>
          </div>
        </div>
      `).join('');
    }
  }
};

if (typeof window !== 'undefined') {
  window.PinyinController = PinyinController;
}
