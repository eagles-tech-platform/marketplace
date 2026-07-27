import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/upload";

type AvatarUploadButtonProps = {
  onUploaded: (url: string) => void;
};

export default function AvatarUploadButton({ onUploaded }: AvatarUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      onUploaded(url);
    } catch {
      setError("Could not upload photo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md hover:bg-teal-600 transition-colors disabled:opacity-60"
        title="Change photo"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleChange(e.target.files?.[0])} />
      {error && <p className="absolute top-full mt-1 left-0 text-xs text-red-600 whitespace-nowrap">{error}</p>}
    </>
  );
}
