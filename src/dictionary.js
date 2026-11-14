/**
 * Dictionary Search & Custom Vocabulary Notebook
 */
const DictionaryController = {
  allWords: [],
  currentResults: [],
  activeTab: 'all', // 'all', 'bookmarks', 'custom'

  init(allWords) {
    this.allWords = allWords || [];
    this.search('');
  },

  setTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.dict-tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`dict-tab-${tab}`);
    if (btn) btn.classList.add('active');
    
    const query = document.getElementById('dict-search-input').value;
    this.search(query);
  },

  search(query) {
    const q = (query || '').trim().toLowerCase();
    const user = StorageManager.getCurrentUser() || {};
    const customWords = user.customWords || [];
    const combined = [...customWords, ...this.allWords];

    let filtered = combined;
    if (this.activeTab === 'bookmarks') {
      filtered = filtered.filter(w => StorageManager.isBookmarked(w.id));
    } else if (this.activeTab === 'custom') {
      filtered = filtered.filter(w => w.isCustom);
    }

    if (q) {
      filtered = filtered.filter(w => {
        const hanziMatch = w.hanzi && w.hanzi.includes(q);
        const pinyinMatch = w.pinyin && w.pinyin.toLowerCase().includes(q);
        const meaningMatch = w.meaning && w.meaning.toLowerCase().includes(q);
        const hanvietMatch = w.hanviet && w.hanviet.toLowerCase().includes(q);
        return hanziMatch || pinyinMatch || meaningMatch || hanvietMatch;
      });
    }

    this.currentResults = filtered;
    this.render();
  },

  render() {
    const container = document.getElementById('dict-container');
    const countEl = document.getElementById('dict-result-count');
    if (!container) return;

    if (countEl) countEl.innerText = `${this.currentResults.length} từ`;

    if (!this.currentResults.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.85rem;">
          Không tìm thấy từ vựng nào phù hợp.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="vocab-cards-list">
        ${this.currentResults.slice(0, 100).map(w => {
          const isFav = StorageManager.isBookmarked(w.id);
          return `
            <div class="vocab-item-card">
              <div class="vocab-item-left">
                <button class="btn-speaker" onclick="AudioEngine.speak('${w.hanzi}')">🔊</button>
                <div class="vocab-item-info">
                  <div style="display:flex; align-items:baseline; gap:0.4rem;">
                    <span class="vocab-item-hanzi">${w.hanzi}</span>
                    <span class="vocab-item-py">${w.pinyin}</span>
                    ${w.isCustom ? '<span style="font-size:0.65rem; background:#fef3c7; color:#b45309; padding:0.1rem 0.3rem; border-radius:3px;">Tự thêm</span>' : ''}
                  </div>
                  <div class="vocab-item-mean">${w.meaning}</div>
                  <div class="vocab-item-meta">${w.pos ? `<span class="flashcard-pos" style="margin:0.15rem 0.35rem 0 0;">${w.pos}</span>` : ''}${w.hanviet ? `Hán Việt: ${w.hanviet}` : ''}</div>
                </div>
              </div>
              <div style="display:flex; gap:0.3rem; flex-shrink:0;">
                <button class="btn btn-outline btn-sm" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${w.hanzi}');" title="Tập viết">✍️</button>
                <button class="btn btn-outline btn-sm" onclick="DictionaryController.toggleBookmark('${w.id}', this)" title="Lưu">
                  ${isFav ? '★' : '☆'}
                </button>
                ${w.isCustom ? `<button class="btn btn-outline btn-sm" onclick="DictionaryController.deleteCustom('${w.id}')" title="Xóa" style="color:#ef4444;">🗑️</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${this.currentResults.length > 100 ? '<p style="text-align:center; padding:1rem; font-size:0.8rem; color:var(--text-muted);">Hiển thị 100 từ đầu tiên. Hãy gõ từ khóa để lọc chi tiết hơn.</p>' : ''}
    `;
  },

  toggleBookmark(wordId, btn) {
    const isNow = StorageManager.toggleBookmark(wordId);
    btn.innerText = isNow ? '★' : '☆';
  },

  deleteCustom(wordId) {
    if (confirm('Bạn có chắc muốn xóa từ vựng này khỏi sổ tay?')) {
      StorageManager.deleteCustomWord(wordId);
      this.search(document.getElementById('dict-search-input').value);
      App.updateDashboardStats();
    }
  },

  openAddModal() {
    document.getElementById('add-word-modal').classList.add('active');
  },

  closeAddModal() {
    document.getElementById('add-word-modal').classList.remove('active');
  },

  handleSaveCustomWord(e) {
    e.preventDefault();
    const hanzi = document.getElementById('custom-hanzi').value;
    const pinyin = document.getElementById('custom-pinyin').value;
    const hanviet = document.getElementById('custom-hanviet').value;
    const meaning = document.getElementById('custom-meaning').value;
    const pos = document.getElementById('custom-pos').value;

    if (!hanzi || !meaning) {
      alert('Vui lòng nhập Chữ Hán và Nghĩa!');
      return;
    }

    StorageManager.addCustomWord({ hanzi, pinyin, hanviet, meaning, pos });
    this.closeAddModal();
    document.getElementById('add-word-form').reset();
    this.search(document.getElementById('dict-search-input').value);
    App.updateDashboardStats();
  },

  exportBackup() {
    const data = StorageManager.getCurrentUser() || {};
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chinese_app_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
