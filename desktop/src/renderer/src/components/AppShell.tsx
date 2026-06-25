import React from "react";
import { Outlet } from "react-router-dom";

import NowPlayingBar from "./NowPlayingBar";
import QueuePanel from "./QueuePanel";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

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

      {/* Slide-in queue panel (portal-style, rendered outside grid flow) */}
      <QueuePanel />
    </div>
  );
}
