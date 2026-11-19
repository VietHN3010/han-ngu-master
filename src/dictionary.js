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
      <div class="vocab-cards-list vocab-v2">
        ${this.currentResults.slice(0, 100).map(w => {
          const isFav = StorageManager.isBookmarked(w.id);
          const arg = typeof jsArg === 'function' ? jsArg(w.hanzi) : w.hanzi;
          const esc = (v) => UI.esc(v);
          return `
            <div class="vocab-item-card">
              <button class="vocab-play" onclick="AudioEngine.speak('${arg}')" aria-label="Nghe ${esc(w.hanzi)}">${Icon.svg('sound')}</button>
              <div class="vocab-item-info">
                <div class="vocab-line">
                  <span class="vocab-item-hanzi hanzi">${w.hanzi}</span>
                  <span class="vocab-item-py py">${Tone.html(w.pinyin)}</span>
                </div>
                <div class="vocab-item-mean">${esc(w.meaning)}</div>
                <div class="vocab-item-meta">
                  ${w.hanviet ? `<span class="hv-badge">${esc(w.hanviet)}</span>` : ''}
                  ${w.pos ? `<span class="pos-badge">${esc(w.pos)}</span>` : ''}
                  ${typeof w.lesson === 'number' ? `<span class="pos-badge">Bài ${w.lesson}</span>` : ''}
                  ${w.isCustom ? '<span class="hv-badge">Tự thêm</span>' : ''}
                </div>
                ${w.example ? `<div class="vocab-example">${esc(w.example)}</div>` : ''}
              </div>
              <div class="vocab-actions">
                <button class="icon-btn" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${arg}');" aria-label="Tập viết ${esc(w.hanzi)}" title="Tập viết">${Icon.svg('pen')}</button>
                <button class="icon-btn ${isFav ? 'on' : ''}" onclick="DictionaryController.toggleBookmark('${w.id}', this)" aria-label="Lưu ${esc(w.hanzi)}" aria-pressed="${isFav}" title="Lưu vào Sổ tay">${Icon.svg(isFav ? 'starFill' : 'star')}</button>
                ${w.isCustom ? `<button class="icon-btn" onclick="DictionaryController.deleteCustom('${w.id}')" aria-label="Xóa từ ${esc(w.hanzi)}" title="Xóa">${Icon.svg('x')}</button>` : ''}
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
    btn.innerHTML = Icon.svg(isNow ? 'starFill' : 'star');
    btn.classList.toggle('on', isNow);
    btn.setAttribute('aria-pressed', isNow ? 'true' : 'false');
  },

  async deleteCustom(wordId) {
    const ok = await UI.confirm({ title: 'Xóa từ này khỏi Sổ tay?', body: 'Từ tự thêm sẽ bị xóa và không khôi phục được.', ok: 'Xóa', danger: true });
    if (ok) {
      StorageManager.deleteCustomWord(wordId);
      this.search(document.getElementById('dict-search-input').value);
      App.updateDashboardStats();
    }
  },

  openAddModal(pushHistory = true) {
    document.getElementById('add-word-modal').classList.add('active');
    if (pushHistory && window.location.hash !== '#add-word') {
      history.pushState({ type: 'modal', modal: 'add-word' }, '', '#add-word');
    }
  },

  closeAddModal(triggerHistoryBack = true) {
    document.getElementById('add-word-modal').classList.remove('active');
    if (triggerHistoryBack && window.location.hash === '#add-word') {
      history.back();
    }
  },

  handleSaveCustomWord(e) {
    e.preventDefault();
    const hanzi = document.getElementById('custom-hanzi').value;
    const pinyin = document.getElementById('custom-pinyin').value;
    const hanviet = document.getElementById('custom-hanviet').value;
    const meaning = document.getElementById('custom-meaning').value;
    const pos = document.getElementById('custom-pos').value;

    if (!hanzi || !meaning) {
      App.toast('Vui lòng nhập Chữ Hán và Nghĩa.', 'warning');
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

if (typeof window !== 'undefined') {
  window.DictionaryController = DictionaryController;
}
