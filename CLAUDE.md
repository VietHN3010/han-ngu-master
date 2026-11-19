# CLAUDE.md - Hán Ngữ Master Development Guidelines

Chào mừng bạn đến với dự án **Hán Ngữ Master** (Ứng dụng học tiếng Trung HSK 1 & HSK 2 toàn diện).

File này cung cấp thông tin kiến trúc, quy chuẩn mã nguồn và quy trình đóng gói bắt buộc dành cho **Claude** (Claude Code, Claude Desktop, Claude Web) và các AI coding assistant khác (Antigravity, Cursor, Codex).

---

## 1. Tổng quan dự án & Tech Stack

- **Mục tiêu:** Ứng dụng web PWA học tiếng Trung 30 bài học (HSK 1 & HSK 2) với Flashcard 3D, Trắc nghiệm phản xạ, Luyện viết chữ Hán nét thuận, Ghép câu ngữ pháp, và Bảng ngữ âm Pinyin.
- **Frontend Stack:**
  - Vanilla JavaScript ES6+ (Module-based development trong `src/`, đóng gói thành `app.bundle.js`).
  - HTML5 & CSS3 hiện đại (hỗ trợ Dark/Light mode, biến CSS `--primary`, `--bg-card`, v.v.).
  - Mobile-first Responsive UI.
  - PWA Offline Caching (`sw.js`).
  - Thư viện hỗ trợ: `HanziWriter` (viết chữ Hán), `Supabase JS` (lưu trữ tiến độ đám mây).
- **Backend / Serverless:**
  - Vercel Serverless Function (`api/tts.js`) để proxy Google TTS streaming (`audio/mpeg`), khắc phục lỗi chặn Referer và CORS trên trình duyệt di động.
- **Môi trường Live & Hosting:**
  - URL Production: `https://han-ngu-master.vercel.app`
  - Git Repo: `git@github.com:VietHN3010/han-ngu-master.git` (nhánh chính: `main`).

---

## 2. Cấu trúc thư mục & Modules (`src/`)

> ⚠️ **QUY TẮC QUAN TRỌNG:** KHÔNG BAO GIỜ chỉnh sửa trực tiếp file `app.bundle.js` vì nó được tự động tạo từ thư mục `src/`. Mọi thay đổi logic phải được thực hiện trong `src/`.

Các file nguồn trong `src/`:
1. `src/data.js`: Chứa `CHINESE_DATA` (740+ từ vựng HSK 1 & 2, danh sách 30 bài học chuẩn, mẫu câu hội thoại).
2. `src/storage.js`: `StorageManager` (Quản lý tiến độ học, XP, streak hàng ngày, bộ nhớ đệm `localStorage` và đồng bộ Supabase Cloud).
3. `src/audio.js`: `AudioEngine` (Web Speech API Mandarin `zh-CN`, hiệu ứng âm thanh Web Audio API, và fallback tự động qua `/api/tts`).
4. `src/writer.js`: `HanziController` (Vẽ và kiểm tra nét thuận chữ Hán qua `HanziWriter`).
5. `src/flashcard.js`: `FlashcardController` (Thẻ ghi nhớ lặp lại ngắt quãng 3D, ghi nhớ từ vựng).
6. `src/quiz.js`: `QuizController` (Trắc nghiệm 4 lựa chọn phản xạ nhanh).
7. `src/grammar.js`: `GRAMMAR_DATA` & `GrammarController` (120 câu ngữ pháp phân theo bài, luyện sắp xếp câu 连词成句 và dịch 2 chiều).
8. `src/match.js`: `MatchGame` (Mini-game nối từ chữ Hán và tiếng Việt).
9. `src/lessons.js`: `LessonBrowser` (Hiển thị chi tiết từng bài học, từ vựng, bài khóa, trọng tâm ngữ pháp và hệ thống bài tập khép kín theo từng bài).
10. `src/dictionary.js`: `DictionaryController` (Tra cứu từ điển nhanh HSK 1 & 2).
11. `src/pinyin.js`: `PinyinController` (Bảng thanh mẫu, vận mẫu và thanh điệu Pinyin có phát âm chuẩn).
12. `src/app.js`: `App` (Điều hướng tabs, hash routing `#lesson-X`, `#grammar`, cập nhật dashboard và khởi tạo toàn ứng dụng).

