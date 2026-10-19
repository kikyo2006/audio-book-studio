# Coding Guidelines — BookStudio

> **The Law of the Codebase** — All code written for BookStudio MUST adhere strictly to these principles.

---

## 1. Architecture & Component Separation

```
book-studio/
├── src-tauri/                     # Rust Desktop Core
│   ├── src/
│   │   ├── commands/              # Tauri IPC Command Handlers
│   │   │   ├── ebook.rs           # EPUB/PDF parser commands
│   │   │   ├── tts.rs             # Local TTS client & queue commands
│   │   │   ├── audio.rs           # WAV splice, pause injection, export
│   │   │   └── project.rs         # SQLite persistence commands
│   │   ├── models/                # Rust Data structs & DTOs
│   │   ├── services/              # Pure business logic (parsers, audio DSP)
│   │   ├── db/                    # SQLite migrations and query functions
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                           # Next.js / React 19 Frontend
│   ├── app/                       # App Router routes & layout
│   ├── components/                # Reusable UI Components
│   │   ├── ui/                    # shadcn / Radix primitives
│   │   ├── studio/                # Studio workspace panels
│   │   │   ├── ChapterList.tsx    # Left sidebar: Chapters & progress
│   │   │   ├── SentenceTable.tsx  # Center: Sentence script & statuses
│   │   │   ├── WaveformPanel.tsx  # Bottom: wavesurfer.js timeline
│   │   │   └── ExportModal.tsx    # Dialog: Format & bitrate selection
│   ├── hooks/                     # Custom React hooks (useWaveSurfer, useTtsQueue)
│   ├── stores/                    # Zustand stores (useProjectStore, useAudioStore)
│   ├── lib/                       # Tauri IPC client wrappers & utilities
│   └── types/                     # TypeScript interfaces matching Rust DTOs
└── docs/                          # Architecture & PRD specifications
```

---

## 2. Rust Backend Rules (Tauri Core)

1. **Zero Panics in IPC Commands:**
   - Never use `.unwrap()` or `.expect()` in `#[tauri::command]` functions.
   - All commands must return `Result<T, String>` or custom serializable error types `Result<T, AppError>`.
   - Log errors with `log` or `tracing` before returning error messages to the frontend.

2. **Non-Blocking Async Commands:**
   - Heavy tasks (parsing 500-page books, generating TTS audio for 200 sentences, exporting audio files) must run asynchronously using `tokio::task::spawn_blocking` or async channels.
   - Progress must be reported to the frontend via Tauri events (`app_handle.emit("tts-progress", payload)`).

3. **Audio Buffer & Memory Safety:**
   - Avoid loading full 1-hour uncompressed PCM WAV files into RAM multiple times. Stream audio chunks or work with file paths directly via `std::fs::File`.
   - When splicing audio clips, calculate byte offsets precisely according to WAV header `sample_rate`, `channels`, and `bits_per_sample`.

---

## 3. Frontend & Next.js Rules

1. **Static Export Compatibility:**
   - Tauri operates on static files (`output: 'export'` in `next.config.js`).
   - Do NOT use Next.js server-side features like `getServerSideProps` or dynamic Node.js server API routes in the final build.
   - All system interactions (file reading, dialogs, network requests to local ports) must go through Tauri IPC or Tauri plugins (`@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`).

2. **WaveSurfer.js Lifecycle Management:**
   - Always destroy `wavesurfer.js` instances on component unmount (`ws.destroy()`) to prevent Web Audio Context memory leaks.
   - Use `useRef` to store the active WaveSurfer instance and HTML container element.
   - Handle window resize events cleanly with `ws.setOptions()` or auto-responsive containers.

3. **Sentence Table Virtualization:**
   - Books often have thousands of sentences per chapter. Use virtualization (`@tanstack/react-virtual`) when rendering sentence lists to keep scrolling at 60 FPS.

4. **Strict TypeScript:**
   - No `any`. Define strong types in `src/types/` for all book entities, sentences, audio tracks, and TTS configurations.
   - Mirror Rust structs 1:1 with TypeScript interfaces.
