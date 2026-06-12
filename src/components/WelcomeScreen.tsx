import React from 'react';
import { motion } from 'motion/react';
import { Key, User, LogOut, MessageSquare, ThumbsUp, Sun, Moon } from 'lucide-react';

interface WelcomeScreenProps {
  onEnterApp: (zone: 'hospital' | 'cai-nghien') => void;
  isAdmin: boolean;
  onAdminLoginClick: () => void;
  onAdminLogout: () => void;
  discordLink: string;
  facebookLink: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function WelcomeScreen({
  onEnterApp,
  isAdmin,
  onAdminLoginClick,
  onAdminLogout,
  discordLink,
  facebookLink,
  theme,
  onToggleTheme
}: WelcomeScreenProps) {

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 w-full h-full z-[9999] flex flex-col items-center justify-center p-5 eerie-glow"
      style={{ background: 'var(--welcome-bg)' }}
    >
      
      {/* Top right floating admin controls */}
      <div className="absolute top-5 right-5 flex gap-2.5 z-10 items-center">
        <button 
          onClick={onToggleTheme}
          className="w-9 h-9 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] bg-[var(--card)]/80 hover:bg-[var(--card)] text-[var(--text)] flex items-center justify-center transition hover:scale-105 cursor-pointer shadow-md backdrop-blur-sm"
          title="Đổi Chế Độ Sáng/Tối"
          id="welcome-theme-toggle"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
        </button>

        {!isAdmin ? (
          <button 
            onClick={onAdminLoginClick}
            className="bg-[var(--card)]/90 hover:bg-[var(--card)] text-[var(--text)] font-bold py-1.5 px-3.5 rounded-xl border border-[var(--border)] flex items-center gap-1.5 text-xs transition duration-300 cursor-pointer backdrop-blur hover:scale-105 hover:border-[var(--primary)] shadow-md"
            id="welcome-admin-login-btn"
          >
            <Key className="w-3.5 h-3.5" /> Admin
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="bg-[var(--card)]/90 text-[var(--text)] font-semibold py-1.5 px-3.5 rounded-xl border border-[var(--border)] text-xs backdrop-blur-sm flex items-center gap-1 shadow-sm">
              <User className="w-3.5 h-3.5" /> Admin
            </span>
            <button 
              onClick={onAdminLogout}
              className="bg-[#413839]/80 hover:bg-[#3D2022] text-[#E7DADA] font-bold py-1.5 px-3 rounded-xl border border-[#B29CA2]/40 flex items-center justify-center transition cursor-pointer hover:scale-105 shadow-md"
              title="Đăng xuất"
              id="welcome-admin-logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="relative z-1 space-y-2 text-center max-w-[620px] select-none scale-100 animate-[in_0.35s_ease-out] w-full px-4 font-sans">
        
        {/* Title Block */}
        <div className="flex flex-col items-center justify-center gap-2 mb-2">
          <span className="text-4xl md:text-5xl drop-shadow-lg">🏨</span>
          <h1 
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[var(--text)] via-[var(--primary)] to-[var(--accent)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] whitespace-normal sm:whitespace-nowrap leading-tight text-center"
            id="welcome-site-title"
          >
            VIỆN TÂM THẦN CỐ THỊ
          </h1>
        </div>
        <p className="text-[var(--text-muted)] font-medium text-sm md:text-base drop-shadow-sm pb-6 italic">
          Chào mừng các bệnh nhân đến với Trại Cai Nghiện
        </p>

        {/* Enter triggers */}
        <div className="flex flex-wrap gap-5 justify-center pt-2 pb-6 w-full max-w-[500px] mx-auto">
          <div 
            onClick={() => onEnterApp('cai-nghien')}
            className="bg-[var(--card)]/95 hover:bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--primary)] text-[var(--text)] rounded-3xl p-6 w-[260px] text-center cursor-pointer transition duration-350 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--primary)]/15 backdrop-blur-md flex flex-col items-center justify-center group shadow-xl"
            id="welcome-enter-btn"
          >
            <span className="text-4xl transition duration-300 transform group-hover:scale-110 mb-1">🏨</span>
            <h3 className="font-comfortaa text-[var(--text)] text-sm font-extrabold mt-2 tracking-wide group-hover:text-[var(--primary)] transition-colors">
              VÀO TRẠI
            </h3>
          </div>
        </div>

        {/* Social interactions */}
        <div className="flex justify-center gap-3.5 w-full max-w-[480px] mx-auto py-2">
          <a 
            href={discordLink || '#'} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--bg)] border border-[var(--border)] text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition hover:-translate-y-0.5 shadow-md"
            id="welcome-discord-link"
          >
            <MessageSquare className="w-4 h-4" /> Discord
          </a>
          <a 
            href={facebookLink || '#'} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex-1 bg-[var(--border2)] hover:bg-[var(--border)] text-[var(--bg)] border border-[var(--border)] text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition hover:-translate-y-0.5 shadow-md"
            id="welcome-facebook-link"
          >
            <ThumbsUp className="w-4 h-4" /> Facebook
          </a>
        </div>

      </div>

      <div className="absolute bottom-5 left-5 text-[10px] md:text-xs text-[var(--text-muted)] mr-5 font-comfortaa tracking-wide pointer-events-none opacity-60">
        © 2026 Rehab Zone. All rights reserved.
      </div>
    </motion.div>
  );
}
