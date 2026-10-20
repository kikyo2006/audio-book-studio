"use client";

import React, { useRef } from "react";
import {
  BookOpen,
  Camera,
  Trash2,
  ArrowRight,
  CheckCircle2,
  ArchiveX,
  RotateCcw,
  Loader2,
} from "lucide-react";
import type { ProjectMetadata } from "@/types";
import { tauriResetProjectCover, tauriUpdateProjectCover } from "@/lib/tauri";
import { useProjectStore } from "@/stores/useProjectStore";

interface ProjectCardProps {
  project: ProjectMetadata;
  onOpen: (project: ProjectMetadata) => void;
  onDelete: (projectId: string, title: string, e: React.MouseEvent) => void;
  onStatusChange?: (projectId: string, status: "active" | "completed" | "dropped") => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
  onDelete,
  onStatusChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { updateProjectCover } = useProjectStore();
  const [isResettingCover, setIsResettingCover] = React.useState(false);

  const handleResetCover = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResettingCover(true);
    try {
      const originalCover = await tauriResetProjectCover(project.id);
      updateProjectCover(project.id, originalCover || "");
    } catch (err) {
      console.error("Lỗi đặt lại ảnh bìa sách:", err);
    } finally {
      setIsResettingCover(false);
    }
  };

  const progressPercent =
    project.total_sentences > 0
      ? Math.round(
          (project.completed_sentences / project.total_sentences) * 100
        )
      : 0;

  const isCompleted = progressPercent === 100 && project.total_sentences > 0;

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await tauriUpdateProjectCover(project.id, base64);
        updateProjectCover(project.id, base64);
      } catch (err) {
        console.error("Lỗi cập nhật ảnh bìa sách:", err);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input để có thể chọn lại cùng 1 file nếu muốn
    e.target.value = "";
  };

  return (
    <div
      style={{ width: 210, minWidth: 210, maxWidth: 210, height: 365, minHeight: 365, maxHeight: 365 }}
      className="group relative bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-indigo-500/50 rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 overflow-hidden text-left shrink-0"
    >
      {/* Hidden file input for cover image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onClick={(e) => e.stopPropagation()}
        onChange={handleCoverUpload}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />

      {/* Top: Fixed Height Cover Image (Always 200px height) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ height: 200, minHeight: 200, maxHeight: 200 }}
        className="relative w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-inner select-none shrink-0"
      >
        {project.cover_base64 ? (
          <img
            src={project.cover_base64}
            alt={project.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* Placeholder Cover with artistic book design */
          <div className="w-full h-full flex flex-col items-center justify-between p-3.5 bg-gradient-to-br from-indigo-950/70 via-zinc-900 to-zinc-950 select-none">
            <div className="w-full flex items-center justify-between opacity-50">
              <span className="text-[9px] font-mono tracking-widest uppercase text-indigo-300">
                BookStudio
              </span>
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            </div>

            <div className="text-center px-1">
              <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-2 text-indigo-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs text-zinc-200 line-clamp-2 leading-snug">
                {project.title}
              </p>
              <p className="text-[10px] text-zinc-400 line-clamp-1 mt-1 font-medium">
                {project.author}
              </p>
            </div>

            <span className="text-[9px] text-zinc-500 font-mono">
              {project.chapter_count} chương
            </span>
          </div>
        )}

        {/* Badge: Audio Reading Progress Tag (Top Left of Cover) */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none flex flex-col gap-1">
          {(project.status ?? "active") === "dropped" ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-orange-950/90 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm">
              <ArchiveX className="w-2.5 h-2.5" />
              <span>Drop</span>
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>100% Hoàn thành</span>
            </span>
          ) : progressPercent > 0 ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>{progressPercent}% đã đọc</span>
            </span>
          ) : (
            <span className="inline-flex items-center text-[9px] font-medium bg-zinc-900/90 text-zinc-400 border border-zinc-700/60 px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm">
              0% Chưa đọc
            </span>
          )}
        </div>

        {/* Hover Action Overlay: Upload / Change Cover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all"
            title="Tải lên hoặc thay đổi ảnh bìa sách"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <span>{project.cover_base64 ? "Đổi ảnh bìa" : "+ Tải ảnh bìa"}</span>
          </button>

          {project.source_file_path && (
            <button
              type="button"
              onClick={handleResetCover}
              disabled={isResettingCover}
              className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-[11px] font-medium flex items-center gap-1.5 shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              title="Khôi phục lại ảnh bìa gốc ban đầu từ tệp sách"
            >
              {isResettingCover ? (
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
              ) : (
                <RotateCcw className="w-3 h-3 text-indigo-400" />
              )}
              <span>Đặt lại bìa gốc</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle: Book Info & Progress Bar */}
      <div className="mt-2.5 flex-1 flex flex-col justify-between">
        <div
          onClick={() => onOpen(project)}
          className="cursor-pointer"
        >
          <h3
            className="font-semibold text-xs text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-2 h-8 leading-snug"
            title={`Nhấn để mở dự án "${project.title}"`}
          >
            {project.title}
          </h3>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1 font-medium">
            <span className="truncate max-w-[110px]" title={project.author}>
              {project.author}
            </span>
            <span className="text-zinc-500 font-mono shrink-0">
              {project.chapter_count} ch • {project.total_sentences} câu
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 pt-1.5 border-t border-zinc-800/60">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-zinc-500 font-medium">Tiến độ audio</span>
            <span
              className={`font-mono font-bold text-[10px] ${
                isCompleted
                  ? "text-emerald-400"
                  : progressPercent > 0
                  ? "text-indigo-400"
                  : "text-zinc-500"
              }`}
            >
              {progressPercent}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted
                  ? "bg-emerald-500"
                  : progressPercent > 0
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                  : "bg-transparent"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom: Action Buttons */}
      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-1.5 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(project);
          }}
          className="flex-1 py-1 px-2.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium flex items-center justify-center gap-1 shadow-sm transition-all"
          title="Mở dự án này vào phòng thu"
        >
          <span>Mở dự án</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </button>

        {/* Drop / Restore button */}
        {onStatusChange && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const isDropped = (project.status ?? "active") === "dropped";
              onStatusChange(project.id, isDropped ? "active" : "dropped");
            }}
            className={`p-1 rounded-lg border border-transparent transition-colors ${
              (project.status ?? "active") === "dropped"
                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 hover:border-amber-900/50"
                : "text-zinc-500 hover:text-orange-400 hover:bg-orange-950/40 hover:border-orange-900/50"
            }`}
            title={(project.status ?? "active") === "dropped" ? "Khôi phục dự án" : "Đánh dấu Drop"}
          >
            {(project.status ?? "active") === "dropped"
              ? <RotateCcw className="w-3.5 h-3.5" />
              : <ArchiveX className="w-3.5 h-3.5" />
            }
          </button>
        )}

        <button
          type="button"
          onClick={(e) => onDelete(project.id, project.title, e)}
          className="p-1 rounded-lg text-rose-500 hover:text-rose-300 hover:bg-rose-950/60 border border-transparent hover:border-rose-900/60 transition-colors"
          title="Xóa dự án này khỏi thư viện"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
