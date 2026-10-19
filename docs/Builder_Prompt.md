# Builder Prompt — BookStudio

## Stack-Specific Instructions

1. **Desktop Shell:** Tauri v2 (`@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`).
2. **Frontend:** Next.js 15 App Router configured for static export (`output: 'export'` in `next.config.ts`), TypeScript, Tailwind CSS, `shadcn/ui`, `wavesurfer.js` v7.
3. **Backend Core:** Rust MSVC stable. IPC commands live in `src-tauri/src/commands/`.
4. **TTS Integration:** Connects to local [[VieNeu-TTS]] OpenAI-compatible server at `http://localhost:8880/v1/audio/speech`. Default voices: `Thảo Nhi` and `Ngọc Lan 18`.

---

## MUS Priority Order

1. **FR-001:** Ebook Ingestion & Metadata Extraction (Parse EPUB & PDF into chapters).
2. **FR-002:** Smart Sentence Segmentation & Text Normalization (Sentence tokenizer).
3. **FR-007:** Project State Persistence & Local SQLite Cache (Store book state & sentences).
4. **FR-003:** TTS Engine Integration & Voice Preset Manager (Async worker calling VieNeu-TTS).
5. **FR-004:** Sentence-Level Waveform Inspector & Synchronized Playback (`wavesurfer.js` timeline).
6. **FR-005:** One-Click Sentence Audio Regeneration & Text Edit (Tweak sentence & re-read).
7. **FR-006:** Chapter Assembly & Multi-Format Audio Export (Concatenate WAVs with pause injection, export MP3/M4B).

---

## Special Considerations & Gotchas

- **Next.js Static Export:** Do not use Node.js server APIs or dynamic server components. All filesystem and network tasks must be offloaded to Rust via Tauri IPC `invoke()`.
- **WaveSurfer.js Cleanup:** Ensure `ws.destroy()` is invoked in `useEffect` cleanup return to prevent audio buffer memory leaks.
- **WAV Concatenation:** Ensure sample rate (48000Hz) and bit depth match across all sentence files before appending samples.
