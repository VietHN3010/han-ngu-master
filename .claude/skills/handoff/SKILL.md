---
name: handoff
description: Kết thúc lượt làm việc của Claude trong dự án Hán Ngữ Master và bàn giao cho Antigravity — build + chạy test, ghi chú bàn giao (đã làm gì, còn dở gì, lưu ý gì), nhả mọi file đang giữ. Dùng khi người dùng gõ /handoff, hoặc khi xong một việc và người dùng sắp chuyển sang Antigravity.
argument-hint: "[ghi chú thêm cho Antigravity]"
---

# /handoff — bàn giao cho Antigravity

Thư mục ứng dụng: `/Users/nguyenhoangviet/Downloads/汉语/chinese-app` (chạy mọi lệnh từ đây).

1. Xem lại những gì Claude đã sửa trong lượt này: `git status -s` và `git diff --stat`.

2. Soạn **một** ghi chú bàn giao ngắn (1–4 câu, tiếng Việt) gồm:
   - Đã làm gì, ở file/hàm nào.
   - Việc còn dở hoặc biết là chưa ổn (nếu có).
   - Điều Antigravity cần lưu ý (đổi tên biến/hàm, đổi cấu trúc dữ liệu, file không nên đụng…).
   - Kèm thêm ý người dùng nếu có: $ARGUMENTS

3. Chạy (build + verify, ghi chú, nhả toàn bộ file Claude đang giữ):
   ```bash
   node scripts/agent-sync.js handoff claude "<ghi chú bàn giao>"
   ```
   Nếu build/test lỗi: lệnh vẫn ghi chú (gắn nhãn `[BUILD/TEST LỖI]`) và nhả file, nhưng phải báo rõ lỗi cho người dùng và đề nghị sửa.

4. **Không tự commit.** Hỏi người dùng có muốn commit không (pre-commit hook sẽ tự build và stage file sinh ra).

5. Báo người dùng: ghi chú đã gửi, kết quả test, và họ có thể chuyển sang Antigravity — Antigravity sẽ tự thấy ghi chú ở lượt kế tiếp.
