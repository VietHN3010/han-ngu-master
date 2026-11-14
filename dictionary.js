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
    document.getElementById(`dict-tab-${tab}`).classList.add('active');
    
    const query = document.getElementById('dict-search-input').value;
    this.search(query);
  },

  search(query) {
    const q = (query || '').trim().toLowerCase();
    const customWords = StorageManager.getData().customWords || [];
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
    const tbody = document.getElementById('dict-tbody');
    const countEl = document.getElementById('dict-result-count');
    if (!tbody) return;

    if (countEl) countEl.innerText = `${this.currentResults.length} từ`;

    if (!this.currentResults.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">
            Không tìm thấy từ vựng nào phù hợp.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.currentResults.map(w => {
      const isFav = StorageManager.isBookmarked(w.id);
      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <button class="btn-speaker" onclick="AudioEngine.speak('${w.hanzi}')">🔊</button>
              <span class="hanzi" style="font-size:1.3rem; font-weight:600; color:var(--text-primary);">${w.hanzi}</span>
              ${w.isCustom ? '<span style="font-size:0.68rem; background:#fef3c7; color:#b45309; padding:0.1rem 0.35rem; border-radius:4px;">Tự thêm</span>' : ''}
            </div>
          </td>
          <td style="color:var(--primary); font-weight:600;">${w.pinyin}</td>
          <td style="color:var(--text-secondary); text-transform:uppercase; font-size:0.85rem;">${w.hanviet || '—'}</td>
          <td><span class="flashcard-pos" style="margin:0;">${w.pos || 'Từ vựng'}</span></td>
          <td style="font-weight:500;">${w.meaning}</td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              <button class="btn btn-outline btn-sm" onclick="App.navigateTo('writer'); HanziController.loadCharacter('${w.hanzi}');" title="Luyện viết">✍️</button>
              <button class="btn btn-outline btn-sm" onclick="DictionaryController.toggleBookmark('${w.id}', this)" title="Lưu từ">
                ${isFav ? '★' : '☆'}
              </button>
              ${w.isCustom ? `<button class="btn btn-outline btn-sm" onclick="DictionaryController.deleteCustom('${w.id}')" title="Xóa từ" style="color:#ef4444;">🗑️</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  toggleBookmark(wordId, btn) {
    const isNow = StorageManager.toggleBookmark(wordId);
    btn.innerText = isNow ? '★' : '☆';
  },

  deleteCustom(wordId) {
    if (confirm('Bạn có chắc muốn xóa từ vựng này khỏi sổ tay cá nhân?')) {
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
      alert('Vui lòng nhập ít nhất Chữ Hán và Nghĩa tiếng Việt!');
      return;
    }

    StorageManager.addCustomWord({ hanzi, pinyin, hanviet, meaning, pos });
    this.closeAddModal();
    // Reset form
    document.getElementById('add-word-form').reset();
    this.search(document.getElementById('dict-search-input').value);
    App.updateDashboardStats();
    alert('Đã thêm từ vựng mới vào sổ tay thành công!');
  },

  exportBackup() {
    const data = StorageManager.getData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chinese_app_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.streak !== undefined || parsed.bookmarks) {
          StorageManager.saveData(parsed);
          alert('Khôi phục dữ liệu tiến độ thành công!');
          location.reload();
        } else {
          alert('Tệp sao lưu không hợp lệ!');
        }
      } catch(err) {
        alert('Lỗi đọc tệp sao lưu JSON!');
      }
    };
    reader.readAsText(file);
  }
};
