/**
 * Grammar & Sentence Construction Controller (HSK 1 & HSK 2)
 * Duolingo-style Word Ordering (连词成句) & 2-Way Translation (Vi ↔ Zh)
 */

const GRAMMAR_DATA = [
  // Lesson 1 - Chào hỏi & Trợ từ 吗
  {
    id: 'g_1_1', lesson: 1, hsk: 1,
    zh: '你好吗？', py: 'Nǐ hǎo ma?', vi: 'Bạn khỏe không?',
    tokens: ['你', '好', '吗', '？'],
    grammarNote: 'Câu hỏi nghi vấn cơ bản: [Mệnh đề] + Trợ từ ngữ khí 吗？',
    distractors: ['呢'],
    wrongVi: ['Bạn tên là gì?', 'Bạn đi đâu đấy?', 'Bạn có bận không?'],
    wrongZh: ['你好呢？', '你是好吗？', '你吗好？']
  },
  {
    id: 'g_1_2', lesson: 1, hsk: 1,
    zh: '我很好，你呢？', py: 'Wǒ hěn hǎo, nǐ ne?', vi: 'Tôi rất khỏe, còn bạn?',
    tokens: ['我', '很', '好', '，', '你', '呢', '？'],
    grammarNote: 'Phó từ mức độ 很 đứng trước tính từ 好; Trợ từ 呢 dùng hỏi tỉnh lược (Còn... thì sao?).',
    distractors: ['也'],
    wrongVi: ['Tôi không khỏe lắm, còn bạn?', 'Tôi cũng rất tốt.', 'Tôi rất bận, bạn thì sao?'],
    wrongZh: ['我很不好，你呢？', '也很好我，你呢？', '我好很，你呢？']
  },
  {
    id: 'g_1_3', lesson: 1, hsk: 1,
    zh: '我也很好。', py: 'Wǒ yě hěn hǎo.', vi: 'Tôi cũng rất khỏe.',
    tokens: ['我', '也', '很', '好', '。'],
    grammarNote: 'Phó từ 也 (cũng) luôn đứng trước phó từ 很 và vị ngữ: Chủ ngữ + 也 + 很 + Tính từ.',
    distractors: ['都'],
    wrongVi: ['Tôi không khỏe.', 'Chúng tôi đều khỏe.', 'Bạn cũng khỏe chứ?'],
    wrongZh: ['我也不好。', '我很也好。', '我也是好。']
  },

  // Lesson 2 - Phó từ phủ định 不 & 不太
  {
    id: 'g_2_1', lesson: 2, hsk: 1,
    zh: '汉语不太难。', py: 'Hànyǔ bú tài nán.', vi: 'Tiếng Hán không khó lắm.',
    tokens: ['汉语', '不太', '难', '。'],
    grammarNote: 'Phó từ 不太 (không... lắm) đứng trước tính từ biểu thị mức độ nhẹ nhàng.',
    distractors: ['很'],
    wrongVi: ['Tiếng Hán rất khó.', 'Tiếng Hán quá khó.', 'Tiếng Hán không dễ.'],
    wrongZh: ['汉语太不难。', '汉语很大难。', '不汉语太难。']
  },
  {
    id: 'g_2_2', lesson: 2, hsk: 1,
    zh: '爸爸妈妈都很好。', py: 'Bàba māma dōu hěn hǎo.', vi: 'Bố mẹ đều rất khỏe.',
    tokens: ['爸爸', '妈妈', '都', '很', '好', '。'],
    grammarNote: 'Phó từ 都 (đều) chỉ toàn bộ chủ ngữ số nhiều, đứng trước vị ngữ.',
    distractors: ['也'],
    wrongVi: ['Bố mẹ tôi cũng khỏe.', 'Bố mẹ rất bận.', 'Bố mẹ đi làm rồi.'],
    wrongZh: ['爸爸妈妈也很忙。', '都爸爸妈妈很好。', '爸爸妈妈很都好。']
  },

  // Lesson 3 - Lời hẹn & Thời gian
  {
    id: 'g_3_1', lesson: 3, hsk: 1,
    zh: '明天见。', py: 'Míngtiān jiàn.', vi: 'Ngày mai gặp lại.',
    tokens: ['明天', '见', '。'],
    grammarNote: 'Từ chỉ thời gian + 见: Hẹn gặp lại vào mốc thời gian đó (VD: 一会儿见, 星期一见).',
    distractors: ['去'],
    wrongVi: ['Hôm nay gặp nhé.', 'Ngày mai bạn đi không?', 'Hẹn gặp tuần sau.'],
    wrongZh: ['今天见。', '明天去。', '见明天。']
  },

  // Lesson 4 - Động từ 去 & Hỏi 哪儿
  {
    id: 'g_4_1', lesson: 4, hsk: 1,
    zh: '你去哪儿？', py: 'Nǐ qù nǎr?', vi: 'Bạn đi đâu đấy?',
    tokens: ['你', '去', '哪儿', '？'],
    grammarNote: 'Động từ 去 + Đại từ nghi vấn chỉ nơi chốn 哪儿？ (Đi đâu?).',
    distractors: ['在'],
    wrongVi: ['Bạn ở đâu?', 'Bạn từ đâu đến?', 'Bạn đi với ai?'],
    wrongZh: ['你走哪儿？', '你在哪儿？', '去你哪儿？']
  },
  {
    id: 'g_4_2', lesson: 4, hsk: 1,
    zh: '我去天安门。', py: 'Wǒ qù Tiān\'ānmén.', vi: 'Tôi đi Thiên An Môn.',
    tokens: ['我', '去', '天安门', '。'],
    grammarNote: 'Cấu trúc di chuyển: Chủ ngữ + 去 + Địa điểm (Tân ngữ nơi chốn).',
    distractors: ['来'],
    wrongVi: ['Tôi ở Thiên An Môn.', 'Tôi thích Thiên An Môn.', 'Tôi về Thiên An Môn.'],
    wrongZh: ['我在天安门。', '我去银行。', '天安门我去。']
  },

  // Lesson 5 - Đại từ chỉ thị 这 / 那 & Động từ 是
  {
    id: 'g_5_1', lesson: 5, hsk: 1,
    zh: '这是王老师。', py: 'Zhè shì Wáng lǎoshī.', vi: 'Đây là thầy giáo Vương.',
    tokens: ['这', '是', '王老师', '。'],
    grammarNote: 'Đại từ chỉ thị gần 这 (Đây/Này) + Động từ phán đoán 是 + Danh từ/Cụm danh từ.',
    distractors: ['那'],
    wrongVi: ['Kia là thầy giáo Vương.', 'Thầy Vương đang ở đây.', 'Ai là thầy giáo Vương?'],
    wrongZh: ['那是王老师。', '这有王老师。', '王老师是这。']
  },
  {
    id: 'g_5_2', lesson: 5, hsk: 1,
    zh: '请进，请坐，请喝茶。', py: 'Qǐng jìn, qǐng zuò, qǐng hē chá.', vi: 'Mời vào, mời ngồi, mời uống trà.',
    tokens: ['请进', '，', '请坐', '，', '请喝茶', '。'],
    grammarNote: 'Từ lịch sự 请 (Mời, xin vui lòng) đứng trước động từ thể hiện phép lịch sự.',
    distractors: ['去'],
    wrongVi: ['Mời đi, mời đứng, mời ăn cơm.', 'Xin hãy vào phòng ngồi uống nước.', 'Bạn có muốn uống trà không?'],
    wrongZh: ['请出，请走，请吃饭。', '进请，坐请，喝茶请。', '我想请你喝茶。']
  },

  // Lesson 6 - Tân ngữ động từ & Học ngôn ngữ
  {
    id: 'g_6_1', lesson: 6, hsk: 1,
    zh: '我学习汉语。', py: 'Wǒ xuéxí Hànyǔ.', vi: 'Tôi học tiếng Hán.',
    tokens: ['我', '学习', '汉语', '。'],
    grammarNote: 'Cấu trúc câu trần thuật cơ bản S + V + O: Chủ ngữ + Động từ + Tân ngữ.',
    distractors: ['教'],
    wrongVi: ['Tôi dạy tiếng Hán.', 'Tôi biết tiếng Hán.', 'Tôi thích tiếng Hán.'],
    wrongZh: ['我教汉语。', '我学英语。', '汉语我学习。']
  },
  {
    id: 'g_6_2', lesson: 6, hsk: 1,
    zh: '汉字很难，发音不太难。', py: 'Hànzì hěn nán, fāyīn bú tài nán.', vi: 'Chữ Hán rất khó, phát âm không khó lắm.',
    tokens: ['汉字', '很', '难', '，', '发音', '不太', '难', '。'],
    grammarNote: 'Hai vế câu đối lập miêu tả đặc điểm: Vế 1 (很 + Adj), Vế 2 (不太 + Adj).',
    distractors: ['都'],
    wrongVi: ['Chữ Hán dễ, phát âm khó.', 'Chữ Hán và phát âm đều rất khó.', 'Phát âm rất khó, chữ Hán không khó.'],
    wrongZh: ['汉字不难，发音很难。', '汉字发音都很难。', '难汉字，不太难发音。']
  },

  // Lesson 7 - Đại từ nghi vấn 什么 & Ăn gì
  {
    id: 'g_7_1', lesson: 7, hsk: 1,
    zh: '中午你去哪儿吃饭？', py: 'Zhōngwǔ nǐ qù nǎr chī fàn?', vi: 'Buổi trưa bạn đi đâu ăn cơm?',
    tokens: ['中午', '你', '去', '哪儿', '吃饭', '？'],
    grammarNote: 'Trạng ngữ thời gian (中午) đứng đầu câu hoặc sau chủ ngữ; Câu liên động: 去 + Nơi chốn + Động từ 2.',
    distractors: ['在'],
    wrongVi: ['Buổi tối bạn ăn cơm ở đâu?', 'Buổi trưa bạn ăn cái gì?', 'Trưa nay ai đi ăn cùng bạn?'],
    wrongZh: ['晚上你去哪儿吃饭？', '中午你吃什么饭？', '你去吃饭哪儿中午？']
  },
  {
    id: 'g_7_2', lesson: 7, hsk: 1,
    zh: '你要几个馒头？', py: 'Nǐ yào jǐ ge mántou?', vi: 'Bạn muốn lấy mấy cái bánh bao màn thầu?',
    tokens: ['你', '要', '几个', '馒头', '？'],
    grammarNote: 'Đại từ nghi vấn 几 (mấy - hỏi số lượng dưới 10) + Lượng từ 个 + Danh từ.',
    distractors: ['多少'],
    wrongVi: ['Bạn ăn bao nhiêu bánh bao?', 'Bạn có thích bánh bao không?', 'Ai mua bánh bao này?'],
    wrongZh: ['你要多少个馒头？', '你有几个馒头？', '几个馒头你要？']
  },

  // Lesson 8 - Tiền tệ & Hỏi giá cả 多少钱
  {
    id: 'g_8_1', lesson: 8, hsk: 1,
    zh: '苹果一斤多少钱？', py: 'Píngguǒ yì jīn duōshao qián?', vi: 'Táo bao nhiêu tiền một cân?',
    tokens: ['苹果', '一斤', '多少钱', '？'],
    grammarNote: 'Danh từ + Đơn vị đo (一斤) + Đại từ hỏi giá tiền 多少钱？ (Bao nhiêu tiền?).',
    distractors: ['几'],
    wrongVi: ['Táo này có ngon không?', 'Bạn mua mấy cân táo?', 'Táo đắt hay rẻ?'],
    wrongZh: ['苹果一斤几块钱？', '买苹果多少钱？', '多少钱苹果一斤？']
  },
  {
    id: 'g_8_2', lesson: 8, hsk: 1,
    zh: '太贵了，便宜一点儿吧。', py: 'Tài guì le, piányi yìdiǎnr ba.', vi: 'Đắt quá rồi, rẻ một chút đi mà.',
    tokens: ['太贵了', '，', '便宜', '一点儿', '吧', '。'],
    grammarNote: 'Cấu trúc cảm thán 太...了 (quá... rồi); Động/Tính từ + 一点儿; Trợ từ ngữ khí 吧 biểu thị thương lượng.',
    distractors: ['有点儿'],
    wrongVi: ['Rẻ quá rồi, mua thêm nhé.', 'Hơi đắt một chút, tôi không mua.', 'Bao nhiêu tiền một cái?'],
    wrongZh: ['太便宜了，贵一点儿吧。', '有点儿贵，便宜吧。', '贵太了，一点儿便宜吧。']
  },

  // Lesson 9 - Đổi tiền & Nguyện vọng 想
  {
    id: 'g_9_1', lesson: 9, hsk: 1,
    zh: '我想换五百美元。', py: 'Wǒ xiǎng huàn wǔbǎi Měiyuán.', vi: 'Tôi muốn đổi 500 Đô la Mỹ.',
    tokens: ['我', '想', '换', '五百', '美元', '。'],
    grammarNote: 'Động từ nguyện vọng 想 (Muốn) đứng trước động từ chính 换 (Đổi) + Số từ + Đơn vị.',
    distractors: ['要'],
    wrongVi: ['Tôi đã đổi 500 Đô la.', 'Tôi có 500 Đô la Mỹ.', 'Anh ấy muốn đổi 500 Đô la.'],
    wrongZh: ['我要买五百美元。', '我有五百美元。', '五百美元我想换。']
  },

  // Lesson 10 - Nơi cư trú 住 & Số phòng
  {
    id: 'g_10_1', lesson: 10, hsk: 1,
    zh: '他住在留学生宿舍。', py: 'Tā zhù zài liúxuéshēng sùshè.', vi: 'Anh ấy sống ở ký túc xá du học sinh.',
    tokens: ['他', '住在', '留学生', '宿舍', '。'],
    grammarNote: 'Động từ 住 + Giới từ kết quả 在 + Địa điểm: Biểu thị nơi cư trú sinh sống.',
    distractors: ['去'],
    wrongVi: ['Anh ấy đi đến ký túc xá.', 'Anh ấy học ở ký túc xá.', 'Tôi ở ký túc xá du học sinh.'],
    wrongZh: ['他去留学生宿舍。', '他在留学生宿舍学。', '住在留学生宿舍他。']
  },

  // Lesson 11 - Phó từ 都 & Cũng 也
  {
    id: 'g_11_1', lesson: 11, hsk: 1,
    zh: '我们都是中国留学生。', py: 'Wǒmen dōu shì Zhōngguó liúxuéshēng.', vi: 'Chúng tôi đều là du học sinh Trung Quốc.',
    tokens: ['我们', '都', '是', '中国', '留学生', '。'],
    grammarNote: 'Trật tự câu: Chủ ngữ số nhiều (我们) + Phó từ phạm vi 都 + Vị ngữ 是...',
    distractors: ['也'],
    wrongVi: ['Chúng tôi cũng là du học sinh.', 'Họ đều là du học sinh Mỹ.', 'Tôi là du học sinh Trung Quốc.'],
    wrongZh: ['我们也都是留学生。', '他们都是中国老师。', '都是中国留学生我们。']
  },

  // Lesson 12 - Giới từ 在 chỉ nơi chốn hành động
  {
    id: 'g_12_1', lesson: 12, hsk: 1,
    zh: '你在哪儿学习汉语？', py: 'Nǐ zài nǎr xuéxí Hànyǔ?', vi: 'Bạn học tiếng Hán ở đâu?',
    tokens: ['你', '在', '哪儿', '学习', '汉语', '？'],
    grammarNote: 'Cụm giới từ chỉ địa điểm 在 + Nơi chốn luôn đứng TRƯỚC động từ chính: S + 在 + Địa điểm + V + O.',
    distractors: ['去'],
    wrongVi: ['Bạn học tiếng Hán với ai?', 'Khi nào bạn học tiếng Hán?', 'Bạn đến đâu học tiếng Hán?'],
    wrongZh: ['你学习汉语在哪儿？', '你去哪儿学习汉语？', '在哪儿学习汉语你？']
  },
  {
    id: 'g_12_2', lesson: 12, hsk: 1,
    zh: '我在北京语言大学学习。', py: 'Wǒ zài Běijīng Yǔyán Dàxué xuéxí.', vi: 'Tôi học ở Đại học Ngôn ngữ Bắc Kinh.',
    tokens: ['我', '在', '北京语言大学', '学习', '。'],
    grammarNote: 'Trật tự tiếng Trung: Chủ ngữ (我) + Ở đâu (在...) + Làm gì (学习). Tuyệt đối không đặt địa điểm ra sau!',
    distractors: ['去'],
    wrongVi: ['Tôi đi Đại học Ngôn ngữ Bắc Kinh.', 'Tôi là sinh viên trường Bắc Kinh.', 'Tôi sống ở Đại học Ngôn ngữ.'],
    wrongZh: ['我学习在北京语言大学。', '我去北京语言大学。', '在学习我北京语言大学。']
  },

  // Lesson 13 - Câu hỏi chính phản (V-not-V)
  {
    id: 'g_13_1', lesson: 13, hsk: 1,
    zh: '这是不是中药？', py: 'Zhè shì bu shì zhōngyào?', vi: 'Đây có phải là thuốc bắc không?',
    tokens: ['这', '是不是', '中药', '？'],
    grammarNote: 'Câu hỏi chính phản: Khẳng định + Phủ định (是不是). Cuối câu KHÔNG dùng thêm 吗 nữa.',
    distractors: ['吗'],
    wrongVi: ['Đây là thuốc tây đúng không?', 'Kia có phải thuốc bắc không?', 'Thuốc bắc này uống thế nào?'],
    wrongZh: ['这是不是中药吗？', '这是中药不是吗？', '中药是不是这？']
  },

  // Lesson 14 - Lựa chọn 还是 & Cụm 的
  {
    id: 'g_14_1', lesson: 14, hsk: 1,
    zh: '你的车是新的还是旧的？', py: 'Nǐ de chē shì xīn de háishì jiù de?', vi: 'Xe của bạn là xe mới hay xe cũ?',
    tokens: ['你的车', '是', '新的', '还是', '旧的', '？'],
    grammarNote: 'Liên từ 还是 dùng trong câu hỏi lựa chọn (A hay là B?); Cụm chữ 的: 新的 (cái mới), 旧的 (cái cũ).',
    distractors: ['或者'],
    wrongVi: ['Xe của bạn mới hay là đẹp?', 'Bạn mua xe mới hay xe cũ?', 'Xe của bạn màu gì?'],
    wrongZh: ['你的车是新的或者旧的？', '你的车是新旧的吗？', '新的是旧的你的车？']
  },

  // Lesson 15 - Gia đình & Hỏi số lượng con cái
  {
    id: 'g_15_1', lesson: 15, hsk: 1,
    zh: '你家有几口人？', py: 'Nǐ jiā yǒu jǐ kǒu rén?', vi: 'Nhà bạn có mấy người?',
    tokens: ['你家', '有', '几口', '人', '？'],
    grammarNote: 'Lượng từ 口 chuyên dùng đếm nhân khẩu trong gia đình: 几 + 口 + 人.',
    distractors: ['个'],
    wrongVi: ['Nhà bạn có những ai?', 'Gia đình bạn sống ở đâu?', 'Bố mẹ bạn làm nghề gì?'],
    wrongZh: ['你家有几个人？', '你家是多少人？', '几口人有你家？']
  },

  // Lesson 16 - Phó từ tần suất 常常 / 不常
  {
    id: 'g_16_1', lesson: 16, hsk: 2,
    zh: '我常常在宿舍看书。', py: 'Wǒ chángcháng zài sùshè kàn shū.', vi: 'Tôi thường đọc sách ở ký túc xá.',
    tokens: ['我', '常常', '在宿舍', '看书', '。'],
    grammarNote: 'Trật tự chuẩn: Chủ ngữ + Phó từ tần suất (常常) + Địa điểm (在宿舍) + Hành động (看书).',
    distractors: ['去'],
    wrongVi: ['Tôi thỉnh thoảng mới đọc sách.', 'Tôi đang ở ký túc xá xem tivi.', 'Ký túc xá có nhiều sách.'],
    wrongZh: ['我常常看书在宿舍。', '在宿舍我常常不看书。', '常常我看书在宿舍。']
  },

  // Lesson 17 - Đang diễn ra 正在 / 在...呢
  {
    id: 'g_17_1', lesson: 17, hsk: 2,
    zh: '他正在听音乐呢。', py: 'Tā zhèngzài tīng yīnyuè ne.', vi: 'Anh ấy đang nghe nhạc đấy.',
    tokens: ['他', '正在', '听', '音乐', '呢', '。'],
    grammarNote: 'Biểu thị hành động đang diễn ra: [Chủ ngữ] + 正在 / 在 + Động từ + Tân ngữ + (呢).',
    distractors: ['了'],
    wrongVi: ['Anh ấy đã nghe nhạc xong rồi.', 'Anh ấy thích nghe nhạc lắm.', 'Anh ấy chuẩn bị nghe nhạc.'],
    wrongZh: ['他听正在音乐呢。', '他已经听音乐了。', '正在他听音乐呢。']
  },

  // Lesson 18 - Câu liên động (去... làm gì)
  {
    id: 'g_18_1', lesson: 18, hsk: 2,
    zh: '我顺便去邮局买邮票。', py: 'Wǒ shùnbiàn qù yóujú mǎi yóupiào.', vi: 'Tôi nhân tiện đi bưu điện mua tem.',
    tokens: ['我', '顺便', '去', '邮局', '买邮票', '。'],
    grammarNote: 'Phó từ 顺便 (nhân tiện) đứng trước động từ; Câu liên động: Đi đâu (去邮局) + Làm gì (买邮票).',
    distractors: ['在'],
    wrongVi: ['Tôi đi bưu điện gửi thư.', 'Tôi đi bưu điện mua bưu phẩm.', 'Nhân tiện tôi đi ngân hàng.'],
    wrongZh: ['我去邮局顺便买邮票。', '我顺便在邮局买。', '买邮票我顺便去邮局。']
  },

  // Lesson 19 - Trùng điệp động từ (Thử làm gì)
  {
    id: 'g_19_1', lesson: 19, hsk: 2,
    zh: '这件羽绒服我可以试试吗？', py: 'Zhè jiàn yǔróngfú wǒ kěyǐ shìshi ma?', vi: 'Chiếc áo lông vũ này tôi có thể mặc thử không?',
    tokens: ['这件羽绒服', '我', '可以', '试试', '吗', '？'],
    grammarNote: 'Động từ trùng điệp 试试 (thử một chút - giảm nhẹ sắc thái); Năng nguyện động từ 可以 đứng trước.',
    distractors: ['想'],
    wrongVi: ['Áo này đắt quá tôi không thử.', 'Tôi có thể mua chiếc áo này không?', 'Chiếc áo này có vừa không?'],
    wrongZh: ['这件羽绒服我想买买吗？', '我可以这件羽绒服试吗？', '试试我可以这件衣服吗？']
  },

  // Lesson 20 - Trợ từ kết cấu 的 (Định ngữ)
  {
    id: 'g_20_1', lesson: 20, hsk: 2,
    zh: '今天是我朋友的生日。', py: 'Jīntiān shì wǒ péngyou de shēngrì.', vi: 'Hôm nay là sinh nhật của bạn tôi.',
    tokens: ['今天', '是', '我朋友的', '生日', '。'],
    grammarNote: 'Định ngữ + 的 + Trung tâm ngữ: 我朋友 (bạn tôi) bổ nghĩa cho 生日 (sinh nhật).',
    distractors: ['在'],
    wrongVi: ['Hôm qua là sinh nhật bạn tôi.', 'Hôm nay tôi đi sinh nhật bạn.', 'Bạn tôi sinh nhật vào ngày mai.'],
    wrongZh: ['今天是我朋友生日在。', '今天有我朋友的生日。', '我朋友的生日今天是。']
  },

  // Lesson 21 - Trạng ngữ thời gian
  {
    id: 'g_21_1', lesson: 21, hsk: 2,
    zh: '我们明天早上七点半出发。', py: 'Wǒmen míngtiān zǎoshang qī diǎn bàn chūfā.', vi: 'Sáng mai 7 rưỡi chúng tôi xuất phát.',
    tokens: ['我们', '明天早上', '七点半', '出发', '。'],
    grammarNote: 'Quy tắc thời gian: Từ lớn đến nhỏ (Ngày mai -> Buổi sáng -> 7 giờ rưỡi) đứng TRƯỚC động từ 出发.',
    distractors: ['走'],
    wrongVi: ['Chiều mai chúng tôi mới đi.', 'Hôm qua 7 giờ chúng tôi đã xuất phát.', '7 giờ sáng mai ai đi cùng chúng tôi?'],
    wrongZh: ['我们出发明天早上七点半。', '明天早上七点半出发我们。', '我们七点半明天早上出发。']
  },

  // Lesson 22 - Câu kiêm ngữ (Mời ai làm gì)
  {
    id: 'g_22_1', lesson: 22, hsk: 2,
    zh: '我打算请老师教我京剧。', py: 'Wǒ dǎsuàn qǐng lǎoshī jiāo wǒ Jīngjù.', vi: 'Tôi dự định mời thầy giáo dạy tôi Kinh kịch.',
    tokens: ['我', '打算', '请', '老师', '教我', '京剧', '。'],
    grammarNote: 'Câu kiêm ngữ: 老师 vừa là tân ngữ của động từ 请, vừa là chủ ngữ của động từ 教.',
    distractors: ['想'],
    wrongVi: ['Thầy giáo mời tôi đi xem Kinh kịch.', 'Tôi tự học Kinh kịch ở trường.', 'Tôi định đi xem kịch cùng thầy.'],
    wrongZh: ['我打算老师请教我京剧。', '老师请我教京剧打算。', '我想请京剧教我老师。']
  },

  // Lesson 23 - Phương vị từ & Tồn tại 有 / 在
  {
    id: 'g_23_1', lesson: 23, hsk: 2,
    zh: '学校图书馆的左边有一个银行。', py: 'Xuéxiào túshūguǎn de zuǒbian yǒu yí ge yínháng.', vi: 'Bên trái thư viện trường học có một ngân hàng.',
    tokens: ['学校图书馆的', '左边', '有', '一个', '银行', '。'],
    grammarNote: 'Câu tồn hiện chỉ vị trí: Địa điểm + Phương vị từ (左边) + 有 + Tân ngữ tồn tại (一个银行).',
    distractors: ['在'],
    wrongVi: ['Ngân hàng nằm ở bên phải thư viện.', 'Trong trường học không có ngân hàng.', 'Thư viện ở bên cạnh trường học.'],
    wrongZh: ['学校图书馆的在左边一个银行。', '银行在学校图书馆有。', '一个银行有学校图书馆左边。']
  },

  // Lesson 24 - Động từ năng nguyện 会, 能, 想
  {
    id: 'g_24_1', lesson: 24, hsk: 2,
    zh: '你会不会打太极拳？', py: 'Nǐ huì bu huì dǎ tàijíquán?', vi: 'Bạn có biết đánh Thái Cực Quyền không?',
    tokens: ['你', '会不会', '打', '太极拳', '？'],
    grammarNote: 'Động từ 会 chỉ kỹ năng qua học tập; Câu hỏi chính phản dạng 会不会 + Động từ.',
    distractors: ['能'],
    wrongVi: ['Bạn có thể đánh Thái Cực Quyền không?', 'Bạn muốn học Thái Cực Quyền không?', 'Ai dạy bạn Thái Cực Quyền?'],
    wrongZh: ['你会打太极拳不会？', '你能不打太极拳吗？', '打太极拳你会不会？']
  },

  // Lesson 25 - Bổ ngữ trạng thái 得
  {
    id: 'g_25_1', lesson: 25, hsk: 2,
    zh: '她说汉语说得非常流利。', py: 'Tā shuō Hànyǔ shuō de fēicháng liúlì.', vi: 'Cô ấy nói tiếng Hán nói rất lưu loát.',
    tokens: ['她', '说汉语', '说得', '非常', '流利', '。'],
    grammarNote: 'Bổ ngữ trạng thái có tân ngữ: Động từ + Tân ngữ + Lặp lại Động từ + 得 + Trạng thái.',
    distractors: ['很'],
    wrongVi: ['Cô ấy nói tiếng Hán không tốt lắm.', 'Cô ấy học tiếng Hán rất chăm chỉ.', 'Tiếng Hán của cô ấy nói chậm.'],
    wrongZh: ['她说汉语得很非常流利。', '她非常流利说汉语。', '说得非常流利她汉语。']
  },

  // Lesson 26 - Trợ từ động thái 了 (Hoàn thành)
  {
    id: 'g_26_1', lesson: 26, hsk: 2,
    zh: '他买了一本很厚的词典。', py: 'Tā mǎi le yì běn hěn hòu de cídiǎn.', vi: 'Anh ấy đã mua một cuốn từ điển rất dày.',
    tokens: ['他', '买了', '一本', '很厚的', '词典', '。'],
    grammarNote: 'Động từ + 了 + Số lượng từ + Định ngữ + Tân ngữ: Biểu thị động tác đã hoàn tất.',
    distractors: ['过'],
    wrongVi: ['Anh ấy muốn mua một cuốn từ điển dày.', 'Anh ấy đang đọc từ điển rất dày.', 'Cuốn từ điển này rất dày.'],
    wrongZh: ['他买一本很厚的词典了。', '一本很厚的词典他买了。', '他了一本很厚词典买。']
  },

  // Lesson 27 - Trợ từ biến hóa 了 (Thay đổi trạng thái)
  {
    id: 'g_27_1', lesson: 27, hsk: 2,
    zh: '春天到了，天气变暖和了。', py: 'Chūntiān dào le, tiānqì biàn nuǎnhuo le.', vi: 'Mùa xuân đến rồi, thời tiết trở nên ấm áp rồi.',
    tokens: ['春天', '到了', '，', '天气', '变', '暖和了', '。'],
    grammarNote: 'Trợ từ 了 ở cuối câu biểu thị sự thay đổi trạng thái hoặc tình huống mới nảy sinh.',
    distractors: ['很'],
    wrongVi: ['Mùa xuân thời tiết rất lạnh.', 'Mùa hè đến thời tiết rất nóng.', 'Trời vẫn chưa ấm áp lên.'],
    wrongZh: ['春天到了，天气很冷了。', '变暖和了春天到了天气。', '天气暖和变春天到了。']
  },

  // Lesson 28 - Cấu trúc liên tiếp 一...就... (Vừa... thì...)
  {
    id: 'g_28_1', lesson: 28, hsk: 2,
    zh: '我吃了早饭就去学校。', py: 'Wǒ chī le zǎofàn jiù qù xuéxiào.', vi: 'Tôi ăn sáng xong là đi trường ngay.',
    tokens: ['我', '吃了早饭', '就', '去学校', '。'],
    grammarNote: 'Cấu trúc V1 + 了... 就 + V2: Hành động thứ hai diễn ra ngay sau khi hành động thứ nhất kết thúc.',
    distractors: ['才'],
    wrongVi: ['Tôi đi đến trường rồi mới ăn sáng.', 'Tôi không ăn sáng mà đi học luôn.', 'Tôi ăn sáng xong ở trường học.'],
    wrongZh: ['我吃早饭再去学校了。', '我就吃了早饭去学校。', '去学校我就吃了早饭。']
  },

  // Lesson 29 - Bổ ngữ kết quả (做对, 听懂, 看完)
  {
    id: 'g_29_1', lesson: 29, hsk: 2,
    zh: '今天的考试我都做对了。', py: 'Jīntiān de kǎoshì wǒ dōu zuòduì le.', vi: 'Bài thi hôm nay tôi đều làm đúng hết rồi.',
    tokens: ['今天的考试', '我', '都', '做对了', '。'],
    grammarNote: 'Bổ ngữ kết quả: Động từ 做 + Tính từ 对 biểu thị kết quả của hành động là chính xác.',
    distractors: ['完'],
    wrongVi: ['Bài thi hôm nay tôi làm sai nhiều.', 'Hôm nay tôi chưa làm xong bài thi.', 'Bài thi này rất khó tôi không làm được.'],
    wrongZh: ['今天的考试我都做错了。', '我都做完考今天的试了。', '做对了今天的考试我都。']
  },

  // Lesson 30 - Câu so sánh với 比 & Thời lượng
  {
    id: 'g_30_1', lesson: 30, hsk: 2,
    zh: '北京的冬天比上海冷得多。', py: 'Běijīng de dōngtiān bǐ Shànghǎi lěng de duō.', vi: 'Mùa đông Bắc Kinh lạnh hơn Thượng Hải nhiều.',
    tokens: ['北京的冬天', '比', '上海', '冷得多', '。'],
    grammarNote: 'Câu so sánh chữ 比: A + 比 + B + Tính từ + 得多 / 多了 (Hơn rất nhiều).',
    distractors: ['很'],
    wrongVi: ['Mùa đông Thượng Hải lạnh hơn Bắc Kinh.', 'Mùa đông Bắc Kinh và Thượng Hải lạnh như nhau.', 'Mùa đông Bắc Kinh không lạnh lắm.'],
    wrongZh: ['北京的冬天比上海很冷。', '上海比北京的冬天冷得多。', '冷得多比上海北京的冬天。']
  },
  {
    id: 'g_30_2', lesson: 30, hsk: 2,
    zh: '我来中国已经两个多月了。', py: 'Wǒ lái Zhōngguó yǐjīng liǎng ge duō yuè le.', vi: 'Tôi đến Trung Quốc đã hơn hai tháng rồi.',
    tokens: ['我', '来中国', '已经', '两个多月了', '。'],
    grammarNote: 'Bổ ngữ thời lượng: Động từ + Tân ngữ + 已经 + Khoảng thời gian + 了 (Hành động vẫn đang tiếp diễn).',
    distractors: ['在'],
    wrongVi: ['Tôi sẽ ở Trung Quốc hai tháng.', 'Hai tháng trước tôi đã về nước.', 'Tôi vừa mới đến Trung Quốc được hai ngày.'],
    wrongZh: ['我已经来中国在两个月。', '两个多月了我来中国已经。', '我来中国要两个多月。']
  }
];

