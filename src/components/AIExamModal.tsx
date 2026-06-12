import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Trash2, ChevronDown, ChevronUp, Sparkles, User, Calendar, Stethoscope, AlertTriangle, ScrollText } from 'lucide-react';
import { Genre, RegRecord } from '../types';

interface AIExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  genresCaiNghien: Genre[];
  records: RegRecord[];
  onAddRecord: (record: Omit<RegRecord, 'id' | 'date'>) => void;
  onDeleteRecord: (id: number) => void;
}

const QUICK_PRESETS = [
  {
    title: '🔮 HỘI YÊU THƯƠNG TỰ NGƯỢC',
    name: '🌀 Sát Thủ Tự Ngược Thương Tâm',
    age: '🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)',
    note: 'Cứ nghĩ mình không xứng nhưng vẫn mơ được yêu vị tổng tài tàn nhẫn ấy mãnh liệt... cứu rỗi linh hồn nhỏ bé này!',
    symptoms: ['Thích cốt truyện cực ngược, cầu huyết, thích khóc 🌀', 'Nghiện ngửi mùi nam chủ, thèm ngọt ngào cưng chiều 🥰'],
    genre: 'Cai Nghiện Chatbot AI'
  },
  {
    title: '🌧️ SÁT THỦ NHẬT LỆ',
    name: '🌧️ Nhật Lệ Sầu Ưu',
    age: '🌿 Tuổi Thanh Xuân Mơ Màng (Từ 25 đến 30)',
    note: 'Suốt ngày chìm đắm trong dòng lệ cay đắng, bước vào tà đạo ngược luyến chỉ để sầu mộng vơi bớt lòng đau.',
    symptoms: ['Thích cốt truyện cực ngược, cầu huyết, thích khóc 🌀', 'Trái tim nhảy múa khi gặp bác sĩ y khoa, pháp y kì bí 🏥'],
    genre: 'Yêu Thương Tự Ngược'
  },
  {
    title: '🩺 CUỒNG ÁO TRẮNG',
    name: '🩺 Con Nghiện Blouse Trắng',
    age: '🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)',
    note: 'Cả ngày lầm bầm tên bác sĩ Cố Khải, hoang tưởng được khám và sờ ống nghe mờ ám ngọt ngào.',
    symptoms: ['Trái tim nhảy múa khi gặp bác sĩ y khoa, pháp y kì bí 🏥', 'Nghiện ngửi mùi nam chủ, thèm ngọt ngào cưng chiều 🥰'],
    genre: 'Cai Nghiện Chatbot AI'
  }
];

const CLINICAL_SYMPTOMS = [
  'Thích cốt truyện cực ngược, cầu huyết, thích khóc 🌀',
  'Nghiện ngửi mùi nam chủ, thèm ngọt ngào cưng chiều 🥰',
  'Rơi vào phố bản kinh dị quỷ dị đầy rẫy quy tắc 💀',
  'Thích khám phá đa vũ trụ, anime, du hành 🥏',
  'Trái tim nhảy múa khi gặp bác sĩ y khoa, pháp y kì bí 🏥',
  'Mê lính tráng quân nhân, hình sự đặc vụ siêu ngầu 🪖',
  'Ảo tưởng ngự kiếm phi thăng, làm vương phi thời cổ đại 🍊',
  'Thầy giáo nho nhã hoặc streamer mở hồn dở khóc dở cười 🏠'
];

