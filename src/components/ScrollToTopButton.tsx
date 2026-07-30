import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={scrollToTop}
          id="scroll-to-top-btn"
          className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-[8500] w-12 h-12 md:w-13 md:h-13 p-0 bg-gradient-to-tr from-purple-900 via-indigo-900 to-slate-900 hover:from-purple-800 hover:to-indigo-700 text-purple-100 rounded-full shadow-[0_10px_28px_rgba(0,0,0,0.7)] hover:shadow-[0_12px_32px_rgba(168,85,247,0.6)] border-2 border-purple-400/70 hover:border-purple-300 transition-all duration-300 transform hover:-translate-y-1.5 active:scale-90 flex items-center justify-center cursor-pointer backdrop-blur-md group"
          title="Quay lại đầu trang"
          aria-label="Quay lại đầu trang"
        >
          <ArrowUp className="w-6 h-6 text-purple-200 stroke-[2.5] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110 drop-shadow-[0_2px_8px_rgba(168,85,247,0.9)]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
