---
name: sync
description: Bắt đầu một lượt làm việc song song với Antigravity trong dự án Hán Ngữ Master — xem file Antigravity vừa sửa, file nó đang giữ, ghi chú bàn giao, rồi giữ (claim) các file Claude sắp sửa. Dùng khi người dùng gõ /sync, hoặc trước khi bắt đầu sửa code khi Antigravity cũng đang làm việc.
argument-hint: "[mô tả việc sắp làm]"
---

# /sync — bắt đầu lượt làm việc an toàn cùng Antigravity

Thư mục ứng dụng: `/Users/nguyenhoangviet/Downloads/汉语/chinese-app` (chạy mọi lệnh từ đây).

1. **Xem trạng thái:**
   ```bash
   node scripts/agent-sync.js status claude
   ```
   Lệnh này cho biết: file Antigravity/người dùng đã sửa kể từ lần cuối Claude xem, file nào đang bị ai giữ, và ghi chú bàn giao mới.

2. **Đọc lại mọi file trong mục "đã sửa"** (dùng Read hoặc `git diff -- <file>`) và đọc ghi chú bàn giao trước khi lên kế hoạch. Không dựa vào nội dung cũ trong trí nhớ.

3. **Xác định các file sẽ sửa** cho việc: $ARGUMENTS
   - Nếu file nào đang được **Antigravity giữ** → KHÔNG sửa. Đề xuất với người dùng: chờ Antigravity xong, chia việc sang file khác, hoặc người dùng tự ép nhả.
   - Nhớ: sửa `style.css` cũng đụng `index.html` (đồng bộ 2 chiều), nên giữ cả hai.

4. **Giữ file trước khi sửa:**
   ```bash
   node scripts/agent-sync.js claim claude src/quiz.js src/app.js -m "mô tả ngắn việc đang làm"
   ```
   Nếu lệnh báo "KHÔNG giữ được" → dừng và báo người dùng.

5. Báo người dùng ngắn gọn: đã thấy gì từ Antigravity, đã giữ file nào, sắp làm gì. Sau đó làm việc bình thường.

Ghi chú: hook PreToolUse sẽ tự chặn mọi lần Claude sửa file mà Antigravity đang giữ, và hook PostToolUse tự giữ (30 phút) mọi file Claude vừa sửa. Khi xong việc, dùng `/handoff`.