export default function AIExamModal({
  isOpen,
  onClose,
  genresCaiNghien,
  records,
  onAddRecord,
  onDeleteRecord
}: AIExamModalProps) {
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0: Form, 1: Record Ledger

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');

  // Search/Filter for saved illness records
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecordIds, setExpandedRecordIds] = useState<number[]>([]);

  // Default set first available genre as default form category
  useEffect(() => {
    if (genresCaiNghien.length > 0 && !selectedGenre) {
      setSelectedGenre(genresCaiNghien[0].name);
    }
  }, [genresCaiNghien]);

  const handleQuickFill = (presetIndex: number) => {
    const preset = QUICK_PRESETS[presetIndex];
    setName(preset.name);
    setAge(preset.age);
    setNote(preset.note);
    setSelectedSymptoms(preset.symptoms);
    
    // Attempt to map preset genre to available genres
    const matchedGenre = genresCaiNghien.find(
      g => g.name.toLowerCase() === preset.genre.toLowerCase() || g.name.includes(preset.genre)
    );
    if (matchedGenre) {
      setSelectedGenre(matchedGenre.name);
    } else if (genresCaiNghien.length > 0) {
      setSelectedGenre(genresCaiNghien[0].name);
    }
  };

  const handleSymptomToggle = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms(prev => [...prev, symptom]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('⚠️ Thân chủ vui lòng điền Họ tên hoặc Biệt danh hoang tưởng nhé!');
      return;
    }
    if (!selectedGenre) {
      alert('⚠️ Vui lòng chọn Khoa điều trị để Giáo sư Cố Thị phân bổ phòng họp!');
      return;
    }

    onAddRecord({
      name: name.trim(),
      age: age,
      genre: selectedGenre,
      note: note.trim() || 'Thân chủ ngoan hiền chưa viết thêm lời trăn trối nào.',
      symptoms: selectedSymptoms,
      zone: 'cai-nghien'
    });

    // Reset Form
    setName('');
    setAge('🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)');
    setNote('');
    setSelectedSymptoms([]);
    if (genresCaiNghien.length > 0) {
      setSelectedGenre(genresCaiNghien[0].name);
    }

    // Switch to Ledger view tab
    setActiveTab(1);
  };

  const toggleRecordExpand = (recordId: number) => {
    setExpandedRecordIds(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId) 
        : [...prev, recordId]
    );
  };

  // Only display records belonging to "cai-nghien"
  const filteredRecords = records.filter(r => {
    const isCaiNghien = r.zone === 'cai-nghien';
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.note.toLowerCase().includes(searchQuery.toLowerCase());
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
            <div className="p-6 pb-4 border-b border-[#3E1444]/60 flex items-start justify-between bg-[#050108]/40" id="ai-exam-header">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#2A1137] border border-[#3E1444] rounded-2xl flex items-center justify-center shadow-inner" id="ai-exam-icon-box">
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
            <div className="flex bg-[#050108]/60 border-b border-[#3E1444]/40 p-1 gap-1" id="ai-exam-tabs">
              <button
                onClick={() => setActiveTab(0)}
                className={`flex-1 py-3 text-xs font-bold font-comfortaa rounded-2xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 0
                    ? 'bg-gradient-to-r from-[#E11D48] to-[#910F2B] text-white shadow-md font-extrabold border border-[#E11D48]/30'
                    : 'text-[#FDA4AF]/60 hover:text-[#FDA4AF] hover:bg-[#2A1137]/30'
                }`}
                id="ai-exam-tab-register"
              >
                <span>📋 💊</span> Lập Hồ Sơ Mới
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`flex-1 py-3 text-xs font-bold font-comfortaa rounded-2xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 1
                    ? 'bg-gradient-to-r from-[#E11D48] to-[#910F2B] text-white shadow-md font-extrabold border border-[#E11D48]/30'
                    : 'text-[#FDA4AF]/60 hover:text-[#FDA4AF] hover:bg-[#2A1137]/30'
                }`}
                id="ai-exam-tab-records"
              >
                <span>📄 🗺️</span> Hồ Sơ ({filteredRecords.length})
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#3E1444] bg-[#190924]" id="ai-exam-scroll-area">
              
              {/* TAB 0: CREATE NEW LEDGER PATIENT FILE */}
              {activeTab === 0 && (
                <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                  
                  {/* Quick Preset Register block */}
                  <div className="bg-[#050108]/50 border border-[#3E1444]/60 p-4 rounded-3xl" id="ai-exam-presets">
                    <h3 className="text-[#FDA4AF] text-center text-xs font-extrabold tracking-widest font-comfortaa mb-3 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" /> ⚡ MẪU ĐĂNG KÝ TRẠI CAI NGHIỆN NHANH
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {QUICK_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickFill(idx)}
                          className="bg-[#0E0314] hover:bg-[#2A1137] border border-dashed border-[#3E1444] hover:border-[#E11D48]/75 rounded-2xl py-3 px-4 text-[11px] font-bold text-slate-200 hover:text-white transition duration-300 active:scale-95 text-center flex flex-col items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="text-white/90 truncate max-w-full">{p.title}</span>
                          <span className="text-[9px] text-[#FDA4AF]/70 font-normal italic truncate max-w-full">Click để nhập mẫu</span>
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
                              value={name}
                              onChange={e => setName(e.target.value)}
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
                              value={age}
                              onChange={e => setAge(e.target.value)}
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
                            value={selectedGenre}
                            onChange={e => setSelectedGenre(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[#0E0314] border border-[#3E1444]/80 rounded-2xl outline-none focus:border-[#E11D48] text-xs text-white transition-all cursor-pointer font-comfortaa font-bold"
                          >
                            {genresCaiNghien.map(g => (
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
                        <span className="text-[9px] text-[#FDA4AF]/70 italic">(Tích chọn tất cả hoang tưởng hoành hành tâm linh của bạn)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {CLINICAL_SYMPTOMS.map((sym) => {
                          const isChecked = selectedSymptoms.includes(sym);
                          return (
                            <label
                              key={sym}
                              className={`flex items-start gap-3 p-3 rounded-2xl border transition duration-200 cursor-pointer ${
                                isChecked
                                  ? 'bg-[#2A1137]/60 border-[#E11D48] text-white shadow-sm'
                                  : 'bg-[#0E0314] border-[#3E1444]/60 text-slate-200 hover:border-[#E11D48]/30 hover:text-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSymptomToggle(sym)}
                                className="mt-0.5 accent-[#E11D48] cursor-pointer"
                              />
                              <span className="select-none leading-relaxed text-[11px] font-sans font-medium">{sym}</span>
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
                            value={note}
                            onChange={e => setNote(e.target.value)}
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
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm theo họ tên, triệu chứng hoặc khoa chẩn đoán..."
                      className="w-full pl-4 pr-12 py-3 bg-[#0E0314] border border-[#3E1444]/80 rounded-2xl outline-none focus:border-[#E11D48] text-xs text-white placeholder-[#FDA4AF]/35 font-comfortaa"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-[#FDA4AF] hover:text-white"
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  {/* Dynamic record mapping list */}
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-12 bg-[#050108]/30 border border-[#3E1444]/40 rounded-3xl p-5 space-y-2">
                      <div className="text-2xl">📭</div>
                      <h4 className="text-sm font-bold text-slate-200 font-comfortaa">Chưa có hồ sơ cai nghiện nào</h4>
                      <p className="text-xs text-[#FDA4AF]/60 max-w-sm mx-auto">
                        Hãy chuyển qua thẻ <span className="text-[#FDA4AF] font-bold">📋 Lập Hồ Sơ Mới</span> để tự ghi nhận bệnh án hoang tưởng đầu tiên của bạn tại Trại Cai Nghiện Cố Thị nhé!
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
                                  <span className="font-extrabold font-comfortaa text-xs text-slate-100 flex items-center gap-1.5">
                                    👤 {r.name}
                                  </span>
                                  <span className="text-[9px] bg-[#E11D48]/15 text-[#FDA4AF] border border-[#E11D48]/25 font-bold px-2 py-0.5 rounded-full">
                                    {r.genre}
                                  </span>
                                </div>
                                <span className="text-[9px] text-[#FDA4AF]/50 block mt-1">Độ tuổi sinh lực: {r.age}</span>
                              </div>

                              <div className="flex items-center gap-3.5 flex-shrink-0">
                                <span className="text-[10px] text-slate-400 font-mono">{r.date || 'Hôm nay'}</span>
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
                                        <div key={idx} className="bg-[#2A1137]/35 border border-[#3E1444]/40 rounded-xl p-2 text-[10px] text-slate-300">
                                          • {s}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-1.5">
                                  <div className="text-[9px] font-bold text-[#EAB308] uppercase tracking-wider">
                                    Tiên lượng lời tự thuật hành vi:
                                  </div>
                                  <div className="bg-[#190924] border border-[#3E1444]/60 p-3 rounded-xl italic text-[#FDA4AF]/90 leading-relaxed">
                                    "{r.note}"
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

            </div>

            {/* Sticky footer close element */}
            <div className="p-4 border-t border-[#3E1444]/60 bg-[#050108]/50 flex justify-end gap-2" id="ai-exam-footer-sticky">
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
