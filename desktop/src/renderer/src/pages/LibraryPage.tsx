import React from "react";
import { useParams } from "react-router-dom";
import { Disc3, Mic2, Music2, Tag } from "lucide-react";

const TAB_META: Record<string, { icon: React.ReactNode; label: string; hint: string }> = {
  albums: {
    icon: <Disc3 size={48} />,
    label: "Albums",
    hint: "Your album collection — Phase 7",
  },
  artists: {
    icon: <Mic2 size={48} />,
    label: "Artists",
    hint: "Browse by artist — Phase 7",
  },
  songs: {
    icon: <Music2 size={48} />,
    label: "Songs",
    hint: "All tracks — Phase 7",
  },
  genres: {
    icon: <Tag size={48} />,
    label: "Genres",
    hint: "Browse by genre — Phase 7",
  },
};

export default function LibraryPage(): React.JSX.Element {
  const { tab } = useParams<{ tab?: string }>();
  const meta = TAB_META[tab ?? "albums"] ?? TAB_META["albums"];

  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">{meta.icon}</span>
      <span className="placeholder-label">{meta.label}</span>
      <span className="placeholder-hint">{meta.hint}</span>
    </div>
  );
}
