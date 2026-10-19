# Builder Handoff Report — BookStudio

**Generated:** 2026-10-19  
**Session:** Build V3 (The Builder)  
**Target:** Desktop Production App (Tauri v2 + Next.js App Router + SQLite + VieNeu-TTS)

---

## What Was Built

### MUS Features Implemented

- [x] **FR-001: Ebook Ingestion & Metadata Extraction** — Bộ bóc tách tệp sách (`.epub`, `.txt`, `.md`) bằng Rust. Trích xuất metadata (tiêu đề, tác giả, ảnh bìa Base64) và cây thư mục chương (TOC) sạch mã HTML.
- [x] **FR-002: Smart Sentence Segmentation & Text Normalization** — Trình tách câu thông minh chuyên biệt cho tiếng Việt và tiếng Anh. Xử lý dấu ba chấm `...`, dấu gạch ngang thoại `—`, ngoặc kép `""`, danh sách từ viết tắt (`TP.HCM`, `Mr.`, `Dr.`, `v.v.`) và chia nhỏ đoạn văn dài chống suy giảm chú ý TTS.
- [x] **FR-007: Project State Persistence & Local SQLite Cache** — Hệ cơ sở dữ liệu nhúng SQLite (`rusqlite`) lưu trữ dự án, danh mục chương, từng câu thoại, trạng thái và đường dẫn file âm thanh WAV.
- [x] **FR-003: TTS Engine Integration & Voice Preset Manager** — Trình kết nối bất đồng bộ tới Local [[VieNeu-TTS]] OpenAI Speech API (`http://localhost:8880/v1/audio/speech`). Bộ chọn preset giọng đọc (`Thảo Nhi`, `Ngọc Lan 18`, `Hà Phương`, `Minh Tuấn`), thanh trượt tốc độ (Speed) và độ biểu cảm (Temperature). Hàng đợi tạo audio cả chương với tiến độ trực quan.
- [x] **FR-004: Sentence-Level Waveform Inspector & Synchronized Playback** — Phân vùng timeline sóng âm đáy sử dụng `wavesurfer.js` v7. Hỗ trợ hiển thị biên độ sóng, thước đo thời gian, phím tắt `Space` Phát/Tạm dừng, thanh trượt zoom sóng âm và Teleprompter tự động cuộn đồng bộ chữ đang đọc.
- [x] **FR-005: One-Click Sentence Audio Regeneration & Text Edit** — Cho phép nhấp đúp chỉnh sửa văn bản từng câu trực tiếp, phím tắt `Ctrl+Enter` để tái tạo riêng câu bị đọc lỗi mà không cần chạy lại cả chương.
- [x] **FR-006: Chapter Assembly & Multi-Format Audio Export** — Ghép nối audio lossless qua crate `hound`. Cho phép chèn khoảng lặng giữa các câu (`sentence_pause_ms`) và giữa các đoạn (`paragraph_pause_ms`), xuất bản file WAV Master hoàn chỉnh.

---

### Files Created & Modified

```
book-studio/
├── src-tauri/                         # Rust Backend Core
│   ├── Cargo.toml                     # Rusqlite, Hound, Reqwest, Tokio, Quick-xml, Zip
│   ├── tauri.conf.json                # Cấu hình cửa sổ 1400x900 & capabilities
│   ├── capabilities/default.json      # Quyền dialog & fs
│   └── src/
│       ├── lib.rs                     # Đăng ký SQLite DB state & 11 Tauri IPC commands
│       ├── models/mod.rs              # Structs: Project, Chapter, Sentence, EbookParsedData
│       ├── db/mod.rs                  # Quản lý SQLite migrations & CRUD queries
│       ├── services/
│       │   ├── ebook/                 # Parser EPUB zip container & plain text
│       │   ├── tokenizer/             # NLP Sentence Segmenter cho tiếng Việt
│       │   ├── tts/                   # VieNeu-TTS HTTP client & WAV duration reader
│       │   └── audio/                 # Ghép nối PCM WAV & chèn khoảng lặng silence
│       └── commands/
│           ├── ebook.rs               # parse_ebook, import_ebook_to_project
│           ├── project.rs             # get_projects, get_chapters, get_sentences, update_sentence_text
│           ├── tts.rs                 # check_tts_connection, synthesize_sentence, regenerate_sentence
│           └── audio.rs               # export_chapter_audio, read_audio_base64
├── src/                               # Frontend Next.js + React 19 + Tailwind
│   ├── app/
│   │   ├── layout.tsx                 # Root layout & font Geist
│   │   ├── page.tsx                   # Studio workspace điều phối 3 phân vùng & modals
│   │   └── globals.css                # Tailwind CSS v4 Dark Studio Palette
│   ├── components/studio/
│   │   ├── HeaderBar.tsx              # Top header: info sách, TTS health check, Batch generate, Export
│   │   ├── ChapterList.tsx            # Cột trái: mục lục chương, % tiến độ, thời lượng
│   │   ├── SentenceTable.tsx          # Trung tâm: bảng câu, teleprompter highlight, edit inline, regenerate
│   │   ├── WaveformPanel.tsx          # Đáy: wavesurfer.js timeline, zoom, scrubber, spacebar hotkey
│   │   ├── VoiceModal.tsx             # Modal cài đặt giọng đọc & test ping server
│   │   ├── ExportModal.tsx            # Modal xuất audio master & tinh chỉnh khoảng lặng
│   │   └── ImportModal.tsx            # Modal drag & drop import sách và preview TOC
│   ├── stores/
│   │   ├── useProjectStore.ts         # Zustand store quản lý state dự án, chương, câu
│   │   └── useStudioSettingsStore.ts  # Zustand store quản lý voice presets, server URL, zoom
│   ├── lib/
│   │   ├── tauri.ts                   # Tauri IPC client an toàn có fallback preview
│   │   └── utils.ts                   # cn, formatDuration, formatTimeHours
│   └── types/index.ts                 # Toàn bộ TypeScript interfaces đồng bộ với Rust
└── docs/
    └── Builder_Handoff_Report.md      # Báo cáo nghiệm thu hoàn tất build
```

---

## Verification Status

| Check | Tool / Command | Status |
| :--- | :--- | :--- |
| **Blueprint & PRD Files** | `python scripts/vibe-verify.py` | ✅ PASS (14/14 blueprint files) |
| **Rust Backend Compilation** | `cargo check --manifest-path src-tauri/Cargo.toml` | ✅ PASS (0 errors, 0 warnings) |
| **Frontend TypeScript** | `npx tsc --noEmit` | ✅ PASS (0 errors) |
| **Production Static Build** | `pnpm build` | ✅ PASS (Generated static export `out/`) |

---

## How to Run

### Chạy ứng dụng Desktop (Development Mode):
```powershell
# Chạy desktop Tauri app (tự động bật dev server Next.js tại port 3000)
pnpm tauri dev
```

### Chạy kiểm tra riêng Frontend (Web Browser):
```powershell
pnpm dev
# Mở trình duyệt tại http://localhost:3000
```

### Đóng gói ứng dụng Desktop (Production Installer):
```powershell
pnpm tauri build
```

---

## What's Next (Future Features)

- [ ] **FR-008:** Multi-Voice & Character Dialogue Assignment (Phân vai giọng đọc khác nhau cho từng nhân vật).
- [ ] **FR-009:** Background Music (BGM) & Ambient Sound Effects (Chèn nhạc nền và hiệu ứng âm thanh với audio ducking tự động).
- [ ] **FR-010:** Embedded Offline Piper/Sherpa-ONNX Engine (Đọc offline không cần Python server).
