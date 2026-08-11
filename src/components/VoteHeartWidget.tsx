import React from 'react';
import { motion } from 'motion/react';
import { Heart, Lock } from 'lucide-react';

interface VoteHeartWidgetProps {
  characterId: string;
  votes: number;
  onVote: (id: string) => void;
  isCompact?: boolean;
  isLoggedIn?: boolean;
  onOpenAuth?: () => void;
}

export default function VoteHeartWidget({
  characterId,
  votes,
  onVote,
  isCompact = false,
  isLoggedIn = false,
  onOpenAuth,
}: VoteHeartWidgetProps) {
  
  const handleVoteClick = (e: React.MouseEvent) => {
    // Prevent trigger parent card click / transition events
    e.stopPropagation();
    e.preventDefault();
    if (!isLoggedIn && onOpenAuth) {
      onOpenAuth();
      return;
    }
    onVote(characterId);
  };

  if (isCompact) {
    return (
      <div 
        id={`vote-heart-widget-${characterId}`}
        className="bg-[#3F2A52]/90 hover:bg-[#3F2A52] border border-[#75619D]/40 rounded-xl px-2.5 py-1.5 flex items-center justify-center gap-1.5 select-none shadow-md transition duration-200"
      >
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#BEAEDB] whitespace-nowrap">
          {votes} PHIẾU
        </span>
        {isLoggedIn ? (
          <motion.button
            type="button"
            onClick={handleVoteClick}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            className="text-rose-400 focus:outline-none cursor-pointer outline-none group flex items-center justify-center"
            title="Thả tim bầu chọn"
          >
            <Heart 
              className="w-3.5 h-3.5 transition-all duration-300 stroke-[#75619D] group-hover:stroke-rose-400 fill-transparent group-hover:fill-rose-400 filter drop-shadow-sm"
            />
          </motion.button>
        ) : (
          <motion.button
            type="button"
            onClick={handleVoteClick}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className="text-amber-400/90 hover:text-amber-300 focus:outline-none cursor-pointer outline-none flex items-center justify-center"
            title="Đăng nhập để bình chọn"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div 
      id={`vote-heart-widget-${characterId}`}
      className="bg-[#3F2A52]/95 border border-[#75619D]/40 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1.5 min-w-[76px] select-none shadow-lg text-center"
    >
      {/* 1. Vote Count Badge Label */}
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#BEAEDB] drop-shadow-sm whitespace-nowrap">
        {votes} PHIẾU
      </span>

      {/* 2. Interactive Heart or Lock */}
      {isLoggedIn ? (
        <motion.button
          type="button"
          onClick={handleVoteClick}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          className="text-rose-400 focus:outline-none cursor-pointer outline-none group"
          title="Thả tim bầu chọn"
        >
          <Heart 
            className="w-6.5 h-6.5 transition-all duration-300 stroke-[#75619D] group-hover:stroke-rose-400 fill-transparent group-hover:fill-rose-400 filter drop-shadow-md"
          />
        </motion.button>
      ) : (
        <motion.button
          type="button"
          onClick={handleVoteClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-1 text-amber-400 focus:outline-none cursor-pointer outline-none flex flex-col items-center gap-0.5"
          title="Cần đăng nhập để bỏ phiếu"
        >
          <Lock className="w-5 h-5 text-amber-400" />
          <span className="text-[8px] font-bold uppercase tracking-tight text-amber-300/80">Khóa</span>
        </motion.button>
      )}
    </div>
  );
}

