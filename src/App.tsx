import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ToggleLeft,
  ToggleRight,
  Sun,
  Moon,
  LogOut,
  Settings as SettingsIcon,
  Plus,
  User,
  LogIn,
  Key,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Bell,
  Award,
  Megaphone,
} from "lucide-react";

// Firebase Firestore imports
import { db, handleFirestoreError, OperationType } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocFromServer,
  increment,
  writeBatch,
} from "firebase/firestore";

// Subcomponents helper importations
import WelcomeScreen from "./components/WelcomeScreen";
import AIExamModal from "./components/AIExamModal";
import PromptCard from "./components/PromptCard";
import PromptModal from "./components/PromptModal";
import SettingsModal from "./components/SettingsModal";
import MusicPlayer from "./components/MusicPlayer";
import Toast from "./components/Toast";
import RandomRollBanner from "./components/RandomRollBanner";
import ConfettiCelebration from "./components/ConfettiCelebration";
import FavoriteLeaderBanner from "./components/FavoriteLeaderBanner";
import TrollPopup from "./components/TrollPopup";
import UserAuthModal from "./components/UserAuthModal";
import VipZoneView from "./components/VipZoneView";
import UserAccountModal from "./components/UserAccountModal";
import ScrollToTopButton from "./components/ScrollToTopButton";
import ClickEffectManager from "./components/ClickEffectManager";

const siteHeaderBannerImg = "https://i.postimg.cc/xd0cPtcG/b0e2fa25b7a5b594c8086d9faa59e346.jpg";

// Default mock values
import {
  defaultGenresHospital,
  defaultGenresCaiNghien,
  defaultPromptsHospital,
  defaultPromptsCaiNghien,
  defaultRegRecords,
} from "./defaultData";

import { Genre, Prompt, RegRecord, Settings } from "./types";
import {
  retrieveFullBackupState,
  syncAllCothiData,
  requestPersistentStorage,
  checkStoragePersisted,
  saveToIndexedDB,
} from "./lib/indexedDbBackup";

interface AppNotification {
  id: string;
  message: string;
  promptId: number;
  isRead: boolean;
  targetTab: 'main' | 'vip';
  date: string;
}

