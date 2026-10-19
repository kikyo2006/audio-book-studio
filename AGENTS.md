# Agent Rules — BookStudio (Audiobook Production Studio)

## ⚠️ QUAN TRỌNG - ƯU TIÊN SỐ 1

- **TODO note:** Nếu trong code có comment todo, đảm bảo phải hoàn thành tính năng của comment todo đó trước khi hoàn thành task.
- **Implementation Plan:** Khi lập Implementation Plan thì Implementation Plan luôn là tiếng Việt.
- **Check code and logic:** Bất cứ phần code nào làm xong phải double check lại xem có khả năng bị issue gì không (null pointer, undefined variable, memory leak, panic Rust...), nếu có phải lập tức fix liền và thông báo cho anh Yu.
- **Xưng hô & Ngôn ngữ:** Gọi user là anh Yu và tự xưng là em. Sử dụng phương ngữ miền Nam Việt Nam (không dùng các từ miền Bắc như `vâng`, `ạ`).
- **Không đụng chạm Production:** Tuyệt đối không viết code tiếng Việt vào project `production.oznoz.com`.

## 🧠 OBSIDIAN MEMORY PROTOCOL — BOOKSTUDIO (MANDATORY)

- **Target Project Node:** `[[Book-Studio]]`
- **Target Project Folder:** `01_Projects/Book-Studio/`
- **Target Knowledge Repo:** `07_Knowledge_Repository/`
- **Linked Nodes:** `[[VieNeu-TTS]]`, `[[Master_Vietnamese_TTS_Voice_Building_Protocol]]`

### 1. Nguyên Tắc Cốt Lõi (Mandatory Rules)
- **Step 0 - Search First:** TRƯỚC KHI viết bất kỳ dòng code nào hoặc trả lời câu hỏi phức tạp, bạn PHẢI sử dụng công cụ `obsidian_search_notes` hoặc `obsidian_get_note` để quét qua Vault (`01_Projects/Book-Studio/`, `01_Projects/VieNeu-TTS/`).
- **Search Keywords:** Sử dụng các từ khóa: `Book-Studio`, `VieNeu-TTS`, `Audiobook`, `Waveform`, `Tauri`, `Ebook`, `Logic`, `Bug` để tìm các quyết định kỹ thuật cũ.
- **Cross-Reference & Source of Truth:** Nếu tìm thấy thông tin mâu thuẫn giữa code hiện tại và ghi chú trong Obsidian, PHẢI dừng lại và hỏi anh Yu để xác nhận "Source of Truth".
- **Memory Consistency:** Khi anh Yu đưa ra chỉ dẫn mới quan trọng hoặc sau khi hoàn thành task/fix bug, tự động cập nhật vào Obsidian Memory (`01_Projects/Book-Studio/`) để đồng bộ hóa kiến thức cho các phiên làm việc sau.
- **Node Connect:** Mọi ghi chú tạo mới hoặc cập nhật liên quan đến dự án này PHẢI chứa từ khóa liên kết `[[Book-Studio]]`. Khi có tích hợp mô hình giọng đọc, liên kết thêm `[[VieNeu-TTS]]`.

### 2. Quy Trình Lưu Trữ & Phân Loại Thông Minh (Smart Logging)
Để tránh làm rác dữ liệu, hãy tuân thủ quy trình lưu trữ sau:
- **High-Value Info (Lưu vào thư mục dự án):** Chỉ tạo file mới cho các nội dung: Bản thiết kế kiến trúc (Architecture), đặc tả kỹ thuật (Specs/PRD), phân tích logic ghép audio/sóng âm phức tạp, hướng dẫn vận hành server TTS hoặc quy trình xử lý bug nghiêm trọng.
  - **Đường dẫn:** `01_Projects/Book-Studio/{{date}}-{{short-description}}.md`
  - **Format:** Bắt buộc có frontmatter tags: `[book-studio, tauri, rust, nextjs, tts]`, date, và liên kết node `[[Book-Studio]]`.
- **General Chat & Q&A (Lưu vào Nhật ký hàng ngày):** Đối với các câu trả lời giải đáp thắc mắc, các lỗi bug nhỏ đã fix trong ngày, hoặc cấu hình phụ trợ vụn vặt, không tạo file mới. Sử dụng công cụ `obsidian_append_to_note` để nối thêm vào file Daily Note của ngày hôm đó:
  - **Đường dẫn:** `04_Daily/{{date}}.md`
  - **Vị trí:** Nối vào dưới mục `## 📝 Nhật ký ghi chú nhanh`.
- **Knowledge Repository:** Những kiến thức chung có thể tái sử dụng ở nhiều project (kỹ thuật DSP xử lý WAV/PCM trong Rust, tối ưu Web Audio API/Canvas cho WaveSurfer, trích xuất cấu trúc EPUB chuẩn) hãy lưu tại:
  - **Đường dẫn:** `07_Knowledge_Repository/`

