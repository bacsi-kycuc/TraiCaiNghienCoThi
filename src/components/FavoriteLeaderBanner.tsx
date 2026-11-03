import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, ThumbsUp, Lock, Calendar, Clock, Crown, Flame, Sparkles } from 'lucide-react';
import { Prompt } from '../types';
import { getWeekTimeRemaining } from '../utils/weekUtils';

export interface ChampionRecord {
  promptId: string;
  title: string;
  votes: number;
  genre?: string;
  icon?: string;
  weekLabel?: string;
}

interface FavoriteLeaderBannerProps {
  prompts: Prompt[];
  weeklyVotesData: Record<string, number>;
  allTimeVotesData?: Record<string, number>;
  onVote: (id: string) => void;
  currentUser?: string;
  onOpenAuth?: () => void;
  prevWeekChampion?: ChampionRecord | null;
  weekLabel?: string;
  sundayEndDate?: Date;
}

export default function FavoriteLeaderBanner({
  prompts,
  weeklyVotesData,
  allTimeVotesData = {},
  onVote,
  currentUser,
  onOpenAuth,
  prevWeekChampion,
  weekLabel = '',
  sundayEndDate,
}: FavoriteLeaderBannerProps) {
  const [viewMode, setViewMode] = useState<'weekly' | 'allTime'>('weekly');
  const [countdownStr, setCountdownStr] = useState<string>('');

  // Countdown timer to Sunday 23:59:59
  useEffect(() => {
    if (!sundayEndDate) return;

    const updateTimer = () => {
      const remaining = getWeekTimeRemaining(sundayEndDate);
      setCountdownStr(remaining.formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sundayEndDate]);

  // If there are no doctors in our portal, display nothing
  if (prompts.length === 0) return null;

  const currentVotesSource = viewMode === 'weekly' ? weeklyVotesData : allTimeVotesData;

  // Find the character with the maximum votes in the chosen mode
  let leader: Prompt = prompts[0];
  let maxVotes = currentVotesSource[leader.id.toString()] || 0;

  prompts.forEach((p) => {
    const currentVotes = currentVotesSource[p.id.toString()] || 0;
    if (currentVotes > maxVotes) {
      maxVotes = currentVotes;
      leader = p;
    }
  });

  const handleVoteLeader = () => {
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth();
      } else {
        onVote(leader.id.toString());
      }
      return;
    }
    onVote(leader.id.toString());
  };

  return (
    <motion.div
      id="favorite-leader-banner-container"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      className="w-full rounded-3xl p-6 md:p-8 bg-gradient-to-r from-[#3F2A52] via-[#3A2D34] to-[#260C35] border border-[#75619D]/40 shadow-2xl relative overflow-hidden flex flex-col gap-6"
    >
      {/* Decorative ambient blurred orb */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Title, Week badge, Countdown & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-[#75619D]/30 pb-4">
        {/* Badge Label with gold glint & Week dates */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-400/40 shadow-xs">
            <Award className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-[11px] uppercase font-black tracking-wider text-yellow-300 drop-shadow-sm">
              TOP ĐIỀU DƯỠNG ĐƯỢC YÊU THÍCH
            </span>
          </div>

          {weekLabel && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-[11px] font-semibold text-[#BEAEDB]">
              <Calendar className="w-3.5 h-3.5 text-purple-300" />
              <span>Tuần: {weekLabel}</span>
            </div>
          )}

          {countdownStr && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 text-[11px] font-semibold text-rose-300">
              <Clock className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Tổng kết sau: <strong className="text-white">{countdownStr}</strong></span>
            </div>
          )}
        </div>

        {/* Mode Selector Toggle: Weekly vs All-Time */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-2xl border border-[#75619D]/40">
          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'weekly'
                ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-md'
                : 'text-[#BEAEDB] hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-yellow-300" />
            <span>Tuần Này</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('allTime')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'allTime'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                : 'text-[#BEAEDB] hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-200" />
            <span>Toàn Thời Gian</span>
          </button>
        </div>
      </div>

      {/* Main Leader Showcase & Vote CTA */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        {/* Hero Content detailing leader */}
        <div className="flex items-center gap-5 w-full lg:w-auto">
          {/* Shiny Crown Avatar Holder */}
          <div className="bg-[#3F2A52] p-4.5 rounded-2xl border-2 border-yellow-400/30 flex items-center justify-center text-4xl md:text-5xl shadow-xl relative shrink-0">
            <span>{leader.icon || '🩺'}</span>
            <span className="absolute -top-3 -right-3 text-2xl filter drop-shadow animate-bounce">👑</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                {viewMode === 'weekly' ? '🔥 Dẫn đầu tuần này' : '👑 Kỷ lục mọi thời đại'}
              </span>
            </div>

            {/* Leader Name */}
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white font-comfortaa">
              {leader.title}
            </h2>

            {/* Mini info line card details */}
            <p className="text-xs md:text-sm text-[#BEAEDB]/90 font-medium flex items-center gap-2">
              <span>{leader.genre}</span>
              <span className="opacity-40">|</span>
              <span className="font-bold text-rose-300 text-sm md:text-base">{maxVotes}</span>
              <span>{viewMode === 'weekly' ? 'lượt tim tuần này' : 'lượt tim toàn thời gian'}</span>
            </p>
          </div>
        </div>

        {/* Floating CTA Vote panel */}
        <div className="flex flex-col items-center lg:items-end gap-2.5 w-full lg:w-auto shrink-0 border-t lg:border-t-0 border-[#75619D]/30 pt-4 lg:pt-0">
          <span className="text-xs font-semibold text-[#BEAEDB] italic flex items-center gap-1">
            Bình chọn "Điều Dưỡng Yêu Thích" (+1 tim tuần này) 👇
          </span>

          {/* Tactile vote button with character details */}
          {currentUser ? (
            <motion.button
              type="button"
              onClick={handleVoteLeader}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full text-white bg-gradient-to-r from-[#5a3a78] to-[#3F2A52] hover:from-[#75619D] hover:to-[#5a3a78] border border-[#BEAEDB]/50 shadow-xl active:scale-95 transition-all text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              <ThumbsUp className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>💼 Bấm vào để VOTE cho {leader.title}</span>
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={handleVoteLeader}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full text-amber-200 bg-[#3F2A52]/80 hover:bg-[#75619D]/50 border border-amber-400/40 shadow-xl active:scale-95 transition-all text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>🔒 Đăng nhập để VOTE cho {leader.title}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Hall of Fame / Previous Week Champion Badge (Vinh Danh Quán Quân Tuần Trước) */}
      {prevWeekChampion && prevWeekChampion.votes > 0 && (
        <div className="relative z-10 pt-3 border-t border-[#75619D]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 font-extrabold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Vinh danh Quán Quân tuần trước:</span>
            </span>
            <div className="flex items-center gap-1.5 font-bold text-white bg-black/25 px-3 py-1 rounded-xl border border-white/10">
              <span className="text-base">{prevWeekChampion.icon || '🩺'}</span>
              <span className="text-amber-200">{prevWeekChampion.title}</span>
              <span className="text-[11px] text-[#BEAEDB]">
                ({prevWeekChampion.votes} tim)
              </span>
            </div>
          </div>
          {prevWeekChampion.weekLabel && (
            <span className="text-[11px] text-[#BEAEDB]/70 italic">
              Thời gian: {prevWeekChampion.weekLabel}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
