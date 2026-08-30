import React, { useState, useEffect, useRef } from "react";
import {
  X,
  FolderPlus,
  Image,
  Music,
  Link as LinkIcon,
  Trash,
  User,
  LogOut,
  Edit2,
  Download,
  Upload,
  ShieldCheck,
  Database,
  FileDown,
  Lock,
  Unlock,
  DoorClosed,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Sparkles,
} from "lucide-react";
import { Genre, Settings, Prompt, RegRecord, QuizQuestion } from "../types";
import { 
  checkStoragePersisted, 
  requestPersistentStorage,
  getFromIndexedDB
} from "../lib/indexedDbBackup";
import { compressImageFile, compressQrImageFile } from "../utils/imageUtils";
import QuizManagerTab from "./QuizManagerTab";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  genres: Genre[];
  onAddGenre: (name: string, icon: string, description?: string) => void;
  onDeleteGenre: (name: string) => void;
  onUpdateGenre?: (
    oldName: string,
    newName: string,
    newIcon: string,
    description?: string,
  ) => Promise<void>;
  settings: Settings;
  onSaveSettings: (key: keyof Settings, value: any) => void;
  onAdminLogout?: () => void;
  onResetVotes?: () => void;
  
  // Backup enhancements properties
  promptsHospital?: Prompt[];
  promptsCaiNghien?: Prompt[];
  records?: RegRecord[];
  votesData?: Record<string, number>;
  onImportBackup?: (backupData: {
    settings: Settings;
    genres: Genre[];
    prompts: Prompt[];
    records: RegRecord[];
    votes?: Record<string, number>;
  }) => Promise<void>;
  isOfflineMode?: boolean;

  // Quiz Mode Props
  questions?: QuizQuestion[];
  onUpdateQuestions?: (newQuestions: QuizQuestion[]) => void;
  onTestExam?: () => void;
}

type TabType = "categories" | "quiz" | "backgrounds" | "music" | "links" | "backup" | "account";

