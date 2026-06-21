import React from "react";

export default function App(): React.JSX.Element {
  return (
    <div className="app-shell">
      {/* Custom title bar */}
      <div className="titlebar">
        <div className="titlebar-drag" />
        <span className="titlebar-title">mugisk</span>
        <div className="titlebar-drag" />
      </div>

      {/* Main content */}
      <div className="content">
        <div className="hero">
          {/* Logo */}
          <div className="logo">M</div>

          <h1 className="heading">Hello from Mugisk</h1>
          <p className="subheading">
            Desktop client is running. The full Feishin-style UI will be built in the next phase.
          </p>

          <div className="badge">
            <span className="dot" />
            Electron {window.electron?.process?.versions?.electron ?? "?"} · Node{" "}
            {window.electron?.process?.versions?.node ?? "?"} · Chrome{" "}
            {window.electron?.process?.versions?.chrome ?? "?"}
          </div>

          <div className="cards">
            {[
              { label: "Electron", icon: "⚡", desc: "v34 · Main process" },
              { label: "React 18", icon: "⚛", desc: "Renderer process" },
              { label: "Vite", icon: "⚙", desc: "via electron-vite" },
              { label: "TypeScript", icon: "⟨⟩", desc: "Strict mode" },
            ].map((item) => (
              <div key={item.label} className="card">
                <span className="card-icon">{item.icon}</span>
                <span className="card-label">{item.label}</span>
                <span className="card-desc">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
