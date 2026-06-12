import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Edit2, Lock, Unlock } from 'lucide-react';
import { Prompt } from '../types';

interface PromptCardProps {
  key?: React.Key;
  prompt: Prompt;
  isAdmin: boolean;
  onEdit: (prompt: Prompt) => void;
  onTagClick: (tag: string) => void;
  index?: number;
}

export default function PromptCard({ prompt, isAdmin, onEdit, onTagClick, index = 0 }: PromptCardProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const hasPassword = !!prompt.password;

  const handleOpenPrompt = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasPassword && !unlocked && !isAdmin) {
      e.preventDefault();
      setChallengeOpen(true);
    }
  };

  const handleVerifyPassword = () => {
    if (passwordInput === prompt.password) {
      setUnlocked(true);
      setChallengeOpen(false);
      setErrorMsg('');
      // Open link in a new tab
      window.open(prompt.url, '_blank', 'noreferrer,noopener');
    } else {
      setErrorMsg('⚠️ Sai mật khẩu! Hãy thử lại.');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30, y: 15 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ 
        scale: 1.03,
        boxShadow: "0 25px 50px -12px rgba(42, 52, 57, 0.4)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20,
        delay: Math.min(index * 0.05, 0.5) // Max delay of 0.5s to prevent long waits
      }}
      className="prompt-card bg-[var(--card)] border-2 border-[var(--zone-border)] rounded-2xl p-5 shadow-lg hover:border-[var(--zone-primary)] transition-colors duration-300 relative overflow-hidden flex flex-col justify-between"
    >
      <div>
        <h3 className="text-lg font-bold text-[var(--zone-primary)] pr-20 flex items-center gap-1.5 leading-snug">
          <span>{prompt.icon || '📝'}</span>
          <span>{prompt.title}</span>
          {hasPassword && (
            <span className="text-amber-500 animate-pulse ml-1" title="Có mật khẩu bảo vệ">
              {unlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </span>
          )}
        </h3>

        {prompt.description && (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-2.5">
            {prompt.description}
          </p>
        )}

        {prompt.genre && (
          <div className="mt-3">
            <span className="bg-[var(--zone-primary-lighter)] text-[var(--zone-primary)] text-xs font-bold px-2.5 py-1 rounded-lg">
              {prompt.icon || '📁'} {prompt.genre}
            </span>
          </div>
        )}

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

      <div className="mt-5 pt-3 border-t border-[var(--zone-border)] flex flex-wrap gap-2 items-center justify-between">
        <a
          href={prompt.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenPrompt}
          className="inline-flex items-center gap-1.5 bg-[var(--zone-primary)] hover:bg-[var(--zone-primary-light)] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition hover:scale-105"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Kích hoạt Prompt
        </a>

        {isAdmin && (
          <button
            onClick={() => onEdit(prompt)}
            className="inline-flex items-center gap-1 bg-slate-100/10 hover:bg-[var(--zone-primary-lighter)] text-[var(--text)] border border-[var(--zone-border)] hover:border-[var(--zone-primary)] hover:text-[var(--zone-primary)] px-3 py-1.5 rounded-xl font-bold text-xs transition duration-250 cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            Sửa
          </button>
        )}
      </div>

      {challengeOpen && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col justify-center items-center p-4 text-center z-20">
          <Lock className="w-8 h-8 text-amber-500 animate-[bounce_1.5s_infinite] mb-2" />
          <h4 className="text-sm font-bold text-slate-100">Khám bệnh án này cần Mật khẩu</h4>
          
          {prompt.passwordHint && (
            <p className="text-xs text-amber-400 mt-1 italic">Gợi ý: {prompt.passwordHint}</p>
          )}

          <input
            type="password"
            placeholder="Nhập mã mở khóa..."
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
            className="mt-3 px-3 py-1.5 w-full max-w-[200px] bg-slate-800 text-white rounded-lg text-xs text-center border border-slate-600 focus:outline-none focus:border-purple-500"
          />

          {errorMsg && <p className="text-xs text-rose-500 mt-2">{errorMsg}</p>}

          <div className="flex gap-2 mt-3.5">
            <button
              onClick={handleVerifyPassword}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded-md font-bold transition cursor-pointer"
            >
              Mở Khóa
            </button>
            <button
              onClick={() => setChallengeOpen(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1 rounded-md font-medium transition cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