Khác:
- `api/tts.js`: Serverless handler Node.js proxy âm thanh TTS.
- `index.html`: Cấu trúc DOM chính, nạp font và `app.bundle.js`.
- `style.css`: Toàn bộ styling giao diện và animations.
- `sw.js`: Service worker quản lý cache offline.

---

## 3. Quy trình Đóng gói & Kiểm tra (Bắt buộc)

Sau khi chỉnh sửa bất kỳ file nào trong `src/`:

```bash
# 1. Đóng gói mã nguồn và kiểm tra cú pháp:
npm run build

# Hoặc chạy lệnh trực tiếp nếu không dùng npm:
cat src/data.js src/storage.js src/audio.js src/writer.js src/flashcard.js src/quiz.js src/grammar.js src/match.js src/lessons.js src/dictionary.js src/pinyin.js src/app.js > app.bundle.js && node -c app.bundle.js

# 2. Chạy kiểm tra cú pháp toàn diện:
npm test
```

### Khi cập nhật chức năng hoặc giao diện:
- **Tăng số phiên bản cache:**
  - Trong `index.html`: Cập nhật thẻ script (ví dụ: `app.bundle.js?v=20261119-v13`).
  - Trong `sw.js`: Đổi tên `CACHE_NAME = 'han-ngu-master-v13'`.
- Việc này giúp người dùng trên điện thoại và máy tính nhận bản cập nhật ngay lập tức mà không bị Service Worker lưu cache cũ.

---

## 4. Các lưu ý đặc thù về kỹ thuật (Gotchas & Best Practices)

1. **Quy tắc phát âm âm thanh (Audio Autoplay Policy):**
   - Trình duyệt di động (iOS Safari & Android Chrome) chặn phát âm nếu lệnh gọi âm thanh nằm sau `setTimeout` không đồng bộ.
   - Luôn gọi `AudioEngine.speak(text)` đồng bộ trực tiếp trong sự kiện chạm/click của người dùng.
   - `AudioEngine` đã tích hợp sẵn Watchdog 350ms: nếu native TTS không hỗ trợ hoặc không có giọng tiếng Trung, nó sẽ tự chuyển sang `/api/tts`.
2. **Quy chuẩn dữ liệu Pinyin trong câu ngữ pháp:**
   - Trong `GRAMMAR_DATA`, trường phiên âm là `py` (ví dụ: `q.py`).
   - Trong từ vựng (`CHINESE_DATA.words`), trường phiên âm là `pinyin` (ví dụ: `w.pinyin`).
   - Luôn dùng cú pháp an toàn: `${q.py || q.pinyin || ''}` để tránh lỗi hiển thị chuỗi `undefined`.
3. **Bài tập khép kín theo bài học (Self-contained Lesson Practice):**
   - Khi người dùng ấn làm bài tập trong một bài học cụ thể (ví dụ: Bài 3), toàn bộ luồng bài tập diễn ra ngay trong DOM của bài đó (`#lesson-practice-wrapper`), **tuyệt đối không điều hướng sang trang bài tập chung**.
4. **Giao diện di động (Mobile First):**
   - Luôn kiểm tra padding và layout trên màn hình nhỏ (chiều rộng 360px - 414px).
   - Đảm bảo thanh điều hướng dưới đáy (Bottom Navigation) không che khuất nội dung cuộn bên dưới (`margin-bottom` an toàn).

---

## 5. Quy chuẩn Git Commit

Khi hoàn thành thay đổi, luôn commit với thông điệp rõ ràng theo chuẩn Conventional Commits:
- `feat(...)`: Thêm tính năng mới.
- `fix(...)`: Sửa lỗi logic hoặc giao diện.
- `refactor(...)`: Cải tiến cấu trúc mã nguồn.
- `style(...)`: Tinh chỉnh CSS hoặc giao diện.
