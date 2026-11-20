/**
 * Consolidate: "Củng cố kiến thức" for learners who keep forgetting earlier lessons.
 *
 *   1. Knowledge map  lessons grouped in clusters of 5 (per HSK level). A 10-question check per
 *                     cluster (6 vocabulary + 4 grammar) shows which clusters are weak (< 80%).
 *                     Words missed in a check go straight into the spaced-repetition queue.
 *   2. Confusables    sets of easily confused words (不/没, 了/过, 再/又 …): a rule card with
 *                     examples, a fill-in-the-blank drill, and their own review schedule.
 *   3. Daily plan     review due cards · check the weakest cluster · one confusable set ·
 *                     write 3 sentences of your own.
 *   4. Mode           one tap sets the review scope to every course reached and 20 new words a
 *                     day, so old words re-enter spaced repetition quickly; turning it off restores
 *                     the previous settings.
 *
 * Progress lives in user.consolidation (synced with the account via PROGRESS_FIELDS):
 *   { on, prev, clusters: {"1-5": {score, date, n}}, pairs: {id: {lvl, next, n, ok}},
 *     days: {"YYYY-MM-DD": {check, pair, write}}, sentences: {id: [..]} }
 */
const CONFUSABLES = [
  {
    id: 'bu_mei', lesson: 13, hsk: 1, words: ['不', '没'], title: '不 hay 没',
    rules: [
      { w: '不', use: 'Phủ định thói quen, sở thích, ý muốn, việc hiện tại hoặc tương lai, và tính từ. Dùng với 是 (不是).', ex: { zh: '我明天不去。', py: 'Wǒ míngtiān bú qù.', vi: 'Ngày mai tôi không đi.' } },
      { w: '没', use: 'Phủ định việc đã không xảy ra hoặc chưa xảy ra. Phủ định 有 luôn là 没有, không bao giờ nói 不有.', ex: { zh: '我昨天没去。', py: 'Wǒ zuótiān méi qù.', vi: 'Hôm qua tôi đã không đi.' } }
    ],
    tip: 'Hỏi: việc này đã (không) xảy ra chưa? Nếu đúng thì dùng 没. Còn nói về thói quen, ý muốn, tương lai thì dùng 不.',
    items: [
      { zh: '我昨天＿去学校。', a: ['没'], vi: 'Hôm qua tôi không đến trường.', why: 'Việc trong quá khứ đã không xảy ra nên dùng 没.' },
      { zh: '他＿喜欢喝咖啡。', a: ['不'], vi: 'Anh ấy không thích uống cà phê.', why: 'Sở thích (thói quen) nên dùng 不.' },
      { zh: '我＿有哥哥。', a: ['没'], vi: 'Tôi không có anh trai.', why: '有 chỉ phủ định bằng 没 (没有).' },
      { zh: '明天我＿去上班。', a: ['不'], vi: 'Ngày mai tôi không đi làm.', why: 'Ý định trong tương lai nên dùng 不.' },
      { zh: '这个苹果＿贵。', a: ['不'], vi: 'Quả táo này không đắt.', why: 'Phủ định tính từ dùng 不.' },
      { zh: '我还＿吃饭呢。', a: ['没'], vi: 'Tôi vẫn chưa ăn cơm.', why: '还没……呢 = vẫn chưa, việc chưa xảy ra.' }
    ]
  },
  {
    id: 'le_guo', lesson: 20, hsk: 2, words: ['了', '过'], title: '了 hay 过',
    rules: [
      { w: '了', use: 'Hành động đã hoàn thành, hoặc tình huống đã thay đổi (了 cuối câu).', ex: { zh: '下雨了。', py: 'Xià yǔ le.', vi: 'Trời mưa rồi.' } },
      { w: '过', use: 'Đã từng trải qua (kinh nghiệm), thường đi với 以前, 从来没……过.', ex: { zh: '我去过中国。', py: 'Wǒ qù guo Zhōngguó.', vi: 'Tôi đã từng đến Trung Quốc.' } }
    ],
    tip: 'Nhấn mạnh "đã từng" (kinh nghiệm) thì dùng 过. Nhấn mạnh "xong rồi" hoặc "đã đổi khác" thì dùng 了.',
    items: [
      { zh: '你以前去＿北京吗？', a: ['过'], vi: 'Trước đây bạn đã từng đến Bắc Kinh chưa?', why: 'Hỏi kinh nghiệm (以前) nên dùng 过.' },
      { zh: '我从来没吃＿北京烤鸭。', a: ['过'], vi: 'Tôi chưa bao giờ ăn vịt quay Bắc Kinh.', why: 'Cấu trúc 从来没……过 = chưa từng bao giờ.' },
      { zh: '下雨＿，快回家吧。', a: ['了'], vi: 'Mưa rồi, mau về nhà thôi.', why: 'Tình huống thay đổi nên dùng 了 cuối câu.' },
      { zh: '天冷＿，多穿点儿衣服。', a: ['了'], vi: 'Trời lạnh rồi, mặc thêm áo vào.', why: 'Trạng thái thay đổi (trở nên lạnh) nên dùng 了.' },
      { zh: '我以前见＿他一次。', a: ['过'], vi: 'Trước đây tôi đã gặp anh ấy một lần.', why: 'Kinh nghiệm trong quá khứ (以前) nên dùng 过.' },
      { zh: '他已经走＿。', a: ['了'], vi: 'Anh ấy đã đi rồi.', why: '已经……了 = đã … rồi (hoàn thành).' }
    ]
  },
  {
    id: 'er_liang', lesson: 8, hsk: 1, words: ['二', '两'], title: '二 hay 两',
    rules: [
      { w: '二', use: 'Đếm số, số thứ tự (第二), tháng (二月), và trong số nhiều chữ số (十二, 二十).', ex: { zh: '今天是二月二号。', py: 'Jīntiān shì èr yuè èr hào.', vi: 'Hôm nay là ngày 2 tháng 2.' } },
      { w: '两', use: 'Số lượng "hai" đứng trước lượng từ: 两个, 两本, và giờ 两点.', ex: { zh: '我有两个姐姐。', py: 'Wǒ yǒu liǎng ge jiějie.', vi: 'Tôi có hai chị gái.' } }
    ],
    tip: 'Phía sau có lượng từ (个, 本, 杯, 点…) thì dùng 两. Đọc số, đếm, thứ tự thì dùng 二.',
    items: [
      { zh: '我有＿个姐姐。', a: ['两'], vi: 'Tôi có hai chị gái.', why: 'Trước lượng từ 个 dùng 两.' },
      { zh: '今天是＿月十号。', a: ['二'], vi: 'Hôm nay là ngày 10 tháng 2.', why: 'Tên tháng là số đếm: 二月.' },
      { zh: '现在＿点。', a: ['两'], vi: 'Bây giờ là hai giờ.', why: 'Giờ nói là 两点, không nói 二点.' },
      { zh: '他是我们班第＿名。', a: ['二'], vi: 'Bạn ấy đứng thứ hai lớp tôi.', why: 'Số thứ tự 第二 dùng 二.' },
      { zh: '我们学校有＿十个老师。', a: ['二'], vi: 'Trường tôi có hai mươi giáo viên.', why: 'Trong số nhiều chữ số (二十) dùng 二.' },
      { zh: '我要＿杯咖啡。', a: ['两'], vi: 'Tôi muốn hai cốc cà phê.', why: 'Trước lượng từ 杯 dùng 两.' }
    ]
  },
  {
    id: 'xiang_yao', lesson: 7, hsk: 1, words: ['想', '要'], title: '想 hay 要',
    rules: [
      { w: '想', use: 'Muốn (nhẹ nhàng, dự định, chưa chắc chắn); còn có nghĩa là "nhớ" (想妈妈).', ex: { zh: '我想去中国。', py: 'Wǒ xiǎng qù Zhōngguó.', vi: 'Tôi muốn đi Trung Quốc.' } },
      { w: '要', use: 'Muốn chắc chắn, gọi món, yêu cầu; cần phải; 要……了 = sắp. 不要 = đừng.', ex: { zh: '要下雨了。', py: 'Yào xià yǔ le.', vi: 'Sắp mưa rồi.' } }
    ],
    tip: 'Muốn nhẹ nhàng hoặc nhớ ai thì dùng 想. Muốn dứt khoát, gọi món, sắp xảy ra, hay "đừng" (不要) thì dùng 要.',
    items: [
      { zh: '我很＿妈妈。', a: ['想'], vi: 'Tôi rất nhớ mẹ.', why: '想 còn có nghĩa là nhớ.' },
      { zh: '天阴了，＿下雨了。', a: ['要'], vi: 'Trời âm u rồi, sắp mưa rồi.', why: '要……了 = sắp xảy ra.' },
      { zh: '服务员，我＿一杯咖啡。', a: ['要'], vi: 'Phục vụ ơi, cho tôi một cốc cà phê.', why: 'Gọi món dùng 要 + danh từ. 想 không đứng trực tiếp trước danh từ với nghĩa này.' },
      { zh: '明天我＿去，可是没有时间。', a: ['想'], vi: 'Ngày mai tôi muốn đi, nhưng không có thời gian.', why: 'Mong muốn chưa chắc thực hiện được nên dùng 想.' },
      { zh: '上课的时候不＿说话。', a: ['要'], vi: 'Trong giờ học đừng nói chuyện.', why: '不要 = đừng (khuyên, cấm).' }
    ]
  },
  {
    id: 'zenme', lesson: 8, hsk: 1, words: ['怎么', '怎么样'], title: '怎么 hay 怎么样',
    rules: [
      { w: '怎么', use: 'Đứng trước động từ: hỏi cách làm (怎么走?) hoặc hỏi "sao lại" (你怎么不来?).', ex: { zh: '去火车站怎么走？', py: 'Qù huǒchēzhàn zěnme zǒu?', vi: 'Đến ga tàu đi thế nào?' } },
      { w: '怎么样', use: 'Thường đứng cuối câu: hỏi tình trạng, đánh giá, hoặc đưa ra đề nghị.', ex: { zh: '这件衣服怎么样？', py: 'Zhè jiàn yīfu zěnmeyàng?', vi: 'Bộ quần áo này thế nào?' } }
    ],
    tip: 'Sau chỗ trống có động từ thì dùng 怎么. Chỗ trống ở cuối câu để hỏi ý kiến hoặc tình trạng thì dùng 怎么样.',
    items: [
      { zh: '去火车站＿走？', a: ['怎么'], vi: 'Đến ga tàu đi thế nào?', why: 'Hỏi cách làm: 怎么 + động từ.' },
      { zh: '这件衣服＿？', a: ['怎么样'], vi: 'Bộ quần áo này thế nào?', why: 'Hỏi đánh giá, đứng cuối câu.' },
      { zh: '你＿没来上课？', a: ['怎么'], vi: 'Sao bạn không đến lớp?', why: '怎么 = sao lại (hỏi lý do, ngạc nhiên).' },
      { zh: '我们明天去看电影，＿？', a: ['怎么样'], vi: 'Ngày mai chúng ta đi xem phim, được không?', why: 'Đưa ra đề nghị rồi hỏi ý kiến: ……，怎么样？' },
      { zh: '这个字＿读？', a: ['怎么'], vi: 'Chữ này đọc thế nào?', why: 'Hỏi cách làm: 怎么 + động từ 读.' },
      { zh: '你的身体＿？', a: ['怎么样'], vi: 'Sức khỏe của bạn thế nào?', why: 'Hỏi tình trạng, đứng cuối câu.' }
    ]
  },
  {
    id: 'ji_duoshao', lesson: 8, hsk: 1, words: ['几', '多少'], title: '几 hay 多少',
    rules: [
      { w: '几', use: 'Hỏi số lượng nhỏ (thường dưới 10) và phải có lượng từ: 几个, 几口. Hỏi giờ, ngày: 几点, 几号.', ex: { zh: '你家有几口人？', py: 'Nǐ jiā yǒu jǐ kǒu rén?', vi: 'Nhà bạn có mấy người?' } },
      { w: '多少', use: 'Hỏi số lượng bất kỳ, có thể bỏ lượng từ. Hỏi giá: 多少钱. Hỏi số điện thoại, số phòng.', ex: { zh: '这个多少钱？', py: 'Zhège duōshao qián?', vi: 'Cái này bao nhiêu tiền?' } }
    ],
    tip: 'Số nhỏ, có lượng từ, hỏi giờ hoặc ngày thì dùng 几. Số lớn, hỏi giá, hỏi số điện thoại thì dùng 多少.',
    items: [
      { zh: '你家有＿口人？', a: ['几'], vi: 'Nhà bạn có mấy người?', why: 'Số nhỏ, có lượng từ 口.' },
      { zh: '这个＿钱？', a: ['多少'], vi: 'Cái này bao nhiêu tiền?', why: 'Hỏi giá luôn là 多少钱.' },
      { zh: '你们学校有＿学生？', a: ['多少'], vi: 'Trường các bạn có bao nhiêu học sinh?', why: 'Số lớn, không có lượng từ.' },
      { zh: '现在＿点？', a: ['几'], vi: 'Bây giờ là mấy giờ?', why: 'Hỏi giờ: 几点.' },
      { zh: '今天＿号？', a: ['几'], vi: 'Hôm nay ngày mấy?', why: 'Hỏi ngày: 几号.' },
      { zh: '你的电话号码是＿？', a: ['多少'], vi: 'Số điện thoại của bạn là bao nhiêu?', why: 'Hỏi số điện thoại dùng 多少.' }
    ]
  },
  {
    id: 'renshi_zhidao', lesson: 10, hsk: 1, words: ['认识', '知道'], title: '认识 hay 知道',
    rules: [
      { w: '认识', use: 'Quen biết một người; nhận ra mặt chữ, đường đi.', ex: { zh: '很高兴认识你。', py: 'Hěn gāoxìng rènshi nǐ.', vi: 'Rất vui được làm quen với bạn.' } },
      { w: '知道', use: 'Biết một thông tin, một sự việc.', ex: { zh: '我知道他的名字。', py: 'Wǒ zhīdào tā de míngzi.', vi: 'Tôi biết tên anh ấy.' } }
    ],
    tip: 'Biết người, biết mặt chữ thì dùng 认识. Biết thông tin (tên, chuyện gì, khi nào) thì dùng 知道.',
    items: [
      { zh: '我＿他，他是我的同学。', a: ['认识'], vi: 'Tôi quen anh ấy, anh ấy là bạn học của tôi.', why: 'Quen biết một người.' },
      { zh: '你＿他叫什么名字吗？', a: ['知道'], vi: 'Bạn có biết anh ấy tên là gì không?', why: 'Biết một thông tin (tên).' },
      { zh: '这个字你＿吗？', a: ['认识'], vi: 'Chữ này bạn có biết (đọc) không?', why: 'Nhận ra mặt chữ dùng 认识.' },
      { zh: '我不＿明天会不会下雨。', a: ['知道'], vi: 'Tôi không biết ngày mai có mưa không.', why: 'Biết một sự việc.' },
      { zh: '很高兴＿你！', a: ['认识'], vi: 'Rất vui được làm quen với bạn!', why: 'Câu chào làm quen cố định.' }
    ]
  },
  {
    id: 'youdian_yidian', lesson: 14, hsk: 1, words: ['有点儿', '一点儿'], title: '有点儿 hay 一点儿',
    rules: [
      { w: '有点儿', use: 'Đứng TRƯỚC tính từ: "hơi…", thường mang ý không hài lòng.', ex: { zh: '这件衣服有点儿贵。', py: 'Zhè jiàn yīfu yǒudiǎnr guì.', vi: 'Bộ quần áo này hơi đắt.' } },
      { w: '一点儿', use: 'Đứng SAU tính từ (so sánh, đề nghị: 便宜一点儿) hoặc sau động từ, trước danh từ (喝一点儿水).', ex: { zh: '能便宜一点儿吗？', py: 'Néng piányi yìdiǎnr ma?', vi: 'Có thể rẻ hơn một chút không?' } }
    ],
    tip: 'Xem vị trí của tính từ: chỗ trống TRƯỚC tính từ thì dùng 有点儿, chỗ trống SAU tính từ thì dùng 一点儿.',
    items: [
      { zh: '这件衣服＿贵。', a: ['有点儿'], vi: 'Bộ quần áo này hơi đắt.', why: 'Trước tính từ 贵, mang ý không hài lòng.' },
      { zh: '能便宜＿吗？', a: ['一点儿'], vi: 'Có thể rẻ hơn một chút không?', why: 'Sau tính từ, mang ý đề nghị hoặc so sánh.' },
      { zh: '今天＿冷。', a: ['有点儿'], vi: 'Hôm nay hơi lạnh.', why: 'Trước tính từ 冷.' },
      { zh: '我想喝＿水。', a: ['一点儿'], vi: 'Tôi muốn uống một chút nước.', why: 'Động từ + 一点儿 + danh từ.' },
      { zh: '请说慢＿。', a: ['一点儿'], vi: 'Xin hãy nói chậm một chút.', why: 'Sau tính từ 慢 (yêu cầu).' },
      { zh: '我＿累。', a: ['有点儿'], vi: 'Tôi hơi mệt.', why: 'Trước tính từ 累.' }
    ]
  },
  {
    id: 'haishi_huozhe', lesson: 16, hsk: 2, words: ['还是', '或者'], title: '还是 hay 或者',
    rules: [
      { w: '还是', use: '"Hay là" trong CÂU HỎI lựa chọn.', ex: { zh: '你喝茶还是喝咖啡？', py: 'Nǐ hē chá háishi hē kāfēi?', vi: 'Bạn uống trà hay cà phê?' } },
      { w: '或者', use: '"Hoặc" trong câu TRẦN THUẬT.', ex: { zh: '星期六或者星期天都可以。', py: 'Xīngqīliù huòzhě xīngqītiān dōu kěyǐ.', vi: 'Thứ bảy hoặc chủ nhật đều được.' } }
    ],
    tip: 'Câu có dấu ？ đòi người nghe chọn thì dùng 还是. Câu kể, câu khẳng định thì dùng 或者.',
    items: [
      { zh: '你喝茶＿咖啡？', a: ['还是'], vi: 'Bạn uống trà hay cà phê?', why: 'Câu hỏi lựa chọn.' },
      { zh: '我们坐公共汽车＿打车去都可以。', a: ['或者'], vi: 'Chúng ta đi xe buýt hoặc taxi đều được.', why: 'Câu trần thuật.' },
      { zh: '你是中国人＿日本人？', a: ['还是'], vi: 'Bạn là người Trung Quốc hay người Nhật?', why: 'Câu hỏi lựa chọn.' },
      { zh: '星期六＿星期天我去看你。', a: ['或者'], vi: 'Thứ bảy hoặc chủ nhật tôi sẽ đến thăm bạn.', why: 'Câu trần thuật.' },
      { zh: '你想今天去＿明天去？', a: ['还是'], vi: 'Bạn muốn đi hôm nay hay ngày mai?', why: 'Câu hỏi lựa chọn.' }
    ]
  },
  {
    id: 'cong_li', lesson: 23, hsk: 2, words: ['从', '离'], title: '从 hay 离',
    rules: [
      { w: '从', use: 'Điểm xuất phát về nơi chốn hoặc thời gian: 从……来, 从……到…….', ex: { zh: '我从越南来。', py: 'Wǒ cóng Yuènán lái.', vi: 'Tôi đến từ Việt Nam.' } },
      { w: '离', use: 'Khoảng cách: A 离 B 很远 / 很近 / 有多远.', ex: { zh: '我家离学校很近。', py: 'Wǒ jiā lí xuéxiào hěn jìn.', vi: 'Nhà tôi cách trường rất gần.' } }
    ],
    tip: 'Sau vế đó có 远, 近, 多远 thì dùng 离. Có 来, 去, 到, 开始 (xuất phát) thì dùng 从.',
    items: [
      { zh: '我家＿学校很近。', a: ['离'], vi: 'Nhà tôi cách trường rất gần.', why: 'Nói khoảng cách (近).' },
      { zh: '他＿北京来。', a: ['从'], vi: 'Anh ấy đến từ Bắc Kinh.', why: 'Điểm xuất phát: 从……来.' },
      { zh: '＿这儿到机场要一个小时。', a: ['从'], vi: 'Từ đây đến sân bay mất một tiếng.', why: '从……到…… = từ … đến ….' },
      { zh: '学校＿火车站有多远？', a: ['离'], vi: 'Trường cách ga tàu bao xa?', why: 'Hỏi khoảng cách (多远).' },
      { zh: '我们＿八点开始上课。', a: ['从'], vi: 'Chúng tôi bắt đầu học từ 8 giờ.', why: 'Mốc thời gian bắt đầu dùng 从.' }
    ]
  },
  {
    id: 'hui_neng_keyi', lesson: 24, hsk: 2, words: ['会', '能', '可以'], title: '会 · 能 · 可以',
    rules: [
      { w: '会', use: 'Kỹ năng phải học mới có (会说汉语); hoặc dự đoán việc sẽ xảy ra (明天会下雨).', ex: { zh: '我会说一点儿汉语。', py: 'Wǒ huì shuō yìdiǎnr Hànyǔ.', vi: 'Tôi biết nói một chút tiếng Trung.' } },
      { w: '能', use: 'Năng lực đạt tới mức nào đó, hoặc điều kiện cho phép làm được.', ex: { zh: '他病了，今天不能来。', py: 'Tā bìng le, jīntiān bù néng lái.', vi: 'Anh ấy ốm rồi, hôm nay không đến được.' } },
      { w: '可以', use: 'Được phép, xin phép (可以……吗?).', ex: { zh: '我可以进来吗？', py: 'Wǒ kěyǐ jìnlai ma?', vi: 'Tôi vào được không?' } }
    ],
    tip: 'Học mới biết làm thì dùng 会. Có đủ sức hoặc đủ điều kiện thì dùng 能. Được phép thì dùng 可以 (khẩu ngữ cũng hay dùng 能 để xin phép).',
    items: [
      { zh: '我＿说一点儿汉语。', a: ['会'], vi: 'Tôi biết nói một chút tiếng Trung.', why: 'Kỹ năng do học mà có.' },
      { zh: '明天＿下雨吗？', a: ['会'], vi: 'Ngày mai có mưa không?', why: '会 = dự đoán việc sẽ xảy ra.' },
      { zh: '他病了，今天不＿来上课。', a: ['能'], vi: 'Anh ấy ốm rồi, hôm nay không thể đến lớp.', why: 'Điều kiện không cho phép.' },
      { zh: '我会游泳，我＿游一千米。', a: ['能'], vi: 'Tôi biết bơi, tôi bơi được một nghìn mét.', why: 'Năng lực đạt tới mức cụ thể.' },
      { zh: '老师，我＿进来吗？', a: ['可以', '能'], vi: 'Thưa thầy, em vào được không ạ?', why: 'Xin phép: chuẩn nhất là 可以 (khẩu ngữ cũng nói 能).' },
      { zh: '你＿用我的手机。', a: ['可以', '能'], vi: 'Bạn có thể dùng điện thoại của tôi.', why: 'Cho phép: 可以 (khẩu ngữ cũng nói 能).' }
    ]
  },
  {
    id: 'ci_bian', lesson: 24, hsk: 2, words: ['次', '遍'], title: '次 hay 遍',
    rules: [
      { w: '次', use: 'Số lần một việc xảy ra.', ex: { zh: '我去过北京两次。', py: 'Wǒ qù guo Běijīng liǎng cì.', vi: 'Tôi đã đến Bắc Kinh hai lần.' } },
      { w: '遍', use: 'Một lượt trọn vẹn từ đầu đến cuối (đọc, nghe, nói, xem lại cả nội dung).', ex: { zh: '请再说一遍。', py: 'Qǐng zài shuō yí biàn.', vi: 'Xin nói lại một lần nữa.' } }
    ],
    tip: 'Đếm số lần thì dùng 次. Làm lại toàn bộ nội dung từ đầu đến cuối (đọc bài, nói lại câu) thì dùng 遍.',
    items: [
      { zh: '我去过北京两＿。', a: ['次'], vi: 'Tôi đã đến Bắc Kinh hai lần.', why: 'Đếm số lần đến nơi nào đó.' },
      { zh: '请再读一＿课文。', a: ['遍'], vi: 'Hãy đọc lại bài khóa một lượt.', why: 'Đọc trọn bài từ đầu đến cuối.' },
      { zh: '他每个星期去一＿医院。', a: ['次'], vi: 'Mỗi tuần anh ấy đi bệnh viện một lần.', why: 'Đếm số lần.' },
      { zh: '老师，请您再说一＿。', a: ['遍'], vi: 'Thưa thầy, xin thầy nói lại một lần nữa.', why: 'Nói lại toàn bộ câu: 再说一遍.' },
      { zh: '我见过他一＿。', a: ['次'], vi: 'Tôi đã gặp anh ấy một lần.', why: 'Đếm số lần gặp.' }
    ]
  },
  {
    id: 'de_de', lesson: 25, hsk: 2, words: ['的', '得'], title: '的 hay 得',
    rules: [
      { w: '的', use: 'Đứng TRƯỚC danh từ, nối định ngữ với danh từ: 我的书, 漂亮的衣服.', ex: { zh: '这是我的书。', py: 'Zhè shì wǒ de shū.', vi: 'Đây là sách của tôi.' } },
      { w: '得', use: 'Đứng SAU động từ, nối với bổ ngữ trình độ: 说得很好, 跑得很快.', ex: { zh: '她说汉语说得很好。', py: 'Tā shuō Hànyǔ shuō de hěn hǎo.', vi: 'Cô ấy nói tiếng Trung rất giỏi.' } }
    ],
    tip: 'Sau chỗ trống là danh từ thì dùng 的. Trước chỗ trống là động từ, sau là đánh giá (很好, 很快) thì dùng 得. (HSK3 sẽ học thêm 地: đứng trước động từ, ví dụ 高兴地说.)',
    items: [
      { zh: '这是我＿书。', a: ['的'], vi: 'Đây là sách của tôi.', why: 'Đứng trước danh từ 书.' },
      { zh: '她说汉语说＿很好。', a: ['得'], vi: 'Cô ấy nói tiếng Trung rất giỏi.', why: 'Động từ 说 + 得 + bổ ngữ 很好.' },
      { zh: '他跑＿很快。', a: ['得'], vi: 'Anh ấy chạy rất nhanh.', why: 'Động từ 跑 + 得 + 很快.' },
      { zh: '这是一件很漂亮＿衣服。', a: ['的'], vi: 'Đây là một bộ quần áo rất đẹp.', why: 'Đứng trước danh từ 衣服.' },
      { zh: '你今天来＿很早。', a: ['得'], vi: 'Hôm nay bạn đến rất sớm.', why: 'Động từ 来 + 得 + 很早.' }
    ]
  },
  {
    id: 'zai_you', lesson: 26, hsk: 2, words: ['再', '又'], title: '再 hay 又',
    rules: [
      { w: '再', use: 'Lặp lại một việc CHƯA xảy ra (tương lai, yêu cầu): 再说一遍, 明天再来.', ex: { zh: '明天再来吧。', py: 'Míngtiān zài lái ba.', vi: 'Mai lại đến nhé.' } },
      { w: '又', use: 'Việc ĐÃ lặp lại rồi, thường có 了 (hay mang ý phàn nàn).', ex: { zh: '他又迟到了。', py: 'Tā yòu chídào le.', vi: 'Anh ấy lại đến muộn rồi.' } }
    ],
    tip: 'Lặp lại trong tương lai hoặc lời yêu cầu thì dùng 再. Đã lặp lại rồi (có 了) thì dùng 又.',
    items: [
      { zh: '请你＿说一遍。', a: ['再'], vi: 'Bạn hãy nói lại một lần nữa.', why: 'Yêu cầu lặp lại, việc chưa xảy ra.' },
      { zh: '他昨天来了，今天＿来了。', a: ['又'], vi: 'Hôm qua anh ấy đến, hôm nay lại đến rồi.', why: 'Đã lặp lại (có 了).' },
      { zh: '明天＿来吧。', a: ['再'], vi: 'Mai lại đến nhé.', why: 'Lặp lại trong tương lai.' },
      { zh: '你怎么＿迟到了？', a: ['又'], vi: 'Sao bạn lại đến muộn nữa thế?', why: 'Đã lặp lại, mang ý phàn nàn.' },
      { zh: '这个很好吃，我想＿吃一个。', a: ['再'], vi: 'Cái này ngon quá, tôi muốn ăn thêm một cái.', why: 'Muốn lặp lại, việc chưa xảy ra.' }
    ]
  },
  {
    id: 'jiu_cai', lesson: 28, hsk: 2, words: ['就', '才'], title: '就 hay 才',
    rules: [
      { w: '就', use: 'Sớm, nhanh, dễ hơn mong đợi; cuối câu thường có 了.', ex: { zh: '他六点就来了。', py: 'Tā liù diǎn jiù lái le.', vi: 'Mới 6 giờ anh ấy đã đến rồi.' } },
      { w: '才', use: 'Muộn, chậm, khó hơn mong đợi; cuối câu KHÔNG có 了.', ex: { zh: '他十点才来。', py: 'Tā shí diǎn cái lái.', vi: 'Mãi 10 giờ anh ấy mới đến.' } }
    ],
    tip: 'Sớm hơn mong đợi ("đã… rồi") thì dùng 就 + 了. Muộn hơn mong đợi ("mãi… mới") thì dùng 才, không có 了.',
    items: [
      { zh: '电影七点开始，他六点半＿来了。', a: ['就'], vi: 'Phim bảy giờ bắt đầu, mới sáu rưỡi anh ấy đã đến rồi.', why: 'Sớm hơn mong đợi, cuối câu có 了.' },
      { zh: '八点上课，他九点＿来。', a: ['才'], vi: 'Tám giờ vào học, chín giờ anh ấy mới đến.', why: 'Muộn hơn mong đợi, không có 了.' },
      { zh: '我等了一个小时他＿到。', a: ['才'], vi: 'Tôi đợi một tiếng anh ấy mới đến.', why: 'Muộn, mất nhiều thời gian.' },
      { zh: '他五分钟＿做完了。', a: ['就'], vi: 'Năm phút anh ấy đã làm xong rồi.', why: 'Nhanh hơn mong đợi, có 了.' },
      { zh: '我昨天十二点＿睡觉。', a: ['才'], vi: 'Hôm qua mười hai giờ tôi mới đi ngủ.', why: 'Muộn hơn bình thường.' }
    ]
  }
];

