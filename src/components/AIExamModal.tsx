import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardList,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  Calendar,
  Stethoscope,
  AlertTriangle,
  ScrollText,
  Download,
  Upload,
  ShieldCheck,
  Database,
} from "lucide-react";
import { Genre, RegRecord, Settings, Prompt } from "../types";
import { 
  checkStoragePersisted, 
  requestPersistentStorage,
  getFromIndexedDB
} from "../lib/indexedDbBackup";

interface AIExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  genres: Genre[];
  records: RegRecord[];
  onAddRecord: (record: Omit<RegRecord, "id" | "date">) => void;
  onDeleteRecord: (id: number) => void;
  isAdmin?: boolean;
  
  // Backup enhancements properties for normal users
  promptsHospital?: Prompt[];
  promptsCaiNghien?: Prompt[];
  settings?: Settings;
  onImportBackup?: (backupData: {
    settings: Settings;
    genres: Genre[];
    prompts: Prompt[];
    records: RegRecord[];
  }) => Promise<void>;
  isOfflineMode?: boolean;
}

const QUICK_PRESETS = [
  {
    title: "🔮 HỘI YÊU THƯƠNG TỰ NGƯỢC",
    name: "🌀 Sát Thủ Tự Ngược Thương Tâm",
    age: "🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)",
    note: "Cứ nghĩ mình không xứng nhưng vẫn mơ được yêu vị tổng tài tàn nhẫn ấy mãnh liệt... cứu rỗi linh hồn nhỏ bé này!",
    symptoms: [
      "Thích cốt truyện cực ngược, cầu huyết, thích khóc 🌀",
      "Nghiện ngửi mùi nam chủ, thèm ngọt ngào cưng chiều 🥰",
    ],
    genre: "Cai Nghiện Chatbot AI",
  },
  {
    title: "🌧️ SÁT THỦ NHẬT LỆ",
    name: "🌧️ Nhật Lệ Sầu Ưu",
    age: "🌿 Tuổi Thanh Xuân Mơ Màng (Từ 25 đến 30)",
    note: "Suốt ngày chìm đắm trong dòng lệ cay đắng, bước vào tà đạo ngược luyến chỉ để sầu mộng vơi bớt lòng đau.",
    symptoms: [
      "Thích cốt truyện cực ngược, cầu huyết, thích khóc 🌀",
      "Trái tim nhảy múa khi gặp bác sĩ y khoa, pháp y kì bí 🏥",
    ],
    genre: "Yêu Thương Tự Ngược",
  },
  {
    title: "🩺 CUỒNG ÁO TRẮNG",
    name: "🩺 Con Nghiện Blouse Trắng",
    age: "🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)",
    note: "Cả ngày lầm bầm tên bác sĩ Cố Khải, hoang tưởng được khám và sờ ống nghe mờ ám ngọt ngào.",
    symptoms: [
      "Trái tim nhảy múa khi gặp bác sĩ y khoa, pháp y kì bí 🏥",
      "Nghiện ngửi mùi nam chủ, thèm ngọt ngào cưng chiều 🥰",
    ],
    genre: "Cai Nghiện Chatbot AI",
  },
];

