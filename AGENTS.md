# CLAUDE.md - Hán Ngữ Master Development Guidelines

Chào mừng bạn đến với dự án **Hán Ngữ Master** (Ứng dụng học tiếng Trung HSK 1 & HSK 2 toàn diện).

File này cung cấp thông tin kiến trúc, quy chuẩn mã nguồn và quy trình đóng gói tự động dành cho **Claude** (Claude Code, Claude Desktop, Claude Web) và các AI coding assistant khác (Antigravity, Cursor, Codex).

---

## 0. Giao thức Tự động Đồng bộ 2 Chiều (Claude ↔ Antigravity Auto-Sync)

Dự án này được phát triển song song giữa **Claude** và **Antigravity** trên cùng thư mục `/Users/nguyenhoangviet/Downloads/汉语/chinese-app`. Cả hai bên **BẮT BUỘC** tuân thủ giao thức bàn giao tự động sau để người dùng không cần giải thích lại bối cảnh:

1. **Khi bắt đầu mỗi yêu cầu / phiên làm việc mới:**
   - Đọc ngay khối `AUTO-SYNC-STATE` bên dưới để biết ngay những file nguồn nào vừa được chỉnh sửa (bởi Claude hoặc Antigravity).
   - Tự động mở/đọc các file nằm trong danh sách vừa thay đổi (hoặc chạy `git diff HEAD` nếu đang có thay đổi chưa commit, `git log -n 2 -p -- src/ style.css index.html api/` nếu vừa commit) **trước khi phản hồi hoặc chỉnh sửa** để hiểu chính xác kiến trúc, biến, giao diện và logic mới nhất của đối phương.
2. **Sau mỗi lần sửa file:**
   - Hook `PostToolUse` (`.claude/settings.json` và `.agents/hooks.json`) tự động chạy `node scripts/build.js --quiet` để cập nhật `app.bundle.js`, đồng bộ `style.css` ↔ `index.html`, băm SHA-256 cache-busting, cập nhật khối `AUTO-SYNC-STATE` bên dưới và đồng bộ `CLAUDE.md` ↔ `AGENTS.md` (ở cả `chinese-app/` và thư mục cha).
   - Không cần hỏi người dùng chuyện gì vừa thay đổi — hãy chủ động đọc từ khối trạng thái và git diff.
3. **Phát hiện thay đổi của bên kia (`scripts/sync-tracker.js`):**
   - Mỗi agent giữ một snapshot hash riêng tại `.git/agent-sync/<claude|antigravity>.json` (không commit).
   - Claude: hook `SessionStart` + `UserPromptSubmit` (`scripts/claude-hook.js`) tự chèn danh sách file mà Antigravity/người dùng vừa sửa kể từ lần cuối Claude xem. Khi thấy danh sách này, **phải đọc lại các file đó trước khi sửa**.
   - Antigravity: `scripts/agy-hook.js` chèn danh sách file Claude đã sửa vào đầu mỗi phiên.
   - Hook `PostToolUse` của Claude trả exit code 2 nếu `build.js` lỗi (vd. lỗi cú pháp) để Claude thấy và sửa ngay.
4. **Chống xung đột khi build đồng thời:** `build.js` dùng khóa liên tiến trình (`.git/han-ngu-master-build.lock`) và ghi file nguyên tử (temp + rename), nên hai agent có thể lưu cùng lúc mà không làm hỏng `app.bundle.js`/`index.html`.
5. **Quy tắc làm việc song song:** tránh để Claude và Antigravity cùng sửa **một file** trong cùng thời điểm (đặc biệt `src/data.js`, `src/grammar.js`, `index.html`). Nên chia việc theo file/module.
6. **Giữ file & bàn giao (`scripts/agent-sync.js`, dữ liệu ở `.git/agent-sync/`):**
   - Lệnh: `node scripts/agent-sync.js <status|claim|check|release|note|handoff> <claude|antigravity> ...` (hoặc `npm run sync -- ...`).
   - **Bắt đầu lượt:** Claude dùng skill `/sync`, Antigravity dùng workflow `/sync` (`.agents/workflows/sync.md`) → xem thay đổi + ghi chú của bên kia, rồi `claim` file sắp sửa.
   - **Kết thúc lượt:** `/handoff` → build + verify, ghi chú bàn giao, nhả mọi file đang giữ.
   - Tự động: mỗi file một agent vừa sửa được tự giữ 30 phút (giữ thủ công: 3 giờ). Hook `PreToolUse` của Claude **chặn** sửa file Antigravity đang giữ; Antigravity phải chạy `check antigravity <file>` trước khi ghi. Ghi chú bàn giao mới tự hiện ở lượt kế tiếp của bên kia.
   - Ép nhả khi cần: `node scripts/agent-sync.js release <agent> --all`.

