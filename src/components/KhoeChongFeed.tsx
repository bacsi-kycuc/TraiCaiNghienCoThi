import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  X, 
  CheckCircle, 
  UploadCloud, 
  Smile, 
  UserCheck, 
  Lock,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Filter,
  Search
} from "lucide-react";
import { KhoeChongPost, KhoeChongComment, Prompt } from "../types";
import { compressImageFile } from "../utils/imageUtils";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "../firebase";
import { UserAvatar, StyledUsername } from "./UserProfileStyle";

interface KhoeChongFeedProps {
  prompts?: Prompt[];
  currentUser: string | null;
  isAdmin: boolean;
  setToastMessage: (msg: string) => void;
  onOpenAuthModal?: () => void;
  onNotifyAuthor?: (notif: {
    recipientUser: string;
    message: string;
    targetTab: "vip";
    vipSubTab: "khoe-chong";
    date: string;
  }) => void;
}

function countWords(str: string): number {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export default function KhoeChongFeed({
  prompts,
  currentUser,
  isAdmin,
  setToastMessage,
  onOpenAuthModal,
  onNotifyAuthor,
}: KhoeChongFeedProps) {
  // Prompts sync state (from props and Firestore)
  const [internalPrompts, setInternalPrompts] = useState<Prompt[]>(() => {
    if (prompts && prompts.length > 0) return prompts;
    try {
      const saved = localStorage.getItem("local_prompts");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    if (prompts && prompts.length > 0) {
      setInternalPrompts(prompts);
    }
  }, [prompts]);

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, "prompts"), (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Prompt[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(docSnap.data() as Prompt);
          });
          setInternalPrompts(loaded);
        }
      });
      return () => unsub();
    } catch {}
  }, []);

  // Filter valid official characters from Prompts (excluding sample/dummy items)
  const availableCharacters = React.useMemo(() => {
    const list: { id: number; name: string; fullTitle: string; icon: string; genre: string }[] = [];
    const seenNames = new Set<string>();

    (internalPrompts || []).forEach((p) => {
      if ((p as any).isSample) return;
      const lowerTitle = (p.title || "").toLowerCase();
      // Exclude sample / mock data
      if (
        lowerTitle.includes("sample") ||
        lowerTitle.includes("bản mẫu") ||
        lowerTitle.includes("mẫu bệnh án") ||
        lowerTitle.includes("[sample]") ||
        lowerTitle.includes("ví dụ") ||
        lowerTitle.includes("test")
      ) {
        return;
      }

      // Extract clean character name (e.g., "Hồ sơ sủng ngọt: Chú Cố Khải Pháp Y" -> "Chú Cố Khải Pháp Y")
      let cleanName = p.title.trim();
      if (cleanName.includes(":")) {
        const afterColon = cleanName.split(":").slice(1).join(":").trim();
        if (afterColon.length >= 2) {
          cleanName = afterColon;
        }
      }

      if (!cleanName || seenNames.has(cleanName.toLowerCase())) return;
      seenNames.add(cleanName.toLowerCase());

      list.push({
        id: p.id,
        name: cleanName,
        fullTitle: p.title.trim(),
        icon: p.icon || "🤵",
        genre: p.genre || "Bệnh án Viện",
      });
    });

    return list;
  }, [internalPrompts]);

  // Posts state: clean and empty by default (no mock/sample posts)
  const [posts, setPosts] = useState<KhoeChongPost[]>(() => {
    try {
      const saved = localStorage.getItem("khoe_chong_posts_local");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any previous dummy/sample posts
          return parsed.filter((p) => p.id !== "sample_post_1");
        }
      }
    } catch {}
    return [];
  });

  // Post form state
  const [husbandName, setHusbandName] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);
  const [postContent, setPostContent] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Husband filter state for community feed (default: "all")
  const [filterHusbandName, setFilterHusbandName] = useState<string>("all");

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuggestions]);

  // Filter autocomplete suggestions based on user input
  const filteredSuggestions = React.useMemo(() => {
    if (!husbandName.trim()) {
      return availableCharacters;
    }
    const q = husbandName.toLowerCase().trim();
    return availableCharacters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.fullTitle.toLowerCase().includes(q) ||
        c.genre.toLowerCase().includes(q)
    );
  }, [husbandName, availableCharacters]);

  // Check if current typed husbandName matches an official character
  const matchedOfficialChar = React.useMemo(() => {
    if (!husbandName.trim()) return null;
    const q = husbandName.toLowerCase().trim();
    return availableCharacters.find((c) => c.name.toLowerCase().trim() === q) || null;
  }, [husbandName, availableCharacters]);

  // Helper to match post with husband name
  const matchesHusband = (post: KhoeChongPost, target: string) => {
    if (!target || target === "all") return true;
    if (!post.husbandName) return false;
    const pName = post.husbandName.toLowerCase().trim();
    const tName = target.toLowerCase().trim();
    return pName === tName || pName.includes(tName) || tName.includes(pName);
  };

  // Compute options for the Husband Filter Dropdown
  const filterOptions = React.useMemo(() => {
    const options: { key: string; label: string; icon: string; count: number; isOfficial: boolean }[] = [];

    availableCharacters.forEach((c) => {
      const count = posts.filter((p) => matchesHusband(p, c.name)).length;
      options.push({
        key: c.name,
        label: c.name,
        icon: c.icon,
        count,
        isOfficial: true,
      });
    });

    // Custom husbands added by users that aren't in availableCharacters
    const customNames = new Set<string>();
    posts.forEach((p) => {
      if (p.husbandName && p.husbandName.trim()) {
        const isOfficial = availableCharacters.some((c) => matchesHusband(p, c.name));
        if (!isOfficial) {
          customNames.add(p.husbandName.trim());
        }
      }
    });

    customNames.forEach((name) => {
      const count = posts.filter((p) => matchesHusband(p, name)).length;
      options.push({
        key: name,
        label: name,
        icon: "💕",
        count,
        isOfficial: false,
      });
    });

    // Sort: characters with posts first, then alphabetical
    options.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

    return options;
  }, [availableCharacters, posts]);

  // Active expanded comments map (postId -> boolean)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  // Comment inputs map (postId -> string)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  // Post image zoom modal
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Deletion confirm modal
  const [postToDelete, setPostToDelete] = useState<KhoeChongPost | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{ post: KhoeChongPost; commentId: string } | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = collection(db, "khoe_chong_posts");
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetchedPosts: KhoeChongPost[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as any;
              fetchedPosts.push({
                id: docSnap.id,
                author: data.author || "Bệnh nhân",
                authorDisplayName: data.authorDisplayName || data.author || "Bệnh nhân",
                husbandName: data.husbandName || "Chồng Yêu",
                content: data.content || "",
                imageUrl: data.imageUrl || undefined,
                likes: Array.isArray(data.likes) ? data.likes : [],
                comments: Array.isArray(data.comments) ? data.comments : [],
                createdAt: data.createdAt || new Date().toISOString(),
              });
            });

            // Sort newest first
            fetchedPosts.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setPosts(fetchedPosts);
            localStorage.setItem("khoe_chong_posts_local", JSON.stringify(fetchedPosts));
          } else {
            // No posts yet: keep clean and empty
            setPosts([]);
            localStorage.setItem("khoe_chong_posts_local", JSON.stringify([]));
          }
        },
        (error) => {
          console.warn("Lỗi đồng bộ bài đăng Khoe Chồng từ Firestore (dùng offline cache):", error);
        }
      );
    } catch (err) {
      console.warn("Không thể khởi tạo listener Firestore:", err);
    }

    return () => unsubscribe();
  }, []);

  const wordCount = countWords(postContent);
  const isOverWordLimit = wordCount > 700;

  // Handle image upload with auto compression
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToastMessage("⚠️ Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)!");
      return;
    }

    try {
      setIsCompressingImage(true);
      // Auto compress to max 1024x1024, quality 0.75 to keep document light < 150KB
      const base64 = await compressImageFile(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.75,
        mimeType: "image/jpeg",
      });
      setUploadedImage(base64);
      setToastMessage("✨ Tải và tối ưu hóa hình ảnh thành công!");
    } catch (err) {
      console.error("Lỗi nén ảnh:", err);
      setToastMessage("❌ Không thể nén hình ảnh. Vui lòng chọn ảnh khác nhẹ hơn.");
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Pre-validate and open confirmation popup before publishing
  const handleOpenSubmitConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setToastMessage("🔒 Bạn cần đăng nhập tài khoản để đăng bài!");
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    if (!postContent.trim()) {
      setToastMessage("⚠️ Vui lòng viết vài dòng lời nhắn gửi trước khi hoàn thành nhé!");
      return;
    }

    if (isOverWordLimit) {
      setToastMessage("⚠️ Lời nhắn gửi đã vượt quá giới hạn 700 từ! Vui lòng rút gọn lại.");
      return;
    }

    setShowSubmitConfirm(true);
  };

  // Execute post creation after user confirmation
  const handleConfirmAndExecuteCreatePost = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
      // Get author display name from profile if available
      let authorDisplayName = currentUser;
      try {
        const profileStr = localStorage.getItem(`user_profile_${currentUser.toLowerCase()}`);
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.displayName) authorDisplayName = profile.displayName;
        }
      } catch {}

      const newPostId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newPost: KhoeChongPost = {
        id: newPostId,
        author: currentUser,
        authorDisplayName: authorDisplayName || currentUser,
        husbandName: husbandName.trim() || "Chồng Yêu Của Bé",
        husbandPromptId: selectedPromptId || undefined,
        content: postContent.trim(),
        imageUrl: uploadedImage || undefined,
        likes: [],
        comments: [],
        createdAt: new Date().toISOString(),
      };

      // Optimistic update
      const updatedPosts = [newPost, ...posts];
      setPosts(updatedPosts);
      localStorage.setItem("khoe_chong_posts_local", JSON.stringify(updatedPosts));

      // Persist to Cloud Firestore
      try {
        const postDocRef = doc(db, "khoe_chong_posts", newPostId);
        await setDoc(postDocRef, newPost);
      } catch (err) {
        console.warn("Lỗi lưu bài viết lên Firestore (đã lưu bộ nhớ cục bộ):", err);
      }

      // Reset form & close modal
      setHusbandName("");
      setSelectedPromptId(null);
      setPostContent("");
      setUploadedImage(null);
      setShowSubmitConfirm(false);
      setIsFormExpanded(false);

      // Trigger celebration confetti
      window.dispatchEvent(new CustomEvent("celebrate-confetti"));
      setToastMessage("🎉 Đăng bài thành công rực rỡ!");
    } catch (err) {
      console.error("Lỗi đăng bài:", err);
      setToastMessage("❌ Đã có lỗi xảy ra khi đăng bài.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Like (Thả Tim)
  const handleToggleLike = async (post: KhoeChongPost) => {
    if (!currentUser) {
      setToastMessage("🔒 Bạn cần đăng nhập tài khoản để thả tim!");
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    const currentLikes = post.likes || [];
    const hasLiked = currentLikes.some(
      (u) => u.trim().toLowerCase() === currentUser.trim().toLowerCase()
    );

    let updatedLikes: string[];
    let isNowLiked = false;

    if (hasLiked) {
      updatedLikes = currentLikes.filter(
        (u) => u.trim().toLowerCase() !== currentUser.trim().toLowerCase()
      );
    } else {
      updatedLikes = [...currentLikes, currentUser];
      isNowLiked = true;
    }

    // Optimistic update
    const updatedPost = { ...post, likes: updatedLikes };
    const updatedPosts = posts.map((p) => (p.id === post.id ? updatedPost : p));
    setPosts(updatedPosts);
    localStorage.setItem("khoe_chong_posts_local", JSON.stringify(updatedPosts));

    // Save to Firestore
    try {
      const postDocRef = doc(db, "khoe_chong_posts", post.id);
      await setDoc(postDocRef, { likes: updatedLikes }, { merge: true });
    } catch (err) {
      console.warn("Lỗi cập nhật lượt like lên Firestore:", err);
    }

    // If liked and not own post, send notification to the author
    if (
      isNowLiked &&
      post.author &&
      post.author.trim().toLowerCase() !== currentUser.trim().toLowerCase()
    ) {
      if (onNotifyAuthor) {
        onNotifyAuthor({
          recipientUser: post.author,
          message: `💖 [${currentUser}] đã thả tim bài viết khoe chồng "${post.husbandName || 'của bé'}" của bạn!`,
          targetTab: "vip",
          vipSubTab: "khoe-chong",
          date: new Date().toISOString(),
        });
      }
    }
  };

  // Submit comment
  const handleAddComment = async (post: KhoeChongPost) => {
    if (!currentUser) {
      setToastMessage("🔒 Bạn cần đăng nhập tài khoản để bình luận!");
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    const inputVal = (commentInputs[post.id] || "").trim();
    if (!inputVal) return;

    let authorDisplayName = currentUser;
    try {
      const profileStr = localStorage.getItem(`user_profile_${currentUser.toLowerCase()}`);
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.displayName) authorDisplayName = profile.displayName;
      }
    } catch {}

    const newComment: KhoeChongComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: currentUser,
      authorDisplayName: authorDisplayName || currentUser,
      content: inputVal,
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...(post.comments || []), newComment];
    const updatedPost = { ...post, comments: updatedComments };
    const updatedPosts = posts.map((p) => (p.id === post.id ? updatedPost : p));

    setPosts(updatedPosts);
    localStorage.setItem("khoe_chong_posts_local", JSON.stringify(updatedPosts));

    // Reset input
    setCommentInputs((prev) => ({ ...prev, [post.id]: "" }));

    // Save to Firestore
    try {
      const postDocRef = doc(db, "khoe_chong_posts", post.id);
      await setDoc(postDocRef, { comments: updatedComments }, { merge: true });
    } catch (err) {
      console.warn("Lỗi lưu bình luận lên Firestore:", err);
    }

    // Send notification to author if commenter is not the author
    if (
      post.author &&
      post.author.trim().toLowerCase() !== currentUser.trim().toLowerCase()
    ) {
      if (onNotifyAuthor) {
        const snippet = inputVal.length > 35 ? `${inputVal.slice(0, 35)}...` : inputVal;
        onNotifyAuthor({
          recipientUser: post.author,
          message: `💬 [${currentUser}] đã bình luận vào bài khoe chồng của bạn: "${snippet}"`,
          targetTab: "vip",
          vipSubTab: "khoe-chong",
          date: new Date().toISOString(),
        });
      }
    }

    setToastMessage("💬 Đã gửi bình luận!");
  };

  // Delete post (Author or Admin)
  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;

    const id = postToDelete.id;
    const updatedPosts = posts.filter((p) => p.id !== id);
    setPosts(updatedPosts);
    localStorage.setItem("khoe_chong_posts_local", JSON.stringify(updatedPosts));

    try {
      const postDocRef = doc(db, "khoe_chong_posts", id);
      await deleteDoc(postDocRef);
    } catch (err) {
      console.warn("Lỗi xóa bài trên Firestore:", err);
    }

    setPostToDelete(null);
    setToastMessage("🗑️ Đã xóa bài viết thành công!");
  };

  // Delete comment (Author, Commenter or Admin)
  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete) return;

    const { post, commentId } = commentToDelete;
    const updatedComments = (post.comments || []).filter((c) => c.id !== commentId);
    const updatedPost = { ...post, comments: updatedComments };
    const updatedPosts = posts.map((p) => (p.id === post.id ? updatedPost : p));

    setPosts(updatedPosts);
    localStorage.setItem("khoe_chong_posts_local", JSON.stringify(updatedPosts));

    try {
      const postDocRef = doc(db, "khoe_chong_posts", post.id);
      await setDoc(postDocRef, { comments: updatedComments }, { merge: true });
    } catch (err) {
      console.warn("Lỗi xóa bình luận trên Firestore:", err);
    }

    setCommentToDelete(null);
    setToastMessage("🗑️ Đã xóa bình luận!");
  };

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      {/* Intro Description Banner */}
      <div 
        className="relative overflow-hidden p-6 md:p-8 rounded-3xl text-center select-none shadow-[0_16px_40px_rgba(5,31,69,0.7)]"
        style={{
          background: 'linear-gradient(135deg, #051F45 0%, #08244c 38%, #27223b 68%, #573c4d 88%, #F2C4CD 100%)',
          border: '1.5px solid rgba(242, 196, 205, 0.45)',
          boxShadow: '0 16px 40px rgba(5, 31, 69, 0.65), 0 0 30px rgba(242, 196, 205, 0.22), inset 0 0 25px rgba(242, 196, 205, 0.1)'
        }}
      >
        {/* Soft atmospheric gradient glows that melt into the borders */}
        <div className="absolute -top-10 -left-10 w-44 h-44 bg-[#051F45] rounded-full blur-2xl opacity-70 pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#F2C4CD] rounded-full blur-2xl opacity-35 pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <h2 
            style={{ 
              fontFamily: '"Cormorant Garamond", serif',
              textShadow: '0 2px 14px rgba(5, 31, 69, 0.95), 0 0 25px rgba(242, 196, 205, 0.65)' 
            }}
            className="text-3xl md:text-4xl font-black italic text-[#F2C4CD] tracking-wide"
          >
            Sảnh Khoe Chồng
          </h2>
          <p className="text-[#ECE3ED]/90 text-xs md:text-sm max-w-[600px] mx-auto font-medium leading-relaxed">
            Nơi các bệnh nhân gửi gắm tâm tư tình cảm và tự hào khoe chồng yêu! Mọi người cùng vào thả tim, bình luận và chia sẻ tình cảm ngọt ngào cùng nhau~
          </p>
        </div>
      </div>

      {/* Post Creation Box - Collapsible */}
      {!isFormExpanded ? (
        <div
          onClick={() => {
            if (!currentUser && onOpenAuthModal) {
              onOpenAuthModal();
            } else {
              setIsFormExpanded(true);
            }
          }}
          className="group bg-gradient-to-r from-[#051F45]/90 via-[#0a2346]/85 to-[#241a27]/90 hover:from-[#051F45] hover:to-[#2e1f2b] border-2 border-[#F2C4CD]/30 hover:border-[#F2C4CD]/70 rounded-2xl p-4 shadow-xl transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 hover:scale-[1.01]"
          style={{
            boxShadow: '0 8px 25px rgba(5, 31, 69, 0.45), 0 0 15px rgba(242, 196, 205, 0.1)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2C4CD]/15 border border-[#F2C4CD]/30 flex items-center justify-center text-lg text-[#F2C4CD] group-hover:scale-110 transition shrink-0">
              ✍️
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F2C4CD] group-hover:text-white transition flex items-center gap-2">
                Đăng bài
                {currentUser && (
                  <span className="text-[10px] bg-[#F2C4CD]/15 border border-[#F2C4CD]/30 text-[#F2C4CD] px-2 py-0.5 rounded-full font-bold">
                    Bệnh nhân: {currentUser}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#F2C4CD]/70">
                Bấm vào đây để chia sẻ tâm sự và khoe chồng yêu...
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-[#051F45] hover:bg-[#0c2f66] border border-[#F2C4CD]/50 text-[#F2C4CD] text-xs font-bold rounded-xl shadow transition shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Đăng bài</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div 
          className="border-2 border-[#F2C4CD]/35 rounded-3xl p-5 md:p-6 shadow-2xl relative transition-all animate-[fade-in_0.25s_ease-out]"
          style={{
            background: 'linear-gradient(135deg, rgba(5, 31, 69, 0.95) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(46, 31, 43, 0.95) 100%)',
            boxShadow: '0 16px 40px rgba(5, 31, 69, 0.6), inset 0 0 30px rgba(242, 196, 205, 0.05)'
          }}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F2C4CD]/20">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#F2C4CD]/15 border border-[#F2C4CD]/30 text-[#F2C4CD] text-lg">
                ✍️
              </span>
              <div>
                <h3 className="font-bold text-sm text-[#F2C4CD] flex items-center gap-2">
                  Đăng Bài
                  {currentUser && (
                    <span className="text-[10px] bg-[#F2C4CD]/20 border border-[#F2C4CD]/40 text-[#F2C4CD] px-2 py-0.5 rounded-full font-bold">
                      Bệnh nhân: {currentUser}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-[#F2C4CD]/70">
                  Gửi gắm nỗi lòng, viết tâm thư và chia sẻ hình ảnh đẹp đẽ của chàng
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFormExpanded(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#051F45]/70 hover:bg-[#051F45] border border-[#F2C4CD]/30 hover:border-[#F2C4CD]/60 text-[#F2C4CD]/80 hover:text-[#F2C4CD] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <span>Thu gọn</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {!currentUser ? (
            <div className="p-6 bg-black/40 rounded-2xl border border-[#F2C4CD]/20 text-center space-y-3">
              <Lock className="w-8 h-8 text-[#F2C4CD] mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-[#F2C4CD]">
                Bạn cần đăng nhập tài khoản để đăng bài khoe chồng
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Việc đăng bài bằng tài khoản chính thức giúp tác giả nhận được đầy đủ thông báo khi mọi người thả tim và bình luận vào bài viết!
              </p>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="bg-gradient-to-r from-[#051F45] to-[#573c4d] hover:brightness-125 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition shadow-lg cursor-pointer inline-flex items-center gap-2 border border-[#F2C4CD]/40"
              >
                <UserCheck className="w-4 h-4" /> Đăng Nhập / Tạo Tài Khoản Ngay
              </button>
            </div>
          ) : (
            <form onSubmit={handleOpenSubmitConfirm} className="space-y-4">
              <div className="relative" ref={suggestionBoxRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#F2C4CD] flex items-center gap-1.5">
                    <span>💕 Tên Chồng Yêu:</span>
                  </label>
                  {availableCharacters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSuggestions((prev) => !prev)}
                      className="text-[11px] text-[#F2C4CD]/80 hover:text-[#F2C4CD] flex items-center gap-1 font-semibold cursor-pointer transition"
                    >
                      <Sparkles className="w-3 h-3 text-[#F2C4CD]" />
                      <span>{showSuggestions ? "Đóng gợi ý" : "Chọn nhân vật có sẵn trong Viện"}</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nhập hoặc chọn nhân vật có sẵn trong web..."
                    value={husbandName}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setHusbandName(e.target.value);
                      setSelectedPromptId(null);
                      if (!showSuggestions) setShowSuggestions(true);
                    }}
                    maxLength={80}
                    className="w-full bg-black/50 border border-[#F2C4CD]/30 focus:border-[#F2C4CD] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition pr-10"
                  />
                  {husbandName ? (
                    <button
                      type="button"
                      onClick={() => {
                        setHusbandName("");
                        setSelectedPromptId(null);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition"
                      title="Xóa tên"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSuggestions((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#F2C4CD]/60 hover:text-[#F2C4CD] p-1 cursor-pointer transition"
                      title="Bấm để xem danh sách nhân vật"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Selected Official Tag Badge if matched */}
                {matchedOfficialChar && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#F2C4CD] bg-[#051F45]/90 border border-[#F2C4CD]/35 px-2.5 py-1 rounded-xl animate-[fade-in_0.2s_ease-out]">
                    <span className="text-emerald-400">✓</span>
                    <span>Bệnh án chính thức:</span>
                    <span className="font-bold text-white">{matchedOfficialChar.icon} {matchedOfficialChar.name}</span>
                    <span className="text-[10px] text-[#ECE3ED]/60">({matchedOfficialChar.genre})</span>
                  </div>
                )}

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && availableCharacters.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#051F45]/98 border-2 border-[#F2C4CD]/45 rounded-2xl shadow-2xl p-2 z-30 max-h-56 overflow-y-auto backdrop-blur-md space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-[#F2C4CD]/80 uppercase tracking-wider border-b border-[#F2C4CD]/15">
                      <span>🏥 Nhân vật có sẵn trong Viện:</span>
                      <span>{filteredSuggestions.length} nhân vật</span>
                    </div>

                    {filteredSuggestions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Không có nhân vật có sẵn trùng khớp. Bạn vẫn có thể tự do đặt tên "{husbandName}" để khoe chồng!
                      </div>
                    ) : (
                      filteredSuggestions.map((char) => (
                        <div
                          key={char.id}
                          onClick={() => {
                            setHusbandName(char.name);
                            setSelectedPromptId(char.id);
                            setShowSuggestions(false);
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl text-left cursor-pointer transition ${
                            husbandName.toLowerCase() === char.name.toLowerCase()
                              ? "bg-[#F2C4CD]/20 border border-[#F2C4CD]/50 text-white"
                              : "hover:bg-[#F2C4CD]/10 text-[#ECE3ED] border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg shrink-0 w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center border border-[#F2C4CD]/20">
                              {char.icon}
                            </span>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-[#F2C4CD] truncate">
                                {char.name}
                              </span>
                              <span className="block text-[10px] text-slate-400 truncate">
                                {char.fullTitle} • <span className="text-[#F2C4CD]/70">{char.genre}</span>
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#F2C4CD] shrink-0 font-bold bg-[#051F45] border border-[#F2C4CD]/30 px-2 py-0.5 rounded-lg ml-2 hover:bg-[#F2C4CD]/20 transition">
                            Chọn 💖
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#F2C4CD] flex items-center gap-1.5">
                    <span>💌 Lời Nhắn Gửi:</span>
                  </label>
                  <div className="text-[11px] flex items-center gap-1.5">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                        isOverWordLimit
                          ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse"
                          : wordCount > 600
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                          : "bg-[#F2C4CD]/20 text-[#F2C4CD] border border-[#F2C4CD]/30"
                      }`}
                    >
                      {wordCount} / 700 từ
                    </span>
                  </div>
                </div>

                <textarea
                  rows={4}
                  placeholder="Nhập lời nhắn gửi..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className={`w-full bg-black/50 border rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none transition leading-relaxed ${
                    isOverWordLimit ? "border-rose-500 focus:border-rose-400" : "border-[#F2C4CD]/30 focus:border-[#F2C4CD]"
                  }`}
                />

                {isOverWordLimit && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Lời nhắn gửi đã vượt quá giới hạn 700 từ! Bé vui lòng rút gọn bớt để gửi gắm tình cảm nhé~
                  </p>
                )}
              </div>

              {/* Image Upload section */}
              <div>
                <label className="block text-xs font-bold text-[#F2C4CD] mb-1.5">
                  📷 Ảnh Chồng Yêu (Tùy chọn):
                </label>

                {uploadedImage ? (
                  <div className="relative inline-block border-2 border-[#F2C4CD]/40 rounded-2xl overflow-hidden group shadow-lg">
                    <img
                      src={uploadedImage}
                      alt="Ảnh chồng yêu"
                      className="max-h-56 max-w-full rounded-xl object-contain bg-black/40"
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-500 text-white p-1.5 rounded-full shadow-md transition cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="khoe-chong-file-input"
                    />
                    <label
                      htmlFor="khoe-chong-file-input"
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-[#051F45]/80 hover:bg-[#0c2f66] text-[#F2C4CD] text-xs font-bold rounded-xl border border-[#F2C4CD]/40 transition cursor-pointer shadow-sm ${
                        isCompressingImage ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <UploadCloud className="w-4 h-4 text-[#F2C4CD]" />
                      <span>{isCompressingImage ? "Đang xử lý ảnh..." : "Tải ảnh lên"}</span>
                    </label>
                    <span className="text-[11px] text-slate-400 italic">
                      (Ảnh sẽ được tối ưu hóa tự động để đảm bảo hiển thị sắc nét & nhẹ nhàng)
                    </span>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isOverWordLimit || !postContent.trim()}
                  className={`py-2.5 px-6 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg ${
                    isSubmitting || isOverWordLimit || !postContent.trim()
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#051F45] via-[#4a2e43] to-[#7a485f] hover:brightness-125 text-white border border-[#F2C4CD]/50 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-[#F2C4CD]" />
                  <span>{isSubmitting ? "Đang lưu..." : "Hoàn thành"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Community Feed List */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#F2C4CD] flex items-center gap-2">
              <span>✨ Bảng Tin Khoe Chồng</span>
              <span className="text-xs bg-[#F2C4CD]/15 text-[#F2C4CD] px-2.5 py-0.5 rounded-full border border-[#F2C4CD]/30 font-bold">
                {posts.length} bài đăng
              </span>
            </h3>
          </div>

          {/* Husband Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#ECE3ED]/80 font-bold flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#F2C4CD]" />
              <span className="hidden sm:inline">Phân loại:</span>
            </label>
            <div className="relative">
              <select
                value={filterHusbandName}
                onChange={(e) => setFilterHusbandName(e.target.value)}
                className="bg-[#051F45]/90 hover:bg-[#051F45] border border-[#F2C4CD]/40 text-[#F2C4CD] text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#F2C4CD] cursor-pointer shadow transition"
              >
                <option value="all">🌟 Tất cả Chồng Yêu ({posts.length})</option>
                {filterOptions.some((opt) => opt.isOfficial) && (
                  <optgroup label="🏥 Nhân vật có sẵn trong Viện">
                    {filterOptions
                      .filter((opt) => opt.isOfficial)
                      .map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.icon} {opt.label} ({opt.count} bài)
                        </option>
                      ))}
                  </optgroup>
                )}
                {filterOptions.some((opt) => !opt.isOfficial) && (
                  <optgroup label="💕 Chồng Yêu tự do khác">
                    {filterOptions
                      .filter((opt) => !opt.isOfficial)
                      .map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.icon} {opt.label} ({opt.count} bài)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Banner if not "all" */}
        {filterHusbandName !== "all" && (
          <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-[#051F45]/95 via-[#0c2854]/90 to-[#2e212b]/95 border border-[#F2C4CD]/45 rounded-2xl animate-[fade-in_0.2s_ease-out] shadow-md">
            <div className="flex items-center gap-2 text-xs text-[#ECE3ED]">
              <span className="text-base">🎯</span>
              <span>
                Đang xem các lời nhắn gửi riêng cho:{" "}
                <strong className="text-[#F2C4CD] font-bold">{filterHusbandName}</strong>{" "}
                <span className="text-[11px] text-[#F2C4CD]/80 font-bold ml-1">
                  ({posts.filter((p) => matchesHusband(p, filterHusbandName)).length} bài)
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFilterHusbandName("all")}
              className="text-[11px] text-[#F2C4CD] hover:text-white px-2.5 py-1 bg-black/40 hover:bg-black/70 rounded-xl border border-[#F2C4CD]/30 transition cursor-pointer flex items-center gap-1 font-semibold"
            >
              <X className="w-3 h-3" /> Bỏ lọc
            </button>
          </div>
        )}

        {(() => {
          const displayedPosts = filterHusbandName === "all"
            ? posts
            : posts.filter((p) => matchesHusband(p, filterHusbandName));

          if (displayedPosts.length === 0) {
            return (
              <div className="p-10 text-center bg-black/40 rounded-3xl border border-[#F2C4CD]/25 text-slate-400 space-y-3">
                <span className="text-4xl inline-block animate-bounce">💌</span>
                {filterHusbandName === "all" ? (
                  <p className="text-xs font-semibold text-[#F2C4CD]">
                    Chưa có bài đăng nào. Hãy là người đầu tiên khoe chồng yêu của bạn nhé!
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#F2C4CD]">
                      Chưa có lời nhắn gửi nào dành riêng cho "{filterHusbandName}".
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Hãy là người đầu tiên gửi gắm tâm tư ngọt ngào cho anh ấy nhé!
                    </p>
                    {currentUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setHusbandName(filterHusbandName);
                          setIsFormExpanded(true);
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#051F45] to-[#573c4d] hover:brightness-125 border border-[#F2C4CD]/40 text-[#F2C4CD] text-xs font-bold rounded-xl transition cursor-pointer shadow-md mt-2"
                      >
                        ✍️ Viết lời nhắn cho {filterHusbandName} ngay
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return displayedPosts.map((post) => {
            const hasLiked = currentUser
              ? (post.likes || []).some(
                  (u) => u.trim().toLowerCase() === currentUser.trim().toLowerCase()
                )
              : false;
            const commentsCount = (post.comments || []).length;
            const likesCount = (post.likes || []).length;
            const isCommentsExpanded = !!expandedComments[post.id];
            const isAuthor = currentUser && post.author.trim().toLowerCase() === currentUser.trim().toLowerCase();
            const canDelete = isAdmin || isAuthor;

            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2E1F2B]/90 border border-pink-500/30 hover:border-pink-400/50 rounded-3xl p-5 md:p-6 shadow-xl transition-all space-y-4"
              >
                {/* Post Header: Author info + Date + Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      avatar="💖"
                      avatarType="icon"
                      className="w-8 h-8 rounded-full bg-pink-900/40 border border-pink-500/30 text-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-pink-100 font-sans">
                          {post.authorDisplayName || post.author}
                        </span>
                        {post.author === "Viện Trưởng Cố Thị" ? (
                          <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black px-1.5 py-0.2 rounded-md">
                            👑 Viện Trưởng
                          </span>
                        ) : (
                          <span className="text-[9px] bg-pink-500/15 border border-pink-500/30 text-pink-300 font-bold px-1.5 py-0.2 rounded-md">
                            🩺 Bệnh nhân
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {(() => {
                          try {
                            return new Date(post.createdAt).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            });
                          } catch {
                            return "Vừa xong";
                          }
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Husband Title Badge (Clickable to filter) */}
                    <button
                      type="button"
                      onClick={() => setFilterHusbandName(post.husbandName || "Chồng Yêu")}
                      title={`Lọc xem toàn bộ lời nhắn gửi cho ${post.husbandName || "Chồng Yêu"}`}
                      className="bg-gradient-to-r from-pink-600/30 to-purple-600/30 hover:from-pink-600/50 hover:to-purple-600/50 border border-pink-400/40 hover:border-[#F2C4CD] text-pink-200 hover:text-white text-[11px] font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 transition cursor-pointer group/badge"
                    >
                      <Sparkles className="w-3 h-3 text-pink-300 shrink-0 group-hover/badge:rotate-12 transition" />
                      <span>Chồng: {post.husbandName || "Chồng Yêu"}</span>
                      <span className="text-[9px] opacity-70">🔍</span>
                    </button>

                    {/* Delete button (Author or Admin) */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setPostToDelete(post)}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                        title={isAdmin ? "Xóa bài viết (Quyền Viện Trưởng)" : "Xóa bài của bạn"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <div className="bg-black/35 rounded-2xl p-4 border border-pink-500/15 text-xs text-pink-50/95 leading-relaxed font-sans whitespace-pre-wrap select-text">
                  {post.content}
                  <div className="text-right mt-2">
                    <span className="text-[10px] text-pink-300/60 font-mono">
                      [{countWords(post.content)} từ]
                    </span>
                  </div>
                </div>

                {/* Attached Image if present */}
                {post.imageUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-pink-500/30 bg-black/50 group max-h-96 flex items-center justify-center">
                    <img
                      src={post.imageUrl}
                      alt={`Ảnh chồng yêu của ${post.author}`}
                      className="max-h-96 w-auto object-contain rounded-2xl transition hover:scale-[1.01] cursor-pointer"
                      onClick={() => setZoomedImageUrl(post.imageUrl!)}
                    />
                    <button
                      type="button"
                      onClick={() => setZoomedImageUrl(post.imageUrl!)}
                      className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Phóng to ảnh"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Actions Bar: Like + Comment Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-pink-500/15 text-xs">
                  <div className="flex items-center gap-3">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-sm ${
                        hasLiked
                          ? "bg-pink-600 text-white border border-pink-400/50 hover:bg-pink-500"
                          : "bg-pink-950/40 text-pink-200 hover:bg-pink-900/50 border border-pink-500/25"
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${hasLiked ? "fill-white text-white" : "text-pink-300"}`}
                      />
                      <span>Thả tim</span>
                      <span className="font-mono ml-0.5">({likesCount})</span>
                    </button>

                    {/* Comment button */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedComments((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-purple-950/40 text-purple-200 hover:bg-purple-900/50 border border-purple-500/25 transition cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-purple-300" />
                      <span>Bình luận</span>
                      <span className="font-mono ml-0.5">({commentsCount})</span>
                    </button>
                  </div>

                  {likesCount > 0 && (
                    <div className="text-[11px] text-pink-300/80 italic font-medium hidden sm:block">
                      💖 {post.likes.slice(0, 3).join(", ")}
                      {post.likes.length > 3 ? ` và ${post.likes.length - 3} người khác` : ""} đã thả tim
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {isCommentsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pt-3 border-t border-pink-500/20 overflow-hidden"
                    >
                      {/* Comments List */}
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {commentsCount === 0 ? (
                          <p className="text-[11px] text-slate-400 italic text-center py-2">
                            Chưa có bình luận nào. Hãy gửi lời khen tặng đến chồng của bé!
                          </p>
                        ) : (
                          post.comments.map((comment) => {
                            const canDeleteComment =
                              isAdmin ||
                              (currentUser &&
                                comment.author.trim().toLowerCase() === currentUser.trim().toLowerCase()) ||
                              isAuthor;

                            return (
                              <div
                                key={comment.id}
                                className="p-2.5 bg-black/40 rounded-xl border border-pink-500/15 flex items-start justify-between gap-2"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-pink-200">
                                      {comment.authorDisplayName || comment.author}
                                    </span>
                                    {comment.author === "Viện Trưởng Cố Thị" && (
                                      <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-black">
                                        👑 Viện Trưởng
                                      </span>
                                    )}
                                    <span className="text-[9px] text-slate-500">
                                      {(() => {
                                        try {
                                          return new Date(comment.createdAt).toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          });
                                        } catch {
                                          return "";
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-200 leading-snug">
                                    {comment.content}
                                  </p>
                                </div>

                                {canDeleteComment && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCommentToDelete({ post, commentId: comment.id })
                                    }
                                    className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                                    title="Xóa bình luận"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add comment input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder={
                            currentUser
                              ? "Viết lời chia sẻ ngọt ngào với bé..."
                              : "Đăng nhập để tham gia bình luận..."
                          }
                          disabled={!currentUser}
                          value={commentInputs[post.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddComment(post);
                            }
                          }}
                          className="flex-1 bg-black/50 border border-pink-500/30 focus:border-pink-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post)}
                          disabled={!currentUser || !(commentInputs[post.id] || "").trim()}
                          className={`p-2 rounded-xl transition cursor-pointer ${
                            !currentUser || !(commentInputs[post.id] || "").trim()
                              ? "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
                              : "bg-pink-600 hover:bg-pink-500 text-white shadow-md"
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          });
        })()}
      </div>

      {/* Image Zoom Modal */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-[100005] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <img
              src={zoomedImageUrl}
              alt="Zoomed chồng yêu"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-pink-500/40"
            />
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Post Confirm Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-[100005] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-300 text-xl">
              🗑️
            </div>
            <h4 className="text-base font-bold text-white">Xác nhận xóa bài viết?</h4>
            <p className="text-xs text-slate-300">
              Bài viết khoe chồng <strong>"{postToDelete.husbandName}"</strong> sẽ bị xóa vĩnh viễn khỏi Sảnh Khoe Chồng.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePost}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirm Modal */}
      {commentToDelete && (
        <div className="fixed inset-0 z-[100005] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-300 text-lg">
              💬
            </div>
            <h4 className="text-sm font-bold text-white">Xác nhận xóa bình luận?</h4>
            <p className="text-xs text-slate-300">
              Bình luận này sẽ bị xóa khỏi bài viết.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteComment}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Post Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[100005] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#241724]/95 border-2 border-pink-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-pink-100"
          >
            <div className="w-12 h-12 rounded-full bg-pink-900/40 border border-pink-400/40 flex items-center justify-center mx-auto text-pink-300 text-2xl shadow-inner">
              💖
            </div>
            
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-white">Xác nhận đăng bài?</h4>
              <p className="text-xs text-pink-200/80">
                Bài viết sẽ được đăng lên Sảnh Khoe Chồng để mọi người cùng thưởng thức và thả tim tương tác.
              </p>
            </div>

            <div className="p-3.5 bg-black/45 border border-pink-500/25 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[11px] text-pink-300/80 font-medium">Chồng yêu:</span>
                <span className="font-bold text-white truncate max-w-[180px]">{husbandName.trim() || "(Chưa nhập tên)"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[11px] text-pink-300/80 font-medium">Lời nhắn gửi:</span>
                <span className="font-mono font-bold text-pink-300">{wordCount} từ</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[11px] text-pink-300/80 font-medium">Ảnh đính kèm:</span>
                <span className="text-slate-300">{uploadedImage ? "Đã đính kèm ảnh 📷" : "Không kèm ảnh"}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmAndExecuteCreatePost}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Đang đăng...</span>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-pink-200" />
                    <span>Hoàn thành</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
