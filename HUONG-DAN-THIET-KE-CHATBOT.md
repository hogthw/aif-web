# Hướng dẫn thiết kế chatbot AIF (aifirstbusiness.vn)

Dành cho người thiết kế, bảo trì chatbot. Áp dụng cho: web **v2.2.2** · giao diện chat (`chat.js`) · Worker `aif-kb-chat` · Worker `aif-kb-sync` giữ nguyên.
Cập nhật: 12/11/2026.

---

## 1. Bản này thay đổi gì

| # | Thay đổi | Ở đâu |
|---|---|---|
| 1 | Mở chatbot **không còn lời chào dài và 3 câu gợi ý**. Màn đầu chỉ có **2 nút lớn**: "Tìm hiểu về AI First Business" và "Tìm hiểu về AI Economy". | `src/assets/js/chat.js`, `site.css` |
| 2 | Chọn nút nào thì chatbot **chỉ tìm trong sách đó**. Web gửi `book_id` chuẩn (`aifb` hoặc `aiec`); Worker lọc cả QA và đoạn sách ngay trong truy vấn. | `chat.js`, `workers/aif-kb-chat/src/*` |
| 3 | Sau khi chọn, hiện **3 câu gợi ý riêng của sách** (cơ chế gợi ý giữ như cũ: thu gọn được, câu hỏi liên quan sau mỗi câu trả lời). | `content/chat/chips.json` → mục `books` |
| 4 | **Bỏ file `assets/chat/kb.json`.** Dữ liệu FAQ (100 câu + 9 câu website + gợi ý + bản dịch) được **nhúng thẳng vào `chat.js`** khi dựng web. | `build.mjs` |
| 5 | Hỏi sai sách: chatbot nói thẳng chưa có trong sách này và hiện nút **"Hỏi trong “sách kia”"**; bấm là chuyển sách và hỏi lại đúng câu đó. | `chat.js`, Worker |

Không đổi: Worker `aif-kb-sync` (đồng bộ Google Drive → R2), cấu hình AI Search, mô hình, giới hạn tần suất, cách trả lời FAQ tại trình duyệt.

---

## 2. Luồng người dùng

```
Mở chat
  └─ Màn chọn sách (2 nút lớn, chưa có gợi ý, ô nhập báo "Chọn một nội dung ở trên…")
       │  (gõ chữ khi chưa chọn → không gửi, giữ chữ, nút chọn rung nhẹ)
       ▼
  Chọn sách  ──►  Thanh "Đang tìm hiểu: <sách> [Đổi]" + lời nhắn + 3 gợi ý của sách
       │
       ├─ Bấm gợi ý / gõ đúng 1 câu FAQ chỉ thuộc sách đó → trả lời tại trình duyệt (không gọi Worker)
       ├─ Gõ câu khác → gọi Worker kèm book_id → truy xuất đúng sách đã chọn
       │      └─ Worker không có nội dung phù hợp → "Hỏi trong “sách kia”" (bấm → đổi sách + hỏi lại)
       ├─ [Đổi] → hiện lại 2 nút, chọn sách khác (lịch sử gửi AI chỉ gồm lượt cùng sách)
       └─ ↻ Làm mới → xóa hội thoại, về màn chọn sách
```

Sách đang chọn được nhớ trong phiên trình duyệt (`sessionStorage`, khóa `aif-chat-vi|en|zh`); đóng tab là quên.

---

## 3. Kiến trúc

```
Google Drive (thư mục AIF-KB)
   │  aif-kb-sync (cron + Drive API)
   ▼
R2 bucket "aif-kb"  ──►  Cloudflare AI Search (instance autumn-sky-17c5, tìm lai vector + từ khóa)
                                   ▲
Trình duyệt (chat.js)              │ search()
   │  POST {message, lang, faq, hist, page, book_id}
   ▼                               │
aif-kb-chat (Worker) ── viết lại câu hỏi ─► tìm ─► LỌC THEO SÁCH ─► ghép ngữ cảnh ─► Workers AI ─► luồng chữ (SSE)
```

Ba tầng trả lời, theo thứ tự:

