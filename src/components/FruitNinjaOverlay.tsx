import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Sword, AlertTriangle } from 'lucide-react';

export type FruitType = 'peach' | 'avocado' | 'eggplant';

export interface FruitItem {
  id: number;
  type: FruitType;
  x: number; // current x in px
  y: number; // current y in px
  vx: number; // velocity x
  vy: number; // velocity y
  gravity: number; // gravity acceleration
  rotation: number;
  vRot: number; // rotation velocity
  size: number; // visual size in px
  isSliced: boolean;
  sliceAngle: number;
  sliceProgress: number; // 0 to 1 for split animation
  leftHalfOffset: { x: number; y: number; rot: number };
  rightHalfOffset: { x: number; y: number; rot: number };
  floatingText?: string;
  floatingColor?: string;
  hasFadedOut?: boolean;
}

interface FruitNinjaOverlayProps {
  onAddTime: (seconds: number) => void;
  onAvocadoEffect: () => void;
  onFinish: () => void;
}

export default function FruitNinjaOverlay({
  onAddTime,
  onAvocadoEffect,
  onFinish,
}: FruitNinjaOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [slicedCount, setSlicedCount] = useState(0);
  const maxSlices = 3;

  // Sliced feedback alerts
  const [alerts, setAlerts] = useState<
    Array<{ id: number; text: string; color: string; x: number; y: number }>
  >([]);

  // Mouse / Touch blade trail tracking
  const trailRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const isPointerDownRef = useRef<boolean>(false);
  const fruitsRef = useRef<FruitItem[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const slicedCountRef = useRef<number>(0);

  // Initialize 6 fruits with fast, energetic trajectory
  useEffect(() => {
    slicedCountRef.current = 0;
    const container = containerRef.current;
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;

    // 6 fruits total: 2 peaches (+15s), 2 avocados (reroll/50-50), 2 eggplants (-5s)
    const types: FruitType[] = ['peach', 'avocado', 'eggplant', 'peach', 'avocado', 'eggplant'];
    // Shuffle types
    const shuffledTypes = [...types].sort(() => 0.5 - Math.random());

    const initialFruits: FruitItem[] = shuffledTypes.map((type, i) => {
      // Spawn points spread horizontally at the bottom
      const startX = width * (0.15 + (i * 0.7) / (shuffledTypes.length - 1)) + (Math.random() * 40 - 20);
      const startY = height + 40 + i * 25; // staggered launch heights

      // High velocity for fast, exciting throw
      // Aim towards opposite side or center
      const targetX = width * 0.5 + (Math.random() * width * 0.4 - width * 0.2);
      const vx = ((targetX - startX) / (height * 0.6)) * (Math.random() * 3 + 4);
      // Fast upward thrust (speed: -16 to -22)
      const vy = -(Math.random() * 5 + 18);

      return {
        id: i + 1,
        type,
        x: startX,
        y: startY,
        vx,
        vy,
        gravity: 0.42, // realistic punchy gravity
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 14,
        size: 52, // medium, clean icon size
        isSliced: false,
        sliceAngle: 0,
        sliceProgress: 0,
        leftHalfOffset: { x: 0, y: 0, rot: 0 },
        rightHalfOffset: { x: 0, y: 0, rot: 0 },
      };
    });

    fruitsRef.current = initialFruits;

    // Canvas sizing
    const canvas = canvasRef.current;
    if (canvas && container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  }, []);

  // Handle fruit slicing trigger
  const handleSliceFruit = useCallback(
    (fruit: FruitItem, sliceAngle: number) => {
      if (fruit.isSliced) return;
      if (slicedCountRef.current >= maxSlices) return;

      fruit.isSliced = true;
      fruit.sliceAngle = sliceAngle;
      slicedCountRef.current += 1;
      setSlicedCount(slicedCountRef.current);

      // Sliced half initial trajectories
      const perpAngle = sliceAngle + Math.PI / 2;
      const speed = 6;
      fruit.leftHalfOffset = {
        x: Math.cos(perpAngle) * speed,
        y: Math.sin(perpAngle) * speed - 2,
        rot: -15,
      };
      fruit.rightHalfOffset = {
        x: -Math.cos(perpAngle) * speed,
        y: -Math.sin(perpAngle) * speed - 2,
        rot: 15,
      };

      // Trigger effect based on fruit type
      if (fruit.type === 'peach') {
        onAddTime(15);
        setAlerts((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            text: '+15 Giây 🍑',
            color: 'text-pink-300 border-pink-400 bg-pink-950/80 shadow-pink-500/50',
            x: fruit.x,
            y: fruit.y,
          },
        ]);
      } else if (fruit.type === 'avocado') {
        onAvocadoEffect();
        setAlerts((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            text: 'Đổi câu / 50:50 🥑',
            color: 'text-emerald-300 border-emerald-400 bg-emerald-950/80 shadow-emerald-500/50',
            x: fruit.x,
            y: fruit.y,
          },
        ]);
      } else if (fruit.type === 'eggplant') {
        onAddTime(-5);
        setAlerts((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            text: '-5 Giây 🍆',
            color: 'text-rose-300 border-rose-500 bg-rose-950/80 shadow-rose-500/50',
            x: fruit.x,
            y: fruit.y,
          },
        ]);
      }

      // If reached maximum allowed 3 slices, instantly dissipate all remaining un-sliced fruits and conclude minigame
      if (slicedCountRef.current >= maxSlices) {
        fruitsRef.current.forEach((f) => {
          if (!f.isSliced) {
            f.hasFadedOut = true;
          }
        });
        setTimeout(() => {
          onFinish();
        }, 1200);
      }
    },
    [onAddTime, onAvocadoEffect, onFinish]
  );

  // Check collision between blade stroke and fruit
  const checkBladeIntersection = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      if (slicedCountRef.current >= maxSlices) return;

      const hitRadius = 38; // collision radius
      const fruits = fruitsRef.current;

      fruits.forEach((fruit) => {
        if (fruit.isSliced) return;

        // Distance from point to line segment
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;

        let u = 0;
        if (lenSq > 0) {
          u = ((fruit.x - p1.x) * dx + (fruit.y - p1.y) * dy) / lenSq;
          u = Math.max(0, Math.min(1, u));
        }

        const closestX = p1.x + u * dx;
        const closestY = p1.y + u * dy;
        const distSq =
          (fruit.x - closestX) * (fruit.x - closestX) +
          (fruit.y - closestY) * (fruit.y - closestY);

        if (distSq <= hitRadius * hitRadius) {
          const sliceAngle = Math.atan2(dy, dx);
          handleSliceFruit(fruit, sliceAngle);
        }
      });
    },
    [handleSliceFruit]
  );

  // Main game loop (Physics + Blade Trail Rendering)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas ? canvas.getContext('2d') : null;
    let isRunning = true;
    let allDoneTimer: NodeJS.Timeout | null = null;

    const loop = () => {
      if (!isRunning) return;

      const container = containerRef.current;
      const height = container ? container.clientHeight : window.innerHeight;
      const width = container ? container.clientWidth : window.innerWidth;

      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw glowing blade trail
        const now = Date.now();
        // Remove stale trail points older than 180ms
        trailRef.current = trailRef.current.filter((p) => now - p.time < 180);

        if (trailRef.current.length > 1) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 1; i < trailRef.current.length; i++) {
            const p1 = trailRef.current[i - 1];
            const p2 = trailRef.current[i];
            const age = now - p2.time;
            const progress = 1 - age / 180;

            if (progress > 0) {
              // Outer glow
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(244, 114, 182, ${progress * 0.8})`;
              ctx.lineWidth = progress * 10;
              ctx.shadowColor = '#f472b6';
              ctx.shadowBlur = 12;
              ctx.stroke();

              // Inner sharp bright core
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.95})`;
              ctx.lineWidth = progress * 4;
              ctx.shadowBlur = 4;
              ctx.stroke();
            }
          }
          ctx.restore();
        }
      }

      // Update Fruit Physics
      const fruits = fruitsRef.current;
      let activeFruitCount = 0;

      fruits.forEach((fruit) => {
        if (fruit.isSliced) {
          fruit.sliceProgress = Math.min(1, fruit.sliceProgress + 0.05);
          // Halves move apart
          fruit.leftHalfOffset.x += fruit.leftHalfOffset.x * 0.12;
          fruit.leftHalfOffset.y += 0.4; // gravity on pieces
          fruit.leftHalfOffset.rot -= 4;

          fruit.rightHalfOffset.x += fruit.rightHalfOffset.x * 0.12;
          fruit.rightHalfOffset.y += 0.4;
          fruit.rightHalfOffset.rot += 4;
        } else {
          // Normal physics
          fruit.x += fruit.vx;
          fruit.y += fruit.vy;
          fruit.vy += fruit.gravity;
          fruit.rotation += fruit.vRot;
        }

        // Check if still visible within reasonable screen bounds
        if (fruit.y < height + 120 && fruit.x > -100 && fruit.x < width + 100) {
          activeFruitCount += 1;
        } else {
          fruit.hasFadedOut = true;
        }
      });

      // Force React re-render for DOM fruit icons
      // If all fruits have left the screen or 3 sliced and rest left
      if (activeFruitCount === 0 && !allDoneTimer) {
        allDoneTimer = setTimeout(() => {
          onFinish();
        }, 800);
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (allDoneTimer) clearTimeout(allDoneTimer);
    };
  }, [onFinish]);

  // Pointer event handlers for PC Mouse and Mobile Touch Swipe
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDownRef.current = true;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    trailRef.current = [{ x, y, time: Date.now() }];
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const now = Date.now();
    const trail = trailRef.current;

    // Check collision with fruits if swiping
    if (trail.length > 0) {
      const lastPoint = trail[trail.length - 1];
      checkBladeIntersection(lastPoint, { x, y });
    }

    trail.push({ x, y, time: now });
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const fruitEmojiMap: Record<FruitType, string> = {
    peach: '🍑',
    avocado: '🥑',
    eggplant: '🍆',
  };

  return (
    <div
      ref={containerRef}
      id="fruit-ninja-minigame-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute inset-0 z-50 overflow-hidden select-none cursor-crosshair touch-none"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(35, 10, 48, 0.75) 0%, rgba(10, 4, 18, 0.88) 100%)',
      }}
    >
      {/* Canvas for rendering glowing neon slash blade */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-20"
      />

      {/* Top Floating Alert Banner */}
      <div className="absolute top-4 left-0 right-0 z-30 flex flex-col items-center pointer-events-none px-4 space-y-1.5 animate-[in_0.2s_ease-out]">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-950/80 border border-pink-400/50 shadow-lg shadow-pink-500/20 backdrop-blur-md">
          <Sword className="w-4 h-4 text-pink-300 animate-pulse" />
          <span className="text-xs sm:text-sm font-black font-comfortaa text-white tracking-wide flex items-center gap-1.5">
            ⚔️ CHÉM TRÁI CÂY CỨU NGUY!
          </span>
          <span className="h-3.5 w-[1px] bg-pink-400/40" />
          <span className="text-xs font-mono font-extrabold text-amber-300">
            {slicedCount} / {maxSlices} Trái
          </span>
        </div>

        {/* Instructions pill */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-pink-200/90 bg-black/60 px-3 py-1 rounded-xl border border-purple-500/30 backdrop-blur-sm">
          <span>🍑 +15s</span>
          <span>•</span>
          <span>🥑 Đổi câu / 50-50</span>
          <span>•</span>
          <span className="text-rose-300">🍆 Né Cà Tím (-5s)</span>
        </div>

        {slicedCount >= maxSlices && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-4 py-1 rounded-xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-bold font-comfortaa shadow-lg animate-pulse mt-1"
          >
            ✨ Đã chém đủ 3 trái! Đang bảo lưu kết quả...
          </motion.div>
        )}
      </div>

      {/* Render Floating Sliced Feedback Texts */}
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -60, scale: 1.25 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${alert.x}px`,
              top: `${alert.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`z-40 pointer-events-none px-3.5 py-1.5 rounded-2xl border text-xs sm:text-sm font-black font-comfortaa shadow-xl backdrop-blur-md whitespace-nowrap ${alert.color}`}
          >
            {alert.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Render Dynamic Fruits */}
      {fruitsRef.current.map((fruit) => {
        if (fruit.hasFadedOut) return null;

        const emoji = fruitEmojiMap[fruit.type];

        if (fruit.isSliced) {
          // Render two split halves flying apart
          return (
            <React.Fragment key={fruit.id}>
              {/* Left Half */}
              <div
                style={{
                  position: 'absolute',
                  left: `${fruit.x + fruit.leftHalfOffset.x}px`,
                  top: `${fruit.y + fruit.leftHalfOffset.y}px`,
                  transform: `translate(-50%, -50%) rotate(${fruit.rotation + fruit.leftHalfOffset.rot}deg) scale(0.95)`,
                  opacity: Math.max(0, 1 - fruit.sliceProgress * 1.2),
                  pointerEvents: 'none',
                  fontSize: `${fruit.size}px`,
                  clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
                  filter: 'drop-shadow(0 0 10px rgba(244, 114, 182, 0.6))',
                }}
                className="select-none z-10 transition-transform"
              >
                {emoji}
              </div>

              {/* Right Half */}
              <div
                style={{
                  position: 'absolute',
                  left: `${fruit.x + fruit.rightHalfOffset.x}px`,
                  top: `${fruit.y + fruit.rightHalfOffset.y}px`,
                  transform: `translate(-50%, -50%) rotate(${fruit.rotation + fruit.rightHalfOffset.rot}deg) scale(0.95)`,
                  opacity: Math.max(0, 1 - fruit.sliceProgress * 1.2),
                  pointerEvents: 'none',
                  fontSize: `${fruit.size}px`,
                  clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
                  filter: 'drop-shadow(0 0 10px rgba(244, 114, 182, 0.6))',
                }}
                className="select-none z-10 transition-transform"
              >
                {emoji}
              </div>
            </React.Fragment>
          );
        }

        // Intact Fruit
        return (
          <div
            key={fruit.id}
            style={{
              position: 'absolute',
              left: `${fruit.x}px`,
              top: `${fruit.y}px`,
              transform: `translate(-50%, -50%) rotate(${fruit.rotation}deg)`,
              pointerEvents: 'none',
              fontSize: `${fruit.size}px`,
              filter:
                fruit.type === 'peach'
                  ? 'drop-shadow(0 4px 14px rgba(244, 114, 182, 0.7))'
                  : fruit.type === 'avocado'
                  ? 'drop-shadow(0 4px 14px rgba(52, 211, 153, 0.7))'
                  : 'drop-shadow(0 4px 14px rgba(244, 63, 94, 0.7))',
            }}
            className="select-none z-10 animate-pulse"
          >
            {emoji}
          </div>
        );
      })}

      {/* Bottom Dismiss / Skip Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onFinish();
        }}
        className="absolute bottom-4 right-4 z-40 px-3.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-purple-500/30 text-purple-200 text-[11px] font-bold transition cursor-pointer backdrop-blur-sm"
      >
        Bỏ qua minigame ✕
      </button>
    </div>
  );
}