<!-- AUTO-SYNC-STATE:START -->
- **Build Tag:** `v13-79cdab6f`
- **Trạng thái nguồn:** Thay đổi đang thực hiện trong working tree (chưa commit)
- **Các file nguồn liên quan:** `index.html`, `src/app.js`, `src/data-hsk3.js`, `src/grammar-hsk3.js`, `src/grammar.js`, `src/guide.js`, `src/lessons.js`, `src/match.js`, `src/notes.js`, `src/quiz.js`, `style.css`
```text
index.html          | 46 ++++++++++++++++++++++++++--------------------
 src/app.js          | 14 ++++++++------
 src/data-hsk3.js    | 13 +++++++++++++
 src/grammar-hsk3.js |  5 +++++
 src/grammar.js      | 10 +++++-----
 src/guide.js        | 19 +++++++++++++++----
 src/lessons.js      | 23 ++++++++++++++---------
 src/match.js        |  3 +--
 src/notes.js        |  2 +-
 src/quiz.js         |  6 ++----
 style.css           |  2 ++
 11 files changed, 92 insertions(+), 51 deletions(-)
```
<!-- AUTO-SYNC-STATE:END -->

---

## 1. Tổng quan dự án & Tech Stack

- **Mục tiêu:** Ứng dụng web PWA học tiếng Trung 30 bài học (HSK 1 & HSK 2) với Flashcard 3D, Trắc nghiệm phản xạ, Luyện viết chữ Hán nét thuận, Ghép câu ngữ pháp, và Bảng ngữ âm Pinyin.
- **Frontend Stack:**
  - Vanilla JavaScript ES6+ (Module-based development trong `src/`, đóng gói tự động thành `app.bundle.js`).
  - HTML5 & CSS3 hiện đại (`style.css` đồng bộ hai chiều với thẻ `<style>` inline trong `index.html`, hỗ trợ Dark/Light mode).
  - Mobile-first Responsive UI.
  - PWA Offline Caching (`sw.js`).
  - Thư viện hỗ trợ: `HanziWriter` (viết chữ Hán), `Supabase JS` (lưu trữ tiến độ đám mây).
- **Backend / Serverless & Hosting:**
  - Vercel Serverless Function (`api/tts.js`) để proxy Google TTS streaming (`audio/mpeg`), khắc phục lỗi chặn Referer và CORS trên trình duyệt di động.
  - `vercel.json` cấu hình `"outputDirectory": "."` để Vercel phục vụ trực tiếp thư mục gốc song song với `npm run build`.
  - URL Production: `https://han-ngu-master.vercel.app`
  - Git Repo: `git@github.com:VietHN3010/han-ngu-master.git` (nhánh chính: `main`).

---

## 2. Cấu trúc thư mục & Modules (`src/`)

> ⚠️ **QUY TẮC QUAN TRỌNG:** KHÔNG BAO GIỜ chỉnh sửa trực tiếp file `app.bundle.js` vì nó được tự động tạo từ thư mục `src/`. Script `scripts/build.js` có cơ chế chặn ghi đè nếu phát hiện `app.bundle.js` bị sửa trực tiếp trong khi `src/` không đổi. Mọi thay đổi logic phải được thực hiện trong `src/`.

