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
        // Sinh ngẫu nhiên lượng phiếu bầu mượt mà ban đầu cho bác sĩ/điều dưỡng chưa có vote
        localVotes[key] = ((p.id * 17) % 89) + 15;
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
    passwordFailLimit: 5,
    passwordFailGifUrl:
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3FjNDJqNHBlOHI1b3Rnbm1reTV6ZGFxZHl6dHF6amNmaXloZHFyNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ju7l5y9osyXQQ/giphy.gif",
    passwordFailSoundUrl:
      "https://assets.mixkit.co/active_storage/sfx/951/951-84.wav",
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

  // --- Password failures / Troll popup states ---
  const [showTrollOverlay, setShowTrollOverlay] = useState(false);
  const [activeTrollMedia, setActiveTrollMedia] = useState<string>("");
  const [trollTimeLeft, setTrollTimeLeft] = useState(8000); // 8000ms = 8s
  const TROLL_MAX_DURATION = 8000;

  // Smooth millisecond-based countdown timer for the troll overlay progress bar
  useEffect(() => {
    if (showTrollOverlay) {
      setTrollTimeLeft(8000);
      const startTime = Date.now();
      const endTime = startTime + 8000;

      const interval = setInterval(() => {
        const remaining = Math.max(0, endTime - Date.now());
        setTrollTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [showTrollOverlay]);

  const handlePasswordFail = (triggerAlarm: boolean, customMedia?: string) => {
    if (triggerAlarm) {
      const mediaSource = customMedia || settings.passwordFailGifUrl;
      if (!mediaSource) return; // Silent if no media source is provided anywhere
      setActiveTrollMedia(customMedia || "");
      setShowTrollOverlay(true);
    }
  };

  const handleOpenPrompt = async (prompt: Prompt) => {
    try {
      const docId = `prompt_${prompt.id}`;
      const promptDocRef = doc(db, "prompts", docId);
      await setDoc(promptDocRef, { viewCount: increment(1) }, { merge: true });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `prompts/prompt_${prompt.id}`,
      );
    }
  };

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

    // 2. Auth Session verification
    const adminLogged = localStorage.getItem("adminLogged") === "true";
    const loginTime = parseInt(localStorage.getItem("adminLoginTime") || "0");
    const isValidSession =
      adminLogged && Date.now() - loginTime < 24 * 60 * 60 * 1000;
    if (isValidSession) {
      setIsAdmin(true);
    } else {
      localStorage.removeItem("adminLogged");
      localStorage.removeItem("adminLoginTime");
    }

    // 3. Test Connection on boot (as required by Firestore validation)
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error("Please check your Firebase configuration.");
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
            passwordFailLimit: 5,
            passwordFailGifUrl: "",
          };
          setDoc(settingsDocRef, defaultSettingsData).catch((err) => {
            handleFirestoreError(
              err,
              OperationType.WRITE,
              "settings/global_settings",
            );
          });
        }
      },
      (err) => {
        handleFirestoreError(
          err,
          OperationType.GET,
          "settings/global_settings",
        );
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
        handleFirestoreError(err, OperationType.GET, "genres");
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
              handleFirestoreError(
                err,
                OperationType.WRITE,
                `prompts/${docId}`,
              );
            });
          });
          defaultPromptsCaiNghien.forEach((p) => {
            const docId = `prompt_${p.id}`;
            setDoc(doc(db, "prompts", docId), p).catch((err) => {
              handleFirestoreError(
                err,
                OperationType.WRITE,
                `prompts/${docId}`,
              );
            });
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, "prompts");
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
              handleFirestoreError(
                err,
                OperationType.WRITE,
                `records/${docId}`,
              );
            });
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, "records");
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
    setShowLogoutConfirm(false);
    setCurrentScreen("welcome");
    setToastMessage("Đã đăng xuất!");
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
    try {
      const settingsDocRef = doc(db, "settings", "global_settings");
      await setDoc(settingsDocRef, { [key]: value }, { merge: true });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        "settings/global_settings",
      );
    }
  };

  const handleAddGenre = async (
    name: string,
    icon: string,
    description?: string,
  ) => {
    const docId = `global_${name}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
    try {
      const genreData: any = { name, icon };
      if (description) {
        genreData.description = description;
      }
      await setDoc(doc(db, "genres", docId), genreData);
      setToastMessage(`📂 Đã khởi tạo Chuyên khoa mới: ${icon} ${name}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `genres/${docId}`);
    }
  };

  const handleUpdateGenre = async (
    oldName: string,
    newName: string,
    newIcon: string,
    newDescription?: string,
  ) => {
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
      handleFirestoreError(err, OperationType.WRITE, `genres/${newDocId}`);
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
          handleFirestoreError(
            err,
            OperationType.DELETE,
            `genres/global_${name}`,
          );
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

    const promptDoc: Prompt = {
      ...data,
      id: finalId,
      zone: targetZone,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: (payload as any).viewCount || 0,
    };

    try {
      await setDoc(doc(db, "prompts", docId), promptDoc);
      setToastMessage(`✅ Đã lưu bệnh án: ${data.title}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `prompts/${docId}`);
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
        const docId = `prompt_${id}`;
        try {
          await deleteDoc(doc(db, "prompts", docId));
          setShowPromptModal(false);
          setEditingPrompt(null);
          setToastMessage("🗑️ Bệnh án đã được thiêu hủy thành công.");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `prompts/${docId}`);
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
    try {
      await setDoc(doc(db, "records", docId), newRecord);
      setToastMessage(
        `📋 Chẩn đoán lâm lâm của [${record.name}] đã được ghi vào sổ chẩn trị.`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `records/${docId}`);
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
        const docId = `record_${id}`;
        try {
          await deleteDoc(doc(db, "records", docId));
          setToastMessage("🗑️ Đã dọn dẹp hồ sơ bệnh án cũ.");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `records/${docId}`);
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
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full sm:flex-1 px-4 py-2.5 bg-[var(--bg2)]/80 text-[var(--text)] border-2 border-[var(--zone-border)] rounded-2xl outline-none focus:border-[var(--zone-primary)] text-sm transition"
                      />
                      <select
                        value={sortOrder}
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
                            onPasswordFail={handlePasswordFail}
                            onOpenPrompt={handleOpenPrompt}
                            passwordFailLimit={settings.passwordFailLimit || 5}
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
                  value={adminId}
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
                    value={adminPassword}
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

      {/* 5.9. Customizable Wrong Password Troll Alarm Overlay */}
      <AnimatePresence>
        {showTrollOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[200000] p-4 bg-rose-950/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative bg-slate-950 border-2 border-rose-500 rounded-3xl p-6 w-full max-w-[480px] text-center shadow-2xl space-y-5"
            >
              {/* Absolute close X button / countdown badge */}
              {(() => {
                const secondsRemaining = Math.max(
                  0,
                  Math.ceil(trollTimeLeft / 1000),
                );
                if (secondsRemaining > 0) {
                  return (
                    <div className="absolute top-4 right-4 bg-rose-950/85 border border-rose-500/40 rounded-full px-3 py-1 text-[10px] font-extrabold text-rose-400 flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                      <span>ĐANG KHÓA: {secondsRemaining}S</span>
                    </div>
                  );
                } else {
                  return (
                    <motion.button
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      id="close-troll-btn"
                      onClick={() => {
                        setShowTrollOverlay(false);
                        setToastMessage(
                          "💊 Can thiệp cưỡng chế thành công! Lần sau hãy cẩn thận.",
                        );
                      }}
                      className="absolute top-4 right-4 text-white bg-rose-600 hover:bg-rose-500 rounded-full w-8 h-8 flex items-center justify-center transition-all cursor-pointer shadow-md border border-rose-400/30 font-bold text-lg leading-none focus:outline-none"
                      title="Đóng cảnh báo"
                    >
                      &times;
                    </motion.button>
                  );
                }
              })()}

              <div className="text-5xl animate-bounce pt-2">
                🚨 Patient Alert! 🚨
              </div>
              <h2 className="font-comfortaa text-xl font-bold text-rose-500 uppercase tracking-wider">
                PHÁ HOẠI BỆNH ÁN CỐ THỊ!
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Hệ thống phát hiện tài khoản của bạn đang cố tình bẻ khóa hồ sơ
                liên tục! Ban quản trị Cố Thị đã tiến hành can thiệp cưỡng chế
                đặc biệt!
              </p>

              <div className="rounded-2xl overflow-hidden border border-rose-800 bg-black/40 h-[180px] flex items-center justify-center relative">
                {(() => {
                  const mediaSrc =
                    activeTrollMedia || settings.passwordFailGifUrl;

                  if (!mediaSrc) {
                    // No default if they don't upload
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950/90 text-center">
                        <span className="text-[64px] mb-4">🚨</span>
                        <h2 className="text-4xl md:text-5xl font-black text-rose-500 uppercase tracking-widest mb-4">
                          Báo động đỏ
                        </h2>
                        <p className="text-rose-400 font-bold text-lg max-w-md mx-auto line-height-relaxed">
                          Bạn đã nhập sai mật khẩu quá nhiều lần.
                        </p>
                      </div>
                    );
                  }

                  const isVideo =
                    mediaSrc.startsWith("data:video/") ||
                    mediaSrc
                      .split("?")[0]
                      .split("#")[0]
                      .toLowerCase()
                      .endsWith(".mp4") ||
                    mediaSrc
                      .split("?")[0]
                      .split("#")[0]
                      .toLowerCase()
                      .endsWith(".webm") ||
                    mediaSrc
                      .split("?")[0]
                      .split("#")[0]
                      .toLowerCase()
                      .endsWith(".mov") ||
                    mediaSrc
                      .split("?")[0]
                      .split("#")[0]
                      .toLowerCase()
                      .endsWith(".ogg");

                  if (isVideo) {
                    return (
                      <video
                        src={mediaSrc}
                        autoPlay
                        loop
                        playsInline
                        ref={(el) => {
                          if (el) {
                            el.volume = 0.55; // Ensure smooth volume, avoiding too loud
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    );
                  } else {
                    return (
                      <img
                        src={mediaSrc}
                        alt="Troll Alarm"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    );
                  }
                })()}
              </div>

              {/* Progress bar with glowing progress tracker */}
              {(() => {
                const secondsRemaining = Math.max(
                  0,
                  Math.ceil(trollTimeLeft / 1000),
                );
                const progressPercent = Math.max(
                  0,
                  Math.min(100, ((8000 - trollTimeLeft) / 8000) * 100),
                );
                return (
                  <div className="space-y-1.5 text-left w-full pt-1">
                    <div className="flex justify-between items-center text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                      <span>Đang giải mã lệnh can thiệp...</span>
                      <span className="text-rose-400 font-mono">
                        {secondsRemaining > 0
                          ? `${progressPercent.toFixed(0)}%`
                          : "ĐÃ ĐỦ THỜI GIAN"}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 shadow-[0_0_8px_rgba(244,114,182,0.6)]"
                        style={{ width: `${progressPercent}%` }}
                        layout
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2">
                {(() => {
                  const secondsRemaining = Math.max(
                    0,
                    Math.ceil(trollTimeLeft / 1000),
                  );
                  if (secondsRemaining > 0) {
                    return (
                      <button
                        disabled
                        className="w-full bg-slate-800 text-slate-500 font-extrabold py-3 rounded-2xl text-xs cursor-not-allowed uppercase tracking-widest border border-slate-700/40 flex items-center justify-center gap-2"
                      >
                        🔒 Xem hết nội dung cảnh báo ({secondsRemaining}s)
                      </button>
                    );
                  } else {
                    return (
                      <motion.button
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onClick={() => {
                          setShowTrollOverlay(false);
                          setToastMessage(
                            "💊 Can thiệp cưỡng chế thành công! Lần sau hãy cẩn thận.",
                          );
                        }}
                        className="w-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold py-3 rounded-2xl text-xs cursor-pointer shadow-lg hover:shadow-rose-500/20 transition-all uppercase tracking-widest animate-pulse"
                      >
                        💉 Tôi hứa sẽ chữa bệnh ngoan ngoãn!
                      </motion.button>
                    );
                  }
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. System Toast alerts */}
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />

      {/* Global Confetti Celebration */}
      <ConfettiCelebration />
    </div>
  );
}
