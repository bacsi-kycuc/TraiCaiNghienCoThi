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

// Robust helper to determine if a URL represents a video format
const isVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  const lowercase = url.toLowerCase();

  // YouTube check
  if (lowercase.includes("youtube.com") || lowercase.includes("youtu.be")) {
    return true;
  }

  // Strip query parameters and hash anchors, then match common formats smoothly
  const cleanUrl = lowercase.split("?")[0].split("#")[0];
  const videoExtensions = [".mp4", ".mov", ".webm", ".ogg", ".m4v", ".3gp", ".avi", ".mkv"];
  return videoExtensions.some(ext => cleanUrl.endsWith(ext));
};

// Precise YouTube link parser for embedded iframe view
const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const lowercase = url.toLowerCase();
    if (!lowercase.includes("youtube.com") && !lowercase.includes("youtu.be")) {
      return null;
    }

    const parsed = new URL(url);
    let id = "";

    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) {
        id = v;
      } else {
        const parts = parsed.pathname.split("/");
        if (parts[1] === "embed" && parts[2]) {
          id = parts[2];
        } else if (parts[1] === "v" && parts[2]) {
          id = parts[2];
        }
      }
    } else if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.slice(1);
    }

    if (id) {
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1&modestbranding=1&rel=0`;
    }
  } catch {
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=1&modestbranding=1&rel=0`;
    }
  }
  return null;
};

export default function TrollPopup({
  isOpen,
  onClose,
  hintText,
  mediaUrl,
  trollMode,
}: TrollPopupProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 15000); // Expanded slightly to 15 seconds so they can view video longer
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
            className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 cursor-pointer p-1 transition-colors z-10"
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
              {mediaUrl ? (
                (() => {
                  const isVid = isVideoUrl(mediaUrl);
                  const ytEmbed = getYouTubeEmbedUrl(mediaUrl);

                  if (ytEmbed) {
                    return (
                      <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700 bg-black">
                        <iframe
                          src={ytEmbed}
                          title="Troll Video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    );
                  }

                  if (isVid) {
                    return (
                      <video
                        src={mediaUrl}
                        autoPlay
                        loop
                        playsInline
                        muted
                        controls
                        className="w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700 bg-black"
                      />
                    );
                  }

                  // Default Image tag
                  return (
                    <img
                      src={mediaUrl}
                      alt="Troll Content"
                      className="w-full rounded-2xl object-cover max-h-60 shadow-inner border border-slate-200 dark:border-slate-700 bg-black"
                      referrerPolicy="no-referrer"
                    />
                  );
                })()
              ) : (
                <p className="text-sm text-slate-400">Không tìm thấy phương tiện troller.</p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
