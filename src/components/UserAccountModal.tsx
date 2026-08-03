import React, { useState, useEffect } from "react";
import { X, User, Lock, Trash2, LogOut, Settings, ShieldAlert, Check, HelpCircle, Palette, Upload, Image as ImageIcon } from "lucide-react";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { StyledUsername, UserAvatar } from "./UserProfileStyle";

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isOfflineMode: boolean;
  onLogout: () => void;
  onAccountDeleted: () => void;
  setToastMessage: (msg: string) => void;
}

// Predefined fun avatars for mental hospital theme
const AVAILABLE_AVATARS = [
  { char: "👻", label: "Ma mộng mơ" },
  { char: "🐱", label: "Mèo ngáo" },
  { char: "🦊", label: "Cáo trầm cảm" },
  { char: "🦄", label: "Kỳ lân ảo giác" },
  { char: "👽", label: "Người ngoài hành tinh" },
  { char: "🐼", label: "Gấu trúc mất ngủ" },
  { char: "🐨", label: "Koala lười biếng" },
  { char: "🐸", label: "Ếch ngồi đáy giếng" },
  { char: "🦁", label: "Sư tử hướng nội" },
];

const PRESET_COLORS = [
  { name: "Hồng phấn", hex: "#FFB7B2" },
  { name: "Cam sữa", hex: "#FFDAC1" },
  { name: "Xanh mạ", hex: "#B5EAD7" },
  { name: "Xanh trời", hex: "#A1C4FD" },
  { name: "Xanh ngọc", hex: "#A1E3D8" },
  { name: "Đỏ hoàng hôn", hex: "#FF9AA2" },
  { name: "Tím Lavender", hex: "#E8C5E5" },
  { name: "Trắng mộng", hex: "#FFFAFB" },
];

// Funny random questions for account deletion validation (Xà lơ, hài hước)
const FUNNY_QUESTIONS = [
  {
    question: "1 + 1 bằng mấy?",
    answers: ["2", "hai"],
  },
  {
    question: "Bầu trời ban ngày lúc nắng đẹp thường có màu gì?",
    answers: ["xanh", "màu xanh", "xanh dương", "blue", "hồng", "mau xanh", "xanh duong"],
  },
  {
    question: "Con mèo thường kêu thế nào nhỉ?",
    answers: ["meo", "meo meo", "mẻo", "mèo", "meow", "meo_meo"],
  },
  {
    question: "Con voi có mấy cái chân?",
    answers: ["4", "bốn", "bon"],
  },
  {
    question: "Con vịt có mấy cái chân?",
    answers: ["2", "hai"],
  },
  {
    question: "Bánh chưng truyền thống ngày Tết có hình gì?",
    answers: ["vuông", "hình vuông", "hinh vuong", "vuong"],
  },
  {
    question: "Con chó thường sủa kêu thế nào?",
    answers: ["gâu", "gâu gâu", "gau", "gau gau", "woof", "gâu_gâu"],
  },
  {
    question: "Nước nguyên chất sôi ở bao nhiêu độ C?",
    answers: ["100", "100 độ", "100 do", "một trăm", "mot tram"],
  },
  {
    question: "Trái Đất của chúng ta có hình gì?",
    answers: ["tròn", "hình tròn", "hinh tron", "tron", "cầu", "hình cầu", "hinh cau"],
  }
];

