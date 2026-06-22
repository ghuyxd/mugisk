import React from "react";
import { Search } from "lucide-react";

export default function SearchPage(): React.JSX.Element {
  return (
    <div className="placeholder-page">
      <Search size={48} className="placeholder-icon" />
      <span className="placeholder-label">Search</span>
      <span className="placeholder-hint">Search your library — Phase 7</span>
    </div>
  );
}
