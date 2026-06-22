"use client";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  accent?: boolean;
}

export function StatCard({ title, value, subtitle, icon, accent }: StatCardProps) {
  return (
    <div className={`stat-card ${accent ? "stat-card--accent" : ""}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-title">{title}</div>
        {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
