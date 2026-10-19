# 📚 Screen 01: Project Dashboard & Book Manager

> **Mục tiêu:** Quản lý toàn bộ danh thư viện sách nói, trạng thái tiến độ sản xuất từng cuốn, nhập sách mới (EPUB, PDF, MOBI) và cấu hình dự án nhanh chóng.

---

## 1. Bố Cục Giao Diện (Layout Wireframe)

```
+-----------------------------------------------------------------------------------------------+
| [🎙️ BookStudio v1.0]   [📚 Dự án Sách] [🎧 Studio]          [VieNeu-TTS: Online :8880] [⚙️]  |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|  QUẢN LÝ DỰ ÁN SÁCH NÓI                                     [ ➕ Thêm Sách Mới (EPUB/PDF) ]   |
|  Import sách từ file EPUB, PDF hoặc quản lý các dự án dở dang.                                |
|                                                                                               |
|  +-----------------------------------------------------------------------------------------+  |
|  |  📖 Kéo thả file sách (.epub, .pdf, .mobi) vào đây để bắt đầu dự án mới                |  |
|  |     Tự động nhận diện Mục lục (TOC), bóc tách từng chương và làm sạch văn bản           |  |
|  +-----------------------------------------------------------------------------------------+  |
|                                                                                               |
|  DỰ ÁN GẦN ĐÂY (3 SÁCH)                                       [🔍 Tìm kiếm sách...         ]  |
|                                                                                               |
|  +---------------------------+  +---------------------------+  +---------------------------+  |
|  | 📕 Đề thi đẫm máu         |  | 🔞 Bạn trai bị cắm sừng   |  | 🌲 Pinocchio Bilingual    |  |
|  | Lôi Mễ • 24 Chương        |  | Adult Erotic • 8 Chương   |  | Carlo Collodi • 36 Chương |  |
|  | 🎙️ Giọng: Thảo Nhi (Studio)|  | 🎙️ Giọng: Ngọc Lan 18+    |  | 🎙️ Giọng: Thảo Nhi Bi    |  |
|  | ------------------------- |  | ------------------------- |  | ------------------------- |  |
|  | Đang sản xuất: 18/24 (75%)|  | Hoàn thành (1h 42m Master)|  | Mới import: 0/36 (Chờ)    |  |
|  | [████████████░░░░]        |  | [████████████████]        |  | [░░░░░░░░░░░░░░░░]        |  |
|  +---------------------------+  +---------------------------+  +---------------------------+  |
|                                                                                               |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Các Thành Phần Trực Quan (Component Specifications)

### 1. Khu Vực Kéo Thả (Universal Drag & Drop Zone):
- Nhận diện các extension: `.epub`, `.pdf`, `.mobi`, `.txt`.
- Khi kéo file vào: Viền đổi sang màu tím gradient phát sáng (`border-brand-500 shadow-brand-500/20`), hiển thị hiệu ứng phóng to icon sách.
- Khi thả file: Kích hoạt Tauri command `parse_ebook` và mở **Modal Xem Trước Mục Lục (TOC Preview)** trước khi tạo dự án chính thức.

### 2. Thẻ Dự Án Sách (Book Project Card):
- **Bìa sách:** Trích xuất tự động từ file EPUB/PDF (nếu không có sẽ tự render bìa vector gradient kèm chữ viết tắt tên sách).
- **Trạng thái (Status Badges):**
  - `Đang sản xuất`: Màu vàng hổ phách / xanh ngọc kèm thanh tiến độ % (ví dụ: `75%`).
  - `Hoàn thành`: Màu xanh lá cây kèm nhãn thời lượng tổng (ví dụ: `01h 42m`).
  - `Chưa đọc / Mới`: Màu xám viền nét đứt.
- **Tên giọng đọc chính:** Hiển thị preset giọng được gán cho cuốn sách (`Thảo Nhi`, `Ngọc Lan 18+`...).
- **Hành động khi click:** Nhấp vào thẻ sẽ mở thẳng dự án trong **Screen 02: Studio Workspace**.
- **Menu 3 chấm (`...` Context Menu):**
  - Mở thư mục chứa file audio xuất bản (`Open Export Folder`).
  - Đổi tên sách / tác giả.
  - Xóa dự án (kèm xác nhận xóa sạch cache WAV để giải phóng ổ cứng).

### 3. Thanh Thống Kê Nhanh (Bottom Quick Stats Bar):
- Tổng dung lượng cache audio đã dùng (ví dụ: `2.4 GB`).
- Tổng thời lượng audiobook đã sản xuất trong hệ thống.