export default function UserAccountModal({
  isOpen,
  onClose,
  currentUser,
  isOfflineMode,
  onLogout,
  onAccountDeleted,
  setToastMessage,
}: UserAccountModalProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "appearance" | "password">("settings");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Account settings states
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("👻");

  // Visual customization states (Giao Diện)
  const [nameColor, setNameColor] = useState("");
  const [nameStyle, setNameStyle] = useState("none"); // "none" | "gradient" | "hologram" | "neon"
  const [nameFont, setNameFont] = useState(""); // "" | "Lobster" | "Pacifico" | "Mali" | "Bagel Fat One" | "Times New Roman"
  const [avatarType, setAvatarType] = useState("icon"); // "icon" | "image"
  const [avatarImage, setAvatarImage] = useState(""); // Base64 data Url

  // Password change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Deletion confirm modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [funnyQuestion, setFunnyQuestion] = useState({ question: "", answers: [] as string[] });
  const [deletionAnswer, setDeletionAnswer] = useState("");

  // Logout confirm modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setError("");
      setSuccess("");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      fetchUserData();
    }
  }, [isOpen, currentUser]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userKey = currentUser.toLowerCase();
      if (isOfflineMode) {
        const localUsers = JSON.parse(localStorage.getItem("local_users_fallback") || "{}");
        const userObj = localUsers[userKey];
        if (userObj) {
          setDisplayName(userObj.displayName || currentUser);
          setSelectedAvatar(userObj.avatar || "👻");
          setNameColor(userObj.nameColor || "");
          setNameStyle(userObj.nameStyle || "none");
          setNameFont(userObj.nameFont || "");
          setAvatarType(userObj.avatarType || "icon");
          setAvatarImage(userObj.avatarImage || "");
        } else {
          setDisplayName(currentUser);
          setSelectedAvatar("👻");
          setNameColor("");
          setNameStyle("none");
          setNameFont("");
          setAvatarType("icon");
          setAvatarImage("");
        }
      } else {
        const userDocRef = doc(db, "users", userKey);
        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${userKey}`);
          return;
        }
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || data.username || currentUser);
          setSelectedAvatar(data.avatar || "👻");
          setNameColor(data.nameColor || "");
          setNameStyle(data.nameStyle || "none");
          setNameFont(data.nameFont || "");
          setAvatarType(data.avatarType || "icon");
          setAvatarImage(data.avatarImage || "");
        } else {
          setDisplayName(currentUser);
          setSelectedAvatar("👻");
          setNameColor("");
          setNameStyle("none");
          setNameFont("");
          setAvatarType("icon");
          setAvatarImage("");
        }
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin người dùng: ", err);
    } finally {
      setLoading(false);
    }
  };

  const hashPassword = async (pwd: string) => {
    try {
      const enc = new TextEncoder();
      const buffer = await crypto.subtle.digest("SHA-256", enc.encode(pwd));
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return pwd;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("❌ File ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxSize = 256; // 256px resolution is sharp for tiny profile pictures
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85); // Compress to 85% JPEG
        setAvatarImage(dataUrl);
        setSuccess("📸 Tải ảnh đại diện lên thành công! Bấm 'Lưu thay đổi' để hoàn tất.");
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError("❌ Không thể đọc tệp tin hình ảnh!");
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!displayName.trim()) {
      setError("⚠️ Tên hiển thị không được để trống!");
      return;
    }

    setLoading(true);
    try {
      const userKey = currentUser.toLowerCase();
      if (isOfflineMode) {
        const localUsers = JSON.parse(localStorage.getItem("local_users_fallback") || "{}");
        if (localUsers[userKey]) {
          localUsers[userKey].displayName = displayName.trim();
          localUsers[userKey].avatar = selectedAvatar;
          localUsers[userKey].nameColor = nameColor;
          localUsers[userKey].nameStyle = nameStyle;
          localUsers[userKey].nameFont = nameFont;
          localUsers[userKey].avatarType = avatarType;
          localUsers[userKey].avatarImage = avatarImage;
          localStorage.setItem("local_users_fallback", JSON.stringify(localUsers));
          
          // Save in cache to trigger real-time updates in app
          localStorage.setItem(`display_name_${userKey}`, displayName.trim());
          localStorage.setItem(`avatar_${userKey}`, selectedAvatar);
          localStorage.setItem(`nameColor_${userKey}`, nameColor);
          localStorage.setItem(`nameStyle_${userKey}`, nameStyle);
          localStorage.setItem(`nameFont_${userKey}`, nameFont);
          localStorage.setItem(`avatarType_${userKey}`, avatarType);
          localStorage.setItem(`avatarImage_${userKey}`, avatarImage);
          
          setSuccess("🎉 Cập nhật cài đặt tài khoản ngoại tuyến thành công!");
          setToastMessage("✨ Đã cập nhật hồ sơ cá nhân!");
          window.dispatchEvent(new CustomEvent("user-profile-updated"));
        }
      } else {
        const userDocRef = doc(db, "users", userKey);
        try {
          await updateDoc(userDocRef, {
            displayName: displayName.trim(),
            avatar: selectedAvatar,
            nameColor,
            nameStyle,
            nameFont,
            avatarType,
            avatarImage,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${userKey}`);
          return;
        }

        localStorage.setItem(`display_name_${userKey}`, displayName.trim());
        localStorage.setItem(`avatar_${userKey}`, selectedAvatar);
        localStorage.setItem(`nameColor_${userKey}`, nameColor);
        localStorage.setItem(`nameStyle_${userKey}`, nameStyle);
        localStorage.setItem(`nameFont_${userKey}`, nameFont);
        localStorage.setItem(`avatarType_${userKey}`, avatarType);
        localStorage.setItem(`avatarImage_${userKey}`, avatarImage);

        setSuccess("🎉 Cập nhật cài đặt tài khoản thành công!");
        setToastMessage("✨ Đã đồng bộ hồ sơ cá nhân lên đám mây!");
        window.dispatchEvent(new CustomEvent("user-profile-updated"));
      }
    } catch (err) {
      console.error(err);
      setError("❌ Không thể cập nhật thông tin cài đặt!");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setError("⚠️ Vui lòng điền đầy đủ thông tin mật khẩu!");
      return;
    }

    if (newPassword.length < 7) {
      setError("⚠️ Mật khẩu mới phải từ 7 ký tự trở lên!");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("⚠️ Xác nhận mật khẩu mới không khớp!");
      return;
    }

    setLoading(true);
    try {
      const oldHashed = await hashPassword(oldPassword);
      const newHashed = await hashPassword(newPassword);

      if (isOfflineMode) {
        const localUsers = JSON.parse(localStorage.getItem("local_users_fallback") || "{}");
        const userKey = currentUser.toLowerCase();
        const userObj = localUsers[userKey];

        if (!userObj || userObj.password !== oldHashed) {
          setError("❌ Mật khẩu cũ không chính xác!");
          setLoading(false);
          return;
        }

        localUsers[userKey].password = newHashed;
        localStorage.setItem("local_users_fallback", JSON.stringify(localUsers));
        setSuccess("🎉 Đổi mật khẩu tài khoản thành công!");
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        const userDocRef = doc(db, "users", currentUser.toLowerCase());
        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.toLowerCase()}`);
          return;
        }
        
        if (!userDoc.exists()) {
          setError("❌ Tài khoản không tồn tại trên hệ thống!");
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        if (userData.password !== oldHashed) {
          setError("❌ Mật khẩu cũ không chính xác!");
          setLoading(false);
          return;
        }

        try {
          await updateDoc(userDocRef, { password: newHashed });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.toLowerCase()}`);
          return;
        }
        setSuccess("🎉 Đổi mật khẩu tài khoản thành công!");
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (err) {
      console.error(err);
      setError("❌ Đã xảy ra lỗi khi cập nhật mật khẩu mới!");
    } finally {
      setLoading(false);
    }
  };

  const triggerOpenDeleteModal = () => {
    const randomIdx = Math.floor(Math.random() * FUNNY_QUESTIONS.length);
    setFunnyQuestion(FUNNY_QUESTIONS[randomIdx]);
    setDeletionAnswer("");
    setError("");
    setShowDeleteConfirm(true);
  };

  const handleDeleteAccountPermanently = async () => {
    setError("");
    const cleanAnswer = deletionAnswer.trim().toLowerCase();
    
    const isCorrect = funnyQuestion.answers.some(
      (ans) => ans.toLowerCase() === cleanAnswer
    );

    if (!isCorrect) {
      setError("❌ Câu trả lời sai rồi bé ơi! Đầu óc thế này chưa tỉnh táo để xóa tài khoản đâu mờ.");
      return;
    }

    setLoading(true);
    try {
      const userKey = currentUser.toLowerCase();
      if (isOfflineMode) {
        const localUsers = JSON.parse(localStorage.getItem("local_users_fallback") || "{}");
        if (localUsers[userKey]) {
          delete localUsers[userKey];
          localStorage.setItem("local_users_fallback", JSON.stringify(localUsers));
        }
      } else {
        const userDocRef = doc(db, "users", userKey);
        try {
          await deleteDoc(userDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${userKey}`);
          return;
        }
      }

      // Clear local keys
      localStorage.removeItem(`display_name_${userKey}`);
      localStorage.removeItem(`avatar_${userKey}`);
      localStorage.removeItem(`nameColor_${userKey}`);
      localStorage.removeItem(`nameStyle_${userKey}`);
      localStorage.removeItem(`nameFont_${userKey}`);
      localStorage.removeItem(`avatarType_${userKey}`);
      localStorage.removeItem(`avatarImage_${userKey}`);

      setToastMessage("💥 Tài khoản của bé đã bị bốc hơi vĩnh viễn khỏi bệnh viện!");
      setShowDeleteConfirm(false);
      onClose();
      onAccountDeleted();
    } catch (err) {
      console.error(err);
      setError("❌ Có lỗi xảy ra trong quá trình hủy hoại tài khoản!");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-[24000] p-4 animate-premium-backdrop">
        <div className="bg-slate-900 border-2 border-purple-500/35 rounded-3xl p-6 w-full max-w-[460px] max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl text-purple-200 animate-premium-modal relative select-none">
          
          <div className="flex justify-between items-center mb-5">
            <span className="font-bold text-base font-comfortaa text-purple-300 flex items-center gap-2">
              👤 Quản Lý Tài Khoản
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-purple-300 cursor-pointer p-1 rounded-full hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-purple-500/20 mb-4 gap-1 bg-black/20 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab("settings");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === "settings"
                  ? "bg-purple-600/30 border border-purple-500/45 text-purple-100"
                  : "text-slate-400 hover:text-purple-300 hover:bg-white/5"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Hồ Sơ
            </button>

            <button
              onClick={() => {
                setActiveTab("appearance");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === "appearance"
                  ? "bg-purple-600/30 border border-purple-500/45 text-purple-100"
                  : "text-slate-400 hover:text-purple-300 hover:bg-white/5"
              }`}
            >
              <Palette className="w-3.5 h-3.5" /> Giao Diện
            </button>

            <button
              onClick={() => {
                setActiveTab("password");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === "password"
                  ? "bg-purple-600/30 border border-purple-500/45 text-purple-100"
                  : "text-slate-400 hover:text-purple-300 hover:bg-white/5"
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Mật Khẩu
            </button>
          </div>

          {/* Feedback logs */}
          {error && (
            <div className="bg-rose-950/50 border border-rose-800/40 text-rose-200 rounded-xl p-3 text-xs leading-relaxed font-semibold mb-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-950/50 border border-emerald-800/40 text-emerald-200 rounded-xl p-3 text-xs leading-relaxed font-semibold mb-3 animate-[pulse_1.5s_infinite]">
              {success}
            </div>
          )}

          {activeTab === "settings" ? (
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              {/* Permanent Login Username (Locked) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tên đăng nhập (Bảo mật - Khóa cố định):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={currentUser || ""}
                    disabled
                    className="w-full pl-10 pr-3 py-2 bg-black/60 border border-purple-500/10 rounded-xl text-xs text-slate-400 outline-none cursor-not-allowed italic font-medium"
                  />
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Tên hiển thị biệt danh:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Nhập tên biệt danh tùy ý..."
                    value={displayName || ""}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={loading}
                    maxLength={20}
                    className="w-full pl-10 pr-3 py-2 bg-black/40 border border-purple-500/20 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-600 transition"
                  />
                </div>
              </div>

              {/* Real-time Preview in Profile section */}
              <div className="p-3.5 bg-black/30 rounded-2xl border border-purple-500/10 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Xem trước danh thiếp:</span>
                  <div className="flex items-center gap-2">
                    <UserAvatar avatar={selectedAvatar} avatarType={avatarType} avatarImage={avatarImage} className="w-7 h-7 rounded-full object-cover" />
                    <StyledUsername name={displayName || currentUser} color={nameColor} effect={nameStyle} font={nameFont} className="text-sm font-extrabold" />
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  Biệt danh của bé {isOfflineMode ? "Ngoại tuyến" : "Mây"}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition duration-200 cursor-pointer shadow-md uppercase tracking-wider font-comfortaa"
              >
                {loading ? "Vui lòng chờ..." : "Lưu thay đổi"}
              </button>
            </form>
          ) : activeTab === "appearance" ? (
            <form onSubmit={handleUpdateSettings} className="space-y-5">
              {/* Profile Appearance Settings (Dọn dẹp Giao Diện) */}
              
              {/* Dynamic Design Preview */}
              <div className="p-4 bg-gradient-to-r from-purple-950/20 to-indigo-950/20 rounded-2xl border-2 border-purple-500/20 space-y-2.5 relative overflow-hidden">
                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest block">Xem Trước Thiết Kế Hồ Sơ:</span>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatar={selectedAvatar}
                    avatarType={avatarType}
                    avatarImage={avatarImage}
                    className="w-12 h-12 rounded-full border-2 border-purple-400/40 object-cover"
                  />
                  <div>
                    <StyledUsername
                      name={displayName || currentUser}
                      color={nameColor}
                      effect={nameStyle}
                      font={nameFont}
                      className="text-lg font-extrabold tracking-wide"
                    />
                    <div className="text-[10px] text-slate-400">@bệnh nhân số #{currentUser?.length}</div>
                  </div>
                </div>
              </div>

              {/* 1. Chọn loại Ảnh đại diện (Icon vs Upload) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Ảnh Đại Diện:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAvatarType("icon")}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      avatarType === "icon"
                        ? "bg-purple-600/35 border border-purple-400/30 text-white"
                        : "text-slate-400 hover:text-purple-300"
                    }`}
                  >
                    🧸 Dùng Icon Emoji
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarType("image")}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      avatarType === "image"
                        ? "bg-purple-600/35 border border-purple-400/30 text-white"
                        : "text-slate-400 hover:text-purple-300"
                    }`}
                  >
                    📸 Tải Ảnh Riêng
                  </button>
                </div>

                {avatarType === "icon" ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Chọn emoji hoặc nhập bất kỳ..."
                        value={selectedAvatar}
                        onChange={(e) => setSelectedAvatar(e.target.value)}
                        disabled={loading}
                        maxLength={10}
                        className="flex-1 px-3 py-1.5 bg-black/30 border border-purple-500/20 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                    {/* Suggest grid */}
                    <div className="flex flex-wrap gap-2 p-2 bg-black/20 rounded-xl justify-center">
                      {AVAILABLE_AVATARS.map((av) => (
                        <button
                          key={av.char}
                          type="button"
                          onClick={() => setSelectedAvatar(av.char)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition ${
                            selectedAvatar === av.char ? "bg-purple-600 scale-110" : "bg-slate-800 hover:bg-slate-750"
                          }`}
                          title={av.label}
                        >
                          {av.char}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-500/20 hover:border-purple-400/50 rounded-2xl cursor-pointer bg-black/10 hover:bg-black/20 transition p-2 text-center">
                        <div className="flex flex-col items-center justify-center pt-2 pb-2">
                          <Upload className="w-6 h-6 text-purple-400 mb-1" />
                          <p className="text-[10px] text-purple-300 font-bold">Kéo thả hoặc bấm để chọn ảnh của bé</p>
                          <p className="text-[9px] text-slate-500">Rõ nét, tự động căn tỉ lệ vuông hoàn hảo (Tối đa 5MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {avatarImage && (
                      <div className="flex items-center gap-3 bg-black/30 p-2 rounded-xl">
                        <img src={avatarImage} className="w-10 h-10 rounded-full object-cover border border-purple-500/30" alt="Preview" />
                        <div className="flex-1">
                          <span className="text-[10px] text-emerald-400 font-semibold block">Đã liên kết ảnh của bạn</span>
                          <button
                            type="button"
                            onClick={() => setAvatarImage("")}
                            className="text-[9px] text-rose-400 hover:underline"
                          >
                            Xóa bỏ ảnh tải lên
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Thiết kế màu sắc biệt danh */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Màu Sắc Biệt Danh:
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={nameColor || "#FFFAFB"}
                    onChange={(e) => setNameColor(e.target.value)}
                    className="w-10 h-8 rounded-lg border border-purple-500/20 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Nhập mã màu HEX (ví dụ: #FFD222)..."
                    value={nameColor}
                    onChange={(e) => setNameColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-black/40 border border-purple-500/20 focus:border-purple-400 rounded-xl outline-none text-xs text-white"
                  />
                  {nameColor && (
                    <button
                      type="button"
                      onClick={() => setNameColor("")}
                      className="px-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold"
                    >
                      Mặc định
                    </button>
                  )}
                </div>

                {/* Preset colors */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-black/20 rounded-xl justify-center">
                  {PRESET_COLORS.map((clr) => (
                    <button
                      key={clr.hex}
                      type="button"
                      onClick={() => setNameColor(clr.hex)}
                      className="w-5 h-5 rounded-full relative transition duration-200 hover:scale-125 focus:scale-125"
                      style={{ backgroundColor: clr.hex }}
                      title={clr.name}
                    >
                      {nameColor === clr.hex && (
                        <Check className="w-3 h-3 text-slate-900 absolute inset-0 m-auto font-bold" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Hiệu ứng tên biệt danh */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Hiệu Ứng Danh Hiệu:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "none", label: "Mặc định (Không hiệu ứng)", desc: "Màu phẳng thanh tao" },
                    { id: "gradient", label: "🌈 Gradient Đa Sắc", desc: "Chuyển màu mượt mà" },
                    { id: "neon", label: "✨ Neon Thần Tiên", desc: "Phát sáng hào quang ảo" },
                    { id: "hologram", label: "🛸 Hologram Tương Lai", desc: "Biến đổi màu liên tục" },
                  ].map((eff) => (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => setNameStyle(eff.id)}
                      className={`p-2.5 rounded-xl text-left transition border ${
                        nameStyle === eff.id
                          ? "bg-purple-600/25 border-purple-400/50 text-white shadow-md"
                          : "bg-black/30 border-purple-500/10 text-slate-400 hover:border-purple-500/30 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-[11px] font-bold block">{eff.label}</span>
                      <span className="text-[9px] block text-slate-500 mt-0.5 leading-tight">{eff.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Chọn phông chữ biệt danh */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Phông Chữ Biệt Danh:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "", label: "Mặc định", cl: "font-sans" },
                    { id: "Lobster", label: "Lobster", cl: "font-lobster" },
                    { id: "Pacifico", label: "Pacifico", cl: "font-pacifico" },
                    { id: "Mali", label: "Mali Bouncy", cl: "font-mali" },
                    { id: "Bagel Fat One", label: "Bagel Fat", cl: "font-bagelfat" },
                    { id: "Times New Roman", label: "Times Serif", cl: "font-times" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNameFont(f.id)}
                      className={`p-2 rounded-xl transition border text-center ${
                        nameFont === f.id
                          ? "bg-purple-600/25 border-purple-400/50 text-white"
                          : "bg-black/30 border-purple-500/10 text-slate-400 hover:border-purple-500/30"
                      }`}
                    >
                      <span className={`text-xs block ${f.cl}`}>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition duration-200 cursor-pointer shadow-md uppercase tracking-wider font-comfortaa"
              >
                {loading ? "Vui lòng chờ..." : "Lưu thay đổi Giao diện"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-3.5">
              {/* Old password verify */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Mật khẩu cũ của bạn:
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu đang dùng..."
                  value={oldPassword || ""}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2 bg-black/40 border border-purple-500/25 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-600 transition"
                />
              </div>

              {/* New password */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Mật khẩu mới dự kiến:
                </label>
                <input
                  type="password"
                  placeholder="Mật khẩu mới (tối thiểu 7 ký tự)..."
                  value={newPassword || ""}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2 bg-black/40 border border-purple-500/25 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-600 transition"
                />
              </div>

              {/* Confirm password */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Xác nhận lại mật khẩu mới:
                </label>
                <input
                  type="password"
                  placeholder="Xác nhận lại mật khẩu mới..."
                  value={confirmNewPassword || ""}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2 bg-black/40 border border-purple-500/25 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-600 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition duration-200 cursor-pointer shadow-md uppercase tracking-wider font-comfortaa"
              >
                {loading ? "Vui lòng chờ..." : "Xác nhận đổi mật khẩu"}
              </button>
            </form>
          )}

          {/* Action Footer Divider */}
          <div className="border-t border-purple-500/20 mt-5 pt-4 space-y-3">
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex-1 py-2 px-3.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" /> Đăng xuất
              </button>

              <button
                onClick={triggerOpenDeleteModal}
                className="py-2 px-3.5 border border-rose-800 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hủy tài khoản
              </button>
            </div>
            
            <p className="text-[9px] text-slate-500 text-center italic leading-tight">
              * Quý bệnh nhân lưu ý lưu lại hồ sơ. Mọi thắc mắc vui lòng liên hệ Ban Giám Đốc Cố Thị để được giải mã!
            </p>
          </div>

        </div>
      </div>

      {/* Pop-up Logout Confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-[24100] p-4 animate-premium-backdrop">
          <div className="bg-slate-900 border border-purple-500/35 rounded-3xl p-5 w-full max-w-[340px] shadow-2xl text-center space-y-4 animate-premium-modal">
            <span className="text-4xl block animate-bounce">👋</span>
            <h3 className="font-comfortaa text-purple-300 font-extrabold text-sm">
              Rời bệnh viện mộng mơ?
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Bé có chắc là muốn đăng xuất phiên điều hành mộng mơ này và quay về làm bệnh nhân tự do không?
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Ở lại mộng mơ
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-lg"
              >
                Đăng xuất ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Account Deletion funny confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-[24200] p-4 animate-premium-backdrop">
          <div className="bg-slate-950 border-2 border-rose-600/40 rounded-3xl p-5 w-full max-w-[380px] shadow-2xl space-y-4 animate-premium-modal">
            <div className="flex items-center gap-2 text-rose-500">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span className="font-bold text-xs font-comfortaa uppercase tracking-wider text-rose-400">
                ỦY BAN BẢO MẬT VIỆN TÂM THẦN
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              ⚠️ <strong>CẢNH BÁO TỐI CAO:</strong> Hành động xóa tài khoản của bé sẽ xóa vĩnh viễn mọi dữ liệu. Nó KHÔNG THỂ phục hồi!
            </p>

            <div className="p-3 bg-rose-950/20 rounded-xl border border-rose-500/10 space-y-2">
              <div className="flex items-start gap-1.5 text-amber-400 font-bold text-xs">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Trả lời câu hỏi để xác nhận xóa tài khoản:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed italic pl-5">
                "{funnyQuestion.question}"
              </p>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Nhập câu trả lời của bé tại đây..."
                value={deletionAnswer || ""}
                onChange={(e) => setDeletionAnswer(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2.5 bg-black/60 border border-rose-500/20 focus:border-rose-400 rounded-xl outline-none text-xs text-white placeholder-slate-600 transition"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="flex-1 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Giữ lại tài khoản
              </button>
              <button
                onClick={handleDeleteAccountPermanently}
                disabled={loading || !deletionAnswer.trim()}
                className="flex-1 py-2 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-rose-100 font-extrabold rounded-xl text-xs transition cursor-pointer shadow-lg uppercase tracking-wider"
              >
                {loading ? "Vui lòng chờ..." : "XÓA VĨNH VIỄN 💥"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
