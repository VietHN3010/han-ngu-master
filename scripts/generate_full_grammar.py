# -*- coding: utf-8 -*-
"""
Generate comprehensive, 100% curriculum-matched GRAMMAR_DATA for all 30 lessons.
Each lesson has 4 carefully crafted sentences directly based on its vocabulary,
dialogue, and grammar points in HSK 1 & HSK 2.
"""
import json

GRAMMAR_DATA_BY_LESSON = [
    # Lesson 1: 你好 (Xin chào)
    # Grammar: 你好/您好, Trợ từ 吗, Phó từ 很/也
    [
        {
            "id": "g_1_1", "lesson": 1, "hsk": 1,
            "zh": "你好吗？", "py": "Nǐ hǎo ma?", "vi": "Bạn khỏe không?",
            "tokens": ["你", "好", "吗", "？"],
            "grammarNote": "Câu hỏi nghi vấn cơ bản: [Mệnh đề] + Trợ từ ngữ khí 吗？",
            "distractors": ["呢"],
            "wrongVi": ["Bạn tên là gì?", "Bạn đi đâu đấy?", "Bạn có bận không?"],
            "wrongZh": ["你好呢？", "你是好吗？", "你吗好？"]
        },
        {
            "id": "g_1_2", "lesson": 1, "hsk": 1,
            "zh": "我很好，你呢？", "py": "Wǒ hěn hǎo, nǐ ne?", "vi": "Tôi rất khỏe, còn bạn?",
            "tokens": ["我", "很", "好", "，", "你", "呢", "？"],
            "grammarNote": "Phó từ mức độ 很 đứng trước tính từ; Trợ từ 呢 dùng để hỏi tỉnh lược (Còn... thì sao?).",
            "distractors": ["也"],
            "wrongVi": ["Tôi không khỏe lắm, còn bạn?", "Tôi cũng rất tốt.", "Tôi rất bận, bạn thì sao?"],
            "wrongZh": ["我很不好，你呢？", "也很好我，你呢？", "我好很，你呢？"]
        },
        {
            "id": "g_1_3", "lesson": 1, "hsk": 1,
            "zh": "我也很好。", "py": "Wǒ yě hěn hǎo.", "vi": "Tôi cũng rất khỏe.",
            "tokens": ["我", "也", "很", "好", "。"],
            "grammarNote": "Phó từ 也 (cũng) đứng trước phó từ 很 và vị ngữ: Chủ ngữ + 也 + 很 + Tính từ.",
            "distractors": ["都"],
            "wrongVi": ["Tôi không khỏe.", "Chúng tôi đều khỏe.", "Bạn cũng khỏe chứ?"],
            "wrongZh": ["我也不好。", "我很也好。", "我也是好。"]
        },
        {
            "id": "g_1_4", "lesson": 1, "hsk": 1,
            "zh": "妈妈好吗？", "py": "Māma hǎo ma?", "vi": "Mẹ có khỏe không?",
            "tokens": ["妈妈", "好", "吗", "？"],
            "grammarNote": "Chủ ngữ ngôi thứ ba + Tính từ + Trợ từ nghi vấn 吗？",
            "distractors": ["很"],
            "wrongVi": ["Mẹ đi đâu rồi?", "Mẹ rất khỏe.", "Mẹ có bận không?"],
            "wrongZh": ["妈妈吗好？", "妈妈很好吗？", "好妈妈吗？"]
        }
    ],

    # Lesson 2: 汉语不太难 (Tiếng Trung không khó lắm)
    # Grammar: Vị ngữ tính từ (汉语不太难), Phủ định 不/不太, Câu hỏi tỉnh lược 呢
    [
        {
            "id": "g_2_1", "lesson": 2, "hsk": 1,
            "zh": "汉语不太难。", "py": "Hànyǔ bú tài nán.", "vi": "Tiếng Hán không khó lắm.",
            "tokens": ["汉语", "不太", "难", "。"],
            "grammarNote": "Phó từ 不太 (không... lắm) đứng trước tính từ để giảm nhẹ mức độ.",
            "distractors": ["很"],
            "wrongVi": ["Tiếng Hán rất khó.", "Tiếng Hán quá khó.", "Tiếng Hán không dễ."],
            "wrongZh": ["汉语太不难。", "汉语很大难。", "不汉语太难。"]
        },
        {
            "id": "g_2_2", "lesson": 2, "hsk": 1,
            "zh": "你忙吗？我很忙。", "py": "Nǐ máng ma? Wǒ hěn máng.", "vi": "Bạn bận không? Tôi rất bận.",
            "tokens": ["你", "忙", "吗", "？", "我", "很", "忙", "。"],
            "grammarNote": "Trong câu khẳng định vị ngữ tính từ, thường thêm phó từ 很 trước tính từ.",
            "distractors": ["太"],
            "wrongVi": ["Bạn khỏe không? Tôi rất khỏe.", "Bạn bận không? Tôi không bận.", "Bạn học gì? Tôi học tiếng Hán."],
            "wrongZh": ["你忙吗？我太忙。", "你忙呢？我很忙。", "你很忙吗？我不忙。"]
        },
        {
            "id": "g_2_3", "lesson": 2, "hsk": 1,
            "zh": "爸爸妈妈都很好。", "py": "Bàba māma dōu hěn hǎo.", "vi": "Bố mẹ đều rất khỏe.",
            "tokens": ["爸爸", "妈妈", "都", "很", "好", "。"],
            "grammarNote": "Phó từ 都 (đều) bổ nghĩa cho chủ ngữ số nhiều, đứng trước vị ngữ.",
            "distractors": ["也"],
            "wrongVi": ["Bố mẹ tôi cũng khỏe.", "Bố mẹ rất bận.", "Bố mẹ đi làm rồi."],
            "wrongZh": ["爸爸妈妈也很忙。", "都爸爸妈妈很好。", "爸爸妈妈很都好。"]
        },
        {
            "id": "g_2_4", "lesson": 2, "hsk": 1,
            "zh": "哥哥不忙，弟弟呢？", "py": "Gēge bù máng, dìdi ne?", "vi": "Anh trai không bận, còn em trai thì sao?",
            "tokens": ["哥哥", "不", "忙", "，", "弟弟", "呢", "？"],
            "grammarNote": "Phủ định dùng 不 (bù), câu hỏi tỉnh lược dùng [Danh từ] + 呢？",
            "distractors": ["吗"],
            "wrongVi": ["Anh trai rất bận, em trai cũng bận.", "Anh trai không khỏe, em trai khỏe không?", "Bố không bận, mẹ thì sao?"],
            "wrongZh": ["哥哥不忙，弟弟吗？", "哥哥不太忙，弟弟呢？", "不哥哥忙，弟弟呢？"]
        }
    ],

    # Lesson 3: 明天见 (Ngày mai gặp)
    # Grammar: Câu hỏi chính phản (去不去), Đoản ngữ thời gian (明天见), Đại từ chỉ định 这/那
    [
        {
            "id": "g_3_1", "lesson": 3, "hsk": 1,
            "zh": "明天见！", "py": "Míngtiān jiàn!", "vi": "Ngày mai gặp lại!",
            "tokens": ["明天", "见", "！"],
            "grammarNote": "Từ chỉ thời gian + 见: Hẹn gặp lại vào mốc thời gian đó (VD: 一会儿见, 星期一见).",
            "distractors": ["去"],
            "wrongVi": ["Hôm nay gặp nhé.", "Ngày mai bạn đi không?", "Hẹn gặp tuần sau."],
            "wrongZh": ["今天见！", "明天去！", "见明天！"]
        },
        {
            "id": "g_3_2", "lesson": 3, "hsk": 1,
            "zh": "你去不去北京？", "py": "Nǐ qù bu qù Běijīng?", "vi": "Bạn đi Bắc Kinh không?",
            "tokens": ["你", "去", "不", "去", "北京", "？"],
            "grammarNote": "Câu hỏi chính phản: Động từ + 不 + Động từ (去不去). Không dùng trợ từ 吗 ở cuối câu.",
            "distractors": ["吗"],
            "wrongVi": ["Bạn đang ở Bắc Kinh à?", "Bạn có thích Bắc Kinh không?", "Bao giờ bạn đi Bắc Kinh?"],
            "wrongZh": ["你去不去北京吗？", "你去北京不？", "你去北京去？"]
        },
        {
            "id": "g_3_3", "lesson": 3, "hsk": 1,
            "zh": "你学英语吗？不，学汉语。", "py": "Nǐ xué Yīngyǔ ma? Bù, xué Hànyǔ.", "vi": "Bạn học tiếng Anh à? Không, học tiếng Hán.",
            "tokens": ["你", "学", "英语", "吗", "？", "不", "，", "学", "汉语", "。"],
            "grammarNote": "Câu hỏi với trợ từ 吗 và câu trả lời phủ định ngắn gọn với 不.",
            "distractors": ["没"],
            "wrongVi": ["Bạn học tiếng Pháp à? Không, học tiếng Anh.", "Bạn học tiếng Hán không? Có, tôi học.", "Bạn dạy tiếng Anh à? Không."],
            "wrongZh": ["你学英语呢？不，学汉语。", "你学英语吗？没，学汉语。", "你学英语不？学汉语。"]
        },
        {
            "id": "g_3_4", "lesson": 3, "hsk": 1,
            "zh": "这是汉语书，那是英语书。", "py": "Zhè shì Hànyǔ shū, nà shì Yīngyǔ shū.", "vi": "Đây là sách tiếng Hán, kia là sách tiếng Anh.",
            "tokens": ["这", "是", "汉语", "书", "，", "那", "是", "英语", "书", "。"],
            "grammarNote": "Đại từ chỉ định 这 (đây/gần) và 那 (kia/xa) kết hợp với động từ 是.",
            "distractors": ["哪"],
            "wrongVi": ["Đây là sách tiếng Anh, kia là sách tiếng Hán.", "Đây có phải sách tiếng Hán không?", "Sách tiếng Hán ở đâu?"],
            "wrongZh": ["哪是汉语书，那是英语书。", "这是汉语书，这是英语书。", "那是汉语书，这是英语书。"]
        }
    ],

    # Lesson 4: 你去哪儿 (Bạn đi đâu đấy)
    # Grammar: Trạng ngữ thời gian/địa điểm đứng trước động từ, Đại từ 几 vs 哪儿
    [
        {
            "id": "g_4_1", "lesson": 4, "hsk": 1,
            "zh": "今天星期几？", "py": "Jīntiān xīngqī jǐ?", "vi": "Hôm nay là thứ mấy?",
            "tokens": ["今天", "星期", "几", "？"],
            "grammarNote": "Hỏi thứ trong tuần: 今天 / 明天 + 星期几？ Đại từ 几 dùng hỏi số lượng nhỏ dưới 10.",
            "distractors": ["多少"],
            "wrongVi": ["Hôm nay ngày mấy?", "Bây giờ là mấy giờ?", "Hôm nay thứ mấy bạn đi học?"],
            "wrongZh": ["今天星期多少？", "今天几星期？", "星期几今天？"]
        },
        {
            "id": "g_4_2", "lesson": 4, "hsk": 1,
            "zh": "你去哪儿？我去天安门。", "py": "Nǐ qù nǎr? Wǒ qù Tiān'ānmén.", "vi": "Bạn đi đâu đấy? Tôi đi Thiên An Môn.",
            "tokens": ["你", "去", "哪儿", "？", "我", "去", "天安门", "。"],
            "grammarNote": "Đại từ nghi vấn nơi chốn 哪儿 (nǎr): Chủ ngữ + 去 + 哪儿？",
            "distractors": ["在"],
            "wrongVi": ["Bạn ở đâu? Tôi ở Thiên An Môn.", "Bạn đi Thiên An Môn với ai?", "Bạn từ đâu tới? Tôi tới từ Thiên An Môn."],
            "wrongZh": ["你在哪儿？我去天安门。", "你去那儿？我去天安门。", "你去哪儿？我在天安门。"]
        },
        {
            "id": "g_4_3", "lesson": 4, "hsk": 1,
            "zh": "我不去，我回学校。", "py": "Wǒ bú qù, wǒ huí xuéxiào.", "vi": "Tôi không đi, tôi về trường học.",
            "tokens": ["我", "不", "去", "，", "我", "回", "学校", "。"],
            "grammarNote": "Động từ 回 (về): 回 + Địa điểm (về trường, về nhà, về nước).",
            "distractors": ["来"],
            "wrongVi": ["Tôi không đi, tôi ở trường học.", "Tôi đi trường học, bạn đi không?", "Tôi về nhà rồi."],
            "wrongZh": ["我没去，我回学校。", "我不去，我去学校。", "我不来，我回学校。"]
        },
        {
            "id": "g_4_4", "lesson": 4, "hsk": 1,
            "zh": "今天我去银行，明天去天安门。", "py": "Jīntiān wǒ qù yínháng, míngtiān qù Tiān'ānmén.", "vi": "Hôm nay tôi đi ngân hàng, ngày mai đi Thiên An Môn.",
            "tokens": ["今天", "我", "去", "银行", "，", "明天", "去", "天安门", "。"],
            "grammarNote": "Quy tắc vàng: Trạng ngữ thời gian (今天, 明天) đứng trước hoặc ngay sau chủ ngữ, trước động từ.",
            "distractors": ["在"],
            "wrongVi": ["Hôm nay tôi ở ngân hàng, ngày mai ở Thiên An Môn.", "Hôm qua tôi đi ngân hàng, hôm nay đi Thiên An Môn.", "Ngày mai tôi đi ngân hàng cùng bạn."],
            "wrongZh": ["今天我去银行，明天在天安门。", "我今天去银行，去明天天安门。", "今天我去天安门，明天去银行。"]
        }
    ],

    # Lesson 5: 这是王老师 (Đây là thầy giáo Vương)
    # Grammar: Câu chữ 是 (A 是 B), Cụm 的 sở hữu, Mẫu câu lịch sự 请...
    [
        {
            "id": "g_5_1", "lesson": 5, "hsk": 1,
            "zh": "这是王老师，这是我爸爸。", "py": "Zhè shì Wáng lǎoshī, zhè shì wǒ bàba.", "vi": "Đây là thầy Vương, đây là bố tôi.",
            "tokens": ["这", "是", "王老师", "，", "这", "是", "我", "爸爸", "。"],
            "grammarNote": "Câu chữ 是 giới thiệu người: 这 + 是 + [Danh từ xưng hô / Tên riêng].",
            "distractors": ["那"],
            "wrongVi": ["Kia là thầy Vương, kia là bố tôi.", "Đây là bố tôi, kia là thầy Vương.", "Thầy Vương là bố của tôi."],
            "wrongZh": ["那是王老师，这是我爸爸。", "这有王老师，这是我爸爸。", "王老师是这，爸爸是我。"]
        },
        {
            "id": "g_5_2", "lesson": 5, "hsk": 1,
            "zh": "请进，请坐，请喝茶。", "py": "Qǐng jìn, qǐng zuò, qǐng hē chá.", "vi": "Mời vào, mời ngồi, mời uống trà.",
            "tokens": ["请进", "，", "请坐", "，", "请喝茶", "。"],
            "grammarNote": "Từ lịch sự 请 (mời, xin) đứng đầu câu cầu khiến: 请 + Động từ.",
            "distractors": ["去"],
            "wrongVi": ["Mời vào, mời uống nước, mời ngồi.", "Xin chào, mời vào uống trà.", "Thầy giáo mời chúng tôi uống trà."],
            "wrongZh": ["去进，去坐，去喝茶。", "请坐，请进，请喝茶。", "请进，请喝茶，请坐。"]
        },
        {
            "id": "g_5_3", "lesson": 5, "hsk": 1,
            "zh": "工作忙不忙？不太忙。", "py": "Gōngzuò máng bu máng? Bú tài máng.", "vi": "Công việc bận không? Không bận lắm.",
            "tokens": ["工作", "忙", "不", "忙", "？", "不太", "忙", "。"],
            "grammarNote": "Câu hỏi chính phản với tính từ: Tính từ + 不 + Tính từ (忙不忙).",
            "distractors": ["吗"],
            "wrongVi": ["Công việc tốt không? Rất tốt.", "Bạn có bận việc không? Rất bận.", "Công việc của bạn thế nào?"],
            "wrongZh": ["工作忙不忙吗？不太忙。", "工作不忙吗？不太忙。", "工作忙忙不？不太忙。"]
        },
        {
            "id": "g_5_4", "lesson": 5, "hsk": 1,
            "zh": "我的老师是中国人。", "py": "Wǒ de lǎoshī shì Zhōngguó rén.", "vi": "Thầy giáo của tôi là người Trung Quốc.",
            "tokens": ["我", "的", "老师", "是", "中国", "人", "。"],
            "grammarNote": "Trợ từ kết cấu 的 biểu thị sở hữu: Định ngữ + 的 + Trung tâm ngữ.",
            "distractors": ["有"],
            "wrongVi": ["Thầy giáo của tôi dạy tiếng Trung.", "Thầy giáo tôi đang ở Trung Quốc.", "Tôi là học sinh của thầy giáo Trung Quốc."],
            "wrongZh": ["我老师有中国人。", "我的老师在日本人。", "中国是我的老师。"]
        }
    ]
]

