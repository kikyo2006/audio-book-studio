"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Music, Upload, Play, Pause, Trash2, Search, Loader2, Check } from "lucide-react";
import {
  tauriDeleteBgmLibraryFile,
  tauriListBgmLibrary,
  tauriReadAudioBase64,
  tauriUploadBgmToLibrary,
  type BgmLibraryItem,
} from "@/lib/tauri";

interface BgmLibraryModalProps {
  isOpen: boolean;
  /** Path of the BGM the chapter currently uses (highlighted in the list) */
  currentPath?: string | null;
  onClose: () => void;
  onSelect: (path: string) => void | Promise<void>;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDateTime(secs: number): string {
  if (!secs) return "";
  return new Date(secs * 1000).toLocaleString("vi-VN");
}

function formatLength(secs: number | null): string {
  if (secs === null || !Number.isFinite(secs)) return "--:--";
  const total = Math.round(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const BgmLibraryModal: React.FC<BgmLibraryModalProps> = ({
  isOpen,
  currentPath,
  onClose,
  onSelect,
}) => {
  const [items, setItems] = useState<BgmLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingPath(null);
  }, []);

  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await tauriListBgmLibrary());
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopPreview();
      return;
    }
    setError(null);
    setQuery("");
    setSelectedPath(currentPath ?? null);
    void loadLibrary();
  }, [isOpen, currentPath, loadLibrary, stopPreview]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => stopPreview, [stopPreview]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  if (!isOpen) return null;

  const handleUpload = async () => {
    setError(null);
    setIsUploading(true);
    try {
      const added = await tauriUploadBgmToLibrary();
      if (added) {
        await loadLibrary();
        setSelectedPath(added);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleTogglePreview = async (item: BgmLibraryItem) => {
    if (playingPath === item.path) {
      stopPreview();
      return;
    }
    stopPreview();
    try {
      const url = await tauriReadAudioBase64(item.path);
      const audio = new Audio(url);
      audio.onended = () => setPlayingPath(null);
      audioRef.current = audio;
      setPlayingPath(item.path);
      await audio.play();
    } catch (err) {
      setPlayingPath(null);
      setError(`Không phát thử được: ${String(err)}`);
    }
  };

  const handleDelete = async (item: BgmLibraryItem) => {
    setError(null);
    if (playingPath === item.path) stopPreview();
    try {
      await tauriDeleteBgmLibraryFile(item.path);
      if (selectedPath === item.path) setSelectedPath(null);
      await loadLibrary();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleUse = async () => {
    if (!selectedPath) return;
    stopPreview();
    await onSelect(selectedPath);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        style={{ backgroundColor: "#18181b" }}
        className="w-full max-w-xl rounded-2xl border border-zinc-700/80 shadow-2xl p-5 text-zinc-200 space-y-3"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-sm text-white">Thư viện nhạc nền (BGM)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên file..."
              className="flex-1 bg-transparent outline-none text-zinc-200 placeholder:text-zinc-600"
            />
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium disabled:opacity-50 transition-colors shrink-0"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Tải file mới...</span>
          </button>
        </div>

        <div className="h-72 overflow-y-auto pr-1 space-y-1.5">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang tải thư viện...
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 text-center px-6">
              {items.length === 0
                ? "Thư viện còn trống. Bấm \"Tải file mới...\" để thêm nhạc nền đầu tiên."
                : "Không có file nào khớp từ khóa."}
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedPath === item.path;
              const isPlaying = playingPath === item.path;
              return (
                <div
                  key={item.path}
                  onClick={() => setSelectedPath(item.path)}
                  onDoubleClick={() => {
                    setSelectedPath(item.path);
                    stopPreview();
                    void Promise.resolve(onSelect(item.path)).then(onClose);
                  }}
                  className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-950/40 border-emerald-500/60"
                      : "bg-zinc-900/60 border-zinc-800/60 hover:bg-zinc-800/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleTogglePreview(item);
                    }}
                    className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-emerald-300 shrink-0"
                    title="Nghe thử"
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-zinc-200">{item.name}</p>
                    <p className="text-[10px] text-zinc-500">
                      {formatLength(item.duration_secs)} · {formatSize(item.size_bytes)}
                      {item.modified_secs ? ` · ${formatDateTime(item.modified_secs)}` : ""}
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(item);
                    }}
                    disabled={item.used_by > 0}
                    className="p-1.5 rounded hover:bg-rose-950/60 text-zinc-500 hover:text-rose-300 disabled:opacity-30 disabled:hover:bg-transparent shrink-0"
                    title={item.used_by > 0 ? "Đang được dùng, không thể xóa" : "Xóa khỏi thư viện"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {error && (
          <p className="p-2 rounded text-[11px] bg-rose-950/40 text-rose-400 border border-rose-500/30">{error}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-[11px] text-zinc-500">{items.length} file trong thư viện</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleUse}
              disabled={!selectedPath}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium disabled:opacity-40 transition-colors"
            >
              Dùng file này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
