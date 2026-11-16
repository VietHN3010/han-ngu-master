/**
 * Interactive Pinyin Pronunciation Matrix (Thanh mẫu, Vận mẫu & 4 Thanh điệu)
 */

const PinyinController = {
  initials: [
    { pinyin: 'b', vi: 'púa (âm môi)', ex: 'bàba' },
    { pinyin: 'p', vi: 'pua (bật hơi mạnh)', ex: 'píngguǒ' },
    { pinyin: 'm', vi: 'mua (m- như tiếng Việt)', ex: 'māma' },
    { pinyin: 'f', vi: 'phua (ph- như tiếng Việt)', ex: 'fēi' },
    { pinyin: 'd', vi: 'tưa (như chữ T)', ex: 'dà' },
    { pinyin: 't', vi: 'thưa (như chữ TH, bật hơi)', ex: 'tā' },
    { pinyin: 'n', vi: 'nưa (như chữ N)', ex: 'nǐ' },
    { pinyin: 'l', vi: 'lưa (như chữ L)', ex: 'lǎo' },
    { pinyin: 'g', vi: 'cưa (như chữ C/K)', ex: 'gēge' },
    { pinyin: 'k', vi: 'khưa (như chữ KH, bật hơi)', ex: 'kāi' },
    { pinyin: 'h', vi: 'hưa (như chữ H nhẹ)', ex: 'hǎo' },
    { pinyin: 'j', vi: 'chi (mặt lưỡi)', ex: 'jiā' },
    { pinyin: 'q', vi: 'chi (bật hơi sắc)', ex: 'qǐng' },
    { pinyin: 'x', vi: 'xi (như chữ X)', ex: 'xièxie' },
    { pinyin: 'zh', vi: 'trưa (uốn lưỡi, không bật)', ex: 'zhōng' },
    { pinyin: 'ch', vi: 'trưa (uốn lưỡi, bật hơi)', ex: 'chī' },
    { pinyin: 'sh', vi: 'sưa (uốn lưỡi như S)', ex: 'shì' },
    { pinyin: 'r', vi: 'rưa (như R tiếng Việt)', ex: 'rén' },
    { pinyin: 'z', vi: 'chưa (đầu lưỡi thẳng)', ex: 'zài' },
    { pinyin: 'c', vi: 'thưa/chưa (bật hơi đầu lưỡi)', ex: 'cài' },
    { pinyin: 's', vi: 'xưa (đầu lưỡi thẳng)', ex: 'sān' },
    { pinyin: 'y', vi: 'di (bán nguyên âm)', ex: 'yī' },
    { pinyin: 'w', vi: 'ua (bán nguyên âm)', ex: 'wǒ' }
  ],

  finals: [
    { pinyin: 'a', vi: 'a (mở to miệng)', ex: 'mā' },
    { pinyin: 'o', vi: 'ua/ô (tròn môi)', ex: 'bō' },
    { pinyin: 'e', vi: 'ưa (nửa mở)', ex: 'gē' },
    { pinyin: 'i', vi: 'i (dẹt môi)', ex: 'qī' },
    { pinyin: 'u', vi: 'u (tròn môi nhô)', ex: 'bù' },
    { pinyin: 'ü', vi: 'uy (tròn môi giữ nguyên)', ex: 'yǚ' },
    { pinyin: 'ai', vi: 'ai', ex: 'bái' },
    { pinyin: 'ei', vi: 'ây', ex: 'běi' },
    { pinyin: 'ao', vi: 'ao', ex: 'hǎo' },
    { pinyin: 'ou', vi: 'âu', ex: 'dǒu' },
    { pinyin: 'an', vi: 'an', ex: 'sān' },
    { pinyin: 'en', vi: 'ơn/ân', ex: 'hěn' },
    { pinyin: 'ang', vi: 'ang', ex: 'máng' },
    { pinyin: 'eng', vi: 'âng/ơng', ex: 'fēng' },
    { pinyin: 'ong', vi: 'ung', ex: 'zhōng' },
    { pinyin: 'ia', vi: 'ia', ex: 'jiā' },
    { pinyin: 'ie', vi: 'iê', ex: 'xiè' },
    { pinyin: 'iao', vi: 'ieo', ex: 'xiǎo' },
    { pinyin: 'iu', vi: 'iêu', ex: 'liù' },
    { pinyin: 'ian', vi: 'iên', ex: 'tiān' },
    { pinyin: 'in', vi: 'in', ex: 'jīn' },
    { pinyin: 'iang', vi: 'iang', ex: 'liǎng' },
    { pinyin: 'ing', vi: 'inh', ex: 'míng' },
    { pinyin: 'iong', vi: 'iung', ex: 'xióng' },
    { pinyin: 'ua', vi: 'oa', ex: 'huā' },
    { pinyin: 'uo', vi: 'ua/uô', ex: 'zuò' },
    { pinyin: 'uai', vi: 'oai', ex: 'kuài' },
    { pinyin: 'ui', vi: 'uêi/ui', ex: 'duì' },
    { pinyin: 'uan', vi: 'oan', ex: 'guān' },
    { pinyin: 'un', vi: 'uân', ex: 'wún' },
    { pinyin: 'uang', vi: 'oang', ex: 'huáng' },
    { pinyin: 'üe', vi: 'uyê', ex: 'yuè' },
    { pinyin: 'üan', vi: 'uyên', ex: 'yuán' },
    { pinyin: 'ün', vi: 'uyn', ex: 'yún' }
  ],

  tones: [
    { name: 'Thanh 1 (Âm Bình)', mark: 'ā (55)', desc: 'Cao, phẳng đều, ngân dài', sample: 'mā (妈 - mẹ)', sound: 'mā' },
    { name: 'Thanh 2 (Dương Bình)', mark: 'á (35)', desc: 'Từ trung bình vút lên cao (như dấu sắc nhẹ)', sample: 'má (麻 - sợi đay)', sound: 'má' },
    { name: 'Thanh 3 (Thượng Thanh)', mark: 'ǎ (214)', desc: 'Hạ thấp rồi uốn nhẹ lên (hơi giống dấu hỏi)', sample: 'mǎ (马 - con ngựa)', sound: 'mǎ' },
    { name: 'Thanh 4 (Khứ Thanh)', mark: 'à (51)', desc: 'Rơi thẳng dứt khoát từ cao nhất xuống thấp nhất', sample: 'mà (骂 - mắng)', sound: 'mà' },
    { name: 'Khinh Thanh (Thanh nhẹ)', mark: 'ma (0)', desc: 'Đọc thật ngắn, nhẹ và lướt', sample: 'ma (吗 - không?)', sound: 'ma' }
  ],

  openModal() {
    const modal = document.getElementById('pinyin-matrix-modal');
    if (!modal) return;
    this.render();
    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('pinyin-matrix-modal');
    if (modal) modal.classList.remove('active');
  },

  render() {
    const initContainer = document.getElementById('pinyin-initials-grid');
    const finalContainer = document.getElementById('pinyin-finals-grid');
    const tonesContainer = document.getElementById('pinyin-tones-grid');

    if (initContainer && !initContainer.children.length) {
      initContainer.innerHTML = this.initials.map(item => `
        <button class="pinyin-cell" onclick="AudioEngine.speak('${item.pinyin}')" title="Phát âm: ${item.vi}">
          <span class="pinyin-name">${item.pinyin}</span>
          <span class="pinyin-tip">${item.vi}</span>
          <span class="pinyin-ex">VD: ${item.ex}</span>
        </button>
      `).join('');
    }

    if (finalContainer && !finalContainer.children.length) {
      finalContainer.innerHTML = this.finals.map(item => `
        <button class="pinyin-cell" onclick="AudioEngine.speak('${item.pinyin}')" title="Phát âm: ${item.vi}">
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