# Write out lessons 6 through 30 curriculum data
LESSONS_6_TO_30_SPECS = [
    # L6: 我学习汉语
    [
        ("你叫什么名字？", "Nǐ jiào shénme míngzi?", "Bạn tên là gì?", ["你", "叫", "什么", "名字", "？"], "Đại từ nghi vấn 什么 đặt trước danh từ 名字.", ["哪"], ["Bạn họ gì?", "Bạn là ai?", "Bạn ở đâu?"], ["你叫谁名字？", "你是名字什么？", "名字你叫什么？"]),
        ("我学习汉语，汉字很难。", "Wǒ xuéxí Hànyǔ, hànzì hěn nán.", "Tôi học tiếng Hán, chữ Hán rất khó.", ["我", "学习", "汉语", "，", "汉字", "很", "难", "。"], "Động từ 学习 mang tân ngữ 汉语; Vị ngữ tính từ 很难.", ["不"], ["Tôi học tiếng Anh, phát âm rất khó.", "Tiếng Hán không khó lắm.", "Tôi viết chữ Hán rất đẹp."], ["我学汉语，汉字不难。", "我学习汉语，汉字太难。", "汉语我学，难汉字。"]),
        ("请问，你贵姓？我姓张。", "Qǐngwèn, nǐ guìxìng? Wǒ xìng Zhāng.", "Xin hỏi, bạn họ gì? Tôi họ Trương.", ["请问", "，", "你", "贵姓", "？", "我", "姓", "张", "。"], "Cách hỏi họ lịch sự: 贵姓; Trả lời dùng: 我姓 + Họ.", ["叫"], ["Xin hỏi, bạn tên gì? Tôi tên Trương.", "Bạn là người nước nào?", "Tôi là bạn của Trương Đông."], ["请问，你叫什么？我姓张。", "请问，你名字？我姓张。", "你贵姓请问？我张姓。"]),
        ("你是哪国人？我是越南人。", "Nǐ shì nǎ guó rén? Wǒ shì Yuènán rén.", "Bạn là người nước nào? Tôi là người Việt Nam.", ["你", "是", "哪", "国", "人", "？", "我", "是", "越南", "人", "。"], "Đại từ 哪 (nào): 哪 + Danh từ / Quốc gia (哪国人).", ["什么"], ["Bạn đi nước nào?", "Bạn có phải người Việt Nam không?", "Bạn biết nói tiếng nước nào?"], ["你是谁国人？我是越南人。", "你是什么国人？我是越南人。", "哪国人你是？我是越南人。"])
    ],

    # L7: 你吃什么
    [
        ("中午你去哪儿吃饭？", "Zhōngwǔ nǐ qù nǎr chīfàn?", "Buổi trưa bạn đi đâu ăn cơm?", ["中午", "你", "去", "哪儿", "吃饭", "？"], "Câu liên động: Đi đâu làm gì (去 + Địa điểm + Động từ).", ["在"], ["Buổi trưa bạn ăn cái gì?", "Buổi chiều bạn đi ăn cơm không?", "Ai đi ăn cơm cùng bạn?"], ["中午你在哪儿吃饭？", "去哪儿中午你吃饭？", "中午你吃饭哪儿？"]),
        ("我去食堂吃馒头。", "Wǒ qù shítáng chī mántou.", "Tôi đi nhà ăn ăn màn thầu.", ["我", "去", "食堂", "吃", "馒头", "。"], "Câu liên động: 去 + 食堂 + 吃馒头.", ["来"], ["Tôi ở nhà ăn ăn bánh bao.", "Tôi đi ăn cơm cùng bạn.", "Nhà ăn có bánh bao không?"], ["我在食堂吃包子。", "我去食堂买米饭。", "食堂我去吃馒头。"]),
        ("你要几个包子？我要四个。", "Nǐ yào jǐ ge bāozi? Wǒ yào sì ge.", "Bạn muốn mấy cái bánh bao? Tôi muốn 4 cái.", ["你", "要", "几", "个", "包子", "？", "我", "要", "四", "个", "。"], "Lượng từ 个 (gè) đứng sau số từ / đại từ 几: 几个包子, 四个.", ["杯"], ["Bạn ăn mấy bát cơm?", "Bánh bao bao nhiêu tiền một cái?", "Bạn có muốn ăn bánh bao không?"], ["你要多少包子？我要四个。", "你要四包子？我要四个。", "几包子你要？我要四个。"]),
        ("我喝一碗鸡蛋汤。", "Wǒ hē yì wǎn jīdàntāng.", "Tôi uống một bát canh trứng gà.", ["我", "喝", "一碗", "鸡蛋汤", "。"], "Lượng từ chỉ đồ đựng: 一碗 (một bát) + Danh từ (鸡蛋汤).", ["瓶"], ["Tôi ăn một bát cơm.", "Tôi uống một cốc trà.", "Canh trứng gà rất ngon."], ["我吃一碗鸡蛋汤。", "我喝一杯鸡蛋汤。", "一碗鸡蛋汤我喝。"])
    ],

    # L8: 苹果一斤多少钱
    [
        ("苹果一斤多少钱？", "Píngguǒ yì jīn duōshao qián?", "Táo bao nhiêu tiền một cân?", ["苹果", "一斤", "多少", "钱", "？"], "Mẫu câu hỏi giá: [Đồ vật] + [Đơn vị] + 多少钱？", ["几"], ["Táo này có ngon không?", "Một cân táo có mấy quả?", "Bạn mua mấy cân táo?"], ["苹果一斤几钱？", "多少钱一斤苹果？", "苹果多少钱一斤吗？"]),
        ("太贵了，便宜一点儿吧。", "Tài guì le, piányi yìdiǎnr ba.", "Đắt quá rồi, rẻ một chút đi mà.", ["太", "贵", "了", "，", "便宜", "一点儿", "吧", "。"], "Cảm thán: 太...了; Tính từ + 一点儿 (rẻ hơn một chút); Trợ từ 吧 biểu thị thương lượng.", ["有点儿"], ["Rẻ quá rồi, mua thêm chút đi.", "Đắt quá, tôi không mua đâu.", "Rẻ hơn thì tôi mua hai cân."], ["有点贵了，便宜一点儿吧。", "太贵了，便宜有点儿吧。", "便宜一点儿吧，真贵了。"]),
        ("我要三斤苹果和两斤香蕉。", "Wǒ yào sān jīn píngguǒ hé liǎng jīn xiāngjiāo.", "Tôi muốn 3 cân táo và 2 cân chuối.", ["我", "要", "三斤", "苹果", "和", "两斤", "香蕉", "。"], "Số từ 2 đứng trước lượng từ dùng 两 (liǎng), không dùng 二 (èr).", ["二斤"], ["Tôi mua hai cân táo và ba cân chuối.", "Táo và chuối hết bao nhiêu tiền?", "Tôi không muốn mua chuối."], ["我要三斤苹果和二斤香蕉。", "我要三苹果和两香蕉。", "三斤苹果和两斤香蕉我要。"]),
        ("一共多少钱？一共二十五块。", "Yígòng duōshao qián? Yígòng èrshíwǔ kuài.", "Tổng cộng bao nhiêu tiền? Tổng cộng 25 tệ.", ["一共", "多少", "钱", "？", "一共", "二十五块", "。"], "Phó từ 一共 (tổng cộng) + 多少钱 / Số tiền + 块 (đồng/tệ).", ["分"], ["Một cân bao nhiêu tiền?", "Bạn đưa tôi hai mươi tệ.", "Còn thừa bao nhiêu tiền thối?."], ["一共几钱？一共二十五块。", "多少钱一共？一共二十五块。", "一共多少钱？一共二十五毛。"])
    ],

    # L9: 我换人民币
    [
        ("下午我要去银行换钱。", "Xiàwǔ wǒ yào qù yínháng huàn qián.", "Buổi chiều tôi phải đi ngân hàng đổi tiền.", ["下午", "我", "要", "去", "银行", "换", "钱", "。"], "Động từ năng nguyện 要 (cần, muốn) + Động từ (去银行换钱).", ["想"], ["Buổi sáng tôi đi ngân hàng đổi tiền.", "Buổi chiều bạn có đi ngân hàng không?", "Tôi đi ngân hàng rút tiền."], ["下午我想在银行换钱。", "去银行下午我要换钱。", "下午我要在银行换钱。"]),
        ("先生，您换什么钱？", "Xiānsheng, nín huàn shénme qián?", "Thưa ông, ngài đổi tiền gì ạ?", ["先生", "，", "您", "换", "什么", "钱", "？"], "Đại từ nhân xưng tôn kính 您; 换什么钱 (đổi loại tiền gì).", ["你"], ["Thưa ông, ngài muốn đổi bao nhiêu tiền?", "Thưa ông, ngài gửi tiền gì ạ?", "Ngài có tiền mặt không?"], ["先生，你换多少钱？", "先生，您换几钱？", "您换什么钱先生？"]),
        ("我想换五百美元的人民币。", "Wǒ xiǎng huàn wǔbǎi Měiyuán de Rénmínbì.", "Tôi muốn đổi 500 đô la Mỹ lấy Nhân dân tệ.", ["我", "想", "换", "五百美元", "的", "人民币", "。"], "Cụm danh từ chữ 的: [Số tiền ngoại tệ] + 的 + 人民币.", ["有"], ["Tôi muốn đổi 500 tệ lấy đô la Mỹ.", "Tôi có năm trăm đô la Mỹ.", "Tỷ giá năm trăm đô la là bao nhiêu?"], ["我想有五百美元的人民币。", "换我想五百美元的人民币。", "我想换五百的人民币美元。"]),
        ("请等一会儿，请数一数。", "Qǐng děng yíhuìr, qǐng shǔ yi shǔ.", "Xin đợi một lát, xin hãy đếm lại.", ["请", "等", "一会儿", "，", "请", "数一数", "。"], "Cấu trúc 等一会儿 (đợi một lát); Lặp lại động từ 数一数 (đếm thử xem).", ["看"], ["Xin đợi một chút rồi đi.", "Xin mời kiểm tra lại tiền.", "Đợi một lát tôi quay lại."], ["请等一点儿，请数一数。", "请等等，请看看。", "等一会儿请，数一数请。"])
    ],

    # L10: 他住哪儿
    [
        ("王老师不在办公室，他在家呢。", "Wáng lǎoshī bú zài bàngōngshì, tā zài jiā ne.", "Thầy Vương không ở văn phòng, thầy ở nhà.", ["王老师", "不", "在", "办公室", "，", "他", "在", "家", "呢", "。"], "Giới từ 在 chỉ vị trí nơi chốn; Trợ từ 呢 ở cuối câu trần thuật biểu thị trạng thái.", ["有"], ["Thầy Vương đang ở văn phòng.", "Thầy Vương có ở nhà không?", "Thầy Vương đi về nhà rồi."], ["王老师没在办公室，他在家呢。", "王老师在办公室不，他在家呢。", "王老师在不在办公室，他在家。"]),
        ("请问，他住几号楼几门？", "Qǐngwèn, tā zhù jǐ hào lóu jǐ mén?", "Xin hỏi, thầy ấy sống ở tòa nhà số mấy, cửa số mấy?", ["请问", "，", "他", "住", "几号楼", "几门", "？"], "Cách hỏi số nhà, số tầng: 住 + 几号楼 + 几门？", ["哪"], ["Thầy ấy sống ở đâu?", "Văn phòng thầy ấy ở tầng mấy?", "Số điện thoại của thầy ấy là bao nhiêu?"], ["请问，他住在哪楼哪门？", "请问，他住多少号楼？", "他住几号楼几门请问？"]),
        ("他住在十八楼七号。", "Tā zhù zài shíbā lóu qī hào.", "Thầy ấy sống ở tầng 18 phòng số 7.", ["他", "住", "在", "十八楼", "七号", "。"], "Cấu trúc 住 + 在 + [Địa chỉ chi tiết].", ["是"], ["Thầy ấy sống ở tầng 7 phòng 18.", "Nhà thầy ấy có 18 người.", "Thầy ấy đang ở tầng 18."], ["他住在七楼十八号。", "他是十八楼七号住。", "他在十八楼七号住。"]),
        ("你知道他的电话号码吗？", "Nǐ zhīdào tā de diànhuà hàomǎ ma?", "Bạn có biết số điện thoại của thầy ấy không?", ["你", "知道", "他", "的", "电话号码", "吗", "？"], "Động từ 知道 (biết) mang tân ngữ sở hữu 他的电话号码.", ["认识"], ["Số điện thoại của bạn là bao nhiêu?", "Bạn có gọi điện cho thầy ấy không?", "Thầy ấy có điện thoại không?"], ["你认识他的电话号码吗？", "你知道他的电话号码呢？", "他的电话号码你知道吗？"])
    ]
]

