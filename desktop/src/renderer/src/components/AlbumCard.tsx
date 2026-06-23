import React from "react";
import { useNavigate } from "react-router-dom";
import { Disc3 } from "lucide-react";

import type { AlbumItem } from "@renderer/api/library";

interface Props {
  album: AlbumItem;
}

export default function AlbumCard({ album }: Props): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <button
      className="album-card"
      onClick={() => navigate(`/albums/${album.id}`)}
      aria-label={`Open album ${album.title}`}
    >
      <div className="album-card-cover">
        {album.coverUrl ? (
          <img src={album.coverUrl} alt={album.title} draggable={false} />
        ) : (
          <Disc3 size={36} />
        )}
      </div>
      <div className="album-card-info">
        <span className="album-card-title">{album.title}</span>
        <span className="album-card-artist">{album.artist.name}</span>
        {album.year && (
          <span className="album-card-year">{album.year}</span>
        )}
      </div>
    </button>
  );
}