Các file nguồn trong `src/`:
1. `src/data.js`: Chứa `CHINESE_DATA` (30 bài học chuẩn, 744 từ vựng HSK 1 & 2, bộ thủ; `all_words` được tự động tổng hợp từ `lessons`). **Đóng gói riêng thành `data.bundle.js`** (tải trước `app.bundle.js`, cả hai `defer`).
2. `src/storage.js`: `StorageManager` (Quản lý tiến độ học, XP, streak hàng ngày, bộ nhớ đệm `localStorage` và đồng bộ Supabase Cloud).
3. `src/audio.js`: `AudioEngine` (Web Speech API Mandarin `zh-CN`, hiệu ứng âm thanh Web Audio API, và fallback tự động qua `/api/tts`).
4. `src/writer.js`: `HanziController` (Vẽ và kiểm tra nét thuận chữ Hán qua `HanziWriter`, hỗ trợ chọn từng chữ đối với từ ghép nhiều chữ).
5. `src/flashcard.js`: `FlashcardController` (Thẻ ghi nhớ lặp lại ngắt quãng 3D, ghi nhớ từ vựng).
6. `src/quiz.js`: `QuizController` (Trắc nghiệm 4 lựa chọn phản xạ nhanh).
7. `src/grammar.js`: `GRAMMAR_DATA` & `GrammarController` (120 câu ngữ pháp phân theo bài, luyện sắp xếp câu 连词成句 và dịch 2 chiều).
8. `src/match.js`: `MatchGame` (Mini-game nối từ chữ Hán và tiếng Việt).
9. `src/lessons.js`: `LessonBrowser` (Hiển thị chi tiết từng bài học, từ vựng, bài khóa, trọng tâm ngữ pháp và hệ thống bài tập khép kín theo từng bài).
10. `src/dictionary.js`: `DictionaryController` (Tra cứu từ điển nhanh HSK 1 & 2).
11. `src/pinyin.js`: `PinyinController` (Bảng 23 thanh mẫu, 36 vận mẫu và 5 thanh điệu Pinyin kèm chữ Hán đại diện chuẩn âm Bắc Kinh `sound`).
12. `src/ui.js`: `Icon` (bộ biểu tượng SVG dùng chung, thay emoji), `Tone` (tách âm tiết pinyin + tô màu thanh điệu `.t1`–`.t5`), `Prefs` (bật/tắt Pinyin, Hán Việt, màu thanh điệu, số từ mới/ngày), `UI` (`toast`, `confirm`, `alert`, `loadScript`). **Không dùng `window.alert/confirm`** — dùng `UI.confirm/UI.alert`.
13. `src/review.js`: `Review` (hàng đợi ôn tập hôm nay theo lịch ôn ngắt quãng, trộn dạng bài: intro / flip / meaning / reverse / listen / write; luyện nghe). HanziWriter được tải lười qua `HANZI_WRITER_URL`.
14. `src/tones.js`: `ToneDrill` (luyện nghe phân biệt thanh: một âm tiết / cặp thanh, bỏ qua từ có 一, 不 và 3+3; thống kê độ chính xác từng cặp thanh trong `localStorage` `hnm_tone_stats_v1`). View `#tones`.
15. `src/guide.js`: `Guide` (trang Kiến thức `#guide`: thanh điệu & biến điệu, bảng 20 cặp thanh, 44 bộ thủ, 16 lượng từ, số/giờ/ngày/tiền, kỳ thi HSK 2.0 vs 3.0). Ví dụ lấy tự động từ `all_words`.
16. `src/notes.js` (**tự sinh, không sửa tay**): `window.LESSON_NOTES` = kiến thức từ slide bài giảng HSK (chiết tự, cách dùng, câu ví dụ, từ mở rộng, ngữ pháp, ngữ âm, văn hóa). `words[wordId]` gắn vào từng từ, `lessons[id]` gắn vào bài (`lessons[0]` = slide nhập môn, hiện ở Kiến thức > Ngữ âm / Chữ Hán). Sinh lại bằng `node scripts/build-notes.js ../slide-audit` từ `slide-audit/clean_*.json` (thư mục ngoài repo). Đóng gói chung vào `data.bundle.js`. Hiển thị qua `Notes` trong `src/ui.js`.
17. `src/data-hsk3.js` + `src/grammar-hsk3.js` (**tự sinh, không sửa tay**): 10 bài HSK 3 (Bài 31–40) và 50 bài tập ngữ pháp, nối thêm vào `CHINESE_DATA.lessons` / `GRAMMAR_DATA`. Sinh lại bằng `node scripts/build-hsk3.js ../slide-audit` từ `slide-audit/hsk3/lesson_*.json` (lệnh này cũng ghi `slide-audit/clean_H.json` cho ghi chú; sau đó chạy `node scripts/build-notes.js ../slide-audit`). Không còn cố định 30 bài/744 từ: dùng `CHINESE_DATA.lessons.length`, `LessonBrowser.lastLessonId()`, bộ lọc `hskN`.
18. `src/app.js`: `App` (Điều hướng **4 tab** `learn · review · dict · me` qua `TAB_GROUP`; các view: `home` (Hôm nay), `lessons`, `review`, `flashcard`, `quiz`, `grammar`, `writer`, `match`, `dict`, `me`; hash routing `#lesson-X`; màn Hôm nay, trang Tôi, chế độ khách).

