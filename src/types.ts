export interface Genre {
  name: string;
  icon: string;
  description?: string;
}

export interface Prompt {
  id: number;
  title: string;
  url: string;
  icon: string;
  description: string;
  genre: string;
  tags: string[];
  zone: 'hospital' | 'cai-nghien';
  password?: string;
  passwordHint?: string;
  plot?: string;
  createdAt?: string;
  updatedAt?: string;
  viewCount?: number;
  
  // Troll mechanism
  errorCount?: number;
  lastOpenedDate?: string;
  maxFailureLimit?: number;
  hintText?: string;
  mediaUrl?: string;
  trollMode?: 'hint' | 'media';

  // Giveaway mechanism
  isGiveaway?: boolean;
  maxWinners?: number;
  drawDuration?: number; // In minutes
  linkVisibleDuration?: number; // In minutes
  giveawayStartTime?: string;
  participants?: string[];
  winners?: string[];
  giveawayStatus?: 'active' | 'drawn' | 'ended';
  drawnTime?: string;
}

export interface RegRecord {
  id: number;
  name: string;
  age: string;
  genre: string;
  note: string;
  symptoms: string[];
  zone: 'hospital' | 'cai-nghien';
  date: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string]; // 4 options A, B, C, D
  correctAnswer: number; // 0, 1, 2, 3
  explanation?: string;
  category?: string;
}

export interface Settings {
  discordLink: string;
  facebookLink: string;
  welcomeBgImage: string;
  welcomeBgFileName: string;
  hospitalBgImage: string;
  hospitalBgFileName: string;
  cainhienBgImage: string;
  cainhienBgFileName: string;
  musicName: string;
  musicData: string;
  musicUrl: string;
  
  // Quiz Mode Settings
  quizModeEnabled?: boolean;
  quizTimeLimitMinutes?: number; // In minutes, default 15
  quizPassingScoreTier1?: number; // default 7.0
  quizPassingScoreTier2?: number; // default 9.0

  // Site Lockdown / Close Door Setting
  isSiteClosed?: boolean;
}
