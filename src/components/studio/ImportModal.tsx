"use client";

import React, { useState } from "react";
import {
  X,
  UploadCloud,
  BookOpen,
  FileText,
  CheckCircle2,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import {
  isTauriEnvironment,
  tauriGetChapters,
  tauriGetSentences,
  tauriImportProject,
  tauriParseEbook,
  tauriSelectBookFile,
} from "@/lib/tauri";
import type { EbookParsedData } from "@/types";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const { setActiveProject, setChapters, setActiveChapter, setSentences, setSelectedSentenceId } =
    useProjectStore();

  const [filePath, setFilePath] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<EbookParsedData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleBrowseClick = async () => {
    if (isTauriEnvironment()) {
      const selected = await tauriSelectBookFile();
      if (selected) {
        setFilePath(selected);
        handleParse(selected);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilePath(file.name);
      handleParse(file.name);
    }
  };

  if (!isOpen) return null;

  const handleParse = async (path: string) => {
    if (!path.trim()) return;
    setIsParsing(true);
    setErrorMessage(null);
    setParsedData(null);

    try {
      if (isTauriEnvironment()) {
        const data = await tauriParseEbook(path.trim());
        setParsedData(data);
      } else {
        // Fallback demo for web browser testing
        setTimeout(() => {
          setParsedData({
            title: "Dế Mèn Phiêu Lưu Ký",
            author: "Tô Hoài",
            description: "Tác phẩm văn học thiếu nhi kinh điển của Việt Nam.",
            chapters: [
              {
                index: 1,
                title: "Chương 1: Tôi sống độc lập từ thuở bé",
                content:
                  "Tôi sống độc lập từ thuở bé. Ấy là tục lệ lâu đời trong họ dế chúng tôi.\n\n— Mẹ ơi, con đã lớn rồi! — Tôi tự hào nói với mẹ khi bước ra khỏi hang.\n\nBởi vì quanh vùng chỉ có một mình tôi làm chủ bãi cỏ này.",
              },
              {
                index: 2,
                title: "Chương 2: Bài học đường đời đầu tiên",
                content:
                  "Cái chết của Dế Choắt đã để lại cho tôi một bài học nhớ đời.\n\nỞ đời mà có thói hung hăng bậy bạ, có óc mà không biết nghĩ, sớm muộn rồi cũng mang vạ vào mình đấy.",
              },
            ],
          });
          setIsParsing(false);
        }, 500);
        return;
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      if (isTauriEnvironment()) {
        const project = await tauriImportProject(filePath, parsedData);
        setActiveProject(project);

        const chapters = await tauriGetChapters(project.id);
        setChapters(chapters);

        if (chapters.length > 0) {
          setActiveChapter(chapters[0]);
          const sentences = await tauriGetSentences(chapters[0].id);
          setSentences(sentences);
          if (sentences.length > 0) {
            setSelectedSentenceId(sentences[0].id);
          }
        }
      } else {
        // Web mode preview
        const dummyProject = {
          id: "demo-project-1",
          title: parsedData.title,
          author: parsedData.author,
          description: parsedData.description,
          chapter_count: parsedData.chapters.length,
          total_sentences: 5,
          completed_sentences: 0,
          total_duration: 0,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setActiveProject(dummyProject);
        const dummyChapters = parsedData.chapters.map((c) => ({
          id: `chap-${c.index}`,
          project_id: dummyProject.id,
          index: c.index,
          title: c.title,
          raw_content: c.content,
          sentence_count: 3,
          ready_sentence_count: 0,
          total_duration: 0,
        }));
        setChapters(dummyChapters);
        setActiveChapter(dummyChapters[0]);
      }

      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Nhập Sách Mới (EPUB / TXT / Markdown)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* File Path input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium">
                Đường dẫn tệp sách trên máy tính:
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="text-zinc-500">Định dạng hỗ trợ:</span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 font-mono font-medium text-[10px]">
                  .epub
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/60 text-zinc-300 font-mono text-[10px]">
                  .txt
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/60 text-zinc-300 font-mono text-[10px]">
                  .md
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/60 text-zinc-300 font-mono text-[10px]">
                  .markdown
                </span>
              </div>
            </div>

            {/* Hidden native input for web fallback */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleWebFileChange}
              accept=".epub,.txt,.md,.markdown"
              className="hidden"
            />

            <div className="flex gap-2">
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="Chọn tệp qua nút 'Chọn Tệp...' hoặc nhập đường dẫn..."
                className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleBrowseClick}
                disabled={isParsing}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded flex items-center gap-1.5 border border-zinc-700/60 transition-colors disabled:opacity-40"
                title="Duyệt và chọn tệp sách từ máy tính (.epub, .txt, .md, .markdown)"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Chọn Tệp...</span>
              </button>
              <button
                type="button"
                onClick={() => handleParse(filePath)}
                disabled={isParsing || !filePath.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded flex items-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                {isParsing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>Bóc Tách Sách</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="p-2.5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs">
              {errorMessage}
            </p>
          )}

          {/* Parsed Preview */}
          {parsedData && (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
              <div className="flex items-start gap-4">
                {parsedData.cover_base64 ? (
                  <img
                    src={parsedData.cover_base64}
                    alt="Bìa sách"
                    className="w-16 h-24 object-cover rounded border border-zinc-800 shadow"
                  />
                ) : (
                  <div className="w-16 h-24 bg-zinc-800/80 rounded border border-zinc-700/50 flex flex-col items-center justify-center text-zinc-500">
                    <BookOpen className="w-6 h-6 mb-1" />
                    <span className="text-[9px]">Chưa có bìa</span>
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-semibold text-zinc-100">
                    {parsedData.title}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Tác giả: <span className="text-zinc-200">{parsedData.author}</span>
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Tổng số chương tìm thấy:{" "}
                    <span className="text-indigo-400 font-medium">
                      {parsedData.chapters.length} chương
                    </span>
                  </p>
                </div>
              </div>

              {/* Chapters list preview */}
              <div className="border-t border-zinc-800/80 pt-2 space-y-1 max-h-40 overflow-y-auto">
                <span className="text-[11px] font-medium text-zinc-400">
                  Danh sách chương phát hiện:
                </span>
                {parsedData.chapters.map((c) => (
                  <div
                    key={c.index}
                    className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800/60 text-zinc-300 text-[11px] flex justify-between"
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="text-zinc-500 font-mono">
                      {c.content.length} ký tự
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
          >
            Đóng
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!parsedData || isImporting}
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 disabled:opacity-40"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang phân tích câu & lưu DB...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tạo Dự Án & Bóc Tách Câu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
