# 🎧 Screen 02: Studio Workspace (Phòng Thu Âm & Biên Tập)

> **Mục tiêu:** Màn hình làm việc chính của người sản xuất Audiobook. Bố cục 3 phân vùng (3-pane layout) cho phép bóc tách từng câu văn, nghe thử thời gian thực, soi sóng âm, phát hiện lỗi đọc vấp và tái tạo câu ngay lập tức.

---

## 1. Bố Cục Giao Diện (3-Pane Architecture Wireframe)

```
+----------------------------------------------------------------------------------------------------+
| [🎙️ BookStudio] [📚 Sách] [🎧 Studio]  | Đang mở: Đề thi đẫm máu • Thảo Nhi 48kHz | [VieNeu-TTS: OK]     |
+----------------------+-----------------------------------------------------------------------------+
| MỤC LỤC CHƯƠNG (24)  | CHƯƠNG 1: BẮT ĐẦU ÁC MỘNG  (85 câu • 1.420 từ)       [🔍 Tìm kiếm] [Bộ lọc] |
|----------------------|-----------------------------------------------------------------------------|
| [1] Bắt đầu ác mộng  |  [▶] #001 [Dẫn chuyện: Thảo Nhi] [00:00 - 00:07 • 7.68s]        [Đã đọc 48k]  |
|     100% • 06:24 [✓] |      Điều Phương Mộc muốn tìm hiểu, chính là những việc xảy ra trong hai... |
|                      |      [🔄 Regenerate] [✂️ Cắt khoảng lặng]                                   |
| [2] Lá thư khiêu...  | --------------------------------------------------------------------------- |
|     45%  • Đang đọc  |  [▶] #002 [Dẫn chuyện: Thảo Nhi] [00:07 - 00:12 • 5.20s]        [Đã đọc 48k]  |
|                      |      Trời đã về khuya, những hạt mưa thu lất phất đập vào cửa sổ ký túc xá  |
| [3] Hồ Huỳnh Độc     | --------------------------------------------------------------------------- |
|     Chờ  • --:--     |  [▶] #003 [💬 Thoại: Bạn cùng phòng (Hải Đăng)]                  [Đã đọc]      |
|                      |      — Cậu vẫn chưa ngủ à Phương Mộc? — Giọng người bạn vang lên mệt mỏi.   |
| [4] Dấu vân tay...   | --------------------------------------------------------------------------- |
|     Chờ  • --:--     |  [⏳] #004 [Dẫn chuyện: Thảo Nhi]                    [Đang sinh âm trên RTX...]|
|                      |      Phương Mộc không trả lời, ánh mắt cậu vẫn dán chặt vào trang báo...    |
|----------------------|                                                                             |
| [⚡ Đọc Tự Động Toàn |                                                                             |
|    Bộ Chương Này ]   |                                                                             |
+----------------------+-----------------------------------------------------------------------------+
| [⏮] [▶/⏸] [⏭]  00:03.42 / 00:07.68  [x] Tự nhảy câu tiếp  | Soi câu #001 | Zoom [---o---] [🔄 Đọc lại] |
| -------------------------------------------------------------------------------------------------- |
| 00:00.0        00:01.0        00:02.0        00:03.0        00:04.0        00:05.0        00:07.68 |
| | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |  |
| ▄█▄███▄███▄▄████████▄██▄███▄▄█████████▄▄█████|████████████████████████████████████████████████████ |
| [Đã phát qua - Tím hồng]                    [Playhead đỏ]    [Chưa phát - Xanh Indigo]             |
| 48.000 Hz • 16-bit PCM Mono  •  Sạch hoàn toàn rè kim loại (Fix3_Crisp)  •  Peak: -1.2 dBFS        |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Chi Tiết Tương Tác Từng Phân Vùng

### 1. Phân Vùng Trái: Mục Lục Chương (Chapter Explorer - 260px)
- **Tiến độ từng chương:** Nhãn phần trăm (`100%`, `45%`, `Chờ`) với vạch màu trực quan.
- **Thời lượng ước tính / thực tế:** Hiển thị số phút giây audio đã render (ví dụ: `06:24`).
- **Nút "⚡ Đọc Tự Động Toàn Bộ Chương" (Batch Synthesis):** 
  - Đưa tất cả các câu trong chương vào hàng đợi và kích hoạt worker chạy ngầm trên GPU RTX 3060.
  - Người dùng vẫn có thể vừa nghe các câu đã xong vừa để worker sinh tiếp các câu còn lại.

### 2. Phân Vùng Trung Tâm: Bảng Câu Văn Bản & Teleprompter (Script View)
Lấy cảm hứng từ giao diện đột phá của **Descript** và **ElevenLabs Projects**:
- **Tách câu thông minh:** Mỗi dòng là một đơn vị câu độc lập với số thứ tự (`#001`, `#002`...).
- **Huy hiệu Nhân vật (Character Tag):** Phân biệt rõ câu dẫn chuyện (`Dẫn chuyện: Thảo Nhi`) và câu đối thoại (`💬 Thoại: Bạn cùng phòng - Hải Đăng`).
- **Chỉnh sửa văn bản trực tiếp (Inline Contenteditable):**
  - Người dùng có thể click chuột vào text để sửa lỗi chính tả, thêm dấu phẩy ngắt nhịp hoặc phiên âm từ khó.
  - Nhấn `Ctrl + Enter` ngay tại câu để yêu cầu AI đọc lại câu vừa sửa.
