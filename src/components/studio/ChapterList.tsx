"use client";

import React from "react";
import { ListOrdered, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { tauriGetSentences } from "@/lib/tauri";
import { formatTimeHours } from "@/lib/utils";
import type { ChapterItem } from "@/types";

export const ChapterList: React.FC = () => {
  const {
    activeProject,
    chapters,
    activeChapter,
    setActiveChapter,
    setSentences,
    setSelectedSentenceId,
  } = useProjectStore();

  const handleSelectChapter = async (chap: ChapterItem) => {
    setActiveChapter(chap);
    try {
      const sentences = await tauriGetSentences(chap.id);
      setSentences(sentences);
      if (sentences.length > 0) {
        setSelectedSentenceId(sentences[0].id);
      } else {
        setSelectedSentenceId(null);
      }
    } catch (err) {
      console.error("Lỗi tải câu trong chương:", err);
    }
  };

  return (
    <aside className="w-72 border-r border-zinc-800 bg-zinc-950/60 flex flex-col h-full select-none">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
            Mục Lục Chương ({chapters.length})
          </span>
        </div>
      </div>

      {/* Chapters Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chapters.length === 0 ? (
          <div className="text-center py-12 px-4 text-zinc-500 text-xs">
            Chưa có chương nào. Hãy mở hoặc import một cuốn sách để bắt đầu.
          </div>
        ) : (
          chapters.map((chap) => {
            const isSelected = activeChapter?.id === chap.id;
            const pct =
              chap.sentence_count > 0
                ? Math.round((chap.ready_sentence_count / chap.sentence_count) * 100)
                : 0;

            return (
              <button
                key={chap.id}
                onClick={() => handleSelectChapter(chap)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1.5 ${
                  isSelected
                    ? "bg-zinc-800/90 border-indigo-500/50 shadow-sm text-zinc-100"
                    : "bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate flex-1">
                    {chap.title}
                  </span>
                  {pct === 100 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{chap.sentence_count} câu</span>
                  <span>{pct}%</span>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Stats */}
      {activeProject && (
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 text-xs text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tổng thời lượng:</span>
          </div>
          <span className="font-medium text-zinc-200">
            {formatTimeHours(activeProject.total_duration)}
          </span>
        </div>
      )}
    </aside>
  );
};
