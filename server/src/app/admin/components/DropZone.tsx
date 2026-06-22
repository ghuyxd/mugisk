"use client";

import { useRef, useState } from "react";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
}

const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac"];

export function DropZone({ onFiles, accept, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    // Reset so the same file can be re-dropped
    e.target.value = "";
  }

  return (
    <div
      id="upload-dropzone"
      className={`dropzone ${dragging ? "dropzone--active" : ""} ${disabled ? "dropzone--disabled" : ""}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload audio files — click or drag and drop"
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept ?? AUDIO_EXTENSIONS.join(",")}
        style={{ display: "none" }}
        onChange={handleChange}
        aria-hidden="true"
      />
      <div className="dropzone-icon">🎵</div>
      <div className="dropzone-label">
        {disabled
          ? "Upload in progress…"
          : dragging
          ? "Release to upload"
          : "Drop audio files here, or click to browse"}
      </div>
      <div className="dropzone-hint">
        {AUDIO_EXTENSIONS.join(" · ")} · max 200 MB each
      </div>
    </div>
  );
}
