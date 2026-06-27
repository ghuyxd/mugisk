import React from "react";
import { Outlet } from "react-router-dom";

import { Minus, Square, X } from "lucide-react";

import NowPlayingBar from "./NowPlayingBar";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import TrackContextMenu from "./TrackContextMenu";

export default function AppShell(): React.JSX.Element {
  return (
    <div className="app-shell">
      {/* Custom drag-region titlebar */}
      <div className="titlebar">
        <div className="titlebar-logo">M</div>
        <span className="titlebar-title">mugisk</span>
        
        <div className="titlebar-controls">
          <button
            className="titlebar-btn"
            onClick={() => window.api.window.minimize()}
            aria-label="Minimize"
          >
            <Minus size={12} />
          </button>
          <button
            className="titlebar-btn"
            onClick={() => window.api.window.maximize()}
            aria-label="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            className="titlebar-btn close"
            onClick={() => window.api.window.close()}
            aria-label="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Left sidebar navigation */}
      <Sidebar />

      {/* Right: topbar + page content */}
      <div className="main-content">
        <Topbar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {/* Persistent now-playing footer */}
      <NowPlayingBar />

      {/* Global context menu */}
      <TrackContextMenu />
    </div>
  );
}