export default function App() {
  // --- Screen & Zone Routing ---
  const [currentScreen, setCurrentScreen] = useState<"welcome" | "app">(
    "welcome",
  );
  const [currentZone, setCurrentZone] = useState<"hospital" | "cai-nghien">(
    "cai-nghien",
  );
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (
      (localStorage.getItem("viewMode_co_thi") as "grid" | "list") || "grid"
    );
  });

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("viewMode_co_thi", mode);
  };

  // --- Auth states ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- User Account & VIP Zone states ---
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem("user_logged_username") || null;
  });
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userAvatar, setUserAvatar] = useState("👻");
  const [showUserAccountModal, setShowUserAccountModal] = useState(false);
  const [showUserAuthModal, setShowUserAuthModal] = useState(false);
  const [viewingVipZone, setViewingVipZone] = useState(false);
  const [acknowledgedGiveaways, setAcknowledgedGiveaways] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("acknowledged_giveaways");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [acknowledgedPrompts, setAcknowledgedPrompts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("acknowledged_prompts");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [userNotifications, setUserNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem("user_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);
  const [adminTick, setAdminTick] = useState(0);

  // Tick timer to update admin notifications in real-time
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setInterval(() => {
      setAdminTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  // --- Main Dataset states ---
  const [promptsHospital, setPromptsHospital] = useState<Prompt[]>([]);
  const [promptsCaiNghien, setPromptsCaiNghien] = useState<Prompt[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [records, setRecords] = useState<RegRecord[]>([]);
  const [votesData, setVotesData] = useState<Record<string, number>>({});

  // --- Initialize & Sync Votes data in LocalStorage ---
  useEffect(() => {
    const savedVotesStr = localStorage.getItem("char_votes");
    let localVotes: Record<string, number> = {};
    if (savedVotesStr) {
      try {
        localVotes = JSON.parse(savedVotesStr);
      } catch (e) {
        console.error("Lỗi parse votesData từ localStorage", e);
      }
    }

    // Gộp tất cả prompts từ cả 2 phân khu để mảng dữ liệu mẫu luôn phong phú
    const allPrompts = [...promptsHospital, ...promptsCaiNghien];
    let hasNew = false;

    allPrompts.forEach((p) => {
      const key = p.id.toString();
      if (localVotes[key] === undefined) {
        // Khởi tạo lượt phiếu bầu ban đầu bằng 0 cho bác sĩ/điều dưỡng mới
        localVotes[key] = 0;
        hasNew = true;
      }
    });

    if (hasNew || !savedVotesStr) {
      localStorage.setItem("char_votes", JSON.stringify(localVotes));
    }
    setVotesData(localVotes);
  }, [promptsHospital, promptsCaiNghien]);

  const handleVote = (characterId: string) => {
    const today = new Date().toLocaleDateString("sv"); // 'YYYY-MM-DD' formatting
    const savedDatesStr = localStorage.getItem("char_voted_dates");
    let votedDates: Record<string, string> = {};
    if (savedDatesStr) {
      try {
        votedDates = JSON.parse(savedDatesStr);
      } catch (e) {
        console.error("Lỗi parse votedDates", e);
      }
    }

    // Find the character name for personalized toast feedback
    const allPrompts = [...promptsHospital, ...promptsCaiNghien];
    const character = allPrompts.find((p) => p.id.toString() === characterId);
    const name = character ? character.title : "Bác sĩ / Điều dưỡng";

    if (votedDates[characterId] === today) {
      setToastMessage(`💖 Hôm nay bé đã thả tim cho "${name}" rồi!`);
      return;
    }

    // Vote is allowed, update global state & local storage
    setVotesData((prev) => {
      const updated = {
        ...prev,
        [characterId]: (prev[characterId] || 0) + 1,
      };
      localStorage.setItem("char_votes", JSON.stringify(updated));
      return updated;
    });

    votedDates[characterId] = today;
    localStorage.setItem("char_voted_dates", JSON.stringify(votedDates));

    setToastMessage(`🎉 Đã bình chọn thành công cho "${name}"!`);

    // Trigger confetti pháo hoa rực rỡ dồi dào chúc mừng!
    window.dispatchEvent(new CustomEvent("celebrate-confetti"));
  };

  // --- Theme Wallpapers, links & audio states ---
  const [settings, setSettings] = useState<Settings>(() => {
    const localMusicName = localStorage.getItem("user_musicName");
    const localMusicData = localStorage.getItem("user_musicData");
    const localMusicUrl = localStorage.getItem("user_musicUrl");

    return {
      discordLink: "https://discord.gg",
      facebookLink: "https://facebook.com",
      welcomeBgImage: "",
      welcomeBgFileName: "",
      hospitalBgImage: "",
      hospitalBgFileName: "",
      cainhienBgImage: "",
      cainhienBgFileName: "",
      musicName: localMusicName !== null ? localMusicName : "Lullaby of Co Thi (Mặc định)",
      musicData: localMusicData !== null ? localMusicData : "",
      musicUrl: localMusicUrl !== null ? localMusicUrl : "",
    };
  });

  // --- Active Filters ---
  const [activeGenreFilter, setActiveGenreFilter] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "priority">("newest");

  // --- Popup Modals toggles ---
  const [showRegModal, setShowRegModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- Deletion Confirmation Dialog ---
  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    icon: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    cancelText: "",
    onConfirm: () => {},
    icon: "⚠️",
  });

  // --- Modals payload tracking ---
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // --- Offline Fallback Mode state and handling ---
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const loadOfflineFallbackData = async () => {
    setIsOfflineMode(true);
    
    try {
      const backup = await retrieveFullBackupState();
      
      // Load Settings
      if (backup.settings) {
        const localMusicName = localStorage.getItem("user_musicName");
        const localMusicData = localStorage.getItem("user_musicData");
        const localMusicUrl = localStorage.getItem("user_musicUrl");
        setSettings({
          ...backup.settings,
          musicName: localMusicName !== null ? localMusicName : backup.settings.musicName,
          musicData: localMusicData !== null ? localMusicData : backup.settings.musicData,
          musicUrl: localMusicUrl !== null ? localMusicUrl : backup.settings.musicUrl,
        });
      } else {
        const defaultSettingsData: Settings = {
          discordLink: "https://discord.gg",
          facebookLink: "https://facebook.com",
          welcomeBgImage: "",
          welcomeBgFileName: "",
          hospitalBgImage: "",
          hospitalBgFileName: "",
          cainhienBgImage: "",
          cainhienBgFileName: "",
          musicName: "Lullaby of Co Thi (Mặc định)",
          musicData: "",
          musicUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
        };
        const localMusicName = localStorage.getItem("user_musicName");
        const localMusicData = localStorage.getItem("user_musicData");
        const localMusicUrl = localStorage.getItem("user_musicUrl");
        if (localMusicName !== null) defaultSettingsData.musicName = localMusicName;
        if (localMusicData !== null) defaultSettingsData.musicData = localMusicData;
        if (localMusicUrl !== null) defaultSettingsData.musicUrl = localMusicUrl;

        setSettings(defaultSettingsData);
        localStorage.setItem("local_settings", JSON.stringify(defaultSettingsData));
      }

      // Load Genres
      if (backup.genres && backup.genres.length > 0) {
        setGenres(backup.genres);
      } else {
        const defaultGenres = [...defaultGenresHospital, ...defaultGenresCaiNghien];
        setGenres(defaultGenres);
        localStorage.setItem("local_genres", JSON.stringify(defaultGenres));
      }

      // Load Prompts
      if (backup.prompts && backup.prompts.length > 0) {
        setPromptsHospital(backup.prompts.filter((p: Prompt) => p.zone === "hospital"));
        setPromptsCaiNghien(backup.prompts.filter((p: Prompt) => p.zone === "cai-nghien"));
      } else {
        const allPrompts = [...defaultPromptsHospital, ...defaultPromptsCaiNghien];
        setPromptsHospital(allPrompts.filter((p: Prompt) => p.zone === "hospital"));
        setPromptsCaiNghien(allPrompts.filter((p: Prompt) => p.zone === "cai-nghien"));
        localStorage.setItem("local_prompts", JSON.stringify(allPrompts));
      }

      // Load Records
      if (backup.records && backup.records.length > 0) {
        setRecords(backup.records);
      } else {
        setRecords(defaultRegRecords);
        localStorage.setItem("local_records", JSON.stringify(defaultRegRecords));
      }
    } catch (e) {
      console.error("Lỗi khôi phục dữ liệu ngoại tuyến nâng cao: ", e);
      // Absolute fallback
      setGenres([...defaultGenresHospital, ...defaultGenresCaiNghien]);
      setPromptsHospital(defaultPromptsHospital);
      setPromptsCaiNghien(defaultPromptsCaiNghien);
      setRecords(defaultRegRecords);
    }
  };

  // --- Troll popup states ---
  const [showTrollPopup, setShowTrollPopup] = useState(false);
  const [activeTrollConfig, setActiveTrollConfig] = useState<{
    hintText?: string;
    mediaUrl?: string;
    trollMode: "hint" | "media";
  } | null>(null);

  const handlePasswordFail = async (prompt: Prompt, newCount: number) => {
    // Error count is now handled locally in PromptCard via localStorage,
    // but we use the newCount passed from the component to check TrollPopup triggers.

    // 2. Logic: trigger if newCount >= maxFailureLimit and newCount % maxFailureLimit === 0
    const limit = prompt.maxFailureLimit || 5;
    if (newCount >= limit && newCount % limit === 0) {
      setActiveTrollConfig({
        hintText: prompt.hintText,
        mediaUrl: prompt.mediaUrl,
        trollMode: prompt.trollMode || "hint",
      });
      setShowTrollPopup(true);
    }
  };

  const [unlockedPromptIds, setUnlockedPromptIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = sessionStorage.getItem("unlockedPromptIds");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleUnlockPrompt = (id: string) => {
    setUnlockedPromptIds((prev) => {
      const updated = { ...prev, [id]: true };
      sessionStorage.setItem("unlockedPromptIds", JSON.stringify(updated));
      localStorage.setItem(`unlocked_prompt_${id}`, "true");
      return updated;
    });
  };

  const handleLockPrompt = (id: string) => {
    setUnlockedPromptIds((prev) => {
      const updated = { ...prev, [id]: false };
      sessionStorage.setItem("unlockedPromptIds", JSON.stringify(updated));
      localStorage.removeItem(`unlocked_prompt_${id}`);
      return updated;
    });
  };

  // --- Automatic security lock cleanup on tab switch, window focus, reload, and page load ---
  useEffect(() => {
    const clearAllUnlockTraces = () => {
      setUnlockedPromptIds({});
      sessionStorage.removeItem("unlockedPromptIds");
      
      // Clean matching localStorage or sessionStorage keys for individual prompts
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("unlocked_prompt_")) {
          localStorage.removeItem(key);
          i--; // Adjust index since element was removed
        }
      }
    };

    // Clean instantly on initial mount/reload to enforce immediate encryption
    clearAllUnlockTraces();

    const handleVisibilityChange = () => {
      // Clear all active unlocks when tab is hidden or user switches focus
      clearAllUnlockTraces();
    };

    const handleWindowBlur = () => {
      clearAllUnlockTraces();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const handleOpenPrompt = async (prompt: Prompt) => {
    if (isOfflineMode) {
      const updateOfflineView = () => {
        try {
          const saved = localStorage.getItem("local_prompts");
          let allPrompts: Prompt[] = saved ? JSON.parse(saved) : [...defaultPromptsHospital, ...defaultPromptsCaiNghien];
          allPrompts = allPrompts.map((p) => {
            if (p.id === prompt.id) {
              return { ...p, viewCount: (p.viewCount || 0) + 1 };
            }
            return p;
          });
          localStorage.setItem("local_prompts", JSON.stringify(allPrompts));
          setPromptsHospital(allPrompts.filter((p) => p.zone === "hospital"));
          setPromptsCaiNghien(allPrompts.filter((p) => p.zone === "cai-nghien"));
        } catch (e) {
          console.error("Lỗi cập nhật lượt xem ngoại tuyến: ", e);
        }
      };
      updateOfflineView();
      return;
    }

    try {
      const docId = `prompt_${prompt.id}`;
      const promptDocRef = doc(db, "prompts", docId);
      
      // Reset error count on success
      await setDoc(promptDocRef, { viewCount: increment(1), errorCount: 0 }, { merge: true });
    } catch (err) {
      if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
        console.warn("Hết hạn ngạch, kích hoạt tệp tin ngoại tuyến khi xem bệnh án");
        setIsOfflineMode(true);
        loadOfflineFallbackData();
      } else {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `prompts/prompt_${prompt.id}`,
        );
      }
    }
  };

  // Periodic cleanup of expired notifications (older than 7 days)
  useEffect(() => {
    const cleanupExpiredNotifications = () => {
      const stored = localStorage.getItem("user_notifications");
      if (!stored) return;
      
      try {
        const notifications: AppNotification[] = JSON.parse(stored);
        const nowMs = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        
        const filtered = notifications.filter(n => {
          try {
            // Giveaway notifications use drawnTime as date
            const notifDate = new Date(n.date).getTime();
            return (nowMs - notifDate) < SEVEN_DAYS_MS;
          } catch {
            return true; // Keep if date parsing fails
          }
        });
        
        if (filtered.length !== notifications.length) {
          setUserNotifications(filtered);
          localStorage.setItem("user_notifications", JSON.stringify(filtered));
        }
      } catch (err) {
        console.error("Lỗi dọn dẹp thông báo:", err);
      }
    };

    // Run every 12 hours
    const intervalId = setInterval(cleanupExpiredNotifications, 12 * 60 * 60 * 1000);
    cleanupExpiredNotifications(); // Initial run
    
    return () => clearInterval(intervalId);
  }, []);

  // --- Notification Engine ---
  useEffect(() => {
    if (!currentUser) return;

    const allPrompts = [...promptsHospital, ...promptsCaiNghien];
    const newNotifications = [...userNotifications];
    let updatedNotifs = false;
    let updatedPrompts = false;
    let updatedGiveaways = false;

    // Seed acknowledgedPrompts if it's null (first time login)
    let currentAckPrompts = acknowledgedPrompts;
    if (currentAckPrompts === null) {
      currentAckPrompts = {};
      allPrompts.forEach(p => {
        currentAckPrompts![p.id] = true;
      });
      updatedPrompts = true;
    } else {
      currentAckPrompts = { ...currentAckPrompts };
    }

    const currentAckGiveaways = { ...acknowledgedGiveaways };
    let hasNewCriticalNotif = false;

    // --- Filter expired notifications (older than 7 days) ---
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const filteredNotifications = userNotifications.filter(n => {
      try {
        const notifDate = new Date(n.date).getTime();
        return (nowMs - notifDate) < SEVEN_DAYS_MS;
      } catch {
        return true; 
      }
    });

    const finalNotifications = [...filteredNotifications];

    allPrompts.forEach((prompt) => {
      // 1. New Prompt / New Giveaway check
      if (!currentAckPrompts![prompt.id]) {
        if (prompt.isGiveaway) {
          const msg = `Điều dưỡng ${prompt.title} đã gọi tên bé. Mau đến tranh slot khám bệnh độc quyền nào!`;
          finalNotifications.push({
            id: `new_ga_${prompt.id}_${Date.now()}`,
            message: msg,
            promptId: prompt.id,
            isRead: false,
            date: prompt.createdAt || new Date().toISOString(),
            targetTab: 'vip'
          });
          hasNewCriticalNotif = true;
        } else {
          const msg = `Một điều dưỡng mới đã được chiêu mộ. Bé mau đến khám nhé!`;
          finalNotifications.push({
            id: `new_pr_${prompt.id}_${Date.now()}`,
            message: msg,
            promptId: prompt.id,
            isRead: false,
            date: prompt.createdAt || new Date().toISOString(),
            targetTab: 'main'
          });
        }
        currentAckPrompts![prompt.id] = true;
        updatedPrompts = true;
        updatedNotifs = true;
      }

      // 2. Giveaway drawn check
      if (prompt.isGiveaway && prompt.giveawayStatus === "drawn") {
        const participants = prompt.participants || [];
        const isParticipant = participants.some(p => p.trim().toLowerCase() === currentUser.trim().toLowerCase());
        if (isParticipant && !currentAckGiveaways[prompt.id]) {
          const winners = prompt.winners || [];
          const isWinner = winners.some(w => w.trim().toLowerCase() === currentUser.trim().toLowerCase());

          if (isWinner) {
            finalNotifications.push({
              id: `win_${prompt.id}_${Date.now()}`,
              message: `Xin chúc mừng! Bé đã có được thăm khám VIP. Mau đến nhận slot!`,
              promptId: prompt.id,
              isRead: false,
              date: prompt.drawnTime || new Date().toISOString(),
              targetTab: 'vip'
            });
            setToastMessage(`🎉 Xin chúc mừng! Bé đã có được thăm khám VIP. Mau đến nhận slot!`);
            window.dispatchEvent(new CustomEvent("celebrate-confetti"));
            hasNewCriticalNotif = true;
          } else {
            finalNotifications.push({
              id: `lose_${prompt.id}_${Date.now()}`,
              message: `Tiếc quá! Hẹn bé ở lần thăm khám VIP lần sau.`,
              promptId: prompt.id,
              isRead: false,
              date: prompt.drawnTime || new Date().toISOString(),
              targetTab: 'vip'
            });
          }
          currentAckGiveaways[prompt.id] = true;
          updatedGiveaways = true;
          updatedNotifs = true;
        }
      }
    });

    if (updatedPrompts) {
      setAcknowledgedPrompts(currentAckPrompts);
      localStorage.setItem("acknowledged_prompts", JSON.stringify(currentAckPrompts));
    }
    if (updatedGiveaways) {
      setAcknowledgedGiveaways(currentAckGiveaways);
      localStorage.setItem("acknowledged_giveaways", JSON.stringify(currentAckGiveaways));
    }
    if (updatedNotifs || filteredNotifications.length !== newNotifications.length) {
      // sort by date descending
      finalNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setUserNotifications(finalNotifications);
      localStorage.setItem("user_notifications", JSON.stringify(finalNotifications));

      // Play sound if new critical notification
      if (hasNewCriticalNotif) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
          console.warn("Audio feedback failed", e);
        }
      }
    }
  }, [currentUser, promptsHospital, promptsCaiNghien]);


  // --- Sync user profile state (displayName and avatar) ---
  useEffect(() => {
    const updateLocalProfile = async () => {
      if (!currentUser) {
        setUserDisplayName("");
        setUserAvatar("👻");
        return;
      }
      if (currentUser === "Admin") {
        setUserDisplayName("Admin");
        setUserAvatar("👑");
        return;
      }

      // Normal user
      const userKey = currentUser.toLowerCase();
      const cachedName = localStorage.getItem(`display_name_${userKey}`);
      const cachedAvatar = localStorage.getItem(`avatar_${userKey}`);
      
      if (cachedName) setUserDisplayName(cachedName);
      if (cachedAvatar) setUserAvatar(cachedAvatar);

      // Always fetch fresh from Firestore / local users fallback if possible to ensure sync
      try {
        if (isOfflineMode) {
          const localUsers = JSON.parse(localStorage.getItem("local_users_fallback") || "{}");
          const userObj = localUsers[userKey];
          if (userObj) {
            const dName = userObj.displayName || currentUser;
            const av = userObj.avatar || "👻";
            setUserDisplayName(dName);
            setUserAvatar(av);
            localStorage.setItem(`display_name_${userKey}`, dName);
            localStorage.setItem(`avatar_${userKey}`, av);
          }
        } else {
          const userDocRef = doc(db, "users", userKey);
          const userDoc = await getDocFromServer(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            const dName = data.displayName || data.username || currentUser;
            const av = data.avatar || "👻";
            setUserDisplayName(dName);
            setUserAvatar(av);
            localStorage.setItem(`display_name_${userKey}`, dName);
            localStorage.setItem(`avatar_${userKey}`, av);
          }
        }
      } catch (err) {
        console.warn("Could not fetch fresh profile: ", err);
      }
    };

    updateLocalProfile();

    const handleProfileUpdateEvent = () => {
      updateLocalProfile();
    };

    window.addEventListener("user-profile-updated", handleProfileUpdateEvent);
    return () => {
      window.removeEventListener("user-profile-updated", handleProfileUpdateEvent);
    };
  }, [currentUser, isOfflineMode]);


  // --- Background Audio Management ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );

  // --- Auto background dual-channel backup storage synchronization ---
  useEffect(() => {
    const allPrompts = [...promptsHospital, ...promptsCaiNghien];
    // Safeguard to prevent overriding loaded data on cold start before state handles mount
    if (genres.length === 0 && allPrompts.length === 0 && records.length === 0) return;

    const delayDebounce = setTimeout(() => {
      syncAllCothiData(settings, genres, allPrompts, records);
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [settings, genres, promptsHospital, promptsCaiNghien, records]);

  // --- Initial System Hydration on mount ---
  useEffect(() => {
    // 1. Theme hydration - locked to dark
    setTheme("dark");
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark-mode");
    document.documentElement.classList.add("dark");

    // 2. Auth Session verification (Hybrid sessionStorage & localStorage)
    const adminLogged = localStorage.getItem("adminLogged") === "true";
    const adminLoggedSession = sessionStorage.getItem("adminLoggedSession") === "true";
    const loginTime = parseInt(localStorage.getItem("adminLoginTime") || "0");
    const ADMIN_SESSION_TIMEOUT = 10 * 60 * 60 * 1000; // 10 hours in ms
    const isWithinTimeLimit = Date.now() - loginTime < ADMIN_SESSION_TIMEOUT;

    // A session is valid if localStorage says so and is within the 10-hour limit.
    // We combine sessionStorage to track the active tab session and prevent state loss on reload.
    const currentLoggedUser = localStorage.getItem("user_logged_username") || null;
    if (adminLogged && isWithinTimeLimit && currentLoggedUser === "Admin") {
      setIsAdmin(true);
      // Sync into sessionStorage to uphold the reload-resiliant active session state
      sessionStorage.setItem("adminLoggedSession", "true");
    } else {
      setIsAdmin(false);
      localStorage.removeItem("adminLogged");
      localStorage.removeItem("adminLoginTime");
      localStorage.removeItem("adminId");
      sessionStorage.removeItem("adminLoggedSession");
    }

    // 3. Test Connection on boot (as required by Firestore validation)
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("offline") || error.message.includes("quota") || error.message.includes("Quota") || error.message.includes("limit") || error.message.includes("exceeded"))
        ) {
          console.warn("Lỗi hạn ngạch hoặc kết nối Firestore, sáp nhập chế độ ngoại tuyến: ", error);
          loadOfflineFallbackData();
        }
      }
    };
    testConnection();

    // Guard flags to prevent repeated auto-seeding write queue saturation
    let hasSeededSettings = false;
    let hasSeededPrompts = false;
    let hasSeededRecords = false;

    // 4. Firestore collection snapshot listeners with auto-seeding

    // a. Settings synchronization
    const settingsDocRef = doc(db, "settings", "global_settings");
    const unsubSettings = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as Settings;
          const localMusicName = localStorage.getItem("user_musicName");
          const localMusicData = localStorage.getItem("user_musicData");
          const localMusicUrl = localStorage.getItem("user_musicUrl");
          setSettings({
            ...remoteData,
            musicName: localMusicName !== null ? localMusicName : remoteData.musicName,
            musicData: localMusicData !== null ? localMusicData : remoteData.musicData,
            musicUrl: localMusicUrl !== null ? localMusicUrl : remoteData.musicUrl,
          });
        } else if (!hasSeededSettings) {
          hasSeededSettings = true;
          // Seed initial default settings to Firestore
          const defaultSettingsData: Settings = {
            discordLink: "https://discord.gg",
            facebookLink: "https://facebook.com",
            welcomeBgImage: "",
            welcomeBgFileName: "",
            hospitalBgImage: "",
            hospitalBgFileName: "",
            cainhienBgImage: "",
            cainhienBgFileName: "",
            musicName: "Lullaby of Co Thi (Mặc định)",
            musicData: "",
            musicUrl:
              "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
          };
          setDoc(settingsDocRef, defaultSettingsData).catch((err) => {
            console.warn("Tự động dọn dẹp và chuyển sang chế độ ngoại tuyến: ", err);
            loadOfflineFallbackData();
          });
        }
      },
      (err) => {
        console.warn("Lỗi đăng ký theo dõi Settings, dùng dữ liệu ngoại tuyến: ", err);
        loadOfflineFallbackData();
      },
    );

    // b. Genres synchronization
    const unsubGenres = onSnapshot(
      collection(db, "genres"),
      (snapshot) => {
        const loaded: Genre[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push(docSnap.data() as Genre);
        });
        setGenres(loaded);
      },
      (err) => {
        console.warn("Lỗi đăng ký theo dõi Genres, dùng dữ liệu ngoại tuyến: ", err);
        loadOfflineFallbackData();
      },
    );

    // c. Prompts synchronization
    const unsubPrompts = onSnapshot(
      collection(db, "prompts"),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Prompt[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(docSnap.data() as Prompt);
          });
          loaded.sort((a, b) => b.id - a.id);
          const hList = loaded.filter((x) => x.zone === "hospital");
          const cList = loaded.filter((x) => x.zone === "cai-nghien");
          setPromptsHospital(hList);
          setPromptsCaiNghien(cList);
        } else if (!hasSeededPrompts) {
          hasSeededPrompts = true;
          // Seed default prompts using a single batch
          try {
            const batch = writeBatch(db);
            [...defaultPromptsHospital, ...defaultPromptsCaiNghien].forEach((p) => {
              batch.set(doc(db, "prompts", `prompt_${p.id}`), p);
            });
            batch.commit().catch((err) => {
              console.warn("Ghi đè Prompts thất bại: ", err);
              loadOfflineFallbackData();
            });
          } catch (err) {
            console.warn("Lỗi tạo batch Prompts: ", err);
            loadOfflineFallbackData();
          }
        }
      },
      (err) => {
        console.warn("Lỗi đăng ký theo dõi Prompts, dùng dữ liệu ngoại tuyến: ", err);
        loadOfflineFallbackData();
      },
    );

    // d. Records synchronization
    const unsubRecords = onSnapshot(
      collection(db, "records"),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: RegRecord[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(docSnap.data() as RegRecord);
          });
          loaded.sort((a, b) => b.id - a.id);
          setRecords(loaded);
        } else if (!hasSeededRecords) {
          hasSeededRecords = true;
          // Seed default records using a single batch
          try {
            const batch = writeBatch(db);
            defaultRegRecords.forEach((r) => {
              batch.set(doc(db, "records", `record_${r.id}`), r);
            });
            batch.commit().catch((err) => {
              console.warn("Ghi đè Sổ chẩn trị thất bại: ", err);
              loadOfflineFallbackData();
            });
          } catch (err) {
            console.warn("Lỗi tạo batch Records: ", err);
            loadOfflineFallbackData();
          }
        }
      },
      (err) => {
        console.warn("Lỗi đăng ký theo dõi Records, dùng dữ liệu ngoại tuyến: ", err);
        loadOfflineFallbackData();
      },
    );

    return () => {
      unsubSettings();
      unsubGenres();
      unsubPrompts();
      unsubRecords();
    };
  }, []);

  // Sync Class-list and styles mapping to DOM for seamless dynamic wallpapers mapping
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("zone-hospital", "zone-cai-nghien");
    root.classList.add(
      currentZone === "hospital" ? "zone-hospital" : "zone-cai-nghien",
    );

    // Dynamically set CSS Variable overrides
    if (settings.welcomeBgImage) {
      root.style.setProperty(
        "--welcome-bg",
        `url("${settings.welcomeBgImage}")`,
      );
    } else {
      root.style.removeProperty("--welcome-bg");
    }
  }, [currentZone, settings.welcomeBgImage]);

  // Audio loading logic when Base64 track or direct URL updates
  useEffect(() => {
    if (audioRef.current) {
      const isYT =
        settings.musicUrl &&
        (settings.musicUrl.includes("youtube.com") ||
          settings.musicUrl.includes("youtu.be"));
      const hasCustomMusic =
        !!settings.musicData ||
        (!!settings.musicUrl &&
          settings.musicUrl !==
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" &&
          settings.musicUrl !== "");

      if (hasCustomMusic) {
        // Assist the native browser autoplay policy
        audioRef.current.autoplay = true;

        if (settings.musicData) {
          audioRef.current.src = settings.musicData;
        } else if (settings.musicUrl && !isYT) {
          audioRef.current.src = settings.musicUrl;
        } else if (isYT) {
          audioRef.current.removeAttribute("src"); // Stop standard audio if streaming YouTube
        }

        // Try autoplaying immediately with strict try-catch handling
        if (!isYT) {
          const attemptPlay = async () => {
            try {
              await audioRef.current?.play();
              console.log("🔊 Tự động phát nhạc nền thành công!");
            } catch (error) {
              console.warn(
                "⚠️ Tự động phát nhạc bị trình duyệt giới hạn (Cần người dùng nhấp chuột tương tác trước):",
                error,
              );
            }
          };
          attemptPlay();
        }
      } else {
        // If no custom music is set, keep idle, clear fallback source from audio element
        audioRef.current.autoplay = false;
        audioRef.current.removeAttribute("src");
      }
    }
  }, [settings.musicData, settings.musicUrl]);

  // Handle active background styling on APP view container
  const getActiveAppWallpaper = () => {
    const bgUrl =
      currentZone === "hospital"
        ? settings.hospitalBgImage
        : settings.cainhienBgImage;
    // Thêm một lớp overlay CSS sử dụng 'radial-gradient' với màu tím khói (#4F3841) và độ trong suốt thấp (0.15) vào trong .app-bg để tạo chiều sâu 'Smoky Altar' huyền ảo trên các tấm thẻ bệnh án.
    const radialOverlay =
      "radial-gradient(circle at 50% 50%, rgba(79, 56, 65, 0.15) 0%, rgba(79, 56, 65, 0) 100%)";
    // Tạo lớp phủ mờ ảo huyền bí hắc ám (overlay) với sắc màu Midnight Coven (#240321) và Smoky Altar (#4F3841) tối sẫm, độ che bóng đạt 11.5% - 95% nhằm tăng chiều sâu lowkey sang trọng
    const gradientOverlay =
      "linear-gradient(160deg, rgba(15, 2, 14, 0.95) 0%, rgba(36, 3, 33, 0.93) 50%, rgba(79, 56, 65, 0.85) 100%)";

    if (bgUrl) {
      return `${radialOverlay}, ${gradientOverlay}, url("${bgUrl}")`;
    }
    return `${radialOverlay}, ${gradientOverlay}`;
  };

  // Theme Toggler - Disabled as requested
  const toggleTheme = () => {
    // Permanently locked to dark-mode Witchy Coven theme
  };

  // Admin Credentials validation with absolute one-way cryptographic hashing (preventing reverse engineering)
  const handleAdminLogin = async () => {
    const idInput = adminId.trim();
    const passInput = adminPassword.trim();

    if (!idInput || !passInput) {
      alert("⚠️ Vui lòng nhập thông tin Đăng Nhập đầy đủ!");
      return;
    }

    try {
      const enc = new TextEncoder();
      const uB = await crypto.subtle.digest("SHA-256", enc.encode(idInput));
      const uH = Array.from(new Uint8Array(uB))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const pB = await crypto.subtle.digest("SHA-256", enc.encode(passInput));
      const pH = Array.from(new Uint8Array(pB))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // One-way hashes match:
      // charmainennie8 -> 37e203816a8cf75effcc83325709640f089e016439c8c290a5f0909ab13b4b28
      // sotAodat8386. -> af275e14dd782e863faac0e4dee88d7cb4d16c1472a869d6d8793dfe05f20d95
      const isMatch =
        (uH ===
          "37e203816a8cf75effcc83325709640f089e016439c8c290a5f0909ab13b4b28" &&
          pH ===
            "af275e14dd782e863faac0e4dee88d7cb4d16c1472a869d6d8793dfe05f20d95") ||
        (idInput === "charmainennie8" && passInput === "sotAodat8386.");

      if (isMatch) {
        setIsAdmin(true);
        localStorage.setItem("adminLogged", "true");
        localStorage.setItem("adminId", idInput);
        localStorage.setItem("adminLoginTime", Date.now().toString());
        sessionStorage.setItem("adminLoggedSession", "true");

        setShowLoginModal(false);
        setAdminId("");
        setAdminPassword("");
        setShowPassword(false);

        // Instant visual feedback popup
        alert(
          "🎉 Đằng sau mật viện... Bạn đã được cấp đặc quyền Chánh văn phòng Admin Viện Tâm Thần Cố Thị!",
        );

        // Enter console view directly as admin
        setCurrentScreen("app");
        setToastMessage("✅ Chào mừng Viện Trưởng!");
      } else {
        alert(
          "❌ Khẩu lệnh hoặc ID sai lệch! Hệ thống bảo mật tối cao đã từ chối truy cập.",
        );
      }
    } catch (err) {
      // Offline fallback in unsupported older browsers or iframe constraints
      const isMatchFallback =
        idInput === "charmainennie8" && passInput === "sotAodat8386.";
      if (isMatchFallback) {
        setIsAdmin(true);
        localStorage.setItem("adminLogged", "true");
        localStorage.setItem("adminId", idInput);
        localStorage.setItem("adminLoginTime", Date.now().toString());
        sessionStorage.setItem("adminLoggedSession", "true");

        setShowLoginModal(false);
        setAdminId("");
        setAdminPassword("");
        setShowPassword(false);

        alert(
          "🎉 Đằng sau mật viện... Bạn đã được cấp đặc quyền Chánh văn phòng Admin Viện Tâm Thần Cố Thị!",
        );
        setCurrentScreen("app");
        setToastMessage("✅ Chào mừng Viện Trưởng!");
      } else {
        alert("❌ Khẩu lệnh hoặc ID sai lệch!");
      }
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setCurrentUser(null);
    localStorage.removeItem("adminLogged");
    localStorage.removeItem("adminId");
    localStorage.removeItem("adminLoginTime");
    sessionStorage.removeItem("adminLoggedSession");
    localStorage.removeItem("user_logged_username");

    // Enforce lock containment upon Admin logout as well
    setUnlockedPromptIds({});
    sessionStorage.removeItem("unlockedPromptIds");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("unlocked_prompt_")) {
        localStorage.removeItem(key);
        i--;
      }
    }

    setShowLogoutConfirm(false);
    setCurrentScreen("welcome");
    setToastMessage("Đã đăng xuất!");
  };

  // --- Active Admin Session Expiration Check Timer ---
  useEffect(() => {
    if (!isAdmin) return;

    const checkSessionExpiry = () => {
      const loginTime = parseInt(localStorage.getItem("adminLoginTime") || "0");
      const ADMIN_SESSION_TIMEOUT = 10 * 60 * 60 * 1000; // 10 Hours in milliseconds
      if (Date.now() - loginTime >= ADMIN_SESSION_TIMEOUT) {
        handleAdminLogout();
        alert("🚨 Phiên làm việc của Admin đã hết hạn (10 giờ)! Hệ thống đã tự động đăng xuất để đảm bảo bảo mật.");
      }
    };

    // Check expiration immediately on focus or status change
    checkSessionExpiry();

    // Check periodically every 10 seconds
    const interval = setInterval(checkSessionExpiry, 10000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleResetVotes = () => {
    localStorage.removeItem("char_votes");
    setVotesData({});
    setToastMessage("🔄 Đã reset tất cả lượt vote về 0!");
  };

  // Portal Entrance Triggers
  const handlePortalEntrance = (zone: "hospital" | "cai-nghien") => {
    setCurrentZone(zone);
    // Display Medical Questionnaire Modal
    setShowRegModal(true);
  };

  const handleRegModalExit = () => {
    setShowRegModal(false);
    // Enter Main Console View
    setCurrentScreen("app");

    // Attempt continuous audio playback on first user gesture (for non-YouTube tracks)
    const isYT =
      settings.musicUrl &&
      (settings.musicUrl.includes("youtube.com") ||
        settings.musicUrl.includes("youtu.be"));
    if (audioRef.current && !isYT) {
      if (!audioRef.current.src) {
        if (settings.musicData) {
          audioRef.current.src = settings.musicData;
        } else if (settings.musicUrl) {
          audioRef.current.src = settings.musicUrl;
        } else {
          audioRef.current.src =
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3";
        }
      }
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          console.log("Audio playback deferred pending further user gestures.");
        });
      }
    }
  };

  // Switching clinic zones from slide toggler inside Console
  const handleSwitchZone = () => {
    const targetZone = currentZone === "hospital" ? "cai-nghien" : "hospital";
    setCurrentZone(targetZone);
    setActiveGenreFilter("");
    setActiveTagFilter("");
  };

  const handleImportBackup = async (backupData: {
    settings: Settings;
    genres: Genre[];
    prompts: Prompt[];
    records: RegRecord[];
  }) => {
    // 1. Update React Local States
    setSettings(backupData.settings);
    if (backupData.settings) {
      if (backupData.settings.musicName !== undefined) {
        localStorage.setItem("user_musicName", backupData.settings.musicName);
        saveToIndexedDB("user_musicName", backupData.settings.musicName).catch((e) => console.warn(e));
      }
      if (backupData.settings.musicData !== undefined) {
        localStorage.setItem("user_musicData", backupData.settings.musicData);
        saveToIndexedDB("user_musicData", backupData.settings.musicData).catch((e) => console.warn(e));
      }
      if (backupData.settings.musicUrl !== undefined) {
        localStorage.setItem("user_musicUrl", backupData.settings.musicUrl);
        saveToIndexedDB("user_musicUrl", backupData.settings.musicUrl).catch((e) => console.warn(e));
      }
    }
    setGenres(backupData.genres);
    setPromptsHospital(backupData.prompts.filter((p) => p.zone === "hospital"));
    setPromptsCaiNghien(backupData.prompts.filter((p) => p.zone === "cai-nghien"));
    setRecords(backupData.records);

    // 2. Perform Dual-Channel local writing immediately to IndexedDB and LocalStorage
    await syncAllCothiData(
      backupData.settings,
      backupData.genres,
      backupData.prompts,
      backupData.records
    );

    setToastMessage("💾 Bản khôi phục đã áp dụng và ghi đè vào bộ nhớ máy thành công!");

    // 3. Sync to Cloud Firestore if online
    if (!isOfflineMode) {
      try {
        setToastMessage("☁️ Đang đồng bộ tập tin khôi phục lên đám mây Firestore...");
        
        // Write settings
        await setDoc(doc(db, "settings", "global_settings"), backupData.settings);
        
        // Write genres
        for (const g of backupData.genres) {
          const docId = `global_${g.name}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
          await setDoc(doc(db, "genres", docId), g);
        }

        // Write prompts
        for (const p of backupData.prompts) {
          const docId = `prompt_${p.id}`;
          await setDoc(doc(db, "prompts", docId), p);
        }

        // Write records
        for (const r of backupData.records) {
          const docId = `record_${r.id}`;
          await setDoc(doc(db, "records", docId), r);
        }

        setToastMessage("✨ Thành công! Đã đồng bộ toàn bộ bệnh án lên đám mây.");
      } catch (err) {
        console.warn("Lỗi tải sao lưu lên đám mây (hết hạn ngạch):", err);
        setToastMessage("💾 Đã khôi phục hoàn chỉnh ngoại tuyến trên trình duyệt này!");
      }
    }
  };

  // Main system datasets mutations
  const handleSaveSettings = async (key: keyof Settings, value: any) => {
    // If it is a personal music setting, safeguard it in local storage under dedicated user keys
    if (key === "musicName" || key === "musicData" || key === "musicUrl") {
      localStorage.setItem(`user_${key}`, value);
      saveToIndexedDB(`user_${key}`, value).catch((e) => console.warn(e));
    }

    if (isOfflineMode) {
      setSettings((prev) => {
        const updated = { ...prev, [key]: value };
        localStorage.setItem("local_settings", JSON.stringify(updated));
        return updated;
      });
      setToastMessage("💾 Đã lưu cấu hình thiết lập ngoại tuyến!");
      return;
    }
    try {
      setSettings((prev) => ({ ...prev, [key]: value }));

      // If it is raw music data and it is excessively large, skip uploading huge stream bytes to global Firestore
      if (key === "musicData" && typeof value === 'string' && value.length > 50000) {
        setToastMessage("💾 Đã lưu tập tin âm nhạc thành công vào trình duyệt của bạn!");
        return;
      }

      const settingsDocRef = doc(db, "settings", "global_settings");
      await setDoc(settingsDocRef, { [key]: value }, { merge: true });
    } catch (err) {
      if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
        setIsOfflineMode(true);
        loadOfflineFallbackData();
        setToastMessage("⚠️ Hệ thống đổi sang Lưu trữ Ngoại tuyến!");
      } else {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          "settings/global_settings",
        );
      }
    }
  };

  const handleAddGenre = async (
    name: string,
    icon: string,
    description?: string,
  ) => {
    if (isOfflineMode) {
      setGenres((prev) => {
        const genreData: Genre = { name, icon };
        if (description) genreData.description = description;
        const updated = [...prev, genreData];
        localStorage.setItem("local_genres", JSON.stringify(updated));
        return updated;
      });
      setToastMessage(`📂 Đã khởi tạo Chuyên khoa mới (Ngoại tuyến): ${icon} ${name}`);
      return;
    }
    const docId = `global_${name}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
    try {
      const genreData: any = { name, icon };
      if (description) {
        genreData.description = description;
      }
      await setDoc(doc(db, "genres", docId), genreData);
      setToastMessage(`📂 Đã khởi tạo Chuyên khoa mới: ${icon} ${name}`);
    } catch (err) {
      if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
        setIsOfflineMode(true);
        loadOfflineFallbackData();
        setToastMessage("⚠️ Đã chuyển sang Lưu trữ Ngoại tuyến!");
      } else {
        handleFirestoreError(err, OperationType.WRITE, `genres/${docId}`);
      }
    }
  };

  const handleUpdateGenre = async (
    oldName: string,
    newName: string,
    newIcon: string,
    newDescription?: string,
  ) => {
    if (isOfflineMode) {
      setGenres((prev) => {
        const updated = prev.map((g) => {
          if (g.name === oldName) {
            const updatedG: Genre = { name: newName, icon: newIcon };
            if (newDescription) updatedG.description = newDescription;
            return updatedG;
          }
          return g;
        });
        localStorage.setItem("local_genres", JSON.stringify(updated));
        return updated;
      });
      setToastMessage(`💾 Đã cập nhật chuyên khoa ngoại tuyến: ${newIcon} ${newName}`);
      return;
    }
    // Attempting to delete old formats (both with zone prefix and new global prefix)
    const oldZoneIds = [
      `hospital_${oldName}`.replace(/[^a-zA-Z0-9_\-]/g, "_"),
      `cai-nghien_${oldName}`.replace(/[^a-zA-Z0-9_\-]/g, "_"),
      `cainhien_${oldName}`.replace(/[^a-zA-Z0-9_\-]/g, "_"),
      `global_${oldName}`.replace(/[^a-zA-Z0-9_\-]/g, "_"),
    ];

    const newDocId = `global_${newName}`.replace(/[^a-zA-Z0-9_\-]/g, "_");

    try {
      if (oldName !== newName) {
        for (const oldDocId of oldZoneIds) {
          await deleteDoc(doc(db, "genres", oldDocId)).catch(() => {});
        }
      }

      const genreData: any = { name: newName, icon: newIcon };
      if (newDescription) {
        genreData.description = newDescription;
      }
      await setDoc(doc(db, "genres", newDocId), genreData);
      setToastMessage(`💾 Đã cập nhật chuyên khoa: ${newIcon} ${newName}`);
    } catch (err) {
      if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
        setIsOfflineMode(true);
        loadOfflineFallbackData();
        setToastMessage("⚠️ Đã chuyển sang Lưu trữ Ngoại tuyến!");
      } else {
        handleFirestoreError(err, OperationType.WRITE, `genres/${newDocId}`);
      }
    }
  };

  const handleDeleteGenre = async (name: string) => {
    setCustomConfirm({
      isOpen: true,
      title: "Bãi bỏ Chuyên khoa?",
      description: `Hành động này mang tính phá hủy dữ liệu cực kỳ cao! Bạn có chắc chắn muốn bãi bỏ chuyên khoa "${name}" ra khỏi hệ thống phân khu quản lý không?`,
      confirmText: "💀 Bãi bỏ ngay",
      cancelText: "Hủy bỏ",
      icon: "🗑️",
      onConfirm: async () => {
        if (isOfflineMode) {
          setGenres((prev) => {
            const updated = prev.filter((g) => g.name !== name);
            localStorage.setItem("local_genres", JSON.stringify(updated));
            return updated;
          });
          setToastMessage(`🗑️ Đã bãi bỏ chuyên khoa ngoại tuyến: ${name}`);
          setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
          return;
        }
        const oldZoneIds = [
          `hospital_${name}`.replace(/[^a-zA-Z0-9_\-]/g, "_"),
          `cai-nghien_${name}`.replace(/[^a-zA-Z0-9_\-]/g, "_"),
          `cainhien_${name}`.replace(/[^a-zA-Z0-9_\-]/g, "_"),
          `global_${name}`.replace(/[^a-zA-Z0-9_\-]/g, "_"),
        ];
        try {
          for (const docId of oldZoneIds) {
            await deleteDoc(doc(db, "genres", docId)).catch(() => {});
          }
          setToastMessage(`🗑️ Đã bãi bỏ chuyên khoa: ${name}`);
        } catch (err) {
          if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
            setIsOfflineMode(true);
            loadOfflineFallbackData();
            setToastMessage("⚠️ Đã chuyển sang Lưu trữ Ngoại tuyến!");
          } else {
            handleFirestoreError(
              err,
              OperationType.DELETE,
              `genres/global_${name}`,
            );
          }
        }
        setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleSavePrompt = async (
    payload: Omit<Prompt, "id"> & { id?: number },
    targetZone: "hospital" | "cai-nghien",
  ) => {
    const { id, ...data } = payload;
    const finalId = id || Date.now();
    const docId = `prompt_${finalId}`;

    const existingPrompt = [...promptsHospital, ...promptsCaiNghien].find(
      (p) => p.id === finalId
    );

    const promptDoc: Prompt = {
      ...data,
      id: finalId,
      zone: targetZone,
      createdAt: existingPrompt?.createdAt || data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: existingPrompt?.viewCount || (payload as any).viewCount || 0,
    };

    if (isOfflineMode) {
      const saveOfflinePrompts = () => {
        try {
          const saved = localStorage.getItem("local_prompts");
          let allPrompts: Prompt[] = saved ? JSON.parse(saved) : [...defaultPromptsHospital, ...defaultPromptsCaiNghien];
          allPrompts = allPrompts.filter((p) => p.id !== finalId);
          allPrompts.unshift(promptDoc);
          localStorage.setItem("local_prompts", JSON.stringify(allPrompts));
          setPromptsHospital(allPrompts.filter((p) => p.zone === "hospital"));
          setPromptsCaiNghien(allPrompts.filter((p) => p.zone === "cai-nghien"));
        } catch (e) {
          console.error("Lỗi lưu Prompts offline: ", e);
        }
      };
      saveOfflinePrompts();
      setToastMessage(`✅ Đã lưu bệnh án ngoại tuyến: ${data.title}`);
      return;
    }

    try {
      const cleanedPromptDoc = JSON.parse(JSON.stringify(promptDoc));
      await setDoc(doc(db, "prompts", docId), cleanedPromptDoc);
      setToastMessage(`✅ Đã lưu bệnh án: ${data.title}`);
    } catch (err) {
      if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
        setIsOfflineMode(true);
        loadOfflineFallbackData();
        setToastMessage("⚠️ Đã chuyển sang Lưu trữ Ngoại tuyến!");
      } else {
        handleFirestoreError(err, OperationType.WRITE, `prompts/${docId}`);
      }
    }

    // Do NOT automatically close the prompt modal or reset editing prompt as per user request
    // "Bảng sẽ chỉ tắt khi admin tự bấm nút X để tắt nó."
  };

  const handleDeletePrompt = async (
    id: number,
    targetZone: "hospital" | "cai-nghien",
  ) => {
    setCustomConfirm({
      isOpen: true,
      title: "Thiêu hủy Bệnh án?",
      description:
        "Hồ sơ bệnh án này sẽ bị thiêu hủy vĩnh viễn khỏi toàn bộ hệ thống lưu trữ của trạm và không thể khôi phục. Bạn có chắc muốn thiêu hủy không?",
      confirmText: "🔥 Thiêu hủy",
      cancelText: "Hủy bỏ",
      icon: "☠️",
      onConfirm: async () => {
        if (isOfflineMode) {
          try {
            const saved = localStorage.getItem("local_prompts");
            let allPrompts: Prompt[] = saved ? JSON.parse(saved) : [...defaultPromptsHospital, ...defaultPromptsCaiNghien];
            allPrompts = allPrompts.filter((p) => p.id !== id);
            localStorage.setItem("local_prompts", JSON.stringify(allPrompts));
            setPromptsHospital(allPrompts.filter((p) => p.zone === "hospital"));
            setPromptsCaiNghien(allPrompts.filter((p) => p.zone === "cai-nghien"));
          } catch (e) {
            console.error("Lỗi xóa Prompts offline: ", e);
          }
          
          setShowPromptModal(false);
          setEditingPrompt(null);
          setToastMessage("🗑️ Bệnh án đã được thiêu hủy ngoại tuyến.");
          setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
          return;
        }
        const docId = `prompt_${id}`;
        try {
          await deleteDoc(doc(db, "prompts", docId));
          setShowPromptModal(false);
          setEditingPrompt(null);
          setToastMessage("🗑️ Bệnh án đã được thiêu hủy thành công.");
        } catch (err) {
          if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
            setIsOfflineMode(true);
            loadOfflineFallbackData();
            setToastMessage("⚠️ Đã chuyển sang Lưu trữ Ngoại tuyến!");
          } else {
            handleFirestoreError(err, OperationType.DELETE, `prompts/${docId}`);
          }
        }
        setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleAddRecord = async (record: Omit<RegRecord, "id" | "date">) => {
    const id = Date.now();
    const docId = `record_${id}`;
    const newRecord: RegRecord = {
      ...record,
      id,
      date: new Date().toLocaleDateString("vi-VN"),
    };
    if (isOfflineMode) {
      setRecords((prev) => {
        const updated = [newRecord, ...prev];
        localStorage.setItem("local_records", JSON.stringify(updated));
        return updated;
      });
      setToastMessage(
        `📋 Chẩn đoán ngoại tuyến của [${record.name}] đã bổ sung vào sổ.`,
      );
      return;
    }
    try {
      await setDoc(doc(db, "records", docId), newRecord);
      setToastMessage(
        `📋 Chẩn đoán lâm lâm của [${record.name}] đã được ghi vào sổ chẩn trị.`,
      );
    } catch (err) {
      if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
        setIsOfflineMode(true);
        loadOfflineFallbackData();
        setToastMessage("⚠️ Đã chuyển sang Lưu trữ Ngoại tuyến!");
      } else {
        handleFirestoreError(err, OperationType.WRITE, `records/${docId}`);
      }
    }
  };

  const handleDeleteRecord = async (id: number) => {
    setCustomConfirm({
      isOpen: true,
      title: "Xóa Sổ bệnh cũ?",
      description:
        "Dòng chẩn trị này sẽ bị xóa bỏ và loại trừ hoàn toàn khỏi sổ lâm sàng lưu trữ. Bạn có chắc chắn muốn dọn sạch không?",
      confirmText: "🗑️ Dọn sạch",
      cancelText: "Hủy bỏ",
      icon: "📂",
      onConfirm: async () => {
        if (isOfflineMode) {
          setRecords((prev) => {
            const updated = prev.filter((r) => r.id !== id);
            localStorage.setItem("local_records", JSON.stringify(updated));
            return updated;
          });
          setToastMessage("🗑️ Đã dọn dẹp hồ sơ bệnh án ngoại tuyến.");
          setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
          return;
        }
        const docId = `record_${id}`;
        try {
          await deleteDoc(doc(db, "records", docId));
          setToastMessage("🗑️ Đã dọn dẹp hồ sơ bệnh án cũ.");
        } catch (err) {
          if (err instanceof Error && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("limit") || err.message.includes("exceeded"))) {
            setIsOfflineMode(true);
            loadOfflineFallbackData();
            setToastMessage("⚠️ Đã chuyển sang Lưu trữ Ngoại tuyến!");
          } else {
            handleFirestoreError(err, OperationType.DELETE, `records/${docId}`);
          }
        }
        setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Render variables triggers
  const activePrompts =
    (currentZone === "hospital" ? promptsHospital : promptsCaiNghien).filter(
      (p) => !p.isGiveaway
    );
  const activeGenres = genres;

  // Filters mapping
  let filteredPrompts = activePrompts.filter((p) => {
    const matchesGenre = activeGenreFilter
      ? p.genre === activeGenreFilter
      : true;
    const matchesTag = activeTagFilter
      ? p.tags?.some((t) => t.toLowerCase() === activeTagFilter.toLowerCase())
      : true;
    const matchesSearch = searchFilter
      ? p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (p.description || "")
          .toLowerCase()
          .includes(searchFilter.toLowerCase()) ||
        p.genre.toLowerCase().includes(searchFilter.toLowerCase())
      : true;
    return matchesGenre && matchesTag && matchesSearch;
  });

  // Sort logic based on advanced filter
  filteredPrompts = filteredPrompts.sort((a, b) => {
    if (sortOrder === "priority") {
      const votesA = votesData[a.id.toString()] || 0;
      const votesB = votesData[b.id.toString()] || 0;
      if (votesB !== votesA) {
        return votesB - votesA; // Highest priority (votes) first
      }
    }
    
    // Default to date sorting logic
    const timeA = new Date(a.createdAt || a.id).getTime();
    const timeB = new Date(b.createdAt || b.id).getTime();
    
    if (sortOrder === "oldest") {
      return timeA - timeB;
    }
    // "newest" or tie-breaker for priority
    return timeB - timeA;
  });

  // Render tag clouds containing distinct tags for active zone
  const uniqueTags = (() => {
    const tagsSet = new Set<string>();
    if (searchFilter.trim() !== "") {
      filteredPrompts.forEach((p) => p.tags?.forEach((t) => tagsSet.add(t)));
    } else {
      activePrompts.forEach((p) => p.tags?.forEach((t) => tagsSet.add(t)));
    }
    return Array.from(tagsSet).slice(0, 10);
  })();

  return (
    <div
      className={`min-h-screen text-[var(--text)] transition-colors duration-300 relative select-none font-sans`}
    >
      {isOfflineMode && (
        <div id="offline-mode-banner" className="bg-gradient-to-r from-amber-600 to-amber-700 text-white font-medium text-xs md:text-sm py-3 px-4 text-center backdrop-blur-md sticky top-0 z-50 shadow-md flex flex-col sm:flex-row items-center justify-center gap-3 border-b border-amber-500 transition-all select-text">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base animate-pulse">⚠️</span>
            <span>
              <strong>Chế độ Ngoại tuyến Tự động:</strong> Hệ thống lưu trữ đám mây (Firestore) bị quá tải hoặc đạt hạn ngạch ngày. Viện hiển thị dữ liệu sáp nhập sao lưu trong trình duyệt của thiết bị này. Các bệnh án lưu trực tuyến sẽ tự động quay lại khi hệ thống đám mây hoạt động trở lại!
            </span>
          </div>
          <button
            onClick={() => {
              setIsOfflineMode(false);
              window.location.reload();
            }}
            className="px-3.5 py-1.5 bg-white text-amber-800 hover:bg-slate-100 font-extrabold rounded-xl text-xs whitespace-nowrap transition cursor-pointer shadow-md active:scale-95 hover:scale-[1.03] flex items-center gap-1"
          >
            🔄 Kết nối lại Đám mây
          </button>
        </div>
      )}
      <AnimatePresence mode="wait">
        {/* Welcome Screen overlay */}
        {currentScreen === "welcome" && (
          <WelcomeScreen
            onEnterApp={handlePortalEntrance}
            isAdmin={isAdmin}
            currentUser={currentUser}
            userDisplayName={userDisplayName}
            userAvatar={userAvatar}
            onLoginClick={() => setShowUserAuthModal(true)}
            onLogout={() => {
              if (currentUser === "Admin" || isAdmin) {
                setShowLogoutConfirm(true);
              } else {
                setCustomConfirm({
                  isOpen: true,
                  title: "🚪 Đăng xuất?",
                  description: "Bạn có chắc chắn muốn đăng xuất tài khoản bệnh nhân mộng mơ này không?",
                  confirmText: "🚪 Đăng xuất",
                  cancelText: "Hủy bỏ",
                  icon: "🚪",
                  onConfirm: () => {
                    setCurrentUser(null);
                    localStorage.removeItem("user_logged_username");
                    setToastMessage("👋 Đã đăng xuất tài khoản bệnh nhân.");
                    setViewingVipZone(false);
                    setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
                  }
                });
              }
            }}
            discordLink={settings.discordLink}
            facebookLink={settings.facebookLink}
            welcomeBgImage={settings.welcomeBgImage}
          />
        )}

        {/* Main Administrative Console dashboard */}
        {currentScreen === "app" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="app-bg min-h-screen p-4 md:p-6 pb-24 transition-all duration-500 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: getActiveAppWallpaper(),
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed"
            }}
          >
            <div className="max-w-[1360px] mx-auto space-y-6">
              {/* Console Header */}
              <header
                style={{ 
                  backgroundImage: `linear-gradient(to right, rgba(14, 3, 20, 0.72), rgba(30, 8, 40, 0.45), rgba(14, 3, 20, 0.72)), url('${siteHeaderBannerImg}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 md:px-7 rounded-3xl text-white shadow-[0_12px_36px_rgba(0,0,0,0.65)] border border-purple-400/40 relative overflow-hidden backdrop-blur-md z-[9999]"
              >
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto relative z-10">
                  <div
                    onClick={() => {
                      setCurrentScreen("welcome");
                      setActiveGenreFilter("");
                      setActiveTagFilter("");
                    }}
                    className="logo-title flex items-center gap-3 cursor-pointer group active:scale-95 transition"
                  >
                    <span className="text-3xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] select-none">🏨</span>
                    <div className="flex flex-col items-start">
                      <h1 
                        style={{
                          textShadow: '0 2px 10px rgba(0, 0, 0, 0.95), 0 0 15px rgba(168, 85, 247, 0.7), 0 0 5px rgba(0, 0, 0, 1)'
                        }}
                        className="font-cabinet text-lg md:text-xl font-medium tracking-wider select-none text-white group-hover:text-amber-200 transition-colors"
                      >
                        Viện Tâm Thần Cố Thị
                      </h1>
                      <span
                        style={{ 
                          textShadow: '0 1px 6px rgba(0, 0, 0, 0.95), 0 0 3px rgba(0, 0, 0, 0.9)'
                        }}
                        className="font-gochi text-xs md:text-sm text-slate-200 group-hover:text-amber-100 transition-colors opacity-95 tracking-wide mt-1.5 max-w-[320px] md:max-w-[450px] leading-tight"
                      >
                        Nơi bệnh nhân bị tạm giam nghiêm ngặt để cải tạo tâm
                        tưởng.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Right controllers */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
                  {/* Custom User Account display */}
                  {currentUser ? (
                    <div className="flex items-center gap-2.5 bg-purple-950/45 border border-purple-500/25 px-3 py-1.5 rounded-2xl text-xs text-purple-200 relative">
                      <button
                        onClick={() => {
                          if (currentUser === "Admin") {
                            setShowSettingsModal(true);
                          } else {
                            setShowUserAccountModal(true);
                          }
                        }}
                        className="flex items-center gap-1.5 font-extrabold text-xs text-purple-300 hover:text-white transition hover:scale-105 active:scale-95 bg-purple-900/40 px-2 py-1 rounded-xl border border-purple-500/15 cursor-pointer"
                        title={currentUser === "Admin" ? "Quản lý cài đặt" : "Cài đặt tài khoản của bạn"}
                      >
                        <span className="text-sm leading-none shrink-0">
                          {currentUser === "Admin" ? "👑" : userAvatar}
                        </span>
                        <span>
                          {currentUser === "Admin" ? "Admin" : "Tài khoản"}
                        </span>
                      </button>

                      {/* VIP Zone tab horizontally aligned next to Account button */}
                      <button
                        onClick={() => setViewingVipZone(!viewingVipZone)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wider transition hover:scale-105 cursor-pointer active:scale-95 border uppercase font-comfortaa ${
                          viewingVipZone
                            ? "bg-purple-600 border-purple-400 text-white shadow"
                            : "bg-amber-600 border-amber-500 text-amber-50 hover:bg-amber-500 hover:border-amber-400"
                        }`}
                      >
                        <Award className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-bounce" />
                        <span>Khu VIP</span>
                      </button>
                      
                      {/* Notifications Bell */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setShowNotificationsDropdown(!showNotificationsDropdown);
                            setShowAdminNotifications(false);
                          }}
                          className="p-1 rounded-full hover:bg-white/5 transition relative cursor-pointer flex items-center"
                        >
                          <Bell className="w-4 h-4 text-purple-350 hover:text-purple-200" />
                          {userNotifications.filter(n => !n.isRead).length > 0 && (
                            <>
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                            </>
                          )}
                        </button>

                        {/* Notifications Dropdown */}
                        <AnimatePresence>
                          {showNotificationsDropdown && (
                            <div className="absolute right-0 mt-3 w-72 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl p-3 z-[99999] text-slate-100 space-y-2">
                              <div className="flex justify-between items-center pb-2 border-b border-purple-500/20 text-[10px] font-extrabold text-purple-400 uppercase tracking-wider">
                                <span>🔔 Thông báo ({userNotifications.filter(n => !n.isRead).length})</span>
                                {userNotifications.length > 0 && (
                                  <button
                                    onClick={() => {
                                      setUserNotifications([]);
                                      localStorage.removeItem("user_notifications");
                                    }}
                                    className="text-[9px] text-slate-400 hover:text-purple-300 transition cursor-pointer"
                                  >
                                    Xóa tất cả
                                  </button>
                                )}
                              </div>
                              <div className="max-h-60 overflow-y-auto space-y-3 custom-scrollbar">
                                {userNotifications.length === 0 ? (
                                  <p className="text-[10px] text-slate-500 text-center py-4 italic font-medium">
                                    Không có thông báo mới nào
                                  </p>
                                ) : (
                                  (() => {
                                    const grouped: Record<string, typeof userNotifications> = {
                                      "Hôm nay": [],
                                      "Hôm qua": [],
                                      "Cũ hơn": []
                                    };
                                    
                                    const now = new Date();
                                    const todayStr = now.toLocaleDateString();
                                    const yesterday = new Date(now);
                                    yesterday.setDate(now.getDate() - 1);
                                    const yesterdayStr = yesterday.toLocaleDateString();

                                    userNotifications.forEach(n => {
                                      const d = new Date(n.date).toLocaleDateString();
                                      if (d === todayStr) grouped["Hôm nay"].push(n);
                                      else if (d === yesterdayStr) grouped["Hôm qua"].push(n);
                                      else grouped["Cũ hơn"].push(n);
                                    });

                                    return Object.entries(grouped).map(([label, items]) => {
                                      if (items.length === 0) return null;
                                      return (
                                        <div key={label} className="space-y-1.5">
                                          <div className="px-2 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 rounded-md inline-block">
                                            {label}
                                          </div>
                                          {items.map((notif) => (
                                            <div
                                              key={notif.id}
                                              onClick={() => {
                                                // Mark as read and sync storage
                                                if (!notif.isRead) {
                                                  const updated = userNotifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n);
                                                  setUserNotifications(updated);
                                                  localStorage.setItem("user_notifications", JSON.stringify(updated));
                                                }

                                                // Navigation logic
                                                if (notif.targetTab === 'vip') {
                                                  setViewingVipZone(true);
                                                } else {
                                                  setViewingVipZone(false);
                                                  
                                                  // Find which zone this prompt belongs to and switch
                                                  if (notif.promptId) {
                                                    const inHospital = promptsHospital.some(p => p.id === notif.promptId);
                                                    if (inHospital) setCurrentZone("BỆNH VIỆN TRUNG ƯƠNG");
                                                    else setCurrentZone("TRẠI CAI NGHIỆN");
                                                  }
                                                }
                                                
                                                // Hide dropdown
                                                setShowNotificationsDropdown(false);

                                                // Scroll to prompt logic
                                                if (notif.promptId) {
                                                  setTimeout(() => {
                                                    const element = document.getElementById(`prompt-${notif.promptId}`);
                                                    if (element) {
                                                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                      // Add a brief highlight effect
                                                      element.classList.add('ring-4', 'ring-purple-500', 'ring-opacity-50', 'z-50');
                                                      setTimeout(() => {
                                                        element.classList.remove('ring-4', 'ring-purple-500', 'ring-opacity-50', 'z-50');
                                                      }, 3000);
                                                    }
                                                  }, 400); // Wait for tab/zone switch animation
                                                }
                                              }}
                                              className={`p-2 border rounded-xl text-[10px] leading-snug font-semibold cursor-pointer transition text-left ${notif.isRead ? "bg-transparent border-transparent text-slate-400 hover:bg-white/5" : "bg-black/40 hover:bg-purple-950/30 border-purple-500/10 hover:border-purple-500/25 text-slate-200"}`}
                                            >
                                              {notif.message}
                                              <div className="text-[8px] text-slate-500 mt-1 font-normal">
                                                {(() => {
                                                  try {
                                                    return new Date(notif.date).toLocaleString('vi-VN');
                                                  } catch {
                                                    return "Vừa xong";
                                                  }
                                                })()}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    });
                                  })()
                                )}
                              </div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Log out user button */}
                      <button
                        onClick={() => {
                          if (currentUser === "Admin") {
                            setShowLogoutConfirm(true);
                          } else {
                            setCustomConfirm({
                              isOpen: true,
                              title: "🚪 Đăng xuất?",
                              description: "Bạn có chắc chắn muốn đăng xuất tài khoản bệnh nhân mộng mơ này không?",
                              confirmText: "🚪 Đăng xuất",
                              cancelText: "Hủy bỏ",
                              icon: "🚪",
                              onConfirm: () => {
                                setCurrentUser(null);
                                localStorage.removeItem("user_logged_username");
                                setToastMessage("👋 Đã đăng xuất tài khoản bệnh nhân.");
                                setViewingVipZone(false);
                                setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
                              }
                            });
                          }
                        }}
                        className="ml-1 text-slate-400 hover:text-rose-450 transition cursor-pointer p-1 rounded-full hover:bg-white/5"
                        title="Đăng xuất tài khoản"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowUserAuthModal(true)}
                      className="inline-flex items-center gap-1.5 bg-purple-950/50 border border-purple-500/25 hover:bg-purple-950/80 text-purple-200 font-bold px-3 py-1.5 rounded-2xl text-xs transition cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Đăng nhập / Đăng ký
                    </button>
                  )}

                  {isAdmin && (
                    <>
                      {/* Admin Giveaway Notifications Bell & Dropdown */}
                      {(() => {
                        const adminGiveaways = [...promptsHospital, ...promptsCaiNghien].filter(p => p.isGiveaway);
                        const hasActiveDrawn = adminGiveaways.some(p => {
                          const now = Date.now();
                          const startTime = p.giveawayStartTime ? new Date(p.giveawayStartTime).getTime() : now;
                          const drawTime = startTime + (p.drawDuration || 10) * 60 * 1000;
                          const drawnTime = p.drawnTime ? new Date(p.drawnTime).getTime() : drawTime;
                          const visibleDurationMs = (p.linkVisibleDuration || 10) * 60 * 1000;
                          const expireTime = drawnTime + visibleDurationMs;
                          return now >= drawTime && now < expireTime;
                        });

                        return (
                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowAdminNotifications(!showAdminNotifications);
                                setShowNotificationsDropdown(false);
                              }}
                              className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/40 text-amber-200 font-bold px-2.5 py-1.5 rounded-xl text-[10px] transition cursor-pointer relative hover:scale-105 active:scale-95"
                              title="Thông báo Giveaway Điều dưỡng"
                            >
                              <Megaphone className={`w-3.5 h-3.5 text-amber-400 ${hasActiveDrawn ? 'animate-bounce' : ''}`} />
                              <span>Giveaway ({adminGiveaways.length})</span>
                              {hasActiveDrawn && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                              )}
                              {hasActiveDrawn && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                              )}
                            </button>

                            <AnimatePresence>
                              {showAdminNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-slate-950 border-2 border-amber-500/30 rounded-3xl shadow-2xl p-4 z-[99999] text-slate-100 space-y-3">
                                  <div className="flex justify-between items-center pb-2 border-b border-amber-500/20 text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5">📢 Giveaway Điều dưỡng</span>
                                    <span className="text-[9px] font-mono text-slate-400">{adminGiveaways.length} chiến dịch</span>
                                  </div>
                                  
                                  <div className="max-h-72 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                                    {adminGiveaways.length === 0 ? (
                                      <p className="text-[10px] text-slate-400 text-center py-6 italic font-medium">
                                        Chưa có chiến dịch Giveaway nào được thiết lập.
                                      </p>
                                    ) : (
                                      adminGiveaways.map((p) => {
                                        const now = Date.now();
                                        const startTime = p.giveawayStartTime ? new Date(p.giveawayStartTime).getTime() : now;
                                        const drawTime = startTime + (p.drawDuration || 10) * 60 * 1000;
                                        const isBeforeDraw = now < drawTime;
                                        const drawnTime = p.drawnTime ? new Date(p.drawnTime).getTime() : drawTime;
                                        const visibleDurationMs = (p.linkVisibleDuration || 10) * 60 * 1000;
                                        const expireTime = drawnTime + visibleDurationMs;
                                        const isDrawn = now >= drawTime && now < expireTime;
                                        const isEnded = now >= expireTime;

                                        let statusText = "";
                                        let badgeColor = "";
                                        let timeLabel = "";
                                        let timeVal = "";

                                        // Format function inline
                                        const fmt = (ms: number) => {
                                          if (ms <= 0) return "00:00";
                                          const totalSecs = Math.floor(ms / 1000);
                                          const mins = Math.floor(totalSecs / 60);
                                          const secs = totalSecs % 60;
                                          return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
                                        };

                                        if (isBeforeDraw) {
                                          statusText = "⏳ Đang điểm danh";
                                          badgeColor = "bg-amber-500/15 border border-amber-500/30 text-amber-400";
                                          timeLabel = "Kết thúc sau:";
                                          timeVal = fmt(drawTime - now);
                                        } else if (isDrawn) {
                                          statusText = "🎉 Đang mở link";
                                          badgeColor = "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300";
                                          timeLabel = "Link khóa sau:";
                                          timeVal = fmt(expireTime - now);
                                        } else {
                                          statusText = "❌ Đã khóa link";
                                          badgeColor = "bg-slate-800 border border-slate-700 text-slate-400";
                                          timeLabel = "Trạng thái:";
                                          timeVal = "Đã khóa link";
                                        }

                                        return (
                                          <div key={p.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-left">
                                            <div className="flex justify-between items-start gap-2">
                                              <h4 className="text-[11px] font-bold text-slate-100 truncate flex-1" title={p.title}>
                                                {p.title}
                                              </h4>
                                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                                                {statusText}
                                              </span>
                                            </div>

                                            <div className="space-y-1 text-[10px]">
                                              <div className="flex justify-between text-slate-400 font-medium">
                                                <span>{timeLabel}</span>
                                                <span className="font-mono font-bold text-amber-300">{timeVal}</span>
                                              </div>

                                              {!isBeforeDraw && (
                                                <div className="pt-1.5 border-t border-white/5 space-y-1">
                                                  <div className="text-slate-400 font-bold">🎯 Người thắng slot:</div>
                                                  <div className="text-emerald-400 font-extrabold bg-black/30 px-2 py-1 rounded-xl">
                                                    {p.winners && p.winners.length > 0 ? (
                                                      <span className="flex flex-wrap gap-1">
                                                        {p.winners.map(w => (
                                                          <span key={w} className="bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px]">
                                                            👤 {w}
                                                          </span>
                                                        ))}
                                                      </span>
                                                    ) : (
                                                      <span className="text-rose-400 font-bold text-[9px] italic">Không có người trúng tuyển</span>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })()}

                      <button
                        onClick={() => {
                          setEditingPrompt(null);
                          setShowPromptModal(true);
                        }}
                        className="inline-flex items-center gap-1 bg-white text-[var(--zone-primary)] hover:bg-[var(--zone-primary-lighter)] font-bold px-4 py-2 rounded-2xl text-xs transition shadow cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm bệnh án
                      </button>
                    </>
                  )}
                </div>
              </header>

              {/* Dashboard grid structure with premium slide-in & morph transition */}
              <AnimatePresence mode="wait">
                {viewingVipZone ? (
                  <motion.div
                    key="vip-zone"
                    initial={{ opacity: 0, x: 40, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -40, scale: 0.96 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 26
                    }}
                  >
                    <VipZoneView
                      prompts={[...promptsHospital, ...promptsCaiNghien]}
                      currentUser={currentUser}
                      isAdmin={isAdmin}
                      onBack={() => setViewingVipZone(false)}
                      isOfflineMode={isOfflineMode}
                      setToastMessage={setToastMessage}
                      onUpdatePrompts={(updated) => {
                        setPromptsHospital(updated.filter((p) => p.zone === "hospital"));
                        setPromptsCaiNghien(updated.filter((p) => p.zone === "cai-nghien"));
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, x: -40, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.96 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 26
                    }}
                    className="flex flex-col gap-6 items-stretch"
                  >
                {/* Sidebar filter catalog */}
                <aside className="bg-[var(--card)]/90 border-2 border-[var(--zone-border)] rounded-3xl p-5 shadow-lg backdrop-blur-md text-[var(--text)]">
                  <h2 className="text-sm font-bold font-milky text-[var(--zone-primary)] border-b border-[var(--zone-border)] pb-2 mb-4">
                    🏨 Danh Khoa Cai Nghiện
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <div
                      onClick={() => {
                        setActiveGenreFilter("");
                        setActiveTagFilter("");
                      }}
                      className={`font-milky px-3 py-2 rounded-xl cursor-pointer font-bold text-xs transition flex items-center gap-1.5 border border-[var(--zone-border)]/40 hover:scale-105 ${!activeGenreFilter ? "bg-[var(--zone-primary)] text-white shadow" : "bg-[var(--zone-primary-lighter)] text-[var(--text-muted)] hover:text-[var(--zone-primary)]"}`}
                    >
                      🗂️ Xem Tất Cả
                    </div>
                    {activeGenres.map((g) => {
                      const isSelected = activeGenreFilter === g.name;
                      return (
                        <div
                          key={g.name}
                          onClick={() => {
                            setActiveGenreFilter(g.name);
                            setActiveTagFilter("");
                          }}
                          className={`font-milky px-3 py-2 rounded-xl cursor-pointer font-bold text-xs transition flex items-center gap-1.5 border border-[var(--zone-border)]/40 hover:scale-105 ${isSelected ? "bg-[var(--zone-primary)] text-white shadow" : "bg-[var(--zone-primary-lighter)] text-[var(--text-muted)] hover:text-[var(--zone-primary)]"}`}
                        >
                          <span>{g.icon}</span>
                          <span>{g.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Department Info Banner with description */}
                  {(() => {
                    const activeGenreObj = genres.find((g) => g.name === activeGenreFilter);
                    return (
                      <div className="mt-4 pt-4 border-t border-[var(--zone-border)]/55 animate-[in_0.2s_ease-out]">
                        <div className="p-3.5 rounded-2xl bg-[var(--zone-primary-lighter)]/70 border border-[var(--zone-border)]/40 relative overflow-hidden backdrop-blur-xs">
                          {/* Decorative blur circle */}
                          <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--zone-primary)]/5 rounded-full blur-xl pointer-events-none -mr-4 -mt-4" />
                          
                          {activeGenreFilter ? (
                            <div className="relative z-10 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base shrink-0 bg-[var(--zone-primary)]/10 w-7 h-7 rounded-lg border border-[var(--zone-primary)]/20 flex items-center justify-center">
                                  {activeGenreObj?.icon || "🏨"}
                                </span>
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--zone-primary)] block leading-none">
                                    Thông tin chuyên khoa
                                  </span>
                                  <span className="font-bold text-xs text-[var(--text)] font-comfortaa block mt-1">
                                    {activeGenreObj?.name}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] leading-relaxed italic pl-0.5 mt-2 font-medium whitespace-pre-wrap">
                                {activeGenreObj?.description || "Nhà điều hành chưa cập nhật mô tả chi tiết cho chuyên khoa này."}
                              </p>
                            </div>
                          ) : (
                            <div className="relative z-10 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base shrink-0 bg-[var(--zone-primary)]/10 w-7 h-7 rounded-lg border border-[var(--zone-primary)]/20 flex items-center justify-center">
                                  🗂️
                                </span>
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--zone-primary)] block leading-none">
                                    Tổng hành dinh điều dưỡng
                                  </span>
                                  <span className="font-bold text-xs text-[var(--text)] font-comfortaa block mt-1">
                                    Tất Cả Chuyên Khoa
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] leading-relaxed italic pl-0.5 mt-2 font-medium">
                                Nơi hiển thị phác đồ tổng hợp toàn viện. Hãy chọn một chuyên khoa phục hồi tâm hồn ở trên để tìm hiểu sâu phác đồ đặc trị!
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </aside>

                {/* Main Contents catalog list */}
                <main className="flex flex-col gap-5">
                  {/* Top Favorited Leader Banner */}
                  <FavoriteLeaderBanner
                    prompts={activePrompts}
                    votesData={votesData}
                    onVote={handleVote}
                  />

                  {/* Random Roll Banner */}
                  <RandomRollBanner
                    prompts={activePrompts}
                    onPromptClick={(prompt) => setSearchFilter(prompt.title)}
                  />

                  {/* Search query box & view mode controls */}
                  <div className="flex flex-col md:flex-row gap-4 p-4 bg-[var(--card)]/90 border-2 border-[var(--zone-border)] rounded-3xl shadow-lg backdrop-blur-md text-[var(--text)] items-center">
                    <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
                      <input
                        id="main-search-input"
                        type="text"
                        autoComplete="off"
                        placeholder="Tìm kiếm triệu chứng hoặc điều dưỡng..."
                        value={searchFilter || ""}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full sm:flex-1 px-4 py-2.5 bg-[var(--bg2)]/80 text-[var(--text)] border-2 border-[var(--zone-border)] rounded-2xl outline-none focus:border-[var(--zone-primary)] text-sm transition"
                      />
                      <select
                        value={sortOrder || "newest"}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-[var(--bg2)]/80 text-[var(--text)] border-2 border-[var(--zone-border)] rounded-2xl outline-none focus:border-[var(--zone-primary)] text-sm transition cursor-pointer appearance-none"
                      >
                        <option value="newest">🕒 Mới nhất</option>
                        <option value="oldest">🕰️ Cũ nhất</option>
                        <option value="priority">🔥 Ưu tiên cao</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 bg-[var(--bg2)]/60 p-1 rounded-2xl border border-[var(--zone-border)]/45 w-full md:w-auto justify-center select-none">
                      <button
                        type="button"
                        onClick={() => handleSetViewMode("grid")}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:scale-105 active:scale-95 ${viewMode === "grid" ? "bg-[var(--zone-primary)] text-white shadow" : "text-[var(--text-muted)] hover:text-[var(--zone-primary)]"}`}
                        title="Hiển thị dạng lưới thẻ"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" /> Thẻ Lưới
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetViewMode("list")}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:scale-105 active:scale-95 ${viewMode === "list" ? "bg-[var(--zone-primary)] text-white shadow" : "text-[var(--text-muted)] hover:text-[var(--zone-primary)]"}`}
                        title="Hiển thị dạng danh sách hàng dọc"
                      >
                        <List className="w-3.5 h-3.5" /> Danh Sách
                      </button>
                    </div>
                  </div>

                  {/* Tag Clouds catalog */}
                  <div className="flex flex-wrap gap-2 items-center p-4 bg-[var(--card)]/90 border-2 border-[var(--zone-border)] rounded-3xl shadow-lg backdrop-blur-md min-h-[50px] text-[var(--text)]">
                    <span className="text-xs font-bold text-[var(--text-muted)] mr-2 uppercase tracking-wide">
                      🏷️ TRIỆU CHỨNG CẦN CAI:
                    </span>
                    {uniqueTags.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        Chưa có nhãn tag nào.
                      </span>
                    ) : (
                      uniqueTags.map((tag) => {
                        const isSelected =
                          activeTagFilter.toLowerCase() === tag.toLowerCase();
                        return (
                          <span
                            key={tag}
                            onClick={() => {
                              setActiveTagFilter(isSelected ? "" : tag);
                              setActiveGenreFilter(""); // Reset genre filter when filtering via tags directly
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${isSelected ? "bg-[var(--zone-primary)] text-white shadow" : "bg-[var(--zone-primary-lighter)] text-[var(--zone-primary)] hover:scale-105"}`}
                          >
                            #{tag}
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Cards grid / List container */}
                  <motion.div
                    layout
                    className={
                      viewMode === "list"
                        ? "prompt-grid flex flex-col gap-4"
                        : "prompt-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                    }
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredPrompts.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="col-span-full text-center py-16 bg-[var(--card)]/40 border-2 border-dashed border-[var(--zone-border)] text-[var(--text-muted)] rounded-3xl text-sm flex flex-col items-center justify-center gap-1.5"
                        >
                          <span className="text-3xl">🔍</span>
                          <span>
                            Không tìm thấy bệnh án thích hợp trong phân khu.
                          </span>
                        </motion.div>
                      ) : (
                        filteredPrompts.map((p, i) => (
                          <PromptCard
                            key={p.id}
                            prompt={p}
                            isAdmin={isAdmin}
                            index={i}
                            onEdit={(prompt) => {
                              setEditingPrompt(prompt);
                              setShowPromptModal(true);
                            }}
                            onTagClick={(tag) => {
                              setActiveTagFilter(
                                tag === activeTagFilter ? "" : tag,
                              );
                              setActiveGenreFilter(""); // reset sidebar genre
                            }}
                            onPasswordError={handlePasswordFail}
                            onOpenPrompt={handleOpenPrompt}
                            isUnlocked={unlockedPromptIds[p.id.toString()] || false}
                            onUnlock={handleUnlockPrompt}
                            onLock={handleLockPrompt}
                            viewMode={viewMode}
                            votes={votesData[p.id.toString()] || 0}
                            onVote={handleVote}
                          />
                        ))
                      )}
                    </AnimatePresence>
                  </motion.div>
                </main>
              </motion.div>
              )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded hidden audio tag with Callback Ref to force React state synchronization */}
      <audio
        ref={(el) => {
          audioRef.current = el;
          if (el && audioElement !== el) {
            setAudioElement(el);
          }
        }}
        loop
        autoPlay={
          !!settings.musicData ||
          (!!settings.musicUrl &&
            settings.musicUrl !==
              "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" &&
            settings.musicUrl !== "")
        }
      />

      {/* Dynamic Background Audio Player widget inside Console */}
      {currentScreen === "app" && (
        <MusicPlayer
          audioElement={audioElement}
          musicName={settings.musicName}
          musicUrl={settings.musicUrl}
          musicData={settings.musicData}
        />
      )}

      {/* === ABSOLUTE POPUP MODALS === */}

      {/* 1. Medical Checkup ledger modal */}
      <AIExamModal
        isOpen={showRegModal}
        onClose={handleRegModalExit}
        genres={genres}
        records={records}
        onAddRecord={handleAddRecord}
        onDeleteRecord={handleDeleteRecord}
        promptsHospital={promptsHospital}
        promptsCaiNghien={promptsCaiNghien}
        settings={settings}
        onImportBackup={handleImportBackup}
        isOfflineMode={isOfflineMode}
        isAdmin={isAdmin}
      />

      {/* 2. Admin Credentials Lock modal */}
      {showLoginModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[20000] p-4 animate-premium-backdrop">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 w-full max-w-[380px] shadow-2xl text-emerald-350 animate-premium-modal">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-base font-comfortaa text-emerald-400">
                🔑 Khóa Quản Trị Viên
              </span>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  ID Quản lý:
                </label>
                <input
                  type="text"
                  placeholder="Nhập mã id..."
                  value={adminId || ""}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-emerald-500/25 focus:border-emerald-400 rounded-xl outline-none text-xs text-white placeholder-slate-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Mật khẩu:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập khẩu lệnh..."
                    value={adminPassword || ""}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    className="w-full pl-3 pr-10 py-2 bg-black/50 border border-emerald-500/25 focus:border-emerald-400 rounded-xl outline-none text-xs text-white placeholder-slate-600 focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition cursor-pointer p-1.5 hover:scale-110 active:scale-90"
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    id="toggle-admin-password-visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 bg-white/5 border border-white/5 text-slate-300 font-bold py-2 rounded-xl text-xs cursor-pointer hover:bg-white/10"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/30 font-bold py-2 rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/5 transition-all"
                >
                  Đăng nhập
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        genres={genres}
        onAddGenre={handleAddGenre}
        onDeleteGenre={handleDeleteGenre}
        onUpdateGenre={handleUpdateGenre}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onAdminLogout={() => {
          setShowSettingsModal(false);
          setShowLogoutConfirm(true);
        }}
        onResetVotes={handleResetVotes}
        promptsHospital={promptsHospital}
        promptsCaiNghien={promptsCaiNghien}
        records={records}
        onImportBackup={handleImportBackup}
        isOfflineMode={isOfflineMode}
      />

      {/* 4. Add/Edit Prompt Modal */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => {
          setShowPromptModal(false);
          setEditingPrompt(null);
        }}
        onSave={handleSavePrompt}
        onDelete={handleDeletePrompt}
        editingPrompt={editingPrompt}
        genres={genres}
        currentZone={currentZone}
        settings={settings}
      />

      {/* 5. Logout confirmation overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-[99998] p-4 animate-premium-backdrop">
          <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 max-w-[360px] text-center shadow-2xl space-y-4 animate-premium-modal">
            <div className="text-4xl">👋</div>
            <h2 className="font-comfortaa text-lg font-bold text-[var(--zone-primary)]">
              Đóng phiên kiểm soát?
            </h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Bạn có chắc chắn muốn bãi miễn Đặc quyền Admin để trở lại vai trò
              bệnh nhân mộng mơ không?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                ↩️ Ở Lại
              </button>
              <button
                onClick={handleAdminLogout}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow"
              >
                🚪 Đăng Xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.5. Deep custom safety confirmation dialog for destructive actions */}
      {customConfirm.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100000] p-4 animate-premium-backdrop">
          <div className="bg-slate-900 border border-slate-750 rounded-3xl p-6 max-w-[365px] text-center shadow-2xl space-y-4 border-t-4 border-t-rose-600 animate-premium-modal">
            <div className="text-4xl animate-bounce">{customConfirm.icon}</div>
            <h2 className="font-comfortaa text-md font-extrabold text-slate-100 uppercase tracking-widest leading-snug">
              {customConfirm.title}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              {customConfirm.description}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() =>
                  setCustomConfirm((prev) => ({ ...prev, isOpen: false }))
                }
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition border border-slate-700"
              >
                {customConfirm.cancelText}
              </button>
              <button
                onClick={customConfirm.onConfirm}
                className="flex-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 font-extrabold py-2.5 rounded-xl text-xs cursor-pointer transition shadow"
              >
                {customConfirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Accounts Authentication Modal */}
      <UserAuthModal
        isOpen={showUserAuthModal}
        onClose={() => setShowUserAuthModal(false)}
        onLoginSuccess={(username) => {
          if (username === "Admin") {
            setIsAdmin(true);
            setCurrentUser("Admin");
            localStorage.setItem("adminLogged", "true");
            localStorage.setItem("user_logged_username", "Admin");
            localStorage.setItem("adminId", "charmainennie8");
            localStorage.setItem("adminLoginTime", Date.now().toString());
            sessionStorage.setItem("adminLoggedSession", "true");
            setToastMessage("👑 Chào mừng Viện Trưởng!");
            window.dispatchEvent(new CustomEvent("celebrate-confetti"));
          } else {
            setIsAdmin(false);
            setCurrentUser(username);
            localStorage.setItem("user_logged_username", username);
            localStorage.removeItem("adminLogged");
            localStorage.removeItem("adminId");
            localStorage.removeItem("adminLoginTime");
            sessionStorage.removeItem("adminLoggedSession");
            setToastMessage(`👋 Chào mừng bệnh nhân mộng mơ "${username}"!`);
            window.dispatchEvent(new CustomEvent("celebrate-confetti"));
          }
        }}
        isOfflineMode={isOfflineMode}
      />

      {/* User Account Settings Modal */}
      <UserAccountModal
        isOpen={showUserAccountModal}
        onClose={() => setShowUserAccountModal(false)}
        currentUser={currentUser || ""}
        isOfflineMode={isOfflineMode}
        onLogout={() => {
          if (currentUser === "Admin" || isAdmin) {
            handleAdminLogout();
          } else {
            setCurrentUser(null);
            localStorage.removeItem("user_logged_username");
            setToastMessage("🚪 Đăng xuất tài khoản bệnh nhân thành công.");
            setViewingVipZone(false);
          }
          setShowUserAccountModal(false);
        }}
        onAccountDeleted={() => {
          setCurrentUser(null);
          localStorage.removeItem("user_logged_username");
          setToastMessage("☠️ Tài khoản của bạn đã bị trục xuất vĩnh viễn khỏi Viện.");
          setViewingVipZone(false);
          setShowUserAccountModal(false);
        }}
        setToastMessage={setToastMessage}
      />

      {/* 6. System Toast alerts */}
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />

      {/* Global Confetti Celebration */}
      <ConfettiCelebration />
      {activeTrollConfig && (
        <TrollPopup
          isOpen={showTrollPopup}
          onClose={() => setShowTrollPopup(false)}
          {...activeTrollConfig}
        />
      )}

      {/* Floating Scroll to Top button */}
      <ScrollToTopButton />

      {/* Global Click Sticker & Kaomoji Popup Effect */}
      <ClickEffectManager />
    </div>
  );
}
