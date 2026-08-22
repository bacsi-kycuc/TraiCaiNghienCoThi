import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Sparkles, Heart } from 'lucide-react';

interface SiteLockdownScreenProps {
  onAdminLoginClick: () => void;
}

interface FloatingItem {
  id: number;
  icon: string;
  left: number; // percentage
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  rotate: number; // degrees
  sway: number; // px horizontal sway
  opacity: number;
}

export default function SiteLockdownScreen({ onAdminLoginClick }: SiteLockdownScreenProps) {
  // Generate a fixed array of falling feather/petal/sparkle particles
  const floatingItems: FloatingItem[] = useMemo(() => {
    const icons = ['🪶', '🪶', '🪶', '🌸', '✨', '🪶', '🪶', '🕊️', '🌸', '🪶', '✨', '🪶', '🌸', '🪶', '✨', '🪶', '🌸', '🪶'];
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      icon: icons[i % icons.length],
      left: Math.random() * 96 + 2, // 2% to 98%
      size: Math.floor(Math.random() * 16) + 18, // 18px to 34px
      duration: Math.random() * 6 + 7, // 7s to 13s
      delay: Math.random() * 5, // 0s to 5s
      rotate: Math.floor(Math.random() * 360),
      sway: Math.floor(Math.random() * 40) + 20, // 20px to 60px
      opacity: Math.random() * 0.4 + 0.5, // 0.5 to 0.9
    }));
  }, []);

  return (
    <div
      id="site-lockdown-screen"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at center, #2e182b 0%, #170919 50%, #0c040d 100%)',
      }}
    >
      {/* Ambient background glows */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none -top-20 -left-20 animate-pulse" />
      <div className="absolute w-[450px] h-[450px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none -bottom-20 -right-20 animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Falling Feathers & Petals Animation Stream */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {floatingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              y: -50,
              x: 0,
              rotate: item.rotate,
              opacity: 0,
            }}
            animate={{
              y: ['0vh', '110vh'],
              x: [0, item.sway, -item.sway, 0],
              rotate: [item.rotate, item.rotate + 180, item.rotate + 360],
              opacity: [0, item.opacity, item.opacity, 0],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: `${item.left}%`,
              fontSize: `${item.size}px`,
              filter: 'drop-shadow(0 2px 6px rgba(244, 114, 182, 0.35))',
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      {/* Main Vintage Lovely Announcement Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[560px] rounded-[32px] p-6 sm:p-10 text-center border-2 border-pink-300/30 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(244,114,182,0.15)] backdrop-blur-xl space-y-6"
        style={{
          background: 'linear-gradient(145deg, rgba(46, 19, 42, 0.85) 0%, rgba(26, 10, 25, 0.92) 100%)',
        }}
      >
        {/* Top vintage badge / decorative header */}
        <div className="flex items-center justify-center gap-2">
          <span className="h-[1px] w-10 sm:w-16 bg-gradient-to-r from-transparent via-pink-300/40 to-pink-300/80" />
          <span className="px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-widest uppercase bg-pink-500/15 border border-pink-400/30 text-pink-200 font-sans shadow-inner flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-pink-400 fill-pink-400 animate-pulse" />
            Thông Báo Từ Viện
            <Sparkles className="w-3 h-3 text-pink-300" />
          </span>
          <span className="h-[1px] w-10 sm:w-16 bg-gradient-to-l from-transparent via-pink-300/40 to-pink-300/80" />
        </div>

        {/* Vintage Illustration & Feather Centerpiece */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-pink-900/40 to-purple-950/60 border-2 border-pink-400/40 flex items-center justify-center shadow-inner">
          <motion.div
            animate={{
              y: [-4, 4, -4],
              rotate: [-3, 3, -3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="text-4xl sm:text-5xl filter drop-shadow-[0_4px_12px_rgba(244,114,182,0.5)]"
          >
            🪶
          </motion.div>
          {/* Subtle orbiting sparkles */}
          <span className="absolute -top-1 -right-1 text-sm animate-bounce">✨</span>
          <span className="absolute -bottom-1 -left-1 text-sm animate-pulse">🌸</span>
        </div>

        {/* Primary Message as explicitly specified */}
        <div className="space-y-3 px-2">
          <h2
            className="font-cabinet text-xl sm:text-2xl md:text-[26px] font-bold text-pink-100 leading-snug tracking-wide"
            style={{
              textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 15px rgba(244, 114, 182, 0.4)',
            }}
          >
            "Bảo bối à, đã đến giờ Viện trưởng dẫn các bác sĩ đi đào tạo lại. Bé yêu quay lại sau nhé~"
          </h2>
          <p className="text-xs sm:text-sm text-pink-200/80 italic font-comfortaa leading-relaxed">
            🌸 Bệnh viện tạm thời đóng cửa nghỉ ngơi. Các bác sĩ và điều dưỡng sẽ sớm trở lại chăm sóc chu đáo cho bé!
          </p>
        </div>

        {/* Vintage Divider line */}
        <div className="flex items-center justify-center gap-3 pt-2 opacity-60">
          <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-pink-400/30 to-pink-400/60" />
          <span className="text-pink-300 text-xs">❦</span>
          <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-pink-400/30 to-pink-400/60" />
        </div>

        {/* Admin Login Portal button (discreet & elegant) */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onAdminLoginClick}
            id="lockdown-admin-portal-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/40 hover:bg-black/60 border border-pink-400/25 hover:border-pink-300 text-pink-200/90 hover:text-pink-100 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-md backdrop-blur-sm"
          >
            <KeyRound className="w-3.5 h-3.5 text-pink-400" />
            <span>Cổng Quản Trị / Viện Trưởng</span>
          </button>
          <span className="text-[10px] text-pink-300/50 font-mono">
            Chỉ dành cho Admin mở lại cửa Viện
          </span>
        </div>
      </motion.div>

      {/* Footer subtle copyright/stamp */}
      <div className="relative z-10 mt-8 text-[11px] text-pink-300/40 font-mono tracking-wider">
        Viện Tâm Thần Cố Thị • Chế Độ Bảo Trì & Đào Tạo
      </div>
    </div>
  );
}
