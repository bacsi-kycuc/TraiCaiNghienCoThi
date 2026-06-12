import React, { useState } from 'react';
import { X, FolderPlus, Image, Music, Link as LinkIcon, Trash, User, LogOut, Edit2 } from 'lucide-react';
import { Genre, Settings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  genresHospital: Genre[];
  genresCaiNghien: Genre[];
  onAddGenre: (name: string, icon: string, zone: 'hospital' | 'cai-nghien', description?: string) => void;
  onDeleteGenre: (name: string, zone: 'hospital' | 'cai-nghien') => void;
  onUpdateGenre?: (oldName: string, oldZone: 'hospital' | 'cai-nghien', newName: string, newIcon: string, newZone: 'hospital' | 'cai-nghien', description?: string) => Promise<void>;
  settings: Settings;
  onSaveSettings: (key: keyof Settings, value: string) => void;
  onAdminLogout?: () => void;
}

type TabType = 'categories' | 'backgrounds' | 'music' | 'links' | 'account';

export default function SettingsModal({
  isOpen,
  onClose,
  genresHospital,
  genresCaiNghien,
  onAddGenre,
  onDeleteGenre,
  onUpdateGenre,
  settings,
  onSaveSettings,
  onAdminLogout
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('categories');

  // Genre States
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreIcon, setNewGenreIcon] = useState('');
  const [newGenreDescription, setNewGenreDescription] = useState('');
  const [newGenreZone, setNewGenreZone] = useState<'hospital' | 'cai-nghien'>('cai-nghien');

  // Editing genre states
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [editingGenreOriginalName, setEditingGenreOriginalName] = useState('');
  const [editingGenreOriginalZone, setEditingGenreOriginalZone] = useState<'hospital' | 'cai-nghien'>('cai-nghien');

  // Input states for links & music
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState(settings.discordLink || '');
  const [facebookUrl, setFacebookUrl] = useState(settings.facebookLink || '');

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: 'welcomeBgImage' | 'hospitalBgImage' | 'cainhienBgImage', labelKey: 'welcomeBgFileName' | 'hospitalBgFileName' | 'cainhienBgFileName') => {
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
            onSaveSettings('musicData', event.target.result as string);
            onSaveSettings('musicUrl', ''); // Clear track URL when uploading raw data
            onSaveSettings('musicName', file.name);
          } catch (error) {
            alert("⚠️ Trình duyệt báo không đủ bộ nhớ để lưu bài hát chất lượng quá cao. Hãy dùng bài hát dung lượng nhỏ hơn hoặc dán liên kết âm nhạc!");
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGenre = async () => {
    if (!newGenreName.trim()) {
      alert('⚠️ Vui lòng điền vào Tên Khoa Bệnh!');
      return;
    }
    const name = newGenreName.trim();
    const icon = newGenreIcon.trim() || '🏨';
    const description = newGenreDescription.trim();

    if (editingGenre && onUpdateGenre) {
      await onUpdateGenre(
        editingGenreOriginalName,
        editingGenreOriginalZone,
        name,
        icon,
        newGenreZone,
        description
      );
      // Clear editing state
      setEditingGenre(null);
      setEditingGenreOriginalName('');
    } else {
      onAddGenre(name, icon, newGenreZone, description);
    }
    setNewGenreName('');
    setNewGenreIcon('');
    setNewGenreDescription('');
    setNewGenreZone('cai-nghien');
  };

  const handleStartEdit = (g: Genre, zone: 'hospital' | 'cai-nghien') => {
    setEditingGenre(g);
    setEditingGenreOriginalName(g.name);
    setEditingGenreOriginalZone(zone);
    setNewGenreName(g.name);
    setNewGenreIcon(g.icon || '🏨');
    setNewGenreDescription(g.description || '');
    setNewGenreZone(zone);
  };

  const handleCancelEdit = () => {
    setEditingGenre(null);
    setEditingGenreOriginalName('');
    setNewGenreName('');
    setNewGenreIcon('');
    setNewGenreDescription('');
    setNewGenreZone('cai-nghien');
  };

  const handleSaveLinks = () => {
    onSaveSettings('discordLink', discordUrl);
    onSaveSettings('facebookLink', facebookUrl);
    alert('✅ Đã lưu liên kết chính thức thành công!');
  };

  const handleSaveYoutube = () => {
    if (!youtubeUrl.trim()) return;
    onSaveSettings('musicUrl', youtubeUrl.trim());
    onSaveSettings('musicData', ''); // Clear base64 data when setting custom URL stream
    onSaveSettings('musicName', 'Mẫu nhạc trực tiếp: ' + youtubeUrl.trim());
    setYoutubeUrl('');
    alert('✅ Đã định tuyến nhạc từ liên kết thành công!');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[10000] p-4 transition-opacity duration-350">
      <div className="bg-[var(--card)] text-[var(--text)] rounded-3xl p-6 w-full max-w-[800px] shadow-2xl max-h-[92vh] flex flex-col justify-between overflow-hidden scale-100 animate-[in_0.2s_ease-out] border border-[var(--border)]">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
          <span className="text-xl font-bold font-comfortaa text-[var(--primary)] flex items-center gap-1.5 animate-pulse">
            ⚙️ Cấu Hình Hệ Thống Trại
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1 bg-[var(--bg2)] p-1.5 rounded-2xl my-4 overflow-x-auto scrollbar-none">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex-1 overflow-visible whitespace-nowrap min-w-fit py-1.5 px-3 text-xs font-bold font-sans rounded-xl cursor-pointer transition ${activeTab === 'categories' ? 'bg-[var(--primary)] text-[var(--bg2)] shadow' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'}`}
          >
            🗂️ Khoa Điều Trị
          </button>
          <button 
            onClick={() => setActiveTab('backgrounds')}
            className={`flex-1 overflow-visible whitespace-nowrap min-w-fit py-1.5 px-3 text-xs font-bold font-sans rounded-xl cursor-pointer transition ${activeTab === 'backgrounds' ? 'bg-[var(--primary)] text-[var(--bg2)] shadow' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'}`}
          >
            🖼️ Hình Nền
          </button>
          <button 
            onClick={() => setActiveTab('music')}
            className={`flex-1 overflow-visible whitespace-nowrap min-w-fit py-1.5 px-3 text-xs font-bold font-sans rounded-xl cursor-pointer transition ${activeTab === 'music' ? 'bg-[var(--primary)] text-[var(--bg2)] shadow' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'}`}
          >
            🎵 Nhạc Nền
          </button>
          <button 
            onClick={() => setActiveTab('links')}
            className={`flex-1 overflow-visible whitespace-nowrap min-w-fit py-1.5 px-3 text-xs font-bold font-sans rounded-xl cursor-pointer transition ${activeTab === 'links' ? 'bg-[var(--primary)] text-[var(--bg2)] shadow' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'}`}
          >
            🔗 Liên Kết
          </button>
          <button 
            onClick={() => setActiveTab('account')}
            className={`flex-1 overflow-visible whitespace-nowrap min-w-fit py-1.5 px-3 text-xs font-bold font-sans rounded-xl cursor-pointer transition ${activeTab === 'account' ? 'bg-[var(--primary)] text-[var(--bg2)] shadow' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'}`}
          >
            👤 Tài Khoản
          </button>
        </div>

        {/* Scrollable Panel Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          
          {/* TAB 1: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">

              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">Phân Khoa</label>
                    <select
                      value={newGenreZone}
                      onChange={(e) => setNewGenreZone(e.target.value as 'hospital' | 'cai-nghien')}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                    >
                      <option value="cai-nghien">💊 Trại Cai Nghiện</option>
                      <option value="hospital">🏥 Bệnh Viện</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">Tên khoa mới</label>
                    <input 
                      type="text" 
                      placeholder="Nhập tên khoa mới..." 
                      value={newGenreName}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-750 dark:text-slate-250 uppercase tracking-wide block">Sticker emoji</label>
                    <input 
                      type="text" 
                      placeholder="🏷️"
                      maxLength={4} 
                      value={newGenreIcon}
                      onChange={(e) => setNewGenreIcon(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-center placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-750 dark:text-slate-250 uppercase tracking-wide block">Mô tả về khoa</label>
                  <textarea 
                    rows={2}
                    placeholder="Mô tả tóm tắt..." 
                    value={newGenreDescription}
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
                    onClick={handleSaveGenre}
                    className="bg-[var(--zone-primary)] hover:bg-[var(--zone-primary-light)] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95"
                  >
                    <FolderPlus className="w-4 h-4" /> {editingGenre ? 'Lưu thay đổi' : 'Khởi tạo chuyên khoa'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Khoa bệnh hiện hành</label>
                <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-700/55 rounded-xl bg-slate-50/20 dark:bg-slate-900/10">
                  {genresHospital.length === 0 && genresCaiNghien.length === 0 && (
                    <span className="text-xs text-slate-400 italic py-1">Chưa có khoa bệnh nào được ghi nhận.</span>
                  )}
                  {genresHospital.map((g) => (
                    <div 
                      key={g.name} 
                      title={g.description || 'Không có mô tả.'}
                      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs hover:border-[var(--zone-primary)] shadow-sm hover:shadow transition-all group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{g.icon || '🏨'}</span>
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{g.name}</span>
                          <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 font-semibold px-1 rounded-sm mt-0.5">🏥 Bệnh Viện</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-1 items-center">
                        <button 
                          onClick={() => handleStartEdit(g, 'hospital')}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                          title="Sửa chuyên khoa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteGenre(g.name, 'hospital')}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition"
                          title="Xóa chuyên khoa"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {genresCaiNghien.map((g) => (
                    <div 
                      key={g.name} 
                      title={g.description || 'Không có mô tả.'}
                      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs hover:border-[var(--zone-primary)] shadow-sm hover:shadow transition-all group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{g.icon || '🏨'}</span>
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{g.name}</span>
                          <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 font-semibold px-1 rounded-sm mt-0.5">💊 Trại</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-1 items-center">
                        <button 
                          onClick={() => handleStartEdit(g, 'cai-nghien')}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                          title="Sửa chuyên khoa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteGenre(g.name, 'cai-nghien')}
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
          {activeTab === 'backgrounds' && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">

              {/* Welcome BG */}
              <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">🌄 Hình nền trang Chào Mừng:</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    id="welcome-bg-file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'welcomeBgImage', 'welcomeBgFileName')}
                    className="hidden"
                  />
                  <button 
                    onClick={() => document.getElementById('welcome-bg-file')?.click()}
                    className="px-4 py-1.5 bg-[var(--zone-primary)] text-white text-xs font-bold rounded-xl hover:opacity-90 shadow cursor-pointer"
                  >
                    Chọn hình ảnh
                  </button>
                  <span className="text-xs text-slate-400 italic truncate max-w-[150px]">
                    {settings.welcomeBgFileName || 'Chưa đổi hình nền'}
                  </span>
                  {settings.welcomeBgImage && (
                    <button 
                      onClick={() => { onSaveSettings('welcomeBgImage', ''); onSaveSettings('welcomeBgFileName', ''); }}
                      className="ml-auto p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              {/* Cainhien BG */}
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">🌲 Hình nền Viện Tâm Thần:</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    id="cainhien-bg-file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'cainhienBgImage', 'cainhienBgFileName')}
                    className="hidden"
                  />
                  <button 
                    onClick={() => document.getElementById('cainhien-bg-file')?.click()}
                    className="px-4 py-1.5 bg-[var(--zone-primary)] text-white text-xs font-bold rounded-xl hover:opacity-90 shadow cursor-pointer"
                  >
                    Chọn hình ảnh
                  </button>
                  <span className="text-xs text-slate-400 dark:text-slate-400 italic truncate max-w-[150px]">
                    {settings.cainhienBgFileName || 'Chưa đổi hình nền'}
                  </span>
                  {settings.cainhienBgImage && (
                    <button 
                      onClick={() => { onSaveSettings('cainhienBgImage', ''); onSaveSettings('cainhienBgFileName', ''); }}
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
          {activeTab === 'music' && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">

              {/* Display Name Customizer */}
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">✏️ Tên hiển thị bài hát:</span>
                <input 
                  type="text" 
                  placeholder="Tên bài hát hiển thị..." 
                  value={settings.musicName || ''}
                  onChange={(e) => onSaveSettings('musicName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                />
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">📂 Tải bài hát trực tiếp (.mp3, .wav):</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    id="audio-uploader" 
                    accept="audio/*" 
                    onChange={handleMusicUpload}
                    className="hidden"
                  />
                  <button 
                    onClick={() => document.getElementById('audio-uploader')?.click()}
                    className="px-4 py-1.5 bg-[var(--zone-primary)] text-white text-xs font-bold rounded-xl hover:opacity-90 shadow cursor-pointer animate-pulse"
                  >
                    Tải File Âm Thanh
                  </button>
                  <span className="text-xs text-slate-400 dark:text-slate-400 italic truncate max-w-[280px]">
                    {settings.musicName || 'Chưa dán/nạp bài hát nào'}
                  </span>
                </div>
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">🔗 Chèn YouTube URL:</span>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    placeholder="https://youtube.com/..." 
                    value={youtubeUrl}
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
              </div>
            </div>
          )}

          {/* TAB 4: SOCIAL CONNECTIONS */}
          {activeTab === 'links' && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">

              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">💬 Cổng liên kết Discord</label>
                  <input 
                    type="url" 
                    placeholder="https://discord.gg/..." 
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 rounded-xl outline-none text-xs focus:ring-1 focus:ring-[var(--zone-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">👍 Cổng liên kết fanpage Facebook</label>
                  <input 
                    type="url" 
                    placeholder="https://facebook.com/..." 
                    value={facebookUrl}
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

          {/* TAB 5: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-4 animate-[in_0.15s_ease-out]">
              <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 text-[var(--zone-primary)] flex items-center justify-center mx-auto shadow-inner border border-slate-200/50 dark:border-slate-750">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Bác Sĩ Trưởng Ban</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Quyền hạn: Chánh văn phòng Admin</p>
                </div>
                <div className="pt-2">
                  <button 
                    onClick={() => {
                      if (onAdminLogout) {
                        onAdminLogout();
                      }
                    }}
                    className="mx-auto w-full max-w-[200px] bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 shadow hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
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
