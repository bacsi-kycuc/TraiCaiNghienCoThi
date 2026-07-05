import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Genre, Settings, Prompt, RegRecord } from "../types";
import { 
  checkStoragePersisted, 
  requestPersistentStorage,
  getFromIndexedDB
} from "../lib/indexedDbBackup";

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
  onImportBackup?: (backupData: {
    settings: Settings;
    genres: Genre[];
    prompts: Prompt[];
    records: RegRecord[];
  }) => Promise<void>;
  isOfflineMode?: boolean;
}

type TabType = "categories" | "backgrounds" | "music" | "links" | "backup" | "account";

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
  onImportBackup,
  isOfflineMode = false,
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

  // Local state for music display name to prevent IME (Vietnamese typing) focus loss / composition problems
  const [localMusicName, setLocalMusicName] = useState(
    settings.musicName || "",
  );

  // Synchronize local state with settings props when it changes
  useEffect(() => {
    setLocalMusicName(settings.musicName || "");
  }, [settings.musicName]);

  if (!isOpen) return null;

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: "welcomeBgImage" | "hospitalBgImage" | "cainhienBgImage",
    labelKey: "welcomeBgFileName" | "hospitalBgFileName" | "cainhienBgFileName",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onSaveSettings(key, event.target.result as string);
          onSaveSettings(labelKey, file.name);
        }
      };
      reader.readAsDataURL(file);
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
              localMusicName === "Lullaby of Co Thi (Mặc định)" ||
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
      localMusicName === "Lullaby of Co Thi (Mặc định)" ||
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

        {/* Tab Selection */}
        <div 
          className="flex gap-1.5 bg-[var(--bg2)] p-1 rounded-xl sm:rounded-2xl my-4 overflow-x-auto overflow-y-hidden scrollbar-hide items-center h-12 shrink-0 border border-white/5 shadow-inner"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <button
            onClick={() => setActiveTab("categories")}
            className={`whitespace-nowrap shrink-0 flex-1 min-w-max px-4 py-2 text-xs font-bold font-sans rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 ${activeTab === "categories" ? "bg-[var(--primary)] text-[var(--bg2)] shadow-md transform scale-[1.02]" : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}`}
          >
            🗂️ Khoa Điều Trị
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
                      {settings.musicName || "Lullaby of Co Thi (Mặc định)"}
                    </span>
                  </div>
                  {(settings.musicData || settings.musicUrl) && (
                    <button
                      onClick={() => {
                        onSaveSettings("musicData", "");
                        onSaveSettings("musicUrl", "");
                        onSaveSettings(
                          "musicName",
                          "Lullaby of Co Thi (Mặc định)",
                        );
                        setLocalMusicName("Lullaby of Co Thi (Mặc định)");
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
                            "Lullaby of Co Thi (Mặc định)",
                          );
                          setLocalMusicName("Lullaby of Co Thi (Mặc định)");
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
                            "Lullaby of Co Thi (Mặc định)",
                          );
                          setLocalMusicName("Lullaby of Co Thi (Mặc định)");
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
                          records
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
