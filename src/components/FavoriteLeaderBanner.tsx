import { motion } from 'motion/react';
import { Award, ThumbsUp } from 'lucide-react';
import { Prompt } from '../types';

interface FavoriteLeaderBannerProps {
  prompts: Prompt[];
  votesData: Record<string, number>;
  onVote: (id: string) => void;
}

export default function FavoriteLeaderBanner({
  prompts,
  votesData,
  onVote
}: FavoriteLeaderBannerProps) {
  // If there are no doctors in our portal, display an elegant static card
  if (prompts.length === 0) return null;

  // Find the character with the maximum votes
  let leader: Prompt = prompts[0];
  let maxVotes = votesData[leader.id.toString()] || 0;

  prompts.forEach((p) => {
    const currentVotes = votesData[p.id.toString()] || 0;
    if (currentVotes > maxVotes) {
      maxVotes = currentVotes;
      leader = p;
    }
  });

  const handleVoteLeader = () => {
    onVote(leader.id.toString());
  };

  return (
    <motion.div
      id="favorite-leader-banner-container"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      className="w-full rounded-3xl p-6 md:p-8 bg-gradient-to-r from-[#260C35] via-[#190924] to-[#0E0314] border border-[#3e1444] shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6"
    >
      {/* Decorative ambient blurred orb */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Content detailing leader */}
      <div className="flex items-center gap-5 relative z-10 w-full lg:w-auto">
        {/* Shiny Crown Avatar Holder */}
        <div className="bg-[#260C35] p-4.5 rounded-2xl border-2 border-yellow-400/30 flex items-center justify-center text-4xl shadow-lg relative shrink-0">
          <span>{leader.icon || '🩺'}</span>
          <span className="absolute -top-3 -right-3 text-lg filter drop-shadow animate-bounce">👑</span>
        </div>

        <div className="space-y-1">
          {/* Badge Label with gold glint */}
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#ecc94b] drop-shadow-sm">
              🩺 TOP ĐIỀU DƯỠNG ĐƯỢC YÊU THÍCH NHẤT
            </span>
          </div>

          {/* Golden Leader Name */}
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-comfortaa">
            {leader.title}
          </h2>

          {/* Mini info line card details */}
          <p className="text-xs md:text-sm text-rose-200/85 font-medium">
            {leader.genre} <span className="mx-2 opacity-50">|</span> <span className="font-bold text-rose-300">{maxVotes}</span> lượt bầu chọn yêu thích
          </p>
        </div>
      </div>

      {/* Floating CTA Vote panel */}
      <div className="flex flex-col items-center lg:items-end gap-2.5 relative z-10 w-full lg:w-auto shrink-0 border-t lg:border-t-0 border-[#3e1444]/60 pt-4 lg:pt-0">
        <span className="text-xs font-semibold text-rose-300 italic flex items-center gap-1">
          Bình chọn "Điều Dưỡng Yêu Thích" tại đây 👇
        </span>

        {/* Tactile vote button with character details */}
        <motion.button
          type="button"
          onClick={handleVoteLeader}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2.5 px-6 py-3 rounded-full text-white bg-[#260C35] hover:bg-[#3e1444]/60 border border-[#a55166] shadow-xl hover:shadow-rose-950/20 active:scale-95 transition-all text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          <ThumbsUp className="w-4 h-4 text-rose-400" />
          <span>💼 Bấm vào để VOTE cho {leader.title}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