# Additional 20 lessons (L11 to L30)
LESSONS_11_TO_30_DATA = [
    # L11: 我们都是留学生
    [
        ("我们不都是中国留学生。", "Wǒmen bù dōu shì Zhōngguó liúxuéshēng.", "Chúng tôi không phải tất cả đều là lưu học sinh Trung Quốc.", ["我们", "不", "都", "是", "中国", "留学生", "。"], "Phủ định bộ phận: 不都 (không phải tất cả), khác với 都不 (hoàn toàn không).", ["没"], ["Chúng tôi đều không phải lưu học sinh.", "Chúng tôi đều là lưu học sinh Trung Quốc.", "Tất cả chúng tôi đều học tiếng Trung."], ["我们都不是中国留学生。", "都不我们是中国留学生。", "我们是不都中国留学生。"]),
        ("这位是王教授，那位是马校长。", "Zhè wèi shì Wáng jiàoshòu, nà wèi shì Mǎ xiàozhǎng.", "Vị này là giáo sư Vương, vị kia là hiệu trưởng Mã.", ["这", "位", "是", "王教授", "，", "那", "位", "是", "马校长", "。"], "Lượng từ tôn kính 位 (wèi) dùng cho người có địa vị.", ["个"], ["Đây là thầy Vương, kia là thầy Mã.", "Giáo sư Vương là hiệu trưởng trường này.", "Hiệu trưởng Mã chào giáo sư Vương."], ["这个是王教授，那个是马校长。", "这位有王教授，那位有马校长。", "王教授是这位，马校长是那位。"]),
        ("我和他一起去图书馆借书。", "Wǒ hé tā yìqǐ qù túshūguǎn jiè shū.", "Tôi và cậu ấy cùng nhau đi thư viện mượn sách.", ["我", "和", "他", "一起", "去", "图书馆", "借", "书", "。"], "Cấu trúc liên động: A 和/跟 B 一起 + Động từ.", ["在"], ["Tôi đi thư viện mượn sách cho cậu ấy.", "Cậu ấy mượn sách ở thư viện.", "Chúng tôi cùng nhau đọc sách ở nhà."], ["我和他去图书馆一起借书。", "我跟他一起在图书馆借书。", "一起我和他去图书馆借书。"]),
        ("他们俩都是语言学院的新学生。", "Tāmen liǎ dōu shì Yǔyán Xuéyuàn de xīn xuésheng.", "Hai người bọn họ đều là học sinh mới của Học viện Ngôn ngữ.", ["他们俩", "都", "是", "语言学院", "的", "新学生", "。"], "Cụm 他们俩 (hai người bọn họ) + Phó từ 都 + 是.", ["个"], ["Bọn họ là học sinh cũ của trường.", "Hai người bọn họ học tiếng Trung ở đâu?", "Tất cả học sinh mới đều đến rồi."], ["他们俩是在语言学院的新学生。", "他们俩都新学生是语言学院。", "语言学院的新学生是他们俩都。"])
    ],

    # L12: 你在哪儿学习汉语
    [
        ("你在哪儿学习汉语？", "Nǐ zài nǎr xuéxí Hànyǔ?", "Bạn học tiếng Hán ở đâu?", ["你", "在", "哪儿", "学习", "汉语", "？"], "Trạng ngữ chỉ nơi chốn đứng trước động từ: 在哪儿 + 学习.", ["去"], ["Bạn học tiếng Hán với ai?", "Bạn học tiếng Hán từ bao giờ?", "Tiếng Hán của bạn học thế nào?"], ["你学习汉语在哪儿？", "你去哪儿学习汉语？", "在哪儿你学习汉语？"]),
        ("我在北京语言大学学习。", "Wǒ zài Běijīng Yǔyán Dàxué xuéxí.", "Tôi học tập tại Đại học Ngôn ngữ Bắc Kinh.", ["我", "在", "北京语言大学", "学习", "。"], "Cấu trúc: Chủ ngữ + 在 + [Địa điểm] + Động từ.", ["去"], ["Tôi đi Đại học Ngôn ngữ Bắc Kinh.", "Đại học Ngôn ngữ Bắc Kinh ở đâu?", "Tôi thích học ở Bắc Kinh."], ["我学习在北京语言大学。", "我去北京语言大学学习。", "北京语言大学我在学习。"]),
        ("你觉得汉语难不难？", "Nǐ juéde Hànyǔ nán bu nán?", "Bạn cảm thấy tiếng Hán có khó không?", ["你", "觉得", "汉语", "难", "不", "难", "？"], "Động từ 觉得 (cảm thấy) + Câu hỏi chính phản (难不难).", ["吗"], ["Bạn thấy tiếng Hán thế nào?", "Bạn có thích học tiếng Hán không?", "Bạn học tiếng Hán được bao lâu rồi?"], ["你觉得汉语难不难吗？", "你觉得汉语难吗？", "汉语你觉得难不难？"]),
        ("我觉得听和说比较容易。", "Wǒ juéde tīng hé shuō bǐjiào róngyì.", "Tôi cảm thấy nghe và nói tương đối dễ.", ["我", "觉得", "听", "和", "说", "比较", "容易", "。"], "Phó từ mức độ 比较 (tương đối, khá) đứng trước tính từ 容易.", ["很"], ["Tôi thấy đọc và viết rất khó.", "Tôi cảm thấy nghe nói không khó lắm.", "Tiếng Hán dễ hơn tiếng Anh."], ["我觉得听说都比较容易。", "听和说我觉得很比较容易。", "我觉得听和说更容易。"])
    ],

    # L13: 这是不是中药
    [
        ("这是不是中药？这是西药。", "Zhè shì bu shì zhōngyào? Zhè shì xīyào.", "Đây có phải là thuốc bắc không? Đây là thuốc tây.", ["这", "是", "不", "是", "中药", "？", "这", "是", "西药", "。"], "Câu hỏi chính phản với 是: 是不是 + Danh từ？", ["吗"], ["Đây là thuốc gì?", "Thuốc này uống thế nào?", "Bạn có mang thuốc không?"], ["这是不是中药吗？这是西药。", "这是中药不是？这是西药。", "这是中药还是西药？"]),
        ("这个箱子里边没有违禁品。", "Zhè ge xiāngzi lǐbiān méiyǒu wéijìnpǐn.", "Bên trong chiếc vali này không có đồ cấm.", ["这个", "箱子", "里边", "没有", "违禁品", "。"], "Phủ định của 有 (sở hữu / tồn hiện) bắt buộc dùng 没有, không dùng 不有.", ["不有"], ["Chiếc vali này là của ai?", "Trong vali có rất nhiều đồ dùng.", "Chiếc vali này rất nặng."], ["这个箱子里边不有违禁品。", "这个箱子里边没违禁品有。", "箱子这个里边没有违禁品。"]),
        ("这里边都是我买的日用品。", "Zhè lǐbiān dōu shì wǒ mǎi de rìyòngpǐn.", "Bên trong này đều là đồ dùng hàng ngày tôi mua.", ["这", "里边", "都", "是", "我", "买", "的", "日用品", "。"], "Cụm danh từ chữ 的: [Mệnh đề định ngữ: 我买] + 的 + [Trung tâm ngữ: 日用品].", ["有"], ["Đồ dùng hàng ngày tôi mua ở đâu?", "Trong vali có đồ dùng hàng ngày không?", "Tôi mua rất nhiều đồ dùng ở siêu thị."], ["这里边都是我买日用品。", "这里边有我买的日用品。", "我买的日用品这里边都是。"]),
        ("我还有两瓶药和一把雨伞。", "Wǒ hái yǒu liǎng píng yào hé yì bǎ yǔsǎn.", "Tôi còn có hai lọ thuốc và một chiếc ô.", ["我", "还", "有", "两瓶", "药", "和", "一把", "雨伞", "。"], "Phó từ 还 (vẫn còn); Lượng từ 瓶 (bình/lọ) và 把 (cái/chiếc ô).", ["二瓶"], ["Tôi có một chiếc ô và một lọ thuốc.", "Chiếc ô này là của bạn à?", "Bạn mua thuốc ở hiệu thuốc nào?"], ["我还由二瓶药和一把雨伞。", "我有两瓶药和一件雨伞。", "两瓶药和一把雨伞我还由。"])
    ],

    # L14: 你的车是新的还是旧的
    [
        ("你的自行车是新的还是旧的？", "Nǐ de zìxíngchē shì xīn de háishì jiù de?", "Xe đạp của bạn là xe mới hay xe cũ?", ["你", "的", "自行车", "是", "新", "的", "还是", "旧", "的", "？"], "Câu hỏi lựa chọn với 还是: A 还是 B？ Cụm chữ 的 thay thế danh từ.", ["或者"], ["Xe đạp của bạn màu gì?", "Bạn mua xe đạp ở đâu?", "Xe đạp mới này bao nhiêu tiền?"], ["你的自行车是新的或者旧的？", "你的车是新还是旧？", "自行车是你的新的还是旧的？"]),
        ("那辆蓝色的自行车是我的。", "Nà liàng lánsè de zìxíngchē shì wǒ de.", "Chiếc xe đạp màu xanh lam kia là của tôi.", ["那", "辆", "蓝色", "的", "自行车", "是", "我", "的", "。"], "Lượng từ 辆 (chiếc/xe); Cụm chữ 的 chỉ sở hữu 我的 = 我的自行车.", ["本"], ["Chiếc xe đạp màu đỏ này là của bạn à?", "Xe đạp của tôi là xe mới.", "Bạn thích xe đạp màu gì?"], ["那个蓝色的自行车是我的。", "那辆蓝色的自行车有我的。", "我的自行车是那辆蓝色的。"]),
        ("今天你喝咖啡还是喝茶？", "Jīntiān nǐ hē kāfēi háishì hē chá?", "Hôm nay bạn uống cà phê hay uống trà?", ["今天", "你", "喝", "咖啡", "还是", "喝", "茶", "？"], "Câu hỏi lựa chọn hành động: V1 + Tân ngữ 1 + 还是 + V2 + Tân ngữ 2？", ["或者"], ["Hôm nay bạn uống cà phê không?", "Bạn thích uống trà hơn hay cà phê hơn?", "Chúng ta cùng đi uống cà phê nhé."], ["今天你喝咖啡或者喝茶？", "你今天喝咖啡是喝茶？", "喝咖啡还是喝茶今天你？"]),
        ("我买了一件红色的羽绒服。", "Wǒ mǎi le yí jiàn hóngsè de yǔróngfú.", "Tôi đã mua một chiếc áo lông vũ màu đỏ.", ["我", "买", "了", "一件", "红色", "的", "羽绒服", "。"], "Trợ từ động thái 了 biểu thị hành động đã hoàn thành; Lượng từ 件.", ["个"], ["Chiếc áo lông vũ màu đỏ này rất đẹp.", "Tôi muốn mua áo lông vũ màu đen.", "Bạn mua chiếc áo này bao nhiêu tiền?"], ["我买一件红色的羽绒服了。", "我买了一个红色的羽绒服。", "一件红色的羽绒服我买了。"])
    ],

    # L15: 你家有几口人
    [
        ("你家有几口人？我家有四口人。", "Nǐ jiā yǒu jǐ kǒu rén? Wǒ jiā yǒu sì kǒu rén.", "Nhà bạn có mấy người? Nhà tôi có 4 người.", ["你", "家", "有", "几口", "人", "？", "我", "家", "有", "四口", "人", "。"], "Lượng từ 口 dùng cho nhân khẩu gia đình: 几口人.", ["个"], ["Gia đình bạn sống ở đâu?", "Gia đình bạn có những ai?", "Nhà bạn có anh chị em không?"], ["你家有几个口人？我家有四个人。", "你家几人有？我家有四人。", "家你有几口人？我家有四口人。"]),
        ("全班一共有二十个学生。", "Quán bān yígòng yǒu èrshí ge xuésheng.", "Cả lớp tổng cộng có 20 học sinh.", ["全班", "一共", "有", "二十个", "学生", "。"], "Cấu trúc 全 + Danh từ (toàn bộ, cả); Phó từ 一共.", ["都"], ["Cả lớp đều là học sinh chăm chỉ.", "Lớp bạn có bao nhiêu học sinh nam?", "Học sinh trong lớp đều là người Việt Nam."], ["全班都由二十个学生。", "一共全班有二十个学生。", "二十个学生全班一共有。"]),
        ("你有兄弟姐妹吗？我没有。", "Nǐ yǒu xiōngdì jiěmèi ma? Wǒ méiyǒu.", "Bạn có anh chị em không? Tôi không có.", ["你", "有", "兄弟姐妹", "吗", "？", "我", "没有", "。"], "Phủ định của động từ 有 là 没有 (không được dùng 不有).", ["不有"], ["Gia đình bạn có mấy anh chị em?", "Anh trai bạn làm nghề gì?", "Tôi có hai người chị gái."], ["你有兄弟姐妹吗？我不有。", "你有兄弟姐妹不？我没有。", "兄弟姐妹你有吗？我没有。"]),
        ("这是我们全家的照片。", "Zhè shì wǒmen quán jiā de zhàopiàn.", "Đây là bức ảnh chụp cả gia đình chúng tôi.", ["这", "是", "我们", "全家", "的", "照片", "。"], "Cụm danh từ: 全家 (cả nhà) + 的 + 照片 (bức ảnh).", ["那"], ["Bức ảnh này chụp ở đâu?", "Gia đình bạn chụp ảnh khi nào?", "Trong ảnh có những ai?"], ["那是我们全家的照片。", "这是我们全家照片的。", "我们全家的照片是这。"])
    ]
]

