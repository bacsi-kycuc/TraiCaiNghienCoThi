import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Award, Clock, Users, CheckCircle, Lock, Unlock, ArrowLeft, RotateCcw, AlertCircle, Bell, Trash2, Edit } from "lucide-react";
import { Prompt } from "../types";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

const vipBannerBg = "https://i.postimg.cc/8z9d585n/2500979f50b9812fe9979636c1e155bd.jpg";

interface VipZoneViewProps {
  prompts: Prompt[];
  currentUser: string | null;
  isAdmin: boolean;
  onBack: () => void;
  isOfflineMode: boolean;
  setToastMessage: (msg: string) => void;
  onUpdatePrompts?: (updatedPrompts: Prompt[]) => void;
}

export default function VipZoneView({
  prompts,
  currentUser,
  isAdmin,
  onBack,
  isOfflineMode,
  setToastMessage,
  onUpdatePrompts,
}: VipZoneViewProps) {
  const [now, setNow] = useState(Date.now());
  const [selectedPromptToEdit, setSelectedPromptToEdit] = useState<Prompt | null>(null);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showSecondDeleteConfirm, setShowSecondDeleteConfirm] = useState(false);

  const [editMaxWinners, setEditMaxWinners] = useState(1);
  const [editDrawDuration, setEditDrawDuration] = useState(10);
  const [editLinkVisibleDuration, setEditLinkVisibleDuration] = useState(10);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  useEffect(() => {
    if (selectedPromptToEdit) {
      setEditMaxWinners(selectedPromptToEdit.maxWinners || 1);
      setEditDrawDuration(selectedPromptToEdit.drawDuration || 10);
      setEditLinkVisibleDuration(selectedPromptToEdit.linkVisibleDuration || 10);
    }
  }, [selectedPromptToEdit]);

  // Keep current time updated every second for precise live countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter prompts to get those that are marked as Giveaway
  const giveawayPrompts = prompts.filter((p) => p.isGiveaway === true);

  // If there are multiple, sort them so the active or newest one comes first
  const sortedGiveaways = [...giveawayPrompts].sort((a, b) => {
    const aTime = a.giveawayStartTime ? new Date(a.giveawayStartTime).getTime() : 0;
    const bTime = b.giveawayStartTime ? new Date(b.giveawayStartTime).getTime() : 0;
    return bTime - aTime;
  });

  const handleAttendance = async (prompt: Prompt) => {
    if (!currentUser) {
      setToastMessage("⚠️ Bạn cần đăng nhập để tham gia điểm danh!");
      return;
    }

    const currentParticipants = prompt.participants || [];
    if (currentParticipants.includes(currentUser)) {
      setToastMessage("😊 Bạn đã điểm danh cho bài đăng này rồi!");
      return;
    }

    const updatedParticipants = [...currentParticipants, currentUser];

    try {
      if (isOfflineMode) {
        // Fallback update
        const saved = localStorage.getItem("local_prompts");
        if (saved) {
          const allPrompts: Prompt[] = JSON.parse(saved);
          const idx = allPrompts.findIndex((p) => p.id === prompt.id);
          if (idx !== -1) {
            allPrompts[idx].participants = updatedParticipants;
            localStorage.setItem("local_prompts", JSON.stringify(allPrompts));
            if (onUpdatePrompts) {
              onUpdatePrompts(allPrompts);
            }
            setToastMessage("🎟️ Điểm danh thành công (Chế độ ngoại tuyến)!");
          }
        }
      } else {
        const docId = `prompt_${prompt.id}`;
        const promptRef = doc(db, "prompts", docId);
        await setDoc(promptRef, { participants: updatedParticipants }, { merge: true });
        setToastMessage("🎉 Điểm danh thành công! Hãy chờ hết giờ để xem kết quả nhé.");
        window.dispatchEvent(new CustomEvent("celebrate-confetti"));
      }
    } catch (error) {
      console.error("Lỗi cập nhật điểm danh: ", error);
      setToastMessage("❌ Điểm danh thất bại! Vui lòng thử lại sau.");
    }
  };

  const triggerDraw = async (prompt: Prompt) => {
    const participants = prompt.participants || [];
    const maxWinners = prompt.maxWinners || 1;

    let selectedWinners: string[] = [];
    if (participants.length > 0) {
      // Pick random winners
      const pool = [...participants];
      const count = Math.min(maxWinners, pool.length);
      for (let i = 0; i < count; i++) {
        const randIdx = Math.floor(Math.random() * pool.length);
        selectedWinners.push(pool[randIdx]);
        pool.splice(randIdx, 1);
      }
    }

    try {
      if (isOfflineMode) {
        const saved = localStorage.getItem("local_prompts");
        if (saved) {
          const allPrompts: Prompt[] = JSON.parse(saved);
          const idx = allPrompts.findIndex((p) => p.id === prompt.id);
          if (idx !== -1) {
            allPrompts[idx].winners = selectedWinners;
            allPrompts[idx].giveawayStatus = "drawn";
            allPrompts[idx].drawnTime = new Date().toISOString();
            localStorage.setItem("local_prompts", JSON.stringify(allPrompts));
            if (onUpdatePrompts) {
              onUpdatePrompts(allPrompts);
            }
          }
        }
      } else {
        const docId = `prompt_${prompt.id}`;
        const promptRef = doc(db, "prompts", docId);
        await setDoc(
          promptRef,
          {
            winners: selectedWinners,
            giveawayStatus: "drawn",
            drawnTime: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      setToastMessage("⚡ Vòng quay may mắn đã mở! Các người chiến thắng đã lộ diện.");
    } catch (error) {
      console.error("Lỗi rút giải may mắn: ", error);
    }
  };

  const handleUpdateGiveawaySettings = async (prompt: Prompt) => {
    try {
      if (isOfflineMode) {
        const saved = localStorage.getItem("local_prompts");
        if (saved) {
          const allPrompts: Prompt[] = JSON.parse(saved);
          const idx = allPrompts.findIndex((p) => p.id === prompt.id);
          if (idx !== -1) {
            allPrompts[idx].participants = [];
            allPrompts[idx].winners = [];
            allPrompts[idx].giveawayStatus = "active";
            allPrompts[idx].giveawayStartTime = new Date().toISOString();
            allPrompts[idx].drawnTime = "";
            allPrompts[idx].maxWinners = editMaxWinners;
            allPrompts[idx].drawDuration = editDrawDuration;
            allPrompts[idx].linkVisibleDuration = editLinkVisibleDuration;
            localStorage.setItem("local_prompts", JSON.stringify(allPrompts));
            if (onUpdatePrompts) {
              onUpdatePrompts(allPrompts);
            }
          }
        }
      } else {
        const docId = `prompt_${prompt.id}`;
        const promptRef = doc(db, "prompts", docId);
        await setDoc(
          promptRef,
          {
            participants: [],
            winners: [],
            giveawayStatus: "active",
            giveawayStartTime: new Date().toISOString(),
            drawnTime: "",
            maxWinners: editMaxWinners,
            drawDuration: editDrawDuration,
            linkVisibleDuration: editLinkVisibleDuration,
          },
          { merge: true }
        );
      }
      setToastMessage("Đã chỉnh sửa GIVEAWAY thành công!");
      setIsEditingSettings(false);
    } catch (error) {
      console.error("Lỗi cập nhật giveaway: ", error);
      setToastMessage("❌ Cập nhật thất bại!");
    }
  };

  const handleDeleteGiveaway = async (prompt: Prompt) => {
    try {
      if (isOfflineMode) {
        const saved = localStorage.getItem("local_prompts");
        if (saved) {
          const allPrompts: Prompt[] = JSON.parse(saved);
          const updated = allPrompts.filter((p) => p.id !== prompt.id);
          localStorage.setItem("local_prompts", JSON.stringify(updated));
          if (onUpdatePrompts) {
            onUpdatePrompts(updated);
          }
        }
      } else {
        const docId = `prompt_${prompt.id}`;
        const promptRef = doc(db, "prompts", docId);
        await deleteDoc(promptRef);
      }
      setToastMessage("Đã xóa GIVEAWAY thành công!");
    } catch (error) {
      console.error("Lỗi xóa bệnh án: ", error);
      setToastMessage("❌ Xóa bệnh án thất bại!");
    }
  };

  return (
    <div
      className="min-h-[80vh] flex flex-col p-4 md:p-6 text-[#ECE3ED] select-none rounded-3xl"
      style={{
        '--zone-primary': '#D2B4C8',
        '--zone-primary-lighter': 'rgba(210, 180, 200, 0.12)',
        '--zone-border': '#664A5C',
        '--card': '#3C2A36',
        '--text': '#ECE3ED',
        background: 'linear-gradient(135deg, #241A22 0%, #2E212B 60%, #3B2A37 100%)',
      } as React.CSSProperties}
    >
      <style>{`
        @keyframes run-glitter {
          0% {
            background-image: radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.15) 0%, transparent 20%), radial-gradient(circle at 80% 30%, rgba(210, 180, 200, 0.12) 0%, transparent 30%);
          }
          25% {
            background-image: radial-gradient(circle at 90% 40%, rgba(255, 255, 255, 0.18) 0%, transparent 15%), radial-gradient(circle at 30% 70%, rgba(210, 180, 200, 0.15) 0%, transparent 25%);
          }
          50% {
            background-image: radial-gradient(circle at 50% 90%, rgba(255, 255, 255, 0.15) 0%, transparent 25%), radial-gradient(circle at 70% 10%, rgba(210, 180, 200, 0.12) 0%, transparent 20%);
          }
          75% {
            background-image: radial-gradient(circle at 20% 60%, rgba(255, 255, 255, 0.18) 0%, transparent 20%), radial-gradient(circle at 80% 80%, rgba(210, 180, 200, 0.15) 0%, transparent 30%);
          }
          100% {
            background-image: radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.15) 0%, transparent 20%), radial-gradient(circle at 80% 30%, rgba(210, 180, 200, 0.12) 0%, transparent 30%);
          }
        }
        .animate-run-glitter {
          background-size: 100% 100%;
          animation: run-glitter 8s infinite linear;
        }
      `}</style>

      {/* Top action bar */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-[#3C2A36]/80 hover:bg-[#D2B4C8]/15 border-2 border-[#664A5C] hover:border-[#D2B4C8] text-[#ECE3ED] text-xs font-bold rounded-2xl transition cursor-pointer hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#D2B4C8]" />
          Quay lại màn chính
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#2E212B]/90 border border-[#D2B4C8]/30 text-[#ECE3ED] px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1">
            ✨ VIP Floor
          </span>
        </div>
      </div>

      <div className="max-w-[750px] w-full mx-auto space-y-6">
        {/* Intro banner */}
        <div 
          className="relative overflow-hidden p-6 md:p-8 border-2 border-[#D2B4C8]/40 rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-center select-none bg-cover bg-center"
          style={{ backgroundImage: `url(${vipBannerBg})` }}
        >
          {/* Subtle dimming overlay so the banner image displays clearly and sharply */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-purple-950/20 mix-blend-color-burn pointer-events-none" />
          
          <div className="relative z-10">
            <span className="text-5xl md:text-6xl filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.95)] animate-pulse inline-block mb-2">
              🏆
            </span>
            <h1
              style={{ 
                fontFamily: '"Cormorant Garamond", serif',
                textShadow: '0 2px 12px rgba(0, 0, 0, 0.95), 0 0 25px rgba(210, 180, 200, 0.7), 0 0 5px rgba(0, 0, 0, 1)' 
              }}
              className="text-3xl md:text-4xl font-black italic text-white tracking-wide"
            >
              Săn Slot VIP
            </h1>
            <p 
              style={{
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.95), 0 0 5px rgba(0, 0, 0, 1)'
              }}
              className="text-white text-xs md:text-sm mt-2 max-w-[550px] mx-auto leading-relaxed font-black tracking-wide"
            >
              Nơi trưng bày các điều dưỡng độc quyền của Trại! Điểm danh ngay để có cơ hội được thăm bệnh riêng tư nào~
            </p>
          </div>
        </div>

        {sortedGiveaways.length === 0 ? (
          <div className="text-center py-16 bg-[var(--card)]/40 border-2 border-dashed border-[#664A5C]/50 text-[#ECE3ED]/70 rounded-3xl text-sm flex flex-col items-center justify-center gap-3">
            <span className="text-4xl">🕊️</span>
            <span className="font-semibold text-xs text-[#ECE3ED]/80">
              Phòng khám đặc biệt chưa mở.
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedGiveaways.map((prompt) => {
              // Calculate phases and times
              const startTime = prompt.giveawayStartTime ? new Date(prompt.giveawayStartTime).getTime() : Date.now();
              const drawDurationMs = (prompt.drawDuration || 10) * 60 * 1000;
              const drawTime = startTime + drawDurationMs;

              const isBeforeDraw = now < drawTime;
              const participants = prompt.participants || [];
              const winners = prompt.winners || [];
              const isParticipant = currentUser ? participants.some(p => p.trim().toLowerCase() === currentUser.trim().toLowerCase()) : false;

              // Check if drawn but not expired
              let displayStatus: "registering" | "drawn" | "ended" = "registering";
              let linkVisibleTimeRemaining = 0;

              if (!isBeforeDraw) {
                // If draw is complete, check reveal visibility duration
                const drawnTime = prompt.drawnTime ? new Date(prompt.drawnTime).getTime() : drawTime;
                const visibleDurationMs = (prompt.linkVisibleDuration || 10) * 60 * 1000;
                const expireTime = drawnTime + visibleDurationMs;

                if (now < expireTime) {
                  displayStatus = "drawn";
                  linkVisibleTimeRemaining = Math.max(0, expireTime - now);
                  
                  // Auto trigger draw update in database if status is still active (lazy trigger)
                  if (prompt.giveawayStatus === "active") {
                    triggerDraw(prompt);
                  }
                } else {
                  displayStatus = "ended";
                  
                  // If status is still drawn, we can let it transition to ended
                  // In client-side logic we treat it as ended based on time
                }
              }

              // Time formatting helper
              const formatCountdown = (ms: number) => {
                const totalSec = Math.floor(ms / 1000);
                const hrs = Math.floor(totalSec / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;
                
                const zeroPad = (num: number) => num.toString().padStart(2, "0");
                return hrs > 0 
                  ? `${zeroPad(hrs)}:${zeroPad(mins)}:${zeroPad(secs)}`
                  : `${zeroPad(mins)}:${zeroPad(secs)}`;
              };

              const userIsWinner = currentUser ? winners.some(w => w.trim().toLowerCase() === currentUser.trim().toLowerCase()) : false;

              return (
                <motion.div
                  key={prompt.id}
                  id={`prompt-${prompt.id}`}
                  className="bg-[#3C2A36]/95 border-2 border-[#664A5C]/50 hover:border-[#D2B4C8]/70 rounded-3xl p-5 shadow-2xl relative select-none overflow-hidden"
                  whileHover={{
                    scale: 1.025,
                    rotate: [0, -0.4, 0.4, -0.4, 0.4, 0],
                    transition: {
                      rotate: {
                        repeat: Infinity,
                        duration: 0.35,
                        ease: "linear"
                      },
                      scale: {
                        duration: 0.2
                      }
                    }
                  }}
                >
                  {/* Glitter running overlay */}
                  <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden mix-blend-screen opacity-40 z-0">
                    <div className="absolute inset-0 animate-run-glitter" />
                  </div>

                  {/* Status Indicator Badges */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    {displayStatus === "registering" && (
                      <span className="bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3" /> Đang điểm danh
                      </span>
                    )}
                    {displayStatus === "drawn" && (
                      <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Unlock className="w-3 h-3 animate-bounce" /> Đã công bố
                      </span>
                    )}
                    {displayStatus === "ended" && (
                      <span className="bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Hết hạn/Khóa
                      </span>
                    )}
                  </div>

                  {/* Prompt Preview Metadata */}
                  <div className="flex gap-4 items-start mb-5 pr-28 z-10 relative">
                    <span className="text-4xl p-2 bg-[#2E212B]/75 border border-[#D2B4C8]/30 rounded-2xl">
                      {prompt.icon || "📝"}
                    </span>
                    <div>
                      <h3 className="font-comfortaa text-lg font-bold text-[#ECE3ED] flex items-center gap-2">
                        {prompt.title}
                      </h3>
                      <p className="text-xs text-[#D2B4C8] font-bold uppercase tracking-wider mt-1">
                        {prompt.genre}
                      </p>
                    </div>
                  </div>

                  {/* Symptoms & Description (same styling as main cards but locked feel) */}
                  <div className="p-4 bg-black/30 rounded-2xl border border-[#664A5C]/35 mb-5 z-10 relative">
                    <p className="text-xs text-[#ECE3ED]/85 font-medium leading-relaxed italic">
                      "{prompt.description || "Bệnh án đặc biệt chưa có thông tin bổ sung."}"
                    </p>
                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {prompt.tags.map((t, idx) => (
                          <span key={idx} className="bg-[#2E212B]/60 text-[#ECE3ED] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#D2B4C8]/25">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Giveaway Logic Dashboard Box */}
                  <div className="p-4 bg-[#2E212B]/45 border border-[#664A5C]/40 rounded-2xl space-y-4 z-10 relative">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                      <div className="p-2 bg-black/25 rounded-xl border border-[#664A5C]/30">
                        <span className="block text-[9px] uppercase tracking-wider text-[#D2B4C8] font-extrabold mb-0.5">
                          🎁 Số Slot Thắng
                        </span>
                        <span className="font-comfortaa text-sm font-extrabold text-[#ECE3ED]">
                          {prompt.maxWinners || 1} người
                        </span>
                      </div>
                      <div className="p-2 bg-black/25 rounded-xl border border-[#664A5C]/30">
                        <span className="block text-[9px] uppercase tracking-wider text-[#D2B4C8] font-extrabold mb-0.5">
                          🎟️ Tổng điểm danh
                        </span>
                        <span className="font-comfortaa text-sm font-extrabold text-[#ECE3ED] flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#D2B4C8]" />
                          {participants.length}
                        </span>
                      </div>
                      <div className="col-span-2 md:col-span-1 p-2 bg-[#664A5C]/25 rounded-xl border border-[#D2B4C8]/25 flex flex-col justify-center items-center">
                        <span className="block text-[9px] uppercase tracking-wider text-[#D2B4C8] font-extrabold mb-0.5">
                          {displayStatus === "registering" ? "🕒 Thời gian còn lại" : "🕒 Thời gian mở link"}
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-200 animate-pulse tracking-widest">
                          {displayStatus === "registering"
                            ? formatCountdown(Math.max(0, drawTime - now))
                            : displayStatus === "drawn"
                            ? formatCountdown(linkVisibleTimeRemaining)
                            : "Đã hết giờ"}
                        </span>
                      </div>
                    </div>

                    {/* Interactive triggers */}
                    <div className="pt-2">
                      {displayStatus === "registering" ? (
                        <div className="space-y-3">
                          {isParticipant ? (
                            <button
                              disabled
                              className="w-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/25 py-3 rounded-2xl text-xs font-bold font-comfortaa flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              Đã điểm danh. Bé chờ nhé!
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAttendance(prompt)}
                              className="w-full bg-gradient-to-r from-[#664A5C] to-[#D2B4C8] hover:brightness-110 active:scale-98 text-white font-extrabold py-3 rounded-2xl text-xs font-comfortaa transition shadow-lg shadow-[#664A5C]/30 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02]"
                            >
                              🎫 ĐIỂM DANH GIẬT SLOT NGAY
                            </button>
                          )}
                          <p className="text-[10px] text-[#ECE3ED]/70 text-center italic font-medium">
                            * Vui lòng ghi nhớ thời gian đếm ngược để quay lại kiểm tra kết quả thắng cuộc.
                          </p>
                        </div>
                      ) : displayStatus === "drawn" ? (
                        <div className="space-y-3">
                          {userIsWinner ? (
                            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-3">
                              <span className="text-3xl animate-bounce inline-block">🎉</span>
                              <h4 className="font-comfortaa text-emerald-400 font-extrabold text-sm">
                                GIVEAWAY ĐÃ KẾT THÚC. ĐIỀU DƯỠNG ĐÃ CHỌN BẠN!
                              </h4>
                              <p className="text-[10px] text-slate-300 font-semibold leading-normal">
                                Lưu ý thời gian khu VIP mở link để mau chóng vào thăm khám trước khi thời gian mở link kết thúc!
                              </p>
                              
                              <a
                                href={prompt.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow transition cursor-pointer hover:scale-105 active:scale-95"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                ĐẾN VỚI ANH ẤY NGAY 👩‍⚕️
                              </a>
                            </div>
                          ) : (
                            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
                              <span className="text-3xl inline-block">😭</span>
                              <h4 className="font-comfortaa text-rose-400 font-extrabold text-xs mb-1">
                                GIVEAWAY ĐÃ KẾT THÚC. ĐIỀU DƯỠNG ĐÃ CHỌN:
                              </h4>
                              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                                {winners.map((w, idx) => (
                                  <span key={idx} className="bg-[#2E212B] text-[#ECE3ED] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#664A5C]/35">
                                    🌟 {w}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-950/90 border border-slate-850 rounded-2xl p-4 text-center space-y-2">
                          <span className="text-3xl inline-block">🔒</span>
                          <h4 className="font-comfortaa text-slate-400 font-bold text-xs">
                            KỲ GIVEAWAY ĐÃ KẾT THÚC VÀ ĐƯỜNG LINK ĐÃ KHÓA
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            Thời gian hiển thị liên kết đặc quyền cho người chiến thắng đã hết hạn. Đường dẫn đã tự động khóa bảo mật tối cao lại lần nữa.
                          </p>
                          {winners.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold self-center">Người đã thắng:</span>
                              {winners.map((w, idx) => (
                                <span key={idx} className="bg-slate-900 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                  {w}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Reset Controllers */}
                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-[#664A5C]/30 flex justify-between items-center bg-black/20 px-4 py-3 rounded-2xl z-10 relative">
                      <div className="text-left">
                        <span className="block text-[10px] font-bold text-[#D2B4C8] uppercase tracking-wider">
                          Đặc quyền Quản trị viên
                        </span>
                        <p className="text-[9px] text-[#ECE3ED]/70 font-medium mt-0.5">
                          Admin có thể chỉnh sửa đợt hoặc xóa vĩnh viễn bệnh án giveaway này.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPromptToEdit(prompt);
                          setShowEditConfirmModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E212B] border border-[#D2B4C8]/25 hover:border-[#D2B4C8]/60 text-[#ECE3ED] text-[10px] font-bold rounded-xl transition cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Chỉnh sửa
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Edit/Manage Giveaway Dialog */}
      <AnimatePresence>
        {showEditConfirmModal && selectedPromptToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditConfirmModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-[#3C2A36]/95 border-2 border-[#664A5C]/60 rounded-3xl p-6 shadow-2xl text-left overflow-hidden z-10"
            >
              {/* Premium top accent glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D2B4C8] to-transparent shadow-[0_0_15px_rgba(210,180,200,0.5)]" />

              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#2E212B]/70 border border-[#664A5C]/45 rounded-2xl text-[#D2B4C8]">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-base font-bold font-comfortaa text-[#ECE3ED] uppercase tracking-tight">
                    QUẢN TRỊ VIÊN: CHỈNH SỬA GIVEAWAY
                  </h3>
                  <p className="text-xs text-[#ECE3ED]/75 font-medium">
                    {selectedPromptToEdit.title}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {!isEditingSettings ? (
                  <>
                    <p className="text-xs text-[#ECE3ED]/90 leading-relaxed font-semibold">
                      Vui lòng chọn thao tác bạn muốn thực hiện đối với hoạt động Giveaway của bệnh án này:
                    </p>

                    <div className="space-y-2">
                      {/* Option 1: Edit Settings */}
                      <button
                        onClick={() => {
                          setIsEditingSettings(true);
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-[#2E212B]/30 hover:bg-[#2E212B]/75 border border-[#664A5C]/30 hover:border-[#D2B4C8]/50 rounded-2xl transition text-left cursor-pointer group"
                      >
                        <div className="p-2 bg-[#3C2A36] rounded-xl group-hover:scale-110 transition">
                          <RotateCcw className="w-4 h-4 text-[#D2B4C8]" />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-[#ECE3ED]">Chỉnh thời gian (Reset đợt mới)</span>
                          <span className="block text-[10px] text-[#ECE3ED]/60 font-medium mt-0.5">Chỉnh sửa slot thắng, thời gian mở giveaway/link và chạy lại.</span>
                        </div>
                      </button>

                      {/* Option 2: Delete completely */}
                      <button
                        onClick={() => {
                          setShowSecondDeleteConfirm(true);
                          setShowEditConfirmModal(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-red-950/30 hover:bg-red-950/60 border border-red-500/20 hover:border-red-500/50 rounded-2xl transition text-left cursor-pointer group"
                      >
                        <div className="p-2 bg-red-950 rounded-xl group-hover:scale-110 transition">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-red-200">Xóa vĩnh viễn bệnh án</span>
                          <span className="block text-[10px] text-red-300/60 font-medium mt-0.5">Xóa hoàn toàn bệnh án này khỏi hệ thống cơ sở dữ liệu.</span>
                        </div>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3 bg-black/35 p-4 rounded-2xl border border-[#664A5C]/40">
                      <div>
                        <label className="block text-[10px] font-bold text-[#D2B4C8] uppercase mb-1">Số lượng Slot thắng:</label>
                        <input
                          type="number"
                          value={editMaxWinners}
                          onChange={(e) => setEditMaxWinners(Number(e.target.value))}
                          className="w-full bg-[#3C2A36]/50 border border-[#664A5C]/50 focus:border-[#D2B4C8] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#D2B4C8] uppercase mb-1">Thời gian mở Giveaway (phút):</label>
                        <input
                          type="number"
                          value={editDrawDuration}
                          onChange={(e) => setEditDrawDuration(Number(e.target.value))}
                          className="w-full bg-[#3C2A36]/50 border border-[#664A5C]/50 focus:border-[#D2B4C8] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#D2B4C8] uppercase mb-1">Thời gian hiển thị Link (phút):</label>
                        <input
                          type="number"
                          value={editLinkVisibleDuration}
                          onChange={(e) => setEditLinkVisibleDuration(Number(e.target.value))}
                          className="w-full bg-[#3C2A36]/50 border border-[#664A5C]/50 focus:border-[#D2B4C8] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleUpdateGiveawaySettings(selectedPromptToEdit)}
                      className="w-full bg-gradient-to-r from-[#664A5C] to-[#D2B4C8] hover:brightness-110 text-white font-bold py-3 rounded-2xl text-xs transition shadow-lg shadow-[#664A5C]/30 cursor-pointer"
                    >
                      💾 LƯU THAY ĐỔI & RESET ĐỢT MỚI
                    </button>
                    
                    <button
                      onClick={() => setIsEditingSettings(false)}
                      className="w-full bg-[#2E212B]/60 hover:bg-[#2E212B]/90 text-[#ECE3ED]/80 font-bold py-2 rounded-xl text-[10px] transition cursor-pointer"
                    >
                      Quay lại
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-[#D2B4C8]/20 pt-4">
                <button
                  onClick={() => setShowEditConfirmModal(false)}
                  className="px-4 py-2 bg-[#3C2A36] border border-[#664A5C] hover:border-[#D2B4C8] text-[#ECE3ED] text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Second Confirmation Dialog for Deletion */}
      <AnimatePresence>
        {showSecondDeleteConfirm && selectedPromptToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSecondDeleteConfirm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-sm bg-red-950/95 border-2 border-red-500/50 rounded-3xl p-6 shadow-2xl text-left overflow-hidden z-10"
            >
              {/* Premium top accent glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.5)]" />

              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-900/50 border border-red-500/30 rounded-2xl text-red-400">
                  <AlertCircle className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-base font-bold font-comfortaa text-red-200 uppercase tracking-tight">
                    ⚠️ XÁC NHẬN XÓA VĨNH VIỄN
                  </h3>
                  <p className="text-xs text-red-300/80 font-medium">
                    {selectedPromptToEdit.title}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bé có chắc chắn muốn xóa vĩnh viễn bệnh án này không? Thao tác này hoàn toàn <strong className="text-red-400 font-bold">KHÔNG THỂ KHÔI PHỤC</strong> và sẽ thiêu hủy toàn bộ dữ liệu điểm danh cũng như lượt thắng của bệnh án này.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-red-500/10 pt-4">
                <button
                  onClick={() => setShowSecondDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => {
                    handleDeleteGiveaway(selectedPromptToEdit);
                    setShowSecondDeleteConfirm(false);
                    setSelectedPromptToEdit(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-red-600/35"
                >
                  Đúng vậy, xóa vĩnh viễn!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
