import React from "react";
import { NavLink } from "react-router-dom";
import {
  Disc3,
  Home,
  Library,
  ListMusic,
  Mic2,
  Music2,
  Search,
  Settings,
  Tag,
} from "lucide-react";

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const mainNav: NavItem[] = [
  { to: "/", icon: <Home size={16} />, label: "Home" },
  { to: "/search", icon: <Search size={16} />, label: "Search" },
];

const libraryNav: NavItem[] = [
  { to: "/library/albums", icon: <Disc3 size={16} />, label: "Albums" },
  { to: "/library/artists", icon: <Mic2 size={16} />, label: "Artists" },
  { to: "/library/songs", icon: <Music2 size={16} />, label: "Songs" },
  { to: "/library/genres", icon: <Tag size={16} />, label: "Genres" },
];

const bottomNav: NavItem[] = [
  { to: "/playlists", icon: <ListMusic size={16} />, label: "Playlists" },
  { to: "/settings", icon: <Settings size={16} />, label: "Settings" },
];

function SidebarLink({ item }: { item: NavItem }): React.JSX.Element {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `sidebar-item${isActive ? " active" : ""}`
      }
    >
      <span className="sidebar-icon">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

export default function Sidebar(): React.JSX.Element {
  return (
    <aside className="sidebar">


      {/* Main nav */}
      <div className="sidebar-section">
        {mainNav.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </div>

      {/* Library */}
      <div className="sidebar-section">
        <div className="sidebar-label">
          <Library size={10} style={{ display: "inline", marginRight: 4 }} />
          Library
        </div>
        {libraryNav.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </div>

      <div className="sidebar-spacer" />

      {/* Bottom */}
      <div className="sidebar-bottom">
        {bottomNav.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </div>
    </aside>
  );
}
