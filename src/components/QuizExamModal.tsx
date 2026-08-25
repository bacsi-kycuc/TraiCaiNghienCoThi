import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  Send, 
  HelpCircle,
  Sword,
  XCircle
} from 'lucide-react';
import { QuizQuestion } from '../types';
import { cleanQuestionText, cleanOptionText } from '../utils/quizUtils';
import FruitNinjaOverlay from './FruitNinjaOverlay';

interface ShuffledQuizItem {
  id: string;
  question: string;
  options: string[];
  originalCorrectAnswerIndex: number;
  // Index in shuffled options that corresponds to the correct answer
  shuffledCorrectIndex: number;
  category?: string;
}

interface QuizExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  timeLimitMinutes?: number;
  passingScoreTier1?: number; // 7.0
  passingScoreTier2?: number; // 9.0
  onQuizCompleted: (result: {
    score: number;
    correctCount: number;
    totalQuestions: number;
    passedTier: 'failed' | 'tier1' | 'tier2';
  }) => void;
  isTestMode?: boolean;
}

export default function QuizExamModal({
  isOpen,
  onClose,
  questions,
  timeLimitMinutes = 15,
  passingScoreTier1 = 7.0,
  passingScoreTier2 = 9.0,
  onQuizCompleted,
  isTestMode = false,
}: QuizExamModalProps) {
  const [examState, setExamState] = useState<'intro' | 'in_progress' | 'result'>('intro');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(timeLimitMinutes * 60);
  const [examQuestions, setExamQuestions] = useState<ShuffledQuizItem[]>([]);
  const [currentResult, setCurrentResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    passedTier: 'failed' | 'tier1' | 'tier2';
  } | null>(null);

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [jumpNavOpen, setJumpNavOpen] = useState(false);

  // Fruit Ninja Minigame States
  const [showFruitNinja, setShowFruitNinja] = useState(false);
  const [hasFruitNinjaTriggered, setHasFruitNinjaTriggered] = useState(false);
  const [disabledOptions, setDisabledOptions] = useState<Record<number, number[]>>({});
  const [examToast, setExamToast] = useState<{
    message: string;
    type: 'success' | 'danger' | 'info';
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate 30 random questions with shuffled options whenever exam starts
  const prepareExam = () => {
    if (!questions || questions.length === 0) return;
    const pool = questions;
    // Shuffle pool
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const picked = shuffledPool.slice(0, Math.min(30, shuffledPool.length));

    const prepared: ShuffledQuizItem[] = picked.map((q) => {
      // Create options with original indexes
      const originalOptionsWithIndex = q.options.map((opt, idx) => ({
        text: opt,
        originalIndex: idx,
      }));
      // Shuffle options
      const shuffledOptions = [...originalOptionsWithIndex].sort(() => 0.5 - Math.random());
      const shuffledCorrectIndex = shuffledOptions.findIndex(
        (o) => o.originalIndex === q.correctAnswer
      );

      return {
        id: q.id,
        question: cleanQuestionText(q.question),
        options: shuffledOptions.map((o) => cleanOptionText(o.text)),
        originalCorrectAnswerIndex: q.correctAnswer,
        shuffledCorrectIndex: shuffledCorrectIndex >= 0 ? shuffledCorrectIndex : 0,
        category: q.category,
      };
    });

    setExamQuestions(prepared);
    setSelectedAnswers({});
    setDisabledOptions({});
    setTimeLeft(timeLimitMinutes * 60);
    setExamState('in_progress');
    setShowConfirmSubmit(false);
    setShowFruitNinja(false);
    setHasFruitNinjaTriggered(false);
    setExamToast(null);
  };

  // Reset exam on open
  useEffect(() => {
    if (isOpen) {
      setExamState('intro');
      setSelectedAnswers({});
      setDisabledOptions({});
      setCurrentResult(null);
      setShowConfirmSubmit(false);
      setShowFruitNinja(false);
      setHasFruitNinjaTriggered(false);
      setExamToast(null);
    }
  }, [isOpen]);

  // Countdown timer in progress & Minigame trigger check
  useEffect(() => {
    if (examState === 'in_progress') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }

          // Trigger Fruit Ninja minigame when timeLeft <= 15 and hasn't triggered yet
          if (prev <= 15 && !hasFruitNinjaTriggered) {
            setHasFruitNinjaTriggered(true);
            setShowFruitNinja(true);
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState, examQuestions, selectedAnswers, hasFruitNinjaTriggered]);

  // Anti-Cheat: Block Copy / Cut / Paste / Select / Inspect Shortcuts during exam
  const handlePreventCopy = useCallback((e: React.SyntheticEvent | Event) => {
    if (examState === 'in_progress') {
      e.preventDefault();
      setExamToast({
        message: '🛡️ Bảo mật Viện Cố Thị: Nghiêm cấm sao chép câu hỏi & đáp án dưới mọi hình thức!',
        type: 'danger',
      });
    }
  }, [examState]);

  useEffect(() => {
    if (examState !== 'in_progress' || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+A, Ctrl+U, Ctrl+S, Ctrl+P, F12, Cmd+C, Cmd+A
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (
        (modKey && ['c', 'C', 'a', 'A', 'u', 'U', 's', 'S', 'p', 'P', 'x', 'X'].includes(e.key)) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
        setExamToast({
          message: '🛡️ Chống gian lận: Phím tắt sao chép & thao tác hệ thống đã bị vô hiệu hóa!',
          type: 'danger',
        });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setExamToast({
        message: '🛡️ Menu chuột phải đã bị khóa để bảo mật đề thi!',
        type: 'danger',
      });
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        selection.removeAllRanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [examState, isOpen]);

  // Toast Auto-hide
  useEffect(() => {
    if (examToast) {
      const t = setTimeout(() => setExamToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [examToast]);

  // Fruit Ninja Handlers
  const handleFruitAddTime = (seconds: number) => {
    setTimeLeft((prev) => Math.max(1, prev + seconds));
    if (seconds > 0) {
      setExamToast({
        message: `🍑 Tuyệt đỉnh! Chém trúng đào: +${seconds} giây vào thời gian làm bài!`,
        type: 'success',
      });
    } else {
      setExamToast({
        message: `🍆 Ôi không! Chém trúng cà tím: Bị trừ ${Math.abs(seconds)} giây!`,
        type: 'danger',
      });
    }
  };

  const handleFruitAvocadoEffect = () => {
    // Find unanswered questions
    const unansweredIndices = examQuestions
      .map((_, idx) => idx)
      .filter((idx) => selectedAnswers[idx] === undefined);

    // Check if there are spare unused questions in the pool
    const currentExamIds = new Set(examQuestions.map((q) => q.id));
    const spareQuestions = questions.filter((q) => !currentExamIds.has(q.id));

    if (unansweredIndices.length > 0 && spareQuestions.length > 0) {
      // Pick random spare question
      const randomSpare = spareQuestions[Math.floor(Math.random() * spareQuestions.length)];
      const targetIdx = unansweredIndices[0];

      // Prepare shuffled version for replacement
      const originalOptionsWithIndex = randomSpare.options.map((opt, idx) => ({
        text: opt,
        originalIndex: idx,
      }));
      const shuffledOptions = [...originalOptionsWithIndex].sort(() => 0.5 - Math.random());
      const shuffledCorrectIndex = shuffledOptions.findIndex(
        (o) => o.originalIndex === randomSpare.correctAnswer
      );

      const replacementItem: ShuffledQuizItem = {
        id: randomSpare.id,
        question: randomSpare.question,
        options: shuffledOptions.map((o) => o.text),
        originalCorrectAnswerIndex: randomSpare.correctAnswer,
        shuffledCorrectIndex: shuffledCorrectIndex >= 0 ? shuffledCorrectIndex : 0,
        category: randomSpare.category,
      };

      setExamQuestions((prev) => {
        const next = [...prev];
        next[targetIdx] = replacementItem;
        return next;
      });

      setExamToast({
        message: `🥑 Trái bơ thần kỳ: Đã đổi mới nội dung Câu ${targetIdx + 1} từ kho đề!`,
        type: 'info',
      });
    } else {
      // 50/50 Helper: Eliminate 2 wrong choices on the first unanswered question
      const targetIdx = unansweredIndices.length > 0 ? unansweredIndices[0] : 0;
      const targetQ = examQuestions[targetIdx];
      if (targetQ) {
        const correctIdx = targetQ.shuffledCorrectIndex;
        const wrongIndices = [0, 1, 2, 3].filter((idx) => idx !== correctIdx);
        const toEliminate = [...wrongIndices].sort(() => 0.5 - Math.random()).slice(0, 2);

        setDisabledOptions((prev) => ({
          ...prev,
          [targetIdx]: Array.from(new Set([...(prev[targetIdx] || []), ...toEliminate])),
        }));

        setExamToast({
          message: `🥑 Trái bơ 50/50: Đã gạch bỏ 2 đáp án sai ở Câu ${targetIdx + 1}!`,
          type: 'info',
        });
      }
    }
  };

  // Handle Answer Selection
  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  // Calculate score and submit
  const calculateAndSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    let correctCount = 0;
    const totalQuestions = examQuestions.length;

    examQuestions.forEach((q, idx) => {
      const chosen = selectedAnswers[idx];
      if (chosen !== undefined && chosen === q.shuffledCorrectIndex) {
        correctCount += 1;
      }
    });

    // Score on a 10-point scale: correctCount * (10 / totalQuestions)
    const rawScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;
    const roundedScore = Math.round(rawScore * 100) / 100;

    let passedTier: 'failed' | 'tier1' | 'tier2' = 'failed';
    if (roundedScore >= passingScoreTier2) {
      passedTier = 'tier2';
    } else if (roundedScore >= passingScoreTier1) {
      passedTier = 'tier1';
    }

    const result = {
      score: roundedScore,
      correctCount,
      totalQuestions,
      passedTier,
    };

    setCurrentResult(result);
    setExamState('result');
    onQuizCompleted(result);
  };

  const handleAutoSubmit = () => {
    calculateAndSubmit();
  };

  // Formatted Timer (MM:SS)
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  // Progress metrics
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalExamCount = examQuestions.length || 30;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#0A0414]/90 backdrop-blur-xl"
        id="quiz-exam-backdrop"
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl bg-[#140722] border border-purple-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden max-h-[92vh]"
        id="quiz-exam-modal-container"
      >
        {/* ========================================================================= */}
        {/* STAGE 1: INTRO SCREEN */}
        {/* ========================================================================= */}
        {examState === 'intro' && (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
            {/* Pulsing Icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600/30 via-pink-600/20 to-purple-900/40 border border-purple-400/40 flex items-center justify-center shadow-lg shadow-purple-500/15 animate-pulse">
              <BrainCircuit className="w-10 h-10 text-purple-300" />
            </div>

            {/* Title & Lore Welcome */}
            <div className="space-y-3 max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-witchy-dust font-comfortaa leading-snug">
                Khảo Sát Đầu Vào Bệnh Nhân
              </h2>
              <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-pink-150 text-sm sm:text-base leading-relaxed italic font-sans shadow-inner">
                "Chúc mừng bé yêu! Bảo bối đã chọn lọ với các chồng, vậy hãy tập thể dục cho não trước khi tập với các anh nhé~"
              </div>
            </div>

            {/* Empty Bank Warning if applicable */}
            {questions.length === 0 && (
              <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-center gap-3 text-left max-w-2xl w-full">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold">Kho câu hỏi hiện đang trống (0 câu).</p>
                  <p className="text-amber-300/80 text-xs mt-0.5">Viện trưởng chưa nạp bộ đề thi nào vào hệ thống.</p>
                </div>
              </div>
            )}

            {/* Exam Rules Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
              <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
                <span className="text-[11px] uppercase font-bold text-purple-300 block">Số Lượng Câu Hỏi</span>
                <span className="text-lg font-bold text-white font-comfortaa">
                  {questions.length > 0 ? `${Math.min(30, questions.length)} Câu Trắc Nghiệm` : '0 Câu Hỏi'}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
                <span className="text-[11px] uppercase font-bold text-purple-300 block">Thời Gian Làm Bài</span>
                <span className="text-lg font-bold text-amber-300 font-comfortaa">{timeLimitMinutes} Phút</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 space-y-1">
                <span className="text-[11px] uppercase font-bold text-purple-300 block">Quy Chuẩn Mở Khóa</span>
                <span className="text-xs font-bold text-emerald-300 block">≥ 7.0đ: Mở 7 bệnh án</span>
                <span className="text-xs font-bold text-pink-300 block">≥ 9.0đ: Mở toàn bộ Viện</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 px-6 rounded-2xl border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-900/30 text-xs font-bold font-comfortaa transition cursor-pointer"
              >
                Trở Về Trang Chủ
              </button>
              <button
                type="button"
                disabled={questions.length === 0}
                onClick={prepareExam}
                className={`flex-1 py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-extrabold font-comfortaa transition shadow-lg flex items-center justify-center gap-2 ${
                  questions.length === 0
                    ? 'bg-purple-950/40 text-purple-400/50 border border-purple-500/20 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white shadow-purple-500/25 hover:scale-105 active:scale-95 cursor-pointer'
                }`}
                id="quiz-btn-ready"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>{questions.length === 0 ? 'Kho Chưa Có Đề' : 'Sẵn Sàng Làm Bài'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: IN PROGRESS EXAM */}
        {/* ========================================================================= */}
        {examState === 'in_progress' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Sticky Header with Floating Timer */}
            <div className="sticky top-0 z-30 bg-[#170826]/95 border-b border-purple-500/30 backdrop-blur-md px-5 py-3.5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white font-comfortaa">
                    Đề Thi Tuyển Bệnh Nhân {isTestMode && <span className="text-amber-400 text-[10px]">[TEST]</span>}
                  </h3>
                  <div className="text-[10px] text-purple-300/80 font-mono">
                    Đã chọn: <span className="font-bold text-pink-300">{answeredCount}</span> / {totalExamCount} câu
                  </div>
                </div>
              </div>

              {/* Floating Sticky Countdown Clock */}
              <div className="flex items-center gap-3">
                <div 
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-extrabold text-sm sm:text-base shadow-lg transition-all ${
                    timeLeft <= 180
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse shadow-rose-500/20'
                      : 'bg-purple-950/80 border-purple-400/50 text-amber-300 shadow-purple-500/10'
                  }`}
                  id="quiz-floating-timer"
                >
                  <Clock className={`w-4 h-4 ${timeLeft <= 180 ? 'text-rose-400 animate-spin' : 'text-amber-300'}`} />
                  <span>{formattedTime}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nộp Bài</span>
                </button>
              </div>
            </div>

            {/* Quick Question Jump Drawer Toggle */}
            <div className="px-5 py-2 bg-black/40 border-b border-purple-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-purple-300/70 font-comfortaa">Tiến độ bài làm:</span>
                <div className="w-32 sm:w-48 h-2 bg-purple-950/80 rounded-full overflow-hidden border border-purple-500/30">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(answeredCount / totalExamCount) * 100}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setJumpNavOpen(!jumpNavOpen)}
                className="text-[11px] font-bold text-purple-300 hover:text-white transition cursor-pointer underline"
              >
                {jumpNavOpen ? 'Ẩn bảng câu hỏi ▲' : 'Xem bảng 30 câu ▼'}
              </button>
            </div>

            {/* Question Quick Jump Grid (Collapsible) */}
            <AnimatePresence>
              {jumpNavOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-black/60 border-b border-purple-500/20 px-5 py-3 overflow-hidden"
                >
                  <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5 max-h-32 overflow-y-auto">
                    {examQuestions.map((_, idx) => {
                      const isAnswered = selectedAnswers[idx] !== undefined;
                      return (
                        <a
                          key={idx}
                          href={`#quiz-question-${idx}`}
                          className={`text-[10px] font-bold py-1.5 rounded-lg text-center transition ${
                            isAnswered
                              ? 'bg-purple-600 text-white font-extrabold shadow'
                              : 'bg-purple-950/40 text-purple-300/60 hover:bg-purple-900/40'
                          }`}
                        >
                          {idx + 1}
                        </a>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable Questions List (Protected with Anti-Cheat & Copy-Prevention) */}
            <div 
              onCopy={handlePreventCopy}
              onCut={handlePreventCopy}
              onDragStart={handlePreventCopy}
              onContextMenu={handlePreventCopy}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-purple-500/30 select-none cursor-default"
              style={{
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                userSelect: 'none',
              }}
            >
              {examQuestions.map((item, qIdx) => {
                const selectedOption = selectedAnswers[qIdx];
                return (
                  <div
                    key={item.id || qIdx}
                    id={`quiz-question-${qIdx}`}
                    className="p-5 sm:p-6 rounded-3xl bg-[#18092A]/80 border border-purple-500/30 space-y-4 hover:border-purple-400/50 transition-all shadow-md"
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 bg-purple-600/30 border border-purple-400/40 text-purple-200 text-xs font-extrabold rounded-xl font-mono">
                          Câu {qIdx + 1}/{totalExamCount}
                        </span>
                        {item.category && (
                          <span className="text-[10px] text-pink-300/80 bg-pink-950/40 border border-pink-500/20 px-2.5 py-0.5 rounded-full font-bold">
                            {item.category}
                          </span>
                        )}
                      </div>
                      {selectedOption !== undefined && (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã chọn
                        </span>
                      )}
                    </div>

                    {/* Question Title */}
                    <h4 className="text-sm sm:text-base font-bold text-white font-comfortaa leading-relaxed">
                      {item.question}
                    </h4>

                    {/* 4 Options (A, B, C, D) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {item.options.map((optText, optIdx) => {
                        const letter = ['A', 'B', 'C', 'D'][optIdx];
                        const isSelected = selectedOption === optIdx;
                        const isOptionDisabled = disabledOptions[qIdx]?.includes(optIdx);

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isOptionDisabled}
                            onClick={() => !isOptionDisabled && handleSelectOption(qIdx, optIdx)}
                            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3 text-xs leading-relaxed ${
                              isOptionDisabled
                                ? 'bg-black/40 border-slate-700/40 text-slate-500 line-through opacity-40 cursor-not-allowed border-dashed'
                                : isSelected
                                ? 'bg-gradient-to-r from-purple-600/50 to-pink-600/40 border-purple-400 text-white font-bold shadow-lg shadow-purple-500/15 scale-[1.01] cursor-pointer'
                                : 'bg-[#0E0317]/80 border-purple-500/20 text-slate-200 hover:border-purple-400/50 hover:bg-purple-950/30 hover:text-white cursor-pointer'
                            }`}
                          >
                            <span 
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-extrabold shrink-0 ${
                                isOptionDisabled
                                  ? 'bg-slate-800 text-slate-500 line-through'
                                  : isSelected
                                  ? 'bg-purple-500 text-white shadow-sm'
                                  : 'bg-purple-950/60 border border-purple-500/30 text-purple-300'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="pt-0.5 select-none flex-1">
                              {optText}
                              {isOptionDisabled && (
                                <span className="ml-2 text-[10px] text-pink-400/80 font-mono no-underline inline-block">
                                  [✕ Gạch bỏ 50/50]
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Submit Action */}
              <div className="pt-6 pb-4 flex flex-col items-center justify-center space-y-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="w-full max-w-md py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-sm font-extrabold font-comfortaa transition shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  id="quiz-btn-submit-bottom"
                >
                  <Send className="w-4 h-4" />
                  <span>Nộp Bài Thi Trắc Nghiệm ({answeredCount}/{totalExamCount})</span>
                </button>
                <p className="text-[11px] text-purple-300/60 italic text-center">
                  Hãy kiểm tra kỹ các câu hỏi trước khi nộp. Kết quả sẽ được công bố ngay sau khi bấm nộp!
                </p>
              </div>
            </div>

            {/* In-Exam Notification Toast */}
            <AnimatePresence>
              {examToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl border text-xs sm:text-sm font-extrabold font-comfortaa shadow-2xl backdrop-blur-xl flex items-center gap-2.5 ${
                    examToast.type === 'success'
                      ? 'bg-pink-950/90 border-pink-400 text-pink-200 shadow-pink-500/30'
                      : examToast.type === 'danger'
                      ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-rose-500/30'
                      : 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-emerald-500/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin shrink-0" />
                  <span>{examToast.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fruit Ninja Slicing Minigame Overlay (Triggered when timeLeft <= 15s) */}
            <AnimatePresence>
              {showFruitNinja && (
                <FruitNinjaOverlay
                  onAddTime={handleFruitAddTime}
                  onAvocadoEffect={handleFruitAvocadoEffect}
                  onFinish={() => setShowFruitNinja(false)}
                />
              )}
            </AnimatePresence>

            {/* Confirm Submit Dialog Overlay */}
            <AnimatePresence>
              {showConfirmSubmit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-[#19092B] border border-purple-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-400/40 flex items-center justify-center mx-auto text-2xl">
                      📝
                    </div>
                    <h3 className="text-base font-bold text-white font-comfortaa">
                      Xác Nhận Nộp Bài?
                    </h3>
                    <div className="text-xs text-purple-200/80 leading-relaxed">
                      Bạn đã hoàn thành <span className="font-bold text-pink-300">{answeredCount}</span> trên tổng số <span className="font-bold text-pink-300">{totalExamCount}</span> câu hỏi.
                      {answeredCount < totalExamCount && (
                        <p className="text-amber-300 font-bold mt-2">
                          ⚠️ Vẫn còn {totalExamCount - answeredCount} câu chưa chọn đáp án!
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmSubmit(false)}
                        className="flex-1 py-2.5 rounded-xl border border-purple-500/30 text-purple-200 text-xs font-bold cursor-pointer hover:bg-purple-900/30"
                      >
                        Làm tiếp
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowConfirmSubmit(false);
                          calculateAndSubmit();
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer shadow-lg shadow-emerald-600/20"
                      >
                        Xác nhận nộp
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: RESULT SCREEN (STRICTLY ONLY SCORES - NO ANSWER REVEALS) */}
        {/* ========================================================================= */}
        {examState === 'result' && currentResult && (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
            {/* Outcome Icon & Header */}
            {currentResult.passedTier === 'tier2' ? (
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-pink-500 border border-amber-300/60 flex items-center justify-center text-3xl shadow-xl shadow-pink-500/25 animate-bounce">
                👑
              </div>
            ) : currentResult.passedTier === 'tier1' ? (
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-emerald-500 border border-emerald-400/60 flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/25">
                🎉
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-700 to-purple-900 border border-rose-500/40 flex items-center justify-center text-3xl shadow-xl shadow-rose-500/25">
                🥀
              </div>
            )}

            {/* Score Summary Display */}
            <div className="space-y-2 max-w-lg">
              <span className="text-[11px] uppercase font-mono font-extrabold tracking-widest text-purple-300">
                KẾT QUẢ KHẢO SÁT ĐẦU VÀO
              </span>
              <div className="text-4xl sm:text-5xl font-black text-white font-comfortaa">
                {currentResult.score} <span className="text-lg sm:text-2xl text-purple-300">/ 10 Điểm</span>
              </div>
              <div className="text-xs sm:text-sm text-purple-200/90 font-mono">
                Số câu trả lời chuẩn xác: <span className="font-bold text-pink-300">{currentResult.correctCount}</span> / {currentResult.totalQuestions} câu
              </div>
            </div>

            {/* Custom Messages as requested by User */}
            <div className="w-full max-w-xl">
              {currentResult.passedTier === 'tier2' ? (
                /* >= 9.0 points */
                <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/60 to-purple-950/60 border border-amber-400/40 space-y-2 shadow-inner">
                  <div className="text-amber-300 text-base sm:text-lg font-bold font-comfortaa leading-relaxed">
                    "Quá ghê gớm! Đỉnh cao! Cổ điển! Sang trọng! Em xứng đáng có được tất cả chúng tôi!"
                  </div>
                  <p className="text-xs text-purple-200/80 font-sans">
                    ✨ Toàn bộ kho bệnh án của tất cả các anh chồng đã được mở khóa tự do cho bé trong vòng 1 tiếng!
                  </p>
                </div>
              ) : currentResult.passedTier === 'tier1' ? (
                /* 7.0 to 8.9 points */
                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 to-purple-950/60 border border-emerald-400/40 space-y-2 shadow-inner">
                  <div className="text-emerald-300 text-base sm:text-lg font-bold font-comfortaa leading-relaxed">
                    "Ôi cục dàng của anh giỏi quá! Chúc em lọ vui vẻ với một vài anh chồng thơm tho này nha~"
                  </div>
                  <p className="text-xs text-purple-200/80 font-sans">
                    ✨ 7 bệnh án kỳ cựu nhất của Viện đã được mở khóa cho bé trong vòng 1 tiếng!
                  </p>
                </div>
              ) : (
                /* < 7.0 points */
                <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-950/60 to-purple-950/60 border border-rose-500/40 space-y-2 shadow-inner">
                  <div className="text-rose-300 text-base sm:text-lg font-bold font-comfortaa leading-relaxed">
                    "Chà...bảo bối đã vất vả rồi. Nghỉ ngơi đi và hẹn bé sau 30 phút nữa."
                  </div>
                  <p className="text-xs text-purple-200/80 font-sans">
                    ⏳ Hệ thống sẽ tạm thời đóng cửa nghỉ ngơi trong 30 phút. Hết 30 phút, một bộ đề 30 câu mới sẽ được mở để bé thử sức lại nhé!
                  </p>
                </div>
              )}
            </div>

            {/* Strict Notice about No Answer Keys */}
            <div className="text-[11px] text-purple-300/60 italic max-w-md">
              (Bảo mật Viện Cố Thị: Hệ thống không công bố danh sách đáp án đúng/sai để đảm bảo tính công bằng và chống học vẹt.)
            </div>

            {/* Next Action Button */}
            <div className="w-full max-w-md pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`w-full py-4 px-6 rounded-2xl text-xs sm:text-sm font-extrabold font-comfortaa transition shadow-lg hover:scale-[1.02] active:scale-95 cursor-pointer ${
                  currentResult.passedTier !== 'failed'
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-emerald-600 text-white shadow-purple-500/20'
                    : 'bg-gradient-to-r from-rose-700 to-purple-900 text-white shadow-rose-900/30'
                }`}
                id="quiz-btn-finish"
              >
                {currentResult.passedTier !== 'failed' ? '🚀 Tiến Vào Viện Ngay' : '🚪 Tuân Lệnh Nghỉ Ngơi (30 Phút)'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
