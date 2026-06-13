import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';

interface VoteHeartWidgetProps {
  characterId: string;
  votes: number;
  onVote: (id: string) => void;
}

export default function VoteHeartWidget({
  characterId,
  votes,
  onVote
}: VoteHeartWidgetProps) {
  
  const handleVoteClick = (e: React.MouseEvent) => {
    // Prevent trigger parent card click / transition events
    e.stopPropagation();
    e.preventDefault();
    onVote(characterId);
  };

  return (
    <div 
      id={`vote-heart-widget-${characterId}`}
      className="bg-[#190924]/90 border border-[#260C35] rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1.5 min-w-[76px] select-none shadow-lg text-center"
    >
      {/* 1. Vote Count Badge Label */}
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f472b6] drop-shadow-sm whitespace-nowrap">
        {votes} PHIẾU
      </span>

      {/* 2. Interactive Heart with Tactile Spring React Physics */}
      <motion.button
        type="button"
        onClick={handleVoteClick}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        className="text-rose-400 focus:outline-none cursor-pointer outline-none group"
        title="Thả tim bầu chọn"
      >
        <Heart 
          className="w-6.5 h-6.5 transition-all duration-300 stroke-[#a55166] group-hover:stroke-rose-400 fill-transparent group-hover:fill-rose-400 filter drop-shadow-md"
        />
      </motion.button>
    </div>
  );
}
