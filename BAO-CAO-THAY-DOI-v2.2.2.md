# Báo cáo thay đổi: chatbot web AIF v2.2.2

Gửi: anh Sỹ · Ngày: 12/11/2026 · Người thực hiện: Long

## 1. Đã làm theo góp ý
1. **Màn đầu của chatbot đổi hẳn.** Bỏ lời chào dài và 3 câu hỏi gợi ý. Thay bằng 2 nút lớn: "Tìm hiểu về AI First Business" và "Tìm hiểu về AI Economy" (có cả bản tiếng Anh và tiếng Trung).
2. **Mỗi nút chỉ trả lời theo sách tương ứng.** Chọn "AI Economy" thì chatbot chỉ dùng nội dung sách Nền Kinh tế Trí tuệ, không lấy nội dung của AI First Business, và ngược lại. Mục đích: giảm trả lời sai ngữ cảnh và tránh lặp thông tin giữa hai sách. Nội dung website (mua sách, tác giả, liên hệ) dùng chung.
3. **Sau khi chọn, hiện 3 câu gợi ý của sách đó.** Cách gợi ý hoạt động như cũ (thu gọn được, có câu hỏi liên quan sau mỗi câu trả lời).
4. **Hỏi sai sách thì chatbot nói rõ và gợi ý chuyển sách.** Ví dụ đang ở AI Economy mà hỏi nội dung của AI First Business: chatbot báo chưa có trong sách này và có nút "Hỏi trong “AI First Business”" để hỏi lại ngay.
5. **Bỏ file kb.json.** File này chỉ là bộ 100 câu hỏi FAQ của trình duyệt (không phải kho tri thức của Worker AI nên không ảnh hưởng chatbot đang kết nối). Nay dữ liệu đó nằm trong file chatbot, không còn file riêng.

## 2. Ảnh hưởng đến hệ thống đang chạy
- Cần deploy **2 phần**: Worker `aif-kb-chat` (lên 2.1.0, thêm lọc theo sách) và web (v2.2.2). Worker `aif-kb-sync` không đổi. Làm Worker trước, web sau.
- Nếu chỉ cập nhật web mà chưa cập nhật Worker, chatbot vẫn chạy nhưng chưa tách được hai sách.
- Không đổi mô hình AI, giới hạn tần suất, cấu hình AI Search. Có thể quay lại bản cũ trong vài phút bằng Rollback trên Cloudflare.
- Chi phí: không phát sinh thêm. Câu hỏi gợi ý và câu FAQ quen thuộc vẫn trả lời tại trình duyệt, không gọi AI.
- Đã kiểm thử tự động: 22 bài kiểm thử cho Worker và một bộ kiểm thử giao diện (màn chọn sách, đổi sách, gửi đúng sách, bản EN/中文, điện thoại, không còn kb.json), tất cả đạt. Chưa thử với dữ liệu thật trên Cloudflare vì cần deploy trước.

## 3. Cần anh Sỹ lưu ý và quyết định
1. **Phía AI Economy còn ít nội dung đã soạn sẵn.** Trong kho hiện có: 13 thẻ khái niệm đều của AI First Business, 75 câu FAQ chỉ của AI First Business, 25 câu FAQ nêu cả hai sách. AI Economy chỉ có đoạn sách (văn bản quét từ bản in, còn nhiễu) và 25 FAQ chung. Vì vậy câu trả lời phía AI Economy nhiều khả năng kém chắc hơn. Đề xuất: soạn thẻ khái niệm và FAQ riêng cho AI Economy (ví dụ chín tầng của nền kinh tế trí tuệ, nhà máy trí tuệ, chủ quyền AI), cần anh duyệt nội dung.
2. **3 câu gợi ý của AI Economy hiện dùng FAQ số 10, 11, 98** (đã dùng ở trang sách này trước đây). FAQ 98 có nêu cả hai sách. Anh có muốn đổi sang 3 câu khác không?
3. **25 câu FAQ nêu cả hai sách vẫn hiện ở cả hai lựa chọn**, vì nội dung của chúng tổng hợp từ cả hai cuốn. Nếu muốn tách tuyệt đối, cần soạn lại từng câu theo từng sách.
4. **Chất lượng trả lời chưa đổi nhiều.** Bản này chủ yếu tách kho và đổi giao diện. Phản hồi "AI trả lời chưa đúng ngữ cảnh" (ví dụ câu "Tôi sẽ sống như thế nào trong thời đại AI?") còn cần các cải tiến riêng: sửa lệnh hướng dẫn thiên về doanh nghiệp, bổ sung nội dung về chuyển đổi nghề nghiệp của cá nhân, và đo lại bằng bộ 40 câu hỏi. Đã có đề xuất riêng.
5. Trạng thái đồng bộ KB: trang kiểm tra của Worker đang báo mới có 3 tệp, cần xác nhận KB đã đồng bộ đủ khoảng 555 tệp.
6. Phí AI Search (Cloudflare thông báo tính từ 01/12/2026) vẫn là mục cần theo dõi.
