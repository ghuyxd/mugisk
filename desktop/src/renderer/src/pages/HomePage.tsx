import React from "react";
import { Home } from "lucide-react";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="placeholder-page">
      <Home size={48} className="placeholder-icon" />
      <span className="placeholder-label">Home</span>
      <span className="placeholder-hint">Recently played and recommendations — Phase 7</span>
    </div>
  );
}
