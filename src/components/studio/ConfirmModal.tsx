"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { useConfirmStore } from "@/stores/useConfirmStore";

export const ConfirmModal: React.FC = () => {
  const {
    isOpen,
    title,
    description,
    confirmText,
    cancelText,
    isDestructive,
    isLoading,
    onConfirmAction,
    closeConfirm,
    setIsLoading,
  } = useConfirmStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        closeConfirm();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, closeConfirm]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!onConfirmAction || isLoading) return;
    try {
      setIsLoading(true);
      await onConfirmAction();
    } catch (err) {
      console.error("Lỗi khi thực hiện xác nhận:", err);
    } finally {
      closeConfirm();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
      }}
      className="flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        style={{ backgroundColor: "#18181b" }}
        className="w-full max-w-sm rounded-2xl border border-zinc-700/80 shadow-2xl shadow-black/95 p-5 text-zinc-200 space-y-4 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isDestructive
                ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                : "bg-indigo-500/10 border-indigo-500/25 text-indigo-400"
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h3 className="font-semibold text-sm text-white">{title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1 whitespace-pre-line">
              {description}
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={closeConfirm}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            disabled={isLoading}
            onClick={closeConfirm}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-40"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium text-white shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-40 ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
