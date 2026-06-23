import React from "react";
import { useNavigate } from "react-router-dom";
import { Mic2 } from "lucide-react";

import type { ArtistItem } from "@renderer/api/library";

interface Props {
  artist: ArtistItem;
}

export default function ArtistCard({ artist }: Props): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <button
      className="artist-card"
      onClick={() => navigate(`/artists/${artist.id}`)}
      aria-label={`Open artist ${artist.name}`}
    >
      <div className="artist-card-cover">
        {artist.imageUrl ? (
          <img src={artist.imageUrl} alt={artist.name} draggable={false} />
        ) : (
          <Mic2 size={36} />
        )}
      </div>
      <div className="artist-card-info">
        <span className="artist-card-name">{artist.name}</span>
        <span className="artist-card-meta">
          {artist._count.albums} album{artist._count.albums !== 1 ? "s" : ""}
          {" · "}
          {artist._count.tracks} track{artist._count.tracks !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}
