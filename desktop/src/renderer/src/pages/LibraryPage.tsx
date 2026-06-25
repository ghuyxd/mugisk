import React from "react";
import { useParams } from "react-router-dom";

import AlbumsView from "./library/AlbumsView";
import ArtistsView from "./library/ArtistsView";
import SongsView from "./library/SongsView";
import GenresView from "./library/GenresView";

export default function LibraryPage(): React.JSX.Element {
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = tab ?? "albums";

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "24px", fontSize: 24, fontWeight: "bold", textTransform: "capitalize" }}>
        {activeTab}
      </div>
      
      {activeTab === "albums" && <AlbumsView />}
      {activeTab === "artists" && <ArtistsView />}
      {activeTab === "songs" && <SongsView />}
      {activeTab === "genres" && <GenresView />}
    </div>
  );
}