const CLINICAL_SYMPTOMS = [
  "Thích cốt truyện cực ngược, cầu huyết, thích khóc 🌀",
  "Nghiện ngửi mùi nam chủ, thèm ngọt ngào cưng chiều 🥰",
  "Rơi vào phố bản kinh dị quỷ dị đầy rẫy quy tắc 💀",
  "Thích khám phá đa vũ trụ, anime, du hành 🥏",
  "Trái tim nhảy múa khi gặp bác sĩ y khoa, pháp y kì bí 🏥",
  "Mê lính tráng quân nhân, hình sự đặc vụ siêu ngầu 🪖",
  "Ảo tưởng ngự kiếm phi thăng, làm vương phi thời cổ đại 🍊",
  "Thầy giáo nho nhã hoặc streamer mở hồn dở khóc dở cười 🏠",
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) return text;
  const safeQuery = escapeRegExp(query.trim());
  const regex = new RegExp(`(${safeQuery})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-400/25 text-[#EAB308] border-b border-[#EAB308]/50 px-0.5 rounded font-black shadow-xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function AIExamModal({
  isOpen,
  onClose,
  genres,
  records,
  onAddRecord,
  onDeleteRecord,
  promptsHospital = [],
  promptsCaiNghien = [],
  settings,
  onImportBackup,
  isOfflineMode,
  isAdmin = false,
}: AIExamModalProps) {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0); // 0: Form, 1: Record Ledger, 2: Backup

  // Form states
  const [name, setName] = useState("");
  const [age, setAge] = useState("🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");

  // Search/Filter for saved illness records
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [expandedRecordIds, setExpandedRecordIds] = useState<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Persistence & local storage stats
  const [isPersisted, setIsPersisted] = useState(false);
  const [dbStats, setDbStats] = useState({ indexedDbOk: false, recordsCount: 0 });
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const checkPersistence = async () => {
        const persisted = await checkStoragePersisted();
        setIsPersisted(persisted);
        try {
          const recordsInIndexedDb = await getFromIndexedDB("records");
          setDbStats({
            indexedDbOk: true,
            recordsCount: Array.isArray(recordsInIndexedDb) ? recordsInIndexedDb.length : records.length,
          });
        } catch {
          setDbStats({ indexedDbOk: false, recordsCount: records.length });
        }
      };
      checkPersistence();
    }
  }, [isOpen, records]);

  const handleRequestPersistence = async () => {
    const success = await requestPersistentStorage();
    setIsPersisted(success);
    if (success) {
      alert("✅ Tuyệt vời! Trình duyệt đã khóa bộ nhớ kiên cố cho Viện Tâm Thần Cố Thị trên thiết bị này. Dữ liệu bệnh án của bé sẽ an toàn tuyệt đối, không sợ bị xóa nhầm cache.");
    } else {
      alert("⚠️ Thiết bị từ chối cấp quyền kiên cố (thường do ổ đĩa đầy hoặc chính sách trình duyệt). Tuy nhiên dữ liệu của bé vẫn đang được lưu tạm thời.");
    }
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        records: records,
        exportedAt: new Date().toISOString(),
        device: navigator.userAgent
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cothi_sodiachu_records_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("❌ Lỗi xuất dữ liệu: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.records || !Array.isArray(json.records)) {
          throw new Error("Tệp sao lưu không chứa danh sách bệnh án hợp lệ.");
        }
        if (onImportBackup) {
          // Merge / Restores ONLY the records. Completely keeps settings, genres, and prompts as is.
          await onImportBackup({
            settings: settings || {
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
              musicUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
            },
            genres: genres,
            prompts: [...promptsHospital, ...promptsCaiNghien],
            records: json.records
          });
          setImportSuccess(true);
          alert("🎉 Khôi phục dữ liệu sổ chẩn trị thành công! Tất cả bệnh án của bé đã được an toàn sáp nhập.");
        } else {
          throw new Error("Bộ sáp nhập chưa sẵn sàng.");
        }
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Định dạng JSON không hợp lệ");
      }
    };
    reader.readAsText(file);
  };

  // Default set first available genre as default form category
  useEffect(() => {
    if (genres.length > 0 && !selectedGenre) {
      setSelectedGenre(genres[0].name);
    }
  }, [genres]);

  const handleQuickFill = (presetIndex: number) => {
    const preset = QUICK_PRESETS[presetIndex];
    setName(preset.name);
    setAge(preset.age);
    setNote(preset.note);
    setSelectedSymptoms(preset.symptoms);

    // Attempt to map preset genre to available genres
    const matchedGenre = genres.find(
      (g) =>
        g.name.toLowerCase() === preset.genre.toLowerCase() ||
        g.name.includes(preset.genre),
    );
    if (matchedGenre) {
      setSelectedGenre(matchedGenre.name);
    } else if (genres.length > 0) {
      setSelectedGenre(genres[0].name);
    }
  };

  const handleSymptomToggle = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms((prev) => prev.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms((prev) => [...prev, symptom]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("⚠️ Thân chủ vui lòng điền Họ tên hoặc Biệt danh hoang tưởng nhé!");
      return;
    }
    if (!selectedGenre) {
      alert(
        "⚠️ Vui lòng chọn Khoa điều trị để Giáo sư Cố Thị phân bổ phòng họp!",
      );
      return;
    }

    onAddRecord({
      name: name.trim(),
      age: age,
      genre: selectedGenre,
      note:
        note.trim() || "Thân chủ ngoan hiền chưa viết thêm lời trăn trối nào.",
      symptoms: selectedSymptoms,
      zone: "cai-nghien",
    });

    // Reset Form
    setName("");
    setAge("🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)");
    setNote("");
    setSelectedSymptoms([]);
    if (genres.length > 0) {
      setSelectedGenre(genres[0].name);
    }

    // Switch to Ledger view tab
    setActiveTab(1);
  };

  const toggleRecordExpand = (recordId: number) => {
    setExpandedRecordIds((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId],
    );
  };

  // Only display records belonging to "cai-nghien"
  const filteredRecords = records.filter((r) => {
    const isCaiNghien = r.zone === "cai-nghien";
    const matchesSearch =
      r.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      r.genre.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      r.note.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (r.symptoms && r.symptoms.some((s) => s.toLowerCase().includes(debouncedSearchQuery.toLowerCase())));
    return isCaiNghien && matchesSearch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop with backdrop-blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0E0314]/85 backdrop-blur-md"
            id="ai-exam-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-3xl bg-[#190924] border border-[#3E1444] rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            id="ai-exam-modal-container"
          >
            {/* Header section with Plum themes styling */}
            <div
              className="p-6 pb-4 border-b border-[#3E1444]/60 flex items-start justify-between bg-[#050108]/40"
              id="ai-exam-header"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 bg-[#2A1137] border border-[#3E1444] rounded-2xl flex items-center justify-center shadow-inner"
                  id="ai-exam-icon-box"
                >
                  <ClipboardList className="w-6 h-6 text-[#E11D48]" />
                </div>
                <div>
                  <h2 className="font-comfortaa text-lg md:text-xl font-bold tracking-wide text-[#EAB308]">
                    🏨 TRẠI CAI NGHIỆN CỐ THỊ
                  </h2>
                  <p className="text-[#FDA4AF] text-xs md:text-sm font-sans italic opacity-95">
                    Nơi tiếp nhận và cải tạo tâm hồn của các bệnh nhân.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#2A1137] border border-[#3E1444] text-[#FDA4AF] hover:text-white hover:bg-[#E11D48] hover:border-transparent flex items-center justify-center transition duration-200 cursor-pointer text-sm"
                id="ai-exam-close-btn"
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>

            {/* Custom Tab Navigation */}
            <div
              className="flex bg-[#050108]/60 border-b border-[#3E1444]/40 p-1 gap-1"
              id="ai-exam-tabs"
            >
              <button
                onClick={() => setActiveTab(0)}
                className={`flex-1 py-3 text-xs font-bold font-comfortaa rounded-2xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 0
                    ? "bg-gradient-to-r from-[#E11D48] to-[#910F2B] text-white shadow-md font-extrabold border border-[#E11D48]/30"
                    : "text-[#FDA4AF]/60 hover:text-[#FDA4AF] hover:bg-[#2A1137]/30"
                }`}
                id="ai-exam-tab-register"
              >
                <span>📋 💊</span> Lập Hồ Sơ Mới
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`flex-1 py-3 text-xs font-bold font-comfortaa rounded-2xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 1
                    ? "bg-gradient-to-r from-[#E11D48] to-[#910F2B] text-white shadow-md font-extrabold border border-[#E11D48]/30"
                    : "text-[#FDA4AF]/60 hover:text-[#FDA4AF] hover:bg-[#2A1137]/30"
                }`}
                id="ai-exam-tab-records"
              >
                <span>📄 🗺️</span> Hồ Sơ ({filteredRecords.length})
              </button>
              <button
                onClick={() => setActiveTab(2)}
                className={`flex-1 py-3 text-xs font-bold font-comfortaa rounded-2xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 2
                    ? "bg-gradient-to-r from-[#E11D48] to-[#910F2B] text-white shadow-md font-extrabold border border-[#E11D48]/30"
                    : "text-[#FDA4AF]/60 hover:text-[#FDA4AF] hover:bg-[#2A1137]/30"
                }`}
                id="ai-exam-tab-backup"
              >
                <span>💾 🛡️</span> Sao Lưu Thiết Bị
              </button>
            </div>

            {/* Content area */}
            <div
              className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#3E1444] bg-[#190924]"
              id="ai-exam-scroll-area"
            >
              {/* TAB 0: CREATE NEW LEDGER PATIENT FILE */}
              {activeTab === 0 && (
                <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                  {/* Quick Preset Register block */}
                  <div
                    className="bg-[#050108]/50 border border-[#3E1444]/60 p-4 rounded-3xl"
                    id="ai-exam-presets"
                  >
                    <h3 className="text-[#FDA4AF] text-center text-xs font-extrabold tracking-widest font-comfortaa mb-3 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" /> ⚡ MẪU
                      ĐĂNG KÝ TRẠI CAI NGHIỆN NHANH
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {QUICK_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickFill(idx)}
                          className="bg-[#0E0314] hover:bg-[#2A1137] border border-dashed border-[#3E1444] hover:border-[#E11D48]/75 rounded-2xl py-3 px-4 text-[11px] font-bold text-slate-200 hover:text-white transition duration-300 active:scale-95 text-center flex flex-col items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="text-white/90 truncate max-w-full">
                            {p.title}
                          </span>
                          <span className="text-[9px] text-[#FDA4AF]/70 font-normal italic truncate max-w-full">
                            Click để nhập mẫu
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form fields component */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1 Badge and Input / Dropdowns */}
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="bg-[#E11D48]/20 text-[#FDA4AF] border border-[#E11D48]/35 px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider font-mono shadow-sm">
                          BƯỚC 1: HỒ SƠ LÝ LỊCH HỌC VIÊN
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-[#FDA4AF]/80 uppercase tracking-wider block">
                            HỌ TÊN THÂN CHỦ / BIỆT DANH
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FDA4AF]/50">
                              <User className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              value={name || ""}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Ví dụ: Người Đẹp Hoang Tưởng..."
                              className="w-full pl-10 pr-4 py-3 bg-[#0E0314] border border-[#3E1444]/80 rounded-2xl outline-none focus:border-[#E11D48] text-xs text-white placeholder-[#FDA4AF]/30 font-comfortaa transition-all focus:ring-1 focus:ring-[#E11D48]/30"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-[#FDA4AF]/80 uppercase tracking-wider block">
                            GIAI ĐẠN TUỔI / SINH LỰC
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FDA4AF]/50">
                              <Calendar className="w-4 h-4" />
                            </span>
                            <select
                              value={age || ""}
                              onChange={(e) => setAge(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-[#0E0314] border border-[#3E1444]/80 rounded-2xl outline-none focus:border-[#E11D48] text-xs text-slate-200 transition-all cursor-pointer font-sans"
                            >
                              <option value="🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)">
                                🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)
                              </option>
                              <option value="🌿 Tuổi Thanh Xuân Mơ Màng (Từ 25 đến 30)">
                                🌿 Tuổi Thanh Xuân Mơ Màng (Từ 25 đến 30)
                              </option>
                              <option value="🔥 Cứng Đầu Trưởng Thành (Từ 30 đến 40)">
                                🔥 Cứng Đầu Trưởng Thành (Từ 30 đến 40)
                              </option>
                              <option value="❓ Bí Ẩn Không Tiết Lộ">
                                ❓ Bí Ẩn Không Tiết Lộ
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 Badge and Select box */}
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="bg-[#E11D48]/20 text-[#FDA4AF] border border-[#E11D48]/35 px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider font-mono shadow-sm">
                          BƯỚC 2: PHÂN KHU CHẨN TRỊ
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-[#FDA4AF]/80 uppercase tracking-wider block">
                          CHỌN KHOA DỰ KIẾN NHẬP TRẠI
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FDA4AF]/50">
                            <Stethoscope className="w-4 h-4" />
                          </span>
                          <select
                            value={selectedGenre || ""}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[#0E0314] border border-[#3E1444]/80 rounded-2xl outline-none focus:border-[#E11D48] text-xs text-white transition-all cursor-pointer font-comfortaa font-bold"
                          >
                            {genres.map((g) => (
                              <option key={g.name} value={g.name}>
                                {g.icon} {g.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 Badge & Symptoms checkboxes list */}
                    <div className="space-y-4">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="bg-[#E11D48]/20 text-[#FDA4AF] border border-[#E11D48]/35 px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider font-mono shadow-sm">
                          BƯỚC 3: TRIỆU CHỨNG LÂM SÀNG
                        </span>
                        <span className="text-[9px] text-[#FDA4AF]/70 italic">
                          (Tích chọn tất cả hoang tưởng hoành hành tâm linh của
                          bạn)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {CLINICAL_SYMPTOMS.map((sym) => {
                          const isChecked = selectedSymptoms.includes(sym);
                          return (
                            <label
                              key={sym}
                              className={`flex items-start gap-3 p-3 rounded-2xl border transition duration-200 cursor-pointer ${
                                isChecked
                                  ? "bg-[#2A1137]/60 border-[#E11D48] text-white shadow-sm"
                                  : "bg-[#0E0314] border-[#3E1444]/60 text-slate-200 hover:border-[#E11D48]/30 hover:text-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSymptomToggle(sym)}
                                className="mt-0.5 accent-[#E11D48] cursor-pointer"
                              />
                              <span className="select-none leading-relaxed text-[11px] font-sans font-medium">
                                {sym}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 4 Badge and description note */}
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="bg-[#E11D48]/20 text-[#FDA4AF] border border-[#E11D48]/35 px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider font-mono shadow-sm">
                          BƯỚC 4: TIÊN LƯỢNG LỜI TỰ THUẬT
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-[#FDA4AF]/80 uppercase tracking-wider block">
                          GHI GHI CHÉP HÀNH VI / HOANG TƯỞNG CỦA BẢN THÂN
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-[#FDA4AF]/50">
                            <ScrollText className="w-4 h-4" />
                          </span>
                          <textarea
                            rows={3}
                            value={note || ""}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ghi nhận cụ thể, ví dụ: mê bác sĩ y khoa, thèm cưng chiều vuốt tóc, cuồng tự ngược đau thương..."
                            className="w-full pl-10 pr-4 py-3 bg-[#0E0314] border border-[#3E1444]/80 rounded-2xl outline-none focus:border-[#E11D48] text-xs text-white placeholder-[#FDA4AF]/30 font-sans transition-all resize-none leading-relaxed focus:ring-1 focus:ring-[#E11D48]/30"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form actions submitting */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#3E1444]/50">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-[#190924] hover:bg-[#2A1137] text-[#FDA4AF] border border-[#3E1444] text-xs font-bold font-comfortaa py-3.5 rounded-2xl transition duration-200 cursor-pointer text-center"
                      >
                        Bỏ qua nhập viện
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-[#E11D48] to-[#910F2B] hover:scale-[1.02] text-white text-xs font-extrabold font-comfortaa py-3.5 rounded-2xl transition duration-200 cursor-pointer shadow-lg shadow-[#E11D48]/15 flex items-center justify-center gap-1.5"
                      >
                        ⚡ NỘP ĐƠN NHẬP TRẠI NGAY 🏨
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 1: SAVED ILLNESS PATIENT FILES HISTORIC RECORDS */}
              {activeTab === 1 && (
                <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                  {/* Ledger Search bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery || ""}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm theo họ tên, triệu chứng hoặc khoa chẩn đoán..."
                      className="w-full pl-4 pr-32 py-3 bg-[#0E0314] border border-[#3E1444]/80 rounded-2xl outline-none focus:border-[#E11D48] text-xs text-white placeholder-[#FDA4AF]/35 font-comfortaa"
                    />
                    {searchQuery !== debouncedSearchQuery && (
                      <span className="text-[10px] font-bold text-yellow-500/80 animate-pulse absolute right-14 top-1/2 -translate-y-1/2 pointer-events-none select-none">
                        Đang chẩn lọc...
                      </span>
                    )}
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-[#FDA4AF] hover:text-white"
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  {/* Dynamic record mapping list */}
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-12 bg-[#050108]/30 border border-[#3E1444]/40 rounded-3xl p-5 space-y-2">
                      <div className="text-2xl">📭</div>
                      <h4 className="text-sm font-bold text-slate-200 font-comfortaa">
                        Chưa có hồ sơ cai nghiện nào
                      </h4>
                      <p className="text-xs text-[#FDA4AF]/60 max-w-sm mx-auto">
                        Hãy chuyển qua thẻ{" "}
                        <span className="text-[#FDA4AF] font-bold">
                           📋 Lập Hồ Sơ Mới
                        </span>{" "}
                        để tự ghi nhận bệnh án hoang tưởng đầu tiên của bạn tại
                        Trại Cai Nghiện Cố Thị nhé!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredRecords.map((r) => {
                        const isExpanded = expandedRecordIds.includes(r.id);
                        return (
                          <div
                            key={r.id}
                            className="border border-[#3E1444]/70 rounded-2xl overflow-hidden bg-[#050108]/40 hover:border-[#E11D48]/40 transition duration-200"
                          >
                            {/* Record Summary Header Click block */}
                            <div
                              onClick={() => toggleRecordExpand(r.id)}
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#2A1137]/20 transition"
                            >
                              <div className="min-w-0 pr-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-extrabold font-comfortaa text-xs text-slate-100 flex items-center gap-1.5 leading-relaxed">
                                    👤 {highlightText(r.name, debouncedSearchQuery)}
                                  </span>
                                  <span className="text-[9px] bg-[#E11D48]/15 text-[#FDA4AF] border border-[#E11D48]/25 font-bold px-2 py-0.5 rounded-full">
                                    {highlightText(r.genre, debouncedSearchQuery)}
                                  </span>
                                </div>
                                <span className="text-[9px] text-[#FDA4AF]/50 block mt-1">
                                  Độ tuổi sinh lực: {r.age}
                                </span>
                              </div>

                              <div className="flex items-center gap-3.5 flex-shrink-0">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {r.date || "Hôm nay"}
                                </span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteRecord(r.id);
                                    }}
                                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition cursor-pointer"
                                    title="Xóa hồ sơ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-[#FDA4AF]" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-[#FDA4AF]" />
                                )}
                              </div>
                            </div>

                            {/* Collapsible Expended details block */}
                            {isExpanded && (
                              <div className="p-4 border-t border-[#3E1444]/55 bg-[#0E0314]/50 text-xs text-slate-300 space-y-4 animate-[fadeIn_0.15s_ease-out]">
                                {r.symptoms && r.symptoms.length > 0 && (
                                  <div className="space-y-1.5">
                                    <div className="text-[9px] font-bold text-[#EAB308] uppercase tracking-wider">
                                      Triệu chứng lâm sàng hoang tưởng:
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {r.symptoms.map((s, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-[#2A1137]/35 border border-[#3E1444]/40 rounded-xl p-2 text-[10px] text-slate-300"
                                        >
                                          • {highlightText(s, debouncedSearchQuery)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-1.5">
                                  <div className="text-[9px] font-bold text-[#EAB308] uppercase tracking-wider">
                                    Tiên lượng lời tự thuật hành vi:
                                  </div>
                                  <div className="bg-[#190924] border border-[#3E1444]/60 p-3 rounded-xl italic text-[#FDA4AF]/90 leading-relaxed whitespace-pre-wrap">
                                    "{highlightText(r.note, debouncedSearchQuery)}"
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DEVICE BACKUP & PERSISTENT STORAGE */}
              {activeTab === 2 && (
                <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                  {/* Persistent Storage Request Block */}
                  <div className="bg-[#050108]/50 border border-[#3E1444]/60 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#EAB308]" />
                      <h4 className="text-sm font-bold text-slate-100 font-comfortaa">
                        Kiên Cố Hóa Bộ Nhớ Cục Bộ
                      </h4>
                    </div>
                    <p className="text-xs text-[#FDA4AF]/80 leading-relaxed font-sans">
                      Theo mặc định, trình duyệt có thể tự động xóa dữ liệu LocalStorage/IndexedDB của các trang web khi thiết bị của bạn bị đầy bộ nhớ hoặc dọn dẹp cache. Hãy kích hoạt chế độ **Kiên Cố Hóa** để yêu cầu hệ điều hành bảo vệ bền bỉ dữ liệu bệnh án này!
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E0314]/80 border border-[#3E1444]/40">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 block uppercase font-mono font-bold tracking-wider">
                          Trạng thái kiên cố hiện tại:
                        </span>
                        {isPersisted ? (
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 font-comfortaa">
                            <span>✅</span> ĐÃ KIÊN CỐ HÓA VĨNH VIỄN
                          </span>
                        ) : (
                          <span className="text-xs text-[#FDA4AF] font-bold flex items-center gap-1.5 font-comfortaa">
                            <span>⚠️</span> CHƯA KIÊN CỐ HÓA (DỄ MẤT CACHE)
                          </span>
                        )}
                      </div>

                      {!isPersisted && (
                        <button
                          type="button"
                          onClick={handleRequestPersistence}
                          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-extrabold text-xs rounded-xl transition duration-200 active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                        >
                          🔒 Kích hoạt Kiên cố vĩnh viễn
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cache Stats Table */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#050108]/40 border border-[#3E1444]/40 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2A1137]/60 rounded-xl border border-[#3E1444] flex items-center justify-center">
                        <Database className="w-5 h-5 text-[#FDA4AF]" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">
                          Loại Bộ Nhớ Phụ Trợ
                        </span>
                        <span className="text-xs text-slate-100 font-bold font-comfortaa">
                          {dbStats.indexedDbOk ? "IndexedDB Bền Vững" : "LocalStorage Cơ Bản"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#050108]/40 border border-[#3E1444]/40 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2A1137]/60 rounded-xl border border-[#3E1444] flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-[#FDA4AF]" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">
                          Số lượng bệnh án lưu máy
                        </span>
                        <span className="text-xs text-slate-100 font-bold font-comfortaa">
                          {dbStats.recordsCount} bệnh án
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Export & Import file backup section */}
                  {isAdmin && (
                    <div className="bg-[#050108]/50 border border-[#3E1444]/60 p-5 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-[#EAB308]" />
                        <h4 className="text-sm font-bold text-slate-100 font-comfortaa">
                          Xuất & Nhập Tệp Sao Lưu (.json)
                        </h4>
                      </div>
                      <p className="text-xs text-[#FDA4AF]/80 leading-relaxed font-sans">
                        Hãy chủ động tải bản sao bệnh án của mình về máy để lưu trữ dự phòng, hoặc tải lên để khôi phục lại hồ sơ cũ khi bạn đổi thiết bị hoặc chuyển đổi tài khoản!
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Export button */}
                        <button
                          type="button"
                          onClick={handleExportBackup}
                          className="p-5 bg-[#0E0314] hover:bg-[#2A1137]/40 border border-[#3E1444]/70 hover:border-[#E11D48]/70 rounded-2xl text-left transition duration-200 cursor-pointer space-y-2 flex flex-col items-start justify-center w-full"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#E11D48]/15 border border-[#E11D48]/25 flex items-center justify-center">
                            <Download className="w-4 h-4 text-[#FDA4AF]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-100 block font-comfortaa">
                              Xuất dữ liệu bệnh án (.json)
                            </span>
                            <span className="text-[10px] text-[#FDA4AF]/65 block mt-0.5 leading-relaxed font-sans">
                              Tải về tệp bản sao bảo mật chứa toàn bộ bệnh án lưu trữ trong trình duyệt của bạn.
                            </span>
                          </div>
                        </button>

                        {/* Import file upload container */}
                        <div className="p-5 bg-[#0E0314] border border-[#3E1444]/70 rounded-2xl relative space-y-2 flex flex-col items-start justify-center">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                            <Upload className="w-4 h-4 text-indigo-300" />
                          </div>
                          <div className="w-full">
                            <span className="text-xs font-bold text-slate-100 block font-comfortaa">
                              Khôi phục từ tệp sao lưu (.json)
                            </span>
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleImportFile}
                              className="hidden"
                              id="user-records-import-upload"
                            />
                            <label
                              htmlFor="user-records-import-upload"
                              className="inline-flex items-center gap-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 hover:border-indigo-500/70 text-indigo-200 hover:text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all mt-2.5 cursor-pointer uppercase tracking-wider font-mono self-start"
                            >
                              📁 Chọn tệp tin để nạp
                            </label>

                            {importError && (
                              <span className="text-[10px] text-red-400 block mt-1.5 font-bold">
                                ✗ {importError}
                              </span>
                            )}
                            {importSuccess && (
                              <span className="text-[10px] text-emerald-400 block mt-1.5 font-bold">
                                ✓ Nạp dữ liệu thành công!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky footer close element */}
            <div
              className="p-4 border-t border-[#3E1444]/60 bg-[#050108]/50 flex justify-end gap-2"
              id="ai-exam-footer-sticky"
            >
              <button
                onClick={onClose}
                className="bg-[#2A1137]/65 hover:bg-[#E11D48] text-white hover:text-white border border-[#3E1444] hover:border-transparent text-xs font-bold font-comfortaa px-6 py-2.5 rounded-2xl transition duration-200 cursor-pointer"
                id="ai-exam-sticky-close-btn"
              >
                ✕ Đóng cửa sổ chẩn trị
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
