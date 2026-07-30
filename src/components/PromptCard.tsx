import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ExternalLink, Edit2, Lock, Unlock, Eye, EyeOff, BookOpen, X } from "lucide-react";
import { Prompt } from "../types";
import VoteHeartWidget from "./VoteHeartWidget";

interface PromptCardProps {
  key?: React.Key;
  prompt: Prompt;
  isAdmin: boolean;
  onEdit: (prompt: Prompt) => void;
  onTagClick: (tag: string) => void;
  index?: number;
  onPasswordError?: (prompt: Prompt, count: number) => void;
  onOpenPrompt?: (prompt: Prompt) => void;
  viewMode?: "grid" | "list";
  votes?: number;
  onVote?: (id: string) => void;
  isUnlocked?: boolean;
  onUnlock?: (promptId: string) => void;
  onLock?: (promptId: string) => void;
}

export default function PromptCard({
  prompt,
  isAdmin,
  onEdit,
  onTagClick,
  index = 0,
  onPasswordError,
  onOpenPrompt,
  viewMode = "grid",
  votes = 0,
  onVote,
  isUnlocked = false,
  onUnlock,
  onLock,
}: PromptCardProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [showCardPassword, setShowCardPassword] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [failCount, setFailCount] = useState(() => {
     const storedCount = localStorage.getItem(`failCount_prompt_${prompt.id}`);
     return storedCount ? parseInt(storedCount) : 0;
  });
  const [showSecondaryHintPopup, setShowSecondaryHintPopup] = useState(false);
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [ripples, setRipples] = useState<
    { id: number; x: number; y: number; size: number }[]
  >([]);

  const hasPassword = !!prompt.password;

  const handleOpenPrompt = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasPassword && !isUnlocked && !isAdmin) {
      e.preventDefault();
      setChallengeOpen(true);
    } else {
      if (onOpenPrompt) {
        onOpenPrompt(prompt);
      }
      // If we clicked on the already unlocked card, we want to immediately clear its unlocked state after starting the navigation,
      // so when they return it's locked again.
      if (onLock && hasPassword && !isAdmin) {
        setTimeout(() => {
          onLock(prompt.id.toString());
        }, 800);
      }
    }
  };

  const handleVerifyPassword = () => {
    if (passwordInput === prompt.password) {
      if (onUnlock) {
        onUnlock(prompt.id.toString());
      }
      setChallengeOpen(false);
      setShowSecondaryHintPopup(false);
      setErrorMsg("");
      // Reset local failure count
      localStorage.removeItem(`failCount_prompt_${prompt.id}`);
      setFailCount(0);
      
      if (onOpenPrompt) {
        onOpenPrompt(prompt);
      }
      // Dispatch colorful confetti celebratory event
      window.dispatchEvent(new CustomEvent("celebrate-confetti"));
      // Open link in a new tab
      window.open(prompt.url, "_blank", "noreferrer,noopener");

      // Auto-lock again after 1 second so next click requires password again (or when they return)
      if (onLock) {
        setTimeout(() => {
          onLock(prompt.id.toString());
          setPasswordInput("");
        }, 1000);
      }
    } else {
      // Get current local count
      const storedCount = localStorage.getItem(`failCount_prompt_${prompt.id}`);
      const newCount = (storedCount ? parseInt(storedCount) : 0) + 1;
      localStorage.setItem(`failCount_prompt_${prompt.id}`, newCount.toString());
      setFailCount(newCount);
      
      setErrorMsg(`❌ Bé hư đã sai ${newCount} lần!`);

      // Trigger troll alarm
      if (onPasswordError) {
        onPasswordError(prompt, newCount);
      }

      // Logic: trigger if newCount >= maxFailureLimit and newCount % maxFailureLimit === 0
      const limit = prompt.maxFailureLimit || 5;
      if (newCount >= limit && newCount % limit === 0) {
        setShowSecondaryHintPopup(true);
      }
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Prevent ripple if interacting with elements like buttons, generic anchor links or tags
    if (
      target.closest("a") ||
      target.closest("button") ||
      target.closest("input") ||
      (target.closest(".cursor-pointer") && target.tagName === "SPAN")
    ) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2.2;

    const newRipple = {
      id: Date.now() + Math.random(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Trigger opening/unlocking when clicking anywhere on the card
    if (hasPassword && !isUnlocked && !isAdmin) {
      setChallengeOpen(true);
    } else {
      if (onOpenPrompt) {
        onOpenPrompt(prompt);
      }
      // Open the URL in a new tab programmatically since this was triggered by a card body click
      if (prompt.url) {
        window.open(prompt.url, "_blank", "noreferrer,noopener");
      }
      if (onLock && hasPassword && !isAdmin) {
        setTimeout(() => {
          onLock(prompt.id.toString());
        }, 800);
      }
    }
  };

  const handleRippleEnd = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  if (viewMode === "list") {
    return (
      <motion.div
        id={`prompt-${prompt.id}`}
        layout
        initial={{ opacity: 0, x: -25, y: 15 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 25, scale: 0.98, transition: { duration: 0.2 } }}
        whileHover={{ x: 5, y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}
        transition={{
          type: "spring",
          stiffness: 350,
          damping: 25,
          delay: Math.min(index * 0.05, 0.5),
        }}
        onClick={handleCardClick}
        className="prompt-card bg-[var(--card)] border-2 border-[var(--zone-border)] rounded-2xl p-4 shadow-sm hover:border-[var(--zone-primary)] transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
      >
        {/* Premium ripple elements */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            onAnimationEnd={() => handleRippleEnd(ripple.id)}
            className="absolute pointer-events-none rounded-full bg-[var(--zone-primary)]/15 animate-premium-ripple"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}

        {/* Cột chính: Icon + Tiêu đề + Phân khoa */}
        <div className="flex items-start gap-3 flex-1 min-w-0 relative z-10 pointer-events-none">
          <span className="text-2xl mt-0.5 shrink-0 select-none bg-[var(--zone-primary-lighter)] p-2 rounded-xl border border-[var(--zone-border)]/40">
            {prompt.icon || "📝"}
          </span>
          <div className="min-w-0 pr-4 pointer-events-auto">
            <h3 className="text-sm font-bold text-[var(--zone-primary)] flex items-center gap-1.5 leading-snug truncate">
              <span>{prompt.title}</span>
              {hasPassword && (
                <span
                  className="text-amber-500 animate-pulse shrink-0"
                  title="Có mật khẩu bảo vệ"
                >
                  {isUnlocked ? (
                    <Unlock className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                </span>
              )}
            </h3>
            {prompt.description && (
              <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-1 font-medium leading-relaxed">
                {prompt.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {prompt.genre && (
                <span className="text-[10px] text-[var(--zone-primary)] font-bold bg-[var(--zone-primary-lighter)] px-2 py-0.5 rounded-md border border-[var(--zone-border)]/30">
                  {prompt.genre}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] bg-slate-500/5 px-2 py-0.5 rounded-md">
                <Eye className="w-3 h-3 opacity-70" />
                <span>{prompt.viewCount || 0} lượt xem</span>
              </span>
            </div>
          </div>
        </div>

        {/* Cột các Tags - Ẩn trên mobile để tối ưu không gian, hiển thị từ tablet */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="hidden lg:flex flex-wrap gap-1 max-w-[250px] shrink-0 items-center relative z-10">
            {prompt.tags.map((tag) => (
              <span
                key={tag}
                onClick={() => onTagClick(tag)}
                className="bg-transparent text-[var(--zone-primary)] border border-[var(--zone-border)] text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:bg-[var(--zone-primary)] hover:text-white transition duration-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Cột nút Actions */}
        <div className="flex items-center gap-2 shrink-0 justify-end mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--zone-border)] relative z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPlotModal(true);
            }}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-indigo-600/20 hover:from-purple-600/40 hover:via-pink-600/40 hover:to-indigo-600/40 text-purple-200 border border-purple-500/30 hover:border-purple-400 px-3 py-1.5 rounded-xl font-extrabold text-xs transition duration-200 shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            title="Đọc thông tin Plot / Cốt truyện tham khảo"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Plot</span>
          </button>

          <a
            href={prompt.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenPrompt}
            className="inline-flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-md transition hover:scale-105 border border-violet-500/20"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Bé đến đây!
          </a>

          {onVote && (
            <VoteHeartWidget
              characterId={prompt.id.toString()}
              votes={votes}
              onVote={onVote}
              isCompact={true}
            />
          )}

          {isAdmin && (
            <button
              onClick={() => onEdit(prompt)}
              className="inline-flex items-center gap-1 bg-slate-100/10 hover:bg-[var(--zone-primary-lighter)] text-[var(--text)] border border-[var(--zone-border)] hover:border-[var(--zone-primary)] hover:text-[var(--zone-primary)] px-2.5 py-1.5 rounded-xl font-bold text-xs transition duration-250 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              Sửa
            </button>
          )}
        </div>

        {/* Thử thách password dạng phủ đắp cho list view */}
        {challengeOpen && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-row items-center justify-between p-4 z-20 gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Lock className="w-5 h-5 text-amber-500 animate-[bounce_1.5s_infinite] shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-100 truncate">
                  Khám bệnh án này cần Mật khẩu
                </h4>
                {prompt.passwordHint && (
                  <p className="text-[10px] text-amber-400 italic truncate">
                    Gợi ý: {prompt.passwordHint}
                  </p>
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyPassword();
              }}
              className="flex flex-col sm:flex-row items-center gap-2 shrink-0"
            >
              <div className="relative w-full sm:w-[150px]">
                <input
                  type={showCardPassword ? "text" : "password"}
                  placeholder="Nhập mã mở..."
                  value={passwordInput || ""}
                  autoComplete="new-password"
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="px-2.5 pr-8 py-1.5 w-full bg-slate-800 text-white rounded-lg text-xs border border-slate-600 focus:outline-none focus:border-purple-500 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCardPassword(!showCardPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer p-1 hover:scale-110 active:scale-90"
                  title={showCardPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showCardPassword ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </button>
              </div>

              {errorMsg && (
                <p className="text-[10px] text-rose-500 truncate max-w-[120px]">
                  {errorMsg}
                </p>
              )}

              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] px-2.5 py-1 rounded-md font-bold transition cursor-pointer"
                >
                  Mở Khóa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChallengeOpen(false);
                    setPasswordInput("");
                    setErrorMsg("");
                    if (onLock) {
                      onLock(prompt.id.toString());
                    }
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] px-2.5 py-1 rounded-md font-medium transition cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {showSecondaryHintPopup && (
          <div className="absolute inset-0 bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-4 flex flex-col justify-center items-center text-center z-30 shadow-2xl backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-1 border border-amber-500/30">
              <span className="text-sm animate-bounce">💡</span>
            </div>
            <h5 className="text-amber-400 font-bold text-xs uppercase tracking-wide">
              Gợi ý bổ sung (Sai lần {failCount})!
            </h5>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 my-1 w-full max-w-[280px] flex flex-col items-center justify-center overflow-hidden">
              {prompt.trollMode === 'media' && prompt.mediaUrl ? (
                prompt.mediaUrl.startsWith("data:video/") || prompt.mediaUrl.includes(".mp4") ? (
                  <video
                    src={prompt.mediaUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    className="max-h-[120px] rounded-lg w-full object-contain border border-amber-500/30 shadow-md"
                  />
                ) : (
                  <img
                    src={prompt.mediaUrl}
                    alt="Troll helper modal illustration"
                    className="max-h-[120px] rounded-lg w-full object-contain border border-amber-500/30 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                )
              ) : (
                <p className="text-amber-200 text-xs font-semibold select-all italic leading-relaxed">
                  "{prompt.hintText || "Hãy suy nghĩ thêm chút nữa nhé!"}"
                </p>
              )}
            </div>
            <button
              onClick={() => setShowSecondaryHintPopup(false)}
              className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-extrabold text-[9px] px-3 py-1 rounded-lg transition-transform cursor-pointer shadow-md uppercase tracking-wider"
            >
              Đã hiểu chuyên án, thử lại!
            </button>
          </div>
        )}

        {/* Plot Modal Pop-up */}
        {showPlotModal && createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => {
              e.stopPropagation();
              setShowPlotModal(false);
            }}
          >
            <div
              className="max-w-lg w-full bg-slate-900 border-2 border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden text-slate-100 space-y-4 animate-[scaleUp_0.2s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top glowing bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 absolute top-0 left-0" />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-purple-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl bg-purple-500/10 border border-purple-500/30 p-2.5 rounded-2xl shadow-inner shrink-0">
                    {prompt.icon || "📝"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-black tracking-widest text-purple-400 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Plot Bệnh Án
                      </span>
                      {prompt.genre && (
                        <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full font-semibold">
                          {prompt.genre}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                      {prompt.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlotModal(false);
                  }}
                  className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 p-2 rounded-full transition cursor-pointer border border-slate-700/50 hover:scale-110 active:scale-90 shrink-0"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="text-purple-300 font-bold">
                    Thông tin & lý lịch sơ bộ:
                  </span>
                </div>

                <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap max-h-[55vh] overflow-y-auto custom-scrollbar shadow-inner">
                  {prompt.plot && prompt.plot.trim() ? (
                    prompt.plot
                  ) : (
                    <div className="text-center py-6 text-slate-400 space-y-2">
                      <BookOpen className="w-8 h-8 text-purple-400/50 mx-auto animate-pulse" />
                      <p className="italic text-xs">
                        Bệnh án này chưa có thông tin Plot/Cốt truyện sơ bộ được cập nhật.
                      </p>
                    </div>
                  )}
                </div>

                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {prompt.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold text-purple-300 bg-purple-950/40 border border-purple-500/20 px-2.5 py-0.5 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex justify-end border-t border-purple-500/20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlotModal(false);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      id={`prompt-${prompt.id}`}
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{
        scale: 1.03,
        y: -5,
        boxShadow: "0 25px 50px -12px rgba(42, 52, 57, 0.4)",
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: Math.min(index * 0.05, 0.5), // Max delay of 0.5s to prevent long waits
      }}
      onClick={handleCardClick}
      className="prompt-card bg-[var(--card)] border-2 border-[var(--zone-border)] rounded-2xl p-5 shadow-lg hover:border-[var(--zone-primary)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer"
    >
      {/* Premium ripple elements */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          onAnimationEnd={() => handleRippleEnd(ripple.id)}
          className="absolute pointer-events-none rounded-full bg-[var(--zone-primary)]/15 animate-premium-ripple"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}

      <div className="relative z-10 pointer-events-none">
        <div className="pointer-events-auto relative">
          <h3 className="text-lg font-bold text-[var(--zone-primary)] flex items-center gap-1.5 leading-snug">
            <span>{prompt.icon || "📝"}</span>
            <span>{prompt.title}</span>
            {hasPassword && (
              <span
                className="text-amber-500 animate-pulse ml-1"
                title="Có mật khẩu bảo vệ"
              >
                {isUnlocked ? (
                  <Unlock className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </span>
            )}
          </h3>

          {prompt.description && (
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-2.5">
              {prompt.description}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            {prompt.genre && (
              <span className="bg-[var(--zone-primary-lighter)] text-[var(--zone-primary)] text-xs font-bold px-2.5 py-1 rounded-lg">
                {prompt.icon || "📁"} {prompt.genre}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] bg-slate-500/5 px-2 py-0.5 rounded-md"
              title="Số lượt xem bệnh án"
            >
              <Eye className="w-3.5 h-3.5 opacity-70" />
              <span>{prompt.viewCount || 0} lượt xem</span>
            </span>
          </div>

          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => onTagClick(tag)}
                  className="bg-transparent text-[var(--zone-primary)] border border-[var(--zone-border)] text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-[var(--zone-primary)] hover:text-white transition duration-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-[var(--zone-border)] flex items-center justify-between relative z-10 w-full gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPlotModal(true);
            }}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-indigo-600/20 hover:from-purple-600/40 hover:via-pink-600/40 hover:to-indigo-600/40 text-purple-200 border border-purple-500/30 hover:border-purple-400 px-3 py-1.5 rounded-xl font-extrabold text-xs transition duration-200 shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            title="Đọc thông tin Plot / Cốt truyện tham khảo"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Plot</span>
          </button>

          <a
            href={prompt.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenPrompt}
            className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl font-extrabold text-xs shadow-md transition hover:scale-105 border border-violet-500/20 whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Bé đến đây!
          </a>

          {isAdmin && (
            <button
              onClick={() => onEdit(prompt)}
              className="inline-flex items-center gap-1 bg-slate-100/10 hover:bg-[var(--zone-primary-lighter)] text-[var(--text)] border border-[var(--zone-border)] hover:border-[var(--zone-primary)] hover:text-[var(--zone-primary)] px-3 py-1.5 rounded-xl font-bold text-xs transition duration-250 cursor-pointer whitespace-nowrap"
            >
              <Edit2 className="w-3 h-3" />
              Sửa
            </button>
          )}
        </div>

        {onVote && (
          <div className="shrink-0">
            <VoteHeartWidget
              characterId={prompt.id.toString()}
              votes={votes}
              onVote={onVote}
              isCompact={true}
            />
          </div>
        )}
      </div>

      {challengeOpen && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col justify-center items-center p-4 text-center z-20">
          <Lock className="w-8 h-8 text-amber-500 animate-[bounce_1.5s_infinite] mb-2" />
          <h4 className="text-sm font-bold text-slate-100">
            Khám bệnh án này cần Mật khẩu
          </h4>

          {prompt.passwordHint && (
            <p className="text-xs text-amber-400 mt-1 italic">
              Gợi ý: {prompt.passwordHint}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyPassword();
            }}
            className="w-full flex flex-col items-center mt-3"
          >
            <div className="relative w-full max-w-[200px]">
              <input
                type={showCardPassword ? "text" : "password"}
                placeholder="Nhập mã mở khóa..."
                value={passwordInput || ""}
                autoComplete="new-password"
                onChange={(e) => setPasswordInput(e.target.value)}
                className="px-3 pr-9 py-1.5 w-full bg-slate-800 text-white rounded-lg text-xs text-center border border-slate-600 focus:outline-none focus:border-purple-500 placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowCardPassword(!showCardPassword)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer p-1.5 hover:scale-110 active:scale-90"
                title={showCardPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showCardPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {errorMsg && <p className="text-xs text-rose-500 mt-2">{errorMsg}</p>}

            <div className="flex gap-2 mt-3.5">
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded-md font-bold transition cursor-pointer"
              >
                Mở Khóa
              </button>
              <button
                type="button"
                onClick={() => {
                  setChallengeOpen(false);
                  setPasswordInput("");
                  setErrorMsg("");
                  if (onLock) {
                    onLock(prompt.id.toString());
                  }
                }}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1 rounded-md font-medium transition cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {showSecondaryHintPopup && (
        <div className="absolute inset-0 bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-4 flex flex-col justify-center items-center text-center z-30 shadow-2xl backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-1 border border-amber-500/30">
            <span className="text-sm animate-bounce">💡</span>
          </div>
          <h5 className="text-amber-400 font-bold text-xs uppercase tracking-wide">
            Gợi ý bổ sung (Sai lần {failCount})!
          </h5>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 my-1.5 w-full max-w-[200px] flex flex-col items-center justify-center overflow-hidden">
            {prompt.trollMode === 'media' && prompt.mediaUrl ? (
              prompt.mediaUrl.startsWith("data:video/") || prompt.mediaUrl.includes(".mp4") ? (
                <video
                  src={prompt.mediaUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  className="max-h-[120px] rounded-lg w-full object-contain border border-amber-500/30 shadow-md"
                />
              ) : (
                <img
                  src={prompt.mediaUrl}
                  alt="Troll helper modal illustration"
                  className="max-h-[120px] rounded-lg w-full object-contain border border-amber-500/30 shadow-md"
                  referrerPolicy="no-referrer"
                />
              )
            ) : (
              <p className="text-amber-200 text-xs font-semibold select-all italic leading-relaxed">
                "{prompt.hintText || "Hãy suy nghĩ thêm chút nữa nhé!"}"
              </p>
            )}
          </div>
          <button
            onClick={() => setShowSecondaryHintPopup(false)}
            className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-extrabold text-[9px] px-3 py-1 rounded-lg transition-transform cursor-pointer shadow-md uppercase tracking-wider"
          >
            Đã hiểu chuyên án, thử lại!
          </button>
        </div>
      )}

      {/* Plot Modal Pop-up */}
      {showPlotModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={(e) => {
            e.stopPropagation();
            setShowPlotModal(false);
          }}
        >
          <div
            className="max-w-lg w-full bg-slate-900 border-2 border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden text-slate-100 space-y-4 animate-[scaleUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top glowing bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 absolute top-0 left-0" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl bg-purple-500/10 border border-purple-500/30 p-2.5 rounded-2xl shadow-inner shrink-0">
                  {prompt.icon || "📝"}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-black tracking-widest text-purple-400 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Plot Bệnh Án
                    </span>
                    {prompt.genre && (
                      <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full font-semibold">
                        {prompt.genre}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                    {prompt.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlotModal(false);
                }}
                className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 p-2 rounded-full transition cursor-pointer border border-slate-700/50 hover:scale-110 active:scale-90 shrink-0"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="text-purple-300 font-bold">
                  Thông tin & lý lịch sơ bộ:
                </span>
              </div>

              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap max-h-[55vh] overflow-y-auto custom-scrollbar shadow-inner">
                {prompt.plot && prompt.plot.trim() ? (
                  prompt.plot
                ) : (
                  <div className="text-center py-6 text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 text-purple-400/50 mx-auto animate-pulse" />
                    <p className="italic text-xs">
                      Bệnh án này chưa có thông tin Plot/Cốt truyện sơ bộ được cập nhật.
                    </p>
                  </div>
                )}
              </div>

              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {prompt.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-semibold text-purple-300 bg-purple-950/40 border border-purple-500/20 px-2.5 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end border-t border-purple-500/20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlotModal(false);
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