1. **Trình duyệt, miễn phí:** khớp chắc chắn một câu FAQ của sách đang chọn → trả lời tại chỗ.
2. **Worker + AI Search:** các câu còn lại.
3. **Thông báo "chưa có nội dung"** kèm nút Zalo / để lại lời nhắn (và nút đổi sách nếu đang ở chế độ chọn sách).

### Hợp đồng dữ liệu web ↔ Worker

Yêu cầu (`POST`, `Content-Type: text/plain` chứa JSON):

```json
{ "secret": "…", "message": "…", "lang": "vi|en|zh", "faq": [1, 80], "hist": [{"r":"u|b","t":"…"}], "page": "/", "book_id": "aifb|aiec" }
```

`book_id` là bắt buộc. Thiếu hoặc không hợp lệ, Worker trả `400 book-required`; giao diện quay về bộ chọn sách. Worker vẫn nhận `book: "aif"|"economy"` để tương thích các bản web cũ.

Trả lời: luồng SSE `data: {"t":"…"}` … `data: {"done":true,"nf":false,"src":"…","faq":[…]}`; hoặc JSON `{ "ok": true, "answer": "…", "nf": true }` khi không có tài liệu hợp lệ.

---

## 4. Cách chia hai kho (quan trọng nhất)

Hai sách vẫn **nằm chung một R2 và một AI Search**. Worker lọc ngay truy vấn theo thư mục sách đã chọn cho cả QA (`02-faq/book-qa/aifb` hoặc `aiec`) và đoạn sách (`03-sach/<book-folder>`). Nguồn QA phải khai báo `book_id` khớp thư mục. Mục thông tin website vẫn được xử lý riêng ở FAQ trình duyệt.

| Nhóm | Cách nhận biết | Hiện ở sách nào |
|---|---|---|
| Thuộc sách A | Nằm trong `03-sach/ai-first-business/` hoặc `03-sach/nen-kinh-te-tri-tue/` | Chỉ sách đó |
| Thẻ QA đối chiếu hai sách đã duyệt | Có thể đặt trong thư mục `aifb` như một ngoại lệ đã duyệt; nguồn từng sách phải được ghi riêng | Chỉ trả trực tiếp khi khớp đúng thẻ đó |

### Phân bố KB hiện tại (555 tệp)

| Thư mục | Số tệp | Thuộc |
|---|---|---|
| `01-the-khai-niem` (thẻ khái niệm) | 13 | **Cả 13 đều của AI First Business** |
| `02-faq` | 100 | 75 của AI First Business, **25 nêu cả hai sách** |
| `03-sach/ai-first-business` | 209 | AI First Business |
| `03-sach/nen-kinh-te-tri-tue` | 224 | AI Economy |
| `04-website` | 9 | Dùng chung |

**Hệ quả cần biết:** phía AI Economy **chưa có thẻ khái niệm hay FAQ riêng**; nó dựa vào 224 đoạn sách (văn bản quét OCR, còn nhiễu) và 25 FAQ nêu cả hai sách. Đây là lý do chất lượng trả lời phía AI Economy sẽ thấp hơn phía AI First Business cho tới khi soạn thêm nội dung. Việc này cần anh Sỹ duyệt nội dung (xem báo cáo).

Cách phía trình duyệt phân loại FAQ (hàm `inBook()` trong `chat.js`): đọc trường `ref` (`S1` = AI First Business, `S2` = AI Economy). FAQ thiếu nguồn hoặc nêu cả hai sách không được hiển thị như câu trả lời riêng của một sách. Khi đổi sách, lịch sử cũ bị xóa.

---

## 5. Tệp nào làm gì

### Web (`aifirstbusiness-v2.2.2`)

