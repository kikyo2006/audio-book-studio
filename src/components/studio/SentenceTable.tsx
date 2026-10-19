"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  RotateCcw,
  MessageSquare,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  Volume2,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useStudioSettingsStore } from "@/stores/useStudioSettingsStore";
import {
  tauriAssignSentenceSpeaker,
  tauriRegenerateSentence,
  tauriUpdateSentenceText,
} from "@/lib/tauri";
import { formatDuration } from "@/lib/utils";
import type { SentenceItem } from "@/types";

export const SentenceTable: React.FC = () => {
  const {
    activeProject,
    activeChapter,
    sentences,
    characters,
    selectedSentenceId,
    playingSentenceId,
    setSelectedSentenceId,
    setPlayingSentenceId,
    setIsPlaying,
    updateSentenceStatus,
    updateSentenceAudio,
    updateSentenceText,
    assignSpeakerToSentence,
  } = useProjectStore();

  const { serverUrl, selectedVoice, speed, temperature, isServerOnline } =
    useStudioSettingsStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll teleprompter to keep the currently playing sentence visible
  useEffect(() => {
    if (playingSentenceId && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [playingSentenceId]);

  const handleRowClick = (sentence: SentenceItem) => {
    setSelectedSentenceId(sentence.id);
  };

  const handleStartEdit = (sentence: SentenceItem) => {
    setEditingId(sentence.id);
    setEditText(sentence.clean_text);
  };

  const handleSaveEdit = async (sentenceId: string) => {
    if (!editText.trim()) return;
    updateSentenceText(sentenceId, editText.trim());
    setEditingId(null);
    try {
      await tauriUpdateSentenceText(sentenceId, editText.trim());
    } catch (err) {
      console.error("Lỗi cập nhật nội dung câu:", err);
    }
  };

  const handleRegenerate = async (sentence: SentenceItem) => {
    if (!activeProject || !isServerOnline) return;

    updateSentenceStatus(sentence.id, "generating");
    try {
      const res = await tauriRegenerateSentence({
        sentenceId: sentence.id,
        projectId: activeProject.id,
        text: sentence.clean_text,
        voice: sentence.voice || selectedVoice,
        speed: sentence.speed || speed,
        temperature: sentence.temperature ?? temperature,
        serverUrl,
      });
      updateSentenceAudio(sentence.id, res.audio_path, res.duration);
    } catch (err) {
      updateSentenceStatus(
        sentence.id,
        "error",
        err instanceof Error ? err.message : String(err)
      );
    }
  };

  const handlePlaySentence = (sentence: SentenceItem) => {
    if (sentence.status !== "ready") return;
    setSelectedSentenceId(sentence.id);
    setPlayingSentenceId(sentence.id);
    setIsPlaying(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900/30 overflow-hidden">
      {/* Chapter Title Bar */}
      <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-100">
            {activeChapter ? activeChapter.title : "Chưa chọn chương"}
          </h2>
          {sentences.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {sentences.length} câu
            </span>
          )}
        </div>

        <div className="text-[11px] text-zinc-500">
          Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Space</kbd> Phát/Dừng, <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Ctrl+Enter</kbd> Tái tạo câu
        </div>
      </div>

      {/* Script Virtual Table / List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sentences.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
            <p className="text-sm">Không có dữ liệu câu trong chương này.</p>
            <p className="text-xs mt-1 text-zinc-600">
              Hãy chọn một chương từ mục lục bên trái.
            </p>
          </div>
        ) : (
          sentences.map((item) => {
            const isSelected = selectedSentenceId === item.id;
            const isPlayingThis = playingSentenceId === item.id;
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                ref={isPlayingThis ? activeRowRef : null}
                onClick={() => handleRowClick(item)}
                className={`p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                  isPlayingThis
                    ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50"
                    : isSelected
                    ? "bg-zinc-800/80 border-zinc-700"
                    : "bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/60"
                }`}
              >
                {/* Row Header: Index, Badge, Duration, Status, Actions */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-500 text-[11px] w-6">
                      #{item.index.toString().padStart(2, "0")}
                    </span>

                    {/* Dialogue / Narration Tag */}
                    {item.is_dialogue ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <MessageSquare className="w-2.5 h-2.5" />
                          Đối thoại
                        </span>

                        {characters.length > 0 && (
                          <select
                            value={item.speaker || ""}
                            onChange={async (e) => {
                              const chosenName = e.target.value;
                              const char = characters.find((c) => c.name === chosenName);
                              if (char) {
                                assignSpeakerToSentence(item.id, char);
                                try {
                                  await tauriAssignSentenceSpeaker({
                                    sentenceId: item.id,
                                    speaker: char.name,
                                    voice: char.voice,
                                    speed: char.speed,
                                    temperature: char.temperature,
                                  });
                                } catch (err) {
                                  console.error("Lỗi gán nhân vật:", err);
                                }
                              }
                            }}
                            className="text-[10px] bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                          >
                            <option value="">-- Phân vai --</option>
                            {characters.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name} ({c.voice})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400">
                        <FileText className="w-2.5 h-2.5" />
                        Dẫn chuyện
                      </span>
                    )}

                    {item.speaker && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 text-white"
                        style={{
                          backgroundColor: `${
                            characters.find((c) => c.name === item.speaker)?.color || "#6366f1"
                          }20`,
                          borderColor: `${
                            characters.find((c) => c.name === item.speaker)?.color || "#6366f1"
                          }60`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              characters.find((c) => c.name === item.speaker)?.color || "#6366f1",
                          }}
                        />
                        {item.speaker}
                      </span>
                    )}

                    {item.voice && (
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Volume2 className="w-2.5 h-2.5" />
                        {item.voice}
                      </span>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    {item.status === "ready" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <Check className="w-3 h-3" />
                        {formatDuration(item.duration || 0)}
                      </span>
                    )}

                    {item.status === "generating" && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Đang tạo...
                      </span>
                    )}

                    {item.status === "error" && (
                      <span
                        className="flex items-center gap-1 text-[11px] text-rose-400"
                        title={item.error_message || "Lỗi tạo giọng đọc"}
                      >
                        <AlertCircle className="w-3 h-3" />
                        Lỗi
                      </span>
                    )}

                    {item.status === "pending" && (
                      <span className="text-[11px] text-zinc-500">
                        Chưa tạo
                      </span>
                    )}

                    {/* Play Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySentence(item);
                      }}
                      disabled={item.status !== "ready"}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Nghe câu này"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {/* Regenerate Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerate(item);
                      }}
                      disabled={!isServerOnline || item.status === "generating"}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-indigo-400 disabled:opacity-30"
                      title="Tái tạo âm thanh cho câu này (Ctrl+Enter)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sentence Text / Inline Editor */}
                {isEditing ? (
                  <div
                    className="flex flex-col gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleSaveEdit(item.id);
                          handleRegenerate({ ...item, clean_text: editText });
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      rows={2}
                      className="w-full p-2 bg-zinc-950 border border-indigo-500 rounded text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        Huỷ
                      </button>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onDoubleClick={() => handleStartEdit(item)}
                    className={`text-sm leading-relaxed cursor-text transition-colors ${
                      isPlayingThis
                        ? "text-indigo-200 font-medium"
                        : item.status === "ready"
                        ? "text-zinc-200"
                        : "text-zinc-400"
                    }`}
                    title="Nhấp đúp chuột để chỉnh sửa văn bản câu"
                  >
                    {item.clean_text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