# Generate L16 through L30 programmatically with high precision
MORE_LESSONS = [
    # L16: 你常去图书馆吗？
    [
        ("我常常在宿舍复习生词。", "Wǒ chángcháng zài sùshè fùxí shēngcí.", "Tôi thường ôn tập từ mới ở ký túc xá.", ["我", "常常", "在", "宿舍", "复习", "生词", "。"], "Phó từ chỉ tần suất 常常 đứng trước vị ngữ / trạng ngữ nơi chốn.", ["去"], ["Tôi thường đi thư viện đọc sách.", "Ký túc xá của tôi rất yên tĩnh.", "Bạn có hay ôn bài ở ký túc xá không?"], ["我在宿舍常常复习生词。", "我常在宿舍常常复习生词。", "常常我复习生词在宿舍。"]),
        ("有时候去，有时候不去。", "Yǒushíhou qù, yǒushíhou bú qù.", "Có lúc thì đi, có lúc không đi.", ["有时候", "去", "，", "有时候", "不", "去", "。"], "Cấu trúc 有时候... 有时候... biểu thị sự xen kẽ.", ["很"], ["Tôi thường xuyên đi vào buổi tối.", "Thỉnh thoảng tôi mới đi thư viện.", "Lúc nào bạn cũng đi à?"], ["有的去，有的时候不去。", "有时候去，很时候不去。", "去有时候，不去有时候。"]),
        ("星期六我们一起去公园玩儿吧。", "Xīngqīliù wǒmen yìqǐ qù gōngyuán wánr ba.", "Thứ bảy chúng mình cùng đi công viên chơi nhé.", ["星期六", "我们", "一起", "去", "公园", "玩儿", "吧", "。"], "Thời gian + Chủ ngữ + 一起 + Động từ + 吧.", ["在"], ["Chủ nhật bạn có đi công viên không?", "Công viên này rất đẹp và rộng.", "Chúng mình đi công viên bằng xe bus nhé."], ["星期六我们一起在公园玩儿吧。", "我们星期六去公园一起玩儿吧。", "星期六一起我们去公园玩儿吧。"]),
        ("晚上我一般上网跟朋友聊天儿。", "Wǎnshang wǒ yìbān shàngwǎng gēn péngyou liáotiānr.", "Buổi tối tôi thường lên mạng nói chuyện với bạn bè.", ["晚上", "我", "一般", "上网", "跟", "朋友", "聊天儿", "。"], "Phó từ 一般 (thường thường, nhìn chung); Giới từ 跟 (cùng với ai).", ["和"], ["Buổi tối tôi lên mạng nghe nhạc.", "Bạn hay nói chuyện với ai?", "Tôi không hay lên mạng vào ban đêm."], ["晚上我一般跟朋友上网聊天儿。", "我一般晚上上网跟朋友聊天儿。", "晚上我一般上网和朋友说。"])
    ],

    # L17: 他在做什么呢？
    [
        ("他在做什么呢？他正在听音乐呢。", "Tā zài zuò shénme ne? Tā zhèngzài tīng yīnyuè ne.", "Cậu ấy đang làm gì thế? Cậu ấy đang nghe nhạc.", ["他", "在", "做", "什么", "呢", "？", "他", "正在", "听", "音乐", "呢", "。"], "Hành động đang tiếp diễn: 正在 / 在 + Động từ + 呢.", ["了"], ["Cậu ấy nghe nhạc xong chưa?", "Cậu ấy thích nghe loại nhạc gì?", "Bây giờ bạn đang làm gì thế?"], ["他在做什么呢？他听了音乐呢。", "他在做呢什么？他正在听音乐。", "正在他听音乐呢。"]),
        ("外面正下着雨呢。", "Wàimiàn zhèng xià zhe yǔ ne.", "Bên ngoài trời đang mưa đấy.", ["外面", "正", "下", "着", "雨", "呢", "。"], "Cấu trúc biểu thị trạng thái đang tiếp diễn: 正 + V + 着 + Tân ngữ + 呢.", ["了"], ["Bên ngoài trời đã tạnh mưa rồi.", "Trời sắp đổ mưa to rồi.", "Hôm nay trời có mưa không?"], ["外面正下了雨呢。", "外面下雨正着呢。", "正外面下着雨呢。"]),
        ("玛丽正在宿舍写汉字作业呢。", "Mǎlì zhèngzài sùshè xiě hànzì zuòyè ne.", "Mary đang ở ký túc xá viết bài tập chữ Hán.", ["玛丽", "正在", "宿舍", "写", "汉字", "作业", "呢", "。"], "Chủ ngữ + 正在 + [Nơi chốn] + Động từ + Tân ngữ + 呢.", ["看"], ["Mary đã làm xong bài tập chưa?", "Mary đang đọc sách ở thư viện.", "Bài tập chữ Hán hôm nay rất khó."], ["玛丽在宿舍正写汉字作业呢。", "玛丽正在宿舍写了汉字作业。", "正在玛丽在宿舍写汉字作业呢。"]),
        ("你找他有什么事吗？", "Nǐ zhǎo tā yǒu shénme shì ma?", "Bạn tìm cậu ấy có việc gì không?", ["你", "找", "他", "有", "什么", "事", "吗", "？"], "Câu liên động biểu thị mục đích: 找他 + 有什么事.", ["去"], ["Bạn có việc gì cần tôi giúp không?", "Cậu ấy có ở phòng không?", "Khi nào cậu ấy quay lại?"], ["你找他做什么事吗？", "你找他在有什么事吗？", "有什么事你找他吗？"])
    ],

    # L18: 我去邮局寄包裹
    [
        ("我去邮局顺便买几张邮票。", "Wǒ qù yóujú shùnbiàn mǎi jǐ zhāng yóupiào.", "Tôi đi bưu điện tiện thể mua mấy con tem.", ["我", "去", "邮局", "顺便", "买", "几张", "邮票", "。"], "Phó từ 顺便 (tiện thể, nhân tiện) đứng trước động từ thứ hai.", ["就"], ["Tôi đi bưu điện gửi bưu phẩm.", "Bưu điện có bán tem không?", "Bạn mua giúp tôi mấy con tem nhé."], ["我去邮局买顺便几张邮票。", "我顺便去邮局买几张邮票。", "去邮局我顺便买几张邮票。"]),
        ("麻烦你帮我寄一封信。", "Máfan nǐ bāng wǒ jì yì fēng xìn.", "Làm phiền bạn gửi giúp tôi một bức thư.", ["麻烦", "你", "帮", "我", "寄", "一封", "信", "。"], "Cấu trúc nhờ vả lịch sự: 麻烦你 + 帮我 + Động từ; Lượng từ 封 (bức thư).", ["请"], ["Bạn gửi thư cho ai thế?", "Lá thư này gửi đi đâu?", "Cảm ơn bạn đã giúp tôi gửi thư."], ["麻烦你请我寄一封信。", "请你帮我麻烦寄一封信。", "帮我麻烦你寄一封信。"]),
        ("明天咱们一起去外文书店吧。", "Míngtiān zánmen yìqǐ qù wàiwén shūdiàn ba.", "Ngày mai chúng mình cùng đi hiệu sách ngoại văn nhé.", ["明天", "咱们", "一起", "去", "外文书店", "吧", "。"], "Đại từ 咱们 (chúng ta / bao gồm cả người nghe); 一起 + Động từ.", ["我们"], ["Hiệu sách ngoại văn ở đâu?", "Bạn muốn mua sách gì ở hiệu sách?", "Hôm nay tôi bận, mai đi nhé."], ["明天我们一起在外文书店吧。", "咱们明天一起去外文书店吧。", "明天咱们去外文书店一起吧。"]),
        ("这个包裹寄到美国要多少钱？", "Zhè ge bāoguǒ jì dào Měiguó yào duōshao qián?", "Bưu phẩm này gửi đến Mỹ hết bao nhiêu tiền?", ["这个", "包裹", "寄到", "美国", "要", "多少", "钱", "？"], "Động từ kết hợp giới từ 寄到 (gửi đến) + Địa điểm.", ["在"], ["Bưu phẩm này gửi bằng đường hàng không à?", "Mất bao lâu bưu phẩm mới tới Mỹ?", "Bạn gửi bưu phẩm cho ai ở Mỹ?"], ["这个包裹寄在美国要多少钱？", "这个包裹要寄到美国多少钱？", "寄到美国这个包裹要多少钱？"])
    ],

    # L19: 可以试试吗？
    [
        ("这件羽绒服我可以试试吗？", "Zhè jiàn yǔróngfú wǒ kěyǐ shìshi ma?", "Chiếc áo lông vũ này tôi có thể thử một chút không?", ["这件", "羽绒服", "我", "可以", "试试", "吗", "？"], "Động từ năng nguyện 可以 (có thể); Lặp lại động từ 试试 (thử một chút).", ["能"], ["Chiếc áo này có cỡ lớn hơn không?", "Chiếc áo này giá bao nhiêu tiền?", "Tôi không thích màu áo này."], ["这件羽绒服我能试试吗？", "这件羽绒服我可以试一试吗？", "我可以试试这件羽绒服吗？"]),
        ("这件衣服有一点儿长，不太合适。", "Zhè jiàn yīfu yǒuyìdiǎnr cháng, bú tài héshì.", "Chiếc áo này hơi dài một chút, không vừa lắm.", ["这件", "衣服", "有一点儿", "长", "，", "不太", "合适", "。"], "Phó từ 有一点儿 (yǒuyìdiǎnr) đứng trước tính từ biểu thị ý không hài lòng.", ["一点儿"], ["Chiếc áo này rất vừa và đẹp.", "Chiếc áo này có màu khác không?", "Bạn mặc chiếc áo này rất hợp."], ["这件衣服一点儿长，不太合适。", "这件衣服长有一点儿，不太合适。", "这件衣服有点长，不太合适。"]),
        ("肥瘦正合适，颜色也很好看。", "Féishòu zhèng héshì, yánsè yě hěn hǎokàn.", "Rộng chật vừa vặn, màu sắc cũng rất đẹp.", ["肥瘦", "正", "合适", "，", "颜色", "也", "很", "好看", "。"], "Từ ghép 肥瘦 (độ rộng chật); Phó từ 正 (vừa đúng lúc/mức).", ["太"], ["Chiếc áo này hơi chật một chút.", "Bạn có thích màu này không?", "Màu này không hợp với bạn lắm."], ["肥瘦太合适，颜色也很好看。", "肥瘦正合适，颜色太好看。", "正合适肥瘦，颜色也很好看。"]),
        ("太贵了，便宜一点儿我就买。", "Tài guì le, piányi yìdiǎnr wǒ jiù mǎi.", "Đắt quá, rẻ hơn một chút là tôi mua ngay.", ["太", "贵", "了", "，", "便宜", "一点儿", "我", "就", "买", "。"], "Tính từ + 一点儿; Phó từ 就 biểu thị điều kiện dẫn đến hành động ngay.", ["有一点儿"], ["Rẻ quá rồi, tôi mua hai chiếc.", "Nếu đắt quá thì tôi không mua đâu.", "Cửa hàng này bán đồ rất rẻ."], ["太贵了，便宜有一点儿我就买。", "有点贵了，便宜一点儿我就买。", "太贵了，便宜一点儿我才买。"])
    ],

    # L20: 祝你生日快乐
    [
        ("今天是我朋友二十岁的生日。", "Jīntiān shì wǒ péngyou èrshí suì de shēngrì.", "Hôm nay là sinh nhật tuổi 20 của bạn tôi.", ["今天", "是", "我", "朋友", "二十岁", "的", "生日", "。"], "Cách nói tuổi: Số từ + 岁; Cụm định ngữ chỉ sở hữu với 的.", ["年"], ["Hôm nay là sinh nhật của ai?", "Bạn tổ chức sinh nhật ở đâu?", "Chúc bạn sinh nhật vui vẻ!"], ["今天是我的朋友二十年的生日。", "今天我朋友二十岁的生日是。", "我朋友二十岁的生日是今天。"]),
        ("祝你生日快乐，学习进步！", "Zhù nǐ shēngrì kuàilè, xuéxí jìnbù!", "Chúc bạn sinh nhật vui vẻ, học tập tiến bộ!", ["祝", "你", "生日快乐", "，", "学习", "进步", "！"], "Câu chúc tụng: 祝你 + [Lời chúc tốt đẹp].", ["请"], ["Chúc mừng năm mới, vạn sự như ý!", "Cảm ơn bạn đã đến dự sinh nhật.", "Hôm nay bạn nhận được nhiều quà không?"], ["请你生日快乐，学习进步！", "祝你快乐生日，进步学习！", "生日快乐祝你，学习进步！"]),
        ("我们打算晚上开一个生日晚会。", "Wǒmen dǎsuàn wǎnshang kāi yí ge shēngrì wǎnhuì.", "Chúng tôi dự định tối nay tổ chức một buổi tiệc sinh nhật.", ["我们", "打算", "晚上", "开", "一个", "生日晚会", "。"], "Động từ 打算 (dự định, lên kế hoạch) + Động từ 开 (tổ chức).", ["想"], ["Buổi tiệc sinh nhật diễn ra ở đâu?", "Bạn có mời nhiều bạn bè không?", "Tối nay chúng mình đi ăn nhà hàng nhé."], ["我们想晚上开一个生日晚会。", "晚上我们打算开一个生日晚会。", "我们打算开一个生日晚会晚上。"]),
        ("我送给你一个漂亮的生日蛋糕。", "Wǒ sòng gěi nǐ yí ge piàoliang de shēngrì dàngāo.", "Tôi tặng cho bạn một chiếc bánh sinh nhật thật đẹp.", ["我", "送给", "你", "一个", "漂亮", "的", "生日蛋糕", "。"], "Động từ mang 2 tân ngữ (Tân ngữ gián tiếp + Tân ngữ trực tiếp): 送给 + 你 + 一个蛋糕.", ["买"], ["Bánh sinh nhật này ngon lắm.", "Ai mua chiếc bánh sinh nhật này?", "Tôi nhận được rất nhiều quà sinh nhật."], ["我买给你一个漂亮的生日蛋糕。", "我送你一个漂亮的生日蛋糕给。", "一个漂亮的生日蛋糕我送给你。"])
    ],

    # L21: 我们明天七点一刻出发
    [
        ("现在几点？现在差一刻八点。", "Xiànzài jǐ diǎn? Xiànzài chà yí kè bā diǎn.", "Bây giờ là mấy giờ? Bây giờ là 8 giờ kém 15 phút.", ["现在", "几点", "？", "现在", "差一刻", "八点", "。"], "Cách nói giờ kém: 差 + Số phút/Số khắc + Giờ (差一刻八点).", ["多少"], ["Bây giờ là mấy giờ rồi?", "Mấy giờ chúng ta xuất phát?", "Đồng hồ của bạn chạy nhanh hay chậm?"], ["现在多少点？现在差一刻八点。", "现在几点？现在八点差一刻。", "几点现在？现在差一刻八点。"]),
        ("我们明天早上七点一刻在校门口集合。", "Wǒmen míngtiān zǎoshang qī diǎn yí kè zài xiàoménkǒu jíhé.", "Sáng mai 7 giờ 15 chúng mình tập trung ở cổng trường.", ["我们", "明天早上", "七点一刻", "在", "校门口", "集合", "。"], "Trật tự thời gian từ lớn đến nhỏ (明天 -> 早上 -> 七点一刻); Trạng ngữ nơi chốn đứng trước động từ.", ["去"], ["Mấy giờ bạn đến cổng trường?", "Chúng ta tập trung ở đâu?", "Ngày mai ai đi cùng chúng mình?"], ["我们明天早上七点一刻去校门口集合。", "明天早上七点一刻我们在校门口集合。", "我们在校门口集合明天早上七点一刻。"]),
        ("爬山的时候大家一定要注意安全。", "Páshān de shíhou dàjiā yídìng yào zhùyì ānquán.", "Lúc leo núi mọi người nhất định phải chú ý an toàn.", ["爬山", "的", "时候", "大家", "一定", "要", "注意", "安全", "。"], "Cấu trúc thời gian: [Hành động] + 的时候 (Khi, lúc làm gì).", ["了"], ["Hôm nay chúng mình đi leo núi rất vui.", "Núi này cao bao nhiêu mét?", "Khi leo núi nhớ mang theo nước uống."], ["爬山的时候大家一定要安全注意。", "大家爬山的时候一定要注意安全。", "爬山了时候大家一定要注意安全。"]),
        ("回来的路上我们常常聊天儿。", "Huílái de lùshang wǒmen chángcháng liáotiānr.", "Trên đường trở về chúng tôi thường trò chuyện vui vẻ.", ["回来", "的", "路上", "我们", "常常", "聊天儿", "。"], "Cụm danh từ chỉ nơi chốn/hoàn cảnh: 在...的路上 (Trên đường...).", ["中"], ["Mấy giờ các bạn về đến trường?", "Chuyến đi hôm nay thế nào?", "Trên đường về xe có đông không?"], ["回来的路上我们常聊天儿。", "我们在回来的路上常常聊天儿。", "回来的路上我们聊天儿常常。"])
    ],

    # L22: 我打算请老师教我京剧
    [
        ("我打算请老师教我唱京剧。", "Wǒ dǎsuàn qǐng lǎoshī jiāo wǒ chàng jīngjù.", "Tôi dự định nhờ thầy giáo dạy tôi hát Kinh kịch.", ["我", "打算", "请", "老师", "教", "我", "唱", "京剧", "。"], "Câu kiêm ngữ: Tân ngữ của động từ thứ nhất (老师) là chủ ngữ của động từ thứ hai (教).", ["让"], ["Thầy giáo có dạy Kinh kịch không?", "Bạn học Kinh kịch được bao lâu rồi?", "Tôi rất thích xem Kinh kịch."], ["我打算让老师教我唱京剧。", "老师请我打算教我唱京剧。", "我打算请老师教我唱京剧吗。"]),
        ("老师让我明天下午去他办公室。", "Lǎoshī ràng wǒ míngtiān xiàwǔ qù tā bàngōngshì.", "Thầy giáo bảo tôi chiều mai đến văn phòng của thầy.", ["老师", "让", "我", "明天下午", "去", "他", "办公室", "。"], "Câu kiêm ngữ với động từ cầu khiến 让 (ràng - bảo, cho phép).", ["叫"], ["Thầy giáo tìm bạn có việc gì không?", "Chiều mai bạn có rảnh không?", "Văn phòng thầy giáo ở tầng mấy?"], ["老师叫我明天下午去他办公室。", "明天下午老师让我去他办公室。", "老师让我去他办公室明天下午。"]),
        ("爸爸叫我早点儿回宿舍休息。", "Bàba jiào wǒ zǎodiǎnr huí sùshè xiūxi.", "Bố bảo tôi về ký túc xá nghỉ ngơi sớm một chút.", ["爸爸", "叫", "我", "早点儿", "回", "宿舍", "休息", "。"], "Câu kiêm ngữ với 叫 (jiào - bảo, kêu); Phó từ 早点儿 (sớm một chút).", ["请"], ["Bố bạn gọi điện cho bạn khi nào?", "Bạn có hay về ký túc xá muộn không?", "Nghỉ ngơi sớm rất tốt cho sức khỏe."], ["爸爸请我早点儿回宿舍休息。", "爸爸叫我早点儿在宿舍休息。", "早点儿爸爸叫我回宿舍休息。"]),
        ("我们请玛丽唱一首中国歌吧。", "Wǒmen qǐng Mǎlì chàng yì shǒu Zhōngguó gē ba.", "Chúng mình mời Mary hát một bài hát Trung Quốc đi.", ["我们", "请", "玛丽", "唱", "一首", "中国", "歌", "吧", "。"], "Câu kiêm ngữ với 请; Lượng từ 首 (bài hát): 一首歌.", ["个"], ["Mary hát có hay không?", "Bạn biết hát bài hát tiếng Trung nào không?", "Chúng ta cùng hát một bài nhé."], ["我们让玛丽唱一首中国歌吧。", "我们请玛丽唱一个中国歌吧。", "请玛丽唱一首中国歌吧我们。"])
    ],

    # L23: 学校里边有邮局吗？
    [
        ("学校里边有邮局和超市吗？", "Xuéxiào lǐbiān yǒu yóujú hé chāoshì ma?", "Bên trong trường học có bưu điện và siêu thị không?", ["学校", "里边", "有", "邮局", "和", "超市", "吗", "？"], "Câu tồn hiện: Nơi chốn (学校里边) + 有 + Sự vật (邮局和超市).", ["在"], ["Bưu điện của trường ở chỗ nào?", "Siêu thị trong trường có to không?", "Bạn đi bưu điện hay đi siêu thị?"], ["学校里边在邮局和超市吗？", "邮局和超市在学校里边吗？", "学校里边有邮局吗和超市？"]),
        ("邮局在图书馆的东边，教学楼后边。", "Yóujú zài túshūguǎn de dōngbiān, jiàoxuélóu hòubiān.", "Bưu điện ở phía đông thư viện, phía sau tòa nhà học.", ["邮局", "在", "图书馆", "的", "东边", "，", "教学楼", "后边", "。"], "Phương vị từ: 东边 (phía đông), 后边 (phía sau).", ["有"], ["Thư viện ở phía nào của trường?", "Bưu điện cách giảng đường có xa không?", "Tòa nhà học ở đâu?"], ["邮局有图书馆的东边，教学楼后边。", "图书馆的东边在邮局，教学楼后边。", "邮局在东边图书馆，后边教学楼。"]),
        ("从这儿到银行走路只要五分钟。", "Cóng zhèr dào yínháng zǒulù zhǐ yào wǔ fēnzhōng.", "Từ đây đến ngân hàng đi bộ chỉ mất 5 phút.", ["从", "这儿", "到", "银行", "走路", "只", "要", "五分钟", "。"], "Cấu trúc khoảng cách: 从...到... (từ... đến...); 只要 (chỉ cần).", ["离"], ["Ngân hàng có gần đây không?", "Đi xe bus đến ngân hàng mất bao lâu?", "Từ trường học đến ngân hàng đi đường nào?"], ["离这儿到银行走路只要五分钟。", "从这儿到银行走路只有五分钟。", "走路从这儿到银行只要五分钟。"]),
        ("往前面走一百米就是那个书店。", "Wǎng qiánmiàn zǒu yìbǎi mǐ jiù shì nà ge shūdiàn.", "Đi về phía trước 100 mét chính là hiệu sách đó.", ["往", "前面", "走", "一百米", "就", "是", "那个", "书店", "。"], "Giới từ chỉ hướng 往: 往 + Phương vị từ + Động từ (往前面走).", ["从"], ["Hiệu sách đó nằm ở bên trái hay bên phải?", "Đi bộ đến hiệu sách mất bao nhiêu mét?", "Bạn có biết hiệu sách đó không?"], ["从前面走一百米就是那个书店。", "往前面走一百米有那个书店。", "前面往走一百米就是那个书店。"])
    ],

    # L24: 我想学太极拳
    [
        ("老师，我想学太极拳，可以吗？", "Lǎoshī, wǒ xiǎng xué tàijíquán, kěyǐ ma?", "Thầy ơi, em muốn học Thái Cực Quyền, được không ạ?", ["老师", "，", "我", "想", "学", "太极拳", "，", "可以", "吗", "？"], "Động từ năng nguyện 想 (muốn) và câu hỏi xin phép: 可以吗？", ["会"], ["Thầy có dạy Thái Cực Quyền không ạ?", "Lớp Thái Cực Quyền khai giảng khi nào?", "Học Thái Cực Quyền có khó không thầy?"], ["老师，我会学太极拳，可以吗？", "老师，我想学太极拳，能吗？", "老师，我想学太极拳可以不？"]),
        ("下星期一你可以来我们班报名。", "Xià xīngqīyī nǐ kěyǐ lái wǒmen bān bàomíng.", "Thứ hai tuần sau bạn có thể đến lớp chúng tôi đăng ký.", ["下星期一", "你", "可以", "来", "我们班", "报名", "。"], "Động từ năng nguyện 可以 (có thể / được phép); 来 + Nơi chốn + Động từ.", ["想"], ["Đăng ký học Thái Cực Quyền ở đâu?", "Học phí bao nhiêu tiền một khóa?", "Thứ hai tuần sau mấy giờ bắt đầu học?"], ["下星期一你想来我们班报名。", "你可以下星期一来我们班报名。", "下星期一你可以去我们班报名。"]),
        ("一节课要上多长时间？一个小时。", "Yì jié kè yào shàng duō cháng shíjiān? Yí ge xiǎoshí.", "Một tiết học phải học trong bao lâu? Một tiếng đồng hồ.", ["一节课", "要", "上", "多长时间", "？", "一个小时", "。"], "Hỏi thời lượng: 多长时间？ Lượng từ tiết học 节; 一个小时 (1 giờ).", ["多少"], ["Mỗi tuần học mấy tiết?", "Mấy giờ tan học?", "Học một tiếng có mệt không?"], ["一节课要上多少时间？一个小时。", "一节课要上多长的时间？一个小时。", "多长时间一节课要上？一个小时。"]),
        ("我会说一点儿汉语，也能听懂。", "Wǒ huì shuō yìdiǎnr Hànyǔ, yě néng tīngdǒng.", "Tôi biết nói một chút tiếng Hán, cũng có thể nghe hiểu.", ["我", "会", "说", "一点儿", "汉语", "，", "也", "能", "听懂", "。"], "Phân biệt 会 (biết nhờ học tập) và 能 (năng lực làm được).", ["可以"], ["Bạn học tiếng Hán được bao lâu rồi?", "Người Trung Quốc nói chuyện bạn có hiểu không?", "Tôi chỉ biết viết chữ Hán, không biết nói."], ["我可以说明天汉语，也能听懂。", "我会说一点儿汉语，也可以听懂。", "我能说一点儿汉语，也会听懂。"])
    ],

    # L25: 她学得很好
    [
        ("她太极拳打得真好！", "Tā tàijíquán dǎ de zhēn hǎo!", "Cô ấy đánh Thái Cực Quyền thật là giỏi!", ["她", "太极拳", "打", "得", "真", "好", "！"], "Bổ ngữ trạng thái: Động từ + 得 + Cụm miêu tả; Tân ngữ đặt trước động từ.", ["的"], ["Cô ấy học Thái Cực Quyền ở đâu?", "Cô ấy tập Thái Cực Quyền bao lâu rồi?", "Động tác của cô ấy rất đẹp mắt."], ["她太极拳打的真好！", "她打得太极拳真好！", "太极拳她打得很真好！"]),
        ("她说汉语说得非常流利。", "Tā shuō Hànyǔ shuō de fēicháng liúlì.", "Cô ấy nói tiếng Hán nói rất lưu loát.", ["她", "说", "汉语", "说", "得", "非常", "流利", "。"], "Quy tắc khi mang tân ngữ: V + O + V + 得 + Cụm miêu tả.", ["得"], ["Tiếng Hán của cô ấy rất chuẩn.", "Cô ấy học tiếng Hán rất chăm chỉ.", "Cô ấy nói tiếng Hán nhanh như người bản xứ."], ["她说汉语得非常流利。", "她说汉语非常流利说得。", "她汉语说得说非常流利。"]),
        ("他每天早上起得很早去跑步。", "Tā měitiān zǎoshang qǐ de hěn zǎo qù pǎobù.", "Anh ấy mỗi sáng đều dậy rất sớm để đi chạy bộ.", ["他", "每天", "早上", "起", "得", "很早", "去", "跑步", "。"], "Bổ ngữ trạng thái chỉ thói quen / kết quả: 起得很早.", ["的地"], ["Buổi sáng anh ấy chạy bộ ở đâu?", "Mấy giờ anh ấy thức dậy?", "Chạy bộ buổi sáng rất tốt cho sức khỏe."], ["他每天早上起的很早去跑步。", "每天早上他起得早很去跑步。", "他每天早上去跑步起得很早。"]),
        ("弟弟跑得不快，但是很有劲儿。", "Dìdi pǎo de bú kuài, dànshì hěn yǒu jìnr.", "Em trai chạy không nhanh, nhưng rất có sức.", ["弟弟", "跑", "得", "不快", "，", "但是", "很", "有劲儿", "。"], "Dạng phủ định của bổ ngữ trạng thái: V + 得 + 不 + Tính từ (跑得不快).", ["没"], ["Em trai chạy nhanh nhất lớp.", "Em trai có thích thể thao không?", "Em trai chạy bộ mệt rồi."], ["弟弟跑得没快，但是很有劲儿。", "弟弟跑不快得，但是很有劲儿。", "弟弟没跑得快，但是很有劲儿。"])
    ],

    # L26: 田芳去哪儿了？
    [
        ("田芳去哪儿了？她去同学家了。", "Tián Fāng qù nǎr le? Tā qù tóngxué jiā le.", "Điền Phương đi đâu rồi? Cô ấy đến nhà bạn học rồi.", ["田芳", "去", "哪儿", "了", "？", "她", "去", "同学", "家", "了", "。"], "Trợ từ động thái 了 biểu thị hành động đã xảy ra / thay đổi trạng thái.", ["过"], ["Điền Phương có ở nhà không?", "Điền Phương đi với ai?", "Bao giờ Điền Phương về nhà?"], ["田芳去哪儿过？她去同学家过。", "田芳去了哪儿？她去同学家了。", "去哪儿了田芳？她去同学家了。"]),
        ("我买了一本很厚的汉英词典。", "Wǒ mǎi le yì běn hěn hòu de Hàn-Yīng cídiǎn.", "Tôi đã mua một cuốn từ điển Hán-Anh rất dày.", ["我", "买", "了", "一本", "很厚", "的", "汉英词典", "。"], "Cấu trúc: V + 了 + Số lượng + Định ngữ + Tân ngữ (买了一本词典).", ["在"], ["Cuốn từ điển này giá bao nhiêu tiền?", "Bạn mua từ điển ở hiệu sách nào?", "Từ điển Hán-Anh này rất có ích."], ["我买一本很厚的汉英词典了。", "我买了一个很厚的汉英词典。", "一本很厚的汉英词典我买了。"]),
        ("昨天晚上我没有看电影。", "Zuótiān wǎnshang wǒ méiyǒu kàn diànyǐng.", "Tối hôm qua tôi không xem phim.", ["昨天晚上", "我", "没有", "看", "电影", "。"], "Phủ định của hành động trong quá khứ bắt buộc dùng 没有 + V (KHÔNG dùng 不+V+了).", ["不看了"], ["Tối hôm qua bạn làm gì?", "Bộ phim hôm qua có hay không?", "Tôi đi xem phim cùng bạn bè."], ["昨天晚上我不看电影了。", "昨天晚上我没看了电影。", "我昨天晚上看电影没有。"]),
        ("你吃晚饭了没有？还没吃呢。", "Nǐ chī wǎnfàn le méiyǒu? Hái méi chī ne.", "Bạn đã ăn cơm tối chưa? Vẫn chưa ăn.", ["你", "吃", "晚饭", "了", "没有", "？", "还", "没", "吃", "呢", "。"], "Câu hỏi chính phản về hành động đã xảy ra: [Hành động] + 了没有？", ["吗"], ["Cơm tối hôm nay có món gì?", "Bạn ăn cơm tối ở đâu?", "Chúng mình cùng đi ăn tối nhé."], ["你吃晚饭了么？还没吃呢。", "你吃了晚饭没有吗？还没吃呢。", "晚饭你吃了没有？还没吃呢。"])
    ],

    # L27: 玛丽哭了
    [
        ("玛丽，你怎么了？为什么哭了？", "Mǎlì, nǐ zěnme le? Wèishénme kū le?", "Mary, bạn bị làm sao thế? Sao lại khóc?", ["玛丽", "，", "你", "怎么", "了", "？", "为什么", "哭", "了", "？"], "Câu hỏi thăm dò tình trạng: 怎么了？ và nguyên nhân: 为什么...了？", ["什么"], ["Mary cảm thấy thế nào rồi?", "Có chuyện gì xảy ra với Mary thế?", "Đừng khóc nữa, có chuyện gì kể tôi nghe."], ["玛丽，你什么了？为什么哭了？", "玛丽，你怎么呢？为什么哭了？", "为什么哭了玛丽，你怎么了？"]),
        ("因为我感冒了，头疼、发烧。", "Yīnwèi wǒ gǎnmào le, tóuténg, fāshāo.", "Bởi vì tôi bị cảm cúm rồi, đau đầu, sốt.", ["因为", "我", "感冒", "了", "，", "头疼", "、", "发烧", "。"], "Cặp liên từ chỉ nguyên nhân kết quả: 因为... (Bởi vì...).", ["所以"], ["Bạn đã uống thuốc hạ sốt chưa?", "Bị sốt bao nhiêu độ rồi?", "Bạn cần đi khám bác sĩ ngay."], ["所以感冒了，我头疼发烧。", "因为我感冒，头疼、发烧了。", "我因为感冒了，头疼发烧。"]),
        ("我想家了，身体很不舒服。", "Wǒ xiǎng jiā le, shēntǐ hěn bù shūfu.", "Tôi nhớ nhà rồi, người rất khó chịu mệt mỏi.", ["我", "想家", "了", "，", "身体", "很", "不", "舒服", "。"], "Biến đổi cảm xúc với 了: 想家了; Tính từ 舒服 (dễ chịu).", ["在"], ["Khi bị ốm ai cũng dễ nhớ nhà.", "Bạn có muốn ăn chút gì không?", "Tôi ở lại chăm sóc bạn nhé."], ["我正在想家，身体很不舒服。", "我想家，身体很不舒服了。", "身体很不舒服，我想家了。"]),
        ("别哭了，走，我陪你去医院看病。", "Bié kū le, zǒu, wǒ péi nǐ qù yīyuàn kànbìng.", "Đừng khóc nữa, đi nào, tôi đưa bạn đến bệnh viện khám bệnh.", ["别", "哭", "了", "，", "走", "，", "我", "陪", "你", "去", "医院", "看病", "。"], "Khuyên ngăn: 别 + V + 了 (Đừng... nữa); Động từ 陪 (đi cùng, đồng hành).", ["不"], ["Bác sĩ nói bạn bị bệnh gì?", "Bệnh viện ở gần trường không?", "Uống thuốc này sẽ đỡ ngay thôi."], ["不哭了，走，我陪你去医院看病。", "别哭，走，我请你去医院看病。", "走，我陪你去医院看病，别哭了。"])
    ],

    # L28: 我吃了早饭就去
    [
        ("我吃了早饭就去找你。", "Wǒ chī le zǎofàn jiù qù zhǎo nǐ.", "Tôi ăn sáng xong là đi tìm bạn ngay.", ["我", "吃", "了", "早饭", "就", "去", "找", "你", "。"], "Cấu trúc liên kết hai hành động liên tiếp: V1 + 了... 就 + V2... (Làm xong A là làm B ngay).", ["才"], ["Bạn ăn sáng lúc mấy giờ?", "Tôi đợi bạn ở ký túc xá nhé.", "Chúng mình cùng đi ăn sáng đi."], ["我吃早饭了就去找你。", "我吃了早饭才去找你。", "吃了早饭我去找你马上。"]),
        ("你等我一会儿，我马上就来。", "Nǐ děng wǒ yíhuìr, wǒ mǎshàng jiù lái.", "Bạn đợi tôi một lát, tôi đến ngay đây.", ["你", "等", "我", "一会儿", "，", "我", "马上", "就", "来", "。"], "Phó từ chỉ sự mau chóng: 马上 (ngay lập tức), 就.", ["才"], ["Bao giờ bạn mới đến?", "Tôi đã đợi bạn nửa tiếng rồi.", "Đừng vội, cứ từ từ đi."], ["你等我一会儿，我马上才来。", "你等我一点儿，我马上就来。", "我马上就来，你等我一会儿。"]),
        ("你看这套房子，又干净又安静。", "Nǐ kàn zhè tào fángzi, yòu gānjìng yòu ānjìng.", "Bạn xem căn nhà này này, vừa sạch sẽ lại vừa yên tĩnh.", ["你", "看", "这套", "房子", "，", "又", "干净", "又", "安静", "。"], "Cấu trúc song hành tính chất: 又 + Tính từ 1 + 又 + Tính từ 2 (Vừa... lại vừa...).", ["也"], ["Căn nhà này giá thuê bao nhiêu một tháng?", "Căn nhà này có mấy phòng ngủ?", "Tôi rất thích căn nhà yên tĩnh này."], ["你看这套房子，也干净也安静。", "你看这套房子，又干净还安静。", "这套房子你看，又干净又安静。"]),
        ("看完书以后，咱们一起去租房子。", "Kàn wán shū yǐhòu, zánmen yìqǐ qù zū fángzi.", "Đọc sách xong, chúng mình cùng đi thuê nhà nhé.", ["看", "完", "书", "以后", "，", "咱们", "一起", "去", "租", "房子", "。"], "Bổ ngữ kết quả 完 (xong); Cấu trúc ...以后 (Sau khi làm gì).", ["了"], ["Bạn muốn thuê nhà ở khu vực nào?", "Giá thuê nhà ở đây có đắt không?", "Chúng mình thuê chung một căn nhà nhé."], ["看了书以后，咱们一起去租房子。", "看书完了以后，咱们一起去租房子。", "咱们一起去租房子，看完书以后。"])
    ],

    # L29: 我都做对了
    [
        ("今天的考试题你做完了吗？", "Jīntiān de kǎoshì tí nǐ zuò wán le ma?", "Đề thi hôm nay bạn đã làm xong chưa?", ["今天", "的", "考试题", "你", "做", "完", "了", "吗", "？"], "Bổ ngữ kết quả 完 (hoàn thành): Động từ + 完 + 了.", ["过"], ["Đề thi hôm nay có khó không?", "Bạn làm được bao nhiêu câu?", "Còn bao nhiêu phút nữa thì hết giờ?"], ["今天的考试题你做过了吗？", "今天的考试题你做了完吗？", "你做完了今天的考试题没有？"]),
        ("这次的题我都做对了，没写错。", "Zhè cì de tí wǒ dōu zuò duì le, méi xiě cuò.", "Đề thi lần này tôi đều làm đúng cả, không viết sai.", ["这次", "的", "题", "我", "都", "做", "对", "了", "，", "没", "写", "错", "。"], "Bổ ngữ kết quả 对 (đúng) và 错 (sai); Phủ định dùng 没 + V + Bổ ngữ kết quả.", ["不"], ["Tôi làm sai mất hai câu.", "Bạn được bao nhiêu điểm?", "Đề thi lần này dễ hơn lần trước."], ["这次的题我都做对了，不写错。", "这次的题我都做了对，没写错。", "我这次的题都做对了，没写错了。"]),
        ("老师讲的内容我都听懂了。", "Lǎoshī jiǎng de nèiróng wǒ dōu tīng dǒng le.", "Nội dung thầy giáo giảng tôi đều nghe hiểu hết rồi.", ["老师", "讲", "的", "内容", "我", "都", "听", "懂", "了", "。"], "Bổ ngữ kết quả 懂 (hiểu): 听懂 (nghe hiểu), 看懂 (đọc hiểu).", ["完"], ["Có chỗ nào bạn chưa hiểu không?", "Thầy giáo giảng bài rất dễ hiểu.", "Bạn ghi chép bài đầy đủ chứ?"], ["老师讲的内容我都听完了。", "老师讲的内容我都听懂没有。", "我都听懂了老师讲的内容。"]),
        ("你看见我的汉语词典了吗？", "Nǐ kànjiàn wǒ de Hànyǔ cídiǎn le ma?", "Bạn có nhìn thấy cuốn từ điển tiếng Hán của tôi không?", ["你", "看见", "我", "的", "汉语词典", "了", "吗", "？"], "Bổ ngữ kết quả 见 (thấy): 看见 (nhìn thấy), 听见 (nghe thấy).", ["完"], ["Từ điển của bạn màu gì?", "Bạn để từ điển ở đâu?", "Tôi mượn từ điển của bạn một lát nhé."], ["你看完我的汉语词典了吗？", "你看了见我的汉语词典吗？", "我的汉语词典你看见没有了吗？"])
    ],

    # L30: 我已经来了两个多月了
    [
        ("我已经来中国两个多月了。", "Wǒ yǐjīng lái Zhōngguó liǎng ge duō yuè le.", "Tôi đã đến Trung Quốc được hơn hai tháng rồi.", ["我", "已经", "来", "中国", "两个多月", "了", "。"], "Bổ ngữ thời lượng: Động từ + Tân ngữ + Thời lượng + 了 (Hành động đang tiếp diễn).", ["二个"], ["Bạn đến Trung Quốc vào mùa nào?", "Cuộc sống ở Trung Quốc thế nào?", "Bạn dự định ở Trung Quốc bao lâu?"], ["我已经来中国二个多月了。", "我已经来了中国两个多月。", "来中国我已经两个多月了。"]),
        ("我对这儿的生活差不多已经习惯了。", "Wǒ duì zhèr de shēnghuó chàbuduō yǐjīng xíguàn le.", "Tôi đối với cuộc sống ở đây hầu như đã quen rồi.", ["我", "对", "这儿", "的", "生活", "差不多", "已经", "习惯", "了", "。"], "Giới từ 对 (đối với): A 对 B + [Thái độ / Cảm nhận / Thói quen].", ["在"], ["Bạn có quen ăn đồ ăn ở đây không?", "Khí hậu ở đây có khắc nghiệt không?", "Tôi vẫn chưa quen với thời tiết lạnh."], ["我在对这儿的生活差不多已经习惯了。", "我对这儿的生活已经差不多习惯了。", "这儿的生活我对差不多已经习惯了。"]),
        ("北京的冬天比上海冷得多。", "Běijīng de dōngtiān bǐ Shànghǎi lěng de duō.", "Mùa đông ở Bắc Kinh lạnh hơn Thượng Hải nhiều.", ["北京", "的", "冬天", "比", "上海", "冷", "得", "多", "。"], "Câu so sánh hơn với chữ 比: A 比 B + Tính từ + 得多 / 多了.", ["很"], ["Mùa đông ở Thượng Hải có tuyết không?", "Bắc Kinh lạnh hơn hay Thượng Hải lạnh hơn?", "Mùa đông ở đây rất lạnh và khô."], ["北京的冬天比上海很冷。", "北京的冬天比较上海冷得多。", "比上海北京的冬天冷得多。"]),
        ("我坚持每天下午锻炼一个小时。", "Wǒ jiānchí měitiān xiàwǔ duànliàn yí ge xiǎoshí.", "Tôi kiên trì mỗi buổi chiều rèn luyện thân thể một tiếng đồng hồ.", ["我", "坚持", "每天下午", "锻炼", "一个小时", "。"], "Bổ ngữ thời lượng: Động từ + [Khoảng thời gian: 一个小时].", ["钟头"], ["Bạn thường tập môn thể thao gì?", "Tập thể dục giúp cơ thể khỏe mạnh hơn.", "Buổi chiều tôi hay đi chạy bộ."], ["我坚持每天下午锻炼一个钟头。", "每天下午我坚持一个小时锻炼。", "我坚持锻炼一个小时每天下午。"])
    ]
]

