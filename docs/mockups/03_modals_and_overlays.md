# 🪟 Modals & Dialogs System — BookStudio

> Tài liệu đặc tả 5 hộp thoại chức năng (Modals & Overlays) quan trọng nhất của BookStudio nhằm đảm bảo luồng nghiệp vụ khép kín, tiện dụng và chuyên nghiệp.

---

## 1. Modal 01: Xuất Bản Audio Master (Export Master Dialog)

### Mục tiêu
Ghép nối toàn bộ các đoạn âm thanh câu lẻ thành file audio hoàn chỉnh với các thông số phòng thu khắt khe (tiêu chuẩn xuất bản Audible / ACX).

```
+---------------------------------------------------------------------------------+
|  💾 XUẤT BẢN AUDIO ĐÃ THU                                                  [✕]  |
|---------------------------------------------------------------------------------|
|  Phạm vi xuất:                                                                  |
|  (•) Chỉ xuất Chương 1 hiện tại (06:24 • 85 câu)                                |
|  ( ) Xuất toàn bộ sách (24 chương • ~02h 45m • 2.050 câu)                       |
|                                                                                 |
|  Định dạng xuất xưởng:                                                          |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | [•] WAV Master     |  | [ ] MP3 Studio     |  | [ ] M4B Audiobook  |         |
|  | 48kHz 16-bit PCM   |  | 320kbps + ID3 Tag  |  | Chapter Cue Marks  |         |
|  | Chuẩn Lossless     |  | Tương thích mọi app|  | Dành cho Apple/iPod|         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  Tinh chỉnh khoảng lặng ngắt nhịp (Inter-sentence Silence):                     |
|  - Khoảng nghỉ giữa hai câu:       [----o-------] 350 ms                        |
|  - Khoảng nghỉ khi đổi đoạn văn:   [--------o---] 750 ms                        |
|  - Khoảng nghỉ đầu và cuối chương: [----o-------] 1500 ms                       |
|                                                                                 |
|  Thông tin nhãn ID3 Metadata:                                                   |
|  - Tên sách: Đề thi đẫm máu        - Tác giả: Lôi Mễ                           |
|  - Giọng đọc: Thảo Nhi             - Năm: 2026 • Thể loại: Trinh thám           |
|  - [x] Nhúng bìa sách tự động vào file audio                                    |
|                                                                                 |
|  Thư mục lưu: D:\Audiobooks\De_Thi_Dam_Mau_Chuong_1.wav       [ Thay đổi... ]   |
|---------------------------------------------------------------------------------|
|                                             [ Hủy ]  [ 🚀 Bắt đầu Ghép & Xuất ] |
+---------------------------------------------------------------------------------+
```

---

## 2. Modal 02: Cấu Hình Giọng Đọc & Engine TTS (Voice & Engine Manager)

### Mục tiêu
Quản lý kết nối tới Local TTS Server ([[VieNeu-TTS]]), lựa chọn các giọng đọc đặc thù đã tinh chỉnh và điều chỉnh thông số sinh âm.

```
+---------------------------------------------------------------------------------+
|  ⚙️ CẤU HÌNH GIỌNG ĐỌC & ENGINE                                            [✕]  |
|---------------------------------------------------------------------------------|
|  Engine tổng hợp giọng nói:                                                     |
|  [ VieNeu-TTS v3 Turbo 48kHz (Local Server: localhost:8880)               | v ] |
|  Trạng thái: 🟢 Đã kết nối GPU NVIDIA RTX 3060 (12GB VRAM)                      |
|                                                                                 |
|  Giọng đọc mặc định:                                                            |
|  [ Thảo Nhi (Nữ Nam Bộ ấm áp, đọc song ngữ & tiểu thuyết trinh thám)      | v ] |
|  * Các giọng khác: Ngọc Lan 18+ (Nữ Bắc Bộ đê mê), Hải Đăng (Nam trầm)...      |
|                                                                                 |
|  Độ ổn định cao độ (Temperature): [------o-----] 0.40                           |
|  💡 Khuyên dùng 0.35 - 0.45 để giữ vững âm chuẩn tiếng Việt, chống trôi giọng.  |
|                                                                                 |
|  Tốc độ đọc (Speed):              [-----o------] 1.00x                          |
|                                                                                 |
|  Mẫu thử giọng nhanh:                                                           |
|  "Xin chào, đây là giọng đọc Thảo Nhi đang phát thử trên BookStudio."           |
|  [ 🔊 Nghe Thử Ngay ] (Mất ~0.2s)                                               |
|---------------------------------------------------------------------------------|
|                                                          [ Đóng ] [ Lưu Cấu Hình]|
+---------------------------------------------------------------------------------+
```

---

## 3. Modal 03: Phân Vai Nhân Vật (Character Casting Dialog)

### Mục tiêu
Tạo thành tác phẩm kịch truyền thanh đa vai sống động bằng cách gán giọng đọc cho từng nhân vật trong sách.

- **Tự động nhận diện:** Hệ thống quét qua các câu thoại có dấu gạch ngang đầu dòng `—` hoặc trong ngoặc kép `""`.
- **Bảng phân vai trực quan:**
  1. `📖 Lời dẫn truyện`: Gán giọng **Thảo Nhi** (Nữ Nam Bộ).
  2. `👤 Phương Mộc`: Gán giọng **Hải Đăng** (Nam thanh niên).
  3. `👤 Tôn Phổ (Giáo sư)`: Gán giọng **Hải Đăng (Tốc độ 0.85x, Trầm)**.
  4. `👤 Nạn nhân nữ`: Gán giọng **Ngọc Lan** (Nữ thì thào).
- **Thao tác nhanh:** Bấm vào nút "Gán tất cả lời thoại của nhân vật này" để áp dụng cho cả cuốn sách.

---

## 4. Modal 04: Xem Trước & Làm Sạch Mục Lục (Ebook Import Preview)

### Mục tiêu
Khi người dùng kéo thả file `.epub` hoặc `.pdf` vào, modal này hiển thị trước cấu trúc sách để loại bỏ các trang rác trước khi bắt đầu tạo dự án:
- **Trang bìa & Tác quyền:** Tự động phát hiện và cho phép bỏ chọn (không cần đọc các trang bản quyền, mục lục in giấy, lời nói đầu nhà xuất bản).
- **Danh sách chương bóc tách được:** Kiểm tra tiêu đề chương và số lượng từ.
- **Tùy chọn gộp chương nhỏ:** Gộp các đoạn mở đầu ngắn vào Chương 1 để audiobook không bị vụn vặt.

---

## 5. Modal 05: Tinh Chỉnh Phiên Âm & Ngắt Nhịp (Phonetics & Pronunciation Dictionary)

### Mục tiêu
Xử lý các từ viết tắt chuyên ngành, tiếng Anh hoặc tên riêng nước ngoài bị AI đọc sai:
- Ví dụ: `FBI` $\rightarrow$ `Ép Bi Ai`.
- `Sherlock Holmes` $\rightarrow$ `Sơ Lốc Hôm`.
- `TP.HCM` $\rightarrow$ `Thành phố Hồ Chí Minh`.
- Người dùng chỉ cần thêm 1 lần vào từ điển dự án, toàn bộ cuốn sách sẽ tự động được chuẩn hóa trước khi đưa vào hàng đợi đọc TTS.
