import React from 'react';
import { motion } from 'motion/react';
import { Key, User, LogOut, MessageSquare, ThumbsUp } from 'lucide-react';
import { StyledUsername, UserAvatar } from './UserProfileStyle';

interface WelcomeScreenProps {
  onEnterApp: (zone: 'hospital' | 'cai-nghien') => void;
  isAdmin: boolean;
  currentUser: string | null;
  userDisplayName: string;
  userAvatar: string;
  userNameColor?: string;
  userNameStyle?: string;
  userNameFont?: string;
  userAvatarType?: string;
  userAvatarImage?: string;
  onLoginClick: () => void;
  onLogout: () => void;
  discordLink: string;
  facebookLink: string;
  welcomeBgImage?: string;
}

export default function WelcomeScreen({
  onEnterApp,
  isAdmin,
  currentUser,
  userDisplayName,
  userAvatar,
  userNameColor,
  userNameStyle,
  userNameFont,
  userAvatarType,
  userAvatarImage,
  onLoginClick,
  onLogout,
  discordLink,
  facebookLink,
  welcomeBgImage
}: WelcomeScreenProps) {

  // Generate dynamic background style
  const bgStyle: React.CSSProperties = {
    backgroundImage: welcomeBgImage
      ? `linear-gradient(rgba(10, 5, 22, 0.45), rgba(10, 5, 22, 0.65)), url("${welcomeBgImage}")`
      : 'var(--welcome-bg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 w-full h-full z-[9999] flex flex-col items-center justify-center p-5 eerie-glow bg-cover bg-center bg-no-repeat overflow-hidden select-none"
      style={bgStyle}
    >
      
      {/* Top right floating admin/user controls */}
      <div className="absolute top-5 right-5 flex gap-2.5 z-20 items-center">
        {!currentUser ? (
          <button 
            onClick={onLoginClick}
            className="bg-witchy-dust/80 dark:bg-witchy-midnight/85 text-witchy-smoky dark:text-witchy-haze font-extrabold py-2 px-4 rounded-2xl border border-witchy-velvet/30 dark:border-witchy-smoky flex items-center gap-1.5 text-xs transition duration-300 cursor-pointer backdrop-blur-md hover:scale-105 hover:border-witchy-velvet dark:hover:border-witchy-velvet shadow-lg"
            id="welcome-user-login-btn"
          >
            <User className="w-3.5 h-3.5 text-purple-400" /> Đăng nhập / Đăng ký
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="bg-witchy-dust/80 dark:bg-witchy-midnight/85 text-witchy-smoky dark:text-witchy-dust font-bold py-1.5 px-3 rounded-2xl border border-witchy-velvet/30 dark:border-witchy-smoky text-xs backdrop-blur-md flex items-center gap-2 shadow-md">
              <UserAvatar avatar={userAvatar} avatarType={userAvatarType} avatarImage={userAvatarImage} className="w-5 h-5 rounded-full object-cover" />
              <StyledUsername name={userDisplayName} color={userNameColor} effect={userNameStyle} font={userNameFont} className="font-extrabold" />
            </span>
            <button 
              onClick={onLogout}
              className="bg-rose-950/90 hover:bg-rose-900 border border-rose-900/40 text-rose-100 font-bold py-2 px-3 rounded-2xl flex items-center justify-center transition cursor-pointer hover:scale-105 shadow-md"
              title="Đăng xuất"
              id="welcome-user-logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main content container. Styled with modern, classic serif and z-10 index to stay fully above the background glows */}
      <div className="relative z-10 space-y-3.5 text-center max-w-[620px] select-none scale-100 animate-[in_0.35s_ease-out] w-full px-4">
        
        {/* Title Block */}
        <div className="flex flex-col items-center justify-center gap-3 mb-2">
          <h1 
            style={{ 
              textShadow: '0 0 20px rgba(207, 195, 228, 0.45), 0 2px 4px rgba(0, 0, 0, 0.8)'
            }}
            className="font-cabinet text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[0.04em] text-witchy-dust whitespace-normal sm:whitespace-nowrap leading-tight text-center px-4 animate-[fade-in_0.8s_ease-out]"
            id="welcome-site-title"
          >
            Viện Tâm Thần Cố Thị
          </h1>
          
          <div className="w-28 h-[1.5px] bg-gradient-to-r from-transparent via-witchy-haze to-transparent opacity-50" />
        </div>
        
        <p 
          style={{
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.85)'
          }}
          className="font-broadwa text-witchy-haze text-2xl md:text-3xl pb-5 tracking-wide"
        >
          Chào mừng các bệnh nhân đến với Trại Cai Nghiện
        </p>

        {/* Enter triggers */}
        <div className="flex flex-wrap gap-5 justify-center pt-2 pb-5 w-full max-w-[500px] mx-auto">
          <div 
            onClick={() => onEnterApp('cai-nghien')}
            className="relative overflow-hidden rounded-[28px] px-8 py-5 w-[260px] sm:w-[300px] text-center cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 hover:scale-105 shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_45px_rgba(168,85,247,0.5)] border-2 border-purple-400/70 hover:border-purple-300 bg-black/40 hover:bg-black/60 backdrop-blur-md flex flex-col items-center justify-center group"
            id="welcome-enter-btn"
          >
            {/* Content inside */}
            <div className="relative z-10 flex flex-col items-center justify-center py-1">
              <h3 
                className="font-broadwa text-white text-2xl sm:text-3xl tracking-wide transition-all duration-300 group-hover:scale-105"
                style={{
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.95), 0 0 20px rgba(168, 85, 247, 0.8), 0 0 6px rgba(0, 0, 0, 1)'
                }}
              >
                Vào Trại
              </h3>
            </div>
          </div>
        </div>

        {/* Social interactions - customized to elegantly adhere to the core color combination */}
        <div className="flex justify-center gap-3.5 w-full max-w-[480px] mx-auto py-2">
          <a 
            href={discordLink || '#'} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex-1 bg-witchy-midnight/50 hover:bg-[#5865F2] hover:text-white dark:hover:bg-[#5865F2] dark:hover:text-white text-[#5865F2] dark:text-witchy-haze border border-witchy-smoky/50 text-xs font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#5865F2]/15 cursor-pointer backdrop-blur-sm shadow-sm animate-[fade-in_1s_ease-out]"
            id="welcome-discord-link"
          >
            <MessageSquare className="w-4 h-4" /> Discord
          </a>
          <a 
            href={facebookLink || '#'} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex-1 bg-witchy-midnight/50 hover:bg-[#1877F2] hover:text-white dark:hover:bg-[#1877F2] dark:hover:text-white text-[#1877F2] dark:text-witchy-haze border border-witchy-smoky/50 text-xs font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#1877F2]/15 cursor-pointer backdrop-blur-sm shadow-sm animate-[fade-in_1s_ease-out]"
            id="welcome-facebook-link"
          >
            <ThumbsUp className="w-4 h-4" /> Facebook
          </a>
        </div>

      </div>

      <div className="absolute bottom-5 left-5 text-[10px] md:text-xs text-witchy-haze/60 mr-5 font-comfortaa tracking-wide pointer-events-none opacity-80 z-20">
        © 2026 Rehab Zone. All rights reserved.
      </div>
    </motion.div>
  );
}