**Chế độ khách (v14):** không còn bắt đăng nhập. `StorageManager.ensureGuest()` tạo học viên trên máy (`isGuest: true`, không đồng bộ). Khi đăng nhập/đăng ký, `_mergeGuestInto()` gộp tiến độ khách vào tài khoản. Lời mời tạo tài khoản hiện sau khi hoàn thành bài.

**Bài học 4 bước (v14):** `LessonBrowser.STEPS = ['vocab','dialogue','grammar','practice']`, nút Tiếp/Quay lại cố định ở đáy (`nextStep/prevStep`), bước đang học lưu ở `user.lessonSteps`, hoàn thành bài bằng `completeCurrentLesson()` / `StorageManager.markLessonCompleted()`.

Các file cấu hình & tự động hóa:
- `scripts/build.js`: Pipeline build, kiểm tra cú pháp, đồng bộ CSS hai chiều, sinh mã hash cache-busting và đồng bộ `AGENTS.md`.
- `.githooks/pre-commit`: Tự động chạy `node scripts/build.js` và stage `app.bundle.js`, `index.html`, `sw.js`, `style.css`, `AGENTS.md` trước mỗi lần `git commit`.
- `api/tts.js`: Serverless handler Node.js proxy âm thanh TTS.
- `index.html`: Cấu trúc DOM chính, chứa `<style>` inline đồng bộ với `style.css` và `app.bundle.js`.
- `style.css`: Stylesheet chính (đồng bộ hai chiều với `<style>` trong `index.html`).
- `sw.js`: Service worker quản lý cache offline PWA.
- `vercel.json`: Cấu hình Vercel output directory `"."`.
- `AGENTS.md`: Bản sao tự động đồng bộ từ `CLAUDE.md` dưới dạng file thường để mọi AI agent khác đọc được đồng nhất.

---

## 3. Quy trình Đóng gói, Đồng bộ & Kiểm tra Tự động

Dự án đã tích hợp sẵn **Git Pre-commit Hook** (`.githooks/pre-commit`) được cấu hình qua `git config core.hooksPath .githooks`. Khi làm việc trong môi trường mới vừa clone, chạy `npm run prepare` (hoặc tự động khi `npm install`).

```bash
# 1. Đóng gói mã nguồn, đồng bộ CSS & AGENTS.md, cập nhật cache-busting và kiểm tra cú pháp:
npm run build

# Nếu cố ý ghi đè app.bundle.js khi debug:
node scripts/build.js --force

# 2. Chạy kiểm tra đồng bộ & cú pháp (không ghi file):
npm test
```

### Quy trình `scripts/build.js` thực hiện tự động:
1. **Direct-edit guard:** Báo lỗi ngay nếu `app.bundle.js` bị sửa mà `src/` không đổi (tránh mất công sức sửa tay).
2. **Đồng bộ CSS hai chiều (`style.css` <-> `index.html`):**
   - Nếu `style.css` được sửa mới hơn, CSS sẽ tự động được nạp vào `<style>` của `index.html`.
   - Nếu `<style>` trong `index.html` mới hơn (hoặc `style.css` cũ hơn), CSS sẽ được trích xuất sang `style.css`.
