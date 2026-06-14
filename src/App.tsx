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

// Default mock values
import {
  defaultGenresHospital,
  defaultGenresCaiNghien,
  defaultPromptsHospital,
  defaultPromptsCaiNghien,
  defaultRegRecords,
} from "./defaultData";

import { Genre, Prompt, RegRecord, Settings } from "./types";

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
  const [settings, setSettings] = useState<Settings>({
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
    musicUrl: "",
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

  const loadOfflineFallbackData = () => {
    setIsOfflineMode(true);
    
    // settings
    try {
      const savedSettings = localStorage.getItem("local_settings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
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
        setSettings(defaultSettingsData);
        localStorage.setItem("local_settings", JSON.stringify(defaultSettingsData));
      }
    } catch (e) {
      console.error("Lỗi tải Settings offline: ", e);
    }

    // genres
    try {
      const savedGenres = localStorage.getItem("local_genres");
      if (savedGenres) {
        setGenres(JSON.parse(savedGenres));
      } else {
        const defaultGenres = [...defaultGenresHospital, ...defaultGenresCaiNghien];
        setGenres(defaultGenres);
        localStorage.setItem("local_genres", JSON.stringify(defaultGenres));
      }
    } catch (e) {
      console.error("Lỗi tải Genres offline: ", e);
    }

    // prompts
    try {
      const savedPrompts = localStorage.getItem("local_prompts");
      let allPrompts = [];
      if (savedPrompts) {
        allPrompts = JSON.parse(savedPrompts);
      } else {
        allPrompts = [...defaultPromptsHospital, ...defaultPromptsCaiNghien];
        localStorage.setItem("local_prompts", JSON.stringify(allPrompts));
      }
      setPromptsHospital(allPrompts.filter((p: Prompt) => p.zone === "hospital"));
      setPromptsCaiNghien(allPrompts.filter((p: Prompt) => p.zone === "cai-nghien"));
    } catch (e) {
      console.error("Lỗi tải Prompts offline: ", e);
    }

    // records
    try {
      const savedRecords = localStorage.getItem("local_records");
      if (savedRecords) {
        setRecords(JSON.parse(savedRecords));
      } else {
        setRecords(defaultRegRecords);
        localStorage.setItem("local_records", JSON.stringify(defaultRegRecords));
      }
    } catch (e) {
      console.error("Lỗi tải Records offline: ", e);
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

  // ... (rest of App.tsx)

  // ... (in the returned JSX, add TrollPopup)
  <TrollPopup
    isOpen={showTrollPopup}
    onClose={() => setShowTrollPopup(false)}
    {...activeTrollConfig}
  />


  // --- Background Audio Management ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );

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
    if (adminLogged && isWithinTimeLimit) {
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

    // 4. Firestore collection snapshot listeners with auto-seeding

    // a. Settings synchronization
    const settingsDocRef = doc(db, "settings", "global_settings");
    const unsubSettings = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as Settings);
        } else {
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
        } else {
          // Seed default prompts
          defaultPromptsHospital.forEach((p) => {
            const docId = `prompt_${p.id}`;
            setDoc(doc(db, "prompts", docId), p).catch((err) => {
              console.warn("Ghi đè Prompts thất bại: ", err);
              loadOfflineFallbackData();
            });
          });
          defaultPromptsCaiNghien.forEach((p) => {
            const docId = `prompt_${p.id}`;
            setDoc(doc(db, "prompts", docId), p).catch((err) => {
              console.warn("Ghi đè Prompts thất bại: ", err);
              loadOfflineFallbackData();
            });
          });
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
        } else {
          // Seed default records
          defaultRegRecords.forEach((r) => {
            const docId = `record_${r.id}`;
            setDoc(doc(db, "records", docId), r).catch((err) => {
              console.warn("Ghi đè Sổ chẩn trị thất bại: ", err);
              loadOfflineFallbackData();
            });
          });
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
    localStorage.removeItem("adminLogged");
    localStorage.removeItem("adminId");
    localStorage.removeItem("adminLoginTime");
    sessionStorage.removeItem("adminLoggedSession");

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

  // Main system datasets mutations
  const handleSaveSettings = async (key: keyof Settings, value: any) => {
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
      await setDoc(doc(db, "prompts", docId), promptDoc);
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
    currentZone === "hospital" ? promptsHospital : promptsCaiNghien;
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
        <div id="offline-mode-banner" className="bg-amber-600/95 text-white font-medium text-xs md:text-sm py-2.5 px-4 text-center backdrop-blur-md sticky top-0 z-50 shadow-md flex items-center justify-center gap-2 border-b border-amber-500 transition-all">
          <span className="text-sm md:text-base">⚠️</span>
          <span>
            <strong>Chế độ Ngoại tuyến Tự động:</strong> Hệ thống lưu trữ đám mây (Firestore) đã vượt quá hạn ngạch ngày. Viện Tâm Thần Cố Thị đã tự động chuyển đổi sang lưu trữ ngoại tuyến trên trình duyệt (Offline Local Storage). Bé vẫn có thể xem và quản trị bệnh án an toàn!
          </span>
        </div>
      )}
      <AnimatePresence mode="wait">
        {/* Welcome Screen overlay */}
        {currentScreen === "welcome" && (
          <WelcomeScreen
            onEnterApp={handlePortalEntrance}
            isAdmin={isAdmin}
            onAdminLoginClick={() => setShowLoginModal(true)}
            onAdminLogout={() => setShowLogoutConfirm(true)}
            discordLink={settings.discordLink}
            facebookLink={settings.facebookLink}
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
            style={{ backgroundImage: getActiveAppWallpaper() }}
          >
            <div className="max-w-[1360px] mx-auto space-y-6">
              {/* Console Header */}
              <header
                style={{ background: "var(--zone-header-bg)" }}
                className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 md:px-7 rounded-3xl text-white shadow-xl relative overflow-hidden backdrop-blur-sm"
              >
                <div className="flex flex-col md:flex-row items-center gap-4 relative z-2 w-full md:w-auto">
                  <div
                    onClick={() => {
                      setCurrentScreen("welcome");
                      setActiveGenreFilter("");
                      setActiveTagFilter("");
                    }}
                    className="logo-title flex items-center gap-3 cursor-pointer group active:scale-95 transition"
                  >
                    <span className="text-3xl drop-shadow select-none">🏨</span>
                    <div className="flex flex-col items-start">
                      <h1 className="font-comfortaa text-lg md:text-xl font-bold tracking-wide select-none text-white group-hover:text-amber-200 transition-colors">
                        VIỆN TÂM THẦN CỐ THỊ
                      </h1>
                      <span
                        style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}
                        className="text-[10px] md:text-xs text-slate-300 group-hover:text-amber-100 transition-colors opacity-90 font-medium italic mt-0.5 max-w-[320px] md:max-w-[450px] leading-tight"
                      >
                        Nơi bệnh nhân bị tạm giam nghiêm ngặt để cải tạo tâm
                        tưởng.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Right controllers */}
                <div className="flex items-center gap-3 relative z-2 w-full md:w-auto justify-end">
                  {isAdmin && (
                    <>
                      <span className="bg-white/20 text-white font-bold py-1.5 px-3 rounded-full border border-white/30 text-xs backdrop-blur-xs flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Admin
                      </span>
                      <button
                        onClick={() => setShowSettingsModal(true)}
                        className="inline-flex items-center gap-1 bg-white/15 border border-white/25 hover:bg-white/25 text-white font-bold px-3 py-2 rounded-2xl text-xs transition cursor-pointer"
                      >
                        <SettingsIcon className="w-3.5 h-3.5" /> Thiết lập
                      </button>
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

              {/* Dashboard grid structure */}
              <div className="flex flex-col gap-6 items-stretch">
                {/* Sidebar filter catalog */}
                <aside className="bg-[var(--card)]/90 border-2 border-[var(--zone-border)] rounded-3xl p-5 shadow-lg backdrop-blur-md text-[var(--text)]">
                  <h2 className="text-sm font-bold font-comfortaa text-[var(--zone-primary)] border-b border-[var(--zone-border)] pb-2 mb-4">
                    🏨 Danh Khoa Cai Nghiện
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <div
                      onClick={() => {
                        setActiveGenreFilter("");
                        setActiveTagFilter("");
                      }}
                      className={`px-3 py-2 rounded-xl cursor-pointer font-bold text-xs transition flex items-center gap-1.5 border border-[var(--zone-border)]/40 hover:scale-105 ${!activeGenreFilter ? "bg-[var(--zone-primary)] text-white shadow" : "bg-[var(--zone-primary-lighter)] text-[var(--text-muted)] hover:text-[var(--zone-primary)]"}`}
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
                          className={`px-3 py-2 rounded-xl cursor-pointer font-bold text-xs transition flex items-center gap-1.5 border border-[var(--zone-border)]/40 hover:scale-105 ${isSelected ? "bg-[var(--zone-primary)] text-white shadow" : "bg-[var(--zone-primary-lighter)] text-[var(--text-muted)] hover:text-[var(--zone-primary)]"}`}
                        >
                          <span>{g.icon}</span>
                          <span>{g.name}</span>
                        </div>
                      );
                    })}
                  </div>
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
                        type="text"
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
              </div>
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
    </div>
  );
}
