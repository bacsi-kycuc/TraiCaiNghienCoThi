import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2800);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--zone-primary)] text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg z-[99999] transition-all duration-350 ease-out animate-bounce">
      {message}
    </div>
  );
}
