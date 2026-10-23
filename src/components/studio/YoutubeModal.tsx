"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { documentDir } from "@tauri-apps/api/path";
import { listen } from "@tauri-apps/api/event";
import {
  X,
  Film,
  ImagePlus,
  FolderOpen,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import {
  isTauriEnvironment,
  tauriExportBookVideo,
  tauriExportChapterVideo,
  type VideoVisualsInput,
  tauriOpenPath,
  tauriReadImageDataUrl,
  tauriRevealPath,
  tauriSelectDirectory,
  tauriSelectImageFile,
} from "@/lib/tauri";
import {
  DEFAULT_FONT_ID,
  THUMBNAIL_DEFAULT_COLORS,
  THUMBNAIL_ELEMENT_NAMES,
  THUMBNAIL_FONTS,
  THUMBNAIL_FONT_GROUPS,
  THUMBNAIL_TEMPLATES,
  THUMB_H,
  THUMB_W,
  canvasToJpegDataUrl,
  renderMarqueeStrip,
  renderThumbnail,
  VIDEO_ONLY_ELEMENTS,
  type ThumbnailBox,
  type ThumbnailElementId,
  type ThumbnailElementStyle,
  type ThumbnailOffsets,
  type ThumbnailTemplate,
} from "@/lib/thumbnail";

interface YoutubeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface YoutubePrefs {
  bgPath: string;
  template: ThumbnailTemplate;
  title: string;
  labelTemplate: string;
  startNumber: number;
  showChapterTitle: boolean;
  channel: string;
  mixBgm: boolean;
  /** each: mỗi chương một video; merged: gộp các chương đã chọn thành 1 video */
  videoMode: "each" | "merged";
  /** Khoảng nghỉ giữa các chương khi gộp (ms) */
  chapterPauseMs: number;
  /** Logo kênh (đường dẫn file ảnh) và có hiện trên thumbnail hay không */
  logoPath: string;
  logoOnThumbnail: boolean;
  /** Chữ watermark chống reup, ghi chú (lịch đăng...), chữ chạy ngang (kêu gọi donate...) */
  watermark: string;
  note: string;
  marqueeText: string;
  marqueeDirection: "rtl" | "ltr";
  marqueeSpeed: number;
  /** Font mặc định cho mọi khối chữ */
  font: string;
  /** Vị trí / cỡ chữ / font do người dùng kéo thả, lưu riêng cho từng template */
  offsets: Partial<Record<ThumbnailTemplate, ThumbnailOffsets>>;
}

const DEFAULT_PREFS: YoutubePrefs = {
  bgPath: "",
  template: "left",
  title: "",
  labelTemplate: "Phần {n}",
  startNumber: 1,
  showChapterTitle: false,
  channel: "",
  mixBgm: true,
  videoMode: "each",
  chapterPauseMs: 2000,
  logoPath: "",
  logoOnThumbnail: true,
  watermark: "",
  note: "",
  marqueeText: "",
  marqueeDirection: "rtl",
  marqueeSpeed: 120,
  font: DEFAULT_FONT_ID,
  offsets: {},
};

const EXPORT_DIR_KEY = "bookstudio-export-dir";
const RECENT_COLORS_KEY = "bookstudio-recent-colors";
const MAX_RECENT_COLORS = 10;
const PRESET_COLORS = [
  "#ffffff", "#f59e0b", "#facc15", "#ef4444", "#fb7185",
  "#22d3ee", "#a78bfa", "#34d399", "#e4e4e7", "#111111",
];

const joinPath = (dir: string, name: string) => {
  const sep = dir.includes("\\") ? "\\" : "/";
  return `${dir.replace(/[/\\]+$/, "")}${sep}${name}`;
};

const inputCls =
  "w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs";

export const YoutubeModal: React.FC<YoutubeModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, chapters } = useProjectStore();
  const { sentencePauseMs, paragraphPauseMs } = useStudioSettingsStore();

  const [prefs, setPrefs] = useState<YoutubePrefs>(DEFAULT_PREFS);
  const [prefsLoadedFor, setPrefsLoadedFor] = useState<string | null>(null);
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [previewView, setPreviewView] = useState<"thumbnail" | "video">("thumbnail");
  const [outputDir, setOutputDir] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; stage: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<string[] | null>(null);
  const [timestamps, setTimestamps] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const boxesRef = useRef<ThumbnailBox[]>([]);
  const dragRef = useRef<{
    id: ThumbnailElementId;
    startX: number;
    startY: number;
    baseDx: number;
    baseDy: number;
  } | null>(null);
  const [activeId, setActiveId] = useState<ThumbnailElementId | null>(null);
  const [selectedId, setSelectedId] = useState<ThumbnailElementId | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const recentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Màu đã chọn trước đó (dùng chung mọi dự án)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_COLORS_KEY);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(list)) {
        setRecentColors(
          list.filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c))
        );
      }
    } catch {}
    return () => {
      if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    };
  }, []);
  const projectId = activeProject?.id ?? "";
  const prefsKey = `bookstudio-youtube:${projectId}`;

  const completedChapters = useMemo(
    () =>
      chapters.filter(
        (c) =>
          c.is_enabled !== false &&
          c.sentence_count > 0 &&
          c.ready_sentence_count >= c.sentence_count
      ),
    [chapters]
  );

  // Nạp lựa chọn đã lưu của dự án này
  useEffect(() => {
    if (!projectId) return;
    let loaded: YoutubePrefs = { ...DEFAULT_PREFS, title: activeProject?.title ?? "" };
    try {
      const raw = localStorage.getItem(prefsKey);
      if (raw) loaded = { ...loaded, ...(JSON.parse(raw) as Partial<YoutubePrefs>) };
    } catch {}
    setPrefs(loaded);
    setPrefsLoadedFor(projectId);
  }, [projectId, prefsKey, activeProject?.title]);

  const updatePrefs = (patch: Partial<YoutubePrefs>, persist = true) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      if (persist) {
        try {
          localStorage.setItem(prefsKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  // Ảnh nền: đọc lại từ đường dẫn đã lưu
  useEffect(() => {
    let cancelled = false;
    if (!prefs.bgPath || prefsLoadedFor !== projectId) {
      setBgDataUrl(null);
      return;
    }
    tauriReadImageDataUrl(prefs.bgPath)
      .then((url) => !cancelled && setBgDataUrl(url))
      .catch(() => !cancelled && setBgDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [prefs.bgPath, prefsLoadedFor, projectId]);

  useEffect(() => {
    let cancelled = false;
    if (!prefs.logoPath || prefsLoadedFor !== projectId) {
      setLogoDataUrl(null);
      return;
    }
    tauriReadImageDataUrl(prefs.logoPath)
      .then((url) => !cancelled && setLogoDataUrl(url))
      .catch(() => !cancelled && setLogoDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [prefs.logoPath, prefsLoadedFor, projectId]);

  // Thư mục xuất: dùng chung thư mục gần nhất của modal xuất audio
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved = "";
      try {
        saved = localStorage.getItem(EXPORT_DIR_KEY) || "";
      } catch {}
      if (saved) {
        if (!cancelled) setOutputDir(saved);
        return;
      }
      if (!isTauriEnvironment()) return;
      try {
        const docs = await documentDir();
        if (!cancelled) setOutputDir(joinPath(docs, "Audiobooks"));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mặc định chọn hết chương đã đọc xong, giữ lựa chọn cũ nếu còn hợp lệ
  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(completedChapters.map((c) => c.id));
      const known = new Set(prev);
      return [
        ...prev.filter((id) => valid.has(id)),
        ...completedChapters.filter((c) => !known.has(c.id)).map((c) => c.id),
      ];
    });
  }, [completedChapters]);

  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    listen<{ percent: number; stage: string }>("export-progress", (e) => setProgress(e.payload))
      .then((fn) => (disposed ? fn() : (unlisten = fn)))
      .catch((err) => console.error("Không lắng nghe được tiến độ xuất:", err));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const selectedChapters = completedChapters.filter((c) => selectedIds.includes(c.id));
  const makeLabel = (i: number) =>
    prefs.labelTemplate.replace(/\{n\}/g, String(prefs.startNumber + i));
  const previewChapter = selectedChapters[0] ?? completedChapters[0];
  const isMerged = prefs.videoMode === "merged";
  // Gộp nhiều chương: nhãn là khoảng số thứ tự, vd "Phần 1-3"
  const mergedLabel = prefs.labelTemplate.replace(
    /\{n\}/g,
    selectedChapters.length > 1
      ? `${prefs.startNumber}-${prefs.startNumber + selectedChapters.length - 1}`
      : String(prefs.startNumber)
  );
  const labelAt = (i: number) => (isMerged ? mergedLabel : makeLabel(i));

  // Preview thumbnail (debounce để không vẽ lại liên tục khi đang gõ)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { canvas, boxes } = await renderThumbnail({
          background: bgDataUrl,
          template: prefs.template,
          title: prefs.title || activeProject?.title || "Tiêu đề",
          label: labelAt(0),
          chapterTitle: prefs.showChapterTitle && !isMerged ? previewChapter?.title : undefined,
          channel: prefs.channel || undefined,
          offsets: prefs.offsets[prefs.template],
          font: prefs.font,
          view: previewView,
          logo: logoDataUrl,
          logoOnThumbnail: prefs.logoOnThumbnail,
          watermark: prefs.watermark,
          note: prefs.note,
          marqueeText: prefs.marqueeText,
          marqueeStaticText: true,
        });
        const target = previewRef.current;
        if (cancelled || !target) return;
        boxesRef.current = boxes;
        const ctx = target.getContext("2d");
        ctx?.clearRect(0, 0, THUMB_W, THUMB_H);
        ctx?.drawImage(canvas, 0, 0);
        // Viền nét đứt báo khối chữ đang trỏ/kéo (chỉ ở preview, không nằm trong ảnh xuất)
        const active = boxes.find((b) => b.id === (activeId ?? selectedId));
        if (ctx && active) {
          ctx.save();
          ctx.setLineDash([10, 8]);
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#818cf8";
          ctx.strokeRect(active.x - 8, active.y - 8, active.w + 16, active.h + 16);
          ctx.restore();
        }
      } catch (err) {
        console.error("Lỗi vẽ thumbnail:", err);
      }
    }, dragRef.current ? 0 : 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bgDataUrl, logoDataUrl, previewView, prefs, activeId, selectedId, previewChapter?.title, activeProject?.title, selectedChapters.length]);

  if (!isOpen) return null;

  // Kéo thả chữ trên preview: toạ độ chuột (CSS) quy đổi sang toạ độ canvas 1280x720
  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * THUMB_W,
      y: ((e.clientY - rect.top) / rect.height) * THUMB_H,
    };
  };

  const hitTest = (x: number, y: number): ThumbnailBox | undefined => {
    const pad = 12;
    return [...boxesRef.current]
      .reverse()
      .find((b) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad);
  };

  const handlePreviewDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toCanvasPoint(e);
    const hit = hitTest(p.x, p.y);
    if (!hit) {
      setSelectedId(null);
      return;
    }
    const base = prefs.offsets[prefs.template]?.[hit.id];
    dragRef.current = {
      id: hit.id,
      startX: p.x,
      startY: p.y,
      baseDx: base?.dx ?? 0,
      baseDy: base?.dy ?? 0,
    };
    setSelectedId(hit.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
    setActiveId(hit.id);
  };

  const handlePreviewMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toCanvasPoint(e);
    const drag = dragRef.current;
    if (!drag) {
      const hit = hitTest(p.x, p.y);
      e.currentTarget.style.cursor = hit ? "grab" : "default";
      setActiveId((prev) => (prev === (hit?.id ?? null) ? prev : (hit?.id ?? null)));
      return;
    }
    // Chữ chạy chỉ kéo theo chiều dọc (chiều ngang do hiệu ứng chạy quyết định)
    const dx = drag.id === "marquee" ? 0 : Math.round(drag.baseDx + (p.x - drag.startX));
    const dy = Math.round(drag.baseDy + (p.y - drag.startY));
    setPrefs((prev) => ({
      ...prev,
      offsets: {
        ...prev.offsets,
        [prev.template]: {
          ...prev.offsets[prev.template],
          [drag.id]: { ...prev.offsets[prev.template]?.[drag.id], dx, dy },
        },
      },
    }));
  };

  const handlePreviewUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    e.currentTarget.style.cursor = "grab";
    // Lưu vị trí cuối cùng sau khi thả chuột
    setPrefs((prev) => {
      try {
        localStorage.setItem(prefsKey, JSON.stringify(prev));
      } catch {}
      return prev;
    });
  };

  // Các khối đang hiện trong chế độ xem hiện tại (dùng cho thanh chọn khối và để bỏ chọn khi khối biến mất)
  const availableElements: ThumbnailElementId[] = [
    "label",
    "title",
    ...(prefs.showChapterTitle && !isMerged ? (["chapter"] as const) : []),
    ...(prefs.channel.trim() ? (["channel"] as const) : []),
    ...(logoDataUrl && (previewView === "video" || prefs.logoOnThumbnail) ? (["logo"] as const) : []),
    ...(previewView === "video"
      ? VIDEO_ONLY_ELEMENTS.filter((id) =>
          id === "watermark" ? prefs.watermark.trim() : id === "note" ? prefs.note.trim() : prefs.marqueeText.trim()
        )
      : []),
  ];
  const activeSelectedId = selectedId && availableElements.includes(selectedId) ? selectedId : null;

  const updateElementStyle = (id: ThumbnailElementId, patch: Partial<ThumbnailElementStyle>) => {
    const current = prefs.offsets[prefs.template] ?? {};
    updatePrefs({
      offsets: {
        ...prefs.offsets,
        [prefs.template]: { ...current, [id]: { ...current[id], ...patch } },
      },
    });
  };

  const rememberColor = (color: string) => {
    const normalized = color.toLowerCase();
    setRecentColors((prev) => {
      const next = [normalized, ...prev.filter((c) => c !== normalized)].slice(0, MAX_RECENT_COLORS);
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Chọn màu: áp dụng ngay, còn lưu vào "đã dùng" sau khi người dùng dừng chọn một lúc
  const applyColor = (id: ThumbnailElementId, color: string, rememberNow = false) => {
    updateElementStyle(id, { color });
    if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    if (rememberNow) rememberColor(color);
    else recentTimerRef.current = setTimeout(() => rememberColor(color), 700);
  };

  const resetElement = (id: ThumbnailElementId) => {
    const { [id]: _removed, ...rest } = prefs.offsets[prefs.template] ?? {};
    void _removed;
    updatePrefs({ offsets: { ...prefs.offsets, [prefs.template]: rest } });
  };

  const hasCustomOffsets = Object.keys(prefs.offsets[prefs.template] ?? {}).length > 0;

  const handlePickBackground = async () => {
    const file = await tauriSelectImageFile();
    if (file) updatePrefs({ bgPath: file });
  };

  const handlePickLogo = async () => {
    const file = await tauriSelectImageFile("Chọn logo kênh (nên dùng PNG nền trong suốt)");
    if (file) updatePrefs({ logoPath: file });
  };

  const handlePickDir = async () => {
    const dir = await tauriSelectDirectory();
    if (!dir) return;
    setOutputDir(dir);
    try {
      localStorage.setItem(EXPORT_DIR_KEY, dir);
    } catch {}
  };

  const toggleChapter = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const formatTimestamp = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    const mm = String(m).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
  };

  const handleExport = async () => {
    if (!activeProject || selectedChapters.length === 0 || !outputDir.trim()) return;
    setIsExporting(true);
    setMessage(null);
    setProgress({ percent: 0, stage: "Đang bắt đầu" });

    const done: string[] = [];
    const total = selectedChapters.length;
    const bookTitle = (prefs.title || activeProject.title).trim();

    // Dựng ảnh cho một video: thumbnail, khung video (thêm watermark/ghi chú/nền băng chữ) và ảnh chữ chạy
    const buildVisuals = async (label: string, chapterTitle?: string): Promise<VideoVisualsInput> => {
      const common = {
        background: bgDataUrl,
        template: prefs.template,
        title: bookTitle,
        label,
        chapterTitle,
        channel: prefs.channel || undefined,
        offsets: prefs.offsets[prefs.template],
        font: prefs.font,
        logo: logoDataUrl,
        logoOnThumbnail: prefs.logoOnThumbnail,
        watermark: prefs.watermark,
        note: prefs.note,
        marqueeText: prefs.marqueeText,
      };
      const thumb = await renderThumbnail({ ...common, view: "thumbnail" });
      const frame = await renderThumbnail({ ...common, view: "video", marqueeStaticText: false });
      const strip = await renderMarqueeStrip(common);
      return {
        imageBase64: canvasToJpegDataUrl(frame.canvas),
        thumbnailBase64: canvasToJpegDataUrl(thumb.canvas),
        marquee: strip
          ? {
              pngBase64: strip.dataUrl,
              top: strip.top,
              rtl: prefs.marqueeDirection === "rtl",
              speedPxPerSec: prefs.marqueeSpeed,
            }
          : undefined,
      };
    };
    const fileNameFor = (label: string) =>
      `${bookTitle} - ${label}`.replace(/[/\\:*?"<>|]/g, "_");

    try {
      if (isMerged) {
        const outputPath = joinPath(outputDir.trim(), `${fileNameFor(mergedLabel)}.mp4`);
        const result = await tauriExportBookVideo({
          projectId: activeProject.id,
          chapterIds: selectedChapters.map((c) => c.id),
          outputPath,
          visuals: await buildVisuals(mergedLabel),
          sentencePauseMs,
          paragraphPauseMs,
          chapterPauseMs: prefs.chapterPauseMs,
          mixBgm: prefs.mixBgm,
        });
        setTimestamps(
          result.chapters.map((c) => `${formatTimestamp(c.start_ms)} ${c.title}`).join("\n")
        );
        setOutputs([outputPath]);
      } else {
        for (let i = 0; i < total; i++) {
          const chapter = selectedChapters[i];
          const label = makeLabel(i);
          const outputPath = joinPath(outputDir.trim(), `${fileNameFor(label)}.mp4`);
          try {
            await tauriExportChapterVideo({
              chapterId: chapter.id,
              outputPath,
              visuals: await buildVisuals(label, prefs.showChapterTitle ? chapter.title : undefined),
              sentencePauseMs,
              paragraphPauseMs,
              mixBgm: prefs.mixBgm,
              progressBase: (i / total) * 100,
              progressSpan: 100 / total,
            });
          } catch (err) {
            throw new Error(
              `Chương "${chapter.title}": ${err instanceof Error ? err.message : String(err)}`
            );
          }
          done.push(outputPath);
        }
        setTimestamps(null);
        setOutputs(done);
      }
    } catch (err) {
      setMessage(
        `Lỗi xuất video${done.length ? ` (đã xong ${done.length}/${total} chương)` : ""}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleCopyTimestamps = async () => {
    if (!timestamps) return;
    try {
      await navigator.clipboard.writeText(timestamps);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setActionError("Không sao chép được, anh bôi đen rồi copy thủ công nhé.");
    }
  };

  const handleAction = async (action: (p: string) => Promise<void>, path: string) => {
    setActionError(null);
    try {
      await action(path);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleClose = () => {
    setOutputs(null);
    setTimestamps(null);
    setActionError(null);
    setMessage(null);
    onClose();
  };

  if (outputs) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col items-center text-center p-6 gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">Xuất video thành công!</h3>
          <p className="text-xs text-zinc-400">
            Đã tạo {outputs.length === 1 ? "1 video" : `${outputs.length} video`} kèm thumbnail JPG cùng tên trong thư mục:
          </p>
          <p className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-300 font-mono text-[11px] break-all">
            {outputDir}
          </p>
          {timestamps && (
            <div className="w-full space-y-1 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  Mốc thời gian các chương (dán vào mô tả YouTube):
                </span>
                <button
                  type="button"
                  onClick={handleCopyTimestamps}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
                >
                  {copied ? "Đã chép" : "Sao chép"}
                </button>
              </div>
              <textarea
                readOnly
                rows={Math.min(8, timestamps.split("\n").length)}
                value={timestamps}
                className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-300 font-mono text-[11px] resize-none"
              />
            </div>
          )}
          {actionError && <p className="w-full text-[11px] text-rose-400">{actionError}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleAction(tauriOpenPath, outputs[0])}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Mở video đầu tiên
            </button>
            <button
              type="button"
              onClick={() => handleAction(tauriRevealPath, outputs[0])}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Mở thư mục
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canExport = !isExporting && selectedChapters.length > 0 && !!outputDir.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">Thumbnail & Video YouTube</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
          <div className="flex items-center gap-1.5">
            {(["thumbnail", "video"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPreviewView(v)}
                className={`px-3 py-1 rounded border text-[11px] font-medium transition-colors ${
                  previewView === v
                    ? "bg-indigo-950/60 border-indigo-500 text-indigo-200"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-600 text-zinc-400"
                }`}
              >
                {v === "thumbnail" ? "Xem thumbnail" : "Xem khung video (có watermark, chữ chạy)"}
              </button>
            ))}
          </div>
          <canvas
            ref={previewRef}
            width={THUMB_W}
            height={THUMB_H}
            className="w-full aspect-video rounded-lg border border-zinc-800 bg-zinc-950 touch-none"
            onPointerDown={handlePreviewDown}
            onPointerMove={handlePreviewMove}
            onPointerUp={handlePreviewUp}
            onPointerLeave={() => !dragRef.current && setActiveId(null)}
          />
          <div className="flex items-center justify-between -mt-2 text-[11px] text-zinc-500">
            <span>Kéo chữ trên ảnh để đổi vị trí, bấm vào chữ để chỉnh cỡ chữ / font (áp dụng cho mọi video của template này).</span>
            {hasCustomOffsets && (
              <button
                type="button"
                onClick={() =>
                  updatePrefs({ offsets: { ...prefs.offsets, [prefs.template]: {} } })
                }
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Đặt lại tất cả
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePickBackground}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium"
            >
              <ImagePlus className="w-3.5 h-3.5 text-indigo-400" />
              {prefs.bgPath ? "Đổi ảnh nền" : "Chọn ảnh nền"}
            </button>
            <span className="flex-1 truncate text-zinc-500 font-mono text-[11px]">
              {prefs.bgPath || "Chưa chọn ảnh nền"}
            </span>
            {prefs.bgPath && (
              <button
                type="button"
                onClick={() => updatePrefs({ bgPath: "" })}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Bỏ ảnh
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {THUMBNAIL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updatePrefs({ template: t.id })}
                className={`p-2 rounded-lg border text-center font-medium transition-all ${
                  prefs.template === t.id
                    ? "bg-indigo-950/50 border-indigo-500 text-zinc-100"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>


          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-zinc-500 text-[11px] mr-1">Chọn khối để chỉnh:</span>
            {availableElements.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedId(id)}
                className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${
                  activeSelectedId === id
                    ? "bg-indigo-950/60 border-indigo-500 text-indigo-200"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-600 text-zinc-400"
                }`}
              >
                {THUMBNAIL_ELEMENT_NAMES[id]}
              </button>
            ))}
          </div>

          {activeSelectedId && (() => {
            const id = activeSelectedId;
            const st = prefs.offsets[prefs.template]?.[id];
            const isLogo = id === "logo";
            const defaultOpacity = id === "watermark" ? 0.6 : 1;
            const toggleCls = (on: boolean) =>
              `h-7 w-8 rounded border text-sm transition-colors ${
                on
                  ? "bg-indigo-600 border-indigo-400 text-white"
                  : "bg-zinc-950 border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`;
            return (
              <div className="rounded-lg border border-indigo-500/40 bg-indigo-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-300">
                    Đang chỉnh: {THUMBNAIL_ELEMENT_NAMES[id]}
                    {id === "marquee" && (
                      <span className="ml-2 font-normal text-zinc-500">(chỉ kéo lên/xuống)</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => resetElement(id)}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
                  >
                    Đặt lại khối này
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-16 text-zinc-400">{isLogo ? "Kích thước" : "Cỡ chữ"}</span>
                  <input
                    type="range"
                    min={30}
                    max={isLogo ? 300 : 200}
                    step={5}
                    value={Math.round((st?.scale ?? 1) * 100)}
                    onChange={(e) => updateElementStyle(id, { scale: Number(e.target.value) / 100 })}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-mono text-zinc-200">
                    {Math.round((st?.scale ?? 1) * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-16 text-zinc-400">Độ mờ</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={Math.round((st?.opacity ?? defaultOpacity) * 100)}
                    onChange={(e) => updateElementStyle(id, { opacity: Number(e.target.value) / 100 })}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-mono text-zinc-200">
                    {Math.round((st?.opacity ?? defaultOpacity) * 100)}%
                  </span>
                </div>

                {!isLogo && (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-zinc-400">Kiểu chữ</span>
                      <button
                        type="button"
                        title="In đậm"
                        onClick={() => updateElementStyle(id, { bold: st?.bold === undefined ? false : !st.bold })}
                        className={`${toggleCls(st?.bold === true)} font-bold`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        title="In nghiêng"
                        onClick={() => updateElementStyle(id, { italic: !st?.italic })}
                        className={`${toggleCls(!!st?.italic)} italic`}
                      >
                        I
                      </button>
                      <button
                        type="button"
                        title="Gạch chân"
                        onClick={() => updateElementStyle(id, { underline: !st?.underline })}
                        className={`${toggleCls(!!st?.underline)} underline`}
                      >
                        U
                      </button>
                      {st?.bold !== undefined && (
                        <button
                          type="button"
                          onClick={() => updateElementStyle(id, { bold: undefined })}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px]"
                        >
                          Đậm mặc định
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-zinc-400">Màu chữ</span>
                        <input
                          type="color"
                          value={st?.color ?? THUMBNAIL_DEFAULT_COLORS[id]}
                          onChange={(e) => applyColor(id, e.target.value)}
                          className="h-7 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
                        />
                        <span className="font-mono text-zinc-300">{st?.color ?? THUMBNAIL_DEFAULT_COLORS[id]}</span>
                        {st?.color && (
                          <button
                            type="button"
                            onClick={() => updateElementStyle(id, { color: undefined })}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
                          >
                            Màu mặc định
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-zinc-500 text-[11px]">Gợi ý</span>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              title={c}
                              onClick={() => applyColor(id, c, true)}
                              className="h-5 w-5 rounded border border-zinc-600 hover:scale-110 transition-transform"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      {recentColors.length > 0 && (
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-zinc-500 text-[11px]">Đã dùng</span>
                          <div className="flex flex-wrap gap-1.5">
                            {recentColors.map((c) => (
                              <button
                                key={c}
                                type="button"
                                title={c}
                                onClick={() => applyColor(id, c, true)}
                                className="h-5 w-5 rounded border border-zinc-600 hover:scale-110 transition-transform"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-16 text-zinc-400">Font</span>
                      <select
                        className={inputCls}
                        value={st?.font ?? ""}
                        onChange={(e) => updateElementStyle(id, { font: e.target.value || undefined })}
                      >
                        <option value="">
                          Mặc định ({THUMBNAIL_FONTS.find((f) => f.id === prefs.font)?.name})
                        </option>
                        {THUMBNAIL_FONT_GROUPS.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.fonts.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          <label className="flex items-center gap-3">
            <span className="text-zinc-300 font-medium whitespace-nowrap">Font mặc định:</span>
            <select
              className={inputCls}
              value={prefs.font}
              onChange={(e) => updatePrefs({ font: e.target.value })}
            >
              {THUMBNAIL_FONT_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.fonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 col-span-2">
              <span className="text-zinc-300 font-medium">Tiêu đề sách (cũng là phần đầu tên file):</span>
              <input
                className={inputCls}
                value={prefs.title}
                onChange={(e) => updatePrefs({ title: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-300 font-medium">Nhãn mỗi video ({"{n}"} = số thứ tự):</span>
              <input
                className={inputCls}
                value={prefs.labelTemplate}
                onChange={(e) => updatePrefs({ labelTemplate: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-zinc-300 font-medium">Bắt đầu đánh số từ:</span>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={prefs.startNumber}
                onChange={(e) => updatePrefs({ startNumber: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label className="space-y-1 col-span-2">
              <span className="text-zinc-300 font-medium">Tên kênh (tuỳ chọn):</span>
              <input
                className={inputCls}
                value={prefs.channel}
                onChange={(e) => updatePrefs({ channel: e.target.value })}
              />
            </label>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-3">
            <div className="font-semibold text-zinc-300">
              Logo, watermark & thông báo
              <span className="ml-2 font-normal text-zinc-500">
                (hiện trên khung video; kéo thả trên ảnh xem trước, chọn &quot;Xem khung video&quot;)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePickLogo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium"
              >
                <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
                {prefs.logoPath ? "Đổi logo kênh" : "Tải logo kênh"}
              </button>
              <span className="flex-1 min-w-0 truncate text-zinc-500 font-mono text-[11px]">
                {prefs.logoPath || "Chưa có logo"}
              </span>
              {prefs.logoPath && (
                <button
                  type="button"
                  onClick={() => updatePrefs({ logoPath: "" })}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Bỏ logo
                </button>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={prefs.logoOnThumbnail}
                  onChange={(e) => updatePrefs({ logoOnThumbnail: e.target.checked })}
                />
                Hiện logo trên thumbnail
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-zinc-300 font-medium">Watermark chống reup (chữ mờ):</span>
              <input
                className={inputCls}
                placeholder="VD: Kênh Truyện Audio - Cấm reup"
                value={prefs.watermark}
                onChange={(e) => updatePrefs({ watermark: e.target.value })}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-zinc-300 font-medium">Ghi chú (tuỳ chọn, xuống dòng được):</span>
              <textarea
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="VD: Đăng chương mới mỗi thứ 7 hàng tuần"
                value={prefs.note}
                onChange={(e) => updatePrefs({ note: e.target.value })}
              />
            </label>

            <div className="space-y-1.5">
              <span className="block text-zinc-300 font-medium">Chữ chạy ngang (donate, thông báo...):</span>
              <input
                className={inputCls}
                placeholder="VD: Ủng hộ kênh qua MoMo 09xx... - Cảm ơn quý vị đã nghe truyện"
                value={prefs.marqueeText}
                onChange={(e) => updatePrefs({ marqueeText: e.target.value })}
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className={`${inputCls} !w-auto`}
                  value={prefs.marqueeDirection}
                  onChange={(e) =>
                    updatePrefs({ marqueeDirection: e.target.value === "ltr" ? "ltr" : "rtl" })
                  }
                >
                  <option value="rtl">Chạy từ phải sang trái</option>
                  <option value="ltr">Chạy từ trái sang phải</option>
                </select>
                <span className="text-zinc-400">Tốc độ</span>
                <input
                  type="range"
                  min={40}
                  max={400}
                  step={10}
                  value={prefs.marqueeSpeed}
                  onChange={(e) => updatePrefs({ marqueeSpeed: Number(e.target.value) })}
                  className="flex-1 min-w-[120px]"
                />
                <span className="w-20 text-right font-mono text-zinc-200">{prefs.marqueeSpeed} px/s</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-zinc-300">
            {!isMerged && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.showChapterTitle}
                  onChange={(e) => updatePrefs({ showChapterTitle: e.target.checked })}
                />
                Hiện tên chương trên thumbnail
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.mixBgm}
                onChange={(e) => updatePrefs({ mixBgm: e.target.checked })}
              />
              Trộn nhạc nền (BGM) của chương
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-zinc-300">Phạm vi xuất video</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "each", title: "Từng chương", desc: "Mỗi chương một video riêng" },
                  { id: "merged", title: "Gộp thành 1 video", desc: "Nối các chương đã chọn, kèm mốc thời gian" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updatePrefs({ videoMode: m.id })}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    prefs.videoMode === m.id
                      ? "bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/50 text-zinc-100"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                  }`}
                >
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-[11px] text-zinc-500">{m.desc}</div>
                </button>
              ))}
            </div>
            {isMerged && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-zinc-300">Khoảng nghỉ giữa các chương:</span>
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={100}
                  value={prefs.chapterPauseMs}
                  onChange={(e) => updatePrefs({ chapterPauseMs: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="w-24 text-right font-mono text-cyan-400">
                  {(prefs.chapterPauseMs / 1000).toFixed(1)} giây
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300">
                Chọn chương xuất video ({selectedChapters.length}/{completedChapters.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    selectedChapters.length === completedChapters.length
                      ? []
                      : completedChapters.map((c) => c.id)
                  )
                }
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
              >
                {selectedChapters.length === completedChapters.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>
            {completedChapters.length === 0 && (
              <p className="text-zinc-500">Chưa có chương nào đọc xong 100% để xuất video.</p>
            )}
            {completedChapters.map((c) => {
              const order = selectedChapters.findIndex((x) => x.id === c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded border border-zinc-800 bg-zinc-900/60 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={order >= 0}
                    onChange={() => toggleChapter(c.id)}
                  />
                  <span className="text-zinc-500">#{c.index}</span>
                  <span className="flex-1 truncate text-zinc-200">{c.title}</span>
                  {order >= 0 && (
                    <span className="text-amber-400">
                      {isMerged ? `Thứ ${order + 1}` : makeLabel(order)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-medium">Thư mục lưu video:</span>
              <button
                type="button"
                onClick={handlePickDir}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
              >
                <FolderOpen className="w-3 h-3 text-cyan-400" />
                Chọn thư mục...
              </button>
            </div>
            <input
              className={`${inputCls} font-mono text-[11px]`}
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
            />
          </div>

          {message && (
            <p className="p-2.5 rounded text-xs leading-relaxed bg-rose-950/40 text-rose-400 border border-rose-500/30">
              {message}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end gap-2">
          {isExporting && progress && (
            <div className="flex-1 min-w-0 mr-2 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="truncate">{progress.stage}</span>
                <span className="font-mono text-zinc-200">{Math.round(progress.percent)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs disabled:opacity-40"
          >
            Đóng
          </button>
          <button
            onClick={handleExport}
            disabled={!canExport}
            className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tạo video...</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5" />
                <span>
                  {isMerged
                    ? `Tạo 1 video (gộp ${selectedChapters.length} chương)`
                    : `Tạo ${selectedChapters.length} video`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
