/**
 * Grammar & Sentence Construction Controller (HSK 1 & HSK 2)
 * Duolingo-style Word Ordering (连词成句) & 2-Way Translation (Vi ↔ Zh)
 */

const GRAMMAR_DATA = [
  {
    "id": "g_1_1",
    "lesson": 1,
    "hsk": 1,
    "zh": "你好吗？",
    "py": "Nǐ hǎo ma?",
    "vi": "Bạn khỏe không?",
    "tokens": [
      "你",
      "好",
      "吗",
      "？"
    ],
    "grammarNote": "Câu hỏi nghi vấn cơ bản: [Mệnh đề] + Trợ từ ngữ khí 吗？",
    "distractors": [
      "呢"
    ],
    "wrongVi": [
      "Bạn tên là gì?",
      "Bạn đi đâu đấy?",
      "Bạn có bận không?"
    ],
    "wrongZh": [
      "你好呢？",
      "你是好吗？",
      "你吗好？"
    ]
  },
  {
    "id": "g_1_2",
    "lesson": 1,
    "hsk": 1,
    "zh": "我很好，你呢？",
    "py": "Wǒ hěn hǎo, nǐ ne?",
    "vi": "Tôi rất khỏe, còn bạn?",
    "tokens": [
      "我",
      "很",
      "好",
      "，",
      "你",
      "呢",
      "？"
    ],
    "grammarNote": "Phó từ mức độ 很 đứng trước tính từ; Trợ từ 呢 dùng để hỏi tỉnh lược (Còn... thì sao?).",
    "distractors": [
      "也"
    ],
    "wrongVi": [
      "Tôi không khỏe lắm, còn bạn?",
      "Tôi cũng rất tốt.",
      "Tôi rất bận, bạn thì sao?"
    ],
    "wrongZh": [
      "我很不好，你呢？",
      "也很好我，你呢？",
      "我好很，你呢？"
    ]
  },
  {
    "id": "g_1_3",
    "lesson": 1,
    "hsk": 1,
    "zh": "我也很好。",
    "py": "Wǒ yě hěn hǎo.",
    "vi": "Tôi cũng rất khỏe.",
    "tokens": [
      "我",
      "也",
      "很",
      "好",
      "。"
    ],
    "grammarNote": "Phó từ 也 (cũng) đứng trước phó từ 很 và vị ngữ: Chủ ngữ + 也 + 很 + Tính từ.",
    "distractors": [
      "都"
    ],
    "wrongVi": [
      "Tôi không khỏe.",
      "Chúng tôi đều khỏe.",
      "Bạn cũng khỏe chứ?"
    ],
    "wrongZh": [
      "我也不好。",
      "我很也好。",
      "我也是好。"
    ]
  },
  {
    "id": "g_1_4",
    "lesson": 1,
    "hsk": 1,
    "zh": "妈妈好吗？",
    "py": "Māma hǎo ma?",
    "vi": "Mẹ có khỏe không?",
    "tokens": [
      "妈妈",
      "好",
      "吗",
      "？"
    ],
    "grammarNote": "Chủ ngữ ngôi thứ ba + Tính từ + Trợ từ nghi vấn 吗？",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Mẹ đi đâu rồi?",
      "Mẹ rất khỏe.",
      "Mẹ có bận không?"
    ],
    "wrongZh": [
      "妈妈吗好？",
      "妈妈很好吗？",
      "好妈妈吗？"
    ]
  },
  {
    "id": "g_2_1",
    "lesson": 2,
    "hsk": 1,
    "zh": "汉语不太难。",
    "py": "Hànyǔ bú tài nán.",
    "vi": "Tiếng Hán không khó lắm.",
    "tokens": [
      "汉语",
      "不太",
      "难",
      "。"
    ],
    "grammarNote": "Phó từ 不太 (không... lắm) đứng trước tính từ để giảm nhẹ mức độ.",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Tiếng Hán rất khó.",
      "Tiếng Hán quá khó.",
      "Tiếng Hán không dễ."
    ],
    "wrongZh": [
      "汉语太不难。",
      "汉语很大难。",
      "不汉语太难。"
    ]
  },
  {
    "id": "g_2_2",
    "lesson": 2,
    "hsk": 1,
    "zh": "你忙吗？我很忙。",
    "py": "Nǐ máng ma? Wǒ hěn máng.",
    "vi": "Bạn bận không? Tôi rất bận.",
    "tokens": [
      "你",
      "忙",
      "吗",
      "？",
      "我",
      "很",
      "忙",
      "。"
    ],
    "grammarNote": "Trong câu khẳng định vị ngữ tính từ, thường thêm phó từ 很 trước tính từ.",
    "distractors": [
      "太"
    ],
    "wrongVi": [
      "Bạn khỏe không? Tôi rất khỏe.",
      "Bạn bận không? Tôi không bận.",
      "Bạn học gì? Tôi học tiếng Hán."
    ],
    "wrongZh": [
      "你忙吗？我太忙。",
      "你忙呢？我很忙。",
      "你很忙吗？我不忙。"
    ]
  },
  {
    "id": "g_2_3",
    "lesson": 2,
    "hsk": 1,
    "zh": "爸爸妈妈都很好。",
    "py": "Bàba māma dōu hěn hǎo.",
    "vi": "Bố mẹ đều rất khỏe.",
    "tokens": [
      "爸爸",
      "妈妈",
      "都",
      "很",
      "好",
      "。"
    ],
    "grammarNote": "Phó từ 都 (đều) bổ nghĩa cho chủ ngữ số nhiều, đứng trước vị ngữ.",
    "distractors": [
      "也"
    ],
    "wrongVi": [
      "Bố mẹ tôi cũng khỏe.",
      "Bố mẹ rất bận.",
      "Bố mẹ đi làm rồi."
    ],
    "wrongZh": [
      "爸爸妈妈也很忙。",
      "都爸爸妈妈很好。",
      "爸爸妈妈很都好。"
    ]
  },
  {
    "id": "g_2_4",
    "lesson": 2,
    "hsk": 1,
    "zh": "哥哥不忙，弟弟呢？",
    "py": "Gēge bù máng, dìdi ne?",
    "vi": "Anh trai không bận, còn em trai thì sao?",
    "tokens": [
      "哥哥",
      "不",
      "忙",
      "，",
      "弟弟",
      "呢",
      "？"
    ],
    "grammarNote": "Phủ định dùng 不 (bù), câu hỏi tỉnh lược dùng [Danh từ] + 呢？",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Anh trai rất bận, em trai cũng bận.",
      "Anh trai không khỏe, em trai khỏe không?",
      "Bố không bận, mẹ thì sao?"
    ],
    "wrongZh": [
      "哥哥不忙，弟弟吗？",
      "哥哥不太忙，弟弟呢？",
      "不哥哥忙，弟弟呢？"
    ]
  },
  {
    "id": "g_3_1",
    "lesson": 3,
    "hsk": 1,
    "zh": "明天见！",
    "py": "Míngtiān jiàn!",
    "vi": "Ngày mai gặp lại!",
    "tokens": [
      "明天",
      "见",
      "！"
    ],
    "grammarNote": "Từ chỉ thời gian + 见: Hẹn gặp lại vào mốc thời gian đó (VD: 一会儿见, 星期一见).",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Hôm nay gặp nhé.",
      "Ngày mai bạn đi không?",
      "Hẹn gặp tuần sau."
    ],
    "wrongZh": [
      "今天见！",
      "明天去！",
      "见明天！"
    ]
  },
  {
    "id": "g_3_2",
    "lesson": 3,
    "hsk": 1,
    "zh": "你去不去北京？",
    "py": "Nǐ qù bu qù Běijīng?",
    "vi": "Bạn đi Bắc Kinh không?",
    "tokens": [
      "你",
      "去",
      "不",
      "去",
      "北京",
      "？"
    ],
    "grammarNote": "Câu hỏi chính phản: Động từ + 不 + Động từ (去不去). Không dùng trợ từ 吗 ở cuối câu.",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Bạn đang ở Bắc Kinh à?",
      "Bạn có thích Bắc Kinh không?",
      "Bao giờ bạn đi Bắc Kinh?"
    ],
    "wrongZh": [
      "你去不去北京吗？",
      "你去北京不？",
      "你去北京去？"
    ]
  },
  {
    "id": "g_3_3",
    "lesson": 3,
    "hsk": 1,
    "zh": "你学英语吗？不，学汉语。",
    "py": "Nǐ xué Yīngyǔ ma? Bù, xué Hànyǔ.",
    "vi": "Bạn học tiếng Anh à? Không, học tiếng Hán.",
    "tokens": [
      "你",
      "学",
      "英语",
      "吗",
      "？",
      "不",
      "，",
      "学",
      "汉语",
      "。"
    ],
    "grammarNote": "Câu hỏi với trợ từ 吗 và câu trả lời phủ định ngắn gọn với 不.",
    "distractors": [
      "没"
    ],
    "wrongVi": [
      "Bạn học tiếng Pháp à? Không, học tiếng Anh.",
      "Bạn học tiếng Hán không? Có, tôi học.",
      "Bạn dạy tiếng Anh à? Không."
    ],
    "wrongZh": [
      "你学英语呢？不，学汉语。",
      "你学英语吗？没，学汉语。",
      "你学英语不？学汉语。"
    ]
  },
  {
    "id": "g_3_4",
    "lesson": 3,
    "hsk": 1,
    "zh": "这是汉语书，那是英语书。",
    "py": "Zhè shì Hànyǔ shū, nà shì Yīngyǔ shū.",
    "vi": "Đây là sách tiếng Hán, kia là sách tiếng Anh.",
    "tokens": [
      "这",
      "是",
      "汉语",
      "书",
      "，",
      "那",
      "是",
      "英语",
      "书",
      "。"
    ],
    "grammarNote": "Đại từ chỉ định 这 (đây/gần) và 那 (kia/xa) kết hợp với động từ 是.",
    "distractors": [
      "哪"
    ],
    "wrongVi": [
      "Đây là sách tiếng Anh, kia là sách tiếng Hán.",
      "Đây có phải sách tiếng Hán không?",
      "Sách tiếng Hán ở đâu?"
    ],
    "wrongZh": [
      "哪是汉语书，那是英语书。",
      "这是汉语书，这是英语书。",
      "那是汉语书，这是英语书。"
    ]
  },
  {
    "id": "g_4_1",
    "lesson": 4,
    "hsk": 1,
    "zh": "今天星期几？",
    "py": "Jīntiān xīngqī jǐ?",
    "vi": "Hôm nay là thứ mấy?",
    "tokens": [
      "今天",
      "星期",
      "几",
      "？"
    ],
    "grammarNote": "Hỏi thứ trong tuần: 今天 / 明天 + 星期几？ Đại từ 几 dùng hỏi số lượng nhỏ dưới 10.",
    "distractors": [
      "多少"
    ],
    "wrongVi": [
      "Hôm nay ngày mấy?",
      "Bây giờ là mấy giờ?",
      "Hôm nay thứ mấy bạn đi học?"
    ],
    "wrongZh": [
      "今天星期多少？",
      "今天几星期？",
      "星期几今天？"
    ]
  },
  {
    "id": "g_4_2",
    "lesson": 4,
    "hsk": 1,
    "zh": "你去哪儿？我去天安门。",
    "py": "Nǐ qù nǎr? Wǒ qù Tiān'ānmén.",
    "vi": "Bạn đi đâu đấy? Tôi đi Thiên An Môn.",
    "tokens": [
      "你",
      "去",
      "哪儿",
      "？",
      "我",
      "去",
      "天安门",
      "。"
    ],
    "grammarNote": "Đại từ nghi vấn nơi chốn 哪儿 (nǎr): Chủ ngữ + 去 + 哪儿？",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Bạn ở đâu? Tôi ở Thiên An Môn.",
      "Bạn đi Thiên An Môn với ai?",
      "Bạn từ đâu tới? Tôi tới từ Thiên An Môn."
    ],
    "wrongZh": [
      "你在哪儿？我去天安门。",
      "你去那儿？我去天安门。",
      "你去哪儿？我在天安门。"
    ]
  },
  {
    "id": "g_4_3",
    "lesson": 4,
    "hsk": 1,
    "zh": "我不去，我回学校。",
    "py": "Wǒ bú qù, wǒ huí xuéxiào.",
    "vi": "Tôi không đi, tôi về trường học.",
    "tokens": [
      "我",
      "不",
      "去",
      "，",
      "我",
      "回",
      "学校",
      "。"
    ],
    "grammarNote": "Động từ 回 (về): 回 + Địa điểm (về trường, về nhà, về nước).",
    "distractors": [
      "来"
    ],
    "wrongVi": [
      "Tôi không đi, tôi ở trường học.",
      "Tôi đi trường học, bạn đi không?",
      "Tôi về nhà rồi."
    ],
    "wrongZh": [
      "我没去，我回学校。",
      "我不去，我去学校。",
      "我不来，我回学校。"
    ]
  },
  {
    "id": "g_4_4",
    "lesson": 4,
    "hsk": 1,
    "zh": "今天我去银行，明天去天安门。",
    "py": "Jīntiān wǒ qù yínháng, míngtiān qù Tiān'ānmén.",
    "vi": "Hôm nay tôi đi ngân hàng, ngày mai đi Thiên An Môn.",
    "tokens": [
      "今天",
      "我",
      "去",
      "银行",
      "，",
      "明天",
      "去",
      "天安门",
      "。"
    ],
    "grammarNote": "Quy tắc vàng: Trạng ngữ thời gian (今天, 明天) đứng trước hoặc ngay sau chủ ngữ, trước động từ.",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Hôm nay tôi ở ngân hàng, ngày mai ở Thiên An Môn.",
      "Hôm qua tôi đi ngân hàng, hôm nay đi Thiên An Môn.",
      "Ngày mai tôi đi ngân hàng cùng bạn."
    ],
    "wrongZh": [
      "今天我去银行，明天在天安门。",
      "我今天去银行，去明天天安门。",
      "今天我去天安门，明天去银行。"
    ]
  },
  {
    "id": "g_5_1",
    "lesson": 5,
    "hsk": 1,
    "zh": "这是王老师，这是我爸爸。",
    "py": "Zhè shì Wáng lǎoshī, zhè shì wǒ bàba.",
    "vi": "Đây là thầy Vương, đây là bố tôi.",
    "tokens": [
      "这",
      "是",
      "王老师",
      "，",
      "这",
      "是",
      "我",
      "爸爸",
      "。"
    ],
    "grammarNote": "Câu chữ 是 giới thiệu người: 这 + 是 + [Danh từ xưng hô / Tên riêng].",
    "distractors": [
      "那"
    ],
    "wrongVi": [
      "Kia là thầy Vương, kia là bố tôi.",
      "Đây là bố tôi, kia là thầy Vương.",
      "Thầy Vương là bố của tôi."
    ],
    "wrongZh": [
      "那是王老师，这是我爸爸。",
      "这有王老师，这是我爸爸。",
      "王老师是这，爸爸是我。"
    ]
  },
  {
    "id": "g_5_2",
    "lesson": 5,
    "hsk": 1,
    "zh": "请进，请坐，请喝茶。",
    "py": "Qǐng jìn, qǐng zuò, qǐng hē chá.",
    "vi": "Mời vào, mời ngồi, mời uống trà.",
    "tokens": [
      "请进",
      "，",
      "请坐",
      "，",
      "请喝茶",
      "。"
    ],
    "grammarNote": "Từ lịch sự 请 (mời, xin) đứng đầu câu cầu khiến: 请 + Động từ.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Mời vào, mời uống nước, mời ngồi.",
      "Xin chào, mời vào uống trà.",
      "Thầy giáo mời chúng tôi uống trà."
    ],
    "wrongZh": [
      "去进，去坐，去喝茶。",
      "请坐，请进，请喝茶。",
      "请进，请喝茶，请坐。"
    ]
  },
  {
    "id": "g_5_3",
    "lesson": 5,
    "hsk": 1,
    "zh": "工作忙不忙？不太忙。",
    "py": "Gōngzuò máng bu máng? Bú tài máng.",
    "vi": "Công việc bận không? Không bận lắm.",
    "tokens": [
      "工作",
      "忙",
      "不",
      "忙",
      "？",
      "不太",
      "忙",
      "。"
    ],
    "grammarNote": "Câu hỏi chính phản với tính từ: Tính từ + 不 + Tính từ (忙不忙).",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Công việc tốt không? Rất tốt.",
      "Bạn có bận việc không? Rất bận.",
      "Công việc của bạn thế nào?"
    ],
    "wrongZh": [
      "工作忙不忙吗？不太忙。",
      "工作不忙吗？不太忙。",
      "工作忙忙不？不太忙。"
    ]
  },
  {
    "id": "g_5_4",
    "lesson": 5,
    "hsk": 1,
    "zh": "我的老师是中国人。",
    "py": "Wǒ de lǎoshī shì Zhōngguó rén.",
    "vi": "Thầy giáo của tôi là người Trung Quốc.",
    "tokens": [
      "我",
      "的",
      "老师",
      "是",
      "中国",
      "人",
      "。"
    ],
    "grammarNote": "Trợ từ kết cấu 的 biểu thị sở hữu: Định ngữ + 的 + Trung tâm ngữ.",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Thầy giáo của tôi dạy tiếng Trung.",
      "Thầy giáo tôi đang ở Trung Quốc.",
      "Tôi là học sinh của thầy giáo Trung Quốc."
    ],
    "wrongZh": [
      "我老师有中国人。",
      "我的老师在日本人。",
      "中国是我的老师。"
    ]
  },
  {
    "id": "g_6_1",
    "lesson": 6,
    "hsk": 1,
    "zh": "你叫什么名字？",
    "py": "Nǐ jiào shénme míngzi?",
    "vi": "Bạn tên là gì?",
    "tokens": [
      "你",
      "叫",
      "什么",
      "名字",
      "？"
    ],
    "grammarNote": "Đại từ nghi vấn 什么 đặt trước danh từ 名字.",
    "distractors": [
      "哪"
    ],
    "wrongVi": [
      "Bạn họ gì?",
      "Bạn là ai?",
      "Bạn ở đâu?"
    ],
    "wrongZh": [
      "你叫谁名字？",
      "你是名字什么？",
      "名字你叫什么？"
    ]
  },
  {
    "id": "g_6_2",
    "lesson": 6,
    "hsk": 1,
    "zh": "我学习汉语，汉字很难。",
    "py": "Wǒ xuéxí Hànyǔ, hànzì hěn nán.",
    "vi": "Tôi học tiếng Hán, chữ Hán rất khó.",
    "tokens": [
      "我",
      "学习",
      "汉语",
      "，",
      "汉字",
      "很",
      "难",
      "。"
    ],
    "grammarNote": "Động từ 学习 mang tân ngữ 汉语; Vị ngữ tính từ 很难.",
    "distractors": [
      "不"
    ],
    "wrongVi": [
      "Tôi học tiếng Anh, phát âm rất khó.",
      "Tiếng Hán không khó lắm.",
      "Tôi viết chữ Hán rất đẹp."
    ],
    "wrongZh": [
      "我学汉语，汉字不难。",
      "我学习汉语，汉字太难。",
      "汉语我学，难汉字。"
    ]
  },
  {
    "id": "g_6_3",
    "lesson": 6,
    "hsk": 1,
    "zh": "请问，你贵姓？我姓张。",
    "py": "Qǐngwèn, nǐ guìxìng? Wǒ xìng Zhāng.",
    "vi": "Xin hỏi, bạn họ gì? Tôi họ Trương.",
    "tokens": [
      "请问",
      "，",
      "你",
      "贵姓",
      "？",
      "我",
      "姓",
      "张",
      "。"
    ],
    "grammarNote": "Cách hỏi họ lịch sự: 贵姓; Trả lời dùng: 我姓 + Họ.",
    "distractors": [
      "叫"
    ],
    "wrongVi": [
      "Xin hỏi, bạn tên gì? Tôi tên Trương.",
      "Bạn là người nước nào?",
      "Tôi là bạn của Trương Đông."
    ],
    "wrongZh": [
      "请问，你叫什么？我姓张。",
      "请问，你名字？我姓张。",
      "你贵姓请问？我张姓。"
    ]
  },
  {
    "id": "g_6_4",
    "lesson": 6,
    "hsk": 1,
    "zh": "你是哪国人？我是越南人。",
    "py": "Nǐ shì nǎ guó rén? Wǒ shì Yuènán rén.",
    "vi": "Bạn là người nước nào? Tôi là người Việt Nam.",
    "tokens": [
      "你",
      "是",
      "哪",
      "国",
      "人",
      "？",
      "我",
      "是",
      "越南",
      "人",
      "。"
    ],
    "grammarNote": "Đại từ 哪 (nào): 哪 + Danh từ / Quốc gia (哪国人).",
    "distractors": [
      "什么"
    ],
    "wrongVi": [
      "Bạn đi nước nào?",
      "Bạn có phải người Việt Nam không?",
      "Bạn biết nói tiếng nước nào?"
    ],
    "wrongZh": [
      "你是谁国人？我是越南人。",
      "你是什么国人？我是越南人。",
      "哪国人你是？我是越南人。"
    ]
  },
  {
    "id": "g_7_1",
    "lesson": 7,
    "hsk": 1,
    "zh": "中午你去哪儿吃饭？",
    "py": "Zhōngwǔ nǐ qù nǎr chīfàn?",
    "vi": "Buổi trưa bạn đi đâu ăn cơm?",
    "tokens": [
      "中午",
      "你",
      "去",
      "哪儿",
      "吃饭",
      "？"
    ],
    "grammarNote": "Câu liên động: Đi đâu làm gì (去 + Địa điểm + Động từ).",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Buổi trưa bạn ăn cái gì?",
      "Buổi chiều bạn đi ăn cơm không?",
      "Ai đi ăn cơm cùng bạn?"
    ],
    "wrongZh": [
      "中午你在哪儿吃饭？",
      "去哪儿中午你吃饭？",
      "中午你吃饭哪儿？"
    ]
  },
  {
    "id": "g_7_2",
    "lesson": 7,
    "hsk": 1,
    "zh": "我去食堂吃馒头。",
    "py": "Wǒ qù shítáng chī mántou.",
    "vi": "Tôi đi nhà ăn ăn màn thầu.",
    "tokens": [
      "我",
      "去",
      "食堂",
      "吃",
      "馒头",
      "。"
    ],
    "grammarNote": "Câu liên động: 去 + 食堂 + 吃馒头.",
    "distractors": [
      "来"
    ],
    "wrongVi": [
      "Tôi ở nhà ăn ăn bánh bao.",
      "Tôi đi ăn cơm cùng bạn.",
      "Nhà ăn có bánh bao không?"
    ],
    "wrongZh": [
      "我在食堂吃包子。",
      "我去食堂买米饭。",
      "食堂我去吃馒头。"
    ]
  },
  {
    "id": "g_7_3",
    "lesson": 7,
    "hsk": 1,
    "zh": "你要几个包子？我要四个。",
    "py": "Nǐ yào jǐ ge bāozi? Wǒ yào sì ge.",
    "vi": "Bạn muốn mấy cái bánh bao? Tôi muốn 4 cái.",
    "tokens": [
      "你",
      "要",
      "几",
      "个",
      "包子",
      "？",
      "我",
      "要",
      "四",
      "个",
      "。"
    ],
    "grammarNote": "Lượng từ 个 (gè) đứng sau số từ / đại từ 几: 几个包子, 四个.",
    "distractors": [
      "杯"
    ],
    "wrongVi": [
      "Bạn ăn mấy bát cơm?",
      "Bánh bao bao nhiêu tiền một cái?",
      "Bạn có muốn ăn bánh bao không?"
    ],
    "wrongZh": [
      "你要多少包子？我要四个。",
      "你要四包子？我要四个。",
      "几包子你要？我要四个。"
    ]
  },
  {
    "id": "g_7_4",
    "lesson": 7,
    "hsk": 1,
    "zh": "我喝一碗鸡蛋汤。",
    "py": "Wǒ hē yì wǎn jīdàntāng.",
    "vi": "Tôi uống một bát canh trứng gà.",
    "tokens": [
      "我",
      "喝",
      "一碗",
      "鸡蛋汤",
      "。"
    ],
    "grammarNote": "Lượng từ chỉ đồ đựng: 一碗 (một bát) + Danh từ (鸡蛋汤).",
    "distractors": [
      "瓶"
    ],
    "wrongVi": [
      "Tôi ăn một bát cơm.",
      "Tôi uống một cốc trà.",
      "Canh trứng gà rất ngon."
    ],
    "wrongZh": [
      "我吃一碗鸡蛋汤。",
      "我喝一杯鸡蛋汤。",
      "一碗鸡蛋汤我喝。"
    ]
  },
  {
    "id": "g_8_1",
    "lesson": 8,
    "hsk": 1,
    "zh": "苹果一斤多少钱？",
    "py": "Píngguǒ yì jīn duōshao qián?",
    "vi": "Táo bao nhiêu tiền một cân?",
    "tokens": [
      "苹果",
      "一斤",
      "多少",
      "钱",
      "？"
    ],
    "grammarNote": "Mẫu câu hỏi giá: [Đồ vật] + [Đơn vị] + 多少钱？",
    "distractors": [
      "几"
    ],
    "wrongVi": [
      "Táo này có ngon không?",
      "Một cân táo có mấy quả?",
      "Bạn mua mấy cân táo?"
    ],
    "wrongZh": [
      "苹果一斤几钱？",
      "多少钱一斤苹果？",
      "苹果多少钱一斤吗？"
    ]
  },
  {
    "id": "g_8_2",
    "lesson": 8,
    "hsk": 1,
    "zh": "太贵了，便宜一点儿吧。",
    "py": "Tài guì le, piányi yìdiǎnr ba.",
    "vi": "Đắt quá rồi, rẻ một chút đi mà.",
    "tokens": [
      "太",
      "贵",
      "了",
      "，",
      "便宜",
      "一点儿",
      "吧",
      "。"
    ],
    "grammarNote": "Cảm thán: 太...了; Tính từ + 一点儿 (rẻ hơn một chút); Trợ từ 吧 biểu thị thương lượng.",
    "distractors": [
      "有点儿"
    ],
    "wrongVi": [
      "Rẻ quá rồi, mua thêm chút đi.",
      "Đắt quá, tôi không mua đâu.",
      "Rẻ hơn thì tôi mua hai cân."
    ],
    "wrongZh": [
      "有点贵了，便宜一点儿吧。",
      "太贵了，便宜有点儿吧。",
      "便宜一点儿吧，真贵了。"
    ]
  },
  {
    "id": "g_8_3",
    "lesson": 8,
    "hsk": 1,
    "zh": "我要三斤苹果和两斤香蕉。",
    "py": "Wǒ yào sān jīn píngguǒ hé liǎng jīn xiāngjiāo.",
    "vi": "Tôi muốn 3 cân táo và 2 cân chuối.",
    "tokens": [
      "我",
      "要",
      "三斤",
      "苹果",
      "和",
      "两斤",
      "香蕉",
      "。"
    ],
    "grammarNote": "Số từ 2 đứng trước lượng từ dùng 两 (liǎng), không dùng 二 (èr).",
    "distractors": [
      "二斤"
    ],
    "wrongVi": [
      "Tôi mua hai cân táo và ba cân chuối.",
      "Táo và chuối hết bao nhiêu tiền?",
      "Tôi không muốn mua chuối."
    ],
    "wrongZh": [
      "我要三斤苹果和二斤香蕉。",
      "我要三苹果和两香蕉。",
      "三斤苹果和两斤香蕉我要。"
    ]
  },
  {
    "id": "g_8_4",
    "lesson": 8,
    "hsk": 1,
    "zh": "一共多少钱？一共二十五块。",
    "py": "Yígòng duōshao qián? Yígòng èrshíwǔ kuài.",
    "vi": "Tổng cộng bao nhiêu tiền? Tổng cộng 25 tệ.",
    "tokens": [
      "一共",
      "多少",
      "钱",
      "？",
      "一共",
      "二十五块",
      "。"
    ],
    "grammarNote": "Phó từ 一共 (tổng cộng) + 多少钱 / Số tiền + 块 (đồng/tệ).",
    "distractors": [
      "分"
    ],
    "wrongVi": [
      "Một cân bao nhiêu tiền?",
      "Bạn đưa tôi hai mươi tệ.",
      "Còn thừa bao nhiêu tiền thối?."
    ],
    "wrongZh": [
      "一共几钱？一共二十五块。",
      "多少钱一共？一共二十五块。",
      "一共多少钱？一共二十五毛。"
    ]
  },
  {
    "id": "g_9_1",
    "lesson": 9,
    "hsk": 1,
    "zh": "下午我要去银行换钱。",
    "py": "Xiàwǔ wǒ yào qù yínháng huàn qián.",
    "vi": "Buổi chiều tôi phải đi ngân hàng đổi tiền.",
    "tokens": [
      "下午",
      "我",
      "要",
      "去",
      "银行",
      "换",
      "钱",
      "。"
    ],
    "grammarNote": "Động từ năng nguyện 要 (cần, muốn) + Động từ (去银行换钱).",
    "distractors": [
      "想"
    ],
    "wrongVi": [
      "Buổi sáng tôi đi ngân hàng đổi tiền.",
      "Buổi chiều bạn có đi ngân hàng không?",
      "Tôi đi ngân hàng rút tiền."
    ],
    "wrongZh": [
      "下午我想在银行换钱。",
      "去银行下午我要换钱。",
      "下午我要在银行换钱。"
    ]
  },
  {
    "id": "g_9_2",
    "lesson": 9,
    "hsk": 1,
    "zh": "先生，您换什么钱？",
    "py": "Xiānsheng, nín huàn shénme qián?",
    "vi": "Thưa ông, ngài đổi tiền gì ạ?",
    "tokens": [
      "先生",
      "，",
      "您",
      "换",
      "什么",
      "钱",
      "？"
    ],
    "grammarNote": "Đại từ nhân xưng tôn kính 您; 换什么钱 (đổi loại tiền gì).",
    "distractors": [
      "你"
    ],
    "wrongVi": [
      "Thưa ông, ngài muốn đổi bao nhiêu tiền?",
      "Thưa ông, ngài gửi tiền gì ạ?",
      "Ngài có tiền mặt không?"
    ],
    "wrongZh": [
      "先生，你换多少钱？",
      "先生，您换几钱？",
      "您换什么钱先生？"
    ]
  },
  {
    "id": "g_9_3",
    "lesson": 9,
    "hsk": 1,
    "zh": "我想换五百美元的人民币。",
    "py": "Wǒ xiǎng huàn wǔbǎi Měiyuán de Rénmínbì.",
    "vi": "Tôi muốn đổi 500 đô la Mỹ lấy Nhân dân tệ.",
    "tokens": [
      "我",
      "想",
      "换",
      "五百美元",
      "的",
      "人民币",
      "。"
    ],
    "grammarNote": "Cụm danh từ chữ 的: [Số tiền ngoại tệ] + 的 + 人民币.",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Tôi muốn đổi 500 tệ lấy đô la Mỹ.",
      "Tôi có năm trăm đô la Mỹ.",
      "Tỷ giá năm trăm đô la là bao nhiêu?"
    ],
    "wrongZh": [
      "我想有五百美元的人民币。",
      "换我想五百美元的人民币。",
      "我想换五百的人民币美元。"
    ]
  },
  {
    "id": "g_9_4",
    "lesson": 9,
    "hsk": 1,
    "zh": "请等一会儿，请数一数。",
    "py": "Qǐng děng yíhuìr, qǐng shǔ yi shǔ.",
    "vi": "Xin đợi một lát, xin hãy đếm lại.",
    "tokens": [
      "请",
      "等",
      "一会儿",
      "，",
      "请",
      "数一数",
      "。"
    ],
    "grammarNote": "Cấu trúc 等一会儿 (đợi một lát); Lặp lại động từ 数一数 (đếm thử xem).",
    "distractors": [
      "看"
    ],
    "wrongVi": [
      "Xin đợi một chút rồi đi.",
      "Xin mời kiểm tra lại tiền.",
      "Đợi một lát tôi quay lại."
    ],
    "wrongZh": [
      "请等一点儿，请数一数。",
      "请等等，请看看。",
      "等一会儿请，数一数请。"
    ]
  },
  {
    "id": "g_10_1",
    "lesson": 10,
    "hsk": 1,
    "zh": "王老师不在办公室，他在家呢。",
    "py": "Wáng lǎoshī bú zài bàngōngshì, tā zài jiā ne.",
    "vi": "Thầy Vương không ở văn phòng, thầy ở nhà.",
    "tokens": [
      "王老师",
      "不",
      "在",
      "办公室",
      "，",
      "他",
      "在",
      "家",
      "呢",
      "。"
    ],
    "grammarNote": "Giới từ 在 chỉ vị trí nơi chốn; Trợ từ 呢 ở cuối câu trần thuật biểu thị trạng thái.",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Thầy Vương đang ở văn phòng.",
      "Thầy Vương có ở nhà không?",
      "Thầy Vương đi về nhà rồi."
    ],
    "wrongZh": [
      "王老师没在办公室，他在家呢。",
      "王老师在办公室不，他在家呢。",
      "王老师在不在办公室，他在家。"
    ]
  },
  {
    "id": "g_10_2",
    "lesson": 10,
    "hsk": 1,
    "zh": "请问，他住几号楼几门？",
    "py": "Qǐngwèn, tā zhù jǐ hào lóu jǐ mén?",
    "vi": "Xin hỏi, thầy ấy sống ở tòa nhà số mấy, cửa số mấy?",
    "tokens": [
      "请问",
      "，",
      "他",
      "住",
      "几号楼",
      "几门",
      "？"
    ],
    "grammarNote": "Cách hỏi số nhà, số tầng: 住 + 几号楼 + 几门？",
    "distractors": [
      "哪"
    ],
    "wrongVi": [
      "Thầy ấy sống ở đâu?",
      "Văn phòng thầy ấy ở tầng mấy?",
      "Số điện thoại của thầy ấy là bao nhiêu?"
    ],
    "wrongZh": [
      "请问，他住在哪楼哪门？",
      "请问，他住多少号楼？",
      "他住几号楼几门请问？"
    ]
  },
  {
    "id": "g_10_3",
    "lesson": 10,
    "hsk": 1,
    "zh": "他住在十八楼七号。",
    "py": "Tā zhù zài shíbā lóu qī hào.",
    "vi": "Thầy ấy sống ở tầng 18 phòng số 7.",
    "tokens": [
      "他",
      "住",
      "在",
      "十八楼",
      "七号",
      "。"
    ],
    "grammarNote": "Cấu trúc 住 + 在 + [Địa chỉ chi tiết].",
    "distractors": [
      "是"
    ],
    "wrongVi": [
      "Thầy ấy sống ở tầng 7 phòng 18.",
      "Nhà thầy ấy có 18 người.",
      "Thầy ấy đang ở tầng 18."
    ],
    "wrongZh": [
      "他住在七楼十八号。",
      "他是十八楼七号住。",
      "他在十八楼七号住。"
    ]
  },
  {
    "id": "g_10_4",
    "lesson": 10,
    "hsk": 1,
    "zh": "你知道他的电话号码吗？",
    "py": "Nǐ zhīdào tā de diànhuà hàomǎ ma?",
    "vi": "Bạn có biết số điện thoại của thầy ấy không?",
    "tokens": [
      "你",
      "知道",
      "他",
      "的",
      "电话号码",
      "吗",
      "？"
    ],
    "grammarNote": "Động từ 知道 (biết) mang tân ngữ sở hữu 他的电话号码.",
    "distractors": [
      "认识"
    ],
    "wrongVi": [
      "Số điện thoại của bạn là bao nhiêu?",
      "Bạn có gọi điện cho thầy ấy không?",
      "Thầy ấy có điện thoại không?"
    ],
    "wrongZh": [
      "你认识他的电话号码吗？",
      "你知道他的电话号码呢？",
      "他的电话号码你知道吗？"
    ]
  },
  {
    "id": "g_11_1",
    "lesson": 11,
    "hsk": 1,
    "zh": "我们不都是中国留学生。",
    "py": "Wǒmen bù dōu shì Zhōngguó liúxuéshēng.",
    "vi": "Chúng tôi không phải tất cả đều là lưu học sinh Trung Quốc.",
    "tokens": [
      "我们",
      "不",
      "都",
      "是",
      "中国",
      "留学生",
      "。"
    ],
    "grammarNote": "Phủ định bộ phận: 不都 (không phải tất cả), khác với 都不 (hoàn toàn không).",
    "distractors": [
      "没"
    ],
    "wrongVi": [
      "Chúng tôi đều không phải lưu học sinh.",
      "Chúng tôi đều là lưu học sinh Trung Quốc.",
      "Tất cả chúng tôi đều học tiếng Trung."
    ],
    "wrongZh": [
      "我们都不是中国留学生。",
      "都不我们是中国留学生。",
      "我们是不都中国留学生。"
    ]
  },
  {
    "id": "g_11_2",
    "lesson": 11,
    "hsk": 1,
    "zh": "这位是王教授，那位是马校长。",
    "py": "Zhè wèi shì Wáng jiàoshòu, nà wèi shì Mǎ xiàozhǎng.",
    "vi": "Vị này là giáo sư Vương, vị kia là hiệu trưởng Mã.",
    "tokens": [
      "这",
      "位",
      "是",
      "王教授",
      "，",
      "那",
      "位",
      "是",
      "马校长",
      "。"
    ],
    "grammarNote": "Lượng từ tôn kính 位 (wèi) dùng cho người có địa vị.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Đây là thầy Vương, kia là thầy Mã.",
      "Giáo sư Vương là hiệu trưởng trường này.",
      "Hiệu trưởng Mã chào giáo sư Vương."
    ],
    "wrongZh": [
      "这个是王教授，那个是马校长。",
      "这位有王教授，那位有马校长。",
      "王教授是这位，马校长是那位。"
    ]
  },
  {
    "id": "g_11_3",
    "lesson": 11,
    "hsk": 1,
    "zh": "我和他一起去图书馆借书。",
    "py": "Wǒ hé tā yìqǐ qù túshūguǎn jiè shū.",
    "vi": "Tôi và cậu ấy cùng nhau đi thư viện mượn sách.",
    "tokens": [
      "我",
      "和",
      "他",
      "一起",
      "去",
      "图书馆",
      "借",
      "书",
      "。"
    ],
    "grammarNote": "Cấu trúc liên động: A 和/跟 B 一起 + Động từ.",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Tôi đi thư viện mượn sách cho cậu ấy.",
      "Cậu ấy mượn sách ở thư viện.",
      "Chúng tôi cùng nhau đọc sách ở nhà."
    ],
    "wrongZh": [
      "我和他去图书馆一起借书。",
      "我跟他一起在图书馆借书。",
      "一起我和他去图书馆借书。"
    ]
  },
  {
    "id": "g_11_4",
    "lesson": 11,
    "hsk": 1,
    "zh": "他们俩都是语言学院的新学生。",
    "py": "Tāmen liǎ dōu shì Yǔyán Xuéyuàn de xīn xuésheng.",
    "vi": "Hai người bọn họ đều là học sinh mới của Học viện Ngôn ngữ.",
    "tokens": [
      "他们俩",
      "都",
      "是",
      "语言学院",
      "的",
      "新学生",
      "。"
    ],
    "grammarNote": "Cụm 他们俩 (hai người bọn họ) + Phó từ 都 + 是.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Bọn họ là học sinh cũ của trường.",
      "Hai người bọn họ học tiếng Trung ở đâu?",
      "Tất cả học sinh mới đều đến rồi."
    ],
    "wrongZh": [
      "他们俩是在语言学院的新学生。",
      "他们俩都新学生是语言学院。",
      "语言学院的新学生是他们俩都。"
    ]
  },
  {
    "id": "g_12_1",
    "lesson": 12,
    "hsk": 1,
    "zh": "你在哪儿学习汉语？",
    "py": "Nǐ zài nǎr xuéxí Hànyǔ?",
    "vi": "Bạn học tiếng Hán ở đâu?",
    "tokens": [
      "你",
      "在",
      "哪儿",
      "学习",
      "汉语",
      "？"
    ],
    "grammarNote": "Trạng ngữ chỉ nơi chốn đứng trước động từ: 在哪儿 + 学习.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Bạn học tiếng Hán với ai?",
      "Bạn học tiếng Hán từ bao giờ?",
      "Tiếng Hán của bạn học thế nào?"
    ],
    "wrongZh": [
      "你学习汉语在哪儿？",
      "你去哪儿学习汉语？",
      "在哪儿你学习汉语？"
    ]
  },
  {
    "id": "g_12_2",
    "lesson": 12,
    "hsk": 1,
    "zh": "我在北京语言大学学习。",
    "py": "Wǒ zài Běijīng Yǔyán Dàxué xuéxí.",
    "vi": "Tôi học tập tại Đại học Ngôn ngữ Bắc Kinh.",
    "tokens": [
      "我",
      "在",
      "北京语言大学",
      "学习",
      "。"
    ],
    "grammarNote": "Cấu trúc: Chủ ngữ + 在 + [Địa điểm] + Động từ.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Tôi đi Đại học Ngôn ngữ Bắc Kinh.",
      "Đại học Ngôn ngữ Bắc Kinh ở đâu?",
      "Tôi thích học ở Bắc Kinh."
    ],
    "wrongZh": [
      "我学习在北京语言大学。",
      "我去北京语言大学学习。",
      "北京语言大学我在学习。"
    ]
  },
  {
    "id": "g_12_3",
    "lesson": 12,
    "hsk": 1,
    "zh": "你觉得汉语难不难？",
    "py": "Nǐ juéde Hànyǔ nán bu nán?",
    "vi": "Bạn cảm thấy tiếng Hán có khó không?",
    "tokens": [
      "你",
      "觉得",
      "汉语",
      "难",
      "不",
      "难",
      "？"
    ],
    "grammarNote": "Động từ 觉得 (cảm thấy) + Câu hỏi chính phản (难不难).",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Bạn thấy tiếng Hán thế nào?",
      "Bạn có thích học tiếng Hán không?",
      "Bạn học tiếng Hán được bao lâu rồi?"
    ],
    "wrongZh": [
      "你觉得汉语难不难吗？",
      "你觉得汉语难吗？",
      "汉语你觉得难不难？"
    ]
  },
  {
    "id": "g_12_4",
    "lesson": 12,
    "hsk": 1,
    "zh": "我觉得听和说比较容易。",
    "py": "Wǒ juéde tīng hé shuō bǐjiào róngyì.",
    "vi": "Tôi cảm thấy nghe và nói tương đối dễ.",
    "tokens": [
      "我",
      "觉得",
      "听",
      "和",
      "说",
      "比较",
      "容易",
      "。"
    ],
    "grammarNote": "Phó từ mức độ 比较 (tương đối, khá) đứng trước tính từ 容易.",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Tôi thấy đọc và viết rất khó.",
      "Tôi cảm thấy nghe nói không khó lắm.",
      "Tiếng Hán dễ hơn tiếng Anh."
    ],
    "wrongZh": [
      "我觉得听说都比较容易。",
      "听和说我觉得很比较容易。",
      "我觉得听和说更容易。"
    ]
  },
  {
    "id": "g_13_1",
    "lesson": 13,
    "hsk": 1,
    "zh": "这是不是中药？这是西药。",
    "py": "Zhè shì bu shì zhōngyào? Zhè shì xīyào.",
    "vi": "Đây có phải là thuốc bắc không? Đây là thuốc tây.",
    "tokens": [
      "这",
      "是",
      "不",
      "是",
      "中药",
      "？",
      "这",
      "是",
      "西药",
      "。"
    ],
    "grammarNote": "Câu hỏi chính phản với 是: 是不是 + Danh từ？",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Đây là thuốc gì?",
      "Thuốc này uống thế nào?",
      "Bạn có mang thuốc không?"
    ],
    "wrongZh": [
      "这是不是中药吗？这是西药。",
      "这是中药不是？这是西药。",
      "这是中药还是西药？"
    ]
  },
  {
    "id": "g_13_2",
    "lesson": 13,
    "hsk": 1,
    "zh": "这个箱子里边没有违禁品。",
    "py": "Zhè ge xiāngzi lǐbiān méiyǒu wéijìnpǐn.",
    "vi": "Bên trong chiếc vali này không có đồ cấm.",
    "tokens": [
      "这个",
      "箱子",
      "里边",
      "没有",
      "违禁品",
      "。"
    ],
    "grammarNote": "Phủ định của 有 (sở hữu / tồn hiện) bắt buộc dùng 没有, không dùng 不有.",
    "distractors": [
      "不有"
    ],
    "wrongVi": [
      "Chiếc vali này là của ai?",
      "Trong vali có rất nhiều đồ dùng.",
      "Chiếc vali này rất nặng."
    ],
    "wrongZh": [
      "这个箱子里边不有违禁品。",
      "这个箱子里边没违禁品有。",
      "箱子这个里边没有违禁品。"
    ]
  },
  {
    "id": "g_13_3",
    "lesson": 13,
    "hsk": 1,
    "zh": "这里边都是我买的日用品。",
    "py": "Zhè lǐbiān dōu shì wǒ mǎi de rìyòngpǐn.",
    "vi": "Bên trong này đều là đồ dùng hàng ngày tôi mua.",
    "tokens": [
      "这",
      "里边",
      "都",
      "是",
      "我",
      "买",
      "的",
      "日用品",
      "。"
    ],
    "grammarNote": "Cụm danh từ chữ 的: [Mệnh đề định ngữ: 我买] + 的 + [Trung tâm ngữ: 日用品].",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Đồ dùng hàng ngày tôi mua ở đâu?",
      "Trong vali có đồ dùng hàng ngày không?",
      "Tôi mua rất nhiều đồ dùng ở siêu thị."
    ],
    "wrongZh": [
      "这里边都是我买日用品。",
      "这里边有我买的日用品。",
      "我买的日用品这里边都是。"
    ]
  },
  {
    "id": "g_13_4",
    "lesson": 13,
    "hsk": 1,
    "zh": "我还有两瓶药和一把雨伞。",
    "py": "Wǒ hái yǒu liǎng píng yào hé yì bǎ yǔsǎn.",
    "vi": "Tôi còn có hai lọ thuốc và một chiếc ô.",
    "tokens": [
      "我",
      "还",
      "有",
      "两瓶",
      "药",
      "和",
      "一把",
      "雨伞",
      "。"
    ],
    "grammarNote": "Phó từ 还 (vẫn còn); Lượng từ 瓶 (bình/lọ) và 把 (cái/chiếc ô).",
    "distractors": [
      "二瓶"
    ],
    "wrongVi": [
      "Tôi có một chiếc ô và một lọ thuốc.",
      "Chiếc ô này là của bạn à?",
      "Bạn mua thuốc ở hiệu thuốc nào?"
    ],
    "wrongZh": [
      "我还由二瓶药和一把雨伞。",
      "我有两瓶药和一件雨伞。",
      "两瓶药和一把雨伞我还由。"
    ]
  },
  {
    "id": "g_14_1",
    "lesson": 14,
    "hsk": 1,
    "zh": "你的自行车是新的还是旧的？",
    "py": "Nǐ de zìxíngchē shì xīn de háishì jiù de?",
    "vi": "Xe đạp của bạn là xe mới hay xe cũ?",
    "tokens": [
      "你",
      "的",
      "自行车",
      "是",
      "新",
      "的",
      "还是",
      "旧",
      "的",
      "？"
    ],
    "grammarNote": "Câu hỏi lựa chọn với 还是: A 还是 B？ Cụm chữ 的 thay thế danh từ.",
    "distractors": [
      "或者"
    ],
    "wrongVi": [
      "Xe đạp của bạn màu gì?",
      "Bạn mua xe đạp ở đâu?",
      "Xe đạp mới này bao nhiêu tiền?"
    ],
    "wrongZh": [
      "你的自行车是新的或者旧的？",
      "你的车是新还是旧？",
      "自行车是你的新的还是旧的？"
    ]
  },
  {
    "id": "g_14_2",
    "lesson": 14,
    "hsk": 1,
    "zh": "那辆蓝色的自行车是我的。",
    "py": "Nà liàng lánsè de zìxíngchē shì wǒ de.",
    "vi": "Chiếc xe đạp màu xanh lam kia là của tôi.",
    "tokens": [
      "那",
      "辆",
      "蓝色",
      "的",
      "自行车",
      "是",
      "我",
      "的",
      "。"
    ],
    "grammarNote": "Lượng từ 辆 (chiếc/xe); Cụm chữ 的 chỉ sở hữu 我的 = 我的自行车.",
    "distractors": [
      "本"
    ],
    "wrongVi": [
      "Chiếc xe đạp màu đỏ này là của bạn à?",
      "Xe đạp của tôi là xe mới.",
      "Bạn thích xe đạp màu gì?"
    ],
    "wrongZh": [
      "那个蓝色的自行车是我的。",
      "那辆蓝色的自行车有我的。",
      "我的自行车是那辆蓝色的。"
    ]
  },
  {
    "id": "g_14_3",
    "lesson": 14,
    "hsk": 1,
    "zh": "今天你喝咖啡还是喝茶？",
    "py": "Jīntiān nǐ hē kāfēi háishì hē chá?",
    "vi": "Hôm nay bạn uống cà phê hay uống trà?",
    "tokens": [
      "今天",
      "你",
      "喝",
      "咖啡",
      "还是",
      "喝",
      "茶",
      "？"
    ],
    "grammarNote": "Câu hỏi lựa chọn hành động: V1 + Tân ngữ 1 + 还是 + V2 + Tân ngữ 2？",
    "distractors": [
      "或者"
    ],
    "wrongVi": [
      "Hôm nay bạn uống cà phê không?",
      "Bạn thích uống trà hơn hay cà phê hơn?",
      "Chúng ta cùng đi uống cà phê nhé."
    ],
    "wrongZh": [
      "今天你喝咖啡或者喝茶？",
      "你今天喝咖啡是喝茶？",
      "喝咖啡还是喝茶今天你？"
    ]
  },
  {
    "id": "g_14_4",
    "lesson": 14,
    "hsk": 1,
    "zh": "我买了一件红色的羽绒服。",
    "py": "Wǒ mǎi le yí jiàn hóngsè de yǔróngfú.",
    "vi": "Tôi đã mua một chiếc áo lông vũ màu đỏ.",
    "tokens": [
      "我",
      "买",
      "了",
      "一件",
      "红色",
      "的",
      "羽绒服",
      "。"
    ],
    "grammarNote": "Trợ từ động thái 了 biểu thị hành động đã hoàn thành; Lượng từ 件.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Chiếc áo lông vũ màu đỏ này rất đẹp.",
      "Tôi muốn mua áo lông vũ màu đen.",
      "Bạn mua chiếc áo này bao nhiêu tiền?"
    ],
    "wrongZh": [
      "我买一件红色的羽绒服了。",
      "我买了一个红色的羽绒服。",
      "一件红色的羽绒服我买了。"
    ]
  },
  {
    "id": "g_15_1",
    "lesson": 15,
    "hsk": 1,
    "zh": "你家有几口人？我家有四口人。",
    "py": "Nǐ jiā yǒu jǐ kǒu rén? Wǒ jiā yǒu sì kǒu rén.",
    "vi": "Nhà bạn có mấy người? Nhà tôi có 4 người.",
    "tokens": [
      "你",
      "家",
      "有",
      "几口",
      "人",
      "？",
      "我",
      "家",
      "有",
      "四口",
      "人",
      "。"
    ],
    "grammarNote": "Lượng từ 口 dùng cho nhân khẩu gia đình: 几口人.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Gia đình bạn sống ở đâu?",
      "Gia đình bạn có những ai?",
      "Nhà bạn có anh chị em không?"
    ],
    "wrongZh": [
      "你家有几个口人？我家有四个人。",
      "你家几人有？我家有四人。",
      "家你有几口人？我家有四口人。"
    ]
  },
  {
    "id": "g_15_2",
    "lesson": 15,
    "hsk": 1,
    "zh": "全班一共有二十个学生。",
    "py": "Quán bān yígòng yǒu èrshí ge xuésheng.",
    "vi": "Cả lớp tổng cộng có 20 học sinh.",
    "tokens": [
      "全班",
      "一共",
      "有",
      "二十个",
      "学生",
      "。"
    ],
    "grammarNote": "Cấu trúc 全 + Danh từ (toàn bộ, cả); Phó từ 一共.",
    "distractors": [
      "都"
    ],
    "wrongVi": [
      "Cả lớp đều là học sinh chăm chỉ.",
      "Lớp bạn có bao nhiêu học sinh nam?",
      "Học sinh trong lớp đều là người Việt Nam."
    ],
    "wrongZh": [
      "全班都由二十个学生。",
      "一共全班有二十个学生。",
      "二十个学生全班一共有。"
    ]
  },
  {
    "id": "g_15_3",
    "lesson": 15,
    "hsk": 1,
    "zh": "你有兄弟姐妹吗？我没有。",
    "py": "Nǐ yǒu xiōngdì jiěmèi ma? Wǒ méiyǒu.",
    "vi": "Bạn có anh chị em không? Tôi không có.",
    "tokens": [
      "你",
      "有",
      "兄弟姐妹",
      "吗",
      "？",
      "我",
      "没有",
      "。"
    ],
    "grammarNote": "Phủ định của động từ 有 là 没有 (không được dùng 不有).",
    "distractors": [
      "不有"
    ],
    "wrongVi": [
      "Gia đình bạn có mấy anh chị em?",
      "Anh trai bạn làm nghề gì?",
      "Tôi có hai người chị gái."
    ],
    "wrongZh": [
      "你有兄弟姐妹吗？我不有。",
      "你有兄弟姐妹不？我没有。",
      "兄弟姐妹你有吗？我没有。"
    ]
  },
  {
    "id": "g_15_4",
    "lesson": 15,
    "hsk": 1,
    "zh": "这是我们全家的照片。",
    "py": "Zhè shì wǒmen quán jiā de zhàopiàn.",
    "vi": "Đây là bức ảnh chụp cả gia đình chúng tôi.",
    "tokens": [
      "这",
      "是",
      "我们",
      "全家",
      "的",
      "照片",
      "。"
    ],
    "grammarNote": "Cụm danh từ: 全家 (cả nhà) + 的 + 照片 (bức ảnh).",
    "distractors": [
      "那"
    ],
    "wrongVi": [
      "Bức ảnh này chụp ở đâu?",
      "Gia đình bạn chụp ảnh khi nào?",
      "Trong ảnh có những ai?"
    ],
    "wrongZh": [
      "那是我们全家的照片。",
      "这是我们全家照片的。",
      "我们全家的照片是这。"
    ]
  },
  {
    "id": "g_16_1",
    "lesson": 16,
    "hsk": 2,
    "zh": "我常常在宿舍复习生词。",
    "py": "Wǒ chángcháng zài sùshè fùxí shēngcí.",
    "vi": "Tôi thường ôn tập từ mới ở ký túc xá.",
    "tokens": [
      "我",
      "常常",
      "在",
      "宿舍",
      "复习",
      "生词",
      "。"
    ],
    "grammarNote": "Phó từ chỉ tần suất 常常 đứng trước vị ngữ / trạng ngữ nơi chốn.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Tôi thường đi thư viện đọc sách.",
      "Ký túc xá của tôi rất yên tĩnh.",
      "Bạn có hay ôn bài ở ký túc xá không?"
    ],
    "wrongZh": [
      "我在宿舍常常复习生词。",
      "我常在宿舍常常复习生词。",
      "常常我复习生词在宿舍。"
    ]
  },
  {
    "id": "g_16_2",
    "lesson": 16,
    "hsk": 2,
    "zh": "有时候去，有时候不去。",
    "py": "Yǒushíhou qù, yǒushíhou bú qù.",
    "vi": "Có lúc thì đi, có lúc không đi.",
    "tokens": [
      "有时候",
      "去",
      "，",
      "有时候",
      "不",
      "去",
      "。"
    ],
    "grammarNote": "Cấu trúc 有时候... 有时候... biểu thị sự xen kẽ.",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Tôi thường xuyên đi vào buổi tối.",
      "Thỉnh thoảng tôi mới đi thư viện.",
      "Lúc nào bạn cũng đi à?"
    ],
    "wrongZh": [
      "有的去，有的时候不去。",
      "有时候去，很时候不去。",
      "去有时候，不去有时候。"
    ]
  },
  {
    "id": "g_16_3",
    "lesson": 16,
    "hsk": 2,
    "zh": "星期六我们一起去公园玩儿吧。",
    "py": "Xīngqīliù wǒmen yìqǐ qù gōngyuán wánr ba.",
    "vi": "Thứ bảy chúng mình cùng đi công viên chơi nhé.",
    "tokens": [
      "星期六",
      "我们",
      "一起",
      "去",
      "公园",
      "玩儿",
      "吧",
      "。"
    ],
    "grammarNote": "Thời gian + Chủ ngữ + 一起 + Động từ + 吧.",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Chủ nhật bạn có đi công viên không?",
      "Công viên này rất đẹp và rộng.",
      "Chúng mình đi công viên bằng xe bus nhé."
    ],
    "wrongZh": [
      "星期六我们一起在公园玩儿吧。",
      "我们星期六去公园一起玩儿吧。",
      "星期六一起我们去公园玩儿吧。"
    ]
  },
  {
    "id": "g_16_4",
    "lesson": 16,
    "hsk": 2,
    "zh": "晚上我一般上网跟朋友聊天儿。",
    "py": "Wǎnshang wǒ yìbān shàngwǎng gēn péngyou liáotiānr.",
    "vi": "Buổi tối tôi thường lên mạng nói chuyện với bạn bè.",
    "tokens": [
      "晚上",
      "我",
      "一般",
      "上网",
      "跟",
      "朋友",
      "聊天儿",
      "。"
    ],
    "grammarNote": "Phó từ 一般 (thường thường, nhìn chung); Giới từ 跟 (cùng với ai).",
    "distractors": [
      "和"
    ],
    "wrongVi": [
      "Buổi tối tôi lên mạng nghe nhạc.",
      "Bạn hay nói chuyện với ai?",
      "Tôi không hay lên mạng vào ban đêm."
    ],
    "wrongZh": [
      "晚上我一般跟朋友上网聊天儿。",
      "我一般晚上上网跟朋友聊天儿。",
      "晚上我一般上网和朋友说。"
    ]
  },
  {
    "id": "g_17_1",
    "lesson": 17,
    "hsk": 2,
    "zh": "他在做什么呢？他正在听音乐呢。",
    "py": "Tā zài zuò shénme ne? Tā zhèngzài tīng yīnyuè ne.",
    "vi": "Cậu ấy đang làm gì thế? Cậu ấy đang nghe nhạc.",
    "tokens": [
      "他",
      "在",
      "做",
      "什么",
      "呢",
      "？",
      "他",
      "正在",
      "听",
      "音乐",
      "呢",
      "。"
    ],
    "grammarNote": "Hành động đang tiếp diễn: 正在 / 在 + Động từ + 呢.",
    "distractors": [
      "了"
    ],
    "wrongVi": [
      "Cậu ấy nghe nhạc xong chưa?",
      "Cậu ấy thích nghe loại nhạc gì?",
      "Bây giờ bạn đang làm gì thế?"
    ],
    "wrongZh": [
      "他在做什么呢？他听了音乐呢。",
      "他在做呢什么？他正在听音乐。",
      "正在他听音乐呢。"
    ]
  },
  {
    "id": "g_17_2",
    "lesson": 17,
    "hsk": 2,
    "zh": "外面正下着雨呢。",
    "py": "Wàimiàn zhèng xià zhe yǔ ne.",
    "vi": "Bên ngoài trời đang mưa đấy.",
    "tokens": [
      "外面",
      "正",
      "下",
      "着",
      "雨",
      "呢",
      "。"
    ],
    "grammarNote": "Cấu trúc biểu thị trạng thái đang tiếp diễn: 正 + V + 着 + Tân ngữ + 呢.",
    "distractors": [
      "了"
    ],
    "wrongVi": [
      "Bên ngoài trời đã tạnh mưa rồi.",
      "Trời sắp đổ mưa to rồi.",
      "Hôm nay trời có mưa không?"
    ],
    "wrongZh": [
      "外面正下了雨呢。",
      "外面下雨正着呢。",
      "正外面下着雨呢。"
    ]
  },
  {
    "id": "g_17_3",
    "lesson": 17,
    "hsk": 2,
    "zh": "玛丽正在宿舍写汉字作业呢。",
    "py": "Mǎlì zhèngzài sùshè xiě hànzì zuòyè ne.",
    "vi": "Mary đang ở ký túc xá viết bài tập chữ Hán.",
    "tokens": [
      "玛丽",
      "正在",
      "宿舍",
      "写",
      "汉字",
      "作业",
      "呢",
      "。"
    ],
    "grammarNote": "Chủ ngữ + 正在 + [Nơi chốn] + Động từ + Tân ngữ + 呢.",
    "distractors": [
      "看"
    ],
    "wrongVi": [
      "Mary đã làm xong bài tập chưa?",
      "Mary đang đọc sách ở thư viện.",
      "Bài tập chữ Hán hôm nay rất khó."
    ],
    "wrongZh": [
      "玛丽在宿舍正写汉字作业呢。",
      "玛丽正在宿舍写了汉字作业。",
      "正在玛丽在宿舍写汉字作业呢。"
    ]
  },
  {
    "id": "g_17_4",
    "lesson": 17,
    "hsk": 2,
    "zh": "你找他有什么事吗？",
    "py": "Nǐ zhǎo tā yǒu shénme shì ma?",
    "vi": "Bạn tìm cậu ấy có việc gì không?",
    "tokens": [
      "你",
      "找",
      "他",
      "有",
      "什么",
      "事",
      "吗",
      "？"
    ],
    "grammarNote": "Câu liên động biểu thị mục đích: 找他 + 有什么事.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Bạn có việc gì cần tôi giúp không?",
      "Cậu ấy có ở phòng không?",
      "Khi nào cậu ấy quay lại?"
    ],
    "wrongZh": [
      "你找他做什么事吗？",
      "你找他在有什么事吗？",
      "有什么事你找他吗？"
    ]
  },
  {
    "id": "g_18_1",
    "lesson": 18,
    "hsk": 2,
    "zh": "我去邮局顺便买几张邮票。",
    "py": "Wǒ qù yóujú shùnbiàn mǎi jǐ zhāng yóupiào.",
    "vi": "Tôi đi bưu điện tiện thể mua mấy con tem.",
    "tokens": [
      "我",
      "去",
      "邮局",
      "顺便",
      "买",
      "几张",
      "邮票",
      "。"
    ],
    "grammarNote": "Phó từ 顺便 (tiện thể, nhân tiện) đứng trước động từ thứ hai.",
    "distractors": [
      "就"
    ],
    "wrongVi": [
      "Tôi đi bưu điện gửi bưu phẩm.",
      "Bưu điện có bán tem không?",
      "Bạn mua giúp tôi mấy con tem nhé."
    ],
    "wrongZh": [
      "我去邮局买顺便几张邮票。",
      "我顺便去邮局买几张邮票。",
      "去邮局我顺便买几张邮票。"
    ]
  },
  {
    "id": "g_18_2",
    "lesson": 18,
    "hsk": 2,
    "zh": "麻烦你帮我寄一封信。",
    "py": "Máfan nǐ bāng wǒ jì yì fēng xìn.",
    "vi": "Làm phiền bạn gửi giúp tôi một bức thư.",
    "tokens": [
      "麻烦",
      "你",
      "帮",
      "我",
      "寄",
      "一封",
      "信",
      "。"
    ],
    "grammarNote": "Cấu trúc nhờ vả lịch sự: 麻烦你 + 帮我 + Động từ; Lượng từ 封 (bức thư).",
    "distractors": [
      "请"
    ],
    "wrongVi": [
      "Bạn gửi thư cho ai thế?",
      "Lá thư này gửi đi đâu?",
      "Cảm ơn bạn đã giúp tôi gửi thư."
    ],
    "wrongZh": [
      "麻烦你请我寄一封信。",
      "请你帮我麻烦寄一封信。",
      "帮我麻烦你寄一封信。"
    ]
  },
  {
    "id": "g_18_3",
    "lesson": 18,
    "hsk": 2,
    "zh": "明天咱们一起去外文书店吧。",
    "py": "Míngtiān zánmen yìqǐ qù wàiwén shūdiàn ba.",
    "vi": "Ngày mai chúng mình cùng đi hiệu sách ngoại văn nhé.",
    "tokens": [
      "明天",
      "咱们",
      "一起",
      "去",
      "外文书店",
      "吧",
      "。"
    ],
    "grammarNote": "Đại từ 咱们 (chúng ta / bao gồm cả người nghe); 一起 + Động từ.",
    "distractors": [
      "我们"
    ],
    "wrongVi": [
      "Hiệu sách ngoại văn ở đâu?",
      "Bạn muốn mua sách gì ở hiệu sách?",
      "Hôm nay tôi bận, mai đi nhé."
    ],
    "wrongZh": [
      "明天我们一起在外文书店吧。",
      "咱们明天一起去外文书店吧。",
      "明天咱们去外文书店一起吧。"
    ]
  },
  {
    "id": "g_18_4",
    "lesson": 18,
    "hsk": 2,
    "zh": "这个包裹寄到美国要多少钱？",
    "py": "Zhè ge bāoguǒ jì dào Měiguó yào duōshao qián?",
    "vi": "Bưu phẩm này gửi đến Mỹ hết bao nhiêu tiền?",
    "tokens": [
      "这个",
      "包裹",
      "寄到",
      "美国",
      "要",
      "多少",
      "钱",
      "？"
    ],
    "grammarNote": "Động từ kết hợp giới từ 寄到 (gửi đến) + Địa điểm.",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Bưu phẩm này gửi bằng đường hàng không à?",
      "Mất bao lâu bưu phẩm mới tới Mỹ?",
      "Bạn gửi bưu phẩm cho ai ở Mỹ?"
    ],
    "wrongZh": [
      "这个包裹寄在美国要多少钱？",
      "这个包裹要寄到美国多少钱？",
      "寄到美国这个包裹要多少钱？"
    ]
  },
  {
    "id": "g_19_1",
    "lesson": 19,
    "hsk": 2,
    "zh": "这件羽绒服我可以试试吗？",
    "py": "Zhè jiàn yǔróngfú wǒ kěyǐ shìshi ma?",
    "vi": "Chiếc áo lông vũ này tôi có thể thử một chút không?",
    "tokens": [
      "这件",
      "羽绒服",
      "我",
      "可以",
      "试试",
      "吗",
      "？"
    ],
    "grammarNote": "Động từ năng nguyện 可以 (có thể); Lặp lại động từ 试试 (thử một chút).",
    "distractors": [
      "能"
    ],
    "wrongVi": [
      "Chiếc áo này có cỡ lớn hơn không?",
      "Chiếc áo này giá bao nhiêu tiền?",
      "Tôi không thích màu áo này."
    ],
    "wrongZh": [
      "这件羽绒服我能试试吗？",
      "这件羽绒服我可以试一试吗？",
      "我可以试试这件羽绒服吗？"
    ]
  },
  {
    "id": "g_19_2",
    "lesson": 19,
    "hsk": 2,
    "zh": "这件衣服有一点儿长，不太合适。",
    "py": "Zhè jiàn yīfu yǒuyìdiǎnr cháng, bú tài héshì.",
    "vi": "Chiếc áo này hơi dài một chút, không vừa lắm.",
    "tokens": [
      "这件",
      "衣服",
      "有一点儿",
      "长",
      "，",
      "不太",
      "合适",
      "。"
    ],
    "grammarNote": "Phó từ 有一点儿 (yǒuyìdiǎnr) đứng trước tính từ biểu thị ý không hài lòng.",
    "distractors": [
      "一点儿"
    ],
    "wrongVi": [
      "Chiếc áo này rất vừa và đẹp.",
      "Chiếc áo này có màu khác không?",
      "Bạn mặc chiếc áo này rất hợp."
    ],
    "wrongZh": [
      "这件衣服一点儿长，不太合适。",
      "这件衣服长有一点儿，不太合适。",
      "这件衣服有点长，不太合适。"
    ]
  },
  {
    "id": "g_19_3",
    "lesson": 19,
    "hsk": 2,
    "zh": "肥瘦正合适，颜色也很好看。",
    "py": "Féishòu zhèng héshì, yánsè yě hěn hǎokàn.",
    "vi": "Rộng chật vừa vặn, màu sắc cũng rất đẹp.",
    "tokens": [
      "肥瘦",
      "正",
      "合适",
      "，",
      "颜色",
      "也",
      "很",
      "好看",
      "。"
    ],
    "grammarNote": "Từ ghép 肥瘦 (độ rộng chật); Phó từ 正 (vừa đúng lúc/mức).",
    "distractors": [
      "太"
    ],
    "wrongVi": [
      "Chiếc áo này hơi chật một chút.",
      "Bạn có thích màu này không?",
      "Màu này không hợp với bạn lắm."
    ],
    "wrongZh": [
      "肥瘦太合适，颜色也很好看。",
      "肥瘦正合适，颜色太好看。",
      "正合适肥瘦，颜色也很好看。"
    ]
  },
  {
    "id": "g_19_4",
    "lesson": 19,
    "hsk": 2,
    "zh": "太贵了，便宜一点儿我就买。",
    "py": "Tài guì le, piányi yìdiǎnr wǒ jiù mǎi.",
    "vi": "Đắt quá, rẻ hơn một chút là tôi mua ngay.",
    "tokens": [
      "太",
      "贵",
      "了",
      "，",
      "便宜",
      "一点儿",
      "我",
      "就",
      "买",
      "。"
    ],
    "grammarNote": "Tính từ + 一点儿; Phó từ 就 biểu thị điều kiện dẫn đến hành động ngay.",
    "distractors": [
      "有一点儿"
    ],
    "wrongVi": [
      "Rẻ quá rồi, tôi mua hai chiếc.",
      "Nếu đắt quá thì tôi không mua đâu.",
      "Cửa hàng này bán đồ rất rẻ."
    ],
    "wrongZh": [
      "太贵了，便宜有一点儿我就买。",
      "有点贵了，便宜一点儿我就买。",
      "太贵了，便宜一点儿我才买。"
    ]
  },
  {
    "id": "g_20_1",
    "lesson": 20,
    "hsk": 2,
    "zh": "今天是我朋友二十岁的生日。",
    "py": "Jīntiān shì wǒ péngyou èrshí suì de shēngrì.",
    "vi": "Hôm nay là sinh nhật tuổi 20 của bạn tôi.",
    "tokens": [
      "今天",
      "是",
      "我",
      "朋友",
      "二十岁",
      "的",
      "生日",
      "。"
    ],
    "grammarNote": "Cách nói tuổi: Số từ + 岁; Cụm định ngữ chỉ sở hữu với 的.",
    "distractors": [
      "年"
    ],
    "wrongVi": [
      "Hôm nay là sinh nhật của ai?",
      "Bạn tổ chức sinh nhật ở đâu?",
      "Chúc bạn sinh nhật vui vẻ!"
    ],
    "wrongZh": [
      "今天是我的朋友二十年的生日。",
      "今天我朋友二十岁的生日是。",
      "我朋友二十岁的生日是今天。"
    ]
  },
  {
    "id": "g_20_2",
    "lesson": 20,
    "hsk": 2,
    "zh": "祝你生日快乐，学习进步！",
    "py": "Zhù nǐ shēngrì kuàilè, xuéxí jìnbù!",
    "vi": "Chúc bạn sinh nhật vui vẻ, học tập tiến bộ!",
    "tokens": [
      "祝",
      "你",
      "生日快乐",
      "，",
      "学习",
      "进步",
      "！"
    ],
    "grammarNote": "Câu chúc tụng: 祝你 + [Lời chúc tốt đẹp].",
    "distractors": [
      "请"
    ],
    "wrongVi": [
      "Chúc mừng năm mới, vạn sự như ý!",
      "Cảm ơn bạn đã đến dự sinh nhật.",
      "Hôm nay bạn nhận được nhiều quà không?"
    ],
    "wrongZh": [
      "请你生日快乐，学习进步！",
      "祝你快乐生日，进步学习！",
      "生日快乐祝你，学习进步！"
    ]
  },
  {
    "id": "g_20_3",
    "lesson": 20,
    "hsk": 2,
    "zh": "我们打算晚上开一个生日晚会。",
    "py": "Wǒmen dǎsuàn wǎnshang kāi yí ge shēngrì wǎnhuì.",
    "vi": "Chúng tôi dự định tối nay tổ chức một buổi tiệc sinh nhật.",
    "tokens": [
      "我们",
      "打算",
      "晚上",
      "开",
      "一个",
      "生日晚会",
      "。"
    ],
    "grammarNote": "Động từ 打算 (dự định, lên kế hoạch) + Động từ 开 (tổ chức).",
    "distractors": [
      "想"
    ],
    "wrongVi": [
      "Buổi tiệc sinh nhật diễn ra ở đâu?",
      "Bạn có mời nhiều bạn bè không?",
      "Tối nay chúng mình đi ăn nhà hàng nhé."
    ],
    "wrongZh": [
      "我们想晚上开一个生日晚会。",
      "晚上我们打算开一个生日晚会。",
      "我们打算开一个生日晚会晚上。"
    ]
  },
  {
    "id": "g_20_4",
    "lesson": 20,
    "hsk": 2,
    "zh": "我送给你一个漂亮的生日蛋糕。",
    "py": "Wǒ sòng gěi nǐ yí ge piàoliang de shēngrì dàngāo.",
    "vi": "Tôi tặng cho bạn một chiếc bánh sinh nhật thật đẹp.",
    "tokens": [
      "我",
      "送给",
      "你",
      "一个",
      "漂亮",
      "的",
      "生日蛋糕",
      "。"
    ],
    "grammarNote": "Động từ mang 2 tân ngữ (Tân ngữ gián tiếp + Tân ngữ trực tiếp): 送给 + 你 + 一个蛋糕.",
    "distractors": [
      "买"
    ],
    "wrongVi": [
      "Bánh sinh nhật này ngon lắm.",
      "Ai mua chiếc bánh sinh nhật này?",
      "Tôi nhận được rất nhiều quà sinh nhật."
    ],
    "wrongZh": [
      "我买给你一个漂亮的生日蛋糕。",
      "我送你一个漂亮的生日蛋糕给。",
      "一个漂亮的生日蛋糕我送给你。"
    ]
  },
  {
    "id": "g_21_1",
    "lesson": 21,
    "hsk": 2,
    "zh": "现在几点？现在差一刻八点。",
    "py": "Xiànzài jǐ diǎn? Xiànzài chà yí kè bā diǎn.",
    "vi": "Bây giờ là mấy giờ? Bây giờ là 8 giờ kém 15 phút.",
    "tokens": [
      "现在",
      "几点",
      "？",
      "现在",
      "差一刻",
      "八点",
      "。"
    ],
    "grammarNote": "Cách nói giờ kém: 差 + Số phút/Số khắc + Giờ (差一刻八点).",
    "distractors": [
      "多少"
    ],
    "wrongVi": [
      "Bây giờ là mấy giờ rồi?",
      "Mấy giờ chúng ta xuất phát?",
      "Đồng hồ của bạn chạy nhanh hay chậm?"
    ],
    "wrongZh": [
      "现在多少点？现在差一刻八点。",
      "现在几点？现在八点差一刻。",
      "几点现在？现在差一刻八点。"
    ]
  },
  {
    "id": "g_21_2",
    "lesson": 21,
    "hsk": 2,
    "zh": "我们明天早上七点一刻在校门口集合。",
    "py": "Wǒmen míngtiān zǎoshang qī diǎn yí kè zài xiàoménkǒu jíhé.",
    "vi": "Sáng mai 7 giờ 15 chúng mình tập trung ở cổng trường.",
    "tokens": [
      "我们",
      "明天早上",
      "七点一刻",
      "在",
      "校门口",
      "集合",
      "。"
    ],
    "grammarNote": "Trật tự thời gian từ lớn đến nhỏ (明天 -> 早上 -> 七点一刻); Trạng ngữ nơi chốn đứng trước động từ.",
    "distractors": [
      "去"
    ],
    "wrongVi": [
      "Mấy giờ bạn đến cổng trường?",
      "Chúng ta tập trung ở đâu?",
      "Ngày mai ai đi cùng chúng mình?"
    ],
    "wrongZh": [
      "我们明天早上七点一刻去校门口集合。",
      "明天早上七点一刻我们在校门口集合。",
      "我们在校门口集合明天早上七点一刻。"
    ]
  },
  {
    "id": "g_21_3",
    "lesson": 21,
    "hsk": 2,
    "zh": "爬山的时候大家一定要注意安全。",
    "py": "Páshān de shíhou dàjiā yídìng yào zhùyì ānquán.",
    "vi": "Lúc leo núi mọi người nhất định phải chú ý an toàn.",
    "tokens": [
      "爬山",
      "的",
      "时候",
      "大家",
      "一定",
      "要",
      "注意",
      "安全",
      "。"
    ],
    "grammarNote": "Cấu trúc thời gian: [Hành động] + 的时候 (Khi, lúc làm gì).",
    "distractors": [
      "了"
    ],
    "wrongVi": [
      "Hôm nay chúng mình đi leo núi rất vui.",
      "Núi này cao bao nhiêu mét?",
      "Khi leo núi nhớ mang theo nước uống."
    ],
    "wrongZh": [
      "爬山的时候大家一定要安全注意。",
      "大家爬山的时候一定要注意安全。",
      "爬山了时候大家一定要注意安全。"
    ]
  },
  {
    "id": "g_21_4",
    "lesson": 21,
    "hsk": 2,
    "zh": "回来的路上我们常常聊天儿。",
    "py": "Huílái de lùshang wǒmen chángcháng liáotiānr.",
    "vi": "Trên đường trở về chúng tôi thường trò chuyện vui vẻ.",
    "tokens": [
      "回来",
      "的",
      "路上",
      "我们",
      "常常",
      "聊天儿",
      "。"
    ],
    "grammarNote": "Cụm danh từ chỉ nơi chốn/hoàn cảnh: 在...的路上 (Trên đường...).",
    "distractors": [
      "中"
    ],
    "wrongVi": [
      "Mấy giờ các bạn về đến trường?",
      "Chuyến đi hôm nay thế nào?",
      "Trên đường về xe có đông không?"
    ],
    "wrongZh": [
      "回来的路上我们常聊天儿。",
      "我们在回来的路上常常聊天儿。",
      "回来的路上我们聊天儿常常。"
    ]
  },
  {
    "id": "g_22_1",
    "lesson": 22,
    "hsk": 2,
    "zh": "我打算请老师教我唱京剧。",
    "py": "Wǒ dǎsuàn qǐng lǎoshī jiāo wǒ chàng jīngjù.",
    "vi": "Tôi dự định nhờ thầy giáo dạy tôi hát Kinh kịch.",
    "tokens": [
      "我",
      "打算",
      "请",
      "老师",
      "教",
      "我",
      "唱",
      "京剧",
      "。"
    ],
    "grammarNote": "Câu kiêm ngữ: Tân ngữ của động từ thứ nhất (老师) là chủ ngữ của động từ thứ hai (教).",
    "distractors": [
      "让"
    ],
    "wrongVi": [
      "Thầy giáo có dạy Kinh kịch không?",
      "Bạn học Kinh kịch được bao lâu rồi?",
      "Tôi rất thích xem Kinh kịch."
    ],
    "wrongZh": [
      "我打算让老师教我唱京剧。",
      "老师请我打算教我唱京剧。",
      "我打算请老师教我唱京剧吗。"
    ]
  },
  {
    "id": "g_22_2",
    "lesson": 22,
    "hsk": 2,
    "zh": "老师让我明天下午去他办公室。",
    "py": "Lǎoshī ràng wǒ míngtiān xiàwǔ qù tā bàngōngshì.",
    "vi": "Thầy giáo bảo tôi chiều mai đến văn phòng của thầy.",
    "tokens": [
      "老师",
      "让",
      "我",
      "明天下午",
      "去",
      "他",
      "办公室",
      "。"
    ],
    "grammarNote": "Câu kiêm ngữ với động từ cầu khiến 让 (ràng - bảo, cho phép).",
    "distractors": [
      "叫"
    ],
    "wrongVi": [
      "Thầy giáo tìm bạn có việc gì không?",
      "Chiều mai bạn có rảnh không?",
      "Văn phòng thầy giáo ở tầng mấy?"
    ],
    "wrongZh": [
      "老师叫我明天下午去他办公室。",
      "明天下午老师让我去他办公室。",
      "老师让我去他办公室明天下午。"
    ]
  },
  {
    "id": "g_22_3",
    "lesson": 22,
    "hsk": 2,
    "zh": "爸爸叫我早点儿回宿舍休息。",
    "py": "Bàba jiào wǒ zǎodiǎnr huí sùshè xiūxi.",
    "vi": "Bố bảo tôi về ký túc xá nghỉ ngơi sớm một chút.",
    "tokens": [
      "爸爸",
      "叫",
      "我",
      "早点儿",
      "回",
      "宿舍",
      "休息",
      "。"
    ],
    "grammarNote": "Câu kiêm ngữ với 叫 (jiào - bảo, kêu); Phó từ 早点儿 (sớm một chút).",
    "distractors": [
      "请"
    ],
    "wrongVi": [
      "Bố bạn gọi điện cho bạn khi nào?",
      "Bạn có hay về ký túc xá muộn không?",
      "Nghỉ ngơi sớm rất tốt cho sức khỏe."
    ],
    "wrongZh": [
      "爸爸请我早点儿回宿舍休息。",
      "爸爸叫我早点儿在宿舍休息。",
      "早点儿爸爸叫我回宿舍休息。"
    ]
  },
  {
    "id": "g_22_4",
    "lesson": 22,
    "hsk": 2,
    "zh": "我们请玛丽唱一首中国歌吧。",
    "py": "Wǒmen qǐng Mǎlì chàng yì shǒu Zhōngguó gē ba.",
    "vi": "Chúng mình mời Mary hát một bài hát Trung Quốc đi.",
    "tokens": [
      "我们",
      "请",
      "玛丽",
      "唱",
      "一首",
      "中国",
      "歌",
      "吧",
      "。"
    ],
    "grammarNote": "Câu kiêm ngữ với 请; Lượng từ 首 (bài hát): 一首歌.",
    "distractors": [
      "个"
    ],
    "wrongVi": [
      "Mary hát có hay không?",
      "Bạn biết hát bài hát tiếng Trung nào không?",
      "Chúng ta cùng hát một bài nhé."
    ],
    "wrongZh": [
      "我们让玛丽唱一首中国歌吧。",
      "我们请玛丽唱一个中国歌吧。",
      "请玛丽唱一首中国歌吧我们。"
    ]
  },
  {
    "id": "g_23_1",
    "lesson": 23,
    "hsk": 2,
    "zh": "学校里边有邮局和超市吗？",
    "py": "Xuéxiào lǐbiān yǒu yóujú hé chāoshì ma?",
    "vi": "Bên trong trường học có bưu điện và siêu thị không?",
    "tokens": [
      "学校",
      "里边",
      "有",
      "邮局",
      "和",
      "超市",
      "吗",
      "？"
    ],
    "grammarNote": "Câu tồn hiện: Nơi chốn (学校里边) + 有 + Sự vật (邮局和超市).",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Bưu điện của trường ở chỗ nào?",
      "Siêu thị trong trường có to không?",
      "Bạn đi bưu điện hay đi siêu thị?"
    ],
    "wrongZh": [
      "学校里边在邮局和超市吗？",
      "邮局和超市在学校里边吗？",
      "学校里边有邮局吗和超市？"
    ]
  },
  {
    "id": "g_23_2",
    "lesson": 23,
    "hsk": 2,
    "zh": "邮局在图书馆的东边，教学楼后边。",
    "py": "Yóujú zài túshūguǎn de dōngbiān, jiàoxuélóu hòubiān.",
    "vi": "Bưu điện ở phía đông thư viện, phía sau tòa nhà học.",
    "tokens": [
      "邮局",
      "在",
      "图书馆",
      "的",
      "东边",
      "，",
      "教学楼",
      "后边",
      "。"
    ],
    "grammarNote": "Phương vị từ: 东边 (phía đông), 后边 (phía sau).",
    "distractors": [
      "有"
    ],
    "wrongVi": [
      "Thư viện ở phía nào của trường?",
      "Bưu điện cách giảng đường có xa không?",
      "Tòa nhà học ở đâu?"
    ],
    "wrongZh": [
      "邮局有图书馆的东边，教学楼后边。",
      "图书馆的东边在邮局，教学楼后边。",
      "邮局在东边图书馆，后边教学楼。"
    ]
  },
  {
    "id": "g_23_3",
    "lesson": 23,
    "hsk": 2,
    "zh": "从这儿到银行走路只要五分钟。",
    "py": "Cóng zhèr dào yínháng zǒulù zhǐ yào wǔ fēnzhōng.",
    "vi": "Từ đây đến ngân hàng đi bộ chỉ mất 5 phút.",
    "tokens": [
      "从",
      "这儿",
      "到",
      "银行",
      "走路",
      "只",
      "要",
      "五分钟",
      "。"
    ],
    "grammarNote": "Cấu trúc khoảng cách: 从...到... (từ... đến...); 只要 (chỉ cần).",
    "distractors": [
      "离"
    ],
    "wrongVi": [
      "Ngân hàng có gần đây không?",
      "Đi xe bus đến ngân hàng mất bao lâu?",
      "Từ trường học đến ngân hàng đi đường nào?"
    ],
    "wrongZh": [
      "离这儿到银行走路只要五分钟。",
      "从这儿到银行走路只有五分钟。",
      "走路从这儿到银行只要五分钟。"
    ]
  },
  {
    "id": "g_23_4",
    "lesson": 23,
    "hsk": 2,
    "zh": "往前面走一百米就是那个书店。",
    "py": "Wǎng qiánmiàn zǒu yìbǎi mǐ jiù shì nà ge shūdiàn.",
    "vi": "Đi về phía trước 100 mét chính là hiệu sách đó.",
    "tokens": [
      "往",
      "前面",
      "走",
      "一百米",
      "就",
      "是",
      "那个",
      "书店",
      "。"
    ],
    "grammarNote": "Giới từ chỉ hướng 往: 往 + Phương vị từ + Động từ (往前面走).",
    "distractors": [
      "从"
    ],
    "wrongVi": [
      "Hiệu sách đó nằm ở bên trái hay bên phải?",
      "Đi bộ đến hiệu sách mất bao nhiêu mét?",
      "Bạn có biết hiệu sách đó không?"
    ],
    "wrongZh": [
      "从前面走一百米就是那个书店。",
      "往前面走一百米有那个书店。",
      "前面往走一百米就是那个书店。"
    ]
  },
  {
    "id": "g_24_1",
    "lesson": 24,
    "hsk": 2,
    "zh": "老师，我想学太极拳，可以吗？",
    "py": "Lǎoshī, wǒ xiǎng xué tàijíquán, kěyǐ ma?",
    "vi": "Thầy ơi, em muốn học Thái Cực Quyền, được không ạ?",
    "tokens": [
      "老师",
      "，",
      "我",
      "想",
      "学",
      "太极拳",
      "，",
      "可以",
      "吗",
      "？"
    ],
    "grammarNote": "Động từ năng nguyện 想 (muốn) và câu hỏi xin phép: 可以吗？",
    "distractors": [
      "会"
    ],
    "wrongVi": [
      "Thầy có dạy Thái Cực Quyền không ạ?",
      "Lớp Thái Cực Quyền khai giảng khi nào?",
      "Học Thái Cực Quyền có khó không thầy?"
    ],
    "wrongZh": [
      "老师，我会学太极拳，可以吗？",
      "老师，我想学太极拳，能吗？",
      "老师，我想学太极拳可以不？"
    ]
  },
  {
    "id": "g_24_2",
    "lesson": 24,
    "hsk": 2,
    "zh": "下星期一你可以来我们班报名。",
    "py": "Xià xīngqīyī nǐ kěyǐ lái wǒmen bān bàomíng.",
    "vi": "Thứ hai tuần sau bạn có thể đến lớp chúng tôi đăng ký.",
    "tokens": [
      "下星期一",
      "你",
      "可以",
      "来",
      "我们班",
      "报名",
      "。"
    ],
    "grammarNote": "Động từ năng nguyện 可以 (có thể / được phép); 来 + Nơi chốn + Động từ.",
    "distractors": [
      "想"
    ],
    "wrongVi": [
      "Đăng ký học Thái Cực Quyền ở đâu?",
      "Học phí bao nhiêu tiền một khóa?",
      "Thứ hai tuần sau mấy giờ bắt đầu học?"
    ],
    "wrongZh": [
      "下星期一你想来我们班报名。",
      "你可以下星期一来我们班报名。",
      "下星期一你可以去我们班报名。"
    ]
  },
  {
    "id": "g_24_3",
    "lesson": 24,
    "hsk": 2,
    "zh": "一节课要上多长时间？一个小时。",
    "py": "Yì jié kè yào shàng duō cháng shíjiān? Yí ge xiǎoshí.",
    "vi": "Một tiết học phải học trong bao lâu? Một tiếng đồng hồ.",
    "tokens": [
      "一节课",
      "要",
      "上",
      "多长时间",
      "？",
      "一个小时",
      "。"
    ],
    "grammarNote": "Hỏi thời lượng: 多长时间？ Lượng từ tiết học 节; 一个小时 (1 giờ).",
    "distractors": [
      "多少"
    ],
    "wrongVi": [
      "Mỗi tuần học mấy tiết?",
      "Mấy giờ tan học?",
      "Học một tiếng có mệt không?"
    ],
    "wrongZh": [
      "一节课要上多少时间？一个小时。",
      "一节课要上多长的时间？一个小时。",
      "多长时间一节课要上？一个小时。"
    ]
  },
  {
    "id": "g_24_4",
    "lesson": 24,
    "hsk": 2,
    "zh": "我会说一点儿汉语，也能听懂。",
    "py": "Wǒ huì shuō yìdiǎnr Hànyǔ, yě néng tīngdǒng.",
    "vi": "Tôi biết nói một chút tiếng Hán, cũng có thể nghe hiểu.",
    "tokens": [
      "我",
      "会",
      "说",
      "一点儿",
      "汉语",
      "，",
      "也",
      "能",
      "听懂",
      "。"
    ],
    "grammarNote": "Phân biệt 会 (biết nhờ học tập) và 能 (năng lực làm được).",
    "distractors": [
      "可以"
    ],
    "wrongVi": [
      "Bạn học tiếng Hán được bao lâu rồi?",
      "Người Trung Quốc nói chuyện bạn có hiểu không?",
      "Tôi chỉ biết viết chữ Hán, không biết nói."
    ],
    "wrongZh": [
      "我可以说明天汉语，也能听懂。",
      "我会说一点儿汉语，也可以听懂。",
      "我能说一点儿汉语，也会听懂。"
    ]
  },
  {
    "id": "g_25_1",
    "lesson": 25,
    "hsk": 2,
    "zh": "她太极拳打得真好！",
    "py": "Tā tàijíquán dǎ de zhēn hǎo!",
    "vi": "Cô ấy đánh Thái Cực Quyền thật là giỏi!",
    "tokens": [
      "她",
      "太极拳",
      "打",
      "得",
      "真",
      "好",
      "！"
    ],
    "grammarNote": "Bổ ngữ trạng thái: Động từ + 得 + Cụm miêu tả; Tân ngữ đặt trước động từ.",
    "distractors": [
      "的"
    ],
    "wrongVi": [
      "Cô ấy học Thái Cực Quyền ở đâu?",
      "Cô ấy tập Thái Cực Quyền bao lâu rồi?",
      "Động tác của cô ấy rất đẹp mắt."
    ],
    "wrongZh": [
      "她太极拳打的真好！",
      "她打得太极拳真好！",
      "太极拳她打得很真好！"
    ]
  },
  {
    "id": "g_25_2",
    "lesson": 25,
    "hsk": 2,
    "zh": "她说汉语说得非常流利。",
    "py": "Tā shuō Hànyǔ shuō de fēicháng liúlì.",
    "vi": "Cô ấy nói tiếng Hán nói rất lưu loát.",
    "tokens": [
      "她",
      "说",
      "汉语",
      "说",
      "得",
      "非常",
      "流利",
      "。"
    ],
    "grammarNote": "Quy tắc khi mang tân ngữ: V + O + V + 得 + Cụm miêu tả.",
    "distractors": [
      "得"
    ],
    "wrongVi": [
      "Tiếng Hán của cô ấy rất chuẩn.",
      "Cô ấy học tiếng Hán rất chăm chỉ.",
      "Cô ấy nói tiếng Hán nhanh như người bản xứ."
    ],
    "wrongZh": [
      "她说汉语得非常流利。",
      "她说汉语非常流利说得。",
      "她汉语说得说非常流利。"
    ]
  },
  {
    "id": "g_25_3",
    "lesson": 25,
    "hsk": 2,
    "zh": "他每天早上起得很早去跑步。",
    "py": "Tā měitiān zǎoshang qǐ de hěn zǎo qù pǎobù.",
    "vi": "Anh ấy mỗi sáng đều dậy rất sớm để đi chạy bộ.",
    "tokens": [
      "他",
      "每天",
      "早上",
      "起",
      "得",
      "很早",
      "去",
      "跑步",
      "。"
    ],
    "grammarNote": "Bổ ngữ trạng thái chỉ thói quen / kết quả: 起得很早.",
    "distractors": [
      "的地"
    ],
    "wrongVi": [
      "Buổi sáng anh ấy chạy bộ ở đâu?",
      "Mấy giờ anh ấy thức dậy?",
      "Chạy bộ buổi sáng rất tốt cho sức khỏe."
    ],
    "wrongZh": [
      "他每天早上起的很早去跑步。",
      "每天早上他起得早很去跑步。",
      "他每天早上去跑步起得很早。"
    ]
  },
  {
    "id": "g_25_4",
    "lesson": 25,
    "hsk": 2,
    "zh": "弟弟跑得不快，但是很有劲儿。",
    "py": "Dìdi pǎo de bú kuài, dànshì hěn yǒu jìnr.",
    "vi": "Em trai chạy không nhanh, nhưng rất có sức.",
    "tokens": [
      "弟弟",
      "跑",
      "得",
      "不快",
      "，",
      "但是",
      "很",
      "有劲儿",
      "。"
    ],
    "grammarNote": "Dạng phủ định của bổ ngữ trạng thái: V + 得 + 不 + Tính từ (跑得不快).",
    "distractors": [
      "没"
    ],
    "wrongVi": [
      "Em trai chạy nhanh nhất lớp.",
      "Em trai có thích thể thao không?",
      "Em trai chạy bộ mệt rồi."
    ],
    "wrongZh": [
      "弟弟跑得没快，但是很有劲儿。",
      "弟弟跑不快得，但是很有劲儿。",
      "弟弟没跑得快，但是很有劲儿。"
    ]
  },
  {
    "id": "g_26_1",
    "lesson": 26,
    "hsk": 2,
    "zh": "田芳去哪儿了？她去同学家了。",
    "py": "Tián Fāng qù nǎr le? Tā qù tóngxué jiā le.",
    "vi": "Điền Phương đi đâu rồi? Cô ấy đến nhà bạn học rồi.",
    "tokens": [
      "田芳",
      "去",
      "哪儿",
      "了",
      "？",
      "她",
      "去",
      "同学",
      "家",
      "了",
      "。"
    ],
    "grammarNote": "Trợ từ động thái 了 biểu thị hành động đã xảy ra / thay đổi trạng thái.",
    "distractors": [
      "过"
    ],
    "wrongVi": [
      "Điền Phương có ở nhà không?",
      "Điền Phương đi với ai?",
      "Bao giờ Điền Phương về nhà?"
    ],
    "wrongZh": [
      "田芳去哪儿过？她去同学家过。",
      "田芳去了哪儿？她去同学家了。",
      "去哪儿了田芳？她去同学家了。"
    ]
  },
  {
    "id": "g_26_2",
    "lesson": 26,
    "hsk": 2,
    "zh": "我买了一本很厚的汉英词典。",
    "py": "Wǒ mǎi le yì běn hěn hòu de Hàn-Yīng cídiǎn.",
    "vi": "Tôi đã mua một cuốn từ điển Hán-Anh rất dày.",
    "tokens": [
      "我",
      "买",
      "了",
      "一本",
      "很厚",
      "的",
      "汉英词典",
      "。"
    ],
    "grammarNote": "Cấu trúc: V + 了 + Số lượng + Định ngữ + Tân ngữ (买了一本词典).",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Cuốn từ điển này giá bao nhiêu tiền?",
      "Bạn mua từ điển ở hiệu sách nào?",
      "Từ điển Hán-Anh này rất có ích."
    ],
    "wrongZh": [
      "我买一本很厚的汉英词典了。",
      "我买了一个很厚的汉英词典。",
      "一本很厚的汉英词典我买了。"
    ]
  },
  {
    "id": "g_26_3",
    "lesson": 26,
    "hsk": 2,
    "zh": "昨天晚上我没有看电影。",
    "py": "Zuótiān wǎnshang wǒ méiyǒu kàn diànyǐng.",
    "vi": "Tối hôm qua tôi không xem phim.",
    "tokens": [
      "昨天晚上",
      "我",
      "没有",
      "看",
      "电影",
      "。"
    ],
    "grammarNote": "Phủ định của hành động trong quá khứ bắt buộc dùng 没有 + V (KHÔNG dùng 不+V+了).",
    "distractors": [
      "不看了"
    ],
    "wrongVi": [
      "Tối hôm qua bạn làm gì?",
      "Bộ phim hôm qua có hay không?",
      "Tôi đi xem phim cùng bạn bè."
    ],
    "wrongZh": [
      "昨天晚上我不看电影了。",
      "昨天晚上我没看了电影。",
      "我昨天晚上看电影没有。"
    ]
  },
  {
    "id": "g_26_4",
    "lesson": 26,
    "hsk": 2,
    "zh": "你吃晚饭了没有？还没吃呢。",
    "py": "Nǐ chī wǎnfàn le méiyǒu? Hái méi chī ne.",
    "vi": "Bạn đã ăn cơm tối chưa? Vẫn chưa ăn.",
    "tokens": [
      "你",
      "吃",
      "晚饭",
      "了",
      "没有",
      "？",
      "还",
      "没",
      "吃",
      "呢",
      "。"
    ],
    "grammarNote": "Câu hỏi chính phản về hành động đã xảy ra: [Hành động] + 了没有？",
    "distractors": [
      "吗"
    ],
    "wrongVi": [
      "Cơm tối hôm nay có món gì?",
      "Bạn ăn cơm tối ở đâu?",
      "Chúng mình cùng đi ăn tối nhé."
    ],
    "wrongZh": [
      "你吃晚饭了么？还没吃呢。",
      "你吃了晚饭没有吗？还没吃呢。",
      "晚饭你吃了没有？还没吃呢。"
    ]
  },
  {
    "id": "g_27_1",
    "lesson": 27,
    "hsk": 2,
    "zh": "玛丽，你怎么了？为什么哭了？",
    "py": "Mǎlì, nǐ zěnme le? Wèishénme kū le?",
    "vi": "Mary, bạn bị làm sao thế? Sao lại khóc?",
    "tokens": [
      "玛丽",
      "，",
      "你",
      "怎么",
      "了",
      "？",
      "为什么",
      "哭",
      "了",
      "？"
    ],
    "grammarNote": "Câu hỏi thăm dò tình trạng: 怎么了？ và nguyên nhân: 为什么...了？",
    "distractors": [
      "什么"
    ],
    "wrongVi": [
      "Mary cảm thấy thế nào rồi?",
      "Có chuyện gì xảy ra với Mary thế?",
      "Đừng khóc nữa, có chuyện gì kể tôi nghe."
    ],
    "wrongZh": [
      "玛丽，你什么了？为什么哭了？",
      "玛丽，你怎么呢？为什么哭了？",
      "为什么哭了玛丽，你怎么了？"
    ]
  },
  {
    "id": "g_27_2",
    "lesson": 27,
    "hsk": 2,
    "zh": "因为我感冒了，头疼、发烧。",
    "py": "Yīnwèi wǒ gǎnmào le, tóuténg, fāshāo.",
    "vi": "Bởi vì tôi bị cảm cúm rồi, đau đầu, sốt.",
    "tokens": [
      "因为",
      "我",
      "感冒",
      "了",
      "，",
      "头疼",
      "、",
      "发烧",
      "。"
    ],
    "grammarNote": "Cặp liên từ chỉ nguyên nhân kết quả: 因为... (Bởi vì...).",
    "distractors": [
      "所以"
    ],
    "wrongVi": [
      "Bạn đã uống thuốc hạ sốt chưa?",
      "Bị sốt bao nhiêu độ rồi?",
      "Bạn cần đi khám bác sĩ ngay."
    ],
    "wrongZh": [
      "所以感冒了，我头疼发烧。",
      "因为我感冒，头疼、发烧了。",
      "我因为感冒了，头疼发烧。"
    ]
  },
  {
    "id": "g_27_3",
    "lesson": 27,
    "hsk": 2,
    "zh": "我想家了，身体很不舒服。",
    "py": "Wǒ xiǎng jiā le, shēntǐ hěn bù shūfu.",
    "vi": "Tôi nhớ nhà rồi, người rất khó chịu mệt mỏi.",
    "tokens": [
      "我",
      "想家",
      "了",
      "，",
      "身体",
      "很",
      "不",
      "舒服",
      "。"
    ],
    "grammarNote": "Biến đổi cảm xúc với 了: 想家了; Tính từ 舒服 (dễ chịu).",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Khi bị ốm ai cũng dễ nhớ nhà.",
      "Bạn có muốn ăn chút gì không?",
      "Tôi ở lại chăm sóc bạn nhé."
    ],
    "wrongZh": [
      "我正在想家，身体很不舒服。",
      "我想家，身体很不舒服了。",
      "身体很不舒服，我想家了。"
    ]
  },
  {
    "id": "g_27_4",
    "lesson": 27,
    "hsk": 2,
    "zh": "别哭了，走，我陪你去医院看病。",
    "py": "Bié kū le, zǒu, wǒ péi nǐ qù yīyuàn kànbìng.",
    "vi": "Đừng khóc nữa, đi nào, tôi đưa bạn đến bệnh viện khám bệnh.",
    "tokens": [
      "别",
      "哭",
      "了",
      "，",
      "走",
      "，",
      "我",
      "陪",
      "你",
      "去",
      "医院",
      "看病",
      "。"
    ],
    "grammarNote": "Khuyên ngăn: 别 + V + 了 (Đừng... nữa); Động từ 陪 (đi cùng, đồng hành).",
    "distractors": [
      "不"
    ],
    "wrongVi": [
      "Bác sĩ nói bạn bị bệnh gì?",
      "Bệnh viện ở gần trường không?",
      "Uống thuốc này sẽ đỡ ngay thôi."
    ],
    "wrongZh": [
      "不哭了，走，我陪你去医院看病。",
      "别哭，走，我请你去医院看病。",
      "走，我陪你去医院看病，别哭了。"
    ]
  },
  {
    "id": "g_28_1",
    "lesson": 28,
    "hsk": 2,
    "zh": "我吃了早饭就去找你。",
    "py": "Wǒ chī le zǎofàn jiù qù zhǎo nǐ.",
    "vi": "Tôi ăn sáng xong là đi tìm bạn ngay.",
    "tokens": [
      "我",
      "吃",
      "了",
      "早饭",
      "就",
      "去",
      "找",
      "你",
      "。"
    ],
    "grammarNote": "Cấu trúc liên kết hai hành động liên tiếp: V1 + 了... 就 + V2... (Làm xong A là làm B ngay).",
    "distractors": [
      "才"
    ],
    "wrongVi": [
      "Bạn ăn sáng lúc mấy giờ?",
      "Tôi đợi bạn ở ký túc xá nhé.",
      "Chúng mình cùng đi ăn sáng đi."
    ],
    "wrongZh": [
      "我吃早饭了就去找你。",
      "我吃了早饭才去找你。",
      "吃了早饭我去找你马上。"
    ]
  },
  {
    "id": "g_28_2",
    "lesson": 28,
    "hsk": 2,
    "zh": "你等我一会儿，我马上就来。",
    "py": "Nǐ děng wǒ yíhuìr, wǒ mǎshàng jiù lái.",
    "vi": "Bạn đợi tôi một lát, tôi đến ngay đây.",
    "tokens": [
      "你",
      "等",
      "我",
      "一会儿",
      "，",
      "我",
      "马上",
      "就",
      "来",
      "。"
    ],
    "grammarNote": "Phó từ chỉ sự mau chóng: 马上 (ngay lập tức), 就.",
    "distractors": [
      "才"
    ],
    "wrongVi": [
      "Bao giờ bạn mới đến?",
      "Tôi đã đợi bạn nửa tiếng rồi.",
      "Đừng vội, cứ từ từ đi."
    ],
    "wrongZh": [
      "你等我一会儿，我马上才来。",
      "你等我一点儿，我马上就来。",
      "我马上就来，你等我一会儿。"
    ]
  },
  {
    "id": "g_28_3",
    "lesson": 28,
    "hsk": 2,
    "zh": "你看这套房子，又干净又安静。",
    "py": "Nǐ kàn zhè tào fángzi, yòu gānjìng yòu ānjìng.",
    "vi": "Bạn xem căn nhà này này, vừa sạch sẽ lại vừa yên tĩnh.",
    "tokens": [
      "你",
      "看",
      "这套",
      "房子",
      "，",
      "又",
      "干净",
      "又",
      "安静",
      "。"
    ],
    "grammarNote": "Cấu trúc song hành tính chất: 又 + Tính từ 1 + 又 + Tính từ 2 (Vừa... lại vừa...).",
    "distractors": [
      "也"
    ],
    "wrongVi": [
      "Căn nhà này giá thuê bao nhiêu một tháng?",
      "Căn nhà này có mấy phòng ngủ?",
      "Tôi rất thích căn nhà yên tĩnh này."
    ],
    "wrongZh": [
      "你看这套房子，也干净也安静。",
      "你看这套房子，又干净还安静。",
      "这套房子你看，又干净又安静。"
    ]
  },
  {
    "id": "g_28_4",
    "lesson": 28,
    "hsk": 2,
    "zh": "看完书以后，咱们一起去租房子。",
    "py": "Kàn wán shū yǐhòu, zánmen yìqǐ qù zū fángzi.",
    "vi": "Đọc sách xong, chúng mình cùng đi thuê nhà nhé.",
    "tokens": [
      "看",
      "完",
      "书",
      "以后",
      "，",
      "咱们",
      "一起",
      "去",
      "租",
      "房子",
      "。"
    ],
    "grammarNote": "Bổ ngữ kết quả 完 (xong); Cấu trúc ...以后 (Sau khi làm gì).",
    "distractors": [
      "了"
    ],
    "wrongVi": [
      "Bạn muốn thuê nhà ở khu vực nào?",
      "Giá thuê nhà ở đây có đắt không?",
      "Chúng mình thuê chung một căn nhà nhé."
    ],
    "wrongZh": [
      "看了书以后，咱们一起去租房子。",
      "看书完了以后，咱们一起去租房子。",
      "咱们一起去租房子，看完书以后。"
    ]
  },
  {
    "id": "g_29_1",
    "lesson": 29,
    "hsk": 2,
    "zh": "今天的考试题你做完了吗？",
    "py": "Jīntiān de kǎoshì tí nǐ zuò wán le ma?",
    "vi": "Đề thi hôm nay bạn đã làm xong chưa?",
    "tokens": [
      "今天",
      "的",
      "考试题",
      "你",
      "做",
      "完",
      "了",
      "吗",
      "？"
    ],
    "grammarNote": "Bổ ngữ kết quả 完 (hoàn thành): Động từ + 完 + 了.",
    "distractors": [
      "过"
    ],
    "wrongVi": [
      "Đề thi hôm nay có khó không?",
      "Bạn làm được bao nhiêu câu?",
      "Còn bao nhiêu phút nữa thì hết giờ?"
    ],
    "wrongZh": [
      "今天的考试题你做过了吗？",
      "今天的考试题你做了完吗？",
      "你做完了今天的考试题没有？"
    ]
  },
  {
    "id": "g_29_2",
    "lesson": 29,
    "hsk": 2,
    "zh": "这次的题我都做对了，没写错。",
    "py": "Zhè cì de tí wǒ dōu zuò duì le, méi xiě cuò.",
    "vi": "Đề thi lần này tôi đều làm đúng cả, không viết sai.",
    "tokens": [
      "这次",
      "的",
      "题",
      "我",
      "都",
      "做",
      "对",
      "了",
      "，",
      "没",
      "写",
      "错",
      "。"
    ],
    "grammarNote": "Bổ ngữ kết quả 对 (đúng) và 错 (sai); Phủ định dùng 没 + V + Bổ ngữ kết quả.",
    "distractors": [
      "不"
    ],
    "wrongVi": [
      "Tôi làm sai mất hai câu.",
      "Bạn được bao nhiêu điểm?",
      "Đề thi lần này dễ hơn lần trước."
    ],
    "wrongZh": [
      "这次的题我都做对了，不写错。",
      "这次的题我都做了对，没写错。",
      "我这次的题都做对了，没写错了。"
    ]
  },
  {
    "id": "g_29_3",
    "lesson": 29,
    "hsk": 2,
    "zh": "老师讲的内容我都听懂了。",
    "py": "Lǎoshī jiǎng de nèiróng wǒ dōu tīng dǒng le.",
    "vi": "Nội dung thầy giáo giảng tôi đều nghe hiểu hết rồi.",
    "tokens": [
      "老师",
      "讲",
      "的",
      "内容",
      "我",
      "都",
      "听",
      "懂",
      "了",
      "。"
    ],
    "grammarNote": "Bổ ngữ kết quả 懂 (hiểu): 听懂 (nghe hiểu), 看懂 (đọc hiểu).",
    "distractors": [
      "完"
    ],
    "wrongVi": [
      "Có chỗ nào bạn chưa hiểu không?",
      "Thầy giáo giảng bài rất dễ hiểu.",
      "Bạn ghi chép bài đầy đủ chứ?"
    ],
    "wrongZh": [
      "老师讲的内容我都听完了。",
      "老师讲的内容我都听懂没有。",
      "我都听懂了老师讲的内容。"
    ]
  },
  {
    "id": "g_29_4",
    "lesson": 29,
    "hsk": 2,
    "zh": "你看见我的汉语词典了吗？",
    "py": "Nǐ kànjiàn wǒ de Hànyǔ cídiǎn le ma?",
    "vi": "Bạn có nhìn thấy cuốn từ điển tiếng Hán của tôi không?",
    "tokens": [
      "你",
      "看见",
      "我",
      "的",
      "汉语词典",
      "了",
      "吗",
      "？"
    ],
    "grammarNote": "Bổ ngữ kết quả 见 (thấy): 看见 (nhìn thấy), 听见 (nghe thấy).",
    "distractors": [
      "完"
    ],
    "wrongVi": [
      "Từ điển của bạn màu gì?",
      "Bạn để từ điển ở đâu?",
      "Tôi mượn từ điển của bạn một lát nhé."
    ],
    "wrongZh": [
      "你看完我的汉语词典了吗？",
      "你看了见我的汉语词典吗？",
      "我的汉语词典你看见没有了吗？"
    ]
  },
  {
    "id": "g_30_1",
    "lesson": 30,
    "hsk": 2,
    "zh": "我已经来中国两个多月了。",
    "py": "Wǒ yǐjīng lái Zhōngguó liǎng ge duō yuè le.",
    "vi": "Tôi đã đến Trung Quốc được hơn hai tháng rồi.",
    "tokens": [
      "我",
      "已经",
      "来",
      "中国",
      "两个多月",
      "了",
      "。"
    ],
    "grammarNote": "Bổ ngữ thời lượng: Động từ + Tân ngữ + Thời lượng + 了 (Hành động đang tiếp diễn).",
    "distractors": [
      "二个"
    ],
    "wrongVi": [
      "Bạn đến Trung Quốc vào mùa nào?",
      "Cuộc sống ở Trung Quốc thế nào?",
      "Bạn dự định ở Trung Quốc bao lâu?"
    ],
    "wrongZh": [
      "我已经来中国二个多月了。",
      "我已经来了中国两个多月。",
      "来中国我已经两个多月了。"
    ]
  },
  {
    "id": "g_30_2",
    "lesson": 30,
    "hsk": 2,
    "zh": "我对这儿的生活差不多已经习惯了。",
    "py": "Wǒ duì zhèr de shēnghuó chàbuduō yǐjīng xíguàn le.",
    "vi": "Tôi đối với cuộc sống ở đây hầu như đã quen rồi.",
    "tokens": [
      "我",
      "对",
      "这儿",
      "的",
      "生活",
      "差不多",
      "已经",
      "习惯",
      "了",
      "。"
    ],
    "grammarNote": "Giới từ 对 (đối với): A 对 B + [Thái độ / Cảm nhận / Thói quen].",
    "distractors": [
      "在"
    ],
    "wrongVi": [
      "Bạn có quen ăn đồ ăn ở đây không?",
      "Khí hậu ở đây có khắc nghiệt không?",
      "Tôi vẫn chưa quen với thời tiết lạnh."
    ],
    "wrongZh": [
      "我在对这儿的生活差不多已经习惯了。",
      "我对这儿的生活已经差不多习惯了。",
      "这儿的生活我对差不多已经习惯了。"
    ]
  },
  {
    "id": "g_30_3",
    "lesson": 30,
    "hsk": 2,
    "zh": "北京的冬天比上海冷得多。",
    "py": "Běijīng de dōngtiān bǐ Shànghǎi lěng de duō.",
    "vi": "Mùa đông ở Bắc Kinh lạnh hơn Thượng Hải nhiều.",
    "tokens": [
      "北京",
      "的",
      "冬天",
      "比",
      "上海",
      "冷",
      "得",
      "多",
      "。"
    ],
    "grammarNote": "Câu so sánh hơn với chữ 比: A 比 B + Tính từ + 得多 / 多了.",
    "distractors": [
      "很"
    ],
    "wrongVi": [
      "Mùa đông ở Thượng Hải có tuyết không?",
      "Bắc Kinh lạnh hơn hay Thượng Hải lạnh hơn?",
      "Mùa đông ở đây rất lạnh và khô."
    ],
    "wrongZh": [
      "北京的冬天比上海很冷。",
      "北京的冬天比较上海冷得多。",
      "比上海北京的冬天冷得多。"
    ]
  },
  {
    "id": "g_30_4",
    "lesson": 30,
    "hsk": 2,
    "zh": "我坚持每天下午锻炼一个小时。",
    "py": "Wǒ jiānchí měitiān xiàwǔ duànliàn yí ge xiǎoshí.",
    "vi": "Tôi kiên trì mỗi buổi chiều rèn luyện thân thể một tiếng đồng hồ.",
    "tokens": [
      "我",
      "坚持",
      "每天下午",
      "锻炼",
      "一个小时",
      "。"
    ],
    "grammarNote": "Bổ ngữ thời lượng: Động từ + [Khoảng thời gian: 一个小时].",
    "distractors": [
      "钟头"
    ],
    "wrongVi": [
      "Bạn thường tập môn thể thao gì?",
      "Tập thể dục giúp cơ thể khỏe mạnh hơn.",
      "Buổi chiều tôi hay đi chạy bộ."
    ],
    "wrongZh": [
      "我坚持每天下午锻炼一个钟头。",
      "每天下午我坚持一个小时锻炼。",
      "我坚持锻炼一个小时每天下午。"
    ]
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
    scopeSelect.querySelectorAll('option[value^="lesson_"]').forEach(o => o.remove());
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
    if (!this.sentences || !this.sentences.length) {
      this.sentences = (typeof GRAMMAR_DATA !== 'undefined' ? GRAMMAR_DATA : (window.GRAMMAR_DATA || []));
    }
    this.mode = options.mode || 'reorder';
    const scope = options.scope || 'all';
    const count = parseInt(options.count || 10, 10);

    let pool = [...this.sentences];
    if (/^hsk\d$/.test(scope)) {
      pool = pool.filter(s => s.hsk === +scope.slice(3));
    } else if (scope.startsWith('lesson_')) {
      const lNum = parseInt(scope.replace('lesson_', ''), 10);
      pool = pool.filter(s => s.lesson === lNum);
      if (!pool.length) {
        const lessonObj = (window.CHINESE_DATA && window.CHINESE_DATA.lessons || []).find(l => l.id === lNum);
        const level = lessonObj ? lessonObj.hsk : (lNum <= 15 ? 1 : 2);
        pool = this.sentences.filter(s => s.hsk === level);
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
      checkBtn.style.display = this.mode === 'reorder' ? 'inline-flex' : 'none';
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
      if (promptVi) promptVi.innerHTML = `<span class="quiz-prompt-label">Ghép thành câu có nghĩa</span><strong class="quiz-prompt-mean">${UI.esc(q.vi)}</strong>`;
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
      if (promptVi) promptVi.innerHTML = `<span class="quiz-prompt-label">Chọn câu tiếng Trung đúng cho</span><strong class="quiz-prompt-mean">${UI.esc(q.vi)}</strong>`;
      if (promptZh) promptZh.style.display = 'none';

      this.renderTranslationChoices(q, 'zh');
    } else if (this.mode === 'zh_to_vi') {
      if (reorderArea) reorderArea.style.display = 'none';
      if (choiceArea) choiceArea.style.display = 'block';
      if (promptVi) promptVi.innerHTML = `<span class="quiz-prompt-label">Chọn nghĩa tiếng Việt của câu</span>`;
      if (promptZh) {
        promptZh.style.display = 'block';
        promptZh.innerHTML = `
          <div class="grammar-zh hanzi">${q.zh}</div>
          <div class="py grammar-py">${Tone.html(q.py || q.pinyin || '')}</div>
          <button class="btn btn-outline btn-sm" onclick="AudioEngine.speak('${jsArg(q.zh)}')">${Icon.svg('sound')}<span>Nghe câu</span></button>
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

  resetAnswerState() {
    this.isAnswered = false;
    const feedbackBox = document.getElementById('grammar-feedback-box');
    if (feedbackBox) {
      feedbackBox.style.display = 'none';
      feedbackBox.innerHTML = '';
    }
    const checkBtn = document.getElementById('grammar-check-btn');
    const nextBtn = document.getElementById('grammar-next-btn');
    if (checkBtn) {
      checkBtn.style.display = 'inline-flex';
      checkBtn.disabled = this.selectedTokens.length === 0;
    }
    if (nextBtn) {
      nextBtn.style.display = 'none';
    }
    const slot = document.getElementById('grammar-answer-slot');
    if (slot) {
      slot.classList.remove('slot-correct', 'slot-wrong');
    }
  },

  selectTile(poolIndex) {
    if (this.isAnswered) {
      this.resetAnswerState();
    }
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    const token = this.availableTokens.splice(poolIndex, 1)[0];
    if (token) this.selectedTokens.push(token);
    this.renderTiles();
  },

  unselectTile(slotIndex) {
    if (this.isAnswered) {
      this.resetAnswerState();
    }
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    const token = this.selectedTokens.splice(slotIndex, 1)[0];
    if (token) this.availableTokens.push(token);
    this.renderTiles();
  },

  clearTiles() {
    this.resetAnswerState();
    if (typeof AudioEngine !== 'undefined' && AudioEngine.playClickSound) {
      AudioEngine.playClickSound();
    }
    if (this.selectedTokens && this.selectedTokens.length) {
      this.availableTokens.push(...this.selectedTokens);
      this.selectedTokens = [];
    }
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

    // Hear the correct sentence right away (we are inside the learner's tap)
    if (typeof AudioEngine !== 'undefined' && q && q.zh) AudioEngine.speak(q.zh);

    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.className = `grammar-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
      feedbackBox.innerHTML = `
        <div class="rv-fb-head">${Icon.svg(isCorrect ? 'check' : 'x')}<b>${isCorrect ? 'Chính xác' : 'Chưa đúng. Câu đúng là:'}</b></div>
        <button class="say-line" onclick="AudioEngine.speak('${jsArg(q.zh)}')"><span class="hanzi">${q.zh}</span><span class="py">${Tone.html(q.py || q.pinyin || '')}</span><span class="say-vi">${UI.esc(q.vi)}</span>${Icon.svg('sound')}</button>
        <div class="grammar-tip-badge">${Icon.svg('bulb')}<span><b>Ngữ pháp:</b> ${UI.esc(q.grammarNote || q.point || 'Chú ý trật tự từ: thời gian và nơi chốn đứng trước động từ.')}</span></div>
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
    if (pct === 100) badge = 'Tuyệt đối! Bạn nắm chắc cấu trúc câu.';
    else if (pct >= 80) badge = 'Rất tốt! Chỉ còn vài lỗi nhỏ.';
    else if (pct >= 60) badge = 'Khá tốt. Xem lại các câu sai bên dưới.';
    const badgeEl = document.getElementById('grammar-res-badge');
    if (badgeEl) badgeEl.innerText = badge;

    // Render missed items
    const missedArea = document.getElementById('grammar-missed-area');
    const missedList = document.getElementById('grammar-missed-list');
    if (this.missedQuestions.length > 0 && missedArea && missedList) {
      missedArea.style.display = 'block';
      missedList.innerHTML = this.missedQuestions.map(m => `
        <button class="say-line say-block" onclick="AudioEngine.speak('${jsArg(m.zh)}')">
          <span class="hanzi">${m.zh}</span><span class="py">${Tone.html(m.py || '')}</span><span class="say-vi">${UI.esc(m.vi)}</span>${Icon.svg('sound')}
          <span class="say-note">${UI.esc(m.grammarNote || '')}</span>
        </button>
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