- **Karaoke Sync (Đồng bộ chữ theo tiếng):**
  - Khi audio đang phát đến câu nào, cả khung câu đó sẽ sáng viền phát sáng (`border-brand-500 shadow-md`), tự động cuộn màn hình để giữ câu đang đọc luôn nằm giữa tầm mắt người dùng.
- **Nút "🔄 Regenerate" (Tái tạo âm thanh câu lỗi):**
  - Chỉ mất khoảng 0.3s - 0.7s để sinh lại 1 câu duy nhất mà không cần chạm vào các câu khác.

### 3. Phân Vùng Đáy: Sóng Âm Waveform & Điều Khiển Phát (WaveSurfer Timeline - 176px)
- **Thanh thước đo thời gian (Ruler):** Chia vạch giây (`00:01.0`, `00:02.0`...) chuẩn xác từng mili-giây.
- **Hiển thị sóng âm 2 màu:** Phần audio đã phát qua có màu tím hồng rực rỡ (`#ec4899`), phần còn lại màu xanh chàm (`#6366f1`).
- **Kim phát (Playhead):** Đường kẻ đứng màu đỏ neon (`#f43f5e`) di chuyển mượt mà 60fps theo audio.
- **Scrubbing tức thì:** Bấm chuột vào bất kỳ vị trí nào trên sóng âm để phát ngay từ điểm đó.
- **Chế độ "Đọc liên tục" (Auto-next):** Khi hết câu #001, playhead tự động nhảy sang câu #002 và phát tiếp liền mạch.

---

## 3. Hệ Thống Phím Tắt Tiêu Chuẩn Phòng Thu (Studio Hotkeys)

| Phím tắt | Tác vụ |
| :--- | :--- |
| `Space` | Play / Pause âm thanh câu đang chọn |
| `Ctrl + Enter` (hoặc `Cmd + Enter`) | Đọc lại ngay câu đang chỉnh sửa (Instant Regenerate) |
| `J` / `L` | Tua lùi 2 giây / Tua tới 2 giây |
| `Arrow Up` / `Arrow Down` | Chọn câu trước / Chọn câu kế tiếp |
| `Ctrl + Shift + E` | Mở nhanh hộp thoại Xuất Audio (Export Master) |
| `[` / `]` | Thu nhỏ / Phóng to thanh sóng âm Waveform (Zoom In/Out) |