export default function SettingsModal({
  isOpen,
  onClose,
  genres,
  onAddGenre,
  onDeleteGenre,
  onUpdateGenre,
  settings,
  onSaveSettings,
  onAdminLogout,
  onResetVotes,
  
  // Backup properties Destructuring
  promptsHospital = [],
  promptsCaiNghien = [],
  records = [],
  votesData = {},
  onImportBackup,
  isOfflineMode = false,

  // Quiz Props
  questions = [],
  onUpdateQuestions,
  onTestExam,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("categories");

  // Genre States
  const [newGenreName, setNewGenreName] = useState("");
  const [newGenreIcon, setNewGenreIcon] = useState("");
  const [newGenreDescription, setNewGenreDescription] = useState("");

  // Editing genre states
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [editingGenreOriginalName, setEditingGenreOriginalName] = useState("");

  // Input states for links & music
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState(settings.discordLink || "");
  const [facebookUrl, setFacebookUrl] = useState(settings.facebookLink || "");

  // Backup & Permanent Storage State Parameters
  const [isPersisted, setIsPersisted] = useState(false);
  const [dbStats, setDbStats] = useState({ genres: 0, prompts: 0, records: 0 });

  // Lockdown confirmation state
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);

  // Query database persistence and counts upon modal display
  useEffect(() => {
    if (isOpen) {
      const checkStatus = async () => {
        const persisted = await checkStoragePersisted();
        setIsPersisted(persisted);

        // Fetch actual counts from permanent browser IndexedDB
        const idbGenres = await getFromIndexedDB<Genre[]>("genres") || [];
        const idbPrompts = await getFromIndexedDB<Prompt[]>("prompts") || [];
        const idbRecords = await getFromIndexedDB<RegRecord[]>("records") || [];
        
        setDbStats({
          genres: idbGenres.length,
          prompts: idbPrompts.length,
          records: idbRecords.length,
        });
      };
      checkStatus().catch(console.error);
    }
  }, [isOpen, activeTab]);

  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      alert("✅ Hệ thống trình duyệt đã kích hoạt chế độ Sao lưu Bền vững thành công! Toàn bộ bệnh án sẽ không bao giờ bị dọn dẹp ngẫu nhiên.");
    } else {
      alert("⚠️ Trình duyệt từ chối hoặc không cần cấp quyền bổ sung. Dữ liệu vẫn được lưu trữ bình thường!");
    }
  };

  // Tabs navigation ref and scroll helpers for PC/Mobile
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabsScroll = () => {
    const el = tabsContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }
  };

  useEffect(() => {
    checkTabsScroll();
    window.addEventListener("resize", checkTabsScroll);
    return () => window.removeEventListener("resize", checkTabsScroll);
  }, [isOpen]);

  const handleScrollTabs = (direction: "left" | "right") => {
    const el = tabsContainerRef.current;
    if (el) {
      const scrollAmount = 240;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkTabsScroll, 300);
    }
  };

  // Enable mouse wheel horizontal scrolling on PC
  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabsContainerRef.current;
    if (el && e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      checkTabsScroll();
    }
  };

  // Local state for music display name to prevent IME (Vietnamese typing) focus loss / composition problems
  const [localMusicName, setLocalMusicName] = useState(
    settings.musicName || "",
  );

  // Synchronize local state with settings props when it changes
  useEffect(() => {
    setLocalMusicName(settings.musicName || "");
  }, [settings.musicName]);

  // Synchronize discordUrl and facebookUrl when settings props load/change
  useEffect(() => {
    setDiscordUrl(settings.discordLink || "");
    setFacebookUrl(settings.facebookLink || "");
  }, [settings.discordLink, settings.facebookLink]);

  // Local state for QR code configurations to prevent IME typing focus loss
  const [localQrTitle, setLocalQrTitle] = useState(
    settings.qrCodeTitle || "Quỹ Tiếp Tế Viện Cố Thị",
  );
  const [localQrNote, setLocalQrNote] = useState(
    settings.qrCodeNote || "",
  );
  const [qrUrlInput, setQrUrlInput] = useState("");

  useEffect(() => {
    setLocalQrTitle(settings.qrCodeTitle || "Quỹ Tiếp Tế Viện Cố Thị");
    setLocalQrNote(settings.qrCodeNote || "");
  }, [settings.qrCodeTitle, settings.qrCodeNote]);

  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressQrImageFile(file);
        onSaveSettings("qrCodeImage", compressedBase64);
        onSaveSettings("qrCodeFileName", file.name);
      } catch (err) {
        console.warn("Lỗi nén ảnh QR, sử dụng đọc trực tiếp:", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            onSaveSettings("qrCodeImage", event.target.result as string);
            onSaveSettings("qrCodeFileName", file.name);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  if (!isOpen) return null;

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    key: "welcomeBgImage" | "hospitalBgImage" | "cainhienBgImage",
    labelKey: "welcomeBgFileName" | "hospitalBgFileName" | "cainhienBgFileName",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImageFile(file, {
          maxWidth: 1600,
          maxHeight: 1000,
          quality: 0.75,
        });
        onSaveSettings(key, compressedBase64);
        onSaveSettings(labelKey, file.name);
      } catch (err) {
        console.warn("Lỗi nén ảnh hình nền, sử dụng đọc trực tiếp:", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            onSaveSettings(key, event.target.result as string);
            onSaveSettings(labelKey, file.name);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          try {
            onSaveSettings("musicData", event.target.result as string);
            onSaveSettings("musicUrl", ""); // Clear track URL when uploading raw data

            const isDefaultOrEmpty =
              !localMusicName.trim() ||
              localMusicName === "CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu" ||
              localMusicName.startsWith("http") ||
              localMusicName.startsWith("Mẫu nhạc trực tiếp:") ||
              localMusicName.startsWith("Nhạc liên kết:");

            const finalName = isDefaultOrEmpty
              ? file.name
              : localMusicName.trim();
            onSaveSettings("musicName", finalName);
            setLocalMusicName(finalName);
          } catch (error) {
            alert(
              "⚠️ Trình duyệt báo không đủ bộ nhớ để lưu bài hát chất lượng quá cao. Hãy dùng bài hát dung lượng nhỏ hơn hoặc dán liên kết âm nhạc!",
            );
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGenre = async () => {
    if (!newGenreName.trim()) {
      alert("⚠️ Vui lòng điền vào Tên Khoa Bệnh!");
      return;
    }
    const name = newGenreName.trim();
    const icon = newGenreIcon.trim() || "🏨";
    const description = newGenreDescription.trim();

    if (editingGenre && onUpdateGenre) {
      await onUpdateGenre(editingGenreOriginalName, name, icon, description);
      // Clear editing state
      setEditingGenre(null);
      setEditingGenreOriginalName("");
    } else {
      onAddGenre(name, icon, description);
    }
    setNewGenreName("");
    setNewGenreIcon("");
    setNewGenreDescription("");
  };

  const handleStartEdit = (g: Genre) => {
    setEditingGenre(g);
    setEditingGenreOriginalName(g.name);
    setNewGenreName(g.name);
    setNewGenreIcon(g.icon || "🏨");
    setNewGenreDescription(g.description || "");
  };

  const handleCancelEdit = () => {
    setEditingGenre(null);
    setEditingGenreOriginalName("");
    setNewGenreName("");
    setNewGenreIcon("");
    setNewGenreDescription("");
  };

  const handleSaveLinks = () => {
    onSaveSettings("discordLink", discordUrl);
    onSaveSettings("facebookLink", facebookUrl);
    alert("✅ Đã lưu liên kết chính thức thành công!");
  };

  const handleSaveYoutube = () => {
    if (!youtubeUrl.trim()) return;
    onSaveSettings("musicUrl", youtubeUrl.trim());
    onSaveSettings("musicData", ""); // Clear base64 data when setting custom URL stream

    const isDefaultOrEmpty =
      !localMusicName.trim() ||
      localMusicName === "CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu" ||
      localMusicName.startsWith("http") ||
      localMusicName.startsWith("Mẫu nhạc trực tiếp:") ||
      localMusicName.startsWith("Nhạc liên kết:");

    const finalName = isDefaultOrEmpty
      ? "Nhạc liên kết: " + youtubeUrl.trim()
      : localMusicName.trim();
    onSaveSettings("musicName", finalName);
    setLocalMusicName(finalName);
    setYoutubeUrl("");
    alert("✅ Đã dán liên kết nhạc thành công!");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4 animate-premium-backdrop">
      <div className="bg-[var(--card)] text-[var(--text)] rounded-3xl p-6 w-full max-w-[800px] shadow-2xl max-h-[92vh] flex flex-col justify-between overflow-hidden border border-[var(--border)] animate-premium-modal">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
          <span className="text-xl font-bold font-comfortaa text-[var(--primary)] flex items-center gap-1.5 animate-pulse">
            ⚙️ Cấu Hình Hệ Thống Trại
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Bar with Smooth Navigation Controls & Wheel Scroll for PC/Mobile */}
        <div className="relative my-3.5 group/tabs flex items-center">
          {/* Scroll Left Button (PC & Mobile helper) */}
          <button
            type="button"
            onClick={() => handleScrollTabs("left")}
            className={`absolute left-0 z-20 h-9 w-7 bg-gradient-to-r from-[var(--bg2)] via-[var(--bg2)]/95 to-transparent text-[var(--primary)] hover:text-white rounded-l-xl flex items-center justify-start pl-0.5 transition-all duration-200 cursor-pointer ${canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4 drop-shadow" />
          </button>

          {/* Scrollable Tabs List */}
          <div 
            ref={tabsContainerRef}
            onScroll={checkTabsScroll}
            onWheel={handleTabsWheel}
            className="w-full flex gap-1.5 bg-[var(--bg2)] p-1.5 rounded-xl sm:rounded-2xl overflow-x-auto overflow-y-hidden items-center h-12 shrink-0 border border-white/10 shadow-inner scroll-smooth cursor-grab active:cursor-grabbing"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "var(--border) transparent",
            }}
          >
            <button
              onClick={() => setActiveTab("categories")}
              className={`whitespace-nowrap shrink-0 flex-1 min-w-max px-4 py-2 text-xs font-bold font-sans rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 ${activeTab === "categories" ? "bg-[var(--primary)] text-[var(--bg2)] shadow-md transform scale-[1.02]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
            >
              🗂️ Khoa Điều Trị
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`whitespace-nowrap shrink-0 flex-1 min-w-max px-4 py-2 text-xs font-bold font-sans rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 ${activeTab === "quiz" ? "bg-[var(--primary)] text-[var(--bg2)] shadow-md transform scale-[1.02]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
            >
              🧠 Chế Độ Giải Đề
            </button>
            <button
              onClick={() => setActiveTab("backgrounds")}
              className={`whitespace-nowrap shrink-0 flex-1 min-w-max px-4 py-2 text-xs font-bold font-sans rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 ${activeTab === "backgrounds" ? "bg-[var(--primary)] text-[var(--bg2)] shadow-md transform scale-[1.02]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
            >
              🖼️ Hình Nền
            </button>
            <button
              onClick={() => setActiveTab("music")}
              className={`whitespace-nowrap shrink-0 flex-1 min-w-max px-4 py-2 text-xs font-bold font-sans rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 ${activeTab === "music" ? "bg-[var(--primary)] text-[var(--bg2)] shadow-md transform scale-[1.02]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
            >
              🎵 Nhạc Nền
            </button>
            <button
              onClick={() => setActiveTab("links")}
              className={`whitespace-nowrap shrink-0 flex-1 min-w-max px-4 py-2 text-xs font-bold font-sans rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 ${activeTab === "links" ? "bg-[var(--primary)] text-[var(--bg2)] shadow-md transform scale-[1.02]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
            >
              🔗 Liên Kết
            </button>
            <button
              onClick={() => setActiveTab("backup")}
              className={`whitespace-nowrap shrink-0 flex-1 min-w-max px-4 py-2 text-xs font-bold font-sans rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 ${activeTab === "backup" ? "bg-[var(--primary)] text-[var(--bg2)] shadow-md transform scale-[1.02]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
            >
              📂 Sao Lưu & Khôi Phục
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`whitespace-nowrap shrink-0 flex-1 min-w-max px-4 py-2 text-xs font-bold font-sans rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 ${activeTab === "account" ? "bg-[var(--primary)] text-[var(--bg2)] shadow-md transform scale-[1.02]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
            >
              👤 Tài Khoản
            </button>
          </div>

          {/* Scroll Right Button (PC & Mobile helper) */}
          <button
            type="button"
            onClick={() => handleScrollTabs("right")}
            className={`absolute right-0 z-20 h-9 w-7 bg-gradient-to-l from-[var(--bg2)] via-[var(--bg2)]/95 to-transparent text-[var(--primary)] hover:text-white rounded-r-xl flex items-center justify-end pr-0.5 transition-all duration-200 cursor-pointer ${canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4 drop-shadow" />
          </button>
        </div>

        {/* Scrollable Panel Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: CATEGORIES */}
          {activeTab === "categories" && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                      Tên khoa mới
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập tên khoa mới..."
                      value={newGenreName || ""}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750 dark:text-slate-250 uppercase tracking-wide block">
                      Sticker emoji
                    </label>
                    <input
                      type="text"
                      placeholder="🏷️"
                      maxLength={4}
                      value={newGenreIcon || ""}
                      onChange={(e) => setNewGenreIcon(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-center placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-750 dark:text-slate-250 uppercase tracking-wide block">
                    Mô tả về khoa
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả tóm tắt..."
                    value={newGenreDescription || ""}
                    onChange={(e) => setNewGenreDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs resize-none focus:ring-1 focus:ring-[var(--zone-primary)] py-2"
                  />
                </div>

                <div className="flex justify-end pt-1 gap-2">
                  {editingGenre && (
                    <button
                      onClick={handleCancelEdit}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 hover:scale-[1.02] active:scale-95"
                    >
                      Hủy bỏ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveGenre}
                    className="bg-[var(--zone-primary)] hover:bg-[var(--zone-primary-light)] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95"
                  >
                    <FolderPlus className="w-4 h-4" />{" "}
                    {editingGenre ? "Lưu thay đổi" : "Khởi tạo chuyên khoa"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                  Khoa bệnh hiện hành
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-700/55 rounded-xl bg-slate-50/20 dark:bg-slate-900/10">
                  {genres.length === 0 && (
                    <span className="text-xs text-slate-400 italic py-1 col-span-full text-center">
                      Chưa có khoa bệnh nào được ghi nhận.
                    </span>
                  )}
                  {genres.map((g) => (
                    <div
                      key={g.name}
                      title={`${g.name}${g.description ? `: ${g.description}` : ""}`}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs hover:border-[var(--zone-primary)] shadow-sm hover:shadow transition-all group min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm shrink-0 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-100 dark:border-slate-800">{g.icon || "🏨"}</span>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100 truncate w-full">
                            {g.name}
                          </span>
                          {g.description && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate w-full mt-0.5">
                              {g.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 items-center border-l border-slate-100 dark:border-slate-800 pl-1.5 ml-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(g)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                          title="Sửa chuyên khoa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGenre(g.name)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition"
                          title="Xóa chuyên khoa"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: QUIZ EXAM MODE */}
          {activeTab === "quiz" && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">
              <QuizManagerTab
                settings={settings}
                onUpdateSettings={(newPartial) => {
                  Object.entries(newPartial).forEach(([k, v]) => {
                    onSaveSettings(k as keyof Settings, v);
                  });
                }}
                questions={questions}
                onUpdateQuestions={onUpdateQuestions || (() => {})}
                onTestExam={onTestExam || (() => {})}
              />
            </div>
          )}

          {/* TAB 2: BACKGROUND WALPAPERS */}
          {activeTab === "backgrounds" && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">
              {/* Welcome BG */}
              <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  🌄 Hình nền trang Chào Mừng:
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="welcome-bg-file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageUpload(
                        e,
                        "welcomeBgImage",
                        "welcomeBgFileName",
                      )
                    }
                    className="hidden"
                  />
                  <button
                    onClick={() =>
                      document.getElementById("welcome-bg-file")?.click()
                    }
                    className="px-4 py-1.5 bg-[var(--zone-primary)] text-white text-xs font-bold rounded-xl hover:opacity-90 shadow cursor-pointer"
                  >
                    Chọn hình ảnh
                  </button>
                  <span className="text-xs text-slate-400 italic truncate max-w-[150px]">
                    {settings.welcomeBgFileName || "Chưa đổi hình nền"}
                  </span>
                  {settings.welcomeBgImage && (
                    <button
                      onClick={() => {
                        onSaveSettings("welcomeBgImage", "");
                        onSaveSettings("welcomeBgFileName", "");
                      }}
                      className="ml-auto p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              {/* Cainhien BG */}
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  🌲 Hình nền Viện Tâm Thần:
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="cainhien-bg-file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageUpload(
                        e,
                        "cainhienBgImage",
                        "cainhienBgFileName",
                      )
                    }
                    className="hidden"
                  />
                  <button
                    onClick={() =>
                      document.getElementById("cainhien-bg-file")?.click()
                    }
                    className="px-4 py-1.5 bg-[var(--zone-primary)] text-white text-xs font-bold rounded-xl hover:opacity-90 shadow cursor-pointer"
                  >
                    Chọn hình ảnh
                  </button>
                  <span className="text-xs text-slate-400 dark:text-slate-400 italic truncate max-w-[150px]">
                    {settings.cainhienBgFileName || "Chưa đổi hình nền"}
                  </span>
                  {settings.cainhienBgImage && (
                    <button
                      onClick={() => {
                        onSaveSettings("cainhienBgImage", "");
                        onSaveSettings("cainhienBgFileName", "");
                      }}
                      className="ml-auto p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer transition text-xs font-semibold"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              {/* QR Code Configuration Section (Ngay dưới mục thay hình nền) */}
              <div className="p-4 sm:p-5 border border-purple-500/30 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-indigo-950/40 space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#051F45] border border-[#F2C4CD]/30 flex items-center justify-center">
                      <QrCode className="w-4 h-4 text-[#F2C4CD]" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider block font-comfortaa">
                        📱 Cài Đặt Mã QR (Nút Nổi Ngoài Web)
                      </span>
                      <span className="text-[11px] text-purple-300/80">
                        Hiển thị nút QR nổi góc để người dùng quét ủng hộ, tham gia nhóm hoặc liên hệ
                      </span>
                    </div>
                  </div>

                  {/* Toggle ON/OFF Switch */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.qrCodeEnabled !== false}
                      onChange={(e) => onSaveSettings("qrCodeEnabled", e.target.checked)}
                      className="sr-only peer"
                      id="toggle-qr-code-enabled"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Upload or Link QR Image */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pt-1">
                  {/* Left: Preview */}
                  <div className="flex flex-col items-center justify-center p-3 bg-black/40 border border-purple-500/20 rounded-xl space-y-2">
                    {settings.qrCodeImage ? (
                      <div className="relative group/preview w-28 h-28 bg-white p-1.5 rounded-xl shadow border border-purple-300/40 flex items-center justify-center">
                        <img
                          src={settings.qrCodeImage}
                          alt="QR Preview"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-28 h-28 border-2 border-dashed border-purple-500/30 rounded-xl flex flex-col items-center justify-center text-purple-400/50 text-[10px] text-center p-2">
                        <QrCode className="w-8 h-8 mb-1 opacity-60" />
                        <span>Chưa có ảnh</span>
                      </div>
                    )}
                    <span className="text-[10px] text-purple-200/60 italic truncate max-w-[120px]">
                      {settings.qrCodeFileName || "Chưa tải ảnh QR"}
                    </span>
                  </div>

                  {/* Right: Upload Controls & Title & Note */}
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        id="qr-code-file-input"
                        accept="image/*"
                        onChange={handleQrImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById("qr-code-file-input")?.click()}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải ảnh QR từ máy</span>
                      </button>

                      {settings.qrCodeImage && (
                        <button
                          type="button"
                          onClick={() => {
                            onSaveSettings("qrCodeImage", "");
                            onSaveSettings("qrCodeFileName", "");
                          }}
                          className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold rounded-xl cursor-pointer transition"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>

                    {/* Dán Link Ảnh QR trực tiếp */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Hoặc dán liên kết URL ảnh QR trực tiếp..."
                        value={qrUrlInput}
                        onChange={(e) => setQrUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-black/40 border border-slate-700 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!qrUrlInput.trim()) return;
                          onSaveSettings("qrCodeImage", qrUrlInput.trim());
                          onSaveSettings("qrCodeFileName", "Link ảnh URL");
                          setQrUrlInput("");
                          alert("✅ Đã cập nhật ảnh mã QR từ liên kết!");
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600 cursor-pointer transition"
                      >
                        Dán
                      </button>
                    </div>

                    {/* Tiêu đề mã QR */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        🏷️ Tiêu đề mã QR (Tên hiển thị khi rê chuột & tiêu đề pop-up):
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Quỹ Tiếp Tế Viện Cố Thị, Group Giao Lưu..."
                        value={localQrTitle}
                        onChange={(e) => setLocalQrTitle(e.target.value)}
                        onBlur={() => onSaveSettings("qrCodeTitle", localQrTitle.trim())}
                        className="w-full px-3 py-2 bg-black/40 border border-slate-700 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-500"
                      />
                    </div>

                    {/* Lời nhắn / Ghi chú */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        📝 Ghi chú / Lời nhắn nội dung bên dưới mã QR:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ví dụ: Mọi sự ủng hộ của bé sẽ giúp các anh điều dưỡng có thêm kinh phí duy trì máy chủ... (kèm STK, lời dặn...)"
                        value={localQrNote}
                        onChange={(e) => setLocalQrNote(e.target.value)}
                        onBlur={() => onSaveSettings("qrCodeNote", localQrNote.trim())}
                        className="w-full px-3 py-2 bg-black/40 border border-slate-700 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-500 resize-none font-sans"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUND AUDIO MUSIC */}
          {activeTab === "music" && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">
              {/* Status Indicator of Active Music */}
              <div className="p-4 border border-[var(--border)] rounded-xl bg-[var(--bg2)]/60 space-y-2">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  🎵 Nhạc Nền Hiện Tại:
                </span>
                <div className="flex items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-[var(--border)]/60">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-lg">🎼</span>
                    <span className="text-xs font-extrabold text-[var(--primary)] truncate">
                      {settings.musicName || "CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu"}
                    </span>
                  </div>
                  {(settings.musicData || settings.musicUrl) && (
                    <button
                      onClick={() => {
                        onSaveSettings("musicData", "");
                        onSaveSettings("musicUrl", "");
                        onSaveSettings(
                          "musicName",
                          "CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu",
                        );
                        setLocalMusicName("CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu");
                        alert(
                          "🗑️ Đã gỡ bỏ nhạc tự chọn và khôi phục Nhạc Nền Mặc Định!",
                        );
                      }}
                      className="whitespace-nowrap px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-900 text-rose-100 font-extrabold text-[10px] rounded-lg cursor-pointer transition shadow"
                    >
                      Quay Về Mặc Định (Gỡ)
                    </button>
                  )}
                </div>
              </div>

              {/* Display Name Customizer */}
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  ✏️ Tên hiển thị bài hát:
                </span>
                <input
                  type="text"
                  placeholder="Nhập tên bài hát theo ý thích..."
                  value={localMusicName || ""}
                  onChange={(e) => {
                    setLocalMusicName(e.target.value);
                  }}
                  onBlur={() => {
                    if (
                      localMusicName.trim() &&
                      localMusicName !== settings.musicName
                    ) {
                      onSaveSettings("musicName", localMusicName.trim());
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  * Nhập tên hiển thị tại đây trước hoặc sau khi tải file/dán
                  link để giữ tên nhạc theo ý thích của bạn.
                </p>
              </div>

              {/* Method A: Upload MP3 */}
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  📂 Phương thức 1: Tải bài hát trực tiếp (.mp3, .wav):
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="audio-uploader"
                    accept="audio/*"
                    onChange={handleMusicUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() =>
                      document.getElementById("audio-uploader")?.click()
                    }
                    className="px-4 py-1.5 bg-[var(--zone-primary)] text-white text-xs font-bold rounded-xl hover:opacity-90 shadow cursor-pointer"
                  >
                    Tải File Âm Thanh
                  </button>
                  <span className="text-xs text-slate-400 dark:text-slate-400 italic truncate max-w-[155px]">
                    {settings.musicData
                      ? "Đã tải lên file nhạc thành công"
                      : "Chưa tải file nhạc lên"}
                  </span>
                  {settings.musicData && (
                    <button
                      onClick={() => {
                        onSaveSettings("musicData", "");
                        if (!settings.musicUrl) {
                          onSaveSettings(
                            "musicName",
                            "CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu",
                          );
                          setLocalMusicName("CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu");
                        }
                        alert("🗑️ Đã gỡ bỏ file nhạc tự tải!");
                      }}
                      className="ml-auto px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900 text-rose-200 font-bold text-[10px] rounded-lg cursor-pointer transition"
                    >
                      Gỡ File
                    </button>
                  )}
                </div>
              </div>

              {/* Method B: YouTube link url */}
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  🔗 Phương thức 2: Chèn URL nguồn phát nhạc (YouTube/Direct
                  audio...):
                </span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://youtube.com/... hoặc link âm thanh"
                    value={youtubeUrl || ""}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                  />
                  <button
                    onClick={handleSaveYoutube}
                    className="bg-[var(--zone-primary)] hover:bg-[var(--zone-primary-light)] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow hover:scale-105 active:scale-95"
                  >
                    Dán Link
                  </button>
                </div>
                {settings.musicUrl && (
                  <div className="flex items-center justify-between p-2.5 bg-black/20 border border-[var(--border)]/30 rounded-xl text-xs">
                    <span className="text-slate-400 italic truncate max-w-[200px]">
                      Link: {settings.musicUrl}
                    </span>
                    <button
                      onClick={() => {
                        onSaveSettings("musicUrl", "");
                        if (!settings.musicData) {
                          onSaveSettings(
                            "musicName",
                            "CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu",
                          );
                          setLocalMusicName("CHÚ ĐẠI BI (VÔ LƯỢNG) - Masew, Khoi Vu");
                        }
                        alert("🗑️ Đã gỡ bỏ liên kết âm nhạc!");
                      }}
                      className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900 text-rose-200 font-bold text-[10px] rounded-lg cursor-pointer transition"
                    >
                      Gỡ Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SOCIAL CONNECTIONS */}
          {activeTab === "links" && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    💬 Cổng liên kết Discord
                  </label>
                  <input
                    type="url"
                    placeholder="https://discord.gg/..."
                    value={discordUrl || ""}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    👍 Cổng liên kết fanpage Facebook
                  </label>
                  <input
                    type="url"
                    placeholder="https://facebook.com/..."
                    value={facebookUrl || ""}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                  />
                </div>

                <div className="pt-2 text-right">
                  <button
                    onClick={handleSaveLinks}
                    className="bg-[var(--zone-primary)] hover:bg-[var(--zone-primary-light)] text-white text-xs font-bold px-6 py-2 rounded-xl transition cursor-pointer shadow hover:scale-105 active:scale-95"
                  >
                    💾 Lưu liên kết
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BACKUP & RECOVERY */}
          {activeTab === "backup" && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">
              {/* Part 1: persistent storage capability */}
              <div className="p-4 border border-slate-200 dark:border-slate-805 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold text-slate-850 dark:text-slate-100 font-sans">
                      Bảo Mật Lưu Trữ Trình Duyệt
                    </span>
                  </div>
                  {isPersisted ? (
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-emerald-950 text-emerald-200 border border-emerald-800 rounded-full select-none">
                      🔒 ĐÃ KIÊN CỐ (PERSISTENT)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-950 text-amber-200 border border-amber-800 rounded-full select-none">
                      🔓 TẠM THỜI (TRANSIENT)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Thiết bị của bé khi sắp hết bộ nhớ có thể tự dọn dẹp LocalStorage/IndexedDB ngẫu nhiên. Hãy kích hoạt chế độ <strong>"Sao Lưu Kiên Cố"</strong> bên dưới để yêu cầu trình duyệt giữ vĩnh viễn dữ liệu hồ sơ bệnh án của Viện.
                </p>
                {!isPersisted && (
                  <button
                    onClick={handleRequestPersistence}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition duration-200 cursor-pointer shadow hover:scale-[1.01]"
                  >
                    🔒 Kích Hoạt Chế Độ Sao Lưu Kiên Cố Vĩnh Viễn
                  </button>
                )}
              </div>

              {/* Part 2: Browser counts info */}
              <div className="p-4 border border-[var(--border)] rounded-2xl bg-[var(--bg2)]/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[var(--primary)]" />
                  <span className="text-sm font-bold text-slate-850 dark:text-slate-100 font-sans">
                    Thống Kê Sao Lưu Trình Duyệt (IndexedDB & LocalStorage)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-black/35 rounded-xl border border-[var(--border)]/70 text-center">
                    <div className="text-lg font-black text-[var(--primary)]">{Math.max(dbStats.genres, genres.length)}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Chuyên khoa</div>
                  </div>
                  <div className="p-3 bg-black/35 rounded-xl border border-[var(--border)]/70 text-center">
                    <div className="text-lg font-black text-purple-400">
                      {Math.max(dbStats.prompts, promptsHospital.length + promptsCaiNghien.length)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Bệnh án khoa</div>
                  </div>
                  <div className="p-3 bg-black/35 rounded-xl border border-[var(--border)]/70 text-center">
                    <div className="text-lg font-black text-amber-400">{Math.max(dbStats.records, records.length)}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Sổ Chẩn trị</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic leading-normal">
                  * Mỗi khi bé thêm chuyên khoa, sửa bài nhạc nền, lưu bệnh án hay bổ sung hồ sơ chẩn đoán, dữ liệu sẽ tự động sao lưu song song (LocalStorage + IndexedDB). Cả khi đám mây bị hết hạn ngạch ngày, dữ liệu vẫn an toàn trên thiết bị này!
                </p>
              </div>

              {/* Part 3: Manual Export File & Import file */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                <div className="flex items-center gap-2 text-rose-450 font-comfortaa">
                   <span>📂</span>
                   <span className="text-sm font-extrabold text-[var(--primary)] font-sans">Xuất/Nhập Bản Sao lưu Tệp Tin Thủ Công</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Để bảo vệ tuyệt đối bản chẩn đoán, tránh trường hợp bé gỡ cài đặt trình duyệt hoặc đổi thiết bị mới, hãy tải tệp backup (.json) này về máy và khôi phục khi cần thiết.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Export Trigger */}
                  <button
                    onClick={() => {
                      try {
                        const packageToBackup = {
                          settings,
                          genres,
                          prompts: [...promptsHospital, ...promptsCaiNghien],
                          records,
                          votes: votesData
                        };
                        const blob = new Blob([JSON.stringify(packageToBackup, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        const dateFormatted = new Date().toLocaleDateString("vi-VN").replace(/\//g, "-");
                        link.download = `cothi_vien_tam_than_backup_${dateFormatted}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        alert("📥 Đã tải xuống tệp sao lưu bệnh viện thành công! Hãy cất giữ tệp này ở nơi an toàn.");
                      } catch (e: any) {
                        alert("Lỗi xuất tệp: " + e.message);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--zone-primary)] hover:bg-[var(--zone-primary-light)] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow hover:scale-[1.01]"
                  >
                    <Download className="w-4 h-4" /> Tải Xuất Bản Sao (.JSON)
                  </button>

                  {/* Import Trigger */}
                  <div className="relative">
                    <input
                      type="file"
                      id="cothi-backup-file-importer"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const content = event.target?.result as string;
                            const parsed = JSON.parse(content);
                            if (!parsed.settings || !parsed.genres || !parsed.prompts || !parsed.records) {
                              throw new Error("Tệp sao lưu thiếu cấu trúc chuẩn của Viện Tâm Thần Cố Thị.");
                            }
                            if (onImportBackup) {
                              await onImportBackup(parsed);
                            }
                          } catch (err: any) {
                            alert("❌ Tệp không hợp lệ hoặc bị hỏng: " + (err.message || err));
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => {
                        if (confirm("⚠️ Chú ý: Việc nạp tệp sao lưu sẽ ghi đè toàn bộ bệnh án và thiết lập hiện hành của bé trên máy này. Bé có chắc chắn muốn tiến hành?")) {
                          document.getElementById("cothi-backup-file-importer")?.click();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg2)] text-[var(--text)] hover:text-white hover:bg-[var(--bg)] text-xs font-bold rounded-xl transition cursor-pointer border border-[var(--border)] hover:scale-[1.01]"
                    >
                      <Upload className="w-4 h-4" /> Nạp Nhập Bản Sao (.JSON)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACCOUNT */}
          {activeTab === "account" && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">
              {/* Part 1: Admin Profile Card */}
              <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 text-[var(--zone-primary)] flex items-center justify-center mx-auto shadow-inner border border-slate-200/50 dark:border-slate-750">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Bác Sĩ Trưởng Ban
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Quyền hạn: Chánh văn phòng Admin
                  </p>
                </div>
                <div className="pt-2 flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      if (onResetVotes) {
                        onResetVotes();
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 shadow hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🔄 Reset tất cả lượt vote
                  </button>
                  <button
                    onClick={() => {
                      if (onAdminLogout) {
                        onAdminLogout();
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 shadow hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Đăng Xuất Admin
                  </button>
                </div>
              </div>

              {/* Part 2: Site Lockdown / "Đóng Cửa" Section */}
              <div className="p-5 border-2 border-rose-500/30 rounded-2xl bg-gradient-to-b from-rose-950/20 via-slate-900/40 to-slate-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${settings.isSiteClosed ? 'bg-rose-500/20 text-rose-450 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
                      {settings.isSiteClosed ? <DoorClosed className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        Công Tắc "Đóng Cửa" (Khóa Toàn Viện)
                        {settings.isSiteClosed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                            🔴 Đang Đóng Cửa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🟢 Đang Mở Cửa
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {settings.isSiteClosed
                          ? "Toàn bộ người dùng đang bị khóa ngoài với thông báo đào tạo lại."
                          : "Người dùng và bệnh nhân có thể tự do truy cập bình thường."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-black/40 rounded-xl border border-rose-500/20 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    Cơ chế hoạt động khi kích hoạt "Đóng Cửa":
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
                    <li>Toàn bộ người dùng trên web lập tức bị thoát ra màn hình khóa với hiệu ứng cánh lông vũ rơi.</li>
                    <li>Hiển thị thông báo: <em>"Bảo bối à, đã đến giờ Viện trưởng dẫn các bác sĩ đi đào tạo lại. Bé yêu quay lại sau nhé~"</em></li>
                    <li>Trạng thái lưu trữ đồng bộ (LocalStorage & Đám mây Firestore), không bị mất khi F5 tải lại trang.</li>
                    <li>Chỉ có Admin đăng nhập mới vào được hệ thống để mở cửa trở lại.</li>
                  </ul>
                </div>

                <button
                  type="button"
                  id="btn-toggle-site-lockdown"
                  onClick={() => setShowLockConfirmModal(true)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg hover:scale-[1.01] active:scale-[0.99] ${
                    settings.isSiteClosed
                      ? "bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-emerald-100 border border-emerald-400/40"
                      : "bg-gradient-to-r from-rose-700 to-pink-800 hover:from-rose-600 hover:to-pink-700 text-rose-100 border border-rose-400/40"
                  }`}
                >
                  {settings.isSiteClosed ? (
                    <>
                      <Unlock className="w-4 h-4" /> Mở Cửa Trở Lại (Mở Khóa Toàn Web)
                    </>
                  ) : (
                    <>
                      <DoorClosed className="w-4 h-4" /> Đóng Cửa Viện (Khóa Toàn Bộ Web)
                    </>
                  )}
                </button>
              </div>

              {/* Safety Confirmation Modal for Lockdown */}
              {showLockConfirmModal && (
                <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
                  <div className="bg-slate-900 border-2 border-rose-500/40 rounded-3xl p-6 max-w-[400px] w-full text-center shadow-2xl space-y-4 animate-[scale-in_0.2s_ease-out]">
                    <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-500/30 flex items-center justify-center mx-auto text-2xl">
                      {settings.isSiteClosed ? "✨" : "🚪"}
                    </div>
                    
                    <h3 className="font-cabinet text-base font-bold text-slate-100">
                      {settings.isSiteClosed
                        ? "Xác nhận Mở Cửa lại Viện?"
                        : "Xác nhận Đóng Cửa toàn bộ Viện?"}
                    </h3>
                    
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {settings.isSiteClosed
                        ? "Bé có chắc chắn muốn mở cửa trở lại? Toàn bộ bệnh nhân và người dùng sẽ có thể truy cập lại trang chính bình thường."
                        : "Sau khi bấm xác nhận, toàn bộ người dùng đang dùng web sẽ bị khóa lại với thông báo đào tạo và hiệu ứng lông vũ rơi. Bé có chắc chắn không vô tình bấm nhầm?"}
                    </p>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowLockConfirmModal(false)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer border border-slate-700"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="button"
                        id="btn-confirm-site-lockdown"
                        onClick={() => {
                          const nextStatus = !settings.isSiteClosed;
                          onSaveSettings("isSiteClosed", nextStatus);
                          setShowLockConfirmModal(false);
                        }}
                        className={`flex-1 py-2.5 font-bold rounded-xl text-xs transition cursor-pointer shadow-md ${
                          settings.isSiteClosed
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-rose-600 hover:bg-rose-500 text-white"
                        }`}
                      >
                        {settings.isSiteClosed ? "🔓 Xác Nhận Mở" : "🚪 Xác Nhận Đóng"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer closing button */}
        <div className="flex gap-2 pt-4 border-t border-[var(--border)] mt-4">
          <button
            onClick={onClose}
            className="w-full bg-[var(--bg2)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg)] font-bold py-2.5 rounded-xl text-xs transition cursor-pointer border border-[var(--border)]"
          >
            ✕ Đóng cấu hình
          </button>
        </div>
      </div>
    </div>
  );
}