const GrammarController = {
  sentences: [],
  currentQuestions: [],
  currentIndex: 0,
  score: 0,
  mode: 'reorder', // 'reorder', 'vi_to_zh', 'zh_to_vi'
  selectedTokens: [],
  availableTokens: [],
  isAnswered: false,
  missedQuestions: [],

  init(allLessons) {
    this.sentences = GRAMMAR_DATA;
    this.populateSelects(allLessons);
  },

  populateSelects(lessons) {
    const scopeSelect = document.getElementById('grammar-scope-select');
    if (!scopeSelect || !lessons) return;
    lessons.forEach(l => {
      const opt = document.createElement('option');
      opt.value = `lesson_${l.id}`;
      opt.innerText = `Bài ${l.id}: ${l.zh_title}`;
      scopeSelect.appendChild(opt);
    });
  },

  resetToSetup() {
    const setupView = document.getElementById('grammar-setup-view');
    const playView = document.getElementById('grammar-play-view');
    const resultsView = document.getElementById('grammar-results-view');
    if (setupView) setupView.style.display = 'block';
    if (playView) playView.style.display = 'none';
    if (resultsView) resultsView.style.display = 'none';
  },

  exitExercise() {
    this.resetToSetup();
  },

  startExercise(options = {}) {
    this.mode = options.mode || 'reorder';
    const scope = options.scope || 'all';
    const count = parseInt(options.count || 10, 10);

    let pool = [...this.sentences];
    if (scope === 'hsk1') {
      pool = pool.filter(s => s.hsk === 1);
    } else if (scope === 'hsk2') {
      pool = pool.filter(s => s.hsk === 2);
    } else if (scope.startsWith('lesson_')) {
      const lNum = parseInt(scope.replace('lesson_', ''), 10);
      pool = pool.filter(s => s.lesson === lNum);
      if (!pool.length) {
        pool = this.sentences.filter(s => s.hsk === (lNum <= 15 ? 1 : 2));
      }
    }

    if (!pool.length) pool = this.sentences;

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    this.currentQuestions = shuffled.slice(0, Math.min(count, pool.length));
    this.currentIndex = 0;
    this.score = 0;
    this.missedQuestions = [];

    const setupView = document.getElementById('grammar-setup-view');
    const playView = document.getElementById('grammar-play-view');
    const resultsView = document.getElementById('grammar-results-view');

    if (setupView) setupView.style.display = 'none';
    if (resultsView) resultsView.style.display = 'none';
    if (playView) playView.style.display = 'block';

    this.renderQuestion();
  },

  renderQuestion() {
    this.isAnswered = false;
    if (!this.currentQuestions || !this.currentQuestions.length) return;
    const q = this.currentQuestions[this.currentIndex];
    if (!q) return;

    const total = this.currentQuestions.length;

    // Update Progress Headers
    const curNum = document.getElementById('grammar-cur-num');
    if (curNum) curNum.innerText = this.currentIndex + 1;
    const totNum = document.getElementById('grammar-tot-num');
    if (totNum) totNum.innerText = total;
    const liveScore = document.getElementById('grammar-live-score');
    if (liveScore) liveScore.innerText = this.score;

    const progFill = document.getElementById('grammar-progress-fill');
    if (progFill) progFill.style.width = `${((this.currentIndex) / total) * 100}%`;

    const feedbackBox = document.getElementById('grammar-feedback-box');
    if (feedbackBox) {
      feedbackBox.style.display = 'none';
      feedbackBox.innerHTML = '';
    }

    const checkBtn = document.getElementById('grammar-check-btn');
    const nextBtn = document.getElementById('grammar-next-btn');
    if (checkBtn) {
      checkBtn.style.display = 'inline-flex';
      checkBtn.disabled = this.mode === 'reorder';
    }
    if (nextBtn) nextBtn.style.display = 'none';

    // Container Views
    const reorderArea = document.getElementById('grammar-reorder-area');
    const choiceArea = document.getElementById('grammar-choice-area');
    const promptVi = document.getElementById('grammar-prompt-vi');
    const promptZh = document.getElementById('grammar-prompt-zh');

    if (this.mode === 'reorder') {
      if (reorderArea) reorderArea.style.display = 'block';
      if (choiceArea) choiceArea.style.display = 'none';
      if (promptVi) promptVi.innerHTML = `<span>🇻🇳 Dịch nghĩa:</span> <strong>"${q.vi}"</strong>`;
      if (promptZh) promptZh.style.display = 'none';

      // Setup tokens
      this.selectedTokens = [];
      const allTokens = [...q.tokens];
      if (q.distractors && q.distractors.length) {
        allTokens.push(...q.distractors);
      }
      this.availableTokens = allTokens.map((t, i) => ({ id: i, text: t })).sort(() => 0.5 - Math.random());

      this.renderTiles();
    } else if (this.mode === 'vi_to_zh') {
      if (reorderArea) reorderArea.style.display = 'none';
      if (choiceArea) choiceArea.style.display = 'block';
      if (promptVi) promptVi.innerHTML = `<span>🇻🇳 Hãy chọn câu tiếng Trung đúng ngữ pháp cho:</span><br><strong style="font-size:1.15rem; color:var(--text-main); margin-top:0.35rem; display:block;">"${q.vi}"</strong>`;
      if (promptZh) promptZh.style.display = 'none';

      this.renderTranslationChoices(q, 'zh');
    } else if (this.mode === 'zh_to_vi') {
      if (reorderArea) reorderArea.style.display = 'none';
      if (choiceArea) choiceArea.style.display = 'block';
      if (promptVi) promptVi.innerHTML = `<span>🇨🇳 Chọn nghĩa tiếng Việt chính xác của câu:</span>`;
      if (promptZh) {
        promptZh.style.display = 'block';
        promptZh.innerHTML = `
          <div style="font-size:1.45rem; font-weight:700; color:var(--text-main); font-family:var(--font-hanzi); margin:0.4rem 0;">
            ${q.zh}
          </div>
          <div style="color:var(--primary); font-size:0.95rem; font-weight:600; margin-bottom:0.4rem;">${q.py}</div>
          <button class="btn btn-outline btn-sm" onclick="AudioEngine.speak('${q.zh}')" style="margin-bottom:0.5rem;">
            🔊 Nghe câu
          </button>
        `;
      }

      this.renderTranslationChoices(q, 'vi');
    }
  },

  renderTiles() {
    const slotContainer = document.getElementById('grammar-answer-slot');
    const poolContainer = document.getElementById('grammar-pool-slot');
    const checkBtn = document.getElementById('grammar-check-btn');

    if (slotContainer) {
      if (!this.selectedTokens.length) {
        slotContainer.innerHTML = '<span class="tile-placeholder">Chạm vào các từ bên dưới để ghép câu theo đúng trật tự...</span>';
      } else {
        slotContainer.innerHTML = '';
        this.selectedTokens.forEach((t, idx) => {
          const btn = document.createElement('button');
          btn.className = 'grammar-tile';
          btn.innerText = t.text;
          btn.onclick = () => this.unselectTile(idx);
          slotContainer.appendChild(btn);
        });
      }
    }

    if (poolContainer) {
      poolContainer.innerHTML = '';
      this.availableTokens.forEach((t, idx) => {
        const btn = document.createElement('button');
        btn.className = 'grammar-tile';
        btn.innerText = t.text;
        btn.onclick = () => this.selectTile(idx);
        poolContainer.appendChild(btn);
      });
    }

    if (checkBtn) {
      checkBtn.disabled = this.selectedTokens.length === 0;
    }
  },

  selectTile(poolIndex) {
    if (this.isAnswered) return;
    AudioEngine.playClickSound();
    const token = this.availableTokens.splice(poolIndex, 1)[0];
    this.selectedTokens.push(token);
    this.renderTiles();
  },

  unselectTile(slotIndex) {
    if (this.isAnswered) return;
    AudioEngine.playClickSound();
    const token = this.selectedTokens.splice(slotIndex, 1)[0];
    this.availableTokens.push(token);
    this.renderTiles();
  },

  clearTiles() {
    if (this.isAnswered) return;
    AudioEngine.playClickSound();
    this.availableTokens.push(...this.selectedTokens);
    this.selectedTokens = [];
    this.renderTiles();
  },

  renderTranslationChoices(q, targetType) {
    const container = document.getElementById('grammar-choice-area');
    if (!container) return;

    const correctText = targetType === 'zh' ? q.zh : q.vi;
    const wrongOptions = targetType === 'zh' ? (q.wrongZh || []) : (q.wrongVi || []);

    const allChoices = [
      { text: correctText, isCorrect: true },
      ...wrongOptions.map(t => ({ text: t, isCorrect: false }))
    ].sort(() => 0.5 - Math.random());

    container.innerHTML = `
      <div class="grammar-options-grid">
        ${allChoices.map((c, idx) => `
          <button class="grammar-opt-btn" onclick="GrammarController.handleChoiceAnswer(${c.isCorrect}, this)">
            <span class="opt-letter">${String.fromCharCode(65 + idx)}.</span>
            <span class="opt-text ${targetType === 'zh' ? 'hanzi' : ''}">${c.text}</span>
          </button>
        `).join('')}
      </div>
    `;
  },

  handleChoiceAnswer(isCorrect, buttonEl) {
    if (this.isAnswered) return;
    this.isAnswered = true;

    const q = this.currentQuestions[this.currentIndex];
    const allBtns = document.querySelectorAll('.grammar-opt-btn');
    allBtns.forEach(b => b.disabled = true);

    if (isCorrect) {
      buttonEl.classList.add('correct');
      this.score++;
      AudioEngine.playCorrectSound();
      AudioEngine.speak(q.zh);
      if (typeof StorageManager !== 'undefined') {
        StorageManager.addXP(10, 'Dịch câu đúng');
        StorageManager.recordDailyAction('quiz', 1);
      }
    } else {
      buttonEl.classList.add('wrong');
      AudioEngine.playWrongSound();
      this.missedQuestions.push(q);
      allBtns.forEach(b => {
        if (b.innerText.includes(this.mode === 'vi_to_zh' ? q.zh : q.vi)) {
          b.classList.add('correct');
        }
      });
    }

    this.showFeedback(isCorrect, q);
  },

  checkReorderAnswer() {
    if (this.isAnswered || !this.selectedTokens.length) return;
    this.isAnswered = true;

    const q = this.currentQuestions[this.currentIndex];
    const userAssembled = this.selectedTokens.map(t => t.text).join('').replace(/[,.?!，。？！]/g, '');
    const expected = q.zh.replace(/[,.?!，。？！]/g, '');

    const isCorrect = userAssembled === expected;

    const slot = document.getElementById('grammar-answer-slot');
    if (slot) {
      slot.classList.add(isCorrect ? 'slot-correct' : 'slot-wrong');
    }

    if (isCorrect) {
      this.score++;
      AudioEngine.playCorrectSound();
      AudioEngine.speak(q.zh);
      if (typeof StorageManager !== 'undefined') {
        StorageManager.addXP(15, 'Sắp xếp câu chính xác');
        StorageManager.recordDailyAction('quiz', 1);
      }
    } else {
      AudioEngine.playWrongSound();
      this.missedQuestions.push(q);
    }

    this.showFeedback(isCorrect, q);
  },

  showFeedback(isCorrect, q) {
    const feedbackBox = document.getElementById('grammar-feedback-box');
    const checkBtn = document.getElementById('grammar-check-btn');
    const nextBtn = document.getElementById('grammar-next-btn');

    if (checkBtn) checkBtn.style.display = 'none';
    if (nextBtn) {
      nextBtn.style.display = 'inline-flex';
      nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.className = `grammar-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
      feedbackBox.innerHTML = `
        <div style="font-weight:800; font-size:1.05rem; margin-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
          <span>${isCorrect ? '🎉 Chính xác!' : '⚠️ Chưa chính xác!'}</span>
        </div>
        <div style="font-size:1.15rem; font-weight:700; color:var(--text-main); font-family:var(--font-hanzi); margin:0.3rem 0;">
          ${q.zh}
        </div>
        <div style="color:var(--primary); font-size:0.88rem; font-weight:600;">${q.py}</div>
        <div style="color:var(--text-muted); font-size:0.85rem; margin-top:0.25rem;">🇻🇳 ${q.vi}</div>
        <div class="grammar-tip-badge" style="margin-top:0.6rem; padding:0.55rem 0.75rem; background:rgba(0,0,0,0.04); border-radius:var(--radius-sm); font-size:0.82rem; line-height:1.45; border-left:3px solid var(--primary);">
          💡 <strong>Ngữ pháp:</strong> ${q.grammarNote || 'Chú ý trật tự từ trong tiếng Trung: Trạng ngữ thời gian và nơi chốn luôn đứng trước vị ngữ.'}
        </div>
      `;
    }
  },

  nextQuestion() {
    const slot = document.getElementById('grammar-answer-slot');
    if (slot) slot.classList.remove('slot-correct', 'slot-wrong');

    if (this.currentIndex < this.currentQuestions.length - 1) {
      this.currentIndex++;
      this.renderQuestion();
    } else {
      this.showResults();
    }
  },

  showResults() {
    const playView = document.getElementById('grammar-play-view');
    const resultsView = document.getElementById('grammar-results-view');
    if (playView) playView.style.display = 'none';
    if (resultsView) resultsView.style.display = 'block';

    const total = this.currentQuestions.length;
    const pct = total > 0 ? Math.round((this.score / total) * 100) : 0;

    if (pct >= 80) {
      AudioEngine.playVictorySound();
    }

    const resScore = document.getElementById('grammar-res-score');
    if (resScore) resScore.innerText = `${this.score} / ${total}`;
    const resPct = document.getElementById('grammar-res-pct');
    if (resPct) resPct.innerText = `${pct}%`;

    let badge = 'Cần luyện tập thêm nhé!';
    if (pct === 100) badge = '👑 Tuyệt đối! Bậc thầy Ngữ pháp HSK!';
    else if (pct >= 80) badge = '🌟 Rất xuất sắc! Nắm vững cấu trúc câu!';
    else if (pct >= 60) badge = '👍 Khá tốt! Cần chú ý thêm vị trí phó từ!';
    const badgeEl = document.getElementById('grammar-res-badge');
    if (badgeEl) badgeEl.innerText = badge;

    // Render missed items
    const missedArea = document.getElementById('grammar-missed-area');
    const missedList = document.getElementById('grammar-missed-list');
    if (this.missedQuestions.length > 0 && missedArea && missedList) {
      missedArea.style.display = 'block';
      missedList.innerHTML = this.missedQuestions.map(m => `
        <div style="padding:0.75rem; border-bottom:1px solid var(--border);">
          <div style="font-size:1.15rem; font-weight:700; color:var(--text-main); font-family:var(--font-hanzi);">${m.zh}</div>
          <div style="color:var(--primary); font-size:0.85rem; font-weight:600;">${m.py}</div>
          <div style="color:var(--text-muted); font-size:0.85rem;">${m.vi}</div>
          <div style="font-size:0.78rem; color:var(--secondary); margin-top:0.25rem;">💡 ${m.grammarNote}</div>
        </div>
      `).join('');
    } else if (missedArea) {
      missedArea.style.display = 'none';
    }
  }
};

if (typeof window !== 'undefined') {
  window.GRAMMAR_DATA = GRAMMAR_DATA;
  window.GrammarController = GrammarController;
}