### 3. Nguyên Tắc Lọc (Filter Principle)
- Trước khi lưu một nội dung, tự đặt câu hỏi: *"Thông tin này có giá trị tái sử dụng trong tương lai cho anh Yu và các Agent tiếp theo không?"*. Nếu chỉ là hội thoại chào hỏi xã giao hoặc giải thích cú pháp cơ bản thì bỏ qua bước lưu trữ.

---

## 🏗️ Architecture & Technology Stack

- **Application Type:** Desktop Production App for Windows/macOS.
- **Desktop Runtime:** **Tauri v2** (`@tauri-apps/cli`, `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`).
- **Frontend Stack:**
  - **Framework:** Next.js (App Router, Static Export `output: 'export'`) hoặc Vite + React 19 + TypeScript.
  - **Styling & UI:** Tailwind CSS, Radix UI / shadcn/ui, Lucide Icons.
  - **Audio Visualization & Interaction:** `wavesurfer.js` v7+ (Plugins: Timeline, Regions, Minimap, Hover), Web Audio API.
  - **State Management:** Zustand (quản lý state chương, danh sách câu, timeline phát âm thanh, TTS queue).
- **Backend Stack (Rust `src-tauri/`):**
  - **Ebook Parsers:**
    - EPUB: crate `epub` / `quick-xml` (trích xuất metadata bìa, TOC, HTML chapter text).
    - PDF: crate `pdf-extract` / `lopdf` (bóc tách trang và layout text).
    - MOBI/AZW3: PalmDOC unpacker hoặc Calibre converter sidecar.
  - **Text Segmentation & NLP:**
    - Trình bóc tách câu (Sentence Tokenizer) chuyên biệt cho tiếng Việt & tiếng Anh, xử lý thông minh dấu ba chấm `...`, lời thoại `—`, ngoặc kép `""`, viết tắt `TP.HCM`, `Mr.`, `Dr.`.
  - **Audio Processing Engine:**
    - Crate `hound` (đọc/ghi WAV PCM 16/24/32-bit), `symphonia` (decode đa định dạng).
    - Ghép nối audio tự động theo câu (Concatenation) với độ dài khoảng lặng tuỳ chỉnh (inter-sentence silence 300-500ms, paragraph pause 700-1000ms).
    - FFmpeg Sidecar / `ffmpeg-next`: Export sang MP3 (ID3 tags bìa sách + tên chương) và M4B (Audiobook chapter marks).
  - **Database & Persistence:**
    - SQLite nhúng (`rusqlite`) lưu trữ project sách: metadata, danh sách chương, trạng thái từng câu (text, audio_path, duration, status: `pending` | `generating` | `ready` | `error`).
  - **TTS Client:**
    - `reqwest` streaming HTTP client kết nối tới Local TTS Server:
      - [[VieNeu-TTS]] OpenAI-compatible API (`http://localhost:8880/v1/audio/speech`).
      - Hỗ trợ chọn preset giọng (`Thảo Nhi`, `Ngọc Lan 18`, etc.), nhiệt độ `temperature`, tốc độ `speed`.

---

## ⚙️ Environment & Tooling Quirks (Windows)

- **Package Manager:** Ưu tiên dùng `pnpm` hoặc `bun` cho frontend (`pnpm install`, `pnpm run tauri dev`).
- **Rust Toolchain:** Sử dụng `cargo` phiên bản stable 64-bit MSVC.
- **Tauri CLI:** Chạy thông qua `pnpm tauri <command>` hoặc `cargo tauri <command>`.
- **Local TTS Server:**
  - [[VieNeu-TTS]] chạy ngầm tại port `8880` qua script `D:\Workspace\AI\VieNeu-TTS\run_server.ps1`.
  - App phải có tính năng ping health-check (`GET /v1/models` hoặc endpoint kiểm tra) để báo trạng thái kết nối tới TTS engine.

---

## 🛡️ Coding Standards & Safety Guidelines

- **Check code & Logic:** Double-check tất cả biến và luồng điều kiện (null/undefined trong TypeScript, `Option`/`Result` handling trong Rust, không dùng `.unwrap()` cẩu thả gây panic desktop app).
- **Sentence-Level Granularity:** Tuyệt đối không sinh audio nguyên cả chương một lần. Luôn chia nhỏ thành từng câu (Sentence-level chunks). Điều này cho phép:
  1. Retry/Regenerate từng câu bị lỗi mà không tốn công đọc lại cả chương.
  2. Bắt đầu nghe thử ngay câu đầu tiên trong lúc các câu sau đang tiếp tục sinh âm (Streaming preview).
  3. Ghép nối chính xác và quản lý khoảng cách nghỉ nhịp giữa các câu.
- **Preserve Documentation:** Giữ gìn chú thích mã nguồn, tài liệu thiết kế trong thư mục `docs/`.