| Tệp | Việc |
|---|---|
| `site/assets/js/chat.js` | Giao diện và logic chat. Cấu hình hai sách, gửi `book_id`, xóa lịch sử khi đổi sách và hiển thị lựa chọn tư vấn. |
| `content/chat/faq.json`, `site.json` | 100 câu FAQ và 9 câu website (câu hỏi, trả lời, `ref`). |
| `content/chat/chips.json` | `books` = 3 câu gợi ý mỗi sách; `tr` = bản dịch EN/中文 của câu hỏi; `pages` = gợi ý theo trang (giữ lại, chat hiện không đọc). |
| `content/chat/faq-keywords.json` | Từ khóa phụ cho FAQ. |
| `content/i18n/en.json`, `zh.json` (mục `js`) | Chữ trong chat cho bản EN và 繁中. |
| `src/assets/css/site.css` (cuối tệp) | Kiểu cho nút chọn sách `.aic-pick*`, thanh `.aic-bar*`, nút `.aic-switch`. |
| `build.mjs` | Nhúng dữ liệu FAQ vào `dist/assets/js/chat.js`; không còn ghi `kb.json`. |
| `tests/kiem-thu-chat-sach.mjs` | Kiểm thử tự động giao diện chọn sách. |
| `form-config.js` (sinh ra khi dựng) | `window.AIF_CHAT = { url, secret }`: địa chỉ Worker và khóa. Lấy từ `site.config.json` → `chat`. |

### Worker (`workers/aif-kb-chat`)

| Tệp | Việc |
|---|---|
| `src/index.js` | Nhận và xác thực `book_id`, gọi `retrieve()` với phạm vi sách đã chọn; trả `400 book-required` nếu thiếu hoặc sai. Hỏi làm rõ khi câu “mô hình AI trong doanh nghiệp” có nhiều cách hiểu, thay vì tự đoán. Hỗ trợ ý định tư vấn bằng hai liên kết CTA, không ghi nhận lead. |
| `src/retrieve.js` | Tìm QA và đoạn sách bằng bộ lọc thư mục theo `book_id`; QA có `book_id` không khớp bị loại. |
| `src/prompts.js` | Chỉ dẫn trả lời theo nguồn, độ dài 60–100 từ (tối đa 120 từ), câu hỏi mơ hồ và bảo vệ ngữ cảnh; xác định 3A là Adopt–Adapt–Advance. |
| `src/generate.js` | Gọi mô hình, đổi luồng sang định dạng `{t}` (không đổi). |
| Worker `wrangler.jsonc` | Cấu hình Worker; `MAX_RESULTS` đặt số kết quả truy xuất. |

---

## 6. Việc thường làm

**Đổi 3 câu gợi ý của một sách.** Sửa `content/chat/chips.json`, mục `books`:
```json
"books": { "aif": [1, 80, 29], "economy": [10, 11, 98] }
```
Mỗi số là `id` trong `faq.json` (số) hoặc `site.json` (dạng `"W1"`). Id phải có bản dịch trong `tr` thì bản EN/中文 mới hiện. Dựng lại web.
Lưu ý: gợi ý của AI Economy hiện là FAQ 10, 11, 98; FAQ 98 nêu cả hai sách. Khi có FAQ riêng cho AI Economy nên thay vào đây.

**Đổi chữ trên hai nút.** Biến `BOOKS` đầu `chat.js` (`btn`, `name`). Chữ tiếng Anh và tiếng Trung sửa ở `content/i18n/{en,zh}.json`, mục `js`, khóa là đúng chuỗi tiếng Việt.

**Thêm FAQ.** Thêm vào `faq.json` với `ref` đúng ký hiệu `S1`/`S2`; thêm tệp `.md` tương ứng vào thư mục `02-faq` trên Google Drive (dòng đầu `# Câu hỏi`, dòng 2 `Nguồn: AI First Business, mục x.y` hoặc `Nguồn: Nền Kinh tế Trí tuệ, chương n`). Ghi **đúng tên sách** ở dòng `Nguồn:` vì Worker dựa vào đó để xếp sách.

**Thêm một sách thứ ba.** (1) Worker: thêm mục vào `BOOKS` trong `retrieve.js` (`name`, `folder`, `label`), cập nhật `normBook`/`otherBook` và `BOOK_LABEL` trong `prompts.js`. (2) Web: thêm vào `BOOKS` và `otherKey()` trong `chat.js`, thêm nút trong `showPicker`, thêm khóa vào `chips.json` → `books`, dịch chữ. (3) Chạy lại hai bộ kiểm thử.

