import React, { useState, useEffect } from 'react';
import { Volume2, Minus, Play, Pause, Music } from 'lucide-react';

interface MusicPlayerProps {
  audioElement: HTMLAudioElement | null;
  musicName: string;
}

export default function MusicPlayer({ audioElement, musicName }: MusicPlayerProps) {
  const [minimized, setMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);

  useEffect(() => {
    if (audioElement) {
      audioElement.volume = volume / 100;
    }
  }, [audioElement, volume]);

  useEffect(() => {
    if (!audioElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement]);

  const handlePlayPause = () => {
    if (!audioElement) return;
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play().catch(err => {
        console.warn("Audio play blocked by browser. Interaction required first.", err);
      });
    }
  };

  return (
    <div className={`fixed bottom-8 right-8 bg-[var(--card)] border-2 border-[var(--zone-border)] rounded-2xl p-4 shadow-xl z-[8000] transition-all duration-300 min-w-[280px] ${minimized ? 'min-w-[140px] p-2.5' : ''}`}>
      <div className="flex justify-between items-center mb-2.5 font-bold text-[var(--zone-primary)]">
        <span className="text-sm flex items-center gap-1.5">
          <Music className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} />
          {isPlaying ? 'Nhạc Đang Phát' : 'Nhạc Chờ'}
        </span>
        <button 
          onClick={() => setMinimized(!minimized)} 
          className="text-[var(--zone-primary)] hover:scale-110 p-1 flex items-center justify-center rounded hover:bg-slate-100/10 transition"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {!minimized && (
        <div className="flex flex-col gap-2.5">
          <div className="text-xs text-center py-2 px-1 bg-[var(--zone-primary-lighter)] rounded-lg text-[var(--zone-primary)] font-semibold truncate hover:whitespace-normal">
            {musicName || 'Chưa tải nhạc nền'}
          </div>

          <div className="flex gap-2 justify-center">
            <button 
              onClick={handlePlayPause}
              className="bg-[var(--zone-primary)] hover:bg-[var(--zone-primary-light)] text-white font-semibold py-1.5 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 flex-1 shadow"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Tạm Dừng' : 'Phát Nhạc'}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Volume2 className="w-4 h-4 text-[var(--text-muted)]" />
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={volume} 
              onChange={(e) => setVolume(Number(e.target.value))} 
              className="accent-[var(--zone-primary)] flex-1 h-1 bg-[var(--zone-border)] rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
