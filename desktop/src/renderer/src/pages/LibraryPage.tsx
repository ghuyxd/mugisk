import React from "react";
import { useParams, Navigate } from "react-router-dom";

import AlbumsPage from "./AlbumsPage";
import ArtistsPage from "./ArtistsPage";
import TracksPage from "./TracksPage";
import GenresPage from "./GenresPage";

export default function LibraryPage(): React.JSX.Element {
  const { tab } = useParams<{ tab?: string }>();

  // Default to albums if no tab is provided or invalid
  if (!tab || !["albums", "artists", "songs", "genres"].includes(tab)) {
    return <Navigate to="/library/albums" replace />;
  }

  return (
    <div className="library-page">
      {tab === "albums" && <AlbumsPage />}
      {tab === "artists" && <ArtistsPage />}
      {tab === "songs" && <TracksPage />}
      {tab === "genres" && <GenresPage />}
    </div>
  );
}
