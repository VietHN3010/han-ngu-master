---
description: Kết thúc lượt của Antigravity và bàn giao cho Claude — build + test, ghi chú bàn giao, nhả file đang giữ
---

Thư mục ứng dụng: `/Users/nguyenhoangviet/Downloads/汉语/chinese-app`.

1. Xem lại thay đổi trong lượt này: `git status -s` và `git diff --stat`.
2. Soạn một ghi chú bàn giao ngắn (1–4 câu, tiếng Việt): đã làm gì ở file/hàm nào, việc còn dở, điều Claude cần lưu ý (đổi tên, đổi cấu trúc dữ liệu, file không nên đụng).
3. Chạy `node scripts/agent-sync.js handoff antigravity "<ghi chú bàn giao>"` — lệnh tự build + verify, gửi ghi chú và nhả mọi file Antigravity đang giữ. Nếu build/test lỗi, báo rõ cho người dùng.
4. Không tự commit; hỏi người dùng có muốn commit không.
5. Báo người dùng có thể chuyển sang Claude — Claude sẽ tự thấy ghi chú ở tin nhắn kế tiếp.
