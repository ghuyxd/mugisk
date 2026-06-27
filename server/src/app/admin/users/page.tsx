"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiJson, apiFetch } from "@/lib/adminFetch";
import { ConfirmDialog } from "../components/ConfirmDialog";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: "ADMIN" | "USER";
  isDisabled: boolean;
  createdAt: string;
  _count: { sessions: number };
}

interface UsersResponse {
  data: AdminUser[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type DialogState =
  | { type: "disable"; user: AdminUser }
  | { type: "enable"; user: AdminUser }
  | { type: "revoke"; user: AdminUser }
  | null;

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState<string | null>(null); // userId being acted on
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("USER");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (q) params.set("search", q);
      const data = await apiJson<UsersResponse>(`/api/admin/users?${params}`);
      setUsers(data.data);
      setMeta(data.meta);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(search, page);
  }, [page, fetchUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => void fetchUsers(value, 1), 350);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function patchUser(userId: string, payload: { role?: "ADMIN" | "USER"; isDisabled?: boolean }) {
    setBusy(userId);
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await fetchUsers(search, page);
      showToast("User updated successfully.");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      setDialog(null);
    }
  }

  async function revokeAllSessions(userId: string) {
    setBusy(userId);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/sessions/revoke-all`, { method: "POST" });
      const data = (await res.json()) as { revokedCount: number };
      await fetchUsers(search, page);
      showToast(`Revoked ${data.revokedCount} session(s).`);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      setDialog(null);
    }
  }

  function handleDialogConfirm() {
    if (!dialog) return;
    if (dialog.type === "disable") void patchUser(dialog.user.id, { isDisabled: true });
    else if (dialog.type === "enable") void patchUser(dialog.user.id, { isDisabled: false });
    else if (dialog.type === "revoke") void revokeAllSessions(dialog.user.id);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setIsCreating(true);
    
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }
      
      setShowCreateModal(false);
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");
      setNewRole("USER");
      showToast("User created successfully");
      await fetchUsers(search, page);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">{meta.total} registered user{meta.total !== 1 ? "s" : ""}</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {toast && <div className="alert alert--success">{toast}</div>}

      <div className="table-container">
        <div className="table-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="table-search">
            <span className="table-search-icon">🔍</span>
            <input
              id="users-search-input"
              type="text"
              className="table-search-input"
              placeholder="Search by email or username…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <button className="btn btn--primary" onClick={() => setShowCreateModal(true)}>
            + Create User
          </button>
        </div>

        {loading ? (
          <div className="loading-center">
            <span className="spinner" />
            Loading users…
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" id="users-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Active Sessions</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--color-muted-light)" }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <strong style={{ color: "var(--color-text)" }}>{user.username}</strong>
                        </td>
                        <td className="text-muted">{user.email}</td>
                        <td>
                          <select
                            id={`role-select-${user.id}`}
                            className="select"
                            value={user.role}
                            disabled={busy === user.id}
                            onChange={(e) =>
                              void patchUser(user.id, { role: e.target.value as "ADMIN" | "USER" })
                            }
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td>
                          <span className={`badge badge--${user.isDisabled ? "disabled" : "active"}`}>
                            {user.isDisabled ? "Disabled" : "Active"}
                          </span>
                        </td>
                        <td className="text-muted">{user._count.sessions}</td>
                        <td className="text-muted">{formatDate(user.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <button
                              id={`toggle-user-${user.id}`}
                              className={`btn btn--sm ${user.isDisabled ? "btn--ghost" : "btn--danger-ghost"}`}
                              disabled={busy === user.id}
                              onClick={() =>
                                setDialog({
                                  type: user.isDisabled ? "enable" : "disable",
                                  user,
                                })
                              }
                            >
                              {user.isDisabled ? "Enable" : "Disable"}
                            </button>
                            <button
                              id={`revoke-sessions-${user.id}`}
                              className="btn btn--sm btn--danger-ghost"
                              disabled={busy === user.id || user._count.sessions === 0}
                              onClick={() => setDialog({ type: "revoke", user })}
                            >
                              Revoke sessions
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="pagination">
                <span>
                  Page {meta.page} of {meta.totalPages} · {meta.total} total
                </span>
                <div className="pagination-buttons">
                  <button
                    id="users-prev-btn"
                    className="btn btn--ghost btn--sm"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Prev
                  </button>
                  <button
                    id="users-next-btn"
                    className="btn btn--ghost btn--sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={dialog !== null}
        title={
          dialog?.type === "disable"
            ? "Disable user?"
            : dialog?.type === "enable"
            ? "Enable user?"
            : "Revoke all sessions?"
        }
        message={
          dialog?.type === "disable"
            ? `This will immediately block all future requests from "${dialog.user.username}", even with a valid token.`
            : dialog?.type === "enable"
            ? `Re-enable "${dialog?.user.username}"? They will be able to log in again.`
            : `This will invalidate all ${dialog?.user._count.sessions} active session(s) for "${dialog?.user.username}".`
        }
        confirmLabel={
          dialog?.type === "disable"
            ? "Disable"
            : dialog?.type === "enable"
            ? "Enable"
            : "Revoke all"
        }
        danger={dialog?.type === "disable" || dialog?.type === "revoke"}
        onConfirm={handleDialogConfirm}
        onCancel={() => setDialog(null)}
      />

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog" style={{ maxWidth: 450 }} role="dialog">
            <h3 className="dialog-title">Create New User</h3>
            {createError && <div className="alert alert--error" style={{ marginBottom: 16 }}>{createError}</div>}
            
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 4 }}>Username</label>
                <input 
                  type="text" 
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-bg-darker)", color: "var(--color-text)" }}
                  required 
                  minLength={3}
                  maxLength={30}
                  value={newUsername} 
                  onChange={e => setNewUsername(e.target.value)} 
                />
              </div>
              
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 4 }}>Email</label>
                <input 
                  type="email" 
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-bg-darker)", color: "var(--color-text)" }}
                  required 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                />
              </div>
              
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 4 }}>Password</label>
                <input 
                  type="password" 
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-bg-darker)", color: "var(--color-text)" }}
                  required 
                  minLength={8}
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                />
                <small className="text-muted" style={{ display: "block", marginTop: 4 }}>Must be at least 8 chars, 1 uppercase, 1 digit.</small>
              </div>
              
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 4 }}>Role</label>
                <select 
                  className="select" 
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-bg-darker)", color: "var(--color-text)" }}
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value as "USER" | "ADMIN")}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              
              <div className="dialog-actions" style={{ marginTop: 16 }}>
                <button 
                  type="button" 
                  className="btn btn--ghost" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn--primary"
                  disabled={isCreating}
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
