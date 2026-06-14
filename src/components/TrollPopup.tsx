import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TrollPopupProps {
  isOpen: boolean;
  onClose: () => void;
  hintText?: string;
  mediaUrl?: string;
  trollMode: "hint" | "media";
}

export default function TrollPopup({
  isOpen,
  onClose,
  hintText,
  mediaUrl,
  trollMode,
}: TrollPopupProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 cursor-pointer p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {trollMode === "hint" ? (
            <div className="text-center pt-2">
              <h3 className="text-lg font-bold text-amber-600 mb-3 flex items-center justify-center gap-2">
                <span>💡</span> Gợi ý nhỏ
              </h3>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                {hintText}
              </p>
            </div>
          ) : (
            <div className="text-center pt-2">
              <h3 className="text-lg font-bold text-rose-500 mb-3 flex items-center justify-center gap-2">
                <span>🚨</span> Cảnh báo!
              </h3>
              {mediaUrl &&
              (mediaUrl.toLowerCase().endsWith(".mp4") ||
                mediaUrl.toLowerCase().endsWith(".mov") ||
                mediaUrl.toLowerCase().endsWith(".webm") ||
                mediaUrl.toLowerCase().endsWith(".ogg")) ? (
                <video
                  src={mediaUrl}
                  autoPlay
                  loop
                  playsInline
                  className="w-full rounded-2xl"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Troll Media"
                  className="w-full rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
