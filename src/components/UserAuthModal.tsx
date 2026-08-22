import React, { useState } from "react";
import { X, User, Lock, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
  isOfflineMode: boolean;
}

export default function UserAuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  isOfflineMode,
}: UserAuthModalProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "taken" | "available" | "invalid">("idle");

  React.useEffect(() => {
    if (!isRegisterMode) {
      setUsernameStatus("idle");
      setCheckingUsername(false);
      return;
    }

    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus("idle");
      setCheckingUsername(false);
      return;
    }

    // Basic length/format validation
    if (clean.length < 7 || /[A-Z]/.test(username) || /\s/.test(username) || !/^[a-z0-9_]+$/.test(clean)) {
      setUsernameStatus("invalid");
      setCheckingUsername(false);
      return;
    }

    if (clean === "charmainennie8" || clean === "admin") {
      setUsernameStatus("taken");
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    const delayDebounce = setTimeout(async () => {
      try {
        if (isOfflineMode) {
          const localUsers = JSON.parse(localStorage.getItem("local_users_fallback") || "{}");
          if (localUsers[clean]) {
            setUsernameStatus("taken");
          } else {
            setUsernameStatus("available");
          }
        } else {
          const userDocRef = doc(db, "users", clean);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUsernameStatus("taken");
          } else {
            setUsernameStatus("available");
          }
        }
      } catch (err) {
        console.error("Lỗi kiểm tra tên đăng nhập:", err);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [username, isRegisterMode, isOfflineMode]);

  if (!isOpen) return null;

  const hashPassword = async (pwd: string) => {
    try {
      const enc = new TextEncoder();
      const buffer = await crypto.subtle.digest("SHA-256", enc.encode(pwd));
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Simple fallback if crypto is not available in non-https or iframe environments
      return pwd;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const cleanUsername = username;
    const cleanPassword = password;

    if (!cleanUsername || !cleanPassword) {
      setError("⚠️ Vui lòng điền đầy đủ Tên tài khoản và Mật khẩu!");
      return;
    }

    const isAdminCredentials = (cleanUsername === "charmainennie8" && cleanPassword === "sotAodat8386.");

    if (!isAdminCredentials) {
      if (isRegisterMode) {
        // Enforce username requirements for registration
        if (cleanUsername.length < 7) {
          setError("⚠️ Tên đăng nhập phải tối thiểu 7 kí tự!");
          return;
        }
        if (/[A-Z]/.test(cleanUsername)) {
          setError("⚠️ Tên đăng nhập không được viết hoa!");
          return;
        }
        if (/\s/.test(cleanUsername)) {
          setError("⚠️ Tên đăng nhập phải viết liền không dấu (không chứa khoảng trắng)!");
          return;
        }
        // Ensure only lowercase alphanumeric (or underscore) (viết liền không dấu, không viết hoa)
        if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
          setError("⚠️ Tên đăng nhập viết liền không dấu, chỉ gồm chữ cái thường và số!");
          return;
        }

        // Enforce password requirements for registration
        if (cleanPassword.length < 7) {
          setError("⚠️ Mật khẩu phải tối thiểu 7 kí tự!");
          return;
        }
        if (/[A-Z]/.test(cleanPassword)) {
          setError("⚠️ Mật khẩu không được viết hoa!");
          return;
        }
        if (/\s/.test(cleanPassword)) {
          setError("⚠️ Mật khẩu không chứa khoảng trắng (không cách)!");
          return;
        }
        // At least 1 special character like @, %, $, _, ...
        const hasSpecialChar = /[@%$_!#^&*(),.?":{}|<>\-_+=\[\]\\\/]/.test(cleanPassword);
        if (!hasSpecialChar) {
          setError("⚠️ Mật khẩu phải chứa ít nhất 1 kí tự đặc biệt như @, %, $, _,...");
          return;
        }
      } else {
        // Enforce username requirements for login
        if (cleanUsername.length < 7) {
          setError("⚠️ Tên đăng nhập phải tối thiểu 7 kí tự!");
          return;
        }
        if (/[A-Z]/.test(cleanUsername)) {
          setError("⚠️ Tên đăng nhập không được viết hoa!");
          return;
        }
        if (/\s/.test(cleanUsername)) {
          setError("⚠️ Tên đăng nhập phải viết liền không dấu!");
          return;
        }
      }
    }

    setLoading(true);

    try {
      // Admin credentials check first
      if (isAdminCredentials) {
        onLoginSuccess("Admin");
        onClose();
        return;
      }

      if (isRegisterMode && (cleanUsername === "charmainennie8" || cleanUsername === "admin")) {
        setError("❌ Tên tài khoản này thuộc bảo mật của ban quản trị, không được phép đăng ký!");
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", cleanUsername);

      if (isRegisterMode) {
        // Registration Flow
        if (isOfflineMode) {
          // Local storage fallback
          const localUsers = JSON.parse(localStorage.getItem("local_users_fallback") || "{}");
          if (localUsers[cleanUsername]) {
            setError("❌ Tài khoản này đã tồn tại trên thiết bị!");
            setLoading(false);
            return;
          }
          const hashed = await hashPassword(cleanPassword);
          localUsers[cleanUsername] = { 
            username: cleanUsername, 
            password: hashed, 
            displayName: cleanUsername,
            avatar: "👻",
            createdAt: new Date().toISOString() 
          };
          localStorage.setItem("local_users_fallback", JSON.stringify(localUsers));
          
          alert("🎉 Đăng ký tài khoản ngoại tuyến thành công!");
          onLoginSuccess(cleanUsername);
          onClose();
        } else {
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${cleanUsername}`);
            return;
          }
          if (userDoc.exists()) {
            setError("❌ Tài khoản này đã tồn tại!");
            setLoading(false);
            return;
          }

          const hashed = await hashPassword(cleanPassword);
          try {
            await setDoc(userDocRef, {
              username: cleanUsername,
              password: hashed,
              displayName: cleanUsername,
              avatar: "👻",
              createdAt: new Date().toISOString(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${cleanUsername}`);
            return;
          }

          alert("🎉 Đăng ký tài khoản thành công! Bạn đã được tự động đăng nhập.");
          onLoginSuccess(cleanUsername);
          onClose();
        }
      } else {
        // Login Flow
        const hashed = await hashPassword(cleanPassword);

        if (isOfflineMode) {
          const localUsers = JSON.parse(localStorage.getItem("local_users_fallback") || "{}");
          const userObj = localUsers[cleanUsername];
          if (userObj && userObj.password === hashed) {
            onLoginSuccess(cleanUsername);
            onClose();
          } else {
            setError("❌ Tên đăng nhập hoặc mật khẩu không chính xác!");
          }
        } else {
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${cleanUsername}`);
            return;
          }
          if (!userDoc.exists()) {
            setError("❌ Tài khoản không tồn tại!");
            setLoading(false);
            return;
          }

          const userData = userDoc.data();
          if (userData && userData.password === hashed) {
            onLoginSuccess(cleanUsername);
            onClose();
          } else {
            setError("❌ Mật khẩu không chính xác!");
          }
        }
      }
    } catch (err) {
      console.error("Lỗi xác thực người dùng: ", err);
      setError("❌ Đã xảy ra lỗi hệ thống! Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100005] p-4 animate-premium-backdrop">
      <div className="bg-slate-900 border border-purple-500/35 rounded-3xl p-6 w-full max-w-[380px] shadow-2xl text-purple-200 animate-premium-modal">
        <div className="flex justify-between items-center mb-5">
          <span className="font-bold text-base font-comfortaa text-purple-400 flex items-center gap-2">
            {isRegisterMode ? (
              <>
                <UserPlus className="w-5 h-5 text-purple-400" /> Đăng Ký Tài Khoản
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 text-purple-400" /> Đăng Nhập Hệ Thống
              </>
            )}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-purple-300 cursor-pointer p-1 rounded-full hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-rose-950/50 border border-rose-800/40 text-rose-200 rounded-xl p-3 text-xs leading-relaxed font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
              Tên tài khoản:
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Nhập tên tài khoản (viết liền, không dấu)..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-purple-500/25 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-600 transition"
              />
            </div>
            {isRegisterMode && (
              <>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal italic pl-1">
                  💡 Tên đăng nhập viết liền không dấu, tối thiểu 7 kí tự, không viết hoa.
                </p>
                {usernameStatus === "taken" && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1 pl-1">
                    Tên trùng rồi bé ơi...
                  </p>
                )}
                {usernameStatus === "available" && (
                  <p className="text-[10px] text-emerald-500 font-bold mt-1 pl-1">
                    Tên đáng yêu đó bé!
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
              Mật khẩu:
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 bg-black/50 border border-purple-500/25 focus:border-purple-400 rounded-xl outline-none text-xs text-white placeholder-slate-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400 transition cursor-pointer p-1.5"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {isRegisterMode && (
              <p className="text-[10px] text-slate-400 mt-1 leading-normal italic pl-1">
                💡 Mật khẩu tối thiểu 7 kí tự, không viết hoa, không cách, có ít nhất 1 kí tự đặc biệt như @, %, $, _,...
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 hover:bg-purple-600 text-purple-100 border border-purple-500/30 font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-comfortaa"
          >
            {loading ? "Vui lòng chờ..." : isRegisterMode ? "Đăng ký ngay" : "Đăng nhập ngay"}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError("");
              }}
              className="text-xs text-purple-400 hover:text-purple-300 underline transition cursor-pointer"
            >
              {isRegisterMode
                ? "Đã có tài khoản? Đăng nhập"
                : "Chưa có tài khoản? Đăng ký tại đây"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
