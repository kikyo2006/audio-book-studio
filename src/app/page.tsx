"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  FolderOpen,
  Headphones,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { HeaderBar } from "@/components/studio/HeaderBar";
import { ChapterList } from "@/components/studio/ChapterList";
import { SentenceTable } from "@/components/studio/SentenceTable";
import { WaveformPanel } from "@/components/studio/WaveformPanel";
import { VoiceModal } from "@/components/studio/VoiceModal";
import { ExportModal } from "@/components/studio/ExportModal";
import { ImportModal } from "@/components/studio/ImportModal";
import { CharacterModal } from "@/components/studio/CharacterModal";
import { useProjectStore } from "@/stores/useProjectStore";
import {
  isTauriEnvironment,
  tauriGetChapters,
  tauriGetProjectCharacters,
  tauriGetProjects,
  tauriGetSentences,
} from "@/lib/tauri";

export default function Home() {
  const {
    projects,
    activeProject,
    setProjects,
    setActiveProject,
    setChapters,
    setActiveChapter,
    setSentences,
    setCharacters,
    setSelectedSentenceId,
  } = useProjectStore();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCharacterOpen, setIsCharacterOpen] = useState(false);

  // Initial load: Fetch recent projects and characters from SQLite
  useEffect(() => {
    async function loadInitialData() {
      if (!isTauriEnvironment()) return;

      try {
        const projs = await tauriGetProjects();
        setProjects(projs);
        if (projs.length > 0 && !activeProject) {
          const first = projs[0];
          setActiveProject(first);

          // Load characters
          const chars = await tauriGetProjectCharacters(first.id);
          setCharacters(chars);

          const chaps = await tauriGetChapters(first.id);
          setChapters(chaps);
          if (chaps.length > 0) {
            setActiveChapter(chaps[0]);
            const sents = await tauriGetSentences(chaps[0].id);
            setSentences(sents);
            if (sents.length > 0) {
              setSelectedSentenceId(sents[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khởi tạo dữ liệu dự án:", err);
      }
    }

    loadInitialData();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Header Bar */}
      <HeaderBar
        onOpenImport={() => setIsImportOpen(true)}
        onOpenVoiceSettings={() => setIsVoiceOpen(true)}
        onOpenCharacterCasting={() => setIsCharacterOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Studio Body: Chapter List (Left) + Sentence Script (Center) */}
      <div className="flex-1 flex overflow-hidden">
        {activeProject ? (
          <>
            <ChapterList />
            <SentenceTable />
          </>
        ) : (
          /* Empty / Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
                <Headphones className="w-8 h-8 text-white" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Chào Mừng Đến Với BookStudio
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Trạm sản xuất sách nói chuẩn phòng thu. Bóc tách câu tiếng Việt thông minh, phân vai nhân vật đa giọng đọc và kết nối trực tiếp với mô hình VieNeu-TTS.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Mở Sách Mới (EPUB / TXT / Markdown)</span>
                </button>

                <button
                  onClick={() => setIsVoiceOpen(true)}
                  className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-zinc-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <Sliders className="w-4 h-4 text-zinc-400" />
                  <span>Cài Đặt Giọng & Kiểm Tra TTS</span>
                </button>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-900 text-[11px] text-zinc-500">
                <div className="space-y-1">
                  <Sparkles className="w-4 h-4 mx-auto text-indigo-400" />
                  <p className="font-medium text-zinc-300">Tách Câu Chuẩn</p>
                  <p>Hỗ trợ dấu ba chấm & viết tắt tiếng Việt</p>
                </div>
                <div className="space-y-1">
                  <Headphones className="w-4 h-4 mx-auto text-purple-400" />
                  <p className="font-medium text-zinc-300">Phân Vai Đa Giọng</p>
                  <p>Kịch truyền thanh đa nhân vật sinh động</p>
                </div>
                <div className="space-y-1">
                  <Zap className="w-4 h-4 mx-auto text-emerald-400" />
                  <p className="font-medium text-zinc-300">Tái Tạo Từng Câu</p>
                  <p>Làm mới câu lỗi chỉ trong 1 thao tác</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Waveform Inspector Panel */}
      {activeProject && <WaveformPanel />}

      {/* Overlays / Modals */}
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <VoiceModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      <CharacterModal isOpen={isCharacterOpen} onClose={() => setIsCharacterOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