# Combine all 30 lessons into one list of grammar sentences
full_list = []
for l_items in GRAMMAR_DATA_BY_LESSON:
    full_list.extend(l_items)

# Add L6 to L10
for l_idx, l_items in enumerate(LESSONS_6_TO_30_SPECS, start=6):
    for s_idx, s in enumerate(l_items, start=1):
        full_list.append({
            "id": f"g_{l_idx}_{s_idx}",
            "lesson": l_idx,
            "hsk": 1,
            "zh": s[0],
            "py": s[1],
            "vi": s[2],
            "tokens": s[3],
            "grammarNote": s[4],
            "distractors": s[5],
            "wrongVi": s[6],
            "wrongZh": s[7]
        })

# Add L11 to L15
for l_idx, l_items in enumerate(LESSONS_11_TO_30_DATA, start=11):
    for s_idx, s in enumerate(l_items, start=1):
        full_list.append({
            "id": f"g_{l_idx}_{s_idx}",
            "lesson": l_idx,
            "hsk": 1,
            "zh": s[0],
            "py": s[1],
            "vi": s[2],
            "tokens": s[3],
            "grammarNote": s[4],
            "distractors": s[5],
            "wrongVi": s[6],
            "wrongZh": s[7]
        })

# Add L16 to L30
for l_idx, l_items in enumerate(MORE_LESSONS, start=16):
    for s_idx, s in enumerate(l_items, start=1):
        full_list.append({
            "id": f"g_{l_idx}_{s_idx}",
            "lesson": l_idx,
            "hsk": 2,
            "zh": s[0],
            "py": s[1],
            "vi": s[2],
            "tokens": s[3],
            "grammarNote": s[4],
            "distractors": s[5],
            "wrongVi": s[6],
            "wrongZh": s[7]
        })

print(f"Total sentences generated: {len(full_list)}")
lesson_counts = {}
for item in full_list:
    l = item["lesson"]
    lesson_counts[l] = lesson_counts.get(l, 0) + 1
print("Counts per lesson:", lesson_counts)

# Now read existing grammar.js
with open("chinese-app/src/grammar.js", "r", encoding="utf-8") as f:
    orig = f.read()

# Find the start of GRAMMAR_DATA and start of GrammarController
start_idx = orig.find("const GRAMMAR_DATA = [")
controller_idx = orig.find("const GrammarController = {")

header = orig[:start_idx]
footer = orig[controller_idx:]

new_js = header + "const GRAMMAR_DATA = " + json.dumps(full_list, ensure_ascii=False, indent=2) + ";\n\n" + footer

with open("chinese-app/src/grammar.js", "w", encoding="utf-8") as f:
    f.write(new_js)

print("Successfully updated chinese-app/src/grammar.js!")