const Consolidate = {
  CLUSTER: 5,
  INTERVALS: [1, 2, 4, 7, 14, 30],
  session: null,

  // ---------- state ----------
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  state() {
    const user = StorageManager.getCurrentUser();
    const st = (user && user.consolidation) || {};
    return {
      on: !!st.on,
      prev: st.prev || null,
      clusters: st.clusters || {},
      pairs: st.pairs || {},
      days: st.days || {},
      sentences: st.sentences || {}
    };
  },

  save(st) {
    const user = StorageManager.getCurrentUser();
    if (!user) return;
    // Keep only the last 30 days of the daily plan
    const days = Object.keys(st.days).sort().slice(-30);
    st.days = days.reduce((o, d) => { o[d] = st.days[d]; return o; }, {});
    user.consolidation = st;
    StorageManager.saveCurrentUser(user);
  },

  markDay(task) {
    const st = this.state();
    const d = this.today();
    st.days[d] = { ...(st.days[d] || {}), [task]: true };
    this.save(st);
  },

  lessons() {
    return (window.CHINESE_DATA && window.CHINESE_DATA.lessons) || [];
  },

  /** Highest lesson the learner has opened or completed. */
  maxLesson() {
    const user = StorageManager.getCurrentUser();
    return Math.max(1, (user && user.lastActiveLesson) || 1, ...(((user && user.completedLessons) || [])));
  },

  reachedLevels() {
    const max = this.maxLesson();
    return [...new Set(this.lessons().filter((l) => l.id <= max).map((l) => l.hsk))].sort();
  },

  // ---------- clusters ----------
  /** Lessons grouped by 5 inside each HSK level: Bài 1–5, 6–10 … */
  clusters() {
    const byLevel = {};
    this.lessons().forEach((l) => { (byLevel[l.hsk] = byLevel[l.hsk] || []).push(l.id); });
    const out = [];
    Object.keys(byLevel).sort().forEach((lv) => {
      const ids = byLevel[lv].sort((a, b) => a - b);
      for (let i = 0; i < ids.length; i += this.CLUSTER) {
        const part = ids.slice(i, i + this.CLUSTER);
        out.push({ key: `${part[0]}-${part[part.length - 1]}`, hsk: +lv, lessons: part, from: part[0], to: part[part.length - 1] });
      }
    });
    return out;
  },

  clusterWords(c) {
    const set = new Set(c.lessons);
    return ((window.CHINESE_DATA && window.CHINESE_DATA.all_words) || []).filter((w) => set.has(w.lesson));
  },

  /** Last check score plus how many of the cluster's words are already strong in spaced repetition. */
  clusterStatus(c, st = this.state()) {
    const user = StorageManager.getCurrentUser();
    const progress = (user && user.wordProgress) || {};
    const words = this.clusterWords(c);
    const strong = words.filter((w) => progress[w.id] && (progress[w.id].srsLevel || 0) >= 2).length;
    const res = st.clusters[c.key] || null;
    const score = res ? res.score : null;
    const level = score === null ? 'none' : score >= 85 ? 'good' : score >= 80 ? 'ok' : 'weak';
    return { score, date: res && res.date, level, words: words.length, strong, strongPct: words.length ? Math.round(strong / words.length * 100) : 0, reached: c.from <= this.maxLesson() };
  },

  /** The cluster to work on today: weakest tested cluster below 80%, else the earliest untested, else the lowest score. */
  weakestCluster(st = this.state()) {
    const list = this.clusters().map((c) => ({ c, s: this.clusterStatus(c, st) })).filter((x) => x.s.reached);
    if (!list.length) return null;
    const weak = list.filter((x) => x.s.level === 'weak').sort((a, b) => a.s.score - b.s.score);
    if (weak.length) return weak[0].c;
    const untested = list.filter((x) => x.s.level === 'none');
    if (untested.length) return untested[0].c;
    return list.sort((a, b) => a.s.score - b.s.score)[0].c;
  },

  // ---------- confusable sets ----------
  pairStatus(p, st = this.state()) {
    const r = st.pairs[p.id];
    const now = Date.now();
    return {
      studied: !!r,
      acc: r && r.n ? Math.round(r.ok / r.n * 100) : null,
      due: !!r && (r.next || 0) <= now,
      lvl: r ? r.lvl || 0 : 0,
      unlocked: p.lesson <= this.maxLesson()
    };
  },

  /** Due studied set (weakest first), else the first unlocked set not studied yet, else the weakest. */
  pairOfDay(st = this.state()) {
    const list = CONFUSABLES.map((p) => ({ p, s: this.pairStatus(p, st) }));
    const due = list.filter((x) => x.s.due).sort((a, b) => (a.s.acc || 0) - (b.s.acc || 0));
    if (due.length) return due[0].p;
    const fresh = list.filter((x) => !x.s.studied && x.s.unlocked);
    if (fresh.length) return fresh[0].p;
    const studied = list.filter((x) => x.s.studied).sort((a, b) => (a.s.acc || 0) - (b.s.acc || 0));
    return (studied[0] || list[0]).p;
  },

  findPair(id) {
    return CONFUSABLES.find((p) => p.id === id);
  },

  // ---------- consolidation mode ----------
  toggleMode() {
    const st = this.state();
    if (!st.on) {
      st.prev = {
        scope: StorageManager.getReviewScope(),
        newPerDay: (typeof Prefs !== 'undefined' && Prefs.data.newPerDay) || 10
      };
      st.on = true;
      this.save(st);
      const levels = this.reachedLevels();
      StorageManager.setReviewScope({ levels, lessons: [] });
      if (typeof Prefs !== 'undefined') Prefs.set('newPerDay', 20);
      App.toast(`Đã bật chế độ củng cố: ôn ${levels.map((l) => 'HSK' + l).join(' + ')}, 20 từ mỗi ngày.`, 'success', 3200);
    } else {
      const prev = st.prev || {};
      st.on = false;
      st.prev = null;
      this.save(st);
      StorageManager.setReviewScope(prev.scope || null);
      if (typeof Prefs !== 'undefined') Prefs.set('newPerDay', prev.newPerDay || 10);
      App.toast('Đã tắt chế độ củng cố, khôi phục cài đặt cũ.', 'info', 2600);
    }
    if (App.syncPrefControls) App.syncPrefControls();
    this.render();
  },

  // ---------- daily plan ----------
  plan(st = this.state()) {
    const d = st.days[this.today()] || {};
    const goals = StorageManager.getDailyGoals();
    const cluster = this.weakestCluster(st);
    const pair = this.pairOfDay(st);
    return [
      { key: 'review', done: goals.vocab.current >= goals.vocab.target, title: 'Ôn thẻ đến hạn', sub: 'Lịch ôn ngắt quãng, phạm vi đang chọn', act: 'Consolidate.go(\'review\')' },
      { key: 'check', done: !!d.check, title: cluster ? `Kiểm tra cụm Bài ${cluster.from}–${cluster.to}` : 'Kiểm tra một cụm bài', sub: '6 câu từ vựng + 4 câu ngữ pháp', act: cluster ? `Consolidate.startCheck('${cluster.key}')` : '' },
      { key: 'pair', done: !!d.pair, title: `Từ dễ nhầm: ${pair.title}`, sub: 'Đọc quy tắc rồi luyện điền từ', act: `Consolidate.openPair('${pair.id}')` },
      { key: 'write', done: !!d.write, title: 'Tự đặt 3 câu', sub: `Dùng ${pair.words.join(' / ')}`, act: `Consolidate.openWrite('${pair.id}')` }
    ];
  },

  go(what) {
    if (what === 'review') {
      App.navigateTo('review');
      if (typeof Review !== 'undefined') Review.startToday();
    }
  },

  // ---------- views ----------
  open() {
    App.navigateTo('consolidate');
  },

  showHub() {
    const hub = document.getElementById('consolidate-hub');
    const sess = document.getElementById('consolidate-session');
    if (hub) hub.hidden = false;
    if (sess) { sess.hidden = true; sess.innerHTML = ''; }
    this.session = null;
  },

  showSession(html) {
    const hub = document.getElementById('consolidate-hub');
    const sess = document.getElementById('consolidate-session');
    if (hub) hub.hidden = true;
    if (sess) { sess.hidden = false; sess.innerHTML = html; }
    window.scrollTo({ top: 0, behavior: 'auto' });
  },

  exit() {
    this.showHub();
    this.render();
  },

  render() {
    const box = document.getElementById('consolidate-body');
    if (!box) return;
    const esc = UI.esc.bind(UI);
    const st = this.state();
    const plan = this.plan(st);
    const doneCount = plan.filter((t) => t.done).length;
    const levels = this.reachedLevels();

    const planHtml = plan.map((t, i) => `
      <li class="cs-task ${t.done ? 'done' : ''}">
        <span class="cs-task-dot" aria-hidden="true">${t.done ? Icon.svg('check') : i + 1}</span>
        <span class="cs-task-text"><b>${esc(t.title)}</b><small>${esc(t.sub)}</small></span>
        ${t.act ? `<button class="btn ${t.done ? 'btn-ghost' : 'btn-outline'} btn-sm" onclick="${t.act}">${t.done ? 'Làm lại' : 'Làm'}</button>` : ''}
      </li>`).join('');

    const clusters = this.clusters().filter((c) => levels.includes(c.hsk));
    const mapHtml = clusters.map((c) => {
      const s = this.clusterStatus(c, st);
      const label = s.score === null ? 'Chưa kiểm tra' : `${s.score}%`;
      return `
        <button class="cs-cluster cs-${s.level} ${s.reached ? '' : 'cs-locked'}" onclick="Consolidate.startCheck('${c.key}')" aria-label="Bài ${c.from} đến ${c.to}: ${label}, ${s.strongPct}% từ đã nhớ chắc">
          <span class="cs-cluster-name">Bài ${c.from}–${c.to}</span>
          <b class="cs-cluster-score">${label}</b>
          <span class="meter" aria-hidden="true"><i style="width:${s.strongPct}%"></i></span>
          <small>${s.strong}/${s.words} từ nhớ chắc</small>
        </button>`;
    }).join('');

    const pairsHtml = CONFUSABLES.map((p) => {
      const s = this.pairStatus(p, st);
      const badge = !s.studied ? (s.unlocked ? '<span class="cs-badge">Mới</span>' : '<span class="cs-badge cs-badge-muted">Chưa học tới</span>')
        : s.due ? '<span class="cs-badge cs-badge-due">Cần ôn</span>'
          : `<span class="cs-badge ${s.acc >= 80 ? 'cs-badge-good' : 'cs-badge-weak'}">${s.acc}%</span>`;
      return `
        <button class="cs-pair" onclick="Consolidate.openPair('${p.id}')">
          <span class="cs-pair-words hanzi">${p.words.map((w) => `<span>${esc(w)}</span>`).join('<i>/</i>')}</span>
          <span class="cs-pair-meta"><span>HSK${p.hsk} · Bài ${p.lesson}</span>${badge}</span>
        </button>`;
    }).join('');
    const studiedCount = CONFUSABLES.filter((p) => st.pairs[p.id]).length;

    box.innerHTML = `
      <article class="today-card cs-mode ${st.on ? 'on' : ''}">
        <div class="cs-mode-row">
          <div>
            <h3>Chế độ củng cố</h3>
            <p class="muted-sm">${st.on
              ? `Đang bật: ôn ${levels.map((l) => 'HSK' + l).join(' + ')}, 20 từ cũ mỗi ngày quay lại lịch ôn. Tắt để khôi phục cài đặt cũ.`
              : 'Một chạm: ôn tất cả các khóa đã học và đưa 20 từ cũ mỗi ngày trở lại lịch ôn ngắt quãng. Nên tạm dừng học bài mới trong 4–6 tuần.'}</p>
          </div>
          <label class="cs-switch"><input type="checkbox" class="switch" ${st.on ? 'checked' : ''} onchange="Consolidate.toggleMode()" aria-label="Bật chế độ củng cố"></label>
        </div>
        ${st.on ? '<p class="cs-tip">Mẹo: tắt Pinyin khi ôn (trang Tôi › Hiển thị) để ép mắt đọc chữ Hán.</p>' : ''}
      </article>

      <article class="today-card">
        <div class="today-card-head">
          <h3>Kế hoạch hôm nay</h3>
          <span class="muted-sm">${doneCount}/${plan.length} việc</span>
        </div>
        <ol class="cs-plan">${planHtml}</ol>
      </article>

      <h3 class="section-label">Bản đồ kiến thức</h3>
      <p class="muted-sm cs-lead">Mỗi cụm 5 bài. Kiểm tra nhanh 10 câu để biết cụm nào đang hổng. Dưới 80% là cần học lại, từ 85% trở lên là vững. Từ sai sẽ tự vào hàng ôn tập.</p>
      <div class="cs-map">${mapHtml}</div>

      <h3 class="section-label">Từ dễ nhầm</h3>
      <p class="muted-sm cs-lead">Các cặp từ người học HSK1–2 hay dùng sai. Mỗi cặp có quy tắc, câu mẫu và bài điền từ với lịch ôn riêng.</p>
      <div class="cs-pairs">${pairsHtml}</div>
      <button class="btn btn-primary btn-block cs-mixed" onclick="Consolidate.startDrill(null)" ${studiedCount >= 2 ? '' : 'disabled'}>
        ${studiedCount >= 2 ? 'Luyện trộn các cặp đã học (10 câu)' : 'Học ít nhất 2 cặp để mở luyện trộn'}
      </button>`;
  },

  // ---------- cluster check ----------
  shuffle(arr) {
    return arr.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  },

  distractors(word, pool, field, n = 3) {
    const out = [];
    const seen = new Set([word[field]]);
    this.shuffle(pool).forEach((w) => {
      if (out.length < n && w[field] && !seen.has(w[field])) { out.push(w); seen.add(w[field]); }
    });
    return out;
  },

  startCheck(key) {
    const c = this.clusters().find((x) => x.key === key);
    if (!c) return;
    App.navigateTo('consolidate');
    const words = this.clusterWords(c).filter((w) => w.meaning && w.hanzi);
    const all = (window.CHINESE_DATA && window.CHINESE_DATA.all_words) || [];
    const pool = words.length >= 8 ? words : all.filter((w) => w.hsk === c.hsk);
    const items = [];
    this.shuffle(words).slice(0, 6).forEach((w, i) => {
      const field = i % 2 === 0 ? 'meaning' : 'hanzi';
      const opts = this.shuffle([w, ...this.distractors(w, pool, field)]);
      items.push({ kind: field === 'meaning' ? 'vmean' : 'vhanzi', word: w, options: opts.map((o) => ({ label: o[field], ok: o.id === w.id })) });
    });
    const set = new Set(c.lessons);
    const grammar = (typeof GRAMMAR_DATA !== 'undefined' ? GRAMMAR_DATA : []).filter((g) => set.has(g.lesson) && Array.isArray(g.wrongZh) && g.wrongZh.length >= 2);
    this.shuffle(grammar).slice(0, 10 - items.length).forEach((g) => {
      const opts = this.shuffle([{ label: g.zh, ok: true }, ...g.wrongZh.slice(0, 3).map((z) => ({ label: z, ok: false }))]);
      items.push({ kind: 'gram', g, options: opts });
    });
    // Top up with vocabulary when the cluster has no grammar exercises (e.g. HSK 3)
    this.shuffle(words).slice(6).forEach((w) => {
      if (items.length >= 10) return;
      const opts = this.shuffle([w, ...this.distractors(w, pool, 'meaning')]);
      items.push({ kind: 'vmean', word: w, options: opts.map((o) => ({ label: o.meaning, ok: o.id === w.id })) });
    });
    if (!items.length) { App.toast('Cụm bài này chưa có dữ liệu để kiểm tra.', 'info'); return; }
    this.session = { type: 'check', cluster: c, items: this.shuffle(items), index: 0, score: 0, wrong: [] };
    this.renderCheck();
  },

  topBar(index, total) {
    return `
      <div class="rv-top">
        <button class="icon-btn" onclick="Consolidate.exit()" aria-label="Thoát">${Icon.svg('x')}</button>
        <div class="meter rv-meter" aria-hidden="true"><i style="width:${Math.round(index / total * 100)}%"></i></div>
        <span class="rv-count">${index + 1}/${total}</span>
      </div>`;
  },

  renderCheck() {
    const s = this.session;
    const item = s.items[s.index];
    if (!item) { this.finishCheck(); return; }
    s.answered = false;
    const esc = UI.esc.bind(UI);
    let prompt = '';
    if (item.kind === 'vmean') {
      prompt = `<span class="rv-tag">Chọn nghĩa</span><div class="rv-hanzi hanzi">${esc(item.word.hanzi)}</div>
        <button class="icon-btn rv-sound" onclick="AudioEngine.speak(Consolidate.session.items[Consolidate.session.index].word.hanzi)" aria-label="Nghe">${Icon.svg('sound')}</button>`;
    } else if (item.kind === 'vhanzi') {
      prompt = `<span class="rv-tag">Chọn chữ Hán</span><div class="rv-mean rv-mean-lg">${esc(item.word.meaning)}</div>${item.word.hanviet ? `<span class="hv-badge">${esc(item.word.hanviet)}</span>` : ''}`;
    } else {
      prompt = `<span class="rv-tag">Chọn câu đúng</span><div class="rv-mean rv-mean-lg">${esc(item.g.vi)}</div><p class="rv-hint">Câu tiếng Trung nào đúng ngữ pháp?</p>`;
    }
    const hanziOpts = item.kind === 'vhanzi';
    const opts = item.options.map((o, i) => `<button class="rv-opt ${hanziOpts || item.kind === 'gram' ? 'hanzi' : ''} ${item.kind === 'gram' ? 'cs-opt-sentence' : ''}" data-i="${i}" onclick="Consolidate.answerCheck(${i})">${esc(o.label)}</button>`).join('');
    this.showSession(`
      ${this.topBar(s.index, s.items.length)}
      <p class="cs-session-label">Kiểm tra Bài ${s.cluster.from}–${s.cluster.to}</p>
      <div class="rv-body">
        <div class="rv-card">${prompt}</div>
        <div class="rv-options ${hanziOpts ? 'rv-options-hanzi' : ''}">${opts}</div>
      </div>
      <div class="rv-feedback" id="cs-feedback" aria-live="polite"></div>
      <div class="rv-footer" id="cs-footer"></div>`);
  },

  answerCheck(i) {
    const s = this.session;
    if (!s || s.answered) return;
    s.answered = true;
    const item = s.items[s.index];
    const ok = item.options[i].ok;
    document.querySelectorAll('#consolidate-session .rv-opt').forEach((b) => {
      b.disabled = true;
      const o = item.options[+b.dataset.i];
      if (o.ok) b.classList.add('correct');
      else if (+b.dataset.i === i) b.classList.add('wrong');
    });
    const esc = UI.esc.bind(UI);
    let detail = '';
    if (item.kind === 'gram') {
      AudioEngine.speak(item.g.zh);
      detail = `<div class="rv-fb-word"><span class="hanzi">${esc(item.g.zh)}</span></div><div class="py">${Tone.html(item.g.py || '')}</div>${item.g.grammarNote ? `<p class="muted-sm">${esc(item.g.grammarNote)}</p>` : ''}`;
    } else {
      AudioEngine.speak(item.word.hanzi);
      detail = `<div class="rv-fb-word"><span class="hanzi">${esc(item.word.hanzi)}</span><span class="py">${Tone.html(item.word.pinyin)}</span><span>${esc(item.word.meaning)}</span></div>`;
    }
    if (ok) {
      s.score++;
      AudioEngine.playCorrectSound();
    } else {
      AudioEngine.playWrongSound();
      s.wrong.push(item);
    }
    const fb = document.getElementById('cs-feedback');
    if (fb) {
      fb.className = `rv-feedback ${ok ? 'ok' : 'bad'}`;
      fb.innerHTML = `<div class="rv-fb-head">${Icon.svg(ok ? 'check' : 'x')}<b>${ok ? 'Chính xác' : 'Chưa đúng'}</b></div>${detail}`;
    }
    const footer = document.getElementById('cs-footer');
    if (footer) footer.innerHTML = `<button class="btn btn-primary btn-block" onclick="Consolidate.nextCheck()">${s.index + 1 < s.items.length ? 'Tiếp tục' : 'Xem kết quả'}</button>`;
  },

  nextCheck() {
    if (!this.session) return;
    this.session.index++;
    this.renderCheck();
  },

  finishCheck() {
    const s = this.session;
    const total = s.items.length;
    const pct = Math.round(s.score / total * 100);
    const st = this.state();
    st.clusters[s.cluster.key] = { score: pct, date: this.today(), n: ((st.clusters[s.cluster.key] || {}).n || 0) + 1 };
    st.days[this.today()] = { ...(st.days[this.today()] || {}), check: true };
    this.save(st);
    // Missed words go back into spaced repetition right away
    s.wrong.filter((x) => x.word).forEach((x) => StorageManager.updateWordSrs(x.word.id, 'again'));
    StorageManager.addXP(10 + s.score * 2, 'Kiểm tra củng cố');
    AudioEngine.playVictorySound();

    const esc = UI.esc.bind(UI);
    const verdict = pct >= 85 ? 'Cụm này đã vững.' : pct >= 80 ? 'Khá ổn, ôn thêm một chút là vững.' : 'Cụm này đang hổng, nên học lại trước khi đi tiếp.';
    const wrongWords = s.wrong.filter((x) => x.word);
    const wrongGram = s.wrong.filter((x) => x.g);
    this.showSession(`
      <div class="rv-summary">
        <div class="summary-trophy">${Icon.svg(pct >= 80 ? 'trophy' : 'target')}</div>
        <h2>Bài ${s.cluster.from}–${s.cluster.to}: ${pct}%</h2>
        <p class="muted-sm">${verdict}</p>
        <div class="due-row">
          <div><b>${s.score}/${total}</b><span>câu đúng</span></div>
          <div><b>${wrongWords.length}</b><span>từ vào hàng ôn</span></div>
          <div><b>${wrongGram.length}</b><span>câu ngữ pháp sai</span></div>
        </div>
        ${wrongWords.length ? `<div class="cs-review-list"><h4>Từ cần ôn</h4>${wrongWords.map((x) => `<button class="cs-word" onclick="AudioEngine.speak('${esc(x.word.hanzi).replace(/'/g, '')}')"><span class="hanzi">${esc(x.word.hanzi)}</span><span class="py">${Tone.html(x.word.pinyin)}</span><span>${esc(x.word.meaning)}</span></button>`).join('')}</div>` : ''}
        ${wrongGram.length ? `<div class="cs-review-list"><h4>Cấu trúc cần xem lại</h4>${wrongGram.map((x) => `<div class="cs-gram"><span class="hanzi">${esc(x.g.zh)}</span><small>${esc(x.g.grammarNote || '')}</small></div>`).join('')}</div>` : ''}
        <div class="rv-summary-actions">
          <button class="btn btn-primary btn-block" onclick="Consolidate.practiceGrammar('${s.cluster.key}')">Luyện ngữ pháp Bài ${s.cluster.from}–${s.cluster.to}</button>
          <button class="btn btn-outline btn-block" onclick="Consolidate.reviewCluster('${s.cluster.key}')">Ôn từ vựng cụm này</button>
          <button class="btn btn-ghost btn-block" onclick="Consolidate.exit()">Về trang Củng cố</button>
        </div>
      </div>`);
    this.session = null;
  },

  /** Open the Grammar drill limited to the cluster's lessons (uses the "Tự chọn nhiều bài" scope). */
  practiceGrammar(key) {
    const c = this.clusters().find((x) => x.key === key);
    if (!c || typeof GrammarController === 'undefined') return;
    if (!ScopeSelect._loaded) { ScopeSelect.load(); ScopeSelect._loaded = true; }
    const scope = { levels: [], lessons: c.lessons.slice() };
    ScopeSelect.scopes['grammar-scope-select'] = scope;
    ScopeSelect.save();
    App.navigateTo('grammar');
    const sel = document.getElementById('grammar-scope-select');
    if (sel) {
      const opt = sel.querySelector('option[value="custom"]');
      if (opt) opt.textContent = ScopeSelect.optionText(scope);
      sel.value = 'custom';
    }
    this.showHub();
    GrammarController.startExercise({ scope: 'custom', mode: 'reorder', count: 10 });
  },

  /** Mixed review (flip, choice, listening, writing) over the cluster's weakest words. */
  reviewCluster(key) {
    const c = this.clusters().find((x) => x.key === key);
    if (!c || typeof Review === 'undefined') return;
    const user = StorageManager.getCurrentUser();
    const progress = (user && user.wordProgress) || {};
    const words = this.clusterWords(c)
      .sort((a, b) => ((progress[a.id] || {}).srsLevel || 0) - ((progress[b.id] || {}).srsLevel || 0) || Math.random() - 0.5)
      .slice(0, 12);
    this.showHub();
    App.navigateTo('review');
    Review.begin(words, 'today');
  },

  // ---------- confusable set: rule card ----------
  openPair(id) {
    const p = this.findPair(id);
    if (!p) return;
    App.navigateTo('consolidate');
    const esc = UI.esc.bind(UI);
    const s = this.pairStatus(p);
    const rules = p.rules.map((r, i) => `
      <div class="cs-rule">
        <div class="cs-rule-head"><span class="cs-rule-word hanzi">${esc(r.w)}</span><p>${esc(r.use)}</p></div>
        <button class="cs-example" onclick="Consolidate.say('${p.id}', ${i})">
          ${Icon.svg('sound')}
          <span><span class="hanzi">${esc(r.ex.zh)}</span><span class="py">${Tone.html(r.ex.py)}</span><small>${esc(r.ex.vi)}</small></span>
        </button>
      </div>`).join('');
    this.session = { type: 'pair', pair: p };
    this.showSession(`
      <button class="back-link" onclick="Consolidate.exit()">${Icon.svg('x')}<span>Củng cố</span></button>
      <div class="page-head"><div><h2 class="hanzi-mix">${esc(p.title)}</h2>
        <p>HSK${p.hsk} · học ở Bài ${p.lesson}${s.studied ? ` · độ chính xác ${s.acc}%` : ''}${s.unlocked ? '' : ' · bạn chưa học tới bài này'}</p></div></div>
      <div class="cs-rules">${rules}</div>
      <div class="cs-tip-card">${Icon.svg('bulb')}<p>${esc(p.tip)}</p></div>
      <div class="rv-summary-actions">
        <button class="btn btn-primary btn-block" onclick="Consolidate.startDrill('${p.id}')">Luyện điền từ (${p.items.length} câu)</button>
        <button class="btn btn-outline btn-block" onclick="Consolidate.openWrite('${p.id}')">Tự đặt 3 câu</button>
      </div>`);
  },

  say(id, i) {
    const p = this.findPair(id);
    if (p && p.rules[i]) AudioEngine.speak(p.rules[i].ex.zh);
  },

  // ---------- confusable drill ----------
  /** Drill one set (id) or, with null, 10 items interleaved from every studied set, weakest sets first. */
  startDrill(id) {
    App.navigateTo('consolidate');
    let items = [];
    if (id) {
      const p = this.findPair(id);
      if (!p) return;
      items = this.shuffle(p.items).map((it) => ({ pair: p, it }));
    } else {
      const st = this.state();
      const studied = CONFUSABLES.filter((p) => st.pairs[p.id])
        .sort((a, b) => (this.pairStatus(a, st).acc || 0) - (this.pairStatus(b, st).acc || 0));
      const pool = [];
      studied.forEach((p, rank) => {
        // weaker sets get more items
        const take = rank < 3 ? 3 : 2;
        this.shuffle(p.items).slice(0, take).forEach((it) => pool.push({ pair: p, it }));
      });
      items = this.shuffle(pool).slice(0, 10);
    }
    if (!items.length) return;
    this.session = { type: 'drill', single: id || null, items, index: 0, score: 0, perPair: {} };
    this.renderDrill();
  },

  renderDrill() {
    const s = this.session;
    const cur = s.items[s.index];
    if (!cur) { this.finishDrill(); return; }
    s.answered = false;
    const esc = UI.esc.bind(UI);
    const [before, after] = cur.it.zh.split('＿');
    const opts = cur.pair.words.map((w, i) => `<button class="rv-opt hanzi" data-w="${esc(w)}" onclick="Consolidate.answerDrill(${i})">${esc(w)}</button>`).join('');
    this.showSession(`
      ${this.topBar(s.index, s.items.length)}
      <p class="cs-session-label">${s.single ? esc(cur.pair.title) : 'Luyện trộn từ dễ nhầm'}</p>
      <div class="rv-body">
        <div class="rv-card cs-blank-card">
          <span class="rv-tag">Điền từ</span>
          <div class="cs-sentence hanzi">${esc(before)}<span class="cs-blank" id="cs-blank">＿＿</span>${esc(after || '')}</div>
          <p class="cs-vi">${esc(cur.it.vi)}</p>
        </div>
        <div class="rv-options rv-options-hanzi ${cur.pair.words.length === 3 ? 'cs-opts-3' : ''}">${opts}</div>
      </div>
      <div class="rv-feedback" id="cs-feedback" aria-live="polite"></div>
      <div class="rv-footer" id="cs-footer"></div>`);
  },

  answerDrill(i) {
    const s = this.session;
    if (!s || s.answered) return;
    s.answered = true;
    const cur = s.items[s.index];
    const chosen = cur.pair.words[i];
    const ok = cur.it.a.includes(chosen);
    const best = cur.it.a[0];
    const full = cur.it.zh.replace('＿', ok ? chosen : best);
    AudioEngine.speak(full);
    if (ok) { s.score++; AudioEngine.playCorrectSound(); } else { AudioEngine.playWrongSound(); }
    const pp = s.perPair[cur.pair.id] = s.perPair[cur.pair.id] || { n: 0, ok: 0 };
    pp.n++;
    if (ok) pp.ok++;
    document.querySelectorAll('#consolidate-session .rv-opt').forEach((b, bi) => {
      b.disabled = true;
      const w = cur.pair.words[bi];
      if (cur.it.a.includes(w)) b.classList.add('correct');
      else if (bi === i) b.classList.add('wrong');
    });
    const blank = document.getElementById('cs-blank');
    if (blank) { blank.textContent = ok ? chosen : best; blank.classList.add(ok ? 'ok' : 'bad'); }
    const esc = UI.esc.bind(UI);
    const fb = document.getElementById('cs-feedback');
    if (fb) {
      fb.className = `rv-feedback ${ok ? 'ok' : 'bad'}`;
      fb.innerHTML = `<div class="rv-fb-head">${Icon.svg(ok ? 'check' : 'x')}<b>${ok ? 'Chính xác' : `Đáp án: ${esc(best)}`}</b></div><p>${esc(cur.it.why)}</p>`;
    }
    const footer = document.getElementById('cs-footer');
    if (footer) {
      footer.classList.add('rv-footer-2');
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="AudioEngine.speak(Consolidate.fullSentence())">${Icon.svg('sound')}<span>Nghe câu</span></button>
        <button class="btn btn-primary" onclick="Consolidate.nextDrill()">${s.index + 1 < s.items.length ? 'Tiếp tục' : 'Xem kết quả'}</button>`;
    }
  },

  fullSentence() {
    const s = this.session;
    const cur = s && s.items[s.index];
    return cur ? cur.it.zh.replace('＿', cur.it.a[0]) : '';
  },

  nextDrill() {
    if (!this.session) return;
    this.session.index++;
    this.renderDrill();
  },

  finishDrill() {
    const s = this.session;
    const st = this.state();
    const now = Date.now();
    Object.entries(s.perPair).forEach(([id, r]) => {
      const cur = st.pairs[id] || { lvl: 0, n: 0, ok: 0 };
      const acc = r.ok / r.n;
      // A set moves up the schedule only when at least 80% of its items were right
      cur.lvl = acc >= 0.8 ? Math.min(this.INTERVALS.length - 1, (cur.n ? cur.lvl + 1 : 0)) : 0;
      cur.next = now + this.INTERVALS[cur.lvl] * 86400000;
      cur.n += r.n;
      cur.ok += r.ok;
      st.pairs[id] = cur;
    });
    st.days[this.today()] = { ...(st.days[this.today()] || {}), pair: true };
    this.save(st);
    StorageManager.addXP(5 + s.score * 2, 'Luyện từ dễ nhầm');
    StorageManager.recordDailyAction('quiz', 1);
    AudioEngine.playVictorySound();

    const total = s.items.length;
    const pct = Math.round(s.score / total * 100);
    const single = s.single ? this.findPair(s.single) : null;
    const nextDays = single ? this.INTERVALS[st.pairs[single.id].lvl] : null;
    this.showSession(`
      <div class="rv-summary">
        <div class="summary-trophy">${Icon.svg(pct >= 80 ? 'trophy' : 'target')}</div>
        <h2>${pct >= 80 ? 'Phân biệt tốt!' : 'Cần luyện thêm'}</h2>
        <div class="due-row">
          <div><b>${s.score}/${total}</b><span>câu đúng</span></div>
          <div><b>${pct}%</b><span>chính xác</span></div>
          <div><b>${single ? `${nextDays} ngày` : Object.keys(s.perPair).length}</b><span>${single ? 'ôn lại sau' : 'cặp đã luyện'}</span></div>
        </div>
        <p class="muted-sm">${pct >= 80 ? 'Bước tiếp theo: tự đặt câu của riêng bạn để chuyển từ "nhận ra" sang "dùng được".' : 'Đọc lại quy tắc và câu mẫu, rồi luyện thêm một lượt. Cặp này sẽ quay lại vào ngày mai.'}</p>
        <div class="rv-summary-actions">
          ${single ? `<button class="btn btn-primary btn-block" onclick="Consolidate.openWrite('${single.id}')">Tự đặt 3 câu với ${UI.esc(single.words.join(' / '))}</button>
          <button class="btn btn-outline btn-block" onclick="Consolidate.openPair('${single.id}')">Xem lại quy tắc</button>` : `<button class="btn btn-primary btn-block" onclick="Consolidate.startDrill(null)">Luyện trộn thêm 10 câu</button>`}
          <button class="btn btn-ghost btn-block" onclick="Consolidate.exit()">Về trang Củng cố</button>
        </div>
      </div>`);
    this.session = null;
  },

  // ---------- write your own sentences ----------
  openWrite(id) {
    const p = this.findPair(id);
    if (!p) return;
    App.navigateTo('consolidate');
    const esc = UI.esc.bind(UI);
    const saved = this.state().sentences[id] || [];
    const fields = [0, 1, 2].map((i) => `
      <label class="cs-write-row"><span>Câu ${i + 1}</span>
        <input type="text" class="input cs-write-input hanzi" id="cs-write-${i}" lang="zh" autocomplete="off" value="${esc(saved[i] || '')}" placeholder="Viết câu có ${esc(p.words[i % p.words.length])}…">
      </label>`).join('');
    this.session = { type: 'write', pair: p };
    this.showSession(`
      <button class="back-link" onclick="Consolidate.exit()">${Icon.svg('x')}<span>Củng cố</span></button>
      <div class="page-head"><div><h2 class="hanzi-mix">Tự đặt câu: ${esc(p.words.join(' / '))}</h2>
        <p>Viết 3 câu về cuộc sống của bạn, mỗi câu dùng một trong các từ ${esc(p.words.join(', '))}. Viết xong, bấm Đọc to để nghe và tự so với câu mẫu.</p></div></div>
      <div class="cs-tip-card">${Icon.svg('bulb')}<p>${esc(p.tip)}</p></div>
      <div class="cs-write">${fields}</div>
      <div class="cs-models"><h4>Câu mẫu để so sánh</h4>${p.rules.map((r) => `<p><span class="hanzi">${esc(r.ex.zh)}</span> <small>${esc(r.ex.vi)}</small></p>`).join('')}</div>
      <div class="rv-feedback" id="cs-feedback" aria-live="polite"></div>
      <div class="rv-summary-actions">
        <button class="btn btn-primary btn-block" onclick="Consolidate.saveWrite()">Lưu câu của tôi</button>
        <button class="btn btn-outline btn-block" onclick="Consolidate.readWrite()">${Icon.svg('sound')}<span>Đọc to các câu</span></button>
      </div>`);
  },

  writeValues() {
    return [0, 1, 2].map((i) => {
      const el = document.getElementById(`cs-write-${i}`);
      return el ? el.value.trim() : '';
    });
  },

  readWrite() {
    const text = this.writeValues().filter(Boolean).join('。');
    if (text) AudioEngine.speak(text);
    else App.toast('Hãy viết ít nhất một câu trước.', 'info');
  },

  /** Each line must contain Chinese characters and one of the set's words. */
  checkSentences(p, lines) {
    return lines.map((l) => {
      if (!l) return 'empty';
      if (!/[一-鿿]/.test(l)) return 'nohanzi';
      if (!p.words.some((w) => l.includes(w))) return 'noword';
      return 'ok';
    });
  },

  saveWrite() {
    const s = this.session;
    if (!s || s.type !== 'write') return;
    const p = s.pair;
    const lines = this.writeValues();
    const res = this.checkSentences(p, lines);
    const st = this.state();
    st.sentences[p.id] = lines;
    const good = res.filter((r) => r === 'ok').length;
    if (good >= 3) st.days[this.today()] = { ...(st.days[this.today()] || {}), write: true };
    this.save(st);
    const msgs = { empty: 'chưa viết', nohanzi: 'chưa có chữ Hán', noword: `chưa dùng ${p.words.join(' / ')}` };
    const fb = document.getElementById('cs-feedback');
    if (fb) {
      fb.className = `rv-feedback ${good >= 3 ? 'ok' : 'bad'}`;
      fb.innerHTML = good >= 3
        ? `<div class="rv-fb-head">${Icon.svg('check')}<b>Đã lưu 3 câu</b></div><p>Bấm Đọc to và đọc theo. Đối chiếu với quy tắc: mỗi câu đã dùng đúng từ chưa?</p>`
        : `<div class="rv-fb-head">${Icon.svg('x')}<b>Đã lưu ${good}/3 câu hợp lệ</b></div><p>${res.map((r, i) => (r === 'ok' ? '' : `Câu ${i + 1}: ${msgs[r]}.`)).filter(Boolean).join(' ')}</p>`;
    }
    if (good >= 3) {
      StorageManager.addXP(15, 'Tự đặt câu');
      StorageManager.recordDailyAction('writing', 1);
    }
  },

  /** Short status for the Today page card. */
  homeSummary() {
    const st = this.state();
    const plan = this.plan(st);
    return { on: st.on, done: plan.filter((t) => t.done).length, total: plan.length, next: plan.find((t) => !t.done) };
  },

  renderHomeCard() {
    const el = document.getElementById('home-consolidate');
    if (!el) return;
    const s = this.homeSummary();
    el.innerHTML = `
      <div class="today-card-head">
        <h3>Củng cố kiến thức</h3>
        <span class="muted-sm">${s.done}/${s.total} việc${s.on ? ' · đang bật' : ''}</span>
      </div>
      <p class="muted-sm">${s.next ? `Tiếp theo: <b>${UI.esc(s.next.title)}</b>` : 'Đã xong kế hoạch củng cố hôm nay.'}</p>
      <button class="btn btn-outline btn-block" onclick="Consolidate.open()">Mở trang Củng cố</button>`;
  }
};

if (typeof window !== 'undefined') {
  window.CONFUSABLES = CONFUSABLES;
  window.Consolidate = Consolidate;
}
