import React from "react";
import { Outlet } from "react-router-dom";

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