**Chỉnh cách trả lời.** Sửa `systemPrompt()` trong `prompts.js`. Thử trên bộ câu hỏi trước khi deploy.

**Chỉnh số kết quả.** `MAX_RESULTS` trong cấu hình Worker (hiện mặc định 12). Kiểm tra `/debug` và các bài test trước khi đổi.

---

## 7. Kiểm thử

Worker (chạy bằng Node, không cần Cloudflare):
```
cd C:\aif-chatbot
node --test tests/*.test.mjs
```
Kiểm tra book_id bắt buộc, lọc QA và đoạn sách theo `aifb`/`aiec`, đổi ngữ cảnh, định tuyến QA đã duyệt, trả liên kết tư vấn, cùng các luồng chat hiện có.

Giao diện web (cần Node, Playwright và Chromium trong máy dựng):
```
node build.mjs
python3 -m http.server 8788 -d dist        # hoặc bất kỳ máy chủ tĩnh nào
node tests/kiem-thu-chat-sach.mjs
```
Kiểm tra: màn chọn sách, chữ trên 2 nút (VI/EN/中文), gõ khi chưa chọn, gợi ý đúng sách, FAQ chỉ sách được chọn, `book_id` đi đúng, đổi sách xóa hội thoại cũ, nút "Hỏi trong…", CTA tư vấn, làm mới và màn hình điện thoại.

Kiểm tra Worker thật (sau khi deploy), cần `ADMIN_TOKEN`:
```powershell
$h = @{ Authorization = "Bearer <ADMIN_TOKEN>" }
$b = '{"message":"Chín tầng của nền kinh tế trí tuệ là gì?","book_id":"aiec","lang":"vi"}'
Invoke-RestMethod -Uri https://aif-kb-chat.trantansy.workers.dev/debug -Method Post -Headers $h -Body $b -ContentType "text/plain; charset=utf-8"
```
Xem hai trường: `chunks` (đoạn được tìm) và `used` (tài liệu thật sự đưa cho mô hình). Mọi dòng trong `used` phải thuộc sách đã chọn. Đổi `"book_id"` thành `"aifb"` để so sánh.

Bộ 40 câu hỏi đánh giá chất lượng: `tools/eval` (xem `HUONG-DAN-DEPLOY.md`, mục chạy `node tools/eval/run_eval.mjs`).

---

## 8. Triển khai

**Thứ tự: Worker trước, web sau.**

### 8.1 Worker aif-kb-chat
1. Giải nén `aif-chatbot-v2.1.0.zip` đè lên thư mục `C:\aif-chatbot` (hoặc giải nén mới).
2. PowerShell:
   ```
   cd C:\aif-chatbot\workers\aif-kb-chat
   npx wrangler deploy
   ```
   Secret (`CHAT_SECRET`, `ADMIN_TOKEN`) được giữ nguyên, không đặt lại.
3. Mở `https://aif-kb-chat.trantansy.workers.dev/` để kiểm tra Worker hoạt động trước khi cập nhật web.
4. Chỉ deploy `aif-kb-chat`. **Không cần** deploy lại `aif-kb-sync`.

### 8.2 Web aifirstbusiness v2.2.2
1. Giải nén `aifirstbusiness-v2.2.2.zip` (có `wrangler.jsonc` và thư mục `site`).
2. PowerShell:
   ```
   cd <thư mục vừa giải nén>
   npx wrangler deploy
   ```
3. Mở aifirstbusiness.vn, bấm Ctrl + F5, mở chatbot: phải thấy 2 nút lớn.
4. Xác nhận bản chat đã đúng: mở `https://aifirstbusiness.vn/assets/js/chat.js`, dòng đầu có chữ `v2.5.0`; thử hai lựa chọn sách và CTA trên staging trước.

> Cảnh báo: Worker cần được cập nhật trước web. Nếu sau khi deploy vẫn thấy script cũ, hãy kiểm tra cache và mã riêng của website trước khi phát hành.

