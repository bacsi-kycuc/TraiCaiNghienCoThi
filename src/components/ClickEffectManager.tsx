import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ClickItem {
  id: number;
  x: number;
  y: number;
  type: 'symbol' | 'syringe' | 'heart' | 'bandage';
  content?: string;
  rotation: number;
  scale: number;
  color?: string;
}

// Custom aesthetic text symbols specified by the user + cute theme icons
const SYMBOL_POOL = [
  "ᨳଓ",
  "˚˖𓍢ִ໋❀",
  "❤︎",
  "🪼",
  "🩹",
  "💉",
  "🫀",
  "🎀",
  "✨",
  "⭐",
  "🌸",
  "🩺",
  "💒",
  "🧸",
  "𓍢ִ໋🌷͙֒",
  "˚˖𓍢ִ໋✧",
];

const COLOR_POOL = [
  "#F472B6", // Pink 400
  "#EC4899", // Pink 500
  "#C084FC", // Purple 400
  "#A855F7", // Purple 500
  "#E879F9", // Fuchsia 400
  "#F43F5E", // Rose 500
  "#38BDF8", // Sky 400
];

// SVG Sticker 1: Pink Winged Syringe with Bow & Ribbon
const SyringeStickerSVG = () => (
  <svg viewBox="0 0 100 100" className="w-9 h-9 filter drop-shadow-[0_4px_10px_rgba(236,72,153,0.6)]">
    {/* Outline white border glow */}
    <g transform="translate(50,50) rotate(-45) translate(-50,-50)">
      {/* Wings */}
      <path d="M 28 45 C 10 30, 15 10, 35 25 C 20 15, 30 5, 42 22 Z" fill="#FFD6E8" stroke="#F472B6" strokeWidth="2.5" />
      <path d="M 72 45 C 90 30, 85 10, 65 25 C 80 15, 70 5, 58 22 Z" fill="#FFD6E8" stroke="#F472B6" strokeWidth="2.5" />
      
      {/* Syringe Body */}
      <rect x="42" y="15" width="16" height="50" rx="4" fill="#FFE4EF" stroke="#F43F5E" strokeWidth="3" />
      {/* Liquid inside */}
      <rect x="44" y="32" width="12" height="30" rx="2" fill="#F472B6" />
      {/* Measurements */}
      <line x1="53" y1="22" x2="56" y2="22" stroke="#F43F5E" strokeWidth="2" />
      <line x1="51" y1="27" x2="56" y2="27" stroke="#F43F5E" strokeWidth="2" />
      <line x1="53" y1="32" x2="56" y2="32" stroke="#F43F5E" strokeWidth="2" />
      
      {/* Plunger */}
      <rect x="46" y="5" width="8" height="12" fill="#FFB6D9" stroke="#F43F5E" strokeWidth="2" />
      <line x1="40" y1="5" x2="60" y2="5" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" />
      
      {/* Needle tip */}
      <polygon points="46,65 54,65 50,75" fill="#FFB6D9" stroke="#F43F5E" strokeWidth="2" />
      <line x1="50" y1="75" x2="50" y2="92" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Cute Bow tie in center */}
      <path d="M 50 45 C 38 35, 35 55, 48 47 Z" fill="#FB7185" stroke="#FFF" strokeWidth="1.5" />
      <path d="M 50 45 C 62 35, 65 55, 52 47 Z" fill="#FB7185" stroke="#FFF" strokeWidth="1.5" />
      <circle cx="50" cy="46" r="4" fill="#FFF" />
      <path d="M 47 48 L 42 60" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 53 48 L 58 60" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

// SVG Sticker 2: Cute Pastel Anatomical Heart with Bow
const HeartStickerSVG = () => (
  <svg viewBox="0 0 100 100" className="w-9 h-9 filter drop-shadow-[0_4px_10px_rgba(244,114,182,0.6)]">
    {/* Heart Base */}
    <path 
      d="M 50 85 C 20 65, 12 45, 25 30 C 35 18, 48 25, 50 32 C 52 25, 65 18, 75 30 C 88 45, 80 65, 50 85 Z" 
      fill="#FFB6C1" 
      stroke="#FFF" 
      strokeWidth="3.5" 
    />
    {/* Aorta & Vessels */}
    <path d="M 42 28 L 40 14 C 40 10, 48 10, 48 14 L 47 26" fill="#FFAAC1" stroke="#FFF" strokeWidth="2" />
    <path d="M 52 26 L 55 12 C 55 8, 63 8, 62 12 L 58 26" fill="#FFAAC1" stroke="#FFF" strokeWidth="2" />
    
    {/* Veins pastel blue */}
    <path d="M 48 38 Q 42 50 35 58" fill="none" stroke="#7DD3FC" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M 52 42 Q 60 52 65 62" fill="none" stroke="#7DD3FC" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Bow tied around top */}
    <path d="M 50 32 Q 38 22 42 34 Z" fill="#FFF" stroke="#F472B6" strokeWidth="1.5" />
    <path d="M 50 32 Q 62 22 58 34 Z" fill="#FFF" stroke="#F472B6" strokeWidth="1.5" />
    <circle cx="50" cy="32" r="3.5" fill="#F472B6" />
    {/* Strings hanging */}
    <path d="M 48 34 Q 40 45 36 50" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
    <path d="M 52 34 Q 60 45 64 50" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />

    {/* Tiny sparkles */}
    <path d="M 25 22 L 27 25 L 30 25 L 28 27 L 29 30 L 25 28 L 21 30 L 22 27 L 20 25 L 23 25 Z" fill="#FDE047" />
  </svg>
);

