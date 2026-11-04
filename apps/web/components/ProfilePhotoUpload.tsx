"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { apiPostForm } from "../lib/api";

interface ProfilePhotoUploadProps {
  name: string;
  avatarUrl: string | null;
  onUploaded: (avatarUrl: string) => void;
  variant?: "light" | "dark";
}

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function ProfilePhotoUpload({
  name,
  avatarUrl,
  onUploaded,
  variant = "light",
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  async function uploadPhoto(file: File) {
    setMessage("");
    setError("");
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("The image must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const result = await apiPostForm<{ avatar_url: string }>(
        "/api/v1/auth/profile/avatar",
        formData,
      );
      onUploaded(result.avatar_url);
      window.dispatchEvent(new CustomEvent("careervue:avatar-updated", {
        detail: result.avatar_url,
      }));
      setMessage("Photo updated");
      window.setTimeout(() => setMessage(""), 3000);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const helperColor = variant === "dark" ? "text-[#7c7a8a]" : "text-gray-400";

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <div className="relative">
        <div className="relative w-20 h-20 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`${name}'s profile photo`}
              fill
              sizes="80px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
              {initials || "?"}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Upload profile photo"
          className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 border-2 border-white text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-60"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadPhoto(file);
          }}
        />
      </div>

      <p className={`text-[10px] ${helperColor}`}>JPG, PNG or WebP · max 5 MB</p>
      {message && (
        <p className="text-[11px] text-emerald-500 flex items-center gap-1">
          <CheckCircle2 size={11} /> {message}
        </p>
      )}
      {error && <p className="text-[11px] text-red-500 max-w-40 text-center">{error}</p>}
    </div>
  );
}