### 8.3 Tương thích chéo (khi chỉ cập nhật một bên)
| Web | Worker | Kết quả |
|---|---|---|
| mới (gửi `book_id` và alias `book`) | Worker cũ | Có thể chưa áp dụng bộ lọc sách; cập nhật Worker trước khi phát hành web. |
| web cũ (chỉ gửi `book`) | Worker mới | Tạm tương thích qua ánh xạ `aif`/`economy`; web cũ không được phép bỏ qua bước chọn sách trên bản mới. |

### 8.4 Quay lại bản cũ
- Web: Cloudflare → Workers & Pages → `aifirstbusiness-website` → **Deployments** → chọn bản chạy ngay trước đó → Rollback (nếu chưa từng deploy v2.2.1 thì là bản `a16d9b32`, chat-ui-2.3.1).
- Worker: Workers & Pages → `aif-kb-chat` → **Deployments** → chọn bản trước → Rollback.

---

## 9. Giới hạn và điểm cần chú ý

1. **`kb_files` trên trang kiểm tra của Worker** (`GET /`) đã báo **3** thay vì khoảng 555. Nếu đúng như vậy thì KB trong R2 chưa đồng bộ đủ và chatbot sẽ trả lời kém bất kể sửa giao diện. Kiểm tra `aif-kb-sync` chạy xong chưa (xem `HUONG-DAN-DEPLOY.md`).
2. **Phải bấm Purge cache** (AI Search → Settings → Similarity caching) sau mỗi lần sửa KB hoặc cài đặt, vì bộ nhớ đệm 48 giờ có thể trả kết quả cũ.
3. Nếu thấy `chunks` có kết quả nhưng `used` rỗng khi gọi `/debug`, kiểm tra bộ lọc sách, ngưỡng điểm và nội dung KB trước khi điều chỉnh `MAX_RESULTS`.
4. **Hai sách vẫn chung một AI Search.** Tách hẳn (hai instance, hai bucket) chắc chắn hơn nhưng tốn thêm cấu hình và có thể tăng phí AI Search từ 01/12/2026.
5. FAQ có nguồn cả hai sách không được hiển thị như FAQ riêng theo lựa chọn. Thẻ QA đối chiếu hai sách đã duyệt là ngoại lệ riêng.
6. **Giới hạn gửi dồn:** `chat.js` chặn hai câu hỏi cách nhau dưới 1 giây; Worker giới hạn 8 câu AI mỗi phút mỗi IP.
7. **`CHAT_SECRET` nằm trong `form-config.js` công khai**, không phải bí mật thật. Lớp bảo vệ chính là kiểm tra nguồn gốc (`ALLOWED_ORIGINS`) và giới hạn tần suất.

---

## 10. Sự cố thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Mở chat vẫn thấy lời chào cũ và 3 gợi ý | Trình duyệt giữ `chat.js` cũ, hoặc `site-worker.mjs` cũ còn chạy | Ctrl + F5; kiểm tra mục 8.2 bước 4 |
| Hai nút hiện nhưng bấm không ra gợi ý | `chips.json` → `books` thiếu hoặc id không có trong FAQ | Kiểm tra id; dựng lại web |
| Gợi ý EN/中文 thiếu câu | Id chưa có bản dịch trong `tr` | Thêm bản dịch |
| Luôn báo "chưa tìm thấy nội dung phù hợp trong …" | KB chưa đồng bộ đủ, bộ lọc sách không khớp hoặc truy xuất không có kết quả | `/debug`: xem `chunks` và `used`; kiểm tra `book_id`, `kb_files` và nguồn trong KB |
| Câu trả lời của AI Economy nhắc nội dung AI First Business | FAQ nêu cả hai sách được chọn vào ngữ cảnh | Soạn FAQ/thẻ riêng cho AI Economy; xem mục 4 |
| Lỗi CORS trong Console | Tên miền chưa có trong `ALLOWED_ORIGINS` | Thêm vào `wrangler.jsonc`, deploy Worker |
| Dựng web báo "thiếu dấu /*AIF_KB_DATA*/null" | Dấu nhúng bị xóa khỏi `chat.js` | Khôi phục dòng `var KB_DATA = /*AIF_KB_DATA*/null;` |
