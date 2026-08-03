import React from "react";

interface StyledUsernameProps {
  name: string;
  color?: string;
  effect?: string; // "none" | "gradient" | "hologram" | "neon"
  font?: string; // "Lobster" | "Pacifico" | "Mali" | "Bagel Fat One" | "Times New Roman" | ""
  className?: string;
}

export function StyledUsername({
  name,
  color,
  effect = "none",
  font,
  className = "",
}: StyledUsernameProps) {
  let fontClass = "";
  if (font === "Lobster") fontClass = "font-lobster";
  else if (font === "Pacifico") fontClass = "font-pacifico";
  else if (font === "Mali") fontClass = "font-mali";
  else if (font === "Bagel Fat One") fontClass = "font-bagelfat";
  else if (font === "Times New Roman") fontClass = "font-times";

  let effectClass = "";
  if (effect === "gradient") effectClass = "effect-gradient";
  else if (effect === "hologram") effectClass = "effect-hologram";
  else if (effect === "neon") effectClass = "effect-neon";

  // Build inline styles
  const style: React.CSSProperties = {};

  if (color && color.trim()) {
    if (effect === "none") {
      style.color = color;
    } else if (effect === "neon") {
      style.color = color;
      style.setProperty?.("--neon-color", color);
    } else if (effect === "gradient") {
      style.setProperty?.("--grad-start", color);
      const secondaryColor = getShiftedColor(color);
      style.setProperty?.("--grad-end", secondaryColor);
    }
  }

  return (
    <span className={`${fontClass} ${effectClass} ${className}`} style={style}>
      {name}
    </span>
  );
}

// Utility to lighten/darken or shift hex color slightly for nice gradients
function getShiftedColor(hex: string): string {
  if (!hex || !hex.startsWith("#")) return "#fecfef";
  try {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    // Shift colors slightly to create a beautiful gradient effect
    r = Math.min(255, Math.max(0, r - 40));
    g = Math.min(255, Math.max(0, g + 40));
    b = Math.min(255, Math.max(0, b + 60));

    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return "#fecfef";
  }
}

interface UserAvatarProps {
  avatar: string;
  avatarType?: string; // "icon" | "image"
  avatarImage?: string; // Base64 data Url
  className?: string;
}

export function UserAvatar({
  avatar,
  avatarType = "icon",
  avatarImage,
  className = "w-5 h-5",
}: UserAvatarProps) {
  if (avatarType === "image" && avatarImage && avatarImage.trim()) {
    return (
      <div className={`${className} rounded-full overflow-hidden shrink-0 select-none relative inline-block`}>
        <img
          src={avatarImage}
          alt="Avatar"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback to displaying text emoji if image fails
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const fallbackEl = e.currentTarget.parentElement?.querySelector(".fallback-text-avatar");
            if (fallbackEl) {
              (fallbackEl as HTMLElement).style.display = "flex";
            }
          }}
        />
        <div className="fallback-text-avatar hidden absolute inset-0 items-center justify-center bg-purple-900/30 text-sm">
          {avatar || "👻"}
        </div>
      </div>
    );
  }

  // Otherwise, fallback to character emoji icon
  return (
    <span className={`${className} flex items-center justify-center shrink-0 text-sm select-none`}>
      {avatar || "👻"}
    </span>
  );
}
