import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
}

export function formatTimeHours(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "0s";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/** Max characters per sentence (matches the 350-char split limit in the Rust tokenizer) */
export const MAX_SENTENCE_CHARS = 350;

/**
 * Câu khoảng lặng / hiệu ứng âm thanh: audio được tạo riêng (WAV im lặng / SFX),
 * tuyệt đối KHÔNG gửi text của các câu này cho TTS đọc.
 */
export function isNonSpeechSentenceText(text: string | undefined | null): boolean {
  const t = text ?? "";
  return (
    t.startsWith("[Khoảng lặng") ||
    t.startsWith("[Hiệu ứng:") ||
    t.startsWith("[Nhạc nền:")
  );
}

/** Dòng nhạc nền chèn (BGM tổng của chương tắt tiếng trong lúc dòng này chạy khi ghép) */
export function isBgmSentenceText(text: string | undefined | null): boolean {
  return (text ?? "").startsWith("[Nhạc nền:");
}

// Zoom sóng âm theo phần trăm so với mức vừa khít khung (100 = thấy trọn cả track, không cần cuộn).
// Dùng chung cho lăn chuột và menu; càng phóng to thì mỗi track càng có thanh cuộn ngang riêng.
export const WAVEFORM_ZOOM_MIN = 100;
export const WAVEFORM_ZOOM_MAX = 6400;

/** Tăng / giảm mức zoom một nấc (direction > 0 = phóng to), luôn nhích ít nhất 1 đơn vị khi chưa chạm biên. */
export function stepWaveformZoom(current: number, direction: 1 | -1, factor = 1.25): number {
  const safe = Math.min(WAVEFORM_ZOOM_MAX, Math.max(WAVEFORM_ZOOM_MIN, current || WAVEFORM_ZOOM_MIN));
  const raw = direction > 0 ? safe * factor : safe / factor;
  const next = Math.round(raw);
  const adjusted = next === Math.round(safe) ? safe + direction : next;
  return Math.min(WAVEFORM_ZOOM_MAX, Math.max(WAVEFORM_ZOOM_MIN, adjusted));
}