// SVG Sticker 3: Pink Plush Bandage with Broken Heart
const BandageStickerSVG = () => (
  <svg viewBox="0 0 120 60" className="w-10 h-6 filter drop-shadow-[0_4px_10px_rgba(244,63,94,0.5)]">
    {/* Outer Bandage Rounded */}
    <rect x="5" y="10" width="110" height="40" rx="20" fill="#FFE4EF" stroke="#FFF" strokeWidth="3.5" />
    {/* Inner pad */}
    <rect x="40" y="15" width="40" height="30" rx="6" fill="#FFB6D9" stroke="#F472B6" strokeWidth="1.5" />
    
    {/* Broken heart icon in center */}
    <path 
      d="M 60 38 C 50 30, 48 22, 54 18 C 58 15, 60 18, 60 21 L 58 25 L 62 28 L 59 32 L 60 38 C 60 18, 62 15, 66 18 C 72 22, 70 30, 60 38 Z" 
      fill="#E11D48" 
    />
    
    {/* Cute polka dots on bandage */}
    <circle cx="20" cy="22" r="2" fill="#F472B6" />
    <circle cx="28" cy="35" r="2" fill="#F472B6" />
    <circle cx="18" cy="40" r="2" fill="#F472B6" />
    <circle cx="95" cy="22" r="2" fill="#F472B6" />
    <circle cx="102" cy="35" r="2" fill="#F472B6" />
    <circle cx="92" cy="40" r="2" fill="#F472B6" />
  </svg>
);

export default function ClickEffectManager() {
  const [items, setItems] = useState<ClickItem[]>([]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      let x = 0;
      let y = 0;

      if ('touches' in e && e.touches.length > 0) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else if ('clientX' in e) {
        x = e.clientX;
        y = e.clientY;
      } else {
        return;
      }

      // Randomly choose sticker type
      // Types: 'symbol' (text kaomoji), 'syringe', 'heart', 'bandage'
      const randVal = Math.random();
      let type: 'symbol' | 'syringe' | 'heart' | 'bandage' = 'symbol';
      let content = '';

      if (randVal < 0.45) {
        type = 'symbol';
        content = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
      } else if (randVal < 0.65) {
        type = 'syringe';
      } else if (randVal < 0.82) {
        type = 'heart';
      } else {
        type = 'bandage';
      }

      const newItem: ClickItem = {
        id: Date.now() + Math.random(),
        x,
        y,
        type,
        content,
        rotation: (Math.random() - 0.5) * 40, // -20deg to +20deg
        scale: 0.85 + Math.random() * 0.4,   // 0.85x to 1.25x
        color: COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)],
      };

      setItems((prev) => [...prev.slice(-15), newItem]); // keep max 15 items in buffer
    };

    window.addEventListener('pointerdown', handleGlobalClick, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleGlobalClick);
    };
  }, []);

  const handleAnimationComplete = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              opacity: 1,
              scale: 0.3,
              x: item.x - 20,
              y: item.y - 20,
              rotate: item.rotation,
            }}
            animate={{
              opacity: [1, 1, 0],
              scale: [0.3, item.scale, item.scale * 0.9],
              y: item.y - 65 - Math.random() * 20,
              x: item.x - 20 + (Math.random() - 0.5) * 30,
              rotate: item.rotation + (Math.random() - 0.5) * 15,
            }}
            transition={{
              duration: 0.8,
              ease: [0.215, 0.61, 0.355, 1],
            }}
            onAnimationComplete={() => handleAnimationComplete(item.id)}
            className="absolute flex items-center justify-center select-none pointer-events-none"
          >
            {item.type === 'symbol' && (
              <span
                style={{
                  color: item.color,
                  textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 12px rgba(236,72,153,0.6)',
                }}
                className="font-black text-xl sm:text-2xl whitespace-nowrap tracking-wide filter drop-shadow-md"
              >
                {item.content}
              </span>
            )}

            {item.type === 'syringe' && <SyringeStickerSVG />}
            {item.type === 'heart' && <HeartStickerSVG />}
            {item.type === 'bandage' && <BandageStickerSVG />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
