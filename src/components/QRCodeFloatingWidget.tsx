import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, X, Download, Sparkles, ExternalLink, Copy, Check } from 'lucide-react';
import { Settings } from '../types';

interface QRCodeFloatingWidgetProps {
  settings: Settings;
}

export default function QRCodeFloatingWidget({ settings }: QRCodeFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCopiedNote, setHasCopiedNote] = useState(false);

  const isEnabled = settings.qrCodeEnabled !== false;
  const qrImage = settings.qrCodeImage || '';
  const qrTitle = settings.qrCodeTitle || 'Mã QR Viện Cố Thị';
  const qrNote = settings.qrCodeNote || '';

  // Do not render floating button if disabled or if there's completely no QR data configured
  if (!isEnabled || (!qrImage && !qrNote && !settings.qrCodeTitle)) {
    return null;
  }

  const handleDownload = () => {
    if (!qrImage) return;

    try {
      const link = document.createElement('a');
      link.href = qrImage;
      link.download = settings.qrCodeFileName || 'ma-qr-vien-co-thi.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Lỗi khi tải ảnh QR:', e);
      window.open(qrImage, '_blank');
    }
  };

  const handleCopyNote = () => {
    if (!qrNote) return;
    navigator.clipboard.writeText(qrNote).then(() => {
      setHasCopiedNote(true);
      setTimeout(() => setHasCopiedNote(false), 2000);
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-[8500] flex items-center group"
      >
        {/* Floating Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          id="floating-qr-code-btn"
          aria-label="Mở Mã QR"
          className="relative overflow-hidden w-12 h-12 md:w-13 md:h-13 rounded-full border-2 border-[#F2C4CD]/70 hover:border-[#F2C4CD] shadow-[0_10px_30px_rgba(5,31,69,0.8),0_0_20px_rgba(242,196,205,0.4)] hover:shadow-[0_12px_35px_rgba(242,196,205,0.65),0_0_30px_rgba(11,49,105,0.9)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          style={{
            background:
              'radial-gradient(circle at 20% 25%, #0B3169 0%, #051F45 35%, #5B2C52 65%, #B86588 85%, #F2C4CD 100%)',
          }}
        >
          {/* Water sheen reflection overlay */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none mix-blend-screen transition-opacity duration-500 group-hover:opacity-75"
            style={{
              background:
                'radial-gradient(ellipse 90% 70% at 85% 75%, #F2C4CD 0%, rgba(242, 196, 205, 0.4) 40%, transparent 70%), radial-gradient(ellipse 60% 50% at 20% 30%, rgba(11, 49, 105, 0.8) 0%, transparent 80%)',
            }}
          />

          {/* Glowing Beacon Pulse Ring */}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#F2C4CD] border-2 border-[#051F45] animate-ping opacity-75" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#F2C4CD] border-2 border-[#051F45]" />

          {/* QR Icon */}
          <QrCode className="w-6 h-6 text-white stroke-[2.2] relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-200" />
        </button>

        {/* Floating Tooltip Label on Hover (Desktop) */}
        <span className="hidden sm:inline-block ml-2.5 px-3 py-1.5 rounded-xl bg-[#051F45]/95 text-white text-xs font-bold border border-[#F2C4CD]/40 backdrop-blur-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 transform -translate-x-2 group-hover:translate-x-0 whitespace-nowrap font-comfortaa">
          {qrTitle}
        </span>
      </motion.div>

      {/* QR Code Pop-up Modal */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center z-[11000] p-4 bg-black/80 backdrop-blur-md animate-premium-backdrop"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-gradient-to-b from-[#140B28] via-[#0E061E] to-[#080212] border border-[#F2C4CD]/35 text-white rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(242,196,205,0.25)] flex flex-col items-center text-center space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="w-full flex items-center justify-between pb-3 border-b border-purple-500/20">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#051F45] to-[#F2C4CD]/40 border border-[#F2C4CD]/30 flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-[#F2C4CD]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold font-comfortaa text-white tracking-wide truncate max-w-[240px] sm:max-w-[280px]">
                    {qrTitle}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Image Presentation */}
              <div className="relative group w-full flex flex-col items-center">
                {qrImage ? (
                  <div className="relative p-3.5 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(242,196,205,0.3)] border-2 border-[#F2C4CD]/50 max-w-[260px] sm:max-w-[280px] aspect-square flex items-center justify-center transition-transform duration-300 hover:scale-[1.02]">
                    <img
                      src={qrImage}
                      alt={qrTitle}
                      className="w-full h-full object-contain rounded-xl select-none"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-[260px] aspect-square rounded-2xl bg-purple-950/40 border-2 border-dashed border-purple-500/30 flex flex-col items-center justify-center gap-2 p-6 text-purple-300/70">
                    <QrCode className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-xs">Chưa có ảnh mã QR được tải lên</span>
                  </div>
                )}
              </div>

              {/* Note / Description Box */}
              {qrNote && (
                <div className="w-full p-4 rounded-2xl bg-black/40 border border-purple-500/25 text-left space-y-2 relative group/note">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#F2C4CD] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Thông tin & Lời nhắn</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNote}
                      className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 py-0.5 px-1.5 rounded bg-white/5 hover:bg-white/15 cursor-pointer transition"
                      title="Sao chép nội dung"
                    >
                      {hasCopiedNote ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Đã chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-purple-100/90 font-sans leading-relaxed whitespace-pre-wrap break-words">
                    {qrNote}
                  </p>
                </div>
              )}

              {/* Footer Action Buttons */}
              <div className="w-full flex gap-3 pt-2">
                {qrImage && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#051F45] via-[#1A2E56] to-[#F2C4CD] text-white border border-[#F2C4CD]/40 font-bold font-comfortaa text-xs hover:brightness-110 shadow-lg shadow-[0_4px_20px_rgba(242,196,205,0.25)] flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
                  >
                    <Download className="w-4 h-4 text-[#F2C4CD]" />
                    <span>Lưu Ảnh QR</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 font-bold font-comfortaa text-xs cursor-pointer transition transform active:scale-95 ${
                    !qrImage ? 'w-full' : ''
                  }`}
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
