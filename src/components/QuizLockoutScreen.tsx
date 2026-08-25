import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Clock, RotateCcw, Sparkles, ShieldAlert } from 'lucide-react';

interface QuizLockoutScreenProps {
  lockoutUntil: number; // timestamp in ms
  onRetry: () => void;
  onAdminBypassClick?: () => void;
}

export default function QuizLockoutScreen({
  lockoutUntil,
  onRetry,
  onAdminBypassClick,
}: QuizLockoutScreenProps) {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isExpired = timeLeftSeconds <= 0;

  return (
    <div className="fixed inset-0 z-[11500] flex items-center justify-center p-4 bg-[#0B0416] text-white select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15),transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative max-w-lg w-full bg-[#150724] border border-purple-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
      >
        {/* Animated Lock Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-900/30">
          <Lock className="w-10 h-10 text-rose-300" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full animate-ping" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-400 bg-rose-950/40 border border-rose-500/30 px-3 py-1 rounded-full">
            ⏳ TẠM THỜI KHÓA LỐI VÀO
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-comfortaa text-white">
            Thời Gian Nghỉ Dưỡng
          </h2>
        </div>

        {/* The Exact User-Specified Phrase */}
        <div className="p-5 rounded-2xl bg-purple-950/50 border border-purple-500/30 text-rose-200 text-sm sm:text-base font-sans italic leading-relaxed shadow-inner">
          “Rất tiếc! Bé quay lại sau 30’ nữa nhé~”
        </div>

        {/* Live Countdown Display */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#051F45]/90 via-[#131D38]/90 to-[#F2C4CD]/30 border border-[#F2C4CD]/40 backdrop-blur-md space-y-2.5 shadow-inner">
          <div className="text-xs text-purple-200/90 uppercase tracking-wider font-bold flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#F2C4CD]" />
            <span>Thời Gian Chờ Mở Khóa Đề Mới:</span>
          </div>
          <div className="text-4xl sm:text-5xl font-black font-mono text-amber-300 tracking-wider drop-shadow">
            {formattedTime}
          </div>
          <p className="text-xs text-purple-200/80">
            {isExpired
              ? '🎉 Đã hết 30 phút nghỉ ngơi! Bé có thể làm bộ đề thi mới được xào lại.'
              : 'Hết thời gian đếm ngược thì sẽ được làm bộ đề mới.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="space-y-3 pt-2">
          {isExpired ? (
            <button
              type="button"
              onClick={onRetry}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-extrabold font-comfortaa text-sm transition shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Thử Thách Lại Với Bộ Đề Mới (30 Câu)</span>
            </button>
          ) : (
            <div className="text-xs text-purple-300/60 italic">
              Vui lòng thư giãn, uống một tách trà ấm và chờ đếm ngược kết thúc nhé...
            </div>
          )}

          {/* Admin Login Bypass Option */}
          {onAdminBypassClick && (
            <div className="pt-2 border-t border-purple-500/20">
              <button
                type="button"
                onClick={onAdminBypassClick}
                className="text-[11px] text-purple-400/80 hover:text-purple-200 transition underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Bạn là Viện Trưởng? Đăng nhập quyền Admin để bỏ qua</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
