import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'heart';
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  decay: number;
}

const CELEBRATION_COLORS = [
  '#CFC3E4', // Witchy Lavender
  '#8B5CF6', // Vibrant Violet
  '#A78BFA', // Soft Purple
  '#FBBF24', // Delicate Gold
  '#F43F5E', // Adorable Peach/Rose
  '#34D399', // Minty Green
  '#38BDF8', // Sky Breeze
];

export default function ConfettiCelebration() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Setup initial size & handle resizing of the canvas dynamically
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleCelebrate = () => {
      // Refresh canvas dimensions quickly to support size shifts
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      createExplosion();
    };

    window.addEventListener('celebrate-confetti', handleCelebrate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('celebrate-confetti', handleCelebrate);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const createExplosion = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const newParticles: Particle[] = [];

    // Sparkle points: Both sides of the screen (firing inwards and upwards) and some from middle
    const sources = [
      { x: width * 0.1, y: height * 0.8, angleRange: [-65, -25] },   // Left edge
      { x: width * 0.9, y: height * 0.8, angleRange: [-155, -115] }, // Right edge
      { x: width * 0.5, y: height * 0.5, angleRange: [-180, 0] }     // Burst in the middle
    ];

    sources.forEach(({ x, y, angleRange }) => {
      // Different density per source for balanced confetti
      const particleCount = x === width * 0.5 ? 40 : 60;

      for (let i = 0; i < particleCount; i++) {
        // Calculate velocity vector using angle range
        const angleDeg = angleRange[0] + Math.random() * (angleRange[1] - angleRange[0]);
        const angleRad = (angleDeg * Math.PI) / 180;
        const speed = 10 + Math.random() * 15; // Explosive magnitude

        const shapes: Particle['shape'][] = ['circle', 'square', 'triangle', 'heart'];

        newParticles.push({
          x,
          y,
          vx: Math.cos(angleRad) * speed,
          vy: Math.sin(angleRad) * speed,
          color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          size: 6 + Math.random() * 8,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          opacity: 1,
          decay: 0.01 + Math.random() * 0.015,
        });
      }
    });

    // Add extra light ceiling sparkles falling down
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        x: Math.random() * width,
        y: -20,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
        shape: 'circle',
        size: 5 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        opacity: 0.8,
        decay: 0.005 + Math.random() * 0.005,
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];

    // Start rendering frame loop
    if (!animationFrameRef.current) {
      tick();
    }
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + r / 4);
    ctx.quadraticCurveTo(x, y, x + r / 2, y);
    ctx.quadraticCurveTo(x + r, y, x + r, y + r / 2);
    ctx.quadraticCurveTo(x + r, y + r, x, y + r * 1.5);
    ctx.quadraticCurveTo(x - r, y + r, x - r, y + r / 2);
    ctx.quadraticCurveTo(x - r, y, x - r / 2, y);
    ctx.quadraticCurveTo(x, y, x, y + r / 4);
    ctx.closePath();
    ctx.fill();
  };

  const tick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Physics variables
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28; // Gravity pulls down
      p.vx *= 0.98; // Friction in air
      p.vy *= 0.98; // Friction upwards
      p.rotation += p.rotationSpeed;
      p.opacity -= p.decay;

      // Remove invisible particles
      if (p.opacity <= 0 || p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
        particles.splice(i, 1);
        continue;
      }

      // Draw particle
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'square') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'heart') {
        drawHeart(ctx, 0, -p.size / 3, p.size / 2);
      }

      ctx.restore();
    }

    if (particles.length > 0) {
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      animationFrameRef.current = null;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      id="confetti-celebration-canvas"
      className="fixed inset-0 pointer-events-none z-[100000]"
    />
  );
}
