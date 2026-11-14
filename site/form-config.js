// Địa chỉ nhận form (Google Apps Script Web App) và khóa, phải giống SECRET trong Apps Script.
// Đổi Apps Script: thay url bên dưới rồi đăng lại web.
window.AIF_FORM = {
  "url": "https://script.google.com/macros/s/AKfycbyyZ7eNoeHklZ43Y3SQEPFnZ3lZx8aVLt5aTsfw6PqdN17WdXVoVKnMywyHo7uIn52h/exec",
  "secret": "aif-7f3k29xq-2026"
};
// Chatbot (v2.1.0): địa chỉ Worker aif-kb-chat trên Cloudflare. Để trống url thì chatbot chỉ trả lời theo bộ câu hỏi, không gọi AI.
window.AIF_CHAT = {
  "url": "https://aif-kb-chat.trantansy.workers.dev/",
  "secret": "aifchat-2026-k7q3"
};
