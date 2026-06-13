import React, { useState, useEffect } from "react";
import { X, Tag, Lock, Trash2, Eye, EyeOff } from "lucide-react";
import { Prompt, Genre, Settings } from "../types";

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    promptData: Omit<Prompt, "id"> & { id?: number },
    zone: "hospital" | "cai-nghien",
  ) => void;
  onDelete?: (id: number, zone: "hospital" | "cai-nghien") => void;
  editingPrompt: Prompt | null;
  genres: Genre[];
  currentZone: "hospital" | "cai-nghien";
  settings?: Settings;
}

export default function PromptModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingPrompt,
  genres,
  currentZone,
  settings,
}: PromptModalProps) {
  const [zone, setZone] = useState<"hospital" | "cai-nghien">("hospital");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [icon, setIcon] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [showPromptPassword, setShowPromptPassword] = useState(false);

  // Custom troll alarm fields
  const [passwordFailLimit, setPasswordFailLimit] = useState<number>(settings?.passwordFailLimit || 5);
  const [passwordFailGifUrl, setPasswordFailGifUrl] = useState(settings?.passwordFailGifUrl || "");
  const [passwordFailSecondaryHint, setPasswordFailSecondaryHint] =
    useState("");

  // Sync state if editing
  useEffect(() => {
    if (editingPrompt) {
      setZone(editingPrompt.zone);
      setTitle(editingPrompt.title);
      setGenre(editingPrompt.genre);
      setIcon(editingPrompt.icon);
      setUrl(editingPrompt.url);
      setDescription(editingPrompt.description || "");
      setTags(editingPrompt.tags || []);
      setEnablePassword(!!editingPrompt.password);
      setPassword(editingPrompt.password || "");
      setPasswordHint(editingPrompt.passwordHint || "");
      setPasswordFailLimit(
        editingPrompt.passwordFailLimit !== undefined
          ? editingPrompt.passwordFailLimit
          : 5,
      );
      setPasswordFailGifUrl(editingPrompt.passwordFailGifUrl || "");
      setPasswordFailSecondaryHint(
        editingPrompt.passwordFailSecondaryHint || "",
      );
    } else {
      setZone(currentZone);
      setTitle("");
      setGenre("");
      setIcon("");
      setUrl("");
      setDescription("");
      setTags([]);
      setEnablePassword(false);
      setPassword("");
      setPasswordHint("");
      setPasswordFailLimit(settings?.passwordFailLimit || 5);
      setPasswordFailGifUrl(settings?.passwordFailGifUrl || "");
      setPasswordFailSecondaryHint("");
    }
  }, [editingPrompt, isOpen, currentZone, settings]);

  const currentGenres = genres;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagInput.trim().replace(/#/g, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleFormSubmit = () => {
    if (!title.trim() || !url.trim()) {
      alert("⚠️ Vui lòng điền đầy đủ Tên Prompt và Liên kết URL!");
      return;
    }

    onSave(
      {
        id: editingPrompt?.id,
        title,
        url,
        icon: icon.trim() || "📝",
        description,
        genre,
        tags,
        zone,
        password: enablePassword ? password : "",
        passwordHint: enablePassword ? passwordHint : "",
        passwordFailLimit: enablePassword ? passwordFailLimit : undefined,
        passwordFailGifUrl: enablePassword ? passwordFailGifUrl : "",
        passwordFailSecondaryHint: enablePassword
          ? passwordFailSecondaryHint
          : "",
      },
      zone,
    );

    if (!editingPrompt) {
      // Clear fields to let them add another prompt easily!
      setTitle("");
      setUrl("");
      setDescription("");
      setTags([]);
      setTagInput("");
      setEnablePassword(false);
      setPassword("");
      setPasswordHint("");
      setPasswordFailLimit(settings?.passwordFailLimit || 5);
      setPasswordFailGifUrl(settings?.passwordFailGifUrl || "");
      setPasswordFailSecondaryHint("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4 animate-premium-backdrop">
      <div className="bg-[var(--card)] text-[var(--text)] rounded-3xl p-6 w-full max-w-[600px] shadow-2xl max-h-[90vh] flex flex-col justify-between overflow-hidden border-2 border-[var(--border)] animate-premium-modal">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-[var(--border)]">
          <span className="text-xl font-bold font-comfortaa text-[var(--primary)]">
            {editingPrompt
              ? "✏️ Chỉnh Sửa Bệnh Án (Prompt)"
              : "🏥 Thêm Bệnh Án Mới"}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable contents */}
        <div className="flex-1 overflow-y-auto pr-1.5 space-y-4">
          <div className="form-group grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-1.5">
                Tên Bệnh Án *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Tri kỷ Cố Khải..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-none focus:ring-1 focus:ring-[var(--zone-primary)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-1.5">
                Khoa Bệnh *
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-[var(--zone-primary)] text-xs cursor-pointer"
              >
                <option
                  value=""
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  -- Chọn khoa điều trị --
                </option>
                {currentGenres.map((g) => (
                  <option
                    key={g.name}
                    value={g.name}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    {g.icon} {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-1.5">
                Sticker Emoji
              </label>
              <input
                type="text"
                maxLength={4}
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="👩‍⚕️"
                className="w-full px-3 py-2 text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none focus:ring-1 focus:ring-[var(--zone-primary)] text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-1.5">
                Đường dẫn URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-none focus:ring-1 focus:ring-[var(--zone-primary)] text-xs"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-1.5">
              Mô tả triệu chứng
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm triệu chứng..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl outline-none focus:ring-1 focus:ring-[var(--zone-primary)] text-xs resize-none"
            />
          </div>

          <div className="form-group">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-1.5">
              Thẻ Tag Điều Trị (Gõ tag rồi ấn Enter)
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl min-h-[44px]">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-[var(--zone-primary)] text-white px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-xs"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(idx)}
                    className="hover:text-rose-200 font-bold ml-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={
                  tags.length === 0 ? "tri_lieu, h18..." : "Thêm tag..."
                }
                className="bg-transparent border-none outline-none text-xs px-1 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 flex-1 min-w-[120px]"
              />
            </div>
          </div>

          <div className="form-group border-t border-slate-100 dark:border-slate-700/50 pt-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              <input
                type="checkbox"
                checked={enablePassword}
                onChange={() => setEnablePassword(!enablePassword)}
                className="accent-[var(--zone-primary)] w-4 h-4 cursor-pointer"
              />
              🔒 Bảo vệ bệnh án bằng Mật Khẩu (Password)
            </label>

            {enablePassword && (
              <div className="grid grid-cols-2 gap-4 mt-3 p-3.5 bg-amber-500/10 border border-amber-200/40 dark:border-amber-900/40 rounded-xl animate-[in_0.2s_ease-out]">
                <div>
                  <label className="block font-bold mb-1 text-[10px] uppercase text-amber-800 dark:text-amber-300">
                    Gợi ý mật khẩu
                  </label>
                  <input
                    type="text"
                    value={passwordHint}
                    onChange={(e) => setPasswordHint(e.target.value)}
                    placeholder="Năm sinh bác sĩ..."
                    className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[10px] uppercase text-amber-800 dark:text-amber-300">
                    Mật khẩu khóa *
                  </label>
                  <div className="relative">
                    <input
                      type={showPromptPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mã khóa mở prompt..."
                      className="w-full pl-3 pr-10 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPromptPassword(!showPromptPassword)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer p-1.5 hover:scale-110 active:scale-90"
                      title={
                        showPromptPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                    >
                      {showPromptPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="col-span-2 border-t border-dashed border-amber-600/30 pt-3 mt-1">
                  <span className="block text-[11px] font-extrabold uppercase tracking-widest text-amber-500 mb-2">
                    🚨 Cấu hình Troll khi nhập sai mật khẩu:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Limit */}
                    <div className="col-span-1">
                      <label className="block font-bold mb-1 text-[10px] uppercase text-amber-800 dark:text-amber-300">
                        Nhập sai tối đa
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={passwordFailLimit}
                        onChange={(e) =>
                          setPasswordFailLimit(Number(e.target.value) || 5)
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg outline-none text-xs text-center font-bold"
                      />
                    </div>

                    {/* Hint phụ */}
                    <div className="col-span-2">
                      <label className="block font-bold mb-1 text-[10px] uppercase text-amber-800 dark:text-amber-300">
                        HINT PHỤ
                      </label>
                      <input
                        type="text"
                        value={passwordFailSecondaryHint}
                        onChange={(e) =>
                          setPasswordFailSecondaryHint(e.target.value)
                        }
                        placeholder="Hiện sau các mốc nhập sai lũy tiến..."
                        className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg outline-none text-xs"
                      />
                    </div>

                    {/* GIF/Video URL or File */}
                    <div className="col-span-3">
                      <label className="block font-bold mb-1 text-[10px] uppercase text-amber-800 dark:text-amber-300">
                        LINK ẢNH GIF HOẶC FILE VIDEO
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={passwordFailGifUrl}
                          onChange={(e) =>
                            setPasswordFailGifUrl(e.target.value)
                          }
                          placeholder="Bỏ trống nếu không dùng."
                          className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg outline-none text-xs"
                        />
                        <label className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center cursor-pointer select-none transition shrink-0 active:scale-95">
                          📤 Tải tệp
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  alert(
                                    "⚠️ Tệp tin hoành tráng quá nà! Vui lòng chọn tệp nhỏ hơn 2MB để tránh nghẽn lưu trữ nhé.",
                                  );
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPasswordFailGifUrl(
                                    reader.result as string,
                                  );
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      {passwordFailGifUrl && (
                        <div className="mt-1 flex items-center justify-between text-[9px] text-emerald-400 font-semibold gap-2">
                          <span className="truncate pr-2">
                            {passwordFailGifUrl.startsWith("data:")
                              ? "✅ Tệp cục bộ đã nạp"
                              : "🔗 Đang dùng link tài nguyên"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPasswordFailGifUrl("")}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-[var(--border)] mt-4 flex-wrap">
          <button
            onClick={handleFormSubmit}
            className="flex-1 bg-[var(--primary)] text-[var(--bg2)] font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow hover:scale-105 active:scale-95"
          >
            💾 Tải Bệnh Án
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-[var(--bg2)] text-[var(--text-muted)] hover:text-white font-bold py-2.5 rounded-xl text-xs transition border border-[var(--border)] cursor-pointer"
          >
            Đóng
          </button>

          {editingPrompt && onDelete && (
            <button
              onClick={() => onDelete(editingPrompt.id, editingPrompt.zone)}
              className="bg-rose-950 hover:bg-rose-900 border border-rose-950 text-rose-100 font-bold p-2.5 rounded-xl cursor-pointer transition flex items-center justify-center shadow"
              title="Xóa Prompt này"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
