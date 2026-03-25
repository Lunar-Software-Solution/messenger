import { useEffect } from "react";
import { X } from "lucide-react";

interface MessageLightboxProps {
  url: string;
  type?: "image" | "video";
  onClose: () => void;
}

const MessageLightbox = ({ url, type = "image", onClose }: MessageLightboxProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>
      {type === "video" ? (
        <video
          src={url}
          controls
          autoPlay
          className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={url}
          alt="full"
          className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
};

export default MessageLightbox;
