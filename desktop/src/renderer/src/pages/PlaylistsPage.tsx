import React from "react";
import { ListMusic } from "lucide-react";

export default function PlaylistsPage(): React.JSX.Element {
  return (
    <div className="placeholder-page">
      <ListMusic size={48} className="placeholder-icon" />
      <span className="placeholder-label">Playlists</span>
      <span className="placeholder-hint">Your playlists will appear here — Phase 7</span>
    </div>
  );
}
