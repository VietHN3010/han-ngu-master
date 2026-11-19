---
description: Bắt đầu lượt làm việc song song với Claude — xem file Claude vừa sửa/đang giữ, ghi chú bàn giao, rồi giữ file trước khi sửa
---

Thư mục ứng dụng: `/Users/nguyenhoangviet/Downloads/汉语/chinese-app`.

1. Chạy `node scripts/agent-sync.js status antigravity` để xem: file Claude/người dùng đã sửa kể từ lần cuối Antigravity xem, file đang bị ai giữ, ghi chú bàn giao mới từ Claude.
2. Đọc lại toàn bộ file trong mục "đã sửa" (hoặc `git diff -- <file>`) và ghi chú bàn giao trước khi lên kế hoạch.
3. Xác định các file sẽ sửa. File nào đang được **Claude giữ** thì KHÔNG sửa — báo người dùng và chia việc sang file khác. Sửa `style.css` cũng đụng `index.html` nên giữ cả hai.
4. Giữ file trước khi sửa: `node scripts/agent-sync.js claim antigravity <file...> -m "việc đang làm"`. Nếu báo "KHÔNG giữ được" thì dừng và hỏi người dùng.
5. Trước MỖI lần ghi file chưa giữ, chạy `node scripts/agent-sync.js check antigravity <file>`; exit code 1 nghĩa là Claude đang giữ → không ghi.
6. Khi xong việc, chạy workflow /handoff.
