/**
 * Guide: "Kiến thức" reference pages for Vietnamese learners.
 * Sections: tones & tone sandhi, radicals (bộ thủ), measure words, numbers / time / dates, HSK exam.
 * Examples are pulled from the app's own 744-word curriculum so every example links to a word
 * the learner will meet in the lessons.
 */
const Guide = {
  section: 'tones',

  SECTIONS: [
    { id: 'tones', label: 'Thanh điệu' },
    { id: 'radicals', label: 'Bộ thủ' },
    { id: 'measure', label: 'Lượng từ' },
    { id: 'numbers', label: 'Số, giờ, ngày' },
    { id: 'hsk', label: 'Kỳ thi HSK' }
  ],

  // Common radicals for HSK 1-2: [radical, Hán Việt name, meaning, example characters containing it]
  RADICALS: [
    ['亻', 'Nhân đứng', 'người', '你他们住做休候'],
    ['口', 'Khẩu', 'miệng, nói, ăn', '吃喝叫吗呢哪唱'],
    ['女', 'Nữ', 'phụ nữ', '她妈姐妹好奶'],
    ['子', 'Tử', 'con, trẻ nhỏ', '字学孩'],
    ['氵', 'Thủy (ba chấm thủy)', 'nước, chất lỏng', '没汉洗游海酒'],
    ['扌', 'Thủ (tài gảy)', 'tay, động tác bằng tay', '打找把换'],
    ['忄', 'Tâm đứng', 'tim, tình cảm', '忙快怕'],
    ['心', 'Tâm', 'tim, suy nghĩ', '想您意思息'],
    ['日', 'Nhật', 'mặt trời, ngày, thời gian', '明时晚早昨是星'],
    ['月', 'Nguyệt / Nhục', 'mặt trăng; thịt, bộ phận cơ thể', '朋有脑期服'],
    ['木', 'Mộc', 'cây, gỗ', '机树椅桌校杯'],
    ['讠', 'Ngôn', 'lời nói', '说话语请谢课认识读'],
    ['宀', 'Miên', 'mái nhà', '家字安室客'],
    ['艹', 'Thảo', 'cỏ, cây cối', '茶菜苹花'],
    ['辶', 'Sước', 'bước đi, di chuyển', '这还进远近过道送'],
    ['门', 'Môn', 'cửa', '们问间'],
    ['钅', 'Kim', 'kim loại', '钱钟'],
    ['纟', 'Mịch', 'sợi tơ', '红给经绍级'],
    ['土', 'Thổ', 'đất', '地在坐场块'],
    ['灬', 'Hỏa (bốn chấm hỏa)', 'lửa, nhiệt', '点热照'],
    ['足', 'Túc', 'chân, đi lại', '跑跳路跟'],
    ['目', 'Mục', 'mắt, nhìn', '看睡眼睛'],
    ['贝', 'Bối', 'vỏ sò, tiền bạc', '贵费'],
    ['马', 'Mã', 'ngựa (thường gợi âm "ma")', '妈吗骑'],
    ['饣', 'Thực', 'ăn uống', '饭饿馆饺'],
    ['衤', 'Y', 'quần áo', '衬裤'],
    ['禾', 'Hòa', 'lúa, ngũ cốc', '和种秋'],
    ['⺮', 'Trúc', 'tre, đồ làm bằng tre', '笔第等答篮'],
    ['田', 'Điền', 'ruộng', '男'],
    ['力', 'Lực', 'sức lực', '动助加'],
    ['刂', 'Đao đứng', 'dao, cắt', '到别'],
    ['阝', 'Phụ / Ấp', 'gò đất (bên trái) / vùng đất (bên phải)', '院阴那都'],
    ['疒', 'Nạch', 'bệnh tật', '病疼'],
    ['雨', 'Vũ', 'mưa, thời tiết', '雪'],
    ['王', 'Ngọc', 'ngọc, đồ quý', '玩现球班'],
    ['广', 'Nghiễm', 'mái hiên, nhà rộng', '店床'],
    ['犭', 'Khuyển', 'chó, động vật', '狗猫'],
    ['鸟', 'Điểu', 'chim', '鸡'],
    ['页', 'Hiệt', 'đầu, trang', '题颜'],
    ['走', 'Tẩu', 'chạy, đi', '起'],
    ['见', 'Kiến', 'nhìn thấy', '觉现视'],
    ['攵', 'Phộc', 'đánh nhẹ, hành động', '教'],
    ['冫', 'Băng', 'băng, lạnh', '冷次准'],
    ['白', 'Bạch', 'màu trắng', '的百']
  ],

  // [measure word, pinyin, Hán Việt, used for, example zh, example py, example vi]
  MEASURES: [
    ['个', 'gè', 'cá', 'người, đồ vật nói chung (dùng nhiều nhất)', '一个人', 'yí gè rén', 'một người'],
    ['本', 'běn', 'bản', 'sách, vở', '两本书', 'liǎng běn shū', 'hai quyển sách'],
    ['张', 'zhāng', 'trương', 'vật mỏng, phẳng: giấy, vé, bàn, giường', '一张票', 'yì zhāng piào', 'một tấm vé'],
    ['杯', 'bēi', 'bôi', 'cốc, chén (đồ uống)', '一杯茶', 'yì bēi chá', 'một cốc trà'],
    ['件', 'jiàn', 'kiện', 'áo; sự việc', '一件衣服', 'yí jiàn yīfu', 'một chiếc áo'],
    ['条', 'tiáo', 'điều', 'vật dài, mảnh: quần, cá, đường, sông', '一条鱼', 'yì tiáo yú', 'một con cá'],
    ['只', 'zhī', 'chích', 'con vật nhỏ; một chiếc trong đôi', '一只猫', 'yì zhī māo', 'một con mèo'],
    ['辆', 'liàng', 'lượng', 'xe cộ', '一辆车', 'yí liàng chē', 'một chiếc xe'],
    ['口', 'kǒu', 'khẩu', 'số người trong gia đình', '我家有四口人', 'wǒ jiā yǒu sì kǒu rén', 'nhà tôi có bốn người'],
    ['块', 'kuài', 'khối', 'miếng, cục; đồng (tiền, khẩu ngữ)', '五块钱', 'wǔ kuài qián', 'năm đồng'],
    ['位', 'wèi', 'vị', 'người (lịch sự, trang trọng)', '一位老师', 'yí wèi lǎoshī', 'một thầy giáo'],
    ['双', 'shuāng', 'song', 'đôi: giày, đũa, tất', '一双鞋', 'yì shuāng xié', 'một đôi giày'],
    ['家', 'jiā', 'gia', 'cửa hàng, công ty, nhà hàng', '一家饭馆', 'yì jiā fànguǎn', 'một nhà hàng'],
    ['次', 'cì', 'thứ', 'số lần', '去过一次', 'qù guo yí cì', 'đã đi một lần'],
    ['些', 'xiē', 'ta', 'một vài, một ít', '一些水果', 'yì xiē shuǐguǒ', 'một ít hoa quả'],
    ['把', 'bǎ', 'bả', 'đồ vật có tay cầm: ghế, ô, dao', '一把椅子', 'yì bǎ yǐzi', 'một cái ghế']
  ],

  words() {
    return (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
  },

  /** App words containing a character (shortest first), for live examples. */
  wordsWith(ch, limit = 3) {
    return this.words().filter((w) => w.hanzi.includes(ch)).sort((a, b) => a.hanzi.length - b.hanzi.length).slice(0, limit);
  },

  /** First app word whose tones match a pattern, e.g. [1, 4]. Skips 一/不 and 3+3. */
  wordForPair(a, b) {
    if (!this._pairs) {
      this._pairs = {};
      this.words().forEach((w) => {
        const chars = [...w.hanzi].filter((c) => /[一-龥]/.test(c));
        if (chars.length !== 2 || chars.some((c) => c === '一' || c === '不')) return;
        const syl = Tone.splitWord((w.pinyin || '').replace(/\s+/g, ''));
        if (!syl || syl.length !== 2) return;
        const key = `${syl[0].tone}-${syl[1].tone}`;
        if (!this._pairs[key] || (w.lesson || 99) < (this._pairs[key].lesson || 99)) this._pairs[key] = w;
      });
    }
    return this._pairs[`${a}-${b}`] || null;
  },

  open(section) {
    if (section) this.section = section;
    if (App.currentTab !== 'guide') App.navigateTo('guide');
    else this.render();
  },

  wordChip(w) {
    return `<button class="word-chip" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')" aria-label="Nghe ${UI.esc(w.hanzi)}">
      <span class="hanzi">${w.hanzi}</span><span class="py">${Tone.html(w.pinyin)}</span><span class="wc-mean">${UI.esc(w.meaning)}</span></button>`;
  },

  say(zh, py, vi) {
    return `<button class="say-line" onclick="AudioEngine.speak('${jsArg(zh)}')"><span class="hanzi">${zh}</span><span class="py">${Tone.html(py)}</span><span class="say-vi">${UI.esc(vi)}</span>${Icon.svg('sound')}</button>`;
  },

  render() {
    const nav = document.getElementById('guide-nav');
    const body = document.getElementById('guide-body');
    if (!nav || !body) return;
    nav.innerHTML = this.SECTIONS.map((s) => `<button class="seg-btn ${s.id === this.section ? 'active' : ''}" onclick="Guide.open('${s.id}')">${s.label}</button>`).join('');
    const fn = { tones: 'renderTones', radicals: 'renderRadicals', measure: 'renderMeasures', numbers: 'renderNumbers', hsk: 'renderHsk' }[this.section] || 'renderTones';
    body.innerHTML = this[fn]();
  },

  renderTones() {
    const c = (t) => ToneDrill.contour(t, 'lg');
    const tones = [
      [1, 'mā', '妈', 'Cao và bằng, giữ giọng ở mức cao (gần thanh ngang nhưng cao hơn).'],
      [2, 'má', '麻', 'Đi lên từ giữa lên cao, giống hỏi lại "hả?" (gần thanh sắc).'],
      [3, 'mǎ', '马', 'Xuống thấp rồi lên. Trong câu thường chỉ đọc nửa đầu: thấp và trầm.'],
      [4, 'mà', '骂', 'Rơi mạnh từ cao xuống thấp, dứt khoát như ra lệnh.'],
      [5, 'ma', '吗', 'Thanh nhẹ: ngắn, nhẹ, không dấu, cao độ phụ thuộc âm tiết trước.']
    ];
    const pairCell = (a, b) => {
      if (a === 3 && b === 3) return '<td class="pair-sandhi" title="3+3 đọc thành 2+3">đọc 2+3</td>';
      const w = this.wordForPair(a, b);
      return w ? `<td><button class="pair-word" onclick="AudioEngine.speak('${jsArg(w.hanzi)}')"><span class="hanzi">${w.hanzi}</span><span class="py">${Tone.html(w.pinyin)}</span></button></td>` : '<td class="pair-empty">–</td>';
    };
    return `
      <article class="guide-card">
        <h3>4 thanh và thanh nhẹ</h3>
        <p class="guide-lead">Cùng âm <b>ma</b> nhưng khác thanh là khác nghĩa. Chạm vào từng dòng để nghe.</p>
        <div class="tone-list">
          ${tones.map(([t, py, zh, desc]) => `
            <button class="tone-item" onclick="AudioEngine.speak('${zh}')">
              ${c(t)}
              <span class="tone-item-main"><b class="t${t}">${py}</b> <span class="hanzi">${zh}</span></span>
              <span class="tone-item-desc">${desc}</span>
            </button>`).join('')}
        </div>
        <button class="btn btn-primary" onclick="ToneDrill.start('pair')">${Icon.svg('headphones')}<span>Luyện nghe phân biệt thanh</span></button>
      </article>

      <article class="guide-card">
        <h3>Quy tắc biến điệu</h3>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">3 + 3</span><div><b>Hai thanh 3 đứng liền nhau: thanh 3 đầu đọc thành thanh 2.</b>
            <p>Vẫn viết dấu thanh 3, chỉ đổi khi đọc.</p>${this.say('你好', 'nǐ hǎo', 'đọc là ní hǎo')}${this.say('很好', 'hěn hǎo', 'đọc là hén hǎo')}</div></div>
          <div class="rule"><span class="rule-tag">不</span><div><b>不 bù đứng trước thanh 4 đọc thành bú.</b>
            <p>Trước thanh 1, 2, 3 giữ nguyên bù.</p>${this.say('不是', 'bú shì', 'không phải')}${this.say('不去', 'bú qù', 'không đi')}${this.say('不好', 'bù hǎo', 'không tốt')}</div></div>
          <div class="rule"><span class="rule-tag">一</span><div><b>一 yī đổi thanh theo âm tiết phía sau.</b>
            <p>Trước thanh 4 (và 个) đọc yí; trước thanh 1, 2, 3 đọc yì; khi đếm số, đọc số thứ tự hoặc đứng cuối từ thì giữ yī.</p>${this.say('一个', 'yí gè', 'một cái')}${this.say('一天', 'yì tiān', 'một ngày')}${this.say('第一', 'dì yī', 'thứ nhất')}</div></div>
          <div class="rule"><span class="rule-tag">nhẹ</span><div><b>Thanh nhẹ thường gặp ở trợ từ và âm tiết lặp.</b>
            <p>吗, 呢, 的, 了 và âm tiết thứ hai của 妈妈, 爸爸, 谢谢.</p>${this.say('谢谢', 'xièxie', 'cảm ơn')}</div></div>
        </div>
      </article>

      <article class="guide-card">
        <h3>Bảng 20 cặp thanh</h3>
        <p class="guide-lead">Phần lớn từ tiếng Trung có hai âm tiết, nên luyện theo cặp giúp nhớ đường nét giọng của cả từ. Hàng là thanh âm tiết đầu, cột là âm tiết sau. Ví dụ lấy từ giáo trình.</p>
        <div class="table-scroll">
          <table class="pair-table">
            <thead><tr><th></th><th>+ 1</th><th>+ 2</th><th>+ 3</th><th>+ 4</th><th>+ nhẹ</th></tr></thead>
            <tbody>${[1, 2, 3, 4].map((a) => `<tr><th>${a}</th>${[1, 2, 3, 4, 5].map((b) => pairCell(a, b)).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      </article>`;
  },

  renderRadicals() {
    return `
      <article class="guide-card">
        <h3>Vì sao nên học bộ thủ</h3>
        <p class="guide-lead">Phần lớn chữ Hán ghép từ một bộ chỉ nghĩa và một phần gợi âm. Ví dụ 妈 = 女 (phụ nữ, gợi nghĩa) + 马 (mã, gợi âm "ma"). Nhận ra bộ thủ giúp đoán nghĩa chữ mới và nhớ lâu hơn. Dưới đây là ${this.RADICALS.length} bộ thủ gặp nhiều nhất ở HSK 1–2.</p>
      </article>
      <div class="radical-grid">
        ${this.RADICALS.map(([r, name, mean, chars]) => {
          const ex = [...chars].map((ch) => this.wordsWith(ch, 1)[0]).filter(Boolean).slice(0, 3);
          return `
          <article class="radical-card">
            <div class="radical-head">
              <span class="radical-glyph hanzi">${r}</span>
              <div><b>${name}</b><span>${mean}</span></div>
            </div>
            <div class="radical-chars hanzi">${[...chars].map((ch) => `<button onclick="App.navigateTo('writer'); HanziController.loadCharacter('${ch}')" aria-label="Tập viết ${ch}">${ch}</button>`).join('')}</div>
            ${ex.length ? `<div class="radical-ex">${ex.map((w) => this.wordChip(w)).join('')}</div>` : ''}
          </article>`;
        }).join('')}
      </div>
      <p class="muted-sm guide-foot">Chạm vào một chữ để luyện viết theo thứ tự nét.</p>`;
  },

  renderMeasures() {
    return `
      <article class="guide-card">
        <h3>Lượng từ là gì</h3>
        <p class="guide-lead">Tiếng Trung giống tiếng Việt: giữa số và danh từ phải có lượng từ (một <b>quyển</b> sách = 一<b>本</b>书). Cấu trúc: <b>Số + Lượng từ + Danh từ</b>. Trước lượng từ, số 2 dùng 两 liǎng chứ không dùng 二.</p>
      </article>
      <div class="measure-list">
        ${this.MEASURES.map(([mw, py, hv, use, zh, epy, vi]) => `
          <article class="measure-card">
            <button class="measure-head" onclick="AudioEngine.speak('${mw}')">
              <span class="radical-glyph hanzi">${mw}</span>
              <span><b class="py">${Tone.html(py)}</b> <span class="hv-badge">${hv}</span><span class="measure-use">${use}</span></span>
            </button>
            ${this.say(zh, epy, vi)}
          </article>`).join('')}
      </div>`;
  },

  renderNumbers() {
    const nums = [['零', 'líng', 0], ['一', 'yī', 1], ['二', 'èr', 2], ['三', 'sān', 3], ['四', 'sì', 4], ['五', 'wǔ', 5], ['六', 'liù', 6], ['七', 'qī', 7], ['八', 'bā', 8], ['九', 'jiǔ', 9], ['十', 'shí', 10]];
    return `
      <article class="guide-card">
        <h3>Số đếm</h3>
        <div class="num-grid">${nums.map(([zh, py, n]) => `<button class="num-cell" onclick="AudioEngine.speak('${zh}')"><span class="num-n">${n}</span><span class="hanzi">${zh}</span><span class="py">${Tone.html(py)}</span></button>`).join('')}</div>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">11–99</span><div><b>Ghép như tiếng Việt: chục + đơn vị.</b>${this.say('十五', 'shíwǔ', '15')}${this.say('二十', 'èrshí', '20')}${this.say('九十九', 'jiǔshíjiǔ', '99')}</div></div>
          <div class="rule"><span class="rule-tag">百 千 万</span><div><b>Trăm, nghìn, vạn (10.000).</b><p>Tiếng Trung đếm theo vạn: 10.000 là 一万, 100.000 là 十万.</p>${this.say('一百', 'yìbǎi', '100')}${this.say('三千', 'sānqiān', '3.000')}${this.say('一万', 'yíwàn', '10.000')}</div></div>
          <div class="rule"><span class="rule-tag">两</span><div><b>Trước lượng từ dùng 两, khi đếm dùng 二.</b>${this.say('两个人', 'liǎng gè rén', 'hai người')}${this.say('第二', 'dì èr', 'thứ hai')}</div></div>
        </div>
      </article>

      <article class="guide-card">
        <h3>Giờ giấc</h3>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">点 分</span><div><b>Giờ + 点, phút + 分.</b>${this.say('现在几点？', 'xiànzài jǐ diǎn?', 'bây giờ mấy giờ?')}${this.say('八点十分', 'bā diǎn shí fēn', '8 giờ 10 phút')}</div></div>
          <div class="rule"><span class="rule-tag">半 刻</span><div><b>半 = rưỡi, 一刻 = 15 phút, 差 = kém.</b>${this.say('七点半', 'qī diǎn bàn', '7 giờ rưỡi')}${this.say('三点一刻', 'sān diǎn yí kè', '3 giờ 15')}${this.say('差五分十点', 'chà wǔ fēn shí diǎn', '10 giờ kém 5')}</div></div>
          <div class="rule"><span class="rule-tag">Thứ tự</span><div><b>Thời gian đứng trước động từ, từ lớn đến nhỏ.</b>${this.say('我早上七点起床', 'wǒ zǎoshang qī diǎn qǐchuáng', 'tôi dậy lúc 7 giờ sáng')}</div></div>
        </div>
      </article>

      <article class="guide-card">
        <h3>Ngày tháng và thứ</h3>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">年 月 日</span><div><b>Viết từ lớn đến nhỏ: năm, tháng, ngày.</b><p>Năm đọc từng chữ số. Trong khẩu ngữ, 号 hào thường thay 日 rì.</p>${this.say('二〇二六年十一月二十号', 'èr líng èr liù nián shíyī yuè èrshí hào', 'ngày 20 tháng 11 năm 2026')}</div></div>
          <div class="rule"><span class="rule-tag">星期</span><div><b>Thứ = 星期 + số (thứ hai là 星期一). Chủ nhật là 星期天 hoặc 星期日.</b>${this.say('今天星期五', 'jīntiān xīngqīwǔ', 'hôm nay thứ sáu')}${this.say('星期天', 'xīngqītiān', 'chủ nhật')}</div></div>
        </div>
      </article>

      <article class="guide-card">
        <h3>Tiền</h3>
        <div class="rule-list">
          <div class="rule"><span class="rule-tag">块 毛</span><div><b>Khẩu ngữ dùng 块 (đồng) và 毛 (hào); văn viết dùng 元 và 角. 1 块 = 10 毛.</b>${this.say('多少钱？', 'duōshao qián?', 'bao nhiêu tiền?')}${this.say('三块五', 'sān kuài wǔ', '3,5 đồng')}</div></div>
        </div>
      </article>`;
  },

  renderHsk() {
    return `
      <article class="guide-card">
        <h3>Giáo trình này tương ứng với gì</h3>
        <p class="guide-lead">30 bài của Hán Ngữ Master đi theo hai cấp sơ cấp HSK 1 (Bài 1–15) và HSK 2 (Bài 16–30), gồm 744 từ, kèm Hán Việt cho người Việt.</p>
      </article>
      <article class="guide-card">
        <h3>HSK 3.0: kỳ thi đang đổi định dạng</h3>
        <p class="guide-lead">Theo các nguồn tổng hợp (chưa phải văn bản chính thức), chuẩn HSK mới có 9 cấp chia 3 bậc: Sơ cấp (1–3), Trung cấp (4–6), Cao cấp (7–9).</p>
        <div class="table-scroll">
          <table class="pair-table hsk-table">
            <thead><tr><th>Cấp</th><th>HSK 2.0 (cũ)</th><th>HSK 3.0, đề cương 2026 (cộng dồn)</th></tr></thead>
            <tbody>
              <tr><th>1</th><td>150 từ</td><td>khoảng 300 từ</td></tr>
              <tr><th>2</th><td>300 từ</td><td>khoảng 500 từ</td></tr>
              <tr><th>3</th><td>600 từ</td><td>khoảng 1.000 từ, có thi nói</td></tr>
            </tbody>
          </table>
        </div>
        <ul class="guide-points">
          <li>Kỳ thi đầu tiên theo định dạng mới được nhiều nguồn nhắc tới vào <b>tháng 12/2026</b>; các kỳ thi trước đó vẫn dùng HSK 2.0.</li>
          <li>Các nguồn chưa thống nhất về số từ và ngày áp dụng. <b>Hãy kiểm tra trên trang chính thức chinesetest.cn</b> trước khi đăng ký thi.</li>
          <li>Từ vựng trong 30 bài vẫn là nền tảng chung cho cả hai định dạng: luyện vững 744 từ này là chuẩn bị tốt cho cấp 1–2.</li>
        </ul>
      </article>`;
  }
};

if (typeof window !== 'undefined') {
  window.Guide = Guide;
}
