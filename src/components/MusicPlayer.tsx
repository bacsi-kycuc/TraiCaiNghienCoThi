import React, { useState, useEffect } from 'react';
import { Volume2, Minus, Play, Pause, Music } from 'lucide-react';

interface MusicPlayerProps {
  audioElement: HTMLAudioElement | null;
  musicName: string;
  musicUrl?: string;
  musicData?: string;
}

export default function MusicPlayer({ audioElement, musicName, musicUrl, musicData }: MusicPlayerProps) {
  const [minimized, setMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);

  // Parse if it's a YouTube URL and extract video ID
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const ytId = getYouTubeId(musicUrl || '');
  const isYT = !!ytId;

  // Handle standard audio element volume setting
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = volume / 100;
    }
  }, [audioElement, volume]);

  // Synchronize playing events from standard audio element
  useEffect(() => {
    if (!audioElement || isYT) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    // Initial state match
    setIsPlaying(!audioElement.paused);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement, isYT]);

  // Autoplay and Source Change Coordination Handler
  useEffect(() => {
    // If it's a YouTube source, make sure standard audio is paused, and auto-play YT
    if (isYT) {
      if (audioElement) {
        audioElement.pause();
      }
      setIsPlaying(true); // Mount and start YT embed autoplay
    } else {
      // Standard audio direct URL or Base64 uploaded data
      if (audioElement) {
        const targetSrc = musicData || musicUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3';
        
        if (audioElement.src !== targetSrc) {
          audioElement.src = targetSrc;
          audioElement.load();
        }

        // Trigger autoplay on mount/load
        audioElement.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.log("Autoplay deferred or blocked by browser policy. User gesture needed.", err);
          });
      }
    }
  }, [audioElement, musicUrl, musicData, isYT]);

  const handlePlayPause = () => {
    if (isYT) {
      setIsPlaying(!isPlaying);
    } else {
      if (!audioElement) return;
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play().catch(err => {
          console.warn("Audio play blocked by browser. Interaction required first.", err);
        });
      }
    }
  };

  const displayTitle = musicName || 'Lullaby of Co Thi (Mặc định)';

  return (
    <>
      {/* Self-contained keyframe animations for ultra-smooth right-to-left marquee scroll */}
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translate3d(85%, 0, 0); }
          100% { transform: translate3d(-105%, 0, 0); }
        }
        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 24px;
        }
        .marquee-content {
          display: inline-block;
          white-space: nowrap;
          animation: marquee-scroll 10s linear infinite;
        }
        .marquee-content:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Hidden YouTube Autoplay Iframe when playing */}
      {isYT && isPlaying && ytId && (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&loop=1&playlist=${ytId}&controls=0`}
          allow="autoplay; encrypted-media"
          style={{ display: 'none', width: '0px', height: '0px', border: 'none' }}
          id="hidden-youtube-player"
          title="Hidden YouTube background audio player"
        />
      )}

      {minimized ? (
        <div 
          onClick={() => setMinimized(false)}
          className="fixed md:bottom-6 md:right-6 bottom-4 right-4 bg-[var(--card)] dark:bg-slate-800 border-2 border-[var(--zone-border)] rounded-full w-12 h-12 flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 active:scale-90 transition-all z-[8000] group"
          title={`Bấm để mở trình nhạc: ${displayTitle}`}
          id="music-player-minimized"
        >
          <div className="relative flex items-center justify-center">
            <Music className={`w-5 h-5 text-[var(--zone-primary)] dark:text-slate-100 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div 
          className="fixed md:bottom-6 md:right-6 bottom-4 right-4 bg-[var(--card)] dark:bg-slate-800 border-2 border-[var(--zone-border)] rounded-2xl p-3.5 shadow-2xl z-[8000] transition-all duration-300 w-[240px] flex flex-col gap-2 animate-[in_0.15s_ease-out]"
          id="music-player-expanded"
        >
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/50 dark:border-slate-700/50 font-bold text-[var(--zone-primary)] dark:text-slate-100">
            <span className="text-[10px] sm:text-xs flex items-center gap-1.5 uppercase tracking-wider opacity-90">
              <Music className={`w-3.5 h-3.5 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
              {isPlaying ? 'Đang phát' : 'Nhạc Nền'}
            </span>
            <button 
              onClick={() => setMinimized(true)} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded hover:bg-slate-100/10 transition cursor-pointer"
              title="Thu nhỏ"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Smooth custom scrolling marquee for track displaying name */}
          <div className="marquee-container py-1.5 px-2 bg-[var(--zone-primary-lighter)] dark:bg-slate-900/60 rounded-lg text-[var(--zone-primary)] dark:text-slate-200 font-extrabold max-h-[30px] leading-snug">
            <span className="marquee-content text-[10px] sm:text-[11px]">
              {displayTitle}
            </span>
          </div>

          <div className="flex gap-2 justify-center">
            <button 
              onClick={handlePlayPause}
              className="bg-[var(--zone-primary)] hover:bg-[var(--zone-primary-light)] text-white font-bold py-1.5 px-3 rounded-xl text-[10px] sm:text-xs transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 shadow"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Tạm Dừng' : 'Phát Nhạc'}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <Volume2 className="w-3.5 h-3.5 text-[var(--text-muted)] dark:text-slate-400" />
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={volume} 
              onChange={(e) => setVolume(Number(e.target.value))} 
              className="accent-[var(--zone-primary)] flex-1 h-1 bg-[var(--zone-border)]/50 dark:bg-slate-700 rounded-lg cursor-pointer transition"
            />
          </div>
        </div>
      )}
    </>
  );
}
