import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Download, 
  Upload, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Clock,
  Sparkles,
  Play,
  Filter
} from 'lucide-react';
import { QuizQuestion, Settings } from '../types';

interface QuizManagerTabProps {
  settings: Settings;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
  questions: QuizQuestion[];
  onUpdateQuestions: (newQuestions: QuizQuestion[]) => void;
  onTestExam: () => void;
}

export default function QuizManagerTab({
  settings,
  onUpdateSettings,
  questions,
  onUpdateQuestions,
  onTestExam,
}: QuizManagerTabProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [pendingToggleState, setPendingToggleState] = useState<boolean>(false);

  // Categories list
  const categories = Array.from(
    new Set(questions.map((q) => q.category).filter(Boolean) as string[])
  );

  // Filtered questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      q.options.some((opt) => opt.toLowerCase().includes(searchKeyword.toLowerCase()));
    const matchesCat =
      selectedCategory === 'all' || q.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Handle Switch Quiz Mode Toggle
  const handleToggleClick = (targetVal: boolean) => {
    setPendingToggleState(targetVal);
    setShowToggleConfirm(true);
  };

  const confirmToggleQuizMode = () => {
    onUpdateSettings({ quizModeEnabled: pendingToggleState });
    setShowToggleConfirm(false);
  };

  // Form State for Add/Edit Question
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptionA, setFormOptionA] = useState('');
  const [formOptionB, setFormOptionB] = useState('');
  const [formOptionC, setFormOptionC] = useState('');
  const [formOptionD, setFormOptionD] = useState('');
  const [formCorrectAnswer, setFormCorrectAnswer] = useState<number>(0);
  const [formCategory, setFormCategory] = useState('');

  const openCreateForm = () => {
    setEditingQuestion(null);
    setFormQuestion('');
    setFormOptionA('');
    setFormOptionB('');
    setFormOptionC('');
    setFormOptionD('');
    setFormCorrectAnswer(0);
    setFormCategory('Cố Thị Lore');
    setIsCreatingNew(true);
  };

  const openEditForm = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setFormQuestion(q.question);
    setFormOptionA(q.options[0] || '');
    setFormOptionB(q.options[1] || '');
    setFormOptionC(q.options[2] || '');
    setFormOptionD(q.options[3] || '');
    setFormCorrectAnswer(q.correctAnswer);
    setFormCategory(q.category || '');
    setIsCreatingNew(true);
  };

  const handleSaveQuestionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formOptionA.trim() || !formOptionB.trim() || !formOptionC.trim() || !formOptionD.trim()) {
      alert('Vui lòng điền đầy đủ câu hỏi và cả 4 đáp án A, B, C, D!');
      return;
    }

    const questionItem: QuizQuestion = {
      id: editingQuestion ? editingQuestion.id : `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      question: formQuestion.trim(),
      options: [
        formOptionA.trim(),
        formOptionB.trim(),
        formOptionC.trim(),
        formOptionD.trim(),
      ],
      correctAnswer: formCorrectAnswer,
      category: formCategory.trim() || 'Chung',
    };

    if (editingQuestion) {
      const updated = questions.map((q) => (q.id === editingQuestion.id ? questionItem : q));
      onUpdateQuestions(updated);
    } else {
      onUpdateQuestions([questionItem, ...questions]);
    }

    setIsCreatingNew(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('Viện trưởng có chắc muốn xóa câu hỏi này khỏi ngân hàng đề?')) {
      const updated = questions.filter((q) => q.id !== id);
      onUpdateQuestions(updated);
    }
  };

  // Bulk Import
  const handleProcessBulkImport = () => {
    try {
      setImportError('');
      // Try parsing as JSON first
      if (bulkImportText.trim().startsWith('[') || bulkImportText.trim().startsWith('{')) {
        const parsed = JSON.parse(bulkImportText);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const validated: QuizQuestion[] = list.map((item, idx) => ({
          id: item.id || `q_imp_${Date.now()}_${idx}`,
          question: item.question || `Câu hỏi ${idx + 1}`,
          options: Array.isArray(item.options) && item.options.length === 4
            ? [item.options[0], item.options[1], item.options[2], item.options[3]]
            : ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
          correctAnswer: typeof item.correctAnswer === 'number' ? item.correctAnswer : 0,
          category: item.category || 'Nhập khẩu',
        }));
        onUpdateQuestions([...validated, ...questions]);
        setShowBulkImportModal(false);
        setBulkImportText('');
        alert(`Đã nhập thành công ${validated.length} câu hỏi mới!`);
        return;
      }

      // Try text parsing: Câu 1: ... A. ... B. ... C. ... D. ... Đáp án: A
      const lines = bulkImportText.split('\n').map((l) => l.trim()).filter(Boolean);
      const parsedQuestions: QuizQuestion[] = [];
      let currentQ: Partial<QuizQuestion> & { opts: string[] } = { opts: [] };

      for (const line of lines) {
        if (/^(câu|bài|\d+[\.:])/i.test(line)) {
          if (currentQ.question && currentQ.opts.length === 4) {
            parsedQuestions.push({
              id: `q_txt_${Date.now()}_${parsedQuestions.length}`,
              question: currentQ.question,
              options: [currentQ.opts[0], currentQ.opts[1], currentQ.opts[2], currentQ.opts[3]],
              correctAnswer: currentQ.correctAnswer ?? 0,
              category: 'Nhập từ văn bản',
            });
          }
          currentQ = {
            question: line.replace(/^(câu|bài|\d+[\.:\s]+)/i, '').trim(),
            opts: [],
            correctAnswer: 0,
          };
        } else if (/^[A-D][\.\:\)]/i.test(line)) {
          const optText = line.replace(/^[A-D][\.\:\)\s]+/i, '').trim();
          currentQ.opts.push(optText);
        } else if (/^(đáp án|đáp án đúng|key)[\:\s]+([A-D])/i.test(line)) {
          const match = line.match(/(?:đáp án|đáp án đúng|key)[\:\s]+([A-D])/i);
          if (match && match[1]) {
            const letter = match[1].toUpperCase();
            currentQ.correctAnswer = { A: 0, B: 1, C: 2, D: 3 }[letter] ?? 0;
          }
        }
      }

      if (currentQ.question && currentQ.opts.length === 4) {
        parsedQuestions.push({
          id: `q_txt_${Date.now()}_${parsedQuestions.length}`,
          question: currentQ.question,
          options: [currentQ.opts[0], currentQ.opts[1], currentQ.opts[2], currentQ.opts[3]],
          correctAnswer: currentQ.correctAnswer ?? 0,
          category: 'Nhập từ văn bản',
        });
      }

      if (parsedQuestions.length === 0) {
        setImportError('Không tìm thấy câu hỏi hợp lệ nào theo định dạng JSON hoặc văn bản mẫu!');
        return;
      }

      onUpdateQuestions([...parsedQuestions, ...questions]);
      setShowBulkImportModal(false);
      setBulkImportText('');
      alert(`Đã nhập thành công ${parsedQuestions.length} câu hỏi mới!`);
    } catch (e: any) {
      setImportError(`Lỗi định dạng: ${e.message}`);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ngan_hang_de_thi_co_thi_${questions.length}_cau.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* 1. Header & Main Mode Toggle */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#1E0938] via-[#2A0C4E] to-[#1E0938] border border-purple-500/40 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-comfortaa flex items-center gap-2">
                <span>Chế Độ "Giải Đề" (Khảo Sát Đầu Vào)</span>
                {settings.quizModeEnabled ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Đang Kích Hoạt
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-700/50 text-slate-400 border border-slate-600">
                    Đã Tắt (Vào Tự Do)
                  </span>
                )}
              </h3>
              <p className="text-xs text-purple-200/70">
                Khi bật, người dùng bấm "Vào Trại" sẽ phải vượt qua bài kiểm tra trắc nghiệm 30 câu để mở khóa bệnh án.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              type="button"
              onClick={() => handleToggleClick(!settings.quizModeEnabled)}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.quizModeEnabled
                  ? 'bg-purple-600 border-purple-400'
                  : 'bg-slate-700 border-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.quizModeEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Quick Exam Config Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-500/20">
          <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
            <label className="text-[11px] font-bold text-purple-300 block">Thời Gian Làm Bài (Phút)</label>
            <input
              type="number"
              min={5}
              max={60}
              value={settings.quizTimeLimitMinutes || 15}
              onChange={(e) => onUpdateSettings({ quizTimeLimitMinutes: Math.max(5, parseInt(e.target.value) || 15) })}
              className="w-full bg-[#120520] border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-bold"
            />
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
            <label className="text-[11px] font-bold text-purple-300 block">Tiêu Chuẩn Cấp 1 (Mở 7 bệnh án)</label>
            <input
              type="number"
              step={0.5}
              min={1}
              max={10}
              value={settings.quizPassingScoreTier1 ?? 7.0}
              onChange={(e) => onUpdateSettings({ quizPassingScoreTier1: parseFloat(e.target.value) || 7.0 })}
              className="w-full bg-[#120520] border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold"
            />
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
            <label className="text-[11px] font-bold text-purple-300 block">Tiêu Chuẩn Cấp 2 (Mở Toàn Viện)</label>
            <input
              type="number"
              step={0.5}
              min={1}
              max={10}
              value={settings.quizPassingScoreTier2 ?? 9.0}
              onChange={(e) => onUpdateSettings({ quizPassingScoreTier2: parseFloat(e.target.value) || 9.0 })}
              className="w-full bg-[#120520] border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-pink-300 font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* 2. Bank Toolbar & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white font-comfortaa flex items-center gap-2">
            <span>📚 Ngân Hàng Câu Hỏi Viện Cố Thị</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-200 text-xs font-mono font-bold">
              {questions.length} câu
            </span>
          </h4>
          <p className="text-[11px] text-purple-300/70">
            Mỗi lượt kiểm tra sẽ tự động bốc ngẫu nhiên 30 câu và xáo trộn 4 đáp án A, B, C, D.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={questions.length === 0}
            onClick={onTestExam}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-comfortaa transition flex items-center gap-1.5 shadow ${
              questions.length === 0
                ? 'bg-purple-950/30 text-purple-400/40 border border-purple-500/10 cursor-not-allowed'
                : 'bg-purple-700/80 hover:bg-purple-600 text-white cursor-pointer'
            }`}
            title={questions.length === 0 ? 'Kho câu hỏi đang trống' : 'Làm thử bài thi 30 câu'}
          >
            <Play className="w-3.5 h-3.5 text-amber-300" />
            <span>Thi Thử Bộ Đề (Test)</span>
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-comfortaa transition flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Câu Mới</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBulkImportModal(true)}
            className="px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:text-white hover:bg-purple-900/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập Hàng Loạt</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:text-white hover:bg-purple-900/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất JSON</span>
          </button>

          {questions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ câu hỏi trong kho về 0 không?')) {
                  onUpdateQuestions([]);
                }
              }}
              className="px-3 py-2 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 hover:bg-red-900/50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Xóa toàn bộ câu hỏi trong kho"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Sạch Kho ({questions.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm nội dung câu hỏi hoặc đáp án..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-[#120520] border border-purple-500/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-purple-300/40 focus:border-purple-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#120520] border border-purple-500/30 rounded-2xl px-3 py-2.5 text-xs text-purple-200 focus:border-purple-400 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả danh mục ({questions.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({questions.filter((q) => q.category === cat).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Questions List */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-purple-500/30">
        {filteredQuestions.length === 0 ? (
          questions.length === 0 ? (
            <div className="p-8 rounded-3xl bg-black/40 border border-purple-500/20 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-inner">
                <BrainCircuit className="w-7 h-7 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h5 className="text-sm font-bold text-white font-comfortaa">Kho câu hỏi hiện đang trống (0 câu)</h5>
                <p className="text-xs text-purple-300/70 leading-relaxed font-sans">
                  Bạn chưa nạp câu hỏi nào vào ngân hàng đề thi. Hãy bấm <b>"Thêm Câu Mới"</b> hoặc <b>"Nhập Hàng Loạt"</b> để tạo bộ đề của bạn.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-comfortaa transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Câu Mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(true)}
                  className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold font-comfortaa transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Dán Nhập Hàng Loạt</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-black/40 border border-purple-500/20 text-center space-y-2">
              <p className="text-sm text-purple-300/60 italic">Không tìm thấy câu hỏi nào phù hợp với bộ lọc tìm kiếm.</p>
            </div>
          )
        ) : (
          filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#160728] border border-purple-500/30 hover:border-purple-400/50 transition-all space-y-3"
            >
              {/* Question Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-600/30 border border-purple-400/30 text-purple-200 font-mono font-bold text-xs">
                    #{idx + 1}
                  </span>
                  {q.category && (
                    <span className="px-2.5 py-0.5 rounded-full bg-pink-950/40 border border-pink-500/30 text-pink-300 text-[10px] font-bold">
                      {q.category}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditForm(q)}
                    className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-900/40 transition cursor-pointer"
                    title="Chỉnh sửa câu hỏi"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-900/40 transition cursor-pointer"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                {q.question}
              </p>

              {/* 4 Choices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {q.options.map((opt, optIdx) => {
                  const letter = ['A', 'B', 'C', 'D'][optIdx];
                  const isCorrect = q.correctAnswer === optIdx;
                  return (
                    <div
                      key={optIdx}
                      className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                          : 'bg-black/30 border-purple-500/20 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="pt-0.5">{opt}</span>
                      {isCorrect && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT QUESTION MODAL */}
      {/* ========================================================================= */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-[13000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17082A] border border-purple-500/40 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-purple-500/20">
              <h3 className="text-sm sm:text-base font-bold text-white font-comfortaa">
                {editingQuestion ? '✏️ Chỉnh Sửa Câu Hỏi' : '➕ Thêm Câu Hỏi Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-purple-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestionForm} className="space-y-4 text-xs">
              {/* Question Text */}
              <div className="space-y-1">
                <label className="font-bold text-purple-300 block">Nội dung câu hỏi (*):</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Nhập nội dung câu hỏi..."
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  className="w-full bg-[#0E0317] border border-purple-500/30 rounded-xl p-3 text-white focus:border-purple-400 focus:outline-none resize-none"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-bold text-purple-300 block">Danh mục / Chủ đề:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cố Thị Lore, Tâm Lý Học, Văn Hóa Đọc..."
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-[#0E0317] border border-purple-500/30 rounded-xl p-2.5 text-white focus:border-purple-400 focus:outline-none"
                />
              </div>

              {/* Options A, B, C, D */}
              <div className="space-y-2">
                <label className="font-bold text-purple-300 block">4 Lựa chọn trả lời & Chọn đáp án đúng:</label>
                
                {[
                  { label: 'A', val: formOptionA, setVal: setFormOptionA, idx: 0 },
                  { label: 'B', val: formOptionB, setVal: setFormOptionB, idx: 1 },
                  { label: 'C', val: formOptionC, setVal: setFormOptionC, idx: 2 },
                  { label: 'D', val: formOptionD, setVal: setFormOptionD, idx: 3 },
                ].map((opt) => (
                  <div key={opt.label} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormCorrectAnswer(opt.idx)}
                      className={`w-8 h-8 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer transition ${
                        formCorrectAnswer === opt.idx
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:border-purple-400'
                      }`}
                      title="Bấm để chọn đây là đáp án ĐÚNG"
                    >
                      {opt.label}
                    </button>
                    <input
                      type="text"
                      required
                      placeholder={`Nội dung lựa chọn ${opt.label}...`}
                      value={opt.val}
                      onChange={(e) => opt.setVal(e.target.value)}
                      className={`flex-1 bg-[#0E0317] border rounded-xl px-3 py-2 text-white focus:outline-none ${
                        formCorrectAnswer === opt.idx
                          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'border-purple-500/30 focus:border-purple-400'
                      }`}
                    />
                    {formCorrectAnswer === opt.idx && (
                      <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                        ĐÁP ÁN ĐÚNG ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-3 border-t border-purple-500/20">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="flex-1 py-2.5 rounded-xl border border-purple-500/30 text-purple-300 font-bold hover:bg-purple-900/30 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Câu Hỏi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK IMPORT MODAL */}
      {/* ========================================================================= */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-[13000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17082A] border border-purple-500/40 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-purple-500/20">
              <h3 className="text-sm sm:text-base font-bold text-white font-comfortaa">
                📥 Nhập Hàng Loạt Câu Hỏi
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="text-purple-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-purple-200/80">
              Dán dữ liệu mảng JSON hoặc văn bản trắc nghiệm theo định dạng mẫu:
            </p>

            <div className="p-3 rounded-xl bg-black/50 border border-purple-500/20 font-mono text-[11px] text-purple-300/80 space-y-1">
              <div className="text-pink-300 font-bold">// Định dạng văn bản hỗ trợ:</div>
              <div>Câu 1: Thủ đô của Việt Nam là gì?</div>
              <div>A. Hà Nội</div>
              <div>B. TP. Hồ Chí Minh</div>
              <div>C. Đà Nẵng</div>
              <div>D. Cần Thơ</div>
              <div>Đáp án: A</div>
            </div>

            <textarea
              rows={8}
              placeholder="Dán JSON hoặc nội dung câu hỏi vào đây..."
              value={bulkImportText}
              onChange={(e) => setBulkImportText(e.target.value)}
              className="w-full bg-[#0E0317] border border-purple-500/30 rounded-xl p-3 text-white font-mono text-xs focus:border-purple-400 focus:outline-none"
            />

            {importError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-purple-500/30 text-purple-300 font-bold hover:bg-purple-900/30 cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleProcessBulkImport}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tiến Hành Nhập</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION POPUP FOR ACTIVATING / DEACTIVATING QUIZ MODE */}
      {/* ========================================================================= */}
      {showToggleConfirm && (
        <div className="fixed inset-0 z-[13000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#17082A] border border-purple-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-400/40 flex items-center justify-center mx-auto text-3xl">
              {pendingToggleState ? '🔐' : '🔓'}
            </div>
            <h3 className="text-base font-bold text-white font-comfortaa">
              {pendingToggleState ? 'Kích Hoạt Chế Độ Giải Đề' : 'Tắt Chế Độ Giải Đề'}
            </h3>
            <div className="text-xs text-purple-200/90 leading-relaxed font-sans">
              {pendingToggleState
                ? 'Viện trưởng muốn tiến hành đóng cửa và phát đề thi? Khi kích hoạt, tất cả người dùng sẽ phải giải đề trắc nghiệm để vào đọc bệnh án.'
                : 'Viện trưởng muốn tắt Chế độ Giải Đề và mở cửa tự do cho toàn viện?'}
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowToggleConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-purple-500/30 text-purple-200 text-xs font-bold cursor-pointer hover:bg-purple-900/30"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmToggleQuizMode}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold cursor-pointer shadow-lg shadow-purple-600/20"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