3. **Đóng gói & Kiểm tra cú pháp (`vm.Script`):** Ghép `src/data.js` + `src/data-hsk3.js` + `src/notes.js` -> `data.bundle.js` và các `src/*.js` còn lại -> `app.bundle.js`, kiểm tra cú pháp từng file nguồn, hai bundle và `api/tts.js`. Thêm file mới vào `SRC_FILES` trong `scripts/build.js`.
4. **Content-Hash Cache Busting tự động:** Tự động băm SHA-256 của `app.bundle.js` + `style.css` (`v13-<8charhash>`) và cập nhật đồng thời vào `index.html` (`?v=v13-...`) và `sw.js` (`CACHE_NAME`), không cần cập nhật số phiên bản thủ công.
5. **Đồng bộ `AGENTS.md`:** Giữ `AGENTS.md` luôn là file thường giống hệt `CLAUDE.md`.

---

## 4. Các lưu ý đặc thù về kỹ thuật (Gotchas & Best Practices)

1. **Quy tắc phát âm âm thanh (Audio Autoplay Policy):**
   - Trình duyệt di động (iOS Safari & Android Chrome) chặn phát âm nếu lệnh gọi âm thanh nằm sau `setTimeout` không đồng bộ.
   - Luôn gọi `AudioEngine.speak(text)` đồng bộ trực tiếp trong sự kiện chạm/click của người dùng.
   - `AudioEngine` đã tích hợp sẵn Watchdog 350ms: nếu native TTS không hỗ trợ hoặc không có giọng tiếng Trung, nó sẽ tự chuyển sang `/api/tts`.
   - Với bảng Pinyin (`src/pinyin.js`), truyền ký tự chữ Hán chuẩn âm Bắc Kinh (`item.sound`) cho `AudioEngine.speak()` thay vì đọc chữ cái Latin.
2. **Quy chuẩn dữ liệu Pinyin & Ngữ pháp:**
   - Trong `GRAMMAR_DATA`, trường phiên âm là `py` (ví dụ: `q.py`) và trường giải thích là `grammarNote`.
   - Trong từ vựng (`CHINESE_DATA.all_words`), trường phiên âm là `pinyin` (ví dụ: `w.pinyin`).
   - Luôn dùng cú pháp an toàn: `${q.py || q.pinyin || ''}` và `${q.grammarNote || q.point || ''}`.
   - Lưu ý tên thuộc tính dữ liệu tổng hợp từ vựng là `window.CHINESE_DATA.all_words` (không phải `.words` hay `LESSONS_DATA`).
3. **Bài tập khép kín theo bài học (Self-contained Lesson Practice):**
   - Khi người dùng ấn làm bài tập trong một bài học cụ thể (ví dụ: Bài 3), toàn bộ luồng bài tập diễn ra ngay trong DOM của bài đó (`#lesson-practice-wrapper`), **tuyệt đối không điều hướng sang trang bài tập chung**.
4. **Giao diện di động (Mobile First):**
   - Luôn kiểm tra padding và layout trên màn hình nhỏ (chiều rộng 360px - 414px).
   - Đảm bảo thanh điều hướng dưới đáy (Bottom Navigation) không che khuất nội dung cuộn bên dưới (`margin-bottom` an toàn).

---

## 5. Quy chuẩn Git Commit

Khi hoàn thành thay đổi, luôn commit với thông điệp rõ ràng theo chuẩn Conventional Commits (`pre-commit` hook sẽ tự động build, đồng bộ và stage các file build đi kèm):
- `feat(...)`: Thêm tính năng mới.
- `fix(...)`: Sửa lỗi logic hoặc giao diện.
- `refactor(...)`: Cải tiến cấu trúc mã nguồn.
- `style(...)`: Tinh chỉnh CSS hoặc giao diện.
- `build(...)` / `docs(...)`: Cập nhật cấu hình đóng gói hoặc tài liệu.
