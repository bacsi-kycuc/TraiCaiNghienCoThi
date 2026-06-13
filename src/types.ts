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
  createdAt?: string;
  updatedAt?: string;
  viewCount?: number;
  passwordFailLimit?: number;
  passwordFailGifUrl?: string;
  passwordFailSoundUrl?: string;
  passwordFailSecondaryHint?: string;
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
  // Customizable Password Failure Troll Attack
  passwordFailLimit?: number;
  passwordFailGifUrl?: string;
  passwordFailSoundUrl?: string;
}
