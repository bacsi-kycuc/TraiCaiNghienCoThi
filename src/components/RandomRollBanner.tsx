import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, Dices } from 'lucide-react';
import { Prompt } from '../types';

interface RandomRollBannerProps {
  prompts?: Prompt[];
  onPromptClick?: (prompt: Prompt) => void;
}

const FALLBACK_PROMPTS: Prompt[] = [
  {
    id: 9001,
    title: 'Điều dưỡng Thảo Vy',
    url: '',
    icon: '🩺',
    description: 'Chuyên khoa truyền dịch tình yêu, cưng chiều vỗ về các ca bệnh cô đơn cấp tính.',
    genre: 'Nghiện Áo Trắng',
    tags: [],
    zone: 'hospital'
  },
  {
    id: 9002,
    title: 'Bác sĩ Hoàng Nam',
    url: '',
    icon: '💉',
    description: 'Chẩn trị chứng lười viết prompt, kê đơn thuốc bổ não siêu cấp giúp thông minh đỉnh cao.',
    genre: 'Nghiện Áo Trắng',
    tags: [],
    zone: 'hospital'
  },
  {
    id: 9003,
    title: 'Khoa Ảo Giác Đại Chu',
    url: '',
    icon: '✨',
    description: 'Chữa trị dứt điểm các ca mộng mị xuyên không làm vương phi, ngự kiếm phi thăng giữa ban ngày.',
    genre: 'Ảo Tưởng Đa Nhân Cách',
    tags: [],
    zone: 'hospital'
  }
];

export default function RandomRollBanner({ 
  prompts = [],
  onPromptClick 
}: RandomRollBannerProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Use passed prompts if available, otherwise fallback to cute default list
  const activePool = prompts.length > 0 ? prompts : FALLBACK_PROMPTS;

  const handleRoll = () => {
    if (activePool.length === 0 || isRolling) return;
    setIsRolling(true);

    let count = 0;
    const interval = setInterval(() => {
      const tempItem = activePool[Math.floor(Math.random() * activePool.length)];
      setSelectedPrompt(tempItem);
      count++;
      if (count > 8) {
        clearInterval(interval);
        const finalItem = activePool[Math.floor(Math.random() * activePool.length)];
        setSelectedPrompt(finalItem);
        setIsRolling(false);
      }
    }, 85);
  };

  return (
    <div 
      id="random-roll-banner-container"
      className="w-full rounded-2xl border-2 border-dashed border-purple-400/30 p-4 sm:p-5 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-pink-500/5 hover:from-violet-500/15 hover:via-purple-500/10 hover:to-pink-500/10 transition-all duration-300 backdrop-blur-md shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left column: Icon, label uppercase, and random text placeholder */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="bg-purple-500/15 p-2.5 rounded-xl border border-purple-400/25 shrink-0 text-purple-300">
            <Stethoscope className="w-5 h-5 animate-pulse" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header / Accent indicator */}
            <span className="text-[10px] font-extrabold tracking-widest text-violet-400 uppercase block mb-1">
              Hệ thống gợi ý ngẫu nhiên
            </span>

            {/* Roller result / Prompt content container */}
            <div className="min-h-[2.5rem] flex items-center">
              <AnimatePresence mode="wait">
                {selectedPrompt === null ? (
                  <motion.p
                    key="initial"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-xs sm:text-sm text-slate-300 font-semibold"
                  >
                    Hôm nay bé muốn bác sĩ nào đến thăm? Gieo xúc xắc đi nhé!
                  </motion.p>
                ) : (
                  <motion.div
                    key={selectedPrompt.id}
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    {/* Interactive Badge */}
                    <button
                      type="button"
                      onClick={() => onPromptClick?.(selectedPrompt)}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-violet-400/20 shadow-sm cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
                      title="Nhấn để tự động điền thanh tìm kiếm"
                    >
                      <span>{selectedPrompt.icon}</span>
                      <span>{selectedPrompt.title}</span>
                    </button>

                    {/* Cute italic description inside quotes */}
                    <span className="text-xs text-slate-400 italic font-medium leading-relaxed">
                      &ldquo;{selectedPrompt.description}&rdquo;
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right column: Action Button (Dices icon styled elegantly) */}
        <div className="shrink-0 flex items-center justify-end">
          <button
            type="button"
            onClick={handleRoll}
            disabled={isRolling}
            title="Gieo xúc xắc ngẫu nhiên"
            className="inline-flex items-center justify-center p-3.5 rounded-2xl text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-purple-800 disabled:to-slate-800 shadow-md hover:shadow-purple-500/10 hover:scale-110 active:scale-90 transition-all duration-250 cursor-pointer select-none border border-violet-500/20"
          >
            <Dices className={`w-5 h-5 ${isRolling ? 'animate-[spin_0.5s_linear_infinite]' : ''}`} />
          </button>
        </div>

      </div>
    </div>
  );
}
